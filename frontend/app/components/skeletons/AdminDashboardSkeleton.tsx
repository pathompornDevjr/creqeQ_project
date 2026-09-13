/**
 * @file AdminDashboardSkeleton.tsx
 * @description โครงร่างแอนิเมชันสำหรับโหลดหน้าแดชบอร์ดผู้ดูแลระบบ (Admin Dashboard Skeleton)
 * จำลองหน้าตาของ Header Banner, ตัวกรองช่วงเวลา, การแจ้งเตือนด่วน, การ์ดสถิติ KPI, กราฟ และตาราง
 */

"use client";

import React from "react";

/**
 * คอมโพเนนต์ AdminDashboardSkeleton
 * แสดงเอฟเฟกต์ pulse ระหว่างรอการโหลดข้อมูลแดชบอร์ดฝั่งแอดมิน
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0 animate-pulse select-none">
      {/* 1. โครงร่างส่วนแบนเนอร์ด้านบน (Header Banner Skeleton) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-700/80 via-brand-800/80 to-brand-900/80 p-6 rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="space-y-2.5 z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-44 rounded-full bg-white/20" />
            <div className="h-4 w-32 rounded-md bg-white/15 hidden sm:block" />
          </div>
          <div className="h-8 w-64 rounded-xl bg-white/25" />
          <div className="h-4 w-80 max-w-full rounded-md bg-white/15" />
        </div>

        <div className="flex items-center gap-2.5 z-10 shrink-0 self-start sm:self-center">
          <div className="h-10 w-36 rounded-xl bg-white/30" />
          <div className="h-10 w-28 rounded-xl bg-white/15" />
        </div>
      </div>

      {/* 2. โครงร่างแถบตัวกรองช่วงเวลา (Unified Period Filter Toolbar Skeleton) */}
      <div className="bg-surface rounded-[24px] border border-border p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-surface-3" />
            <div className="h-4 w-24 rounded-md bg-surface-3" />
          </div>

          {/* ปุ่มเลือกช่วงเวลารูปทรง Pill */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-16 rounded-lg bg-surface-3" />
            ))}
          </div>

          {/* ดรอปดาวน์เลือกช่วงเวลา */}
          <div className="h-9 w-44 rounded-xl bg-surface-3" />
        </div>

        {/* ป้ายแสดงช่วงวันที่ที่เลือก */}
        <div className="h-8 w-56 rounded-xl bg-brand-50/80 border border-brand-100" />
      </div>

      {/* 3. โครงร่างแถบแจ้งเตือนงานด่วน (Action Needed Alert Bar Skeleton) */}
      <div className="bg-amber-500/10 border border-amber-300/60 p-4 rounded-[20px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-200/60 flex items-center justify-center shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-52 rounded-md bg-amber-200/70" />
            <div className="h-3 w-72 rounded-md bg-amber-100/70" />
          </div>
        </div>
        <div className="h-8 w-32 rounded-xl bg-amber-200/60 shrink-0 self-end sm:self-auto" />
      </div>

      {/* 4. การ์ดตัวชี้วัดสถิติสำคัญ (Platform Key Stats Cards Grid - 4 KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="bg-surface rounded-2xl p-4 sm:p-5 border border-border space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded-md bg-surface-3" />
              <div className="w-9 h-9 rounded-xl bg-surface-3 shrink-0" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-surface-3" />
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-3 w-16 rounded-md bg-surface-3" />
              <div className="h-3 w-20 rounded-md bg-surface-2" />
            </div>
          </div>
        ))}
      </div>

      {/* 5. ส่วนแสดงข้อมูลหลัก (Main Section Grid: 2 คอลัมน์ซ้าย, 1 คอลัมน์ขวา) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* คอลัมน์ซ้าย: กราฟการเติบโต และตารางร้านค้าชั้นนำ */}
        <div className="xl:col-span-2 space-y-6 min-w-0">
          {/* โครงร่างกราฟการเติบโต (Growth Chart Skeleton) */}
          <div className="bg-surface rounded-[24px] border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-1.5">
                <div className="h-5 w-48 rounded-md bg-surface-3" />
                <div className="h-3 w-64 rounded-md bg-surface-2" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 rounded-md bg-surface-3" />
                <div className="h-4 w-20 rounded-md bg-surface-3" />
              </div>
            </div>

            {/* พื้นที่จำลองกราฟแท่ง */}
            <div className="h-[280px] w-full rounded-xl bg-surface-2/60 flex items-end justify-between p-4 gap-3">
              {[40, 65, 30, 85, 50, 90, 75, 45].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-surface-3"
                    style={{ height: `${height}%` }}
                  />
                  <div className="h-2.5 w-8 rounded bg-surface-3" />
                </div>
              ))}
            </div>
          </div>

          {/* โครงร่างตารางร้านค้ายอดนิยม (Top Stores Table Card Skeleton) */}
          <div className="bg-surface rounded-[24px] border border-border overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border bg-surface-2 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-5 w-44 rounded-md bg-surface-3" />
                <div className="h-3 w-56 rounded-md bg-surface-3" />
              </div>
              <div className="h-4 w-20 rounded-md bg-surface-3" />
            </div>

            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((rowIdx) => (
                <div key={rowIdx} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-surface-3 shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="h-4 w-32 sm:w-48 rounded-md bg-surface-3" />
                      <div className="h-2.5 w-20 rounded-md bg-surface-2" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right shrink-0">
                    <div className="h-4 w-20 rounded-md bg-surface-3 ml-auto" />
                    <div className="h-2.5 w-14 rounded-md bg-surface-2 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: รายการงานที่ต้องดำเนินการด่วน & สัดส่วนแพ็กเกจ */}
        <div className="space-y-6">
          {/* โครงร่างรายการงานด่วน (Urgent Action Feed Skeleton) */}
          <div className="bg-surface rounded-[24px] border border-border overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div className="h-4 w-28 rounded-md bg-surface-3" />
              <div className="h-5 w-16 rounded-full bg-amber-100" />
            </div>

            <div className="divide-y divide-border">
              {[1, 2, 3].map((taskIdx) => (
                <div key={taskIdx} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-12 rounded-full bg-surface-3" />
                      <div className="h-4 w-28 rounded-md bg-surface-3" />
                    </div>
                    <div className="h-3 w-12 rounded bg-surface-2" />
                  </div>
                  <div className="h-3 w-4/5 rounded bg-surface-2" />
                  <div className="pt-1 flex justify-end">
                    <div className="h-7 w-20 rounded-lg bg-surface-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* โครงร่างแผนภูมิวงกลมสัดส่วนแพ็กเกจ (Package Distribution Chart Skeleton) */}
          <div className="bg-surface rounded-[24px] border border-border p-5 shadow-xs space-y-4">
            <div className="h-4 w-36 rounded-md bg-surface-3 border-b border-border pb-2" />

            <div className="h-44 flex items-center justify-center relative">
              <div className="w-36 h-36 rounded-full border-8 border-surface-3 flex items-center justify-center">
                <div className="space-y-1 text-center">
                  <div className="h-6 w-12 rounded bg-surface-3 mx-auto" />
                  <div className="h-2.5 w-16 rounded bg-surface-2 mx-auto" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded-md bg-surface-3" />
                <div className="h-3.5 w-16 rounded-md bg-surface-3" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded-md bg-surface-3" />
                <div className="h-3.5 w-16 rounded-md bg-surface-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
