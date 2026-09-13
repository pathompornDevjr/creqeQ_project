/**
 * @file RestaurantSidebar.tsx
 * @description เมนูด้านข้าง (Sidebar) สำหรับหน้าแดชบอร์ดร้านค้าบนหน้าจอคอมพิวเตอร์/แท็บเล็ต
 * รองรับการย่อ/ขยาย (Collapsible), แสดงจำนวนคิวปัจจุบัน และปุ่มออกจากระบบพร้อม Modal ยืนยัน
 */

"use client";

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { LogoutModal } from "@/app/components/ui/LogoutModal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useRestaurant } from "@/app/(restaurant)/restaurant/RestaurantProvider";
import { formatDriveImageUrl } from "@/app/lib/utils";
import { SafeImage } from "@/app/components/ui/SafeImage";

/** พร็อพส์สำหรับคอมโพเนนต์ RestaurantSidebar */
interface RestaurantSidebarProps {
  /** ชื่อร้านอาหาร */
  restaurantName?: string;
  /** URL รูปภาพโลโก้ร้าน */
  restaurantLogo?: string;
  /** จำนวนออเดอร์/คิวของวันนี้ */
  todayOrderCount?: number;
}

/**
 * คอมโพเนนต์ RestaurantSidebar
 */
export function RestaurantSidebar({ restaurantName, restaurantLogo, todayOrderCount }: RestaurantSidebarProps) {
  // สถานะการย่อ/ขยาย Sidebar
  const [collapsed, setCollapsed] = useState(false);
  // สถานะการเปิด/ปิด Modal ออกจากระบบ
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const { restaurant, todayOrderCount: contextCount } = useRestaurant();

  const count = todayOrderCount !== undefined ? todayOrderCount : contextCount;
  const rawLogo = restaurantLogo || restaurant?.logoUrl || (restaurant as any)?.restaurant_logo;
  const formattedLogo = rawLogo ? formatDriveImageUrl(rawLogo) : null;
  const displayName = restaurantName || restaurant?.name || (restaurant as any)?.restaurant_name || "ร้านเครป CrepeQ";

  // รายการเมนูหลักในแถบด้านข้าง
  const navItems = [
    { href: "/restaurant/queue", icon: ClipboardList, label: "คิวออเดอร์", badge: count > 0 ? count : undefined },
    { href: "/restaurant/summary", icon: BarChart3, label: "สรุปยอดขาย" },
    { href: "/restaurant/settings", icon: Settings, label: "ตั้งค่าร้าน" },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", damping: 28, stiffness: 350 }}
      className="relative flex flex-col h-screen bg-surface border-r border-border flex-shrink-0 overflow-hidden"
    >
      {/* ส่วนหัวแสดงโลโก้และชื่อร้าน */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0",
        collapsed && "justify-center px-0"
      )}>
        <div className="w-9 h-9 rounded-[12px] bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden p-0.5">
          <SafeImage 
            src={formattedLogo || "/LogoSquare.png"} 
            alt={displayName} 
            className="w-full h-full object-cover rounded-[10px]" 
            fallbackType="logo"
          />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <p className="text-sm font-bold text-text truncate">{displayName}</p>
              <p className="text-[10px] text-brand-600 font-bold">ระบบจัดการร้านค้าครบวงจร</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* รายการเมนูนำทาง (Navigation Links) */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] transition-all duration-150 group relative",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-brand-500 text-white shadow-brand"
                  : "text-text-2 hover:bg-surface-3 hover:text-text"
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium truncate flex-1 flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && !collapsed && (
                <span className={cn(
                  "text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                  isActive ? "bg-white/30 text-white" : "bg-brand-500 text-white"
                )}>
                  {item.badge}
                </span>
              )}
              {/* Tooltip เมื่ออยู่ในสถานะย่อ Sidebar */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-text text-white text-xs rounded-[6px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                  {item.badge && ` (${item.badge})`}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* เมนูส่วนท้าย: โปรไฟล์ร้าน และปุ่มออกจากระบบ */}
      <div className="px-2 pb-3 space-y-1 border-t border-border pt-3">
        <Link href="/restaurant/profile" className={cn(
          "w-full flex items-center gap-3 rounded-[10px] text-text-2 hover:bg-surface-3 hover:text-text transition-all duration-150 group relative",
          collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
        )}>
          <User size={18} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium flex-1 text-left">
                โปรไฟล์ร้าน
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-text text-white text-xs rounded-[6px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              โปรไฟล์ร้าน
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className={cn(
            "w-full flex items-center gap-3 rounded-[10px] text-danger hover:bg-red-50 transition-all duration-150 group relative cursor-pointer text-left",
            collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
          )}
        >
          <LogOut size={18} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                ออกจากระบบ
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Modal ยืนยันการออกจากระบบ */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />

      {/* ปุ่มกดพับ/ขยาย Sidebar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-20 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center text-text-3 hover:text-text hover:border-brand-400 hover:shadow-md transition-all shadow-sm z-10 cursor-pointer"
        title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  );
}
