/**
 * Customer Prisma Repository Implementation
 * จัดการข้อมูลและการทำงานฝั่งลูกค้าทั้งหมด:
 * - การตรวจสอบข้อมูลร้านค้า/โต๊ะ (Storefront & Validation)
 * - การดึงเมนู แป้งเครป และเมนูตัวอย่าง
 * - การสั่งซื้ออาหารและจัดลำดับคิวประจำวัน (Daily Sequential Queue)
 * - การคำนวณสถานะคิวสดแบบเรียลไทม์ (Live Queue Status & Wait Times)
 * - การยืนยันตัวตนลูกค้า (Customer Auth)
 * - การสร้าง PromptPay QR และตรวจสอบความถูกต้องของสลิปโอนเงิน (Multi-Phase Slip Verification: Gemini AI Vision + Local QR + EasySlip API)
 */

import prisma from "../../database/prisma";
import { RealtimeService } from "../../services/realtime.service";
import { StorageService } from "../../services/storage.service";
import { SlipPrescreenerService, parseEmvSlipQr } from "../../services/slip-prescreener.service";
import { GeminiSlipService } from "../../services/gemini-slip.service";
import {
  CartItemDTO,
  CategoryDTO,
  CrustDTO,
  CustomerDTO,
  CustomerTableInfoDTO,
  CustomerTableValidationResultDTO,
  ICustomerRepository,
  MenuItemDTO,
  OrderDTO,
  PlaceOrderDTO,
  PromptPayPaymentInfoDTO,
  RestaurantProfileDTO,
  SampleMenuDTO,
  SlipVerificationResultDTO,
} from "../interfaces/customer.repository.interface";
import { RestaurantRepositoryFactory } from "../index";

export class CustomerPrismaRepository implements ICustomerRepository {
  // ใช้งาน Restaurant Repository ร่วมกัน
  private restaurantRepo = RestaurantRepositoryFactory.getRepository();

  // ==========================================
  // ข้อมูลร้านค้าและเมนูอาหาร (Storefront & Menu)
  // ==========================================

  /**
   * ดึงและตรวจสอบข้อมูลร้านค้าสำหรับหน้าแสดงผลฝั่งลูกค้า
   * 
   * @param tableId หมายเลขโต๊ะหรือคีย์ระบุร้าน
   * @param shopId รหัสร้านค้า (ถ้ามี)
   * @returns CustomerTableValidationResultDTO ข้อมูลร้านค้าและสถานะความพร้อมเปิดให้บริการ
   */
  async getTableInfo(tableId: string, shopId?: string | number): Promise<CustomerTableValidationResultDTO> {
    try {
      let resolvedRestaurant: any = null;
      let targetId = shopId;

      if (!targetId && tableId && !isNaN(Number(tableId))) {
        targetId = tableId;
      }

      // 1. ค้นหาร้านค้าจาก res_id
      if (targetId) {
        const numId = Number(targetId);
        if (!isNaN(numId) && numId > 0) {
          resolvedRestaurant = await prisma.restaurant_data.findUnique({
            where: { res_id: numId },
          });
        }
        // ค้นหาจากชื่อร้าน หรือ Username เจ้าของร้าน
        if (!resolvedRestaurant) {
          resolvedRestaurant = await prisma.restaurant_data.findFirst({
            where: {
              OR: [
                { restaurant_name: String(targetId) },
                { restaurant_users: { some: { username: String(targetId) } } },
              ],
            },
          });
        }
      }

      // หากไม่ระบุ ให้เลือกร้านแรกในระบบ
      if (!resolvedRestaurant) {
        resolvedRestaurant = await prisma.restaurant_data.findFirst();
      }

      if (!resolvedRestaurant) {
        return {
          success: false,
          errorType: "SHOP_NOT_FOUND",
          message: "ไม่พบข้อมูลร้านค้า",
        };
      }

      const res = resolvedRestaurant;
      // แปลงข้อมูลร้านค้าเป็น RestaurantProfileDTO
      const foundRestaurantInfo: RestaurantProfileDTO = {
        id: String(res.res_id),
        name: res.restaurant_name || "ร้านเครป CrepeQ",
        description: res.restaurant_desc || "",
        phone: res.restaurant_phone || "",
        email: res.restaurant_email || undefined,
        address: res.restaurant_address || "",
        lineId: res.line_id || undefined,
        lineOaUrl: res.line_oa_url || undefined,
        facebookUrl: res.facebook_url || undefined,
        instagramUrl: res.instagram_url || undefined,
        tiktokUrl: res.tiktok_url || undefined,
        youtubeUrl: res.youtube_url || undefined,
        xUrl: res.x_url || undefined,
        websiteUrl: res.website_url || undefined,
        googleMapsUrl: res.google_maps_url || undefined,
        linemanUrl: res.lineman_url || undefined,
        grabUrl: res.grab_url || undefined,
        shopeefoodUrl: res.shopeefood_url || undefined,
        robinhoodUrl: res.robinhood_url || undefined,
        closedDays: res.closed_days || undefined,
        primaryColor: res.restaurant_primary_theme || "#E11D48",
        secondaryColor: res.restaurant_secondary_theme || "#F59E0B",
        accentColor: res.restaurant_other_theme || "#FB923C",
        otherTheme: res.restaurant_other_theme || undefined,
        logoUrl: res.restaurant_logo || undefined,
        bannerUrl: res.restaurant_cover || undefined,
        openTime: res.restaurant_open_time || "10:00",
        closeTime: res.restaurant_close_time || "22:00",
        operatingDays: res.restaurant_day || "ทุกวัน",
        isOpen: res.is_open !== false,
        bankName: res.bank_name || undefined,
        bankAccountNumber: res.bank_account_number || undefined,
        bankAccountName: res.bank_account_name || undefined,
        promptPayNumber: res.promptpay_number || undefined,
        promptPayName: res.promptpay_name || undefined,
        promptPayQrImage: res.promptpay_qr || res.qrpayment_url || undefined,
        qrpayment_url: res.qrpayment_url || undefined,
      };

      return {
        success: true,
        tableInfo: {
          tableId: tableId || "online",
          tableNumber: "CrepeQ Online",
          restaurant: foundRestaurantInfo,
          activeOrderId: null,
        },
      };
    } catch (err: any) {
      console.error("Prisma getTableInfo error:", err);
      return {
        success: false,
        errorType: "GENERAL_ERROR",
        message: err.message || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูลร้านค้า",
      };
    }
  }

  /** ดึงรายการหมวดหมู่อาหาร */
  async getCategories(shopId?: string | number): Promise<CategoryDTO[]> {
    return this.restaurantRepo.getCategories(shopId);
  }

  /** ดึงรายการแป้งเครป */
  async getCrusts(shopId?: string | number): Promise<CrustDTO[]> {
    return this.restaurantRepo.getCrusts(shopId);
  }

  /** ดึงรายการเมนูตัวอย่างที่เปิดใช้งานอยู่ */
  async getSampleMenus(shopId?: string | number): Promise<SampleMenuDTO[]> {
    const all = await this.restaurantRepo.getSampleMenus(shopId);
    return all.filter((m) => m.is_active !== false && m.isActive !== false);
  }

  /** ค้นหาและดึงรายการเมนูอาหาร */
  async getMenuItems(search?: string, category?: string, shopId?: string | number): Promise<MenuItemDTO[]> {
    const result = await this.restaurantRepo.getMenuItems({
      search,
      category,
      limit: 1000,
      restaurantId: shopId ? Number(shopId) : undefined,
    });
    return result.data;
  }

  /** ดึงรายละเอียดเมนูตาม ID */
  async getMenuItemById(id: string, shopId?: string | number): Promise<MenuItemDTO | null> {
    return this.restaurantRepo.getMenuItemById(id);
  }

  // ==========================================
  // การสั่งซื้อและการจัดคิว (Orders & Queue Management)
  // ==========================================

  /**
   * สั่งซื้ออาหารใหม่
   * 1. ตรวจสอบความถูกต้องของรายการสินค้าและจำนวน
   * 2. คำนวณยอดเงินรวม (Sanitize and calculate total)
   * 3. บันทึกออเดอร์ลงฐานข้อมูล พร้อมออกหมายเลขคิว
   * 
   * @param orderData ข้อมูลการสั่งซื้อ (PlaceOrderDTO)
   * @returns OrderDTO ข้อมูลออเดอร์ที่ถูกบันทึกสำเร็จ
   */
  async placeOrder(orderData: PlaceOrderDTO): Promise<OrderDTO> {
    let resolvedRestId: number | undefined;

    if (orderData.shopId) {
      const num = Number(orderData.shopId);
      if (!isNaN(num) && num > 0) resolvedRestId = num;
    }

    if (!resolvedRestId) {
      const firstRest = await prisma.restaurant_data.findFirst();
      resolvedRestId = firstRest?.res_id || 1;
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error("รายการอาหารในออเดอร์ต้องไม่ว่างเปล่า");
    }
    if (orderData.items.length > 50) {
      throw new Error("รายการอาหารในหนึ่งออเดอร์เกินจำนวนที่กำหนด (สูงสุด 50 รายการ)");
    }

    // ตรวจสอบและปรับปรุงความถูกต้องของราคาและจำนวนสินค้าในตะกร้า
    const sanitizedItems = orderData.items.map((item) => {
      const qty = Math.max(1, Math.min(Number(item.quantity) || 1, 99));
      const price = Math.max(0, Number((item as any).price || item.menuItem?.price || (item.subtotal && item.quantity ? Math.round(item.subtotal / item.quantity) : 0)) || 0);
      const subtotal = Math.max(0, Number(item.subtotal) || (price * qty));
      return {
        ...item,
        quantity: qty,
        price,
        subtotal,
        menuItem: {
          id: String(item.menuItem?.id || (item as any).menu_id || (item as any).id || "1"),
          name: item.menuItem?.name || (item as any).name || (item as any).menu_name || "เมนูเครป",
          price,
          category: item.menuItem?.category || "",
        },
      };
    });

    const total = sanitizedItems.reduce((sum, item) => sum + item.subtotal, 0);

    const newOrder: OrderDTO = {
      id: `ord-${Date.now()}`,
      restaurantId: resolvedRestId,
      tableId: orderData.tableId || "online",
      tableNumber: "คิว",
      deviceId: orderData.deviceId,
      customerId: orderData.customerId,
      customerNickname: orderData.customerNickname,
      customerPhone: orderData.customerPhone,
      pickupType: orderData.pickupType || "asap",
      scheduledTime: orderData.scheduledTime,
      paymentMethod: (orderData.paymentMethod as any) || "promptpay",
      status: "pending",
      createdAt: new Date().toISOString(),
      items: sanitizedItems,
      total,
    };

    const created = await this.restaurantRepo.createOrder(newOrder);
    return created;
  }

  /**
   * ค้นหาออเดอร์ปัจจุบันที่กำลังดำเนินการของลูกค้า
   * โดยจับคู่จาก Device ID หรือ เบอร์โทรศัพท์ลูกค้า เพื่อป้องกันการเห็นออเดอร์ของคนอื่น
   */
  async getActiveOrder(tableId: string, deviceId?: string, shopId?: string | number, phone?: string): Promise<OrderDTO | null> {
    const numShopId = shopId && !isNaN(Number(shopId)) ? Number(shopId) : undefined;

    try {
      const activeStatuses = ["pending", "confirmed", "cooking", "preparing", "ready"];
      const baseWhere: any = {
        order_status: { in: activeStatuses },
      };
      if (numShopId) {
        baseWhere.restaurant_id = numShopId;
      }

      // 1. ค้นหาจาก Device ID เป็นหลัก
      if (deviceId) {
        const found = await prisma.orders.findFirst({
          where: { ...baseWhere, device_id: deviceId },
          orderBy: { order_id: "desc" },
        });
        if (found) return this.restaurantRepo.getOrderById(String(found.order_id));
      }

      // 2. ค้นหาจากเบอร์โทรศัพท์ลูกค้า
      if (phone) {
        const found = await prisma.orders.findFirst({
          where: { ...baseWhere, customer_phone: phone },
          orderBy: { order_id: "desc" },
        });
        if (found) return this.restaurantRepo.getOrderById(String(found.order_id));
      }

      return null;
    } catch (err) {
      console.error("Prisma getActiveOrder error:", err);
      return null;
    }
  }

  /**
   * ดึงประวัติออเดอร์ของลูกค้าที่ยังดำเนินการอยู่
   */
  async getTableOrders(tableId: string, shopId?: string | number, phone?: string, deviceId?: string): Promise<OrderDTO[]> {
    const numShopId = shopId && !isNaN(Number(shopId)) ? Number(shopId) : undefined;
    
    // บังคับให้ต้องมีเบอร์โทรหรือ Device ID เพื่อความปลอดภัยในการแยกข้อมูลลูกค้า
    if (!phone && !deviceId) {
      return [];
    }

    const allOrders = await this.restaurantRepo.getOrders(numShopId);
    return allOrders.filter((o) => {
      const isOngoing = !["paid", "completed", "cancelled"].includes(String(o.status).toLowerCase());
      if (!isOngoing) return false;
      if (phone && o.customerPhone && o.customerPhone === phone) return true;
      if (deviceId && o.deviceId && o.deviceId === deviceId) return true;
      return false;
    });
  }

  /**
   * คำนวณและประเมินสถานะคิวสด (Live Queue Status)
   * คำนวณจำนวนคิวก่อนหน้า, จำนวนชิ้นอาหารที่รอ, และเวลาที่คาดว่าจะได้รับอาหาร
   */
  async getLiveQueueStatus(shopId?: string | number, orderId?: string, queueNumber?: string) {
    const numShopId = shopId && !isNaN(Number(shopId)) ? Number(shopId) : undefined;
    const allOrders = await this.restaurantRepo.getOrders(numShopId);

    // กรองเฉพาะออเดอร์ที่อยู่ในคิวครัวปัจจุบัน
    const activeWaitingOrders = allOrders.filter((o) => {
      const st = String(o.status || "").toLowerCase();
      return st !== "paid" && st !== "cancelled" && st !== "completed";
    });

    // เรียงลำดับตามเวลาสร้างออเดอร์ (คิวแรกไปคิวหลัง)
    const sortedWaiting = [...activeWaitingOrders].sort((a, b) => {
      const aId = Number(String(a.id).replace(/\D/g, "")) || 0;
      const bId = Number(String(b.id).replace(/\D/g, "")) || 0;
      return aId - bId;
    });

    // หาออเดอร์ที่กำลังปรุงอยู่ปัจจุบัน
    const cookingOrder =
      sortedWaiting.find(
        (o) => String(o.status).toLowerCase() === "cooking" || String(o.status).toLowerCase() === "preparing"
      ) ||
      sortedWaiting.find((o) => String(o.status).toLowerCase() === "confirmed") ||
      sortedWaiting.find((o) => String(o.status).toLowerCase() === "pending");

    const currentCookingQueue = cookingOrder?.queueNumber || "-";
    const waitingCount = sortedWaiting.length;
    const totalWaitingItems = sortedWaiting.reduce((sum, o) => sum + (o.items?.length || 1), 0);

    // ประเมินเวลาทำอาหารเฉลี่ย 15 นาทีต่อชิ้น
    const estimatedMinutes = waitingCount === 0 ? 0 : Math.max(15, totalWaitingItems * 15);

    let queuesAhead = 0;
    let itemsAhead = 0;
    let estimatedRemainingMinutes = 0;

    if (orderId || queueNumber) {
      const targetOrder = allOrders.find(
        (o) =>
          (orderId && String(o.id) === String(orderId)) ||
          (queueNumber && o.queueNumber === queueNumber)
      );

      if (targetOrder) {
        const normStatus = String(targetOrder.status || "").toLowerCase();
        if (normStatus === "cooking" || normStatus === "preparing") {
          queuesAhead = 0;
          estimatedRemainingMinutes = Math.max(10, (targetOrder.items?.length || 1) * 15);
        } else if (["ready", "served", "paid", "completed", "cancelled"].includes(normStatus)) {
          queuesAhead = 0;
          estimatedRemainingMinutes = 0;
        } else {
          // สถานะ pending หรือ confirmed คำนวณคิวก่อนหน้า
          const targetNum = Number(String(targetOrder.id).replace(/\D/g, "")) || 0;
          const ahead = sortedWaiting.filter((o) => {
            const oNum = Number(String(o.id).replace(/\D/g, "")) || 0;
            return oNum < targetNum && String(o.id) !== String(targetOrder.id);
          });
          queuesAhead = ahead.length;
          itemsAhead = ahead.reduce((sum, o) => sum + (o.items?.length || 1), 0);
          estimatedRemainingMinutes = Math.max(15, (itemsAhead + (targetOrder.items?.length || 1)) * 15);
        }
      }
    }

    return {
      currentCookingQueue,
      waitingCount,
      totalWaitingItems,
      estimatedMinutes,
      queuesAhead,
      itemsAhead,
      estimatedRemainingMinutes,
    };
  }

  /** ดึงข้อมูลออเดอร์ตาม ID */
  async getOrderById(orderId: string): Promise<OrderDTO | null> {
    return this.restaurantRepo.getOrderById(orderId);
  }

  /** เพิ่มรายการสินค้าในออเดอร์เดิม */
  async addItemsToOrder(orderId: string, newItems: CartItemDTO[]): Promise<OrderDTO | null> {
    const order = await this.restaurantRepo.getOrderById(orderId);
    if (!order) return null;

    order.items = [...order.items, ...newItems];
    order.total = order.items
      .filter((i) => !i.isOutOfStock)
      .reduce((sum, item) => sum + item.subtotal, 0);

    return order;
  }

  /** เปลี่ยนสินค้าที่หมดเป็นสินค้าใหม่ */
  async replaceOrderItem(orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<OrderDTO | null> {
    return this.restaurantRepo.replaceOrderItem(orderId, outOfStockItemId, newItem);
  }

  /** อัปเดตรายการสินค้าในออเดอร์ */
  async updateOrderItems(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null> {
    return this.restaurantRepo.updateOrderItems(orderId, items);
  }

  /** ลบรายการสินค้าออกจากออเดอร์ */
  async removeOrderItem(orderId: string, itemId: string): Promise<OrderDTO | null> {
    return this.restaurantRepo.removeOrderItem(orderId, itemId);
  }

  // ==========================================
  // ระบบชำระเงินและตรวจสอบสลิป (Payments & Slip Verification)
  // ==========================================

  /**
   * ดึงข้อมูลและสร้าง QR Code สำหรับชำระเงินด้วย PromptPay
   */
  async getPromptPayInfo(orderId: string): Promise<PromptPayPaymentInfoDTO | null> {
    const order = await this.restaurantRepo.getOrderById(orderId);
    const restId = order?.restaurantId;

    const bankAccount = await this.restaurantRepo.getBankAccount(restId);
    const amount = order ? order.total : 0;
    const accountNumber = bankAccount.promptPayNumber || bankAccount.promptpay_number || bankAccount.accountNumber || bankAccount.bank_account_number || "";
    const accountName = bankAccount.promptPayName || bankAccount.promptpay_name || bankAccount.accountName || bankAccount.bank_account_name || "ร้านเครป CrepeQ";
    const bankName = bankAccount.bankName || bankAccount.bank_name || bankAccount.bank || "พร้อมเพย์ (PromptPay)";

    const qrPayload = accountNumber ? `promptpay://${accountNumber.replace(/[^0-9]/g, "")}/${amount}` : "";
    const qrUrl = bankAccount.qrpayment_url || (bankAccount.promptPayQrImage && bankAccount.promptPayQrImage.startsWith("http") ? bankAccount.promptPayQrImage : (accountNumber ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}` : ""));

    return {
      orderId: order?.id || orderId,
      amount,
      accountNumber,
      accountName,
      bankName,
      qrUrl,
      qrPayload,
    };
  }

  /**
   * อัปโหลดและตรวจสอบสลิปโอนเงิน (Multi-Phase AI & Bank Verification Pipeline)
   * 1. ตรวจสอบด้วย Google Gemini 1.5 Flash AI Vision เพื่อดูยอดเงิน ชื่อบัญชี และความถูกต้องของภาพ
   * 2. ตรวจสอบความซ้ำซ้อนของ Transaction Reference (Duplicate Slip Check)
   * 3. ตรวจสอบกับระบบธนาคารผ่าน EasySlip API v2
   * 4. บันทึกรูปภาพสลิปไปยัง Cloud Storage และปรับปรุงสถานะออเดอร์เป็น 'paid'
   */
  async uploadAndVerifySlip(
    orderId: string,
    slipUrl?: string,
    fileBase64?: string
  ): Promise<SlipVerificationResultDTO> {
    const order = await this.restaurantRepo.getOrderById(orderId);
    if (!order) {
      return {
        orderId,
        status: "error",
        httpStatus: 404,
        message: "ไม่พบข้อมูลคำสั่งซื้อ",
        isPaid: false,
      };
    }

    // 1. ตรวจสอบว่ามีข้อมูลรูปภาพ Base64 หรือไม่
    if (!fileBase64 || fileBase64.length < 50) {
      return {
        orderId,
        status: "error",
        httpStatus: 400,
        message: "กรุณาแนบรูปภาพสลิปก่อนทำการตรวจสอบ",
        isPaid: false,
      };
    }

    // ดึงโปรไฟล์บัญชีรับเงินของร้านค้า และประวัติสลิปที่เคยใช้ไปแล้ว
    let shopProfile: { promptpayNumber?: string; bankAccountNumber?: string; bankName?: string; bankAccountName?: string } = {};
    let usedRefs: Set<string> | undefined;
    try {
      const restaurant = await prisma.restaurant_data.findFirst({
        select: { promptpay_number: true, bank_account_number: true, bank_name: true, promptpay_name: true, bank_account_name: true },
      });
      shopProfile = {
        promptpayNumber: restaurant?.promptpay_number || undefined,
        bankAccountNumber: restaurant?.bank_account_number || undefined,
        bankName: restaurant?.bank_name || undefined,
        bankAccountName: restaurant?.promptpay_name || restaurant?.bank_account_name || undefined,
      };

      const paidSlips = await prisma.payments.findMany({
        where: { status: "paid", transaction_ref: { not: null } },
        select: { transaction_ref: true },
      });
      usedRefs = new Set(paidSlips.map((p: any) => p.transaction_ref).filter(Boolean));
    } catch (preErr) {
      console.warn("[Slip Verification] Could not load shop profile / used refs:", preErr);
    }

    const orderCreatedAt = order.createdAt ? new Date(order.createdAt) : undefined;
    const requiredAmount: number = Number(order.total || 0);

    // Phase 1: การสกัดข้อมูลสลิปด้วย Google Gemini AI Vision และตรวจสอบโดย Backend
    console.log(`\n================== [Slip Verification: Order #${orderId}] ==================`);
    console.log(`[Slip Verification] 🤖 Phase 1: Extracting slip data via [Google Gemini AI Vision]...`);

    const extracted = await GeminiSlipService.extractSlipData(fileBase64);

    if (extracted.is_api_error) {
      console.warn(`[Slip Verification] ❌ AI Extraction Error: ${extracted.error_message}`);
      return {
        orderId,
        status: "error",
        httpStatus: 503,
        message: "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
        isPaid: false,
      };
    }

    // 1. ตรวจสอบว่าเป็นสลิปธนาคารจริงหรือไม่
    if (!extracted.is_bank_slip) {
      console.warn(`[Slip Verification] ❌ Not a bank slip image`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร กรุณาแนบรูปภาพสลิปที่ถูกต้อง",
        isPaid: false,
      };
    }

    // 2. ตรวจสอบยอดเงินในสลิปโดย Backend Logic
    const slipAmount: number = Number(extracted.amount || 0);
    console.log(`[Slip Verification] 💵 Checking Amount: Slip (${slipAmount} THB) vs Required (${requiredAmount} THB)`);
    if (slipAmount <= 0 || slipAmount < requiredAmount) {
      console.warn(`[Slip Verification] ❌ Amount mismatch: Slip (${slipAmount}) < Required (${requiredAmount})`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: `ยอดเงินในสลิป (${slipAmount > 0 ? slipAmount.toLocaleString() : 0} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
        isPaid: false,
      };
    }

    // 3. ตรวจสอบธนาคารและบัญชีปลายทางตรงกับร้านค้าหรือไม่โดย Backend Logic
    const normalizeAccount = (s?: string) => (s || "").replace(/[-\s]/g, "").replace(/^0066/, "0").trim();
    const shopPP = normalizeAccount(shopProfile.promptpayNumber);
    const shopBankAcc = normalizeAccount(shopProfile.bankAccountNumber);
    const shopAccountName = (shopProfile.bankAccountName || "").trim().toLowerCase();
    const slipReceiverAcc = normalizeAccount(extracted.receiver_account);
    const slipReceiverName = (extracted.receiver_name || "").trim().toLowerCase();

    console.log(`[Slip Verification] 🏦 Checking Receiver: Slip Acc (${slipReceiverAcc || "-"}), Name (${slipReceiverName || "-"}) vs Shop PP (${shopPP || "-"}), BankAcc (${shopBankAcc || "-"}), ShopName (${shopAccountName || "-"})`);

    if (slipReceiverAcc && (shopPP || shopBankAcc)) {
      const matchPP = shopPP && (slipReceiverAcc.endsWith(shopPP.slice(-6)) || shopPP.endsWith(slipReceiverAcc.slice(-6)));
      const matchBank = shopBankAcc && (slipReceiverAcc.endsWith(shopBankAcc.slice(-6)) || shopBankAcc.endsWith(slipReceiverAcc.slice(-6)));
      if (!matchPP && !matchBank) {
        const matchName = shopAccountName && slipReceiverName && (shopAccountName.includes(slipReceiverName) || slipReceiverName.includes(shopAccountName));
        if (!matchName) {
          console.warn(`[Slip Verification] ❌ Receiver mismatch: Slip (${slipReceiverAcc}) not matched with Shop PP (${shopPP}) / Bank (${shopBankAcc})`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "บัญชีผู้รับเงินในสลิปไม่ตรงกับบัญชีของร้านค้า กรุณาตรวจสอบหมายเลขบัญชีผู้รับ",
            isPaid: false,
          };
        }
      }
    }

    // 4. ตรวจสอบวันที่และเวลาในสลิปสอดคล้องกับปัจจุบันหรือไม่โดย Backend Logic
    console.log(`[Slip Verification] 🕒 Checking Date/Time: Date (${extracted.transfer_date || "-"}), Time (${extracted.transfer_time || "-"}), Raw (${extracted.datetime_str || "-"})`);
    let slipDateTime: Date | null = null;

    if (extracted.transfer_date) {
      try {
        let datePart = extracted.transfer_date;
        const yearMatch = datePart.match(/^(\d{4})/);
        if (yearMatch) {
          const rawYear = parseInt(yearMatch[1], 10);
          if (rawYear > 2500) {
            datePart = `${rawYear - 543}${datePart.slice(4)}`;
          }
        }
        const timePart = extracted.transfer_time || "00:00:00";
        const parsed = new Date(`${datePart}T${timePart.length === 5 ? timePart + ":00" : timePart}`);
        if (!isNaN(parsed.getTime())) {
          slipDateTime = parsed;
        }
      } catch {}
    }

    if (!slipDateTime && extracted.datetime_str) {
      const match = extracted.datetime_str.match(/(202[4-9]|203[0-5]|256[7-9]|257[0-9])[-/.]?(0[1-9]|1[0-2])[-/.]?([0-2]\d|3[01])/);
      if (match) {
        let yr = parseInt(match[1], 10);
        if (yr > 2500) yr -= 543;
        slipDateTime = new Date(yr, parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      }
    }

    if (slipDateTime) {
      const now = new Date();
      const diffHours = (now.getTime() - slipDateTime.getTime()) / (1000 * 60 * 60);
      if (diffHours < -2) {
        console.warn(`[Slip Verification] ❌ Transfer date in future: ${slipDateTime.toISOString()}`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "วันที่และเวลาในสลิปไม่ถูกต้อง (พบเวลาในอนาคต)",
          isPaid: false,
        };
      }
      if (diffHours > 24) {
        console.warn(`[Slip Verification] ❌ Transfer date expired: ${diffHours.toFixed(1)} hours ago`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
          isPaid: false,
        };
      }
    }

    console.log(`[Slip Verification] ✅ Phase 1 Backend Validation PASSED (Amount: ${slipAmount} THB, Receiver: ${extracted.receiver_account || extracted.receiver_name || "Matched"})`);

    // Phase 2: ตรวจสอบหมายเลขอ้างอิงสลิปซ้ำ (Duplicate Reference Check)
    console.log(`[Slip Verification] 🔍 Phase 2: Checking Duplicate Slip References...`);
    let detectedTxRef = extracted.transaction_ref?.trim() || "";

    // หาก AI ไม่พบ Ref เต็มรูปแบบ ลองถอดรหัสจาก Mini QR Code ในสลิป
    if (!detectedTxRef) {
      try {
        const qrScan = await SlipPrescreenerService.extractQrFromBase64(fileBase64);
        if (qrScan?.payload) {
          const parsed = parseEmvSlipQr(qrScan.payload);
          detectedTxRef = parsed.transactionRef || "";
        }
      } catch (qrErr) {
        console.warn("[Slip Verification] Local QR scan warning:", qrErr);
      }
    }

    if (detectedTxRef && usedRefs && usedRefs.has(detectedTxRef)) {
      console.warn(`[Slip Verification] ❌ Duplicate slip detected (Ref: ${detectedTxRef})`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: "สลิปนี้เคยถูกใช้งานแล้ว กรุณาใช้สลิปใหม่",
        isPaid: false,
      };
    }
    console.log(`[Slip Verification] ✅ Duplicate check PASSED (TxRef: ${detectedTxRef || "Unique"})`);

    // Phase 3: ตรวจสอบข้อมูลสลิปกับระบบธนาคารผ่าน EasySlip API v2
    console.log(`[Slip Verification] 🌐 Phase 3: Calling [EasySlip API v2 Engine] for official bank verification...`);
    const easyslipKey = process.env.EASYSLIP_API_KEY;
    if (!easyslipKey) {
      console.warn("[Slip Verification - EasySlip] ⚠️ EASYSLIP_API_KEY not set — skipping bank verification");
      return {
        orderId,
        status: "error",
        httpStatus: 503,
        message: "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
        isPaid: false,
      };
    }

    let easyslipResult: any = null;
    try {
      const easyslipResponse = await fetch("https://api.easyslip.com/v2/verify/bank", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${easyslipKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: fileBase64,
          checkDuplicate: true,
        }),
      });

      easyslipResult = await easyslipResponse.json();
      console.log(`[Slip Verification - EasySlip] Response status: ${easyslipResponse.status}, success: ${easyslipResult?.success}`);
    } catch (fetchErr) {
      console.error("[Slip Verification - EasySlip] ❌ Network error connecting to EasySlip:", fetchErr);
      return {
        orderId,
        status: "error",
        httpStatus: 503,
        message: "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
        isPaid: false,
      };
    }

    const isVerified = easyslipResult?.success === true;
    const isDuplicate = easyslipResult?.data?.isDuplicate === true;

    if (!isVerified) {
      const errCode = String(easyslipResult?.error?.code || easyslipResult?.status || "").toUpperCase();
      const errMsg = easyslipResult?.error?.message || easyslipResult?.message || "";

      let thaiMessage = "สลิปไม่ถูกต้อง หรือไม่พบข้อมูลในระบบธนาคาร กรุณาตรวจสอบและลองใหม่อีกครั้ง";
      if (isDuplicate || errCode.includes("DUPLICATE")) {
        thaiMessage = "สลิปนี้เคยถูกใช้งานแล้ว กรุณาใช้สลิปใหม่";
      } else if (errCode.includes("INVALID_IMAGE") || errCode.includes("NOT_FOUND") || errCode.includes("QR")) {
        thaiMessage = "ไม่พบ QR Code ในรูปภาพ กรุณาอัปโหลดรูปสลิปจากแอปธนาคารให้ชัดเจน";
      } else if (errCode.includes("AMOUNT") || errMsg.includes("amount")) {
        thaiMessage = "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ (ยอดเงินไม่ถูกต้อง)";
      } else if (errCode.includes("RECEIVER") || errMsg.includes("receiver")) {
        thaiMessage = "บัญชีธนาคารปลายทางไม่ตรงกับบัญชีรับเงินของร้านค้า";
      } else if (errMsg && typeof errMsg === "string" && errMsg.length < 120) {
        thaiMessage = `การตรวจสอบไม่ผ่าน: ${errMsg}`;
      }

      console.warn(`[Slip Verification - EasySlip] ❌ Slip rejected by Bank: [${errCode}] ${errMsg} -> Message: ${thaiMessage}`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: thaiMessage,
        isPaid: false,
        easyslipData: easyslipResult,
      };
    }

    // ตรวจสอบยอดเงินจากผลลัพธ์ธนาคาร
    const amountInSlip: number =
      easyslipResult?.data?.amount?.amount ??
      easyslipResult?.data?.amountInSlip ??
      easyslipResult?.data?.amount ??
      0;

    if (amountInSlip > 0 && requiredAmount > 0 && amountInSlip < requiredAmount) {
      console.warn(`[Slip Verification - EasySlip] ❌ Amount insufficient: Paid ${amountInSlip} THB, Required ${requiredAmount} THB`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: `ยอดเงินในสลิป (${amountInSlip.toLocaleString()} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
        isPaid: false,
        easyslipData: easyslipResult,
      };
    }

    // ตรวจสอบเลขบัญชีผู้รับในระบบธนาคาร
    const receiverInBank = normalizeAccount(
      easyslipResult?.data?.receiver?.account?.value ||
      easyslipResult?.data?.receiver?.proxy?.value ||
      easyslipResult?.data?.receiver?.account?.bank?.account ||
      ""
    );

    if (receiverInBank && (shopPP || shopBankAcc)) {
      const matchPP = shopPP && (receiverInBank.endsWith(shopPP.slice(-8)) || shopPP.endsWith(receiverInBank.slice(-8)));
      const matchBank = shopBankAcc && (receiverInBank.endsWith(shopBankAcc.slice(-8)) || shopBankAcc.endsWith(receiverInBank.slice(-8)));
      if (!matchPP && !matchBank) {
        console.warn(`[Slip Verification - EasySlip] ❌ Bank receiver mismatch: Receiver in Bank (${receiverInBank}) != Shop PP (${shopPP}) or Bank (${shopBankAcc})`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า (บัญชีผู้รับในระบบธนาคารไม่ตรงกับของร้าน)",
          isPaid: false,
          easyslipData: easyslipResult,
        };
      }
    }

    // ตรวจสอบวันเวลาที่โอนเงิน
    const slipDateRaw = easyslipResult?.data?.date || easyslipResult?.data?.transDate;
    if (slipDateRaw) {
      const slipDate = new Date(slipDateRaw);
      const now = new Date();
      const diffHours = (now.getTime() - slipDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < -2) {
        console.warn(`[Slip Verification - EasySlip] ❌ Bank transfer date in future: ${slipDateRaw}`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "วันที่และเวลาในสลิปไม่ถูกต้อง (พบเวลาในอนาคต)",
          isPaid: false,
          easyslipData: easyslipResult,
        };
      }
      if (diffHours > 24) {
        console.warn(`[Slip Verification - EasySlip] ❌ Bank transfer date expired: ${diffHours.toFixed(1)} hours ago`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
          isPaid: false,
          easyslipData: easyslipResult,
        };
      }
    }

    console.log(`[Slip Verification] 🎉 Order #${orderId} verified successfully via all steps! (Amount: ${amountInSlip} THB)`);

    // บันทึกรูปภาพสลิปไปยัง Storage
    let finalSlipUrl = slipUrl || "";
    try {
      const uploadRes = await StorageService.uploadSlipImage(
        fileBase64,
        `slip_order_${orderId}_${Date.now()}.png`
      );
      if (uploadRes?.directUrl) {
        finalSlipUrl = uploadRes.directUrl;
      }
    } catch (err) {
      console.warn("[EasySlip] Could not save slip image to storage:", err);
    }

    // ปรับปรุงสถานะออเดอร์และการชำระเงินในฐานข้อมูลเป็น PAID
    try {
      await prisma.orders.update({
        where: { order_id: Number(orderId) },
        data: {
          has_slip: true,
          slip_url: finalSlipUrl || null,
          payment_status: "paid",
          updatedAt: new Date(),
        },
      });

      await prisma.payments.upsert({
        where: { order_id: Number(orderId) },
        update: {
          slip_url: finalSlipUrl || null,
          amount: order.total,
          status: "paid",
          transaction_ref: detectedTxRef || easyslipResult?.data?.transRef || null,
          paid_at: new Date(),
        },
        create: {
          order_id: Number(orderId),
          amount: order.total,
          status: "paid",
          provider: "promptpay",
          slip_url: finalSlipUrl || null,
          transaction_ref: detectedTxRef || easyslipResult?.data?.transRef || null,
          paid_at: new Date(),
        },
      });
    } catch (e) {
      console.error("[EasySlip] Failed to update DB after slip verified:", e);
    }

    return {
      orderId: order.id,
      status: "verified",
      httpStatus: 200,
      message: "ตรวจสอบสลิปเรียบร้อยแล้ว ชำระเงินสำเร็จ!",
      slipUrl: finalSlipUrl,
      paidAt: new Date().toISOString(),
      isPaid: true,
      amountInSlip,
      easyslipData: easyslipResult?.data,
    };
  }

  /**
   * แจ้งร้านค้าว่าเลือกชำระด้วยเงินสดที่หน้าร้าน
   */
  async notifyCashPayment(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.orders.update({
        where: { order_id: Number(orderId) },
        data: {
          payment_method: "cash",
          payment_status: "pending",
          updatedAt: new Date(),
        },
      });
    } catch {}

    return {
      success: true,
      message: "เปลี่ยนรูปแบบการชำระเป็นเงินสดหน้าร้านเรียบร้อยแล้ว",
    };
  }

  /**
   * อัปเดตช่องทางการชำระเงินของออเดอร์ (เช่น สลับระหว่างเงินสดและพร้อมเพย์)
   * พร้อมแจ้งเตือน Realtime ไปยังหน้าร้าน
   */
  async updatePaymentMethod(orderId: string, paymentMethod: string): Promise<OrderDTO | null> {
    try {
      const cleanMethod = paymentMethod === "cash" ? "cash" : "promptpay";
      let numId = Number(orderId);
      if (isNaN(numId)) {
        const stripped = String(orderId).replace(/^ord[-_]?/i, "");
        if (!isNaN(Number(stripped))) {
          numId = Number(stripped);
        } else {
          const found = await prisma.orders.findFirst({
            where: {
              OR: [
                { queue_number: String(orderId) },
                { device_id: String(orderId) },
              ],
            },
            orderBy: { order_id: "desc" },
          });
          if (found) numId = found.order_id;
        }
      }

      if (isNaN(numId) || numId <= 0) {
        const latest = await prisma.orders.findFirst({
          where: {
            order_status: { in: ["pending", "confirmed", "cooking", "preparing", "ready"] },
          },
          orderBy: { order_id: "desc" },
        });
        if (latest) numId = latest.order_id;
      }

      if (!isNaN(numId) && numId > 0) {
        await prisma.orders.update({
          where: { order_id: numId },
          data: {
            payment_method: cleanMethod,
            payment_status: "pending",
            updatedAt: new Date(),
          },
        });

        const updated = await this.restaurantRepo.getOrderById(String(numId));
        if (updated) {
          const restId = updated.restaurantId || "global";
          RealtimeService.broadcast(restId, "ORDER_UPDATED", updated);
          RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", updated);
          if (restId !== "global") {
            RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", updated);
          }
        }
        return updated;
      }

      return null;
    } catch (err) {
      console.error("Prisma updatePaymentMethod error:", err);
      return null;
    }
  }

  // ==========================================
  // การยืนยันตัวตนและข้อมูลลูกค้า (Customer Auth & Profile)
  // ==========================================

  /**
   * เข้าสู่ระบบหรือลงทะเบียนลูกค้าใหม่อัตโนมัติด้วยเบอร์โทรและชื่อเล่น
   */
  async loginOrRegisterCustomer(nickname: string, phone: string, avatarUrl?: string): Promise<CustomerDTO> {
    const cleanNick = (nickname || "").trim();
    const cleanPhone = (phone || "").trim();
    const identifier = cleanPhone || cleanNick;

    const existing = await prisma.customers.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { nickname: cleanNick },
        ],
      },
    });

    if (existing) {
      const updated = await prisma.customers.update({
        where: { customer_id: existing.customer_id },
        data: {
          nickname: cleanNick || existing.nickname,
          avatar_url: avatarUrl !== undefined ? avatarUrl : existing.avatar_url,
          updatedAt: new Date(),
        },
      });
      return {
        customer_id: updated.customer_id,
        nickname: updated.nickname,
        phone: updated.phone,
        avatar_url: updated.avatar_url,
      };
    }

    const created = await prisma.customers.create({
      data: {
        nickname: cleanNick || `ลูกค้า_${Date.now().toString().slice(-4)}`,
        phone: identifier,
        avatar_url: avatarUrl || null,
      },
    });

    return {
      customer_id: created.customer_id,
      nickname: created.nickname,
      phone: created.phone,
      avatar_url: created.avatar_url,
    };
  }

  /**
   * ลงทะเบียนลูกค้าใหม่
   */
  async registerCustomer(nickname: string, phone: string, avatarUrl?: string): Promise<CustomerDTO> {
    const cleanNick = (nickname || "").trim();
    const cleanPhone = (phone || "").trim();
    const identifier = cleanPhone || cleanNick;

    const existing = await prisma.customers.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { nickname: cleanNick },
        ],
      },
    });

    if (existing) {
      throw new Error("รหัสผู้ใช้งานนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ");
    }

    const created = await prisma.customers.create({
      data: {
        nickname: cleanNick,
        phone: identifier,
        avatar_url: avatarUrl || null,
      },
    });

    return {
      customer_id: created.customer_id,
      nickname: created.nickname,
      phone: created.phone,
      avatar_url: created.avatar_url,
    };
  }

  /**
   * ค้นหาข้อมูลลูกค้าตามเบอร์โทรศัพท์
   */
  async getCustomerByPhone(phone: string): Promise<CustomerDTO | null> {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const customer = await prisma.customers.findUnique({
      where: { phone: cleanPhone },
    });
    if (!customer) return null;
    return {
      customer_id: customer.customer_id,
      nickname: customer.nickname,
      phone: customer.phone,
      avatar_url: customer.avatar_url,
    };
  }

  /**
   * ค้นหาข้อมูลลูกค้าตาม ID
   */
  async getCustomerById(id: number): Promise<CustomerDTO | null> {
    const customer = await prisma.customers.findUnique({
      where: { customer_id: id },
    });
    if (!customer) return null;
    return {
      customer_id: customer.customer_id,
      nickname: customer.nickname,
      phone: customer.phone,
      avatar_url: customer.avatar_url,
    };
  }
}
