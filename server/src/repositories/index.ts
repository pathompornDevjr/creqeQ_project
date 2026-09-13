/**
 * จุดรวมและส่งออก Repository Layer (Repository Aggregator & Factories)
 * ใช้รูปแบบ Factory Pattern และ Singleton Pattern เพื่อสร้างและเรียกใช้งาน Repository Instance ได้อย่างมีประสิทธิภาพ
 */

import { IMenuRepository } from "./interfaces/menu.repository.interface";
import { MenuPrismaRepository } from "./prisma/menu.prisma";

import { IAdminRepository } from "./interfaces/admin.repository.interface";
import { AdminPrismaRepository } from "./prisma/admin.prisma";

import { IRestaurantRepository } from "./interfaces/restaurant.repository.interface";
import { RestaurantPrismaRepository } from "./prisma/restaurant.prisma";

import { ICustomerRepository } from "./interfaces/customer.repository.interface";
import { CustomerPrismaRepository } from "./prisma/customer.prisma";

import { IAuthRepository } from "./interfaces/auth.repository.interface";
import { AuthPrismaRepository } from "./prisma/auth.prisma";

/**
 * Factory สำหรับสร้างและเข้าถึง Auth Repository Instance (ระบบยืนยันตัวตน)
 */
export class AuthRepositoryFactory {
  private static instance: IAuthRepository;

  static getRepository(): IAuthRepository {
    if (!this.instance) {
      this.instance = new AuthPrismaRepository();
    }
    return this.instance;
  }
}

/**
 * Factory สำหรับสร้างและเข้าถึง Menu Repository Instance (จัดการหมวดหมู่และเมนู)
 */
export class MenuRepositoryFactory {
  static getRepository(): IMenuRepository {
    return new MenuPrismaRepository();
  }
}

/**
 * Factory สำหรับสร้างและเข้าถึง Admin Repository Instance (ระบบผู้ดูแลระบบ/จัดการร้านค้าทั้งหมด)
 */
export class AdminRepositoryFactory {
  private static instance: IAdminRepository;

  static getRepository(): IAdminRepository {
    if (!this.instance) {
      this.instance = new AdminPrismaRepository();
    }
    return this.instance;
  }
}

/**
 * Factory สำหรับสร้างและเข้าถึง Restaurant Repository Instance (ระบบจัดการข้อมูลร้านค้า, ออเดอร์, คิว, สรุปยอดขาย)
 */
export class RestaurantRepositoryFactory {
  private static instance: IRestaurantRepository;

  static getRepository(): IRestaurantRepository {
    if (!this.instance) {
      this.instance = new RestaurantPrismaRepository();
    }
    return this.instance;
  }
}

/**
 * Factory สำหรับสร้างและเข้าถึง Customer Repository Instance (ระบบฝั่งลูกค้า: สั่งซื้อ, ตรวจสอบคิว, โปรโมชัน, ชำระเงิน)
 */
export class CustomerRepositoryFactory {
  private static instance: ICustomerRepository;

  static getRepository(): ICustomerRepository {
    if (!this.instance) {
      this.instance = new CustomerPrismaRepository();
    }
    return this.instance;
  }
}

// ส่งออก Interfaces และ Prisma Implementations ทั้งหมดเพื่อให้เรียกใช้งานได้จากภายนอก
export * from "./interfaces/auth.repository.interface";
export * from "./interfaces/admin.repository.interface";
export * from "./interfaces/restaurant.repository.interface";
export * from "./interfaces/customer.repository.interface";
export * from "./interfaces/menu.repository.interface";
export * from "./prisma/admin.prisma";
export * from "./prisma/auth.prisma";
export * from "./prisma/customer.prisma";
export * from "./prisma/menu.prisma";
export * from "./prisma/restaurant.prisma";
