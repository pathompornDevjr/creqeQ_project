/**
 * @file ConfirmOrderModal.tsx
 * @description Modal สำหรับยืนยันคำสั่งซื้อก่อนส่งเข้าห้องครัวของร้านค้า
 * แสดงข้อมูลผู้สั่งซื้อ (พร้อมฟังก์ชันแก้ไขชื่อ/เบอร์โทรได้ทันที), เวลานัดรับ, รายการสินค้าและยอดชำระสุทธิ
 */

"use client";

import React, { useState, useEffect } from "react";
import { Check, X, QrCode, Banknote, Clock, User, Phone, ShoppingBag, Loader2, AlertCircle, Edit2, CheckCircle2 } from "lucide-react";

/** พร็อพส์สำหรับคอมโพเนนต์ ConfirmOrderModal */
export interface ConfirmOrderModalProps {
  /** สถานะเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อกดยกเลิกหรือปิด Modal */
  onClose: () => void;
  /** ฟังก์ชันเมื่อกดยืนยันการสั่งซื้อ */
  onConfirm: (paymentMethod: "promptpay" | "cash", customerInfo?: { nickname: string; phone: string }) => Promise<void> | void;
  /** Callback เมื่อมีการแก้ไขข้อมูลชื่อ/เบอร์โทรของลูกค้า */
  onUpdateCustomerInfo?: (nickname: string, phone: string) => void;
  /** รายการสินค้าในคำสั่งซื้อ */
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    toppingsText?: string;
    note?: string;
  }>;
  /** ยอดเงินรวมสุทธิ */
  totalAmount: number;
  /** ชื่อเล่นของลูกค้า */
  customerNickname: string;
  /** เบอร์โทรศัพท์ลูกค้า */
  customerPhone: string;
  /** ข้อมูลการนัดรับสินค้า */
  pickupInfo: {
    type: "now" | "scheduled";
    scheduledTime?: string;
    asapMinutes?: number;
  };
}

/**
 * คอมโพเนนต์ ConfirmOrderModal
 */
export function ConfirmOrderModal({
  isOpen,
  onClose,
  onConfirm,
  onUpdateCustomerInfo,
  items,
  totalAmount,
  customerNickname,
  customerPhone,
  pickupInfo,
}: ConfirmOrderModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"promptpay" | "cash">("promptpay");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editNickname, setEditNickname] = useState(customerNickname || "");
  const [editPhone, setEditPhone] = useState(customerPhone || "");

  useEffect(() => {
    setEditNickname(customerNickname || "");
    setEditPhone(customerPhone || "");
  }, [customerNickname, customerPhone]);

  if (!isOpen) return null;

  // บันทึกข้อมูลลูกค้าที่แก้ไข
  const handleSaveInfo = () => {
    const trimmedNick = editNickname.trim();
    const trimmedPhone = editPhone.trim();
    if (onUpdateCustomerInfo) {
      onUpdateCustomerInfo(trimmedNick || "ลูกค้า", trimmedPhone);
    }
    setIsEditingInfo(false);
  };

  // ดำเนินการยืนยันคำสั่งซื้อ
  const handleConfirmClick = async () => {
    try {
      setIsSubmitting(true);
      const trimmedNick = editNickname.trim();
      const trimmedPhone = editPhone.trim();
      if (onUpdateCustomerInfo) {
        onUpdateCustomerInfo(trimmedNick || "ลูกค้า", trimmedPhone);
      }
      await onConfirm(paymentMethod, {
        nickname: trimmedNick || "ลูกค้า",
        phone: trimmedPhone,
      });
    } catch (err) {
      console.error("Order confirmation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ส่วนหัวของ Modal */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: "var(--brand-50, rgba(244,63,94,0.1))",
                color: "var(--brand-500, #F43F5E)",
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">ยืนยันคำสั่งซื้อ</h2>
              <p className="text-[11px] text-zinc-500 font-medium">ตรวจสอบความถูกต้องก่อนส่งเข้าครัว</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* เนื้อหาใน Modal */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* ข้อมูลลูกค้าและเวลานัดรับสินค้า */}
          <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/70 space-y-2.5 transition-all">
            {isEditingInfo ? (
              /* ฟอร์มแก้ไขข้อมูลลูกค้า */
              <div className="space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700 text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-500" />
                    แก้ไขข้อมูลผู้สั่งซื้อ
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      ชื่อเล่น / ชื่อผู้สั่ง
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        placeholder="เช่น ปังปอนด์"
                        className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-white border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs text-zinc-900 font-medium outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      เบอร์โทรศัพท์ (สำหรับติดต่อรับอาหาร)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="เช่น 0812345678"
                        className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-white border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs text-zinc-900 font-medium font-mono outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditNickname(customerNickname || "");
                      setEditPhone(customerPhone || "");
                      setIsEditingInfo(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 font-semibold text-xs transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInfo}
                    style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                    className="px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>
            ) : (
              /* การแสดงผลข้อมูลลูกค้าปัจจุบัน */
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-zinc-800 font-bold min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-zinc-200/70 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-900 font-bold">คุณ {editNickname || "ลูกค้า"}</span>
                      {editPhone && (
                        <span className="text-zinc-500 font-normal font-mono text-[11px]">
                          ({editPhone})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(true)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3 h-3 text-zinc-500" />
                  <span>แก้ไข</span>
                </button>
              </div>
            )}

            {/* เวลารับสินค้า */}
            <div className="flex items-center gap-1.5 text-zinc-600 font-medium pt-2 border-t border-zinc-200/50">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                เวลารับ:{" "}
                <strong className="text-zinc-900 font-bold">
                  {pickupInfo.type === "now"
                    ? `ตามคิว (ประมาณ ${pickupInfo.asapMinutes || 15} นาที)`
                    : `นัดรับเวลา ${pickupInfo.scheduledTime} น.`}
                </strong>
              </span>
            </div>
          </div>

          {/* สรุปรายการสินค้า */}
          <div className="space-y-2">
            <span className="font-bold text-zinc-700 tracking-tight block">
              รายการอาหาร ({items.length} รายการ)
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-200/50"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-900">{it.name}</span>
                      <span className="text-[11px] font-black text-zinc-400">×{it.quantity}</span>
                    </div>
                    {it.toppingsText && (
                      <p className="text-[11px] text-zinc-500 truncate leading-relaxed">{it.toppingsText}</p>
                    )}
                    {it.note && (
                      <p className="text-[10px] text-amber-700 font-medium">หมายเหตุ: {it.note}</p>
                    )}
                  </div>
                  <span className="font-bold font-mono text-zinc-900 shrink-0">฿{it.price * it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ช่องทางการชำระเงิน */}
          <div className="space-y-1.5">
            <span className="font-bold text-xs text-zinc-700 tracking-tight block">
              ช่องทางการชำระเงิน
            </span>
            <div className="p-3.5 rounded-2xl border border-brand-200/80 bg-brand-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-zinc-900 block">สแกน QR พร้อมเพย์</span>
                  <span className="text-[10px] text-zinc-500 font-medium block">สแกนและแนบสลิปหลังร้านยืนยัน</span>
                </div>
              </div>
              <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-brand-100/80 text-brand-700 border border-brand-200">
                ไม่มีค่าธรรมเนียม
              </span>
            </div>
          </div>

          {/* แถบแจ้งเตือน Realtime */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-[11px] text-emerald-800 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>เมื่อยืนยัน ระบบจะส่งออเดอร์ให้ห้องครัวทันทีแบบ Real-time</span>
          </div>
        </div>

        {/* ส่วนท้าย Modal (Footer) */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-zinc-600">ยอดชำระสุทธิ</span>
            <span
              style={{ color: "var(--brand-600, #E11D48)" }}
              className="text-lg font-black font-mono"
            >
              ฿{totalAmount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-full border border-zinc-200 bg-white text-zinc-700 font-bold text-xs hover:bg-zinc-100 transition cursor-pointer disabled:opacity-50"
            >
              ตรวจสอบอีกครั้ง
            </button>

            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isSubmitting}
              style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
              className="flex-2 py-3 px-5 rounded-full text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังส่งเข้าครัว...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>ยืนยันสั่งอาหาร</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
