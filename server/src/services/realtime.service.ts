/**
 * Realtime Event Hub & Broadcast Service
 * ศูนย์กลางจัดการการแจ้งเตือนแบบเรียลไทม์ (SSE: Server-Sent Events และ WebSockets)
 * ทำหน้าที่กระจาย Event ต่างๆ เช่น การสร้างออเดอร์ใหม่, การเปลี่ยนสถานะคิว, การชำระเงิน, และการอัปเดตเมนู
 */

import { EventEmitter } from "events";

/**
 * โครงสร้างข้อมูลข้อความแจ้งเตือนแบบ Realtime
 */
export interface RealtimeMessage {
  type:
    | "ORDER_CREATED"
    | "ORDER_UPDATED"
    | "ORDER_STATUS_CHANGED"
    | "ORDER_PAID"
    | "ORDER_CANCELLED"
    | "ORDER_ITEM_CANCELLED"
    | "CUSTOMER_PAYMENT_SUBMITTED"
    | "CUSTOMER_ORDER_ITEMS_CANCELLED"
    | "MENU_UPDATED"
    | "CRUST_UPDATED"
    | "SAMPLE_MENU_UPDATED"
    | "OUT_OF_STOCK_TOGGLED"
    | "PING";
  restaurantId: number | string; // รหัสร้านค้าเป้าหมาย
  data: any;                     // ข้อมูล Payload แนบ
  timestamp: string;             // เวลาที่เกิด Event (ISO String)
}

/**
 * Controller สำหรับควบคุมการส่งข้อมูลผ่าน Server-Sent Events (SSE)
 */
type SseController = {
  write: (data: string) => void;
  close: () => void;
};

class RealtimeHub extends EventEmitter {
  // เก็บรายการ Client ที่เชื่อมต่อผ่าน SSE แยกตามร้านค้า
  private sseClients: Map<string, Set<SseController>> = new Map();
  // เก็บรายการ Client ที่เชื่อมต่อผ่าน WebSocket แยกตามร้านค้า
  private wsClients: Map<string, Set<any>> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // -------------------------------------------------------------
  // การจัดการการเชื่อมต่อผ่าน SSE (Server-Sent Events)
  // -------------------------------------------------------------

  /**
   * ลงทะเบียน Client เข้าสู่ช่องทางรับ SSE ของร้านค้านั้นๆ
   */
  subscribeSse(restaurantId: string | number, controller: SseController) {
    const key = String(restaurantId || "global");
    if (!this.sseClients.has(key)) {
      this.sseClients.set(key, new Set());
    }
    this.sseClients.get(key)!.add(controller);

    // ส่งข้อความยืนยันการเชื่อมต่อเริ่มต้น (Handshake Connected)
    controller.write(
      `data: ${JSON.stringify({
        type: "CONNECTED",
        restaurantId: key,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );
  }

  /**
   * ยกเลิกการเชื่อมต่อ SSE ของ Client
   */
  unsubscribeSse(restaurantId: string | number, controller: SseController) {
    const key = String(restaurantId || "global");
    const set = this.sseClients.get(key);
    if (set) {
      set.delete(controller);
      if (set.size === 0) {
        this.sseClients.delete(key);
      }
    }
  }

  // -------------------------------------------------------------
  // การจัดการการเชื่อมต่อผ่าน WebSocket
  // -------------------------------------------------------------

  /**
   * ลงทะเบียน WebSocket Client ของร้านค้า
   */
  subscribeWs(restaurantId: string | number, ws: any) {
    const key = String(restaurantId || "global");
    if (!this.wsClients.has(key)) {
      this.wsClients.set(key, new Set());
    }
    this.wsClients.get(key)!.add(ws);

    try {
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          restaurantId: key,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}
  }

  /**
   * ยกเลิกการเชื่อมต่อ WebSocket
   */
  unsubscribeWs(restaurantId: string | number, ws: any) {
    const key = String(restaurantId || "global");
    const set = this.wsClients.get(key);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.wsClients.delete(key);
      }
    }
  }

  // -------------------------------------------------------------
  // การกระจายข้อความ Realtime (Broadcast Event)
  // -------------------------------------------------------------

  /**
   * กระจาย Event ไปยังทุก Client ที่ Subscribe อยู่ (ทั้ง SSE และ WebSocket)
   * 
   * @param restaurantId รหัสร้านค้าที่เกิด Event
   * @param type ประเภทของ Event (เช่น ORDER_CREATED, ORDER_STATUS_CHANGED)
   * @param data ข้อมูลที่ต้องการส่ง
   */
  broadcast(restaurantId: string | number, type: RealtimeMessage["type"], data: any) {
    const targetKey = String(restaurantId || "global");
    const message: RealtimeMessage = {
      type,
      restaurantId: targetKey,
      data,
      timestamp: new Date().toISOString(),
    };

    const payload = JSON.stringify(message);

    // 1. ส่ง Event ภายใน Node.js EventEmitter
    this.emit(`restaurant:${targetKey}`, message);
    this.emit("global", message);

    // 2. กระจายข้อความไปยังทุก Active SSE Clients
    const sseTargets = new Set<SseController>();
    for (const [_, set] of this.sseClients.entries()) {
      for (const client of set) sseTargets.add(client);
    }
    for (const client of sseTargets) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {}
    }

    // 3. กระจายข้อความไปยังทุก Active WebSocket Clients
    const wsTargets = new Set<any>();
    for (const [_, set] of this.wsClients.entries()) {
      for (const ws of set) wsTargets.add(ws);
    }
    for (const ws of wsTargets) {
      try {
        ws.send(payload);
      } catch (err) {}
    }

    console.log(` [RealtimeHub] Broadcasted ${type} to all subscribers (${sseTargets.size} SSE, ${wsTargets.size} WS, target=${targetKey})`);
  }
}

export const RealtimeService = new RealtimeHub();
