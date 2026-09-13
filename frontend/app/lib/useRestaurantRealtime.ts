"use client";

/**
 * =========================================================================================
 * @file useRestaurantRealtime.ts
 * @description Hook และเซอร์วิส Real-time สำหรับร้านอาหาร (WebSocket / SSE & TTS Voice Announcements)
 * 
 * หน้าที่หลัก:
 * - เชื่อมต่อ WebSocket แบบสองทางกับ Backend สำหรับรับ Event ออเดอร์แบบ Real-time
 * - หาก WebSocket ขัดข้อง จะสลับไปใช้ Server-Sent Events (SSE) อัตโนมัติเป็น Fallback
 * - ระบบส่งเสียงพูดภาษาไทย (Google TTS ผ่าน Server Proxy / SpeechSynthesis) และเสียงเตือน Chime
 *   เมื่อมีออเดอร์ใหม่, ลูกค้าแจ้งชำระเงิน, ร้านยืนยันออเดอร์ หรือออเดอร์ปรุงเสร็จ
 * - ป้องกันการประมวลผล Event ซ้ำ (Event Deduplication) และจัดการเสียงเบื้องหลัง
 * =========================================================================================
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { getFriendlyTableLabel, getCleanTableNumber } from "./utils";

/**
 * โครงสร้าง Event ที่ได้รับจาก WebSocket / SSE
 */
export interface RealtimeOrderEvent {
  /** ประเภทของเหตุการณ์ */
  type: "ORDER_CREATED" | "ORDER_UPDATED" | "ORDER_STATUS_CHANGED" | "ORDER_PAID" | "CUSTOMER_PAYMENT_SUBMITTED" | "PONG" | "CONNECTED";
  /** รหัสร้านค้า */
  restaurantId: string | number;
  /** ข้อมูล payload */
  data: any;
  /** เวลาเกิดเหตุการณ์ (ISO String) */
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ระบบเสียงแจ้งเตือนและสังเคราะห์เสียงพูด (Audio & Voice Announcement System)
// ═══════════════════════════════════════════════════════════════════════════════

/** AudioContext ที่ใช้ร่วมกันเพื่อประหยัดทรัพยากร */
let sharedAudioContext: AudioContext | null = null;
/** อินสแตนซ์ HTMLAudioElement ปัจจุบันที่กำลังเล่นเสียงพูด */
let currentVoiceAudio: HTMLAudioElement | null = null;

/**
 * ดึงหรือสร้าง AudioContext สำหรับเล่นเสียง
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

// ปลดล็อก AudioContext อัตโนมัติเมื่อผู้ใช้แตะหรือคลิกหน้าจอครั้งแรก
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
}

/**
 * เล่นเสียงกระดิ่งเตือนในครัว (Kitchen Order Chime)
 * ใช้โน้ต E5 และ A5 สังเคราะห์ผ่าน Web Audio API
 */
export function playOrderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // โน้ตที่ 1: E5 (659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // โน้ตที่ 2: A5 (880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.75);
  } catch (err) {
    console.warn("[TTS] Audio chime error:", err);
  }
}

/** แคชเสียงของระบบ SpeechSynthesis */
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) voicesLoaded = true;
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * ค้นหาเสียงภาษาไทยที่เหมาะสมที่สุดจากระบบปฏิบัติการของผู้ใช้
 */
function findBestThaiVoice(): SpeechSynthesisVoice | null {
  if (!voicesLoaded && typeof window !== "undefined" && "speechSynthesis" in window) {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) voicesLoaded = true;
  }
  if (cachedVoices.length === 0) return null;

  return (
    cachedVoices.find((v) => v.lang.toLowerCase() === "th-th") ||
    cachedVoices.find((v) => v.lang.toLowerCase().startsWith("th")) ||
    cachedVoices.find(
      (v) => v.name.toLowerCase().includes("thai") || v.name.toLowerCase().includes("ภาษาไทย")
    ) ||
    null
  );
}

/**
 * ออกเสียงข้อความภาษาไทยผ่าน SpeechSynthesis ในกรณีมี Thai Voice ติดตั้งบน OS
 */
function speakThaiTextIfVoiceAvailable(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const thaiVoice = findBestThaiVoice();
  // หากไม่มีเสียงไทยบน OS ให้ข้าม เพื่อไม่ให้เสียงภาษาอังกฤษอ่านภาษาไทยจนฟังไม่รู้เรื่อง
  if (!thaiVoice) {
    console.warn("[TTS] No OS Thai voice installed; skipping SpeechSynthesis to avoid English voice reading Thai text.");
    return;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.voice = thaiVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    synth.speak(utterance);
    if (synth.paused) synth.resume();
  } catch (e) {
    console.warn("[TTS] SpeechSynthesis failed:", e);
  }
}

/** ตรวจสอบว่าเปิดใช้งานเสียงแจ้งเตือนออเดอร์ใหม่หรือไม่ */
export function isNewOrderSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem("crape_sound_new_order");
    if (val !== null) return val === "true";
  } catch {}
  return true;
}

/** ตั้งค่าเปิด/ปิดเสียงแจ้งเตือนออเดอร์ใหม่ */
export function setNewOrderSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("crape_sound_new_order", String(enabled));
  } catch {}
}

/** ตรวจสอบว่าเปิดใช้งานเสียงแจ้งเตือนการชำระเงินหรือไม่ */
export function isPaymentSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem("crape_sound_payment");
    if (val !== null) return val === "true";
  } catch {}
  return true;
}

/** ตั้งค่าเปิด/ปิดเสียงแจ้งเตือนการชำระเงิน */
export function setPaymentSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("crape_sound_payment", String(enabled));
  } catch {}
}

/**
 * คำนวณ Base URL สำหรับเรียกใช้ API ให้อัตโนมัติและแม่นยำ
 */
export function getEffectiveApiUrl(): string {
  const envApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envApi) {
    if (envApi.startsWith("/")) {
      if (typeof window !== "undefined") {
        return `${window.location.origin}${envApi}`;
      }
      return `http://localhost:8800${envApi}`;
    }
    return envApi.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }
  return "http://localhost:8800/api/v1";
}

/**
 * แปลงรหัสคิวให้เป็นคำอ่านภาษาไทยที่ถูกต้องและเป็นธรรมชาติสำหรับ Google TTS
 * เช่น "A001" -> "เอ 1", "B012" -> "บี 12", "Q003" -> "คิว 3", "005" -> "5"
 */
export function formatQueueForSpeech(rawQueue?: string | number | null): string {
  if (rawQueue === undefined || rawQueue === null) return "";
  const str = String(rawQueue).trim().replace(/^table[-_]?/i, "").replace(/^คิวที่?\s*/i, "").replace(/^ord[-_]?/i, "");
  if (!str || str === "0" || str === "-") return "";

  // กรณีมีตัวอักษรนำหน้า เช่น A001, A1, B05, Q002
  const letterMatch = str.match(/^([A-Za-z]+)\s*0*(\d+)$/);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    const num = parseInt(letterMatch[2], 10);
    const thaiLetterMap: Record<string, string> = {
      A: "เอ",
      B: "บี",
      C: "ซี",
      D: "ดี",
      E: "อี",
      F: "เอฟ",
      G: "จี",
      Q: "คิว",
    };
    const thaiLetter = thaiLetterMap[letter] || letter;
    return `${thaiLetter} ${num}`;
  }

  // กรณีเป็นตัวเลขล้วน มีเลข 0 นำหน้า เช่น 001 -> 1
  const numMatch = str.match(/^0*(\d+)$/);
  if (numMatch) {
    return numMatch[1];
  }

  return str;
}

/**
 * ประกาศเสียงพูดภาษาไทยแจ้งเตือนออเดอร์ใหม่:
 * เช่น "ออเดอร์ใหม่ คิวที่ เอ 1 สั่งเครป 3 รายการค่ะ"
 */
export async function speakOrderVoiceAnnouncement(options?: {
  tableNumber?: string | number;
  tableName?: string;
  queueNumber?: string | number;
  itemCount?: number;
  customText?: string;
  force?: boolean;
}) {
  if (!options?.force && !isNewOrderSoundEnabled()) {
    return;
  }

  // 1. เล่นเสียงกระดิ่งนำหน้า
  playOrderChime();

  if (typeof window === "undefined") return;

  // 2. สร้างข้อความเสียงภาษาไทย
  const rawQueue = options?.queueNumber ?? options?.tableNumber ?? options?.tableName;
  const qSpeech = formatQueueForSpeech(rawQueue);
  const queueText = qSpeech ? ` คิวที่ ${qSpeech}` : "";

  const count = options?.itemCount;
  const countText = count && count > 0 ? ` สั่งเครป ${count} รายการค่ะ` : " สั่งเครปค่ะ";
  const speechText = options?.customText || `ออเดอร์ใหม่${queueText}${countText}`;

  // 3. เล่นไฟล์เสียง Google Thai TTS ผ่านเซิร์ฟเวอร์ Proxy
  try {
    const clientApiKey = process.env.NEXT_PUBLIC_API_KEY || "";
    const apiUrl = getEffectiveApiUrl();
    const ttsUrl = clientApiKey
      ? `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}&apiKey=${encodeURIComponent(clientApiKey)}`
      : `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}`;

    // วิธีที่ 1: Web Audio API Buffer (เล่นได้ทันทีแม้แท็บทำงานใน background)
    const ctx = getAudioContext();
    if (ctx) {
      try {
        const fetchHeaders: Record<string, string> = {};
        if (clientApiKey) {
          fetchHeaders["X-Api-Key"] = clientApiKey;
        }
        const response = await fetch(ttsUrl, {
          headers: fetchHeaders,
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start(ctx.currentTime + 0.4);
          return;
        }
      } catch (err) {
        console.warn("[TTS] WebAudio buffer decode failed, trying HTMLAudioElement:", err);
      }
    }

    // วิธีที่ 2: HTMLAudioElement Fallback
    setTimeout(() => {
      try {
        if (currentVoiceAudio) {
          currentVoiceAudio.pause();
          currentVoiceAudio.currentTime = 0;
          currentVoiceAudio = null;
        }
        const audio = new Audio(ttsUrl);
        currentVoiceAudio = audio;
        audio.volume = 1.0;
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => speakThaiTextIfVoiceAvailable(speechText));
        }
      } catch {
        speakThaiTextIfVoiceAvailable(speechText);
      }
    }, 450);
  } catch (err) {
    console.warn("[TTS] Voice announcement failed:", err);
    speakThaiTextIfVoiceAvailable(speechText);
  }
}

/**
 * ประกาศเสียงพูดภาษาไทยแจ้งเตือนเมื่อลูกค้าแจ้งชำระเงิน:
 * เช่น "ออเดอร์คิวที่ เอ 1 ลูกค้าแจ้งชำระเงินแล้ว 160 บาทค่ะ"
 */
export async function speakPaymentVoiceAnnouncement(options?: {
  tableNumber?: string | number;
  tableName?: string;
  queueNumber?: string | number;
  orderId?: string | number;
  amount?: number;
  customText?: string;
  force?: boolean;
}) {
  if (!options?.force && !isPaymentSoundEnabled()) {
    return;
  }

  playOrderChime();

  if (typeof window === "undefined") return;

  const rawQueue = options?.queueNumber ?? options?.tableNumber ?? options?.tableName ?? options?.orderId;
  const qSpeech = formatQueueForSpeech(rawQueue) || "1";

  const amt = options?.amount || 0;
  const amtStr = amt > 0 ? `${amt}` : "0";

  const speechText =
    options?.customText ||
    `ออเดอร์คิวที่ ${qSpeech} ลูกค้าแจ้งชำระเงินแล้ว ${amtStr} บาทค่ะ`;

  try {
    const clientApiKey = process.env.NEXT_PUBLIC_API_KEY || "";
    const apiUrl = getEffectiveApiUrl();
    const ttsUrl = clientApiKey
      ? `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}&apiKey=${encodeURIComponent(clientApiKey)}`
      : `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}`;

    const ctx = getAudioContext();
    if (ctx) {
      try {
        const response = await fetch(ttsUrl, {
          headers: {
            "X-Api-Key": clientApiKey,
          },
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start(ctx.currentTime + 0.4);
          return;
        }
      } catch (err) {
        console.warn("[TTS] WebAudio payment voice decode failed:", err);
      }
    }

    setTimeout(() => {
      try {
        if (currentVoiceAudio) {
          currentVoiceAudio.pause();
          currentVoiceAudio.currentTime = 0;
          currentVoiceAudio = null;
        }
        const audio = new Audio(ttsUrl);
        currentVoiceAudio = audio;
        audio.volume = 1.0;
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => speakThaiTextIfVoiceAvailable(speechText));
        }
      } catch {
        speakThaiTextIfVoiceAvailable(speechText);
      }
    }, 450);
  } catch (err) {
    console.warn("[TTS] Payment voice announcement failed:", err);
    speakThaiTextIfVoiceAvailable(speechText);
  }
}

/** ตัวแปรป้องกันการออกเสียงยืนยันออเดอร์ซ้ำซ้อน */
let lastConfirmedVoiceText = "";
let lastConfirmedVoiceTime = 0;

/**
 * ประกาศเสียงพูดเมื่อร้านกดยืนยันรับออเดอร์
 */
export async function speakOrderConfirmedAnnouncement(options?: {
  queueNumber?: string | number;
  customText?: string;
}) {
  if (typeof window === "undefined") return;

  const rawQueue = options?.queueNumber;
  const qSpeech = formatQueueForSpeech(rawQueue);

  const speechText =
    options?.customText ||
    (qSpeech ? `ออเดอร์คิวที่ ${qSpeech} ร้านยืนยันรับออเดอร์ค่ะ` : `ออเดอร์ร้านยืนยันรับออเดอร์ค่ะ`);

  const now = Date.now();
  if (speechText === lastConfirmedVoiceText && now - lastConfirmedVoiceTime < 2500) {
    return;
  }
  lastConfirmedVoiceText = speechText;
  lastConfirmedVoiceTime = now;

  playOrderChime();

  try {
    const clientApiKey = process.env.NEXT_PUBLIC_API_KEY || "";
    const apiUrl = getEffectiveApiUrl();
    const ttsUrl = clientApiKey
      ? `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}&apiKey=${encodeURIComponent(clientApiKey)}`
      : `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}`;

    const ctx = getAudioContext();
    if (ctx) {
      try {
        const fetchHeaders: Record<string, string> = {};
        if (clientApiKey) {
          fetchHeaders["X-Api-Key"] = clientApiKey;
        }
        const response = await fetch(ttsUrl, {
          headers: fetchHeaders,
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start(ctx.currentTime + 0.4);
          return;
        }
      } catch (err) {
        console.warn("[TTS] WebAudio confirmed voice decode failed:", err);
      }
    }

    setTimeout(() => {
      try {
        if (currentVoiceAudio) {
          currentVoiceAudio.pause();
          currentVoiceAudio.currentTime = 0;
          currentVoiceAudio = null;
        }
        const audio = new Audio(ttsUrl);
        currentVoiceAudio = audio;
        audio.volume = 1.0;
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => speakThaiTextIfVoiceAvailable(speechText));
        }
      } catch {
        speakThaiTextIfVoiceAvailable(speechText);
      }
    }, 450);
  } catch (err) {
    console.warn("[TTS] Confirmed voice announcement failed:", err);
    speakThaiTextIfVoiceAvailable(speechText);
  }
}

let lastReadyVoiceText = "";
let lastReadyVoiceTime = 0;

/**
 * ประกาศเสียงพูดเมื่อออเดอร์ปรุงเสร็จแล้วพร้อมรับอาหาร:
 * เช่น "ออเดอร์ คิวที่ เอ 1 ของคุณร้านทำเสร็จแล้วค่ะ"
 */
export async function speakOrderReadyAnnouncement(options?: {
  queueNumber?: string | number;
  customText?: string;
}) {
  if (typeof window === "undefined") return;

  const rawQueue = options?.queueNumber;
  const qSpeech = formatQueueForSpeech(rawQueue);

  const speechText =
    options?.customText ||
    (qSpeech
      ? `ออเดอร์ คิวที่ ${qSpeech} ของคุณร้านทำเสร็จแล้วค่ะ`
      : `ออเดอร์ของคุณร้านทำเสร็จแล้วค่ะ`);

  const now = Date.now();
  if (speechText === lastReadyVoiceText && now - lastReadyVoiceTime < 3000) {
    return;
  }
  lastReadyVoiceText = speechText;
  lastReadyVoiceTime = now;

  playOrderChime();

  try {
    const clientApiKey = process.env.NEXT_PUBLIC_API_KEY || "";
    const apiUrl = getEffectiveApiUrl();
    const ttsUrl = clientApiKey
      ? `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}&apiKey=${encodeURIComponent(clientApiKey)}`
      : `${apiUrl}/tts/speak?text=${encodeURIComponent(speechText)}`;

    const ctx = getAudioContext();
    if (ctx) {
      try {
        const fetchHeaders: Record<string, string> = {};
        if (clientApiKey) {
          fetchHeaders["X-Api-Key"] = clientApiKey;
        }
        const response = await fetch(ttsUrl, {
          headers: fetchHeaders,
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start(ctx.currentTime + 0.4);
          return;
        }
      } catch (err) {
        console.warn("[TTS] WebAudio ready voice decode failed:", err);
      }
    }

    setTimeout(() => {
      try {
        if (currentVoiceAudio) {
          currentVoiceAudio.pause();
          currentVoiceAudio.currentTime = 0;
          currentVoiceAudio = null;
        }
        const audio = new Audio(ttsUrl);
        currentVoiceAudio = audio;
        audio.volume = 1.0;
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => speakThaiTextIfVoiceAvailable(speechText));
        }
      } catch {
        speakThaiTextIfVoiceAvailable(speechText);
      }
    }, 450);
  } catch (err) {
    console.warn("[TTS] Ready voice announcement failed:", err);
    speakThaiTextIfVoiceAvailable(speechText);
  }
}

/**
 * คำนวณ WebSocket URL สำหรับเชื่อมต่อ Real-time
 * @param targetShopId รหัสร้านค้า
 */
export function getRealtimeWsUrl(targetShopId: string | number): string {
  const clientApiKey = process.env.NEXT_PUBLIC_API_KEY || "";
  const keyParam = clientApiKey ? `&apiKey=${encodeURIComponent(clientApiKey)}` : "";
  const envWs = process.env.NEXT_PUBLIC_API_WS_URL?.trim();
  if (envWs) {
    if (envWs.startsWith("ws://") || envWs.startsWith("wss://")) {
      const cleanWs = envWs.replace(/\/+$/, "");
      return cleanWs.includes("/realtime/ws")
        ? `${cleanWs}?restaurantId=${targetShopId}${keyParam}`
        : `${cleanWs}/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
    }
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${envWs.replace(/\/+$/, "")}/api/v1/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
  }

  // แปลงอัตโนมัติจาก NEXT_PUBLIC_API_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl && (apiUrl.startsWith("http://") || apiUrl.startsWith("https://"))) {
    const wsBase = apiUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:").replace(/\/+$/, "");
    return `${wsBase}/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
  }

  // กรณีรันบน Localhost
  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) {
      return `ws://localhost:8800/api/v1/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
    }
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${window.location.host}/api/v1/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
  }

  const defaultWsBase = "ws://localhost:8800/api/v1";
  return `${defaultWsBase}/realtime/ws?restaurantId=${targetShopId}${keyParam}`;
}

/**
 * Custom React Hook สำหรับเชื่อมต่อ Real-time ของร้านอาหาร
 * จัดการ WebSocket Connection, SSE Fallback, Toast แจ้งเตือน และเสียงพูด
 */
export function useRestaurantRealtime({
  restaurantId,
  onOrderCreated,
  onOrderStatusChanged,
  onOrderUpdated,
}: {
  restaurantId?: string | number;
  onOrderCreated?: (order: any) => void;
  onOrderStatusChanged?: (order: any) => void;
  onOrderUpdated?: (order: any) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // บันทึก Callbacks ไว้ใน Ref เพื่อป้องกันการ Reconnect WebSocket โดยไม่จำเป็น
  const onOrderCreatedRef = useRef(onOrderCreated);
  const onOrderStatusChangedRef = useRef(onOrderStatusChanged);
  const onOrderUpdatedRef = useRef(onOrderUpdated);

  useEffect(() => {
    onOrderCreatedRef.current = onOrderCreated;
    onOrderStatusChangedRef.current = onOrderStatusChanged;
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderCreated, onOrderStatusChanged, onOrderUpdated]);

  const targetShopId = restaurantId ? String(restaurantId) : "global";

  useEffect(() => {
    if (typeof window === "undefined") return;

    let destroyed = false;
    let reconnectTimeout: any = null;
    let pingTimer: any = null;

    const handledEventsMap = new Map<string, number>();

    /**
     * ประมวลผล Event ที่ได้รับจากเซิร์ฟเวอร์
     */
    const handleIncomingEvent = (event: RealtimeOrderEvent) => {
      setLastEventTime(new Date());

      const now = Date.now();
      // ล้างข้อมูล Dedupe Map เก่ากว่า 10 วินาที
      for (const [key, time] of handledEventsMap.entries()) {
        if (now - time > 10000) {
          handledEventsMap.delete(key);
        }
      }

      // เหตุการณ์ที่ 1: มีออเดอร์ใหม่เข้า
      if (event.type === "ORDER_CREATED") {
        const orderData = event.data;
        const orderId = orderData?.id || orderData?.order_id || orderData?.orderId || orderData?.queuePosition || orderData?.queueNumber;
        const dedupeKey = `ORDER_CREATED_${orderId}`;

        if (orderId && handledEventsMap.has(dedupeKey)) {
          onOrderCreatedRef.current?.(event.data);
          return;
        }
        if (orderId) handledEventsMap.set(dedupeKey, now);

        const tableNum = orderData?.tableNumber || orderData?.tableId;
        const queueNum = orderData?.queuePosition || orderData?.queueNumber;
        const itemCount = Array.isArray(orderData?.items)
          ? orderData.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0)
          : (orderData?.itemCount || (orderData?.items ? orderData.items.length : undefined));

        // ส่งเสียงพูดแจ้งเตือน
        speakOrderVoiceAnnouncement({
          tableNumber: tableNum,
          queueNumber: queueNum,
          itemCount: itemCount,
        });

        const queueLabel = queueNum ? `คิวที่ ${queueNum}` : "คิวใหม่";
        const totalAmount = orderData?.total ? `(฿${orderData.total})` : "";
        toast.success(`ออเดอร์ใหม่: ${queueLabel} ${totalAmount}`, {
          id: `toast-order-${orderId || queueNum || now}`,
          duration: 6000,
          description: `สั่งอาหาร ${itemCount || 1} รายการ - เพิ่มเข้าคิวปรุงแล้ว`,
          action: {
            label: "ดูคิว",
            onClick: () => {
              if (typeof window !== "undefined" && window.location.pathname !== "/restaurant/queue") {
                window.location.href = "/restaurant/queue";
              }
            },
          },
        });
        onOrderCreatedRef.current?.(event.data);
      } 
      // เหตุการณ์ที่ 2: ลูกค้าชำระเงินสำเร็จ
      else if (event.type === "ORDER_PAID") {
        const orderData = event.data?.order || event.data;
        const orderId = orderData?.id || orderData?.order_id || orderData?.orderId || event.data?.orderId;
        const dedupeKey = `ORDER_PAID_${orderId}`;

        if (orderId && handledEventsMap.has(dedupeKey)) {
          onOrderStatusChangedRef.current?.(orderData);
          onOrderUpdatedRef.current?.(orderData);
          return;
        }
        if (orderId) handledEventsMap.set(dedupeKey, now);

        const queueNum = event.data?.queueNumber || orderData?.queueNumber || orderData?.queuePosition;
        const amount = Number(event.data?.amount || orderData?.total || orderData?.totalAmount || 0);

        speakPaymentVoiceAnnouncement({
          tableNumber: orderData?.tableNumber || orderData?.tableId,
          queueNumber: queueNum,
          orderId: orderData?.id || event.data?.orderId,
          amount: amount,
        });

        const queueLabel = queueNum ? `คิวที่ ${queueNum}` : "คิวลูกค้า";
        toast.success(`ชำระเงินสำเร็จ: ${queueLabel} (฿${amount})`, {
          id: `toast-paid-${orderId || queueNum || now}`,
          duration: 7000,
          description: `ได้รับยอดชำระเงินเรียบร้อยแล้ว`,
          action: {
            label: "ดูคิว",
            onClick: () => {
              if (typeof window !== "undefined" && window.location.pathname !== "/restaurant/queue") {
                window.location.href = "/restaurant/queue";
              }
            },
          },
        });

        onOrderStatusChangedRef.current?.(orderData);
        onOrderUpdatedRef.current?.(orderData);
      } 
      // เหตุการณ์ที่ 3: สถานะออเดอร์เปลี่ยน
      else if (event.type === "ORDER_STATUS_CHANGED") {
        onOrderStatusChangedRef.current?.(event.data);
      } 
      // เหตุการณ์ที่ 4: ยกเลิกรายการสินค้า (อัปเดตเงียบๆ โดยไม่ส่งเสียง)
      else if ((event.type as string) === "ORDER_ITEM_CANCELLED") {
        onOrderUpdatedRef.current?.(event.data);
      } 
      // เหตุการณ์ที่ 5: ยกเลิกทั้งออเดอร์ (อัปเดตเงียบๆ)
      else if ((event.type as string) === "ORDER_CANCELLED") {
        onOrderUpdatedRef.current?.(event.data?.order || event.data);
      } 
      // เหตุการณ์ที่ 6: อัปเดตข้อมูลออเดอร์ (เช่น ลูกค้าแก้ไขเปลี่ยนไส้)
      else if (event.type === "ORDER_UPDATED") {
        const orderData = event.data;
        const status = String(orderData?.status || "").toLowerCase();
        const isCancelled =
          status === "cancelled" ||
          Boolean(orderData?.isCancelled) ||
          Boolean(orderData?.cancelEntireOrder) ||
          Boolean(orderData?.isItemCancelled) ||
          Boolean(orderData?.cancelReason) ||
          Boolean(orderData?.replacementInfo?.cancelledItemName) ||
          (Array.isArray(orderData?.items) &&
            orderData.items.length > 0 &&
            orderData.items.every((it: any) => it.isCancelled || String(it.status).toLowerCase() === "cancelled"));

        if (isCancelled) {
          onOrderUpdatedRef.current?.(orderData);
          return;
        }

        const queueNum = orderData?.queuePosition || orderData?.queueNumber || orderData?.replacementInfo?.queuePosition;
        const queueText = queueNum ? `คิวที่ ${queueNum}` : "คิวลูกค้า";
        const newItemName = orderData?.replacementInfo?.newItemName;

        if (newItemName) {
          speakOrderVoiceAnnouncement({
            queueNumber: queueNum,
            customText: `ออเดอร์${queueText} แก้ไขเมนูแล้วค่ะ`,
          });

          toast.info(`${queueText} แก้ไขรายการอาหาร`, {
            duration: 8000,
            description: `แก้ไขตัวเลือกเมนู "${newItemName}" เรียบร้อยแล้ว`,
            action: {
              label: "ดูคิว",
              onClick: () => {
                if (typeof window !== "undefined" && window.location.pathname !== "/restaurant/queue") {
                  window.location.href = "/restaurant/queue";
                }
              },
            },
          });
        }
        onOrderUpdatedRef.current?.(event.data);
      }
    };

    /**
     * สร้างการเชื่อมต่อ WebSocket
     */
    const connectWebSocket = () => {
      if (destroyed) return;
      try {
        const wsUrl = getRealtimeWsUrl(targetShopId);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (destroyed) {
            ws.close();
            return;
          }
          setIsConnected(true);
          // หาก WebSocket ต่อสำเร็จ ให้ปิด SSE Fallback
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }

          if (pingTimer) clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PING" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data: RealtimeOrderEvent = JSON.parse(event.data);
            if (data.type && data.type !== "PONG" && (data as any).type !== "CONNECTED") {
              handleIncomingEvent(data);
            }
          } catch {}
        };

        ws.onerror = () => {
          if (!destroyed && !sseRef.current) {
            connectSSE();
          }
        };

        ws.onclose = () => {
          if (pingTimer) clearInterval(pingTimer);
          if (!destroyed && !sseRef.current) {
            connectSSE();
          }
        };
      } catch (err) {
        if (!destroyed && !sseRef.current) {
          connectSSE();
        }
      }
    };

    /**
     * สร้างการเชื่อมต่อ SSE (Server-Sent Events) สำรองเมื่อ WebSocket ไม่พร้อมใช้งาน
     */
    const connectSSE = () => {
      if (destroyed || sseRef.current) return;
      try {
        const apiUrl = getEffectiveApiUrl();
        const sseUrl = `${apiUrl}/realtime/events?restaurantId=${targetShopId}`;

        const sse = new EventSource(sseUrl);
        sseRef.current = sse;

        sse.onopen = () => {
          if (destroyed) {
            sse.close();
            return;
          }
          setIsConnected(true);
        };

        sse.onmessage = (event) => {
          try {
            const data: RealtimeOrderEvent = JSON.parse(event.data);
            if (data.type && (data as any).type !== "CONNECTED") {
              handleIncomingEvent(data);
            }
          } catch {}
        };

        sse.onerror = () => {
          if (destroyed) return;
          setIsConnected(false);
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
          // รอ 8 วินาทีแล้วลองเชื่อมต่อ WebSocket ใหม่
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            if (!destroyed) connectWebSocket();
          }, 8000);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // ล้าง Connection เมื่อ Unmount
    return () => {
      destroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingTimer) clearInterval(pingTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [targetShopId]);

  return { isConnected, lastEventTime };
}
