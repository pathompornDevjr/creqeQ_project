/**
 * @file RestaurantSummarySkeleton.tsx
 * @description โครงร่างแอนิเมชันสำหรับโหลดหน้าสรุปยอดขาย (Restaurant Summary Skeleton)
 * จำลองส่วนหัว, แถบเลือกช่วงเวลา, การ์ดสถิติ 4 ช่อง, กราฟยอดขาย, สินค้าขายดี และตารางออเดอร์ล่าสุด
 */

"use client";

import React from "react";

/**
 * คอมโพเนนต์ RestaurantSummarySkeleton
 * แสดงเอฟเฟกต์ pulse ระหว่างรอคำนวณและดึงข้อมูลสรุปยอดขาย
 */
export function RestaurantSummarySkeleton() {
  return (
    <div className="w-full h-full flex flex-col p-3 sm:p-4 lg:p-6 gap-4 sm:gap-5 pb-28 lg:pb-6 overflow-x-hidden animate-pulse select-none">
      {/* 1. โครงร่างส่วนหัวของหน้า (Top Header Skeleton) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-[20px] border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-3 shrink-0" />
            <div className="h-6 w-48 sm:w-64 rounded-lg bg-surface-3" />
          </div>
          <div className="h-3.5 w-40 rounded-md bg-surface-2" />
        </div>

        {/* แท็บเลือกช่วงเวลา วัน/สัปดาห์/เดือน/ปี */}
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-2xl border border-border shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-16 rounded-xl bg-surface-3" />
          ))}
        </div>
      </div>

      {/* 2. แถบตัวเลือกวันที่ (Period Picker Bar Skeleton) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 sm:px-4 sm:py-3 rounded-[18px] border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-surface-3" />
          <div className="h-4 w-28 rounded-md bg-surface-3" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 w-36 rounded-xl bg-surface-3" />
          <div className="h-8 w-16 rounded-xl bg-surface-2" />
          <div className="h-8 w-44 rounded-xl bg-brand-50 border border-brand-100 hidden sm:block" />
        </div>
      </div>

      {/* 3. การ์ดสถิติ 4 ช่อง (4 Stat Cards Grid Skeleton) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="bg-surface rounded-2xl p-4 sm:p-5 border border-border space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded-md bg-surface-3" />
              <div className="w-9 h-9 rounded-xl bg-surface-3 shrink-0" />
            </div>
            <div className="h-7 w-28 rounded-lg bg-surface-3" />
            <div className="h-3 w-20 rounded-md bg-surface-2" />
          </div>
        ))}
      </div>

      {/* 4. พื้นที่แสดงกราฟและเมนูขายดี (Main Grid: Charts 7 cols + Best Sellers 5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start flex-1">
        {/* คอลัมน์ซ้าย (7 คอลัมน์): กราฟแท่งยอดขาย & สัดส่วนประเภทสินค้า */}
        <div className="md:col-span-7 space-y-4 sm:space-y-5">
          {/* โครงร่างกราฟแท่งยอดขาย (Sales Bar Chart Skeleton) */}
          <div className="bg-surface rounded-[20px] border border-border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-52 rounded-md bg-surface-3" />
                <div className="h-3 w-40 rounded-md bg-surface-2" />
              </div>
              <div className="h-6 w-24 rounded-xl bg-brand-50 border border-brand-100" />
            </div>

            <div className="h-48 sm:h-56 md:h-64 rounded-xl bg-surface-2/60 flex items-end justify-between p-4 gap-3">
              {[45, 70, 35, 85, 60, 95, 80].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-surface-3"
                    style={{ height: `${h}%` }}
                  />
                  <div className="h-2.5 w-7 rounded bg-surface-3" />
                </div>
              ))}
            </div>
          </div>

          {/* โครงร่างสัดส่วนประเภทสินค้า (Category Share Card Skeleton) */}
          <div className="bg-surface rounded-[20px] border border-border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="h-4 w-48 rounded-md bg-surface-3" />
              <div className="h-3 w-40 rounded-md bg-surface-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3.5 w-24 rounded bg-surface-3" />
                      <div className="h-3.5 w-16 rounded bg-surface-2" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2" />
                  </div>
                ))}
              </div>
              <div className="h-40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-surface-3 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-surface-2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา (5 คอลัมน์): สินค้าขายดี 5 อันดับแรก (Best Sellers Top 5) */}
        <div className="md:col-span-5 space-y-4 sm:space-y-5">
          <div className="bg-surface rounded-[20px] border border-border overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-28 rounded-md bg-surface-3" />
                <div className="h-2.5 w-36 rounded-md bg-surface-2" />
              </div>
              <div className="h-5 w-14 rounded-full bg-amber-100" />
            </div>

            <div className="p-4 space-y-3.5 divide-y divide-border/60">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="pt-3.5 first:pt-0 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-surface-3 shrink-0" />
                  <div className="w-12 h-12 rounded-xl bg-surface-3 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3.5 w-28 rounded bg-surface-3" />
                      <div className="h-3.5 w-14 rounded bg-surface-3" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-2.5 w-16 rounded bg-surface-2" />
                      <div className="h-2.5 w-12 rounded bg-surface-2" />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. โครงร่างตารางรายการสั่งซื้อล่าสุด (Recent Orders Table Skeleton) */}
      <div className="bg-surface rounded-[20px] border border-border overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-44 rounded-md bg-surface-3" />
            <div className="h-3 w-56 rounded-md bg-surface-2" />
          </div>
          <div className="h-6 w-24 rounded-xl bg-surface-3" />
        </div>

        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="h-4 w-20 rounded bg-surface-3" />
              <div className="h-4 w-16 rounded bg-surface-3" />
              <div className="h-4 w-40 rounded bg-surface-2 hidden sm:block" />
              <div className="h-4 w-16 rounded bg-surface-3" />
              <div className="h-6 w-20 rounded-full bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
