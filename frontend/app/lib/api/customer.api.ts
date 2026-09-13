/**
 * @file customer.api.ts
 * @description Frontend Customer API Client
 * รวมฟังก์ชันเรียก API ฝั่งลูกค้า:
 * - loginCustomer / registerCustomer / getCustomerMe: ยืนยันตัวตนลูกค้า
 * - getTableInfo / getCategories / getCrusts / getSampleMenus / getMenu: ข้อมูลร้านค้าและเมนู
 * - placeOrder / getActiveOrder / getTableOrders / getLiveQueueStatus / getOrder: สั่งซื้อและติดตามคิว
 * - getPromptPay / uploadSlip / notifyCash / updatePaymentMethod / createPaymentIntent / getPaymentStatus / simulatePayment: การชำระเงิน
 */

import { fetchApi } from "./client";
import {
  ApiResponse,
  CategoryDTO,
  CrustDTO,
  CustomerProfileDTO,
  CustomerTableInfoDTO,
  MenuItemDTO,
  OrderDTO,
  PlaceOrderDTO,
  PromptPayPaymentInfoDTO,
  SampleMenuDTO,
  SlipVerificationResultDTO,
  CartItemDTO,
} from "./types";

export const CustomerApi = {
  // ==========================================
  // ยืนยันตัวตนลูกค้า (Customer Auth)
  // ==========================================
  /** เข้าสู่ระบบลูกค้า */
  loginCustomer: async (data: { nickname: string; phone?: string; password?: string; avatarUrl?: string }): Promise<ApiResponse<CustomerProfileDTO>> => {
    return fetchApi<CustomerProfileDTO>("/customer/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** ลงทะเบียนลูกค้าใหม่ */
  registerCustomer: async (data: { nickname: string; phone?: string; password?: string; avatarUrl?: string }): Promise<ApiResponse<CustomerProfileDTO>> => {
    return fetchApi<CustomerProfileDTO>("/customer/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** ดึงข้อมูลโปรไฟล์ลูกค้าปัจจุบัน */
  getCustomerMe: async (params?: { phone?: string; id?: number }): Promise<ApiResponse<CustomerProfileDTO>> => {
    return fetchApi<CustomerProfileDTO>("/customer/auth/me", {
      params,
    });
  },

  // ==========================================
  // ข้อมูลร้านค้า โต๊ะ และรายการอาหาร (Storefront & Menu)
  // ==========================================
  /** ดึงข้อมูลร้านค้าและโต๊ะ */
  getTableInfo: async (tableId: string, shopId?: string | number): Promise<ApiResponse<CustomerTableInfoDTO>> => {
    return fetchApi<CustomerTableInfoDTO>(`/customer/table/${tableId}`, {
      params: shopId ? { shopId } : undefined,
    });
  },

  /** ดึงรายการหมวดหมู่ไส้ */
  getCategories: async (shopId?: string | number): Promise<ApiResponse<CategoryDTO[]>> => {
    return fetchApi<CategoryDTO[]>("/customer/categories", {
      params: shopId ? { shopId } : undefined,
    });
  },

  /** ดึงรายการแป้งเครป */
  getCrusts: async (shopId?: string | number): Promise<ApiResponse<CrustDTO[]>> => {
    return fetchApi<CrustDTO[]>("/customer/crusts", {
      params: shopId ? { shopId } : undefined,
    });
  },

  /** ดึงรายการเมนูตัวอย่าง */
  getSampleMenus: async (shopId?: string | number): Promise<ApiResponse<SampleMenuDTO[]>> => {
    return fetchApi<SampleMenuDTO[]>("/customer/sample-menus", {
      params: shopId ? { shopId } : undefined,
    });
  },

  /** ดึงรายการเมนูและท็อปปิ้งทั้งหมด */
  getMenu: async (search?: string, category?: string, shopId?: string | number): Promise<ApiResponse<MenuItemDTO[]>> => {
    return fetchApi<MenuItemDTO[]>("/customer/menu", {
      params: { search, category, shopId },
    });
  },

  /** ดึงรายละเอียดเมนูตาม ID */
  getMenuItem: async (id: string, shopId?: string | number): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>(`/customer/menu/${id}`, {
      params: shopId ? { shopId } : undefined,
    });
  },

  // ==========================================
  // การสั่งซื้อและติดตามคิว (Orders & Queue)
  // ==========================================
  /** ส่งคำสั่งซื้อใหม่ */
  placeOrder: async (order: PlaceOrderDTO): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>("/customer/orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
  },

  /** ดึงออเดอร์ที่กำลังดำเนินการของโต๊ะหรืออุปกรณ์ */
  getActiveOrder: async (tableId: string, deviceId?: string, shopId?: string | number, phone?: string): Promise<ApiResponse<OrderDTO | null>> => {
    return fetchApi<OrderDTO | null>(`/customer/orders/active/${tableId}`, {
      params: { deviceId, shopId, phone },
    });
  },

  /** ดึงประวัติออเดอร์ของโต๊ะ */
  getTableOrders: async (tableId: string, shopId?: string | number, phone?: string, deviceId?: string): Promise<ApiResponse<OrderDTO[]>> => {
    return fetchApi<OrderDTO[]>(`/customer/orders/table/${tableId}`, {
      params: {
        ...(shopId ? { shopId } : {}),
        ...(phone ? { phone } : {}),
        ...(deviceId ? { deviceId } : {}),
      },
    });
  },

  /** ดึงข้อมูลออเดอร์ตาม ID */
  getOrderById: async (orderId: string): Promise<ApiResponse<OrderDTO | null>> => {
    return fetchApi<OrderDTO | null>(`/customer/orders/${orderId}`);
  },

  /** อลิแอสสำหรับดึงข้อมูลออเดอร์ตาม ID */
  getOrder: async (orderId: string): Promise<ApiResponse<OrderDTO | null>> => {
    return fetchApi<OrderDTO | null>(`/customer/orders/${orderId}`);
  },

  /** ดึงสถานะคิวสดแบบ Real-time */
  getLiveQueueStatus: async (
    paramsOrShopId?: { shopId?: string | number; orderId?: string; queueNumber?: string } | string | number,
    orderId?: string,
    queueNumber?: string
  ): Promise<ApiResponse<{
    currentCookingQueue: string;
    waitingCount: number;
    totalWaitingItems: number;
    estimatedMinutes: number;
    queuesAhead: number;
    itemsAhead: number;
    estimatedRemainingMinutes: number;
  }>> => {
    let queryParams: any = {};
    if (typeof paramsOrShopId === "object" && paramsOrShopId !== null) {
      queryParams = paramsOrShopId;
    } else {
      if (paramsOrShopId) queryParams.shopId = paramsOrShopId;
      if (orderId) queryParams.orderId = orderId;
      if (queueNumber) queryParams.queueNumber = queueNumber;
    }

    return fetchApi<{
      currentCookingQueue: string;
      waitingCount: number;
      totalWaitingItems: number;
      estimatedMinutes: number;
      queuesAhead: number;
      itemsAhead: number;
      estimatedRemainingMinutes: number;
    }>("/customer/orders/queue-status", {
      params: queryParams,
    });
  },

  /** เพิ่มรายการอาหารในออเดอร์เดิม */
  addItemsToOrder: async (orderId: string, items: CartItemDTO[]): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/customer/orders/${orderId}/items`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  /** แก้ไขรายการอาหารในออเดอร์เดิม */
  updateOrderItems: async (orderId: string, items: CartItemDTO[]): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/customer/orders/${orderId}/items`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  /** เปลี่ยนรายการอาหารที่วัตถุดิบหมด */
  replaceOrderItem: async (orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/customer/orders/${orderId}/replace-item`, {
      method: "POST",
      body: JSON.stringify({ outOfStockItemId, newItem }),
    });
  },

  /** ลบรายการอาหารออกจากออเดอร์ */
  removeOrderItem: async (orderId: string, itemId: string): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/customer/orders/${orderId}/remove-item`, {
      method: "POST",
      body: JSON.stringify({ itemId }),
    });
  },

  // ==========================================
  // การชำระเงินและตรวจสอบสลิป (Payment & Slip)
  // ==========================================
  /** ดึงข้อมูล QR พร้อมเพย์สำหรับชำระเงิน */
  getPromptPay: async (orderId: string): Promise<ApiResponse<PromptPayPaymentInfoDTO>> => {
    return fetchApi<PromptPayPaymentInfoDTO>(`/customer/payment/${orderId}/promptpay`);
  },

  /** สร้าง Payment Intent สำหรับชำระเงินออนไลน์ */
  createPaymentIntent: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return fetchApi<any>(`/customer/payment/${orderId}/promptpay`);
  },

  /** ตรวจสอบสถานะการชำระเงิน */
  getPaymentStatus: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return fetchApi<any>(`/customer/payment/${orderId}/status`);
  },

  /** จำลองการชำระเงินในโหมดทดสอบ */
  simulatePayment: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return fetchApi<any>(`/customer/payment/${orderId}/simulate`, {
      method: "POST",
    });
  },

  /** อัปโหลดสลิปโอนเงินเพื่อตรวจสอบความถูกต้อง */
  uploadSlip: async (
    orderId: string | number,
    slipUrlOrPayload?: string | { slipUrl?: string; fileBase64?: string },
    fileBase64?: string
  ): Promise<ApiResponse<SlipVerificationResultDTO>> => {
    let payload: any = {};
    if (typeof slipUrlOrPayload === "object" && slipUrlOrPayload !== null) {
      payload = slipUrlOrPayload;
    } else if (typeof slipUrlOrPayload === "string") {
      payload.slipUrl = slipUrlOrPayload;
      if (fileBase64) payload.fileBase64 = fileBase64;
    }
    return fetchApi<SlipVerificationResultDTO>(`/customer/payment/${orderId}/slip`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** แจ้งชำระเงินสดที่เคาน์เตอร์หน้าร้าน */
  notifyCash: async (orderId: string | number): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return fetchApi<{ success: boolean; message: string }>(`/customer/payment/${orderId}/cash`, {
      method: "POST",
    });
  },

  /** เปลี่ยนแปลงรูปแบบการชำระเงิน */
  updatePaymentMethod: async (orderId: string | number, paymentMethod: string): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/customer/payment/${orderId}/method`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    });
  },
};
