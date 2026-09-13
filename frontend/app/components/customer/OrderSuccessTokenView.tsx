/**
 * @file OrderSuccessTokenView.tsx
 * @description หน้าจอแสดงหมายเลขคิวและบัตรคิวหลังการสั่งซื้อและชำระเงินสำเร็จ (Order Success Token)
 * แสดงหมายเลขคิวขนาดใหญ่, จำนวนคิวก่อนหน้า, เวลาโดยประมาณ, QR Code สำหรับแสดงเมื่อรับสินค้า และปุ่มติดตามสถานะสด
 */

"use client";

import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { HelpButton } from "../ui/GuidedTourModal";

/** พร็อพส์สำหรับคอมโพเนนต์ OrderSuccessTokenView */
export interface OrderSuccessTokenViewProps {
  /** หมายเลขคิว เช่น "Q-01" หรือ "15" */
  queueNumber: string;
  /** จำนวนคิวก่อนหน้า */
  queuesAhead?: number;
  /** เวลาโดยประมาณ (นาที) */
  estimatedMinutes?: number;
  /** คิวที่กำลังทำอยู่ในครัวปัจจุบัน */
  currentCookingQueue?: string;
  /** รหัสออเดอร์คำสั่งซื้อ */
  orderNumber?: string;
  /** ชื่อเล่นลูกค้า */
  customerNickname?: string;
  /** เบอร์โทรศัพท์ลูกค้า */
  customerPhone?: string;
  /** ข้อมูลสำหรับสร้าง QR Code รับอาหาร */
  pickupQrPayload?: string;
  /** Callback นำทางไปยังหน้าติดตามสถานะสด */
  onViewLiveStatus: () => void;
  /** Callback เปิด Modal วิธีการใช้งาน */
  onOpenHelp?: () => void;
}

/**
 * คอมโพเนนต์ OrderSuccessTokenView
 */
export function OrderSuccessTokenView({
  queueNumber = "-",
  queuesAhead = 0,
  estimatedMinutes = 0,
  currentCookingQueue = "-",
  orderNumber = "-",
  customerNickname = "",
  customerPhone = "",
  pickupQrPayload,
  onViewLiveStatus,
  onOpenHelp,
}: OrderSuccessTokenViewProps) {
  const qrData = pickupQrPayload || `CREPE-${queueNumber}-${orderNumber}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 sm:p-6 pb-16 text-zinc-900 animate-fade-in gap-3.5">
      {/* แถบด้านบน */}
      <div className="w-full max-w-lg flex items-center justify-between py-1">
        <span className="text-xs font-bold text-zinc-500">
          สั่งซื้อและชำระเงินสำเร็จ
        </span>
        {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
      </div>

      {/* กล่องเนื้อหาหลัก */}
      <div className="w-full max-w-lg flex flex-col gap-3.5 animate-scale-in">
        {/* ส่วนหัวไอคอนความสำเร็จ */}
        <div className="flex flex-col items-center text-center gap-1.5 py-1">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-lg font-black text-zinc-900 tracking-tight">
            ได้รับหมายเลขคิวแล้ว
          </h1>
          <p className="text-xs text-zinc-500 font-medium">ส่งรายการเข้าครัวร้านเรียบร้อย</p>
        </div>

        {/* การ์ดหมายเลขคิวขนาดใหญ่ (Big Queue Card) */}
        <div className="bg-white rounded-[28px] p-6 shadow-xs border border-zinc-200/70 text-center space-y-2 relative overflow-hidden">
          <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
            หมายเลขคิวของคุณ
          </span>
          <div className="text-6xl font-black text-zinc-900 tracking-tight py-1 font-mono">
            {queueNumber}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/60 text-xs font-bold text-zinc-700">
            <span>ก่อนหน้าคุณ {queuesAhead} คิว</span>
            <span>·</span>
            <span>ประมาณ {estimatedMinutes} นาที</span>
          </div>
        </div>

        {/* การ์ดรายละเอียดออเดอร์และ QR Code รับอาหารหน้าร้าน */}
        <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-2 text-zinc-600 border-b border-zinc-100 pb-3">
            <div>
              <span className="text-zinc-400 block text-[11px]">คิวกำลังจัดทำปัจจุบัน</span>
              <span className="font-bold text-zinc-900 text-sm">{currentCookingQueue}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[11px]">รหัสคำสั่งซื้อ</span>
              <span className="font-mono font-bold text-zinc-900 text-sm">{orderNumber}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-zinc-600 border-b border-zinc-100 pb-3">
            <span className="text-zinc-400 text-[11px]">ชื่อเรียก / เบอร์ติดต่อ</span>
            <span className="font-bold text-zinc-800">
              {customerNickname} {customerPhone ? `(${customerPhone})` : ""}
            </span>
          </div>

          {/* QR Code สำหรับตรวจสอบการรับอาหาร */}
          <div className="flex flex-col items-center justify-center p-4 bg-zinc-50/70 rounded-2xl border border-zinc-200/80 gap-2">
            <div className="p-2.5 bg-white rounded-xl shadow-xs border border-zinc-200/80">
              <QRCodeSVG value={qrData} size={110} level="M" />
            </div>
            <span className="text-[11px] font-bold text-zinc-500 tracking-tight">
              แสดง QR นี้เมื่อมารับสินค้าหน้าร้าน
            </span>
          </div>
        </div>

        {/* ปุ่มไปยังหน้าติดตามสถานะคิวสด */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onViewLiveStatus}
            style={{ backgroundColor: "var(--brand-500, #E11D48)" }}
            className="w-full py-4 px-5 text-white font-bold rounded-full text-sm shadow-lg shadow-rose-600/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ติดตามสถานะออเดอร์ (LIVE)</span>
            <ArrowRight className="w-4 h-4 text-white/90" />
          </button>
        </div>
      </div>
    </div>
  );
}
