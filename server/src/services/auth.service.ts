/**
 * Auth Service Layer
 * ให้บริการตรรกะทางธุรกิจเกี่ยวกับการยืนยันตัวตน (Authentication Business Logic)
 * ตรวจสอบความถูกต้องของข้อมูล (Validation) ก่อนส่งต่อไปยัง Repository Layer
 */

import {
  AuthRepositoryFactory,
  AuthResultDTO,
  IAuthRepository,
  LoginDTO,
  RegisterDTO,
} from "../repositories";

export class AuthService {
  private repository: IAuthRepository;

  constructor(repository?: IAuthRepository) {
    this.repository = repository || AuthRepositoryFactory.getRepository();
  }

  /**
   * ลงทะเบียนร้านค้าใหม่
   * ตรวจสอบความครบถ้วนของชื่อ-นามสกุล, เบอร์ติดต่อ, ชื่อร้านค้า และหลักฐานการชำระเงิน (กรณีไม่ใช่แพ็กเกจฟรี)
   * 
   * @param data ข้อมูลการลงทะเบียน (RegisterDTO)
   * @returns ผลลัพธ์การลงทะเบียนพร้อมข้อมูลผู้ใช้และร้านค้า (AuthResultDTO)
   */
  async register(data: RegisterDTO): Promise<AuthResultDTO> {
    if (!data.firstName || !data.lastName) {
      throw new Error("กรุณากรอกชื่อและนามสกุล");
    }
    if (!data.phone && !data.email) {
      throw new Error("กรุณาระบุเบอร์โทรศัพท์หรืออีเมล");
    }
    if (!data.restaurantName) {
      throw new Error("กรุณากรอกชื่อร้านค้า");
    }
    // ตรวจสอบว่าเลือกแพ็กเกจทดลองใช้/ฟรีหรือไม่ หากไม่ใช่ต้องแนบสลิป
    const isFreeMonthly = String(data.plan || "").toLowerCase().includes("1month") || String(data.plan || "").toLowerCase().includes("free");
    if (!isFreeMonthly && !data.slipImage) {
      throw new Error("กรุณาแนบสลิปหลักฐานการโอนเงินเพื่อสมัครเปิดร้าน");
    }

    return this.repository.register(data);
  }

  /**
   * เข้าสู่ระบบสำหรับร้านค้า
   * 
   * @param data ข้อมูลเข้าสู่ระบบ (LoginDTO)
   * @returns ข้อมูลผู้ใช้และร้านค้าเมื่อสำเร็จ หรือ null เมื่อไม่ผ่าน
   */
  async login(data: LoginDTO): Promise<AuthResultDTO | null> {
    if (!data.emailOrPhone) {
      throw new Error("กรุณาระบุอีเมลหรือเบอร์โทรศัพท์");
    }
    return this.repository.login(data);
  }

  /**
   * ตรวจสอบว่าอีเมลสามารถใช้ลงทะเบียนได้หรือไม่
   * 
   * @param email อีเมลที่ต้องการตรวจสอบ
   * @returns ผลการตรวจสอบว่าว่างอยู่หรือไม่
   */
  async checkEmail(email: string): Promise<{ available: boolean; message?: string }> {
    if (!email) {
      throw new Error("กรุณาระบุอีเมล");
    }
    return this.repository.checkEmail(email);
  }
}

export const authService = new AuthService();
