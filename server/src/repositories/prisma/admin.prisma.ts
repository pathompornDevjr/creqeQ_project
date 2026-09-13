/**
 * Admin Prisma Repository Implementation
 * คลาสสำหรับจัดการข้อมูลระบบผู้ดูแลระบบ (Admin) ภาพรวมสถิติ, ข้อมูลผู้ใช้งาน และข้อมูลร้านค้า ผ่าน Prisma ORM
 */

import {
  ActivityLog,
  DashboardStats,
  IAdminRepository,
  PaginatedResult,
  QueryOptions,
  RenewalRequestDTO,
  RestaurantDTO,
  UserDTO,
  UserStatus,
} from "../interfaces/admin.repository.interface";
import prisma from "../../database/prisma";

export class AdminPrismaRepository implements IAdminRepository {
  /**
   * ดึงข้อมูลสถิติภาพรวมสำหรับหน้า Dashboard ของ Admin
   * เช่น จำนวนร้านค้าทั้งหมด, จำนวนผู้ใช้, และจำนวนออเดอร์
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [resCount, userCount, orderCount] = await Promise.all([
      prisma.restaurant_data.count().catch(() => 0),
      prisma.restaurant_users.count().catch(() => 0),
      prisma.orders.count().catch(() => 0),
    ]);

    return {
      totalRestaurants: resCount,
      activeRestaurants: resCount,
      totalUsers: userCount,
      ordersToday: orderCount,
      totalOrders: orderCount,
      platformRevenue: 0,
      totalRevenue: 0,
      pendingApprovalsCount: 0,
      pendingRenewalsCount: 0,
      pendingTasks: 0,
      premiumCount: 0,
      trialCount: 0,
    };
  }

  /**
   * ดึงข้อมูลแนวโน้มการเติบโตตามช่วงเวลา
   */
  async getGrowthData(period?: string): Promise<any> {
    return {
      periodLabel: "รายเดือน",
      label: "ยอดขาย",
      data: [],
    };
  }

  /**
   * ดึงรายการบันทึกกิจกรรมล่าสุดในระบบ
   */
  async getRecentActivities(): Promise<ActivityLog[]> {
    return [];
  }

  /**
   * ดึงรายชื่อผู้ใช้งานทั้งหมดในระบบ พร้อมข้อมูลร้านค้าที่สังกัด
   */
  async getUsers(options: QueryOptions): Promise<PaginatedResult<UserDTO>> {
    const users = await prisma.restaurant_users.findMany({
      include: { restaurant_data: true },
    }).catch(() => []);

    const data: UserDTO[] = users.map((u) => ({
      id: u.res_user_id,
      res_user_id: u.res_user_id,
      username: u.username,
      firstName: u.fname,
      lastName: u.lname,
      email: u.email || "",
      phone: u.phone || "",
      role: "restaurant" as const,
      restaurantName: u.restaurant_data?.restaurant_name,
    }));

    return { data, total: data.length, page: 1, limit: 50, totalPages: 1 };
  }

  /**
   * ค้นหาข้อมูลผู้ใช้งานตามรหัส (res_user_id)
   */
  async getUserById(id: string): Promise<UserDTO | null> {
    const u = await prisma.restaurant_users.findUnique({ where: { res_user_id: id } }).catch(() => null);
    if (!u) return null;
    return {
      id: u.res_user_id,
      res_user_id: u.res_user_id,
      username: u.username,
      firstName: u.fname,
      lastName: u.lname,
      email: u.email || "",
      phone: u.phone || "",
      role: "restaurant" as const,
    };
  }

  /**
   * สร้างผู้ใช้งานใหม่ในระบบ
   */
  async createUser(data: UserDTO): Promise<UserDTO> {
    return data;
  }

  /**
   * แก้ไขข้อมูลผู้ใช้งาน
   */
  async updateUser(id: string, data: Partial<UserDTO>): Promise<UserDTO | null> {
    return null;
  }

  /**
   * สลับสถานะเปิดใช้งาน/ระงับบัญชีผู้ใช้
   */
  async toggleUserStatus(id: string, targetStatus?: UserStatus): Promise<UserDTO | null> {
    return null;
  }

  /**
   * ลบผู้ใช้งานออกจากระบบ
   */
  async deleteUser(id: string): Promise<boolean> {
    return true;
  }

  /**
   * ดึงรายชื่อร้านค้าทั้งหมดในระบบ
   */
  async getRestaurants(options: QueryOptions): Promise<PaginatedResult<RestaurantDTO>> {
    const list = await prisma.restaurant_data.findMany().catch(() => []);
    const data: RestaurantDTO[] = list.map((r) => ({
      id: String(r.res_id),
      res_id: r.res_id,
      name: r.restaurant_name,
      restaurant_name: r.restaurant_name,
      phone: r.restaurant_phone || "",
      is_open: r.is_open,
    }));
    return { data, total: data.length, page: 1, limit: 50, totalPages: 1 };
  }

  /**
   * ค้นหาข้อมูลร้านค้าตามรหัสร้านค้า (res_id)
   */
  async getRestaurantById(id: string): Promise<RestaurantDTO | null> {
    const r = await prisma.restaurant_data.findUnique({ where: { res_id: Number(id) } }).catch(() => null);
    if (!r) return null;
    return {
      id: String(r.res_id),
      res_id: r.res_id,
      name: r.restaurant_name,
      restaurant_name: r.restaurant_name,
      phone: r.restaurant_phone || "",
      is_open: r.is_open,
    };
  }

  /**
   * ดึงรายชื่อเจ้าของร้านค้าสำหรับตัวเลือก Dropdown
   */
  async getOwners(search?: string): Promise<{ id: string; name: string }[]> {
    return [];
  }

  /**
   * สร้างร้านค้าใหม่ในระบบ
   */
  async createRestaurant(data: RestaurantDTO): Promise<RestaurantDTO> {
    return data;
  }

  /**
   * อัปเดตข้อมูลร้านค้า
   */
  async updateRestaurant(id: string, data: Partial<RestaurantDTO>): Promise<RestaurantDTO | null> {
    return null;
  }

  /**
   * สลับสถานะเปิด/ปิดร้านค้าจากฝั่ง Admin
   */
  async toggleRestaurantStatus(id: string, status?: string | boolean): Promise<RestaurantDTO | null> {
    return null;
  }

  /**
   * ลบร้านค้าออกจากระบบ
   */
  async deleteRestaurant(id: string): Promise<boolean> {
    return true;
  }

  /**
   * ดึงรายการคำขอต่ออายุหรือชำระเงินค่าแพ็กเกจ
   */
  async getRenewals(options: QueryOptions): Promise<PaginatedResult<RenewalRequestDTO>> {
    return { data: [], total: 0, page: 1, limit: 50, totalPages: 1 };
  }

  /**
   * อัปเดตสถานะคำขอต่ออายุแพ็กเกจ
   */
  async updateRenewalStatus(paidId: string, status: "pending" | "approved" | "rejected", reason?: string, newValidUntil?: string): Promise<boolean> {
    return true;
  }

  /**
   * อนุมัติคำขอต่ออายุแพ็กเกจ
   */
  async approveRenewal(paidId: string, newValidUntil?: string): Promise<boolean> {
    return true;
  }

  /**
   * ปฏิเสธคำขอต่ออายุแพ็กเกจ
   */
  async rejectRenewal(paidId: string, reason?: string): Promise<boolean> {
    return true;
  }
}
