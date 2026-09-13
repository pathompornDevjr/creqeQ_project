/**
 * @file CustomerBottomNav.tsx
 * @description แถบนำทางด้านล่าง (Bottom Navigation Bar) สำหรับลูกค้าบนหน้าจอมือถือ
 * มีเมนู: เมนูอาหาร, ตะกร้าสินค้า, สถานะการสั่งซื้อ และชำระเงิน
 * พร้อมทั้งระบบแจ้งเตือน Realtime (WebSocket / SSE) เมื่อออเดอร์ของลูกค้าทำเสร็จแล้ว
 */

"use client";

import { cn } from "@/app/lib/utils";
import { Utensils, Clock, CreditCard, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getOrCreateDeviceId, getMyOrderIds } from "@/app/lib/customer-session";
import { getRealtimeWsUrl, speakOrderReadyAnnouncement } from "@/app/lib/useRestaurantRealtime";
import { toast } from "sonner";

/** พร็อพส์สำหรับแถบนำทางลูกค้า */
interface CustomerBottomNavProps {
  /** รหัสโต๊ะหรือคิว เช่น "T-1" หรือ "walk-in" */
  tableId: string;
  /** จำนวนสินค้าในตะกร้า (สำหรับแสดงตัวเลข Badge) */
  cartCount?: number;
}

/**
 * คอมโพเนนต์ CustomerBottomNav
 * จัดการแถบเมนูด้านล่างและการรับฟัง Event เมื่ออาหารเสร็จ เพื่อส่งเสียงแจ้งเตือนและ Toast
 */
export function CustomerBottomNav({ tableId, cartCount = 0 }: CustomerBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId");
  const queryStr = shopId ? `?shopId=${shopId}` : "";
  const basePath = `/menu/${tableId}`;

  // เก็บรายการ Order ID ที่เคยส่งเสียงประกาศไปแล้วใน Session นี้เพื่อไม่ให้พูดซ้ำ
  const announcedIdsRef = useRef<Set<string>>(new Set());

  // ดักฟังสัญญาณ Realtime (WebSocket / SSE) สำหรับการแจ้งเตือนอาหารเสร็จ
  useEffect(() => {
    if (typeof window === "undefined" || !tableId) return;

    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;
    let isDisposed = false;
    const targetShop = shopId || "global";

    // ตัวจัดการเมื่อมี Event ส่งมาจากเซิร์ฟเวอร์
    const handleEvent = (event: any) => {
      if (
        (event.type === "ORDER_STATUS_CHANGED" || event.type === "ORDER_UPDATED" || event.type === "ORDER_PAID") &&
        event.data
      ) {
        const orderData = event.data;
        const ordId = String(orderData.id || orderData.order_id || "");
        if (!ordId) return;

        const currentDeviceId = getOrCreateDeviceId();
        const savedOrderIds = getMyOrderIds(tableId);
        // ตรวจสอบว่าเป็นออเดอร์ของอุปกรณ์นี้หรือไม่
        const isMine = (orderData.deviceId && orderData.deviceId === currentDeviceId) || savedOrderIds.includes(ordId);
        if (!isMine) return;

        const status = String(orderData.status || orderData.order_status || "").toLowerCase().trim();
        const isFinished = status === "served" || status === "ready" || status === "paid" || status === "completed";

        const alreadyAnnounced =
          announcedIdsRef.current.has(ordId) ||
          Boolean(sessionStorage.getItem(`qrshop_ready_announced_${ordId}`));

        // ถ้าออเดอร์ทำเสร็จแล้วและยังไม่เคยประกาศ
        if (isFinished && !alreadyAnnounced) {
          announcedIdsRef.current.add(ordId);
          try {
            sessionStorage.setItem(`qrshop_ready_announced_${ordId}`, "true");
          } catch {}

          const qVal = orderData.queueNumber || orderData.dailyQueueIndex || orderData.tableNumber;
          const cleanQ = qVal ? String(qVal).trim().replace(/^table[-_]?/i, "").replace(/^คิวที่?\s*/i, "") : "";

          // สั่งให้สังเคราะห์เสียงพูดภาษาไทยเรียกคิว
          speakOrderReadyAnnouncement({
            queueNumber: qVal,
          });

          // แสดงกล่องแจ้งเตือน Toast สวยงาม
          toast.success(`ออเดอร์คิวที่ ${cleanQ || "ของคุณ"} ทำเสร็จแล้วค่ะ`, {
            id: `customer-order-ready-${ordId}`,
            duration: 10000,
            description: "ร้านทำเครปเสร็จเรียบร้อยแล้ว เชิญมารับอาหารที่หน้าร้านได้เลยค่ะ",
            action: {
              label: "ดูสถานะคิว",
              onClick: () => {
                if (typeof window !== "undefined" && !window.location.pathname.endsWith("/order")) {
                  window.location.href = `${basePath}/order${queryStr}`;
                }
              },
            },
          });
        }
      }
    };

    // เชื่อมต่อ WebSocket หากผิดพลาดให้สลับไปใช้ SSE (Server-Sent Events)
    try {
      const wsUrl = getRealtimeWsUrl(targetShop);
      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type && msg.type !== "PONG" && msg.type !== "CONNECTED") {
            handleEvent(msg);
          }
        } catch {}
      };
      ws.onerror = () => {
        if (!isDisposed && !sse) connectSSE();
      };
      ws.onclose = () => {
        if (!isDisposed && !sse) connectSSE();
      };
    } catch {
      if (!isDisposed && !sse) connectSSE();
    }

    // ฟังก์ชันเชื่อมต่อแบบสำรองด้วย SSE
    function connectSSE() {
      if (isDisposed || sse) return;
      try {
        const envApi = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
        const apiUrl = envApi.startsWith("/") && typeof window !== "undefined"
          ? `${window.location.origin}${envApi}`
          : envApi || (typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "http://localhost:8800/api/v1");
        const sseUrl = `${apiUrl}/realtime/events?restaurantId=${targetShop}`;
        sse = new EventSource(sseUrl);
        sse.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type && msg.type !== "CONNECTED") {
              handleEvent(msg);
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      isDisposed = true;
      if (ws) ws.close();
      if (sse) sse.close();
    };
  }, [tableId, shopId, basePath, queryStr]);

  // กำหนดรายการเมนูบนแถบนำทาง
  const navItems = [
    { 
      href: `${basePath}${queryStr}`, 
      label: "เมนูอาหาร", 
      icon: Utensils,
      isActive: pathname === basePath
    },
    { 
      href: `${basePath}/cart${queryStr}`, 
      label: "ตะกร้า", 
      icon: ShoppingBag,
      badge: cartCount,
      isActive: pathname.endsWith("/cart")
    },
    { 
      href: `${basePath}/order${queryStr}`, 
      label: "สถานะสั่ง", 
      icon: Clock,
      isActive: pathname.endsWith("/order")
    },
    { 
      href: `${basePath}/payment${queryStr}`, 
      label: "ชำระเงิน", 
      icon: CreditCard,
      isActive: pathname.endsWith("/payment")
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg safe-bottom max-w-md mx-auto">
      <div className="flex items-stretch justify-around h-15">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 relative transition-colors",
              item.isActive ? "text-brand-600 font-bold" : "text-text-3 hover:text-text"
            )}
          >
            {/* เส้นไฮไลต์แสดงสถานะแท็บปัจจุบัน */}
            {item.isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-b-full" />
            )}
            <span className="relative">
              <item.icon size={20} strokeWidth={item.isActive ? 2.5 : 1.8} />
              {/* ป้ายแสดงจำนวนสินค้าในตะกร้า */}
              {!!item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-brand-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {item.badge}
                </span>
              )}
            </span>
            <span className={cn("text-[10px]", item.isActive ? "text-brand-600 font-extrabold" : "text-text-3")}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
