/**
 * Frontend Fetch API Client
 * โมดูลสื่อสาร HTTP Request กลางสำหรับ Frontend:
 * - จัดการ Base URL และการต่อ Query String อัตโนมัติ
 * - In-Memory Cache (TTL) สำหรับ GET Request ช่วยลดคำขอซ้ำซ้อน
 * - In-Flight Promise Pooling ป้องกันการยิง Request ซ้ำพร้อมกัน (Deduplication)
 * - แนบ Cookie Token (Authorization Bearer) และ X-Api-Key Header อัตโนมัติ
 * - ล้าง Cache อัตโนมัติเมื่อมีการทำ Mutation (POST, PUT, PATCH, DELETE)
 */

import { ApiResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

/** ตัวเลือกเพิ่มเติมสำหรับการเรียกใช้งาน fetchApi */
export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>; // Query Parameters
  ttl?: number;        // ระยะเวลาแคชในหน่วยมิลลิวินาที (ค่าเริ่มต้น 2000ms สำหรับ GET)
  skipCache?: boolean; // บังคับไม่ใช้แคช
}

// แคชผลลัพธ์ในหน่วยความจำ และสระเก็บ Promise ที่กำลังทำงานอยู่
const apiCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

/**
 * ล้างแคช API ทั้งหมด หรือเฉพาะคีย์ที่ตรงกับ Pattern ที่ระบุ
 */
export function clearApiCache(prefixPattern?: string) {
  if (!prefixPattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(prefixPattern)) {
      apiCache.delete(key);
    }
  }
}

/**
 * ดึงค่า Cookie จาก Browser
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop()?.split(";").shift()?.trim() || "";
    if (rawVal && rawVal !== "deleted" && rawVal !== "null" && rawVal !== "undefined" && rawVal.length > 10) {
      return rawVal;
    }
  }
  return null;
}

/**
 * ฟังก์ชันหลักสำหรับเรียก API ไปยัง Backend
 * 
 * @param endpoint เส้นทาง API Endpoint (เช่น "/restaurant/orders")
 * @param options ตัวเลือกเสริม FetchOptions (params, method, body, headers, ttl ฯลฯ)
 * @returns Promise<ApiResponse<T>> ผลลัพธ์ที่แปลงเป็น JSON แล้ว
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ttl = 2000, skipCache = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // ประกอบ Query Parameters
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // หากเป็น Mutation ให้ล้างแคช API ทันที
  if (method !== "GET") {
    clearApiCache();
  }

  // ตรวจสอบแคชสำหรับคำขอ GET
  const cacheKey = `${method}:${url}`;
  if (method === "GET" && !skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as ApiResponse<T>;
    }

    // หากมีคำขอเดียวกันกำลังทำงานอยู่ ให้แชร์ผลลัพธ์ร่วมกัน
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<ApiResponse<T>>;
    }
  }

  const token = typeof window !== "undefined" ? getCookie("auth_token") : null;
  const clientApiKey = process.env.NEXT_PUBLIC_API_KEY?.trim() || "";

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (clientApiKey) {
    defaultHeaders["X-Api-Key"] = clientApiKey;
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const requestPromise = (async (): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(url, {
        credentials: "include",
        ...fetchOptions,
        headers: {
          ...defaultHeaders,
          ...fetchOptions.headers,
        },
      });

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          message: text || `HTTP ${res.status} Error`,
        };
      }

      if (!res.ok && data && !data.message) {
        data.message = `HTTP ${res.status} Error`;
      }

      const result = data as ApiResponse<T>;

      // บันทึกผลลัพธ์ลงแคชสำหรับ GET ที่สำเร็จ
      if (method === "GET" && !skipCache && result.success && ttl > 0) {
        apiCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + ttl,
        });
      }

      return result;
    } catch (error: any) {
      console.warn(`[API Error] ${endpoint}:`, error);
      return {
        success: false,
        message: error?.message || "Failed to connect to API server",
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (method === "GET" && !skipCache) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}
