/**
 * =========================================================================================
 * @file Card.tsx
 * @description คอมโพเนนต์การ์ดข้อมูล (Card) และการ์ดแสดงสถิติ (StatCard)
 * 
 * หน้าที่หลัก:
 * - Card: กล่องคอนเทนเนอร์แบบโค้งมน รองรับ Glassmorphism, Padding หลายระดับ และ Hover Effect
 * - StatCard: การ์ดแสดงผลตัวเลขสถิติ (KPIs) พร้อมไอคอน ทิศทางแนวโน้ม (Trending Up/Down) และ Skeleton Loading
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { Skeleton } from "./Skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

/** Props ของคอมโพเนนต์ Card */
interface CardProps {
  /** เนื้อหาภายในการ์ด */
  children: React.ReactNode;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
  /** ขนาดระยะห่างภายใน (Padding) */
  padding?: "none" | "sm" | "md" | "lg";
  /** แสดงเอฟเฟกต์ยกตัวเมื่อ Hover หรือไม่ */
  hover?: boolean;
  /** ใช้พื้นหลังแบบกระจกฝ้า (Glassmorphism) หรือไม่ */
  glass?: boolean;
}

/** สไตล์ Padding */
const paddingStyles = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-6",
};

/**
 * คอมโพเนนต์ Card สำหรับจัดกลุ่มเนื้อหา
 */
export function Card({ children, className, padding = "md", hover = false, glass = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border transition-all duration-200",
        glass
          ? "bg-white/85 backdrop-blur-lg border-white/60"
          : "bg-surface border-border shadow-sm",
        hover && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

/** Props ของคอมโพเนนต์ StatCard */
interface StatCardProps {
  /** ป้ายชื่อสถิติ เช่น "ยอดขายรวม", "จำนวนออเดอร์" */
  label: string;
  /** ค่าตัวเลขหรือข้อความที่แสดง */
  value: string | number;
  /** ไอคอนประกอบ */
  icon: React.ReactNode;
  /** ข้อมูลแนวโน้มเทียบกับช่วงก่อนหน้า (เปอร์เซ็นต์และข้อความ) */
  trend?: { value: number; label: string };
  /** เน้นสีเด่น (Accent Brand Color) หรือไม่ */
  accent?: boolean;
  /** สถานะกำลังโหลดข้อมูล */
  loading?: boolean;
}

/**
 * คอมโพเนนต์ StatCard สำหรับแสดงตัวชี้วัดสถิติในหน้าแดชบอร์ด
 */
export function StatCard({ label, value, icon, trend, accent = false, loading = false }: StatCardProps) {
  return (
    <Card className={cn(accent && "border-brand-200 bg-brand-50/60")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-2 mb-1">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className={cn("text-2xl font-bold", accent ? "text-brand-700" : "text-text")}>
              {value}
            </p>
          )}
          {trend && !loading && (
            <p className={cn("text-xs mt-1 flex items-center gap-0.5", trend.value >= 0 ? "text-brand-600 font-medium" : "text-red-500")}>
              {trend.value >= 0 ? (
                <TrendingUp size={13} className="shrink-0" />
              ) : (
                <TrendingDown size={13} className="shrink-0" />
              )}
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-[12px] flex items-center justify-center",
          accent ? "bg-brand-600 text-white" : "bg-surface-3 text-text-2"
        )}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
