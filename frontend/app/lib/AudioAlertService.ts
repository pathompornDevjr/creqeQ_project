"use client";

/**
 * =========================================================================================
 * @file AudioAlertService.ts
 * @description เซอร์วิสจัดการเสียงแจ้งเตือนในครัวด้วย Web Audio API Synthesizer
 * 
 * หน้าที่หลัก:
 * - สังเคราะห์เสียงกระดิ่งเตือน (Chime) เมื่อมีออเดอร์ใหม่เข้า โดยไม่ต้องพึ่งพาไฟล์เสียงภายนอก (.mp3/.wav)
 * - ป้องกันปัญหาการเล่นเสียงบนเบราว์เซอร์ด้วยระบบปลดล็อก AudioContext (Web Audio API)
 * - รองรับการตั้งค่า ปิดเสียง (Mute) / เปิดเสียงเตือน
 * =========================================================================================
 */

/**
 * คลาส AudioAlertService
 * จัดการ AudioContext และสร้างโทนเสียงแจ้งเตือนแบบ Polyphonic 3 โน้ต (E5, G#5, B5)
 */
class AudioAlertService {
  /** อินสแตนซ์ AudioContext ของ Web Audio API */
  private audioCtx: AudioContext | null = null;
  /** สถานะการปิดเสียงแจ้งเตือน */
  private isMuted: boolean = false;

  /**
   * เริ่มต้นหรือกู้คืนสถานะ AudioContext
   * ป้องกันปัญหา browser suspend เมื่อผู้ใช้ยังไม่ได้ interact กับหน้าจอ
   */
  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * กำหนดสถานะ Mute
   * @param muted true = ปิดเสียง, false = เปิดเสียง
   */
  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  /**
   * ตรวจสอบสถานะว่าถูกปิดเสียงอยู่หรือไม่
   */
  getMuted() {
    return this.isMuted;
  }

  /**
   * เล่นเสียงกระดิ่งแจ้งเตือนออเดอร์ใหม่ (Kitchen Order Chime)
   * ใช้คลื่นเสียง Sine Wave 3 ระดับความถี่เพื่อความไพเราะและชัดเจนในสภาพแวดล้อมห้องครัว
   */
  playNewOrderChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // โน้ตที่ 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // โน้ตที่ 2: G#5 (830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(830.61, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);

      // โน้ตที่ 3: B5 (987.77 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(987.77, now + 0.24);
      gain3.gain.setValueAtTime(0, now + 0.24);
      gain3.gain.linearRampToValueAtTime(0.4, now + 0.28);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.9);
    } catch (err) {
      console.warn("Audio chime error:", err);
    }
  }
}

/** อินสแตนซ์ Singleton สำหรับเรียกใช้งานเสียงแจ้งเตือนทั่วทั้งแอปพลิเคชัน */
export const KitchenAudioService = new AudioAlertService();
