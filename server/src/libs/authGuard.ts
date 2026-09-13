/**
 * Restaurant Authentication Guard Middleware
 * มิดเดิลแวร์สำหรับตรวจสอบการยืนยันตัวตนของผู้ดูแลร้านค้า (Restaurant User Authentication)
 * รองรับการดึง Token ทั้งจาก Header Authorization (Bearer token) และ HTTP Cookie (auth_token)
 */

import { verifyJWT, JWTPayload } from "./jwt";

/**
 * ฟังก์ชัน Guard ตรวจสอบความถูกต้องของสิทธิ์การใช้งานสำหรับเจ้าของร้านค้า
 * ถอดรหัส JWT Token และแนบข้อมูล User Payload เข้าสู่ Context (`ctx.user`, `ctx.restaurantId`)
 * 
 * @param ctx Context ของ Elysia / Request Handler
 * @returns คืนข้อความแจ้งเตือนสถานะ 401 เมื่อ Token ไม่ถูกต้อง หรือไม่ส่ง Token มา
 */
export async function restaurantAuthGuard(ctx: any) {
  // ข้ามการตรวจสอบสำหรับ OPTIONS Request (CORS Preflight)
  if (ctx.request?.method === "OPTIONS") {
    return;
  }

  // 1. ดึง Authorization Header (Bearer token)
  const authHeader = ctx.headers?.authorization || ctx.headers?.Authorization;
  
  // 2. ดึง Token จาก Cookie Header หากมี
  let rawCookie = ctx.headers?.cookie || "";
  let cookieToken: string | undefined;

  if (rawCookie) {
    const match = rawCookie.match(/auth_token=([^;]+)/);
    if (match) {
      cookieToken = match[1];
    }
  }

  // เลือกลำดับความสำคัญของ Token จาก Cookie หรือ Header
  const token =
    ctx.cookie?.auth_token?.value ||
    (typeof ctx.cookie?.auth_token === "string" ? ctx.cookie.auth_token : undefined) ||
    cookieToken ||
    (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : undefined);

  // ตรวจสอบว่ามี Token หรือไม่ และไม่ใช่ค่าว่างที่เกิดจากการ Logout
  if (!token || token === "deleted" || token === "null" || token === "undefined") {
    ctx.set.status = 401;
    return {
      success: false,
      message: "กรุณาเข้าสู่ระบบร้านค้า (Authentication token required)",
      code: "UNAUTHORIZED",
    };
  }

  // ตรวจสอบความถูกต้องและวันหมดอายุของ JWT Token
  const payload = await verifyJWT<JWTPayload>(token);
  if (!payload) {
    ctx.set.status = 401;
    return {
      success: false,
      message: "โทเค็นการเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว (Invalid or expired token)",
      code: "INVALID_TOKEN",
    };
  }

  // แนบข้อมูลผู้ใช้งานที่ผ่านการยืนยันแล้วลงใน Context เพื่อให้ Controller นำไปใช้งานต่อได้
  ctx.user = payload;
  ctx.restaurantId = payload.restaurantId || payload.res_id;
}
