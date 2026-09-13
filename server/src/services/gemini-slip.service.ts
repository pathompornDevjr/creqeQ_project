/**
 * Gemini Slip Verification Service
 * บริการสกัดข้อมูลสลิปโอนเงินธนาคารไทยด้วย Google Gemini AI Vision (Data Extraction Engine)
 * ทำหน้าที่สกัดข้อมูลสำคัญจากภาพสลิปส่งกลับมาเป็น JSON:
 * - ยืนยันว่าภาพเป็นสลิปโอนเงินจริงหรือไม่ (is_bank_slip)
 * - วันที่และเวลาที่โอน (transfer_date, transfer_time, datetime_str)
 * - ยอดเงินที่โอน (amount)
 * - ธนาคารปลายทาง, เลขบัญชี/พร้อมเพย์ และชื่อผู้รับ (receiver_bank, receiver_account, receiver_name)
 * - รหัสอ้างอิงธุรกรรม (transaction_ref)
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
 * ข้อมูลดิบที่สกัดได้จากสลิปโอนเงินโดย Gemini AI
 */
export interface ExtractedSlipData {
  is_bank_slip: boolean;        // เป็นภาพสลิปโอนเงินธนาคารไทยจริงหรือไม่
  amount?: number;              // ยอดเงินที่โอน (บาท)
  transfer_date?: string;       // วันที่โอน (เช่น "YYYY-MM-DD" หรือรูปแบบวันที่)
  transfer_time?: string;       // เวลาที่โอน (เช่น "HH:mm:ss" หรือ "HH:mm")
  datetime_str?: string;        // ข้อความวันเวลาดิบที่ปรากฏบนสลิป
  receiver_bank?: string;       // ธนาคารปลายทาง (เช่น กสิกรไทย, SCB, พร้อมเพย์ ฯลฯ)
  receiver_account?: string;    // เลขที่บัญชี หรือ เบอร์พร้อมเพย์ผู้รับ
  receiver_name?: string;       // ชื่อบัญชีผู้รับเงิน
  sender_bank?: string;         // ธนาคารต้นทาง
  sender_name?: string;         // ชื่อผู้โอนเงิน
  transaction_ref?: string;     // รหัสอ้างอิงธุรกรรม
  is_api_error?: boolean;       // เกิดข้อผิดพลาดของ AI API หรือไม่
  error_message?: string;       // ข้อความแสดงข้อผิดพลาด (ถ้ามี)
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
   * สกัดข้อมูลจากรูปภาพสลิปโอนเงินด้วย Google Gemini Multimodal Vision
   * 
   * @param base64Image รูปภาพสลิปในรูปแบบ Base64
   * @returns ExtractedSlipData ข้อมูลดิบที่สกัดได้จากสลิป
   */
  static async extractSlipData(base64Image: string): Promise<ExtractedSlipData> {
    const client = this.getClient();
    if (!client) {
      console.warn("[Gemini AI] ⚠️ GEMINI_API_KEY is not configured in server environment!");
      return {
        is_bank_slip: false,
        is_api_error: true,
        error_message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI API (ไม่พบ API Key)",
      };
    }

    try {
      console.log(`[Gemini Vision] 🤖 Extracting structured data from slip image...`);
      const model = client.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              is_bank_slip: {
                type: SchemaType.BOOLEAN,
                description: "true ถ้าภาพเป็นสลิปโอนเงินผ่านธนาคารไทยจริง (กสิกร, SCB, กรุงไทย, BBL, ออมสิน, Krungsri, TTB, พร้อมเพย์ ฯลฯ) false ถ้าเป็นรูปภาพอื่นที่ไม่ใช่สลิปโอนเงิน",
              },
              amount: {
                type: SchemaType.NUMBER,
                description: "จำนวนเงินที่โอนในสลิป (บาท) เช่น 150.00 หรือ 50",
              },
              transfer_date: {
                type: SchemaType.STRING,
                description: "วันที่โอนเงิน แปลงเป็นรูปแบบ ค.ศ. YYYY-MM-DD เช่น 2026-09-13 (หากมี)",
              },
              transfer_time: {
                type: SchemaType.STRING,
                description: "เวลาที่โอนเงิน เช่น 14:30:00 หรือ 14:30",
              },
              datetime_str: {
                type: SchemaType.STRING,
                description: "ข้อความวันที่และเวลาดิบตามที่ปรากฏบนสลิป เช่น '13 ก.ย. 2569 14:30 น.' หรือ '13/09/2026 14:30'",
              },
              receiver_bank: {
                type: SchemaType.STRING,
                description: "ชื่อธนาคารปลายทาง เช่น กสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, ออมสิน, กรุงศรี, TTB, พร้อมเพย์",
              },
              receiver_account: {
                type: SchemaType.STRING,
                description: "เลขที่บัญชีหรือเบอร์พร้อมเพย์ของผู้รับเงินตามที่ปรากฏบนสลิป",
              },
              receiver_name: {
                type: SchemaType.STRING,
                description: "ชื่อ-นามสกุล หรือชื่อบัญชีของผู้รับเงิน",
              },
              sender_bank: {
                type: SchemaType.STRING,
                description: "ธนาคารของผู้โอนเงิน (ถ้ามี)",
              },
              sender_name: {
                type: SchemaType.STRING,
                description: "ชื่อ-นามสกุล หรือชื่อบัญชีของผู้โอนเงิน (ถ้ามี)",
              },
              transaction_ref: {
                type: SchemaType.STRING,
                description: "รหัสอ้างอิงการทำรายการ / รหัสธุรกรรม (Transaction Ref / ID) ที่พบบนสลิป",
              },
            },
            required: [
              "is_bank_slip",
            ],
          },
        },
      });

      // Extract raw base64 and mime type
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

      const prompt = `
คุณคือระบบอ่านข้อมูลสลิปโอนเงินธนาคารไทย (Thai Bank Slip OCR & Data Extractor)
หน้าที่ของคุณคืออ่านรูปภาพที่แนบมานี้อย่างละเอียด แล้วสกัดข้อมูลดิบออกมาในรูปแบบ JSON:

1. ตรวจสอบว่าภาพนี้เป็นรูปสลิปโอนเงินของธนาคารในไทยจริงหรือไม่ (is_bank_slip)
2. อ่านยอดเงินที่โอน (amount) เป็นตัวเลขบาท
3. อ่านวันที่โอน (transfer_date ในรูปแบบ YYYY-MM-DD) และเวลาที่โอน (transfer_time) รวมถึงข้อความวันเวลาดิบ (datetime_str)
4. อ่านธนาคารปลายทาง (receiver_bank)
5. อ่านเลขบัญชี/เบอร์พร้อมเพย์ผู้รับ (receiver_account)
6. อ่านชื่อบัญชีผู้รับ (receiver_name)
7. อ่านรหัสอ้างอิงธุรกรรม (transaction_ref) หากมี

ตอบกลับเป็น JSON ตาม Schema ที่กำหนดเท่านั้น
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
      console.log(`[Gemini Slip Extractor] 🤖 Raw AI Extraction Response:\n`, textResponse);

      const parsed: ExtractedSlipData = JSON.parse(textResponse);
      parsed.is_api_error = false;
      return parsed;
    } catch (error: any) {
      console.error("[Gemini AI Error]", error);
      return {
        is_bank_slip: false,
        is_api_error: true,
        error_message: error.message || "เกิดข้อผิดพลาดในการสกัดข้อมูลสลิปด้วย AI",
      };
    }
  }
}
