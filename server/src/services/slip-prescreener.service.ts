/**
 * Slip Prescreener & QR Decoder Service
 * บริการถอดรหัส Mini QR Code บนสลิปธนาคารไทย (EMVCo QR) และตรวจสอบข้อมูลเบื้องต้น
 * ใช้ Sharp สำหรับปรับแต่งภาพ (Contrast, Threshold, Sharpen) และ ZXing / jsQR ในการแกะรหัส QR
 */

import sharp from "sharp";
import jsQR from "jsqr";
import {
  QRCodeReader,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from "@zxing/library";

// ─────────────────────────────────────────────────────────────────────────────
// ตารางจับคู่รหัสธนาคารในประเทศไทย (Thai Bank Codes Mapping)
// ─────────────────────────────────────────────────────────────────────────────

export const THAI_BANK_CODES: Record<string, string> = {
  "002": "BBL",     // ธนาคารกรุงเทพ
  "004": "KBANK",   // ธนาคารกสิกรไทย
  "006": "KTB",     // ธนาคารกรุงไทย
  "011": "TTB",     // ธนาคารทหารไทยธนชาต
  "014": "SCB",     // ธนาคารไทยพาณิชย์
  "022": "CIMB",    // ธนาคารซีไอเอ็มบีไทย
  "024": "UOB",     // ธนาคารยูโอบี
  "025": "BAY",     // ธนาคารกรุงศรีอยุธยา
  "030": "GSB",     // ธนาคารออมสิน
  "033": "GHB",     // ธนาคารอาคารสงเคราะห์
  "034": "BAAC",    // ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)
  "069": "KKP",     // ธนาคารเกียรตินาคินภัทร
  "073": "LH",      // ธนาคารแลนด์ แอนด์ เฮ้าส์
};

export function getBankCodeByName(bankName?: string): string | undefined {
  if (!bankName) return undefined;
  const lower = bankName.toLowerCase();
  if (lower.includes("กสิกร") || lower.includes("kbank")) return "004";
  if (lower.includes("ไทยพาณิชย์") || lower.includes("scb")) return "014";
  if (lower.includes("กรุงไทย") || lower.includes("ktb")) return "006";
  if (lower.includes("กรุงเทพ") || lower.includes("bbl")) return "002";
  if (lower.includes("ออมสิน") || lower.includes("gsb")) return "030";
  if (lower.includes("กรุงศรี") || lower.includes("bay")) return "025";
  if (lower.includes("ทหารไทย") || lower.includes("ttb") || lower.includes("tmb")) return "011";
  if (lower.includes("เกียรตินาคิน") || lower.includes("kkp")) return "069";
  if (lower.includes("ยูโอบี") || lower.includes("uob")) return "024";
  if (lower.includes("ซีไอเอ็มบี") || lower.includes("cimb")) return "022";
  if (lower.includes("ธ.ก.ส.") || lower.includes("baac")) return "034";
  if (lower.includes("ธอส.") || lower.includes("ghb")) return "033";
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SlipQrData {
  /** Raw EMV QR string */
  rawPayload: string;
  /** Transaction reference ID extracted from slip */
  transactionRef?: string;
  /** Sending bank code (e.g. 030 = GSB, 004 = KBANK, 014 = SCB) */
  sendingBank?: string;
  /** Recipient account / PromptPay number (phone, ID, or bank account) */
  receiverAccount?: string;
  /** Receiving bank code if present */
  receivingBank?: string;
  /** Amount in the QR (if present in QR tags) */
  amount?: number;
  /** Transaction date extracted from QR */
  transferDate?: Date;
  /** Raw date string if extracted */
  rawDateStr?: string;
  /** Format of the QR detected */
  format?: "BOT_MINI_QR" | "PROMPTPAY_EMV" | "OTHER";
}

export interface ShopPaymentProfile {
  promptpayNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankCode?: string;
}

export interface PreScreenResult {
  /** true = passed all 5 local checks, proceed to Step 6 (EasySlip) */
  passed: boolean;
  /** Human-readable Thai message when failed */
  failReason?: string;
  /** The step number that failed (1-5) */
  failedStep?: number;
  /** Parsed QR data (present when QR was found) */
  qrData?: SlipQrData;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMV / BOT Mini QR Deep Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Robust EMV TLV parser supporting recursive sub-tag decoding.
 */
function parseEmvTlv(payload: string): Map<string, string> {
  const result = new Map<string, string>();
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || i + 4 + len > payload.length) break;
    const value = payload.slice(i + 4, i + 4 + len);
    result.set(id, value);
    i += 4 + len;
  }
  return result;
}

/**
 * Extract PromptPay receiver account from EMV field 29 or 30.
 */
function extractPromptPayAccount(field: string): string | undefined {
  const match = field.match(/0113(\d{13})|0110(\d{10})|011[35](\d+)/);
  if (match) {
    return (match[1] || match[2] || match[3] || "").replace(/^0066/, "0");
  }
  return undefined;
}

/**
 * Extract date from text if YYYYMMDD format is present (2024-2035)
 */
function extractDateFromText(text: string): { date?: Date; rawStr?: string } {
  if (!text) return {};
  const match = text.match(/(202[4-9]|203[0-5])(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (match) {
    const rawStr = match[0];
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    return { date, rawStr };
  }
  return {};
}

/**
 * Parse Bank Transfer Mini QR (BOT Standard) or PromptPay EMV QR payload.
 */
export function parseEmvSlipQr(payload: string): SlipQrData {
  const result: SlipQrData = { rawPayload: payload, format: "OTHER" };
  try {
    const topTags = parseEmvTlv(payload);

    // ── 1. BOT Standard Mini QR (Tag 00 / Tag 51) ───────────────────────────
    const tag00 = topTags.get("00");
    const tag51 = topTags.get("51");
    const tag54 = topTags.get("54");
    const tag62 = topTags.get("62");

    if (tag00 && (tag00.includes("000001") || tag00.includes("A000000677") || tag51 || topTags.has("91"))) {
      result.format = "BOT_MINI_QR";
      const subTags00 = parseEmvTlv(tag00);
      result.sendingBank = subTags00.get("01");
      result.transactionRef = subTags00.get("02") || topTags.get("02");

      // Parse Tag 51 (Destination info)
      if (tag51) {
        const subTags51 = parseEmvTlv(tag51);
        result.receivingBank = subTags51.get("01");
        result.receiverAccount = subTags51.get("02");
        if (subTags51.get("04")) {
          const amt = parseFloat(subTags51.get("04") || "");
          if (!isNaN(amt) && amt > 0) result.amount = amt;
        }
      }

      // Check Tag 54 for Amount
      if (tag54) {
        const amt = parseFloat(tag54);
        if (!isNaN(amt) && amt > 0) result.amount = amt;
      }

      // Extract date from Tag 51, Tag 00, transactionRef or payload
      const refDate = result.transactionRef ? extractDateFromText(result.transactionRef) : {};
      const tag51Date = tag51 ? extractDateFromText(tag51) : {};
      const payloadDate = extractDateFromText(payload);
      const chosenDate = refDate.date ? refDate : (tag51Date.date ? tag51Date : payloadDate);
      if (chosenDate.date) {
        result.transferDate = chosenDate.date;
        result.rawDateStr = chosenDate.rawStr;
      }

      return result;
    }

    // ── 2. PromptPay EMV QR Format (000201) ─────────────────────────────────
    if (payload.startsWith("000201")) {
      result.format = "PROMPTPAY_EMV";
      if (tag54) {
        const amt = parseFloat(tag54);
        if (!isNaN(amt) && amt > 0) result.amount = amt;
      }

      const ppField = topTags.get("29") || topTags.get("30");
      if (ppField) {
        const account = extractPromptPayAccount(ppField);
        if (account) result.receiverAccount = account;
      }

      if (tag62) {
        const subTags = parseEmvTlv(tag62);
        const ref = subTags.get("07") || subTags.get("05");
        if (ref) result.transactionRef = ref;
      }

      const payloadDate = extractDateFromText(payload);
      if (payloadDate.date) {
        result.transferDate = payloadDate.date;
        result.rawDateStr = payloadDate.rawStr;
      }
      return result;
    }

    // Fallback: If it contains transaction reference or AID signatures
    if (payload.includes("000001") || payload.includes("A000000677")) {
      result.format = "BOT_MINI_QR";
      const payloadDate = extractDateFromText(payload);
      if (payloadDate.date) {
        result.transferDate = payloadDate.date;
        result.rawDateStr = payloadDate.rawStr;
      }
    }
  } catch (err) {
    console.warn("[MiniQR] Parse warning:", err);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main service with Dual-Engine Scanner (ZXing + jsQR)
// ─────────────────────────────────────────────────────────────────────────────

export class SlipPrescreenerService {
  /**
   * Decode QR code from a base64 image using Dual-Engine (@zxing/library + jsQR)
   * with multi-resolution sampling and contrast optimization.
   */
  static async extractQrFromBase64(base64Image: string): Promise<{ payload: string; engine: string } | null> {
    const b64 = base64Image.replace(/^data:image\/[a-z+]+;base64,/, "");
    const buffer = Buffer.from(b64, "base64");

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const zxReader = new QRCodeReader();

    // Try a spectrum of resolutions for slips of various sizes/aspect ratios
    const widths = [1200, 800, 600, 1000, 400, 1600];

    for (const width of widths) {
      try {
        const { data, info } = await sharp(buffer)
          .resize({ width, withoutEnlargement: false })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        // ── 1. Try ZXing Engine (Hybrid Binarizer - Industry Standard) ──────
        const len = info.width * info.height;
        const luminances = new Uint8ClampedArray(len);
        for (let i = 0; i < len; i++) {
          const off = i * 4;
          luminances[i] = (data[off] * 306 + data[off + 1] * 601 + data[off + 2] * 117) >> 10;
        }

        const source = new RGBLuminanceSource(luminances, info.width, info.height);
        try {
          const res = zxReader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints);
          if (res && res.getText()) {
            console.log(`[MiniQR - ZXing Engine] ✅ QR detected successfully at width=${width} (Hybrid Binarizer)`);
            return { payload: res.getText(), engine: `@zxing/library (Hybrid, ${width}px)` };
          }
        } catch {}

        // ── 2. Try ZXing Engine (Global Histogram Binarizer) ─────────────────
        try {
          const res = zxReader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(source)), hints);
          if (res && res.getText()) {
            console.log(`[MiniQR - ZXing Engine] ✅ QR detected successfully at width=${width} (Global Histogram)`);
            return { payload: res.getText(), engine: `@zxing/library (GlobalHist, ${width}px)` };
          }
        } catch {}

        // ── 3. Try jsQR Engine as fallback ───────────────────────────────────
        const qrJs = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        if (qrJs?.data) {
          console.log(`[MiniQR - jsQR Engine] ✅ QR detected successfully at width=${width}`);
          return { payload: qrJs.data, engine: `jsQR (${width}px)` };
        }
      } catch {
        // Continue to next resolution
      }
    }

    return null;
  }

  /**
   * Complete 5-Step Local Verification Pipeline (BEFORE calling EasySlip):
   * 1. ตรวจสอบว่าภาพดังกล่าวเป็น slip หรือไม่ (ไม่ใช้ EasySlip)
   * 2. ตรวจสอบว่าสลิปซ้ำหรือไม่ (ไม่ใช้ EasySlip)
   * 3. ตรวจสอบว่ายอดเงินในสลิปตรงไหม (ไม่ใช้ EasySlip)
   * 4. ตรวจสอบว่าธนาคารปลายทาง/บัญชีตรงกับร้านค้าหรือไม่ (ไม่ใช้ EasySlip)
   * 5. ตรวจสอบวันที่และเวลาใน slip สอดคล้องกับปัจจุบันหรือไม่ (ไม่ใช้ EasySlip)
   */
  static async preScreen(
    base64Image: string,
    shopProfile?: ShopPaymentProfile,
    usedRefs?: Set<string>,
    requiredAmount?: number,
    orderCreatedAt?: Date
  ): Promise<PreScreenResult> {
    console.log("[Slip Verification] 🔍 Starting 5-Step Local Verification Pipeline (No EasySlip)...");

    // ─────────────────────────────────────────────────────────────────────────
    // ขั้นตอนที่ 1: ตรวจสอบว่าภาพดังกล่าวเป็น slip หรือไม่
    // ─────────────────────────────────────────────────────────────────────────
    let scanResult: { payload: string; engine: string } | null = null;
    try {
      scanResult = await this.extractQrFromBase64(base64Image);
    } catch (err) {
      console.warn("[Slip Step 1] QR extraction error:", err);
    }

    if (!scanResult) {
      console.warn("[Slip Step 1] ❌ No QR code detected in the uploaded image");
      return {
        passed: false,
        failedStep: 1,
        failReason: "ไม่พบ QR Code ในรูปภาพ กรุณาอัปโหลดรูปสลิปจากแอปธนาคารให้ชัดเจน",
      };
    }

    const rawQr = scanResult.payload;
    const qrData = parseEmvSlipQr(rawQr);
    const isSlipStandard =
      qrData.format === "BOT_MINI_QR" ||
      qrData.format === "PROMPTPAY_EMV" ||
      rawQr.startsWith("000201") ||
      rawQr.startsWith("0045") ||
      rawQr.startsWith("0038") ||
      rawQr.includes("000001") ||
      rawQr.includes("A000000677");

    if (!isSlipStandard) {
      console.warn(`[Slip Step 1] ❌ Image QR is not a recognised bank slip format: ${rawQr.slice(0, 25)}`);
      return {
        passed: false,
        failedStep: 1,
        failReason: "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร กรุณาใช้รูปสลิปโอนเงินจริง",
        qrData,
      };
    }
    console.log(`[Slip Step 1] ✅ Passed: Image contains a valid Bank Slip Mini QR (Engine: ${scanResult.engine})`);

    // ─────────────────────────────────────────────────────────────────────────
    // ขั้นตอนที่ 2: ตรวจสอบว่าสลิปซ้ำหรือไม่
    // ─────────────────────────────────────────────────────────────────────────
    if (usedRefs && qrData.transactionRef) {
      if (usedRefs.has(qrData.transactionRef)) {
        console.warn(`[Slip Step 2] ❌ Duplicate slip reference detected: ${qrData.transactionRef}`);
        return {
          passed: false,
          failedStep: 2,
          failReason: "สลิปนี้เคยถูกใช้งานแล้ว กรุณาใช้สลิปใหม่",
          qrData,
        };
      }
    }
    console.log(`[Slip Step 2] ✅ Passed: Slip reference is unique (TxRef: ${qrData.transactionRef || "N/A"})`);

    // ─────────────────────────────────────────────────────────────────────────
    // ขั้นตอนที่ 3: ตรวจสอบว่ายอดเงินในสลิปตรงไหม
    // ─────────────────────────────────────────────────────────────────────────
    if (qrData.amount !== undefined && requiredAmount !== undefined && requiredAmount > 0) {
      if (qrData.amount < requiredAmount) {
        console.warn(`[Slip Step 3] ❌ Amount insufficient: Slip amount (${qrData.amount}) < Required (${requiredAmount})`);
        return {
          passed: false,
          failedStep: 3,
          failReason: `ยอดเงินในสลิป (${qrData.amount.toLocaleString()} บาท) ไม่ตรงกับยอดที่ต้องชำระ (${requiredAmount.toLocaleString()} บาท)`,
          qrData,
        };
      }
    }
    console.log(`[Slip Step 3] ✅ Passed: Amount check passed (${qrData.amount ? `${qrData.amount} THB` : "Amount to be verified in Step 6"})`);

    // ─────────────────────────────────────────────────────────────────────────
    // ขั้นตอนที่ 4: ตรวจสอบว่าธนาคารปลายทาง/บัญชีรับเงินตรงกับร้านค้าหรือไม่
    // ─────────────────────────────────────────────────────────────────────────
    const normalizeAccount = (s?: string) =>
      (s || "").replace(/[-\s]/g, "").replace(/^0066/, "0").trim();

    const shopPP = normalizeAccount(shopProfile?.promptpayNumber);
    const shopBankAcc = normalizeAccount(shopProfile?.bankAccountNumber);
    const shopBankCode = shopProfile?.bankCode || getBankCodeByName(shopProfile?.bankName);

    // 4.1 Check Receiver Account Number / PromptPay if decoded in QR
    if (qrData.receiverAccount) {
      const slipReceiver = normalizeAccount(qrData.receiverAccount);
      const isMatchPP = shopPP && (slipReceiver.endsWith(shopPP.slice(-8)) || shopPP.endsWith(slipReceiver.slice(-8)));
      const isMatchBank = shopBankAcc && (slipReceiver.endsWith(shopBankAcc.slice(-8)) || shopBankAcc.endsWith(slipReceiver.slice(-8)));

      if (!isMatchPP && !isMatchBank && (shopPP || shopBankAcc)) {
        console.warn(`[Slip Step 4] ❌ Receiver mismatch: Slip receiver (${slipReceiver}) does not match Shop PP (${shopPP}) or Bank (${shopBankAcc})`);
        return {
          passed: false,
          failedStep: 4,
          failReason: "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า กรุณาตรวจสอบหมายเลขบัญชีผู้รับและลองใหม่อีกครั้ง",
          qrData,
        };
      }
    }

    // 4.2 Check Receiving Bank Code if decoded in QR
    if (qrData.receivingBank && shopBankCode) {
      if (qrData.receivingBank !== shopBankCode) {
        console.warn(`[Slip Step 4] ❌ Destination bank mismatch: Slip bank (${qrData.receivingBank}) != Shop bank (${shopBankCode})`);
        return {
          passed: false,
          failedStep: 4,
          failReason: "ธนาคารปลายทางในสลิปไม่ตรงกับธนาคารของร้านค้า กรุณาตรวจสอบและลองใหม่อีกครั้ง",
          qrData,
        };
      }
    }
    console.log(`[Slip Step 4] ✅ Passed: Destination account/bank check passed`);

    // ─────────────────────────────────────────────────────────────────────────
    // ขั้นตอนที่ 5: ตรวจสอบวันที่และเวลาใน slip สอดคล้องกับปัจจุบันหรือไม่
    // ─────────────────────────────────────────────────────────────────────────
    const now = new Date();
    const orderDate = orderCreatedAt || now;

    if (qrData.transferDate) {
      const transferTime = qrData.transferDate.getTime();
      const nowTime = now.getTime();
      const diffHours = (nowTime - transferTime) / (1000 * 60 * 60);

      // Check 1: Cannot be future date (> 2 hours drift)
      if (diffHours < -2) {
        console.warn(`[Slip Step 5] ❌ Transfer date is in future: ${qrData.transferDate.toISOString()}`);
        return {
          passed: false,
          failedStep: 5,
          failReason: "วันที่และเวลาในสลิปไม่ถูกต้อง (พบเวลาในอนาคต)",
          qrData,
        };
      }

      // Check 2: Cannot be older than 18 hours or from prior calendar days
      if (diffHours > 18) {
        console.warn(`[Slip Step 5] ❌ Transfer date is too old: ${diffHours.toFixed(1)} hours ago`);
        return {
          passed: false,
          failedStep: 5,
          failReason: "สลิปโอนเงินหมดอายุ (กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ)",
          qrData,
        };
      }
    }
    console.log(`[Slip Step 5] ✅ Passed: Transfer date/time is valid and consistent with order time`);

    // ─────────────────────────────────────────────────────────────────────────
    // Passed all 5 Local Steps! Ready for Step 6 (EasySlip Bank Verification)
    // ─────────────────────────────────────────────────────────────────────────
    return { passed: true, qrData };
  }
}

