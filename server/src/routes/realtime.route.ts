/**
 * Realtime Routes
 * เส้นทาง API สำหรับการเชื่อมต่อข้อมูลแบบเรียลไทม์:
 * 1. SSE (Server-Sent Events) ที่ /api/v1/realtime/events: สตรีมข้อความแจ้งเตือนสถานะออเดอร์และการเงินแบบเรียลไทม์
 * 2. WebSockets ที่ /api/v1/realtime/ws: ช่องทางสื่อสารสองทาง พร้อมตรวจสอบ API Key
 */

import { Elysia, t } from "elysia";
import { RealtimeService } from "../services/realtime.service";
import { getExpectedApiKey } from "../libs/apiKeyGuard";

export const realtimeRoutes = new Elysia({ prefix: "/realtime" })
  // ==========================================
  // 1. Server-Sent Events (SSE) Endpoint
  // ==========================================
  .get(
    "/events",
    ({ query, set }) => {
      const restaurantId = query.restaurantId || "global";

      // ตั้งค่า Headers สำหรับ SSE Stream
      set.headers["Content-Type"] = "text/event-stream";
      set.headers["Cache-Control"] = "no-cache";
      set.headers["Connection"] = "keep-alive";
      set.headers["Access-Control-Allow-Origin"] = "*";

      return new Response(
        new ReadableStream({
          start(controller) {
            const sseClient = {
              write: (data: string) => {
                controller.enqueue(new TextEncoder().encode(data));
              },
              close: () => {
                controller.close();
              },
            };

            // ลงทะเบียน Client เข้าสู่ช่องทาง Realtime
            RealtimeService.subscribeSse(restaurantId, sseClient);

            // ส่ง Heartbeat Ping ทุก 25 วินาที เพื่อรักษาการเชื่อมต่อไม่ให้หลุด
            const pingInterval = setInterval(() => {
              try {
                controller.enqueue(
                  new TextEncoder().encode(`: ping - ${new Date().toISOString()}\n\n`)
                );
              } catch {
                clearInterval(pingInterval);
                RealtimeService.unsubscribeSse(restaurantId, sseClient);
              }
            }, 25000);
          },
          cancel() {
            // เมื่อ Client ตัดการเชื่อมต่อ
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    },
    {
      query: t.Object({
        restaurantId: t.Optional(t.String()),
      }),
    }
  )

  // ==========================================
  // 2. WebSocket Endpoint
  // ==========================================
  .ws("/ws", {
    query: t.Object({
      restaurantId: t.Optional(t.String()),
      apiKey: t.Optional(t.String()),
    }),
    open(ws) {
      // ตรวจสอบความถูกต้องของ API Key
      const apiKey = ws.data.query?.apiKey || (ws.data as any).headers?.["x-api-key"];
      const expectedKey = getExpectedApiKey();
      if (!expectedKey || !apiKey || apiKey !== expectedKey) {
        ws.send(JSON.stringify({ error: "Unauthorized: Invalid API Key" }));
        ws.close(4401, "Unauthorized: Invalid API key");
        return;
      }

      const restaurantId = ws.data.query?.restaurantId || "global";
      RealtimeService.subscribeWs(restaurantId, ws);
      console.log(` [WS] Client connected for restaurant: ${restaurantId}`);
    },
    message(ws, message: any) {
      // ตอบกลับ Ping Heartbeat จาก Client
      if (message === "ping" || message?.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
      }
    },
    close(ws) {
      const restaurantId = ws.data.query?.restaurantId || "global";
      RealtimeService.unsubscribeWs(restaurantId, ws);
      console.log(` [WS] Client disconnected for restaurant: ${restaurantId}`);
    },
  });
