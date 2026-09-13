"use client";

/**
 * =========================================================================================
 * @file Select.tsx
 * @description คอมโพเนนต์เมนูแบบเลื่อนเลือกแบบกำหนดเอง (Custom Select Dropdown)
 * 
 * หน้าที่หลัก:
 * - แสดง Dropdown สวยงามพร้อมป้าย Badge สี (เช่น พร้อมขาย, หมด, แนะนำ)
 * - รองรับการจัดตำแหน่งแสดงผล (Top/Bottom, Left/Right)
 * - แอนิเมชันเปิด/ปิด Smooth Popover ด้วย Framer Motion
 * - ปิด Dropdown อัตโนมัติเมื่อคลิกพื้นที่ภายนอก (Backdrop Dismiss)
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

/** โครงสร้างตัวเลือกใน Select */
export interface CustomSelectOption {
  /** ค่า value */
  value: string;
  /** ข้อความแสดงผล */
  label: string;
  /** ข้อความป้ายกำกับ Badge (ถ้ามี) */
  badge?: string;
}

/** Props ของคอมโพเนนต์ CustomSelect */
export interface CustomSelectProps {
  /** ไอคอนนำหน้า */
  icon?: React.ReactNode;
  /** ป้ายชื่อหัวข้อ */
  label?: string;
  /** ค่าที่เลือกอยู่ในปัจจุบัน */
  value: string;
  /** รายการตัวเลือก */
  options: CustomSelectOption[];
  /** ฟังก์ชันเมื่อเลือกค่า */
  onChange: (val: string) => void;
  /** คลาสสไตล์คอนเทนเนอร์ */
  className?: string;
  /** คลาสสไตล์ปุ่มกด */
  buttonClassName?: string;
  /** ข้อความ Placeholder เมื่อยังไม่ได้เลือก */
  placeholder?: string;
  /** ขนาด (sm, md) */
  size?: "sm" | "md";
  /** ปิดการใช้งานหรือไม่ */
  disabled?: boolean;
  /** ทิศทางที่ Dropdown เปิดออก (bottom, top) */
  position?: "bottom" | "top";
  /** การจัดแนว (left, right) */
  align?: "left" | "right";
  /** ข้อความแสดง Error */
  error?: string;
}

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
 * คำนวณสไตล์สีของป้าย Badge ในแต่ละตัวเลือก
 */
const getBadgeStyle = (value: string, badge?: string) => {
  if (value === "true" || badge === "พร้อมขาย" || badge === "ปกติ") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  }
  if (value === "false" || badge === "หมด" || badge === "ปิดการขาย") {
    return "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  }
  if (badge === "แนะนำ" || badge === "ยอดนิยม") {
    return "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  }
  return "bg-brand-50 text-brand-700 border-brand-200/80 dark:bg-brand-950/40 dark:text-brand-400 dark:border-brand-800";
};

/**
 * คอมโพเนนต์ CustomSelect
 */
export function CustomSelect({
  icon,
  label,
  value,
  options,
  onChange,
  className,
  buttonClassName,
  placeholder = "เลือกรายการ",
  size,
  disabled,
  position = "bottom",
  align = "left",
  error,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  const isFullWidth = className?.includes("w-full");
  const resolvedSize = size || (isFullWidth ? "md" : "sm");

  return (
    <div className={cn("relative inline-block text-left", className)}>
      {label && (
        <label className={cn(resolvedSize === "md" ? "block text-sm font-medium text-text mb-1.5" : "text-text-3 font-extrabold text-xs mb-1.5 inline-block mr-1.5")}>
          {renderFormattedLabel(label)}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          resolvedSize === "md"
            ? "w-full h-10 inline-flex items-center justify-between gap-2 bg-surface border border-border hover:border-brand-500 focus:ring-2 focus:ring-brand-500/20 px-3.5 rounded-[10px] text-sm text-text transition-all active:scale-[0.99] disabled:bg-surface-2 disabled:text-text-3 cursor-pointer disabled:cursor-not-allowed"
            : "inline-flex items-center gap-2 h-9 bg-surface-2 border border-border hover:border-brand-400 px-3.5 rounded-[10px] text-xs font-bold text-text transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
          error && "border-red-500 hover:border-red-600 focus:ring-red-500/20",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && (
            <span className={cn(
              "shrink-0 text-[9.5px] font-black px-2 py-0.5 rounded-full border leading-none",
              getBadgeStyle(selectedOption.value, selectedOption.badge)
            )}>
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={resolvedSize === "md" ? 16 : 14} className={cn("text-text-3 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {error && <p className="mt-1 text-xs text-red-500 font-semibold">{error}</p>}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop สำหรับปิด Dropdown เมื่อกดพื้นที่นอก */}
            <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />

            {/* การ์ด Dropdown Popover */}
            <motion.div
              initial={{ opacity: 0, y: position === "top" ? -6 : 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: position === "top" ? -6 : 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-[100] bg-surface rounded-[16px] border border-border shadow-xl p-1.5 space-y-1 max-h-60 overflow-y-auto",
                resolvedSize === "md" ? "w-full left-0 right-0 min-w-full" : "min-w-48 max-w-xs",
                align === "right" && resolvedSize !== "md" ? "right-0" : "left-0",
                position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
              )}
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3",
                      isSelected
                        ? "bg-brand-50 text-brand-700 font-black"
                        : "text-text hover:bg-surface-3 hover:text-brand-700"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className={cn(
                          "text-[9.5px] font-black px-2 py-0.5 rounded-full border leading-none",
                          getBadgeStyle(opt.value, opt.badge)
                        )}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-brand-600" />}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
