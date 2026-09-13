/**
 * @file LandingView.tsx
 * @description หน้าแรกสำหรับลูกค้าเมื่อสแกน QR Code เข้ามาที่ร้าน (Customer Landing Page)
 * แสดง Hero Banner, ข้อมูลร้านค้า, เมนูตัวอย่างแนะนำ (Marquee Conveyor), สถานะคิวสดหน้าร้าน,
 * และปุ่มเริ่มสั่งเครป / ติดตามออเดอร์
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Lightbulb, HelpCircle, Bell, AlertTriangle, Clock, Sparkles, Receipt, Store, Phone, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { formatDriveImageUrl, getDriveThumbnailUrl, formatQueueDayBadge } from "@/app/lib/utils";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { SampleMenuDTO } from "@/app/lib/api";

/** พร็อพส์สำหรับคอมโพเนนต์ LandingView */
export interface LandingViewProps {
  /** ชื่อร้านอาหาร */
  restaurantName?: string;
  /** คำอธิบายร้านค้า */
  restaurantDescription?: string;
  /** URL โลโก้ร้าน */
  restaurantLogo?: string;
  /** URL รูปภาพแบนเนอร์ร้าน */
  restaurantBanner?: string;
  /** สถานะการหยุดรับออเดอร์ชั่วคราว */
  isPaused?: boolean;
  /** เหตุผลที่หยุดรับออเดอร์ */
  pauseReason?: string;
  /** เวลาที่จะเปิดรับออเดอร์อีกครั้ง */
  pauseUntil?: string;
  /** อนุญาตให้สั่งจองล่วงหน้าหรือไม่ */
  allowPreorder?: boolean;
  /** คิวที่กำลังจัดทำอยู่ในครัว */
  currentCookingQueue?: string;
  /** จำนวนคิวที่รออยู่ */
  waitingCount?: number;
  /** เวลาโดยประมาณที่ต้องรอ (นาที) */
  estimatedMinutes?: number;
  /** ฟังก์ชันเริ่มการสั่งอาหาร */
  onStartOrder: () => void;
  /** ฟังก์ชันติดตามสถานะคำสั่งซื้อ */
  onTrackOrder: () => void;
  /** ข้อมูลออเดอร์ที่ยังทำงานอยู่ของลูกค้าคนนี้ */
  activeOrderInfo?: { queueNumber: string; status: string; dailyQueueIndex?: number; createdAt?: string | Date } | null;
  /** ฟังก์ชันเปิดทัวร์แนะนำการใช้งาน */
  onOpenTour: () => void;
  /** ฟังก์ชันเปิด Modal ความช่วยเหลือ */
  onOpenHelp: () => void;
  /** ฟังก์ชันเปิด Modal ข้อมูลร้านและติดต่อ */
  onOpenContact?: () => void;
  /** ฟังก์ชันดูรายการเมนูทั้งหมด */
  onBrowseMenu: () => void;
  /** รายการเมนูตัวอย่างแนะนำ */
  sampleMenus?: SampleMenuDTO[];
}

/**
 * Modal แสดงรายละเอียดเมนูตัวอย่างเมื่อลูกค้าคลิกการ์ด
 */
function SampleMenuDetailModal({
  menu,
  onClose,
  onStartOrder,
}: {
  menu: SampleMenuDTO;
  onClose: () => void;
  onStartOrder?: () => void;
}) {
  const menuImg = menu.imageUrl || menu.image_url || (menu as any).sample_image;
  const menuTitle = menu.name || menu.menu_name || "เมนูตัวอย่าง";
  const tagsList = menu.tags
    ? menu.tags.split(/[,،]+/).map((t) => t.trim()).filter(Boolean)
    : [];

  const handleStart = () => {
    onClose();
    if (onStartOrder) {
      onStartOrder();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* ฉากหลังสีมืด */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl z-10 animate-slide-up">
        {/* รูปภาพเมนู */}
        <div className="relative w-full h-56 bg-zinc-100 flex items-center justify-center overflow-hidden">
          <SafeImage
            src={menuImg}
            alt={menuTitle}
            className="w-full h-full object-cover"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50">
                <Sparkles size={48} className="text-rose-300" />
              </div>
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          
          {/* ป้ายแท็ก เช่น ฮิต, เผ็ด, ขายดี */}
          {tagsList.length > 0 && (
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
              {tagsList.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500 text-white shadow-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-3 left-4 right-12">
            <h2 className="text-xl font-black text-white drop-shadow-md line-clamp-1">{menuTitle}</h2>
          </div>
        </div>

        {/* รายละเอียดและปุ่มเริ่มสั่ง */}
        <div className="p-5 space-y-4">
          {menu.description ? (
            <p className="text-sm text-zinc-600 leading-relaxed">{menu.description}</p>
          ) : (
            <p className="text-sm text-zinc-400 italic">ไม่มีคำอธิบายเพิ่มเติม</p>
          )}
          <button
            onClick={handleStart}
            style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
            className="w-full py-3.5 sm:py-4 px-6 text-white font-bold rounded-full text-base shadow-lg shadow-rose-500/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>เริ่มสั่งเครปเลย!</span>
            <ArrowRight className="w-4.5 h-4.5 text-white/90 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * สายพานแสดงเมนูแนะนำเลื่อนอัตโนมัติ (Marquee Conveyor Belt)
 */
function SampleMenuConveyor({
  menus,
  onSelect,
}: {
  menus: SampleMenuDTO[];
  onSelect: (menu: SampleMenuDTO) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);
  const resumeTimeout = useRef<any>(null);

  // เลื่อนอัตโนมัติอย่างราบรื่นเมื่อมีเมนูมากกว่า 3 รายการ
  useEffect(() => {
    if (menus.length <= 3) return;

    const el = scrollRef.current;
    if (!el) return;

    let animationFrameId: number;
    const speed = 0.5; // ความเร็วในการเลื่อน

    const step = () => {
      if (!isInteracting.current && el) {
        el.scrollLeft += speed;
        const maxScroll = el.scrollWidth / 2;
        if (el.scrollLeft >= maxScroll) {
          el.scrollLeft -= maxScroll;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };
  }, [menus.length]);

  const handleInteractionStart = () => {
    isInteracting.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
  };

  const handleInteractionEnd = () => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      isInteracting.current = false;
    }, 2000);
  };

  // ทำซ้ำรายการเพื่อให้การเลื่อนวนซ้ำต่อกันได้ไม่รู้จบ
  const displayList = menus.length > 3 ? [...menus, ...menus] : menus;

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleInteractionStart}
      onMouseUp={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      onMouseEnter={() => { isInteracting.current = true; }}
      onMouseLeave={() => { isInteracting.current = false; }}
      className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 scroll-smooth select-none cursor-grab active:cursor-grabbing"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {displayList.map((menu, idx) => {
        const cardImg = menu.imageUrl || menu.image_url || (menu as any).sample_image;
        const cardTitle = menu.name || menu.menu_name || "เมนูตัวอย่าง";
        const tagsList = menu.tags
          ? menu.tags.split(/[,،]+/).map((t) => t.trim()).filter(Boolean)
          : [];

        return (
          <button
            key={`${menu.id || (menu as any).sample_id}-${idx}`}
            type="button"
            onClick={() => onSelect(menu)}
            className="flex-none w-32 sm:w-36 group text-left focus:outline-none cursor-pointer"
          >
            <div className="w-32 sm:w-36 h-24 sm:h-26 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80 shadow-xs group-hover:shadow-md group-active:scale-95 transition-all relative flex items-center justify-center">
              <SafeImage
                src={cardImg}
                alt={cardTitle}
                draggable={false}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50">
                    <Sparkles size={24} className="text-rose-300" />
                  </div>
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* ป้ายแท็กบนการ์ด */}
              {tagsList.length > 0 && (
                <div className="absolute top-1.5 left-1.5 z-10 flex flex-wrap gap-1 max-w-[90%]">
                  {tagsList.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-500/95 text-white shadow-xs backdrop-blur-xs leading-none"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="absolute bottom-1.5 left-2 right-2">
                <p className="text-white text-[11px] font-black leading-tight drop-shadow line-clamp-2">
                  {cardTitle}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * คอมโพเนนต์ LandingView
 */
export function LandingView({
  restaurantName = "",
  restaurantDescription,
  restaurantLogo,
  restaurantBanner,
  isPaused = false,
  pauseReason = "ร้านปิดรับออเดอร์ชั่วคราว",
  pauseUntil,
  allowPreorder = false,
  currentCookingQueue = "-",
  waitingCount = 0,
  estimatedMinutes = 0,
  onStartOrder,
  onTrackOrder,
  activeOrderInfo,
  onOpenTour,
  onOpenHelp,
  onOpenContact,
  onBrowseMenu,
  sampleMenus = [],
}: LandingViewProps) {
  const [notified, setNotified] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [bannerSrc, setBannerSrc] = useState<string>("");
  const [selectedSample, setSelectedSample] = useState<SampleMenuDTO | null>(null);

  useEffect(() => {
    if (restaurantBanner) {
      setBannerSrc(formatDriveImageUrl(restaurantBanner));
      setBannerError(false);
    } else {
      setBannerSrc("");
    }
  }, [restaurantBanner]);

  // จัดการกรณีรูปแบนเนอร์โหลดไม่สำเร็จ ให้สลับไปใช้รูปสำรอง (Thumbnail)
  const handleBannerError = () => {
    if (restaurantBanner) {
      const fallbackUrl = getDriveThumbnailUrl(restaurantBanner);
      if (fallbackUrl && fallbackUrl !== bannerSrc) {
        setBannerSrc(fallbackUrl);
        return;
      }
    }
    setBannerError(true);
  };

  const formattedResumeTime = pauseUntil
    ? new Date(pauseUntil).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : "เร็วๆ นี้";

  // ตั้งค่าแจ้งเตือนเมื่อร้านเปิด
  const handleNotifyMe = () => {
    setNotified(true);
    toast.success("ตั้งค่าแจ้งเตือนแล้ว! ระบบจะส่งแจ้งเตือนเมื่อร้านเปิดรับออเดอร์");
  };

  const hasValidBanner = Boolean(restaurantBanner && !bannerError && bannerSrc);
  const activeMenus = sampleMenus.filter((m) => m.isActive !== false && (m as any).is_active !== false);

  return (
    <div className="min-h-screen bg-zinc-100 flex justify-center text-zinc-900 selection:bg-rose-500 selection:text-white">
      {/* เฟรมแสดงผลหลักสำหรับมือถือ */}
      <div className="w-full max-w-lg bg-zinc-900 h-[100dvh] min-h-[640px] flex flex-col relative sm:shadow-2xl sm:border-x sm:border-zinc-200/80 overflow-hidden">
        
        {/* ========================================================= */}
        {/* ส่วนแบนเนอร์ด้านบน 40% (Hero Banner Section)               */}
        {/* ========================================================= */}
        <div className="w-full relative h-[40%] min-h-[220px] flex flex-col justify-between p-4 sm:p-5 bg-zinc-950 shrink-0 overflow-hidden">
          {/* ภาพพื้นหลังแบนเนอร์หรือกราเดียนต์สำรอง */}
          {hasValidBanner ? (
            <div className="absolute inset-0 z-0">
              <img
                src={bannerSrc}
                alt={restaurantName}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-full object-cover object-center filter brightness-[0.95]"
                onError={handleBannerError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/25" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>
          )}

          {/* แถบปุ่มด้านบนสุด: ข้อมูลร้าน & ความช่วยเหลือ */}
          <div className="relative z-20 flex items-center justify-between w-full">
            {onOpenContact ? (
              <button
                onClick={onOpenContact}
                aria-label="ดูข้อมูลร้านค้าและช่องทางติดต่อ"
                title="ดูข้อมูลร้านค้าและช่องทางติดต่อ"
                className="px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 text-xs font-semibold transition-all shadow-md"
              >
                <Store className="w-3.5 h-3.5 text-amber-300" />
                <span>ข้อมูลร้าน & ติดต่อ</span>
              </button>
            ) : <div />}

            <button
              onClick={onOpenHelp}
              aria-label="ช่วยเหลือ / แนะนำขั้นตอน"
              title="ช่วยเหลือ / แนะนำขั้นตอน"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all shadow-md"
            >
              <HelpCircle className="w-4 h-4 text-white/90" />
            </button>
          </div>

          {/* ข้อมูลร้าน: โลโก้, ชื่อร้าน และคำโปรย */}
          <div className="relative z-10 flex items-center gap-3.5 w-full pb-3">
            {/* โลโก้ร้าน */}
            <button
              type="button"
              onClick={onOpenContact}
              className="w-18 h-18 sm:w-20 sm:h-20 min-w-[72px] sm:min-w-[80px] rounded-2xl bg-white flex items-center justify-center overflow-hidden p-2 shrink-0 border-2 border-white shadow-2xl ring-1 ring-black/10 hover:opacity-95 active:scale-95 transition-transform text-left cursor-pointer"
              title="กดเพื่อดูข้อมูลร้านและช่องทางติดต่อ"
            >
              <SafeImage
                src={restaurantLogo || "/LogoSquare.png"}
                alt={restaurantName || "ร้านอาหาร"}
                className="w-full h-full object-contain object-center"
                fallbackType="logo"
              />
            </button>

            {/* ข้อความชื่อร้าน */}
            <div className="space-y-1 min-w-0 flex-1 text-left">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md truncate">
                {restaurantName || "Crepe Cafe"}
              </h1>
              <p className="text-xs sm:text-[13px] font-medium text-zinc-200/95 drop-shadow-sm line-clamp-1">
                {restaurantDescription || "สั่งล่วงหน้า • เลือกเวลารับเองได้ • ไม่ต้องรอคิว"}
              </p>

              {onOpenContact && (
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold transition-all shadow-xs"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>ข้อมูลร้าน & โซเชียล</span>
                  <ChevronRight className="w-3 h-3 text-white/70" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* แผ่นเนื้อหาด้านล่าง 60% (Interactive Sheet)                */}
        {/* ========================================================= */}
        <div className="w-full flex-1 relative z-10 bg-white rounded-t-[32px] sm:rounded-t-[36px] -mt-5 pb-5 flex flex-col shadow-[0_-12px_36px_rgba(0,0,0,0.18)] border-t border-zinc-100 overflow-y-auto">
          
          <div className="w-10 h-1 rounded-full bg-zinc-200/80 mx-auto shrink-0 mt-3 mb-0" />

          <div className="w-full flex flex-col gap-3.5 px-5 sm:px-6 py-3.5 flex-1">
            
            {/* 1. ส่วนเมนูแนะนำ (Recommended Sample Menus) */}
            {activeMenus.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs font-black text-zinc-800">เมนูแนะนำ</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {activeMenus.length} เมนู
                  </span>
                </div>

                <SampleMenuConveyor
                  menus={activeMenus}
                  onSelect={setSelectedSample}
                />
              </div>
            )}

            {isPaused ? (
              /* กรณีที่ร้านปิดรับออเดอร์ชั่วคราว */
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-[22px] p-4.5 shadow-sm border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <h3 className="font-bold text-sm text-white">
                      ร้านหยุดรับออเดอร์ชั่วคราว
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    {pauseReason} · เปิดรับอีกครั้ง {formattedResumeTime}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-2xl text-xs text-zinc-600 text-center leading-relaxed font-medium">
                  ถ้าคุณมีออเดอร์ค้างอยู่ ยังติดตามสถานะได้ปกติ — ครัวกำลังทำให้ต่อเนื่อง
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    onClick={onTrackOrder}
                    className="w-full py-3.5 px-4 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200/90 font-bold rounded-full text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4 text-zinc-500" />
                    <span>ดูออเดอร์ของฉัน</span>
                  </button>

                  <button
                    onClick={allowPreorder ? onStartOrder : onBrowseMenu}
                    className="w-full py-3.5 px-4 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 font-semibold rounded-full text-sm border border-zinc-200/60 transition active:scale-[0.98]"
                  >
                    {allowPreorder ? "สั่งจองเวลามารับล่วงหน้า" : "ดูเมนู (สั่งไม่ได้ตอนนี้)"}
                  </button>

                  <button
                    onClick={handleNotifyMe}
                    disabled={notified}
                    className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-full text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:bg-zinc-600"
                  >
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>{notified ? "เปิดการแจ้งเตือนแล้ว" : "เตือนฉันเมื่อเปิดรับ"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* กรณีที่ร้านเปิดรับออเดอร์ปกติ: แสดงสถานะคิวสด & ปุ่มเริ่มสั่ง */
              <div className="flex flex-col gap-3 animate-fade-in">
                {/* การ์ดสถานะคิวหน้าร้าน */}
                <div className="bg-gradient-to-br from-zinc-50/90 via-white to-zinc-50/50 rounded-[22px] p-4 shadow-sm border border-zinc-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      สถานะคิวหน้าร้าน
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px] font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      เปิดรับออเดอร์
                    </span>
                  </div>

                  {waitingCount === 0 ? (
                    <div className="flex items-center justify-between py-0.5">
                      <div className="space-y-0.5">
                        <span className="text-lg font-black text-emerald-600 tracking-tight flex items-center gap-1.5">
                          คิวว่าง รีบสั่งเลย!
                        </span>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          สั่งตอนนี้ ทำเสร็จไว ไม่ต้องรอคิวนาน
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-700 border border-emerald-500/20 shrink-0">
                        0 คิวรอ (ประมาณ 15 นาที)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between py-0.5">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-zinc-400 font-medium block">
                          {currentCookingQueue && currentCookingQueue !== "-" ? "กำลังทำคิว" : "สถานะครัว"}
                        </span>
                        <span className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
                          {currentCookingQueue && currentCookingQueue !== "-" ? currentCookingQueue : "เตรียมทำ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-white text-xs font-semibold text-zinc-700 border border-zinc-200/70 shadow-xs">
                          รออีก {waitingCount} คิว
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white text-xs font-semibold text-zinc-700 border border-zinc-200/70 shadow-xs">
                          ประมาณ {estimatedMinutes || 15} นาที
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ปุ่มเริ่มสั่งเครป และปุ่มติดตามออเดอร์ */}
                <div className="flex flex-col gap-2.5 pt-0.5">
                  <button
                    onClick={onStartOrder}
                    style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                    className="w-full py-3.5 sm:py-4 px-6 text-white font-bold rounded-full text-base shadow-lg shadow-rose-500/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>เริ่มสั่งเครป</span>
                    <ArrowRight className="w-4.5 h-4.5 text-white/90 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={onTrackOrder}
                    className={`w-full py-3.5 px-4 font-bold rounded-full text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer ${
                      activeOrderInfo
                        ? "bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-300"
                        : "bg-zinc-50 hover:bg-zinc-100/90 text-zinc-800 border border-zinc-200/90"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className={`w-4 h-4 ${activeOrderInfo ? "text-emerald-600" : "text-zinc-500"}`} />
                      <span>
                        {activeOrderInfo
                          ? `ติดตามออเดอร์ (คิว ${activeOrderInfo.queueNumber}${formatQueueDayBadge(activeOrderInfo.dailyQueueIndex, activeOrderInfo.createdAt) ? ` • ${formatQueueDayBadge(activeOrderInfo.dailyQueueIndex, activeOrderInfo.createdAt)}` : ""})`
                          : "ติดตามออเดอร์ของฉัน"}
                      </span>
                    </div>
                    {activeOrderInfo && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {activeOrderInfo.status === "cooking"
                          ? "กำลังทำ"
                          : activeOrderInfo.status === "ready"
                          ? "พร้อมรับแล้ว"
                          : "รอดำเนินการ"}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ลิงก์เปิดทัวร์แนะนำวิธีใช้งาน */}
          <div className="w-full flex items-center justify-center pt-1 pb-2 shrink-0 px-5">
            <button
              onClick={onOpenTour}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-full hover:bg-zinc-50 active:scale-95 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>วิธีใช้งาน (แนะนำขั้นตอน)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal แสดงรายละเอียดเมนูตัวอย่าง */}
      {selectedSample && (
        <SampleMenuDetailModal
          menu={selectedSample}
          onClose={() => setSelectedSample(null)}
          onStartOrder={onStartOrder}
        />
      )}
    </div>
  );
}
