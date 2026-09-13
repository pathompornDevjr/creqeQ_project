/**
 * =========================================================================================
 * @file theme.ts
 * @description ยูทิลิตี้จัดการธีมสีและแบรนดิ้งของร้านค้า (Restaurant Theming System)
 * 
 * หน้าที่หลัก:
 * - แปลงรหัสสี Hex เป็น RGBA เพื่อใช้กับ CSS opacity
 * - ดึงและแปลง Branding สีของร้านค้า (Primary, Secondary, Accent, Logo, Banner)
 * - บันทึกและดึงข้อมูลธีมลงใน LocalStorage
 * - สร้างและนำ CSS Variables (Dynamic Theme Variables) ไปปรับใช้กับ Document Root แบบทันที
 * =========================================================================================
 */

/**
 * แปลงค่าสี Hex Code (#RRGGBB หรือ #RGB) ให้เป็นสตริง RGBA
 * @param hex รหัสสี Hex เช่น "#E11D48"
 * @param alpha ค่าความโปร่งใส 0 ถึง 1
 * @returns สตริง rgba(...)
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== "string") return `rgba(225, 29, 72, ${alpha})`;
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(225, 29, 72, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * โครงสร้างข้อมูล Branding ของร้านค้า
 */
export interface RestaurantBranding {
  /** สีหลักของแบรนด์ */
  primaryColor: string;
  /** สีรองของแบรนด์ */
  secondaryColor: string;
  /** สีเน้น (Accent) */
  accentColor: string;
  /** URL รูปโลโก้ร้าน */
  logoUrl: string | null;
  /** URL รูปภาพหน้าปกร้าน */
  bannerUrl: string | null;
}

/**
 * สกัดข้อมูลแบรนดิ้งและสีธีมจากออบเจกต์ร้านค้า (รองรับโครงสร้างคีย์หลากหลายแบบ)
 * @param restaurant ข้อมูลร้านค้าจาก API
 * @returns ออบเจกต์ RestaurantBranding
 */
export function extractBranding(restaurant: any): RestaurantBranding {
  if (!restaurant) {
    return {
      primaryColor: "#E11D48",
      secondaryColor: "#F59E0B",
      accentColor: "#FB923C",
      logoUrl: null,
      bannerUrl: null,
    };
  }

  const primaryColor =
    restaurant.primaryColor ||
    restaurant.restaurant_primary_theme ||
    restaurant.themeColor ||
    "#E11D48";

  const secondaryColor =
    restaurant.secondaryColor ||
    restaurant.restaurant_secondary_theme ||
    "#F59E0B";

  const accentColor =
    restaurant.accentColor ||
    restaurant.restaurant_other_theme ||
    restaurant.otherTheme ||
    "#FB923C";

  const logoUrl =
    restaurant.logoUrl ||
    restaurant.restaurant_logo ||
    null;

  const bannerUrl =
    restaurant.bannerUrl ||
    restaurant.restaurant_cover ||
    null;

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    bannerUrl,
  };
}

/**
 * ดึงข้อมูลแบรนดิ้งที่เคยบันทึกไว้ใน LocalStorage
 * @param key คีย์เฉพาะของร้านค้า (ทางเลือก)
 */
export function getSavedBranding(key?: string | number): RestaurantBranding | null {
  if (typeof window === "undefined") return null;
  try {
    if (key) {
      const specific = localStorage.getItem(`qrshop_branding_${key}`);
      if (specific) return JSON.parse(specific);
    }
    const general = localStorage.getItem("qrshop_latest_branding");
    if (general) return JSON.parse(general);
  } catch {}
  return null;
}

/**
 * บันทึกข้อมูลแบรนดิ้งลงใน LocalStorage
 * @param branding ข้อมูลแบรนดิ้งที่จะบันทึก
 * @param key คีย์เฉพาะของร้านค้า (ทางเลือก)
 */
export function saveBranding(branding: RestaurantBranding, key?: string | number) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(branding);
    if (key) {
      localStorage.setItem(`qrshop_branding_${key}`, json);
    }
    localStorage.setItem("qrshop_latest_branding", json);
  } catch {}
}

/**
 * สร้าง CSS Custom Properties (Variables) สำหรับธีมสีของระบบ
 * @param primaryColor สีหลัก
 * @param secondaryColor สีรอง
 * @param accentColor สีเน้น
 * @returns ออบเจกต์ React.CSSProperties
 */
export function generateThemeStyles(
  primaryColor?: string,
  secondaryColor?: string,
  accentColor?: string
): React.CSSProperties {
  const p = primaryColor || "#E11D48";
  const s = secondaryColor || "#F59E0B";
  const a = accentColor || "#FB923C";

  return {
    "--color-brand-50": hexToRgba(p, 0.08),
    "--color-brand-100": hexToRgba(p, 0.16),
    "--color-brand-200": hexToRgba(p, 0.28),
    "--color-brand-300": hexToRgba(p, 0.48),
    "--color-brand-400": hexToRgba(p, 0.72),
    "--color-brand-500": p,
    "--color-brand-600": p,
    "--color-brand-700": p,
    "--color-brand-800": p,
    "--color-brand-900": p,
    "--brand-50": hexToRgba(p, 0.08),
    "--brand-100": hexToRgba(p, 0.16),
    "--brand-200": hexToRgba(p, 0.28),
    "--brand-300": hexToRgba(p, 0.48),
    "--brand-400": hexToRgba(p, 0.72),
    "--brand-500": p,
    "--brand-600": p,
    "--brand-700": p,
    "--brand-800": p,
    "--brand-900": p,
    "--brand-secondary": s,
    "--brand-accent": a,
    "--color-brand-secondary": s,
    "--color-brand-accent": a,
  } as React.CSSProperties;
}

/**
 * ปรับใช้ตัวแปรธีมสีลงใน document.documentElement (Root Element) ทันที
 * @param primaryColor สีหลัก
 * @param secondaryColor สีรอง
 * @param accentColor สีเน้น
 */
export function applyTheme(
  primaryColor?: string,
  secondaryColor?: string,
  accentColor?: string
) {
  if (typeof document === "undefined") return;
  const styles = generateThemeStyles(primaryColor, secondaryColor, accentColor);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(styles)) {
    if (typeof value === "string") {
      root.style.setProperty(key, value);
    }
  }
}
