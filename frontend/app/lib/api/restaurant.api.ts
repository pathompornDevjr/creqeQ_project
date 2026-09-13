/**
 * Frontend Restaurant API Client
 * รวมฟังก์ชันเรียก API จัดการของร้านค้า:
 * - getOrders / getOrder / advanceStatus / cancelOrder: จัดการออเดอร์ในครัว
 * - getSummary / getStats / getChart: รายงานสรุปยอดขายและสถิติ
 * - getMenuItems / createMenuItem / updateMenuItem / uploadImage: จัดการเมนูอาหารและรูปภาพ
 * - getCrusts / getSampleMenus: จัดการแป้งเครปและเมนูตัวอย่าง
 * - getInfo / updateInfo / updateAccount / setPauseStatus: ตั้งค่าร้านและระบบพักร้าน
 * - getUserProfile / updateUserProfile / updatePassword: จัดการโปรไฟล์ผู้ดูแลร้าน
 */

import { fetchApi } from "./client";
import {
  ApiResponse,
  CategoryDTO,
  ChartDataDTO,
  CrustDTO,
  MenuItemDTO,
  OrderDTO,
  OrderStatus,
  RestaurantProfileDTO,
  RestaurantStatsDTO,
  SampleMenuDTO,
  UserProfileDTO,
} from "./types";

export const RestaurantApi = {
  // ==========================================
  // จัดการออเดอร์และคิวครัว (Orders & Kitchen Queue)
  // ==========================================
  getOrders: async (status?: OrderStatus, restaurantId?: string | number, date?: string): Promise<ApiResponse<OrderDTO[]>> => {
    return fetchApi<OrderDTO[]>("/restaurant/orders", {
      params: { status, restaurantId, date },
    });
  },

  getOrder: async (id: string): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/restaurant/orders/${id}`);
  },

  advanceStatus: async (id: string, status?: OrderStatus): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/restaurant/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateItemStatus: async (orderId: string, itemId: string, status: string): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/restaurant/orders/${orderId}/items/${itemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  cancelOrder: async (
    id: string,
    payload?: string | { reason?: string; cancelEntireOrder?: boolean; itemIds?: string[] }
  ): Promise<ApiResponse<OrderDTO>> => {
    const body = typeof payload === "string" ? { reason: payload } : payload || {};
    return fetchApi<OrderDTO>(`/restaurant/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  markPaid: async (id: string, paymentMethod?: string, slipUrl?: string): Promise<ApiResponse<OrderDTO>> => {
    return fetchApi<OrderDTO>(`/restaurant/orders/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod, slipUrl }),
    });
  },

  getSlip: async (id: string): Promise<ApiResponse<{ slipUrl: string | null }>> => {
    return fetchApi<{ slipUrl: string | null }>(`/restaurant/orders/${id}/slip`);
  },

  // Summary & Analytics
  getSummary: async (params?: { timeframe?: string; day?: string; month?: string; year?: string }): Promise<ApiResponse<any>> => {
    return fetchApi<any>("/restaurant/summary", {
      params,
      skipCache: true,
    });
  },

  getStats: async (): Promise<ApiResponse<RestaurantStatsDTO>> => {
    return fetchApi<RestaurantStatsDTO>("/restaurant/summary/stats", {
      skipCache: true,
    });
  },

  getChart: async (params?: string | { timeframe?: string; day?: string; month?: string; year?: string }): Promise<ApiResponse<any>> => {
    const queryParams = typeof params === "string" ? { timeframe: params } : params;
    return fetchApi<any>("/restaurant/summary/chart", {
      params: queryParams,
      skipCache: true,
    });
  },

  getRecentOrders: async (): Promise<ApiResponse<OrderDTO[]>> => {
    return fetchApi<OrderDTO[]>("/restaurant/summary/recent-orders", {
      skipCache: true,
    });
  },

  // Menu & Categories
  getCategories: async (): Promise<ApiResponse<CategoryDTO[]>> => {
    return fetchApi<CategoryDTO[]>("/restaurant/menu/categories");
  },

  createCategory: async (category: Partial<CategoryDTO> | { category_name?: string; name?: string; remark?: string }): Promise<ApiResponse<CategoryDTO>> => {
    return fetchApi<CategoryDTO>("/restaurant/menu/categories", {
      method: "POST",
      body: JSON.stringify(category),
    });
  },

  updateCategory: async (id: string | number, category: Partial<CategoryDTO> | { category_name?: string; name?: string; remark?: string }): Promise<ApiResponse<CategoryDTO>> => {
    return fetchApi<CategoryDTO>(`/restaurant/menu/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
  },

  deleteCategory: async (id: string | number): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>(`/restaurant/menu/categories/${id}`, {
      method: "DELETE",
    });
  },

  // Crepe Crusts
  getCrusts: async (): Promise<ApiResponse<CrustDTO[]>> => {
    return fetchApi<CrustDTO[]>("/restaurant/menu/crusts");
  },

  getCrust: async (id: string | number): Promise<ApiResponse<CrustDTO>> => {
    return fetchApi<CrustDTO>(`/restaurant/menu/crusts/${id}`);
  },

  createCrust: async (crust: Partial<CrustDTO>): Promise<ApiResponse<CrustDTO>> => {
    return fetchApi<CrustDTO>("/restaurant/menu/crusts", {
      method: "POST",
      body: JSON.stringify(crust),
    });
  },

  updateCrust: async (id: string | number, crust: Partial<CrustDTO>): Promise<ApiResponse<CrustDTO>> => {
    return fetchApi<CrustDTO>(`/restaurant/menu/crusts/${id}`, {
      method: "PUT",
      body: JSON.stringify(crust),
    });
  },

  deleteCrust: async (id: string | number): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>(`/restaurant/menu/crusts/${id}`, {
      method: "DELETE",
    });
  },

  // Sample Menus
  getSampleMenus: async (): Promise<ApiResponse<SampleMenuDTO[]>> => {
    return fetchApi<SampleMenuDTO[]>("/restaurant/menu/sample-menus");
  },

  createSampleMenu: async (menu: Partial<SampleMenuDTO>): Promise<ApiResponse<SampleMenuDTO>> => {
    return fetchApi<SampleMenuDTO>("/restaurant/menu/sample-menus", {
      method: "POST",
      body: JSON.stringify(menu),
    });
  },

  updateSampleMenu: async (id: number, menu: Partial<SampleMenuDTO>): Promise<ApiResponse<SampleMenuDTO>> => {
    return fetchApi<SampleMenuDTO>(`/restaurant/menu/sample-menus/${id}`, {
      method: "PUT",
      body: JSON.stringify(menu),
    });
  },

  deleteSampleMenu: async (id: number): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>(`/restaurant/menu/sample-menus/${id}`, {
      method: "DELETE",
    });
  },

  toggleSampleMenu: async (id: number, isActive: boolean): Promise<ApiResponse<SampleMenuDTO>> => {
    return fetchApi<SampleMenuDTO>(`/restaurant/menu/sample-menus/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<ApiResponse<MenuItemDTO[]>> => {
    return fetchApi<MenuItemDTO[]>("/restaurant/menu/items", {
      params: categoryId ? { categoryId } : undefined,
    });
  },

  getMenuItem: async (id: string): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>(`/restaurant/menu/items/${id}`);
  },

  createMenuItem: async (item: Partial<MenuItemDTO>): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>("/restaurant/menu/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  updateMenuItem: async (id: string, item: Partial<MenuItemDTO>): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>(`/restaurant/menu/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  toggleAvailability: async (id: string, available?: boolean): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>(`/restaurant/menu/items/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available }),
    });
  },

  updateMenuBatchAvailability: async (
    items: Array<{ id: string | number; isAvailable: boolean }>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>("/restaurant/menu/batch-availability", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  togglePopular: async (id: string, popular?: boolean): Promise<ApiResponse<MenuItemDTO>> => {
    return fetchApi<MenuItemDTO>(`/restaurant/menu/items/${id}/popular`, {
      method: "PATCH",
      body: JSON.stringify({ popular }),
    });
  },

  deleteMenuItem: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>(`/restaurant/menu/items/${id}`, {
      method: "DELETE",
    });
  },

  deleteMenuImage: async (urlOrFileId: string): Promise<ApiResponse<{ success: boolean; deleted: boolean }>> => {
    return fetchApi<{ success: boolean; deleted: boolean }>("/restaurant/menu/delete-image", {
      method: "POST",
      body: JSON.stringify({ url: urlOrFileId, fileId: urlOrFileId }),
    });
  },

  // Settings
  getInfo: async (): Promise<ApiResponse<RestaurantProfileDTO>> => {
    return fetchApi<RestaurantProfileDTO>("/restaurant/settings/info");
  },

  updateInfo: async (info: Partial<RestaurantProfileDTO>): Promise<ApiResponse<RestaurantProfileDTO>> => {
    return fetchApi<RestaurantProfileDTO>("/restaurant/settings/info", {
      method: "PUT",
      body: JSON.stringify(info),
    });
  },

  getAccount: async (): Promise<ApiResponse<Partial<RestaurantProfileDTO>>> => {
    return fetchApi<Partial<RestaurantProfileDTO>>("/restaurant/settings/account");
  },

  updateAccount: async (account: Partial<RestaurantProfileDTO>): Promise<ApiResponse<RestaurantProfileDTO>> => {
    return fetchApi<RestaurantProfileDTO>("/restaurant/settings/account", {
      method: "PUT",
      body: JSON.stringify(account),
    });
  },

  updateSecurity: async (security: { email?: string; oldPin?: string; newPin?: string; oldPassword?: string; newPassword?: string }): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>("/restaurant/settings/security", {
      method: "PUT",
      body: JSON.stringify(security),
    });
  },

  // User Profile (restaurant_users)
  getProfile: async (): Promise<ApiResponse<UserProfileDTO>> => {
    return fetchApi<UserProfileDTO>("/restaurant/profile");
  },

  updateProfile: async (profile: Partial<UserProfileDTO>): Promise<ApiResponse<UserProfileDTO>> => {
    return fetchApi<UserProfileDTO>("/restaurant/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  },

  updatePassword: async (passwords: { currentPassword: string; newPassword: string }): Promise<ApiResponse<{ success: boolean }>> => {
    return fetchApi<{ success: boolean }>("/restaurant/profile/password", {
      method: "PUT",
      body: JSON.stringify(passwords),
    });
  },
};
