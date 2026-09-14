"use client";

/**
 * =========================================================================================
 * @file FastLoginModal.tsx
 * @description คอมโพเนนต์หน้าต่างเข้าสู่ระบบด่วนสำหรับลูกค้า (Customer Fast Login Dialog)
 * 
 * หน้าที่หลัก:
 * - กรอกเพียงชื่อเล่นและเบอร์โทรศัพท์ ไม่ต้องจำรหัสผ่านหรือรอ OTP
 * - ระบบจะผูกเบอร์ไว้สำหรับติดตามสถานะและเรียกคิว
 * - รองรับการบันทึกข้อมูลลง LocalStorage (Remember Me)
 * - มีตัวเลือกสำหรับเข้าดูเมนูก่อนโดยไม่ต้องล็อกอิน
 * =========================================================================================
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, User, Phone, CheckSquare, Square, ArrowRight, Info } from "lucide-react";
import { HelpButton } from "./GuidedTourModal";
import { CustomerApi } from "@/app/lib/api";

/** Props ของคอมโพเนนต์ FastLoginModal */
export interface FastLoginModalProps {
  /** ควบคุมการเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด */
  onClose: () => void;
  /** ฟังก์ชัน Callback เมื่อเข้าสู่ระบบสำเร็จ */
  onSuccess: (user: { nickname: string; phone: string; customer_id?: number }) => void;
  /** ฟังก์ชันเมื่อกดเลือกดูเมนูก่อนโดยไม่ล็อกอิน */
  onBrowseMenuWithoutLogin?: () => void;
  /** ฟังก์ชันเปิดหน้าต่างช่วยเหลือ Tour Guide */
  onOpenHelp?: () => void;
  /** สีหลักของแบรนด์ */
  primaryColor?: string;
  /** สีรองของแบรนด์ */
  secondaryColor?: string;
}

/**
 * คอมโพเนนต์ FastLoginModal
 */
export function FastLoginModal({
  isOpen,
  onClose,
  onSuccess,
  onBrowseMenuWithoutLogin,
  onOpenHelp,
  primaryColor,
  secondaryColor,
}: FastLoginModalProps) {
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const brandColor = primaryColor || "var(--brand-600, #E11D48)";

  /**
   * ซิงค์บันทึกหรือลบข้อมูลลูกค้าใน LocalStorage อย่างปลอดภัย
   */
  const syncCustomerStorage = (nick: string, tel: string, shouldRemember: boolean) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("crepe_customer_remember", String(shouldRemember));
      if (shouldRemember) {
        const cleanN = nick.trim();
        const cleanP = tel.trim().replace(/[^0-9]/g, "");
        if (cleanN || cleanP) {
          const profile = { nickname: cleanN, phone: cleanP };
          localStorage.setItem("crepe_customer", JSON.stringify(profile));
          localStorage.setItem("crepe_user", JSON.stringify(profile));
        }
      } else {
        localStorage.removeItem("crepe_customer");
        localStorage.removeItem("crepe_user");
      }
    } catch (e) {
      console.warn("Failed to sync customer info to localStorage:", e);
    }
  };

  // ดึงข้อมูลลูกค้าเดิมที่เคยบันทึกไว้ใน LocalStorage เมื่อเปิด Modal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser =
        localStorage.getItem("crepe_customer") ||
        localStorage.getItem("crepe_user") ||
        localStorage.getItem("crepeq_customer_session");
      const savedRemember = localStorage.getItem("crepe_customer_remember");

      if (savedRemember !== null) {
        setRememberMe(savedRemember === "true");
      } else if (savedUser) {
        setRememberMe(true);
      }

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.nickname) setNickname(parsed.nickname);
          if (parsed.phone) setPhone(parsed.phone);
        } catch {}
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /** สลับสถานะเช็คบ็อกซ์จำข้อมูล */
  const handleToggleRemember = () => {
    const nextVal = !rememberMe;
    setRememberMe(nextVal);
    syncCustomerStorage(nickname, phone, nextVal);
  };

  /** เปลี่ยนแปลงชื่อเล่นพร้อมบันทึกอัตโนมัติหากเลือก Remember Me */
  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (rememberMe) {
      syncCustomerStorage(val, phone, true);
    }
  };

  /** เปลี่ยนแปลงเบอร์โทรพร้อมบันทึกอัตโนมัติหากเลือก Remember Me */
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (rememberMe) {
      syncCustomerStorage(nickname, val, true);
    }
  };

  /**
   * ดำเนินการเข้าสู่ระบบด่วน
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanNick = nickname.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");

    if (!cleanNick) {
      setError("กรุณากรอกชื่อเล่นสำหรับเรียกคิว");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      setError("กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)");
      return;
    }

    // บันทึกข้อมูลโปรไฟล์ลงเครื่องทันทีเพื่อความรวดเร็วและป้องกันข้อมูลสูญหาย
    const localProfile = {
      nickname: cleanNick,
      phone: cleanPhone,
    };

    if (rememberMe) {
      syncCustomerStorage(cleanNick, cleanPhone, true);
    } else {
      syncCustomerStorage(cleanNick, cleanPhone, false);
    }

    setLoading(true);
    try {
      const res = await CustomerApi.loginCustomer({
        nickname: cleanNick,
        phone: cleanPhone,
      });

      if (res && res.success && res.data) {
        const customerData = res.data;
        const fullProfile = {
          nickname: cleanNick,
          phone: cleanPhone,
          customer_id: customerData.customer_id,
        };

        if (rememberMe && typeof window !== "undefined") {
          try {
            localStorage.setItem("crepe_customer", JSON.stringify(fullProfile));
            localStorage.setItem("crepe_user", JSON.stringify(fullProfile));
          } catch (e) {
            console.warn("Failed to save full customer profile into localStorage:", e);
          }
        }

        onSuccess(fullProfile);
        onClose();
        return;
      }
    } catch (err: any) {
      console.warn("Customer login API issue, using local customer profile:", err);
    } finally {
      setLoading(false);
    }

    // แม้การเชื่อมต่อ API จะมีปัญหา ให้ผู้ใช้สามารถสั่งอาหารต่อเนื่องได้ทันทีด้วยข้อมูลที่กรอก
    onSuccess(localProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-white text-zinc-900 rounded-[28px] p-6 shadow-2xl border border-zinc-200/80 animate-scale-in flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* แถบส่วนหัว Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="ย้อนกลับ"
            className="w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-zinc-600 tracking-tight">เข้าใช้งานด่วน</span>

          {onOpenHelp ? (
            <HelpButton onClick={onOpenHelp} />
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>

        {/* ข้อความต้อนรับ */}
        <div className="space-y-1">
          <h1 className="text-xl font-black text-zinc-900 tracking-tight leading-snug">
            บอกชื่อเล่นและเบอร์โทร<br />สำหรับเรียกรับคิว
          </h1>
          <p className="text-xs text-zinc-500 font-medium">ไม่ต้องจำรหัสผ่าน สั่งสะดวกได้ทันที</p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50/90 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {/* ช่องชื่อเล่น */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5 pl-1">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              ชื่อเล่น
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="เช่น น้องมิ้น"
              className="w-full px-4 py-3 bg-zinc-50/80 border border-zinc-200/80 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition shadow-inner"
            />
          </div>

          {/* ช่องเบอร์โทรศัพท์ */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5 pl-1">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="08X-XXX-XXXX"
              maxLength={12}
              className="w-full px-4 py-3 bg-zinc-50/80 border border-zinc-200/80 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition shadow-inner"
            />
          </div>

          {/* เช็คบ็อกซ์จำข้อมูลในเครื่อง */}
          <button
            type="button"
            onClick={handleToggleRemember}
            className="flex items-center gap-2.5 cursor-pointer select-none py-1.5 pl-1 text-left group focus:outline-none w-full"
          >
            <div className="shrink-0">
              {rememberMe ? (
                <CheckSquare className="w-4.5 h-4.5 transition-transform group-hover:scale-105" style={{ color: brandColor }} />
              ) : (
                <Square className="w-4.5 h-4.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
              )}
            </div>
            <span className="text-xs text-zinc-600 font-medium group-hover:text-zinc-900 transition-colors">
              จำข้อมูลในเครื่องนี้ ครั้งหน้าไม่ต้องกรอกซ้ำ
            </span>
          </button>

          {/* ปุ่มบันทึกและเริ่มสั่ง */}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: brandColor }}
            className="w-full py-4 px-5 text-white font-bold rounded-full text-sm shadow-lg shadow-rose-600/25 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? "กำลังเข้าสู่ระบบ..." : "เริ่มสั่งเลย"}</span>
            <ArrowRight className="w-4 h-4 text-white/90" />
          </button>
        </form>

        {/* คำอธิบายความปลอดภัย */}
        <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-[11px] text-zinc-500 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-zinc-700 mb-1">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>สะดวก รวดเร็ว</span>
          </div>
          ไม่มีรหัสผ่านและไม่ต้องรอ OTP — ระบบจะผูกเบอร์ไว้สำหรับแจ้งเตือนสถานะคิวของคุณ
        </div>

        {/* ปุ่มดูเมนูก่อน */}
        {onBrowseMenuWithoutLogin && (
          <button
            type="button"
            onClick={() => {
              if (rememberMe && (nickname.trim() || phone.trim())) {
                syncCustomerStorage(nickname, phone, true);
              }
              onClose();
              onBrowseMenuWithoutLogin();
            }}
            className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 rounded-full border border-zinc-200/80 transition active:scale-[0.98]"
          >
            ดูเมนูก่อน (ยังไม่เข้าสู่ระบบ)
          </button>
        )}
      </div>
    </div>
  );
}
