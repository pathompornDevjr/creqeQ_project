/**
 * @file RestaurantQueueSkeleton.tsx
 * @description โครงร่างแอนิเมชันสำหรับโหลดหน้าคิวร้านค้า (Restaurant Queue Skeleton)
 * รองรับทั้งเลย์เอาต์ Desktop (Master-Detail ฝั่งซ้ายเป็นรายละเอียด ฝั่งขวาเป็นรายการคิว) และ Mobile
 */

"use client";

import React from "react";

/**
 * คอมโพเนนต์ RestaurantQueueSkeleton
 * แสดงเอฟเฟกต์ pulse จำลองหน้าจัดการคิวระหว่างรอการดึงข้อมูลจากเซิร์ฟเวอร์
 */
export function RestaurantQueueSkeleton() {
  return (
    <div className="flex flex-col h-full bg-surface-2 overflow-hidden animate-pulse select-none">
      {/* 1. ส่วนหัวของหน้า (Header Bar Skeleton) */}
      <header className="bg-surface border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 shadow-sm z-10 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-32 rounded-lg bg-surface-3" />
            <div className="h-5 w-24 rounded-full bg-surface-2" />
            <div className="h-5 w-20 rounded-full bg-surface-2" />
          </div>
          <div className="h-3.5 w-48 rounded-md bg-surface-2" />
        </div>

        {/* ปุ่มควบคุมฝั่งขวา */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-44 rounded-xl bg-surface-2 border border-border" />
          <div className="w-9 h-9 rounded-full bg-surface-3 shrink-0" />
          <div className="w-9 h-9 rounded-full bg-surface-3 shrink-0" />
        </div>
      </header>

      {/* ═══ DESKTOP: โครงสร้าง Master-Detail บนหน้าจอคอมพิวเตอร์ ═══════════════════════ */}
      <div className="hidden md:flex flex-1 gap-4 p-4 lg:p-6 overflow-hidden min-h-0">
        {/* ฝั่งซ้าย - รายละเอียดออเดอร์ (Left - Order Detail Skeleton) */}
        <div className="flex-1 flex flex-col bg-surface border border-border rounded-[20px] shadow-sm overflow-hidden min-h-0 relative p-4 sm:p-6 gap-4">
          {/* ส่วนหัวของออเดอร์ */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-3 shrink-0" />
              <div className="space-y-2">
                <div className="h-6 w-36 rounded-lg bg-surface-3" />
                <div className="h-3.5 w-28 rounded-md bg-surface-2" />
              </div>
            </div>
            <div className="h-8 w-24 rounded-full bg-surface-3" />
          </div>

          {/* รายการอาหารในออเดอร์ */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="p-3.5 sm:p-4 rounded-[16px] border border-border bg-surface flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-surface-3 shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="h-4 w-40 rounded bg-surface-3" />
                      <div className="h-3 w-24 rounded bg-surface-2" />
                    </div>
                  </div>
                  <div className="h-5 w-14 rounded bg-surface-3" />
                </div>
              </div>
            ))}
          </div>

          {/* ปุ่มดำเนินการส่วนท้าย (Action Footer Skeleton) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div className="h-11 flex-1 rounded-xl bg-surface-3" />
            <div className="h-11 w-32 rounded-xl bg-surface-2" />
          </div>
        </div>

        {/* ฝั่งขวา - รายการคิวทั้งหมด (Right - Order List Skeleton) */}
        <div className="w-[300px] lg:w-[340px] xl:w-[380px] flex flex-col bg-surface border border-border rounded-[20px] shadow-sm overflow-hidden min-h-0 flex-shrink-0">
          <div className="p-3 border-b border-border bg-surface-2/50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="h-4 w-24 rounded bg-surface-3" />
              <div className="h-3.5 w-12 rounded bg-surface-2" />
            </div>
            {/* แท็บตัวกรองสถานะคิว */}
            <div className="grid grid-cols-5 bg-surface-3 p-1 rounded-[10px] gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-7 rounded-[8px] bg-surface-2" />
              ))}
            </div>
          </div>

          {/* รายการการ์ดคิวที่เรียงซ้อนกัน */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-[16px] border border-border bg-surface space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-surface-3" />
                    <div className="h-4 w-20 rounded bg-surface-3" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-surface-2" />
                </div>
                <div className="h-3 w-32 rounded bg-surface-2" />
                <div className="flex justify-between items-center pt-1 border-t border-border/50">
                  <div className="h-3 w-16 rounded bg-surface-2" />
                  <div className="h-4 w-14 rounded bg-surface-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MOBILE Layout Skeleton สำหรับจอมือถือ ═══════════════════════ */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden min-h-0">
        <div className="p-3 bg-surface border-b border-border">
          <div className="grid grid-cols-5 bg-surface-3 p-1 rounded-[12px] gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 rounded-[9px] bg-surface-2" />
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[16px] border border-border bg-surface space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-surface-3" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 rounded bg-surface-3" />
                    <div className="h-3 w-16 rounded bg-surface-2" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-surface-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
