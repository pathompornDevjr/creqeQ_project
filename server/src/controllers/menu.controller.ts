/**
 * Menu Controller
 * จัดการ HTTP Request / Response สำหรับการจัดการเมนูอาหารพื้นฐาน:
 * - ดึงรายการเมนูทั้งหมดของร้าน (getMenus)
 * - ดึงข้อมูลเมนูเดี่ยวตาม ID (getMenu)
 * - สร้างเมนูอาหารใหม่ (createMenu)
 * - แก้ไขข้อมูลเมนู (updateMenu)
 * - ลบรายการเมนู (deleteMenu)
 */

import { MenuService } from "../services/menu.service";

const menuService = new MenuService();

export class MenuController {
  /** ดึงรายการเมนูของร้านค้าตาม restaurantId */
  static async getMenus(ctx: any) {
    try {
      const restaurantId = Number(ctx.query.restaurantId);
      if (!restaurantId || isNaN(restaurantId)) {
        return { success: false, message: "Valid restaurantId query parameter is required" };
      }
      const data = await menuService.getMenusByRestaurant(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลเมนูเดี่ยวตาม ID */
  static async getMenu(ctx: any) {
    try {
      const menuId = Number(ctx.params.id);
      const data = await menuService.getMenuById(menuId);
      if (!data) return { success: false, message: "Menu not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** สร้างเมนูอาหารใหม่ */
  static async createMenu(ctx: any) {
    try {
      const body = ctx.body;
      const data = await menuService.createMenu(body);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** แก้ไขและอัปเดตข้อมูลเมนู */
  static async updateMenu(ctx: any) {
    try {
      const menuId = Number(ctx.params.id);
      const body = ctx.body;
      const data = await menuService.updateMenu(menuId, body);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ลบรายการเมนูอาหาร */
  static async deleteMenu(ctx: any) {
    try {
      const menuId = Number(ctx.params.id);
      await menuService.deleteMenu(menuId);
      return { success: true, message: "Menu deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
