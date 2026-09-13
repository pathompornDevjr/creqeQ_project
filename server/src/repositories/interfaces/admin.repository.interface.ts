/**
 * สัญญาระบบจัดการผู้ดูแลระบบ (Admin Repository Interfaces & DTOs)
 * กำหนดประเภทข้อมูลและเมธอดสำหรับการบริหารจัดการระบบหลังบ้าน ภาพรวมสถิติ, ผู้ใช้งาน, ร้านค้า และการต่ออายุแพ็กเกจ
 */

// สิทธิ์การใช้งานของผู้ใช้งานในระบบ
export type UserRole = "customer" | "restaurant" | "staff" | "admin";
// สถานะบัญชีผู้ใช้งาน
export type UserStatus = "active" | "suspended";

/**
 * โครงสร้างข้อมูลผู้ใช้งานระบบ (User DTO)
 */
export interface UserDTO {
  id?: string;
  res_user_id?: string;
  user_id?: string;
  username?: string;
  password?: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  fname?: string;
  lname?: string;
  email: string;
  phone: string;
  facebook?: string;
  lineId?: string;
  roleId?: number;
  restaurantId?: number;
  restaurantName?: string;
  plan?: string;
  role: UserRole;
  status?: UserStatus;
  joinedAt?: string;
}

// ประเภทแพ็กเกจของร้านค้า
export type PlanType = "free" | "starter" | "pro";
// สถานะร้านค้า
export type StoreStatus = "active" | "suspended";
// สถานะการชำระเงินค่าแพ็กเกจ
export type PaymentStatus = "paid" | "pending" | "overdue";

/**
 * โครงสร้างข้อมูลร้านค้าสำหรับ Admin (Restaurant DTO)
 */
export interface RestaurantDTO {
  id?: string;
  res_id?: number;
  name: string;
  restaurant_name?: string;
  ownerId?: string;
  ownerName?: string;
  phone?: string;
  restaurant_phone?: string;
  email?: string;
  plan?: PlanType;
  status?: StoreStatus;
  is_open?: boolean;
  paymentStatus?: PaymentStatus;
  maxTables?: number;
  tableCount?: number;
  ordersToday?: number;
  validFrom?: string;
  validUntil?: string;
  description?: string;
  restaurant_desc?: string;
  addressDetail?: string;
  restaurant_address?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  restaurant_lat?: string;
  restaurant_long?: string;
  restaurant_logo?: string;
  restaurant_cover?: string;
  restaurant_primary_theme?: string;
  restaurant_secondary_theme?: string;
  restaurant_other_theme?: string;
  restaurant_open_time?: string;
  restaurant_close_time?: string;
  restaurant_day?: string;
  slipUrl?: string;
  paymentSlipUrl?: string;
}

/**
 * โครงสร้างข้อมูลสถิติภาพรวมแดชบอร์ด (Dashboard Stats)
 */
export interface DashboardStats {
  totalRestaurants: number | { value: number; trend: number }; // จำนวนร้านค้าทั้งหมด
  activeRestaurants: number;                                  // ร้านค้าที่เปิดให้บริการอยู่
  newStoresCount?: number;                                    // ร้านค้าใหม่ที่เพิ่มเข้ามา
  totalUsers: number | { value: number; trend: number };       // จำนวนผู้ใช้งานทั้งหมด
  ordersToday: number | { value: number; trend: number };      // ออเดอร์วันนี้
  totalOrders: number;                                        // ออเดอร์ทั้งหมดตั้งแต่เปิดระบบ
  orderGrowth?: number;                                       // อัตราการเติบโตของออเดอร์
  platformRevenue: number | { value: number; trend: number };  // รายได้รวมของแพลตฟอร์ม
  totalRevenue: number;                                       // รายได้รวม
  revenueGrowth?: number;                                     // อัตราการเติบโตของรายได้
  pendingApprovalsCount: number;                              // คำขอรอการอนุมัติ
  pendingRenewalsCount: number;                               // คำขอต่ออายุรอตรวจสอบ
  pendingTasks: number;                                       // งานคงค้าง
  premiumCount: number;                                       // จำนวนร้านแพ็กเกจ Premium
  trialCount: number;                                         // จำนวนร้านแพ็กเกจทดลองใช้ (Trial)
}

/**
 * จุดข้อมูลกราฟอัตราการเติบโต (Growth Data Point)
 */
export interface GrowthDataPoint {
  month?: string;
  name?: string;
  orders?: number;
  revenue?: number;
  restaurants?: number;
  users?: number;
}

/**
 * DTO ข้อมูลการเติบโตสำหรับแสดงผลกราฟ
 */
export interface GrowthResponseDTO {
  periodLabel: string;
  label: string;
  data: { name: string; orders: number; revenue: number }[];
}

/**
 * ข้อมูลบันทึกกิจกรรมในระบบ (Activity Log)
 */
export interface ActivityLog {
  id: number | string;
  type: string;
  title?: string;
  detail?: string;
  text?: string;
  time: string;
  tag?: string;
  link?: string;
}

/**
 * ตัวเลือกสำหรับการค้นหาและแบ่งหน้า (Pagination & Filter Options)
 */
export interface QueryOptions {
  search?: string;
  role?: string;
  status?: string;
  plan?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

/**
 * โครงสร้างผลลัพธ์แบบแบ่งหน้า (Paginated Result)
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * โครงสร้างข้อมูลคำขอต่ออายุหรือชำระค่าแพ็กเกจร้านค้า (Renewal Request DTO)
 */
export interface RenewalRequestDTO {
  id: string;
  paid_id: string;
  storeId: string;
  storeName: string;
  ownerId: string;
  ownerName: string;
  email: string;
  phone: string;
  requestedPlan: "trial" | "premium" | string;
  plan: string;
  amount: number;
  durationMonths: number;
  submittedAt: string;
  currentValidUntil: string;
  newValidUntil: string;
  status: "pending" | "approved" | "rejected";
  paymentSlipUrl: string;
  slip_url: string;
  is_active: boolean;
  remark?: string;
  rejectReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface สำหรับ Admin Repository
 */
export interface IAdminRepository {
  // แดชบอร์ดและสถิติภาพรวม
  getDashboardStats(): Promise<DashboardStats>;
  getGrowthData(period?: string): Promise<any>;
  getRecentActivities(): Promise<ActivityLog[]>;

  // การจัดการผู้ใช้งาน (Users)
  getUsers(options: QueryOptions): Promise<PaginatedResult<UserDTO>>;
  getUserById(id: string): Promise<UserDTO | null>;
  createUser(data: UserDTO): Promise<UserDTO>;
  updateUser(id: string, data: Partial<UserDTO>): Promise<UserDTO | null>;
  toggleUserStatus(id: string, targetStatus?: UserStatus): Promise<UserDTO | null>;
  deleteUser(id: string): Promise<boolean>;

  // การจัดการร้านค้า (Restaurants)
  getRestaurants(options: QueryOptions): Promise<PaginatedResult<RestaurantDTO>>;
  getRestaurantById(id: string): Promise<RestaurantDTO | null>;
  getOwners(search?: string): Promise<{ id: string; name: string }[]>;
  createRestaurant(data: RestaurantDTO): Promise<RestaurantDTO>;
  updateRestaurant(id: string, data: Partial<RestaurantDTO>): Promise<RestaurantDTO | null>;
  toggleRestaurantStatus(id: string, status?: string | boolean): Promise<RestaurantDTO | null>;
  deleteRestaurant(id: string): Promise<boolean>;

  // การจัดการการต่ออายุและการชำระเงินค่าแพ็กเกจ (Renewals / Payments)
  getRenewals(options: QueryOptions): Promise<PaginatedResult<RenewalRequestDTO>>;
  updateRenewalStatus(paidId: string, status: "pending" | "approved" | "rejected", reason?: string, newValidUntil?: string): Promise<boolean>;
  approveRenewal(paidId: string, newValidUntil?: string): Promise<boolean>;
  rejectRenewal(paidId: string, reason?: string): Promise<boolean>;
}
