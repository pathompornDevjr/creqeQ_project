/**
 * ไฟล์การตั้งค่า Environment Variables ของ Server (Backend)
 * ทำหน้าที่รวบรวมและ export ตัวแปรสภาพแวดล้อม (Environment Variables) ที่จำเป็นสำหรับเซิร์ฟเวอร์
 */

const envConfig = {
  // พอร์ตที่เซิร์ฟเวอร์จะเปิดรับ Request (ค่าเริ่มต้น 8008 หากไม่ได้กำหนดไว้ใน .env)
  port: process.env.PORT || 8008,

  // อีเมลบัญชีบริการ Google Service Account (ใช้สำหรับเชื่อมต่อ Google Drive / Google APIs)
  google_client_email: process.env.GOOGLE_CLIENT_EMAIL,

  // Private Key ของ Google Service Account (ใช้สำหรับ Authenticate กับ Google Service)
  google_private_key: process.env.GOOGLE_PRIVATE_KEY,

  // URL สำหรับเชื่อมต่อ Upstash Redis REST API (ใช้สำหรับ Cache และ Pub/Sub Realtime)
  redis_url: process.env.UPSTASH_REDIS_REST_URL,

  // Token สำหรับยืนยันตัวตน Upstash Redis REST API
  redis_token: process.env.UPSTASH_REDIS_REST_TOKEN,

  // โดเมน Frontend ที่ได้รับอนุญาตให้เรียกใช้งาน API (CORS Origin)
  client_origin: process.env.NEXT_PUBLIC_ALLOWED_ORIGIN,

  // สถานะเปิด/ปิดร้านเริ่มต้น (ดึงมาจากตัวแปรระบบ)
  isopen: process.env.NEXT_PUBLIC_IS_OPEN,
};

export default envConfig;
