/**
 * @file QueueClient.tsx
 * @description คอมโพเนนต์หลักสำหรับแดชบอร์ดจัดการคิวคำสั่งซื้อของร้านค้า (Restaurant Live Queue Management)
 * รองรับการแสดงผลคิวสด, การเปลี่ยนสถานะออเดอร์ (ยืนยันรับ -> เริ่มปรุง -> เสร็จสิ้น -> ชำระเงิน),
 * การแจ้งเตือนเสียง TTS และ Chime, การจัดการสินค้าหมด (Out of Stock), การตรวจสอบสลิปโอนเงิน และการหยุดพักรับออเดอร์ชั่วคราว
 */

"use client";

import { Badge, orderStatusBadge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { Order } from "@/app/lib/mock-data";
import { RestaurantApi, OrderDTO, OrderStatus } from "@/app/lib/api";
import { cn, getRelativeTime, formatDriveImageUrl, getFriendlyTableLabel, getCleanTableNumber, parseCrepeDetails, ParsedCrepeDetails } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  Bell,
  Check,
  CheckCheck,
  ChefHat,
  Clock,
  CreditCard,
  Banknote,
  QrCode,
  RefreshCw,
  Utensils,
  UtensilsCrossed,
  ShoppingBag,
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  FileText,
  Loader2,
  Volume2,
  PauseCircle,
  PlayCircle,
  Store,
  Power,
  User,
  Phone,
  Receipt,
  Download,
  Eye,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { speakOrderVoiceAnnouncement, speakPaymentVoiceAnnouncement, playOrderChime } from "@/app/lib/useRestaurantRealtime";
import { useRestaurant } from "@/app/(restaurant)/restaurant/RestaurantProvider";
import { RestaurantQueueSkeleton } from "@/app/components/skeletons/RestaurantQueueSkeleton";
import { OutOfStockModal } from "@/app/components/restaurant/OutOfStockModal";
import React, { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import { toast } from "sonner";

/** รายการเหตุผลในการยกเลิกคำสั่งซื้อสำเร็จรูป */
export const PRESET_CANCEL_REASONS = [
  { id: "out_of_stock", label: "วัตถุดิบหมด / เมนูหมด", desc: "ทางร้านวัตถุดิบไม่พอหรือเมนูนี้จำหน่ายหมดแล้ว" },
  { id: "customer_request", label: "ลูกค้ายกเลิก / เปลี่ยนใจ", desc: "ลูกค้าร้องขอยกเลิกรายการเอง" },
  { id: "kitchen_closed", label: "ครัวปิด / ไม่สะดวกทำรายการนี้", desc: "ไม่สามารถปรุงเมนูนี้ได้ในขณะนี้" },
  { id: "too_long", label: "ใช้เวลาทำนานเกินไป", desc: "คิวครัวหนาแน่นหรือเวลาจัดเตรียมไม่ทัน" },
  { id: "other", label: "อื่นๆ (ระบุข้อความเอง)", desc: "ระบุเหตุผลเพิ่มเติม" },
];

/** ดึงวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD */
export const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * แปลงวันที่เป็นข้อความภาษาไทย เช่น "วันนี้ (12 ก.ย. 2569)"
 */
export function formatThaiDisplayDate(dateStr: string) {
  if (!dateStr) return "";
  const todayStr = getTodayDateStr();
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const thaiYear = y + 543;
  const isToday = dateStr === todayStr;

  if (isToday) {
    return `วันนี้ (${d} ${thaiMonths[m - 1]} ${thaiYear})`;
  }
  return `${d} ${thaiMonths[m - 1]} ${thaiYear}`;
}

/**
 * ตรวจสอบว่าชื่อแป้งหรือไส้นั้นติดสถานะสินค้าหมดหรือไม่
 */
export function isNameOutOfStock(name?: string, availMap?: Record<string, boolean>): boolean {
  if (!name || !availMap) return false;
  const clean = name.trim().toLowerCase();
  if (availMap[clean] === false) return true;
  if (availMap[clean] === true) return false;

  // ตรวจสอบชื่อที่ตัดคำนำหน้า "แป้ง", "แผ่น", "เครป"
  const noPrefix = clean.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
  if (noPrefix && availMap[noPrefix] === false) return true;
  if (noPrefix && availMap[noPrefix] === true) return false;

  const foundKey = Object.keys(availMap).find(
    (k) => k.includes(clean) || clean.includes(k) || (noPrefix && k.includes(noPrefix))
  );
  if (foundKey) {
    return availMap[foundKey] === false;
  }
  return false;
}

// Helper: Calculate total active items
function calculateTotal(order: Order, availMap?: Record<string, boolean>): number {
  return order.items
    .filter((i) => {
      if (i.isCancelled || i.status === "cancelled") return false;
      if (availMap) {
        const details = parseCrepeDetails(i);
        const isCrustOut = isNameOutOfStock(details.crust, availMap);
        const tList = details.toppingsList && details.toppingsList.length > 0
          ? details.toppingsList
          : (details.toppings && details.toppings !== "ไม่ใส่ไส้ (แป้งเปล่า)"
              ? details.toppings.split(/[+,•]/).map((t) => t.trim()).filter(Boolean)
              : []);
        const allToppingsOut = tList.length > 0 && tList.every((t) => isNameOutOfStock(t, availMap));
        if (isCrustOut || allToppingsOut || (tList.length === 0 && i.isOutOfStock)) return false;
      } else if (i.isOutOfStock) {
        return false;
      }
      return true;
    })
    .reduce((sum, item) => sum + (item.subtotal || 0), 0);
}

function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
}


function parsePaymentInfo(order: Order) {
  const rawMethod = String((order as any).paymentMethod || (order as any).payment_method || "").toLowerCase();
  const isCash = rawMethod.includes("cash") || rawMethod.includes("เงินสด") || rawMethod.includes("หน้าร้าน");
  const isPaid = (order as any).paymentStatus === "paid" || (order as any).payment_status === "paid" || order.status === "paid" || order.status === "completed" || !!order.hasSlip;

  return {
    isCash,
    isPromptPay: !isCash,
    isPaid,
  };
}

// Helper: Deep compare orders to prevent redundant re-renders & page flickering
function areOrdersEqual(a: Order[], b: Order[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const oA = a[i];
    const oB = b[i];
    if (
      String(oA.id) !== String(oB.id) ||
      oA.status !== oB.status ||
      oA.total !== oB.total ||
      String((oA as any).paymentMethod || "").toLowerCase() !== String((oB as any).paymentMethod || "").toLowerCase() ||
      String((oA as any).paymentStatus || "").toLowerCase() !== String((oB as any).paymentStatus || "").toLowerCase() ||
      oA.hasSlip !== oB.hasSlip
    ) {
      return false;
    }
    if (oA.items.length !== oB.items.length) return false;
    for (let j = 0; j < oA.items.length; j++) {
      if (
        String(oA.items[j].id) !== String(oB.items[j].id) ||
        oA.items[j].isOutOfStock !== oB.items[j].isOutOfStock ||
        oA.items[j].quantity !== oB.items[j].quantity
      ) {
        return false;
      }
    }
  }
  return true;
}

// ─── Memoized Order Card Component (External to prevent remounting flickers) ───
interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  isMobile?: boolean;
  queueNumber?: number;
  onSelect: (id: string, isMobile?: boolean) => void;
}

const OrderCard = memo(function OrderCard({
  order,
  isSelected,
  isMobile = false,
  queueNumber,
  onSelect,
}: OrderCardProps) {
  const displayQueue = order.dailyQueueIndex || queueNumber || (order as any).queuePosition;

  return (
    <button
      onClick={() => onSelect(order.id, isMobile)}
      className={cn(
        "w-full text-left p-3 sm:p-3.5 rounded-[14px] border transition-all duration-150 group relative overflow-hidden space-y-2",
        order.status === "cancelled"
          ? isSelected && !isMobile
            ? "bg-red-50/60 border-red-300 shadow-sm"
            : "bg-slate-50/80 border-slate-200 hover:border-red-200"
          : isSelected && !isMobile
          ? "bg-brand-50/50 border-brand-300 shadow-sm"
          : "bg-surface border-border hover:border-brand-200 hover:bg-surface-3"
      )}
    >
      {isSelected && !isMobile && (
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", order.status === "cancelled" ? "bg-red-500" : "bg-brand-500")} />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-2xs",
            order.status === "cancelled"
              ? "bg-red-100 border-red-200 text-red-600"
              : "bg-pink-100/90 border-pink-200 text-pink-600"
          )}>
            <span className="text-xs font-black">
              {order.queueNumber || (displayQueue ? `Q${displayQueue}` : (getCleanTableNumber(order.tableNumber) || "1"))}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-text text-sm whitespace-nowrap">
                {order.queueNumber ? `คิว ${order.queueNumber}` : (displayQueue ? `คิวที่ ${displayQueue}` : `คิว #${order.id.replace("ord-", "")}`)}
              </span>
              {displayQueue && order.status !== "cancelled" && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shrink-0">
                  คิวที่ {displayQueue} ของวัน
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={orderStatusBadge[order.status]?.variant || "danger"} className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
            {orderStatusBadge[order.status]?.label || "ยกเลิกแล้ว"}
          </Badge>
          {isMobile && <ChevronRight size={14} className="text-text-3 shrink-0" />}
        </div>
      </div>

      {/* Items Count & Time */}
      <div className="flex items-center justify-between text-[11px] text-text-3 gap-2">
        <span suppressHydrationWarning className="flex items-center gap-1 min-w-0 truncate">
          <Clock size={11} className="shrink-0" /> {getRelativeTime(order.createdAt)}
        </span>
        <span className="text-text-2 font-semibold shrink-0 whitespace-nowrap">{order.items.length} รายการ</span>
      </div>

      {/* Customer Name & Phone on Card */}
      {(order.customerNickname || order.customerPhone || order.scheduledTime || (order as any).scheduled_time) && (
        <div className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-surface-2/60 border border-border/60 text-text-2 gap-1.5">
          <span className="flex items-center gap-1.5 min-w-0 truncate font-bold text-text">
            <User size={12} className="text-text-3 shrink-0" />
            <span className="truncate">คุณ {order.customerNickname || "ลูกค้าทั่วไป"}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {(order.scheduledTime || (order as any).scheduled_time) ? (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-0.5">
                <Clock size={10} className="text-amber-700" /> {order.scheduledTime || (order as any).scheduled_time} น.
              </span>
            ) : null}
            {order.customerPhone && (
              <span className="text-[10px] font-mono font-medium text-text bg-surface-3 px-1.5 py-0.5 rounded border border-border shrink-0">
                {order.customerPhone}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prominent Note Warning on Card */}
      {(() => {
        const itemsWithNotes = order.items
          .map((i) => {
            const d = parseCrepeDetails(i);
            return {
              crust: d.crust,
              cleanNote: d.note,
            };
          })
          .filter((i) => i.cleanNote && i.cleanNote.length > 0);

        if (itemsWithNotes.length === 0) return null;

        return (
          <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-slate-100/90 text-[11px] shadow-2xs">
            <span className="shrink-0 font-bold text-slate-700">โน้ต:</span>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
              {itemsWithNotes.map((it) => `${it.crust}: ${it.cleanNote}`).join(" • ")}
            </span>
          </div>
        );
      })()}

      {/* Payment Method & Status Row */}
      {(() => {
        const payInfo = parsePaymentInfo(order);
        return (
          <div className="flex items-center justify-between gap-1 text-[11px] pt-1">
            <div className="flex items-center gap-1 min-w-0">
              {payInfo.isCash ? (
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-300/80 shadow-2xs">
                  <Banknote size={11} className="text-zinc-700 shrink-0" /> เงินสดหน้าร้าน
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
                  <QrCode size={11} className="text-sky-600 shrink-0" /> QR พร้อมเพย์
                </span>
              )}
            </div>

            {/* If QR PromptPay, show whether paid or not; If Cash, do NOT show payment status */}
            {!payInfo.isCash && (
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap border shadow-2xs",
                  payInfo.isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-600 text-white border-rose-700 font-extrabold shadow-xs dark:bg-rose-600 dark:border-rose-500"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    payInfo.isPaid ? "bg-emerald-500" : "bg-white animate-pulse"
                  )}
                />
                {payInfo.isPaid ? "ชำระแล้ว" : "ยังไม่ชำระ"}
              </span>
            )}
          </div>
        );
      })()}

      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/50">
        <span className="text-text-3 whitespace-nowrap">{order.status === "cancelled" ? "สถานะ:" : "ราคารวม:"}</span>
        <span className={cn("font-bold whitespace-nowrap", order.status === "cancelled" ? "text-red-600" : "text-brand-700")}>
          {order.status === "cancelled" ? "ยกเลิกแล้ว (฿0)" : `฿${calculateTotal(order)}`}
        </span>
      </div>
    </button>
  );
});

// ─── Memoized Order Detail Content Component (External to prevent remounting flickers) ───
interface OrderDetailContentProps {
  order: Order;
  queueNumber?: number;
  menuMap?: Record<string, string>;
  menuAvailabilityMap?: Record<string, boolean>;
  onClose?: () => void;
  onAdvanceStatus: (id: string, closeMobile?: boolean) => void;
  onOpenOutOfStockModal?: () => void;
  onOpenCancelModal: (orderId: string) => void;
  onViewSlip: (id: string) => void;
}

const OrderDetailContent = memo(function OrderDetailContent({
  order,
  queueNumber,
  menuMap,
  menuAvailabilityMap,
  onClose,
  onAdvanceStatus,
  onOpenOutOfStockModal,
  onOpenCancelModal,
  onViewSlip,
}: OrderDetailContentProps) {
  const displayQueue = order.dailyQueueIndex || queueNumber || (order as any).queuePosition;

  return (
    <div className="flex flex-col h-full">
      {/* Detail Header Container */}
      <div className="px-4 sm:px-6 py-4 bg-brand-50/50 border-b border-brand-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 flex-shrink-0">
        {/* Left: Queue Avatar & Queue Titles */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-brand-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="text-base sm:text-lg font-black text-brand-950">
              {order.queueNumber || (displayQueue ? `Q${displayQueue}` : (getCleanTableNumber(order.tableNumber) || "1"))}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-text whitespace-nowrap">
                {order.queueNumber ? `ออเดอร์คิว ${order.queueNumber}` : (displayQueue ? `ออเดอร์คิวที่ ${displayQueue}` : `ออเดอร์คิว #${order.id.replace("ord-", "")}`)}
              </h2>
              {displayQueue && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white text-brand-900 border border-brand-200/80 shrink-0">
                  คิวที่ {displayQueue} ของวัน
                </span>
              )}
            </div>
            <p suppressHydrationWarning className="text-xs text-text-3 flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 shrink-0"><Clock size={12} className="text-text-3" /> สั่งเมื่อ {getRelativeTime(order.createdAt)}</span>
              <span className="text-border hidden sm:inline">•</span>
              <span className="shrink-0 font-mono text-[11px]">รหัส: {order.id.replace("ord-", "#")}</span>
            </p>
          </div>
        </div>

        {/* Right: Status Badge & Payment Method */}
        <div className="flex items-center sm:flex-col sm:items-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant={orderStatusBadge[order.status]?.variant || "neutral"} dot className="text-xs font-bold px-3 py-0.5">
              {orderStatusBadge[order.status]?.label || order.status}
            </Badge>
          </div>

          {/* Payment Info */}
          {(() => {
            const payInfo = parsePaymentInfo(order);
            return (
              <div className="flex items-center gap-1.5 flex-wrap">
                {payInfo.isCash ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-text bg-surface-2 px-2.5 py-0.5 rounded-lg border border-border">
                    <Banknote size={12} className="text-text-3" /> เงินสดหน้าร้าน
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-text bg-surface-2 px-2.5 py-0.5 rounded-lg border border-border">
                    <QrCode size={12} className="text-text-3" /> QR พร้อมเพย์
                  </span>
                )}

                {!payInfo.isCash && (
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border shadow-2xs transition-all",
                      payInfo.isPaid
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                        : "bg-rose-600 text-white border-rose-700 font-extrabold shadow-sm ring-2 ring-rose-200 dark:ring-rose-900/50 dark:bg-rose-600 dark:border-rose-500"
                    )}
                  >
                    {payInfo.isPaid ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    ) : (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                    )}
                    {payInfo.isPaid ? "ชำระแล้ว" : "ยังไม่ชำระเงิน"}
                  </span>
                )}
              </div>
            );
          })()}

          {order.status === "cancelled" && (order as any).cancelReason && (
            <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              เหตุผล: {(order as any).cancelReason}
            </span>
          )}
        </div>
      </div>

      {/* Detail Items */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3 bg-surface-2/30 custom-scrollbar">
        {order.items.map((item) => {
          const details = parseCrepeDetails(item);

          // 1. Check Crust availability
          const isCrustOutOfStock = isNameOutOfStock(details.crust, menuAvailabilityMap);

          // 2. Check Toppings availability
          const rawToppingsList = details.toppingsList && details.toppingsList.length > 0
            ? details.toppingsList
            : (details.toppings && details.toppings !== "ไม่ใส่ไส้ (แป้งเปล่า)"
               ? details.toppings.split(/[+,•]/).map((t) => t.trim()).filter(Boolean)
               : []);

          const toppingStatuses = rawToppingsList.map((tName) => ({
            name: tName,
            isOutOfStock: isNameOutOfStock(tName, menuAvailabilityMap),
          }));

          const totalToppings = toppingStatuses.length;
          const outOfStockToppingsCount = toppingStatuses.filter((t) => t.isOutOfStock).length;
          const allToppingsOutOfStock = totalToppings > 0 && outOfStockToppingsCount === totalToppings;

          // Item is FULLY out of stock if:
          // - Crust is out of stock OR
          // - All selected toppings are out of stock OR
          // - (No toppings selected and base item is out of stock)
          const isItemFullyOutOfStock = !item.isCancelled && (
            isCrustOutOfStock ||
            allToppingsOutOfStock ||
            (totalToppings === 0 && Boolean(item.isOutOfStock))
          );

          // Item has PARTIAL out of stock if only some toppings are out of stock (not all) and crust is available
          const isPartialOutOfStock = !item.isCancelled && !isItemFullyOutOfStock && outOfStockToppingsCount > 0;

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col p-3.5 sm:p-4 rounded-[16px] border shadow-xs transition-all gap-3",
                item.isCancelled
                  ? "border-slate-200 bg-slate-100/70 opacity-65"
                  : isItemFullyOutOfStock
                  ? "border-red-200 bg-red-50/40 opacity-80"
                  : isPartialOutOfStock
                  ? "border-amber-200 bg-amber-50/25"
                  : "border-border bg-surface hover:border-brand-200"
              )}
            >
              {/* Top Row: Food Image, Name, Choices, Price & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  {/* Food Image (Displays the 1st topping's image e.g. ฝอยทอง, นูเทลล่า) */}
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-surface-3 shrink-0 border border-border/80 shadow-xs">
                    {(() => {
                      const hasToppings = Boolean(details.toppingsList && details.toppingsList.length > 0);
                      let rawImg = "";

                      if (hasToppings) {
                        // 1. Primary priority: First topping's image
                        const firstToppingClean = details.firstTopping ? details.firstTopping.toLowerCase().trim() : "";
                        let matchedToppingImg = firstToppingClean && menuMap ? menuMap[firstToppingClean] : null;
                        
                        if (!matchedToppingImg && firstToppingClean && menuMap) {
                          const foundKey = Object.keys(menuMap).find((k) => k.includes(firstToppingClean) || firstToppingClean.includes(k));
                          if (foundKey) matchedToppingImg = menuMap[foundKey];
                        }

                        // 2. Secondary priority: Subsequent toppings in exact order
                        if (!matchedToppingImg && details.toppingsList && details.toppingsList.length > 0 && menuMap) {
                          for (const t of details.toppingsList) {
                            const tClean = t.toLowerCase().trim();
                            const foundKey = menuMap[tClean] ? tClean : Object.keys(menuMap).find((k) => k.includes(tClean) || tClean.includes(k));
                            if (foundKey && menuMap[foundKey]) {
                              matchedToppingImg = menuMap[foundKey];
                              break;
                            }
                          }
                        }

                        rawImg = matchedToppingImg || item.menuItem.image || (item.menuItem as any).images?.[0]?.image_url || (item.menuItem as any).images?.[0] || "";
                      }

                      return (
                        <SafeImage
                          src={rawImg}
                          alt={details.firstTopping || details.crust}
                          className={cn("w-full h-full object-cover", (isItemFullyOutOfStock || item.isCancelled) && "grayscale-[40%]")}
                          fallback={
                            <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-600">
                              <ChefHat size={18} />
                            </div>
                          }
                        />
                      );
                    })()}
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 px-1.5 py-0.5 rounded-tl-md text-[10px] font-black text-white shadow-xs",
                        item.isCancelled ? "bg-slate-500" : isItemFullyOutOfStock ? "bg-red-500" : "bg-brand-600"
                      )}
                    >
                      x{item.quantity}
                    </span>
                  </div>

                  <div className="min-w-0">
                    {/* Line 1: Crust (e.g. แป้งกรอบ / แป้งนุ่ม) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={cn(
                        "text-sm sm:text-base font-bold tracking-tight truncate",
                        (isItemFullyOutOfStock || item.isCancelled) ? "text-slate-500 line-through" : "text-text"
                      )}>
                        {details.crust}
                      </p>
                      {item.isCancelled && (
                        <span className="text-[10px] font-black text-slate-700 bg-slate-200 border border-slate-300 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                          <Ban size={10} /> ยกเลิกแล้ว {(item as any).cancelReason && `(${(item as any).cancelReason})`}
                        </span>
                      )}
                      {isItemFullyOutOfStock && !item.isCancelled && (
                        <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                          <Ban size={10} /> เมนูนี้หมด
                        </span>
                      )}
                      {isPartialOutOfStock && !item.isCancelled && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                          <AlertTriangle size={10} /> บางไส้หมด
                        </span>
                      )}
                    </div>

                    {/* Line 2: Toppings with per-topping strikethrough when out-of-stock */}
                    <div className="mt-0.5">
                      <div className="text-xs sm:text-sm font-semibold leading-snug flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">ไส้: </span>
                        {toppingStatuses.length === 0 ? (
                          <span className={cn((isItemFullyOutOfStock || item.isCancelled) ? "text-slate-400 line-through" : "text-slate-900 font-bold")}>
                            {details.toppings}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1 flex-wrap">
                            {toppingStatuses.map((t, idx) => {
                              const isThisToppingOut = t.isOutOfStock || isItemFullyOutOfStock;
                              return (
                                <React.Fragment key={idx}>
                                  <span
                                    className={cn(
                                      isThisToppingOut
                                        ? "line-through text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200"
                                        : "text-slate-900 font-bold"
                                    )}
                                    title={isThisToppingOut ? "ไส้นี้หมด" : undefined}
                                  >
                                    {t.name}
                                  </span>
                                  {idx < toppingStatuses.length - 1 && (
                                    <span className="text-slate-400 font-normal">, </span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Line 3: Standard Choices & Note Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {/* Takeaway / Dine-in Chips */}
                      {details.isTakeaway ? (
                        <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShoppingBag size={11} className="text-amber-700" /> กลับบ้าน
                        </span>
                      ) : details.isDineIn ? (
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <UtensilsCrossed size={11} className="text-slate-500" /> ทานที่ร้าน
                        </span>
                      ) : null}

                      {/* Clean Compact Note Chip */}
                      {details.note && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 bg-slate-100 border border-slate-300/80 px-2 py-0.5 rounded-md shadow-2xs">
                          <span className="text-slate-500 font-semibold">หมายเหตุ:</span>
                          <span className="text-slate-950 font-extrabold">{details.note}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 sm:ml-2">
                  <div className="text-left sm:text-right">
                    <p className={cn("text-sm sm:text-base font-bold", (isItemFullyOutOfStock || item.isCancelled) ? "text-slate-400 line-through" : "text-text")}>
                      ฿{item.subtotal}
                    </p>
                    {item.isCancelled ? (
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-0.5">
                        ไม่คิดเงิน (ยกเลิกแล้ว)
                      </p>
                    ) : isItemFullyOutOfStock ? (
                      <p className="text-[9px] sm:text-[10px] font-bold text-red-500 mt-0.5">
                        แจ้งลูกค้าแล้ว (ของหมด)
                      </p>
                    ) : isPartialOutOfStock ? (
                      <p className="text-[9px] sm:text-[10px] font-bold text-amber-600 mt-0.5">
                        แจ้งลูกค้าแล้ว (บางไส้หมด)
                      </p>
                    ) : null}
                  </div>

                  {item.isCancelled ? (
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/90 border border-slate-300 px-2.5 py-1 rounded-lg">
                      ยกเลิกแล้ว
                    </span>
                  ) : isItemFullyOutOfStock ? (
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <Ban size={12} className="text-red-500" />
                      ไส้/เมนูหมด
                    </span>
                  ) : isPartialOutOfStock ? (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <AlertTriangle size={12} className="text-amber-600" />
                      บางไส้หมด
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <Check size={12} className="text-emerald-600" />
                      พร้อมทำ
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Info Strip (Minimal & Compact) */}
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-surface border-t border-border flex items-center justify-between gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0 text-text-3">
            <User size={15} />
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text truncate">
              คุณ {order.customerNickname || (order as any).customer_nickname || (order as any).customerName || "ลูกค้าทั่วไป"}
            </p>
            {order.scheduledTime || (order as any).scheduled_time ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-2 text-text-2 border border-border">
                <Clock size={11} className="text-text-3 shrink-0" />
                <span>นัดรับ {order.scheduledTime || (order as any).scheduled_time} น.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-2 text-text-3 border border-border/60">
                <Clock size={11} className="text-text-3 shrink-0" />
                <span>รับทันที</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions: View Slip & Phone Call */}
        <div className="flex items-center gap-2 shrink-0">
          {(order.hasSlip || order.slipUrl || (order as any).slip_url || (order as any).has_slip) && (
            <button
              type="button"
              onClick={() => onViewSlip(order.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer select-none shadow-2xs"
              title="กดเพื่อดูหลักฐานการชำระเงิน/สลิปของลูกค้า"
            >
              <Receipt size={13} className="text-emerald-600" />
              <span>ดูสลิป</span>
            </button>
          )}

          {order.customerPhone || (order as any).customer_phone ? (
            <a
              href={`tel:${String(order.customerPhone || (order as any).customer_phone).replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text bg-surface-2 hover:bg-surface-3 active:scale-95 px-2.5 py-1.5 rounded-lg border border-border transition-colors cursor-pointer select-none"
              title="กดเพื่อโทรออกหาลูกค้าทันที"
            >
              <Phone size={13} className="text-text-3" />
              <span className="font-mono text-xs text-text">
                {formatPhoneNumber(String(order.customerPhone || (order as any).customer_phone))}
              </span>
              <span className="text-[10px] text-text-3 bg-surface-3 px-1.5 py-0.5 rounded font-medium ml-0.5">
                โทร
              </span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-text-3 bg-surface-2/60 px-2.5 py-1 rounded-lg border border-border/60">
              <Phone size={12} className="text-text-3" /> ไม่ระบุเบอร์
            </span>
          )}
        </div>
      </div>

      {/* Detail Footer (Clean, compact, balanced) */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-3.5 bg-surface border-t border-border flex items-center justify-between flex-shrink-0 gap-3 pb-4 sm:pb-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-text-3 font-medium">ยอดสุทธิ</span>
          <span className="text-lg sm:text-xl font-bold text-text">฿{calculateTotal(order, menuAvailabilityMap)}</span>
        </div>

        <div className="flex items-center gap-2">
          {order.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenCancelModal(order.id)}
              className="text-text-3 hover:text-red-600 hover:bg-red-50/60 hover:border-red-200 text-xs px-3 h-8.5 rounded-lg border-border"
              icon={<X size={13} />}
            >
              ยกเลิก
            </Button>
          )}

          {order.status === "served" && order.hasSlip && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewSlip(order.id)}
              className="text-text text-xs px-3 h-8.5 rounded-lg border-border"
            >
              ดูสลิป
            </Button>
          )}

          {(() => {
            const payInfo = parsePaymentInfo(order);
            // ถ้าเป็น PromptPay ที่ชำระแล้ว (หรือชำระออนไลน์แล้ว) และทำเสร็จแล้ว ไม่ต้องมีปุ่มรับชำระแล้ว
            const isSettledPromptPay = !payInfo.isCash && payInfo.isPaid;
            const isFinished = order.status === "paid" || order.status === "completed" || (order.status === "served" && isSettledPromptPay);

            if (order.status === "cancelled" || isFinished) {
              return null;
            }

            return (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onAdvanceStatus(order.id, !!onClose)}
                className="text-xs font-semibold px-3.5 h-8.5 rounded-lg shadow-2xs transition-all bg-brand-600 hover:bg-brand-700 text-white border-transparent"
                icon={
                  order.status === "pending" ? <Check size={14} /> :
                  order.status === "confirmed" ? <ChefHat size={14} /> :
                  order.status === "preparing" ? <CheckCheck size={14} /> :
                  <CreditCard size={14} />
                }
              >
                {order.status === "pending" ? "ยืนยันรับออเดอร์" :
                 order.status === "confirmed" ? "เริ่มทำอาหาร" :
                 order.status === "preparing" ? "ทำเสร็จแล้ว" :
                 "รับชำระแล้ว"}
              </Button>
            );
          })()}
        </div>
      </div>
    </div>
  );
});

// ─── Main QueueClient Page ──────────────────────────────────────────────────
export function QueueClient() {
  const router = useRouter();
  const { restaurant, refreshRestaurant, setTodayOrderCount, isConnected, subscribeRealtimeEvent } = useRestaurant();
  const connectedRestName = restaurant?.name || restaurant?.restaurant_name || "";
  const currentRestaurantId = restaurant?.id || (restaurant as any)?.res_id || (restaurant as any)?.restaurantId;

  const isStoreOpen = restaurant ? restaurant.isOpen !== false : true;
  const [showStoreConfirmModal, setShowStoreConfirmModal] = useState(false);
  const [showIncompleteAccountModal, setShowIncompleteAccountModal] = useState(false);
  const [isUpdatingStoreStatus, setIsUpdatingStoreStatus] = useState(false);

  // Validate complete payment account (bank name, account/promptpay number, account owner name)
  const hasPaymentAccount = useMemo(() => {
    if (!restaurant) return false;
    const bankName = (restaurant.bankName || (restaurant as any).bank_name || "").trim();
    const accNum = (
      restaurant.bankAccountNumber || 
      (restaurant as any).bank_account_number || 
      (restaurant as any).accountNumber || 
      restaurant.promptPayNumber || 
      (restaurant as any).promptpay_number || 
      restaurant.promptPayId || 
      ""
    ).trim();
    const accName = (
      restaurant.bankAccountName || 
      (restaurant as any).bank_account_name || 
      (restaurant as any).accountName || 
      restaurant.promptPayName || 
      (restaurant as any).promptpay_name || 
      ""
    ).trim();
    return Boolean(bankName && accNum && accName);
  }, [restaurant]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [viewingSlip, setViewingSlip] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "preparing" | "served" | "cancelled">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState<boolean>(false);
  const [mobileDetailOrderId, setMobileDetailOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuMap, setMenuMap] = useState<Record<string, string>>({});
  const [menuAvailabilityMap, setMenuAvailabilityMap] = useState<Record<string, boolean>>({});

  // Fetch all menu items for the restaurant to map filling/topping names to their images and availability
  useEffect(() => {
    RestaurantApi.getMenuItems()
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<string, string> = {};
          const availMap: Record<string, boolean> = {};
          res.data.forEach((m) => {
            const name = (m.name || "").trim().toLowerCase();
            const isAvail = m.available !== false && (m as any).is_available !== false;
            if (name) {
              availMap[name] = isAvail;
            }
            const img = m.image || (m as any).images?.[0]?.image_url || (m as any).images?.[0] || "";
            if (name && img) {
              map[name] = img;
            }
          });
          setMenuMap(map);
          setMenuAvailabilityMap(availMap);
        }
      })
      .catch(() => {});
  }, [currentRestaurantId]);

  // Cancellation Modal States (Full order cancellation only)
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>("วัตถุดิบหมด / เมนูหมด");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Notification Popover States
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const handleTestNotificationSound = useCallback(async () => {
    try {
      setIsPlayingTestSound(true);
      await speakOrderVoiceAnnouncement({
        customText: "ทดสอบระบบเสียงแจ้งเตือน มีออเดอร์ใหม่เข้ามาค่ะ",
      });
      toast.success("ทดสอบเสียงแจ้งเตือนเรียบร้อย");
    } catch {
      playOrderChime();
      toast.success("ทดสอบเสียงเตือนเรียบร้อย");
    } finally {
      setTimeout(() => setIsPlayingTestSound(false), 1200);
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);

  const handlePrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const parts = prev.split("-").map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      date.setDate(date.getDate() - 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const parts = prev.split("-").map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      date.setDate(date.getDate() + 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    });
  }, []);

  const handleResetToday = useCallback(() => {
    setSelectedDate(getTodayDateStr());
  }, []);

  const mapOrderDTO = useCallback((o: any): Order => {
    const items = (o.items || []).map((i: any) => {
      const itemStatus = String(i.status || i.menu_status || "").toLowerCase().trim();
      const isCancelled = Boolean(i.isCancelled) || itemStatus === "cancelled" || itemStatus === "customer_cancelled" || itemStatus === "deleted";
      const isOutOfStock = !isCancelled && (
        Boolean(i.isOutOfStock) ||
        Boolean(i.is_out_of_stock) ||
        itemStatus === "out_of_stock" ||
        i.menu_name === "out_of_stock" ||
        i.menuItem?.available === false ||
        i.menuItem?.is_availabel === false
      );

      return {
        id: i.id || String(Math.random()),
        menuItem: {
          id: i.menuItem?.id || "",
          name: i.menuItem?.name || "เมนูอาหาร",
          price: i.menuItem?.price || 0,
          category: i.menuItem?.category || "all",
          popular: false,
          available: true,
          image: i.menuItem?.image || "",
          options: i.menuItem?.options,
        },
        quantity: i.quantity || 1,
        size: i.size,
        spicy: i.spicy,
        note: i.note,
        selectedOptions: i.selectedOptions,
        subtotal: i.subtotal || 0,
        isOutOfStock,
        isCancelled,
        cancelReason: i.cancelReason || i.remark || (o as any).cancelReason || undefined,
        status: itemStatus || (isCancelled ? "cancelled" : "available"),
      };
    });

    const total = items.filter((i: any) => !i.isOutOfStock && !i.isCancelled && i.status !== "cancelled").reduce((s: number, i: any) => s + (i.subtotal || 0), 0);

    const rawTableNumber = o.tableNumber !== undefined && o.tableNumber !== null && String(o.tableNumber).trim() !== ""
      ? o.tableNumber
      : (o.table_number || o.table_name || o.tableId || "1");

    const paymentMethod = o.paymentMethod || o.payment_method || "promptpay";
    const rawMethod = String(paymentMethod).toLowerCase();
    const isCash = rawMethod.includes("cash") || rawMethod.includes("เงินสด") || rawMethod.includes("หน้าร้าน");
    const rawPaymentStatus = o.paymentStatus || o.payment_status || (o.status === "paid" || o.status === "completed" ? "paid" : "pending");
    const isPaid = rawPaymentStatus === "paid" || o.status === "paid" || o.status === "completed" || Boolean(o.slipUrl || o.hasSlip);

    let finalStatus = o.status || "pending";
    // ถ้าเป็นการชำระแบบ PromptPay/ออนไลน์ และตัดชำระแล้ว (isPaid) และอาหารทำเสร็จแล้ว (served/ready) ให้เป็น "paid" (รับชำระแล้ว) ทันที
    if (!isCash && isPaid && (finalStatus === "served" || finalStatus === "ready")) {
      finalStatus = "paid";
    }

    return {
      id: String(o.id),
      tableId: o.tableId || `table-${rawTableNumber}`,
      tableNumber: rawTableNumber,
      queueNumber: o.queueNumber || o.queue_number || o.queuePosition || undefined,
      queuePosition: o.queuePosition || o.queue_position || undefined,
      dailyQueueIndex: o.dailyQueueIndex || o.daily_queue_index || undefined,
      items,
      total: o.total !== undefined ? Number(o.total) : total,
      status: finalStatus,
      createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date(o.createdAt).toISOString(),
      paymentMethod,
      paymentStatus: isPaid ? "paid" : rawPaymentStatus,
      hasSlip: Boolean(o.slipUrl || o.hasSlip || (o as any).slip_url),
      slipUrl: o.slipUrl || (o as any).slip_url || (o as any).slipUrl || undefined,
      cancelReason: o.cancelReason || o.remark || undefined,
      customerId: o.customerId || o.customer_id || undefined,
      customerNickname: o.customerNickname || o.customer_nickname || o.customer?.nickname || o.customerName || undefined,
      customerPhone: o.customerPhone || o.customer_phone || o.customer?.phone || undefined,
      scheduledTime: o.scheduledTime || o.scheduled_time || undefined,
      pickupType: o.pickupType || o.pickup_type || undefined,
    } as Order;
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("qrshop_current_restaurant");
      } catch {}
    }
  }, []);

  const isInitialLoadRef = useRef(true);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const res = await RestaurantApi.getOrders(undefined, currentRestaurantId, selectedDate);
      if (res.success && res.data) {
        const mappedOrders: Order[] = res.data.map(mapOrderDTO);
        
        // Detect newly arrived orders in fallback polling (only if WebSocket/SSE is not connected and looking at today)
        if (!isInitialLoadRef.current && !isConnected && selectedDate === getTodayDateStr()) {
          mappedOrders.forEach((o, idx) => {
            if (!knownOrderIdsRef.current.has(o.id) && o.status === "pending") {
              const itemCount = o.items.reduce((s, it) => s + (it.quantity || 1), 0);
              const qPos = (o as any).queuePosition || (idx + 1);
              speakOrderVoiceAnnouncement({
                tableNumber: o.tableNumber,
                queueNumber: qPos,
                itemCount: itemCount,
              });
            }
          });
        }
        
        mappedOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        isInitialLoadRef.current = false;
        
        // Reconcile state: only update if data actually changed -> eliminates re-render flicker
        setOrders((prev) => {
          if (areOrdersEqual(prev, mappedOrders)) {
            return prev;
          }
          return mappedOrders;
        });

        if (!silent) {
          setLastRefresh(new Date());
        }
      }
    } catch (err) {
      console.warn("Could not fetch orders from API, using local queue", err);
    } finally {
      if (!silent) setLoading(false);
      setIsInitialLoading(false);
    }
  }, [mapOrderDTO, currentRestaurantId, isConnected, selectedDate]);

  // Subscribe to Global Real-time Events (Managed by RestaurantProvider)
  useEffect(() => {
    if (!subscribeRealtimeEvent) return;

    const unsubscribe = subscribeRealtimeEvent((event) => {
      const targetId = currentRestaurantId || restaurant?.id || (restaurant as any)?.res_id;
      const cleanEventRestId = event.restaurantId ? String(event.restaurantId).replace(/^(r|res|restaurant)-/i, "").trim() : "";
      const cleanTargetRestId = targetId ? String(targetId).replace(/^(r|res|restaurant)-/i, "").trim() : "";
      if (
        cleanTargetRestId &&
        cleanEventRestId &&
        cleanEventRestId !== "global" &&
        cleanTargetRestId !== "global" &&
        cleanEventRestId !== cleanTargetRestId
      ) {
        return;
      }

      if (event.type === "ORDER_CREATED") {
        const mapped = mapOrderDTO(event.data);
        knownOrderIdsRef.current.add(mapped.id);
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === mapped.id);
          if (exists) {
            return prev.map((o) => (o.id === mapped.id ? mapped : o));
          }
          return [mapped, ...prev];
        });
        setLastRefresh(new Date());
      } else if (
        event.type === "ORDER_PAID" ||
        event.type === "CUSTOMER_PAYMENT_SUBMITTED" ||
        (event.data?.isCustomerInitiated && event.type === "ORDER_STATUS_CHANGED")
      ) {
        const orderData = event.data?.order || event.data;
        const mapped = mapOrderDTO(orderData);
        const queuePos = event.data?.queueNumber || mapped.queueNumber || (event.data as any)?.queuePosition || queueIndexMap.get(mapped.id);
        const amount = Number(event.data?.amount || calculateTotal(mapped));

        speakPaymentVoiceAnnouncement({
          tableNumber: mapped.tableNumber,
          queueNumber: queuePos,
          orderId: mapped.id,
          amount: amount,
        });

        const queueLabel = queuePos ? `คิวที่ ${queuePos}` : "คิวลูกค้า";
        toast.success(`ชำระเงินสำเร็จ: ${queueLabel} (฿${amount})`, {
          duration: 8000,
          description: `ได้รับยอดชำระเงินเรียบร้อยแล้ว — ออเดอร์ยืนยันพร้อมเข้าครัว`,
        });

        setOrders((prev) => {
          const exists = prev.some((o) => String(o.id) === String(mapped.id));
          if (exists) {
            return prev.map((o) => (String(o.id) === String(mapped.id) ? { ...o, ...mapped, status: "confirmed", paymentStatus: "paid" } : o));
          }
          return [{ ...mapped, status: "confirmed", paymentStatus: "paid" }, ...prev];
        });
        setLastRefresh(new Date());
      } else if (event.type === "ORDER_STATUS_CHANGED" || event.type === "ORDER_UPDATED") {
        const mapped = mapOrderDTO(event.data);
        setOrders((prev) => {
          const exists = prev.some((o) => String(o.id) === String(mapped.id));
          if (exists) {
            return prev.map((o) => (String(o.id) === String(mapped.id) ? { ...o, ...mapped } : o));
          }
          return [mapped, ...prev];
        });
        setLastRefresh(new Date());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeRealtimeEvent, currentRestaurantId, restaurant, mapOrderDTO]);

  // Polling fallback every 8 seconds + safety timeout for initial skeleton
  useEffect(() => {
    fetchOrders(true);
    const timer = setInterval(() => fetchOrders(true), 8000);
    const safetyTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(safetyTimer);
    };
  }, [fetchOrders]);

  // Filter orders by selected date (YYYY-MM-DD local date)
  const dateOrders = useMemo(() => {
    if (!selectedDate) return orders;
    return orders.filter((o) => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return orderDateStr === selectedDate;
    });
  }, [orders, selectedDate]);

  // Active ongoing orders for selected date (excluding cancelled and paid)
  const activeOrders = useMemo(() => dateOrders.filter((o) => o.status !== "paid" && o.status !== "cancelled"), [dateOrders]);
  const cancelledOrders = useMemo(() => dateOrders.filter((o) => o.status === "cancelled"), [dateOrders]);

  // Sync active ongoing order count with global RestaurantProvider (for sidebar and bottom nav badges)
  useEffect(() => {
    if (selectedDate === getTodayDateStr()) {
      setTodayOrderCount(activeOrders.length);
    }
  }, [activeOrders.length, selectedDate, setTodayOrderCount]);

  const filteredOrders = useMemo(() => {
    if (filterStatus === "all") return activeOrders;
    if (filterStatus === "cancelled") return cancelledOrders;
    return dateOrders.filter((o) => o.status === filterStatus);
  }, [filterStatus, activeOrders, cancelledOrders, dateOrders]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const mobileDetailOrder = orders.find((o) => o.id === mobileDetailOrderId);

  // Auto select first order for desktop if none selected or if previously selected order left the active list
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const isSelectedInFiltered = filteredOrders.some((o) => o.id === selectedOrderId);
      if (!isSelectedInFiltered) {
        setSelectedOrderId(filteredOrders[0].id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [filteredOrders, selectedOrderId]);

  const advanceStatus = useCallback(async (id: string, closeMobileDetail = false) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const payInfo = parsePaymentInfo(order);
    const isSettledPromptPay = !payInfo.isCash && payInfo.isPaid;

    const cur = order.status;
    const nextStatus: OrderStatus =
      cur === "pending" ? "confirmed" :
      cur === "confirmed" ? "preparing" :
      cur === "preparing" || (cur as any) === "cooking" 
        ? (isSettledPromptPay ? "paid" : "served") 
        : "paid";

    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)));

    try {
      const res = await RestaurantApi.advanceStatus(id, nextStatus);
      if (res.success && res.data) {
        const mapped = mapOrderDTO(res.data);
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...mapped } : o)));
      }
    } catch (err) {
      console.warn("Advance status error", err);
    }

    const qLabel = order.queueNumber || order.tableNumber;
    if (cur === "pending") {
      toast.success(`ยืนยันรับออเดอร์คิว ${qLabel} แล้ว (รอลูกค้าชำระเงิน)`);
    } else if (cur === "confirmed") {
      toast.success(`เริ่มปรุงอาหารคิว ${qLabel} แล้ว`);
    } else if (cur === "preparing" || (cur as any) === "cooking") {
      if (isSettledPromptPay) {
        toast.success(`อาหารคิว ${qLabel} ปรุงเสร็จและรับชำระเงินเรียบร้อยแล้ว!`);
        setSelectedOrderId(null);
        if (closeMobileDetail) setMobileDetailOrderId(null);
      } else {
        toast.success(`อาหารคิว ${qLabel} ปรุงเสร็จแล้ว (แจ้งเตือนลูกค้าพร้อมรับและรอรับชำระ)`);
      }
    } else if (cur === "served" || (cur as any) === "ready") {
      toast.success(`รับชำระเงินคิว ${qLabel} เรียบร้อย!`);
      setSelectedOrderId(null);
      if (closeMobileDetail) setMobileDetailOrderId(null);
    }
  }, [orders, mapOrderDTO]);

  const handleConfirmStoreStatus = useCallback(async () => {
    const nextStatus = !isStoreOpen;

    // Block opening orders if payment account is incomplete
    if (nextStatus && !hasPaymentAccount) {
      setShowStoreConfirmModal(false);
      setShowIncompleteAccountModal(true);
      toast.error("ไม่สามารถเปิดรับออเดอร์ได้ กรุณากรอกข้อมูลบัญชีรับเงินให้สมบูรณ์ก่อน");
      return;
    }

    setIsUpdatingStoreStatus(true);
    try {
      const res = await RestaurantApi.updateInfo({
        isOpen: nextStatus,
      });
      if (res.success) {
        toast.success(
          nextStatus ? "เปิดรับออเดอร์เรียบร้อยแล้ว" : "ปิดรับออเดอร์ชั่วคราวเรียบร้อยแล้ว",
          {
            description: nextStatus 
              ? "ลูกค้าสามารถสั่งอาหารผ่านระบบได้ตามปกติ" 
              : "ระบบได้ระงับการสั่งอาหารใหม่จากลูกค้าชั่วคราว",
          }
        );
        if (refreshRestaurant) {
          await refreshRestaurant();
        }
        setShowStoreConfirmModal(false);
      } else {
        toast.error(res.message || "ไม่สามารถเปลี่ยนสถานะร้านค้าได้ กรุณาลองใหม่อีกครั้ง");
        if (res.message?.includes("บัญชีรับเงิน")) {
          setShowStoreConfirmModal(false);
          setShowIncompleteAccountModal(true);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะร้านค้า");
      if (err?.message?.includes("บัญชีรับเงิน")) {
        setShowStoreConfirmModal(false);
        setShowIncompleteAccountModal(true);
      }
    } finally {
      setIsUpdatingStoreStatus(false);
    }
  }, [isStoreOpen, hasPaymentAccount, refreshRestaurant]);

  const handleSelectOrder = useCallback((id: string, isMobile = false) => {
    if (isMobile) {
      setMobileDetailOrderId(id);
    } else {
      setSelectedOrderId(id);
    }
  }, []);

  const handleOpenCancelModal = useCallback((orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (target && target.status !== "pending") {
      toast.error("สามารถยกเลิกได้เฉพาะออเดอร์ที่อยู่ในสถานะ 'รอครัวรับ' เท่านั้น");
      return;
    }
    setCancelModalOrderId(orderId);
    setSelectedCancelReason("วัตถุดิบหมด / เมนูหมด");
    setCustomCancelReason("");
  }, [orders]);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelModalOrderId) return;
    setIsSubmittingCancel(true);

    const finalReason = selectedCancelReason === "อื่นๆ (ระบุข้อความเอง)" || selectedCancelReason === "อื่นๆ"
      ? (customCancelReason.trim() || "ยกเลิกโดยร้านค้า")
      : selectedCancelReason;

    try {
      const res = await RestaurantApi.cancelOrder(cancelModalOrderId, {
        reason: finalReason,
        cancelEntireOrder: true,
      });

      if (res.success && res.data) {
        const mapped = mapOrderDTO(res.data);
        setOrders((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)));
      } else {
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== cancelModalOrderId) return o;
            return {
              ...o,
              status: "cancelled",
              cancelReason: finalReason,
              total: 0,
              items: o.items.map((i) => ({ ...i, isCancelled: true, cancelReason: finalReason, status: "cancelled" })),
            };
          })
        );
      }

      toast.success("แจ้งเตือนยกเลิกสำเร็จ");
      setCancelModalOrderId(null);
      setMobileDetailOrderId(null);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการยกเลิกออเดอร์", {
        description: err?.message || "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  }, [cancelModalOrderId, selectedCancelReason, customCancelReason, mapOrderDTO]);

  const handleViewSlip = useCallback((id: string) => {
    setViewingSlip(id);
    // Fetch fresh order details from backend to ensure real slip image is loaded
    RestaurantApi.getOrder(id)
      .then((res) => {
        if (res.success && res.data) {
          const freshSlip = res.data.slipUrl || (res.data as any).slip_url;
          if (freshSlip) {
            setOrders((prev) =>
              prev.map((o) =>
                String(o.id) === String(id) ? { ...o, hasSlip: true, slipUrl: freshSlip } : o
              )
            );
          }
        }
      })
      .catch(() => null);
  }, []);

  // Pre-calculate sequential queue numbers for active orders of selected date only (excluding cancelled and paid)
  // When an order is cancelled, subsequent orders immediately advance forward!
  const queueIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const activeSorted = [...dateOrders]
      .filter((o) => o.status !== "cancelled" && o.status !== "paid")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    activeSorted.forEach((o, idx) => {
      map.set(o.id, idx + 1);
    });
    return map;
  }, [dateOrders]);

  const targetCancelOrder = useMemo(() => {
    return cancelModalOrderId ? orders.find((o) => o.id === cancelModalOrderId) : null;
  }, [cancelModalOrderId, orders]);

  if (isInitialLoading) {
    return <RestaurantQueueSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-surface-2 overflow-hidden">
      {/* Page Header */}
      <header className="bg-surface border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 shadow-sm z-10 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg lg:text-xl font-bold text-text">คิวออเดอร์</h1>
            {connectedRestName && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                {connectedRestName}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
              />
              {isConnected ? "เรียลไทม์" : "ออฟไลน์ (โพลลิ่ง)"}
            </span>
          </div>
          <p className="text-xs text-text-3 flex items-center gap-1.5 flex-wrap">
            <span>
              {activeOrders.length} ออเดอร์ที่กำลังดำเนินการ {selectedDate !== getTodayDateStr() && `(วันที่ ${selectedDate})`}
            </span>
            <span className="text-border">•</span>
            <span suppressHydrationWarning>
              อัปเดตล่าสุด: {lastRefresh.toLocaleTimeString("th-TH")}
            </span>
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Store Open / Close Switch Button */}
          <button
            type="button"
            onClick={() => {
              if (!isStoreOpen && !hasPaymentAccount) {
                setShowIncompleteAccountModal(true);
                return;
              }
              setShowStoreConfirmModal(true);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs cursor-pointer group select-none shrink-0",
              isStoreOpen
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                : "bg-rose-50/90 border-rose-300 text-rose-800 hover:bg-rose-100 hover:border-rose-400"
            )}
            title={isStoreOpen ? "คลิกเพื่อปิดรับออเดอร์ชั่วคราว" : "คลิกเพื่อเปิดรับออเดอร์"}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isStoreOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                )}
              />
              <span className="hidden md:inline font-bold">
                {isStoreOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
              </span>
              <span className="md:hidden font-bold">
                {isStoreOpen ? "เปิดรับ" : "ปิดรับ"}
              </span>
            </span>

            {/* Visual Switch Track & Thumb */}
            <div
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shadow-inner",
                isStoreOpen ? "bg-emerald-600 justify-end" : "bg-zinc-300 justify-start"
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center text-[9px] font-black"
              >
                {isStoreOpen ? (
                  <span className="text-emerald-600"></span>
                ) : (
                  <span className="text-zinc-400"></span>
                )}
              </motion.div>
            </div>
          </button>

          {/* Out Of Stock Management Button */}
          <button
            type="button"
            onClick={() => setShowOutOfStockModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50/90 hover:bg-amber-100 active:scale-95 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer select-none shrink-0"
            title="คลิกเพื่อจัดการไส้และวัตถุดิบที่หมด (แจ้งเตือนลูกค้าในคิว)"
          >
            <Ban size={13} className="text-amber-600 shrink-0" />
            <span className="hidden sm:inline">แจ้งไส้หมด</span>
            <span className="sm:hidden">ไส้หมด</span>
          </button>

          {/* Interactive Date Selector with Quick Step & Native Picker */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border shadow-2xs">
            <button
              onClick={handlePrevDay}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text hover:bg-surface transition-colors cursor-pointer"
              title="วันก่อนหน้า"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-brand-400 transition-all cursor-pointer shadow-xs group">
              <Calendar size={13} className="text-brand-600 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-text whitespace-nowrap">
                {formatThaiDisplayDate(selectedDate)}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="เลือกวันที่ต้องการดูออเดอร์"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-3 hover:text-text hover:bg-surface transition-colors cursor-pointer"
              title="วันถัดไป"
            >
              <ChevronRight size={15} />
            </button>

            {selectedDate !== getTodayDateStr() && (
              <button
                onClick={handleResetToday}
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white transition-all whitespace-nowrap shadow-xs ml-0.5 cursor-pointer"
              >
                วันนี้
              </button>
            )}
          </div>

          <button
            onClick={() => fetchOrders(false)}
            disabled={loading}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-2 hover:bg-surface-3 transition-all disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            {loading ? <Loader2 size={15} className="animate-spin text-brand-600" /> : <RefreshCw size={15} />}
          </button>
          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className={cn(
                "relative w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer",
                showNotifications
                  ? "bg-brand-50 border-brand-400 text-brand-600 shadow-xs ring-2 ring-brand-100"
                  : "border-border text-text-2 hover:bg-surface-3 hover:text-text"
              )}
              title="การแจ้งเตือนและออเดอร์ล่าสุด"
            >
              <Bell size={15} />
              {activeOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {activeOrders.length}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-surface rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2/70">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200">
                        <Bell size={14} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-text">การแจ้งเตือนออเดอร์</h3>
                        <p className="text-[10px] text-text-3">คิวที่รอดำเนินการ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {activeOrders.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                          {activeOrders.length} คิว
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="w-6 h-6 rounded-lg text-text-3 hover:text-text hover:bg-surface-3 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Sound & Voice Alert Quick Test */}
                  <div className="px-3.5 py-2.5 bg-brand-50/40 border-b border-border/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Volume2 size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-text leading-tight truncate">ระบบเสียงแจ้งเตือนออเดอร์</p>
                        <p className="text-[10px] text-emerald-600 leading-tight">เปิดใช้งานอัตโนมัติ</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestNotificationSound}
                      disabled={isPlayingTestSound}
                      className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 hover:border-brand-300 text-brand-700 text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
                    >
                      {isPlayingTestSound ? (
                        <>
                          <Loader2 size={11} className="animate-spin text-brand-600" />
                          <span>กำลังส่งเสียง...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={11} />
                          <span>ทดสอบเสียง</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Order List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/50 max-h-[280px]">
                    {activeOrders.length === 0 ? (
                      <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-text-3">
                        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-2">
                          <Check size={20} className="text-emerald-500" />
                        </div>
                        <p className="text-xs font-semibold text-text">ไม่มีออเดอร์ที่รอดำเนินการ</p>
                        <p className="text-[11px] text-text-3 mt-0.5">ทุกคิวอาหารได้รับการจัดการครบถ้วนแล้ว</p>
                      </div>
                    ) : (
                      activeOrders.map((order) => {
                        const queueNum = queueIndexMap.get(order.id) || (order as any).queuePosition;
                        const isCurrent = order.id === selectedOrderId;
                        const itemCount = order.items.reduce((s, it) => s + (it.quantity || 1), 0);

                        return (
                          <div
                            key={order.id}
                            onClick={() => {
                              handleSelectOrder(order.id, typeof window !== "undefined" && window.innerWidth < 768);
                              setShowNotifications(false);
                            }}
                            className={cn(
                              "p-3 flex items-center justify-between gap-3 hover:bg-surface-2/80 transition-colors cursor-pointer text-left",
                              isCurrent && "bg-brand-50/50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 font-extrabold text-xs flex items-center justify-center shrink-0 border border-pink-200">
                                {getCleanTableNumber(order.tableNumber)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-text truncate">{getFriendlyTableLabel(order.tableNumber)}</span>
                                  {queueNum && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      คิว {queueNum}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-text-3 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} />
                                  <span>{getRelativeTime(order.createdAt)}</span>
                                  <span>•</span>
                                  <span className="text-text-2 font-medium">{itemCount} รายการ</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <Badge variant={orderStatusBadge[order.status]?.variant || "warning"} className="text-[9px] px-1.5 py-0.5">
                                {orderStatusBadge[order.status]?.label || order.status}
                              </Badge>
                              <p className="text-[11px] font-bold text-brand-700 mt-1">
                                ฿{calculateTotal(order)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="p-2.5 bg-surface-2 border-t border-border flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("all");
                        setShowNotifications(false);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-surface hover:bg-surface-3 border border-border text-text text-xs font-semibold transition-colors text-center cursor-pointer shadow-2xs"
                    >
                      ดูออเดอร์ทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchOrders(false)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>รีเฟรช</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ═══ DESKTOP: Master-Detail Layout ═══════════════════════════════ */}
      <div className="hidden md:flex flex-1 gap-4 p-4 lg:p-6 overflow-hidden min-h-0">
        {/* LEFT - Detail View (Takes remaining space) */}
        <div className="flex-1 flex flex-col bg-surface border border-border rounded-[20px] shadow-sm overflow-hidden min-h-0 relative">
          {!selectedOrder ? (
            <div className="h-full flex flex-col items-center justify-center text-text-3">
              <ChefHat size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-text-2">ยังไม่ได้เลือกออเดอร์</p>
              <p className="text-sm">กรุณาเลือกออเดอร์จากรายการด้านขวา</p>
            </div>
          ) : (
            <OrderDetailContent
              key={selectedOrder.id}
              order={selectedOrder}
              queueNumber={queueIndexMap.get(selectedOrder.id)}
              menuMap={menuMap}
              menuAvailabilityMap={menuAvailabilityMap}
              onAdvanceStatus={advanceStatus}
              onOpenOutOfStockModal={() => setShowOutOfStockModal(true)}
              onOpenCancelModal={handleOpenCancelModal}
              onViewSlip={handleViewSlip}
            />
          )}
        </div>

        {/* RIGHT - Order List (Fixed responsive comfortable width) */}
        <div className="w-[300px] lg:w-[340px] xl:w-[380px] flex flex-col bg-surface border border-border rounded-[20px] shadow-sm overflow-hidden min-h-0 flex-shrink-0">
          <div className="p-3 border-b border-border bg-surface-2/50 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-text text-sm">รายการออเดอร์</h3>
              <span className="text-xs text-text-3 font-medium">{filteredOrders.length} รายการ</span>
            </div>
            <div className="grid grid-cols-5 bg-surface-3 p-1 rounded-[10px] gap-0.5">
              {(["all", "pending", "preparing", "served", "cancelled"] as const).map((status) => {
                const count =
                  status === "all" ? activeOrders.length :
                  status === "cancelled" ? cancelledOrders.length :
                  activeOrders.filter((o) => o.status === status).length;

                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "py-1.5 px-0.5 text-[11px] font-medium rounded-[8px] transition-all text-center whitespace-nowrap flex items-center justify-center gap-1",
                      filterStatus === status
                        ? status === "cancelled"
                          ? "bg-red-500 text-white shadow-sm font-bold"
                          : "bg-surface text-text shadow-sm font-bold"
                        : status === "cancelled"
                        ? "text-red-600 hover:text-red-700"
                        : "text-text-3 hover:text-text-2"
                    )}
                  >
                    <span>
                      {status === "all" ? "ทั้งหมด" :
                       status === "pending" ? "รอทำ" :
                       status === "preparing" ? "กำลังทำ" :
                       status === "served" ? "รอชำระ" :
                       "ยกเลิก"}
                    </span>
                    {count > 0 && (
                      <span className={cn(
                        "text-[9px] px-1 py-0.2 rounded-full font-bold",
                        filterStatus === status
                          ? status === "cancelled" ? "bg-white text-red-600" : "bg-surface-3 text-text"
                          : status === "cancelled" ? "bg-red-100 text-red-700" : "bg-surface-2 text-text-3"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-text-3">
                <ChefHat size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium text-text-2">ไม่มีออเดอร์</p>
                <p className="text-xs">ไม่มีรายการในสถานะที่เลือก</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  queueNumber={queueIndexMap.get(order.id)}
                  isSelected={order.id === selectedOrderId}
                  onSelect={(id) => handleSelectOrder(id, false)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══ MOBILE: Master List View ═══════════════════════════════════════ */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden min-h-0">
        {/* Mobile Filter Tabs */}
        <div className="p-3 bg-surface border-b border-border flex-shrink-0">
          <div className="grid grid-cols-5 bg-surface-3 p-1 rounded-[12px] gap-0.5">
            {(["all", "pending", "preparing", "served", "cancelled"] as const).map((status) => {
              const count =
                status === "all" ? activeOrders.length :
                status === "cancelled" ? cancelledOrders.length :
                activeOrders.filter((o) => o.status === status).length;

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "py-2 px-0.5 text-[11px] font-semibold rounded-[9px] transition-all text-center whitespace-nowrap flex items-center justify-center gap-1",
                    filterStatus === status
                      ? status === "cancelled"
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-surface text-text shadow-sm"
                      : status === "cancelled"
                      ? "text-red-600"
                      : "text-text-3"
                  )}
                >
                  <span>
                    {status === "all" ? "ทั้งหมด" :
                     status === "pending" ? "รอทำ" :
                     status === "preparing" ? "กำลังทำ" :
                     status === "served" ? "รอชำระ" :
                     "ยกเลิก"}
                  </span>
                  {count > 0 && (
                    <span className={cn(
                      "text-[9px] px-1 py-0.2 rounded-full font-bold",
                      filterStatus === status
                        ? status === "cancelled" ? "bg-white text-red-600" : "bg-surface-3 text-text"
                        : status === "cancelled" ? "bg-red-100 text-red-700" : "bg-surface-2 text-text-3"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-xs text-text-3">{filteredOrders.length} รายการออเดอร์</p>
          </div>
        </div>

        {/* Mobile Order List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-28 custom-scrollbar">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-text-3">
              <ChefHat size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-text-2">ไม่มีรายการออเดอร์</p>
              <p className="text-xs mt-1">ยังไม่มีรายการในหมวดหมู่ที่เลือก</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                queueNumber={queueIndexMap.get(order.id)}
                isSelected={order.id === mobileDetailOrderId}
                isMobile
                onSelect={(id) => handleSelectOrder(id, true)}
              />
            ))
          )}
        </div>
      </div>

      {/* ═══ MOBILE: Order Detail Bottom Sheet Modal ═══════════════════════ */}
      <AnimatePresence>
        {mobileDetailOrder && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileDetailOrderId(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full h-[85vh] max-h-[94vh] bg-surface rounded-t-[24px] overflow-hidden shadow-2xl flex flex-col z-10"
            >
              <div className="flex-shrink-0 pt-3 pb-2 px-4 flex flex-col items-center border-b border-border bg-surface">
                <div className="w-10 h-1 bg-border rounded-full mb-3" />
                <div className="w-full flex items-center justify-between">
                  <p className="text-xs text-text-3 font-medium">รายละเอียดออเดอร์</p>
                  <button
                    onClick={() => setMobileDetailOrderId(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <OrderDetailContent
                  key={mobileDetailOrder.id}
                  order={mobileDetailOrder}
                  queueNumber={queueIndexMap.get(mobileDetailOrder.id)}
                  menuMap={menuMap}
                  menuAvailabilityMap={menuAvailabilityMap}
                  onClose={() => setMobileDetailOrderId(null)}
                  onAdvanceStatus={advanceStatus}
                  onOpenOutOfStockModal={() => setShowOutOfStockModal(true)}
                  onOpenCancelModal={handleOpenCancelModal}
                  onViewSlip={handleViewSlip}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Cancel Order Modal (Whole Order) ─────────────────────────────── */}
      <AnimatePresence>
        {cancelModalOrderId && targetCancelOrder && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmittingCancel && setCancelModalOrderId(null)}
            />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full sm:max-w-md bg-surface sm:rounded-[24px] rounded-t-[24px] overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            >
              <div className="pt-3 px-4 flex flex-col items-center sm:hidden bg-red-50/60">
                <div className="w-10 h-1 bg-red-200 rounded-full mb-1" />
              </div>

              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between flex-shrink-0 bg-red-50/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 border border-red-200">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-text text-base sm:text-lg truncate">
                      ยืนยันยกเลิกออเดอร์
                    </h3>
                    <p className="text-xs text-text-3 flex items-center gap-1.5 flex-wrap">
                      <span>คิว {targetCancelOrder.queueNumber || targetCancelOrder.tableNumber}</span>
                      {queueIndexMap.get(targetCancelOrder.id) && (
                        <>
                          <span className="text-border">•</span>
                          <span className="font-bold text-brand-600">คิวที่ {queueIndexMap.get(targetCancelOrder.id)}</span>
                        </>
                      )}
                      <span className="text-border">•</span>
                      <span>รหัส {targetCancelOrder.id.replace("ord-", "#")}</span>
                    </p>
                  </div>
                </div>
                <button
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModalOrderId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors disabled:opacity-50 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {/* Order Summary Box */}
                <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-3">รายการอาหารในออเดอร์นี้:</span>
                    <span className="font-bold text-brand-600">{targetCancelOrder.items.length} รายการ (฿{calculateTotal(targetCancelOrder)})</span>
                  </div>
                  <div className="text-xs text-text-2 space-y-1">
                    {targetCancelOrder.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-[11px]">
                        <span className="truncate">{it.menuItem.name} x{it.quantity}</span>
                        <span className="font-bold shrink-0 ml-2">฿{it.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="text-xs font-bold text-text mb-2.5 block">
                    เลือกเหตุผลการยกเลิก (มีค่าเริ่มต้นให้)
                  </label>
                  <div className="space-y-2">
                    {PRESET_CANCEL_REASONS.map((reason) => {
                      const isSelected = selectedCancelReason === reason.label;
                      return (
                        <label
                          key={reason.id}
                          className={cn(
                            "group flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none",
                            isSelected
                              ? "bg-brand-50/70 border-brand-500 ring-1 ring-brand-500/30 shadow-xs dark:bg-brand-950/30 dark:border-brand-600"
                              : "bg-surface border-border text-text-2 hover:bg-surface-2/60 hover:border-border/90"
                          )}
                        >
                          {/* Custom Styled Theme-Compliant Radio Button Indicator */}
                          <div
                            className={cn(
                              "w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                              isSelected
                                ? "border-brand-600 bg-brand-600 shadow-2xs dark:border-brand-500 dark:bg-brand-500"
                                : "border-border bg-surface-2 group-hover:border-text-3"
                            )}
                          >
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full bg-white transition-transform duration-150",
                                isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                              )}
                            />
                          </div>

                          <input
                            type="radio"
                            name="cancel_reason"
                            value={reason.label}
                            checked={isSelected}
                            onChange={() => setSelectedCancelReason(reason.label)}
                            className="sr-only"
                          />

                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs sm:text-sm font-bold tracking-tight transition-colors", isSelected ? "text-brand-950 dark:text-brand-100" : "text-text")}>
                              {reason.label}
                            </p>
                            <p className="text-[11px] text-text-3 mt-0.5 leading-normal">
                              {reason.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {(selectedCancelReason === "อื่นๆ (ระบุข้อความเอง)" || selectedCancelReason === "อื่นๆ") && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        placeholder="กรุณาระบุเหตุผลการยกเลิกให้ลูกค้าทราบ..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface text-text placeholder:text-text-3"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    การทำงานของระบบ:
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    ระบบจะบันทึกสถานะลงฐานข้อมูล <b>MySQL</b> และ <b>Google Sheets</b> พร้อมส่งสัญญาณแจ้งเตือนไปยังหน้าจอของลูกค้าแบบเรียลไทม์ทันที
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-border flex gap-3 flex-shrink-0 bg-surface">
                <Button
                  fullWidth
                  variant="ghost"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModalOrderId(null)}
                >
                  ย้อนกลับ
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  disabled={isSubmittingCancel}
                  onClick={handleConfirmCancel}
                >
                  {isSubmittingCancel ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>กำลังบันทึกและแจ้งเตือน...</span>
                    </div>
                  ) : (
                    "ยืนยันยกเลิกออเดอร์"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Out Of Stock Management Modal ─────────────────────────────── */}
      <OutOfStockModal
        isOpen={showOutOfStockModal}
        onClose={() => setShowOutOfStockModal(false)}
        restaurantId={currentRestaurantId}
        onSaved={() => {
          fetchOrders(true);
          RestaurantApi.getMenuItems()
            .then((res) => {
              if (res.success && res.data) {
                const map: Record<string, string> = {};
                const availMap: Record<string, boolean> = {};
                res.data.forEach((m) => {
                  const name = (m.name || "").trim().toLowerCase();
                  const isAvail = m.available !== false && (m as any).is_available !== false;
                  if (name) availMap[name] = isAvail;
                  const img = m.image || (m as any).images?.[0]?.image_url || (m as any).images?.[0] || "";
                  if (name && img) map[name] = img;
                });
                setMenuMap(map);
                setMenuAvailabilityMap(availMap);
              }
            })
            .catch(() => {});
        }}
      />

      {/* ─── Incomplete Payment Account Alert Modal ───────────────────────── */}
      <AnimatePresence>
        {showIncompleteAccountModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowIncompleteAccountModal(false)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] shadow-2xl border border-border overflow-hidden z-10 p-6 space-y-5"
            >
              {/* Header with Alert Landmark Icon */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <Landmark size={26} className="text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-text tracking-tight flex items-center gap-1.5">
                    ไม่สามารถเปิดรับออเดอร์ได้
                  </h3>
                  <p className="text-xs sm:text-sm text-text-3 leading-relaxed">
                    ร้านจะไม่สามารถเปิดรับออเดอร์ได้ จนกว่าจะกรอกข้อมูลบัญชีรับเงิน (ธนาคาร หรือ พร้อมเพย์) ให้สมบูรณ์ เพื่อให้ลูกค้าสามารถชำระเงินค่าออเดอร์ได้อย่างถูกต้อง
                  </p>
                </div>
              </div>

              {/* Missing checklist details */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2.5 text-xs">
                <p className="font-bold text-text text-xs mb-1">ข้อมูลที่จำเป็นในการเปิดรับออเดอร์:</p>
                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-text-2">1. ธนาคาร / พร้อมเพย์</span>
                  {(restaurant?.bankName || (restaurant as any)?.bank_name) ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1"><Check size={14} /> กรอกแล้ว</span>
                  ) : (
                    <span className="text-rose-500 font-bold flex items-center gap-1"><X size={14} /> ยังไม่กรอก</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-text-2">2. เลขที่บัญชี / หมายเลขพร้อมเพย์</span>
                  {(restaurant?.bankAccountNumber || (restaurant as any)?.bank_account_number || restaurant?.promptPayNumber || (restaurant as any)?.promptpay_number) ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1"><Check size={14} /> กรอกแล้ว</span>
                  ) : (
                    <span className="text-rose-500 font-bold flex items-center gap-1"><X size={14} /> ยังไม่กรอก</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-2">3. ชื่อเจ้าของบัญชีรับเงิน</span>
                  {(restaurant?.bankAccountName || (restaurant as any)?.bank_account_name || restaurant?.promptPayName || (restaurant as any)?.promptpay_name) ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1"><Check size={14} /> กรอกแล้ว</span>
                  ) : (
                    <span className="text-rose-500 font-bold flex items-center gap-1"><X size={14} /> ยังไม่กรอก</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowIncompleteAccountModal(false)}
                  className="rounded-xl font-bold text-xs sm:text-sm py-2.5"
                >
                  ปิด
                </Button>
                <Button
                  type="button"
                  fullWidth
                  onClick={() => {
                    setShowIncompleteAccountModal(false);
                    router.push("/restaurant/settings?tab=info-bank");
                  }}
                  className="rounded-xl font-black text-xs sm:text-sm py-2.5 bg-brand-500 hover:bg-brand-600 text-white shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>ไปตั้งค่าบัญชีรับเงิน</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Store Status Confirmation Modal ────────────────────────────── */}
      <AnimatePresence>
        {showStoreConfirmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isUpdatingStoreStatus && setShowStoreConfirmModal(false)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] shadow-2xl border border-border overflow-hidden z-10 p-6 space-y-5"
            >
              {/* Header with Icon */}
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    isStoreOpen
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  )}
                >
                  {isStoreOpen ? (
                    <PauseCircle size={26} className="text-rose-600" />
                  ) : (
                    <Store size={26} className="text-emerald-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-text tracking-tight">
                    {isStoreOpen ? "ยืนยันปิดรับออเดอร์ชั่วคราว?" : "ยืนยันเปิดรับออเดอร์ร้านค้า?"}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-3 leading-relaxed">
                    {isStoreOpen
                      ? "เมื่อปิดรับออเดอร์ ลูกค้าจะไม่สามารถกดสั่งรายการอาหารใหม่ผ่านหน้าเว็บได้ชั่วคราว (ออเดอร์ที่กำลังดำเนินการอยู่จะยังคงสามารถทำต่อได้ตามปกติ)"
                      : "เมื่อเปิดรับออเดอร์ ลูกค้าจะสามารถสแกน QR และกดสั่งอาหารเข้ามายังระบบครัวได้ทันที"}
                  </p>
                </div>
              </div>

              {/* Status Preview Card */}
              <div
                className={cn(
                  "p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold",
                  isStoreOpen
                    ? "bg-rose-50/70 border-rose-200 text-rose-900"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                )}
              >
                <span className="text-text-3 font-normal">สถานะที่จะเปลี่ยนเป็น:</span>
                <span className="font-bold flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isStoreOpen ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                    )}
                  />
                  {isStoreOpen ? "ปิดรับออเดอร์ (ระงับการสั่ง)" : "เปิดรับออเดอร์ (พร้อมขาย)"}
                </span>
              </div>

              {/* Incomplete Warning if trying to open without account */}
              {!isStoreOpen && !hasPaymentAccount && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">ยังไม่กรอกข้อมูลบัญชีรับเงิน</p>
                    <p className="text-[11px] leading-relaxed">
                      คุณจำเป็นต้องกรอกข้อมูลธนาคาร/พร้อมเพย์ เลขที่บัญชี และชื่อบัญชีให้สมบูรณ์ก่อนเปิดรับออเดอร์
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={isUpdatingStoreStatus}
                  onClick={() => setShowStoreConfirmModal(false)}
                  className="rounded-xl font-bold text-xs sm:text-sm py-2.5"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  fullWidth
                  disabled={!isStoreOpen && !hasPaymentAccount}
                  loading={isUpdatingStoreStatus}
                  onClick={handleConfirmStoreStatus}
                  className={cn(
                    "rounded-xl font-black text-xs sm:text-sm py-2.5 text-white shadow-md",
                    isStoreOpen
                      ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                      : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                  )}
                  icon={isStoreOpen ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                >
                  {isStoreOpen ? "ยืนยันปิดรับออเดอร์" : "ยืนยันเปิดรับออเดอร์"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Slip Modal (ดูภาพหลักฐานการชำระเงินของลูกค้า) ─────────────────────────────────── */}
      <AnimatePresence>
        {viewingSlip && (() => {
          const targetSlipOrder = orders.find((o) => String(o.id) === String(viewingSlip)) || null;
          const displayQ = targetSlipOrder?.queueNumber || targetSlipOrder?.id || "-";
          const customerName = targetSlipOrder?.customerNickname || (targetSlipOrder as any)?.customer_nickname || (targetSlipOrder as any)?.customerName || "ลูกค้า";
          const orderTotal = targetSlipOrder ? calculateTotal(targetSlipOrder, menuAvailabilityMap) : 0;
          const hasRealSlip = Boolean(targetSlipOrder?.slipUrl || (targetSlipOrder as any)?.slip_url);
          const slipImageUrl = targetSlipOrder?.slipUrl || (targetSlipOrder as any)?.slip_url;

          return (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setViewingSlip(null)}
              />
              <motion.div
                initial={{ y: "100%", scale: 1 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: "100%", scale: 1 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="relative w-full sm:max-w-md bg-surface sm:rounded-[24px] rounded-t-[24px] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
              >
                <div className="pt-3 px-4 flex flex-col items-center sm:hidden">
                  <div className="w-10 h-1 bg-border rounded-full mb-2" />
                </div>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="font-bold text-text text-sm">หลักฐานการชำระเงิน</h3>
                      <p className="text-[11px] text-text-3">
                        คิว {displayQ} • คุณ {customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasRealSlip && (
                      <a
                        href={formatDriveImageUrl(slipImageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        download={`Slip_Q${displayQ}.jpg`}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                        title="เปิดรูปต้นฉบับ / ดาวน์โหลด"
                      >
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => setViewingSlip(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Slip Image Container */}
                <div className="p-4 sm:p-5 flex flex-col items-center justify-center bg-zinc-950 overflow-y-auto max-h-[60vh] select-none">
                  {hasRealSlip ? (
                    <SafeImage
                      src={slipImageUrl}
                      alt="สลิปหลักฐานการชำระเงิน"
                      className="w-full h-auto max-h-[55vh] object-contain rounded-xl shadow-lg"
                      fallback={
                        <div className="w-full max-w-[260px] p-6 bg-surface rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                            <AlertTriangle size={24} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-text text-sm">ไม่สามารถโหลดรูปภาพสลิปได้</p>
                            <p className="text-xs text-text-3">
                              ยอดชำระ ฿{orderTotal}
                            </p>
                          </div>
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full max-w-[260px] p-6 bg-surface rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <CheckCheck size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-text text-sm">ยืนยันการชำระเงินแล้ว</p>
                        <p className="text-xs text-text-3">
                          ยอดชำระ ฿{orderTotal}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-surface">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-text-3 font-medium">ยอดสุทธิ:</span>
                    <span className="font-bold text-base text-text">฿{orderTotal}</span>
                  </div>
                  <Button variant="secondary" onClick={() => setViewingSlip(null)}>
                    ปิด
                  </Button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
