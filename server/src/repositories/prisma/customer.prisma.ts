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
import { SlipPrescreenerService, parseEmvSlipQr, getBankCodeByName } from "../../services/slip-prescreener.service";
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

interface ParsedSlipDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateObj: Date;
}

/**
 * ฟังก์ชันทำความสะอาดเลขบัญชี/เบอร์พร้อมเพย์ ให้เหลือเฉพาะตัวเลข
 */
function cleanDigits(val?: string | null): string {
  if (!val) return "";
  let digits = String(val).replace(/\D/g, "");
  // แปลงเบอร์มือถือฟอร์แมต 0066... หรือ 66... ให้เป็น 0...
  if (digits.startsWith("0066")) {
    digits = "0" + digits.slice(4);
  } else if (digits.startsWith("66") && (digits.length === 11 || digits.length === 12)) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

/**
 * ฟังก์ชันแยกคำสำคัญจากชื่อผู้รับ (ตัดคำนำหน้า เช่น นาย นาง นางสาว บริษัท บจก. ฯลฯ)
 */
function extractNameTokens(name?: string | null): string[] {
  if (!name) return [];
  const clean = String(name)
    .replace(/(?:นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|บจก\.|บริษัท|หจก\.|จำกัด|มหาชน|mr\.|mrs\.|ms\.|miss)\s*/gi, " ")
    .replace(/[^a-zA-Z0-9\u0E00-\u0E7F\s]/g, " ")
    .toLowerCase()
    .trim();

  return clean
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

/**
 * ตรวจสอบว่าบัญชีหรือชื่อผู้รับในสลิป ตรงกับบัญชีรับเงินของร้านค้าในระบบหรือไม่
 */
function isReceiverMatch(
  slipReceiverAcc?: string | null,
  slipReceiverName?: string | null,
  shopPP?: string | null,
  shopBankAcc?: string | null,
  shopAccountName?: string | null
): { matched: boolean; reason: string } {
  const cleanShopPP = cleanDigits(shopPP);
  const cleanShopBank = cleanDigits(shopBankAcc);
  const shopNameTokens = extractNameTokens(shopAccountName);

  // ถ้าทางร้านไม่ได้ตั้งค่าบัญชีรับเงินใดๆ เลย ให้ถือว่า match
  if (!cleanShopPP && !cleanShopBank && shopNameTokens.length === 0) {
    return { matched: true, reason: "Shop has no payment profile configured" };
  }

  const cleanSlipAcc = cleanDigits(slipReceiverAcc);
  const slipNameTokens = extractNameTokens(slipReceiverName);

  // ตรวจสอบชื่อว่าตรงหรือไม่
  let nameMatched = false;
  if (shopNameTokens.length > 0 && slipNameTokens.length > 0) {
    for (const sToken of shopNameTokens) {
      for (const slipToken of slipNameTokens) {
        if (
          sToken === slipToken ||
          sToken.includes(slipToken) ||
          slipToken.includes(sToken)
        ) {
          nameMatched = true;
          break;
        }
      }
      if (nameMatched) break;
    }
  }

  // ตรวจสอบเลขบัญชี / พร้อมเพย์
  let fullAccMatched = false;
  let partialAccMatched = false;

  if (cleanSlipAcc && cleanSlipAcc.length >= 4) {
    // 1. ตรวจสอบแบบเต็มจำนวน (Full Match เช่น 10 หลักตรงกันเป๊ะ)
    if (cleanShopPP && (cleanShopPP === cleanSlipAcc || (cleanSlipAcc.length >= 9 && cleanShopPP.endsWith(cleanSlipAcc)))) {
      fullAccMatched = true;
    }
    if (cleanShopBank && (cleanShopBank === cleanSlipAcc || (cleanSlipAcc.length >= 9 && cleanShopBank.endsWith(cleanSlipAcc)))) {
      fullAccMatched = true;
    }

    // 2. ตรวจสอบแบบเลขท้าย (Masked Match เช่น 4-8 หลักท้าย)
    if (!fullAccMatched) {
      if (cleanShopPP && (cleanShopPP.endsWith(cleanSlipAcc) || cleanSlipAcc.endsWith(cleanShopPP) || cleanShopPP.endsWith(cleanSlipAcc.slice(-4)))) {
        partialAccMatched = true;
      }
      if (cleanShopBank && (cleanShopBank.endsWith(cleanSlipAcc) || cleanSlipAcc.endsWith(cleanShopBank) || cleanShopBank.endsWith(cleanSlipAcc.slice(-4)))) {
        partialAccMatched = true;
      }
    }
  }

  // กรณี 1: บัญชีตรงเต็มจำนวน (Full Account Match)
  if (fullAccMatched) {
    // ถ้ามีชื่อผู้รับในสลิปด้วย และมีชื่อร้านในระบบ แต่ชื่อในสลิปขัดแย้งกับร้านชัดเจน (เช่น บจก. เซเว่น, CP ALL หรือชื่อคนอื่น)
    if (slipNameTokens.length > 0 && shopNameTokens.length > 0 && !nameMatched) {
      return {
        matched: false,
        reason: `Receiver name conflict: Slip account matched but name (${slipReceiverName}) does not match shop (${shopAccountName})`,
      };
    }
    return { matched: true, reason: `Matched Full Account (${cleanSlipAcc})` };
  }

  // กรณี 2: บัญชีตรงแบบ Masked (Partial Account Match เช่น 4 หลักท้าย)
  if (partialAccMatched) {
    // ถ้ามีชื่อในสลิปและชื่อร้านในระบบ ต้องให้ชื่อตรงกันด้วย เพื่อป้องกันเบอร์อื่นที่บังเอิญลงท้าย 4 ตัวเหมือนกัน
    if (slipNameTokens.length > 0 && shopNameTokens.length > 0) {
      if (nameMatched) {
        return { matched: true, reason: `Matched Partial Account (${cleanSlipAcc}) and Name (${slipReceiverName})` };
      } else {
        return {
          matched: false,
          reason: `Receiver name mismatch: Masked account matched (${cleanSlipAcc}) but name (${slipReceiverName}) does not match shop (${shopAccountName})`,
        };
      }
    }
    return { matched: true, reason: `Matched Partial Account (${cleanSlipAcc})` };
  }

  // กรณี 3: ชื่อตรงกันอย่างชัดเจน (Name Matched)
  if (nameMatched) {
    // ถ้ามีเลขบัญชีเต็มรูปแบบแต่ไม่ตรงกับร้านเลย
    if (cleanSlipAcc && cleanSlipAcc.length >= 9 && !fullAccMatched) {
      return {
        matched: false,
        reason: `Receiver account conflict: Name matched but full account (${cleanSlipAcc}) does not match shop`,
      };
    }
    return { matched: true, reason: `Matched Account Name (${slipReceiverName})` };
  }

  // กรณี 4: มีข้อมูลเลขบัญชีหรือชื่อ แต่ไม่ตรงกับของร้านเลย -> ปฏิเสธทันที
  if (cleanSlipAcc || slipNameTokens.length > 0) {
    return {
      matched: false,
      reason: `Receiver mismatch: Slip Acc (${cleanSlipAcc || "-"}), Name (${slipReceiverName || "-"}) does not match Shop PP (${cleanShopPP || "-"}), Bank (${cleanShopBank || "-"}), Name (${shopAccountName || "-"})`,
    };
  }

  // กรณีที่ในสลิปไม่มีทั้งเลขบัญชีและชื่อ (เช่น QR ที่ไม่มี tag ผู้รับ)
  return { matched: true, reason: "No receiver info found in slip (pending bank check)" };
}

/**
 * แปลงฟอร์แมตวันที่และเวลาไทยในสลิปทุกรูปแบบให้เป็น Date Object มาตรฐานตามเวลาไทย (Asia/Bangkok, UTC+7)
 * รองรับ: 13 ก.ย. 69, 13 ก.ย. 2569, 13 กันยายน 2567, 13/09/69, 13/09/2569, 2026-09-13, 13-09-2026 ฯลฯ
 */
function parseThaiSlipDateTime(
  transferDate?: string,
  transferTime?: string,
  rawStr?: string
): ParsedSlipDate | null {
  const thaiMonths: Record<string, number> = {
    "ม.ค.": 1, "มกราคม": 1, "jan": 1, "january": 1,
    "ก.พ.": 2, "กุมภาพันธ์": 2, "feb": 2, "february": 2,
    "มี.ค.": 3, "มีนาคม": 3, "mar": 3, "march": 3,
    "เม.ย.": 4, "เมษายน": 4, "apr": 4, "april": 4,
    "พ.ค.": 5, "พฤษภาคม": 5, "may": 5,
    "มิ.ย.": 6, "มิถุนายน": 6, "jun": 6, "june": 6,
    "ก.ค.": 7, "กรกฎาคม": 7, "jul": 7, "july": 7,
    "ส.ค.": 8, "สิงหาคม": 8, "aug": 8, "august": 8,
    "ก.ย.": 9, "กันยายน": 9, "sep": 9, "september": 9,
    "ต.ค.": 10, "ตุลาคม": 10, "oct": 10, "october": 10,
    "พ.ย.": 11, "พฤศจิกายน": 11, "nov": 11, "november": 11,
    "ธ.ค.": 12, "ธันวาคม": 12, "dec": 12, "december": 12,
  };

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let hour = 0;
  let minute = 0;
  let second = 0;

  const fullText = `${transferDate || ""} ${transferTime || ""} ${rawStr || ""}`.trim();
  if (!fullText) return null;

  // 1. ดึงข้อมูลเวลา (เช่น 14:30:15, 14:30, 14.30, 14:30 น.)
  const timeMatch = fullText.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
    if (timeMatch[3]) second = parseInt(timeMatch[3], 10);
  }

  // 2. ตรวจจับชื่อเดือนภาษาไทย/อังกฤษ (เช่น "13 ก.ย. 69", "13 ก.ย. 2569", "13 กันยายน 2567")
  for (const [mName, mVal] of Object.entries(thaiMonths)) {
    const escaped = mName.replace(/\./g, "\\.");
    const regex = new RegExp(`(\\d{1,2})\\s*(?:${escaped})\\s*(\\d{2,4})`, "i");
    const match = fullText.match(regex);
    if (match) {
      day = parseInt(match[1], 10);
      month = mVal;
      let yr = parseInt(match[2], 10);
      if (yr < 100) {
        yr = yr >= 40 ? 2500 + yr - 543 : 2000 + yr;
      } else if (yr > 2500) {
        yr -= 543;
      }
      year = yr;
      break;
    }
  }

  // 3. ตรวจจับวันที่รูปแบบตัวเลข (เช่น YYYY-MM-DD, DD/MM/YYYY, DD-MM-YY)
  if (!year || !month || !day) {
    // Format YYYY-MM-DD
    const isoMatch = fullText.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      let yr = parseInt(isoMatch[1], 10);
      if (yr > 2500) yr -= 543;
      year = yr;
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      // Format DD/MM/YYYY หรือ DD/MM/YY
      const dmyMatch = fullText.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        let yr = parseInt(dmyMatch[3], 10);
        if (yr < 100) {
          yr = yr >= 40 ? 2500 + yr - 543 : 2000 + yr;
        } else if (yr > 2500) {
          yr -= 543;
        }
        year = yr;
      }
    }
  }

  if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const pad = (n: number) => String(n).padStart(2, "0");
    // กำหนด Timezone เวลาไทย (+07:00) เสมอ เพื่อป้องกัน UTC Server Drift
    const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
    const dateObj = new Date(isoStr);
    if (!isNaN(dateObj.getTime())) {
      return { year, month, day, hour, minute, second, dateObj };
    }
  }

  return null;
}

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
      let restaurant: any = null;
      if (order.restaurantId) {
        restaurant = await prisma.restaurant_data.findUnique({
          where: { res_id: Number(order.restaurantId) },
          select: { promptpay_number: true, bank_account_number: true, bank_name: true, promptpay_name: true, bank_account_name: true },
        });
      }
      if (!restaurant || (!restaurant.promptpay_number && !restaurant.bank_account_number)) {
        restaurant = await prisma.restaurant_data.findFirst({
          where: {
            OR: [
              { promptpay_number: { not: null } },
              { bank_account_number: { not: null } },
            ],
          },
          select: { promptpay_number: true, bank_account_number: true, bank_name: true, promptpay_name: true, bank_account_name: true },
        });
      }

      shopProfile = {
        promptpayNumber: restaurant?.promptpay_number || undefined,
        bankAccountNumber: restaurant?.bank_account_number || undefined,
        bankName: restaurant?.bank_name || undefined,
        bankAccountName: restaurant?.promptpay_name || restaurant?.bank_account_name || undefined,
      };

      console.log(`[Slip Verification] 🏪 Shop Profile loaded: PP=${shopProfile.promptpayNumber || "-"}, BankAcc=${shopProfile.bankAccountNumber || "-"}, Bank=${shopProfile.bankName || "-"}, Name=${shopProfile.bankAccountName || "-"}`);

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

    const shopPP = shopProfile.promptpayNumber;
    const shopBankAcc = shopProfile.bankAccountNumber;
    const shopAccountName = shopProfile.bankAccountName;

    // =========================================================================
    // ขั้นตอนที่ 1: ตรวจสอบด้วย Gemini 3.6 flash (เท่านั้น)
    // - ตรวจว่าเป็นสลิป
    // - อ่านยอดเงิน (ต้องตรงกับยอดคำสั่งซื้อเป๊ะๆ)
    // - อ่านวันที่ และ เวลา (ต้องเป็นปัจจุบันและสอดคล้อง ไม่เกิน 24 ชม. ไม่อยู่ในอนาคต)
    // - อ่านรหัสอ้างอิงและตรวจสลิปซ้ำ
    // - อ่านธนาคารและบัญชี/ชื่อปลายทาง (ต้องตรงกับร้านค้าในฐานข้อมูล)
    // *หาก Gemini ตอบกลับ Status 429 ให้สลับไปขั้นตอนที่ 2: BOT Mini QR Code ทันที*
    // =========================================================================
    console.log(`\n================== [Slip Verification: Order #${orderId}] ==================`);
    console.log(`[Slip Verification] 🤖 ขั้นตอนที่ 1: ตรวจสอบสลิปด้วย Gemini 3.6 flash (เท่านั้น)...`);

    let geminiData = await GeminiSlipService.extractSlipData(fileBase64);
    let passedStep1or2 = false;
    let detectedTxRef = "";

    if (!geminiData.is_api_error) {
      // 1.1 ตรวจสอบว่าเป็นสลิปธนาคารจริงหรือไม่
      if (!geminiData.is_bank_slip) {
        console.warn(`[Slip Verification - Step 1] ❌ ไม่ใช่รูปสลิปธนาคาร`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร กรุณาแนบรูปภาพสลิปที่ถูกต้อง",
          isPaid: false,
        };
      }

      // 1.2 ตรวจสอบยอดเงิน (ต้องตรงกับยอดชำระเป๊ะๆ ไม่อนุญาตทั้งยอดขาดหรือเกิน)
      const slipAmount: number = Number(geminiData.amount || 0);
      console.log(`[Slip Verification - Step 1] 💵 ยอดเงินในสลิป: ${slipAmount} บาท (ยอดที่ต้องชำระ: ${requiredAmount} บาท)`);
      if (slipAmount <= 0 || Math.abs(slipAmount - requiredAmount) > 0.01) {
        console.warn(`[Slip Verification - Step 1] ❌ ยอดเงินไม่ตรง: ${slipAmount} != ${requiredAmount}`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: `ยอดเงินในสลิป (${slipAmount > 0 ? slipAmount.toLocaleString() : "0"} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
          isPaid: false,
        };
      }

      // 1.3 ตรวจสอบบัญชีและชื่อผู้รับปลายทาง (ต้องตรงกับของร้านค้าในฐานข้อมูล)
      console.log(`[Slip Verification - Step 1] 🏦 ตรวจสอบผู้รับ: เลขบัญชี (${geminiData.receiver_account || "-"}), ชื่อ (${geminiData.receiver_name || "-"}) vs ร้านค้า: PP (${shopPP || "-"}), BankAcc (${shopBankAcc || "-"}), ชื่อ (${shopAccountName || "-"})`);
      const receiverMatch = isReceiverMatch(
        geminiData.receiver_account,
        geminiData.receiver_name,
        shopPP,
        shopBankAcc,
        shopAccountName
      );

      if (!receiverMatch.matched) {
        console.warn(`[Slip Verification - Step 1] ❌ บัญชีหรือชื่อผู้รับไม่ตรงกับร้าน: ${receiverMatch.reason}`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า (บัญชีหรือชื่อผู้รับในสลิปไม่ตรงกับบัญชีของร้านค้า)",
          isPaid: false,
        };
      }

      // 1.4 ตรวจสอบธนาคารปลายทาง (หากมี)
      const shopBankCode = getBankCodeByName(shopProfile.bankName);
      if (geminiData.receiver_bank && shopBankCode && /^\d{3}$/.test(geminiData.receiver_bank)) {
        if (geminiData.receiver_bank !== shopBankCode) {
          console.warn(`[Slip Verification - Step 1] ❌ ธนาคารปลายทางไม่ตรง: ${geminiData.receiver_bank} != ${shopBankCode}`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "ธนาคารปลายทางในสลิปไม่ตรงกับธนาคารของร้านค้า กรุณาตรวจสอบและลองใหม่อีกครั้ง",
            isPaid: false,
          };
        }
      }

      // 1.5 ตรวจสอบวันที่และเวลาในสลิป
      const parsedSlip = parseThaiSlipDateTime(
        geminiData.transfer_date,
        geminiData.transfer_time,
        geminiData.datetime_str
      );
      if (parsedSlip) {
        const now = new Date();
        const bkkFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: false,
        });
        const parts = bkkFormatter.formatToParts(now);
        const bkkParts: Record<string, number> = {};
        parts.forEach((p) => {
          if (p.type !== "literal") bkkParts[p.type] = parseInt(p.value, 10);
        });

        const todayYear = bkkParts.year || now.getFullYear();
        const todayMonth = bkkParts.month || now.getMonth() + 1;
        const todayDay = bkkParts.day || now.getDate();

        const slipCalendarDate = new Date(parsedSlip.year, parsedSlip.month - 1, parsedSlip.day).getTime();
        const todayCalendarDate = new Date(todayYear, todayMonth - 1, todayDay).getTime();
        const diffDays = Math.round((todayCalendarDate - slipCalendarDate) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "วันที่ในสลิปไม่ถูกต้อง (พบวันที่ในอนาคต)",
            isPaid: false,
          };
        }
        if (diffDays > 1) {
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
            isPaid: false,
          };
        }

        const diffMinutes = (now.getTime() - parsedSlip.dateObj.getTime()) / (1000 * 60);
        if (diffMinutes < -30) {
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "เวลาในสลิปไม่ถูกต้อง (พบเวลาในอนาคต)",
            isPaid: false,
          };
        }
        if (diffMinutes > 24 * 60) {
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
            isPaid: false,
          };
        }
      }

      // 1.6 ตรวจสอบรหัสอ้างอิงและตรวจสลิปซ้ำ
      detectedTxRef = geminiData.transaction_ref?.trim() || "";
      if (detectedTxRef && usedRefs && usedRefs.has(detectedTxRef)) {
        console.warn(`[Slip Verification - Step 1] ❌ พบสลิปซ้ำ (Ref: ${detectedTxRef})`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปนี้เคยถูกใช้งานแล้ว กรุณาใช้สลิปใหม่",
          isPaid: false,
        };
      }

      passedStep1or2 = true;
      console.log(`[Slip Verification] ✅ ขั้นตอนที่ 1 (Gemini 3.6 Flash) ผ่านเงื่อนไขเรียบร้อยแล้ว (Amount: ${slipAmount}, Ref: ${detectedTxRef || "-"})`);
    } else {
      console.log(`[Slip Verification] ⚠️ Gemini 3.6 Flash ตอบกลับ Status 429 / Rate Limit (${geminiData.error_message}) -> สลับไปขั้นตอนที่ 2: ถอดรหัส BOT Mini QR Code ทันที...`);
    }

    // =========================================================================
    // ขั้นตอนที่ 2: ตรวจสอบด้วย BOT Mini QR Code (เมื่อ Gemini 3.6 Flash ตอบกลับ status 429)
    // - ตรวจว่าเป็นสลิป
    // - อ่านวันที่และเวลา เปรียบเทียบกับปัจจุบัน
    // - อ่านรหัสอ้างอิงและตรวจสลิปซ้ำ
    // - อ่านธนาคารและบัญชีปลายทางว่าตรงกับบัญชีรับเงินในฐานข้อมูล
    // =========================================================================
    if (!passedStep1or2) {
      console.log(`[Slip Verification] 🔍 ขั้นตอนที่ 2: ตรวจสอบสลิปด้วย BOT Mini QR Code บนสลิปโดยตรง...`);
      let qrScan: any = null;
      try {
        qrScan = await SlipPrescreenerService.extractQrFromBase64(fileBase64);
      } catch (qrErr) {
        console.warn("[Slip Verification - Step 2] QR Scan error:", qrErr);
      }

      if (!qrScan?.payload) {
        console.warn(`[Slip Verification - Step 2] ❌ ไม่พบ QR Code ในรูปภาพสลิป`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "ไม่พบ QR Code ในรูปภาพ กรุณาอัปโหลดรูปสลิปจากแอปธนาคารให้ชัดเจน",
          isPaid: false,
        };
      }

      const qrData = parseEmvSlipQr(qrScan.payload);
      const isSlipStandard =
        qrData.format === "BOT_MINI_QR" ||
        qrData.format === "PROMPTPAY_EMV" ||
        qrScan.payload.startsWith("000201") ||
        qrScan.payload.startsWith("0045") ||
        qrScan.payload.startsWith("0038") ||
        qrScan.payload.includes("000001") ||
        qrScan.payload.includes("A000000677");

      if (!isSlipStandard) {
        console.warn(`[Slip Verification - Step 2] ❌ ไม่ใช่สลิปธนาคารตามมาตรฐาน BOT Mini QR`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร กรุณาใช้รูปสลิปโอนเงินจริง",
          isPaid: false,
        };
      }

      // 2.1 อ่านรหัสอ้างอิงและตรวจสลิปซ้ำ
      detectedTxRef = qrData.transactionRef?.trim() || "";
      if (detectedTxRef && usedRefs && usedRefs.has(detectedTxRef)) {
        console.warn(`[Slip Verification - Step 2] ❌ พบสลิปซ้ำ (Ref: ${detectedTxRef})`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "สลิปนี้เคยถูกใช้งานแล้ว กรุณาใช้สลิปใหม่",
          isPaid: false,
        };
      }

      // 2.2 อ่านยอดเงิน (หากมีระบุใน Mini QR Tag 54 หรือ Tag 51)
      if (qrData.amount !== undefined && qrData.amount > 0) {
        if (Math.abs(qrData.amount - requiredAmount) > 0.01) {
          console.warn(`[Slip Verification - Step 2] ❌ ยอดเงินไม่ตรง: ${qrData.amount} != ${requiredAmount}`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: `ยอดเงินในสลิป (${qrData.amount.toLocaleString()} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
            isPaid: false,
          };
        }
      }

      // 2.3 อ่านธนาคารปลายทางและบัญชีผู้รับ เปรียบเทียบกับบัญชีรับเงินของร้านค้าในฐานข้อมูล
      const shopBankCode = getBankCodeByName(shopProfile.bankName);
      if (qrData.receivingBank && shopBankCode && qrData.receivingBank !== shopBankCode) {
        console.warn(`[Slip Verification - Step 2] ❌ ธนาคารปลายทางไม่ตรง: ${qrData.receivingBank} != ${shopBankCode}`);
        return {
          orderId,
          status: "failed",
          httpStatus: 400,
          message: "ธนาคารปลายทางในสลิปไม่ตรงกับธนาคารของร้านค้า กรุณาตรวจสอบและลองใหม่อีกครั้ง",
          isPaid: false,
        };
      }

      if (qrData.receiverAccount) {
        const qrReceiverMatch = isReceiverMatch(
          qrData.receiverAccount,
          null,
          shopPP,
          shopBankAcc,
          shopAccountName
        );
        if (!qrReceiverMatch.matched) {
          console.warn(`[Slip Verification - Step 2] ❌ บัญชีปลายทางไม่ตรงกับร้าน: ${qrReceiverMatch.reason}`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า (บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของร้านค้า)",
            isPaid: false,
          };
        }
      }

      // 2.4 อ่านวันที่และเวลา เปรียบเทียบกับปัจจุบัน
      if (qrData.transferDate) {
        const transferTime = qrData.transferDate.getTime();
        const nowTime = Date.now();
        const diffHours = (nowTime - transferTime) / (1000 * 60 * 60);
        if (diffHours < -2) {
          console.warn(`[Slip Verification - Step 2] ❌ วันที่และเวลาในสลิปอยู่ในอนาคต`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "วันที่และเวลาในสลิปไม่ถูกต้อง (พบเวลาในอนาคต)",
            isPaid: false,
          };
        }
        if (diffHours > 24) {
          console.warn(`[Slip Verification - Step 2] ❌ สลิปหมดอายุ: ${diffHours.toFixed(1)} ชั่วโมงที่แล้ว`);
          return {
            orderId,
            status: "failed",
            httpStatus: 400,
            message: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
            isPaid: false,
          };
        }
      }

      passedStep1or2 = true;
      console.log(`[Slip Verification] ✅ ขั้นตอนที่ 2 (BOT Mini QR Code) ผ่านเงื่อนไขเรียบร้อยแล้ว (Ref: ${detectedTxRef || "-"})`);
    }

    // =========================================================================
    // ขั้นตอนที่ 3: ตรวจสอบด้วย EasySlip API v2
    // (เมื่อผ่านเงื่อนไขตรวจว่าเป็นสลิป อ่านวันที่เป็นปัจจุบัน อ่านเวลาสอดคล้องกับปัจจุบัน
    // อ่านรหัสอ้างอิงไม่ซ้ำ และอ่านธนาคารปลายทางตรงกับบัญชีรับเงินในฐานข้อมูล ค่อยไปตรวจด้วย EasySlip)
    // =========================================================================
    console.log(`[Slip Verification] 🌐 ขั้นตอนที่ 3: ส่งตรวจสอบกับระบบธนาคารผ่าน [EasySlip API v2 Engine]...`);
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

    // ตรวจสอบยอดเงินจากผลลัพธ์ธนาคาร (ต้องตรงกับยอดคำสั่งซื้อทุกกรณี ไม่อนุญาตทั้งยอดน้อยกว่าหรือมากกว่า)
    const amountInSlip: number =
      easyslipResult?.data?.amount?.amount ??
      easyslipResult?.data?.amountInSlip ??
      easyslipResult?.data?.amount ??
      0;

    if (amountInSlip <= 0 || (requiredAmount > 0 && Math.abs(amountInSlip - requiredAmount) > 0.01)) {
      console.warn(`[Slip Verification - EasySlip] ❌ Bank amount mismatch: Paid ${amountInSlip} THB, Required ${requiredAmount} THB`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: `ยอดเงินในสลิป (${amountInSlip.toLocaleString()} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
        isPaid: false,
        easyslipData: easyslipResult,
      };
    }

    // ตรวจสอบบัญชีและชื่อผู้รับเงินในระบบธนาคารกับบัญชีร้านค้า
    const easyslipReceiver = easyslipResult?.data?.receiver;
    const receiverInBank =
      easyslipReceiver?.account?.value ||
      easyslipReceiver?.proxy?.value ||
      easyslipReceiver?.account?.bank?.account ||
      "";

    const receiverNameInBank =
      easyslipReceiver?.account?.name?.th ||
      easyslipReceiver?.account?.name?.en ||
      easyslipReceiver?.name ||
      "";

    console.log(`[Slip Verification - EasySlip] 🏦 Checking Bank Receiver: Acc (${receiverInBank || "-"}), Name (${receiverNameInBank || "-"}) vs Shop PP (${shopPP || "-"}), BankAcc (${shopBankAcc || "-"}), Name (${shopAccountName || "-"})`);

    const bankReceiverMatch = isReceiverMatch(
      receiverInBank,
      receiverNameInBank,
      shopPP,
      shopBankAcc,
      shopAccountName
    );

    if (!bankReceiverMatch.matched) {
      console.warn(`[Slip Verification - EasySlip] ❌ Bank receiver mismatch: ${bankReceiverMatch.reason}`);
      return {
        orderId,
        status: "failed",
        httpStatus: 400,
        message: "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า (บัญชีหรือชื่อผู้รับในระบบธนาคารไม่ตรงกับของร้าน)",
        isPaid: false,
        easyslipData: easyslipResult,
      };
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

    const existing = cleanPhone
      ? await prisma.customers.findFirst({
          where: { phone: cleanPhone },
        })
      : cleanNick
      ? await prisma.customers.findFirst({
          where: { nickname: cleanNick },
        })
      : null;

    if (existing) {
      const updated = await prisma.customers.update({
        where: { customer_id: existing.customer_id },
        data: {
          nickname: cleanNick || existing.nickname,
          phone: cleanPhone || existing.phone,
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
