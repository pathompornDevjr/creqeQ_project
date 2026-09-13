/**
 * Admin Routes
 * เส้นทาง API สำหรับระบบผู้ดูแลระบบ (Admin Panel):
 * - /api/v1/admin/dashboard: ข้อมูลสถิติ, กราฟการเติบโต, บันทึกกิจกรรม
 * - /api/v1/admin/users: จัดการข้อมูลผู้ใช้งาน (CRUD, สลับสถานะ)
 * - /api/v1/admin/restaurants: จัดการข้อมูลร้านค้า (CRUD, สลับสถานะ)
 * - /api/v1/admin/renewals: จัดการคำขอต่ออายุและอนุมัติแพ็กเกจ
 */

import { Elysia } from "elysia";
import {
  AdminDashboardController,
  AdminRenewalController,
  AdminRestaurantController,
  AdminUserController,
} from "../controllers/admin.controller";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  // ==========================================
  // 1. เส้นทางสถิติและภาพรวมแดชบอร์ด (Dashboard)
  // ==========================================
  .group("/dashboard", (app) =>
    app
      .get("/stats", AdminDashboardController.getStats)
      .get("/growth", AdminDashboardController.getGrowth)
      .get("/activities", AdminDashboardController.getActivities)
  )

  // ==========================================
  // 2. เส้นทางจัดการผู้ใช้งาน (Users)
  // ==========================================
  .group("/users", (app) =>
    app
      .get("/", AdminUserController.getUsers)
      .get("/:id", AdminUserController.getUser)
      .post("/", AdminUserController.createUser)
      .put("/:id", AdminUserController.updateUser)
      .patch("/:id/status", AdminUserController.toggleStatus)
      .delete("/:id", AdminUserController.deleteUser)
  )

  // ==========================================
  // 3. เส้นทางจัดการร้านค้า (Restaurants)
  // ==========================================
  .group("/restaurants", (app) =>
    app
      .get("/owners", AdminRestaurantController.getOwners)
      .get("/", AdminRestaurantController.getRestaurants)
      .get("/:id", AdminRestaurantController.getRestaurant)
      .post("/", AdminRestaurantController.createRestaurant)
      .put("/:id", AdminRestaurantController.updateRestaurant)
      .patch("/:id/status", AdminRestaurantController.toggleStatus)
      .delete("/:id", AdminRestaurantController.deleteRestaurant)
  )

  // ==========================================
  // 4. เส้นทางจัดการคำขอต่ออายุแพ็กเกจ (Renewals / Payments)
  // ==========================================
  .group("/renewals", (app) =>
    app
      .get("/", AdminRenewalController.getRenewals)
      .patch("/:id/status", AdminRenewalController.updateStatus)
      .patch("/:id/approve", AdminRenewalController.approveRenewal)
      .patch("/:id/reject", AdminRenewalController.rejectRenewal)
  );
