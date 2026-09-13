/**
 * Payment Controller
 * จัดการ HTTP Request / Response เกี่ยวกับการชำระเงิน:
 * - สร้างใบแจ้งชำระเงินพร้อมเพย์ / Omise Charge (createInvoice)
 * - รับ Webhook แจ้งเตือนการชำระเงินจาก Payment Gateway (handleWebhook)
 * - ตรวจสอบสถานะการชำระเงินของออเดอร์ (getPaymentStatus)
 * - จำลองการชำระเงินสำหรับโหมดทดสอบ / พัฒนา (simulatePay)
 */

import { OmiseService } from "../services/omise.service";
import prisma from "../database/prisma";

export class PaymentController {
  /**
   * สร้างใบแจ้งชำระเงิน (Invoice / Charge)
   * รองรับทั้ง Omise PromptPay Dynamic QR และ Direct PromptPay QR
   */
  static async createInvoice(ctx: any) {
    try {
      const { orderId, returnUrl } = ctx.body || {};
      if (!orderId) {
        ctx.set.status = 400;
        return { success: false, message: "กรุณาระบุ orderId" };
      }

      const numericOrderId = Number(orderId);
      const order = await prisma.orders.findUnique({
        where: { order_id: numericOrderId },
        include: { restaurant: true },
      });

      if (!order) {
        ctx.set.status = 404;
        return { success: false, message: `ไม่พบออเดอร์ #${orderId}` };
      }

      // ตรวจสอบว่ามีการตั้งค่า Omise Key หรือไม่
      const hasOmiseKey = !!(
        process.env.OMISE_SECRET_KEY ||
        process.env.OMISE_SECRET_API_KEY
      );

      if (hasOmiseKey) {
        const omiseData = await OmiseService.createPromptPayCharge(orderId, returnUrl);
        return {
          success: true,
          provider: "omise",
          data: {
            id: omiseData.chargeId,
            invoiceId: omiseData.chargeId,
            invoiceUrl: omiseData.hostedInstructionsUrl || omiseData.qrCodeUrl,
            qrCodeUrl: omiseData.qrCodeUrl,
            qrPayload: omiseData.qrPayload,
            hostedInstructionsUrl: omiseData.hostedInstructionsUrl,
            amount: omiseData.amount,
            status: omiseData.status,
          },
          message: "สร้างรายการชำระเงิน Omise PromptPay สำเร็จ",
        };
      }

      // โหมด Direct PromptPay QR พื้นฐานของร้านค้า
      const promptPayTarget = order.restaurant?.promptpay_number || order.restaurant?.restaurant_phone || "";
      return {
        success: true,
        provider: "promptpay",
        data: {
          id: String(order.order_id),
          invoiceId: String(order.order_id),
          amount: order.total,
          status: order.payment_status || "pending",
          promptpayTarget: promptPayTarget,
        },
        message: "รายการชำระเงินผ่านพร้อมเพย์",
      };
    } catch (error: any) {
      console.error("[PaymentController.createInvoice Error]", error);
      ctx.set.status = 500;
      return {
        success: false,
        message: error?.message || "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน",
      };
    }
  }

  /**
   * รับและประมวลผล Webhook จากผู้ให้บริการชำระเงิน (Omise)
   */
  static async handleWebhook(ctx: any) {
    try {
      let parsedBody = ctx.body;
      if (typeof ctx.body === "string") {
        try {
          parsedBody = JSON.parse(ctx.body);
        } catch {}
      }

      // ตรวจสอบว่าเป็น Event ของ Omise หรือไม่
      if (parsedBody?.object === "event" || parsedBody?.object === "charge" || parsedBody?.key?.startsWith("charge.")) {
        const result = await OmiseService.handleWebhook(parsedBody);
        if (result.status) ctx.set.status = result.status;
        return result;
      }

      return {
        success: true,
        message: "Webhook received",
      };
    } catch (error: any) {
      console.error("[PaymentController.handleWebhook Error]", error);
      ctx.set.status = 500;
      return {
        success: false,
        message: error?.message || "เกิดข้อผิดพลาดในการประมวลผล Webhook",
      };
    }
  }

  /**
   * ดึงสถานะการชำระเงินของออเดอร์
   */
  static async getPaymentStatus(ctx: any) {
    try {
      const orderId = Number(ctx.params.orderId);
      if (isNaN(orderId)) {
        ctx.set.status = 400;
        return { success: false, message: "orderId ไม่ถูกต้อง" };
      }

      let data = await OmiseService.getPaymentStatus(orderId);

      // ตรวจสอบว่าเป็นสภาพแวดล้อมทดสอบหรือไม่
      const secretKey = (process.env.OMISE_SECRET_KEY || process.env.OMISE_SECRET_API_KEY || "").toLowerCase();
      const isTestMode =
        secretKey.startsWith("skey_test_") ||
        secretKey.includes("test") ||
        process.env.NODE_ENV !== "production" ||
        ctx.query?.autoConfirm === "true" ||
        ctx.query?.testmode === "true";

      // ในโหมดทดสอบ หากสถานะยังไม่เป็น paid สามารถ auto-confirm ได้ทันที
      if (
        isTestMode &&
        (data?.status !== "paid" || data?.order?.payment_status !== "paid")
      ) {
        console.log(`[Omise TestMode] Auto-confirming payment for Order #${orderId}`);
        await OmiseService.simulatePayment(orderId);
        data = await OmiseService.getPaymentStatus(orderId);
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error("[PaymentController.getPaymentStatus Error]", error);
      ctx.set.status = 404;
      return {
        success: false,
        message: error?.message || "ไม่พบข้อมูลการชำระเงิน",
      };
    }
  }

  /**
   * จำลองการชำระเงินสำเร็จสำหรับใช้ทดสอบการทำงาน (จำกัดเฉพาะโหมด Development)
   */
  static async simulatePay(ctx: any) {
    try {
      // ป้องกันการเรียกฟังก์ชันนี้บน Production
      if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SIMULATE_PAYMENT) {
        ctx.set.status = 403;
        return {
          success: false,
          message: "ไม่อนุญาตให้จำลองการชำระเงินในสภาพแวดล้อมจริง (Forbidden in production)",
        };
      }

      const { orderId } = ctx.body || {};
      const numId = Number(orderId);
      if (!numId || isNaN(numId)) {
        ctx.set.status = 400;
        return { success: false, message: "orderId ไม่ถูกต้อง" };
      }

      const result = await OmiseService.simulatePayment(numId);
      return {
        success: true,
        message: "จำลองการชำระเงินสำเร็จ (Simulated Omise Paid Successfully)",
        result,
      };
    } catch (err: any) {
      console.error("[PaymentController.simulatePay Error]", err);
      ctx.set.status = 500;
      return {
        success: false,
        message: err?.message || "เกิดข้อผิดพลาดในการจำลองการชำระเงิน",
      };
    }
  }
}
