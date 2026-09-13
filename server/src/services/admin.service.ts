/**
 * Admin Service Layer
 * ให้บริการตรรกะทางธุรกิจสำหรับระบบจัดการของผู้ดูแลระบบ (Admin)
 * ครอบคลุม: สถิติแดชบอร์ด, การจัดการผู้ใช้งาน (Users), การจัดการร้านค้า (Restaurants) และการอนุมัติการต่ออายุแพ็กเกจ (Renewals)
 */

import {
  AdminRepositoryFactory,
  DashboardStats,
  GrowthDataPoint,
  ActivityLog,
  PaginatedResult,
  QueryOptions,
  RenewalRequestDTO,
  RestaurantDTO,
  UserDTO,
  UserStatus,
} from "../repositories";

export class AdminService {
  private repository = AdminRepositoryFactory.getRepository();

  // ==========================================
  // แดชบอร์ดและสถิติภาพรวม (Dashboard)
  // ==========================================

  /** ดึงข้อมูลสถิติภาพรวมสำหรับหน้า Dashboard ของ Admin */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.repository.getDashboardStats();
  }

  /** ดึงข้อมูลแนวโน้มการเติบโตตามช่วงเวลา */
  async getGrowthData(period?: string): Promise<any> {
    return this.repository.getGrowthData(period);
  }

  /** ดึงรายการบันทึกกิจกรรมล่าสุดในระบบ */
  async getRecentActivities(): Promise<ActivityLog[]> {
    return this.repository.getRecentActivities();
  }

  // ==========================================
  // การจัดการผู้ใช้งาน (Users)
  // ==========================================

  /** ดึงรายชื่อผู้ใช้งานทั้งหมดแบบแบ่งหน้าและค้นหา */
  async getUsers(options: QueryOptions): Promise<PaginatedResult<UserDTO>> {
    return this.repository.getUsers(options);
  }

  /** ค้นหาข้อมูลผู้ใช้งานตาม User ID */
  async getUserById(id: string): Promise<UserDTO | null> {
    if (!id) throw new Error("User ID is required");
    return this.repository.getUserById(id);
  }

  /** สร้างบัญชีผู้ใช้งานใหม่ พร้อมตรวจสอบอีเมลและเบอร์โทรศัพท์ */
  async createUser(data: UserDTO | any): Promise<UserDTO> {
    const firstName = data.firstName || data.name?.split(" ")[0] || "ผู้ใช้งาน";
    const lastName = data.lastName || data.name?.split(" ").slice(1).join(" ") || "";
    if (!data.email || !data.phone) {
      throw new Error("email and phone are required");
    }
    return this.repository.createUser({
      ...data,
      firstName,
      lastName,
    });
  }

  /** แก้ไขข้อมูลผู้ใช้งาน */
  async updateUser(id: string, data: Partial<UserDTO>): Promise<UserDTO | null> {
    if (!id) throw new Error("User ID is required");
    let updated = await this.repository.updateUser(id, data);
    if (!updated) {
      updated = await this.repository.createUser({ id, ...data } as any);
    }
    return updated;
  }

  /** สลับสถานะเปิดใช้งานหรือระงับบัญชีผู้ใช้ */
  async toggleUserStatus(id: string, targetStatus?: UserStatus): Promise<UserDTO | null> {
    if (!id) throw new Error("User ID is required");
    const updated = await this.repository.toggleUserStatus(id, targetStatus);
    if (!updated) throw new Error("User not found");
    return updated;
  }

  /** ลบผู้ใช้งานออกจากระบบ */
  async deleteUser(id: string): Promise<boolean> {
    if (!id) throw new Error("User ID is required");
    const success = await this.repository.deleteUser(id);
    if (!success) throw new Error("User not found or cannot be deleted");
    return success;
  }

  // ==========================================
  // การจัดการร้านค้า (Restaurants)
  // ==========================================

  /** ดึงรายชื่อร้านค้าทั้งหมดแบบแบ่งหน้า */
  async getRestaurants(options: QueryOptions): Promise<PaginatedResult<RestaurantDTO>> {
    return this.repository.getRestaurants(options);
  }

  /** ค้นหาข้อมูลร้านค้าตาม Restaurant ID */
  async getRestaurantById(id: string): Promise<RestaurantDTO | null> {
    if (!id) throw new Error("Restaurant ID is required");
    return this.repository.getRestaurantById(id);
  }

  /** ดึงรายชื่อเจ้าของร้านค้าสำหรับ Dropdown */
  async getOwners(search?: string): Promise<{ id: string; name: string }[]> {
    return this.repository.getOwners(search);
  }

  /** สร้างร้านค้าใหม่ในระบบ */
  async createRestaurant(data: RestaurantDTO): Promise<RestaurantDTO> {
    const name = data.restaurant_name || data.name;
    if (!name) {
      throw new Error("Restaurant name is required");
    }
    return this.repository.createRestaurant(data);
  }

  /** อัปเดตข้อมูลร้านค้า */
  async updateRestaurant(id: string, data: Partial<RestaurantDTO>): Promise<RestaurantDTO | null> {
    if (!id) throw new Error("Restaurant ID is required");
    let updated = await this.repository.updateRestaurant(id, data);
    if (!updated) {
      updated = await this.repository.createRestaurant({ id, ...data } as any);
    }
    return updated;
  }

  /** สลับสถานะเปิด/ปิดร้านค้า */
  async toggleRestaurantStatus(id: string, status?: string | boolean): Promise<RestaurantDTO | null> {
    if (!id) throw new Error("Restaurant ID is required");
    const updated = await this.repository.toggleRestaurantStatus(id, status);
    if (!updated) throw new Error("Restaurant not found");
    return updated;
  }

  /** ลบร้านค้าออกจากระบบ */
  async deleteRestaurant(id: string): Promise<boolean> {
    if (!id) throw new Error("Restaurant ID is required");
    const success = await this.repository.deleteRestaurant(id);
    if (!success) throw new Error("Restaurant not found or cannot be deleted");
    return success;
  }

  // ==========================================
  // การจัดการคำขอต่ออายุและการชำระเงิน (Renewals / Payments)
  // ==========================================

  /** ดึงรายการคำขอต่ออายุแพ็กเกจ */
  async getRenewals(options: QueryOptions): Promise<PaginatedResult<RenewalRequestDTO>> {
    return this.repository.getRenewals(options);
  }

  /** ปรับปรุงสถานะคำขอต่ออายุแพ็กเกจ (Pending / Approved / Rejected) */
  async updateRenewalStatus(
    paidId: string,
    status: "pending" | "approved" | "rejected",
    reason?: string,
    newValidUntil?: string
  ): Promise<boolean> {
    if (!paidId) throw new Error("Payment ID is required");
    return this.repository.updateRenewalStatus(paidId, status, reason, newValidUntil);
  }

  /** อนุมัติคำขอต่ออายุแพ็กเกจ */
  async approveRenewal(paidId: string, newValidUntil?: string): Promise<boolean> {
    if (!paidId) throw new Error("Payment ID is required");
    return this.repository.approveRenewal(paidId, newValidUntil);
  }

  /** ปฏิเสธคำขอต่ออายุแพ็กเกจ พร้อมระบุเหตุผล */
  async rejectRenewal(paidId: string, reason?: string): Promise<boolean> {
    if (!paidId) throw new Error("Payment ID is required");
    return this.repository.rejectRenewal(paidId, reason);
  }
}
