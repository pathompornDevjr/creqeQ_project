/**
 * =========================================================================================
 * @file Badge.tsx
 * @description คอมโพเนนต์ป้ายกำกับสถานะ (Badge) พร้อมจุดแสดงสี (Status Dot)
 * 
 * หน้าที่หลัก:
 * - แสดงสถานะในรูปแบบ Badge สีสันสวยงาม (default, success, warning, danger, info, neutral)
 * - มี Helper mapping `orderStatusBadge` สำหรับแปลงสถานะออเดอร์เป็นสีและข้อความภาษาไทย
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";

/** รูปแบบสีของ Badge */
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

/** Props ของคอมโพเนนต์ Badge */
interface BadgeProps {
  /** รูปแบบสี */
  variant?: BadgeVariant;
  /** เนื้อหาภายในป้าย */
  children: React.ReactNode;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
  /** แสดงจุดสีนำหน้าหรือไม่ */
  dot?: boolean;
}

/** สไตล์สีพื้นหลังและตัวหนังสือสำหรับแต่ละ Variant */
const variantStyles: Record<BadgeVariant, string> = {
  default:  "bg-brand-100 text-brand-700",
  success:  "bg-green-100 text-green-700",
  warning:  "bg-amber-100 text-amber-700",
  danger:   "bg-red-100 text-red-700",
  info:     "bg-blue-100 text-blue-700",
  neutral:  "bg-surface-3 text-text-2",
};

/** สไตล์สีของจุด Dot */
const dotColors: Record<BadgeVariant, string> = {
  default:  "bg-brand-500",
  success:  "bg-green-500",
  warning:  "bg-amber-500",
  danger:   "bg-red-500",
  info:     "bg-blue-500",
  neutral:  "bg-text-3",
};

/**
 * คอมโพเนนต์ Badge
 */
export function Badge({ variant = "default", children, className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

/** ตารางจับคู่สถานะออเดอร์เป็น Badge Variant และข้อความภาษาไทย */
export const orderStatusBadge: Record<string, { variant: BadgeVariant; label: string }> = {
  pending:   { variant: "warning", label: "รอยืนยัน" },
  confirmed: { variant: "info",    label: "รับออเดอร์แล้ว" },
  preparing: { variant: "info",    label: "กำลังทำ" },
  cooking:   { variant: "info",    label: "กำลังทำ" },
  served:    { variant: "success", label: "ทำเสร็จแล้ว" },
  ready:     { variant: "success", label: "ทำเสร็จแล้ว" },
  paid:      { variant: "neutral", label: "เสร็จสิ้น" },
  completed: { variant: "neutral", label: "เสร็จสิ้น" },
  cancelled: { variant: "danger",  label: "ยกเลิกแล้ว" },
};
