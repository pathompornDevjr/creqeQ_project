/**
 * Google Drive Storage & Integration Service
 * บริการสำรอง/อัปโหลดไฟล์รูปภาพไปยัง Google Drive ผ่าน Service Account หรือ Apps Script Webhook
 * รองรับการแยกโฟลเดอร์สำหรับรูปเมนู, รูปสลิป และรูปโปรไฟล์ร้านค้า
 */

import { google } from "googleapis";
import { getGoogleAuth } from "./google-api.service";
import { Readable } from "stream";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

// ตัวแปรแคช Drive Client Instance
let driveClient: any = null;

/** ดึง Google Drive API Client v3 */
function getDriveClient() {
  if (!driveClient) {
    driveClient = google.drive({
      version: "v3",
      auth: getGoogleAuth(),
    });
  }
  return driveClient;
}

/** ดึง Webhook URL ของ Google Apps Script สำหรับอัปโหลด */
function getWebhookUrl(): string {
  const url =
    process.env.GOOGLE_DRIVE_WEBHOOK_URL ||
    process.env.APPS_SCRIPT_UPLOAD_URL ||
    "https://script.google.com/macros/s/AKfycbwrzYlVjwsjurJybdakJTOLyCazrZLcUSxvo9kOPI8Jf3HgVKjrdLv0-eBhmw-zFBR6/exec";
  return url.trim();
}

export class GoogleDriveService {
  /**
   * Helper to extract Google Drive File ID from a URL or raw ID
   */
  static extractFileId(fileIdOrUrl: string): string | null {
    if (!fileIdOrUrl) return null;
    const str = String(fileIdOrUrl).trim();
    if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
      return str;
    }
    // Pattern matches:
    // https://lh3.googleusercontent.com/d/FILE_ID
    // https://lh3.googleusercontent.com/u/0/d/FILE_ID
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/uc?id=FILE_ID
    // https://drive.google.com/open?id=FILE_ID
    const match = str.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }

  /**
   * Uploads a shop/menu image specifically to the GOOGLE_DRIVE_SHOP_IMAGES_ID folder.
   */
  static async uploadShopImage(
    fileData: Buffer | string,
    fileName: string = `menu_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<{ fileId: string; directUrl: string; webViewLink: string }> {
    const shopFolderId =
      process.env.GOOGLE_DRIVE_SHOP_IMAGES_ID ||
      process.env.GOOGLE_DRIVE_FOLDER_ID;
    return this.uploadImage(fileData, fileName, mimeType, shopFolderId);
  }

  /**
   * Uploads a payment / PromptPay QR code image specifically to the GOOGLE_DRIVE_SHOP_QR_PEYMENT_ID folder.
   */
  static async uploadQrPaymentImage(
    fileData: Buffer | string,
    fileName: string = `qr_payment_${Date.now()}.png`,
    mimeType: string = "image/png"
  ): Promise<{ fileId: string; directUrl: string; webViewLink: string }> {
    const qrFolderId =
      process.env.GOOGLE_DRIVE_SHOP_QR_PEYMENT_ID ||
      process.env.GOOGLE_DRIVE_SHOP_QR_PAYMENT_ID ||
      process.env.GOOGLE_DRIVE_SLIP_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_SHOP_IMAGES_ID ||
      process.env.GOOGLE_DRIVE_FOLDER_ID;
    return this.uploadImage(fileData, fileName, mimeType, qrFolderId);
  }

  /**
   * Uploads an image to Google Drive with optional custom folderId.
   * STRICT: Only returns real Google Drive URLs. Never falls back to local disk storage.
   */
  static async uploadImage(
    fileData: Buffer | string,
    fileName: string = `image_${Date.now()}.png`,
    mimeType: string = "image/png",
    customFolderId?: string
  ): Promise<{ fileId: string; directUrl: string; webViewLink: string }> {
    let buffer: Buffer = Buffer.alloc(0);
    let finalMimeType = mimeType;

    if (typeof fileData === "string") {
      if (fileData.startsWith("data:")) {
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          finalMimeType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(fileData, "base64");
        }
      } else if (fileData.startsWith("/") || fileData.startsWith("./") || fileData.includes("uploads/")) {
        // If passed a local file path, read the file so we can migrate it to Google Drive
        const cleanPath = fileData.replace(/^\//, "");
        const possiblePaths = [
          join(process.cwd(), "..", "client", "public", cleanPath),
          join(process.cwd(), "public", cleanPath),
          join(process.cwd(), cleanPath),
        ];
        let loaded = false;
        for (const p of possiblePaths) {
          if (existsSync(p)) {
            buffer = readFileSync(p);
            loaded = true;
            break;
          }
        }
        if (!loaded) {
          buffer = Buffer.from(fileData, "base64");
        }
      } else {
        buffer = Buffer.from(fileData, "base64");
      }
    } else {
      buffer = fileData;
    }

    const folderId =
      customFolderId ||
      process.env.GOOGLE_DRIVE_SHOP_IMAGES_ID ||
      process.env.GOOGLE_DRIVE_SLIP_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_FOLDER_ID;
    const webhookUrl = getWebhookUrl();

    let lastError: any = null;

    // 1. Try Google Apps Script Webhook URL (Recommended for personal Gmail Drive)
    if (webhookUrl) {
      try {
        const base64Data = buffer.toString("base64");
        console.log(`[GoogleDriveService]  Uploading image "${fileName}" (${finalMimeType}) to folder "${folderId}"...`);
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "follow",
          body: JSON.stringify({
            action: "upload_file",
            folderId: folderId || "",
            fileName,
            mimeType: finalMimeType,
            base64Data,
          }),
        });

        const text = await res.text();
        console.log(`[GoogleDriveService]  Webhook Upload HTTP ${res.status}. Response: ${text}`);

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {}

        if (json && json.success && (json.directUrl || json.fileId)) {
          const fileId = json.fileId || `drive_${Date.now()}`;
          const directUrl = json.directUrl || `https://lh3.googleusercontent.com/d/${fileId}`;
          console.log(`[GoogleDriveService]  Successfully uploaded to Google Drive: ${directUrl}`);
          return {
            fileId,
            directUrl,
            webViewLink: json.webViewLink || directUrl,
          };
        } else {
          console.warn(`[GoogleDriveService] ️ Webhook upload returned non-success response:`, json || text);
        }
      } catch (scriptErr: any) {
        lastError = scriptErr;
        console.warn("[GoogleDriveService] ️ Apps script upload error, attempting direct Drive API:", scriptErr.message);
      }
    }

    // 2. Try direct Google Drive API (For Service Account / Shared Drives)
    try {
      const drive = getDriveClient();
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      const fileMetadata: any = {
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {}),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: finalMimeType,
          body: readableStream,
        },
        fields: "id, name, webViewLink, webContentLink",
        supportsAllDrives: true,
      });

      const fileId = response.data.id;
      if (fileId) {
        try {
          await drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "anyone" },
            supportsAllDrives: true,
          });
        } catch {}

        const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

        return { fileId, directUrl, webViewLink };
      }
    } catch (driveErr: any) {
      lastError = driveErr;
      console.error("Google Drive direct upload error:", driveErr.message);
    }

    throw new Error(
      `ไม่สามารถอัปโหลดรูปภาพไปยัง Google Drive ได้: ${lastError?.message || "โปรดตรวจสอบการเชื่อมต่อ Google Drive และสิทธิ์การเข้าถึงโฟลเดอร์"}`
    );
  }

  /**
   * Deletes a file from Google Drive by its fileId or URL.
   */
  static async deleteFile(fileIdOrUrl: string): Promise<boolean> {
    if (!fileIdOrUrl) {
      console.warn("[GoogleDriveService] ️ deleteFile called with empty fileIdOrUrl");
      return false;
    }

    const fileId = this.extractFileId(fileIdOrUrl);
    console.log(`\n========================================`);
    console.log(`[GoogleDriveService] ️ Requesting Google Drive deletion:`);
    console.log(`  - Input: "${fileIdOrUrl}"`);
    console.log(`  - Extracted File ID: "${fileId || 'FAILED_TO_EXTRACT'}"`);
    console.log(`========================================`);

    if (!fileId) {
      console.error(`[GoogleDriveService]  Could not extract a valid Google Drive file ID from: "${fileIdOrUrl}"`);
      return false;
    }

    const webhookUrl = getWebhookUrl();
    const shopFolderId = process.env.GOOGLE_DRIVE_SHOP_IMAGES_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || "";

    // 1. Try via Apps Script Webhook (handles personal Google Drive ownership)
    if (webhookUrl) {
      const actionsToTry = ["delete_file", "delete", "deleteFile", "remove_file"];
      for (const action of actionsToTry) {
        try {
          console.log(`[GoogleDriveService]  [Attempt 1 - Webhook] Trying action="${action}" for fileId="${fileId}"...`);
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            redirect: "follow",
            body: JSON.stringify({
              action,
              fileId,
              id: fileId,
              file_id: fileId,
              url: fileIdOrUrl,
              folderId: shopFolderId,
            }),
          });

          const text = await res.text();
          console.log(`[GoogleDriveService]  Webhook [${action}] HTTP Status: ${res.status}. Response Body: ${text}`);

          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}

          if (json && (json.success === true || json.deleted === true || json.status === "success" || json.status === "ok")) {
            console.log(`[GoogleDriveService]  Successfully deleted file ${fileId} via Webhook (${action})`);
            return true;
          }
        } catch (scriptErr: any) {
          console.warn(`[GoogleDriveService] ️ Webhook exception on action ${action}:`, scriptErr.message);
        }
      }
    } else {
      console.log(`[GoogleDriveService] ️ No GOOGLE_DRIVE_WEBHOOK_URL found in env, skipping Webhook.`);
    }

    // 2. Try direct Google Drive API (Service Account / Shared Drive)
    console.log(`[GoogleDriveService]  [Attempt 2 - Drive API] Calling drive.files.delete for fileId="${fileId}"...`);
    try {
      const drive = getDriveClient();
      await drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });
      console.log(`[GoogleDriveService]  Successfully permanently deleted file ${fileId} via direct Google Drive API`);
      return true;
    } catch (driveErr: any) {
      console.warn(`[GoogleDriveService]  drive.files.delete failed: [HTTP ${driveErr.status || driveErr.code}] ${driveErr.message}`);

      // If permanent delete fails, attempt to move to trash
      console.log(`[GoogleDriveService]  [Attempt 3 - Drive API Trash] Calling drive.files.update (trashed: true) for fileId="${fileId}"...`);
      try {
        const drive = getDriveClient();
        await drive.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
        console.log(`[GoogleDriveService]  Successfully moved file ${fileId} to trash via direct Google Drive API`);
        return true;
      } catch (trashErr: any) {
        console.warn(`[GoogleDriveService]  drive.files.update (trash) failed: [HTTP ${trashErr.status || trashErr.code}] ${trashErr.message}`);
      }
    }

    // 3. Try local file delete if local path
    if (fileIdOrUrl.startsWith("/uploads/")) {
      try {
        const filePath = join(process.cwd(), "..", "client", "public", fileIdOrUrl);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
          console.log(`[GoogleDriveService]  Deleted local file: ${filePath}`);
          return true;
        }
      } catch (err: any) {
        console.warn(`[GoogleDriveService]  Local file delete error:`, err.message);
      }
    }

    console.error(`[GoogleDriveService]  ALL deletion attempts failed for file: ${fileIdOrUrl} (ID: ${fileId})`);
    return false;
  }
}
