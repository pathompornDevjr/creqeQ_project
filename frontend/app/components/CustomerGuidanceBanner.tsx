"use client";

/**
 * =========================================================================================
 * @file CustomerGuidanceBanner.tsx
 * @description คอมโพเนนต์แบนเนอร์คำแนะนำสำหรับลูกค้าในการสั่งอาหารและติดตามสถานะ
 * 
 * หน้าที่หลัก:
 * - แนะนำให้เปิดด้วย Safari / Chrome เมื่อสแกนจากแอป LINE เพื่อไม่ให้ออเดอร์หลุด
 * - อธิบายการสั่งอาหารร่วมกันในโต๊ะเดียวกัน และการสั่งเพิ่มหลายรอบ
 * - เตือนกรณีมีแอปอื่นเปิดทับหน้าจอ (Screen Overlay)
 * - บันทึกสถานะปิดแบนเนอร์ลงใน SessionStorage เพื่อไม่ให้รบกวนในรอบถัดไป
 * =========================================================================================
 */

import React, { useState, useEffect } from "react";
import { Info, ChevronDown, ChevronUp, Compass, Users, Sparkles, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** Props ของคอมโพเนนต์ CustomerGuidanceBanner */
interface CustomerGuidanceBannerProps {
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/**
 * คอมโพเนนต์ CustomerGuidanceBanner
 */
export function CustomerGuidanceBanner({ className = "" }: CustomerGuidanceBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("qrshop_guidance_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  if (isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem("qrshop_guidance_dismissed", "true");
    } catch {}
  };

  return (
    <div className={`bg-gradient-to-r from-brand-50/90 via-sky-50/80 to-indigo-50/80 border border-brand-200/80 rounded-2xl p-3.5 shadow-xs transition-all ${className}`}>
      {/* แถบหัวข้อ Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Info size={15} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-text flex items-center gap-1.5 leading-tight">
              คำแนะนำในการสั่ง & ติดตามสถานะ
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-700 font-extrabold hidden sm:inline">
                สำคัญ
              </span>
            </h4>
            <p className="text-[10px] text-text-3 truncate">
              {isExpanded ? "แตะเพื่อย่อคำแนะนำ" : "เปิดใน Safari / Chrome และสั่งร่วมกันในโต๊ะได้"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="w-6 h-6 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-3 hover:text-text transition-colors"
            title={isExpanded ? "ย่อ" : "ขยาย"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg hover:bg-black/5 flex items-center justify-center text-text-3 hover:text-text transition-colors"
            title="ปิดการแจ้งเตือนนี้"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* เนื้อหาคำแนะนำแบบพับขยายได้ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2.5 border-t border-brand-200/60 space-y-2.5 text-[11px]">
              {/* ข้อแนะนำที่ 1: เบราว์เซอร์ */}
              <div className="flex items-start gap-2 text-text-2">
                <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass size={12} />
                </div>
                <div className="leading-relaxed">
                  <span className="font-bold text-text">ใช้เบราว์เซอร์เดิมเสมอ:</span> หากสแกนผ่านแอปแชท เช่น LINE แนะนำให้แตะปุ่ม <span className="font-semibold text-brand-600">เมนู (⋯)</span> แล้วเลือก <span className="font-semibold text-brand-600">"เปิดด้วยเบราว์เซอร์เริ่มต้น (Safari / Chrome)"</span> เพื่อไม่ให้ออเดอร์หลุดเมื่อปิดแอป
                </div>
              </div>

              {/* ข้อแนะนำที่ 2: สั่งร่วมกันหลายคนในโต๊ะ */}
              <div className="flex items-start gap-2 text-text-2">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={12} />
                </div>
                <div className="leading-relaxed">
                  <span className="font-bold text-text">สั่งร่วมกันในโต๊ะเดียวกันได้:</span> เพื่อนร่วมโต๊ะสามารถสแกน QR โค้ดเดียวกันเพื่อเลือกและสั่งอาหารเพิ่มได้ตลอดเวลา ระบบจะแยกรายการเข้าครัวให้อัตโนมัติ
                </div>
              </div>

              {/* ข้อแนะนำที่ 3: สั่งได้หลายรอบ */}
              <div className="flex items-start gap-2 text-text-2">
                <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} />
                </div>
                <div className="leading-relaxed">
                  <span className="font-bold text-text">สั่งเพิ่มได้เรื่อยๆ:</span> ต้องการสั่งของทานเล่นหรือเครื่องดื่มเพิ่ม สามารถกดสั่งเป็นรอบใหม่ได้ทันที และติดตามสถานะได้ที่แท็บ "สถานะสั่ง"
                </div>
              </div>

              {/* ข้อแนะนำที่ 4: ปัญหาแอปเปิดทับหน้าจอ */}
              <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold text-amber-800 dark:text-amber-300">หากพบการแจ้งเตือน "มีแอปอื่นเปิดทับหน้าจออยู่":</strong> เกิดจากไอคอนลอย (เช่น Chat Head, แอปบันทึกหน้าจอ หรือแอปถนอมสายตา) บดบังการสแกนหรือขอสิทธิ์ ให้ลากปิดไอคอนลอยเหล่านั้น หรือเปิดลิงก์ผ่าน <span className="underline font-bold">Safari / Chrome</span> เพื่อใช้งานได้ตามปกติ
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
