/**
 * โมดูลวิเคราะห์และแยกโครงสร้างที่อยู่ภาษาไทย (Thai Address Parser)
 * ทำหน้าที่แยกข้อความที่อยู่ดิบออกเป็น: ที่อยู่รายละเอียด, ตำบล/แขวง, อำเภอ/เขต, จังหวัด, และรหัสไปรษณีย์
 */

/**
 * โครงสร้างข้อมูลที่อยู่ภาษาไทยที่ผ่านการแยกส่วนประกอบแล้ว
 */
export interface ParsedThaiAddress {
  address: string;        // ที่อยู่ฉบับเต็มเดิม
  addressDetail: string;  // ที่อยู่รายละเอียด (เช่น บ้านเลขที่ หมู่บ้าน ซอย ถนน)
  subDistrict: string;    // ตำบล หรือ แขวง
  district: string;       // อำเภอ หรือ เขต
  province: string;       // จังหวัด
  zipCode: string;        // รหัสไปรษณีย์ 5 หลัก
}

/**
 * รายชื่อ 77 จังหวัดในประเทศไทย สำหรับใช้ตรวจจับคำในข้อความที่อยู่
 */
export const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กรุงเทพฯ", "กทม", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง",
  "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
  "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส",
  "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา", "พัทลุง",
  "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่",
  "พะเยา", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
  "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง", "ระยอง",
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
  "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี",
  "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
  "หนองบัวลำภู", "อ่างทอง", "อุดรธานี", "อุทัยธานี", "อุตรดิตถ์",
  "อุบลราชธานี", "อำนาจเจริญ"
];

/**
 * ฟังก์ชันหลักสำหรับวิเคราะห์และแยกองค์ประกอบที่อยู่ภาษาไทย
 * รองรับทั้งกรณีที่ข้อมูลถูกบันทึกเป็น JSON Object มาก่อน หรือเป็นข้อความ String ธรรมดา
 * 
 * @param rawAddress ข้อความที่อยู่ดิบ หรือ JSON string
 * @returns ออบเจกต์ ParsedThaiAddress ที่แยกข้อมูลแต่ละส่วนเรียบร้อย
 */
export function parseThaiAddress(rawAddress: string | null | undefined): ParsedThaiAddress {
  if (!rawAddress || typeof rawAddress !== "string") {
    return {
      address: "",
      addressDetail: "",
      subDistrict: "",
      district: "",
      province: "",
      zipCode: "",
    };
  }

  const trimmed = rawAddress.trim();

  // 1. ตรวจสอบกรณีที่ข้อมูลถูกเก็บเป็น JSON Object รูปแบบสตริง
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object") {
        const addr = obj.address || obj.addressDetail || "";
        const subDistrict = obj.subDistrict || "";
        const district = obj.district || "";
        const province = obj.province || "";
        const zipCode = obj.zipCode || "";
        const addressDetail = obj.addressDetail || addr || "";

        // หากภายใน JSON มีฟิลด์โครงสร้างอยู่แล้ว ให้ส่งกลับทันที
        if (subDistrict || district || province || zipCode) {
          return {
            address: addr || addressDetail,
            addressDetail,
            subDistrict,
            district,
            province,
            zipCode,
          };
        }
        // หากใน JSON มีแค่สตริง address ให้ส่งไปวิเคราะห์ต่อด้วย Regular Expression
        if (addr) {
          return parseRawThaiAddressString(addr);
        }
      }
    } catch {
      // หากไม่ใช่ JSON ให้ข้ามไปวิเคราะห์แบบ Raw String ปกติ
    }
  }

  return parseRawThaiAddressString(trimmed);
}

/**
 * ฟังก์ชันภายในสำหรับแยกโครงสร้างที่อยู่จากข้อความภาษาไทยธรรมดาโดยใช้ Regular Expressions
 * 
 * @param raw ข้อความที่อยู่ดิบ
 * @returns ออบเจกต์ ParsedThaiAddress
 */
function parseRawThaiAddressString(raw: string): ParsedThaiAddress {
  let text = raw.trim();
  let zipCode = "";
  let province = "";
  let district = "";
  let subDistrict = "";

  // 1. ตรวจจับและดึงรหัสไปรษณีย์ 5 หลัก (มักจะอยู่ท้ายข้อความ)
  const zipMatch = text.match(/\b(\d{5})\b/);
  if (zipMatch) {
    zipCode = zipMatch[1];
    text = text.replace(zipMatch[0], " ").trim();
  }

  // 2. ตรวจจับและดึงจังหวัด
  const provExplicitMatch = text.match(/(?:จังหวัด|จ\.)\s*([ก-๙]+)/);
  if (provExplicitMatch) {
    province = provExplicitMatch[1].trim();
    text = text.replace(provExplicitMatch[0], " ").trim();
  } else {
    // วนลูปเทียบชื่อจังหวัดที่มีในฐานข้อมูล (เรียงจากชื่อยาวไปหาสั้นเพื่อความแม่นยำ)
    const sortedProvinces = [...THAI_PROVINCES].sort((a, b) => b.length - a.length);
    for (const p of sortedProvinces) {
      const regex = new RegExp(`(?:\\s|^)${p}(?:\\s|$)`, "u");
      if (regex.test(text)) {
        // แปลงตัวย่อ กทม หรือ กรุงเทพฯ เป็น กรุงเทพมหานคร
        province = p === "กทม" || p === "กรุงเทพฯ" ? "กรุงเทพมหานคร" : p;
        text = text.replace(new RegExp(`${p}`, "u"), " ").trim();
        break;
      }
    }
  }

  // 3. ตรวจจับและดึงอำเภอ / เขต (คำนำหน้า เช่น อำเภอ, เขต, อ.)
  const distMatch = text.match(/(?:อำเภอ|เขต|อ\.)\s*([ก-๙]+(?:\s+[ก-๙]+)?)/);
  if (distMatch) {
    district = distMatch[0].trim();
    text = text.replace(distMatch[0], " ").trim();
  }

  // 4. ตรวจจับและดึงตำบล / แขวง (คำนำหน้า เช่น ตำบล, แขวง, ต., เทศบาล...)
  const subMatch = text.match(/(?:เทศบาล(?:นคร|เมือง|ตำบล)\s*[ก-๙]+|ตำบล\s*[ก-๙]+|แขวง\s*[ก-๙]+|ต\.\s*[ก-๙]+)/);
  if (subMatch) {
    subDistrict = subMatch[0].trim();
    text = text.replace(subMatch[0], " ").trim();
  }

  // ลบช่องว่างซ้ำซ้อนและเครื่องหมายจุลภาคหัวท้าย เพื่อให้ได้รายละเอียดที่อยู่ (บ้านเลขที่ ซอย ถนน) ที่สะอาด
  const addressDetail = text.replace(/\s+/g, " ").replace(/^,\s*|,\s*$/g, "").trim() || raw.trim();

  return {
    address: raw.trim(),
    addressDetail,
    subDistrict,
    district,
    province,
    zipCode,
  };
}
