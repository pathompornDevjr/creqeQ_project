/**
 * @file layout.tsx (Restaurant Layout)
 * @description เลย์เอาต์หลักสำหรับส่วนจัดการร้านค้า (Restaurant Dashboard Layout)
 * รวม Sidebar, Mobile Top Header, Mobile Bottom Nav, และ RestaurantProvider เข้าด้วยกัน
 */

"use client";

import { RestaurantSidebar } from "@/app/components/layout/RestaurantSidebar";
import { MobileBottomNav, MobileTopHeader } from "@/app/components/layout/MobileNav";
import { RestaurantLayoutSkeleton } from "@/app/components/skeletons/RestaurantLayoutSkeleton";
import { RestaurantProvider, useRestaurant } from "./RestaurantProvider";
import { Store } from "lucide-react";
import { Suspense } from "react";

/**
 * คอมโพเนนต์ภายในที่อ่านข้อมูลร้านค้าจาก RestaurantContext เพื่อแสดงผล Header และ Sidebar
 */
function RestaurantLayoutContent({ children }: { children: React.ReactNode }) {
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return <RestaurantLayoutSkeleton />;
  }

  return (
    <div className="flex h-dvh bg-surface-2 overflow-hidden relative">
      {/* Sidebar สำหรับหน้าจอขนาดใหญ่ (Desktop) */}
      <div className="hidden lg:flex">
        <RestaurantSidebar 
          restaurantName={restaurant?.name || (restaurant as any)?.restaurant_name || "ร้านเครป CrepeQ"}
          restaurantLogo={restaurant?.logoUrl || (restaurant as any)?.restaurant_logo}
        />
      </div>

      {/* พื้นที่หลักของเนื้อหาในหน้า Dashboard */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header สำหรับหน้าจอมือถือ (Mobile Top Header) */}
        <MobileTopHeader
          title={restaurant?.name || (restaurant as any)?.restaurant_name || "ร้านเครป CrepeQ"}
          subtitle="ระบบจัดการร้านค้าครบวงจร"
          logoUrl={restaurant?.logoUrl || (restaurant as any)?.restaurant_logo}
          icon={<Store size={16} className="text-white" />}
        />

        {/* ส่วนเนื้อหาของเพจที่สามารถ Scroll ได้ */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto min-w-0 pb-[70px] lg:pb-12">
          {children}
        </main>
      </div>

      {/* แถบนำทางด้านล่างสำหรับมือถือ (Mobile Bottom Nav) */}
      <MobileBottomNav variant="restaurant" />
    </div>
  );
}

/**
 * RestaurantLayout Component
 * ห่อหุ้มโครงสร้างด้วย Suspense และ RestaurantProvider
 */
export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RestaurantLayoutSkeleton />}>
      <RestaurantProvider>
        <RestaurantLayoutContent>{children}</RestaurantLayoutContent>
      </RestaurantProvider>
    </Suspense>
  );
}
