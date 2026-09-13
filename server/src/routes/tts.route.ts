/**
 * TTS Proxy Route (Text-to-Speech)
 * พร็อกซีสำหรับสร้างและสตรีมไฟล์เสียงเรียกคิวภาษาไทยจาก Google Translate TTS
 * ช่วยแก้ปัญหา CORS Policy เมื่อเบราว์เซอร์เรียกใช้งานออบเจกต์ Audio() ข้ามโดเมน
 */

import { Elysia, t } from "elysia";

export const ttsRoutes = new Elysia({ prefix: "/tts" })
  .get(
    "/speak",
    async ({ query, set }) => {
      const text = query.text;
      if (!text || text.trim().length === 0) {
        set.status = 400;
        return { success: false, message: "Missing 'text' query parameter" };
      }

      // จำกัดความยาวข้อความสูงสุด 200 ตัวอักษรเพื่อความเสถียร
      const sanitizedText = text.slice(0, 200);

      try {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(sanitizedText)}`;

        const response = await fetch(ttsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/",
          },
        });

        if (!response.ok) {
          console.warn(`[TTS] Google TTS returned ${response.status}`);
          set.status = 502;
          return { success: false, message: "TTS service unavailable" };
        }

        const audioBuffer = await response.arrayBuffer();

        // ส่งกลับเป็นไฟล์เสียง MP3 พร้อมแคช 1 ชั่วโมง
        set.headers["Content-Type"] = "audio/mpeg";
        set.headers["Cache-Control"] = "public, max-age=3600";
        set.headers["Access-Control-Allow-Origin"] = "*";

        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        console.error("[TTS] Proxy error:", err);
        set.status = 500;
        return { success: false, message: "TTS proxy error" };
      }
    },
    {
      query: t.Object({
        text: t.String(),
      }),
    }
  );
