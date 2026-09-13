/**
 * @file CustomCrepeBuilder.tsx
 * @description หน้าจอจัดแต่งเครปตามใจลูกค้า (Custom Crepe Builder)
 * ให้ลูกค้าสามารถเลือกแป้งเครป (กรอบ/นุ่ม), เลือกไส้และท็อปปิ้งจากหมวดหมู่ต่างๆ (คาว/หวาน/ผลไม้/ซอส),
 * คำนวณราคาแบบเรียลไทม์ (พร้อมคิดค่าบริการเพิ่มเมื่อเลือกไส้เกิน 3 อย่าง), ระบุหมายเหตุ และเพิ่มลงตะกร้า
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Minus, Check, ChevronLeft, ShoppingBag, UtensilsCrossed, Receipt, ArrowRight } from "lucide-react";
import { HelpButton } from "../ui/GuidedTourModal";
import { SafeImage } from "../ui/SafeImage";

/** โครงสร้างข้อมูลหมวดหมู่ */
export interface CategoryItem {
  id: string | number;
  name: string;
  label?: string;
}

/** โครงสร้างข้อมูลไส้/ท็อปปิ้ง */
export interface ToppingItem {
  id: string | number;
  name: string;
  price: number;
  category: string;
  image?: string;
  description?: string;
  isAvailable?: boolean;
}

/** โครงสร้างข้อมูลแป้งเครป */
export interface CrustItem {
  id: string | number;
  name: string;
  label: string;
  price: number;
  desc?: string;
  image?: string;
  isAvailable?: boolean;
}

/** โครงสร้างข้อมูลดราฟต์เครปที่กำลังจัดแต่ง */
export interface CrepeDraft {
  id?: string;
  base?: CrustItem;
  toppings?: ToppingItem[];
  quantity?: number;
  note?: string;
  isEditing?: boolean;
}

/** พร็อพส์สำหรับคอมโพเนนต์ CustomCrepeBuilder */
export interface CustomCrepeBuilderProps {
  /** คิวที่กำลังทำปัจจุบัน */
  currentQueue?: string;
  /** ข้อมูลดราฟต์เริ่มต้น (เมื่อกดแก้ไขจากตะกร้า) */
  initialDraft?: CrepeDraft | null;
  /** Callback เมื่อเพิ่มเครปลงตะกร้า */
  onAddToCart: (crepeItem: {
    id: string;
    name: string;
    base: { name: string; price: number };
    toppings: ToppingItem[];
    quantity: number;
    subtotal: number;
    unitPrice: number;
    note?: string;
  }) => void;
  /** ฟังก์ชันย้อนกลับ */
  onBack?: () => void;
  /** ฟังก์ชันเปิดหน้าต่างช่วยเหลือ */
  onOpenHelp?: () => void;
  /** ฟังก์ชันดูตะกร้าสินค้า */
  onViewCart?: () => void;
  /** จำนวนสินค้าในตะกร้า */
  cartCount?: number;
  /** ข้อมูลออเดอร์ปัจจุบันที่กำลังดำเนินการ */
  activeOrderInfo?: { queueNumber: string; status: string } | null;
  /** ฟังก์ชันติดตามสถานะออเดอร์ปัจจุบัน */
  onTrackActiveOrder?: () => void;
  /** รายการหมวดหมู่ทั้งหมด */
  categoriesList?: CategoryItem[];
  /** รายการท็อปปิ้งทั้งหมด */
  toppingsList?: ToppingItem[];
  /** รายการแป้งเครปทั้งหมด */
  crustsList?: CrustItem[];
}

/** รายการแป้งเครปเริ่มต้น (Fallback) */
export const DEFAULT_CRUSTS: CrustItem[] = [
  { id: "crispy", name: "แผ่นกรอบ", label: "กรอบ", price: 10, desc: "บางกรอบ หอมเนย ละมุน" },
  { id: "soft", name: "แผ่นนุ่ม", label: "นุ่ม", price: 10, desc: "นุ่มหนึบ สไตล์ญี่ปุ่น" },
];

/**
 * คอมโพเนนต์รูปขนาดย่อของไส้เครป (Topping Thumbnail)
 */
function ToppingThumbnail({
  image,
  name,
  isSelected,
}: {
  image?: string;
  name: string;
  isSelected: boolean;
}) {
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-zinc-200/80 bg-white shadow-2xs flex items-center justify-center">
      <SafeImage
        src={image}
        alt={name}
        className="w-full h-full object-cover"
        fallback={
          <div
            className={`w-full h-full shrink-0 flex flex-col items-center justify-center text-center p-1 border transition-colors ${
              isSelected
                ? "bg-white/20 border-white/30 text-white"
                : "bg-rose-50/50 border-rose-100/80 text-zinc-400"
            }`}
          >
            <UtensilsCrossed
              size={16}
              className={isSelected ? "text-white" : "text-rose-400 shrink-0"}
            />
            <span
              className={`text-[7.5px] leading-tight font-medium mt-0.5 whitespace-nowrap ${
                isSelected ? "text-white/90" : "text-zinc-400"
              }`}
            >
              {name.slice(0, 4)}
            </span>
          </div>
        }
      />
    </div>
  );
}

/**
 * คอมโพเนนต์ CustomCrepeBuilder
 */
export function CustomCrepeBuilder({
  currentQueue = "-",
  initialDraft,
  onAddToCart,
  onBack,
  onOpenHelp,
  onViewCart,
  cartCount = 0,
  activeOrderInfo,
  onTrackActiveOrder,
  categoriesList = [],
  toppingsList = [],
  crustsList = DEFAULT_CRUSTS,
}: CustomCrepeBuilderProps) {
  const availableCrusts = crustsList.length > 0 ? crustsList : DEFAULT_CRUSTS;
  
  // ฟังก์ชันช่วยเปรียบเทียบแป้งเครปอย่างปลอดภัย
  const isCrustMatch = (c1?: Partial<CrustItem> | null, c2?: Partial<CrustItem> | null) => {
    if (!c1 || !c2) return false;
    if (c1.id !== undefined && c2.id !== undefined && String(c1.id) === String(c2.id)) return true;
    if (c1.name && c2.name && (c1.name === c2.name || c1.name.includes(c2.name) || c2.name.includes(c1.name))) return true;
    if (c1.name && c2.label && (c1.name.includes(c2.label) || (c2.label && c2.label.includes(c1.name)))) return true;
    if (c1.label && c2.name && (c1.label.includes(c2.name) || (c2.label && c2.label.includes(c1.label)))) return true;
    return false;
  };

  // แป้งเครปที่เลือก
  const [selectedCrust, setSelectedCrust] = useState<CrustItem>(() => {
    if (initialDraft?.isEditing && initialDraft.base) {
      const matched = availableCrusts.find((c) => isCrustMatch(c, initialDraft.base));
      if (matched) return matched;
      return {
        id: (initialDraft.base as any).id || (initialDraft.base.name.includes("นุ่ม") ? "soft" : "crispy"),
        name: initialDraft.base.name || "แผ่นแป้งเครป",
        label: (initialDraft.base as any).label || (initialDraft.base.name.includes("นุ่ม") ? "นุ่ม" : "กรอบ"),
        price: initialDraft.base.price || 25,
        image: (initialDraft.base as any).image || (initialDraft.base as any).image_url || undefined,
      };
    }
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("crepe_builder_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedCrust) return parsed.selectedCrust;
        }
      } catch {}
    }
    return availableCrusts[0];
  });

  // สร้างหมวดหมู่อัตโนมัติจากฐานข้อมูล
  const categories = useMemo(() => {
    if (categoriesList && categoriesList.length > 0) {
      return categoriesList;
    }
    const unique = Array.from(new Set(toppingsList.map((t) => t.category).filter(Boolean)));
    if (unique.length > 0) {
      return unique.map((c) => ({ id: c, name: c, label: c }));
    }
    return [];
  }, [categoriesList, toppingsList]);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedToppings, setSelectedToppings] = useState<ToppingItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);
  const lastDraftKeyRef = React.useRef<string | null>(null);

  // กู้คืนข้อมูลดราฟต์เมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    setIsHydrated(true);
    const draftKey = initialDraft?.id ? `${initialDraft.id}_${initialDraft.isEditing}` : "new_builder_session";
    if (lastDraftKeyRef.current === draftKey) {
      return;
    }
    lastDraftKeyRef.current = draftKey;

    if (initialDraft && initialDraft.isEditing) {
      if (initialDraft.base) {
        const matchedCrust =
          availableCrusts.find((c) => isCrustMatch(c, initialDraft.base!)) || initialDraft.base;
        setSelectedCrust({
          id: (matchedCrust as any).id || (matchedCrust.name.includes("นุ่ม") ? "soft" : "crispy"),
          name: matchedCrust.name,
          label: (matchedCrust as any).label || (matchedCrust.name.includes("นุ่ม") ? "นุ่ม" : "กรอบ"),
          price: matchedCrust.price,
          desc: (matchedCrust as any).desc || "",
          image: (matchedCrust as any).image || (matchedCrust as any).image_url || (matchedCrust as any).crust_image || undefined,
        });
      }
      if (Array.isArray(initialDraft.toppings)) {
        setSelectedToppings(initialDraft.toppings);
        if (initialDraft.toppings.length > 0 && initialDraft.toppings[0].category) {
          const firstCat = initialDraft.toppings[0].category;
          const matchedCat = categories.find((c) => isCatMatch(firstCat, c.name) || isCatMatch(firstCat, c.label || ""));
          if (matchedCat) {
            setSelectedCategory(matchedCat.name || String(matchedCat.id));
          }
        }
      }
      if (typeof initialDraft.quantity === "number") setQuantity(initialDraft.quantity);
      if (typeof initialDraft.note === "string") setNote(initialDraft.note);
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("crepe_builder_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedCrust) setSelectedCrust(parsed.selectedCrust);
          if (Array.isArray(parsed.selectedToppings)) setSelectedToppings(parsed.selectedToppings);
          if (parsed.selectedCategory) setSelectedCategory(parsed.selectedCategory);
          if (parsed.quantity) setQuantity(parsed.quantity);
          if (parsed.note) setNote(parsed.note);
          return;
        }
      } catch {}
    }

    if (availableCrusts.length > 0) {
      setSelectedCrust(availableCrusts[0]);
    }
    setSelectedToppings([]);
    setQuantity(1);
    setNote("");
  }, [initialDraft?.id, initialDraft?.isEditing]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].name || String(categories[0].id));
    }
  }, [categories, selectedCategory]);

  // ซิงค์ดราฟต์กับ sessionStorage แบบอัตโนมัติ
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined" && !initialDraft?.isEditing) {
      try {
        sessionStorage.setItem(
          "crepe_builder_draft",
          JSON.stringify({
            selectedCrust,
            selectedCategory,
            selectedToppings,
            quantity,
            note,
          })
        );
      } catch {}
    }
  }, [selectedCrust, selectedCategory, selectedToppings, quantity, note, isHydrated, initialDraft]);

  useEffect(() => {
    if (crustsList.length > 0 && !initialDraft?.isEditing) {
      setSelectedCrust((prev) => {
        const found = crustsList.find((c) => isCrustMatch(c, prev));
        return found || prev;
      });
    }
  }, [crustsList, initialDraft]);

  // ปรับหมวดหมู่ให้อยู่ในรูปมาตรฐานสำหรับการเปรียบเทียบ
  const normalizeCat = (cat: string) => {
    const s = String(cat || "").toLowerCase().trim();
    if (s === "sweet" || s === "หวาน" || s === "เครปหวาน") return "หวาน";
    if (s === "savory" || s === "คาว" || s === "เครปคาว") return "คาว";
    if (s === "fruit" || s === "ผลไม้") return "ผลไม้";
    if (s === "sauce" || s === "ซอส") return "ซอส";
    if (s === "topping" || s === "ท็อปปิ้ง") return "ท็อปปิ้ง";
    return s;
  };

  const isCatMatch = (itemCat: string, targetCat: string) => {
    if (!itemCat || !targetCat) return false;
    if (itemCat === targetCat) return true;
    const n1 = normalizeCat(itemCat);
    const n2 = normalizeCat(targetCat);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  };

  // นับจำนวนท็อปปิ้งในแต่ละหมวดหมู่
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      const catKey = cat.name || String(cat.id);
      const count = toppingsList.filter(
        (t) => isCatMatch(t.category, catKey) || isCatMatch(t.category, cat.label || "")
      ).length;
      counts[catKey] = count;
    }
    return counts;
  }, [categories, toppingsList]);

  // กรองท็อปปิ้งตามหมวดหมู่ที่เลือก
  const filteredToppings = useMemo(() => {
    if (!selectedCategory) return toppingsList;
    return toppingsList.filter((t) => isCatMatch(t.category, selectedCategory));
  }, [toppingsList, selectedCategory]);

  const isToppingSelected = (t: ToppingItem) => {
    return selectedToppings.some(
      (item) => String(item.id) === String(t.id) || (item.name && item.name === t.name)
    );
  };

  // สลับการเลือกท็อปปิ้ง (เพิ่ม / เอาออก)
  const toggleTopping = (item: ToppingItem) => {
    if (item.isAvailable === false) return;
    setSelectedToppings((prev) => {
      const exists = prev.some(
        (t) => String(t.id) === String(item.id) || (t.name && t.name === item.name)
      );
      if (exists) {
        return prev.filter(
          (t) => String(t.id) !== String(item.id) && t.name !== item.name
        );
      } else {
        return [...prev, item];
      }
    });
  };

  // คำนวณราคาแบบ Realtime (รวมค่าแป้ง + ค่าท็อปปิ้ง + ค่าธรรมเนียมไส้ที่ 4 ขึ้นไป)
  const { toppingsPriceSum, extraFee, singleUnitPrice, totalAmount } = useMemo(() => {
    const crustPrice = selectedCrust.price;
    const toppingsSum = selectedToppings.reduce((acc, t) => acc + t.price, 0);
    const extraCount = Math.max(0, selectedToppings.length - 3);
    const fee = extraCount * 5;
    const unitPrice = crustPrice + toppingsSum + fee;
    return {
      toppingsPriceSum: toppingsSum,
      extraFee: fee,
      singleUnitPrice: unitPrice,
      totalAmount: unitPrice * quantity,
    };
  }, [selectedCrust, selectedToppings, quantity]);

  // จัดการการเพิ่มลงตะกร้าสินค้า
  const handleAdd = () => {
    const toppingsNames = selectedToppings.map((t) => t.name).join(" + ");
    const itemName = `เครป${selectedCrust.label}${toppingsNames ? ` · ${toppingsNames}` : ""}`;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("crepe_builder_draft");
      } catch {}
    }

    onAddToCart({
      id: initialDraft?.id || `custom-crepe-${Date.now()}`,
      name: itemName,
      base: { name: selectedCrust.name, price: selectedCrust.price },
      toppings: selectedToppings,
      quantity,
      unitPrice: singleUnitPrice,
      subtotal: totalAmount,
      note,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 sm:p-6 pb-36 text-zinc-900 gap-3.5">
      {/* ส่วนหัวหน้าจอ */}
      <div className="w-full max-w-lg flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="ย้อนกลับ"
              className="w-9 h-9 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-zinc-900 tracking-tight">
              {initialDraft?.isEditing ? "แก้ไขเมนูตามใจคุณ" : "จัดเครปตามใจคุณ"}
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              {initialDraft?.isEditing ? "ปรับเปลี่ยนแป้งและไส้ตามต้องการ" : "เลือกแป้งและไส้ที่ชอบ"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ป้ายแสดงสถานะคิว */}
          <div className="px-3 py-1 rounded-full bg-white border border-zinc-200/80 shadow-xs flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {currentQueue && currentQueue !== "-" ? `คิว ${currentQueue}` : "คิวว่าง รีบสั่งเลย!"}
          </div>

          {/* ปุ่มไปตะกร้าสินค้า */}
          {onViewCart && (
            <button
              type="button"
              onClick={onViewCart}
              aria-label="ดูตะกร้าสินค้า"
              title="ไปที่ตะกร้าสินค้า"
              className="relative w-9 h-9 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span
                  style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs"
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* ปุ่มลัดติดตามออเดอร์ */}
          {activeOrderInfo && onTrackActiveOrder && (
            <button
              type="button"
              onClick={onTrackActiveOrder}
              aria-label="ติดตามสถานะออเดอร์"
              title={`ติดตามสถานะออเดอร์คิว ${activeOrderInfo.queueNumber}`}
              className="relative px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>คิว {activeOrderInfo.queueNumber}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}

          {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
        </div>
      </div>

      {/* แบบฟอร์มจัดแต่งเครป */}
      <div className="w-full max-w-lg flex flex-col gap-4 animate-fade-up">
        {/* แถบแจ้งเตือนเมื่อมีออเดอร์กำลังดำเนินการ */}
        {activeOrderInfo && onTrackActiveOrder && (
          <div
            onClick={onTrackActiveOrder}
            className="w-full bg-gradient-to-r from-emerald-50 via-white to-emerald-50/70 border border-emerald-300/80 hover:border-emerald-400 rounded-[20px] p-3.5 flex items-center justify-between shadow-xs transition-all active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Receipt className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-950">
                    คุณมีออเดอร์คิว {activeOrderInfo.queueNumber}
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
                  กดที่นี่เพื่อติดตามสถานะคิวและการทำสดแบบ Real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:translate-x-0.5 transition-all shrink-0 pl-2">
              <span>ติดตาม</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* ขั้นตอนที่ 1: เลือกแผ่นแป้งเครป */}
        <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              >
                1
              </span>
              <span className="text-xs font-bold text-zinc-800 tracking-tight">
                เลือกแผ่นแป้งเครป
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">เลือก 1 แบบ</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {availableCrusts.map((c) => {
              const isSelected = isCrustMatch(selectedCrust, c);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCrust(c)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: "var(--brand-500, #F43F5E)",
                          borderColor: "var(--brand-500, #F43F5E)",
                        }
                      : {}
                  }
                  className={`p-3 sm:p-4 rounded-2xl text-left transition-all relative flex flex-col justify-between gap-2 border cursor-pointer ${
                    isSelected
                      ? "text-white shadow-sm ring-2 ring-brand-500/20"
                      : "bg-zinc-50/70 hover:bg-zinc-100/70 text-zinc-800 border-zinc-200/80"
                  }`}
                >
                  {/* Top Row: Thumbnail + Price Badge */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    {c.image ? (
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border transition-all ${
                          isSelected
                            ? "border-white/40 bg-white/20 shadow-xs"
                            : "border-zinc-200/90 bg-white shadow-2xs"
                        }`}
                      >
                        <SafeImage
                          src={c.image}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          fallbackType="wheat"
                          fallbackClassName={isSelected ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-white/40 bg-white/20 text-white shadow-xs"
                            : "border-amber-200/60 bg-amber-50 text-amber-600 shadow-2xs"
                        }`}
                      >
                        <span className="text-xl">🥞</span>
                      </div>
                    )}

                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        isSelected ? "bg-white/25 text-white" : "bg-white text-zinc-700 border border-zinc-200 shadow-2xs"
                      }`}
                    >
                      ฿{c.price}
                    </span>
                  </div>

                  {/* Bottom Block: Name and Description with full width */}
                  <div className="w-full min-w-0 pt-0.5">
                    <span className="font-bold text-sm sm:text-base tracking-tight leading-snug block break-words">
                      {c.name}
                    </span>
                    {c.desc && (
                      <p className={`text-[11px] sm:text-xs font-medium leading-normal mt-0.5 line-clamp-2 ${isSelected ? "text-white/85" : "text-zinc-500"}`}>
                        {c.desc}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ขั้นตอนที่ 2: เลือกไส้เครป */}
        <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              >
                2
              </span>
              <span className="text-xs font-bold text-zinc-800 tracking-tight">
                เลือกไส้เครป
              </span>
            </div>
            <span className="text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200/60">
              เลือกแล้ว {selectedToppings.length} อย่าง
            </span>
          </div>

          {/* แท็บกรองหมวดหมู่ */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-full border border-zinc-200/60 overflow-x-auto no-scrollbar">
              {categories.map((cat) => {
                const catKey = cat.name || String(cat.id);
                const isSelected =
                  selectedCategory === cat.name ||
                  selectedCategory === String(cat.id);
                const count = categoryCounts[catKey] ?? 0;

                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name || String(cat.id))}
                    style={
                      isSelected
                        ? { color: "var(--brand-500, #F43F5E)" }
                        : {}
                    }
                    className={`flex-1 min-w-[76px] py-1.5 px-3 rounded-full text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{cat.label || cat.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? "bg-rose-50 text-rose-600"
                          : "bg-zinc-200/80 text-zinc-500"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: "var(--brand-50, rgba(244,63,94,0.1))",
                              color: "var(--brand-500, #F43F5E)",
                            }
                          : {}
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* รายการตัวเลือกไส้เครป */}
          {filteredToppings.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400 font-medium">
              ไม่มีรายการไส้ในหมวดหมู่นี้
            </div>
          ) : (
            <div className="space-y-2">
              {filteredToppings.map((t) => {
                const isSelected = isToppingSelected(t);
                const isOutOfStock = t.isAvailable === false;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopping(t)}
                    disabled={isOutOfStock}
                    style={
                      isSelected
                        ? {
                            backgroundColor: "var(--brand-500, #F43F5E)",
                            borderColor: "var(--brand-500, #F43F5E)",
                          }
                        : {}
                    }
                    className={`w-full p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between text-left select-none ${
                      isOutOfStock
                        ? "bg-zinc-50/50 border-zinc-200/60 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "text-white shadow-xs cursor-pointer"
                        : "bg-zinc-50/60 hover:bg-zinc-100/60 text-zinc-800 border-zinc-200/80 cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div
                        style={
                          isSelected && !isOutOfStock
                            ? { color: "var(--brand-500, #F43F5E)" }
                            : {}
                        }
                        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition ${
                          isOutOfStock
                            ? "border-zinc-300 bg-zinc-200"
                            : isSelected
                            ? "bg-white border-white"
                            : "border-zinc-300 bg-white"
                        }`}
                      >
                        {isSelected && !isOutOfStock && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* รูปภาพไส้เครป */}
                      <ToppingThumbnail
                        image={t.image}
                        name={t.name}
                        isSelected={isSelected}
                      />

                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold tracking-tight block truncate">{t.name}</span>
                        {t.description && (
                          <span
                            className={`text-[11px] font-normal line-clamp-1 block ${
                              isSelected ? "text-white/80" : "text-zinc-500"
                            }`}
                          >
                            {t.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOutOfStock ? (
                        <span className="text-[11px] font-bold text-zinc-500 bg-zinc-200/80 px-2 py-0.5 rounded-full">
                          หมดวันนี้
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? "text-white bg-white/20" : "text-zinc-600 bg-white border border-zinc-200/80"
                          }`}
                        >
                          +฿{t.price}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ช่องกรอกหมายเหตุเพิ่มเติม */}
          <div className="pt-1">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม เช่น แป้งกรอบมาก, ไม่ราดนม"
              className="w-full px-4 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-zinc-900 transition shadow-inner"
            />
          </div>
        </div>

        {/* การ์ดแจกแจงราคารวมแบบละเอียด */}
        <div className="bg-white rounded-[24px] p-4 shadow-xs border border-zinc-200/70 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-600">
            <span>{selectedCrust.name}</span>
            <span className="font-semibold text-zinc-900">฿{selectedCrust.price}</span>
          </div>

          {selectedToppings.length > 0 && (
            <div className="flex items-center justify-between text-zinc-600">
              <span className="truncate max-w-[200px]">
                {selectedToppings.map((t) => t.name).join(" + ")}
              </span>
              <span className="font-semibold text-zinc-900">฿{toppingsPriceSum}</span>
            </div>
          )}

          {extraFee > 0 && (
            <div className="flex items-center justify-between text-amber-700 bg-amber-50/80 border border-amber-200/60 px-3 py-1.5 rounded-xl font-medium">
              <span>ไส้ที่ 4 ขึ้นไป (+฿5 / อย่าง)</span>
              <span className="font-bold">+฿{extraFee}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-sm font-bold text-zinc-900">
            <span className="text-xs font-medium text-zinc-500">ราคารวมต่อชิ้น</span>
            <span
              style={{ color: "var(--brand-500, #F43F5E)" }}
              className="text-lg font-black tracking-tight"
            >
              ฿{singleUnitPrice}
            </span>
          </div>
        </div>
      </div>

      {/* แถบด้านล่างสำหรับเลือกจำนวนชิ้นและกดใส่ตะกร้า */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-zinc-200/80 flex justify-center z-40">
        <div className="w-full max-w-lg flex items-center gap-3">
          {/* ตัวปรับจำนวนชิ้น */}
          <div className="flex items-center bg-zinc-100 border border-zinc-200/80 rounded-full p-1 shadow-inner">
            <button
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              aria-label="ลดจำนวน"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white disabled:opacity-30 transition active:scale-95 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-7 text-center text-xs font-black">{quantity}</span>
            <button
              onClick={() => setQuantity((prev) => prev + 1)}
              aria-label="เพิ่มจำนวน"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ปุ่มดูตะกร้าสินค้า */}
          {cartCount > 0 && onViewCart && (
            <button
              type="button"
              onClick={onViewCart}
              aria-label="ดูตะกร้าสินค้า"
              title="ดูตะกร้าสินค้า"
              className="relative w-12 h-12 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-5 h-5" />
              <span
                style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs"
              >
                {cartCount}
              </span>
            </button>
          )}

          {/* ปุ่มกดใส่ตะกร้า / บันทึกการแก้ไข */}
          <button
            onClick={handleAdd}
            style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
            className="flex-1 py-3.5 px-5 text-white font-bold rounded-full text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-white/90" />
            <span>
              {initialDraft?.isEditing
                ? `บันทึกการแก้ไข · ฿${totalAmount}`
                : `ใส่ตะกร้า · ฿${totalAmount}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
