/**
 * ฟังก์ชันยูทิลิตี้สำหรับการจัดรูปแบบและปรับมาตรฐานข้อความ (String Formatting & Normalization)
 * เช่น การแปลงเบอร์โทรศัพท์ไทย, หมายเลขพร้อมเพย์, และเลขที่บัญชีธนาคาร
 */

/**
 * ปรับมาตรฐานเบอร์โทรศัพท์ (Normalize Phone Number):
 * - คืนค่าเลข 0 นำหน้ากรณีเบอร์มือถือไทย 9 หลัก (เช่น 6x, 8x, 9x -> 06x, 08x, 09x)
 * - คืนค่าเลข 0 นำหน้ากรณีเบอร์บ้าน 8 หลัก (เช่น 2x, 3x, 4x, 5x, 7x -> 02x, 03x, 04x, 05x, 07x)
 * - ตัดอักขระพิเศษและช่องว่างที่ไม่จำเป็นออก
 * 
 * @param phone เบอร์โทรศัพท์ที่ต้องการจัดรูปแบบ
 * @returns เบอร์โทรศัพท์มาตรฐานที่มีเลข 0 นำหน้าครบถ้วน
 */
export function normalizePhone(phone: any): string {
  if (phone === undefined || phone === null) return "";
  let str = String(phone).trim().replace(/^'+/, "").trim();
  if (!str || str === "-") return "";

  // ดึงเฉพาะตัวเลข 0-9
  const digitsOnly = str.replace(/[^0-9]/g, "");

  // กรณีเบอร์มือถือไทย 9 หลัก (ไม่มี 0 นำหน้า) ให้เติม 0 ด้านหน้าเป็น 10 หลัก
  if (digitsOnly.length === 9 && (digitsOnly.startsWith("6") || digitsOnly.startsWith("8") || digitsOnly.startsWith("9"))) {
    return `0${digitsOnly}`;
  }
  // กรณีเบอร์บ้านไทย 8 หลัก (ไม่มี 0 นำหน้า) ให้เติม 0 ด้านหน้าเป็น 9 หลัก
  if (digitsOnly.length === 8 && ["2", "3", "4", "5", "7"].includes(digitsOnly[0])) {
    return `0${digitsOnly}`;
  }

  // กรณีผู้ใช้กรอกแบบมีขีดคั่น เช่น "81-234-5678" หรือ "89 123 4567"
  if ((str.startsWith("6") || str.startsWith("8") || str.startsWith("9")) && digitsOnly.length === 9) {
    return `0${str}`;
  }

  return str;
}

/**
 * ปรับมาตรฐานหมายเลขพร้อมเพย์ (Normalize PromptPay):
 * - รองรับเบอร์มือถือ 10 หลัก หรือ เลขประจำตัวประชาชน/เลขนิติบุคคล 13 หลัก
 * 
 * @param promptPay หมายเลขพร้อมเพย์ที่ต้องการจัดรูปแบบ
 * @returns หมายเลขพร้อมเพย์ที่ถูกจัดมาตรฐานแล้ว
 */
export function normalizePromptPay(promptPay: any): string {
  if (promptPay === undefined || promptPay === null) return "";
  let str = String(promptPay).trim().replace(/^'+/, "").trim();
  if (!str || str === "-") return "";

  const digitsOnly = str.replace(/[^0-9]/g, "");
  // กรณีเบอร์มือถือพร้อมเพย์ 9 หลัก ให้เติม 0 ด้านหน้า
  if (digitsOnly.length === 9 && (digitsOnly.startsWith("6") || digitsOnly.startsWith("8") || digitsOnly.startsWith("9"))) {
    return `0${digitsOnly}`;
  }
  return str;
}

/**
 * ปรับมาตรฐานเลขบัญชีธนาคาร (Normalize Bank Account Number)
 * 
 * @param accountNumber เลขบัญชีธนาคาร
 * @returns สตริงเลขบัญชีที่ตัดอักขระแปลกปลอมออก
 */
export function normalizeBankAccount(accountNumber: any): string {
  if (accountNumber === undefined || accountNumber === null) return "";
  let str = String(accountNumber).trim().replace(/^'+/, "").trim();
  if (!str || str === "-") return "";
  return str;
}
