/**
 * Restaurant Routes
 * เส้นทาง API สำหรับระบบจัดการของร้านค้า (ต้องผ่าน restaurantAuthGuard ทุกเส้นทาง):
 * 1. /api/v1/restaurant/orders: การจัดการคิวในครัว (ดึงออเดอร์, เลื่อนสถานะ, ยกเลิก, ดูสลิป)
 * 2. /api/v1/restaurant/summary: รายงานสรุปยอดขาย, สถิติ, กราฟแนวโน้ม
 * 3. /api/v1/restaurant/inventory: การจัดการสต็อกวัตถุดิบ
 * 4. /api/v1/restaurant/menu: จัดการหมวดหมู่, เมนู, แป้งเครป, เมนูตัวอย่าง และอัปโหลดรูปภาพ
 * 5. /api/v1/restaurant/settings: ข้อมูลร้านค้า, บัญชีธนาคาร/พร้อมเพย์, ระบบพักร้านชั่วคราว
 * 6. /api/v1/restaurant/profile: โปรไฟล์ผู้ดูแลร้านค้าและการเปลี่ยนรหัสผ่าน
 */

import { Elysia } from "elysia";
import {
  RestaurantInventoryController,
  RestaurantMenuController,
  RestaurantOrderController,
  RestaurantProfileController,
  RestaurantSettingsController,
  RestaurantSummaryController,
} from "../controllers/restaurant.controller";
import { restaurantAuthGuard } from "../libs/authGuard";

export const restaurantRoutes = new Elysia({ prefix: "/restaurant" })
  .onBeforeHandle(restaurantAuthGuard) // ตรวจสอบ JWT Token สิทธิ์ร้านค้า
  // ==========================================
  // 1. เส้นทางจัดการออเดอร์และคิวครัว (Orders & Kitchen Queue)
  // ==========================================
  .group("/orders", (app) =>
    app
      .get("/", RestaurantOrderController.getOrders)
      .get("/:id", RestaurantOrderController.getOrder)
      .patch("/:id/status", RestaurantOrderController.advanceStatus)
      .post("/:id/cancel", RestaurantOrderController.cancelOrder)
      .patch("/:id/cancel", RestaurantOrderController.cancelOrder)
      .patch("/:id/items/:itemId/out-of-stock", RestaurantOrderController.toggleOutOfStockItem)
      .get("/:id/slip", RestaurantOrderController.getSlip)
  )

  // ==========================================
  // 2. เส้นทางรายงานและสรุปยอดขาย (Sales Summary & Analytics)
  // ==========================================
  .group("/summary", (app) =>
    app
      .get("/", RestaurantSummaryController.getSummary)
      .get("/stats", RestaurantSummaryController.getStats)
      .get("/chart", RestaurantSummaryController.getChart)
      .get("/recent-orders", RestaurantSummaryController.getRecentOrders)
  )

  // ==========================================
  // 3. เส้นทางสต็อกวัตถุดิบ (Inventory & Raw Materials)
  // ==========================================
  .group("/inventory", (app) =>
    app
      .get("/", RestaurantInventoryController.getItems)
      .post("/", RestaurantInventoryController.createItem)
      .put("/:id", RestaurantInventoryController.updateItem)
      .patch("/:id", RestaurantInventoryController.updateItem)
      .delete("/:id", RestaurantInventoryController.deleteItem)
  )

  // ==========================================
  // 4. เส้นทางจัดการเมนูอาหารและหมวดหมู่ (Menu & Categories)
  // ==========================================
  .group("/menu", (app) =>
    app
      .get("/categories", RestaurantMenuController.getCategories)
      .post("/categories", RestaurantMenuController.createCategories)
      .put("/categories/:id", RestaurantMenuController.updateCategory)
      .delete("/categories/:id", RestaurantMenuController.deleteCategory)
      .get("/crusts", RestaurantMenuController.getCrusts)
      .get("/crusts/:id", RestaurantMenuController.getCrust)
      .post("/crusts", RestaurantMenuController.createCrust)
      .put("/crusts/:id", RestaurantMenuController.updateCrust)
      .patch("/crusts/:id/availability", RestaurantMenuController.toggleCrustAvailability)
      .delete("/crusts/:id", RestaurantMenuController.deleteCrust)
      .get("/sample-menus", RestaurantMenuController.getSampleMenus)
      .get("/sample-menus/:id", RestaurantMenuController.getSampleMenu)
      .post("/sample-menus", RestaurantMenuController.createSampleMenu)
      .put("/sample-menus/:id", RestaurantMenuController.updateSampleMenu)
      .patch("/sample-menus/:id/toggle", RestaurantMenuController.toggleSampleMenu)
      .delete("/sample-menus/:id", RestaurantMenuController.deleteSampleMenu)
      .post("/upload-image", RestaurantMenuController.uploadImage)
      .post("/delete-image", RestaurantMenuController.deleteImage)
      .get("/items", RestaurantMenuController.getMenuItems)
      .get("/items/:id", RestaurantMenuController.getMenuItem)
      .post("/items", RestaurantMenuController.createMenuItem)
      .put("/items/:id", RestaurantMenuController.updateMenuItem)
      .patch("/items/:id/availability", RestaurantMenuController.toggleAvailability)
      .post("/batch-availability", RestaurantMenuController.updateBatchAvailability)
      .patch("/batch-availability", RestaurantMenuController.updateBatchAvailability)
      .patch("/items/:id/popular", RestaurantMenuController.togglePopular)
      .delete("/items/:id", RestaurantMenuController.deleteMenuItem)
  )

  // ==========================================
  // 5. เส้นทางการตั้งค่าร้านค้า พักร้าน และบัญชีธนาคาร (Store Settings & Pause)
  // ==========================================
  .group("/settings", (app) =>
    app
      .get("/info", RestaurantSettingsController.getInfo)
      .put("/info", RestaurantSettingsController.updateInfo)
      .post("/pause", RestaurantInventoryController.setPauseStatus)
      .get("/account", RestaurantSettingsController.getAccount)
      .put("/account", RestaurantSettingsController.updateAccount)
      .put("/security", RestaurantSettingsController.updateSecurity)
  )

  // ==========================================
  // 6. เส้นทางโปรไฟล์ผู้ดูแลร้าน (User Profile & Password)
  // ==========================================
  .group("/profile", (app) =>
    app
      .get("/user", RestaurantProfileController.getProfile)
      .put("/user", RestaurantProfileController.updateProfile)
      .put("/password", RestaurantProfileController.updatePassword)
  );
