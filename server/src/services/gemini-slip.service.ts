/**
 * Gemini Slip Verification Service
 * บริการตรวจสอบสลิปโอนเงินธนาคารไทยด้วย Google Gemini 1.5 Flash Multimodal AI Vision
 * ตรวจสอบความถูกต้องอย่างเข้มงวด 5 เกณฑ์:
 * 1. ตรวจสอบว่าเป็นภาพสลิปโอนเงินจริงจากแอปธนาคารหรือไม่
 * 2. ตรวจสอบชื่อบัญชี/เลขบัญชีปลายทางว่าตรงกับร้านค้าหรือไม่
 * 3. ตรวจสอบยอดเงินโอนว่าตรงกับยอดในออเดอร์หรือไม่
 * 4. ตรวจสอบวันเวลาว่าโอนในวันปัจจุบัน/ไม่หมดอายุหรือไม่
 * 5. ตรวจสอบร่องรอยการตัดต่อ ดัดแปลง หรือสลิปปลอม
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

/**
 * ข้อมูลบัญชีรับเงินของร้านค้าสำหรับใช้ตรวจสอบเปรียบเทียบ
 */
export interface ShopPaymentProfile {
  promptpayNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
}

/**
 * ผลลัพธ์การวิเคราะห์สลิปจาก Gemini AI
 */
export interface GeminiSlipAnalysis {
  is_bank_slip: boolean;                      // เป็นสลิปธนาคารจริงหรือไม่
  receiver_bank_and_account_matched: boolean;// บัญชีผู้รับตรงหรือไม่
  amount_matched: boolean;                    // ยอดเงินตรงหรือไม่
  datetime_valid: boolean;                    // วันเวลาถูกต้องหรือไม่
  is_not_fake: boolean;                       // ไม่พบร่องรอยการปลอมแปลง
  detected_amount?: number;                   // ยอดเงินที่อ่านได้
  detected_receiver?: string;                 // ชื่อผู้รับที่อ่านได้
  detected_bank?: string;                     // ธนาคารปลายทาง
  detected_datetime?: string;                 // วันเวลาที่อ่านได้
  transaction_ref?: string;                   // รหัสอ้างอิงธุรกรรม
  passed_all: boolean;                        // ผ่านเกณฑ์ครบทุกข้อหรือไม่
  is_api_error?: boolean;                     // เกิดข้อผิดพลาดของ AI API หรือไม่
  rejection_reason: string | null;            // เหตุผลที่ไม่ผ่าน (ภาษาไทย)
}

export class GeminiSlipService {
  private static genAI: GoogleGenerativeAI | null = null;

  /** ดึง GoogleGenerativeAI Instance */
  private static getClient(): GoogleGenerativeAI | null {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      }
    }
    return this.genAI;
  }

  /**
   * ตรวจสอบสลิปโอนเงินด้วย Google Gemini 1.5 Flash Vision
   * 
   * @param base64Image รูปภาพสลิปในรูปแบบ Base64
   * @param requiredAmount ยอดเงินที่ต้องชำระ (บาท)
   * @param shopProfile ข้อมูลบัญชีร้านค้า
   * @param orderCreatedAt เวลาที่สร้างออเดอร์
   * @returns GeminiSlipAnalysis ผลลัพธ์การวิเคราะห์
   */
  static async analyzeSlip(
    base64Image: string,
    requiredAmount: number,
    shopProfile: ShopPaymentProfile,
    orderCreatedAt?: Date
  ): Promise<GeminiSlipAnalysis> {
    const client = this.getClient();
    if (!client) {
      console.warn("[Gemini AI] ⚠️ GEMINI_API_KEY is not configured in server environment!");
      return {
        is_bank_slip: false,
        receiver_bank_and_account_matched: false,
        amount_matched: false,
        datetime_valid: false,
        is_not_fake: false,
        passed_all: false,
        is_api_error: true,
        rejection_reason: "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
      };
    }

    try {
      console.log(`[Gemini Vision] 🤖 Inspecting slip image with 5-Point Strict AI Vision Inspector...`);
      const model = client.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              is_bank_slip: {
                type: SchemaType.BOOLEAN,
                description: "ข้อ 1: true ถ้าภาพเป็นสลิปโอนเงินผ่านธนาคารไทยจริง (กสิกร, SCB, กรุงไทย, BBL, ออมสิน, Krungsri, TTB, พร้อมเพย์ ฯลฯ) false ถ้าเป็นรูปภาพอื่น",
              },
              receiver_bank_and_account_matched: {
                type: SchemaType.BOOLEAN,
                description: "ข้อ 2: true ถ้าธนาคารปลายทางและบัญชี/พร้อมเพย์ผู้รับในสลิปตรงกับข้อมูลบัญชีรับเงินของร้านค้า false ถ้าโอนไปบัญชีอื่น",
              },
              amount_matched: {
                type: SchemaType.BOOLEAN,
                description: "ข้อ 3: true ถ้ายอดเงินที่โอนในสลิปเท่ากับหรือมากกว่ายอดที่ต้องชำระ (order total) false ถ้ายอดเงินไม่ตรงหรือน้อยกว่า",
              },
              datetime_valid: {
                type: SchemaType.BOOLEAN,
                description: "ข้อ 4: true ถ้าวันที่และเวลาโอนตรงกับปัจจุบัน (โอนในวันนี้ หรือไม่เกิน 24 ชม.) และไม่ใช่วันที่ในอนาคต false ถ้าเป็นสลิปเก่าจากวันอื่น",
              },
              is_not_fake: {
                type: SchemaType.BOOLEAN,
                description: "ข้อ 5: true ถ้าสลิปมีโครงสร้างถูกต้อง ไม่มีร่องรอยการตัดต่อ/ปลอมแปลง (Font Mismatch/Photoshop/Artifacts/ยอดเงินตัดต่อ) false ถ้าพบความผิดปกติหรือเป็นสลิปปลอม",
              },
              detected_amount: {
                type: SchemaType.NUMBER,
                description: "ยอดเงินที่ตรวจพบในสลิป (บาท)",
              },
              detected_receiver: {
                type: SchemaType.STRING,
                description: "หมายเลขบัญชีหรือเบอร์พร้อมเพย์ผู้รับที่ตรวจพบในสลิป",
              },
              detected_bank: {
                type: SchemaType.STRING,
                description: "ชื่อธนาคารปลายทางที่ตรวจพบในสลิป",
              },
              detected_datetime: {
                type: SchemaType.STRING,
                description: "วันที่และเวลาที่ตรวจพบในสลิป",
              },
              transaction_ref: {
                type: SchemaType.STRING,
                description: "รหัสอ้างอิงการทำรายการที่ตรวจพบบนสลิป",
              },
              passed_all: {
                type: SchemaType.BOOLEAN,
                description: "true เฉพาะเมื่อผ่านครบทั้ง 5 ข้อ (is_bank_slip=true, receiver_bank_and_account_matched=true, amount_matched=true, datetime_valid=true, is_not_fake=true) เท่านั้น",
              },
              rejection_reason: {
                type: SchemaType.STRING,
                description: "ข้อความภาษาไทยระบุเหตุผลที่ปฏิเสธอย่างชัดเจนและสุภาพ (ใส่ null หากผ่านครบทั้ง 5 ข้อ)",
              },
            },
            required: [
              "is_bank_slip",
              "receiver_bank_and_account_matched",
              "amount_matched",
              "datetime_valid",
              "is_not_fake",
              "passed_all",
            ],
          },
        },
      });

      // Extract raw base64 and mime type
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      const now = new Date();
      const thaiNowStr = now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

      const prompt = `
คุณคือระบบตรวจสอบสลิปโอนเงินธนาคารไทยอัตโนมัติ (Automated Thai Bank Slip AI Inspector)
จงวิเคราะห์ภาพที่แนบมานี้อย่างเข้มงวด โดยต้องตรวจสอบครบทั้ง 5 ขั้นตอนดังต่อไปนี้:

[ข้อมูลของร้านค้าและออเดอร์ที่ต้องตรวจสอบ]
- ยอดเงินที่ต้องชำระ (Order Total): ${requiredAmount} บาท
- พร้อมเพย์ของร้าน: ${shopProfile.promptpayNumber || "ไม่ระบุ"}
- เลขบัญชีธนาคารของร้าน: ${shopProfile.bankAccountNumber || "ไม่ระบุ"}
- ชื่อธนาคารของร้าน: ${shopProfile.bankName || "ไม่ระบุ"}
- ชื่อบัญชีของร้าน: ${shopProfile.bankAccountName || "ไม่ระบุ"}
- วันที่และเวลาปัจจุบันของระบบ: ${thaiNowStr}

[เกณฑ์การตรวจสอบ 5 ขั้นตอน (ต้องผ่านครบทุกข้อ)]
1. ตรวจสอบว่าภาพเป็นสลิปโอนเงินผ่านธนาคารหรือไม่:
   - ต้องเป็นรูปสลิปการโอนเงินของธนาคารไทย (กสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, ออมสิน, กรุงศรี, TTB, พร้อมเพย์ ฯลฯ)
   - หากไม่ใช่สลิปโอนเงินธนาคาร -> is_bank_slip = false, passed_all = false, rejection_reason = "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร"

2. ตรวจสอบว่าธนาคารและบัญชีปลายทางตรงกับร้านค้าหรือไม่:
   - ผู้รับเงินในสลิป ต้องตรงกับเบอร์พร้อมเพย์ (${shopProfile.promptpayNumber || "-"}) หรือเลขบัญชี (${shopProfile.bankAccountNumber || "-"}) หรือชื่อบัญชี (${shopProfile.bankAccountName || "-"}) ของร้านค้า
   - หากโอนผิดบัญชี หรือปลายทางไม่ตรงกับร้าน -> receiver_bank_and_account_matched = false, passed_all = false, rejection_reason = "สลิปนี้ไม่ได้โอนเข้าบัญชีของร้านค้า กรุณาตรวจสอบหมายเลขบัญชีผู้รับ"

3. ตรวจสอบว่ายอดเงินตรงหรือไม่:
   - ยอดเงินในสลิป (detected_amount) ต้องเท่ากับหรือมากกว่า ${requiredAmount} บาท
   - หากยอดเงินน้อยกว่า ${requiredAmount} บาท -> amount_matched = false, passed_all = false, rejection_reason = "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ (ยอดในสลิปน้อยกว่ายอดออเดอร์)"

4. ตรวจสอบว่าวันเวลาตรงกับวันที่ในปัจจุบันหรือไม่:
   - วันที่และเวลาในสลิป ต้องเป็นเวลาในวันนี้ (ไม่เกิน 24 ชั่วโมง) และต้องไม่เป็นเวลาในอนาคต
   - หากเป็นสลิปเก่าจากวันก่อน หรือเวลาผิดปกติ -> datetime_valid = false, passed_all = false, rejection_reason = "สลิปโอนเงินหมดอายุ กรุณาใช้สลิปที่โอนในวันเดียวกับการสั่งซื้อ"

5. ตรวจสอบว่าเป็นสลิปปลอมหรือไม่ (ตรวจจับการตัดต่อ/ปลอมแปลง):
   - ตรวจดูร่องรอยการตัดต่อตัวเลข, ฟอนต์ตัวอักษรไม่ตรงกับแอปธนาคารจริง, มีการลบหรือแปะทับยอดเงิน/วันที่/ชื่อบัญชี
   - หากพบร่องรอยการปลอมแปลง -> is_not_fake = false, passed_all = false, rejection_reason = "ตรวจพบความผิดปกติในรูปภาพ หรือสลิปมีร่องรอยการตัดต่อ"

ให้ตอบกลับเป็น JSON ตาม Schema ที่กำหนดเท่านั้น
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
      ]);

      const textResponse = result.response.text();
      console.log(`[Gemini 1.5 Flash] 🤖 5-Point AI Inspection Response:\n`, textResponse);

      const parsed: GeminiSlipAnalysis = JSON.parse(textResponse);

      // If AI passed all checks
      if (parsed.passed_all === true) {
        parsed.rejection_reason = null;
        parsed.is_api_error = false;
        return parsed;
      }

      // If AI failed one or more criteria, ensure detailed, clear Thai rejection reason is provided
      if (!parsed.rejection_reason) {
        if (!parsed.is_bank_slip) {
          parsed.rejection_reason = "รูปภาพดังกล่าวไม่ใช่สลิปโอนเงินของธนาคาร";
        } else if (!parsed.amount_matched) {
          parsed.rejection_reason = "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ (ยอดเงินไม่ถูกต้อง)";
        } else if (!parsed.receiver_bank_and_account_matched) {
          parsed.rejection_reason = "บัญชีธนาคารหรือพร้อมเพย์ปลายทางไม่ตรงกับบัญชีรับเงินของร้านค้า";
        } else if (!parsed.datetime_valid) {
          parsed.rejection_reason = "วันที่หรือเวลาในสลิปไม่ถูกต้อง (สลิปหมดอายุหรือไม่ได้โอนในวันนี้)";
        } else if (!parsed.is_not_fake) {
          parsed.rejection_reason = "ตรวจพบความผิดปกติในรูปภาพ หรือสลิปมีร่องรอยการตัดต่อปลอมแปลง";
        } else {
          parsed.rejection_reason = "ข้อมูลในสลิปไม่ถูกต้องตามเงื่อนไขของร้านค้า";
        }
      }

      parsed.is_api_error = false;
      return parsed;
    } catch (error: any) {
      console.error("[Gemini AI Error]", error);
      return {
        is_bank_slip: false,
        receiver_bank_and_account_matched: false,
        amount_matched: false,
        datetime_valid: false,
        is_not_fake: false,
        passed_all: false,
        is_api_error: true,
        rejection_reason: "เกิดข้อผิดพลาดในการตรวจสอบสลิปด้วย API ไม่สามารถใช้งานได้",
      };
    }
  }
}

