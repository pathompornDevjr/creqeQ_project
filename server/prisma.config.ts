/**
 * ไฟล์การตั้งค่า Prisma CLI Configuration
 * ทำหน้าที่กำหนดที่ตั้ง Schema, โฟลเดอร์ Migration และโหลด Database URL จาก .env หรือ .env.local
 */

import dotenv from "dotenv";
// โหลดค่า Environment จากไฟล์ .env.local และ .env เพื่อให้ Prisma CLI ใช้งานได้ถูกต้อง
dotenv.config({ path: [".env.local", ".env"] });
import { defineConfig } from "prisma/config";

export default defineConfig({
  // กำหนดตำแหน่งไฟล์ Schema หลักของ Prisma
  schema: "prisma/schema.prisma",
  // กำหนดตำแหน่งจัดเก็บประวัติ Database Migrations
  migrations: {
    path: "prisma/migrations",
  },
  // กำหนดการตั้งค่าการเชื่อมต่อฐานข้อมูล
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
