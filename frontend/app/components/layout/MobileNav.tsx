/**
 * @file MobileNav.tsx
 * @description แถบนำทางด้านล่าง (MobileBottomNav) และส่วนหัวด้านบน (MobileTopHeader) สำหรับอุปกรณ์พกพาในส่วนของร้านค้า
 */

"use client";

import { cn } from "@/app/lib/utils";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutModal } from "@/app/components/ui/LogoutModal";
import { useState } from "react";
import { useRestaurant } from "@/app/(restaurant)/restaurant/RestaurantProvider";
import { formatDriveImageUrl } from "@/app/lib/utils";
import { SafeImage } from "@/app/components/ui/SafeImage";

/** โครงสร้างรายการนำทาง */
interface NavItem {
  href: string;
  icon: any;
  label: string;
  badge?: number;
}

/** พร็อพส์สำหรับ MobileBottomNav */
interface MobileBottomNavProps {
  variant?: "restaurant" | "admin";
}

/**
 * คอมโพเนนต์ MobileBottomNav
 * แถบนำทางด้านล่างบนจอมือถือสำหรับผู้จัดการร้าน
 */
export function MobileBottomNav({ variant = "restaurant" }: MobileBottomNavProps) {
  const pathname = usePathname();
  // สถานะเปิด/ปิด Modal ยืนยันการออกจากระบบ
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  let todayCount = 0;
  try {
    const ctx = useRestaurant();
    todayCount = ctx.todayOrderCount || 0;
  } catch {}

  // รายการเมนูสำหรับร้านค้า
  const restaurantNav: NavItem[] = [
    { href: "/restaurant/queue",    icon: ClipboardList, label: "คิว",      badge: todayCount > 0 ? todayCount : undefined },
    { href: "/restaurant/summary",  icon: BarChart3,     label: "สรุปยอด" },
    { href: "/restaurant/settings", icon: Settings,      label: "ตั้งค่า" },
    { href: "/restaurant/profile",  icon: User,          label: "โปรไฟล์" },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border safe-bottom">
        <div className="flex items-stretch justify-around">
          {restaurantNav.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-colors",
                  isActive ? "text-brand-600" : "text-text-3 hover:text-text"
                )}
              >
                {/* แถบสีไฮไลต์เมนูที่เลือก */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-b-full" />
                )}
                <span className="relative">
                  <item.icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                  {item.badge && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className={cn("text-[10px] font-medium tracking-tight", isActive ? "text-brand-600 font-bold" : "text-text-3")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* ปุ่มออกจากระบบบนมือถือ พร้อมเปิด Modal ยืนยัน */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-colors text-danger/80 hover:text-danger active:scale-95 cursor-pointer"
          >
            <span className="relative">
              <LogOut size={19} strokeWidth={1.75} />
            </span>
            <span className="text-[10px] font-medium text-danger/90 tracking-tight">
              ออกระบบ
            </span>
          </button>
        </div>
      </nav>

      {/* Modal ยืนยันการออกจากระบบ */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}

/** พร็อพส์สำหรับ MobileTopHeader */
interface MobileTopHeaderProps {
  /** ชื่อหัวข้อของหน้า */
  title: string;
  /** คำอธิบายย่อย */
  subtitle?: string;
  /** URL รูปภาพโลโก้ร้าน */
  logoUrl?: string | null;
  /** ไอคอนเสริม */
  icon?: React.ReactNode;
  /** คอมโพเนนต์ฝั่งขวา เช่น ปุ่มกดหรือข้อความพิเศษ */
  right?: React.ReactNode;
}

/**
 * คอมโพเนนต์ MobileTopHeader
 * แสดงส่วนหัวด้านบนของร้านค้าสำหรับหน้าจอขนาดเล็ก (< lg)
 */
export function MobileTopHeader({ title, subtitle, logoUrl, icon, right }: MobileTopHeaderProps) {
  const formattedLogo = logoUrl ? formatDriveImageUrl(logoUrl) : null;

  return (
    <header className="lg:hidden bg-surface border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
      {/* โลโก้ร้านค้า */}
      <div className="w-8 h-8 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden p-0.5">
        <SafeImage
          src={formattedLogo || "/LogoSquare.png"}
          alt={title || "Store Logo"}
          className="w-full h-full object-cover rounded-[8px]"
          fallbackType="logo"
        />
      </div>
      {/* ชื่อและคำอธิบายหน้า */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text text-sm leading-tight truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-text-3 leading-tight">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
