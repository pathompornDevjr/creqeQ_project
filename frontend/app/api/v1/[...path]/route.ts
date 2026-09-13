/**
 * @file route.ts (API Proxy Handler)
 * @description Proxy Route สำหรับส่งต่อคำขอจาก Frontend ไปยัง Backend API เซิร์ฟเวอร์หลัก (Express/Bun)
 * ป้องกันปัญหา CORS, ช่วยแทรก x-api-key จาก Server Environment อย่างปลอดภัย,
 * และรองรับสตรีมข้อมูลแบบ Server-Sent Events (SSE)
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** ดึง URL หลักของเซิร์ฟเวอร์ Backend จาก Environment */
const rawBackendBase = (
  process.env.BACKEND_API_URL ||
  "http://localhost:8800/api/v1"
).replace(/\/+$/, "");

const BACKEND_BASE_URL = rawBackendBase.endsWith("/api/v1")
  ? rawBackendBase
  : `${rawBackendBase}/api/v1`;

/**
 * ฟังก์ชันหลักในการส่งต่อ Proxy Request ไปยัง Backend
 * @param request คำขอต้นทางจากไคลเอนต์
 * @param context พารามิเตอร์ของเส้นทางย่อย
 */
async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  try {
    const resolvedParams = await params;
    const subPath = Array.isArray(resolvedParams?.path)
      ? resolvedParams.path.join("/")
      : "";

    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = searchParams
      ? `${BACKEND_BASE_URL}/${subPath}?${searchParams}`
      : `${BACKEND_BASE_URL}/${subPath}`;

    // คัดลอก Headers ต้นทางโดยข้าม Header บางตัวที่ไม่จำเป็น
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "host" &&
        lowerKey !== "content-length" &&
        lowerKey !== "x-api-key" &&
        lowerKey !== "x-client-key"
      ) {
        headers.set(key, value);
      }
    });

    // แทรก x-api-key อย่างปลอดภัยจากฝั่ง Server เท่านั้น
    const serverApiKey = (process.env.API_KEY || "").trim().replace(/^["']|["']$/g, "");
    if (serverApiKey) {
      headers.set("x-api-key", serverApiKey);
    }

    // ส่งต่อคุกกี้เพื่อใช้ในการตรวจสอบสิทธิ์
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader && !headers.has("cookie")) {
      headers.set("cookie", cookieHeader);
    }

    const method = request.method.toUpperCase();
    const isBodyAllowed = method !== "GET" && method !== "HEAD";

    let body: BodyInit | null = null;
    if (isBodyAllowed) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      } else if (
        contentType.includes("application/json") ||
        contentType.includes("text/") ||
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        body = await request.text();
      } else {
        const buffer = await request.arrayBuffer();
        if (buffer.byteLength > 0) {
          body = buffer;
        }
      }
    }

    // สำหรับ SSE (Server-Sent Events) จะไม่จำกัดเวลา Timeout
    const isEventStream =
      subPath.includes("events") ||
      request.headers.get("accept")?.includes("text/event-stream");

    const fetchSignal = isEventStream
      ? undefined
      : AbortSignal.timeout(20000);

    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      // @ts-ignore - Next.js fetch options
      duplex: "half",
      cache: "no-store",
      signal: fetchSignal,
    });

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        responseHeaders.append(key, value);
      } else {
        responseHeaders.set(key, value);
      }
    });

    const responseContentType = backendResponse.headers.get("content-type") || "";
    if (responseContentType.includes("text/event-stream") || isEventStream) {
      responseHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
      responseHeaders.set("Cache-Control", "no-cache, no-transform, no-store");
      responseHeaders.set("Connection", "keep-alive");
      responseHeaders.set("X-Accel-Buffering", "no");

      return new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    const responseBuffer = await backendResponse.arrayBuffer();

    return new NextResponse(responseBuffer, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    const isConnRefused = error?.cause?.code === "ECONNREFUSED" || error?.message?.includes("fetch failed");
    if (!isConnRefused) {
      console.error("[Next API Proxy Error]", error);
    }
    return NextResponse.json(
      {
        success: false,
        message: isConnRefused
          ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลักได้ (Backend Server is offline or unreachable on port 8800)"
          : "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์หลัก (Proxy Error)",
        error: error?.message || String(error),
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return handleProxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return handleProxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return handleProxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return handleProxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> | { path?: string[] } }
) {
  return handleProxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
    },
  });
}
