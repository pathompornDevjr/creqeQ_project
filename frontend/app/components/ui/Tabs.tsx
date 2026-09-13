"use client";

/**
 * =========================================================================================
 * @file Tabs.tsx
 * @description คอมโพเนนต์แถบแท็บแนวนอน (Tabs) และแถบเมนูนำทางแนวตั้ง (VerticalTabs)
 * 
 * หน้าที่หลัก:
 * - Tabs: แถบแท็บแนวนอนพร้อมแอนิเมชันแถบเลื่อนไฮไลท์ (LayoutId Spring Animation)
 * - VerticalTabs: แถบเมนูนำทางแนวตั้ง รองรับเมนูย่อยแบบพับเก็บได้ (Collapsible Sub-menus) และตัวนับ Badge
 * =========================================================================================
 */

import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

/** โครงสร้างข้อมูล Tab */
interface Tab {
  /** รหัสเฉพาะของแท็บ */
  id: string;
  /** ข้อความแสดงผลบนแท็บ */
  label: string;
  /** ไอคอนนำหน้า */
  icon?: React.ReactNode;
  /** ตัวเลข Badge แจ้งเตือน */
  badge?: number;
  /** รายการเมนูย่อย (สำหรับ VerticalTabs) */
  children?: Omit<Tab, "children">[];
}

/** Props ของคอมโพเนนต์ Tabs แนวนอน */
interface TabsProps {
  /** รายการแท็บ */
  tabs: Tab[];
  /** รหัสแท็บที่ถูกเลือกอยู่ในปัจจุบัน */
  active: string;
  /** ฟังก์ชันเมื่อมีการเปลี่ยนแท็บ */
  onChange: (id: string) => void;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/**
 * คอมโพเนนต์ Tabs แนวนอน
 */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex bg-surface-3 rounded-[12px] p-1 gap-1",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-colors duration-150 cursor-pointer",
            active === tab.id ? "text-brand-700" : "text-text-2 hover:text-text"
          )}
        >
          {active === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-surface shadow-sm rounded-[9px]"
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-brand-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Props ของคอมโพเนนต์ VerticalTabs แนวตั้ง */
interface VerticalTabsProps {
  /** รายการแท็บ */
  tabs: Tab[];
  /** รหัสแท็บที่เลือก */
  active: string;
  /** ฟังก์ชันเมื่อเปลี่ยนแท็บ */
  onChange: (id: string) => void;
  /** คลาสสไตล์ */
  className?: string;
}

/**
 * คอมโพเนนต์ VerticalTabs แนวตั้ง (ใช้ในเมนูแถบข้าง Settings Sidebar)
 */
export function VerticalTabs({ tabs, active, onChange, className }: VerticalTabsProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {tabs.map((tab) => {
        const hasChildren = !!tab.children && tab.children.length > 0;
        const isChildActive = hasChildren && tab.children!.some(c => c.id === active);
        const isActive = active === tab.id || isChildActive;
        const isOpen = openMenus[tab.id] !== undefined ? openMenus[tab.id] : isChildActive;

        return (
          <div key={tab.id} className="flex flex-col gap-1">
            <button
              onClick={(e) => hasChildren ? toggleMenu(tab.id, e) : onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium text-left transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-text-2 hover:bg-surface-3 hover:text-text"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
              )}
              {tab.icon}
              <span className="flex-1">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-brand-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {tab.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown size={14} className={cn("transition-transform", isOpen ? "rotate-180" : "opacity-50")} />
              )}
            </button>
            
            <AnimatePresence>
              {hasChildren && isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-1 pl-11"
                >
                  {tab.children!.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onChange(child.id)}
                      className={cn(
                        "text-sm font-medium text-left py-2 px-3 rounded-[8px] transition-all",
                        active === child.id ? "text-brand-700 bg-brand-50/50" : "text-text-3 hover:text-text hover:bg-surface-3"
                      )}
                    >
                      {child.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
