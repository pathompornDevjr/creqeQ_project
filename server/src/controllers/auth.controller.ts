/**
 * Auth Controller
 * จัดการ HTTP Request / Response สำหรับระบบยืนยันตัวตน (Authentication):
 * - ตรวจสอบความพร้อมใช้งานของอีเมล (checkEmail)
 * - ลงทะเบียนร้านค้าใหม่และแนบสลิปสมัคร (register)
 * - อัปโหลดสลิปหลักฐานการสมัคร (uploadSlip)
 * - เข้าสู่ระบบและสร้าง JWT Token บันทึกลง HTTP-Only Cookie (login)
 * - ตรวจสอบข้อมูลผู้ใช้งานปัจจุบันจาก Token (me)
 * - ออกจากระบบและล้าง Cookie (logout)
 */

import { authService } from "../services/auth.service";
import { StorageService } from "../services/storage.service";
import { signJWT, verifyJWT } from "../libs/jwt";

export class AuthController {
  /**
   * ตรวจสอบว่าอีเมลนี้สามารถใช้สมัครสมาชิกได้หรือไม่
   */
  static async checkEmail(ctx: any) {
    try {
      const email = ctx.query?.email || ctx.body?.email;
      if (!email) {
        return {
          success: false,
          available: false,
          message: "กรุณาระบุอีเมล",
        };
      }
      const result = await authService.checkEmail(String(email).trim());
      return {
        success: result.available,
        available: result.available,
        message: result.message,
      };
    } catch (error: any) {
      return {
        success: false,
        available: false,
        message: error.message || "เกิดข้อผิดพลาดในการตรวจสอบอีเมล",
      };
    }
  }

  /**
   * ลงทะเบียนเปิดร้านค้าใหม่
   */
  static async register(ctx: any) {
    try {
      const body = ctx.body;
      const data = await authService.register(body);

      // ไม่ออก Token ทันทีหลังสมัคร เนื่องจากบัญชีต้องรอการอนุมัติจาก Admin
      if (data) {
        delete (data as any).token;
      }

      // ล้าง Cookie เดิมหากมีตกค้าง
      if (ctx.cookie && ctx.cookie.auth_token) {
        ctx.cookie.auth_token.set({
          value: "",
          httpOnly: false,
          secure: false,
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }

      return {
        success: true,
        data: {
          user: data?.user,
          restaurant: data?.restaurant,
          status: "pending",
        },
        message: "ลงทะเบียนเปิดร้านค้าสำเร็จ บัญชีของคุณอยู่ในสถานะ 'รอการอนุมัติ' จากผู้ดูแลระบบ",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการลงทะเบียน",
      };
    }
  }

  /**
   * อัปโหลดสลิปหลักฐานการชำระเงินค่าสมัครเปิดร้าน
   */
  static async uploadSlip(ctx: any) {
    try {
      const body = ctx.body;
      let fileData = body.file || body.image || body.slipImage || body.base64;
      let fileName = body.fileName || `slip_${Date.now()}.png`;
      let mimeType = body.mimeType || "image/png";

      if (body.file && typeof body.file === "object" && body.file.arrayBuffer) {
        const arrayBuf = await body.file.arrayBuffer();
        fileData = Buffer.from(arrayBuf);
        fileName = body.file.name || fileName;
        mimeType = body.file.type || mimeType;
      }

      if (!fileData) {
        return {
          success: false,
          message: "กรุณาส่งไฟล์หรือข้อมูลรูปภาพสลิป",
        };
      }

      const result = await StorageService.uploadSlipImage(fileData, fileName, mimeType);
      return {
        success: true,
        data: result,
        message: "อัปโหลดภาพสลิปสำเร็จ",
      };
    } catch (error: any) {
      console.error("Upload slip error:", error);
      return {
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการอัปโหลดภาพสลิป",
      };
    }
  }

  /**
   * เข้าสู่ระบบสำหรับร้านค้า พร้อมออก JWT Token อายุ 7 วัน และบันทึกลง HTTP-Only Cookie
   */
  static async login(ctx: any) {
    try {
      const body = ctx.body;
      const data = await authService.login(body);
      if (!data) {
        return {
          success: false,
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        };
      }

      // สร้าง JWT Token ที่เข้ารหัสปลอดภัย
      const res_user_id = String(data.user.id || (data.user as any).res_user_id || "");
      const token = await signJWT({
        res_user_id,
        userId: res_user_id,
        username: data.user.username || "",
        role: data.user.role,
        restaurantId: data.user.restaurantId || data.restaurant?.res_id,
        email: data.user.email,
        phone: data.user.phone,
      });

      data.token = token;

      // ตั้งค่า Cookie ความปลอดภัยสูง HTTP-Only
      if (ctx.cookie && ctx.cookie.auth_token) {
        ctx.cookie.auth_token.set({
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 วัน
        });
      }

      return {
        success: true,
        data,
        message: "เข้าสู่ระบบสำเร็จ",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      };
    }
  }

  /**
   * ตรวจสอบข้อมูล Session ผู้ใช้งานปัจจุบันจาก Header หรือ Cookie
   */
  static async me(ctx: any) {
    try {
      const authHeader = ctx.headers?.authorization || ctx.headers?.Authorization;
      const bearerToken = authHeader ? String(authHeader).replace(/^Bearer\s+/i, "").trim() : "";
      const cookieToken = ctx.cookie?.auth_token?.value ? String(ctx.cookie.auth_token.value).trim() : "";

      const token = bearerToken || cookieToken;

      if (!token || token === "deleted" || token === "null" || token === "undefined" || token.length < 10) {
        return {
          success: false,
          message: "ไม่ได้เข้าสู่ระบบ",
        };
      }

      const decoded = await verifyJWT(token);
      if (!decoded) {
        return {
          success: false,
          message: "Token หมดอายุหรือไม่ถูกต้อง",
        };
      }

      return {
        success: true,
        data: decoded,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์",
      };
    }
  }

  /**
   * ออกจากระบบ ล้างค่า Cookie และ Token
   */
  static async logout(ctx: any) {
    try {
      if (ctx.cookie && ctx.cookie.auth_token) {
        ctx.cookie.auth_token.set({
          value: "",
          httpOnly: false,
          secure: false,
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
      if (ctx.set) {
        ctx.set.headers = ctx.set.headers || {};
        ctx.set.headers["Set-Cookie"] = "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax";
      }
      return {
        success: true,
        message: "ออกจากระบบเรียบร้อยแล้ว",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการออกจากระบบ",
      };
    }
  }
}
