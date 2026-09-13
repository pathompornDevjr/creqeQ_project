/**
 * การตั้งค่าและสร้าง Prisma Client Instance สำหรับเชื่อมต่อกับฐานข้อมูล MariaDB / MySQL
 * รองรับการทำงานร่วมกับ Bun runtime และการเชื่อมต่อผ่าน SSL/Cloud Databases (TiDB, Aiven ฯลฯ)
 */

import "dotenv/config";
import tls from "tls";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma";

/**
 * Patch แก้ปัญหา Bun บน Windows:
 * แก้ไขกรณี TLS Socket getPeerCertificate ไม่มีค่า fingerprint256 ซึ่งไดรเวอร์ mariadb จำเป็นต้องใช้
 */
if (typeof tls !== "undefined" && tls.TLSSocket?.prototype) {
  const origGetPeerCert = (tls.TLSSocket.prototype as any).getPeerCertificate;
  if (typeof origGetPeerCert === "function") {
    (tls.TLSSocket.prototype as any).getPeerCertificate = function(detailed?: boolean) {
      const cert = origGetPeerCert.call(this, detailed);
      if (cert && !cert.fingerprint256) {
        // กำหนด Mock fingerprint256 เพื่อป้องกัน Driver Error ในกรณีเชื่อมต่อแบบ SSL
        cert.fingerprint256 = "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";
      }
      return cert;
    };
  }
}

/**
 * ฟังก์ชันแยกและแปลงค่า DATABASE_URL เป็น Connection Config สำหรับ MariaDB Driver
 * รองรับทั้ง Local MySQL และ Cloud Database ที่ต้องเปิดใช้งาน SSL (เช่น TiDB Cloud, Aiven Cloud)
 * 
 * @returns ออบเจกต์การตั้งค่า Connection Pool ของ MariaDB Driver
 */
function getDatabaseConfig() {
  const rawUrl = process.env.DATABASE_URL || "mysql://root:12345678@127.0.0.1:3306/qrshop";
  try {
    const url = new URL(rawUrl.replace(/^mariadb:\/\//, "mysql://"));
    // ตรวจสอบว่าต้องเปิดใช้งานการเชื่อมต่อแบบเข้ารหัส SSL หรือไม่
    const isSsl = url.searchParams.has("sslaccept") || url.searchParams.has("ssl") || url.hostname.includes("tidbcloud.com") || url.hostname.includes("aivencloud.com");
    return {
      host: url.hostname === "localhost" ? "127.0.0.1" : (url.hostname || "127.0.0.1"),
      port: url.port ? parseInt(url.port) : 3306,
      user: decodeURIComponent(url.username || "root"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "qrshop",
      // กำหนดค่า SSL หากเป็นการเชื่อมต่อ Cloud Database
      ssl: isSsl ? {
        checkServerIdentity: () => undefined,
        rejectUnauthorized: false,
      } : undefined,
      connectionLimit: 15,  // จำนวน Connection สูงสุดใน Pool
      idleTimeout: 30000,    // เวลาหมดอายุของ Connection ที่ไม่ได้ใช้งาน (ms)
      connectTimeout: 10000, // เวลา Timeout ในการเชื่อมต่อเริ่มต้น (ms)
      acquireTimeout: 10000, // เวลา Timeout ในการดึง Connection จาก Pool (ms)
    };
  } catch {
    // กรณีที่ Parse URL ล้มเหลว ให้ใช้ค่า Fallback ค่าเริ่มต้นสำหรับ Local Development
    return {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "12345678",
      database: "crape_shop",
      connectionLimit: 15,
      idleTimeout: 30000,
      connectTimeout: 10000,
      acquireTimeout: 10000,
    };
  }
}

// สร้าง Adapter สำหรับเชื่อมต่อ Prisma เข้ากับ MariaDB Driver
const adapter = new PrismaMariaDb(getDatabaseConfig());

// สร้าง PrismaClient Instance หลักของโปรเจกต์
const prisma = new PrismaClient({
  adapter,
  // แสดง Log คำสั่ง SQL เฉพาะโหมด Development หรือแสดงเฉพาะ Error ใน Production
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;