"use client";

/**
 * =========================================================================================
 * @file Modal.tsx
 * @description คอมโพเนนต์หน้าต่างป๊อปอัปมาตรฐาน (Modal Dialog)
 * 
 * หน้าที่หลัก:
 * - แสดง Modal ตรงกลางหน้าจอพร้อม Backdrop เบลอและแอนิเมชัน Fade + Scale (Framer Motion)
 * - ดักจับปุ่ม Escape เพื่อปิด Modal อัตโนมัติ
 * - ล็อก Scrollbar ของหน้าเว็บเบื้องหลังเมื่อเปิด Modal
 * - รองรับ 3 ขนาด: sm, md, lg
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

/** Props ของคอมโพเนนต์ Modal */
interface ModalProps {
  /** ควบคุมการเปิด/ปิด Modal */
  open: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** หัวข้อ Title ด้านบน */
  title?: string;
  /** เนื้อหาภายใน Modal */
  children: React.ReactNode;
  /** ขนาดความกว้าง (sm, md, lg) */
  size?: "sm" | "md" | "lg";
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/** สไตล์ความกว้างตามขนาด */
const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

/**
 * คอมโพเนนต์ Modal
 */
export function Modal({ open, onClose, title, children, size = "md", className }: ModalProps) {
  // ดักจับปุ่ม Escape เพื่อปิด Modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ล็อกการเลื่อน Scroll ของ body เมื่อเปิด Modal
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* ฉากหลังโปร่งแสง Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* การ์ด Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "relative w-full bg-surface rounded-[20px] shadow-xl border border-border overflow-hidden",
              sizeStyles[size],
              className
            )}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:bg-surface-3 hover:text-text transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {/* Body Content */}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
