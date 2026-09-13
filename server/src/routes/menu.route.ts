/**
 * Menu Routes
 * เส้นทาง API สำหรับจัดการเมนูอาหารพื้นฐาน:
 * - GET /api/v1/menus: ดึงรายการเมนูทั้งหมด
 * - GET /api/v1/menus/:id: ดึงข้อมูลเมนูเดี่ยว
 * - POST /api/v1/menus: สร้างเมนูใหม่
 * - PUT /api/v1/menus/:id: แก้ไขข้อมูลเมนู
 * - DELETE /api/v1/menus/:id: ลบเมนู
 */

import { Elysia } from "elysia";
import { MenuController } from "../controllers/menu.controller";

export const menuRoutes = new Elysia({ prefix: "/menus" })
  .get("/", MenuController.getMenus)
  .get("/:id", MenuController.getMenu)
  .post("/", MenuController.createMenu)
  .put("/:id", MenuController.updateMenu)
  .delete("/:id", MenuController.deleteMenu);
