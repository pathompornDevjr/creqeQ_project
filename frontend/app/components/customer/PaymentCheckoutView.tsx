/**
 * @file PaymentCheckoutView.tsx
 * @description หน้าจอชำระเงินของลูกค้า (Payment Checkout View)
 * รองรับการสร้าง Dynamic PromptPay QR Code ตามมาตรฐาน EMVCo ที่ฝังยอดเงินอัตโนมัติ,
 * การแสดง QR Code แบบอัปโหลด, ข้อมูลบัญชีธนาคาร พร้อมเวลานับถอยหลังและปุ่มยืนยันการชำระ
 */

"use client";

import React, { useState, useEffect } from "react";
import { Clock, ArrowRight, QrCode, ChevronLeft, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { HelpButton } from "../ui/GuidedTourModal";
import { SafeImage } from "../ui/SafeImage";
import { formatDriveImageUrl, generatePromptPayPayload } from "@/app/lib/utils";

/** พร็อพส์สำหรับคอมโพเนนต์ PaymentCheckoutView */
export interface PaymentCheckoutViewProps {
  /** ยอดเงินที่ต้องชำระ (บาท) */
  totalAmount: number;
  /** Payload ของ QR Code สำรอง */
  qrPayload?: string;
  /** URL รูปภาพ QR Code ร้านค้าที่อัปโหลดไว้ */
  qrImageUrl?: string;
  /** หมายเลขพร้อมเพย์ (เบอร์โทร หรือเลขบัตรประชาชน) */
  promptPayNumber?: string;
  /** ชื่อบัญชีพร้อมเพย์ */
  promptPayName?: string;
  /** ชื่อธนาคาร */
  bankName?: string;
  /** เลขที่บัญชีธนาคาร */
  bankAccountNumber?: string;
  /** ชื่อเจ้าของบัญชีธนาคาร */
  bankAccountName?: string;
  /** Callback เมื่อกดยืนยันการชำระเงินเรียบร้อยแล้ว */
  onPaid: (method?: "promptpay" | "cash") => void;
  /** Callback เมื่อกดยกเลิกรายการชำระ */
  onCancel: () => void;
  /** Callback เมื่อกดย้อนกลับไปยังหน้าก่อนหน้า */
  onBack?: () => void;
  /** Callback เปิด Modal ช่วยเหลือ / วิธีใช้งาน */
  onOpenHelp?: () => void;
}

/**
 * คอมโพเนนต์ PaymentCheckoutView
 */
export function PaymentCheckoutView({
  totalAmount = 0,
  qrPayload,
  qrImageUrl,
  promptPayNumber,
  promptPayName,
  bankName,
  bankAccountNumber,
  bankAccountName,
  onPaid,
  onCancel,
  onBack,
  onOpenHelp,
}: PaymentCheckoutViewProps) {
  // ตัวนับเวลาถอยหลังการชำระเงิน (เริ่มต้นที่ 5 นาที หรือ 298 วินาที)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(298);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 sm:p-6 pb-36 text-zinc-900 animate-fade-in gap-3.5">
      {/* ส่วนหัวหน้าจอพร้อมปุ่มย้อนกลับ */}
      <div className="w-full max-w-lg flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack || onCancel}
            aria-label="ย้อนกลับไปหน้าตะกร้า"
            title="ย้อนกลับไปหน้าตะกร้าสินค้า"
            className="w-9 h-9 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight">
              ชำระเงิน
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">สแกน QR พร้อมเพย์</p>
          </div>
        </div>
        {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
      </div>

      {/* กล่องเนื้อหาหลัก */}
      <div className="w-full max-w-lg flex flex-col gap-3.5 animate-fade-up">
        {/* แบนเนอร์แสดงวิธีการชำระเงิน */}
        <div className="w-full p-4 rounded-[20px] bg-white border border-brand-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
              className="w-9 h-9 rounded-2xl text-white flex items-center justify-center shadow-xs"
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 block">สแกน QR พร้อมเพย์</span>
              <span className="text-[11px] text-zinc-500 font-medium block">ไม่มีค่าธรรมเนียม · ปลอดภัย</span>
            </div>
          </div>
          <span
            style={{
              backgroundColor: "var(--brand-50, rgba(244,63,94,0.08))",
              color: "var(--brand-600, #E11D48)",
            }}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full border border-brand-200 shrink-0"
          >
            แนะนำ
          </span>
        </div>

        {/* การ์ดแสดง QR Code และข้อมูลบัญชี */}
        {(() => {
          const isBank = Boolean(bankName && bankName.toLowerCase() !== "promptpay" && bankAccountNumber);
          // หากมีเบอร์พร้อมเพย์ จะสร้าง Dynamic EMVCo QR Code ที่ฝังยอดเงินไว้ล่วงหน้า
          const dynamicPromptPayPayload = (!isBank && promptPayNumber && totalAmount > 0)
            ? generatePromptPayPayload(promptPayNumber, totalAmount)
            : null;
          const hasDirectQr = Boolean(qrImageUrl || qrPayload || dynamicPromptPayPayload || (!isBank && promptPayNumber));
          const displayAccountName = isBank ? (bankAccountName || promptPayName) : (promptPayName || bankAccountName);
          const displayNumber = isBank ? bankAccountNumber : (promptPayNumber || bankAccountNumber);

          return (
            <div className="bg-white rounded-[24px] p-6 shadow-xs border border-zinc-200/70 flex flex-col items-center justify-center gap-3.5 animate-fade-up">
              {hasDirectQr ? (
                dynamicPromptPayPayload ? (
                  /* การ์ด PromptPay อย่างเป็นทางการพร้อม Dynamic QR กำหนดยอดเงินอัตโนมัติ */
                  <div className="w-full max-w-[240px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-center">
                    {/* แถบหัวพร้อมเพย์สีน้ำเงิน */}
                    <div className="bg-[#003B70] text-white py-2.5 px-3 flex items-center justify-center gap-2">
                      <span className="font-black text-sm tracking-wide">พร้อมเพย์</span>
                      <span className="text-[10px] font-bold bg-[#0070BA] px-1.5 py-0.5 rounded text-white uppercase">PromptPay</span>
                    </div>

                    {/* กล่องแสดงภาพ QR Code */}
                    <div className="p-4 flex items-center justify-center bg-white">
                      <QRCodeSVG
                        value={dynamicPromptPayPayload}
                        size={168}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {/* ป้ายแสดงยอดเงินและชื่อบัญชี */}
                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/80 space-y-0.5">
                      <p className="text-[11px] font-semibold text-slate-500">ยอดชำระ</p>
                      <p
                        style={{ color: "var(--brand-600, #E11D48)" }}
                        className="text-lg font-black tracking-tight"
                      >
                        ฿{totalAmount.toLocaleString()}
                      </p>
                      {displayAccountName && (
                        <p className="text-[10.5px] font-bold text-slate-700 truncate">{displayAccountName}</p>
                      )}
                      {displayNumber && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          พร้อมเพย์: {displayNumber}
                        </p>
                      )}
                    </div>

                    {/* ป้ายแจ้งเตือน Dynamic QR */}
                    <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-100 flex items-center justify-center gap-1">
                      <Zap size={11} className="text-emerald-500 fill-emerald-400 shrink-0" />
                      <span className="text-[10px] font-bold text-emerald-700">QR กำหนดยอดอัตโนมัติ</span>
                    </div>
                  </div>
                ) : qrImageUrl ? (
                  /* รูป QR Code แบบคงที่ที่ร้านค้าอัปโหลด */
                  <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-center max-w-[200px] max-h-[200px] overflow-hidden">
                    <SafeImage
                      src={qrImageUrl}
                      alt="พร้อมเพย์ QR"
                      className="w-full h-full object-contain rounded-xl max-h-[170px]"
                      fallback={
                        <QRCodeSVG
                          value={qrPayload || `promptpay://${promptPayNumber || "0000000000"}/${totalAmount}`}
                          size={160}
                          level="M"
                        />
                      }
                    />
                  </div>
                ) : (
                  /* QR Code มาตรฐานสำรอง */
                  <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-center max-w-[200px] max-h-[200px] overflow-hidden">
                    <QRCodeSVG
                      value={qrPayload || `promptpay://${promptPayNumber || "0000000000"}/${totalAmount}`}
                      size={160}
                      level="M"
                    />
                  </div>
                )
              ) : (
                /* กล่องแจ้งเตือนกรณีไม่มีรูป QR Code */
                <div className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs">
                    <span>ชำระเงินผ่านข้อมูลบัญชีนี้เท่านั้น</span>
                  </div>
                  <p className="text-[11.5px] text-amber-800 leading-relaxed font-medium max-w-xs mx-auto">
                    กรุณาคัดลอกเลขบัญชีด้านล่างเพื่อโอนเงินผ่านแอปธนาคาร จากนั้นอัปโหลดหลักฐานการชำระเพื่อตรวจสอบการชำระเงิน
                  </p>
                </div>
              )}

              {/* รายละเอียดชื่อบัญชีและเลขที่บัญชี */}
              {!dynamicPromptPayPayload && (displayAccountName || displayNumber) && (
                <div className="text-center space-y-0.5">
                  {displayAccountName && (
                    <p className="text-xs font-bold text-zinc-900">
                      ชื่อบัญชี: {displayAccountName}
                    </p>
                  )}
                  {displayNumber && (
                    <p className="text-xs font-mono text-zinc-500">
                      {isBank && bankName ? `${bankName}: ` : "พร้อมเพย์: "}
                      {displayNumber}
                    </p>
                  )}
                </div>
              )}

              {/* ป้ายแสดงเวลานับถอยหลัง */}
              <div className="text-center space-y-1">
                <div
                  style={{
                    backgroundColor: "var(--brand-50, rgba(244,63,94,0.08))",
                    borderColor: "var(--brand-200, rgba(244,63,94,0.25))",
                    color: "var(--brand-600, #E11D48)",
                  }}
                  className="px-3.5 py-1 border rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--brand-500, #F43F5E)" }} />
                  <span>ชำระภายใน</span>
                  <span className="font-mono font-bold">{formattedCountdown}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ข้อความแจ้งเตือนท้ายการ์ด */}
        <div className="p-3.5 bg-white border border-zinc-200/70 rounded-2xl text-[11px] text-zinc-500 leading-relaxed text-center shadow-2xs">
          ชำระเงินเรียบร้อย ระบบจะออกหมายเลขคิวและส่งออเดอร์ให้หน้าร้านทันที
        </div>
      </div>

      {/* แถบปุ่มดำเนินการด้านล่างสุด (Sticky Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 flex flex-col items-center justify-center gap-1.5 z-40">
        <div className="w-full max-w-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-600 px-2">
            <span>ยอดชำระทั้งหมด</span>
            <span
              style={{ color: "var(--brand-600, #E11D48)" }}
              className="text-lg font-black"
            >
              ฿{totalAmount}
            </span>
          </div>

          {/* ปุ่มยืนยันการชำระเงิน */}
          <button
            type="button"
            onClick={() => onPaid("promptpay")}
            style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
            className="w-full py-3.5 px-5 text-white font-bold rounded-full text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ฉันชำระเงินเรียบร้อยแล้ว</span>
            <ArrowRight className="w-4 h-4 text-white/90" />
          </button>

          {/* ปุ่มยกเลิกรายการ */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            ยกเลิกรายการ
          </button>
        </div>
      </div>
    </div>
  );
}