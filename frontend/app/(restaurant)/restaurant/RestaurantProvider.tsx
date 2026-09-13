/**
 * @file RestaurantProvider.tsx
 * @description Context Provider จัดการ State สากลของร้านค้า (Restaurant Global Context)
 * จัดการข้อมูลโปรไฟล์ร้าน, จำนวนออเดอร์วันนี้, การเชื่อมต่อ WebSocket แบบ Real-time, และชุดสีธีม
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RestaurantApi, RestaurantProfileDTO } from "@/app/lib/api";
import { AuthApi } from "@/app/lib/api/auth.api";
import { generateThemeStyles } from "@/app/lib/theme";
import { useRestaurantRealtime, RealtimeOrderEvent } from "@/app/lib/useRestaurantRealtime";

/** อินเตอร์เฟซสถานะแพ็กเกจการใช้งานร้านค้า */
export interface SubscriptionStatus {
  isPackageExpired: boolean;
  hasPendingPayment: boolean;
  daysRemaining: number;
  activePlanName: string;
  formattedExpiryDate: string;
  expiryDate: Date | null;
}

/** ฟังก์ชันประเมินสถานะแพ็กเกจ */
export function evaluateSubscriptionStatus(): SubscriptionStatus {
  return {
    isPackageExpired: false,
    hasPendingPayment: false,
    daysRemaining: 999,
    activePlanName: "พรีเมียม",
    formattedExpiryDate: "เปิดใช้งานตามปกติ",
    expiryDate: null,
  };
}

/** โครงสร้าง Type ของ Restaurant Context */
interface RestaurantContextType {
  restaurant: RestaurantProfileDTO | null;
  todayOrderCount: number;
  isLoading: boolean;
  isConnected: boolean;
  lastEventTime: Date | null;
  isPackageExpired: boolean;
  hasPendingPayment: boolean;
  daysRemaining: number;
  activePlanName: string;
  formattedExpiryDate: string;
  refreshRestaurant: () => Promise<void>;
  refreshOrdersCount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  setTodayOrderCount: React.Dispatch<React.SetStateAction<number>>;
  subscribeRealtimeEvent: (handler: (event: RealtimeOrderEvent) => void) => () => void;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  todayOrderCount: 0,
  isLoading: true,
  isConnected: false,
  lastEventTime: null,
  isPackageExpired: false,
  hasPendingPayment: false,
  daysRemaining: 999,
  activePlanName: "พรีเมียม",
  formattedExpiryDate: "เปิดใช้งานตามปกติ",
  refreshRestaurant: async () => {},
  refreshOrdersCount: async () => {},
  refreshSubscription: async () => {},
  setTodayOrderCount: () => {},
  subscribeRealtimeEvent: () => () => {},
});

/** Custom Hook สำหรับเข้าถึง Context ของร้านค้า */
export const useRestaurant = () => useContext(RestaurantContext);

/**
 * RestaurantProvider Component
 */
export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantProfileDTO | null>(null);
  const [todayOrderCount, setTodayOrderCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // เก็บอ้างอิงข้อมูลร้านค้าล่าสุดเพื่อป้องกัน Callback Recreating ซ้ำซ้อน
  const restaurantRef = useRef<RestaurantProfileDTO | null>(null);
  restaurantRef.current = restaurant;

  // รายการ Callback Subscriber ที่ติดตาม Event จาก WebSocket
  const subscribersRef = useRef<Set<(event: RealtimeOrderEvent) => void>>(new Set());

  /** ลงทะเบียนรับ Event จาก Real-time */
  const subscribeRealtimeEvent = useCallback((handler: (event: RealtimeOrderEvent) => void) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const currentRestaurantId = restaurant?.id ?? (restaurant as any)?.res_id ?? (restaurant as any)?.restaurantId;

  /** ดึงจำนวนออเดอร์ของวันนี้ที่ยังดำเนินการอยู่ */
  const fetchOrdersCount = useCallback(async (restId?: string | number) => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const targetId = restId || restaurantRef.current?.id || (restaurantRef.current as any)?.res_id;
      const ordersRes = await RestaurantApi.getOrders(undefined, targetId, todayStr);
      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        const activeOrders = ordersRes.data.filter((o) => {
          const status = String(o.status || "").toLowerCase().trim();
          const isCancelled = status === "cancelled" || (o as any).isCancelled || status.includes("cancel");
          const isPaid = status === "paid";
          if (isCancelled || isPaid) return false;

          if (!o.createdAt) return true;
          const d = new Date(o.createdAt);
          const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return orderDateStr === todayStr;
        });
        setTodayOrderCount(activeOrders.length);
      }
    } catch (err) {
      console.warn("fetchOrdersCount error:", err);
    }
  }, []);

  // เชื่อมต่อ WebSocket สากลสำหรับทุกหน้าในกลุ่มร้านค้า
  const { isConnected, lastEventTime } = useRestaurantRealtime({
    restaurantId: currentRestaurantId,
    onOrderCreated: (newOrderRaw) => {
      fetchOrdersCount(currentRestaurantId);
      subscribersRef.current.forEach((sub) => {
        try {
          sub({
            type: "ORDER_CREATED",
            restaurantId: currentRestaurantId,
            data: newOrderRaw,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Error in realtime subscriber:", e);
        }
      });
    },
    onOrderStatusChanged: (updatedRaw) => {
      fetchOrdersCount(currentRestaurantId);
      subscribersRef.current.forEach((sub) => {
        try {
          sub({
            type: "ORDER_STATUS_CHANGED",
            restaurantId: currentRestaurantId,
            data: updatedRaw,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Error in realtime subscriber:", e);
        }
      });
    },
    onOrderUpdated: (updatedRaw) => {
      fetchOrdersCount(currentRestaurantId);
      subscribersRef.current.forEach((sub) => {
        try {
          sub({
            type: "ORDER_UPDATED",
            restaurantId: currentRestaurantId,
            data: updatedRaw,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Error in realtime subscriber:", e);
        }
      });
    },
  });

  /** โหลดข้อมูลร้านค้าและตรวจเช็คสิทธิ์ผู้ใช้ */
  const loadAllRestaurantData = useCallback(async (showLoading = false) => {
    if (showLoading && !restaurantRef.current) setIsLoading(true);
    try {
      const infoRes = await RestaurantApi.getInfo().catch((err) => ({ success: false, data: null, message: String(err) }));

      let restData: RestaurantProfileDTO | null = restaurantRef.current;
      if (infoRes.success && infoRes.data) {
        restData = infoRes.data;
        setRestaurant(infoRes.data);
        restaurantRef.current = infoRes.data;
      } else if (!restData) {
        const meRes = await AuthApi.me().catch(() => null);
        if (meRes && (!meRes.success || !meRes.data)) {
          router.replace("/login");
          return;
        }
      }

      if (!infoRes.success && !restData) {
        return;
      }

      const rId = restData?.id ?? (restData as any)?.res_id ?? (restData as any)?.restaurantId;
      if (rId) {
        fetchOrdersCount(rId);
      }
    } catch (err) {
      console.error("loadAllRestaurantData error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrdersCount, router]);

  // เรียกโหลดข้อมูลครั้งแรกเมื่อ Mount
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      loadAllRestaurantData(true);
    }
  }, [loadAllRestaurantData]);

  // ซิงค์ข้อมูลเบื้องหลังทุกๆ 30 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllRestaurantData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAllRestaurantData]);

  // คำนวณ CSS Theme Variable จากสีของร้าน
  const themeStyles = generateThemeStyles(
    restaurant?.primaryColor || restaurant?.themeColor,
    restaurant?.secondaryColor,
    restaurant?.accentColor
  );

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        todayOrderCount,
        isLoading,
        isConnected,
        lastEventTime,
        isPackageExpired: false,
        hasPendingPayment: false,
        daysRemaining: 999,
        activePlanName: "พรีเมียม",
        formattedExpiryDate: "เปิดใช้งานตามปกติ",
        refreshRestaurant: async () => {
          await loadAllRestaurantData(false);
        },
        refreshOrdersCount: async () => {
          const rId = restaurantRef.current?.id ?? (restaurantRef.current as any)?.res_id ?? (restaurantRef.current as any)?.restaurantId;
          await fetchOrdersCount(rId);
        },
        refreshSubscription: async () => {},
        setTodayOrderCount,
        subscribeRealtimeEvent,
      }}
    >
      <div style={themeStyles} className="contents">
        {children}
      </div>
    </RestaurantContext.Provider>
  );
}
