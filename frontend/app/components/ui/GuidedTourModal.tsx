"use client";

/**
 * =========================================================================================
 * @file GuidedTourModal.tsx
 * @description คอมโพเนนต์หน้าต่างแนะนำขั้นตอนการใช้งานระบบสั่งอาหาร (Customer Guided Tour)
 * 
 * หน้าที่หลัก:
 * - แนะนำขั้นตอนการสั่งซื้อ 6 ขั้นตอน: เลือกแป้ง -> ใส่ไส้ -> ตะกร้า -> ชำระเงิน -> รับเลขคิว -> ติดตามสถานะ
 * - มีแถบ Progress Dots แสดงความคืบหน้า
 * - มีคอมโพเนนต์ปุ่มความช่วยเหลือ `HelpButton` สำหรับเปิดดูซ้ำได้ตลอดเวลา
 * =========================================================================================
 */

import React, { useState, useEffect } from "react";
import { HelpCircle, ChevronRight, ChevronLeft, X, Lightbulb, CheckCircle2, Sparkles } from "lucide-react";

/** Props ของคอมโพเนนต์ GuidedTourModal */
export interface GuidedTourProps {
  /** ควบคุมการเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** ขั้นตอนเริ่มต้น (เริ่มที่ 1) */
  initialStep?: number;
  /** สีหลักของแบรนด์ */
  primaryColor?: string;
  /** สีรองของแบรนด์ */
  secondaryColor?: string;
}

/** รายการขั้นตอนการสอนใช้งาน 6 ขั้นตอน */
export const TOUR_STEPS = [
  {
    step: 1,
    title: "1. เลือกแผ่นแป้งเครป",
    description: "ลองกดเลือก \"แผ่นกรอบ\" หรือ \"แผ่นนุ่ม\" ดูสิ — กดได้จริง ของที่เลือกจะคำนวณราคาสดทันที",
    hint: "ทัวร์นี้พาไปครบ 6 ขั้นตอน: แป้ง -> ไส้ -> ตะกร้า -> ชำระเงิน -> เลขคิว -> ติดตามสถานะ",
  },
  {
    step: 2,
    title: "2. ใส่ไส้ + ดูราคาสด",
    description: "เลือกไส้ตามใจชอบแยกตามหมวด หวาน, คาว, ผลไม้ ระบบจะคำนวณราคาสดให้ดูชัดเจน",
    hint: "ไส้ที่หมดจะขึ้นป้าย 'หมดวันนี้' ป้องกันการสั่งของที่หมดสต็อก",
  },
  {
    step: 3,
    title: "3. ตะกร้า + เลือกเวลามารับ",
    description: "ตรวจสอบรายการ และเลือกว่าจะรับ 'ตามคิว (~15 นาที)' หรือ 'เลือกเวลาเอง' ล่วงหน้าได้",
    hint: "เหมาะสำหรับคนที่ไม่อยากมายืนรอหน้าร้าน สั่งล่วงหน้าแล้วมารับตามเวลา",
  },
  {
    step: 4,
    title: "4. ชำระเงิน & อัปโหลดสลิปหลักฐาน",
    description: "สแกน QR Code พร้อมเพย์ หรือโอนผ่านเลขบัญชีของร้าน จากนั้นอัปโหลดรูปสลิปหลักฐานการชำระเงิน",
    hint: "ระบบตรวจสอบสลิปและแจ้งเตือนเข้าครัวร้านทันทีที่ยืนยันการชำระเงินเรียบร้อย",
  },
  {
    step: 5,
    title: "5. รับเลขคิว & QR ยืนยัน",
    description: "ระบบจะออกเลขคิวตัวใหญ่ (เช่น A057) พร้อมบอกจำนวนคิวก่อนหน้าและเวลาโดยประมาณ",
    hint: "มี QR Code สำหรับยื่นแสดงให้ร้านตอนมารับเครป",
  },
  {
    step: 6,
    title: "6. ติดตามสถานะเรียลไทม์ (LIVE)",
    description: "ดู Timeline สถานะแบบสดๆ: ยืนยันคำสั่งซื้อ -> กำลังจัดทำ -> เสร็จสิ้น พร้อมรับของ",
    hint: "หน้าจอจะอัปเดตเองอัตโนมัติเมื่อร้านเปลี่ยนสถานะ และมีปุ่มโทรติดต่อร้านได้ทันที",
  },
];

/**
 * คอมโพเนนต์ GuidedTourModal
 */
export function GuidedTourModal({
  isOpen,
  onClose,
  initialStep = 1,
  primaryColor,
  secondaryColor,
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep || 1);
    }
  }, [isOpen, initialStep]);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentStep - 1] || TOUR_STEPS[0];
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOUR_STEPS.length;

  const brandColor = primaryColor || "var(--brand-500, #E11D48)";
  const accentColor = secondaryColor || "var(--brand-secondary, #F59E0B)";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white text-zinc-900 rounded-t-[32px] sm:rounded-[28px] p-6 shadow-2xl border border-zinc-100 animate-slide-up sm:animate-scale-in flex flex-col gap-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* แสงเรืองรองมุมขวาบน */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: brandColor }}
        />

        {/* แถบหัวข้อ Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold border transition-colors shadow-xs"
              style={{
                backgroundColor: "var(--brand-50, rgba(225, 29, 72, 0.08))",
                color: brandColor,
                borderColor: "var(--brand-200, rgba(225, 29, 72, 0.25))",
              }}
            >
              ขั้นที่ {currentStep} / {TOUR_STEPS.length}
            </span>
            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              ทัวร์สอนใช้งาน
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            title="ปิด / ข้ามการสอน"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* เนื้อหาในแต่ละขั้นตอน */}
        <div className="space-y-3 py-1 relative z-10">
          <h3 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
            {current.title}
          </h3>
          <p className="text-sm text-zinc-600 leading-relaxed font-normal">
            {current.description}
          </p>

          <div
            className="border rounded-2xl p-3.5 text-xs text-zinc-700 leading-relaxed flex items-start gap-2.5 transition-all shadow-xs"
            style={{
              backgroundColor: "var(--brand-50, rgba(225, 29, 72, 0.06))",
              borderColor: "var(--brand-200, rgba(225, 29, 72, 0.2))",
            }}
          >
            <Lightbulb
              className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500"
              style={{ color: accentColor }}
            />
            <span className="font-medium text-zinc-700 leading-relaxed">{current.hint}</span>
          </div>
        </div>

        {/* จุดแสดงความคืบหน้า Progress Dots */}
        <div className="flex items-center gap-1.5 justify-center py-1 relative z-10">
          {TOUR_STEPS.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = s.step < currentStep;

            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                aria-label={`ขั้นตอนที่ ${s.step}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive ? "w-8 shadow-xs" : isCompleted ? "w-3" : "w-3 bg-zinc-200"
                }`}
                style={
                  isActive
                    ? { backgroundColor: brandColor }
                    : isCompleted
                    ? { backgroundColor: brandColor, opacity: 0.45 }
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* ปุ่มควบคุม (ย้อนกลับ / ถัดไป) */}
        <div className="flex items-center gap-2.5 pt-1 relative z-10">
          {!isFirst && (
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="flex-1 py-3.5 px-4 rounded-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border border-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              ย้อนกลับ
            </button>
          )}

          <button
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setCurrentStep((prev) => Math.min(TOUR_STEPS.length, prev + 1));
              }
            }}
            style={{ backgroundColor: brandColor }}
            className="flex-1 py-3.5 px-5 rounded-full text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>เข้าใจแล้ว เริ่มสั่งเลย</span>
              </>
            ) : (
              <>
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-400 relative z-10">
          กดไอคอน &quot;?&quot; มุมขวาบนของทุกหน้าเพื่อเปิดดูคำแนะนำซ้ำได้เสมอ
        </p>
      </div>
    </div>
  );
}

/**
 * ปุ่มไอคอนเครื่องหมายคำถาม (?) สำหรับเรียกเปิดหน้าต่างแนะนำการใช้งาน
 */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="วิธีใช้งาน / คำแนะนำ"
      aria-label="วิธีใช้งาน"
      className="w-9 h-9 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}
