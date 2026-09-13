/**
 * Frontend Auth API Client
 * ให้บริการฟังก์ชันเรียก API ด้านการยืนยันตัวตนสำหรับ Frontend:
 * - checkEmail: ตรวจสอบความพร้อมของอีเมล
 * - register: ส่งข้อมูลลงทะเบียนร้านค้า
 * - login: เข้าสู่ระบบร้านค้า
 * - me: ดึงข้อมูลโปรไฟล์ผู้ใช้งานปัจจุบัน
 * - logout: ออกจากระบบและล้าง Cookie / Storage
 */

import { fetchApi } from "./client";
import { ApiResponse, AuthResultDTO, LoginDTO, RegisterDTO } from "./types";

/**
 * ล้างข้อมูล Session, Token, Cookies และ Storage ทั้งหมดในเบราว์เซอร์
 */
export function clearAuthSession() {
  if (typeof document !== "undefined") {
    const cookieNames = ["auth_token", "token", "jwt", "session"];
    const paths = ["/", "/restaurant", "/admin", "/login"];
    cookieNames.forEach((name) => {
      paths.forEach((path) => {
        document.cookie = `${name}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
        document.cookie = `${name}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = `${name}=; path=${path}; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      });
    });
  }
  if (typeof localStorage !== "undefined") {
    try {
      const rememberLogin = localStorage.getItem("crepe_remember_login");
      const crepeTheme = localStorage.getItem("crepe_theme");
      const customer = localStorage.getItem("crepe_customer");
      localStorage.clear();
      // คงค่าการตั้งค่าบางส่วนที่ไม่เกี่ยวกับ Token ความปลอดภัย
      if (rememberLogin) {
        localStorage.setItem("crepe_remember_login", rememberLogin);
      }
      if (crepeTheme) {
        localStorage.setItem("crepe_theme", crepeTheme);
      }
      if (customer) {
        localStorage.setItem("crepe_customer", customer);
      }
    } catch {}
  }
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.clear();
    } catch {}
  }
}

export const AuthApi = {
  /** ตรวจสอบว่าอีเมลสามารถใช้งานได้หรือไม่ */
  checkEmail: async (email: string): Promise<ApiResponse<{ available: boolean }>> => {
    try {
      return await fetchApi<{ available: boolean }>("/auth/check-email", {
        params: { email },
      });
    } catch {
      return { success: true, data: { available: true } };
    }
  },

  /** ลงทะเบียนร้านค้าใหม่ */
  register: async (payload: RegisterDTO): Promise<ApiResponse<AuthResultDTO>> => {
    return fetchApi<AuthResultDTO>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** เข้าสู่ระบบร้านค้า */
  login: async (payload: LoginDTO): Promise<ApiResponse<AuthResultDTO>> => {
    return fetchApi<AuthResultDTO>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** ดึงข้อมูลผู้ใช้งานปัจจุบันจาก Token */
  me: async (): Promise<ApiResponse<any>> => {
    return fetchApi<any>("/auth/me");
  },

  /** ออกจากระบบ */
  logout: async (): Promise<ApiResponse<void>> => {
    clearAuthSession();
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (_) {}
    try {
      await fetchApi<void>("/auth/logout", {
        method: "POST",
      }).catch(() => {});
    } catch (_) {}
    clearAuthSession();
    return { success: true, message: "ออกจากระบบเรียบร้อยแล้ว" };
  },
};
