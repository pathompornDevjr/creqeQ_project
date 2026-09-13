"use client";

/**
 * =========================================================================================
 * @file Button.tsx
 * @description คอมโพเนนต์ปุ่มกดมาตรฐาน (Button) พร้อมแอนิเมชัน Tap และสถานะ Loading
 * 
 * หน้าที่หลัก:
 * - รองรับ Variant สีหลากหลาย: primary, secondary, ghost, danger, outline
 * - รองรับ 3 ระดับขนาด: sm, md, lg
 * - มีแอนิเมชันยุบตัวเมื่อกด (Tap Animation via Framer Motion)
 * - แสดง Spinner เมื่อเปิดสถานะ loading
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";
import { forwardRef } from "react";

/** รูปแบบสีของปุ่ม */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
/** ขนาดของปุ่ม */
type ButtonSize = "sm" | "md" | "lg";

/** Props ของคอมโพเนนต์ Button */
interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  /** รูปแบบสี */
  variant?: ButtonVariant;
  /** ขนาด */
  size?: ButtonSize;
  /** กำลังโหลดข้อมูลหรือไม่ (แสดง Spinner) */
  loading?: boolean;
  /** ไอคอนฝั่งซ้าย */
  icon?: React.ReactNode;
  /** ไอคอนฝั่งขวา */
  iconRight?: React.ReactNode;
  /** ขยายเต็มความกว้าง (Width 100%) หรือไม่ */
  fullWidth?: boolean;
  /** เนื้อหาภายในปุ่ม */
  children?: React.ReactNode;
}

/** สไตล์ CSS ของแต่ละ Variant */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-brand disabled:bg-brand-200",
  secondary:
    "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 border border-brand-200",
  ghost:
    "bg-transparent text-text-2 hover:bg-surface-3 active:bg-border",
  danger:
    "bg-danger text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
  outline:
    "bg-surface text-text border border-border hover:border-brand-400 hover:text-brand-600",
};

/** สไตล์ CSS ของแต่ละขนาด */
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-[8px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-6 text-base gap-2.5 rounded-[12px]",
};

/**
 * คอมโพเนนต์ Button
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export { Button };
