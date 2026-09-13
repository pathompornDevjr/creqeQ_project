"use client";

/**
 * =========================================================================================
 * @file Loading.tsx
 * @description คอมโพเนนต์หน้าจอสถานะกำลังโหลด (Loading Screen & Spinner)
 * 
 * หน้าที่หลัก:
 * - แสดงโลโก้ร้านค้าที่กำลังหมุนวนพร้อมเอฟเฟกต์แสง Glow Aura และประกาย Sparkle หมุนรอบ
 * - มีแถบ Progress Bar เคลื่อนไหวแบบ Smooth Gradient
 * - รองรับโหมด Fullscreen หรือแสดงผลเฉพาะจุด (Inline Component)
 * - รองรับหลายธีมสี: brand, teal, light, glass, rose
 * =========================================================================================
 */

import { motion } from "framer-motion";
import { Sparkles, Store, Utensils } from "lucide-react";
import { cn } from "@/app/lib/utils";

/** Props ของคอมโพเนนต์ Loading */
interface LoadingProps {
  /** หัวข้อหลัก เช่น "กำลังโหลดข้อมูล..." */
  title?: string;
  /** ข้อความย่อยอธิบาย */
  message?: string;
  /** แสดงผลเต็มหน้าจอ (Fullscreen Overlay) หรือไม่ */
  fullscreen?: boolean;
  /** ธีมสี */
  variant?: "teal" | "light" | "glass" | "rose" | "brand";
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
  /** ขนาดโลโก้ */
  size?: "sm" | "md" | "lg";
}

/**
 * คอมโพเนนต์ Loading
 */
export function Loading({
  title = "กำลังโหลดข้อมูล...",
  message = "กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลสำหรับคุณ",
  fullscreen = true,
  variant = "brand",
  className,
  size = "md",
}: LoadingProps) {
  const isBrand = variant === "teal" || variant === "rose" || variant === "brand";
  const isGlass = variant === "glass";

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  const logoSizes = {
    sm: "w-9 h-9",
    md: "w-13 h-13",
    lg: "w-18 h-18",
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center p-6 select-none", className)}>
      {/* กล่องบรรจุโลโก้พร้อมประกายแสงหมุนวน */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* แสงเรืองรองด้านหลัง (Ambient Glow Aura) */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "absolute rounded-full blur-2xl pointer-events-none -inset-4",
            isBrand ? "bg-rose-400/40" : "bg-amber-500/25"
          )}
        />

        {/* วงแหวนสีเกรเดียนท์หมุนรอบนอก */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          className={cn(
            "rounded-full p-[3px] shadow-xl",
            sizeClasses[size],
            isBrand
              ? "bg-gradient-to-tr from-white via-rose-300 to-amber-400"
              : "bg-gradient-to-tr from-rose-600 via-amber-400 to-rose-500"
          )}
        >
          {/* วงกลมชั้นในที่ครอบรูปโลโก้ */}
          <div
            className={cn(
              "w-full h-full rounded-full flex items-center justify-center overflow-hidden p-2 shadow-inner",
              isBrand ? "bg-white" : "bg-surface border border-border"
            )}
          >
            <motion.img
              src="/Logo.png"
              alt="CrepeQ"
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={cn("object-contain drop-shadow-sm", logoSizes[size])}
            />
          </div>
        </motion.div>

        {/* ไอคอนประกายวิบวับหมุนวงโคจร */}
        <motion.div
          animate={{
            rotate: -360,
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg border-2 border-white"
        >
          <Sparkles size={12} className="animate-spin" style={{ animationDuration: "6s" }} />
        </motion.div>
      </div>

      {/* ข้อความหัวข้อ Title */}
      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "font-black tracking-tight mb-1 text-base sm:text-lg flex items-center justify-center gap-2",
          isBrand ? "text-white drop-shadow-sm" : "text-slate-800"
        )}
      >
        <span>{title}</span>
      </motion.h3>

      {/* ข้อความย่อย Message */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "text-xs font-medium max-w-xs leading-relaxed mb-4",
            isBrand ? "text-rose-100/90" : "text-slate-500"
          )}
        >
          {message}
        </motion.p>
      )}

      {/* แถบ Progress Bar แอนิเมชัน */}
      <div
        className={cn(
          "w-44 h-1.5 rounded-full overflow-hidden relative shadow-inner",
          isBrand ? "bg-rose-950/40 border border-rose-400/30" : "bg-slate-100 border border-slate-200/80"
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            isBrand
              ? "bg-gradient-to-r from-amber-300 via-rose-200 to-white"
              : "bg-gradient-to-r from-rose-500 via-amber-400 to-rose-600"
          )}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: "easeInOut",
          }}
          style={{ width: "60%" }}
        />
      </div>
    </div>
  );

  if (!fullscreen) {
    return content;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        isBrand && "bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900",
        isGlass && "bg-slate-900/60 backdrop-blur-md",
        variant === "light" && "bg-slate-50"
      )}
    >
      {/* วงคลื่นแสงพื้นหลัง */}
      {isBrand && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-rose-400 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-400 blur-3xl" />
        </div>
      )}

      <div className="relative z-10">{content}</div>
    </div>
  );
}

export default Loading;
