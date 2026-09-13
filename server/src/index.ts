/**
 * ไฟล์หลักจุดเริ่มต้นของเซิร์ฟเวอร์ (Server Entry Point)
 * พัฒนาด้วย Elysia Framework ทำงานบน Bun Runtime
 * ประกอบด้วย:
 * - การตั้งค่า CORS, Security Headers, Rate Limiting (จำกัดคำขอ 600 req/min)
 * - การป้องกัน API ด้วย apiKeyGuard Middleware
 * - การจัดการ Global Error Handling
 * - การให้บริการ Static Uploads Files (/uploads/*)
 * - การลงทะเบียน API Routes (/api/v1/...)
 * - การตรวจสอบและสร้างข้อมูลร้านค้าเริ่มต้นอัตโนมัติ (Auto-seed Default Shop)
 */

import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";
import { menuRoutes } from "./routes/menu.route";
import { restaurantRoutes } from "./routes/restaurant.route";
import { customerRoutes } from "./routes/customer.route";
import { authRoutes } from "./routes/auth.route";
import { realtimeRoutes } from "./routes/realtime.route";
import { ttsRoutes } from "./routes/tts.route";
import { paymentRoutes } from "./routes/payment.route";
import prisma from "./database/prisma";
import { apiKeyGuard } from "./libs/apiKeyGuard";

import { existsSync } from "fs";
import { resolve } from "path";

/**
 * ฟังก์ชันสำหรับให้บริการไฟล์รูปภาพ Static ในโฟลเดอร์ uploads/
 * พร้อมตั้งค่า Caching Header และป้องกัน Path Traversal
 */
const serveUploadFile = ({ params, set }: { params: any; set: any }) => {
  const fileSubpath = params["*"] || "";
  const uploadsDir = resolve(process.cwd(), "uploads");
  const filePath = resolve(uploadsDir, fileSubpath);

  // ป้องกันการเข้าถึงไฟล์นอกโฟลเดอร์ uploads และตรวจว่าไฟล์มีอยู่จริงหรือไม่
  if (!filePath.startsWith(uploadsDir) || !existsSync(filePath)) {
    set.status = 404;
    return { success: false, message: "File not found" };
  }

  // แคชไฟล์ในเบราว์เซอร์ 1 ปี (31536000 วินาที)
  set.headers["Cache-Control"] = "public, max-age=31536000, immutable";
  set.headers["Cross-Origin-Resource-Policy"] = "cross-origin";
  return Bun.file(filePath);
};

// สร้าง Elysia Application Instance
const app = new Elysia()

  // =========================
  // 1. การตั้งค่า CORS (Cross-Origin Resource Sharing)
  // =========================
  .use(
    cors({
      origin: (request: Request) => {
        const origin = request.headers.get("origin");
        // อนุญาต Server-to-Server หรือ Same-origin requests ที่ไม่มี origin header
        if (!origin) return true;

        const allowedEnv = [
          process.env.FRONTEND_URL,
          process.env.NEXT_PUBLIC_FRONTEND_URL,
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ].filter(Boolean) as string[];

        // อนุญาตโดเมน Frontend ที่ตั้งค่าไว้, Localhost/LAN IP, หรือ Vercel Deployments
        if (
          allowedEnv.includes(origin) ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.startsWith("http://192.168.") ||
          origin.startsWith("http://10.") ||
          origin.endsWith(".vercel.app")
        ) {
          return true;
        }

        // ปฏิเสธ Origin แปลกปลอมที่ไม่ได้รับอนุญาต
        return false;
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
        "X-Api-Key",
        "x-api-key",
        "X-Internal-Secret",
        "x-internal-secret",
        "X-Server-Secret",
        "x-server-secret",
        "X-Client-Key",
        "x-client-key",
        "x-forwarded-by",
      ],
    }),
  )

  // =========================
  // 2. Security Headers
  // =========================
  .onBeforeHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    set.headers["Cross-Origin-Opener-Policy"] = "same-origin";
  })

  // =========================
  // 3. Rate Limiting (จำกัดคำขอ 600 ครั้งต่อ 1 นาทีต่อ IP)
  // =========================
  .use(
    rateLimit({
      duration: 60 * 1000,
      max: 600,
      errorResponse: new Response(
        JSON.stringify({ success: false, message: "คำขอถี่เกินไป กรุณารอสักครู่ (Too Many Requests)" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      ),
      generator: (req: any): string => {
        return (
          req.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "client"
        );
      },
    }),
  )

  // =========================
  // 4. ตัวจัดการข้อผิดพลาดส่วนกลาง (Global Error Handler)
  // =========================
  .onError(({ code, error, set }) => {
    const rawMessage = (error as any)?.message || String(error);
    console.error(`[Server Error] code=${code} message=${rawMessage}`);

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { success: false, message: "ไม่พบข้อมูลหรือเส้นทางที่เรียก" };
    }
    if (code === "VALIDATION") {
      set.status = 400;
      return { success: false, message: "ข้อมูลที่ส่งมาไม่ถูกต้อง", error: rawMessage };
    }

    set.status = 500;
    // ซ่อนข้อความข้อผิดพลาดเกี่ยวกับโครงสร้างฐานข้อมูลในโหมด Production เพื่อความปลอดภัย
    const isProd = process.env.NODE_ENV === "production";
    const isSensitive = /prisma|sql|database|foreign key|constraint|column/i.test(rawMessage);
    const sanitizedMsg = isProd && isSensitive
      ? "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง"
      : rawMessage || "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์";

    return {
      success: false,
      message: sanitizedMsg,
    };
  })

  // =========================
  // 5. ให้บริการ Static Uploads
  // =========================
  .get("/uploads/*", serveUploadFile)

  // =========================
  // 6. กลุ่มเส้นทาง API เวอร์ชัน 1 (/api/v1)
  // =========================
  .group("/api/v1", (api) =>
    api
      .onBeforeHandle(apiKeyGuard) // ตรวจสอบ API Key ก่อนเข้าถึง API
      .get("/uploads/*", serveUploadFile)
      .get("/", () => ({
        success: true,
        message: "CrepeQ API is running smoothly",
        dataSource: "MYSQL",
        timestamp: new Date().toISOString(),
      }))
      .get("/health", () => ({
        status: "ok",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }))
      .use(authRoutes)       // เส้นทางระบบยืนยันตัวตน (Login/Register)
      .use(menuRoutes)       // เส้นทางจัดการเมนูอาหาร
      .use(restaurantRoutes) // เส้นทางจัดการข้อมูลร้านค้าและออเดอร์ในครัว
      .use(customerRoutes)   // เส้นทางสำหรับฝั่งลูกค้า (สั่งอาหาร ตรวจสอบคิว)
      .use(paymentRoutes)    // เส้นทางระบบชำระเงิน (พร้อมเพย์ / สแกนสลิป)
      .use(realtimeRoutes)   // เส้นทาง Realtime SSE / WebSockets
      .use(ttsRoutes)        // เส้นทาง Text-to-Speech (เสียงเรียกคิว)
  );

// เริ่มต้นเปิดรับการเชื่อมต่อที่พอร์ตที่กำหนด (ค่าเริ่มต้น 8008)
app.listen(process.env.PORT || 8008);

console.log(` CrepeQ API is running at ${app.server?.hostname}:${app.server?.port} (Database: MySQL / Prisma)`);

/**
 * ฟังก์ชันสร้างข้อมูลร้านค้าและผู้จัดการเริ่มต้นอัตโนมัติหากฐานข้อมูลยังว่างเปล่า
 */
async function ensureDefaultShop() {
  try {
    let restaurant = await prisma.restaurant_data.findFirst();
    if (!restaurant) {
      restaurant = await prisma.restaurant_data.create({
        data: {
          restaurant_name: "ร้านเครป CrepeQ",
          restaurant_desc: "ร้านเครปแสนอร่อย สั่งล่วงหน้าผ่านคิวเรียลไทม์",
          restaurant_phone: "0812345678",
          restaurant_address: "123 ถนนสุขุมวิท กรุงเทพฯ",
          restaurant_primary_theme: "#E11D48",
          restaurant_secondary_theme: "#F59E0B",
          is_open: true,
        },
      });
      console.log(" Auto-created default CrepeQ shop record");
    }

    const userCount = await prisma.restaurant_users.count();
    if (userCount === 0 && restaurant) {
      const { hashPassword } = await import("./libs/password");
      const defaultHash = await hashPassword("admin123");
      await prisma.restaurant_users.create({
        data: {
          username: "admin",
          email: "admin@crepeq.com",
          passwordHash: defaultHash,
          fname: "ผู้จัดการ",
          lname: "ร้านเครป",
          phone: "0812345678",
          role: "owner",
          restaurantId: restaurant.res_id,
        },
      });
      console.log(" Auto-created default shop owner (username: admin, password: admin123)");
    }

    const categoryCount = await prisma.menu_categories.count();
    if (categoryCount === 0 && restaurant) {
      await prisma.menu_categories.createMany({
        data: [
          { category_name: "เครปหวาน", category_order: 1, restaurantId: restaurant.res_id },
          { category_name: "เครปคาว", category_order: 2, restaurantId: restaurant.res_id },
          { category_name: "เครื่องดื่ม", category_order: 3, restaurantId: restaurant.res_id },
        ],
      });
      console.log(" Auto-created default crepe menu categories");
    }
  } catch (e: any) {
    console.warn("️ Warning checking default shop setup:", e?.message || e);
  }
}

// เรียกใช้งานการตรวจสอบข้อมูลตั้งต้น
ensureDefaultShop();
