/**
 * สัญญาระบบยืนยันตัวตน (Authentication Repository Interfaces & DTOs)
 * กำหนดโครงสร้างข้อมูลสำหรับการลงทะเบียนร้านค้าใหม่, การเข้าสู่ระบบ และการตรวจสอบอีเมล
 */

/**
 * โครงสร้างข้อมูลสำหรับลงทะเบียนร้านค้าใหม่ (Register DTO)
 */
export interface RegisterDTO {
  // ข้อมูลส่วนตัวของผู้ใช้งาน (เจ้าของร้าน)
  titlePrefix?: string;   // คำนำหน้าชื่อ (นาย, นาง, นางสาว ฯลฯ)
  firstName: string;      // ชื่อจริง
  lastName: string;       // นามสกุล
  phone: string;          // เบอร์โทรศัพท์สำหรับติดต่อ
  email: string;          // อีเมลใช้งาน (ใช้เป็นชื่อผู้ใช้ในการ Login)
  password?: string;      // รหัสผ่าน
  facebook?: string;      // ลิงก์หรือชื่อ Facebook
  lineId?: string;        // Line ID

  // ข้อมูลรายละเอียดร้านค้า
  restaurantName: string; // ชื่อร้านค้า
  description?: string;   // คำอธิบายร้านค้า
  address?: string;       // ที่อยู่รวม
  addressDetail?: string; // ที่อยู่รายละเอียด (เลขที่ ซอย ถนน)
  province?: string;      // จังหวัด
  district?: string;      // อำเภอ/เขต
  subdistrict?: string;   // ตำบล/แขวง
  postalCode?: string;    // รหัสไปรษณีย์
  latitude?: number | string;  // พิกัดละติจูด
  longitude?: number | string; // พิกัดลองจิจูด

  // แพ็กเกจการใช้งานและการชำระเงินค่าบริการ
  plan?: string;          // แพ็กเกจที่เลือก (เช่น starter, pro, trial)
  slipImage?: string;     // URL หรือ Base64 ของสลิปการโอนเงินค่าแพ็กเกจ
}

/**
 * โครงสร้างข้อมูลสำหรับการเข้าสู่ระบบ (Login DTO)
 */
export interface LoginDTO {
  emailOrPhone: string;   // อีเมลหรือเบอร์โทรศัพท์ของผู้ใช้งาน
  password?: string;      // รหัสผ่านเข้าสู่ระบบ
}

/**
 * ผลลัพธ์ที่ส่งกลับหลังจากการยืนยันตัวตนสำเร็จ (Auth Result DTO)
 */
export interface AuthResultDTO {
  // ข้อมูลผู้ใช้งานที่ผ่านการยืนยันตัวตน
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    role: string;
    restaurantId?: number;
  };
  // ข้อมูลร้านค้าที่เป็นเจ้าของหรือสังกัดอยู่
  restaurant?: {
    id: string | number;
    res_id: number;
    name: string;
    phone?: string;
    address?: string;
    is_open: boolean;
    plan?: string;
  };
  // JWT Token สำหรับใช้แนบกับ Request ครั้งถัดไป
  token?: string;
}

/**
 * Interface สำหรับ Auth Repository
 */
export interface IAuthRepository {
  /**
   * ลงทะเบียนร้านค้าและผู้ใช้งานใหม่เข้าสู่ระบบ
   */
  register(data: RegisterDTO): Promise<AuthResultDTO>;

  /**
   * ตรวจสอบความถูกต้องและเข้าสู่ระบบ
   */
  login(data: LoginDTO): Promise<AuthResultDTO | null>;

  /**
   * ตรวจสอบว่าอีเมลนี้สามารถใช้ลงทะเบียนได้หรือไม่ (ยังไม่มีในระบบ)
   */
  checkEmail(email: string): Promise<{ available: boolean; message?: string }>;
}
