"use client";

/**
 * =========================================================================================
 * @file customer-auth.ts
 * @description ตัวจัดการ Session และ State การเข้าสู่ระบบของลูกค้า (Customer Auth)
 * 
 * หน้าที่หลัก:
 * - บันทึก, อ่าน และลบข้อมูลโปรไฟล์ลูกค้าจาก LocalStorage
 * - ส่งสัญญาณ Custom Event `crepeq_customer_changed` ข้าม Component และรองรับ Storage Event ข้ามแท็บ
 * - มี React Hook `useCustomerSession()` เพื่อให้ Component สั่ง Subscribe และ Reactive ตามสถานะล็อกอิน
 * =========================================================================================
 */

import { useEffect, useState } from "react";
import { CustomerProfileDTO } from "./api/types";

/** คีย์สำหรับเก็บข้อมูลลูกค้าใน LocalStorage */
const CUSTOMER_STORAGE_KEY = "crepeq_customer_session";

/**
 * ดึงข้อมูลเซสชันลูกค้าจาก LocalStorage
 * @returns ข้อมูลโปรไฟล์ลูกค้า หรือ null หากไม่ได้ล็อกอิน
 */
export function getCustomerSession(): CustomerProfileDTO | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerProfileDTO;
  } catch {
    return null;
  }
}

/**
 * บันทึกข้อมูลเซสชันลูกค้าลง LocalStorage พร้อม Broadcast Event ไปยัง Component อื่นๆ
 * @param customer ข้อมูลโปรไฟล์ลูกค้า
 */
export function setCustomerSession(customer: CustomerProfileDTO): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    // Broadcast event ให้ component ที่เปิดอยู่ในหน้าเดียวกันอัปเดตสถานะทันที
    window.dispatchEvent(new CustomEvent("crepeq_customer_changed", { detail: customer }));
  } catch (e) {
    console.error("Failed to save customer session:", e);
  }
}

/**
 * ล้างข้อมูลเซสชันลูกค้า (ออกจากระบบ)
 */
export function clearCustomerSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    // Broadcast event แจ้งเตือนการ Logout ให้ทุก Component ทราบ
    window.dispatchEvent(new CustomEvent("crepeq_customer_changed", { detail: null }));
  } catch (e) {
    console.error("Failed to clear customer session:", e);
  }
}

/**
 * Custom React Hook สำหรับจัดการและติดตามเซสชันลูกค้าแบบ Real-time ใน React Component
 * @returns ออบเจกต์สถานะลูกค้า { customer, isLoggedIn, isLoaded, setCustomer, logout }
 */
export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerProfileDTO | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // โหลดข้อมูลรอบแรกเมื่อ Component Mount
    setCustomer(getCustomerSession());
    setIsLoaded(true);

    // ดักจับ Event เมื่อมีการเปลี่ยนแปลงข้อมูลลูกค้าภายในหน้าเว็บ
    const handleCustomerChange = (event: Event) => {
      const customEvent = event as CustomEvent<CustomerProfileDTO | null>;
      setCustomer(customEvent.detail ?? getCustomerSession());
    };

    window.addEventListener("crepeq_customer_changed", handleCustomerChange);
    window.addEventListener("storage", handleCustomerChange);

    return () => {
      window.removeEventListener("crepeq_customer_changed", handleCustomerChange);
      window.removeEventListener("storage", handleCustomerChange);
    };
  }, []);

  return {
    customer,
    isLoggedIn: !!customer,
    isLoaded,
    setCustomer: setCustomerSession,
    logout: clearCustomerSession,
  };
}
