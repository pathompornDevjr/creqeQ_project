/**
 * โมดูลจัดการการแฮชและตรวจสอบรหัสผ่าน (Password Hashing & Verification)
 * รองรับ Bun.password (Bcrypt แบบเนทีฟ) และมี Fallback เป็น Node.js Crypto (Scrypt)
 */

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// ประกาศตัวแปร Global Bun สำหรับ TypeScript
declare const Bun: any;

/**
 * แฮชรหัสผ่านแบบ Plaintext ให้เป็นสตริงแฮชที่ปลอดภัย
 * 1. พยายามใช้ Bun.password (Bcrypt cost 10) เป็นหลัก
 * 2. หากไม่สามารถใช้งานได้ จะ Fallback ไปใช้ Node.js Crypto Scrypt พร้อม Salt 16 bytes
 * 
 * @param password รหัสผ่านแบบข้อความธรรมดา
 * @returns Promise คืนสตริงรหัสผ่านที่ผ่านการแฮชแล้ว
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";

  // 1. ใช้งาน Bun native bcrypt หากทำงานอยู่บน Bun Runtime
  if (typeof Bun !== "undefined" && Bun.password?.hash) {
    try {
      return await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    } catch {
      // หากเกิดข้อผิดพลาด ให้สลับไปใช้ Scrypt fallback ด้านล่าง
    }
  }

  // 2. Node.js scrypt fallback: สุ่ม Salt 16 bytes และสร้าง Derived Key ความยาว 64 bytes
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * ตรวจสอบความถูกต้องของรหัสผ่านที่ผู้ใช้ป้อนเข้ามาเทียบกับรหัสผ่านที่แฮชไว้ในฐานข้อมูล
 * รองรับทั้ง Bcrypt ($2a$, $2b$, $2y$), Scrypt (salt:key) และ Plaintext สำหรับข้อมูลตั้งต้นระบบ
 * 
 * @param password รหัสผ่านแบบข้อความธรรมดาที่ผู้ใช้ป้อน
 * @param hash รหัสผ่านที่บันทึกไว้ในฐานข้อมูล
 * @returns Promise คืน true หากรหัสผ่านถูกต้อง, false หากไม่ถูกต้อง
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  // 1. ตรวจสอบแบบ Plaintext ตรงๆ (สำหรับการรองรับ Legacy / Seed data)
  if (password === hash) return true;

  // 2. ตรวจสอบรูปแบบ Bcrypt hash ($2a$, $2b$, $2y$)
  if ((hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) && typeof Bun !== "undefined" && Bun.password?.verify) {
    try {
      return await Bun.password.verify(password, hash);
    } catch {
      return false;
    }
  }

  // 3. ตรวจสอบรูปแบบ Scrypt: "salt:key"
  if (hash.includes(":")) {
    try {
      const [salt, key] = hash.split(":");
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = scryptSync(password, salt, 64);
      // ใช้ timingSafeEqual เพื่อป้องกันการโจมตีแบบ Timing Attack
      return timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  return false;
}
