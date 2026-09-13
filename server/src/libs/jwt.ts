/**
 * โมดูลจัดการ JSON Web Token (JWT)
 * ใช้ไลบรารี jose สำหรับการสร้าง (Sign) และตรวจสอบ (Verify) โทเค็นอย่างปลอดภัย
 */

import { SignJWT, jwtVerify } from "jose";

// รหัสลับ (Secret Key) ที่ใช้ในการเข้ารหัสและถอดรหัส JWT
const JWT_SECRET_STRING = process.env.JWT_SECRET || "qrshop_super_secret_jwt_key_2026_!@#$%^&*()_+";
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Interface โครงสร้างข้อมูล Payload ที่บรรจุอยู่ภายใน JWT Token
 */
export interface JWTPayload {
  res_user_id?: string;
  userId: string;
  username: string;
  role: string;
  restaurantId?: number;
  email?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * สร้างและลงนาม (Sign) JWT Token พร้อมกำหนดอายุการใช้งาน
 * 
 * @param payload ข้อมูลผู้ใช้งานที่ต้องการบันทึกใน Token
 * @param expiresIn ระยะเวลาหมดอายุของ Token (เช่น "7d", "24h", "1h", ค่าเริ่มต้นคือ "7d")
 * @returns Promise คืนสตริง JWT Token ที่เข้ารหัสแล้ว
 */
export async function signJWT(payload: JWTPayload, expiresIn: string = "7d"): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" }) // ใช้อัลกอริทึม HMAC SHA-256
    .setIssuedAt()                        // บันทึกเวลาที่สร้าง Token (iat)
    .setExpirationTime(expiresIn)         // กำหนดเวลาหมดอายุ (exp)
    .sign(secretKey);                     // ลงนามด้วย Secret Key
}

/**
 * ตรวจสอบความถูกต้องและถอดรหัส JWT Token
 * 
 * @param token สตริง JWT Token ที่ต้องการตรวจสอบ
 * @returns Promise คืนออบเจกต์ Payload หาก Token ถูกต้องและยังไม่หมดอายุ หรือ null หากไม่ถูกต้อง
 */
export async function verifyJWT<T = JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as T;
  } catch (error) {
    // เกิดข้อผิดพลาด เช่น Token หมดอายุ ลายเซ็นไม่ตรง หรือโครงสร้าง Token ผิดพลาด
    return null;
  }
}
