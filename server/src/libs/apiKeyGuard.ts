/**
 * API Key Guard Middleware
 * มิดเดิลแวร์สำหรับตรวจสอบความถูกต้องของ API Key เพื่อปกป้อง API Routes ไม่ให้ถูกเรียกจากภายนอกที่ไม่ได้รับอนุญาต
 * รองรับการส่งผ่านทั้ง HTTP Headers (X-Api-Key) และ Query Parameter (สำหรับ WebSocket หรือ Media Stream)
 */

import { timingSafeEqual } from "crypto";

/**
 * ดึงค่า API_KEY หรือ INTERNAL_API_SECRET ที่ตั้งค่าไว้ใน Environment Variables ของเซิร์ฟเวอร์
 * 
 * @returns สตริง Secret/API Key ที่ตัดเครื่องหมายคำพูดและช่องว่างแล้ว
 */
export function getExpectedApiKey(): string {
  const rawKey = process.env.INTERNAL_API_SECRET || process.env.API_KEY || "";
  const key = rawKey.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    console.error("⚠️ [Security Alert] API_KEY / INTERNAL_API_SECRET is not configured in server environment variables!");
    return "";
  }
  return key;
}

/**
 * ฟังก์ชันเปรียบเทียบสตริงแบบ Constant-Time เพื่อป้องกัน Timing Side-Channel Attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}

/**
 * ตรวจสอบความถูกต้องของ API Key / Internal Secret จาก Request
 * 
 * @param request ออบเจกต์ HTTP Request ที่ส่งเข้ามา
 * @returns true หาก API Key ถูกต้องตรงกับในเซิร์ฟเวอร์, false หากไม่ถูกต้องหรือไม่ระบุ
 */
export function isApiKeyValid(request: Request): boolean {
  const expectedKey = getExpectedApiKey();
  if (!expectedKey) {
    return false;
  }

  // 1. ตรวจสอบจาก HTTP Headers (ส่งผ่าน BFF Proxy / Server-to-Server)
  const rawHeaderKey =
    request.headers.get("x-internal-secret") ||
    request.headers.get("X-Internal-Secret") ||
    request.headers.get("x-server-secret") ||
    request.headers.get("X-Server-Secret") ||
    request.headers.get("x-api-key") ||
    request.headers.get("X-Api-Key") ||
    request.headers.get("x-client-key") ||
    request.headers.get("X-Client-Key") ||
    "";
  const headerKey = rawHeaderKey.trim().replace(/^["']|["']$/g, "");

  if (headerKey && safeCompare(headerKey, expectedKey)) {
    return true;
  }

  // 2. ตรวจสอบจาก URL Query Parameters (ใช้เป็น Fallback สำหรับกรณี WebSocket Handshake หรือ Audio Media Streaming)
  try {
    const url = new URL(request.url);
    const rawQueryKey =
      url.searchParams.get("apiKey") ||
      url.searchParams.get("api_key") ||
      url.searchParams.get("internal_key") ||
      url.searchParams.get("key") ||
      "";
    const queryKey = rawQueryKey.trim().replace(/^["']|["']$/g, "");
    if (queryKey && safeCompare(queryKey, expectedKey)) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Middleware Guard สำหรับ Elysia Framework / Express Route
 * ทำการตรวจสอบ API Key ก่อนอนุญาตให้ Request เข้าถึง Handler ภายใน
 * 
 * @param ctx Context ของ Request ประกอบด้วย request และ set (สำหรับตั้งค่า HTTP Status)
 */
export function apiKeyGuard({ request, set }: { request: Request; set: any }) {
  // ข้ามการตรวจสอบสำหรับ OPTIONS Request (CORS Preflight Negotiation)
  if (request.method === "OPTIONS") {
    return;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // อนุญาตเส้นทางสาธารณะ เช่น Health Check หรือไฟล์ Static Uploads โดยไม่ต้องเช็ค API Key
  if (
    pathname === "/" ||
    pathname === "/api/v1" ||
    pathname === "/api/v1/" ||
    pathname === "/api/v1/health" ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api/v1/uploads")
  ) {
    return;
  }

  // หาก API Key ไม่ถูกต้องหรือไม่ส่งมา ให้คืนสถานะ 401 Unauthorized
  if (!isApiKeyValid(request)) {
    set.status = 401;
    return {
      success: false,
      message: "Unauthorized: Invalid or missing API key (X-Api-Key / X-Internal-Secret header required)",
      code: "UNAUTHORIZED_API_KEY",
    };
  }
}

