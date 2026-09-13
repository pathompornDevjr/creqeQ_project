/**
 * @file route.ts (Logout)
 * @description API Route สำหรับออกจากระบบ (Logout)
 * ล้างคุกกี้ auth_token ทั้งฝั่งเซิร์ฟเวอร์และ Header ในการตอบกลับ
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * จัดการการออกจากระบบของผู้ใช้งาน
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    cookieStore.set("auth_token", "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  } catch {}

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  // เคลียร์คุกกี้ใน Header ของ Response เพื่อให้เบราว์เซอร์ลบอย่างสมบูรณ์
  response.cookies.delete("auth_token");
  response.cookies.set("auth_token", "", {
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
