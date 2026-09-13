/**
 * สัญญาระบบบริการฝั่งลูกค้า (Customer Repository Interfaces & DTOs)
 * กำหนดประเภทข้อมูลและเมธอดสำหรับการสแกนโต๊ะ/ร้าน, สั่งอาหาร, ติดตามสถานะคิว, สมัครสมาชิกลูกค้า และตรวจสอบสลิปการชำระเงิน
 */

import {
  CartItemDTO,
  CategoryDTO,
  CrustDTO,
  MenuItemDTO,
  OrderDTO,
  RestaurantProfileDTO,
  SampleMenuDTO,
} from "./restaurant.repository.interface";

export type {
  CartItemDTO,
  CategoryDTO,
  CrustDTO,
  MenuItemDTO,
  OrderDTO,
  RestaurantProfileDTO,
  SampleMenuDTO,
};

/**
 * โครงสร้างข้อมูลโต๊ะอาหารและข้อมูลร้านค้าสำหรับแสดงผลฝั่งลูกค้า
 */
export interface CustomerTableInfoDTO {
  tableId: string;                     // รหัสโต๊ะ
  tableNumber: string | number;        // หมายเลขโต๊ะ
  restaurant: RestaurantProfileDTO;    // ข้อมูลร้านค้า
  activeOrderId?: string | null;       // รหัสออเดอร์ที่กำลังดำเนินการอยู่ของโต๊ะนี้ (ถ้ามี)
}

/**
 * ผลลัพธ์การตรวจสอบความถูกต้องของโต๊ะ/ร้านค้า (Validation Result)
 */
export interface CustomerTableValidationResultDTO {
  success: boolean;                    // ตรวจสอบผ่านหรือไม่
  errorType?: "SHOP_NOT_FOUND" | "TABLE_NOT_FOUND" | "SHOP_CLOSED" | "PACKAGE_EXPIRED" | "GENERAL_ERROR";
  message?: string;                    // ข้อความแจ้งเตือนกรณีมีข้อผิดพลาด
  tableInfo?: CustomerTableInfoDTO | null; // ข้อมูลโต๊ะและร้านค้า
}

/**
 * ข้อมูลโปรไฟล์ลูกค้า (Customer Profile DTO)
 */
export interface CustomerDTO {
  customer_id: number;                 // รหัสลูกค้า
  nickname: string;                    // ชื่อเล่นลูกค้า
  phone: string;                       // เบอร์โทรศัพท์ลูกค้า
  avatar_url?: string | null;          // URL รูปโปรไฟล์
}

/**
 * โครงสร้างข้อมูลสำหรับการสั่งซื้อรายการอาหารใหม่ (Place Order DTO)
 */
export interface PlaceOrderDTO {
  tableId: string;                     // รหัสโต๊ะที่สั่ง
  shopId?: string | number;            // รหัสร้านค้า
  deviceId?: string;                   // รหัสอุปกรณ์ (Device Fingerprint) ของลูกค้า
  items: CartItemDTO[];                // รายการสินค้าในตะกร้า
  note?: string;                       // หมายเหตุเพิ่มเติมถึงร้านค้า
  customerId?: number;                 // รหัสลูกค้าที่สั่ง
  customerNickname?: string;           // ชื่อเล่นลูกค้า
  customerPhone?: string;              // เบอร์โทรลูกค้า
  pickupType?: "asap" | "scheduled";   // ประเภทการรับสินค้า: รับทันที หรือ สั่งล่วงหน้าตามเวลา
  scheduledTime?: string;              // เวลาที่นัดรับสินค้า (กรณีสั่งล่วงหน้า)
  paymentMethod?: string;              // ช่องทางการชำระเงิน (promptpay, cash, online ฯลฯ)
}

/**
 * ข้อมูลการชำระเงินผ่านพร้อมเพย์ (PromptPay Payment Info DTO)
 */
export interface PromptPayPaymentInfoDTO {
  orderId: string;                     // รหัสออเดอร์
  amount: number;                      // ยอดเงินที่ต้องชำระ (บาท)
  accountNumber: string;               // หมายเลขพร้อมเพย์ (เบอร์โทร หรือ เลขบัตร ปชช.)
  accountName: string;                 // ชื่อบัญชีผู้รับเงิน
  bankName?: string;                   // ชื่อธนาคาร
  qrUrl: string;                       // ลิงก์รูปภาพ QR Code พร้อมเพย์
  qrPayload: string;                   // ข้อมูลสตริง EMVCo Payload สำหรับสร้าง QR Code
}

/**
 * ผลลัพธ์การตรวจสอบสลิปโอนเงิน (Slip Verification Result DTO)
 */
export interface SlipVerificationResultDTO {
  orderId: string;                     // รหัสออเดอร์
  status: "verified" | "verifying" | "error" | "failed"; // สถานะการตรวจสอบ
  message: string;                     // ข้อความผลลัพธ์
  httpStatus?: number;                 // HTTP Status Code
  slipUrl?: string;                    // URL ของภาพสลิป
  paidAt?: string;                     // วันเวลาที่โอนเงิน
  isPaid?: boolean;                    // ยืนยันการชำระเงินสำเร็จหรือไม่
  amountInSlip?: number;               // จำนวนเงินที่อ่านได้จากสลิป
  easyslipData?: Record<string, any>;  // ข้อมูลเพิ่มเติมจาก API ตรวจสอบสลิป (เช่น EasySlip / Gemini OCR)
}

/**
 * Interface สำหรับ Customer Repository
 */
export interface ICustomerRepository {
  // โต๊ะและรายการเมนู
  /** ตรวจสอบข้อมูลโต๊ะและสถานะร้านค้า */
  getTableInfo(tableId: string, shopId?: string | number): Promise<CustomerTableValidationResultDTO>;
  /** ดึงหมวดหมู่อาหารของร้าน */
  getCategories(shopId?: string | number): Promise<CategoryDTO[]>;
  /** ดึงรายการแป้งเครปที่มี */
  getCrusts(shopId?: string | number): Promise<CrustDTO[]>;
  /** ดึงรายการเมนูตัวอย่าง/เมนูแนะนำ */
  getSampleMenus(shopId?: string | number): Promise<SampleMenuDTO[]>;
  /** ค้นหาและดึงรายการเมนูอาหารตามเงื่อนไข */
  getMenuItems(search?: string, category?: string, shopId?: string | number): Promise<MenuItemDTO[]>;
  /** ดึงรายละเอียดเมนูตาม ID */
  getMenuItemById(id: string, shopId?: string | number): Promise<MenuItemDTO | null>;

  // การสั่งซื้อและติดตามคิว
  /** ส่งออเดอร์สั่งอาหารใหม่ */
  placeOrder(order: PlaceOrderDTO): Promise<OrderDTO>;
  /** ดึงออเดอร์ปัจจุบันที่ยังดำเนินการไม่เสร็จของลูกค้า */
  getActiveOrder(tableId: string, deviceId?: string, shopId?: string | number, phone?: string): Promise<OrderDTO | null>;
  /** ดึงประวัติออเดอร์ทั้งหมดของโต๊ะ/ลูกค้า */
  getTableOrders(tableId: string, shopId?: string | number, phone?: string, deviceId?: string): Promise<OrderDTO[]>;
  /** ดึงสถานะคิวแบบเรียลไทม์ (จำนวนคิวข้างหน้า, เวลาโดยประมาณ) */
  getLiveQueueStatus?(shopId?: string | number, orderId?: string, queueNumber?: string): Promise<{
    currentCookingQueue: string;
    waitingCount: number;
    totalWaitingItems: number;
    estimatedMinutes: number;
    queuesAhead: number;
    itemsAhead: number;
    estimatedRemainingMinutes: number;
  }>;
  /** ดึงข้อมูลออเดอร์ตาม ID */
  getOrderById(orderId: string): Promise<OrderDTO | null>;
  /** เพิ่มรายการสินค้าเข้าไปในออเดอร์เดิม */
  addItemsToOrder(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null>;
  /** เปลี่ยนรายการสินค้าในออเดอร์กรณีสินค้าเดิมหมด */
  replaceOrderItem(orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<OrderDTO | null>;
  /** อัปเดตรายการสินค้าในออเดอร์ */
  updateOrderItems(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null>;
  /** ลบรายการสินค้าออกจากออเดอร์ */
  removeOrderItem(orderId: string, itemId: string): Promise<OrderDTO | null>;

  // การยืนยันตัวตนลูกค้า
  /** เข้าสู่ระบบหรือลงทะเบียนลูกค้าด้วยเบอร์โทรและชื่อเล่น */
  loginOrRegisterCustomer(nickname: string, phone: string, avatarUrl?: string): Promise<CustomerDTO>;
  /** ลงทะเบียนลูกค้าใหม่ */
  registerCustomer?(nickname: string, phone: string, avatarUrl?: string): Promise<CustomerDTO>;
  /** ค้นหาข้อมูลลูกค้าจากเบอร์โทรศัพท์ */
  getCustomerByPhone(phone: string): Promise<CustomerDTO | null>;
  /** ดึงข้อมูลลูกค้าจากรหัสลูกค้า (ID) */
  getCustomerById(id: number): Promise<CustomerDTO | null>;

  // การชำระเงิน
  /** ดึงข้อมูลสำหรับชำระเงินด้วย พร้อมเพย์ (PromptPay QR) */
  getPromptPayInfo(orderId: string): Promise<PromptPayPaymentInfoDTO | null>;
  /** อัปโหลดและตรวจสอบความถูกต้องของสลิปโอนเงิน (OCR / Slip API) */
  uploadAndVerifySlip(orderId: string, slipUrl?: string, fileBase64?: string): Promise<SlipVerificationResultDTO>;
  /** แจ้งร้านค้าว่าต้องการชำระด้วยเงินสด */
  notifyCashPayment(orderId: string): Promise<{ success: boolean; message: string }>;
  /** อัปเดตช่องทางการชำระเงินของออเดอร์ */
  updatePaymentMethod(orderId: string, paymentMethod: string): Promise<OrderDTO | null>;
}
