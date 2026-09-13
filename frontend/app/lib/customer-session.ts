/**
 * =========================================================================================
 * @file customer-session.ts
 * @description ยูทิลิตี้จัดการ Device ID ของอุปกรณ์ และการติดตามออเดอร์หลายรอบ (Multi-Round Order Tracking)
 * 
 * หน้าที่หลัก:
 * - สร้างและจดจำ Device ID แบบไม่ระบุตัวตนบนเครื่องลูกค้า
 * - บันทึก Order ID ทั้งหมดที่สั่งจากโต๊ะเดียวกัน เพื่อให้ลูกค้าติดตามสถานะได้ครบทุกรอบ
 * - เคลียร์ประวัติเมื่อชำระเงินเสร็จสิ้น
 * =========================================================================================
 */

/** คีย์ LocalStorage สำหรับจัดเก็บรหัสประจำอุปกรณ์ (Device ID) */
const DEVICE_ID_KEY = "qrshop_customer_device_id";

/**
 * ดึงรหัส Device ID ประจำเครื่อง หากยังไม่มีจะสร้างขึ้นมาใหม่แบบสุ่มและเก็บลง LocalStorage
 * @returns สตริงรหัส Device ID
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "dev_server";
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    return `dev_temp_${Date.now()}`;
  }
}

/**
 * ดึงรายการรหัสออเดอร์ทั้งหมด (Order IDs) ที่สั่งโดยอุปกรณ์เครื่องนี้สำหรับโต๊ะที่ระบุ
 * @param tableId รหัสโต๊ะหรือหมายเลขโต๊ะ
 * @returns อาร์เรย์ของ Order ID
 */
export function getMyOrderIds(tableId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`qrshop_my_orders_${tableId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // กรณีรองรับข้อมูลรุ่นเก่าแบบ single order key (Legacy Fallback)
    const legacy = localStorage.getItem(`qrshop_active_order_${tableId}`);
    if (legacy) return [legacy];
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * เพิ่มรหัสออเดอร์ใหม่ลงในประวัติการสั่งของโต๊ะนี้
 * @param tableId รหัสโต๊ะ
 * @param orderId รหัสออเดอร์ที่เพิ่งสั่งสำเร็จ
 */
export function addMyOrderId(tableId: string, orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const current = getMyOrderIds(tableId);
    if (!current.includes(orderId)) {
      const updated = [...current, orderId];
      localStorage.setItem(`qrshop_my_orders_${tableId}`, JSON.stringify(updated));
    }
    // บันทึกลง legacy single key เพื่อความเข้ากันได้ย้อนหลัง
    localStorage.setItem(`qrshop_active_order_${tableId}`, orderId);
  } catch (e) {
    console.warn("Failed to save order ID to localStorage", e);
  }
}

/**
 * ดึงรหัสออเดอร์ล่าสุดที่สั่งสำหรับโต๊ะนี้
 * @param tableId รหัสโต๊ะ
 * @returns รหัสออเดอร์ล่าสุด หรือ null หากไม่มี
 */
export function getLatestMyOrderId(tableId: string): string | null {
  const orders = getMyOrderIds(tableId);
  return orders.length > 0 ? orders[orders.length - 1] : null;
}

/**
 * ล้างประวัติออเดอร์และตะกร้าของโต๊ะนี้ (เช่น เมื่อชำระเงินเสร็จสมบูรณ์แล้ว)
 * @param tableId รหัสโต๊ะ
 */
export function clearMyOrders(tableId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`qrshop_my_orders_${tableId}`);
    localStorage.removeItem(`qrshop_active_order_${tableId}`);
    localStorage.removeItem(`qrshop_active_order_data_${tableId}`);
    localStorage.removeItem(`qrshop_cart_${tableId}`);
  } catch (e) {}
}
