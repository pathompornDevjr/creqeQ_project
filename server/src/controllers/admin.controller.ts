/**
 * Admin Controllers
 * รวบรวม Controllers สำหรับระบบจัดการผู้ดูแลระบบ (Admin Panel):
 * 1. AdminDashboardController: ข้อมูลสถิติภาพรวม, แนวโน้มการเติบโต, ประวัติกิจกรรม
 * 2. AdminUserController: จัดการข้อมูลผู้ใช้งาน (ค้นหา, สร้าง, แก้ไข, ระงับบัญชี, ลบ)
 * 3. AdminRestaurantController: จัดการข้อมูลร้านค้า (ค้นหา, สร้าง, แก้ไข, สลับสถานะเปิด/ปิด, ลบ)
 * 4. AdminRenewalController: ตรวจสอบและอนุมัติ/ปฏิเสธคำขอต่ออายุแพ็กเกจร้านค้า
 */

import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

/**
 * Controller สำหรับหน้า Dashboard ภาพรวมสถิติของผู้ดูแลระบบ
 */
export class AdminDashboardController {
  /** ดึงสถิติตัวเลขภาพรวม (Total Stores, Users, Orders, Revenue) */
  static async getStats(ctx: any) {
    try {
      const data = await adminService.getDashboardStats();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลกราฟอัตราการเติบโต */
  static async getGrowth(ctx: any) {
    try {
      const period = ctx.query?.period || "month";
      const data = await adminService.getGrowthData(period);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงรายการบันทึกกิจกรรมล่าสุดในระบบ */
  static async getActivities(ctx: any) {
    try {
      const data = await adminService.getRecentActivities();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับจัดการข้อมูลผู้ใช้งานระบบ (User Management)
 */
export class AdminUserController {
  /** ดึงรายชื่อผู้ใช้แบบแบ่งหน้า พร้อมตัวกรองค้นหา */
  static async getUsers(ctx: any) {
    try {
      const { search, role, status, page, limit } = ctx.query || {};
      const result = await adminService.getUsers({
        search,
        role,
        status,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลผู้ใช้รายบุคคลตาม User ID */
  static async getUser(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await adminService.getUserById(id);
      if (!data) return { success: false, message: "User not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** สร้างผู้ใช้งานใหม่ */
  static async createUser(ctx: any) {
    try {
      const body = ctx.body;
      const data = await adminService.createUser(body);
      return { success: true, data, message: "User created successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** แก้ไขข้อมูลผู้ใช้งาน */
  static async updateUser(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body;
      const data = await adminService.updateUser(id, body);
      return { success: true, data, message: "User updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** สลับสถานะผู้ใช้งาน (Active / Suspended) */
  static async toggleStatus(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await adminService.toggleUserStatus(id, ctx.body?.status);
      return { success: true, data, message: `User status changed to ${data?.status}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ลบผู้ใช้งานออกจากระบบ */
  static async deleteUser(ctx: any) {
    try {
      const id = ctx.params.id;
      await adminService.deleteUser(id);
      return { success: true, message: "User deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับจัดการข้อมูลร้านค้า (Restaurant Management)
 */
export class AdminRestaurantController {
  /** ดึงรายชื่อร้านค้าทั้งหมดแบบแบ่งหน้า */
  static async getRestaurants(ctx: any) {
    try {
      const { search, plan, status, paymentStatus, page, limit } = ctx.query || {};
      const result = await adminService.getRestaurants({
        search,
        plan,
        status,
        paymentStatus,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงข้อมูลร้านค้าตาม Restaurant ID */
  static async getRestaurant(ctx: any) {
    try {
      const id = ctx.params.id;
      const data = await adminService.getRestaurantById(id);
      if (!data) return { success: false, message: "Restaurant not found" };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ดึงรายชื่อเจ้าของร้าน */
  static async getOwners(ctx: any) {
    try {
      const { search } = ctx.query || {};
      const data = await adminService.getOwners(search);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** สร้างร้านค้าใหม่ */
  static async createRestaurant(ctx: any) {
    try {
      const body = ctx.body;
      const data = await adminService.createRestaurant(body);
      return { success: true, data, message: "Restaurant created successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** แก้ไขข้อมูลร้านค้า */
  static async updateRestaurant(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body;
      const data = await adminService.updateRestaurant(id, body);
      return { success: true, data, message: "Restaurant updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** สลับสถานะเปิด/ปิดร้านค้า */
  static async toggleStatus(ctx: any) {
    try {
      const id = ctx.params.id;
      const targetStatus = ctx.body?.status !== undefined ? ctx.body.status : ctx.query?.status;
      const data = await adminService.toggleRestaurantStatus(id, targetStatus);
      return { success: true, data, message: `Restaurant status changed to ${data?.status}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ลบร้านค้าออกจากระบบ */
  static async deleteRestaurant(ctx: any) {
    try {
      const id = ctx.params.id;
      await adminService.deleteRestaurant(id);
      return { success: true, message: "Restaurant deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Controller สำหรับจัดการคำขอต่ออายุและชำระค่าแพ็กเกจ (Renewals / Payments)
 */
export class AdminRenewalController {
  /** ดึงรายการคำขอต่ออายุ */
  static async getRenewals(ctx: any) {
    try {
      const query = ctx.query || {};
      const data = await adminService.getRenewals(query);
      return { success: true, ...data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** อัปเดตสถานะคำขอต่ออายุ */
  static async updateStatus(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const status = body.status;
      if (!status || !["pending", "approved", "rejected"].includes(status)) {
        return { success: false, message: "Invalid status" };
      }
      const success = await adminService.updateRenewalStatus(id, status, body.reason, body.newValidUntil);
      return { success, message: `Updated payment status to ${status}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** อนุมัติคำขอต่ออายุแพ็กเกจ */
  static async approveRenewal(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const success = await adminService.approveRenewal(id, body.newValidUntil);
      return { success, message: "Approved renewal successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /** ปฏิเสธคำขอต่ออายุแพ็กเกจ */
  static async rejectRenewal(ctx: any) {
    try {
      const id = ctx.params.id;
      const body = ctx.body || {};
      const success = await adminService.rejectRenewal(id, body.reason);
      return { success, message: "Rejected renewal successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
