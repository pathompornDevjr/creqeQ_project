/**
 * Payment Routes
 * เส้นทาง API สำหรับระบบชำระเงินและ Webhook:
 * - POST /api/v1/payments/create-invoice: สร้างใบแจ้งชำระเงินพร้อมเพย์ / Omise Charge
 * - POST /api/v1/payments/webhook: รับ Webhook ยืนยันการชำระเงินจาก Omise Gateway
 * - GET /api/v1/payments/order/:orderId: ตรวจสอบสถานะการชำระเงินของออเดอร์
 * - POST /api/v1/payments/simulate-pay: จำลองการชำระเงินสำเร็จ (โหมดทดสอบ)
 */

import { Elysia, t } from "elysia";
import { PaymentController } from "../controllers/payment.controller";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
  // 1. สร้างรายการชำระเงิน (Omise PromptPay หรือ Direct PromptPay)
  .post("/create-invoice", PaymentController.createInvoice, {
    body: t.Object({
      orderId: t.Union([t.Number(), t.String()]),
      returnUrl: t.Optional(t.String()),
    }),
  })

  // 2. รับ Webhook Callback จาก Payment Gateway (Omise)
  .post("/webhook", PaymentController.handleWebhook, {
    parse: ({ request }: any) => request.text(),
  })

  // 3. ตรวจสอบสถานะการชำระเงินตาม Order ID
  .get("/order/:orderId", PaymentController.getPaymentStatus)

  // 4. จำลองการชำระเงิน (สำหรับการทดสอบในสภาพแวดล้อม Development / Test)
  .post("/simulate-pay", PaymentController.simulatePay, {
    body: t.Object({
      orderId: t.Union([t.Number(), t.String()]),
    }),
  });
