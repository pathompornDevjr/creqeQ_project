/**
 * @file SalesSummaryModal.tsx
 * @description Modal สำหรับสรุปยอดขายและประสิทธิภาพประจำวัน/สัปดาห์/เดือน ของร้านค้า
 * แสดงรายได้รวม, จำนวนออเดอร์, ยอดเฉลี่ยต่อบิล, กราฟยอดขายรายชั่วโมง, ไส้ขายดี และปุ่มดาวน์โหลดรายงาน CSV
 */

"use client";

import React, { useState } from "react";
import { X, Download, CheckCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";

/** พร็อพส์สำหรับคอมโพเนนต์ SalesSummaryModal */
export interface SalesSummaryModalProps {
  /** สถานะเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อกดปิด Modal */
  onClose: () => void;
  /** รหัสร้านอาหาร */
  restaurantId?: string | number;
}

/** ข้อมูลยอดขายจำลองรายชั่วโมง */
export const HOURLY_DATA = [
  { hour: "10:00", revenue: 450, orders: 4 },
  { hour: "11:00", revenue: 820, orders: 8 },
  { hour: "12:00", revenue: 1450, orders: 14 },
  { hour: "13:00", revenue: 980, orders: 9 },
  { hour: "14:00", revenue: 1120, orders: 10 },
  { hour: "15:00", revenue: 1420, orders: 13 },
];

/** รายการไส้เครปขายดีอันดับต้นๆ */
export const TOP_SELLERS = [
  { rank: 1, name: "ไส้กรอก + ชีส", qty: 22, revenue: 1210 },
  { rank: 2, name: "ช็อกโกแลต", qty: 18, revenue: 810 },
  { rank: 3, name: "ชาไทยเย็น", qty: 15, revenue: 525 },
];

/**
 * คอมโพเนนต์ SalesSummaryModal
 */
export function SalesSummaryModal({ isOpen, onClose }: SalesSummaryModalProps) {
  // ช่วงเวลาที่เลือก วันนี้ / สัปดาห์นี้ / เดือนนี้
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  if (!isOpen) return null;

  const totalRevenue = period === "today" ? 6240 : period === "week" ? 38450 : 156000;
  const totalOrders = period === "today" ? 58 : period === "week" ? 340 : 1420;
  const avgBill = Math.round(totalRevenue / totalOrders);

  // ฟังก์ชันดาวน์โหลดรายงานยอดขายในรูปแบบไฟล์ CSV
  const handleDownloadCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,ลำดับ,รายการไส้/เมนู,จำนวนขาย,ยอดรวม(บาท)\n" +
      TOP_SELLERS.map((s) => `${s.rank},${s.name},${s.qty},${s.revenue}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crepe_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ดาวน์โหลดรายงาน CSV สำเร็จ");
  };

  // จัดการการบันทึกสรุปยอดปิดร้านประจำวัน
  const handleCloseShopSummary = () => {
    toast.success("บันทึกสรุปยอดปิดร้านประจำวันเรียบร้อยแล้ว");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white text-zinc-900 rounded-[28px] p-6 shadow-2xl border border-zinc-200/80 animate-scale-in flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ส่วนหัว Modal */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                สรุปยอดขาย & ประสิทธิภาพ
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">ข้อมูลการขายและรายการยอดนิยม</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* แท็บเลือกช่วงเวลา */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-full border border-zinc-200/60">
              {(
                [
                  { id: "today", label: "วันนี้" },
                  { id: "week", label: "สัปดาห์" },
                  { id: "month", label: "เดือน" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`py-1 px-3 rounded-full text-xs font-bold transition-all ${
                    period === p.id
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              aria-label="ปิด"
              className="w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* การ์ดสถิติ 3 ช่อง (รายได้รวม, จำนวนออเดอร์, เฉลี่ยต่อบิล) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-zinc-50/80 rounded-[20px] border border-zinc-200/70 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">รายได้รวม</span>
            <div className="text-xl font-black text-zinc-900 font-mono tracking-tight">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-zinc-50/80 rounded-[20px] border border-zinc-200/70 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">จำนวนออเดอร์</span>
            <div className="text-xl font-black text-zinc-900 font-mono tracking-tight">
              {totalOrders}
            </div>
          </div>

          <div className="p-4 bg-zinc-50/80 rounded-[20px] border border-zinc-200/70 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">เฉลี่ยต่อบิล</span>
            <div className="text-xl font-black text-zinc-900 font-mono tracking-tight">
              ฿{avgBill}
            </div>
          </div>
        </div>

        {/* กราฟยอดขายรายชั่วโมง */}
        <div className="p-5 bg-zinc-50/80 border border-zinc-200/70 rounded-[24px] space-y-3">
          <span className="text-xs font-bold text-zinc-700">ยอดขายตามช่วงเวลา (รายชั่วโมง)</span>
          <div className="h-32 flex items-end justify-between gap-3 pt-4 border-b border-zinc-200/80 pb-2">
            {HOURLY_DATA.map((h, i) => {
              const maxRev = 1500;
              const heightPct = Math.round((h.revenue / maxRev) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-zinc-600 font-mono">
                    ฿{h.revenue}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[32px] bg-zinc-900 hover:bg-zinc-700 rounded-t-xl transition-all"
                  />
                  <span className="text-[10px] text-zinc-400 font-medium">{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ส่วนแสดงรายการไส้เครปขายดี */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-700">ไส้ขายดีอันดับต้นๆ</span>
          <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-[20px] overflow-hidden bg-white text-xs">
            {TOP_SELLERS.map((s) => (
              <div key={s.rank} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/70 transition">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center text-[11px]">
                    {s.rank}
                  </span>
                  <span className="font-bold text-zinc-900">{s.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-zinc-500">{s.qty} ชิ้น</span>
                  <span className="font-bold text-zinc-900">฿{s.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่มดำเนินการ (Action Buttons) */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            onClick={handleDownloadCsv}
            className="flex-1 py-3 px-4 rounded-full border border-zinc-200/90 hover:bg-zinc-50 text-xs font-bold text-zinc-800 transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-zinc-500" />
            <span>ดาวน์โหลด CSV</span>
          </button>

          <button
            onClick={handleCloseShopSummary}
            className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-black text-white rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
          >
            <CheckCircle className="w-4 h-4 text-zinc-300" />
            <span>บันทึกสรุปปิดร้าน</span>
          </button>
        </div>
      </div>
    </div>
  );
}
