/**
 * Customer Routes
 * เส้นทาง API สำหรับบริการฝั่งลูกค้า:
 * - /api/v1/customer/auth: เข้าสู่ระบบ / ลงทะเบียนลูกค้า / โปรไฟล์
 * - /api/v1/customer/table, /categories, /crusts, /sample-menus, /menu: ข้อมูลโต๊ะและรายการอาหาร
 * - /api/v1/customer/orders: สั่งอาหาร, ตรวจสอบคิว, จัดการรายการในออเดอร์
 * - /api/v1/customer/payment: ขอ QR พร้อมเพย์, ส่งสลิปตรวจสอบ, แจ้งจ่ายเงินสด
 */

import { Elysia } from "elysia";
import {
  CustomerAuthController,
  CustomerOrderController,
  CustomerPaymentController,
  CustomerTableController,
} from "../controllers/customer.controller";

export const customerRoutes = new Elysia({ prefix: "/customer" })
  // ==========================================
  // 1. เส้นทางการยืนยันตัวตนลูกค้า (Customer Authentication)
  // ==========================================
  .group("/auth", (app) =>
    app
      .post("/login", CustomerAuthController.login)
      .post("/register", CustomerAuthController.register)
      .get("/me", CustomerAuthController.getMe)
  )

  // ==========================================
  // 2. เส้นทางข้อมูลร้าน โต๊ะ และเมนูอาหาร (Table & Menu)
  // ==========================================
  .get("/table/:tableId", CustomerTableController.getTableInfo)
  .get("/categories", CustomerTableController.getCategories)
  .get("/crusts", CustomerTableController.getCrusts)
  .get("/sample-menus", CustomerTableController.getSampleMenus)
  .get("/menu", CustomerTableController.getMenu)
  .get("/menu/:id", CustomerTableController.getMenuItem)

  // ==========================================
  // 3. เส้นทางสั่งอาหารและคิว (Cart & Orders)
  // ==========================================
  .get("/queue-status", CustomerOrderController.getLiveQueueStatus)
  .group("/orders", (app) =>
    app
      .post("/", CustomerOrderController.placeOrder)
      .post("/place", CustomerOrderController.placeOrder)
      .get("/queue-status", CustomerOrderController.getLiveQueueStatus)
      .get("/active/:tableId", CustomerOrderController.getActiveOrder)
      .get("/table/:tableId", CustomerOrderController.getTableOrders)
      .get("/:id", CustomerOrderController.getOrder)
      .post("/:id/items", CustomerOrderController.addItems)
      .put("/:id/items", CustomerOrderController.updateItems)
      .post("/:id/update-items", CustomerOrderController.updateItems)
      .post("/:id/replace-item", CustomerOrderController.replaceItem)
      .post("/:id/remove-item", CustomerOrderController.removeItem)
  )

  // ==========================================
  // 4. เส้นทางการชำระเงินและสลิป (Payment & Slip Verification)
  // ==========================================
  .group("/payment", (app) =>
    app
      .get("/:orderId/promptpay", CustomerPaymentController.getPromptPay)
      .post("/:orderId/slip", CustomerPaymentController.uploadSlip)
      .post("/:orderId/cash", CustomerPaymentController.notifyCash)
      .post("/:orderId/method", CustomerPaymentController.updatePaymentMethod)
  );
