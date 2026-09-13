/**
 * =========================================================================================
 * @file mock-data.ts
 * @description รวบรวม Type Interfaces ฝั่ง Local/Frontend สำหรับหน้า QueueClient, MenuClient, CartClient
 * 
 * หน้าที่หลัก:
 * - กำหนด Type โครงสร้างข้อมูลเมนู, ตะกร้าสินค้า, ออเดอร์, โต๊ะ และร้านค้า
 * - เชื่อมต่อกับ Backend DTOs และรองรับการทำงานแบบ Backward-Compatible
 * =========================================================================================
 */

import type { OrderStatus, PaymentMethod } from "@/app/lib/api";
export type { OrderStatus, PaymentMethod };

/**
 * ตัวเลือกย่อยในกลุ่มตัวเลือก (Option Choice)
 */
export interface OptionChoice {
  /** ชื่อตัวเลือก เช่น "นูเทลล่า", "กล้วยหอม" */
  label: string;
  /** ราคาบวกเพิ่ม (บาท) */
  price: number;
}

/**
 * กลุ่มตัวเลือกเสริมของเมนู (Option Group) เช่น "เลือกแป้ง", "เลือกไส้", "ระดับความหวาน"
 */
export interface OptionGroup {
  /** ชื่อกลุ่มตัวเลือก */
  name: string;
  /** รายการตัวเลือกย่อย */
  choices: OptionChoice[];
  /** บังคับเลือกหรือไม่ */
  required?: boolean;
  /** สามารถเลือกได้หลายรายการพร้อมกันหรือไม่ */
  allowMultiple?: boolean;
}

/**
 * ข้อมูลเมนูอาหาร (Menu Item)
 */
export interface MenuItem {
  /** รหัสเมนู */
  id: string;
  /** ชื่อเมนูภาษาไทย */
  name: string;
  /** ชื่อเมนูภาษาอังกฤษ */
  nameEn?: string;
  /** คำอธิบายเมนู */
  description: string;
  /** ราคาเริ่มต้น */
  price: number;
  /** URL รูปภาพหลัก */
  image: string;
  /** อาร์เรย์ URL รูปภาพเพิ่มเติม */
  images?: string[];
  /** หมวดหมู่เมนู */
  category: string;
  /** ระดับความเผ็ด (ถ้ามี) */
  spicyLevel?: number;
  /** เป็นเมนูยอดนิยมหรือไม่ */
  popular?: boolean;
  /** พร้อมจำหน่ายหรือไม่ */
  available: boolean;
  /** กลุ่มตัวเลือกเสริม */
  optionGroups?: OptionGroup[];
  /** โครงสร้างตัวเลือกเสริมแบบกำหนดเอง (Legacy Options) */
  options?: {
    sizes?: { label: string; price: number }[];
    spicy?: string[];
    extras?: { label: string; price: number }[];
    optionGroups?: OptionGroup[];
  };
}

/**
 * ข้อมูลสินค้าในตะกร้า (Cart Item)
 */
export interface CartItem {
  /** รหัสเฉพาะของไอเทมในตะกร้า */
  id: string;
  /** ออบเจกต์เมนูหลัก */
  menuItem: MenuItem;
  /** จำนวนที่สั่ง */
  quantity: number;
  /** ขนาดที่เลือก */
  size?: string;
  /** ระดับความเผ็ด */
  spicy?: string;
  /** หมายเหตุเพิ่มเติมจากลูกค้า เช่น "ไม่ใส่น้ำตาล" */
  note?: string;
  /** รายการตัวเลือกเสริมที่เลือก */
  selectedOptions?: {
    groupName: string;
    choiceLabel: string;
    price: number;
  }[];
  /** ราคารวมของไอเทมนี้ */
  subtotal: number;
  /** วัตถุดิบหมดหรือไม่ */
  isOutOfStock?: boolean;
  /** ถูกยกเลิกหรือไม่ */
  isCancelled?: boolean;
  /** เหตุผลที่ยกเลิก */
  cancelReason?: string;
  /** สถานะของไอเทม */
  status?: string;
}

/**
 * ข้อมูลคำสั่งซื้อ (Order)
 */
export interface Order {
  /** รหัสออเดอร์ */
  id: string;
  /** รหัสโต๊ะ */
  tableId: string;
  /** หมายเลขโต๊ะ */
  tableNumber: string | number;
  /** หมายเลขคิวที่แสดงผล เช่น "A001" */
  queueNumber?: string;
  /** ลำดับคิวประจำวัน */
  queuePosition?: number;
  /** ดัชนีคิวประจำวัน */
  dailyQueueIndex?: number;
  /** รายการสินค้าในออเดอร์ */
  items: CartItem[];
  /** สถานะของออเดอร์ */
  status: OrderStatus;
  /** เวลาที่สร้างออเดอร์ */
  createdAt: string;
  /** ยอดเงินรวมสุทธิ */
  total: number;
  /** ช่องทางการชำระเงิน */
  paymentMethod?: "qr" | "cash";
  /** แนบสลิปแล้วหรือไม่ */
  hasSlip?: boolean;
  /** URL รูปภาพสลิปโอนเงิน */
  slipUrl?: string;
  /** เหตุผลในการยกเลิก */
  cancelReason?: string;
  /** รหัสลูกค้า */
  customerId?: number;
  /** ชื่อเล่นลูกค้า */
  customerNickname?: string;
  /** เบอร์โทรศัพท์ลูกค้า */
  customerPhone?: string;
  /** เวลานัดรับอาหารล่วงหน้า */
  scheduledTime?: string;
  /** ประเภทการรับอาหาร เช่น "รับที่ร้าน", "ทานที่ร้าน" */
  pickupType?: string;
}

/**
 * ข้อมูลโต๊ะอาหาร (Table)
 */
export interface Table {
  /** รหัสโต๊ะ */
  id: string;
  /** หมายเลขโต๊ะ */
  number: number;
  /** จำนวนที่นั่ง */
  capacity: number;
  /** สถานะโต๊ะ */
  status: "empty" | "occupied" | "reserved";
  /** รหัสออเดอร์ปัจจุบันที่กำลังนั่งทาน */
  currentOrderId?: string;
}

/**
 * ข้อมูลร้านอาหาร (Restaurant)
 */
export interface Restaurant {
  /** รหัสร้านอาหาร */
  id: string;
  /** ชื่อร้านอาหาร */
  name: string;
  /** URL โลโก้ */
  logo?: string;
  /** URL ภาพหน้าปก */
  coverImage?: string;
  /** สีธีมหลัก */
  themeColor: string;
  /** รายละเอียดร้าน */
  description: string;
  /** เวลาเปิดร้าน */
  openTime: string;
  /** เวลาปิดร้าน */
  closeTime: string;
  /** เบอร์โทรศัพท์ */
  phone: string;
  /** ที่อยู่ร้าน */
  address: string;
  /** สถานะเปิด/ปิดร้าน */
  isOpen: boolean;
}
