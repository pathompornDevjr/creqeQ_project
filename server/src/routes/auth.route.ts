/**
 * Auth Routes
 * เส้นทาง API สำหรับระบบยืนยันตัวตนและการจัดการเซสชัน:
 * - /api/v1/auth/check-email: ตรวจสอบความซ้ำซ้อนของอีเมล
 * - /api/v1/auth/register: ลงทะเบียนเปิดร้านค้าใหม่
 * - /api/v1/auth/upload-slip: อัปโหลดสลิปสมัครร้านค้า
 * - /api/v1/auth/login: เข้าสู่ระบบร้านค้า
 * - /api/v1/auth/me: ตรวจสอบข้อมูลผู้ใช้ปัจจุบันจาก Token
 * - /api/v1/auth/logout: ออกจากระบบ
 */

import { Elysia } from "elysia";
import { AuthController } from "../controllers/auth.controller";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/check-email", AuthController.checkEmail)
  .post("/check-email", AuthController.checkEmail)
  .post("/register", AuthController.register)
  .post("/upload-slip", AuthController.uploadSlip)
  .post("/login", AuthController.login)
  .get("/me", AuthController.me)
  .post("/logout", AuthController.logout);
