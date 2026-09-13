/**
 * @file PickupTimeSelector.tsx
 * @description คอมโพเนนต์สำหรับให้ลูกค้าเลือกเวลามารับสินค้า
 * มี 2 ตัวเลือก: 1) รับทันทีตามคิว (ASAP) หรือ 2) เลือกเวลามารับล่วงหน้าตามช่วงเวลาที่สะดวก
 */

"use client";

import React, { useState, useMemo } from "react";
import { Clock } from "lucide-react";

/** พร็อพส์สำหรับคอมโพเนนต์ PickupTimeSelector */
export interface PickupTimeSelectorProps {
  /** ค่าปัจจุบันของเวลาที่เลือก */
  value: { type: "asap" | "scheduled"; scheduledTime?: string };
  /** ฟังก์ชัน Callback เมื่อมีการเปลี่ยนแปลงเวลา */
  onChange: (val: { type: "asap" | "scheduled"; scheduledTime?: string }) => void;
  /** เวลาโดยประมาณสำหรับการทำตามคิว (นาที) */
  asapMinutes?: number;
}

/**
 * ฟังก์ชันสร้างช่วงเวลารับสินค้าแบบ Dynamic รอบละ 20 นาที
 * @param count จำนวนช่วงเวลาที่ต้องการสร้าง
 */
export function generateDynamicTimeSlots(count = 6): { time: string; isFull: boolean }[] {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  // ปัดเวลาไปยัง 15 นาทีถัดไป + เวลาเตรียมการ 20 นาที
  const start = new Date(now.getTime() + 20 * 60 * 1000);
  const roundedMin = Math.ceil(start.getMinutes() / 15) * 15;
  start.setMinutes(roundedMin, 0, 0);

  const slots = [];
  for (let i = 0; i < count; i++) {
    const slotTime = new Date(start.getTime() + i * 20 * 60 * 1000);
    const timeStr = slotTime.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    slots.push({ time: timeStr, isFull: false });
  }
  return slots;
}

/**
 * คอมโพเนนต์ PickupTimeSelector
 */
export function PickupTimeSelector({
  value,
  onChange,
  asapMinutes = 12,
}: PickupTimeSelectorProps) {
  const timeSlots = useMemo(() => generateDynamicTimeSlots(6), []);
  const isAsap = value.type === "asap";
  const selectedTime = value.scheduledTime || "";

  // เลือกรับทันทีตามคิว
  const handleSelectAsap = () => {
    onChange({ type: "asap", scheduledTime: undefined });
  };

  // เลือกนัดเวลารับล่วงหน้า
  const handleSelectScheduled = (time?: string) => {
    onChange({ type: "scheduled", scheduledTime: time || selectedTime || undefined });
  };

  return (
    <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5">
      {/* ส่วนหัวแสดงหัวข้อและสถานะเวลาที่เลือก */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-800 tracking-tight flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          เวลามารับสินค้า
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
            isAsap
              ? "text-zinc-600 bg-zinc-100 border-zinc-200/60"
              : selectedTime
              ? "text-brand-600 bg-brand-50 border-brand-200"
              : "text-rose-600 bg-rose-50 border-rose-200 animate-pulse"
          }`}
          style={
            !isAsap && selectedTime
              ? {
                  color: "var(--brand-600, #E11D48)",
                  backgroundColor: "var(--brand-50, rgba(244,63,94,0.1))",
                  borderColor: "var(--brand-200, rgba(244,63,94,0.3))",
                }
              : {}
          }
        >
          {isAsap
            ? "รับทันทีตามคิว"
            : selectedTime
            ? `นัดรับ ${selectedTime} น.`
            : "ยังไม่ระบุเวลา"}
        </span>
      </div>

      {/* สวิตช์สลับตัวเลือก: ตามคิวทันที vs กำหนดเวลาเอง */}
      <div className="flex items-center p-1 bg-zinc-100 rounded-full border border-zinc-200/60">
        <button
          type="button"
          onClick={handleSelectAsap}
          style={
            isAsap
              ? { color: "var(--brand-500, #F43F5E)" }
              : {}
          }
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isAsap
              ? "bg-white shadow-xs"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>ตามคิว (ประมาณ {asapMinutes} นาที)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectScheduled(selectedTime || undefined)}
          style={
            !isAsap
              ? { color: "var(--brand-500, #F43F5E)" }
              : {}
          }
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            !isAsap
              ? "bg-white shadow-xs"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>เลือกเวลาเอง</span>
        </button>
      </div>

      {/* ปุ่มช่วงเวลาให้เลือก (แสดงเมื่อเลือกกำหนดเวลาเอง) */}
      {!isAsap && (
        <div className="space-y-2 pt-1 animate-fade-up">
          <div className="flex items-center justify-between pl-1">
            <span className="text-[11px] font-medium text-zinc-500">
              เลือกช่วงเวลาที่สะดวก:
            </span>
            {!selectedTime && (
              <span className="text-[10px] font-bold text-rose-600 animate-pulse">
                * กรุณาคลิกเลือก 1 ช่วงเวลา
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = !isAsap && selectedTime === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={slot.isFull}
                  onClick={() => onChange({ type: "scheduled", scheduledTime: slot.time })}
                  style={
                    isSelected
                      ? {
                          backgroundColor: "var(--brand-500, #F43F5E)",
                          borderColor: "var(--brand-500, #F43F5E)",
                        }
                      : {}
                  }
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                    slot.isFull
                      ? "bg-zinc-50 text-zinc-400 cursor-not-allowed border-zinc-200/60 opacity-60"
                      : isSelected
                      ? "text-white shadow-xs"
                      : "bg-zinc-50/70 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80 active:scale-95"
                  }`}
                >
                  <span>{slot.time}</span>
                  {slot.isFull && <span className="text-[9px] font-semibold text-zinc-400">(เต็ม)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
