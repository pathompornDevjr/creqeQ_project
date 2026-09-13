"use client";

/**
 * =========================================================================================
 * @file Pagination.tsx
 * @description คอมโพเนนต์แบ่งหน้าข้อมูล (Pagination)
 * 
 * หน้าที่หลัก:
 * - แสดงตัวเลขหน้า พร้อมจัดกลุ่มด้วย Ellipsis (...) เมื่อมีหลายหน้า
 * - แสดงข้อความสรุปช่วงข้อมูล (เช่น "แสดง 1 ถึง 10 จาก 45 รายการ")
 * - ปุ่ม "ก่อนหน้า" (Previous) และ "ถัดไป" (Next)
 * =========================================================================================
 */

import { Button } from "@/app/components/ui/Button";
import { cn } from "@/app/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Props ของคอมโพเนนต์ Pagination */
interface PaginationProps {
  /** หมายเลขหน้าปัจจุบัน (เริ่มที่ 1) */
  currentPage: number;
  /** จำนวนหน้าทั้งหมด */
  totalPages: number;
  /** จำนวนรายการข้อมูลทั้งหมด */
  totalItems: number;
  /** จำนวนรายการต่อหน้า */
  itemsPerPage: number;
  /** ฟังก์ชันเมื่อมีการเปลี่ยนหน้า */
  onPageChange: (page: number) => void;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/**
 * คอมโพเนนต์ Pagination
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}: PaginationProps) {
  // หากไม่มีข้อมูลหรือมีเพียง 1 หน้า ไม่ต้องแสดง Pagination
  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  /**
   * สร้างอาร์เรย์ตัวเลขหน้าและเครื่องหมายจุดไข่ปลา (...) อย่างชาญฉลาด
   */
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border", className)}>
      {/* ข้อความสรุปรายการ */}
      <p className="text-xs text-text-3 font-medium">
        แสดง <strong className="text-text font-bold">{startItem}</strong> ถึง{" "}
        <strong className="text-text font-bold">{endItem}</strong> จาก{" "}
        <strong className="text-text font-bold">{totalItems}</strong> รายการ
      </p>

      {/* แถบปุ่มเปลี่ยนหน้า */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          icon={<ChevronLeft size={16} />}
          className="h-9 px-3 text-xs font-bold"
        >
          ก่อนหน้า
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (typeof page === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-text-3 font-bold select-none">
                  ...
                </span>
              );
            }

            const isCurrent = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  "w-8 h-8 rounded-[10px] text-xs font-bold transition-all flex items-center justify-center",
                  isCurrent
                    ? "bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20"
                    : "text-text-2 hover:bg-surface-3 hover:text-text border border-transparent"
                )}
              >
                {page}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="h-9 px-3 text-xs font-bold"
        >
          ถัดไป
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
