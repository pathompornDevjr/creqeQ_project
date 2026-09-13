"use client";

/**
 * =========================================================================================
 * @file BottomSheet.tsx
 * @description คอมโพเนนต์หน้าต่างเลื่อนขึ้นจากด้านล่าง (Bottom Sheet Modal) สำหรับหน้าจอมือถือ
 * 
 * หน้าที่หลัก:
 * - แสดง Bottom Sheet พร้อมภาพเคลื่อนไหว Spring Animation นุ่มนวลผ่าน Framer Motion
 * - ล็อกการเลื่อนหน้าเว็บเบื้องหลัง (Scroll Lock) เมื่อเปิด Sheet
 * - มีแถบจับลาก (Drag Handle) และปุ่มปิด
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

/** Props ของคอมโพเนนต์ BottomSheet */
interface BottomSheetProps {
  /** ควบคุมการเปิด/ปิด */
  open: boolean;
  /** ฟังก์ชัน Callback เมื่อปิด Sheet */
  onClose: () => void;
  /** หัวข้อ Title ด้านบน */
  title?: string;
  /** เนื้อหาภายใน Sheet */
  children: React.ReactNode;
  /** ความสูงของ Sheet (auto, half, full) */
  snapHeight?: "auto" | "half" | "full";
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/**
 * คอมโพเนนต์ BottomSheet
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  snapHeight = "auto",
  className,
}: BottomSheetProps) {
  // ล็อกการเลื่อนของ body เมื่อเปิด BottomSheet
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const heightClass = {
    auto: "max-h-[92dvh]",
    half: "h-[50dvh]",
    full: "h-[92dvh]",
  }[snapHeight];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* ฉากหลังโปร่งแสง (Backdrop) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* แผ่น Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className={cn(
              "relative bg-surface rounded-t-[24px] shadow-xl flex flex-col",
              heightClass,
              className
            )}
          >
            {/* ที่จับลากด้านบน (Drag Handle) */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* ส่วนหัว Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:bg-surface-3 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ส่วนเนื้อหา Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
