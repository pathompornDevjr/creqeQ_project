"use client";

/**
 * =========================================================================================
 * @file DatePicker.tsx
 * @description คอมโพเนนต์ปฏิทินเลือกวันที่ภาษาไทย (Thai Buddhist Era DatePicker Popover)
 * 
 * หน้าที่หลัก:
 * - แสดงผลปีเป็น พ.ศ. (เช่น 2569) และชื่อเดือนภาษาไทยเต็ม/ย่อ
 * - รองรับ 3 โหมดมุมมอง: รายวัน (Days Grid), รายเดือน (Months Grid), รายปี (Years Grid)
 * - มีปุ่มลัดเลือก "วันนี้" ได้สะดวกรวดเร็ว
 * - ปิดปฏิทินอัตโนมัติเมื่อเลือกวันที่เสร็จหรือคลิกพื้นที่ภายนอก
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Sparkles, ChevronUp, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

/** Props ของคอมโพเนนต์ CustomDatePicker */
export interface CustomDatePickerProps {
  /** ป้ายชื่อหัวข้อ */
  label?: string;
  /** ค่าวันที่ในรูปแบบ YYYY-MM-DD */
  value: string;
  /** ฟังก์ชันเมื่อเลือกวันที่ */
  onChange: (val: string) => void;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
  /** ข้อความ Placeholder */
  placeholder?: string;
  /** ขนาด (sm, md) */
  size?: "sm" | "md";
  /** ทิศทางแสดงผล Popover (bottom, top) */
  position?: "bottom" | "top";
  /** การจัดแนว (left, right) */
  align?: "left" | "right";
}

/** โหมดมุมมองของปฏิทิน */
type ViewMode = "days" | "months" | "years";

/**
 * แสดง Label พร้อมดอกจันสีแดงหากมีเครื่องหมาย *
 */
const renderFormattedLabel = (label: string) => {
  if (label.includes("*")) {
    const parts = label.split("*");
    return (
      <>
        {parts[0]}
        <span className="text-red-500 font-bold ml-0.5">*</span>
        {parts.slice(1).join("*")}
      </>
    );
  }
  return label;
};

/**
 * คอมโพเนนต์ CustomDatePicker
 */
export function CustomDatePicker({
  label,
  value,
  onChange,
  className,
  size,
  position = "bottom",
  align = "left",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");

  const [currentViewDate, setCurrentViewDate] = useState<Date>(() => {
    return value ? new Date(value) : new Date();
  });

  const [yearGridStart, setYearGridStart] = useState<number>(() => {
    const y = (value ? new Date(value) : new Date()).getFullYear();
    return Math.floor(y / 12) * 12;
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentViewDate(d);
        setYearGridStart(Math.floor(d.getFullYear() / 12) * 12);
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setViewMode("days");
      if (value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setCurrentViewDate(d);
          setYearGridStart(Math.floor(d.getFullYear() / 12) * 12);
        }
      }
    }
  }, [isOpen]);

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth(); // 0-11

  const thaiMonthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formattedDisplay = (() => {
    if (!value) return "เลือกวันที่";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${d.getDate()} ${thaiMonthNames[d.getMonth()].slice(0, 3)}. ${d.getFullYear() + 543}`;
  })();

  const handleSelectDay = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const selectedIso = `${year}-${mm}-${dd}`;
    onChange(selectedIso);
    setIsOpen(false);
  };

  const handleSelectMonth = (mIndex: number) => {
    setCurrentViewDate(new Date(year, mIndex, 1));
    setViewMode("days");
  };

  const handleSelectYear = (selectedYear: number) => {
    setCurrentViewDate(new Date(selectedYear, month, 1));
    setViewMode("months");
  };

  const handlePrev = () => {
    if (viewMode === "days") {
      setCurrentViewDate(new Date(year, month - 1, 1));
    } else if (viewMode === "months") {
      setCurrentViewDate(new Date(year - 1, month, 1));
    } else if (viewMode === "years") {
      setYearGridStart((prev) => prev - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === "days") {
      setCurrentViewDate(new Date(year, month + 1, 1));
    } else if (viewMode === "months") {
      setCurrentViewDate(new Date(year + 1, month, 1));
    } else if (viewMode === "years") {
      setYearGridStart((prev) => prev + 12);
    }
  };

  const todayIso = new Date().toISOString().split("T")[0];
  const isFullWidth = className?.includes("w-full");
  const resolvedSize = size || (isFullWidth ? "md" : "sm");

  const yearsInGrid = Array.from({ length: 12 }, (_, i) => yearGridStart + i);

  return (
    <div className={cn("relative inline-block text-left", className)}>
      {label && <span className="text-text-3 font-extrabold text-xs mr-1.5">{renderFormattedLabel(label)}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          resolvedSize === "md"
            ? "w-full h-11 inline-flex items-center justify-between gap-2 bg-surface border border-border hover:border-brand-500 focus:ring-2 focus:ring-brand-500/20 px-4 rounded-[12px] text-sm font-medium text-text shadow-2xs transition-all active:scale-[0.99]"
            : "inline-flex items-center gap-2 h-9 bg-surface-2 border border-border hover:border-brand-400 px-3.5 rounded-[12px] text-xs font-bold text-text transition-all active:scale-[0.98]"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar size={resolvedSize === "md" ? 16 : 14} className="text-brand-600 shrink-0" />
          <span className="truncate">{formattedDisplay}</span>
        </div>
        <ChevronDown size={resolvedSize === "md" ? 16 : 14} className={cn("text-text-3 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop ปิดเมื่อกดนอกกล่อง */}
            <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />

            {/* การ์ดปฏิทิน Popover */}
            <motion.div
              initial={{ opacity: 0, y: position === "top" ? -6 : 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: position === "top" ? -6 : 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-[100] w-80 bg-surface rounded-[24px] border border-border shadow-2xl p-4 space-y-3",
                align === "right" ? "right-0" : "left-0",
                position === "top" ? "bottom-full mb-2" : "top-full mt-1.5"
              )}
            >
              {/* Header สลับเดือนและปี */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-text-2 hover:bg-surface-3 hover:text-brand-600 transition-colors"
                  title="ก่อนหน้า"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* หัวข้อแสดงเดือน/ปี */}
                <div className="flex items-center gap-1.5">
                  {viewMode === "days" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewMode("months")}
                        className="text-xs font-black text-text hover:text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-[8px] transition-colors flex items-center gap-1"
                        title="คลิกเพื่อเลือกเดือน"
                      >
                        <span>{thaiMonthNames[month]}</span>
                        <ChevronDown size={12} className="opacity-50" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setYearGridStart(Math.floor(year / 12) * 12);
                          setViewMode("years");
                        }}
                        className="text-xs font-black text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-[8px] transition-colors flex items-center gap-1 border border-brand-200"
                        title="คลิกเพื่อเลือกปี พ.ศ."
                      >
                        <span>{year + 543}</span>
                        <ChevronDown size={12} className="opacity-60" />
                      </button>
                    </>
                  )}

                  {viewMode === "months" && (
                    <button
                      type="button"
                      onClick={() => {
                        setYearGridStart(Math.floor(year / 12) * 12);
                        setViewMode("years");
                      }}
                      className="text-xs font-black text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-[8px] transition-colors flex items-center gap-1.5 border border-brand-200"
                      title="คลิกเพื่อเลือกปี พ.ศ."
                    >
                      <span>เลือกเดือน (พ.ศ. {year + 543})</span>
                      <ChevronDown size={12} className="opacity-60" />
                    </button>
                  )}

                  {viewMode === "years" && (
                    <span className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-[8px] border border-brand-200">
                      พ.ศ. {yearGridStart + 543} - {yearGridStart + 11 + 543}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-text-2 hover:bg-surface-3 hover:text-brand-600 transition-colors"
                  title="ถัดไป"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* มุมมองที่ 1: ตารางรายวัน (Days Grid) */}
              {viewMode === "days" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-2"
                >
                  {/* หัวตารางวันในสัปดาห์ */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d, i) => (
                      <span key={d} className={`text-[10px] font-black ${i === 0 ? "text-red-500" : "text-text-3"}`}>
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* ตารางวันที่ */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-9 h-9" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const mm = String(month + 1).padStart(2, "0");
                      const dd = String(dayNum).padStart(2, "0");
                      const dayIso = `${year}-${mm}-${dd}`;
                      const isSelected = value === dayIso;
                      const isToday = dayIso === todayIso;

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleSelectDay(dayNum)}
                          className={cn(
                            "w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center",
                            isSelected
                              ? "bg-brand-600 text-white font-black shadow-md scale-105"
                              : isToday
                              ? "border-2 border-brand-500 text-brand-700 bg-brand-50/50 hover:bg-brand-100"
                              : "text-text hover:bg-surface-3 hover:text-brand-700"
                          )}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* มุมมองที่ 2: ตารางเลือกเดือน (Months Grid) */}
              {viewMode === "months" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="grid grid-cols-3 gap-2 py-1"
                >
                  {thaiMonthNames.map((mName, idx) => {
                    const isSelectedMonth = idx === month;
                    const isCurrentMonthThisYear =
                      idx === new Date().getMonth() && year === new Date().getFullYear();

                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={cn(
                          "py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
                          isSelectedMonth
                            ? "bg-brand-600 text-white font-black shadow-sm"
                            : isCurrentMonthThisYear
                            ? "border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            : "bg-surface-2 border border-border text-text hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700"
                        )}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* มุมมองที่ 3: ตารางเลือกปี พ.ศ. (Years Grid) */}
              {viewMode === "years" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="grid grid-cols-3 gap-2 py-1"
                >
                  {yearsInGrid.map((y) => {
                    const isSelectedYear = y === year;
                    const isCurrentYear = y === new Date().getFullYear();
                    const thaiYear = y + 543;

                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => handleSelectYear(y)}
                        className={cn(
                          "py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center",
                          isSelectedYear
                            ? "bg-brand-600 text-white font-black shadow-sm"
                            : isCurrentYear
                            ? "border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100"
                            : "bg-surface-2 border border-border text-text hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700"
                        )}
                      >
                        <span className="font-extrabold text-sm">{thaiYear}</span>
                        <span className={cn("text-[10px]", isSelectedYear ? "text-white/80" : "text-text-3")}>{y}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* เมนูลัดด้านล่าง */}
              <div className="pt-2.5 border-t border-border flex items-center justify-between text-[11px]">
                {viewMode !== "days" ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("days")}
                    className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={13} /> กลับสู่ปฏิทิน
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const mm = String(today.getMonth() + 1).padStart(2, "0");
                      const dd = String(today.getDate()).padStart(2, "0");
                      onChange(`${today.getFullYear()}-${mm}-${dd}`);
                      setCurrentViewDate(today);
                      setIsOpen(false);
                    }}
                    className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> วันนี้ ({new Date().getDate()} {thaiMonthNames[new Date().getMonth()].slice(0, 3)}.)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-semibold text-text-3 hover:text-text px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
