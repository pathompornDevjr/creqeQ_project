/**
 * @file PauseStoreModal.tsx
 * @description Modal สำหรับสั่งหยุดรับออเดอร์ชั่วคราว (Pause Store Modal)
 * ช่วยให้ร้านค้าสามารถหยุดรับคิวใหม่ได้ตามระยะเวลาที่กำหนด (เช่น 15 นาที, 30 นาที, 1 ชม. หรือปิดร้านวันนี้)
 * พร้อมระบุเหตุผลและเลือกได้ว่าจะยังเปิดให้ลูกค้าจองเวลามารับล่วงหน้าได้หรือไม่
 */

"use client";

import React, { useState } from "react";
import { X, Pause, CheckSquare, Square } from "lucide-react";

/** พร็อพส์สำหรับคอมโพเนนต์ PauseStoreModal */
export interface PauseStoreModalProps {
  /** สถานะเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อกดปิด Modal */
  onClose: () => void;
  /** ฟังก์ชันเมื่อกดยืนยันการหยุดรับออเดอร์ */
  onConfirm: (payload: {
    durationMinutes: number;
    reason: string;
    allowPreorder: boolean;
  }) => void;
}

/** ตัวเลือกระยะเวลาหยุดรับออเดอร์ */
export const DURATION_OPTIONS = [
  { label: "15 นาที", minutes: 15 },
  { label: "30 นาที", minutes: 30 },
  { label: "1 ชม.", minutes: 60 },
  { label: "ปิดร้านวันนี้", minutes: 720 },
];

/** ตัวเลือกเหตุผลยอดนิยม */
export const REASON_OPTIONS = [
  "ออเดอร์แน่นอยู่",
  "วัตถุดิบหมด",
  "พักเบรก",
];

/**
 * คอมโพเนนต์ PauseStoreModal
 */
export function PauseStoreModal({ isOpen, onClose, onConfirm }: PauseStoreModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[1]);
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [allowPreorder, setAllowPreorder] = useState(false);

  if (!isOpen) return null;

  // คำนวณเวลาที่จะกลับมาเปิดรับออเดอร์อีกครั้ง
  const now = new Date();
  const resumeDate = new Date(now.getTime() + selectedDuration.minutes * 60 * 1000);
  const resumeTimeStr = resumeDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  const finalReason = isCustomReason ? (customReason || "หยุดรับชั่วคราว") : selectedReason;

  // เมื่อกดยืนยันการหยุดรับออเดอร์
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      durationMinutes: selectedDuration.minutes,
      reason: finalReason,
      allowPreorder,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white text-zinc-900 rounded-[28px] p-6 shadow-2xl border border-zinc-200/80 animate-scale-in flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ส่วนหัว Modal */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center">
              <Pause className="w-4 h-4 fill-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                หยุดรับออเดอร์ชั่วคราว
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">ปิดรับคิวใหม่ชั่วคราว</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ข้อความชี้แจงการทำงาน */}
        <p className="text-xs text-zinc-500 leading-relaxed font-medium">
          คิวที่รับไว้แล้วในครัวยังคงทำต่อตามปกติ ระบบจะปิดปุ่มสั่งของหน้าลูกค้า และแจ้งเวลาเปิดรับอีกครั้ง
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ตัวเลือกระยะเวลาหยุดรับออเดอร์ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 block pl-1">
              เลือกระยะเวลาหยุดรับ
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((d) => {
                const isSelected = selectedDuration.minutes === d.minutes;
                return (
                  <button
                    key={d.minutes}
                    type="button"
                    onClick={() => setSelectedDuration(d)}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center border ${
                      isSelected
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                        : "bg-zinc-50/80 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ตัวเลือกเหตุผล */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 block pl-1">
              เหตุผลที่แจ้งให้ลูกค้าทราบ
            </label>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map((r) => {
                const isSelected = !isCustomReason && selectedReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setIsCustomReason(false);
                      setSelectedReason(r);
                    }}
                    className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                        : "bg-zinc-50/80 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCustomReason(true)}
                className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all border ${
                  isCustomReason
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-zinc-50/80 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80"
                }`}
              >
                ระบุเอง...
              </button>
            </div>

            {isCustomReason && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ล้างกระทะ, เติมแก๊ส"
                className="w-full mt-2 px-4 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-zinc-900 transition shadow-inner"
              />
            )}
          </div>

          {/* กล่องตัวเลือกให้จองเวลามารับล่วงหน้า */}
          <div
            onClick={() => setAllowPreorder(!allowPreorder)}
            className="flex items-center gap-2 cursor-pointer select-none py-1 pl-1"
          >
            {allowPreorder ? (
              <CheckSquare className="w-4 h-4 text-zinc-900" />
            ) : (
              <Square className="w-4 h-4 text-zinc-300" />
            )}
            <span className="text-xs text-zinc-600 font-medium">
              ยังให้จองเวลามารับล่วงหน้าได้ (แค่หยุดคิวแบบสั่งทันที)
            </span>
          </div>

          {/* ปุ่มบันทึกการกระทำ */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-full border border-zinc-200/90 hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition active:scale-95"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-full text-xs shadow-md active:scale-[0.98] transition-all"
            >
              หยุดรับ {selectedDuration.label} (เปิด {resumeTimeStr})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
