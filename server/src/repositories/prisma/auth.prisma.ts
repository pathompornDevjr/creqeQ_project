/**
 * Auth Prisma Repository Implementation
 * จัดการกระบวนการลงทะเบียนร้านค้า, การเข้าสู่ระบบ และการตรวจสอบอีเมลผ่าน Prisma ORM
 */

import prisma from "../../database/prisma";
import {
  AuthResultDTO,
  IAuthRepository,
  LoginDTO,
  RegisterDTO,
} from "../interfaces/auth.repository.interface";
import { hashPassword, verifyPassword } from "../../libs/password";
import { randomUUID } from "crypto";

export class AuthPrismaRepository implements IAuthRepository {
  /**
   * ลงทะเบียนร้านค้าและผู้ใช้งานใหม่
   * 1. ตรวจสอบว่าอีเมลซ้ำหรือไม่
   * 2. สร้างเรคคอร์ดข้อมูลร้านค้า (restaurant_data)
   * 3. แฮชรหัสผ่านและสร้างเรคคอร์ดผู้ใช้งานร้านค้า (restaurant_users)
   * 
   * @param data ข้อมูลลงทะเบียน (RegisterDTO)
   * @returns ผลลัพธ์การลงทะเบียน พร้อมข้อมูลผู้ใช้และร้านค้า (AuthResultDTO)
   */
  async register(data: RegisterDTO): Promise<AuthResultDTO> {
    const email = data.email?.trim().toLowerCase();
    if (email) {
      // ตรวจสอบความซ้ำซ้อนของอีเมลในระบบ
      const existingUser = await prisma.restaurant_users.findFirst({
        where: { email: { equals: email } },
      });
      if (existingUser) {
        throw new Error(`อีเมล "${data.email}" นี้ถูกใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น`);
      }
    }

    // รวมข้อความที่อยู่จากข้อมูลย่อย
    const fullAddress = data.address || [data.addressDetail, data.subdistrict, data.district, data.province, data.postalCode].filter(Boolean).join(" ") || "";

    // 1. สร้างเรคคอร์ดร้านค้าใหม่
    const createdRestaurant = await prisma.restaurant_data.create({
      data: {
        restaurant_name: data.restaurantName,
        restaurant_desc: data.description || "",
        restaurant_phone: data.phone,
        restaurant_address: fullAddress,
        is_open: true,
      },
    });

    const resId = createdRestaurant.res_id;
    const userId = randomUUID();
    const username = data.email || data.phone || `user_${Date.now()}`;
    const passwordHash = await hashPassword(data.password || "default123");

    // 2. สร้างเรคคอร์ดผู้ดูแลร้านค้าเชื่อมโยงกับร้านค้าที่สร้างขึ้น
    const createdUser = await prisma.restaurant_users.create({
      data: {
        res_user_id: userId,
        username,
        passwordHash,
        fname: data.firstName,
        lname: data.lastName,
        phone: data.phone,
        email: data.email || null,
        role: "owner",
        restaurantId: resId,
      },
    });

    return {
      user: {
        id: createdUser.res_user_id,
        username: createdUser.username,
        firstName: createdUser.fname,
        lastName: createdUser.lname,
        phone: createdUser.phone || "",
        email: createdUser.email || "",
        role: "restaurant",
        restaurantId: resId,
      },
      restaurant: {
        id: `r-${resId}`,
        res_id: resId,
        name: createdRestaurant.restaurant_name,
        phone: createdRestaurant.restaurant_phone || data.phone,
        address: createdRestaurant.restaurant_address || fullAddress,
        is_open: createdRestaurant.is_open,
      },
      token: `token_${userId}_${Date.now()}`,
    };
  }

  /**
   * เข้าสู่ระบบด้วยอีเมล/เบอร์โทรศัพท์ และรหัสผ่าน
   * 
   * @param data ข้อมูลเข้าสู่ระบบ (LoginDTO)
   * @returns ข้อมูลผู้ใช้และร้านค้าเมื่อผ่าน หรือ null เมื่อไม่ผ่าน
   */
  async login(data: LoginDTO): Promise<AuthResultDTO | null> {
    const term = data.emailOrPhone.trim();

    // ค้นหาผู้ใช้จาก email, phone หรือ username
    const user = await prisma.restaurant_users.findFirst({
      where: {
        OR: [
          { email: term },
          { phone: term },
          { username: term },
        ],
      },
      include: {
        restaurant_data: true,
      },
    });

    if (user) {
      // ตรวจสอบความถูกต้องของรหัสผ่าน
      if (data.password) {
        const isMatch = await verifyPassword(data.password, user.passwordHash);
        if (!isMatch) return null;
      }

      return {
        user: {
          id: user.res_user_id,
          username: user.username,
          firstName: user.fname,
          lastName: user.lname,
          phone: user.phone || "",
          email: user.email || "",
          role: "restaurant",
          restaurantId: user.restaurantId,
        },
        restaurant: user.restaurant_data
          ? {
              id: `r-${user.restaurant_data.res_id}`,
              res_id: user.restaurant_data.res_id,
              name: user.restaurant_data.restaurant_name,
              phone: user.restaurant_data.restaurant_phone || user.phone || "",
              address: user.restaurant_data.restaurant_address || "",
              is_open: user.restaurant_data.is_open,
            }
          : undefined,
        token: `token_${user.res_user_id}_${Date.now()}`,
      };
    }

    return null;
  }

  /**
   * ตรวจสอบว่าอีเมลซ้ำกับในระบบหรือไม่
   * 
   * @param email อีเมลที่ต้องการตรวจสอบ
   * @returns สถานะว่าง (available) และข้อความแจ้งเตือน
   */
  async checkEmail(email: string): Promise<{ available: boolean; message?: string }> {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      return { available: false, message: "กรุณาระบุอีเมล" };
    }
    const existingUser = await prisma.restaurant_users.findFirst({
      where: { email: { equals: cleanEmail } },
    });
    if (existingUser) {
      return { available: false, message: `อีเมล "${email}" นี้ถูกใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น` };
    }
    return { available: true, message: "อีเมลนี้สามารถใช้งานได้" };
  }
}
