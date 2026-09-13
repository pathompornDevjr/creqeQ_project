/**
 * @file RestaurantSettingsSkeleton.tsx
 * @description โครงร่างแอนิเมชันสำหรับโหลดหน้าตั้งค่าร้านค้า (Restaurant Settings Skeleton)
 * จำลองการ์ดข้อมูลพื้นฐานร้านค้า, ตำแหน่งและแผนที่, เวลาเปิด-ปิด และปุ่มบันทึก
 */

"use client";

import React from "react";

/**
 * คอมโพเนนต์ RestaurantSettingsSkeleton
 * แสดงเอฟเฟกต์ pulse ระหว่างรอโหลดข้อมูลการตั้งค่าร้านค้า
 */
export function RestaurantSettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none max-w-4xl pb-12">
      {/* โครงร่างการ์ดที่ 1: ข้อมูลพื้นฐานร้านค้า (Store Basic Info) */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-xl bg-brand-500/15 shrink-0" />
            <div className="h-5 w-44 bg-surface-3 rounded-lg" />
          </div>
          <div className="h-6 w-24 bg-brand-500/10 rounded-full border border-brand-500/20" />
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-surface-3 rounded-md" />
            <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-36 bg-surface-3 rounded-md" />
            <div className="h-24 w-full bg-surface-2 rounded-xl border border-border" />
          </div>
        </div>
      </div>

      {/* โครงร่างการ์ดที่ 2: ตำแหน่งที่ตั้งและแผนที่ (Location & Map) */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-xl bg-brand-500/15 shrink-0" />
            <div className="h-5 w-56 bg-surface-3 rounded-lg" />
          </div>
          <div className="h-6 w-20 bg-surface-3 rounded-full" />
        </div>
        <div className="p-6 space-y-5">
          {/* พื้นที่จำลองแผนที่ */}
          <div className="h-52 w-full bg-surface-2 rounded-2xl border border-border flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center shadow-inner">
              <div className="w-4 h-4 bg-brand-500 rounded-full animate-ping" />
            </div>
            <div className="h-3.5 w-48 bg-surface-3 rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-36 bg-surface-3 rounded-md" />
            <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
          </div>
        </div>
      </div>

      {/* โครงร่างการ์ดที่ 3: เวลาทำการและช่องทางติดต่อ (Business Hours & Contact) */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-xl bg-brand-500/15 shrink-0" />
            <div className="h-5 w-48 bg-surface-3 rounded-lg" />
          </div>
          <div className="h-6 w-16 bg-surface-3 rounded-full" />
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3.5 w-28 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-28 bg-surface-3 rounded-md" />
              <div className="h-11 w-full bg-surface-2 rounded-xl border border-border" />
            </div>
          </div>
        </div>
      </div>

      {/* โครงร่างแถบปุ่มบันทึกด้านล่าง (Bottom Action Bar) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="h-11 w-36 bg-surface-2 rounded-2xl border border-border" />
        <div className="h-11 w-48 bg-brand-500/30 rounded-2xl shadow-xs" />
      </div>
    </div>
  );
}
