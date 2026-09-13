/**
 * Restaurant Service Layer
 * ให้บริการทางธุรกิจสำหรับระบบจัดการของร้านค้า (Restaurant Admin & Kitchen Operations):
 * - จัดการออเดอร์ในครัวและการเลื่อนสถานะคิว (Kitchen Queue Operations: pending -> cooking -> ready -> completed)
 * - การแจ้งเตือนผ่าน Realtime Hub (SSE/WebSocket) เมื่อมีการเปลี่ยนแปลงสถานะออเดอร์
 * - การจัดการและอัปโหลดรูปภาพเมนู, แป้งเครป, รูปโปรไฟล์ร้านค้า และ QR Code พร้อมเพย์
 * - การวิเคราะห์และรายงานสรุปยอดขาย (Daily/Weekly/Monthly/Yearly Sales Analytics)
 * - การบริหารจัดการสต็อกวัตถุดิบ (Inventory & Low Stock Alerts)
 * - การพักร้านชั่วคราว (Pause Store Feature)
 */

import {
  BankAccountDTO,
  CategoryDTO,
  CrustDTO,
  DailySalesDTO,
  MenuItemDTO,
  OrderDTO,
  OrderStatus,
  RestaurantProfileDTO,
  RestaurantQueryOptions,
  RestaurantRepositoryFactory,
  RestaurantStatsDTO,
  UserProfileDTO,
  SampleMenuDTO,
} from "../repositories";
import { StorageService } from "./storage.service";
import { normalizePromptPay } from "../libs/format";
import { RealtimeService } from "./realtime.service";

/**
 * ฟังก์ชันช่วยแปลงและอัปโหลดรูปภาพเมนู (รองรับทั้งรูปเดี่ยวและหลายรูป)
 * หากเป็น Base64 Data URI จะทำการอัปโหลดลง Storage และแปลงเป็น URL ถาวร
 * 
 * @param images รายการรูปภาพ (Array of URLs or Base64)
 * @param singleImage รูปภาพเดี่ยว
 * @returns Promise คืนรายการ URL ของรูปภาพที่พร้อมใช้งาน
 */
async function processMenuImagesUpload(
  images: string[] | undefined,
  singleImage: string | undefined
): Promise<string[]> {
  const list =
    Array.isArray(images) && images.length > 0
      ? images
      : singleImage
      ? [singleImage]
      : [];
  const processedUrls: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const img = list[i];
    if (!img) continue;

    // หากเป็น URL เต็ม หรือ Path /uploads/ อยู่แล้ว ไม่ต้องอัปโหลดซ้ำ
    if (
      (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/uploads/")) &&
      !img.startsWith("data:")
    ) {
      processedUrls.push(img);
      continue;
    }

    // หากเป็น Base64 ให้อัปโหลดลง Storage
    const res = await StorageService.uploadShopImage(
      img,
      `menu_${Date.now()}_${i + 1}.png`
    );
    if (res && res.directUrl) {
      processedUrls.push(res.directUrl);
    }
  }

  return processedUrls;
}

export class RestaurantService {
  private repository = RestaurantRepositoryFactory.getRepository();

  // ==========================================
  // การจัดการออเดอร์และคิวครัว (Orders & Kitchen Queue)
  // ==========================================
  async getOrders(restaurantId?: string | number, status?: string, date?: string): Promise<OrderDTO[]> {
    return this.repository.getOrders(restaurantId, status, date);
  }

  async getOrderById(id: string): Promise<OrderDTO | null> {
    if (!id) throw new Error("Order ID is required");
    return this.repository.getOrderById(id);
  }

  async advanceOrderStatus(id: string, nextStatus?: OrderStatus): Promise<OrderDTO | null> {
    if (!id) throw new Error("Order ID is required");
    const updated = await this.repository.advanceOrderStatus(id, nextStatus);
    if (!updated) throw new Error("Order not found");

    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", updated);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", updated);
      }
    } catch (err) {
      console.error("Realtime broadcast error:", err);
    }

    return updated;
  }

  async cancelOrder(orderId: string, reason: string, itemIds?: string[], cancelEntireOrder?: boolean): Promise<OrderDTO | null> {
    if (!orderId) throw new Error("Order ID is required");
    const existing = await this.getOrderById(orderId);
    if (!existing) throw new Error("Order not found");
    if (existing.status !== "pending") {
      throw new Error("สามารถยกเลิกออเดอร์ได้เฉพาะสถานะ 'รอครัวรับ' เท่านั้น");
    }
    const cleanReason = reason?.trim() || "ยกเลิกโดยร้านค้า";
    const updated = await this.repository.cancelOrder(orderId, cleanReason, itemIds, cancelEntireOrder);
    if (!updated) throw new Error("Order not found");

    try {
      const restId = updated.restaurantId || "global";
      const payload = {
        orderId,
        order: updated,
        cancelledItemIds: itemIds || [],
        cancelEntireOrder: !!cancelEntireOrder,
        reason: cleanReason,
      };

      RealtimeService.broadcast(restId, "ORDER_CANCELLED", payload);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "ORDER_CANCELLED", payload);
      }
    } catch (err) {
      console.error("Realtime broadcast cancelOrder error:", err);
    }

    return updated;
  }

  async toggleOrderItemOutOfStock(orderId: string, itemId: string): Promise<OrderDTO | null> {
    if (!orderId || !itemId) throw new Error("Order ID and Item ID are required");
    const updated = await this.repository.toggleOrderItemOutOfStock(orderId, itemId);
    if (!updated) throw new Error("Order or item not found");

    try {
      const restId = updated.restaurantId || "global";
      const toggledItem = updated.items.find((i) => String(i.id) === String(itemId) || (i.menuItem && String(i.menuItem.id) === String(itemId)));
      const isOutOfStockNow = toggledItem ? !!toggledItem.isOutOfStock : false;
      const targetMenuId = toggledItem?.menuItem?.id || (toggledItem as any)?.menuItemId;
      const targetMenuName = toggledItem?.menuItem?.name;

      const menuUpdatedPayload = {
        orderId,
        itemId,
        menuId: targetMenuId,
        menuName: targetMenuName,
        isOutOfStock: isOutOfStockNow,
        available: !isOutOfStockNow,
      };

      RealtimeService.broadcast(restId, "ORDER_UPDATED", updated);
      RealtimeService.broadcast(restId, "MENU_UPDATED", menuUpdatedPayload);
      RealtimeService.broadcast(restId, "OUT_OF_STOCK_TOGGLED", menuUpdatedPayload);

      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "ORDER_UPDATED", updated);
        RealtimeService.broadcast("global", "MENU_UPDATED", menuUpdatedPayload);
        RealtimeService.broadcast("global", "OUT_OF_STOCK_TOGGLED", menuUpdatedPayload);
      }
    } catch (err) {
      console.error("Realtime broadcast error:", err);
    }

    return updated;
  }

  async getOrderSlip(orderId: string) {
    if (!orderId) throw new Error("Order ID is required");
    const slip = await this.repository.getOrderSlip(orderId);
    if (!slip) throw new Error("Order not found");
    return slip;
  }

  // ==========================================
  // Analytics & Summary
  // ==========================================
  async getSalesStats(restaurantId?: string | number): Promise<RestaurantStatsDTO> {
    return this.repository.getSalesStats(restaurantId);
  }

  async getDailySales(
    restaurantId?: string | number,
    timeframe?: string,
    day?: string,
    month?: string,
    year?: string
  ): Promise<DailySalesDTO[]> {
    return this.repository.getDailySales(restaurantId, timeframe, day, month, year);
  }

  async getRecentOrders(restaurantId?: string | number, limit?: number): Promise<OrderDTO[]> {
    return this.repository.getRecentOrders(restaurantId, limit);
  }

  async getSalesSummary(
    restaurantId?: string | number,
    params?: any
  ): Promise<any> {
    if (this.repository.getSalesSummary) {
      return this.repository.getSalesSummary(restaurantId, params);
    }
    return {
      stats: { revenue: 0, orders: 0, avgBill: 0, peakTime: "-", growth: 0 },
      chartData: [],
      bestSellers: [],
      categoryShare: [],
    };
  }


  // ==========================================
  // Menu & Categories
  // ==========================================
  async getCategories(restaurantId?: string | number): Promise<CategoryDTO[]> {
    return this.repository.getCategories(restaurantId);
  }

  async createCategory(
    data: Partial<CategoryDTO> | { category_name?: string; name?: string; label?: string; remark?: string },
    restaurantId?: string | number
  ): Promise<CategoryDTO> {
    if (typeof this.repository.createCategory === "function") {
      return this.repository.createCategory(data, restaurantId);
    }
    const label = data.category_name || data.name || data.label || "";
    const list = await this.repository.createCategories([{ category_name: label, remark: data.remark }], restaurantId);
    return list[0];
  }

  async createCategories(
    labels: (string | Partial<CategoryDTO>)[],
    restaurantId?: string | number
  ): Promise<CategoryDTO[]> {
    if (!labels || labels.length === 0) throw new Error("Category labels are required");
    return this.repository.createCategories(labels, restaurantId);
  }

  async updateCategory(
    id: string | number,
    data: Partial<CategoryDTO> | string | { category_name?: string; name?: string; label?: string; remark?: string }
  ): Promise<CategoryDTO | null> {
    if (!id) throw new Error("Category ID is required");
    const updated = await this.repository.updateCategory(id, data);
    if (!updated) throw new Error("Category not found");
    return updated;
  }

  async deleteCategory(id: string | number): Promise<boolean> {
    if (!id) throw new Error("Category ID is required");
    const success = await this.repository.deleteCategory(id);
    if (!success) throw new Error("Category not found or failed to delete");
    return success;
  }

  async getMenuItems(options: RestaurantQueryOptions) {
    return this.repository.getMenuItems(options);
  }

  async getMenuItemById(id: string): Promise<MenuItemDTO | null> {
    if (!id) throw new Error("Menu Item ID is required");
    return this.repository.getMenuItemById(id);
  }

  async createMenuItem(item: MenuItemDTO): Promise<MenuItemDTO> {
    if (!item.name || item.price === undefined) {
      throw new Error("Menu item name and price are required");
    }
    const uploadedImages = await processMenuImagesUpload(item.images, item.image);
    const itemWithImages: MenuItemDTO = {
      ...item,
      images: uploadedImages,
      image: uploadedImages[0] || item.image || "",
    };
    return this.repository.createMenuItem(itemWithImages);
  }

  async updateMenuItem(
    id: string,
    item: Partial<MenuItemDTO> & { deletedImages?: string[] }
  ): Promise<MenuItemDTO | null> {
    if (!id) throw new Error("Menu Item ID is required");

    let existing: MenuItemDTO | null = null;
    try {
      existing = await this.repository.getMenuItemById(id);
    } catch {}

    let itemToUpdate = { ...item };

    // 1. Delete explicitly specified deleted images from local storage
    const explicitDeleted = Array.isArray(item.deletedImages) ? item.deletedImages : [];
    for (const delUrl of explicitDeleted) {
      if (delUrl && typeof delUrl === "string" && !delUrl.startsWith("data:")) {
        try {
          await StorageService.deleteFile(delUrl);
        } catch (err) {
          console.warn("Could not delete explicit menu image from local storage:", err);
        }
      }
    }

    // 2. Process and upload new images, and delete any missing existing images
    if (item.images !== undefined || item.image !== undefined) {
      const uploadedImages = await processMenuImagesUpload(item.images, item.image);
      itemToUpdate.images = uploadedImages;
      itemToUpdate.image = uploadedImages[0] || "";

      // Delete removed images from local storage
      if (existing) {
        const existingImages = existing.images || (existing.image ? [existing.image] : []);
        for (const oldUrl of existingImages) {
          if (
            oldUrl &&
            !uploadedImages.includes(oldUrl) &&
            !explicitDeleted.includes(oldUrl)
          ) {
            try {
              await StorageService.deleteFile(oldUrl);
            } catch (err) {
              console.warn("Could not delete old menu image from local storage:", err);
            }
          }
        }
      }
    }

    const updated = await this.repository.updateMenuItem(id, itemToUpdate);
    if (!updated) throw new Error("Menu item not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "MENU_UPDATED", updated);
    } catch {}
    return updated;
  }

  async toggleMenuItemAvailability(id: string): Promise<MenuItemDTO | null> {
    if (!id) throw new Error("Menu Item ID is required");
    const updated = await this.repository.toggleMenuItemAvailability(id);
    if (!updated) throw new Error("Menu item not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "MENU_UPDATED", updated);
    } catch {}
    return updated;
  }

  async updateMenuBatchAvailability(
    items: Array<{ id: string | number; isAvailable: boolean }>,
    restaurantId?: string | number
  ): Promise<boolean> {
    if (!items || !Array.isArray(items)) throw new Error("Items array is required");
    const numRestId = restaurantId ? Number(restaurantId) : undefined;
    if (this.repository.updateMenuBatchAvailability) {
      await this.repository.updateMenuBatchAvailability(items, numRestId);
    }

    // Real-time broadcast for menu update
    try {
      const restId = numRestId || "global";
      RealtimeService.broadcast(restId, "MENU_UPDATED", { items, batch: true });
      RealtimeService.broadcast(restId, "OUT_OF_STOCK_TOGGLED", { items, batch: true });
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "MENU_UPDATED", { items, batch: true });
        RealtimeService.broadcast("global", "OUT_OF_STOCK_TOGGLED", { items, batch: true });
      }

      // Fetch all updated orders to broadcast live queue / order updates
      const updatedOrders = await this.repository.getOrders(numRestId);
      for (const ord of updatedOrders) {
        if (ord.status === "pending") {
          RealtimeService.broadcast(restId, "ORDER_UPDATED", ord);
          if (String(restId) !== "global") {
            RealtimeService.broadcast("global", "ORDER_UPDATED", ord);
          }
        }
      }
    } catch (err) {
      console.error("Realtime broadcast batch out-of-stock error:", err);
    }

    return true;
  }

  async toggleMenuItemPopular(id: string): Promise<MenuItemDTO | null> {
    if (!id) throw new Error("Menu Item ID is required");
    const updated = await this.repository.toggleMenuItemPopular(id);
    if (!updated) throw new Error("Menu item not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "MENU_UPDATED", updated);
    } catch {}
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    if (!id) throw new Error("Menu Item ID is required");

    try {
      const existing = await this.repository.getMenuItemById(id);
      if (existing) {
        const existingImages = existing.images || (existing.image ? [existing.image] : []);
        for (const imgUrl of existingImages) {
          if (imgUrl) {
            try {
              await StorageService.deleteFile(imgUrl);
            } catch (err) {
              console.warn("Could not delete menu image from local storage on menu delete:", err);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Error checking existing menu images for delete:", err);
    }

    const success = await this.repository.deleteMenuItem(id);
    if (!success) throw new Error("Menu item not found");
    return success;
  }

  // ==========================================
  // Crepe Crusts
  // ==========================================
  async getCrusts(restaurantId?: string | number): Promise<CrustDTO[]> {
    return this.repository.getCrusts(restaurantId);
  }

  async getCrustById(id: string | number): Promise<CrustDTO | null> {
    if (!id) throw new Error("Crust ID is required");
    return this.repository.getCrustById(id);
  }

  async createCrust(data: Partial<CrustDTO>, restaurantId?: string | number): Promise<CrustDTO> {
    const rawName = (data.crust_name || data.name || "").trim();
    if (!rawName || data.price === undefined) {
      throw new Error("กรุณาระบุชื่อแป้งเครปและราคา");
    }

    const existingCrusts = await this.repository.getCrusts(restaurantId);
    const isDuplicate = existingCrusts.some(
      (c) => (c.crust_name || c.name || "").trim().toLowerCase() === rawName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`ชื่อแป้งเครป "${rawName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
    }

    let crustImage = data.crust_image;
    if (crustImage && (crustImage.startsWith("data:") || crustImage.startsWith("base64:"))) {
      const uploadRes = await StorageService.uploadShopImage(
        crustImage,
        `crust_${Date.now()}.png`
      );
      if (uploadRes && uploadRes.directUrl) {
        crustImage = uploadRes.directUrl;
      }
    }
    const created = await this.repository.createCrust(
      { ...data, crust_name: rawName, name: rawName, crust_image: crustImage },
      restaurantId
    );
    try {
      const restId = created.restaurantId || "global";
      RealtimeService.broadcast(restId, "CRUST_UPDATED", created);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "CRUST_UPDATED", created);
      }
    } catch {}
    return created;
  }

  async updateCrust(id: string | number, data: Partial<CrustDTO>): Promise<CrustDTO | null> {
    if (!id) throw new Error("Crust ID is required");
    const rawName = data.crust_name !== undefined ? data.crust_name.trim() : (data.name !== undefined ? data.name.trim() : undefined);
    if (rawName !== undefined) {
      if (!rawName) {
        throw new Error("ชื่อแป้งเครปต้องไม่เป็นค่าว่าง");
      }
      const existing = await this.repository.getCrustById(id);
      const restId = existing?.restaurantId;
      const existingCrusts = await this.repository.getCrusts(restId);
      const isDuplicate = existingCrusts.some(
        (c) =>
          String(c.id || c.crust_id) !== String(id) &&
          (c.crust_name || c.name || "").trim().toLowerCase() === rawName.toLowerCase()
      );
      if (isDuplicate) {
        throw new Error(`ชื่อแป้งเครป "${rawName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      }
    }

    let crustImage = data.crust_image;
    if (crustImage && (crustImage.startsWith("data:") || crustImage.startsWith("base64:"))) {
      const uploadRes = await StorageService.uploadShopImage(
        crustImage,
        `crust_${Date.now()}.png`
      );
      if (uploadRes && uploadRes.directUrl) {
        crustImage = uploadRes.directUrl;
      }
    }
    const updated = await this.repository.updateCrust(id, {
      ...data,
      ...(rawName !== undefined ? { crust_name: rawName, name: rawName } : {}),
      ...(crustImage !== undefined ? { crust_image: crustImage } : {}),
    });
    if (!updated) throw new Error("Crust not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "CRUST_UPDATED", updated);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "CRUST_UPDATED", updated);
      }
    } catch {}
    return updated;
  }

  async toggleCrustAvailability(id: string | number): Promise<CrustDTO | null> {
    if (!id) throw new Error("Crust ID is required");
    const updated = await this.repository.toggleCrustAvailability(id);
    if (!updated) throw new Error("Crust not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "CRUST_UPDATED", updated);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "CRUST_UPDATED", updated);
      }
    } catch {}
    return updated;
  }

  async deleteCrust(id: string | number): Promise<boolean> {
    if (!id) throw new Error("Crust ID is required");
    const success = await this.repository.deleteCrust(id);
    if (!success) throw new Error("Crust not found or failed to delete");
    try {
      RealtimeService.broadcast("global", "CRUST_UPDATED", { deletedId: id });
    } catch {}
    return success;
  }

  // ==========================================
  // Sample Crepe Menus Management
  // ==========================================
  async getSampleMenus(restaurantId?: string | number): Promise<SampleMenuDTO[]> {
    return this.repository.getSampleMenus(restaurantId);
  }

  async getSampleMenuById(id: string | number): Promise<SampleMenuDTO | null> {
    if (!id) throw new Error("Sample Menu ID is required");
    return this.repository.getSampleMenuById(id);
  }

  async createSampleMenu(data: Partial<SampleMenuDTO>, restaurantId?: string | number): Promise<SampleMenuDTO> {
    if (!data.menu_name && !data.name) {
      throw new Error("Menu name is required");
    }
    let sampleImage = data.imageUrl !== undefined ? data.imageUrl : (data.image_url !== undefined ? data.image_url : (data as any).sample_image);
    if (sampleImage && (sampleImage.startsWith("data:") || sampleImage.startsWith("base64:"))) {
      const uploadRes = await StorageService.uploadShopImage(
        sampleImage,
        `sample_${Date.now()}.png`
      );
      if (uploadRes && (uploadRes.directUrl || uploadRes.webViewLink)) {
        sampleImage = uploadRes.directUrl || uploadRes.webViewLink;
      }
    } else if (sampleImage === "") {
      sampleImage = null as any;
    }
    const created = await this.repository.createSampleMenu(
      { ...data, image_url: sampleImage, imageUrl: sampleImage, sample_image: sampleImage },
      restaurantId
    );
    try {
      const restId = created.restaurantId || "global";
      RealtimeService.broadcast(restId, "SAMPLE_MENU_UPDATED", created);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "SAMPLE_MENU_UPDATED", created);
      }
    } catch {}
    return created;
  }

  async updateSampleMenu(id: string | number, data: Partial<SampleMenuDTO>): Promise<SampleMenuDTO | null> {
    if (!id) throw new Error("Sample Menu ID is required");
    const existing = await this.repository.getSampleMenuById(id);
    let sampleImage = data.imageUrl !== undefined ? data.imageUrl : (data.image_url !== undefined ? data.image_url : (data as any).sample_image);
    if (sampleImage && (sampleImage.startsWith("data:") || sampleImage.startsWith("base64:"))) {
      const uploadRes = await StorageService.uploadShopImage(
        sampleImage,
        `sample_${Date.now()}.png`
      );
      if (uploadRes && (uploadRes.directUrl || uploadRes.webViewLink)) {
        sampleImage = uploadRes.directUrl || uploadRes.webViewLink;
        if (existing?.image_url && existing.image_url !== sampleImage && existing.image_url.startsWith("http")) {
          StorageService.deleteFile(existing.image_url).catch(() => {});
        }
      }
    } else if (sampleImage === "") {
      if (existing?.image_url && existing.image_url.startsWith("http")) {
        StorageService.deleteFile(existing.image_url).catch(() => {});
      }
      sampleImage = null as any;
    }
    const updated = await this.repository.updateSampleMenu(id, {
      ...data,
      ...(sampleImage !== undefined ? { image_url: sampleImage, imageUrl: sampleImage, sample_image: sampleImage } : {}),
    });

    if (!updated) throw new Error("Sample Menu not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "SAMPLE_MENU_UPDATED", updated);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "SAMPLE_MENU_UPDATED", updated);
      }
    } catch {}
    return updated;
  }

  async toggleSampleMenu(id: string | number): Promise<SampleMenuDTO | null> {
    if (!id) throw new Error("Sample Menu ID is required");
    const updated = await this.repository.toggleSampleMenu(id);
    if (!updated) throw new Error("Sample Menu not found");
    try {
      const restId = updated.restaurantId || "global";
      RealtimeService.broadcast(restId, "SAMPLE_MENU_UPDATED", updated);
      if (String(restId) !== "global") {
        RealtimeService.broadcast("global", "SAMPLE_MENU_UPDATED", updated);
      }
    } catch {}
    return updated;
  }

  async deleteSampleMenu(id: string | number): Promise<boolean> {
    if (!id) throw new Error("Sample Menu ID is required");
    const existing = await this.repository.getSampleMenuById(id);
    if (existing?.image_url && existing.image_url.startsWith("http")) {
      StorageService.deleteFile(existing.image_url).catch(() => {});
    }
    const success = await this.repository.deleteSampleMenu(id);
    if (!success) throw new Error("Sample Menu not found or failed to delete");
    try {
      RealtimeService.broadcast("global", "SAMPLE_MENU_UPDATED", { deletedId: id });
    } catch {}
    return success;
  }

  // ==========================================
  // Restaurant Profile & Settings
  // ==========================================
  async getRestaurantInfo(restaurantId?: string | number): Promise<RestaurantProfileDTO> {
    return this.repository.getRestaurantInfo(restaurantId);
  }

  async updateRestaurantInfo(data: Partial<RestaurantProfileDTO> & { deletedImages?: string[] }, restaurantId?: string | number): Promise<RestaurantProfileDTO> {
    // Validate email format if provided
    if (data.email && data.email.trim().length > 0) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(data.email.trim())) {
        throw new Error("รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น contact@example.com");
      }
    }

    // Validate account number / promptpay format if provided
    const accNum = (data as any).accountNumber || data.bankAccountNumber || (data as any).account_number || (data as any).promptPayId;
    if (accNum && String(accNum).trim().length > 0) {
      if (!/^\d+$/.test(String(accNum).trim())) {
        throw new Error("หมายเลขบัญชีธนาคารหรือพร้อมเพย์ต้องเป็นตัวเลขเท่านั้น");
      }
    }

    const existing = await this.repository.getRestaurantInfo(restaurantId);

    // Validate that payment account is complete if attempting to open store (isOpen: true)
    if (data.isOpen === true || (data as any).is_open === true) {
      const finalBank = (data.bankName ?? data.bank_name ?? (data as any).bank ?? existing.bankName ?? (existing as any).bank_name ?? "").trim();
      const finalAccNum = (data.bankAccountNumber ?? (data as any).accountNumber ?? data.bank_account_number ?? data.promptPayNumber ?? (data as any).promptpay_number ?? existing.bankAccountNumber ?? (existing as any).bank_account_number ?? existing.promptPayNumber ?? "").trim();
      const finalAccName = (data.bankAccountName ?? (data as any).accountName ?? data.bank_account_name ?? data.promptPayName ?? (data as any).promptpay_name ?? existing.bankAccountName ?? (existing as any).bank_account_name ?? existing.promptPayName ?? "").trim();

      if (!finalBank || !finalAccNum || !finalAccName) {
        throw new Error("ไม่สามารถเปิดรับออเดอร์ได้ กรุณากรอกข้อมูลบัญชีรับเงิน (ธนาคาร/พร้อมเพย์, เลขที่บัญชี, ชื่อบัญชี) ให้สมบูรณ์ในหน้าตั้งค่าก่อน");
      }
    }

    // 1. Process Logo upload if base64
    let processedLogoUrl = data.logoUrl || data.restaurant_logo;
    if (processedLogoUrl && processedLogoUrl.startsWith("data:image/")) {
      try {
        const uploadRes = await StorageService.uploadShopProfileImage(processedLogoUrl, `logo_${Date.now()}.png`, "image/png");
        processedLogoUrl = uploadRes.directUrl || uploadRes.webViewLink;
        if (existing.logoUrl && existing.logoUrl !== processedLogoUrl) {
          StorageService.deleteFile(existing.logoUrl).catch(() => {});
        }
      } catch (err) {
        console.warn("Logo upload failed:", err);
      }
    }

    // 2. Process Banner upload if base64
    let processedBannerUrl = data.bannerUrl || data.restaurant_cover;
    if (processedBannerUrl && processedBannerUrl.startsWith("data:image/")) {
      try {
        const uploadRes = await StorageService.uploadShopProfileImage(processedBannerUrl, `cover_${Date.now()}.png`, "image/png");
        processedBannerUrl = uploadRes.directUrl || uploadRes.webViewLink;
        if (existing.bannerUrl && existing.bannerUrl !== processedBannerUrl) {
          StorageService.deleteFile(existing.bannerUrl).catch(() => {});
        }
      } catch (err) {
        console.warn("Banner upload failed:", err);
      }
    }

    // 3. Process Payment QR upload
    let rawQr = data.promptPayQrImage !== undefined ? data.promptPayQrImage : (data.promptpay_qr !== undefined ? data.promptpay_qr : data.qrpayment_url);
    let processedQrImage = rawQr || null;
    let processedQrPaymentUrl = (rawQr && (rawQr.startsWith("http") || rawQr.startsWith("https"))) ? rawQr : null;

    if (rawQr && rawQr.startsWith("data:image/")) {
      try {
        const uploadRes = await StorageService.uploadQrPaymentImage(rawQr, `qr_payment_${Date.now()}.png`, "image/png");
        processedQrImage = uploadRes.directUrl || uploadRes.webViewLink;
        processedQrPaymentUrl = processedQrImage;

        const oldQr = existing.promptPayQrImage || existing.qrpayment_url;
        if (oldQr && oldQr !== processedQrImage && oldQr.startsWith("http")) {
          StorageService.deleteFile(oldQr).catch(() => {});
        }
      } catch (err) {
        console.warn("QR Payment upload failed:", err);
      }
    } else if (rawQr && (rawQr.startsWith("000201") || rawQr.startsWith("promptpay://"))) {
      // If raw EMVCo payload was passed, generate PNG image and upload to local storage
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(rawQr)}`;
        const qrRes = await fetch(qrUrl);
        if (qrRes.ok) {
          const arrayBuffer = await qrRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const uploadRes = await StorageService.uploadQrPaymentImage(buffer, `qr_promptpay_${Date.now()}.png`, "image/png");
          processedQrImage = uploadRes.directUrl || uploadRes.webViewLink;
          processedQrPaymentUrl = processedQrImage;
        }
      } catch (err) {
        console.warn("Generating and uploading PromptPay QR failed:", err);
      }
    } else if (!rawQr) {
      // QR was cleared/not provided, remove old QR image from storage if existing
      const oldQr = existing.promptPayQrImage || existing.qrpayment_url;
      if (oldQr && oldQr.startsWith("http")) {
        StorageService.deleteFile(oldQr).catch(() => {});
      }
      processedQrImage = null;
      processedQrPaymentUrl = null;
    }

    // 4. Delete explicitly requested deleted images
    if (data.deletedImages && data.deletedImages.length > 0) {
      for (const delUrl of data.deletedImages) {
        if (delUrl) {
          StorageService.deleteFile(delUrl).catch(() => {});
        }
      }
    }

    const payload: Partial<RestaurantProfileDTO> = {
      ...data,
      logoUrl: processedLogoUrl,
      restaurant_logo: processedLogoUrl,
      bannerUrl: processedBannerUrl,
      restaurant_cover: processedBannerUrl,
      promptPayQrImage: processedQrImage,
      promptpay_qr: processedQrImage,
      qrpayment_url: processedQrPaymentUrl || (processedQrImage && (processedQrImage.startsWith("http") || processedQrImage.startsWith("https")) ? processedQrImage : undefined),
    };

    return this.repository.updateRestaurantInfo(payload, restaurantId);
  }

  async getBankAccount(restaurantId?: string | number): Promise<BankAccountDTO> {
    return this.repository.getBankAccount(restaurantId);
  }

  async updateBankAccount(data: Partial<BankAccountDTO>, restaurantId?: string | number): Promise<BankAccountDTO> {
    const accNum = data.accountNumber || (data as any).account_number;
    if (accNum && accNum.trim().length > 0) {
      if (!/^\d+$/.test(accNum.trim())) {
        throw new Error("หมายเลขบัญชีธนาคารหรือพร้อมเพย์ต้องเป็นตัวเลขเท่านั้น");
      }
    }

    const existing = await this.repository.getBankAccount(restaurantId);

    let rawQr = data.promptPayQrImage !== undefined ? data.promptPayQrImage : (data.promptpay_qr !== undefined ? data.promptpay_qr : data.qrpayment_url);
    let processedQrImage = rawQr || null;
    let processedQrPaymentUrl = (rawQr && (rawQr.startsWith("http") || rawQr.startsWith("https"))) ? rawQr : null;

    if (rawQr && rawQr.startsWith("data:image/")) {
      try {
        const uploadRes = await StorageService.uploadQrPaymentImage(rawQr, `qr_payment_${Date.now()}.png`, "image/png");
        processedQrImage = uploadRes.directUrl || uploadRes.webViewLink;
        processedQrPaymentUrl = processedQrImage;

        const oldQr = existing.promptPayQrImage || existing.qrpayment_url;
        if (oldQr && oldQr !== processedQrImage && oldQr.startsWith("http")) {
          StorageService.deleteFile(oldQr).catch(() => {});
        }
      } catch (err) {
        console.warn("Bank QR upload failed:", err);
      }
    } else if (rawQr && (rawQr.startsWith("000201") || rawQr.startsWith("promptpay://"))) {
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(rawQr)}`;
        const qrRes = await fetch(qrUrl);
        if (qrRes.ok) {
          const arrayBuffer = await qrRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const uploadRes = await StorageService.uploadQrPaymentImage(buffer, `qr_promptpay_${Date.now()}.png`, "image/png");
          processedQrImage = uploadRes.directUrl || uploadRes.webViewLink;
          processedQrPaymentUrl = processedQrImage;
        }
      } catch (err) {
        console.warn("Bank PromptPay QR upload failed:", err);
      }
    } else if (!rawQr) {
      const oldQr = existing.promptPayQrImage || existing.qrpayment_url;
      if (oldQr && oldQr.startsWith("http")) {
        StorageService.deleteFile(oldQr).catch(() => {});
      }
      processedQrImage = null;
      processedQrPaymentUrl = null;
    }

    return this.repository.updateBankAccount({
      ...data,
      promptPayQrImage: processedQrImage,
      promptpay_qr: processedQrImage,
      qrpayment_url: processedQrPaymentUrl,
    }, restaurantId);
  }

  async updateSecurity(email?: string, newPassword?: string, restaurantId?: string | number): Promise<boolean> {
    return this.repository.updateSecurity(email, newPassword, restaurantId);
  }

  // ==========================================
  // User Profile (restaurant_users)
  // ==========================================
  async getUserProfile(userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null> {
    return this.repository.getUserProfile(userId, restaurantId);
  }

  async updateUserProfile(data: Partial<UserProfileDTO>, userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null> {
    return this.repository.updateUserProfile(data, userId, restaurantId);
  }

  async updateUserPassword(currentPassword: string, newPassword: string, userId?: string | number, restaurantId?: string | number): Promise<{ success: boolean; message?: string }> {
    return this.repository.updateUserPassword(currentPassword, newPassword, userId, restaurantId);
  }


  // ==========================================
  // Inventory & Store Pause
  // ==========================================
  async getInventoryItems(restaurantId?: string | number) {
    return this.repository.getInventoryItems(restaurantId);
  }

  async createInventoryItem(restaurantId: string | number, data: any) {
    return this.repository.createInventoryItem(restaurantId, data);
  }

  async updateInventoryItem(id: number, data: any) {
    return this.repository.updateInventoryItem(id, data);
  }

  async deleteInventoryItem(id: number) {
    return this.repository.deleteInventoryItem(id);
  }

  async setStorePauseStatus(restaurantId: string | number, isPaused: boolean, durationMinutes?: number, reason?: string, allowPreorder?: boolean) {
    if (!isPaused) {
      const existing = await this.repository.getRestaurantInfo(restaurantId);
      const finalBank = (existing.bankName ?? (existing as any).bank_name ?? "").trim();
      const finalAccNum = (existing.bankAccountNumber ?? (existing as any).bank_account_number ?? existing.promptPayNumber ?? (existing as any).promptpay_number ?? "").trim();
      const finalAccName = (existing.bankAccountName ?? (existing as any).bank_account_name ?? existing.promptPayName ?? (existing as any).promptpay_name ?? "").trim();

      if (!finalBank || !finalAccNum || !finalAccName) {
        throw new Error("ไม่สามารถเปิดรับออเดอร์ได้ กรุณากรอกข้อมูลบัญชีรับเงิน (ธนาคาร/พร้อมเพย์, เลขที่บัญชี, ชื่อบัญชี) ให้สมบูรณ์ในหน้าตั้งค่าก่อน");
      }
    }
    return this.repository.setStorePauseStatus(restaurantId, isPaused, durationMinutes, reason, allowPreorder);
  }
}
