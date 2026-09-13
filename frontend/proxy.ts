/**
 * Next.js Edge Middleware Proxy / Route Protection
 * ทำหน้าที่ตรวจสอบความถูกต้องของสิทธิ์การใช้งาน (Authentication & Role Guard):
 * - ป้องกันหน้า Protected Routes (/restaurant/*, /admin/*) หากยังไม่ได้เข้าสู่ระบบ จะ Redirect ไปยัง /login
 * - ป้องกันไม่ให้ผู้ใช้ทั่วไปเข้าถึงเส้นทางของผู้ดูแลระบบ (/admin/*)
 * - หากเข้าสู่ระบบอยู่แล้ว แล้วเข้าหน้า /login หรือ /register จะ Redirect ไปยังหน้า Dashboard ทันที
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** โครงสร้างข้อมูล Payload ของ Token */
interface DecodedToken {
  userId?: string;
  res_user_id?: string;
  role?: string;
  username?: string;
  exp?: number;
  [key: string]: any;
}

/**
 * ถอดรหัส Payload จาก JWT Token โดยไม่ต้องใช้ไลบรารีภายนอก (ทำงานได้บน Edge Runtime)
 */
function decodeJwtPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * ฟังก์ชันหลักของ Proxy Middleware
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get("auth_token")?.value?.trim();
  const isValidToken = Boolean(authToken && authToken !== "deleted" && authToken !== "null" && authToken !== "undefined" && authToken.length > 10);

  const decoded = isValidToken ? decodeJwtPayload(authToken!) : null;
  const isTokenExpired = Boolean(decoded?.exp && decoded.exp * 1000 < Date.now());
  const isAuthenticated = Boolean(isValidToken && decoded && !isTokenExpired);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isRestaurantRoute = pathname.startsWith("/restaurant");
  const isAdminRoute = pathname.startsWith("/admin");

  // 1. กรณีผู้ใช้ Login อยู่แล้วแต่เข้าหน้า /login หรือ /register ให้ส่งตรงไปยังหน้า Dashboard
  if (isAuthRoute && isAuthenticated) {
    if (decoded?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/restaurant", request.url));
  }

  // 2. กรณีผู้ใช้ยังไม่ได้ Login แต่พยายามเข้าถึงหน้าที่ต้องล็อกอิน ให้ Redirect ไปยัง /login
  if ((isRestaurantRoute || isAdminRoute) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. กรณีผู้ใช้ทั่วไปพยายามเข้าถึงหน้า /admin ให้ส่งกลับไปยังหน้าร้านค้า
  if (isAdminRoute && isAuthenticated && decoded?.role !== "admin") {
    return NextResponse.redirect(new URL("/restaurant", request.url));
  }

  return NextResponse.next();
}

/** กำหนดเส้นทางที่ต้องการให้ Middleware ทำงาน */
export const config = {
  matcher: [
    "/login",
    "/register",
    "/restaurant/:path*",
    "/admin/:path*",
  ],
};
