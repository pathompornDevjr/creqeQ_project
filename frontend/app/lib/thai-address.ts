/**
 * =========================================================================================
 * @file thai-address.ts
 * @description ยูทิลิตี้สำหรับแยกและแปลงข้อมูลที่อยู่ภาษาไทย (Thai Address Parser)
 * 
 * หน้าที่หลัก:
 * - แยกส่วนประกอบที่อยู่: เลขที่/ถนน, ตำบล/แขวง, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์
 * - รองรับทั้งกรณีข้อมูลเก็บเป็น JSON string และข้อความที่อยู่ดิบ (Raw Thai String)
 * - มีฐานข้อมูลรายชื่อ 77 จังหวัดของประเทศไทยเพื่อการจับคู่ที่แม่นยำ
 * =========================================================================================
 */

/**
 * โครงสร้างข้อมูลที่อยู่ภาษาไทยที่แยกส่วนเรียบร้อยแล้ว
 */
export interface ParsedThaiAddress {
  /** ข้อความที่อยู่เต็ม */
  address: string;
  /** รายละเอียดที่อยู่ (บ้านเลขที่, ซอย, ถนน, หมู่บ้าน) */
  addressDetail: string;
  /** ตำบล / แขวง */
  subDistrict: string;
  /** อำเภอ / เขต */
  district: string;
  /** จังหวัด */
  province: string;
  /** รหัสไปรษณีย์ 5 หลัก */
  zipCode: string;
}

/** รายชื่อจังหวัด 77 จังหวัดในประเทศไทย */
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
 * วิเคราะห์และแยกส่วนที่อยู่ภาษาไทยจากสตริงดิบหรือ JSON
 * @param rawAddress ข้อความที่อยู่ดิบ
 * @returns ออบเจกต์ ParsedThaiAddress
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

  // 1. ตรวจสอบกรณีข้อมูลถูกเก็บในรูปแบบ JSON
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
        if (addr) {
          return parseRawThaiAddressString(addr);
        }
      }
    } catch {
      // ไม่ใช่ JSON ที่ถูกต้อง ดำเนินการต่อด้วยตัวแยกข้อความดิบ
    }
  }

  return parseRawThaiAddressString(trimmed);
}

/**
 * แยกส่วนประกอบที่อยู่ภาษาไทยจากข้อความดิบด้วย Regular Expressions
 * @param raw ข้อความที่อยู่ภาษาไทย
 */
function parseRawThaiAddressString(raw: string): ParsedThaiAddress {
  let text = raw.trim();
  let zipCode = "";
  let province = "";
  let district = "";
  let subDistrict = "";

  // 1. ดึงรหัสไปรษณีย์ 5 หลัก
  const zipMatch = text.match(/\b(\d{5})\b/);
  if (zipMatch) {
    zipCode = zipMatch[1];
    text = text.replace(zipMatch[0], " ").trim();
  }

  // 2. ดึงจังหวัด (ตรวจสอบทั้งแบบมีคำนำหน้า "จังหวัด/จ." และตรวจสอบกับรายชื่อจังหวัด)
  const provExplicitMatch = text.match(/(?:จังหวัด|จ\.)\s*([ก-๙]+)/);
  if (provExplicitMatch) {
    province = provExplicitMatch[1].trim();
    text = text.replace(provExplicitMatch[0], " ").trim();
  } else {
    // ค้นหาชื่อจังหวัดที่ยาวที่สุดก่อนเพื่อป้องกันการ match ซ้ำซ้อน
    const sortedProvinces = [...THAI_PROVINCES].sort((a, b) => b.length - a.length);
    for (const p of sortedProvinces) {
      const regex = new RegExp(`(?:\\s|^)${p}(?:\\s|$)`, "u");
      if (regex.test(text)) {
        province = p === "กทม" || p === "กรุงเทพฯ" ? "กรุงเทพมหานคร" : p;
        text = text.replace(new RegExp(`${p}`, "u"), " ").trim();
        break;
      }
    }
  }

  // 3. ดึงอำเภอ / เขต (อำเภอ / เขต / อ.)
  const distMatch = text.match(/(?:อำเภอ|เขต|อ\.)\s*([ก-๙]+(?:\s+[ก-๙]+)?)/);
  if (distMatch) {
    district = distMatch[0].trim();
    text = text.replace(distMatch[0], " ").trim();
  }

  // 4. ดึงตำบล / แขวง (ตำบล / แขวง / ต. / เทศบาล)
  const subMatch = text.match(/(?:เทศบาล(?:นคร|เมือง|ตำบล)\s*[ก-๙]+|ตำบล\s*[ก-๙]+|แขวง\s*[ก-๙]+|ต\.\s*[ก-๙]+)/);
  if (subMatch) {
    subDistrict = subMatch[0].trim();
    text = text.replace(subMatch[0], " ").trim();
  }

  // ส่วนข้อความที่เหลือคือรายละเอียดบ้านเลขที่ ซอย ถนน
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
