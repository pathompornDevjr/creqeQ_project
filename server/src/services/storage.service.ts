/**
 * Local File Storage Service
 * ให้บริการบันทึก จัดการ และลบไฟล์รูปภาพบนเครื่องเซิร์ฟเวอร์ (โฟลเดอร์ uploads/)
 * แบ่งโครงสร้างโฟลเดอร์ย่อย: menus, shops, qrcodes, slips, general
 * มีการตรวจสอบความปลอดภัยของขนาดไฟล์ (สูงสุด 5MB), ชนิดไฟล์รูปภาพ (JPG, PNG, WEBP, SVG, GIF) และป้องกัน Path Traversal
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";

// กำหนดตำแหน่งโฟลเดอร์จัดเก็บไฟล์ Uploads หลัก
const UPLOADS_ROOT = resolve(process.cwd(), "uploads");
const SUB_FOLDERS = ["menus", "shops", "qrcodes", "slips", "general"];

// สร้างโฟลเดอร์หลักและโฟลเดอร์ย่อยหากยังไม่มี
for (const folder of ["", ...SUB_FOLDERS]) {
  const dirPath = folder ? join(UPLOADS_ROOT, folder) : UPLOADS_ROOT;
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * ผลลัพธ์ที่ได้จากการอัปโหลดไฟล์
 */
export interface UploadResult {
  fileId: string;      // ชื่อไฟล์ที่บันทึก
  directUrl: string;   // URL ฉบับเต็มสำหรับเข้าถึงไฟล์ผ่าน HTTP
  webViewLink: string; // ลิงก์สำหรับแสดงผล
  path: string;        // Path สัมบูรณ์บนระบบไฟล์เครื่องเซิร์ฟเวอร์
  relativeUrl: string; // URL สัมพัทธ์ (เช่น /uploads/menus/...)
}

export class StorageService {
  /**
   * ดึง Base URL สาธารณะของเซิร์ฟเวอร์สำหรับสร้าง URL รูปภาพ
   */
  static getServerBaseUrl(): string {
    const customUrl = process.env.SERVER_URL || process.env.BACKEND_URL;
    if (customUrl) {
      return customUrl.replace(/\/+$/, "");
    }
    const port = process.env.PORT || 8008;
    return `http://localhost:${port}`;
  }

  /**
   * ตรวจหาและดึงนามสกุลไฟล์จาก MIME type หรือชื่อไฟล์เดิม
   */
  private static getExtension(mimeType?: string, fileName?: string): string {
    if (mimeType) {
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
      if (mimeType.includes("png")) return ".png";
      if (mimeType.includes("webp")) return ".webp";
      if (mimeType.includes("gif")) return ".gif";
      if (mimeType.includes("svg")) return ".svg";
    }
    if (fileName && fileName.includes(".")) {
      const ext = fileName.substring(fileName.lastIndexOf("."));
      if (ext.length <= 5) return ext;
    }
    return ".png";
  }

  /**
   * ฟังก์ชันหลักสำหรับอัปโหลดและบันทึกรูปภาพลง Local Storage
   * 
   * @param fileData ข้อมูลไฟล์แบบ Buffer หรือ Base64 Data URI
   * @param fileName ชื่อไฟล์ตั้งต้น (ถ้ามี)
   * @param mimeType ชนิดของไฟล์
   * @param subFolder โฟลเดอร์ย่อยปลายทาง (menus, shops, qrcodes, slips, general)
   * @returns UploadResult ข้อมูล URL และ Path ของไฟล์ที่บันทึก
   */
  static async uploadImage(
    fileData: Buffer | string,
    fileName?: string,
    mimeType: string = "image/png",
    subFolder: string = "general"
  ): Promise<UploadResult> {
    const targetFolder = SUB_FOLDERS.includes(subFolder) ? subFolder : "general";
    const targetDir = join(UPLOADS_ROOT, targetFolder);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    let buffer: Buffer;
    let detectedMime = mimeType;

    // แปลง Base64 หรือ Data URI เป็น Buffer
    if (typeof fileData === "string") {
      if (fileData.startsWith("data:")) {
        const matches = fileData.match(/^data:([A-Za-z-+\/0-9.]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          detectedMime = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(fileData, "base64");
        }
      } else {
        buffer = Buffer.from(fileData, "base64");
      }
    } else if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else {
      buffer = Buffer.from(fileData as any);
    }

    // ตรวจสอบขนาดไฟล์ (จำกัดสูงสุด 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("ขนาดไฟล์รูปภาพเกินกำหนด (สูงสุดไม่เกิน 5MB)");
    }

    // ตรวจสอบนามสกุลไฟล์ที่อนุญาต
    const ext = this.getExtension(detectedMime, fileName);
    const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"];
    if (!ALLOWED_EXTENSIONS.includes(ext.toLowerCase())) {
      throw new Error("ชนิดไฟล์ไม่ถูกต้อง อนุญาตเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, SVG, GIF)");
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกันด้วย Timestamp และ Random String
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sanitizedName = fileName
      ? fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^/.]+$/, "")
      : "file";
    const finalFileName = `${sanitizedName}_${uniqueId}${ext}`;

    const filePath = join(targetDir, finalFileName);
    writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${targetFolder}/${finalFileName}`;
    const baseUrl = this.getServerBaseUrl();
    const directUrl = `${baseUrl}${relativeUrl}`;

    console.log(`[StorageService] 📁 Saved image to: ${filePath}`);
    console.log(`[StorageService] 🔗 Direct URL: ${directUrl}`);

    return {
      fileId: finalFileName,
      directUrl,
      webViewLink: directUrl,
      path: filePath,
      relativeUrl,
    };
  }

  /** อัปโหลดรูปภาพเมนูอาหารไปยัง /uploads/menus/ */
  static async uploadShopImage(
    fileData: Buffer | string,
    fileName: string = `menu_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<UploadResult> {
    return this.uploadImage(fileData, fileName, mimeType, "menus");
  }

  /** อัปโหลดรูปภาพ QR Code พร้อมเพย์ไปยัง /uploads/qrcodes/ */
  static async uploadQrPaymentImage(
    fileData: Buffer | string,
    fileName: string = `qr_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<UploadResult> {
    return this.uploadImage(fileData, fileName, mimeType, "qrcodes");
  }

  /** อัปโหลดรูปภาพสลิปโอนเงินไปยัง /uploads/slips/ */
  static async uploadSlipImage(
    fileData: Buffer | string,
    fileName: string = `slip_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<UploadResult> {
    return this.uploadImage(fileData, fileName, mimeType, "slips");
  }

  /** อัปโหลดรูปภาพโปรไฟล์ร้านค้า (Logo, Cover Banner) ไปยัง /uploads/shops/ */
  static async uploadShopProfileImage(
    fileData: Buffer | string,
    fileName: string = `shop_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<UploadResult> {
    return this.uploadImage(fileData, fileName, mimeType, "shops");
  }

  /**
   * ลบไฟล์รูปภาพออกจาก Local Storage ป้องกันการโจมตี Directory Traversal
   * 
   * @param fileIdOrUrl URL หรือชื่อไฟล์ที่ต้องการลบ
   * @returns true เมื่อลบสำเร็จ, false หากไม่พบหรือไม่สามารถลบได้
   */
  static async deleteFile(fileIdOrUrl: string): Promise<boolean> {
    if (!fileIdOrUrl) return false;

    try {
      let relativePath = "";

      if (fileIdOrUrl.includes("/uploads/")) {
        relativePath = fileIdOrUrl.substring(fileIdOrUrl.indexOf("/uploads/") + "/uploads/".length);
      } else if (fileIdOrUrl.startsWith("uploads/")) {
        relativePath = fileIdOrUrl.substring("uploads/".length);
      } else {
        // ค้นหาในโฟลเดอร์ย่อยตามชื่อไฟล์
        for (const sub of SUB_FOLDERS) {
          const candidate = join(UPLOADS_ROOT, sub, fileIdOrUrl);
          if (existsSync(candidate)) {
            unlinkSync(candidate);
            console.log(`[StorageService] 🗑️ Deleted file: ${candidate}`);
            return true;
          }
        }
        return false;
      }

      const fullPath = resolve(UPLOADS_ROOT, relativePath);
      // ตรวจสอบความปลอดภัย: ป้องกันไม่ให้ออกนอกโฟลเดอร์ UPLOADS_ROOT
      if (!fullPath.startsWith(UPLOADS_ROOT)) {
        console.warn(`[StorageService] ⚠️ Security attempt to access outside uploads: ${fullPath}`);
        return false;
      }

      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        console.log(`[StorageService] 🗑️ Deleted file: ${fullPath}`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn(`[StorageService] ⚠️ Error deleting file "${fileIdOrUrl}":`, err?.message || err);
      return false;
    }
  }
}
