/**
 * Customer Service Layer
 * ให้บริการทางธุรกิจสำหรับระบบสั่งอาหารฝั่งลูกค้า (Customer Business Logic):
 * - การตรวจสอบข้อมูลร้านค้าและโต๊ะ
 * - การดึงเมนู แป้งเครป และเมนูตัวอย่าง
 * - การยืนยันตัวตนลูกค้า (เข้าสู่ระบบ/ลงทะเบียนด้วยเบอร์โทรและชื่อเล่น)
 * - การสั่งซื้ออาหารและคำนวณคิว พร้อมแจ้งเตือนร้านค้าผ่าน RealtimeService
 * - การติดตามสถานะคิวสด (Live Queue Status)
 * - การแก้ไข/เปลี่ยนรายการเมนูที่ของหมด (Replace Out of Stock Item)
 * - การสร้าง PromptPay QR และตรวจสอบสลิปการโอนเงิน
 */

import {
  CartItemDTO,
  CategoryDTO,
  CustomerRepositoryFactory,
  CustomerTableInfoDTO,
  CustomerTableValidationResultDTO,
  MenuItemDTO,
  OrderDTO,
  PlaceOrderDTO,
  PromptPayPaymentInfoDTO,
  SlipVerificationResultDTO,
  RestaurantRepositoryFactory,
} from "../repositories";
import { RealtimeService } from "./realtime.service";

export class CustomerService {
  private repository = CustomerRepositoryFactory.getRepository();
  private restaurantRepo = RestaurantRepositoryFactory.getRepository();

  // ==========================================
  // ข้อมูลร้านและเมนูอาหาร (Table & Menu)
  // ==========================================

  /** ดึงและตรวจสอบข้อมูลร้านค้าสำหรับหน้าสั่งอาหารของลูกค้า */
  async getTableInfo(tableId: string, shopId?: string | number): Promise<CustomerTableValidationResultDTO> {
    if (!tableId) throw new Error("Table ID is required");
    return this.repository.getTableInfo(tableId, shopId);
  }

  /** ดึงรายการหมวดหมู่อาหาร */
  async getCategories(shopId?: string | number): Promise<CategoryDTO[]> {
    return this.repository.getCategories(shopId);
  }

  /** ดึงรายการแป้งเครป */
  async getCrusts(shopId?: string | number) {
    return this.repository.getCrusts(shopId);
  }

  /** ดึงรายการเมนูตัวอย่าง */
  async getSampleMenus(shopId?: string | number) {
    return this.repository.getSampleMenus(shopId);
  }

  /** ค้นหาและดึงรายการเมนูอาหาร */
  async getMenuItems(search?: string, category?: string, shopId?: string | number): Promise<MenuItemDTO[]> {
    return this.repository.getMenuItems(search, category, shopId);
  }

  /** ดึงข้อมูลเมนูตาม ID */
  async getMenuItemById(id: string, shopId?: string | number): Promise<MenuItemDTO | null> {
    if (!id) throw new Error("Menu ID is required");
    return this.repository.getMenuItemById(id, shopId);
  }

  // ==========================================
  // การยืนยันตัวตนลูกค้า (Customer Authentication)
  // ==========================================

  /** เข้าสู่ระบบหรือลงทะเบียนลูกค้าอัตโนมัติ */
  async loginOrRegisterCustomer(nickname: string, phone: string, avatarUrl?: string) {
    if (!nickname || nickname.trim().length === 0) {
      throw new Error("กรุณาระบุรหัสผู้ใช้งาน");
    }
    if (!phone || phone.trim().length === 0) {
      throw new Error("กรุณาระบุรหัสผ่าน");
    }
    return this.repository.loginOrRegisterCustomer(nickname, phone, avatarUrl);
  }

  /** ลงทะเบียนลูกค้าใหม่ */
  async registerCustomer(nickname: string, phone: string, avatarUrl?: string) {
    if (!nickname || nickname.trim().length === 0) {
      throw new Error("กรุณาระบุรหัสผู้ใช้งาน");
    }
    if (!phone || phone.trim().length === 0) {
      throw new Error("กรุณาระบุรหัสผ่าน");
    }
    if (this.repository.registerCustomer) {
      return this.repository.registerCustomer(nickname, phone, avatarUrl);
    }
    return this.repository.loginOrRegisterCustomer(nickname, phone, avatarUrl);
  }

  /** ค้นหาข้อมูลลูกค้าจากเบอร์โทรศัพท์ */
  async getCustomerByPhone(phone: string) {
    if (!phone) throw new Error("Phone number is required");
    return this.repository.getCustomerByPhone(phone);
  }

  /** ค้นหาข้อมูลลูกค้าจาก Customer ID */
  async getCustomerById(id: number) {
    if (!id) throw new Error("Customer ID is required");
    return this.repository.getCustomerById(id);
  }

  // ==========================================
  // การสั่งซื้ออาหารและคิว (Orders)
  // ==========================================

  /**
   * สั่งซื้ออาหารใหม่
   * 1. ตรวจสอบข้อมูลลูกค้าและสินค้าในตะกร้า
   * 2. บันทึกออเดอร์ลงฐานข้อมูล
   * 3. ยิง Event Realtime "ORDER_CREATED" ไปยังหน้าจอคิวในครัวของร้านค้าทันที
   * 
   * @param orderData ข้อมูลการสั่งซื้อ (PlaceOrderDTO)
   * @returns OrderDTO ออเดอร์ที่สร้างเสร็จสมบูรณ์
   */
  async placeOrder(orderData: PlaceOrderDTO): Promise<OrderDTO> {
    if (!orderData.tableId) throw new Error("Table ID is required");
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error("Cannot place an empty order");
    }

    // ต้องระบุข้อมูลตัวตนลูกค้าก่อนสั่ง
    if (!orderData.customerPhone && !orderData.customerNickname) {
      throw new Error("กรุณาเข้าสู่ระบบลูกค้าก่อนทำการสั่งอาหาร");
    }

    if (orderData.customerPhone) {
      const cust = await this.repository.loginOrRegisterCustomer(
        orderData.customerNickname || "ลูกค้า",
        orderData.customerPhone
      );
      orderData.customerId = cust.customer_id;
      orderData.customerNickname = cust.nickname;
      orderData.customerPhone = cust.phone;
    }

    const created = await this.repository.placeOrder(orderData);

    // กระจาย Realtime Broadcast Event ไปยังร้านค้า
    try {
      const restId = created.restaurantId || "global";
      RealtimeService.broadcast(restId, "ORDER_CREATED", created);
      if (restId !== "global") {
        RealtimeService.broadcast("global", "ORDER_CREATED", created);
      }
    } catch (err) {
      console.error("Realtime broadcast error:", err);
    }

    return created;
  }

  /** ดึงออเดอร์ปัจจุบันที่กำลังดำเนินการของลูกค้า */
  async getActiveOrder(tableId: string, deviceId?: string, shopId?: string | number, phone?: string): Promise<OrderDTO | null> {
    if (!tableId) throw new Error("Table ID is required");
    return this.repository.getActiveOrder(tableId, deviceId, shopId, phone);
  }

  /** ดึงรายการออเดอร์ทั้งหมดของลูกค้า */
  async getTableOrders(tableId: string, shopId?: string | number, phone?: string, deviceId?: string): Promise<OrderDTO[]> {
    if (!tableId) throw new Error("Table ID is required");
    return this.repository.getTableOrders(tableId, shopId, phone, deviceId);
  }

  /** ดึงสถานะคิวสดแบบ Realtime (คิวที่กำลังทำ, คิวก่อนหน้า, เวลารอโดยประมาณ) */
  async getLiveQueueStatus(shopId?: string | number, orderId?: string, queueNumber?: string) {
    if (this.repository.getLiveQueueStatus) {
      return this.repository.getLiveQueueStatus(shopId, orderId, queueNumber);
    }
    return {
      currentCookingQueue: "-",
      waitingCount: 0,
      totalWaitingItems: 0,
      estimatedMinutes: 0,
      queuesAhead: 0,
      itemsAhead: 0,
      estimatedRemainingMinutes: 0,
    };
  }

  /** ดึงข้อมูลออเดอร์ตาม Order ID */
  async getOrderById(orderId: string): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    const order = await this.repository.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    return order;
  }

  /** เพิ่มรายการสินค้าในออเดอร์เดิม */
  async addItemsToOrder(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    if (!items || items.length === 0) throw new Error("Items list cannot be empty");
    const updated = await this.repository.addItemsToOrder(orderId, items);
    if (!updated) throw new Error("Order not found");
    return updated;
  }

  /**
   * เปลี่ยนรายการอาหารที่วัตถุดิบหมดเป็นเมนูใหม่
   * พร้อมแจ้งเตือน Realtime ไปยังห้องครัว
   */
  async replaceOrderItem(orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    if (!outOfStockItemId) throw new Error("Out-of-stock item ID is required");
    if (!newItem) throw new Error("New replacement item is required");

    const updated = await this.repository.replaceOrderItem(orderId, outOfStockItemId, newItem);
    if (!updated) throw new Error("Order or item not found");

    // แจ้งเตือน Realtime ไปยังครัวพร้อมรายละเอียดสินค้าที่ถูกเปลี่ยน
    try {
      const restId = updated.restaurantId || "global";
      let queuePosition: number | undefined = undefined;
      try {
        const allOrders = (await (this.repository as any).getOrders?.(restId)) || [];
        const activeOrders = allOrders
          .filter((o: any) => o.status === "pending" || o.status === "preparing")
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const qIdx = activeOrders.findIndex((o: any) => String(o.id) === String(orderId));
        if (qIdx !== -1) queuePosition = qIdx + 1;
      } catch {}

      const payload = {
        ...updated,
        queuePosition: queuePosition ?? updated.queuePosition,
        isItemReplaced: true,
        replacementInfo: {
          outOfStockItemId,
          newItemName: newItem.menuItem?.name || "เมนูใหม่",
          tableNumber: updated.tableNumber,
          tableId: updated.tableId,
          queuePosition,
        },
      };
      RealtimeService.broadcast(restId, "ORDER_UPDATED", payload);
      if (restId !== "global") {
        RealtimeService.broadcast("global", "ORDER_UPDATED", payload);
      }
    } catch (err) {
      console.error("Realtime broadcast error:", err);
    }

    return updated;
  }

  /** แก้ไขรายการสินค้าในออเดอร์ */
  async updateOrderItems(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Items array is required");
    }

    const updated = await this.repository.updateOrderItems(orderId, items);
    if (!updated) throw new Error("Order not found or cannot be modified");

    return updated;
  }

  /**
   * ลบรายการสินค้าที่หมดออกจากออเดอร์
   * พร้อมแจ้งเตือน Realtime "ORDER_ITEM_CANCELLED" ไปยังหน้าร้าน
   */
  async removeOrderItem(orderId: string, itemId: string): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    if (!itemId) throw new Error("Item ID is required");

    const existing = await this.repository.getOrderById(orderId);
    const itemToRemove = existing?.items?.find(
      (i: any) => String(i.id) === String(itemId) || (i.menuItem && String(i.menuItem.id) === String(itemId))
    );
    const cancelledItemName = itemToRemove?.menuItem?.name || "เมนูที่หมด";

    const updated = await this.repository.removeOrderItem(orderId, itemId);
    if (!updated) throw new Error("Order not found");

    // แจ้งเตือนห้องครัวว่าลูกค้ายกเลิกรายการสินค้านี้
    try {
      const restId = updated.restaurantId || "global";
      let queuePosition: number | undefined = undefined;
      try {
        const allOrders = (await (this.repository as any).getOrders?.(restId)) || [];
        const activeOrders = allOrders
          .filter((o: any) => o.status === "pending" || o.status === "preparing")
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const qIdx = activeOrders.findIndex((o: any) => String(o.id) === String(orderId));
        if (qIdx !== -1) queuePosition = qIdx + 1;
      } catch {}

      const payload = {
        ...updated,
        queuePosition: queuePosition ?? updated.queuePosition,
        isItemCancelled: true,
        cancelledItemName,
        replacementInfo: {
          outOfStockItemId: itemId,
          cancelledItemName,
          tableNumber: updated.tableNumber,
          tableId: updated.tableId,
          queuePosition,
        },
      };
      RealtimeService.broadcast(restId, "ORDER_ITEM_CANCELLED", payload);
      RealtimeService.broadcast(restId, "ORDER_UPDATED", payload);
      if (restId !== "global") {
        RealtimeService.broadcast("global", "ORDER_ITEM_CANCELLED", payload);
        RealtimeService.broadcast("global", "ORDER_UPDATED", payload);
      }
    } catch (err) {
      console.error("Realtime broadcast error:", err);
    }

    return updated;
  }

  // ==========================================
  // การชำระเงินและสลิป (Payments)
  // ==========================================

  /** ดึงข้อมูล QR Code พร้อมเพย์สำหรับการชำระเงิน */
  async getPromptPayInfo(orderId: string): Promise<PromptPayPaymentInfoDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    const info = await this.repository.getPromptPayInfo(orderId);
    if (!info) throw new Error("Order not found");
    return info;
  }

  /**
   * อัปโหลดและตรวจสอบความถูกต้องของสลิปโอนเงิน
   * หากตรวจสอบผ่าน จะแจ้งเตือน Event "ORDER_PAID" และ "CUSTOMER_PAYMENT_SUBMITTED" ไปยังร้านค้า
   */
  async uploadAndVerifySlip(
    orderId: string,
    slipUrl?: string,
    fileBase64?: string
  ): Promise<SlipVerificationResultDTO> {
    if (!orderId) throw new Error("Order ID is required");
    const result = await this.repository.uploadAndVerifySlip(orderId, slipUrl, fileBase64);

    // แจ้งเตือนร้านค้าเฉพาะเมื่อสลิปผ่านการยืนยันและสถานะเป็น paid
    if (result.isPaid) {
      try {
        const order = await this.repository.getOrderById(orderId).catch(() => null);
        const resolvedOrder = order || await this.restaurantRepo.getOrderById(orderId).catch(() => null);
        if (resolvedOrder) {
          const restId = resolvedOrder.restaurantId || "global";
          const payload = { ...resolvedOrder, isCustomerInitiated: true, slipUrl: result.slipUrl, paymentStatus: "paid" };
          RealtimeService.broadcast(restId, "CUSTOMER_PAYMENT_SUBMITTED", payload);
          RealtimeService.broadcast(restId, "ORDER_PAID", payload);
          RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", payload);
          if (restId !== "global") {
            RealtimeService.broadcast("global", "CUSTOMER_PAYMENT_SUBMITTED", payload);
            RealtimeService.broadcast("global", "ORDER_PAID", payload);
            RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", payload);
          }
        }
      } catch (err) {
        console.error("Realtime broadcast error on slip verify:", err);
      }
    }

    return result;
  }

  /** แจ้งร้านค้าว่าเลือกชำระเงินสด */
  async notifyCashPayment(orderId: string): Promise<{ success: boolean; message: string }> {
    if (!orderId) throw new Error("Order ID is required");
    const result = await this.repository.notifyCashPayment(orderId);

    try {
      const order = await this.repository.getOrderById(orderId).catch(() => null);
      const resolvedOrder = order || await this.restaurantRepo.getOrderById(orderId).catch(() => null);
      if (resolvedOrder) {
        const restId = resolvedOrder.restaurantId || "global";
        RealtimeService.broadcast(restId, "ORDER_UPDATED", resolvedOrder);
        RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", resolvedOrder);
        if (restId !== "global") {
          RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", resolvedOrder);
        }
      }
    } catch (err) {
      console.error("Realtime broadcast error on cash notify:", err);
    }

    return result;
  }

  /** เปลี่ยนแปลงวิธีชำระเงินของออเดอร์ */
  async updatePaymentMethod(orderId: string, paymentMethod: string): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    const result = await this.repository.updatePaymentMethod(orderId, paymentMethod);

    try {
      if (result) {
        const restId = result.restaurantId || "global";
        RealtimeService.broadcast(restId, "ORDER_UPDATED", result);
        RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", result);
        if (restId !== "global") {
          RealtimeService.broadcast("global", "ORDER_UPDATED", result);
          RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", result);
        }
      }
    } catch (err) {
      console.error("Realtime broadcast error on update payment method:", err);
    }

    return result;
  }
}
