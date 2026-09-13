/**
 * Customer Controllers
 * รวบรวม Controllers สำหรับระบบสั่งอาหารและบริการฝั่งลูกค้า:
 * 1. CustomerTableController: ตรวจสอบข้อมูลร้าน/โต๊ะ, ดึงหมวดหมู่, แป้งเครป, เมนูตัวอย่าง และรายการอาหาร
 * 2. CustomerOrderController: สั่งซื้ออาหาร (placeOrder), ตรวจสอบออเดอร์ปัจจุบัน, สถานะคิวสด (Live Queue), จัดการรายการอาหารในออเดอร์
 * 3. CustomerPaymentController: ขอ PromptPay QR, อัปโหลดและตรวจสอบสลิปโอนเงิน (uploadSlip), แจ้งชำระเงินสด
 * 4. CustomerAuthController: เข้าสู่ระบบ/ลงทะเบียนลูกค้า และดึงโปรไฟล์ลูกค้า (getMe)
 */

import { CustomerService } from "../services/customer.service";

const customerService = new CustomerService();

/**
 * Controller สำหรับการตรวจสอบข้อมูลร้านค้าและดึงรายการเมนู
 */
export class CustomerTableController {
  /** ตรวจสอบข้อมูลสถานะร้านค้า */
  static async getTableInfo(ctx: any) {
    try {
      const tableId = ctx.params.tableId;
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const result = await customerService.getTableInfo(tableId, shopId);
      if (!result.success) {
        return {
          success: false,
          errorType: result.errorType || "GENERAL_ERROR",
          message: result.message || "ไม่พบข้อมูลโต๊ะหรือร้านอาหาร",
          tableInfo: result.tableInfo,
        };
      }
      return { success: true, data: result.tableInfo };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงหมวดหมู่อาหาร */
  static async getCategories(ctx: any) {
    try {
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getCategories(shopId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงรายการแป้งเครป */
  static async getCrusts(ctx: any) {
    try {
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getCrusts(shopId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงรายการเมนูตัวอย่าง */
  static async getSampleMenus(ctx: any) {
    try {
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getSampleMenus(shopId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ค้นหาและดึงรายการเมนูอาหาร */
  static async getMenu(ctx: any) {
    try {
      const { search, category, shopId } = ctx.query || {};
      const restId = shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getMenuItems(search, category, restId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลเมนูตาม ID */
  static async getMenuItem(ctx: any) {
    try {
      const id = ctx.params.id;
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getMenuItemById(id, shopId);
      if (!data) return { success: false, message: "Menu item not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับการสั่งซื้อและติดตามสถานะออเดอร์
 */
export class CustomerOrderController {
  /** สั่งซื้ออาหารใหม่ */
  static async placeOrder(ctx: any) {
    try {
      const body = ctx.body;
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"] || body?.shopId;
      const data = await customerService.placeOrder({ ...body, shopId: shopId || body?.shopId });
      return { success: true, data, message: "Order placed successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงออเดอร์ปัจจุบันที่กำลังดำเนินการของลูกค้า */
  static async getActiveOrder(ctx: any) {
    try {
      const tableId = ctx.params.tableId;
      const deviceId = ctx.query?.deviceId;
      const phone = ctx.query?.phone;
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const data = await customerService.getActiveOrder(tableId, deviceId, shopId, phone);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงรายการออเดอร์ทั้งหมดของลูกค้า */
  static async getTableOrders(ctx: any) {
    try {
      const tableId = ctx.params.tableId;
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const phone = ctx.query?.phone;
      const deviceId = ctx.query?.deviceId || ctx.headers?.["x-device-id"];
      const data = await customerService.getTableOrders(tableId, shopId, phone, deviceId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลสถานะคิวสด (Live Queue Status) */
  static async getLiveQueueStatus(ctx: any) {
    try {
      const shopId = ctx.query?.shopId || ctx.headers?.["x-restaurant-id"];
      const orderId = ctx.query?.orderId;
      const queueNumber = ctx.query?.queueNumber;
      const data = await customerService.getLiveQueueStatus(shopId, orderId, queueNumber);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลออเดอร์ตาม ID */
  static async getOrder(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await customerService.getOrderById(id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** เพิ่มรายการสินค้าในออเดอร์เดิม */
  static async addItems(ctx: any) {
    try {
      const id = ctx.params.id;
      const { items } = ctx.body || {};
      const data = await customerService.addItemsToOrder(id, items);
      return { success: true, data, message: "Added items to order successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** เปลี่ยนสินค้าที่หมดเป็นเมนูใหม่ */
  static async replaceItem(ctx: any) {
    try {
      const id = ctx.params.id;
      const { outOfStockItemId, newItem } = ctx.body || {};
      const data = await customerService.replaceOrderItem(id, outOfStockItemId, newItem);
      return { success: true, data, message: "Replaced item in order successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** อัปเดตรายการสินค้าในออเดอร์ */
  static async updateItems(ctx: any) {
    try {
      const id = ctx.params.id;
      const { items } = ctx.body || {};
      const data = await customerService.updateOrderItems(id, items);
      return { success: true, data, message: "Updated order items successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ลบรายการสินค้าออกจากออเดอร์ */
  static async removeItem(ctx: any) {
    try {
      const id = ctx.params.id;
      const { itemId } = ctx.body || ctx.params || {};
      const data = await customerService.removeOrderItem(id, itemId);
      return { success: true, data, message: "Removed item from order successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับการชำระเงินและตรวจสอบสลิปของลูกค้า
 */
export class CustomerPaymentController {
  /** ขอข้อมูล PromptPay QR Code */
  static async getPromptPay(ctx: any) {
    try {
      const orderId = ctx.params.orderId;
      const data = await customerService.getPromptPayInfo(orderId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** อัปโหลดและตรวจสอบสลิปโอนเงิน */
  static async uploadSlip(ctx: any) {
    try {
      const orderId = ctx.params.orderId;
      const { slipUrl, fileBase64 } = ctx.body || {};
      const data = await customerService.uploadAndVerifySlip(orderId, slipUrl, fileBase64);

      if (data.status === "verified" || data.isPaid === true) {
        if (ctx.set) ctx.set.status = 200;
        return {
          success: true,
          message: data.message || "ตรวจสอบสลิปเรียบร้อยแล้ว ชำระเงินสำเร็จ!",
          data,
        };
      }

      if (data.status === "error") {
        if (ctx.set) ctx.set.status = data.httpStatus || 503;
        return {
          success: false,
          message: data.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
          data,
        };
      }

      if (ctx.set) ctx.set.status = data.httpStatus || 400;
      return {
        success: false,
        message: data.message || "ข้อมูลในสลิปไม่ถูกต้องตามเงื่อนไขของร้านค้า",
        data,
      };
    } catch (error: any) {
      if (ctx.set) ctx.set.status = 500;
      return {
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
      };
    }
  }

  /** แจ้งเลือกชำระเงินสด */
  static async notifyCash(ctx: any) {
    try {
      const orderId = ctx.params.orderId;
      const data = await customerService.notifyCashPayment(orderId);
      return data;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** เปลี่ยนรูปแบบการชำระเงิน */
  static async updatePaymentMethod(ctx: any) {
    try {
      const orderId = ctx.params.orderId;
      const { paymentMethod } = ctx.body || {};
      const data = await customerService.updatePaymentMethod(orderId, paymentMethod);
      return { success: true, data, message: "อัปเดตรูปแบบการชำระเงินเรียบร้อยแล้ว" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับการยืนยันตัวตนลูกค้า
 */
export class CustomerAuthController {
  /** เข้าสู่ระบบหรือลงทะเบียนลูกค้า */
  static async login(ctx: any) {
    try {
      const { nickname, phone, password, avatarUrl } = ctx.body || {};
      const cleanNick = String(nickname || "").trim() || "ลูกค้า";
      const credential = String(password || phone || "").trim() || "0000000000";

      const customer = await customerService.loginOrRegisterCustomer(
        cleanNick,
        credential,
        avatarUrl
      );
      return {
        success: true,
        data: customer,
        message: `ยินดีต้อนรับคุณ ${customer.nickname}`,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ลงทะเบียนลูกค้าใหม่ */
  static async register(ctx: any) {
    try {
      const { nickname, phone, password, avatarUrl } = ctx.body || {};
      const cleanNick = String(nickname || "").trim();
      const credential = String(password || phone || "").trim();

      if (!cleanNick) {
        return {
          success: false,
          message: "กรุณาระบุรหัสผู้ใช้งานที่ต้องการลงทะเบียน",
        };
      }
      if (!credential) {
        return {
          success: false,
          message: "กรุณากำหนดรหัสผ่าน",
        };
      }
      const customer = await customerService.registerCustomer(
        cleanNick,
        credential,
        avatarUrl
      );
      return {
        success: true,
        data: customer,
        message: `ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${customer.nickname}`,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลโปรไฟล์ลูกค้าปัจจุบัน */
  static async getMe(ctx: any) {
    try {
      const phone = ctx.query?.phone;
      const id = ctx.query?.id ? Number(ctx.query.id) : undefined;
      if (phone) {
        const customer = await customerService.getCustomerByPhone(phone);
        if (!customer) return { success: false, message: "Customer not found" };
        return { success: true, data: customer };
      }
      if (id) {
        const customer = await customerService.getCustomerById(id);
        if (!customer) return { success: false, message: "Customer not found" };
        return { success: true, data: customer };
      }
      return { success: false, message: "Phone or ID is required" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
