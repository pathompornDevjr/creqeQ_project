/**
 * @file RestaurantLayoutSkeleton.tsx
 * @description โครงร่างแอนิเมชันสำหรับโครงสร้างหน้าหลักร้านค้า (Restaurant Layout Skeleton)
 * แสดงแถบเมนูด้านข้าง (Sidebar), ส่วนหัว (Header), การ์ดสถิติ และรายการคิวจำลอง
 */

"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

/**
 * คอมโพเนนต์ RestaurantLayoutSkeleton
 * แสดงเอฟเฟกต์ pulse จำลองโครงสร้างหน้าแดชบอร์ดร้านค้า
 */
export function RestaurantLayoutSkeleton() {
  return (
    <div className="flex h-dvh bg-surface-2 overflow-hidden relative">
      {/* ── โครงร่างแถบเมนูด้านข้างบน Desktop (Left Sidebar Skeleton) ── */}
      <div className="hidden lg:flex flex-col w-[240px] h-screen bg-surface border-r border-border flex-shrink-0 p-4 justify-between select-none">
        {/* ส่วนหัวแสดงโลโก้ร้าน */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-xl bg-surface-3 skeleton shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 w-3/4 rounded-md skeleton" />
              <div className="h-2.5 w-1/2 rounded-md skeleton" />
            </div>
          </div>

          {/* รายการเมนูนำทาง */}
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-2/60 border border-border/40"
              >
                <div className="w-5 h-5 rounded-lg skeleton shrink-0" />
                <div
                  className="h-3.5 rounded-md skeleton"
                  style={{ width: i === 1 ? "60%" : i === 2 ? "45%" : "70%" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนท้าย: โปรไฟล์และปุ่มออกจากระบบ */}
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2/40">
            <div className="w-5 h-5 rounded-md skeleton shrink-0" />
            <div className="h-3.5 w-1/3 rounded-md skeleton" />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2/40">
            <div className="w-5 h-5 rounded-md skeleton shrink-0" />
            <div className="h-3.5 w-1/2 rounded-md skeleton" />
          </div>
        </div>
      </div>

      {/* ── โครงร่างพื้นที่แสดงผลเนื้อหาหลัก (Main Content Area Skeleton) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ส่วนหัวบนจอมือถือ (Mobile Top Header) */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-surface border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
            <div className="space-y-1">
              <div className="h-3.5 w-24 rounded-md skeleton" />
              <div className="h-2 w-16 rounded-md skeleton" />
            </div>
          </div>
          <div className="w-7 h-7 rounded-full skeleton" />
        </div>

        {/* ส่วนเนื้อหาที่เลื่อนได้ (Scrollable Page Body Skeleton) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* แถบหัวเรื่องหน้า (Page Header) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 sm:h-7 w-48 sm:w-64 rounded-lg skeleton" />
              <div className="h-3.5 w-32 sm:w-44 rounded-md skeleton" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 rounded-xl skeleton" />
              <div className="h-9 w-28 rounded-xl skeleton" />
            </div>
          </div>

          {/* การ์ดตัวชี้วัดสถิติ 4 ช่อง (Metric Cards Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-surface rounded-2xl p-4 sm:p-5 border border-border space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded-md skeleton" />
                  <div className="w-8 h-8 rounded-xl skeleton" />
                </div>
                <div className="h-7 w-28 rounded-lg skeleton" />
                <div className="h-2.5 w-16 rounded-md skeleton" />
              </div>
            ))}
          </div>

          {/* กล่องเนื้อหาหลัก (Main Table / Queue Container Skeleton) */}
          <div className="bg-surface rounded-3xl border border-border p-5 sm:p-6 space-y-5 shadow-xs">
            {/* แถบตัวกรองและค้นหา */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="h-10 w-full sm:w-72 rounded-xl skeleton" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-24 rounded-xl skeleton" />
                <div className="h-9 w-24 rounded-xl skeleton" />
              </div>
            </div>

            {/* การ์ดรายการย่อย */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
              {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-surface-2 rounded-2xl p-4 border border-border/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg skeleton" />
                      <div className="h-4 w-20 rounded-md skeleton" />
                    </div>
                    <div className="h-5 w-16 rounded-full skeleton" />
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="h-3 w-full rounded-md skeleton" />
                    <div className="h-3 w-4/5 rounded-md skeleton" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="h-4 w-16 rounded-md skeleton" />
                    <div className="h-7 w-20 rounded-xl skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ป้ายลอยแสดงสถานะการตรวจสอบสิทธิ์แพ็กเกจ (Floating Verification Indicator Badge) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-slate-900/90 text-white backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-3 text-xs font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>กำลังตรวจสอบสถานะแพ็กเกจร้านค้า...</span>
        </div>
      </div>
    </div>
  );
}
