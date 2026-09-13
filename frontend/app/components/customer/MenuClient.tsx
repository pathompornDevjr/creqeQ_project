/**
 * @file MenuClient.tsx
 * @description คอมโพเนนต์หลักสำหรับระบบสั่งอาหารฝั่งลูกค้า (Customer Menu Ordering Workflow)
 * จัดการ State Machine ของขั้นตอนการสั่งอาหารทั้งหมด (Landing -> Builder -> Cart -> Payment -> Success -> Tracking)
 * เชื่อมต่อฐานข้อมูลแบบ Real-time ด้วย WebSocket และ Web Audio TTS แจ้งเตือนสถานะคิว
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LandingView } from "@/app/components/customer/LandingView";
import { FastLoginModal } from "@/app/components/ui/FastLoginModal";
import { GuidedTourModal } from "@/app/components/ui/GuidedTourModal";
import { CustomCrepeBuilder, ToppingItem, CrustItem, CategoryItem } from "@/app/components/customer/CustomCrepeBuilder";
import { PickupTimeSelector } from "@/app/components/customer/PickupTimeSelector";
import { ConfirmOrderModal } from "@/app/components/customer/ConfirmOrderModal";
import { PaymentCheckoutView } from "@/app/components/customer/PaymentCheckoutView";
import { OrderSuccessTokenView } from "@/app/components/customer/OrderSuccessTokenView";
import { LiveOrderTrackingView } from "@/app/components/customer/LiveOrderTrackingView";
import { RestaurantContactModal } from "@/app/components/RestaurantContactModal";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronLeft, HelpCircle, Receipt, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { CustomerApi, fetchApi, SampleMenuDTO } from "@/app/lib/api";
import { getRealtimeWsUrl, speakOrderConfirmedAnnouncement, speakOrderReadyAnnouncement } from "@/app/lib/useRestaurantRealtime";
import { applyTheme, extractBranding, saveBranding, getSavedBranding } from "@/app/lib/theme";
import { formatCrustName, parseCrepeDetails, cleanThaiText, formatQueueDayBadge } from "@/app/lib/utils";

import { useSearchParams } from "next/navigation";

/** รายการขั้นตอนที่ถูกต้องใน Workflow การสั่งอาหาร */
export const VALID_STAGES = [
  "landing",
  "builder",
  "cart",
  "payment",
  "success",
  "tracking",
] as const;

export type StageType = (typeof VALID_STAGES)[number];

export interface MenuClientProps {
  /** รหัสโต๊ะ หรือช่องทาง เช่น "online", "takeaway", "1" */
  tableId?: string;
  /** รหัสร้านค้า */
  shopId?: string;
  /** สเตจเริ่มต้น (เช่น landing หรือ tracking) */
  initialStage?: string;
}

/**
 * คอมโพเนนต์แสดง Skeleton ขณะกำลังโหลดข้อมูลเมนูเริ่มต้น
 */
export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 animate-pulse space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-zinc-200 mx-auto" />
        <div className="h-6 w-32 bg-zinc-200 rounded-full mx-auto" />
        <div className="h-28 bg-zinc-100 rounded-2xl" />
        <div className="h-12 bg-zinc-900/10 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * MenuClient Component
 * ควบคุม State การสั่งเครปของลูกค้าตั้งแต่เลือกแป้ง/ไส้ ตะกร้า ชำระเงิน และติดตามสถานะคิว
 */
export function MenuClient({ tableId = "online", shopId = "1", initialStage }: MenuClientProps) {
  const searchParams = useSearchParams();
  const currentShopId = searchParams?.get("shopId") || shopId || "1";

  // กำหนดสเตจเริ่มต้นให้ตรงกับ SSR เพื่อป้องกัน hydration mismatch
  const [stage, setStageInternal] = useState<StageType>(() => {
    if (initialStage && (VALID_STAGES as readonly string[]).includes(initialStage)) {
      return initialStage as StageType;
    }
    return "landing";
  });

  // สถานะการ Hydrate ของ Client
  const [isHydrated, setIsHydrated] = useState(false);

  // สถานะรายการสินค้าในตะกร้า
  const [cartItems, setCartItems] = useState<any[]>([]);

  // สถานะการเลือกเวลารับสินค้า (รับทันที หรือระบุเวลาล่วงหน้า)
  const [pickupSelection, setPickupSelection] = useState<{
    type: "asap" | "scheduled";
    scheduledTime?: string;
  }>({ type: "asap" });

  // สถานะออเดอร์ที่กำลังติดตาม (รองรับหลายออเดอร์พร้อมกัน)
  const [activeOrders, setActiveOrders] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedList = localStorage.getItem(`crepe_active_orders_${tableId}`);
        if (savedList) return JSON.parse(savedList);
      } catch {}
    }
    return [];
  });
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuAvailabilityMap, setMenuAvailabilityMap] = useState<Record<string, boolean>>({});

  /**
   * ดึงสถานะความพร้อมจำหน่ายของเมนู (เช็คของหมด/ไม่หมด)
   */
  const fetchMenuAvailability = useCallback(async () => {
    try {
      const res = await CustomerApi.getMenu(undefined, undefined, currentShopId);
      if (res.success && res.data) {
        const availMap: Record<string, boolean> = {};
        res.data.forEach((m: any) => {
          const isAvail = m.available !== false && (m as any).is_available !== false;
          const rawName = String(m.name || m.menu_name || "").trim();
          if (rawName) {
            const clean = rawName.toLowerCase();
            availMap[clean] = isAvail;
            const noPrefix = clean.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
            if (noPrefix) availMap[noPrefix] = isAvail;
          }
          if (Array.isArray(m.optionGroups)) {
            m.optionGroups.forEach((og: any) => {
              if (Array.isArray(og.choices)) {
                og.choices.forEach((ch: any) => {
                  const chLabel = String(ch.label || ch.name || "").trim();
                  if (chLabel) {
                    const cleanCh = chLabel.toLowerCase();
                    if (availMap[cleanCh] === undefined) {
                      availMap[cleanCh] = isAvail;
                    }
                    const noPrefixCh = cleanCh.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
                    if (noPrefixCh && availMap[noPrefixCh] === undefined) {
                      availMap[noPrefixCh] = isAvail;
                    }
                  }
                });
              }
            });
          }
        });
        setMenuAvailabilityMap(availMap);
      }
    } catch (err) {
      console.warn("Failed to fetch menu availability:", err);
    }
  }, [currentShopId]);

  // คืนค่าข้อมูลที่เก็บไว้ใน Storage หลังจาก Client mount เรียบร้อย
  useEffect(() => {
    setIsHydrated(true);
    fetchMenuAvailability();

    // 1. กู้คืนขั้นตอน (Stage)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStage = urlParams.get("stage") as StageType;
      if (urlStage && (VALID_STAGES as readonly string[]).includes(urlStage)) {
        setStageInternal(urlStage);
      } else {
        const savedStage = sessionStorage.getItem(`crepe_stage_${tableId}`) as StageType;
        if (savedStage && (VALID_STAGES as readonly string[]).includes(savedStage)) {
          setStageInternal(savedStage);
        }
      }
    } catch {}

    // 2. กู้คืนตะกร้าสินค้า
    try {
      const savedCart = sessionStorage.getItem(`crepe_cart_${tableId}`);
      if (savedCart) {
        const raw = JSON.parse(savedCart);
        if (Array.isArray(raw)) {
          setCartItems(
            raw.map((it: any) => {
              const cleanCrust = cleanThaiText(it.crust || it.name || "");
              const cleanName = cleanThaiText(it.name || it.crust || "");
              return {
                ...it,
                name: cleanName,
                crust: cleanCrust,
                base: it.base
                  ? {
                      ...it.base,
                      name: cleanThaiText(it.base.name),
                      label: cleanThaiText(it.base.label),
                    }
                  : it.base,
                toppingsText: cleanThaiText(it.toppingsText),
                toppings: Array.isArray(it.toppings)
                  ? it.toppings.map((t: any) => ({
                      ...t,
                      name: cleanThaiText(t.name),
                    }))
                  : it.toppings,
                note: cleanThaiText(it.note),
              };
            })
          );
        }
      }
    } catch {}

    // 3. กู้คืนการเลือกเวลารับสินค้า
    try {
      const savedPickup = sessionStorage.getItem(`crepe_pickup_${tableId}`);
      if (savedPickup) setPickupSelection(JSON.parse(savedPickup));
    } catch {}

    // 4. กู้คืนออเดอร์ที่กำลังติดตาม
    try {
      const savedOrder = sessionStorage.getItem(`crepe_active_order_${tableId}`) || (typeof window !== "undefined" ? localStorage.getItem(`crepe_active_order_${tableId}`) : null);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        setActiveOrder(parsed);
        if (parsed?.id) setSelectedOrderId(String(parsed.id));
      }
      const savedList = localStorage.getItem(`crepe_active_orders_${tableId}`);
      if (savedList) {
        const list = JSON.parse(savedList);
        if (Array.isArray(list) && list.length > 0) {
          setActiveOrders(list);
          if (!savedOrder && list[0]?.id) {
            setActiveOrder(list[0]);
            setSelectedOrderId(String(list[0].id));
          }
        }
      }
    } catch {}
  }, [tableId]);

  /**
   * ฟังก์ชันเปลี่ยนสเตจ พร้อมอัปเดต URL และ SessionStorage
   */
  const setStage = useCallback(
    (newStage: StageType) => {
      setStageInternal(newStage);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`crepe_stage_${tableId}`, newStage);
          const url = new URL(window.location.href);
          if (newStage === "landing") {
            url.searchParams.delete("stage");
          } else {
            url.searchParams.set("stage", newStage);
          }
          window.history.pushState({ stage: newStage }, "", url.toString());
        } catch (err) {
          console.warn("Failed to update history state:", err);
        }
      }
    },
    [tableId]
  );

  // ดักฟังปุ่ม Back/Forward ของเบราว์เซอร์
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStage = urlParams.get("stage") as StageType;
      if (urlStage && (VALID_STAGES as readonly string[]).includes(urlStage)) {
        setStageInternal(urlStage);
      } else {
        setStageInternal("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // อัปเดต URL พารามิเตอร์เมื่อสเตจเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated) {
      const url = new URL(window.location.href);
      if (stage !== "landing" && url.searchParams.get("stage") !== stage) {
        url.searchParams.set("stage", stage);
        window.history.replaceState({ stage }, "", url.toString());
      }
    }
  }, [stage, isHydrated]);

  // ซิงค์การเปลี่ยนแปลงในตะกร้าไปยัง SessionStorage
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`crepe_cart_${tableId}`, JSON.stringify(cartItems));
      } catch {}
    }
  }, [cartItems, tableId, isHydrated]);

  // ซิงค์การเลือกเวลารับไปยัง SessionStorage
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`crepe_pickup_${tableId}`, JSON.stringify(pickupSelection));
      } catch {}
    }
  }, [pickupSelection, tableId, isHydrated]);

  // ซิงค์ Active Order ไปยัง SessionStorage
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      try {
        if (activeOrder) {
          sessionStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(activeOrder));
        } else {
          sessionStorage.removeItem(`crepe_active_order_${tableId}`);
        }
      } catch {}
    }
  }, [activeOrder, tableId, isHydrated]);

  // ข้อมูลผู้ใช้ลูกค้า
  const [currentUser, setCurrentUser] = useState<{
    nickname: string;
    phone: string;
    customer_id?: number;
  } | null>(null);

  // สถานะเปิด/ปิดโมดอลต่างๆ
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  // สถานะการแก้ไขสินค้าในตะกร้า
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [builderDraft, setBuilderDraft] = useState<any | null>(null);
  const [editingPendingOrderId, setEditingPendingOrderId] = useState<string | null>(null);
  const notifiedStatusTransitionsRef = useRef<Set<string>>(new Set());

  /**
   * จัดรูปแบบรายการไอเทมในออเดอร์ให้เป็นโครงสร้างมาตรฐาน
   */
  const formatOrderItems = useCallback((rawItems: any[]) => {
    return (rawItems || []).map((it: any, idx: number) => {
      const rawOptions = it.selectedOptions || it.selected_options || [];
      const crustName = formatCrustName(it);

      let toppingsList: any[] = [];
      if (Array.isArray(it.toppings) && it.toppings.length > 0) {
        toppingsList = it.toppings.map((t: any) => ({
          id: String(t.id || t.name || ""),
          name: cleanThaiText(typeof t === "string" ? t : t.name),
          price: Number(t.price) || 0,
        })).filter((t: any) => t.name);
      } else {
        toppingsList = rawOptions
          .filter((opt: any) => {
            const gName = cleanThaiText(String(opt.groupName || opt.option_name || "")).toLowerCase();
            const cLbl = cleanThaiText(String(opt.choiceLabel || opt.selected_choice || "")).toLowerCase();
            return !gName.includes("แป้ง") && !gName.includes("crust") && !gName.includes("base") &&
                   !cLbl.startsWith("แป้ง") && !cLbl.startsWith("แผ่น") && cLbl !== "นุ่ม" && cLbl !== "กรอบ";
          })
          .map((opt: any) => ({
            id: String(opt.id || opt.option_id || opt.choiceLabel || opt.selected_choice || ""),
            name: cleanThaiText(opt.choiceLabel || opt.selected_choice || ""),
            price: Number(opt.price) || 0,
          }))
          .filter((t: any) => t.name);
      }

      let toppingsText = it.toppingsText || "";
      if (!toppingsText && toppingsList.length > 0) {
        toppingsText = toppingsList.map((t: any) => t.name).join(" , ");
      }
      if (!toppingsText && it.note && it.note.includes("ไส้:")) {
        const match = it.note.match(/ไส้:\s*([^,\n]+(?:,[^,\n]+)*)/);
        if (match && match[1]) toppingsText = match[1];
      } else if (!toppingsText && it.remark && it.remark.includes("ไส้:")) {
        const match = it.remark.match(/ไส้:\s*([^,\n]+(?:,[^,\n]+)*)/);
        if (match && match[1]) toppingsText = match[1];
      }

      const primaryImg = it.menuItem?.image || (it.menuItem?.images?.[0]) || it.image || "";
      const unitPrice = Number(it.price || it.menuItem?.price || (it.subtotal && it.quantity ? it.subtotal / it.quantity : it.subtotal) || 0);
      const qty = Number(it.quantity) || 1;

      return {
        id: it.id || `item-${idx}-${Date.now()}`,
        name: it.name || crustName,
        crust: crustName,
        base: {
          name: crustName,
          label: crustName.replace("แป้ง", "").replace("แผ่น", "").trim() || crustName,
          price: unitPrice,
        },
        toppings: toppingsList,
        toppingsText,
        quantity: qty,
        price: unitPrice,
        subtotal: unitPrice * qty,
        note: it.note || it.remark || "",
        image: primaryImg,
        selectedOptions: rawOptions,
        isOutOfStock: Boolean(it.isOutOfStock || it.is_out_of_stock || it.menuItem?.available === false),
        isCancelled: Boolean(it.isCancelled || it.is_cancelled),
      };
    });
  }, []);

  // ข้อมูลร้านค้าและสถานะเปิด/ปิด
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState<string>("");
  const [storeLogo, setStoreLogo] = useState<string | undefined>(undefined);
  const [storeBanner, setStoreBanner] = useState<string | undefined>(undefined);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntil, setPauseUntil] = useState<string | undefined>(undefined);
  const [allowPreorder, setAllowPreorder] = useState(false);
  const [shopDetails, setShopDetails] = useState<any>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // หมวดหมู่ แป้ง ไส้ และเมนูแนะนำ
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [toppings, setToppings] = useState<ToppingItem[]>([]);
  const [crusts, setCrusts] = useState<CrustItem[]>([]);
  const [sampleMenus, setSampleMenus] = useState<SampleMenuDTO[]>([]);

  // ข้อมูลสถานะคิวสด
  const [liveQueue, setLiveQueue] = useState<{
    currentCookingQueue: string;
    waitingCount: number;
    estimatedMinutes: number;
    queuesAhead: number;
    estimatedRemainingMinutes: number;
  }>({
    currentCookingQueue: "-",
    waitingCount: 0,
    estimatedMinutes: 0,
    queuesAhead: 0,
    estimatedRemainingMinutes: 0,
  });

  /**
   * โหลดข้อมูลร้านค้า เมนู และออเดอร์ปัจจุบันจากฐานข้อมูล
   */
  const loadDatabaseData = useCallback(async (loadStatic = false) => {
    try {
      if (loadStatic) {
        // 1. ดึงข้อมูลโต๊ะและโปรไฟล์ร้านค้า
        const tableRes = await CustomerApi.getTableInfo(tableId, currentShopId);
        if (tableRes.success && tableRes.data?.restaurant) {
          const rest = tableRes.data.restaurant;
          setStoreName(rest.name || "");
          setStoreDescription(rest.description || (rest as any).restaurant_desc || "");
          setStoreLogo(rest.logoUrl || undefined);
          setStoreBanner(rest.bannerUrl || (rest as any).restaurant_cover || undefined);
          setIsPaused(Boolean(rest.isOpen === false || (rest as any).isPaused || (rest as any).is_paused));
          setPauseReason((rest as any).pauseReason || (rest as any).pause_reason || "ร้านปิดรับออเดอร์ชั่วคราว");
          setPauseUntil((rest as any).pauseUntil || (rest as any).pause_until || undefined);
          setAllowPreorder(Boolean((rest as any).allowPreorderWhenPaused || (rest as any).allow_preorder_when_paused));
          setShopDetails(rest);

          // นำธีมและสีแบรนด์มาใช้งาน
          const branding = extractBranding(rest);
          applyTheme(branding.primaryColor, branding.secondaryColor, branding.accentColor);
          saveBranding(branding, currentShopId);
          if (branding.bannerUrl !== undefined) {
            setStoreBanner(branding.bannerUrl || undefined);
          }
        }

        // 2. ดึงหมวดหมู่ แป้ง เมนู และเมนูแนะนำ
        const [catsRes, menuRes, crustsRes, sampleRes] = await Promise.all([
          CustomerApi.getCategories(currentShopId),
          CustomerApi.getMenu(undefined, undefined, currentShopId),
          CustomerApi.getCrusts(currentShopId),
          CustomerApi.getSampleMenus(currentShopId),
        ]);

        if (sampleRes.success && Array.isArray(sampleRes.data)) {
          setSampleMenus(sampleRes.data);
        }

        let dbCategories: CategoryItem[] = [];
        if (catsRes.success && catsRes.data && catsRes.data.length > 0) {
          dbCategories = catsRes.data
            .filter((c: any) => !c.name?.toLowerCase?.().includes("crust") && !c.name?.includes("แป้ง"))
            .map((c: any) => ({
              id: String(c.category_id || c.id),
              name: c.category_name || c.name || c.label || "",
              label: c.category_name || c.name || c.label || "",
            }));
        }

        const dbCrusts: CrustItem[] = [];
        const dbToppings: ToppingItem[] = [];

        // ประมวลผลรายการแป้ง
        if (crustsRes.success && Array.isArray(crustsRes.data) && crustsRes.data.length > 0) {
          crustsRes.data.forEach((c: any) => {
            const rawId = String(c.crust_id || c.id);
            const crustName = c.crust_name || c.name || "แป้งเครป";
            dbCrusts.push({
              id: rawId,
              name: crustName,
              label: c.label || crustName.replace("แป้ง", "").replace("แผ่น", "").trim() || crustName,
              price: Number(c.price) || 0,
              desc: c.description || c.desc || "",
              image: c.image || c.image_url || c.crust_image || c.images?.[0] || (c as any).imageUrl || undefined,
              isAvailable: c.is_available !== false && c.isAvailable !== false,
            });
          });
        }

        // ประมวลผลรายการไส้/ท็อปปิ้ง
        if (menuRes.success && Array.isArray(menuRes.data)) {
          for (const it of menuRes.data) {
            const catName = it.category || "";
            const isCrust =
              catName.toLowerCase().includes("crust") ||
              catName.includes("แป้ง") ||
              it.name?.startsWith("แป้ง") ||
              it.name?.startsWith("แผ่น");

            const itemId = String(it.id || (it as any).menu_id || (it as any).item_id || it.name);
            if (isCrust && dbCrusts.length === 0) {
              dbCrusts.push({
                id: itemId,
                name: it.name || "แป้งเครป",
                label: (it.name || "แป้งเครป").replace("แป้ง", "").replace("แผ่น", "").trim() || it.name,
                price: it.price !== undefined && it.price !== null ? Number(it.price) : 10,
                desc: it.description || "",
                image: it.image || (it as any).image_url || (it as any).imageUrl || it.images?.[0] || undefined,
                isAvailable: (it as any).available !== false && (it as any).isAvailable !== false,
              });
            } else if (!isCrust) {
              dbToppings.push({
                id: itemId,
                name: it.name || "ไส้เครป",
                price: it.price !== undefined && it.price !== null ? Number(it.price) : 0,
                category: it.category || (dbCategories[0]?.name || "ทั่วไป"),
                image: it.image || (it as any).image_url || (it as any).imageUrl || it.images?.[0] || "",
                description: it.description || "",
                isAvailable: (it as any).available !== false && (it as any).isAvailable !== false,
              });
            }
          }
        }

        if (dbCrusts.length > 0) {
          setCrusts(dbCrusts);
        }
        setToppings(dbToppings);

        if (dbCategories.length === 0 && dbToppings.length > 0) {
          const uniqueCatNames = Array.from(new Set(dbToppings.map((t) => t.category).filter(Boolean)));
          dbCategories = uniqueCatNames.map((c) => ({ id: c, name: c, label: c }));
        }

        setCategories(dbCategories);
      }

      // 3. ดึงสถานะคิวสดภาพรวมของร้าน
      const queueRes = await CustomerApi.getLiveQueueStatus(
        currentShopId,
        selectedOrderId || activeOrder?.id,
        activeOrder?.queueNumber
      );
      if (queueRes.success && queueRes.data) {
        setLiveQueue({
          currentCookingQueue: queueRes.data.currentCookingQueue || "-",
          waitingCount: queueRes.data.waitingCount || 0,
          estimatedMinutes: queueRes.data.estimatedMinutes || 0,
          queuesAhead: queueRes.data.queuesAhead || 0,
          estimatedRemainingMinutes: queueRes.data.estimatedRemainingMinutes || 0,
        });
      }

      // 4. ดึงข้อมูลตัวตนอุปกรณ์/เบอร์โทรศัพท์ของลูกค้า
      let savedPhone = currentUser?.phone;
      let deviceId = "";
      if (typeof window !== "undefined") {
        try {
          const savedUser = localStorage.getItem("crepe_customer") || localStorage.getItem("crepe_user");
          if (savedUser) savedPhone = savedPhone || JSON.parse(savedUser)?.phone;
          deviceId = localStorage.getItem("crepe_device_id") || "";
          if (!deviceId) {
            deviceId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
            localStorage.setItem("crepe_device_id", deviceId);
          }
        } catch {}
      }

      // 5. ดึงออเดอร์ของลูกค้ารายนี้จากฐานข้อมูล
      const updatedOrdersMap = new Map<string, any>();
      const existingOrderIds: string[] = [];

      if (typeof window !== "undefined") {
        try {
          const myIdsRaw = localStorage.getItem("crepe_my_order_ids");
          if (myIdsRaw) {
            const parsed = JSON.parse(myIdsRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((id) => {
                const s = String(id);
                if (s && s !== "undefined" && !existingOrderIds.includes(s)) existingOrderIds.push(s);
              });
            }
          }
        } catch {}
      }

      if (savedPhone || deviceId) {
        try {
          const ordersRes = await CustomerApi.getTableOrders(tableId, currentShopId, savedPhone, deviceId);
          if (ordersRes.success && Array.isArray(ordersRes.data)) {
            for (const ord of ordersRes.data) {
              const rawStatus = String(ord.status || (ord as any).order_status || "pending").toLowerCase();
              const ordId = String(ord.id || (ord as any).order_id);
              if (!existingOrderIds.includes(ordId)) existingOrderIds.push(ordId);

              const qNum = (ord.queueNumber && ord.queueNumber !== "-")
                ? ord.queueNumber
                : ((ord as any).queue_number || (ord as any).tableNumber || (ord as any).queueLetter || (ordId ? `A${String(ordId).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : "A001"));

              const formatted = {
                id: ordId,
                queueNumber: qNum,
                dailyQueueIndex: ord.dailyQueueIndex || (ord as any).daily_queue_index || undefined,
                createdAt: ord.createdAt || (ord as any).created_at || (ord as any).order_date || undefined,
                orderNumber: (ord as any).orderNumber || `#${ordId}`,
                currentCookingQueue: liveQueue.currentCookingQueue,
                status: rawStatus,
                paymentMethod: (ord as any).paymentMethod || (ord as any).payment_method || "promptpay",
                paymentStatus: (ord as any).paymentStatus || (ord as any).payment_status || "pending",
                totalAmount: ord.total || (ord as any).totalAmount || 0,
                confirmedAt: (ord as any).confirmedAt ? new Date((ord as any).confirmedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : (ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"),
                cookingAt: (ord as any).cookingAt || (ord as any).cookingStartedAt ? new Date((ord as any).cookingAt || (ord as any).cookingStartedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
                readyAt: (ord as any).readyAt ? new Date((ord as any).readyAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
                estimatedRemainingMinutes: 15,
                customerNickname: (ord as any).customerNickname || currentUser?.nickname || "",
                customerPhone: (ord as any).customerPhone || currentUser?.phone || "",
                pickupQrPayload: (ord as any).pickupQrCode || (ord as any).pickup_qr_code || `PICKUP-${qNum || ordId}`,
                hasSlip: Boolean((ord as any).hasSlip || (ord as any).has_slip || (ord as any).slipUrl || (ord as any).slip_url),
                slipUrl: (ord as any).slipUrl || (ord as any).slip_url || undefined,
                items: formatOrderItems(ord.items || []),
              };
              updatedOrdersMap.set(ordId, formatted);
            }
          }
        } catch {}
      }

      // ตรวจสอบความถูกต้องของแต่ละออเดอร์
      for (const orderId of existingOrderIds) {
        if (!updatedOrdersMap.has(orderId)) {
          try {
            const directRes = await CustomerApi.getOrder(orderId);
            if (directRes.success && directRes.data) {
              const ord: any = directRes.data;
              const matchesDevice = deviceId && ord.deviceId && ord.deviceId === deviceId;
              const matchesPhone = savedPhone && ord.customerPhone && ord.customerPhone === savedPhone;
              const isInMyIds = existingOrderIds.includes(String(ord.id || ord.order_id));

              if (matchesDevice || matchesPhone || isInMyIds) {
                const rawStatus = String(ord.status || ord.order_status || "pending").toLowerCase();
                const directQNum = (ord.queueNumber && ord.queueNumber !== "-")
                  ? ord.queueNumber
                  : (ord.queue_number || ord.tableNumber || ord.queueLetter || (ord.id ? `A${String(ord.id).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : "A001"));

                const formatted = {
                  id: String(ord.id || ord.order_id),
                  queueNumber: directQNum,
                  dailyQueueIndex: ord.dailyQueueIndex || ord.daily_queue_index || undefined,
                  createdAt: ord.createdAt || ord.created_at || ord.order_date || undefined,
                  orderNumber: ord.orderNumber || `#${ord.id || ord.order_id}`,
                  currentCookingQueue: liveQueue.currentCookingQueue,
                  status: rawStatus,
                  paymentMethod: ord.paymentMethod || ord.payment_method || "promptpay",
                  paymentStatus: ord.paymentStatus || ord.payment_status || "pending",
                  totalAmount: ord.totalAmount || ord.total || 0,
                  confirmedAt: ord.confirmedAt ? new Date(ord.confirmedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : (ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"),
                  cookingAt: ord.cookingAt || ord.cookingStartedAt ? new Date(ord.cookingAt || ord.cookingStartedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
                  readyAt: ord.readyAt ? new Date(ord.readyAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
                  estimatedRemainingMinutes: 15,
                  customerNickname: ord.customerNickname || currentUser?.nickname || "",
                  customerPhone: ord.customerPhone || currentUser?.phone || "",
                  pickupQrPayload: ord.pickupQrCode || ord.pickup_qr_code || `PICKUP-${directQNum || ord.id}`,
                  hasSlip: Boolean(ord.hasSlip || ord.has_slip || ord.slipUrl || ord.slip_url),
                  slipUrl: ord.slipUrl || ord.slip_url || undefined,
                  items: formatOrderItems(ord.items || []),
                };
                updatedOrdersMap.set(formatted.id, formatted);
              }
            }
          } catch {}
        }
      }

      if (updatedOrdersMap.size === 0 && (deviceId || savedPhone)) {
        const activeOrderRes = await CustomerApi.getActiveOrder(tableId, deviceId, currentShopId, savedPhone);
        if (activeOrderRes.success && activeOrderRes.data) {
          const ord: any = activeOrderRes.data;
          const matchesDevice = deviceId && ord.deviceId && ord.deviceId === deviceId;
          const matchesPhone = savedPhone && ord.customerPhone && ord.customerPhone === savedPhone;

          if (matchesDevice || matchesPhone) {
            const rawStatus = String(ord.status || ord.order_status || "pending").toLowerCase();
            const formatted = {
              id: String(ord.id || ord.order_id),
              queueNumber: ord.queueNumber || ord.queue_number || ord.orderNumber || "-",
              dailyQueueIndex: ord.dailyQueueIndex || ord.daily_queue_index || undefined,
              createdAt: ord.createdAt || ord.created_at || ord.order_date || undefined,
              orderNumber: ord.orderNumber || `#${ord.id || ord.order_id}`,
              currentCookingQueue: liveQueue.currentCookingQueue,
              status: rawStatus,
              paymentMethod: ord.paymentMethod || ord.payment_method || "promptpay",
              paymentStatus: ord.paymentStatus || ord.payment_status || "pending",
              totalAmount: ord.totalAmount || ord.total || 0,
              confirmedAt: ord.confirmedAt ? new Date(ord.confirmedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : (ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"),
              cookingAt: ord.cookingAt || ord.cookingStartedAt ? new Date(ord.cookingAt || ord.cookingStartedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
              readyAt: ord.readyAt ? new Date(ord.readyAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : undefined,
              estimatedRemainingMinutes: 15,
              customerNickname: ord.customerNickname || currentUser?.nickname || "",
              customerPhone: ord.customerPhone || currentUser?.phone || "",
              pickupQrPayload: ord.pickupQrCode || ord.pickup_qr_code || `PICKUP-${ord.queueNumber || ord.id}`,
              hasSlip: Boolean(ord.hasSlip || ord.has_slip || ord.slipUrl || ord.slip_url),
              slipUrl: ord.slipUrl || ord.slip_url || undefined,
              items: formatOrderItems(ord.items || []),
            };
            updatedOrdersMap.set(formatted.id, formatted);
          }
        }
      }

      if (updatedOrdersMap.size > 0) {
        const orderList = Array.from(updatedOrdersMap.values());
        setActiveOrders(orderList);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`crepe_active_orders_${tableId}`, JSON.stringify(orderList));
            const validIds = Array.from(updatedOrdersMap.keys());
            localStorage.setItem("crepe_my_order_ids", JSON.stringify(validIds));
          } catch {}
        }
        setActiveOrder((prev: any) => {
          const currentTargetId = selectedOrderId || prev?.id;
          const targetClean = String(currentTargetId || "").replace(/\D/g, "");
          const matched =
            orderList.find(
              (o) =>
                String(o.id) === String(currentTargetId) ||
                (targetClean && String(o.id || "").replace(/\D/g, "") === targetClean)
            ) || orderList[0];

          // แจ้งเตือนเสียงและข้อความเมื่อร้านค้าเปลี่ยนสถานะเป็น Confirmed
          if (
            prev &&
            matched &&
            String(prev.id) === String(matched.id) &&
            String(prev?.status || "").toLowerCase() === "pending" &&
            String(matched?.status || "").toLowerCase() === "confirmed"
          ) {
            const dedupeKey = `confirmed_${matched.id || matched.queueNumber}`;
            if (!notifiedStatusTransitionsRef.current.has(dedupeKey)) {
              notifiedStatusTransitionsRef.current.add(dedupeKey);
              speakOrderConfirmedAnnouncement({ queueNumber: matched.queueNumber });
              toast.success(`ร้านค้ายืนยันรับออเดอร์คิว ${matched.queueNumber} แล้ว! สามารถชำระเงินออนไลน์ได้ทันที`, {
                id: `customer-confirmed-${matched.id || matched.queueNumber}`,
                duration: 6000,
              });
            }
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(matched));
            } catch {}
          }
          return matched;
        });
      } else {
        // หากไม่มีออเดอร์ในฐานข้อมูล ให้เคลียร์ข้อมูลออกจากแคช
        setActiveOrders([]);
        setActiveOrder(null);
        setSelectedOrderId(null);
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(`crepe_active_orders_${tableId}`);
            localStorage.removeItem(`crepe_active_order_${tableId}`);
            localStorage.removeItem("crepe_my_order_ids");
            localStorage.removeItem(`qrshop_my_orders_${tableId}`);
            localStorage.removeItem(`qrshop_active_order_${tableId}`);
            sessionStorage.removeItem(`crepe_active_order_${tableId}`);
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("crepe_active_order") || key.startsWith("crepe_active_orders") || key.startsWith("qrshop_my_orders"))) {
                localStorage.removeItem(key);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Error loading customer data from database:", err);
    }
  }, [tableId, currentShopId, liveQueue.currentCookingQueue, currentUser?.phone, selectedOrderId, activeOrders.length, formatOrderItems]);

  // การเชื่อมต่อ WebSocket สำหรับอัปเดตแบบ Realtime พร้อม Polling สำรอง
  useEffect(() => {
    loadDatabaseData(true);
    fetchMenuAvailability();

    const pollTimer = setInterval(() => {
      loadDatabaseData(false);
    }, 8000);

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        const wsUrl = getRealtimeWsUrl(currentShopId);
        ws = new WebSocket(wsUrl);

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "SHOP_THEME_UPDATED" && msg.data) {
              const branding = extractBranding(msg.data);
              applyTheme(branding.primaryColor, branding.secondaryColor, branding.accentColor);
              saveBranding(branding, currentShopId);
              if (branding.bannerUrl !== undefined) {
                setStoreBanner(branding.bannerUrl || undefined);
              }
            } else if (msg.type === "ORDER_UPDATED" && msg.data?.storePause) {
              setIsPaused(Boolean(msg.data.storePause.isPaused));
              setPauseReason(msg.data.storePause.pauseReason || "ร้านปิดรับออเดอร์ชั่วคราว");
              setPauseUntil(msg.data.storePause.pauseUntil || undefined);
              setAllowPreorder(Boolean(msg.data.storePause.allowPreorderWhenPaused));
            } else if (msg.type === "ORDER_STATUS_CHANGED" && msg.data) {
              const incomingId = String(msg.data.id || msg.data.order_id || "");
              const incomingIdClean = incomingId.replace(/\D/g, "");
              const newStatus = String(msg.data.status || msg.data.order_status || "").toLowerCase();
              const newPaymentMethod = String(msg.data.paymentMethod || msg.data.payment_method || "").toLowerCase();
              const newPaymentStatus = String(msg.data.paymentStatus || msg.data.payment_status || "").toLowerCase();

              setActiveOrders((prevList) => {
                const updatedList = prevList.map((ord) => {
                  const ordIdStr = String(ord.id || "");
                  const ordIdClean = ordIdStr.replace(/\D/g, "");
                  const isMatch = ordIdStr === incomingId || (ordIdClean && ordIdClean === incomingIdClean);
                  if (isMatch) {
                    return {
                      ...ord,
                      status: newStatus || ord.status,
                      paymentMethod: newPaymentMethod || ord.paymentMethod,
                      paymentStatus: newPaymentStatus || ord.paymentStatus,
                      readyAt: msg.data.readyAt || ord.readyAt,
                      cookingAt: msg.data.cookingAt || ord.cookingAt,
                      confirmedAt: msg.data.confirmedAt || ord.confirmedAt,
                    };
                  }
                  return ord;
                });
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem(`crepe_active_orders_${tableId}`, JSON.stringify(updatedList));
                  } catch {}
                }
                return updatedList;
              });

              setActiveOrder((prev: any) => {
                if (!prev) return prev;
                const prevIdStr = String(prev.id || "");
                const prevIdClean = prevIdStr.replace(/\D/g, "");
                const isMatch = Boolean(
                  incomingId &&
                  (prevIdStr === incomingId || (prevIdClean && incomingIdClean && prevIdClean === incomingIdClean))
                );
                if (!isMatch) return prev;

                const prevStatus = String(prev?.status || "").toLowerCase();

                if (newStatus && prevStatus && newStatus !== prevStatus) {
                  const transitionKey = `${newStatus}_${incomingId || prev.id || prev.queueNumber}`;
                  if (!notifiedStatusTransitionsRef.current.has(transitionKey)) {
                    notifiedStatusTransitionsRef.current.add(transitionKey);

                    if (newStatus === "confirmed" && prevStatus === "pending") {
                      speakOrderConfirmedAnnouncement({ queueNumber: prev.queueNumber });
                      toast.success(`ร้านค้ายืนยันรับออเดอร์คิว ${prev.queueNumber} แล้ว! สามารถชำระเงินออนไลน์ได้ทันที`, {
                        id: `customer-confirmed-${incomingId || prev.id || prev.queueNumber}`,
                        duration: 6000,
                      });
                    } else if (newStatus === "cooking" || newStatus === "preparing") {
                      toast.info(`เชฟเริ่มปรุงอาหารคิว ${prev.queueNumber} แล้วค่ะ`, {
                        id: `customer-cooking-${incomingId || prev.id || prev.queueNumber}`,
                        duration: 5000,
                      });
                    } else if (
                      newStatus === "ready" ||
                      newStatus === "served" ||
                      ((newStatus === "paid" || newStatus === "completed") &&
                        (prevStatus === "preparing" || prevStatus === "cooking" || prevStatus === "confirmed"))
                    ) {
                      speakOrderReadyAnnouncement({
                        queueNumber: prev.queueNumber || msg.data?.queueNumber || msg.data?.dailyQueueIndex,
                      });
                      toast.success(`ออเดอร์คิวที่ ${prev.queueNumber || "ของคุณ"} ทำเสร็จเรียบร้อยแล้วค่ะ`, {
                        id: `customer-ready-${incomingId || prev.id || prev.queueNumber}`,
                        duration: 10000,
                        description: "ร้านทำเครปเสร็จแล้วค่ะ เชิญมารับอาหารที่หน้าร้านได้เลยค่ะ",
                      });
                    }
                  }
                }

                const updated = {
                  ...prev,
                  status: newStatus || prev?.status,
                  paymentMethod: newPaymentMethod || prev?.paymentMethod || "promptpay",
                  paymentStatus: newPaymentStatus || prev?.paymentStatus || "pending",
                  readyAt: msg.data.readyAt || prev?.readyAt,
                  cookingAt: msg.data.cookingAt || prev?.cookingAt,
                  confirmedAt: msg.data.confirmedAt || prev?.confirmedAt,
                };

                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updated));
                  } catch {}
                }

                return updated;
              });
              loadDatabaseData();
            } else if (
              msg.type === "OUT_OF_STOCK_TOGGLED" ||
              msg.type === "MENU_UPDATED" ||
              msg.type === "CRUST_UPDATED" ||
              msg.type === "ORDER_UPDATED" ||
              msg.type === "ORDERS_BATCH_UPDATED"
            ) {
              loadDatabaseData();
              if (Array.isArray(msg.data?.items)) {
                setMenuAvailabilityMap((prev) => {
                  const next = { ...prev };
                  msg.data.items.forEach((it: any) => {
                    const n = String(it.name || it.menu_name || it.label || "").trim().toLowerCase();
                    if (n) {
                      const isAvail = it.isAvailable !== false && it.available !== false;
                      next[n] = isAvail;
                      const noPrefix = n.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
                      if (noPrefix) next[noPrefix] = isAvail;
                    }
                  });
                  return next;
                });
              } else if (msg.data?.name || msg.data?.menuName) {
                const name = String(msg.data.name || msg.data.menuName).trim().toLowerCase();
                const isAvail = Boolean(msg.data.available !== false && msg.data.isAvailable !== false);
                setMenuAvailabilityMap((prev) => {
                  const next = { ...prev, [name]: isAvail };
                  const noPrefix = name.replace(/^(แป้ง|แผ่น|เครป)/, "").trim();
                  if (noPrefix) next[noPrefix] = isAvail;
                  return next;
                });
              }

              const incomingId = String(msg.data?.id || msg.data?.order_id);
              if (incomingId && Array.isArray(msg.data?.items)) {
                const formattedItems = formatOrderItems(msg.data.items);
                setActiveOrders((prevList) =>
                  prevList.map((ord) => (String(ord.id) === incomingId ? { ...ord, items: formattedItems } : ord))
                );
                setActiveOrder((prev: any) =>
                  prev && String(prev.id) === incomingId ? { ...prev, items: formattedItems } : prev
                );
              }

              fetchMenuAvailability();
              loadDatabaseData();
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {}
    };

    connectWs();

    return () => {
      isDisposed = true;
      clearInterval(pollTimer);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [loadDatabaseData, fetchMenuAvailability, formatOrderItems, currentShopId, activeOrder?.id, tableId]);

  // โหลดข้อมูลผู้ใช้และออเดอร์จาก LocalStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crepe_customer");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.nickname && parsed.phone) {
            setCurrentUser(parsed);
          }
        }
        const savedOrd = localStorage.getItem(`crepe_active_order_${tableId}`);
        if (savedOrd) {
          const parsedOrd = JSON.parse(savedOrd);
          if (parsedOrd && parsedOrd.id) {
            setActiveOrder(parsedOrd);
          }
        }
      } catch (e) {
        console.warn("Failed to read data from localStorage:", e);
      }
    }
  }, [tableId]);

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน หรือโหลดจาก LocalStorage
   */
  const getOrLoadUser = useCallback(() => {
    if (currentUser?.nickname && currentUser?.phone) {
      return currentUser;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crepe_customer");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.nickname && parsed.phone) {
            setCurrentUser(parsed);
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  }, [currentUser]);

  /** ยอดเงินรวมทั้งหมดในตะกร้า */
  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  }, [cartItems]);

  /** ข้อมูลสรุปของออเดอร์ที่กำลังดำเนินการ */
  const activeOrderInfo = useMemo(() => {
    if (!activeOrder) return null;
    const validStatuses = ["pending", "confirmed", "cooking", "ready"];
    if (validStatuses.includes(activeOrder.status?.toLowerCase())) {
      return {
        queueNumber: activeOrder.queueNumber || "-",
        dailyQueueIndex: activeOrder.dailyQueueIndex,
        createdAt: activeOrder.createdAt,
        status: activeOrder.status,
      };
    }
    return null;
  }, [activeOrder]);

  /** เริ่มสร้างเครปชิ้นใหม่ */
  const handleAddNewCrepe = () => {
    setEditingCartIndex(null);
    setBuilderDraft(null);
    setStage("builder");
  };

  /** เริ่มกระบวนการสั่งอาหาร (ตรวจสอบการเข้าสู่ระบบ) */
  const handleStartOrder = () => {
    const user = getOrLoadUser();
    setEditingCartIndex(null);
    setBuilderDraft(null);
    if (!user) {
      setIsLoginModalOpen(true);
    } else {
      setStage("builder");
    }
  };

  /** ไปยังขั้นตอนยืนยันการสั่งซื้อ */
  const handleProceedToConfirmOrder = () => {
    if (pickupSelection.type === "scheduled" && !pickupSelection.scheduledTime?.trim()) {
      toast.error("กรุณาเลือกช่วงเวลาที่สะดวกมารับสินค้าก่อนยืนยันคำสั่งซื้อ");
      return;
    }
    const user = getOrLoadUser();
    if (!user) {
      toast.info("กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์สำหรับเรียกคิวก่อนยืนยันคำสั่งซื้อ");
      setIsLoginModalOpen(true);
      return;
    }
    setIsConfirmOrderModalOpen(true);
  };

  /**
   * จัดการเพิ่มเครปที่เลือกเข้าตะกร้าสินค้า
   */
  const handleAddToCart = (crepeItem: any) => {
    const cleanCrust = formatCrustName(crepeItem);
    const cleanName = cleanThaiText(crepeItem.name) || cleanCrust;
    const cleanToppings = (crepeItem.toppings || []).map((t: any) => ({
      ...t,
      name: cleanThaiText(t.name),
    }));
    const cleanToppingsText = cleanThaiText(cleanToppings.map((t: any) => t.name).join(" + "));
    const cleanNote = cleanThaiText(crepeItem.note);

    setCartItems((prev) => {
      const itemToSave = {
        id: crepeItem.id,
        name: cleanName,
        crust: cleanCrust,
        base: crepeItem.base
          ? {
              ...crepeItem.base,
              name: cleanThaiText(crepeItem.base.name) || cleanCrust,
              label: cleanThaiText(crepeItem.base.label) || cleanCrust.replace("แป้ง", "").replace("แผ่น", "").trim(),
            }
          : crepeItem.base,
        toppings: cleanToppings,
        toppingsText: cleanToppingsText,
        price: crepeItem.unitPrice,
        quantity: crepeItem.quantity,
        note: cleanNote,
      };

      if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < prev.length) {
        const updated = [...prev];
        updated[editingCartIndex] = itemToSave;
        return updated;
      }
      return [...prev, itemToSave];
    });
    setEditingCartIndex(null);
    setBuilderDraft(null);
    toast.success(editingCartIndex !== null ? "บันทึกการแก้ไขแล้ว" : "เพิ่มใส่ตะกร้าเรียบร้อยแล้ว");
    setStage("cart");
  };

  /**
   * เปิดหน้าแก้ไขเครปในตะกร้าตาม Index
   */
  const handleEditCartItem = (idx: number) => {
    const item = cartItems[idx];
    if (!item) return;
    setEditingCartIndex(idx);

    let baseCrust: CrustItem | undefined = undefined;
    if (item.base) {
      baseCrust = crusts.find(
        (c) =>
          String(c.id) === String((item.base as any)?.id) ||
          c.name === item.base?.name ||
          c.label === (item.base as any)?.label ||
          (item.base?.name && (c.name.includes(item.base.name) || item.base.name.includes(c.name)))
      );
      if (!baseCrust) {
        baseCrust = {
          id: (item.base as any).id || (item.base.name.includes("นุ่ม") ? "soft" : "crispy"),
          name: item.base.name || "แผ่นแป้ง",
          label: (item.base as any).label || (item.base.name.includes("นุ่ม") ? "นุ่ม" : "กรอบ"),
          price: item.base.price !== undefined && item.base.price !== null ? Number(item.base.price) : 1,
        };
      }
    } else if (item.name) {
      baseCrust = crusts.find(
        (c) =>
          item.name.includes(c.name) ||
          (c.label && item.name.includes(c.label)) ||
          (item.name.includes("นุ่ม") && (c.name.includes("นุ่ม") || c.label?.includes("นุ่ม"))) ||
          (item.name.includes("กรอบ") && (c.name.includes("กรอบ") || c.label?.includes("กรอบ")))
      );
    }
    if (!baseCrust && crusts.length > 0) {
      baseCrust = crusts[0];
    }

    let draftToppings: ToppingItem[] = [];
    if (Array.isArray(item.toppings) && item.toppings.length > 0) {
      draftToppings = item.toppings.map((t: ToppingItem) => {
        const found = toppings.find((dbT) => String(dbT.id) === String(t.id) || dbT.name === t.name);
        return found || t;
      });
    } else if (item.toppingsText) {
      const names = item.toppingsText.split("+").map((s: string) => s.trim()).filter(Boolean);
      draftToppings = names.map((name: string) => {
        const found = toppings.find((t) => t.name === name);
        return found || { id: name, name, price: 0, category: "" };
      });
    }

    setBuilderDraft({
      id: item.id,
      base: baseCrust,
      toppings: draftToppings,
      quantity: item.quantity || 1,
      note: item.note || "",
      isEditing: true,
    });
    setStage("builder");
  };

  /**
   * นำรายการจากออเดอร์สถานะ Pending มาแก้ไขในตะกร้า
   */
  const handleEditPendingOrder = useCallback((orderToEdit?: any) => {
    const target = orderToEdit || activeOrder;
    if (!target) {
      toast.error("ไม่พบข้อมูลออเดอร์");
      return;
    }
    const rawStatus = String(target.status || "").toLowerCase();
    if (rawStatus !== "pending") {
      toast.error("ไม่สามารถแก้ไขรายการได้ เนื่องจากทางร้านกดยืนยันหรือเริ่มปรุงแล้ว");
      return;
    }

    const itemsToLoad = formatOrderItems(target.items || []);
    if (itemsToLoad.length === 0) {
      toast.error("ไม่พบรายการในออเดอร์นี้");
      return;
    }

    setCartItems(itemsToLoad);
    setEditingPendingOrderId(String(target.id));
    setEditingCartIndex(null);
    setBuilderDraft(null);
    setStage("cart");
    toast.info(`กำลังแก้ไขรายการของคิว ${target.queueNumber}`);
  }, [activeOrder, formatOrderItems, setStage]);

  /**
   * บันทึกการแก้ไขออเดอร์สถานะ Pending กลับไปยังฐานข้อมูล
   */
  const handleSaveEditedPendingOrder = useCallback(async () => {
    if (!editingPendingOrderId) return;
    if (cartItems.length === 0) {
      toast.error("กรุณามีอย่างน้อย 1 รายการในออเดอร์");
      return;
    }

    try {
      const formattedItems = cartItems.map((c) => {
        const crustName = formatCrustName(c);
        const toppingsJoined = (c.toppings || []).map((t: any) => cleanThaiText(t.name)).join(" , ") || cleanThaiText(c.toppingsText) || "";
        return {
          id: c.id,
          name: crustName,
          menuItem: { id: "1", name: crustName, price: c.price, category: "" },
          quantity: c.quantity,
          subtotal: c.price * c.quantity,
          note: cleanThaiText(c.note) || "",
          selectedOptions: [
            {
              groupName: "แป้ง",
              choiceLabel: crustName,
              price: 0,
            },
            ...(c.toppings || []).map((t: any) => ({
              groupName: "ท็อปปิ้ง",
              choiceLabel: cleanThaiText(t.name),
              price: t.price || 0,
            })),
          ],
          toppingsText: toppingsJoined,
        };
      });

      const res = await CustomerApi.updateOrderItems(editingPendingOrderId, formattedItems);
      if (res.success && res.data) {
        const updatedOrderData: any = res.data;
        const updatedFormattedOrder = {
          id: String(updatedOrderData.id || updatedOrderData.order_id || editingPendingOrderId),
          queueNumber: updatedOrderData.queueNumber || updatedOrderData.queue_number || activeOrder?.queueNumber || "-",
          orderNumber: updatedOrderData.orderNumber || activeOrder?.orderNumber || `#${editingPendingOrderId}`,
          currentCookingQueue: liveQueue.currentCookingQueue,
          status: String(updatedOrderData.status || "pending").toLowerCase(),
          paymentMethod: updatedOrderData.paymentMethod || activeOrder?.paymentMethod || "promptpay",
          paymentStatus: updatedOrderData.paymentStatus || activeOrder?.paymentStatus || "pending",
          totalAmount: updatedOrderData.total || updatedOrderData.totalAmount || cartTotalAmount,
          confirmedAt: activeOrder?.confirmedAt || "-",
          cookingAt: activeOrder?.cookingAt,
          readyAt: activeOrder?.readyAt,
          estimatedRemainingMinutes: activeOrder?.estimatedRemainingMinutes || 6,
          customerNickname: currentUser?.nickname || activeOrder?.customerNickname || "",
          customerPhone: currentUser?.phone || activeOrder?.customerPhone || "",
          pickupQrPayload: updatedOrderData.pickupQrCode || activeOrder?.pickupQrPayload,
          items: formatOrderItems(updatedOrderData.items || formattedItems),
        };

        setActiveOrders((prev) =>
          prev.map((o) => (String(o.id) === String(editingPendingOrderId) ? updatedFormattedOrder : o))
        );
        setActiveOrder(updatedFormattedOrder);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updatedFormattedOrder));
          } catch {}
        }

        setEditingPendingOrderId(null);
        setCartItems([]);
        setStage("tracking");
        toast.success("บันทึกการแก้ไขออเดอร์เรียบร้อยแล้ว!");
        loadDatabaseData();
      } else {
        toast.error(res.message || "ไม่สามารถแก้ไขรายการได้");
      }
    } catch (err: any) {
      console.error("Save edited order error:", err);
      toast.error("เกิดข้อผิดพลาดในการบันทึกการแก้ไข");
    }
  }, [editingPendingOrderId, cartItems, activeOrder, liveQueue.currentCookingQueue, cartTotalAmount, currentUser?.nickname, currentUser?.phone, formatOrderItems, tableId, setStage, loadDatabaseData]);

  /**
   * ยืนยันการสั่งซื้อหรือแจ้งการชำระเงิน
   */
  const handlePaymentSuccess = async (
    paymentMethod: "promptpay" | "cash" = "promptpay",
    customCustomerInfo?: { nickname?: string; phone?: string }
  ) => {
    if (customCustomerInfo?.nickname || customCustomerInfo?.phone) {
      const updatedUser = {
        nickname: customCustomerInfo.nickname || currentUser?.nickname || "ลูกค้า",
        phone: customCustomerInfo.phone || currentUser?.phone || "",
        customer_id: currentUser?.customer_id,
      };
      setCurrentUser(updatedUser);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("crepe_user", JSON.stringify(updatedUser));
        } catch {}
      }
    }

    // กรณีเป็นการแจ้งชำระเงินสำหรับออเดอร์เดิมที่อยู่ในหน้าติดตาม
    if (activeOrder && activeOrder.id && cartItems.length === 0) {
      try {
        if (paymentMethod === "cash") {
          await CustomerApi.notifyCash(activeOrder.id);
          toast.success("แจ้งชำระเงินสดที่เคาน์เตอร์เรียบร้อยแล้ว");
        } else {
          await CustomerApi.uploadSlip(activeOrder.id, {});
          toast.success("แจ้งชำระเงินผ่านพร้อมเพย์เรียบร้อยแล้ว");
        }
        setActiveOrder((prev: any) => {
          const updated = {
            ...prev,
            paymentMethod,
            paymentStatus: "paid",
          };
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
        setStage("tracking");
        return;
      } catch (err) {
        console.error("Payment notification error:", err);
        toast.error("เกิดข้อผิดพลาดในการแจ้งชำระเงิน");
        return;
      }
    }

    if (cartItems.length === 0) {
      toast.error("ตะกร้าสินค้าว่างเปล่า");
      return;
    }

    const user = customCustomerInfo?.nickname
      ? { nickname: customCustomerInfo.nickname, phone: customCustomerInfo.phone || "" }
      : getOrLoadUser();

    if (!user || (!user.nickname && !customCustomerInfo?.nickname)) {
      toast.info("กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์ก่อนยืนยันออเดอร์");
      setIsLoginModalOpen(true);
      return;
    }

    try {
      // ส่งคำสั่งซื้อใหม่ไปยัง API
      const res = await CustomerApi.placeOrder({
        shopId: currentShopId,
        tableId,
        deviceId: typeof window !== "undefined" ? (localStorage.getItem("crepe_device_id") || undefined) : undefined,
        customerNickname: customCustomerInfo?.nickname || user.nickname || "ลูกค้า",
        customerPhone: customCustomerInfo?.phone !== undefined ? customCustomerInfo.phone : (user.phone || ""),
        pickupType: pickupSelection.type,
        scheduledTime: pickupSelection.scheduledTime,
        paymentMethod: paymentMethod === "cash" ? "cash" : "promptpay",
        items: cartItems.map((c) => {
          const crustName = formatCrustName(c);
          const toppingsJoined = (c.toppings || []).map((t: any) => cleanThaiText(t.name)).join(" , ") || cleanThaiText(c.toppingsText) || "";
          return {
            id: c.id,
            name: crustName,
            menuItem: { id: "1", name: crustName, price: c.price, category: "" },
            quantity: c.quantity,
            subtotal: c.price * c.quantity,
            note: cleanThaiText(c.note) || "",
            selectedOptions: [
              {
                groupName: "แป้ง",
                choiceLabel: crustName,
                price: 0,
              },
              ...(c.toppings || []).map((t: any) => ({
                groupName: "ท็อปปิ้ง",
                choiceLabel: cleanThaiText(t.name),
                price: t.price || 0,
              })),
            ],
            toppingsText: toppingsJoined,
          };
        }),
      });

      if (res.success && res.data) {
        const orderData: any = res.data;
        const formattedItems = formatOrderItems(
          orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0
            ? orderData.items
            : cartItems.map((c) => {
                const crustName = formatCrustName(c);
                const toppingsJoined = (c.toppings || []).map((t: any) => cleanThaiText(t.name)).join(" , ") || cleanThaiText(c.toppingsText) || "";
                return {
                  id: c.id,
                  name: c.name || crustName,
                  crust: crustName,
                  base: c.base,
                  toppings: c.toppings,
                  toppingsText: toppingsJoined,
                  quantity: c.quantity,
                  price: c.price,
                  subtotal: c.price * c.quantity,
                  note: cleanThaiText(c.note) || "",
                  selectedOptions: [
                    {
                      groupName: "แป้ง",
                      choiceLabel: crustName,
                      price: 0,
                    },
                    ...(c.toppings || []).map((t: any) => ({
                      groupName: "ท็อปปิ้ง",
                      choiceLabel: cleanThaiText(t.name),
                      price: t.price || 0,
                    })),
                  ],
                };
              })
        );

        const calculatedTotal = formattedItems.reduce((sum: number, it: any) => sum + (it.subtotal || (it.price * (it.quantity || 1))), 0);
        const resolvedTotal = Number(orderData.totalAmount || orderData.total || calculatedTotal || cartTotalAmount);

        const newActiveOrder = {
          id: String(orderData.id || orderData.order_id),
          queueNumber: orderData.queueNumber || orderData.queue_number || orderData.orderNumber || "-",
          dailyQueueIndex: orderData.dailyQueueIndex || orderData.daily_queue_index || undefined,
          createdAt: orderData.createdAt || orderData.created_at || new Date().toISOString(),
          orderNumber: orderData.orderNumber || `#${orderData.id || orderData.order_id}`,
          currentCookingQueue: liveQueue.currentCookingQueue,
          status: "pending",
          paymentMethod: paymentMethod === "cash" ? "cash" : "promptpay",
          paymentStatus: "pending",
          totalAmount: resolvedTotal,
          confirmedAt: "-",
          customerNickname: currentUser?.nickname || "ลูกค้า",
          customerPhone: currentUser?.phone || "",
          pickupQrPayload: orderData.pickupQrCode || orderData.pickup_qr_code || `PICKUP-${orderData.queueNumber || orderData.id}`,
          items: formattedItems,
        };
        setActiveOrders((prev) => {
          const updated = [newActiveOrder, ...prev.filter((o) => String(o.id) !== String(newActiveOrder.id))];
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`crepe_active_orders_${tableId}`, JSON.stringify(updated));
              const myIds: string[] = JSON.parse(localStorage.getItem("crepe_my_order_ids") || "[]");
              if (!myIds.includes(newActiveOrder.id)) {
                myIds.unshift(newActiveOrder.id);
                localStorage.setItem("crepe_my_order_ids", JSON.stringify(myIds));
              }
            } catch {}
          }
          return updated;
        });
        notifiedStatusTransitionsRef.current.add(`pending_${newActiveOrder.id}`);
        setSelectedOrderId(newActiveOrder.id);
        setActiveOrder(newActiveOrder);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(newActiveOrder));
          } catch {}
        }
        setCartItems([]);
        setIsConfirmOrderModalOpen(false);
        setStage("tracking");
        toast.success("ส่งออเดอร์ให้ทางร้านเรียบร้อยแล้ว! รอยืนยันรับออเดอร์");
        return;
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึกออเดอร์ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      console.error("Order creation error:", err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง");
    }
  };

  // -------------------------------------------------------------
  // ส่วนแสดงผลหน้าจอตามสถานะขั้นตอน (Stages)
  // -------------------------------------------------------------

  // STAGE 01: หน้าแรกของร้านค้า (LANDING)
  if (stage === "landing") {
    return (
      <>
        <LandingView
          restaurantName={storeName}
          restaurantDescription={storeDescription}
          restaurantLogo={storeLogo}
          restaurantBanner={storeBanner}
          isPaused={isPaused}
          pauseReason={pauseReason}
          pauseUntil={pauseUntil}
          allowPreorder={allowPreorder}
          currentCookingQueue={liveQueue.currentCookingQueue}
          waitingCount={liveQueue.waitingCount}
          estimatedMinutes={liveQueue.estimatedMinutes}
          activeOrderInfo={activeOrderInfo}
          onStartOrder={handleStartOrder}
          onTrackOrder={() => {
            if (activeOrder) {
              setStage("tracking");
            } else {
              toast.info("ยังไม่มีออเดอร์ที่กำลังดำเนินการ");
            }
          }}
          onOpenTour={() => {
            setTourStep(1);
            setIsTourModalOpen(true);
          }}
          onOpenHelp={() => {
            setTourStep(1);
            setIsTourModalOpen(true);
          }}
          onOpenContact={() => setIsContactModalOpen(true)}
          onBrowseMenu={handleAddNewCrepe}
          sampleMenus={sampleMenus}
        />

        <RestaurantContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          restaurant={
            shopDetails || {
              id: currentShopId,
              name: storeName,
              description: storeDescription,
              logoUrl: storeLogo,
              bannerUrl: storeBanner,
            }
          }
          branding={{
            primaryColor: "#e11d48",
            secondaryColor: "#fb7185",
            accentColor: "#f43f5e",
            logoUrl: storeLogo,
          }}
        />

        <FastLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            handleAddNewCrepe();
          }}
          onBrowseMenuWithoutLogin={handleAddNewCrepe}
          onOpenHelp={() => {
            setTourStep(2);
            setIsTourModalOpen(true);
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </>
    );
  }

  // STAGE 04: หน้าจัดแต่งเครปตามใจชอบ (CUSTOM CREPE BUILDER)
  if (stage === "builder") {
    return (
      <>
        <CustomCrepeBuilder
          currentQueue={liveQueue.currentCookingQueue}
          initialDraft={builderDraft}
          categoriesList={categories}
          toppingsList={toppings}
          crustsList={crusts}
          cartCount={cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0)}
          activeOrderInfo={activeOrderInfo}
          onTrackActiveOrder={() => setStage("tracking")}
          onViewCart={() => setStage("cart")}
          onAddToCart={handleAddToCart}
          onBack={() => {
            setEditingCartIndex(null);
            setBuilderDraft(null);
            setStage(editingCartIndex !== null ? "cart" : "landing");
          }}
          onOpenHelp={() => {
            setTourStep(1);
            setIsTourModalOpen(true);
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </>
    );
  }

  // STAGE 05: ตะกร้าสินค้าและการเลือกเวลานัดรับ (CART & PICKUP SELECTION)
  if (stage === "cart") {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-start p-4 sm:p-6 pb-28 text-zinc-900 animate-fade-in gap-3.5">
        {/* แถบหัวด้านบน */}
        <div className="w-full max-w-lg flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editingPendingOrderId) {
                  setEditingPendingOrderId(null);
                  setCartItems([]);
                  setStage("tracking");
                } else {
                  handleAddNewCrepe();
                }
              }}
              aria-label="ย้อนกลับ"
              className="w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:text-black transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-extrabold text-zinc-900 tracking-tight">
              {editingPendingOrderId ? "แก้ไขรายการออเดอร์" : `ตะกร้าของ${currentUser?.nickname || "คุณ"}`}
            </h1>
          </div>

          <button
            onClick={() => {
              setTourStep(3);
              setIsTourModalOpen(true);
            }}
            aria-label="คำแนะนำ"
            className="w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:text-black transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* แถบแจ้งเตือนสถานะการแก้ไขออเดอร์ที่รอดำเนินการ */}
        {editingPendingOrderId ? (
          <div className="w-full max-w-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/90 rounded-[20px] p-3.5 flex items-center justify-between shadow-2xs animate-fade-down">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Edit2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-amber-950 truncate">
                  กำลังแก้ไขออเดอร์คิว {activeOrder?.queueNumber}
                </h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  ปรับเปลี่ยนรายการแล้วกด &quot;บันทึกการแก้ไข&quot; ด้านล่าง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingPendingOrderId(null);
                setCartItems([]);
                setStage("tracking");
              }}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-bold cursor-pointer transition active:scale-95 shrink-0 shadow-2xs"
            >
              ยกเลิก
            </button>
          </div>
        ) : activeOrderInfo ? (
          <div
            onClick={() => setStage("tracking")}
            className="w-full max-w-lg bg-gradient-to-r from-emerald-50 via-white to-emerald-50/70 border border-emerald-300/80 hover:border-emerald-400 rounded-[20px] p-3.5 flex items-center justify-between shadow-xs transition-all active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Receipt className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-950">
                    คุณมีออเดอร์คิว {activeOrderInfo.queueNumber}{formatQueueDayBadge(activeOrderInfo.dailyQueueIndex, activeOrderInfo.createdAt) ? ` (${formatQueueDayBadge(activeOrderInfo.dailyQueueIndex, activeOrderInfo.createdAt)})` : ""}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {activeOrderInfo.status === "cooking"
                      ? "กำลังทำ"
                      : activeOrderInfo.status === "ready"
                      ? "พร้อมรับแล้ว"
                      : "รอดำเนินการ"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium truncate">
                  กดเพื่อดูสถานะคิวและการทำสดแบบ Real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:translate-x-0.5 transition-all shrink-0 pl-2">
              <span>ติดตาม</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : null}

        {/* รายการเครปในตะกร้า */}
        <div className="w-full max-w-lg flex flex-col gap-3.5 animate-fade-up">
          {cartItems.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center space-y-3 border border-zinc-200/70">
              <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">ไม่มีสินค้าในตะกร้า</p>
              <button
                onClick={handleAddNewCrepe}
                style={{ backgroundColor: "var(--brand-500, #E11D48)" }}
                className="py-2.5 px-5 text-white font-bold rounded-full text-xs shadow-md shadow-rose-500/20 hover:opacity-95 active:scale-95 transition cursor-pointer"
              >
                เลือกจัดเครป
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, idx) => {
                const details = parseCrepeDetails(item);
                return (
                  <div
                    key={item.id || idx}
                    className="bg-white rounded-[24px] p-4 shadow-xs border border-zinc-200/70 space-y-3 transition-all hover:border-brand-300/80"
                  >
                    <div
                      onClick={() => handleEditCartItem(idx)}
                      className="flex items-start justify-between gap-3 cursor-pointer group select-none"
                      title="คลิกเพื่อแก้ไขตัวเลือกและไส้"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight group-hover:text-brand-600 transition-colors">
                          {details.crust}
                        </h3>
                        <p className="text-xs text-zinc-700 leading-snug">
                          <span className="text-zinc-500 font-medium">ไส้: </span>
                          <span className="text-zinc-900 font-bold">{details.toppings}</span>
                        </p>
                        {details.note && (
                          <div className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 text-[10px] font-medium">
                            หมายเหตุ: {details.note}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-black text-zinc-900 font-mono shrink-0">
                        ฿{item.price * item.quantity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                    {/* ปุ่มปรับลด/เพิ่มจำนวน */}
                    <div className="flex items-center bg-zinc-100 rounded-full p-0.5 border border-zinc-200/60 shadow-inner">
                      <button
                        onClick={() => {
                          setCartItems((prev) =>
                            prev
                              .map((it) => (it.id === item.id ? { ...it, quantity: it.quantity - 1 } : it))
                              .filter((it) => it.quantity > 0)
                          );
                        }}
                        aria-label="ลดจำนวน"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white transition active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-black">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setCartItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, quantity: it.quantity + 1 } : it))
                          );
                        }}
                        aria-label="เพิ่มจำนวน"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white transition active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* ปุ่มแก้ไข */}
                      <button
                        type="button"
                        onClick={() => handleEditCartItem(idx)}
                        className="px-3 py-1 rounded-full text-xs font-bold text-zinc-600 hover:text-brand-600 hover:bg-brand-50 border border-zinc-200/80 transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>แก้ไข</span>
                      </button>

                      {/* ปุ่มลบ */}
                      <button
                        onClick={() => setCartItems((prev) => prev.filter((it) => it.id !== item.id))}
                        aria-label="ลบรายการ"
                        title="ลบรายการนี้"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

          {/* ปุ่มสั่งเครปเพิ่มอีกชิ้น */}
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={handleAddNewCrepe}
              className="w-full py-3.5 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded-full text-xs border border-zinc-200 shadow-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สั่งเครปเพิ่มอีกชิ้น</span>
            </button>
          )}

          {/* คอมโพเนนต์เลือกเวลานัดรับสินค้า */}
          {cartItems.length > 0 && !editingPendingOrderId && (
            <PickupTimeSelector
              value={pickupSelection}
              onChange={(val) => setPickupSelection(val)}
              asapMinutes={liveQueue.estimatedMinutes || 15}
            />
          )}

          {/* สรุปยอดรวมในตะกร้า */}
          {cartItems.length > 0 && (
            <div className="bg-white rounded-[24px] p-4 shadow-xs border border-zinc-200/70 flex items-center justify-between text-xs font-bold text-zinc-800">
              <span className="text-zinc-500">ราคารวมในตะกร้า</span>
              <span className="text-lg font-black text-zinc-900 tracking-tight">฿{cartTotalAmount}</span>
            </div>
          )}
        </div>

        {/* แถบดำเนินการชำระเงิน/ยืนยันคำสั่งซื้อแบบ Sticky ด้านล่าง */}
        {cartItems.length > 0 && (() => {
          const isPickupTimeInvalid = !editingPendingOrderId && pickupSelection.type === "scheduled" && !pickupSelection.scheduledTime?.trim();
          return (
            <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-zinc-200/80 flex flex-col items-center z-40 gap-1.5">
              {isPickupTimeInvalid && (
                <div className="w-full max-w-lg text-center">
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-3 py-1 rounded-full animate-pulse inline-block">
                    กรุณาระบุช่วงเวลานัดรับสินค้าด้านบนก่อนกดยืนยัน
                  </span>
                </div>
              )}
              <div className="w-full max-w-lg flex items-center justify-between gap-4">
                <div className="flex flex-col pl-1">
                  <span className="text-[11px] font-medium text-zinc-500">ยอดชำระทั้งหมด</span>
                  <span className="text-xl font-black text-zinc-900 font-mono tracking-tight">
                    ฿{cartTotalAmount}
                  </span>
                </div>

                {editingPendingOrderId ? (
                  <button
                    type="button"
                    onClick={handleSaveEditedPendingOrder}
                    disabled={cartItems.length === 0}
                    style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                    className="flex-1 py-4 px-6 text-white font-bold rounded-full text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>บันทึกการแก้ไขออเดอร์</span>
                    <ArrowRight className="w-4 h-4 text-white/90" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToConfirmOrder}
                    disabled={cartItems.length === 0 || isPickupTimeInvalid}
                    style={
                      isPickupTimeInvalid
                        ? { backgroundColor: "#9CA3AF" }
                        : { backgroundColor: "var(--brand-500, #F43F5E)" }
                    }
                    className="flex-1 py-4 px-6 text-white font-bold rounded-full text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>ยืนยันคำสั่งซื้อ</span>
                    <ArrowRight className="w-4 h-4 text-white/90" />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        <FastLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            setIsLoginModalOpen(false);
            setIsConfirmOrderModalOpen(true);
          }}
          onBrowseMenuWithoutLogin={() => setIsLoginModalOpen(false)}
          onOpenHelp={() => {
            setTourStep(2);
            setIsTourModalOpen(true);
          }}
        />

        <ConfirmOrderModal
          isOpen={isConfirmOrderModalOpen}
          onClose={() => setIsConfirmOrderModalOpen(false)}
          onConfirm={async (paymentMethod, customInfo) => {
            await handlePaymentSuccess(paymentMethod, customInfo);
          }}
          onUpdateCustomerInfo={(nickname, phone) => {
            const updated = {
              nickname: nickname || "ลูกค้า",
              phone: phone || "",
              customer_id: currentUser?.customer_id,
            };
            setCurrentUser(updated);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("crepe_user", JSON.stringify(updated));
              } catch {}
            }
          }}
          items={cartItems}
          totalAmount={cartTotalAmount}
          customerNickname={currentUser?.nickname || ""}
          customerPhone={currentUser?.phone || ""}
          pickupInfo={{
            type: pickupSelection.type === "asap" ? "now" : "scheduled",
            scheduledTime: pickupSelection.scheduledTime,
            asapMinutes: liveQueue.estimatedMinutes || 15,
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </div>
    );
  }

  // STAGE 06: หน้าชำระเงิน (PAYMENT SCREEN)
  if (stage === "payment") {
    return (
      <>
        <PaymentCheckoutView
          totalAmount={activeOrder?.totalAmount || cartTotalAmount}
          qrImageUrl={shopDetails?.promptPayQrImage || shopDetails?.qrpayment_url}
          promptPayNumber={shopDetails?.promptPayNumber}
          promptPayName={shopDetails?.promptPayName}
          bankName={shopDetails?.bankName}
          bankAccountNumber={shopDetails?.bankAccountNumber}
          bankAccountName={shopDetails?.bankAccountName}
          onBack={() => setStage(activeOrder ? "tracking" : "cart")}
          onPaid={handlePaymentSuccess}
          onCancel={() => setStage(activeOrder ? "tracking" : "cart")}
          onOpenHelp={() => {
            setTourStep(4);
            setIsTourModalOpen(true);
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </>
    );
  }

  // STAGE 07: หน้าบัตรคิวเมื่อสั่งสำเร็จ (ORDER SUCCESS & QUEUE TOKEN)
  if (stage === "success") {
    return (
      <>
        <OrderSuccessTokenView
          queueNumber={activeOrder?.queueNumber || "-"}
          queuesAhead={liveQueue.waitingCount}
          estimatedMinutes={liveQueue.estimatedMinutes}
          currentCookingQueue={liveQueue.currentCookingQueue}
          orderNumber={activeOrder?.orderNumber || "-"}
          customerNickname={currentUser?.nickname || activeOrder?.customerNickname || "ลูกค้า"}
          customerPhone={currentUser?.phone || activeOrder?.customerPhone || ""}
          pickupQrPayload={activeOrder?.pickupQrPayload}
          onViewLiveStatus={() => setStage("tracking")}
          onOpenHelp={() => {
            setTourStep(5);
            setIsTourModalOpen(true);
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </>
    );
  }

  // STAGE 08: หน้าติดตามสถานะคิวสดแบบ Real-time (LIVE ORDER TRACKING)
  if (stage === "tracking") {
    return (
      <>
        <LiveOrderTrackingView
          queueNumber={activeOrder?.queueNumber || "-"}
          dailyQueueIndex={activeOrder?.dailyQueueIndex}
          createdAt={activeOrder?.createdAt}
          currentCookingQueue={liveQueue.currentCookingQueue}
          queuesAhead={liveQueue.queuesAhead}
          status={activeOrder?.status || "pending"}
          confirmedAt={activeOrder?.confirmedAt || "-"}
          cookingAt={activeOrder?.cookingAt}
          readyAt={activeOrder?.readyAt}
          estimatedRemainingMinutes={liveQueue.estimatedRemainingMinutes || liveQueue.estimatedMinutes || 15}
          items={activeOrder?.items || []}
          totalAmount={activeOrder?.totalAmount || 0}
          paymentMethod={activeOrder?.paymentMethod || "promptpay"}
          paymentStatus={activeOrder?.paymentStatus || "pending"}
          pickupQrPayload={activeOrder?.pickupQrPayload}
          promptPayQrImage={shopDetails?.promptPayQrImage || shopDetails?.qrpayment_url}
          promptPayNumber={shopDetails?.promptPayNumber || shopDetails?.promptpay_number || shopDetails?.bankAccountNumber}
          promptPayName={shopDetails?.promptPayName || shopDetails?.promptpay_name || shopDetails?.bankAccountName}
          bankName={shopDetails?.bankName || shopDetails?.bank_name}
          bankAccountNumber={shopDetails?.bankAccountNumber || shopDetails?.bank_account_number}
          bankAccountName={shopDetails?.bankAccountName || shopDetails?.bank_account_name}
          hasSlip={Boolean(activeOrder?.hasSlip || activeOrder?.slipUrl || (activeOrder as any)?.slip_url || (activeOrder as any)?.has_slip)}
          slipUrl={activeOrder?.slipUrl || (activeOrder as any)?.slip_url}
          onSlipUploaded={(uploadedUrl) => {
            setActiveOrder((prev: any) => {
              const updated = {
                ...prev,
                hasSlip: true,
                slipUrl: uploadedUrl,
              };
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updated));
                } catch {}
              }
              return updated;
            });
            setActiveOrders((prev) =>
              prev.map((o) =>
                String(o.id) === String(activeOrder?.id)
                  ? { ...o, hasSlip: true, slipUrl: uploadedUrl }
                  : o
              )
            );
          }}
          shopPhone={shopDetails?.phone || (shopDetails as any)?.restaurant_phone || ""}
          onCallShop={() => {
            const rawPhone = shopDetails?.phone || (shopDetails as any)?.restaurant_phone || "";
            if (rawPhone && rawPhone.trim()) {
              const cleanDigits = rawPhone.replace(/[^0-9+]/g, "");
              window.location.href = `tel:${cleanDigits}`;
            } else {
              setIsContactModalOpen(true);
            }
          }}
          menuAvailabilityMap={menuAvailabilityMap}
          ordersList={activeOrders.map((o) => ({
            id: String(o.id),
            queueNumber: String((o.queueNumber && o.queueNumber !== "-") ? o.queueNumber : (o.id ? `A${String(o.id).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : "A001")),
            dailyQueueIndex: o.dailyQueueIndex,
            createdAt: (o as any).createdAt,
            status: String(o.status),
            paymentStatus: String(o.paymentStatus || (o as any).payment_status || "pending"),
            paymentMethod: String(o.paymentMethod || (o as any).payment_method || "promptpay"),
            totalAmount: Number(o.totalAmount) || 0,
            itemCount: Array.isArray(o.items) ? o.items.length : 1,
          }))}
          selectedOrderId={activeOrder?.id || selectedOrderId || undefined}
          onSelectOrder={(orderId) => {
            const found = activeOrders.find((o) => String(o.id) === String(orderId));
            if (found) {
              setSelectedOrderId(found.id);
              setActiveOrder(found);
            }
          }}
          onNewOrder={() => {
            handleAddNewCrepe();
          }}
          onEditOrder={() => {
            handleEditPendingOrder(activeOrder);
          }}
          onChangePaymentMethod={async (method) => {
            if (activeOrder?.id) {
              try {
                await CustomerApi.updatePaymentMethod(activeOrder.id, method);
                setActiveOrder((prev: any) => {
                  const updated = {
                    ...prev,
                    paymentMethod: method,
                    paymentStatus: "pending",
                  };
                  if (typeof window !== "undefined") {
                    try {
                      localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updated));
                    } catch {}
                  }
                  return updated;
                });
                if (method === "cash") {
                  toast.success("เปลี่ยนรูปแบบการชำระเป็นเงินสดหน้าร้านเรียบร้อยแล้ว");
                } else {
                  toast.success("เปลี่ยนรูปแบบการชำระเป็น QR พร้อมเพย์เรียบร้อยแล้ว");
                }
              } catch {
                toast.error("ไม่สามารถเปลี่ยนรูปแบบการชำระได้ กรุณาลองใหม่อีกครั้ง");
              }
            }
          }}
          onPayNow={() => setStage("payment")}
          onNotifyCash={async () => {
            if (activeOrder?.id) {
              try {
                await CustomerApi.updatePaymentMethod(activeOrder.id, "cash");
                toast.success("เปลี่ยนรูปแบบการชำระเป็นเงินสดหน้าร้านเรียบร้อยแล้ว");
                setActiveOrder((prev: any) => {
                  const updated = {
                    ...prev,
                    paymentMethod: "cash",
                    paymentStatus: "pending",
                  };
                  if (typeof window !== "undefined") {
                    try {
                      localStorage.setItem(`crepe_active_order_${tableId}`, JSON.stringify(updated));
                    } catch {}
                  }
                  return updated;
                });
              } catch {
                toast.error("ไม่สามารถเปลี่ยนรูปแบบการชำระได้ กรุณาลองใหม่อีกครั้ง");
              }
            }
          }}
          onBack={() => setStage("landing")}
          onOpenHelp={() => {
            setTourStep(6);
            setIsTourModalOpen(true);
          }}
        />

        <RestaurantContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          restaurant={
            shopDetails || {
              id: currentShopId,
              name: storeName,
              description: storeDescription,
              logoUrl: storeLogo,
              bannerUrl: storeBanner,
              phone: storeName ? (shopDetails?.phone || (shopDetails as any)?.restaurant_phone) : undefined,
            }
          }
          branding={{
            primaryColor: "#e11d48",
            secondaryColor: "#fb7185",
            accentColor: "#f43f5e",
            logoUrl: storeLogo,
          }}
        />

        <GuidedTourModal
          isOpen={isTourModalOpen}
          initialStep={tourStep}
          onClose={() => setIsTourModalOpen(false)}
        />
      </>
    );
  }

  return null;
}
