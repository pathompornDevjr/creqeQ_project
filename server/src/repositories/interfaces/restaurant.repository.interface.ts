/**
 * สัญญาระบบจัดการร้านค้า (Restaurant Repository Interfaces & DTOs)
 * กำหนดประเภทข้อมูลและเมธอดสำหรับการจัดการออเดอร์, คิวทำอาหาร, รายการเมนู, แป้งเครป, ตัวเลือก, สต็อกวัตถุดิบ, โปรไฟล์ และสถิติยอดขาย
 */

// สถานะการทำงานของออเดอร์
export type OrderStatus = "pending" | "confirmed" | "cooking" | "ready" | "completed" | "cancelled" | "preparing" | "served" | "paid";
// ช่องทางการชำระเงิน
export type PaymentMethod = "qr" | "cash" | "promptpay" | "online";

/**
 * ตัวเลือกย่อยของเมนูอาหาร (Option Choice)
 */
export interface OptionChoice {
  label: string; // ชื่อตัวเลือก (เช่น หวานน้อย, เพิ่มชีส)
  price: number; // ราคาบวกเพิ่ม
}

/**
 * กลุ่มตัวเลือกของเมนูอาหาร (Option Group)
 */
export interface OptionGroup {
  name: string;              // ชื่อกลุ่มตัวเลือก (เช่น เลือกระดับความหวาน, ท็อปปิ้งเพิ่มเติม)
  choices: OptionChoice[];   // รายการตัวเลือกในกลุ่ม
  required?: boolean;        // จำเป็นต้องเลือกหรือไม่
  allowMultiple?: boolean;   // สามารถเลือกได้หลายรายการหรือไม่
}

/**
 * โครงสร้างข้อมูลรายการอาหาร (Menu Item DTO)
 */
export interface MenuItemDTO {
  id?: string;
  restaurantId?: number | string;
  name: string;              // ชื่อเมนูภาษาไทย
  nameEn?: string;           // ชื่อเมนูภาษาอังกฤษ
  description?: string;      // รายละเอียด/ส่วนผสม
  price: number;             // ราคาขาย
  image?: string;            // URL รูปภาพหลัก
  images?: string[];         // รายการ URL รูปภาพเพิ่มเติม
  category: string;          // หมวดหมู่
  spicyLevel?: number;       // ระดับความเผ็ด (ถ้ามี)
  popular?: boolean;         // เมนูยอดนิยม/แนะนำ
  available?: boolean;       // พร้อมขายหรือไม่
  options?: {
    sizes?: { label: string; price: number }[];
    spicy?: string[];
    extras?: { label: string; price: number }[];
    optionGroups?: OptionGroup[];
  };
  optionGroups?: OptionGroup[];
}

/**
 * โครงสร้างข้อมูลแป้งเครป (Crust DTO)
 */
export interface CrustDTO {
  id?: number;
  crust_id?: number;
  restaurantId?: number;     // รหัสร้านค้า
  name: string;              // ชื่อแป้งเครป (เช่น แป้งวานิลลา, แป้งชาโคล)
  crust_name?: string;
  description?: string;      // รายละเอียดแป้ง
  price: number;             // ราคาของแป้ง
  image_url?: string;        // รูปภาพแป้ง
  crust_image?: string;
  is_available?: boolean;    // สถานะพร้อมจำหน่าย
  isAvailable?: boolean;
  sort_order?: number;       // ลำดับการแสดงผล
  createdAt?: string;
  updatedAt?: string;
}

/**
 * โครงสร้างข้อมูลเมนูตัวอย่างเครปสำเร็จรูป (Sample Menu DTO)
 */
export interface SampleMenuDTO {
  id?: number | string;
  sample_id?: number;
  restaurantId?: number;
  name?: string;
  menu_name: string;         // ชื่อเมนูตัวอย่าง
  description?: string;      // รายละเอียดเมนู
  price?: number;            // ราคา
  image_url?: string;        // รูปภาพเมนู
  imageUrl?: string;
  sample_image?: string;
  is_active?: boolean;       // สถานะเปิดใช้งาน
  isActive?: boolean;
  sort_order?: number;       // ลำดับการแสดงผล
  sortOrder?: number;
  tags?: string;             // แท็กหมวดหมู่ (คาว, หวาน, ยอดนิยม)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * โครงสร้างข้อมูลสินค้าแต่ละรายการในตะกร้า/ออเดอร์ (Cart Item DTO)
 */
export interface CartItemDTO {
  id: string;                // รหัสเฉพาะของรายการสินค้าในตะกร้า
  menuItem: MenuItemDTO;     // ข้อมูลเมนู
  quantity: number;          // จำนวนที่สั่ง
  size?: string;             // ขนาดที่เลือก
  spicy?: string;            // ระดับความเผ็ด
  note?: string;             // หมายเหตุเพิ่มเติมสำหรับรายการนี้
  selectedOptions?: {        // ตัวเลือกเพิ่มเติมที่เลือก
    groupName: string;
    choiceLabel: string;
    price: number;
  }[];
  subtotal: number;          // ยอดรวมของรายการนี้
  isOutOfStock?: boolean;    // วัตถุดิบ/สินค้าหมดหรือไม่
  isCancelled?: boolean;     // ถูกยกเลิกหรือไม่
  cancelReason?: string;     // เหตุผลที่ยกเลิก
  status?: string;           // สถานะของรายการ
}

/**
 * โครงสร้างข้อมูลออเดอร์ฉบับเต็ม (Order DTO)
 */
export interface OrderDTO {
  id: string;                           // รหัสออเดอร์
  restaurantId?: number | string;       // รหัสร้านค้า
  tableId: string;                      // รหัสโต๊ะ
  tableNumber: number | string;         // หมายเลขโต๊ะ
  queueNumber?: string;                 // หมายเลขคิว (เช่น A01, B05)
  queueLetter?: string;                 // ตัวอักษรนำหน้าคิว (A, B, C)
  dailyQueueIndex?: number;             // ลำดับคิวประจำวัน
  deviceId?: string;                    // รหัสอุปกรณ์ของลูกค้า
  items: CartItemDTO[];                 // รายการสินค้าทั้งหมดในออเดอร์
  status: OrderStatus;                  // สถานะออเดอร์ (pending, cooking, ready, completed ฯลฯ)
  createdAt: string;                    // เวลาที่สร้างออเดอร์
  total: number;                        // ยอดรวมทั้งสิ้น (บาท)
  paymentMethod?: PaymentMethod;        // วิธีชำระเงิน
  paymentStatus?: string;               // สถานะการชำระเงิน (pending, paid)
  hasSlip?: boolean;                    // มีการแนบสลิปโอนเงินหรือไม่
  slipUrl?: string;                     // URL สลิปโอนเงิน
  cancelReason?: string;                // เหตุผลการยกเลิกออเดอร์
  customerId?: number;                  // รหัสลูกค้า
  customerNickname?: string;            // ชื่อเล่นลูกค้า
  customerPhone?: string;               // เบอร์โทรศัพท์ลูกค้า
  pickupType?: "asap" | "scheduled";    // รูปแบบการรับสินค้า
  scheduledTime?: string;               // เวลานัดรับสินค้า
  pickupQrCode?: string;                // QR Code สำหรับสแกนรับสินค้า
  cookingStartedAt?: string;            // เวลาที่เริ่มทำอาหาร
  confirmedAt?: string;                 // เวลาที่ร้านกดยืนยันรับออเดอร์
  readyAt?: string;                     // เวลาที่อาหารเสร็จพร้อมเสิร์ฟ
  completedAt?: string;                 // เวลาที่ปิดออเดอร์เสร็จสิ้น
  queuePosition?: number;               // ตำแหน่งคิวปัจจุบัน
  queuesAhead?: number;                 // จำนวนคิวก่อนหน้า
  totalActiveQueues?: number;           // จำนวนคิวที่กำลังรอทั้งหมด
}

/**
 * โครงสร้างข้อมูลสต็อกวัตถุดิบ (Inventory Item DTO)
 */
export interface InventoryItemDTO {
  id: number;
  restaurantId?: number;
  name: string;                         // ชื่อวัตถุดิบ (เช่น แป้งสาลี, กล้วยหอม, ฝอยทอง)
  category: "base" | "topping" | "ingredient"; // ประเภทวัตถุดิบ
  toppingGroup?: "sweet" | "savory" | "fruit";  // หมวดท็อปปิ้ง (หวาน, คาว, ผลไม้)
  quantity: number;                     // จำนวนคงเหลือ
  unit: string;                         // หน่วยนับ (เช่น กิโลกรัม, ฟอง, กระปุก)
  status: "available" | "low_stock" | "out_of_stock"; // สถานะสินค้าคงเหลือ
  price: number;                        // ต้นทุนต่อหน่วย
  createdAt?: string;
  updatedAt?: string;
}

/**
 * สถิติสรุปภาพรวมร้านค้า (Restaurant Stats DTO)
 */
export interface RestaurantStatsDTO {
  todayRevenue: number;   // รายได้วันนี้
  todayOrders: number;    // จำนวนออเดอร์วันนี้
  avgBill: number;        // ยอดใช้จ่ายเฉลี่ยต่อบิล
  weekRevenue: number;    // รายได้ประจำสัปดาห์
  revenueTrend: number;   // แนวโน้มการเติบโตของรายได้ (%)
  ordersTrend: number;    // แนวโน้มการเติบโตของออเดอร์ (%)
  weekTrend: number;      // แนวโน้มประจำสัปดาห์ (%)
}

/**
 * ข้อมูลยอดขายรายวัน/ช่วงเวลา (Daily Sales DTO)
 */
export interface DailySalesDTO {
  day?: string;
  time?: string;
  label?: string;
  revenue: number;        // รายได้
  orders: number;         // จำนวนออเดอร์
}

/**
 * สินค้าขายดี (Best Seller Item DTO)
 */
export interface BestSellerItemDTO {
  id: string;
  name: string;           // ชื่อสินค้า
  category: string;       // หมวดหมู่
  image?: string;         // รูปภาพ
  price: number;          // ราคา
  unitsSold: number;      // จำนวนที่ขายได้
  totalRevenue: number;   // ยอดขายรวม
  percentage: number;     // สัดส่วนยอดขาย (%)
  growth: number;         // อัตราการเติบโต
}

/**
 * สัดส่วนยอดขายตามหมวดหมู่ (Category Share DTO)
 */
export interface CategoryShareDTO {
  name: string;           // ชื่อหมวดหมู่
  value: number;          // สัดส่วนยอดขาย
  color: string;          // รหัสสีสำหรับกราฟวงกลม
}

/**
 * สรุปรายงานยอดขายแบบครบวงจร (Restaurant Summary Response DTO)
 */
export interface RestaurantSummaryResponseDTO {
  stats: {
    revenue: number;      // ยอดขายรวม
    orders: number;       // จำนวนออเดอร์ทั้งหมด
    avgBill: number;      // บิลเฉลี่ย
    peakTime?: string;    // ช่วงเวลาที่ขายดีที่สุด
    peakDay?: string;     // วันที่ขายดีที่สุด
    peakWeek?: string;
    peakMonth?: string;
    growth: number;       // อัตราการเติบโต
  };
  chartData: any[];       // ข้อมูลสำหรับวาดกราฟแนวโน้ม
  bestSellers: BestSellerItemDTO[]; // รายการเมนูขายดี
  bestCrusts: BestSellerItemDTO[];  // รายการแป้งเครปขายดี
  categoryShare: CategoryShareDTO[];// สัดส่วนยอดขายตามหมวดหมู่
  orders?: OrderDTO[];    // รายการออเดอร์
}

/**
 * พารามิเตอร์สำหรับค้นหารายงานสรุปยอดขาย
 */
export interface SummaryQueryParams {
  timeframe?: "daily" | "weekly" | "monthly" | "yearly"; // ช่วงเวลา
  day?: string;
  month?: string;
  year?: string;
}

/**
 * ข้อมูลหมวดหมู่อาหาร (Category DTO)
 */
export interface CategoryDTO {
  id: string;
  category_id?: number;
  category_name?: string;
  name?: string;
  label: string;          // ชื่อหมวดหมู่ที่แสดงผล
  remark?: string;        // คำอธิบายเพิ่มเติม
  emoji?: string;         // ไอคอนอิโมจิประจำหมวดหมู่
  menuCount?: number;     // จำนวนเมนูในหมวดนี้
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * ข้อมูลโปรไฟล์ร้านค้าฉบับสมบูรณ์ (Restaurant Profile DTO)
 */
export interface RestaurantProfileDTO {
  id?: string | number;
  name: string;
  restaurant_name?: string;
  description?: string;
  restaurant_desc?: string;
  phone?: string;
  restaurant_phone?: string;
  email?: string;
  restaurant_email?: string;
  address?: string;
  restaurant_address?: string;
  addressDetail?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  zipCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  restaurant_lat?: string;
  restaurant_long?: string;
  openTime?: string;
  closeTime?: string;
  restaurant_open_time?: string;
  restaurant_close_time?: string;
  operatingDays?: string;
  restaurant_day?: string;
  closedDays?: string;
  closed_days?: string;
  isOpen?: boolean;
  is_open?: boolean;
  isPaused?: boolean;
  is_paused?: boolean;
  pauseUntil?: string | Date;
  pause_until?: string | Date;
  pauseReason?: string;
  pause_reason?: string;
  allowPreorderWhenPaused?: boolean;
  allow_preorder_when_paused?: boolean;
  logoUrl?: string;
  restaurant_logo?: string;
  bannerUrl?: string;
  restaurant_cover?: string;
  themeColor?: string;
  primaryColor?: string;
  restaurant_primary_theme?: string;
  secondaryColor?: string;
  restaurant_secondary_theme?: string;
  accentColor?: string;
  otherTheme?: string;
  restaurant_other_theme?: string;
  lineId?: string;
  line_id?: string;
  lineOaUrl?: string;
  line_oa_url?: string;
  facebookUrl?: string;
  facebook_url?: string;
  instagramUrl?: string;
  instagram_url?: string;
  tiktokUrl?: string;
  tiktok_url?: string;
  youtubeUrl?: string;
  youtube_url?: string;
  xUrl?: string;
  x_url?: string;
  websiteUrl?: string;
  website_url?: string;
  googleMapsUrl?: string;
  google_maps_url?: string;
  linemanUrl?: string;
  lineman_url?: string;
  grabUrl?: string;
  grab_url?: string;
  shopeefoodUrl?: string;
  shopeefood_url?: string;
  robinhoodUrl?: string;
  robinhood_url?: string;
  promptPayId?: string;
  promptPayNumber?: string;
  promptpay_number?: string;
  promptPayName?: string;
  promptpay_name?: string;
  promptPayQrImage?: string | null;
  promptpay_qr?: string | null;
  qrpayment_url?: string | null;
  bankName?: string;
  bank_name?: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  bankAccountName?: string;
  bank_account_name?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * ข้อมูลบัญชีธนาคารและพร้อมเพย์ของร้านค้า (Bank Account DTO)
 */
export interface BankAccountDTO {
  bank: string;
  bankName?: string;
  bank_name?: string;
  accountNumber: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  accountName: string;
  bankAccountName?: string;
  bank_account_name?: string;
  promptPayId?: string;
  promptPayNumber?: string;
  promptpay_number?: string;
  promptPayName?: string;
  promptpay_name?: string;
  promptPayQrImage?: string | null;
  promptpay_qr?: string | null;
  qrpayment_url?: string | null;
  planName?: string;
  planDescription?: string;
}

/**
 * ตัวเลือกสำหรับการค้นหารายการอาหาร
 */
export interface RestaurantQueryOptions {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  restaurantId?: string | number;
}

/**
 * ข้อมูลโปรไฟล์ผู้ดูแลร้านค้า (User Profile DTO)
 */
export interface UserProfileDTO {
  res_user_id?: string;
  id?: string;
  username?: string;
  fname: string;
  lname: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  titlePrefix?: string;
  roleId?: number;
  restaurantId?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Interface สำหรับ Restaurant Repository
 */
export interface IRestaurantRepository {
  // การจัดการออเดอร์
  /** ดึงรายการออเดอร์ของร้านค้า */
  getOrders(restaurantId?: string | number, status?: string, date?: string): Promise<OrderDTO[]>;
  /** ดึงข้อมูลออเดอร์ตาม ID */
  getOrderById(id: string): Promise<OrderDTO | null>;
  /** สร้างออเดอร์ใหม่ */
  createOrder(order: OrderDTO): Promise<OrderDTO>;
  /** เลื่อนสถานะออเดอร์ไปยังขั้นตอนถัดไป (เช่น pending -> cooking -> ready -> completed) */
  advanceOrderStatus(id: string, nextStatus?: OrderStatus): Promise<OrderDTO | null>;
  /** ยกเลิกออเดอร์หรือยกเลิกบางรายการในออเดอร์ */
  cancelOrder(orderId: string, reason: string, itemIds?: string[], cancelEntireOrder?: boolean): Promise<OrderDTO | null>;
  /** สลับสถานะสินค้าหมดในออเดอร์ */
  toggleOrderItemOutOfStock(orderId: string, itemId: string): Promise<OrderDTO | null>;
  /** เปลี่ยนสินค้าที่หมดเป็นเมนูใหม่ */
  replaceOrderItem(orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<OrderDTO | null>;
  /** อัปเดตรายการสินค้าในออเดอร์ */
  updateOrderItems(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null>;
  /** ลบรายการสินค้าออกจากออเดอร์ */
  removeOrderItem(orderId: string, itemId: string): Promise<OrderDTO | null>;
  /** ดึงข้อมูลสลิปโอนเงินของออเดอร์ */
  getOrderSlip(orderId: string): Promise<{ orderId: string; hasSlip: boolean; slipUrl?: string; total: number; tableNumber: number | string } | null>;

  // การวิเคราะห์และรายงานสรุปยอดขาย
  /** ดึงสถิติยอดขายภาพรวม */
  getSalesStats(restaurantId?: string | number): Promise<RestaurantStatsDTO>;
  /** ดึงยอดขายรายวัน/ช่วงเวลา */
  getDailySales(restaurantId?: string | number, timeframe?: string, day?: string, month?: string, year?: string): Promise<DailySalesDTO[]>;
  /** ดึงรายการออเดอร์ล่าสุด */
  getRecentOrders(restaurantId?: string | number, limit?: number): Promise<OrderDTO[]>;
  /** ดึงรายงานสรุปยอดขายแบบเต็ม */
  getSalesSummary?(restaurantId?: string | number, params?: SummaryQueryParams): Promise<RestaurantSummaryResponseDTO>;

  // เมนูและหมวดหมู่อาหาร
  /** ดึงรายการหมวดหมู่ทั้งหมดของร้าน */
  getCategories(restaurantId?: string | number): Promise<CategoryDTO[]>;
  /** สร้างหมวดหมู่อาหารใหม่ */
  createCategory?(data: Partial<CategoryDTO> | { category_name?: string; name?: string; label?: string; remark?: string }, restaurantId?: string | number): Promise<CategoryDTO>;
  /** สร้างหมวดหมู่อาหารพร้อมกันหลายรายการ */
  createCategories(labels: (string | Partial<CategoryDTO>)[], restaurantId?: string | number): Promise<CategoryDTO[]>;
  /** แก้ไขข้อมูลหมวดหมู่อาหาร */
  updateCategory(id: string | number, data: Partial<CategoryDTO> | string | { category_name?: string; name?: string; label?: string; remark?: string }): Promise<CategoryDTO | null>;
  /** ลบหมวดหมู่อาหาร */
  deleteCategory(id: string | number): Promise<boolean>;
  /** ดึงรายการเมนูอาหารแบบแบ่งหน้า */
  getMenuItems(options: RestaurantQueryOptions): Promise<{ data: MenuItemDTO[]; total: number; page: number; limit: number; totalPages: number }>;
  /** ดึงข้อมูลเมนูตาม ID */
  getMenuItemById(id: string): Promise<MenuItemDTO | null>;
  /** สร้างรายการเมนูอาหารใหม่ */
  createMenuItem(item: MenuItemDTO): Promise<MenuItemDTO>;
  /** แก้ไขข้อมูลเมนูอาหาร */
  updateMenuItem(id: string, item: Partial<MenuItemDTO>): Promise<MenuItemDTO | null>;
  /** สลับสถานะพร้อมขายของเมนูอาหาร */
  toggleMenuItemAvailability(id: string): Promise<MenuItemDTO | null>;
  /** อัปเดตสถานะพร้อมขายของเมนูพร้อมกันหลายรายการ */
  updateMenuBatchAvailability?(items: Array<{ id: string | number; isAvailable: boolean }>, restaurantId?: string | number): Promise<boolean>;
  /** สลับสถานะเมนูยอดนิยม */
  toggleMenuItemPopular(id: string): Promise<MenuItemDTO | null>;
  /** ลบรายการเมนูอาหาร */
  deleteMenuItem(id: string): Promise<boolean>;

  // การจัดการแป้งเครป (Crepe Crusts)
  /** ดึงรายการแป้งเครปทั้งหมด */
  getCrusts(restaurantId?: string | number): Promise<CrustDTO[]>;
  /** ดึงข้อมูลแป้งเครปตาม ID */
  getCrustById(crustId: number | string): Promise<CrustDTO | null>;
  /** สร้างรายการแป้งเครปใหม่ */
  createCrust(data: Partial<CrustDTO>, restaurantId?: string | number): Promise<CrustDTO>;
  /** แก้ไขข้อมูลแป้งเครป */
  updateCrust(crustId: number | string, data: Partial<CrustDTO>): Promise<CrustDTO | null>;
  /** ลบรายการแป้งเครป */
  deleteCrust(crustId: number | string): Promise<boolean>;
  /** สลับสถานะพร้อมขายของแป้งเครป */
  toggleCrustAvailability(crustId: number | string, isAvailable?: boolean): Promise<CrustDTO | null>;

  // การจัดการเมนูตัวอย่าง (Sample Crepe Menus)
  /** ดึงรายการเมนูตัวอย่างทั้งหมด */
  getSampleMenus(restaurantId?: string | number): Promise<SampleMenuDTO[]>;
  /** ดึงข้อมูลเมนูตัวอย่างตาม ID */
  getSampleMenuById(sampleId: number | string): Promise<SampleMenuDTO | null>;
  /** สร้างรายการเมนูตัวอย่างใหม่ */
  createSampleMenu(data: Partial<SampleMenuDTO>, restaurantId?: string | number): Promise<SampleMenuDTO>;
  /** แก้ไขข้อมูลเมนูตัวอย่าง */
  updateSampleMenu(sampleId: number | string, data: Partial<SampleMenuDTO>): Promise<SampleMenuDTO | null>;
  /** ลบรายการเมนูตัวอย่าง */
  deleteSampleMenu(sampleId: number | string): Promise<boolean>;
  /** สลับสถานะเปิดใช้งานเมนูตัวอย่าง */
  toggleSampleMenu(sampleId: number | string, isActive?: boolean): Promise<SampleMenuDTO | null>;

  // ข้อมูลร้านและการตั้งค่า
  /** ดึงข้อมูลโปรไฟล์ร้านค้า */
  getRestaurantInfo(restaurantId?: string | number): Promise<RestaurantProfileDTO>;
  /** แก้ไขข้อมูลโปรไฟล์ร้านค้า */
  updateRestaurantInfo(data: Partial<RestaurantProfileDTO>, restaurantId?: string | number): Promise<RestaurantProfileDTO>;
  /** ดึงข้อมูลบัญชีธนาคาร/พร้อมเพย์ของร้าน */
  getBankAccount(restaurantId?: string | number): Promise<BankAccountDTO>;
  /** แก้ไขข้อมูลบัญชีธนาคาร/พร้อมเพย์ของร้าน */
  updateBankAccount(data: Partial<BankAccountDTO>, restaurantId?: string | number): Promise<BankAccountDTO>;
  /** เปลี่ยนรหัสผ่านหรืออีเมลร้านค้า */
  updateSecurity(email?: string, newPassword?: string, restaurantId?: string | number): Promise<boolean>;

  // การจัดการสต็อกวัตถุดิบ (Inventory & Stock)
  /** ดึงรายการสต็อกวัตถุดิบ */
  getInventoryItems(restaurantId?: string | number): Promise<InventoryItemDTO[]>;
  /** เพิ่มรายการสต็อกวัตถุดิบใหม่ */
  createInventoryItem(restaurantId: string | number, data: Partial<InventoryItemDTO>): Promise<InventoryItemDTO>;
  /** แก้ไขจำนวนหรือข้อมูลสต็อกวัตถุดิบ */
  updateInventoryItem(id: number, data: Partial<InventoryItemDTO>): Promise<InventoryItemDTO | null>;
  /** ลบรายการสต็อกวัตถุดิบ */
  deleteInventoryItem(id: number): Promise<boolean>;

  // การพักร้านชั่วคราว (Store Pause)
  /** กำหนดสถานะพักร้านชั่วคราว พร้อมระบุระยะเวลา เหตุผล และการรับสั่งล่วงหน้า */
  setStorePauseStatus(restaurantId: string | number, isPaused: boolean, durationMinutes?: number, reason?: string, allowPreorder?: boolean): Promise<any>;

  // โปรไฟล์ผู้ดูแลร้าน (restaurant_users)
  /** ดึงข้อมูลโปรไฟล์ผู้ดูแลร้าน */
  getUserProfile(userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null>;
  /** แก้ไขข้อมูลโปรไฟล์ผู้ดูแลร้าน */
  updateUserProfile(data: Partial<UserProfileDTO>, userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null>;
  /** เปลี่ยนรหัสผ่านของผู้ดูแลร้าน */
  updateUserPassword(currentPassword: string, newPassword: string, userId?: string | number, restaurantId?: string | number): Promise<{ success: boolean; message?: string }>;
}
