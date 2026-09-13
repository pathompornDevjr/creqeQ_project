/**
 * Restaurant Controllers
 * รวบรวม Controllers สำหรับระบบจัดการของร้านค้า:
 * 1. RestaurantOrderController: การดึงออเดอร์, เลื่อนสถานะคิวครัว, ยกเลิกออเดอร์, สลับสถานะของหมด
 * 2. RestaurantAnalyticsController: สถิติยอดขาย, กราฟแนวโน้ม, รายงานสรุปยอดขายแบบละเอียด (Summary)
 * 3. RestaurantMenuController: จัดการเมนูอาหาร, หมวดหมู่, อัปโหลดรูปเมนู, แป้งเครป และเมนูตัวอย่าง
 * 4. RestaurantInfoController: ข้อมูลโปรไฟล์ร้านค้า, บัญชีธนาคาร/พร้อมเพย์, ความปลอดภัย
 * 5. RestaurantInventoryController: จัดการสต็อกวัตถุดิบ
 * 6. RestaurantPauseController: พักร้านชั่วคราว
 * 7. RestaurantUserController: ข้อมูลโปรไฟล์และรหัสผ่านผู้ดูแลร้าน
 */

import { RestaurantService } from "../services/restaurant.service";
import { StorageService } from "../services/storage.service";
import { verifyJWT } from "../libs/jwt";

const restaurantService = new RestaurantService();

/**
 * ดึงข้อมูลการยืนยันตัวตนของผู้ดูแลร้านค้าจาก Header หรือ Cookie
 * 
 * @param ctx Context ของ Request
 * @returns userId, restaurantId และ role
 */
async function extractRestaurantAuth(ctx: any): Promise<{ userId?: string; restaurantId?: string; role?: string }> {
  const authHeader = ctx.headers?.authorization || ctx.headers?.Authorization;
  let rawCookie = ctx.headers?.cookie || "";
  let cookieToken: string | undefined;
  if (rawCookie) {
    const match = rawCookie.match(/auth_token=([^;]+)/);
    if (match) cookieToken = match[1];
  }

  const token =
    ctx.cookie?.auth_token?.value ||
    (typeof ctx.cookie?.auth_token === "string" ? ctx.cookie.auth_token : undefined) ||
    cookieToken ||
    (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : undefined);

  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      const userId = payload.res_user_id || payload.userId || (payload as any).id;
      const restaurantId = payload.restaurantId
        ? String(payload.restaurantId)
        : (payload as any).res_id
        ? String((payload as any).res_id)
        : undefined;

      return {
        userId: userId ? String(userId) : undefined,
        restaurantId: restaurantId ? String(restaurantId) : undefined,
        role: payload.role,
      };
    }
  }

  return {};
}

/** ดึงรหัสร้านค้าหรือรหัสผู้ใช้งานจาก Token */
async function extractRestaurantUserId(ctx: any): Promise<string | undefined> {
  const { restaurantId, userId } = await extractRestaurantAuth(ctx);
  return restaurantId || userId;
}

export class RestaurantOrderController {
  static async getOrders(ctx: any) {
    try {
      const authResId = await extractRestaurantUserId(ctx);
      const { status, restaurantId, date } = ctx.query || {};
      const targetRestId = restaurantId || authResId;
      const data = await restaurantService.getOrders(targetRestId, status, date);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getOrder(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.getOrderById(id);
      if (!data) return { success: false, message: "Order not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async advanceStatus(ctx: any) {
    try {
      const id = ctx.params.id;
      const { status } = ctx.body || {};
      const data = await restaurantService.advanceOrderStatus(id, status);
      return { success: true, data, message: "Order status updated" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async cancelOrder(ctx: any) {
    try {
      const id = ctx.params.id;
      const { reason, itemIds, cancelEntireOrder } = ctx.body || {};
      const data = await restaurantService.cancelOrder(id, reason || "ยกเลิกโดยร้านค้า", itemIds, cancelEntireOrder);
      return { success: true, data, message: "Order cancelled successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async toggleOutOfStockItem(ctx: any) {
    try {
      const { id, itemId } = ctx.params;
      const data = await restaurantService.toggleOrderItemOutOfStock(id, itemId);
      return { success: true, data, message: "Item stock toggled" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getSlip(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.getOrderSlip(id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export class RestaurantSummaryController {
  static async getSummary(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const { timeframe, day, month, year } = ctx.query || {};
      const data = await restaurantService.getSalesSummary(restaurantId, {
        timeframe,
        day,
        month,
        year,
      });
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getStats(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getSalesStats(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getChart(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const { timeframe, day, month, year } = ctx.query || {};
      const data = await restaurantService.getDailySales(restaurantId, timeframe, day, month, year);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getRecentOrders(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const limit = ctx.query?.limit ? parseInt(ctx.query.limit) : 10;
      const data = await restaurantService.getRecentOrders(restaurantId, limit);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}


export class RestaurantMenuController {
  static async getCategories(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getCategories(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createCategories(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body || {};
      const { categories, label, name, category_name, remark } = body;

      if (categories && Array.isArray(categories)) {
        const data = await restaurantService.createCategories(categories, restaurantId);
        return { success: true, data, message: "Categories created successfully" };
      } else {
        const catName = category_name || name || label || (typeof body === "string" ? body : "");
        const data = await restaurantService.createCategory(
          { category_name: catName, remark: remark || "" },
          restaurantId
        );
        return { success: true, data, message: "Category created successfully" };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateCategory(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const payload = typeof body === "string" ? { category_name: body } : body;
      const data = await restaurantService.updateCategory(id, payload);
      return { success: true, data, message: "Category updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async deleteCategory(ctx: any) {
    try {
      const id = ctx.params.id;
      await restaurantService.deleteCategory(id);
      return { success: true, message: "Category deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getMenuItems(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const { search, category, page, limit } = ctx.query || {};
      const result = await restaurantService.getMenuItems({
        restaurantId,
        search,
        category,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 100,
      });
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getMenuItem(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.getMenuItemById(id);
      if (!data) return { success: false, message: "Menu item not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createMenuItem(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body || {};
      const data = await restaurantService.createMenuItem({
        ...body,
        restaurantId: body.restaurantId || restaurantId,
      });
      return { success: true, data, message: "Menu item created successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateMenuItem(ctx: any) {
    try {
      const id = ctx.params.id;
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body || {};
      const data = await restaurantService.updateMenuItem(id, {
        ...body,
        restaurantId: body.restaurantId || restaurantId,
      });
      return { success: true, data, message: "Menu item updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async toggleAvailability(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.toggleMenuItemAvailability(id);
      return { success: true, data, message: `Menu item availability set to ${data?.available}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateBatchAvailability(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const items = ctx.body?.items || ctx.body || [];
      const success = await restaurantService.updateMenuBatchAvailability(items, restaurantId);
      return { success: true, data: { success }, message: "Menu availability updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async togglePopular(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.toggleMenuItemPopular(id);
      return { success: true, data, message: `Menu item popular set to ${data?.popular}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async uploadImage(ctx: any) {
    try {
      const body = ctx.body || {};
      const fileData = body.fileData || body.image || body.base64Data || body.file;
      if (!fileData) {
        return { success: false, message: "No image file data provided" };
      }
      const fileName = body.fileName || `menu_${Date.now()}.png`;
      const mimeType = body.mimeType || "image/png";
      const result = await StorageService.uploadShopImage(fileData, fileName, mimeType);
      return {
        success: true,
        data: result,
        message: "Image uploaded to local storage successfully",
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async deleteMenuItem(ctx: any) {
    try {
      const id = ctx.params.id;
      console.log(`[RestaurantController] 🗑️ deleteMenuItem request received for menu ID: ${id}`);
      await restaurantService.deleteMenuItem(id);
      return { success: true, message: "Menu item deleted successfully" };
    } catch (error: any) {
      console.error(`[RestaurantController] ❌ deleteMenuItem error:`, error.message);
      return { success: false, message: error.message };
    }
  }

  static async deleteImage(ctx: any) {
    try {
      const body = ctx.body || {};
      const target = body.url || body.fileId || body.imageUrl;
      console.log(`[RestaurantController] 🗑️ deleteImage request received with target:`, target);
      if (!target) {
        return { success: false, message: "Image URL or fileId is required" };
      }
      const success = await StorageService.deleteFile(target);
      return { success: true, deleted: success, message: "Image deletion processed" };
    } catch (error: any) {
      console.error(`[RestaurantController] ❌ deleteImage error:`, error.message);
      return { success: false, message: error.message };
    }
  }

  // ==========================================
  // Crepe Crusts
  // ==========================================
  static async getCrusts(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getCrusts(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getCrust(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.getCrustById(id);
      if (!data) return { success: false, message: "Crust not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createCrust(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body || {};
      const data = await restaurantService.createCrust(body, restaurantId);
      return { success: true, data, message: "Crust created successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateCrust(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const data = await restaurantService.updateCrust(id, body);
      return { success: true, data, message: "Crust updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async toggleCrustAvailability(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.toggleCrustAvailability(id);
      return { success: true, data, message: `Crust availability updated to ${data?.is_available}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async deleteCrust(ctx: any) {
    try {
      const id = ctx.params.id;
      await restaurantService.deleteCrust(id);
      return { success: true, message: "Crust deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ==========================================
  // Sample Crepe Menus (เมนูตัวอย่าง)
  // ==========================================
  static async getSampleMenus(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getSampleMenus(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async getSampleMenu(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.getSampleMenuById(id);
      if (!data) return { success: false, message: "Sample menu not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createSampleMenu(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body || {};
      const data = await restaurantService.createSampleMenu(body, restaurantId);
      return { success: true, data, message: "Sample menu created successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateSampleMenu(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const data = await restaurantService.updateSampleMenu(id, body);
      return { success: true, data, message: "Sample menu updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async toggleSampleMenu(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await restaurantService.toggleSampleMenu(id);
      return { success: true, data, message: `Sample menu status updated to ${data?.is_active}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async deleteSampleMenu(ctx: any) {
    try {
      const id = ctx.params.id;
      await restaurantService.deleteSampleMenu(id);
      return { success: true, message: "Sample menu deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export class RestaurantSettingsController {
  static async getInfo(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getRestaurantInfo(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[RestaurantSettingsController]  getInfo error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async updateInfo(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      console.log(`[RestaurantSettingsController]  updateInfo for restaurantId: ${restaurantId}`);
      const body = ctx.body;
      const data = await restaurantService.updateRestaurantInfo(body, restaurantId);
      return { success: true, data, message: "Restaurant information updated" };
    } catch (error: any) {
      console.error(`[RestaurantSettingsController]  updateInfo error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async getAccount(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const data = await restaurantService.getBankAccount(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      console.error(`[RestaurantSettingsController]  getAccount error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async updateAccount(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const body = ctx.body;
      const data = await restaurantService.updateBankAccount(body, restaurantId);
      return { success: true, data, message: "Bank account details updated" };
    } catch (error: any) {
      console.error(`[RestaurantSettingsController]  updateAccount error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async updateSecurity(ctx: any) {
    try {
      const restaurantId = await extractRestaurantUserId(ctx);
      const { email, password, newPassword } = ctx.body || {};
      const success = await restaurantService.updateSecurity(email, password || newPassword, restaurantId);
      return { success, message: success ? "Security settings updated successfully" : "Failed to update security settings" };
    } catch (error: any) {
      console.error(`[RestaurantSettingsController]  updateSecurity error:`, error);
      return { success: false, message: error.message };
    }
  }

}

export class RestaurantProfileController {
  static async getProfile(ctx: any) {
    try {
      const { userId, restaurantId } = await extractRestaurantAuth(ctx);
      console.log(`[RestaurantProfileController]  getProfile for userId=${userId}, restId=${restaurantId}`);
      const data = await restaurantService.getUserProfile(userId, restaurantId);
      if (!data) {
        return { success: false, message: "User profile not found" };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error(`[RestaurantProfileController]  getProfile error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async updateProfile(ctx: any) {
    try {
      const { userId, restaurantId } = await extractRestaurantAuth(ctx);
      console.log(`[RestaurantProfileController]  updateProfile for userId=${userId}, restId=${restaurantId}`);
      const body = ctx.body || {};
      const data = await restaurantService.updateUserProfile(body, userId, restaurantId);
      return { success: true, data, message: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว" };
    } catch (error: any) {
      console.error(`[RestaurantProfileController]  updateProfile error:`, error);
      return { success: false, message: error.message };
    }
  }

  static async updatePassword(ctx: any) {
    try {
      const { userId, restaurantId } = await extractRestaurantAuth(ctx);
      console.log(`[RestaurantProfileController]  updatePassword for userId=${userId}, restId=${restaurantId}`);
      const { currentPassword, newPassword } = ctx.body || {};
      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
      }
      const result = await restaurantService.updateUserPassword(currentPassword, newPassword, userId, restaurantId);
      return result;
    } catch (error: any) {
      console.error(`[RestaurantProfileController]  updatePassword error:`, error);
      return { success: false, message: error.message };
    }
  }
}

export class RestaurantInventoryController {
  static async getItems(ctx: any) {
    try {
      const { restaurantId } = await extractRestaurantAuth(ctx);
      const data = await restaurantService.getInventoryItems(restaurantId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async createItem(ctx: any) {
    try {
      const { restaurantId } = await extractRestaurantAuth(ctx);
      const body = ctx.body || {};
      const data = await restaurantService.createInventoryItem(restaurantId || 1, body);
      return { success: true, data, message: "เพิ่มวัตถุดิบเรียบร้อยแล้ว" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async updateItem(ctx: any) {
    try {
      const id = Number(ctx.params.id);
      const body = ctx.body || {};
      const data = await restaurantService.updateInventoryItem(id, body);
      return { success: true, data, message: "อัปเดตวัตถุดิบเรียบร้อยแล้ว" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async deleteItem(ctx: any) {
    try {
      const id = Number(ctx.params.id);
      const data = await restaurantService.deleteInventoryItem(id);
      return { success: true, data, message: "ลบวัตถุดิบเรียบร้อยแล้ว" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async setPauseStatus(ctx: any) {
    try {
      const { restaurantId } = await extractRestaurantAuth(ctx);
      const { isPaused, durationMinutes, reason, allowPreorder } = ctx.body || {};
      const data = await restaurantService.setStorePauseStatus(
        restaurantId || 1,
        isPaused,
        durationMinutes,
        reason,
        allowPreorder
      );
      return { success: true, data, message: isPaused ? "ตั้งค่าหยุดรับออเดอร์ชั่วคราวแล้ว" : "เปิดรับออเดอร์ตามปกติแล้ว" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
