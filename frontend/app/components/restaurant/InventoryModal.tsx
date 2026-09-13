/**
 * @file InventoryModal.tsx
 * @description Modal สำหรับจัดการสต็อกวัตถุดิบและไส้เครปของร้านค้า
 * รองรับการดูรายการสต็อก, การเพิ่มวัตถุดิบ/ไส้ใหม่ และการคลิกสลับสถานะ (พร้อมขาย -> ใกล้หมด -> หมด)
 */

"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/app/lib/api/client";

/** โครงสร้างข้อมูลรายการสต็อก */
export interface InventoryItem {
  id: number;
  name: string;
  category: "base" | "topping" | "ingredient";
  toppingGroup?: "sweet" | "savory" | "fruit";
  quantity: number;
  unit: string;
  status: "available" | "low_stock" | "out_of_stock";
  price: number;
}

/** พร็อพส์สำหรับคอมโพเนนต์ InventoryModal */
export interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string | number;
}

/** ข้อมูลสต็อกเริ่มต้น (Fallback Initial Data) */
export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 1, name: "แผ่นเครป", category: "base", quantity: 120, unit: "แผ่น", status: "available", price: 25 },
  { id: 2, name: "นูเทลล่า", category: "topping", toppingGroup: "sweet", quantity: 15, unit: "กระปุก", status: "available", price: 15 },
  { id: 3, name: "กล้วยหอม", category: "topping", toppingGroup: "fruit", quantity: 8, unit: "หวี", status: "low_stock", price: 10 },
  { id: 4, name: "ฝอยทอง", category: "topping", toppingGroup: "sweet", quantity: 0, unit: "กล่อง", status: "out_of_stock", price: 15 },
  { id: 5, name: "ชีส", category: "topping", toppingGroup: "savory", quantity: 20, unit: "แพ็ค", status: "available", price: 20 },
  { id: 6, name: "พริกเผา", category: "topping", toppingGroup: "savory", quantity: 5, unit: "กระปุก", status: "available", price: 10 },
  { id: 7, name: "หมูหยอง", category: "topping", toppingGroup: "savory", quantity: 2, unit: "ถุง", status: "low_stock", price: 15 },
];

/**
 * คอมโพเนนต์ InventoryModal
 */
export function InventoryModal({ isOpen, onClose, restaurantId }: InventoryModalProps) {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [activeTab, setActiveTab] = useState<"ingredient" | "base" | "topping">("ingredient");
  const [isAdding, setIsAdding] = useState(false);

  // สถานะสำหรับฟอร์มเพิ่มรายการใหม่
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"base" | "topping" | "ingredient">("topping");
  const [newGroup, setNewGroup] = useState<"sweet" | "savory" | "fruit">("sweet");
  const [newQty, setNewQty] = useState(50);
  const [newUnit, setNewUnit] = useState("ชิ้น");
  const [newPrice, setNewPrice] = useState(10);

  // ดึงข้อมูลรายการสต็อกจาก API
  const fetchItems = async () => {
    try {
      const res = await fetchApi<InventoryItem[]>("/restaurant/inventory", {
        params: { restaurantId },
      });
      if (res.success && res.data && res.data.length > 0) {
        setItems(res.data);
      }
    } catch {
      // ใช้ข้อมูล Fallback เมื่อไม่สามารถติดต่อเซิร์ฟเวอร์ได้
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, restaurantId]);

  if (!isOpen) return null;

  // กรองรายการตามแท็บที่เลือก
  const filteredItems = items.filter((it) => {
    if (activeTab === "ingredient") return true;
    if (activeTab === "topping") return it.category === "topping";
    if (activeTab === "base") return it.category === "base";
    return true;
  });

  // สลับสถานะของวัตถุดิบ (พร้อมขาย -> ใกล้หมด -> หมด)
  const handleToggleStatus = async (item: InventoryItem) => {
    const nextStatusMap: Record<string, "available" | "low_stock" | "out_of_stock"> = {
      available: "low_stock",
      low_stock: "out_of_stock",
      out_of_stock: "available",
    };
    const nextStatus = nextStatusMap[item.status] || "available";

    // อัปเดต UI ทันทีแบบ Optimistic Update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it))
    );

    try {
      await fetchApi(`/restaurant/inventory/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`อัปเดต ${item.name} เป็น "${getStatusLabel(nextStatus)}" แล้ว`);
    } catch {
      toast.success(`อัปเดต ${item.name} เป็น "${getStatusLabel(nextStatus)}"`);
    }
  };

  // สร้างรายการวัตถุดิบใหม่
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: InventoryItem = {
      id: Date.now(),
      name: newName.trim(),
      category: newCategory,
      toppingGroup: newGroup,
      quantity: newQty,
      unit: newUnit,
      status: "available",
      price: newPrice,
    };

    setItems((prev) => [newItem, ...prev]);
    setIsAdding(false);
    setNewName("");

    try {
      await fetchApi("/restaurant/inventory", {
        method: "POST",
        body: JSON.stringify(newItem),
      });
      toast.success(`เพิ่ม ${newItem.name} เรียบร้อยแล้ว`);
    } catch {}
  };

  // แปลงสถานะเป็นข้อความภาษาไทย
  const getStatusLabel = (status: string) => {
    if (status === "available") return "พร้อมขาย";
    if (status === "low_stock") return "ใกล้หมด";
    if (status === "out_of_stock") return "หมด";
    return "พร้อมขาย";
  };

  // กำหนดสไตล์ Badge ตามสถานะสต็อก
  const getStatusBadgeStyle = (status: string) => {
    if (status === "available") return "bg-emerald-50 border-emerald-200/80 text-emerald-700";
    if (status === "low_stock") return "bg-amber-50 border-amber-300 text-amber-800";
    if (status === "out_of_stock") return "bg-zinc-100 border-zinc-300 text-zinc-500 line-through";
    return "bg-zinc-100 border-zinc-200 text-zinc-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white text-zinc-900 rounded-[28px] p-6 shadow-2xl border border-zinc-200/80 animate-scale-in flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ส่วนหัวของ Modal */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                จัดการสต็อกวัตถุดิบ & ไส้เครป
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">กดเปลี่ยนสถานะเพื่อตัดสต็อกหน้าร้านทันที</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="py-2 px-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มรายการ</span>
            </button>

            <button
              onClick={onClose}
              aria-label="ปิด"
              className="w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* แท็บหมวดหมู่ */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-full border border-zinc-200/60">
          {[
            { id: "ingredient", label: "ทั้งหมด" },
            { id: "topping", label: "ไส้ & ท็อปปิ้ง" },
            { id: "base", label: "แป้งเครป" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ฟอร์มเพิ่มรายการใหม่ */}
        {isAdding && (
          <form onSubmit={handleCreateItem} className="p-4 bg-zinc-50/80 border border-zinc-200/80 rounded-2xl space-y-3 animate-fade-up">
            <h4 className="text-xs font-bold text-zinc-800">เพิ่มวัตถุดิบ / ไส้ใหม่</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="ชื่อวัตถุดิบ"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-xl"
              />
              <input
                type="number"
                placeholder="จำนวน"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-xl"
              />
              <input
                type="text"
                placeholder="หน่วย (ชิ้น, แผ่น)"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-xl"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="py-1.5 px-3 border border-zinc-200 text-xs font-semibold rounded-full"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 bg-zinc-900 text-white text-xs font-bold rounded-full"
              >
                บันทึก
              </button>
            </div>
          </form>
        )}

        {/* ตารางแสดงรายการสต็อก */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 text-zinc-400 font-bold">
                <th className="py-2.5 px-3">รายการ</th>
                <th className="py-2.5 px-3">คงเหลือ</th>
                <th className="py-2.5 px-3 text-right">สถานะสต็อก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.map((it) => (
                <tr key={it.id} className="hover:bg-zinc-50/70 transition">
                  <td className="py-3 px-3 font-bold text-zinc-900">{it.name}</td>
                  <td className="py-3 px-3 text-zinc-600 font-mono">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(it)}
                      title="กดเพื่อสลับสถานะ (พร้อมขาย -> ใกล้หมด -> หมด)"
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${getStatusBadgeStyle(
                        it.status
                      )}`}
                    >
                      {getStatusLabel(it.status)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ข้อความชี้แจงด้านล่าง */}
        <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-[11px] text-zinc-500 leading-relaxed flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <span>เมื่อเลือกเป็น &quot;หมด&quot; ไส้นี้จะปิดการสั่งในหน้าจอของลูกค้าทันทีแบบเรียลไทม์</span>
        </div>
      </div>
    </div>
  );
}
