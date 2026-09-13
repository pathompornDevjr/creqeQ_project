/**
 * Omise Payment Gateway Integration Service
 * จัดการการชำระเงินออนไลน์ผ่าน Omise API:
 * - การสร้าง PromptPay Source และ Charge (พร้อมเพย์ QR แบบไดนามิก)
 * - การรับ Webhook และตรวจสอบสถานะการชำระเงินจาก Omise
 * - การอัปเดตสถานะออเดอร์ในฐานข้อมูล และแจ้งเตือนผ่าน RealtimeService
 */

import prisma from "../database/prisma";
import { RealtimeService } from "./realtime.service";

export class OmiseService {
  /** ดึง Secret Key สำหรับเรียกใช้งาน Omise API */
  private static getSecretKey(): string {
    const key = process.env.OMISE_SECRET_KEY || process.env.OMISE_SECRET_API_KEY;
    if (!key) {
      throw new Error(
        "OMISE_SECRET_KEY is not configured in server environment (.env). Please add OMISE_SECRET_KEY=skey_test_... to server/.env"
      );
    }
    return key;
  }

  /** สร้าง Authorization Header ในรูปแบบ Basic Auth */
  private static getAuthHeader(): string {
    const secretKey = this.getSecretKey();
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    return `Basic ${encoded}`;
  }

  /**
   * สร้าง PromptPay Source และ Charge บนระบบ Omise
   * 
   * @param orderId รหัสออเดอร์ที่ต้องการสร้างการชำระเงิน
   * @param customReturnUrl URL ปลายทางเมื่อชำระเงินเสร็จ
   */
  static async createPromptPayCharge(orderId: number | string, customReturnUrl?: string) {
    const numericOrderId = Number(orderId);
    if (isNaN(numericOrderId)) {
      throw new Error("Invalid orderId provided");
    }

    const order = await prisma.orders.findUnique({
      where: { order_id: numericOrderId },
      include: {
        customer: true,
        restaurant: true,
        orderItems: {
          include: {
            selected_options: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    if (order.payment_status === "paid") {
      throw new Error("This order is already paid");
    }

    const frontendBaseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3000";

    const returnUrl =
      customReturnUrl ||
      `${frontendBaseUrl}/menu/${order.restaurant_id || 1}/payment?orderId=${order.order_id}&status=paid`;

    // 1. Check if existing unexpired charge exists in local DB
    if (order.payment?.transaction_ref && order.payment.status === "pending" && order.payment.provider === "omise") {
      try {
        const existingChargeRes = await fetch(`https://api.omise.co/charges/${order.payment.transaction_ref}`, {
          method: "GET",
          headers: {
            Authorization: this.getAuthHeader(),
          },
        });

        if (existingChargeRes.ok) {
          const existingCharge = await existingChargeRes.json();
          if (existingCharge.status === "pending" && !existingCharge.expired) {
            const qrUrl = existingCharge.source?.scannable_code?.image?.download_uri;
            return {
              chargeId: existingCharge.id,
              invoiceId: existingCharge.id,
              qrCodeUrl: qrUrl || order.payment.invoice_url,
              qrPayload: null,
              hostedInstructionsUrl: existingCharge.authorize_uri || qrUrl,
              amount: order.total,
              status: existingCharge.status,
              alreadyExisted: true,
            };
          }
        }
      } catch (e) {
        console.warn("[OmiseService] Could not retrieve existing charge, creating new one:", e);
      }
    }

    // Amount in satang (1 THB = 100 satang)
    const amountSatang = Math.max(2000, Math.round(order.total * 100)); // Omise min amount is usually 20 THB (2000 satang)

    // 2. Step 1: Create Omise Source for PromptPay
    let chargeData: any = null;
    let qrCodeUrl: string | null = null;
    let hostedInstructionsUrl: string | null = null;

    try {
      const sourceRes = await fetch("https://api.omise.co/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          type: "promptpay",
          amount: amountSatang,
          currency: "thb",
        }),
      });

      if (sourceRes.ok) {
        const sourceData = await sourceRes.json();
        const sourceId = sourceData.id;

        // Step 2: Create Omise Charge with PromptPay Source
        const chargePayload = {
          amount: amountSatang,
          currency: "thb",
          source: sourceId,
          return_uri: returnUrl,
          description: `คำสั่งซื้อ คิว #${order.queue_number} (${order.restaurant?.restaurant_name || "Crape Shop"})`,
          metadata: {
            order_id: String(order.order_id),
            queue_number: String(order.queue_number),
            restaurant_id: String(order.restaurant_id || 1),
          },
        };

        const chargeRes = await fetch("https://api.omise.co/charges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.getAuthHeader(),
          },
          body: JSON.stringify(chargePayload),
        });

        if (chargeRes.ok) {
          chargeData = await chargeRes.json();
          qrCodeUrl =
            chargeData.source?.scannable_code?.image?.download_uri ||
            sourceData.scannable_code?.image?.download_uri;
          hostedInstructionsUrl = chargeData.authorize_uri || qrCodeUrl;
        } else {
          const errBody = await chargeRes.json().catch(() => ({}));
          console.warn("[Omise Create Charge Error - Falling back to local test mock]", errBody);
        }
      } else {
        const errBody = await sourceRes.json().catch(() => ({}));
        console.warn("[Omise Create Source Error - Falling back to local test mock]", errBody);
      }
    } catch (apiErr: any) {
      console.warn("[Omise API Call Failed - Using Test Mode Mock]", apiErr?.message);
    }

    const finalChargeId = chargeData?.id || `chrg_test_${order.order_id}_${Date.now()}`;
    const finalQrUrl = qrCodeUrl || order.restaurant?.promptpay_qr || null;

    // 4. Upsert record in payments table
    const payment = await prisma.payments.upsert({
      where: { order_id: order.order_id },
      create: {
        order_id: order.order_id,
        amount: order.total,
        status: "pending",
        provider: "omise",
        transaction_ref: finalChargeId,
        invoice_url: finalQrUrl || hostedInstructionsUrl,
        payment_channel: "PROMPTPAY",
      },
      update: {
        amount: order.total,
        status: "pending",
        provider: "omise",
        transaction_ref: finalChargeId,
        invoice_url: finalQrUrl || hostedInstructionsUrl,
        payment_channel: "PROMPTPAY",
      },
    });

    // Update order payment_method
    await prisma.orders.update({
      where: { order_id: order.order_id },
      data: {
        payment_method: "online",
      },
    });

    return {
      chargeId: finalChargeId,
      invoiceId: finalChargeId,
      qrCodeUrl: finalQrUrl,
      qrPayload: null,
      hostedInstructionsUrl: hostedInstructionsUrl || finalQrUrl,
      amount: order.total,
      status: chargeData?.status || "pending",
      paymentId: payment.payment_id,
    };
  }

  /**
   * Process incoming Webhook callback from Omise
   * Event: charge.complete, charge.create, etc.
   */
  static async handleWebhook(body: any) {
    console.log(`[Omise Webhook] Received event: ${body?.key || body?.object}`);

    let charge: any = null;

    if (body?.object === "event") {
      if (body.key === "charge.complete") {
        charge = body.data;
      } else {
        console.log(`[Omise Webhook] Ignored non-complete event: ${body.key}`);
        return { success: true, message: `Ignored event ${body.key}` };
      }
    } else if (body?.object === "charge") {
      charge = body;
    }

    if (!charge) {
      return { success: false, status: 400, message: "Invalid Omise webhook payload" };
    }

    const chargeId = charge.id;
    const isPaid = charge.status === "successful" && charge.paid === true;
    const isFailed = charge.status === "failed" || charge.status === "expired";
    const orderIdStr = charge.metadata?.order_id;

    let payment = await prisma.payments.findFirst({
      where: { transaction_ref: chargeId },
      include: { order: true },
    });

    let orderId = payment?.order_id;

    if (!orderId && orderIdStr) {
      const numericOrderId = Number(orderIdStr);
      if (!isNaN(numericOrderId)) {
        const matchedOrder = await prisma.orders.findUnique({
          where: { order_id: numericOrderId },
        });
        if (matchedOrder) {
          orderId = matchedOrder.order_id;
        }
      }
    }

    if (!orderId) {
      console.warn(`[Omise Webhook] No matching payment/order found for Charge ${chargeId}`);
      return { success: true, message: "Processed but local order not found" };
    }

    const existingOrder = await prisma.orders.findUnique({
      where: { order_id: orderId },
    });

    const restaurantId = existingOrder?.restaurant_id || 1;
    const paidAmount = charge.amount ? Math.round(charge.amount / 100) : (existingOrder?.total || 0);

    if (isPaid) {
      // 1. Upsert / Update Payment record
      await prisma.payments.upsert({
        where: { order_id: orderId },
        create: {
          order_id: orderId,
          amount: paidAmount,
          status: "paid",
          paid_at: new Date(),
          provider: "omise",
          transaction_ref: chargeId,
          payment_channel: "PROMPTPAY",
        },
        update: {
          status: "paid",
          paid_at: new Date(),
          payment_channel: "PROMPTPAY",
          amount: paidAmount,
          transaction_ref: chargeId,
        },
      });

      // 2. Update Order status
      const updatedOrder = await prisma.orders.update({
        where: { order_id: orderId },
        data: {
          payment_status: "paid",
          payment_method: "online",
          order_status: "confirmed",
          confirmed_at: new Date(),
        },
        include: {
          orderItems: {
            include: { selected_options: true },
          },
          customer: true,
          payment: true,
        },
      });

      // 3. Broadcast Realtime Event to Kitchen & Customer screens
      const restId = restaurantId || "global";
      const paidPayload = {
        orderId: orderId,
        queueNumber: updatedOrder.queue_number,
        paymentStatus: "paid",
        orderStatus: updatedOrder.order_status,
        amount: paidAmount,
        paymentChannel: "PROMPTPAY",
        order: updatedOrder,
      };

      const statusChangedPayload = {
        orderId: orderId,
        status: "confirmed",
        order: updatedOrder,
      };

      RealtimeService.broadcast(restId, "ORDER_PAID", paidPayload);
      RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", statusChangedPayload);

      if (restId !== "global") {
        RealtimeService.broadcast("global", "ORDER_PAID", paidPayload);
        RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", statusChangedPayload);
      }

      console.log(`[Omise Webhook] Order #${orderId} marked as PAID via Omise PromptPay`);
      return { success: true, message: `Charge ${chargeId} marked as PAID` };
    } else if (isFailed) {
      await prisma.payments.updateMany({
        where: { transaction_ref: chargeId },
        data: { status: "failed" },
      });
      return { success: true, message: `Charge ${chargeId} marked as FAILED` };
    }

    return { success: true, message: `Charge ${chargeId} status is ${charge.status}` };
  }

  /**
   * Simulate a payment for development/testing
   */
  static async simulatePayment(orderId: number | string) {
    const numericOrderId = Number(orderId);
    if (isNaN(numericOrderId)) {
      throw new Error("Invalid orderId provided");
    }

    const order = await prisma.orders.findUnique({
      where: { order_id: numericOrderId },
      include: {
        customer: true,
        payment: true,
      },
    });

    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    const mockEvent = {
      object: "event",
      id: `evnt_sim_${Date.now()}`,
      key: "charge.complete",
      data: {
        object: "charge",
        id: order.payment?.transaction_ref || `chrg_simulated_${order.order_id}_${Date.now()}`,
        status: "successful",
        paid: true,
        amount: order.total * 100,
        currency: "thb",
        metadata: {
          order_id: String(order.order_id),
          queue_number: String(order.queue_number),
          restaurant_id: String(order.restaurant_id || 1),
        },
      },
    };

    return await this.handleWebhook(mockEvent);
  }

  /**
   * Get payment status for an order
   */
  static async getPaymentStatus(orderId: number) {
    const payment = await prisma.payments.findUnique({
      where: { order_id: orderId },
      include: {
        order: {
          select: {
            order_id: true,
            queue_number: true,
            order_status: true,
            payment_status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error(`Payment record for order #${orderId} not found`);
    }

    return payment;
  }
}
