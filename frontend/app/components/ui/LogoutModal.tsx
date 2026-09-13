"use client";

/**
 * =========================================================================================
 * @file LogoutModal.tsx
 * @description คอมโพเนนต์ Modal ยืนยันการออกจากระบบ (Logout Confirmation Dialog)
 * 
 * หน้าที่หลัก:
 * - แสดงกล่องข้อความยืนยันการออกจากระบบ พร้อมไอคอนและปุ่มยกเลิก/ยืนยัน
 * - เรียกใช้ `AuthApi.logout()` และ `clearAuthSession()`
 * - ทำการ Redirect ผู้ใช้กลับไปยังหน้า Login หรือ URL ที่กำหนด
 * =========================================================================================
 */

import { AuthApi, clearAuthSession } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, LogOut, X } from "lucide-react";
import { useState } from "react";

/** Props ของคอมโพเนนต์ LogoutModal */
interface LogoutModalProps {
  /** ควบคุมการเปิด/ปิด */
  open: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** หัวข้อ Title */
  title?: string;
  /** ข้อความคำอธิบาย */
  description?: string;
  /** URL ที่จะ Redirect ไปหลังออกจากระบบสำเร็จ */
  redirectUrl?: string;
}

/**
 * คอมโพเนนต์ LogoutModal
 */
export function LogoutModal({
  open,
  onClose,
  title = "ยืนยันการออกจากระบบ",
  description = "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ? เมื่อออกจากระบบแล้วจะต้องเข้าสู่ระบบใหม่อีกครั้ง",
  redirectUrl = "/login",
}: LogoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * ดำเนินการออกจากระบบ
   */
  const handleConfirmLogout = async () => {
    setIsLoading(true);
    try {
      await AuthApi.logout();
    } catch (_) {}
    clearAuthSession();
    window.location.href = redirectUrl;
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* ฉากหลัง Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            onClick={!isLoading ? onClose : undefined}
          />

          {/* การ์ด Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm bg-surface rounded-[24px] shadow-2xl border border-border overflow-hidden p-6 text-center z-10"
          >
            {/* ปุ่มปิด (X) */}
            {!isLoading && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:bg-surface-3 hover:text-text transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            )}

            {/* ไอคอน LogOut สีแดง */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 text-danger border border-red-100 flex items-center justify-center shadow-xs">
              <LogOut size={24} className="translate-x-0.5" />
            </div>

            {/* หัวข้อและคำอธิบาย */}
            <h3 className="text-base sm:text-lg font-bold text-text mb-1.5">
              {title}
            </h3>
            <p className="text-xs text-text-3 leading-relaxed mb-6">
              {description}
            </p>

            {/* ปุ่มกดยกเลิกและยืนยัน */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl border border-border text-xs sm:text-sm font-bold text-text hover:bg-surface-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmLogout}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl bg-danger hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer",
                  isLoading && "opacity-90 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังออก...</span>
                  </>
                ) : (
                  <span>ออกจากระบบ</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
