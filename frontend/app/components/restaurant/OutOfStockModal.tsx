/**
 * @file OutOfStockModal.tsx
 * @description Modal สำหรับร้านค้าเพื่อตั้งค่าแจ้งวัตถุดิบ/ไส้เครปหมดแบบชุด (Batch Availability)
 * รองรับการค้นหา, กรองหมวดหมู่, ดูเฉพาะที่หมด, สลับสถานะรายตัว และบันทึกข้อมูลพร้อมส่ง Realtime Alert
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban,
  Check,
  Search,
  X,
  Loader2,
  ChefHat,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { RestaurantApi, MenuItemDTO } from "@/app/lib/api";
import { cn, formatDriveImageUrl } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/Button";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { toast } from "sonner";

/** พร็อพส์สำหรับคอมโพเนนต์ OutOfStockModal */
export interface OutOfStockModalProps {
  /** สถานะเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อกดปิด Modal */
  onClose: () => void;
  /** รหัสร้านอาหาร */
  restaurantId?: string | number;
  /** Callback เมื่อบันทึกสำเร็จ */
  onSaved?: () => void;
}

/**
 * คอมโพเนนต์ OutOfStockModal
 */
export function OutOfStockModal({
  isOpen,
  onClose,
  restaurantId,
  onSaved,
}: OutOfStockModalProps) {
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  // แมปสถานะดั้งเดิมตอนเปิด Modal สำหรับเทียบการเปลี่ยนแปลง
  const [initialAvailabilityMap, setInitialAvailabilityMap] = useState<Record<string, boolean>>({});
  // แมปสถานะปัจจุบันใน Modal
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState<boolean>(false);

  // ดึงรายการเมนูทั้งหมดของร้านค้า
  const fetchMenuData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await RestaurantApi.getMenuItems();
      if (res.success && res.data) {
        setMenuItems(res.data);
        const map: Record<string, boolean> = {};
        res.data.forEach((item) => {
          const itemId = String(item.id);
          const isAvail = item.available !== false && (item as any).is_available !== false;
          map[itemId] = isAvail;
        });
        setInitialAvailabilityMap(map);
        setAvailabilityMap(map);
      }
    } catch (err) {
      console.error("Failed to load menu items for stock modal", err);
      toast.error("ไม่สามารถดึงข้อมูลเมนูได้ กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMenuData();
      setSearchQuery("");
      setSelectedCategory("all");
      setShowOnlyOutOfStock(false);
    }
  }, [isOpen, fetchMenuData]);

  // ดึงรายการหมวดหมู่ที่ไม่ซ้ำกัน
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return ["all", ...Array.from(set)];
  }, [menuItems]);

  // นับจำนวนรายการที่หมด
  const outOfStockCount = useMemo(() => {
    return Object.values(availabilityMap).filter((avail) => avail === false).length;
  }, [availabilityMap]);

  // นับจำนวนรายการที่มีการแก้ไข
  const changedCount = useMemo(() => {
    let count = 0;
    for (const id of Object.keys(availabilityMap)) {
      if (availabilityMap[id] !== initialAvailabilityMap[id]) {
        count++;
      }
    }
    return count;
  }, [availabilityMap, initialAvailabilityMap]);

  // กรองรายการสินค้าตามคำค้นหา หมวดหมู่ และตัวกรองเฉพาะที่หมด
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const itemId = String(item.id);
      const isAvail = availabilityMap[itemId] !== false;

      if (showOnlyOutOfStock && isAvail) {
        return false;
      }

      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.name || "").toLowerCase().includes(q);
        const catMatch = (item.category || "").toLowerCase().includes(q);
        if (!nameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [menuItems, availabilityMap, showOnlyOutOfStock, selectedCategory, searchQuery]);

  // สลับสถานะ มีของ / หมด ของแต่ละรายการ
  const toggleItemAvailability = (id: string | number) => {
    const key = String(id);
    setAvailabilityMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ตั้งค่าสถานะพร้อมกันทั้งหน้าจอที่แสดงผลอยู่
  const setBatchAvailabilityInView = (isAvailable: boolean) => {
    setAvailabilityMap((prev) => {
      const next = { ...prev };
      filteredItems.forEach((item) => {
        next[String(item.id)] = isAvailable;
      });
      return next;
    });
    toast.info(isAvailable ? "ตั้งค่ารายการที่แสดงเป็น 'มีของ' ทั้งหมดแล้ว" : "ตั้งค่ารายการที่แสดงเป็น 'หมด' ทั้งหมดแล้ว");
  };

  // คืนค่าเดิมก่อนการแก้ไข
  const resetChanges = () => {
    setAvailabilityMap(initialAvailabilityMap);
    toast.info("คืนค่าสถานะตั้งต้นแล้ว");
  };

  // บันทึกการเปลี่ยนแปลงสถานะสินค้าทั้งหมดไปยังเซิร์ฟเวอร์
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changedItems: Array<{ id: string | number; isAvailable: boolean }> = [];
      Object.keys(availabilityMap).forEach((id) => {
        if (availabilityMap[id] !== initialAvailabilityMap[id]) {
          changedItems.push({
            id: isNaN(Number(id)) ? id : Number(id),
            isAvailable: availabilityMap[id],
          });
        }
      });

      if (changedItems.length === 0) {
        toast.info("ไม่มีการเปลี่ยนแปลงสถานะ");
        onClose();
        return;
      }

      const res = await RestaurantApi.updateMenuBatchAvailability(changedItems);
      if (res.success) {
        toast.success(`บันทึกสถานะ ${changedItems.length} รายการเรียบร้อยแล้ว`, {
          description: "ส่งสัญญาณแจ้งเตือนไปยังออเดอร์ของลูกค้าในคิวรอยืนยันเรียบร้อย",
        });
        if (onSaved) onSaved();
        onClose();
      } else {
        toast.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Save out of stock items error", err);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
        {/* ฉากหลังสีทึบโปร่งแสง (Backdrop) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => !isSaving && onClose()}
        />

        {/* หน้าต่าง Modal */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="relative w-full sm:max-w-3xl bg-surface sm:rounded-[24px] rounded-t-[24px] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[92vh] sm:max-h-[85vh] border border-border"
        >
          {/* แถบดึงสำหรับจอมือถือ */}
          <div className="pt-3 px-4 flex flex-col items-center sm:hidden bg-surface">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* ส่วนหัวของ Modal */}
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface-2/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Ban size={20} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-text">แจ้งไส้หมด / วัตถุดิบหมด</h2>
                  {outOfStockCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      หมด {outOfStockCount} รายการ
                    </span>
                  )}
                  {changedCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      แก้ไข {changedCount} รายการ
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-3 truncate mt-0.5">
                  เลือกติ๊กไส้หรือเมนูที่หมด ระบบจะแจ้งเตือนลูกค้าในคิวรอยืนยันให้เปลี่ยนเมนูทันที
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          {/* แถบเครื่องมือค้นหา กรอง และการจัดการ */}
          <div className="p-3 sm:p-4 bg-surface border-b border-border space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* ช่องค้นหา */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อไส้, แป้ง, ท็อปปิ้ง, ซอส..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-border bg-surface-2 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-text-3"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* ปุ่มกรองด่วน: ดูเฉพาะที่หมด */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOnlyOutOfStock((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none",
                    showOnlyOutOfStock
                      ? "bg-red-50 border-red-300 text-red-700 shadow-2xs"
                      : "bg-surface-2 border-border text-text-2 hover:bg-surface-3"
                  )}
                >
                  <Ban size={13} className={showOnlyOutOfStock ? "text-red-600" : "text-text-3"} />
                  <span>ดูเฉพาะที่หมด</span>
                  {outOfStockCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
                      {outOfStockCount}
                    </span>
                  )}
                </button>

                {changedCount > 0 && (
                  <button
                    type="button"
                    onClick={resetChanges}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 text-text-3 hover:text-text text-xs font-semibold transition-all cursor-pointer"
                    title="คืนค่าเดิม"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden sm:inline">รีเซ็ต</span>
                  </button>
                )}
              </div>
            </div>

            {/* แถบแท็บหมวดหมู่ */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const label =
                  cat === "all" ? "ทั้งหมด" :
                  cat === "crepe" ? "เครป / แป้ง" :
                  cat === "topping" ? "ไส้และท็อปปิ้ง" :
                  cat === "drink" ? "เครื่องดื่ม" : cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border text-xs",
                      isSelected
                        ? "bg-brand-500 text-white border-brand-500 shadow-2xs"
                        : "bg-surface-2 text-text-2 border-border hover:bg-surface-3 hover:text-text"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* รายการเมนูและไส้เครป */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-surface-2/40 custom-scrollbar">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-text-3">
                <Loader2 size={28} className="animate-spin text-brand-600" />
                <p className="text-xs font-semibold">กำลังโหลดรายการเมนูและวัตถุดิบ...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-text-3">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-2 border border-border">
                  <Search size={20} className="text-text-3" />
                </div>
                <p className="text-sm font-semibold text-text">ไม่พบรายการที่ค้นหา</p>
                <p className="text-xs text-text-3 mt-0.5">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredItems.map((item) => {
                  const itemId = String(item.id);
                  const isAvailable = availabilityMap[itemId] !== false;
                  const isOutOfStock = !isAvailable;
                  const isModified = availabilityMap[itemId] !== initialAvailabilityMap[itemId];
                  const rawImg = item.image || (item as any).images?.[0]?.image_url || (item as any).images?.[0];

                  return (
                    <div
                      key={itemId}
                      onClick={() => toggleItemAvailability(itemId)}
                      className={cn(
                        "group relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none",
                        isOutOfStock
                          ? "bg-red-50/70 border-red-300 hover:border-red-400 shadow-2xs"
                          : "bg-surface border-border hover:border-brand-300 hover:bg-surface-2/50 shadow-2xs",
                        isModified && "ring-2 ring-amber-400/80"
                      )}
                    >
                      {/* รูปภาพและรายละเอียด */}
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-surface-3 shrink-0 border border-border/80 shadow-2xs flex items-center justify-center">
                          <SafeImage
                            src={rawImg}
                            alt={item.name}
                            className={cn("w-full h-full object-cover", isOutOfStock && "grayscale-[60%] opacity-70")}
                            fallback={
                              <div className="w-full h-full flex items-center justify-center bg-brand-50 text-brand-600">
                                <ChefHat size={16} />
                              </div>
                            }
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-red-950/30 flex items-center justify-center">
                              <Ban size={16} className="text-red-500 drop-shadow" />
                            </div>
                          )}
                        </div>

                        {/* ชื่อและราคา */}
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs sm:text-sm font-bold truncate leading-tight",
                              isOutOfStock ? "text-red-950 line-through opacity-85" : "text-text"
                            )}
                          >
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold text-brand-700">
                              ฿{item.price}
                            </span>
                            {item.category && (
                              <span className="text-[10px] text-text-3 px-1.5 py-0.2 rounded bg-surface-2 border border-border/60">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* สวิตช์ / ป้ายแสดงสถานะ */}
                      <div className="shrink-0 flex items-center">
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all",
                            isOutOfStock
                              ? "bg-red-500 text-white border-red-600 shadow-xs"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300 group-hover:bg-emerald-100"
                          )}
                        >
                          {isOutOfStock ? (
                            <>
                              <Ban size={12} className="shrink-0" />
                              <span>หมด</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                              <span>มีของ</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ส่วนท้าย Modal (Footer) */}
          <div className="px-4 sm:px-6 py-3.5 bg-surface border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-text-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>สถานะหมด: <b>{outOfStockCount}</b> รายการ</span>
              </span>
              <span>•</span>
              <span className="text-text-2">
                ทั้งหมด {menuItems.length} รายการ
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={onClose}
                className="text-xs sm:text-sm font-semibold px-4"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={isSaving}
                onClick={handleSave}
                className="text-xs sm:text-sm font-bold px-5 bg-brand-500 hover:bg-brand-600 text-white shadow-md"
                icon={<Check size={15} />}
              >
                {isSaving ? "กำลังบันทึกและส่งแจ้งเตือน..." : "บันทึกข้อมูล"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
