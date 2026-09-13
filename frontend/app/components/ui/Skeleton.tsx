/**
 * =========================================================================================
 * @file Skeleton.tsx
 * @description คอมโพเนนต์ Skeleton Loading Placeholder
 * 
 * หน้าที่หลัก:
 * - Skeleton: โครงร่างกำลังโหลดแบบกล่องโค้งมน พร้อม Shimmer Animation
 * - StatCardSkeleton: โครงร่างสำหรับการ์ดสรุปสถิติ KPI
 * - ApprovalCardSkeleton: โครงร่างสำหรับการ์ดคำขออนุมัติเปิดร้าน
 * - TableSkeleton: โครงร่างสำหรับแถวตารางข้อมูล (Table Rows)
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";

/** Props ของ Skeleton */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
  /** ระดับความโค้งมนของขอบ */
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

/**
 * คอมโพเนนต์ Skeleton พื้นฐาน
 */
export function Skeleton({ className, rounded = "xl", ...props }: SkeletonProps) {
  const roundedClasses = {
    sm: "rounded-[6px]",
    md: "rounded-[10px]",
    lg: "rounded-[14px]",
    xl: "rounded-[18px]",
    "2xl": "rounded-[22px]",
    "3xl": "rounded-[28px]",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "skeleton select-none pointer-events-none relative overflow-hidden bg-surface-3",
        roundedClasses[rounded],
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton สำหรับการ์ดสรุปสถิติ / KPIs ด้านบน
 * @param count จำนวนการ์ดที่ต้องการแสดง (ค่าเริ่มต้น 3)
 */
export function StatCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border p-4 rounded-[18px] flex items-center justify-between shadow-xs"
        >
          <div className="space-y-2 flex-1 pr-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="w-10 h-10 rounded-[12px] shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton สำหรับการ์ดรายการคำขออนุมัติเปิดร้าน / Store Requests
 * @param count จำนวนการ์ด (ค่าเริ่มต้น 6)
 */
export function ApprovalCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface rounded-[24px] border border-border/80 overflow-hidden flex flex-col justify-between shadow-sm"
        >
          {/* Card Header */}
          <div className="p-5 flex items-start gap-4 bg-surface-2/70 border-b border-border/50">
            <Skeleton className="w-12 h-12 rounded-[16px] shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4 flex-1">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>

            {/* Address Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-6 w-14 rounded-[8px]" />
            </div>

            {/* Plan Info Box */}
            <div className="bg-surface-2 p-3.5 rounded-[14px] border border-border flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-5 w-28 rounded-[6px]" />
              </div>
              <div className="space-y-1.5 flex flex-col items-end">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>

            {/* Slip Evidence Box */}
            <div className="p-3.5 rounded-[14px] border border-border bg-surface-2/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 rounded-[8px]" />
            </div>

            {/* Submitted Date */}
            <div className="pt-2 border-t border-border border-dashed flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="p-4 bg-surface-2/80 border-t border-border flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-[12px]" />
            <Skeleton className="h-9 flex-1 rounded-[12px]" />
            <Skeleton className="h-9 flex-1 rounded-[12px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton สำหรับแถวข้อมูลในตาราง (Table Rows)
 * @param rows จำนวนแถว
 * @param cols จำนวนคอลัมน์
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center justify-between gap-4 p-3.5 bg-surface rounded-[14px] border border-border shadow-xs"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-1/4" : c === 1 ? "w-1/3" : "w-1/6")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
