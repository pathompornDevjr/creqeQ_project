/**
 * @file not-found.tsx
 * @description หน้าจอแจ้งเตือน 404 ไม่พบหน้าที่ระบุ (Page Not Found)
 * ออกแบบในธีม CrepeQ ด้วย Framer Motion แอนิเมชัน และ Responsive Background
 */

"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden font-sans select-none">
      {/* ภาพพื้นหลังตามอุปกรณ์ที่ใช้งาน (Responsive Background Images) */}
      <div className="fixed inset-0 z-0 bg-rose-600">
        <picture className="block w-full h-full">
          {/* Mobile Landscape */}
          <source media="(max-height: 600px) and (min-width: 480px)" srcSet="/BG_PT.png" />
          <source media="(max-height: 600px)" srcSet="/BG_PT.png" />
          <source media="(max-width: 960px) and (min-aspect-ratio: 1.2/1)" srcSet="/BG_PT.png" />
          <source media="(max-width: 950px) and (orientation: landscape)" srcSet="/BG_PT.png" />
          {/* Mobile Portrait */}
          <source media="(max-width: 639px)" srcSet="/BG_M.png" />
          {/* iPad Portrait */}
          <source media="(min-width: 640px) and (max-width: 1023px) and (orientation: portrait)" srcSet="/BG_PT.png" />
          <source media="(min-width: 640px) and (max-width: 1023px) and (max-aspect-ratio: 1/1)" srcSet="/BG_PT.png" />
          {/* iPad Landscape */}
          <source media="(max-width: 1023px)" srcSet="/BG_P.png" />
          {/* Desktop Fallback */}
          <img
            src="/BG.png"
            alt="Background"
            className="w-full h-full object-cover object-top sm:object-center transition-all duration-500 min-h-dvh"
          />
        </picture>
      </div>

      {/* ส่วนหัวแสดงโลโก้แบรนด์ CrepeQ */}
      <div className="relative z-20 flex items-center justify-center gap-3.5 mb-6 sm:mb-8 text-center drop-shadow-md">
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center border-4 border-white/90 shadow-2xl shrink-0 p-2 sm:p-2.5 overflow-hidden">
          <img src="/Logo.png" alt="CrepeQ Logo" className="w-full h-full object-contain scale-110" />
        </div>
        <div className="text-left">
          <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-white uppercase leading-none drop-shadow-sm">
            CrepeQ
          </h1>
          <p className="text-xs sm:text-sm text-white/95 font-black mt-1 drop-shadow-xs">
            ระบบจัดการร้านค้าครบวงจร
          </p>
        </div>
      </div>

      {/* การ์ดเนื้อหาข้อความ 404 พร้อมแอนิเมชัน */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg bg-white rounded-[36px] shadow-2xl p-8 sm:p-10 relative z-20 border border-slate-100/90 text-center space-y-6"
      >
        {/* กราฟิกไอคอนหมุนวน */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {/* วงแหวนหมุนรอบไอคอน */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-rose-500/40"
          />
          
          {/* วงกลมไอคอนช้อนส้อม */}
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 border-2 border-rose-500 flex items-center justify-center shadow-md relative z-10">
            <UtensilsCrossed size={36} className="text-rose-600" />
          </div>

          {/* ป้ายแท็ก 404 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="absolute -bottom-1 -right-1 bg-rose-600 text-white text-xs font-black px-3 py-0.5 rounded-full border-2 border-white shadow-md"
          >
            404
          </motion.div>
        </div>

        {/* หัวข้อและคำอธิบาย */}
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-xs mx-auto">
            ขออภัย หน้าที่คุณกำลังพยายามเข้าถึงอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้องในระบบ CrepeQ
          </p>
        </div>

        {/* ปุ่มนำทางกลับ */}
        <div className="pt-2 space-y-3">
          <Link
            href="/"
            className="w-full h-12 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-extrabold rounded-full shadow-lg shadow-rose-600/30 transition-all text-sm flex items-center justify-center gap-2 group"
          >
            <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
            กลับสู่หน้าหลัก
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full h-12 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.99] font-bold rounded-full transition-all text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            ย้อนกลับไปหน้าเดิม
          </button>
        </div>

        {/* ส่วนท้ายแสดงชื่อระบบ */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
          CrepeQ - Order Management System
        </div>
      </motion.div>
    </div>
  );
}
