/**
 * =========================================================================================
 * @file utils.ts
 * @description รวบรวมฟังก์ชันยูทิลิตี้ส่วนกลางสำหรับ Frontend
 * 
 * หน้าที่หลัก:
 * - ฟังก์ชันจัดการ ClassName Tailwind (cn)
 * - ฟอร์แมตราคา (บาท), เวลา, วันที่ และข้อความแสดงคิว
 * - แปลงลิงก์ Google Drive เป็น Direct Image / Thumbnail URL
 * - ฟอร์แมตหมายเลขโต๊ะ, เบอร์โทรศัพท์ และเลขบัญชี/พร้อมเพย์
 * - สกัดและแจกแจงรายละเอียดไส้เครปและแป้งเครป (parseCrepeDetails)
 * - สร้างสตริง PromptPay QR Code EMVCo ตามมาตรฐาน Thai QR Payment
 * =========================================================================================
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * รวม classNames ของ Tailwind CSS โดยจัดการ class ที่ขัดแย้งกันอย่างชาญฉลาด
 * @param inputs รายการ class ที่ส่งเข้ามา
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ฟอร์แมตจำนวนเงินเป็นสกุลเงินบาทไทย (เช่น "฿150" หรือ "150 บาท")
 * @param amount จำนวนเงิน
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * ฟอร์แมตเวลาในรูปแบบ HH:mm (ภาษาไทย)
 * @param date วันที่หรือสตริงวันที่
 */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * คำนวณและแสดงเวลาสัมพัทธ์ (Relative Time) เช่น "เพิ่งสั่ง", "5 นาทีที่แล้ว", "2 ชม. ที่แล้ว"
 * @param date วันที่หรือสตริงวันที่
 */
export function getRelativeTime(date: Date | string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "เพิ่งสั่ง";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  return `${Math.floor(minutes / 60)} ชม. ที่แล้ว`;
}

/**
 * ฟอร์แมตวันที่เป็นข้อความวันที่ภาษาไทย เช่น "วันนี้", "เมื่อวาน", "10 ก.ย.", "10 ก.ย. 69"
 * @param createdAt วันที่สร้างออเดอร์
 */
export function formatQueueDayLabel(createdAt?: string | Date | number | null): string {
  if (!createdAt) return "วันนี้";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "วันนี้";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "วันนี้";
  } else if (diffDays === 1) {
    return "เมื่อวาน";
  } else if (diffDays === -1) {
    return "พรุ่งนี้";
  } else {
    const isSameYear = today.getFullYear() === target.getFullYear();
    const day = target.getDate();
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const month = monthNames[target.getMonth()];
    if (isSameYear) {
      return `${day} ${month}`;
    }
    const yearThai = (target.getFullYear() + 543) % 100;
    return `${day} ${month} ${yearThai}`;
  }
}

/**
 * สร้างข้อความ Badge ประจำวันของคิว เช่น "คิวที่ 3 ของวันนี้", "คิวที่ 3 ของเมื่อวาน"
 * @param dailyQueueIndex ลำดับคิวประจำวัน
 * @param createdAt วันที่สร้างออเดอร์
 */
export function formatQueueDayBadge(dailyQueueIndex?: number | null, createdAt?: string | Date | number | null): string | null {
  const dayLabel = formatQueueDayLabel(createdAt);

  if (dailyQueueIndex) {
    if (dayLabel === "วันนี้") {
      return `คิวที่ ${dailyQueueIndex} ของวันนี้`;
    } else if (dayLabel === "เมื่อวาน") {
      return `คิวที่ ${dailyQueueIndex} ของเมื่อวาน`;
    } else {
      return `คิวที่ ${dailyQueueIndex} (วันที่ ${dayLabel})`;
    }
  }

  if (dayLabel !== "วันนี้") {
    return `คิวของ${dayLabel}`;
  }

  return null;
}

/**
 * แปลง Google Drive URL ทุกรูปแบบให้เป็น Direct Image URL ที่พร้อมแสดงผล
 * @param url ลิงก์ Google Drive
 */
export function formatDriveImageUrl(url?: string): string {
  if (!url) return "";
  const str = String(url).trim();
  if (!str || str === "null" || str === "undefined" || str === '""' || str === "''" || str === "none" || str === "{}" || str === "[]") {
    return "";
  }
  if (str.startsWith("data:") || str.startsWith("blob:") || str.startsWith("/")) {
    return str;
  }
  const match = str.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) {
    const fileId = match[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(str)) {
    return `https://lh3.googleusercontent.com/d/${str}`;
  }
  return str;
}

/**
 * แปลงลิงก์รูปภาพ Google Drive เป็น Thumbnail URL ขนาดกะทัดรัด (w1000)
 * @param url ลิงก์ Google Drive
 */
export function getDriveThumbnailUrl(url?: string): string {
  if (!url) return "";
  const str = String(url).trim();
  if (str.startsWith("data:") || str.startsWith("blob:") || str.startsWith("/")) {
    return str;
  }
  const match = str.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return formatDriveImageUrl(url);
}

/**
 * ฟอร์แมตชื่อหรือหมายเลขโต๊ะสำหรับแสดงผลแก่ลูกค้า (ซ่อน table_token หรือ UUID ภายใน)
 * @param nameOrToken ชื่อโต๊ะ, หมายเลขโต๊ะ หรือโทเคน
 */
export function getFriendlyTableLabel(nameOrToken?: string | number): string {
  if (nameOrToken === undefined || nameOrToken === null || nameOrToken === "") return "โต๊ะอาหาร";
  const trimmed = String(nameOrToken).trim();
  const lower = trimmed.toLowerCase();

  // ป้องกันการแสดง Token, UUID หรือ Hash ภายในต่อหน้าลูกค้า
  if (
    lower.startsWith("tbl_") ||
    lower.startsWith("tbl-") ||
    lower.startsWith("table-tbl") ||
    lower.includes("token") ||
    lower.includes("table_token") ||
    (trimmed.length > 15 && !trimmed.includes(" "))
  ) {
    return "โต๊ะอาหาร";
  }

  // ตัดคำนำหน้า table- หรือ โต๊ะ
  let clean = trimmed
    .replace(/^table[-_]?/i, "")
    .replace(/^โต๊ะ\s*[-_]?\s*/i, "")
    .trim();

  // หากเป็นตัวเลข เช่น "01" แปลงเป็น "1"
  if (/^\d+$/.test(clean)) {
    clean = String(parseInt(clean, 10));
  } else {
    clean = clean.replace(/[-_]/g, " ").trim();
  }
  return `โต๊ะ ${clean}`;
}

/**
 * ดึงเฉพาะหมายเลขโต๊ะแบบสะอาด (เช่น "1", "A2")
 * @param nameOrToken ชื่อหรือโทเคนโต๊ะ
 */
export function getCleanTableNumber(nameOrToken?: string | number): string {
  const full = getFriendlyTableLabel(nameOrToken);
  const clean = full.replace(/^โต๊ะ\s*/i, "").trim();
  if (!clean || clean === "อาหาร") return "T";
  return clean;
}

/**
 * คำนวณระยะห่างระหว่างพิกัด GPS สองจุด (หน่วยกิโลเมตร) ด้วยสูตร Haversine
 * @param lat1 ละติจูดจุดที่ 1
 * @param lon1 ลองจิจูดจุดที่ 1
 * @param lat2 ละติจูดจุดที่ 2
 * @param lon2 ลองจิจูดจุดที่ 2
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // รัศมีโลกเฉลี่ยในหน่วยกิโลเมตร
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ฟอร์แมตเบอร์โทรศัพท์สำหรับแสดงผล (เติม 0 นำหน้า และใส่เครื่องหมายขีด - เช่น 081-234-5678)
 * @param phone เบอร์โทรศัพท์ดิบ
 */
export function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return "";
  let clean = String(phone).trim().replace(/^'+/, "").trim();
  if (!clean || clean === "-") return "";

  const digits = clean.replace(/[^0-9]/g, "");
  // เบอร์มือถือไทย 9 หลัก (ขาด 0 นำหน้า)
  if (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("8") || digits.startsWith("9"))) {
    clean = `0${digits}`;
  } else if (digits.length === 8 && ["2", "3", "4", "5", "7"].includes(digits[0])) {
    clean = `0${digits}`;
  }

  // ฟอร์แมต 10 หลัก: 0xx-xxx-xxxx
  if (clean.length === 10 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  // ฟอร์แมต 9 หลัก: 0x-xxx-xxxx
  if (clean.length === 9 && /^\d+$/.test(clean) && clean.startsWith("0")) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  }

  return clean;
}

/**
 * แปลงหมายเลขบัญชีหรือเบอร์พร้อมเพย์ให้ถูกต้อง (เติม 0 นำหน้าหากถูกตัด)
 * @param acc เลขบัญชีหรือเบอร์พร้อมเพย์
 */
export function normalizeDisplayAccount(acc?: string | null): string {
  if (!acc) return "";
  let clean = String(acc).trim().replace(/^'+/, "").trim();
  if (!clean || clean === "-") return "";

  const digits = clean.replace(/[^0-9]/g, "");
  if (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("8") || digits.startsWith("9"))) {
    return `0${digits}`;
  }
  return clean;
}

/**
 * ทำความสะอาดข้อความภาษาไทย ป้องกันปัญหาตัวอักษรเพี้ยน (Mojibake / CP437 Artifacts)
 * @param text ข้อความ
 */
export function cleanThaiText(text?: string | null): string {
  if (!text) return "";
  let s = String(text);

  // ลบตัวอักษรขยะหรือ encoding แปลกปลอม
  s = s.replace(/[\u03B1-\u03C9\u2500-\u257F\u2550-\u256C|üéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑ]+/g, "");

  // ตัดคำนำหน้า "แป้ง", "แผ่น", "เครป" ที่ซ้ำซ้อน
  s = s.replace(/^(แป้ง)+/g, "แป้ง");
  s = s.replace(/^(แผ่น)+/g, "แผ่น");
  s = s.replace(/^(เครป)+/g, "เครป");

  // ปรับช่องว่างให้สวยงาม
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * โครงสร้างข้อมูลรายละเอียดเครปที่แยกส่วนเรียบร้อยแล้ว
 */
export interface ParsedCrepeDetails {
  /** ชื่อแป้งเครป เช่น "แป้งกรอบ", "แป้งชาเขียว" */
  crust: string;
  /** ข้อความสรุปไส้ทั้งหมด */
  toppings: string;
  /** รายการไส้แบบ Array */
  toppingsList?: string[];
  /** ไส้แรก */
  firstTopping?: string;
  /** หมายเหตุเพิ่มเติม */
  note?: string;
  /** สั่งกลับบ้านหรือไม่ */
  isTakeaway: boolean;
  /** ทานที่ร้านหรือไม่ */
  isDineIn: boolean;
}

/**
 * ตัวแยกส่วนรายละเอียดเครปอเนกประสงค์ (Universal Crepe Parser)
 * ใช้ร่วมกันระหว่าง Kitchen Queue, Cart และ Live Order Tracking
 * @param item ออบเจกต์ไอเทมเครป
 */
export function parseCrepeDetails(item: any): ParsedCrepeDetails {
  if (!item) {
    return {
      crust: "ไม่ระบุแป้ง",
      toppings: "ไม่ใส่ไส้ (แป้งเปล่า)",
      toppingsList: [],
      firstTopping: "",
      isTakeaway: false,
      isDineIn: false,
    };
  }

  const rawName = cleanThaiText(String(item.menuItem?.name || item.name || item.menu_name || "").trim());
  const rawNote = cleanThaiText(String(item.note || item.remark || "").trim());
  const options = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];

  const isTakeaway = options.some((o: any) => cleanThaiText(o.choiceLabel)?.includes("กลับบ้าน")) || rawNote.includes("กลับบ้าน");
  const isDineIn = options.some((o: any) => cleanThaiText(o.choiceLabel)?.includes("ทานที่ร้าน")) || rawNote.includes("ทานที่ร้าน");

  // 1. ระบุแป้งเครปจากข้อมูลออเดอร์
  let crust = "";

  // A. ตรวจสอบฟิลด์ crust โดยตรง
  if (item.crust) {
    crust = cleanThaiText(String(item.crust).trim());
  } 
  // B. ตรวจสอบออบเจกต์ base
  else if (item.base?.name) {
    crust = cleanThaiText(String(item.base.name).trim());
  }
  // C. ตรวจสอบจากตัวเลือกเสริม Options
  else {
    const crustOpt = options.find((o: any) => {
      const gName = cleanThaiText(String(o.groupName || "")).toLowerCase();
      const cLbl = cleanThaiText(String(o.choiceLabel || "")).toLowerCase();
      return (
        gName.includes("แป้ง") ||
        gName.includes("base") ||
        gName.includes("crust") ||
        cLbl.startsWith("แป้ง") ||
        cLbl.startsWith("แผ่น") ||
        cLbl.startsWith("เครป") ||
        cLbl === "นุ่ม" ||
        cLbl === "กรอบ"
      );
    });
    if (crustOpt) {
      crust = cleanThaiText(String(crustOpt.choiceLabel || "").trim());
    }
  }

  // D. สกัดจากชื่อเมนูหากยังไม่พบ
  if (!crust && rawName) {
    if (rawName.includes("นุ่ม") || rawName.toLowerCase().includes("soft")) {
      crust = "แป้งนุ่ม";
    } else if (rawName.includes("กรอบ") || rawName.toLowerCase().includes("crispy")) {
      crust = "แป้งกรอบ";
    } else if (rawName.startsWith("แป้ง") || rawName.startsWith("แผ่น") || rawName.startsWith("เครป")) {
      const parts = rawName.split(/[·•+,-]/);
      crust = cleanThaiText(parts[0].trim());
    } else if (rawName !== "เมนูเครป" && rawName !== "เมนูอาหาร") {
      crust = rawName;
    }
  }

  // ปรับแต่งชื่อแป้งให้เป็นมาตรฐาน
  if (crust) {
    crust = cleanThaiText(crust);
    if (crust.startsWith("แผ่น")) {
      crust = crust.replace(/^แผ่น/, "แป้ง");
    } else if (crust.startsWith("เครป")) {
      crust = crust.replace(/^เครป/, "แป้ง");
    } else if (!crust.startsWith("แป้ง")) {
      crust = `แป้ง${crust}`;
    }
    crust = crust.replace(/^(แป้ง)+/g, "แป้ง");
  } else {
    crust = "ไม่ระบุแป้ง";
  }

  // 2. สกัดรายการไส้เครป (Toppings)
  const toppingsList: string[] = [];
  const addUniqueTopping = (tName?: string) => {
    if (!tName) return;
    const trimmed = cleanThaiText(String(tName).trim());
    if (
      trimmed &&
      !trimmed.includes("กลับบ้าน") &&
      !trimmed.includes("ทานที่ร้าน") &&
      !trimmed.startsWith("แป้ง") &&
      !trimmed.startsWith("แผ่น") &&
      !trimmed.startsWith("เครป") &&
      trimmed !== "นุ่ม" &&
      trimmed !== "กรอบ" &&
      trimmed !== "เมนูเครป" &&
      trimmed !== "เมนูอาหาร" &&
      !toppingsList.includes(trimmed)
    ) {
      toppingsList.push(trimmed);
    }
  };

  // ดึงจากอาร์เรย์ item.toppings
  if (Array.isArray(item.toppings)) {
    item.toppings.forEach((t: any) => {
      const tName = typeof t === "string" ? t : (t.name || t.choiceLabel);
      addUniqueTopping(tName);
    });
  }

  // ดึงจาก selectedOptions (ไม่รวมแป้ง)
  options.forEach((opt: any) => {
    const gName = String(opt.groupName || "").toLowerCase();
    const lbl = opt.choiceLabel || opt.name;
    if (!gName.includes("แป้ง") && !gName.includes("base") && !gName.includes("crust")) {
      addUniqueTopping(lbl);
    }
  });

  // ดึงจาก item.toppingsText
  if (item.toppingsText) {
    item.toppingsText.split(/[+•,]/).forEach(addUniqueTopping);
  }

  // สกัดจาก Note
  let cleanNote = rawNote
    .replace(/กลับบ้าน/g, "")
    .replace(/ทานที่ร้าน/g, "")
    .replace(/^[,:\s-]+|[,:\s-]+$/g, "")
    .trim();

  if (cleanNote) {
    if (cleanNote.startsWith("ไส้:")) {
      const match = cleanNote.match(/ไส้:\s*([^,\n]+(?:,[^,\n]+)*)/);
      if (match && match[1]) {
        match[1].split(/[+•,]/).forEach(addUniqueTopping);
      }
      cleanNote = "";
    } else if (cleanNote.includes("+")) {
      cleanNote.split("+").forEach(addUniqueTopping);
      cleanNote = "";
    } else if (toppingsList.includes(cleanNote) || cleanNote === rawName) {
      addUniqueTopping(cleanNote);
      cleanNote = "";
    }
  }

  // ดึงจากชื่อเมนูหากมีเครื่องหมาย · หรือ •
  if (rawName.includes("·") || rawName.includes("•")) {
    const subParts = rawName.split(/[·•]/);
    if (subParts.length > 1) {
      subParts.slice(1).join(" ").split(/[+•,]/).forEach(addUniqueTopping);
    }
  } else if (
    !rawName.startsWith("แป้ง") &&
    !rawName.startsWith("แผ่น") &&
    !rawName.startsWith("เครป") &&
    rawName !== "เมนูเครป" &&
    rawName !== "เมนูอาหาร"
  ) {
    addUniqueTopping(rawName);
  }

  const toppings = toppingsList.length > 0 ? toppingsList.join(" , ") : "ไม่ใส่ไส้ (แป้งเปล่า)";

  return {
    crust,
    toppings,
    toppingsList,
    firstTopping: toppingsList[0] || "",
    note: cleanNote || undefined,
    isTakeaway,
    isDineIn,
  };
}

/**
 * ดึงชื่อแป้งเครปที่เลือก
 */
export function formatCrustName(item: any): string {
  return parseCrepeDetails(item).crust;
}

/**
 * ตรวจสอบว่าวัตถุดิบ/แป้ง/ไส้ หมดสต็อกหรือไม่
 * @param name ชื่อวัตถุดิบ
 * @param availMap Map สถานะความพร้อมจำหน่าย
 */
export function isNameOutOfStock(name?: string, availMap?: Record<string, boolean>): boolean {
  if (!name || !availMap) return false;
  const clean = name.trim().toLowerCase();
  if (availMap[clean] === false) return true;
  if (availMap[clean] === true) return false;

  // ตรวจสอบแบบตัดคำนำหน้า
  const noPrefix = clean.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
  if (noPrefix && availMap[noPrefix] === false) return true;
  if (noPrefix && availMap[noPrefix] === true) return false;

  const foundKey = Object.keys(availMap).find(
    (k) => k.includes(clean) || clean.includes(k) || (noPrefix && k.includes(noPrefix))
  );
  if (foundKey) {
    return availMap[foundKey] === false;
  }
  return false;
}

/**
 * สร้างสตริง EMVCo Payload สำหรับสร้าง QR Code พร้อมเพย์ตามมาตรฐาน Thai QR Payment
 * รองรับการสแกนผ่านแอปธนาคารทุกแห่งในไทย (K PLUS, SCB EASY, Krungthai NEXT, ฯลฯ)
 * @param target เบอร์โทรศัพท์ หรือเลขประจำตัวประชาชน/ผู้เสียภาษี
 * @param amount จำนวนเงิน (ถ้ามี)
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  if (!target) return "";
  const cleaned = target.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  let targetTag = "";
  if (cleaned.length === 10) {
    // เบอร์มือถือ: แปลง 08x... เป็น 00668x...
    const formatted = "0066" + cleaned.substring(1);
    targetTag = "01" + String(formatted.length).padStart(2, "0") + formatted;
  } else if (cleaned.length === 13) {
    // เลขประจำตัวประชาชน หรือเลขนิติบุคคล
    targetTag = "02" + String(cleaned.length).padStart(2, "0") + cleaned;
  } else if (cleaned.length === 15) {
    // E-Wallet ID
    targetTag = "03" + String(cleaned.length).padStart(2, "0") + cleaned;
  } else {
    const formatted = cleaned.startsWith("0") ? "0066" + cleaned.substring(1) : cleaned;
    targetTag = "01" + String(formatted.length).padStart(2, "0") + formatted;
  }

  const aid = "0016A000000677010111";
  const merchantAccountInfo = aid + targetTag;
  const tag29 = "29" + String(merchantAccountInfo.length).padStart(2, "0") + merchantAccountInfo;

  // Tag 01: 11 = Static QR (ไม่ระบุยอดเงิน), 12 = Dynamic QR (ระบุยอดเงินเจาะจง)
  const hasAmount = amount !== undefined && amount !== null && amount > 0;
  const pointOfInitiation = hasAmount ? "010212" : "010211";

  // ลำดับ Tag ตามมาตรฐาน EMVCo: 00 -> 01 -> 29 -> 53 (Currency) -> 54 (Amount) -> 58 (Country) -> 63 (CRC)
  let payload = "000201" + pointOfInitiation + tag29 + "5303764";
  if (hasAmount) {
    const formattedAmount = Number(amount).toFixed(2);
    payload += "54" + String(formattedAmount.length).padStart(2, "0") + formattedAmount;
  }
  payload += "5802TH";
  payload += "6304";

  // คำนวณ CRC16-CCITT Checksum
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    let c = payload.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return payload + crcHex;
}
