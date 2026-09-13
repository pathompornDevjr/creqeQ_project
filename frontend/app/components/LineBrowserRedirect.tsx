"use client";

/**
 * =========================================================================================
 * @file LineBrowserRedirect.tsx
 * @description คอมโพเนนต์หน้าจอแนะนำและนำทางผู้ใช้ที่เปิดเว็บผ่าน LINE In-App Browser
 * 
 * หน้าที่หลัก:
 * - ตรวจจับว่าผู้ใช้กำลังเข้าชมเว็บผ่าน In-App Browser ของ LINE หรือไม่
 * - แนะนำให้สลับไปเปิดในเบราว์เซอร์มาตรฐาน (Safari / Chrome) เพื่อป้องกันปัญหาเซสชันหลุด
 * - มีระบบเติมพารามิเตอร์ `openExternalBrowser=1` และ Android Chrome Intent Handoff อัตโนมัติ
 * - มีปุ่มคัดลอกลิงก์เพื่อนำไปวางในเบราว์เซอร์หลักได้สะดวก
 * =========================================================================================
 */

import { useEffect, useState } from "react";
import { Copy, Check, Compass } from "lucide-react";

/**
 * คอมโพเนนต์ LineBrowserRedirect
 */
export function LineBrowserRedirect() {
  const [isLine, setIsLine] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.userAgent) return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isLineBrowser = /Line\//i.test(ua) || /Line\b/i.test(ua);

    if (!isLineBrowser) return;

    setIsLine(true);
    const isApple = /iPhone|iPad|iPod/i.test(ua);
    setIsIos(isApple);

    try {
      const url = new URL(window.location.href);

      // หากยังไม่มี openExternalBrowser=1 ให้เติมเข้าไปเพื่อส่งไม้ต่อไปยัง External Browser ของ LINE
      if (!url.searchParams.has("openExternalBrowser")) {
        url.searchParams.set("openExternalBrowser", "1");
        window.location.replace(url.toString());
        return;
      }

      // สำหรับ Android ใช้ Chrome Intent
      if (!isApple && /Android/i.test(ua)) {
        const cleanUrl = window.location.href.replace(/^https?:\/\//i, "");
        const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = intentUrl;
      }
    } catch {}
  }, []);

  if (!isLine) return null;

  /**
   * คัดลอก URL เพื่อให้ผู้ใช้นำไปเปิดในเบราว์เซอร์ภายนอก
   */
  const handleCopy = () => {
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("openExternalBrowser");
      navigator.clipboard.writeText(cleanUrl.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 text-white flex flex-col justify-between p-6 animate-fade-in backdrop-blur-md">
      {/* ลูกศรชี้ไปยังปุ่มเมนูมุมขวาบนใน LINE */}
      <div className="flex justify-end pr-2 pt-2 animate-bounce">
        <div className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg">
          <span>แตะที่จุด 3 จุด (⋮ หรือ ⋯) ที่นี่</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </div>
      </div>

      <div className="max-w-sm mx-auto text-center space-y-5 my-auto w-full">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-emerald-500/30">
          <Compass size={32} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white">เปิดด้วยเบราว์เซอร์หลัก</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            เพื่อประสบการณ์การสั่งอาหาร การชำระเงิน และการแจ้งเตือนที่สมบูรณ์ กรุณาเปิดด้วย{" "}
            <strong className="text-emerald-400 font-bold">{isIos ? "Safari" : "Chrome / เบราว์เซอร์เริ่มต้น"}</strong>
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-inner">
          <div className="flex items-start gap-3 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <p className="text-slate-300 leading-relaxed">
              แตะที่ปุ่ม <strong className="text-white">จุดสามจุด (⋯ หรือ ⋮)</strong> หรือปุ่มแชร์ที่มุมขวาบนของ LINE
            </p>
          </div>
          <div className="flex items-start gap-3 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <p className="text-slate-300 leading-relaxed">
              เลือกเมนู <strong className="text-emerald-400 font-bold">"{isIos ? "เปิดใน Safari" : "เปิดในเบราว์เซอร์เริ่มต้น"}"</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer shadow-md"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          <span>{copied ? "คัดลอกลิงก์เรียบร้อยแล้ว!" : "คัดลอกลิงก์ไปวางในเบราว์เซอร์"}</span>
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-500 font-medium pb-2">
        ระบบสั่งอาหารอัตโนมัติ QOrder
      </p>
    </div>
  );
}
