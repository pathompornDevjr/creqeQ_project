"use client";

/**
 * =========================================================================================
 * @file Input.tsx
 * @description รวบรวมคอมโพเนนต์ฟอร์มป้อนข้อมูล (Input, SearchInput, Textarea, Checkbox)
 * 
 * หน้าที่หลัก:
 * - Input: ช่องกรอกข้อความมาตรฐาน รองรับ Label ที่มีดอกจันสีแดง, ไอคอนซ้าย, ปุ่มเคลียร์ข้อความ (Clear Button) และข้อความแจ้ง Error
 * - SearchInput: ช็อตคัตของ Input สำหรับช่องค้นหา พร้อมไอคอนแว่นขยายอัตโนมัติ
 * - Textarea: ช่องกรอกข้อความหลายบรรทัด
 * - Checkbox: กล่องติ๊กเลือกดีไซน์เข้าชุด
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { Search, X } from "lucide-react";
import { forwardRef } from "react";

/** Props ของคอมโพเนนต์ Input */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** ป้ายชื่อหัวข้อของช่องกรอก */
  label?: string;
  /** ข้อความแจ้งเตือนข้อผิดพลาด */
  error?: string;
  /** ไอคอนนำหน้าฝั่งซ้าย */
  leftIcon?: React.ReactNode;
  /** อิลิเมนต์หรือปุ่มเสริมฝั่งขวา */
  rightElement?: React.ReactNode;
  /** ฟังก์ชันเมื่อกดปุ่มเคลียร์ข้อความ (X) */
  onClear?: () => void;
}

/**
 * แปลงข้อความ Label หากมีเครื่องหมาย * จะเปลี่ยนเป็นดอกจันสีแดง
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
 * คอมโพเนนต์ Input มาตรฐาน
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightElement, onClear, className, value, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text mb-1.5">
            {renderFormattedLabel(label)}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            value={value}
            className={cn(
              "w-full h-10 bg-surface border border-border rounded-[10px] text-sm text-text placeholder:text-text-3",
              "transition-all duration-150 outline-none",
              "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
              leftIcon ? "!pl-10" : "pl-3.5",
              (onClear && value) || rightElement ? "!pr-10" : "pr-3.5",
              error && "border-danger focus:border-danger focus:ring-danger/20"
            )}
            {...props}
          />
          {onClear && value ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors flex items-center justify-center"
            >
              <X size={14} />
            </button>
          ) : (
            rightElement && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 flex items-center justify-center">
                {rightElement}
              </span>
            )
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

/** Props ของ SearchInput */
interface SearchInputProps extends Omit<InputProps, "leftIcon"> {}

/**
 * คอมโพเนนต์ SearchInput ช่องค้นหาพร้อมไอคอน
 */
export function SearchInput(props: SearchInputProps) {
  return <Input leftIcon={<Search size={16} />} {...props} />;
}

/** Props ของ Textarea */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * คอมโพเนนต์ Textarea กล่องกรอกข้อความยาว
 */
export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">
          {renderFormattedLabel(label)}
        </label>
      )}
      <textarea
        className={cn(
          "w-full bg-surface border border-border rounded-[10px] text-sm text-text placeholder:text-text-3",
          "p-3 resize-none transition-all duration-150 outline-none",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Props ของ Checkbox */
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

/**
 * คอมโพเนนต์ Checkbox
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer group select-none">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              "peer appearance-none w-4 h-4 rounded-md border-2 border-border bg-white",
              "checked:bg-brand-600 checked:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer",
              className
            )}
            {...props}
          />
          <svg
            className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {label && (
          <span className="text-xs font-semibold text-text-2 group-hover:text-text transition-colors">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
