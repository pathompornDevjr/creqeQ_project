/**
 * Google Auth Service
 * จัดการยืนยันตัวตนกับ Google Cloud ผ่าน Service Account สำหรับเชื่อมต่อ Google Drive API
 */

import { GoogleAuth } from "google-auth-library";

// ตัวแปรแคช Singleton Instance ของ GoogleAuth
let authInstance: GoogleAuth | null = null;

/**
 * ดึง GoogleAuth Client Instance ที่พร้อมใช้งาน
 * 
 * @returns GoogleAuth Instance ที่ผูกกับ Service Account Credentials
 */
export function getGoogleAuth(): GoogleAuth {
  if (!authInstance) {
    authInstance = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/drive", // ขอบเขตสิทธิ์การเข้าถึง Google Drive
      ],
    });
  }

  return authInstance;
}
