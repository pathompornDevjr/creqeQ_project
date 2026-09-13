"use client";

/**
 * =========================================================================================
 * @file ShopQRTab.tsx
 * @description คอมโพเนนต์แท็บจัดการและพิมพ์คิวอาร์โค้ดสำหรับร้านค้า (Shop QR Code & Standee Generator)
 * 
 * หน้าที่หลัก:
 * - สร้าง QR Code ลิงก์เข้าร้านค้าแบบไดนามิก รองรับขนาด A4, A5, A6, 2x_A5 (พิมพ์ 2 ใบต่อหน้า) และ 4x_A6 (พิมพ์ 4 ใบต่อหน้า)
 * - แสดงตัวอย่าง Standee Card จำลองป้ายตั้งโต๊ะจริง พร้อมโลโก้ร้าน, ชื่อร้าน, คำอธิบาย, QR Code และขั้นตอน 3 Step
 * - ส่งออกป้ายเป็นไฟล์รูปภาพ PNG ความละเอียดสูง (High-Resolution 300 DPI Export ผ่าน html-to-image และ HTML5 Canvas Fallback)
 * - สั่งพิมพ์ป้ายผ่านเบราว์เซอร์ พร้อม Print Stylesheet เฉพาะตัวที่ซ่อนองค์ประกอบอื่นๆ ทั้งหมด
 * - คัดลอกและแชร์ลิงก์หน้าร้านสำหรับโพสต์บนโซเชียลมีเดีย
 * =========================================================================================
 */

import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  ExternalLink,
  Printer,
  QrCode,
  Share2,
  Check,
  Eye,
  Info,
  Smartphone,
  Sparkles,
  Sliders,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { RestaurantApi, RestaurantProfileDTO } from "@/app/lib/api";
import { useRestaurant } from "@/app/(restaurant)/restaurant/RestaurantProvider";
import { formatDriveImageUrl, cn } from "@/app/lib/utils";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { AnimatePresence, motion } from "framer-motion";

/** ตัวเลือกขนาดพิมพ์ */
export type PrintSizeOption = "A4" | "A5" | "A6" | "2x_A5" | "4x_A6";

/** ตารางการตั้งค่าขนาดพิมพ์และขนาด QR Code */
export const PRINT_SIZE_CONFIGS: {
  id: PrintSizeOption;
  label: string;
  name: string;
  desc: string;
  dimensions: string;
  qrDimensionText: string;
  badge?: string;
  copies: number;
}[] = [
  {
    id: "A5",
    label: "A5 (ตั้งโต๊ะ)",
    name: "ขนาด A5 มาตรฐาน (14.8 × 21 ซม.)",
    desc: "ขนาดมาตรฐานยอดนิยม เหมาะสำหรับป้ายตั้งโต๊ะและเต็นท์การ์ดอะคริลิก (QR Code ~10 × 10 ซม.)",
    dimensions: "148 × 210 มม.",
    qrDimensionText: "QR Code ขนาด ~10 ซม.",
    badge: "แนะนำ",
    copies: 1,
  },
  {
    id: "A4",
    label: "A4 (ขนาดใหญ่)",
    name: "ขนาด A4 เต็มแผ่น (21 × 29.7 ซม.)",
    desc: "ขนาดใหญ่พิเศษ QR Code ขยายใหญ่ชัดเจน เหมาะสำหรับติดผนัง ประตูหน้าร้าน (QR Code ~16 × 16 ซม.)",
    dimensions: "210 × 297 มม.",
    qrDimensionText: "QR Code ขนาดใหญ่ ~16 ซม.",
    copies: 1,
  },
  {
    id: "A6",
    label: "A6 (กะทัดรัด)",
    name: "ขนาด A6 มินิ (10.5 × 14.8 ซม.)",
    desc: "ขนาดกะทัดรัด ประหยัดเนื้อที่ เหมาะสำหรับแปะบนโต๊ะอาหาร (QR Code ~7 × 7 ซม.)",
    dimensions: "105 × 148 มม.",
    qrDimensionText: "QR Code มินิ ~7 ซม.",
    copies: 1,
  },
  {
    id: "2x_A5",
    label: "A5 × 2 ใบ (บน A4)",
    name: "พิมพ์ 2 ใบต่อหน้า A4 (ขนาด A5 × 2)",
    desc: "พิมพ์ป้าย A5 จำนวน 2 ใบบนกระดาษ A4 แผ่นเดียว พร้อม QR Code ขนาดพอดีการ์ด",
    dimensions: "A4 (แบ่งครึ่ง)",
    qrDimensionText: "QR Code ~9 ซม. (2 ใบ)",
    badge: "ประหยัด",
    copies: 2,
  },
  {
    id: "4x_A6",
    label: "A6 × 4 ใบ (บน A4)",
    name: "พิมพ์ 4 ใบต่อหน้า A4 (ขนาด A6 × 4)",
    desc: "พิมพ์ป้าย A6 จำนวน 4 ใบบนกระดาษ A4 แผ่นเดียว สำหรับวางกระจายหลายๆ โต๊ะ",
    dimensions: "A4 (แบ่ง 4 ช่อง)",
    qrDimensionText: "QR Code ~6.5 ซม. (4 ใบ)",
    badge: "หลายโต๊ะ",
    copies: 4,
  },
];

/**
 * คอมโพเนนต์ ShopQRTab
 */
export function ShopQRTab() {
  const { restaurant } = useRestaurant();
  const [storeData, setStoreData] = useState<RestaurantProfileDTO | null>(restaurant);
  const [origin, setOrigin] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSizeOption>("A5");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const standeeCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await RestaurantApi.getInfo();
        if (res.success && res.data) {
          setStoreData(res.data);
        }
      } catch (err) {
        console.warn("Could not load shop info for QR tab:", err);
      }
    }
    loadInfo();
  }, []);

  // ดึงข้อมูลร้านค้าจากฐานข้อมูล
  const storeName = storeData?.name || (storeData as any)?.restaurant_name || restaurant?.name || (restaurant as any)?.restaurant_name || "ร้านอาหาร";
  const storeDesc = storeData?.description || (storeData as any)?.restaurant_desc || restaurant?.description || (restaurant as any)?.restaurant_desc || "สแกนสั่งอาหารง่ายๆ สะดวก รวดเร็ว";
  const storeLogo = storeData?.logoUrl || (storeData as any)?.restaurant_logo || restaurant?.logoUrl || (restaurant as any)?.restaurant_logo;
  const formattedLogo = storeLogo ? formatDriveImageUrl(storeLogo) : "/LogoSquare.png";
  const primaryColor = storeData?.primaryColor || (storeData as any)?.restaurant_primary_theme || restaurant?.primaryColor || "#E11D48";
  const customerOrderUrl = `${origin || "http://localhost:3000"}`;

  const currentConfig = PRINT_SIZE_CONFIGS.find((c) => c.id === selectedPrintSize) || PRINT_SIZE_CONFIGS[0];

  /**
   * คัดลอกลิงก์ร้านค้า
   */
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(customerOrderUrl);
      } else {
        const input = document.createElement("input");
        input.value = customerOrderUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setIsCopied(true);
      toast.success("คัดลอกลิงก์ร้านค้าเรียบร้อยแล้ว");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกลิงก์ได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  /**
   * สร้างและดาวน์โหลดภาพป้าย Standee ผ่าน HTML5 Canvas (Fallback ในกรณีที่ html-to-image ไม่สามารถทำงานได้)
   */
  const downloadStandeeViaCanvas = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) throw new Error("SVG element not found");

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // ขนาดสำหรับภาพความละเอียดสูง 300 DPI (1200 x 1680)
    const width = 1200;
    const height = 1680;
    canvas.width = width;
    canvas.height = height;

    // โหลดรูปภาพ QR
    const qrImg = new Image();
    const qrLoadPromise = new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = reject;
      qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    });

    // โหลดรูปโลโก้ร้าน
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    const logoLoadPromise = new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = "/LogoSquare.png";
      };
      logoImg.src = formattedLogo || "/LogoSquare.png";
    });

    await Promise.all([qrLoadPromise, logoLoadPromise]);

    // 1. พื้นหลังการ์ดสีขาว
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 56);
    ctx.fill();

    // 2. เส้นขอบรอบนอก
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#E2E8F0";
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 56);
    ctx.clip();

    // 3. แถบสีธีมด้านบน
    ctx.fillStyle = primaryColor;
    ctx.fillRect(40, 40, width - 80, 20);

    // 4. ป้าย Badge หัวข้อ
    const badgeW = 420;
    const badgeH = 54;
    const badgeX = (width - badgeW) / 2;
    const badgeY = 95;
    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 27);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#E2E8F0";
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 20px 'Prompt', 'Kanit', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCAN TO ORDER · เมนูออนไลน์", width / 2, badgeY + badgeH / 2);

    // 5. โลโก้ร้าน
    const logoBoxSize = 140;
    const logoBoxX = (width - logoBoxSize) / 2;
    const logoBoxY = 175;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 28);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#E2E8F0";
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(logoBoxX + 6, logoBoxY + 6, logoBoxSize - 12, logoBoxSize - 12, 22);
    ctx.clip();
    try {
      ctx.drawImage(logoImg, logoBoxX + 6, logoBoxY + 6, logoBoxSize - 12, logoBoxSize - 12);
    } catch {}
    ctx.restore();

    // 6. ชื่อร้านค้า
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 44px 'Prompt', 'Kanit', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(storeName, width / 2, 365);

    // 7. คำอธิบาย
    ctx.fillStyle = "#64748B";
    ctx.font = "500 23px 'Prompt', 'Kanit', sans-serif";
    ctx.fillText(storeDesc, width / 2, 415);

    // 8. เส้นคั่น Divider
    const grad = ctx.createLinearGradient(width / 2 - 250, 445, width / 2 + 250, 445);
    grad.addColorStop(0, "rgba(226, 232, 240, 0)");
    grad.addColorStop(0.5, "rgba(226, 232, 240, 1)");
    grad.addColorStop(1, "rgba(226, 232, 240, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, 445);
    ctx.lineTo(width / 2 + 250, 445);
    ctx.stroke();

    // 9. กล่อง QR Code
    const qrBoxSize = selectedPrintSize === "A4" ? 780 : selectedPrintSize === "A6" ? 600 : 700;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = selectedPrintSize === "A4" ? 470 : selectedPrintSize === "A6" ? 510 : 490;

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#E2E8F0";
    ctx.stroke();

    // เครื่องหมาย Register Marks 4 มุม
    const regSize = 22;
    const regOffset = 18;
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 3;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(qrBoxX + regOffset, qrBoxY + regOffset + regSize);
    ctx.lineTo(qrBoxX + regOffset, qrBoxY + regOffset);
    ctx.lineTo(qrBoxX + regOffset + regSize, qrBoxY + regOffset);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(qrBoxX + qrBoxSize - regOffset - regSize, qrBoxY + regOffset);
    ctx.lineTo(qrBoxX + qrBoxSize - regOffset, qrBoxY + regOffset);
    ctx.lineTo(qrBoxX + qrBoxSize - regOffset, qrBoxY + regOffset + regSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(qrBoxX + regOffset, qrBoxY + qrBoxSize - regOffset - regSize);
    ctx.lineTo(qrBoxX + regOffset, qrBoxY + qrBoxSize - regOffset);
    ctx.lineTo(qrBoxX + regOffset + regSize, qrBoxY + qrBoxSize - regOffset);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(qrBoxX + qrBoxSize - regOffset - regSize, qrBoxY + qrBoxSize - regOffset);
    ctx.lineTo(qrBoxX + qrBoxSize - regOffset, qrBoxY + qrBoxSize - regOffset);
    ctx.lineTo(qrBoxX + qrBoxSize - regOffset, qrBoxY + qrBoxSize - regOffset - regSize);
    ctx.stroke();

    // วาดรูป QR Code
    const qrPadding = selectedPrintSize === "A4" ? 40 : selectedPrintSize === "A6" ? 45 : 42;
    const qrDrawSize = qrBoxSize - qrPadding * 2;
    ctx.drawImage(qrImg, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDrawSize, qrDrawSize);

    // 10. กล่องขั้นตอน 3 Step ด้านล่าง
    const stepY = 1270;
    const stepWidth = 340;
    const stepHeight = 96;
    const gap = 30;
    const startX = (width - (stepWidth * 3 + gap * 2)) / 2;

    const steps = [
      { title: "1. สแกน QR", desc: "ด้วยกล้องมือถือ" },
      { title: "2. เลือกเมนู", desc: "เลือกท็อปปิ้ง" },
      { title: "3. สั่งอาหาร", desc: "รอรับตามคิว" },
    ];

    steps.forEach((step, idx) => {
      const x = startX + idx * (stepWidth + gap);
      ctx.fillStyle = "#F8FAFC";
      ctx.beginPath();
      ctx.roundRect(x, stepY, stepWidth, stepHeight, 20);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#E2E8F0";
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 22px 'Prompt', 'Kanit', sans-serif";
      ctx.fillText(step.title, x + stepWidth / 2, stepY + 42);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 17px 'Prompt', 'Kanit', sans-serif";
      ctx.fillText(step.desc, x + stepWidth / 2, stepY + 74);
    });

    // 11. แถบข้อความล่างสุด
    ctx.beginPath();
    ctx.moveTo(90, 1420);
    ctx.lineTo(1110, 1420);
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#64748B";
    ctx.font = "500 20px 'Prompt', 'Kanit', sans-serif";
    ctx.fillText("ไม่ต้องโหลดแอปพลิเคชัน", 90, 1470);

    ctx.textAlign = "right";
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 20px 'Prompt', 'Kanit', sans-serif";
    ctx.fillText("ระบบสั่งอาหารออนไลน์", 1110, 1470);

    ctx.restore();

    // ดาวน์โหลดไฟล์ PNG
    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `Standee_QR_${storeName.replace(/\s+/g, "_")}_${selectedPrintSize}_${Date.now()}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  /**
   * ดาวน์โหลดภาพป้ายคิวอาร์โค้ด
   */
  const handleDownloadQR = async () => {
    if (!standeeCardRef.current) {
      toast.error("ไม่พบคิวอาร์โค้ดสำหรับดาวน์โหลด");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("กำลังบันทึกภาพป้ายคิวอาร์โค้ด...");

    try {
      const dataUrl = await toPng(standeeCardRef.current, {
        pixelRatio: 3.5,
        quality: 1,
        backgroundColor: "#ffffff",
        imagePlaceholder: "/LogoSquare.png",
      });

      const downloadLink = document.createElement("a");
      downloadLink.download = `Standee_QR_${storeName.replace(/\s+/g, "_")}_${selectedPrintSize}_${Date.now()}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();

      toast.success("บันทึกภาพป้ายเรียบร้อยแล้ว", { id: toastId });
    } catch (primaryErr) {
      console.warn("Primary html-to-image failed, using exact fallback canvas:", primaryErr);
      try {
        await downloadStandeeViaCanvas();
        toast.success("บันทึกภาพป้ายเรียบร้อยแล้ว", { id: toastId });
      } catch (canvasErr) {
        console.error("Canvas export failed:", canvasErr);
        toast.error("เกิดข้อผิดพลาดในการบันทึกภาพ กรุณาลองใหม่อีกครั้ง", { id: toastId });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * สั่งพิมพ์ผ่านเครื่องพิมพ์
   */
  const handleExecutePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  /**
   * คำนวณสเกลขนาดสำหรับแต่ละโหมดพิมพ์
   */
  const getCardScale = (size: PrintSizeOption, isPrint: boolean) => {
    switch (size) {
      case "A4":
        return {
          wrapperClass: isPrint ? "w-full p-10 rounded-[36px]" : "w-full max-w-[390px] p-7 rounded-[32px]",
          qrPx: isPrint ? 360 : 235,
          qrBoxPadding: isPrint ? "p-6 rounded-3xl" : "p-4.5 rounded-2xl",
          logoClass: isPrint ? "w-22 h-22 rounded-3xl" : "w-18 h-18 rounded-2xl",
          titleClass: isPrint ? "text-3xl font-black" : "text-xl font-black",
          descClass: isPrint ? "text-base font-semibold" : "text-xs font-semibold",
          badgeClass: isPrint ? "text-xs px-4 py-1.5" : "text-[11px] px-3.5 py-1",
          stepTextClass: isPrint ? "text-xs py-2 px-1.5" : "text-[10px] py-1.5 px-1",
          footerTextClass: isPrint ? "text-xs pt-3" : "text-[9px] pt-3",
        };
      case "A6":
        return {
          wrapperClass: isPrint ? "w-full p-4 rounded-[20px]" : "w-full max-w-[275px] p-4 rounded-[22px]",
          qrPx: isPrint ? 165 : 145,
          qrBoxPadding: isPrint ? "p-2.5 rounded-xl" : "p-2.5 rounded-xl",
          logoClass: "w-12 h-12 rounded-xl",
          titleClass: "text-base font-extrabold",
          descClass: "text-[10px] font-medium",
          badgeClass: "text-[9px] px-2.5 py-0.5",
          stepTextClass: "text-[9px] py-1 px-0.5",
          footerTextClass: "text-[8px] pt-2",
        };
      case "2x_A5":
        return {
          wrapperClass: isPrint ? "w-full p-4 rounded-[20px]" : "w-full max-w-[335px] p-6 rounded-[28px]",
          qrPx: isPrint ? 165 : 190,
          qrBoxPadding: isPrint ? "p-2.5 rounded-xl" : "p-3.5 rounded-2xl",
          logoClass: isPrint ? "w-12 h-12 rounded-xl" : "w-14 h-14 rounded-2xl",
          titleClass: isPrint ? "text-base font-black" : "text-lg font-black",
          descClass: isPrint ? "text-[10px] font-semibold" : "text-xs font-semibold",
          badgeClass: isPrint ? "text-[9px] px-2.5 py-0.5 mb-1.5" : "text-[10px] px-3 py-1",
          stepTextClass: isPrint ? "text-[8.5px] py-1 px-0.5" : "text-[9px] py-1.5 px-1",
          footerTextClass: isPrint ? "text-[8px] pt-2" : "text-[9px] pt-2.5",
        };
      case "4x_A6":
        return {
          wrapperClass: isPrint ? "w-full p-3 rounded-[16px]" : "w-full max-w-[275px] p-4 rounded-[22px]",
          qrPx: isPrint ? 130 : 145,
          qrBoxPadding: "p-2 rounded-lg",
          logoClass: "w-10 h-10 rounded-xl",
          titleClass: "text-sm font-extrabold",
          descClass: "text-[9px] font-medium",
          badgeClass: "text-[8px] px-2 py-0.5",
          stepTextClass: "text-[8px] py-0.5 px-0.5",
          footerTextClass: "text-[8px] pt-1.5",
        };
      case "A5":
      default:
        return {
          wrapperClass: isPrint ? "w-full p-6 rounded-[28px]" : "w-full max-w-[335px] p-6 rounded-[28px]",
          qrPx: isPrint ? 230 : 190,
          qrBoxPadding: "p-4 rounded-2xl",
          logoClass: "w-16 h-16 rounded-2xl",
          titleClass: isPrint ? "text-xl font-black" : "text-lg sm:text-xl font-black",
          descClass: "text-xs font-semibold",
          badgeClass: "text-[10px] px-3 py-1",
          stepTextClass: "text-[10px] py-1.5 px-1",
          footerTextClass: "text-[9px] pt-3",
        };
    }
  };

  /**
   * เรนเดอร์การ์ด Standee
   */
  const renderStandeeCard = (sizeOption: PrintSizeOption, isForPrint = false) => {
    const scale = getCardScale(sizeOption, isForPrint);

    return (
      <div
        ref={!isForPrint ? standeeCardRef : undefined}
        id={!isForPrint ? "active-standee-card" : undefined}
        className={cn(
          "bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-all",
          scale.wrapperClass
        )}
      >
        {/* แถบสีด้านบน */}
        <div
          style={{ backgroundColor: primaryColor }}
          className="absolute top-0 inset-x-0 h-1.5"
        />

        {/* 1. ป้ายหัวข้อ Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 text-slate-700 border border-slate-200/80 font-bold tracking-wider uppercase mb-2.5 mt-0.5",
            scale.badgeClass
          )}
        >
          <Sparkles size={11} className="text-amber-500 shrink-0" />
          <span>Scan to Order · เมนูออนไลน์</span>
        </div>

        {/* 2. โลโก้ร้าน */}
        <div
          className={cn(
            "bg-white border border-slate-200/90 p-1.5 shadow-2xs mb-2 flex items-center justify-center overflow-hidden shrink-0",
            scale.logoClass
          )}
        >
          <SafeImage
            src={formattedLogo}
            alt={storeName}
            crossOrigin="anonymous"
            className="w-full h-full object-cover rounded-xl"
            fallbackType="logo"
          />
        </div>

        {/* 3. ชื่อร้านค้า */}
        <h3 className={cn("text-slate-900 tracking-tight leading-tight line-clamp-1", scale.titleClass)}>
          {storeName}
        </h3>

        {/* 4. คำอธิบายร้านค้า */}
        <p className={cn("text-slate-500 mt-1 line-clamp-1", scale.descClass)}>
          {storeDesc}
        </p>

        {/* เส้นคั่น Divider */}
        <div className="w-full max-w-[180px] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3" />

        {/* 5. กล่องแสดง QR Code */}
        <div className="relative p-0.5">
          <div
            ref={!isForPrint ? qrRef : undefined}
            className={cn(
              "bg-white border border-slate-200 shadow-2xs flex items-center justify-center relative",
              scale.qrBoxPadding
            )}
          >
            {/* เส้นเล็ง 4 มุม */}
            <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 rounded-tl" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-300 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-300 rounded-br" />

            {/* คิวอาร์โค้ด SVG */}
            <QRCodeSVG
              value={customerOrderUrl || "http://localhost:3000"}
              size={scale.qrPx}
              level="H"
              includeMargin={false}
              className="h-auto aspect-square transition-all"
              style={{ width: `${scale.qrPx}px`, maxWidth: "100%" }}
            />
          </div>
        </div>

        {/* 6. แถบขั้นตอน 3 Step */}
        <div className="grid grid-cols-3 gap-1.5 w-full mt-3.5 pt-3 border-t border-slate-100 text-slate-600 font-medium">
          <div className={cn("flex flex-col items-center bg-slate-50/80 border border-slate-200/60 rounded-xl text-center", scale.stepTextClass)}>
            <span className="font-bold text-slate-800">1. สแกน QR</span>
            <span className="text-[9px] text-slate-400">ด้วยกล้องมือถือ</span>
          </div>
          <div className={cn("flex flex-col items-center bg-slate-50/80 border border-slate-200/60 rounded-xl text-center", scale.stepTextClass)}>
            <span className="font-bold text-slate-800">2. เลือกเมนู</span>
            <span className="text-[9px] text-slate-400">เลือกท็อปปิ้ง</span>
          </div>
          <div className={cn("flex flex-col items-center bg-slate-50/80 border border-slate-200/60 rounded-xl text-center", scale.stepTextClass)}>
            <span className="font-bold text-slate-800">3. สั่งอาหาร</span>
            <span className="text-[9px] text-slate-400">รอรับตามคิว</span>
          </div>
        </div>

        {/* 7. ข้อความท้ายการ์ด */}
        <div className={cn("flex items-center justify-between w-full mt-1 text-slate-400 border-t border-slate-100 font-medium", scale.footerTextClass)}>
          <span className="flex items-center gap-1">
            <Smartphone size={10} className="text-slate-400 shrink-0" />
            <span>ไม่ต้องโหลดแอปพลิเคชัน</span>
          </span>
          <span className="font-semibold text-slate-500">
            ระบบสั่งอาหารออนไลน์
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* สไตล์การสั่งพิมพ์ Dynamic Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html, body {
            background: #ffffff !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          aside, nav, header, footer, button, .no-print, [class*="sidebar"], [class*="MobileBottomNav"], [class*="MobileTopHeader"] {
            display: none !important;
          }

          body * {
            visibility: hidden !important;
          }

          #print-area-wrapper,
          #print-area-wrapper * {
            visibility: visible !important;
          }

          #print-area-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            background: #ffffff !important;
          }

          .print-card-A4 {
            width: 640px !important;
            max-width: 95vw !important;
            page-break-inside: avoid !important;
          }

          .print-card-A5 {
            width: 440px !important;
            max-width: 90vw !important;
            page-break-inside: avoid !important;
          }

          .print-card-A6 {
            width: 320px !important;
            max-width: 85vw !important;
            page-break-inside: avoid !important;
          }

          .print-card-2x {
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }

          .print-card-4x {
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }

          .print-grid-2x {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
            width: 100% !important;
            max-width: 760px !important;
            box-sizing: border-box !important;
          }

          .print-grid-4x {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: 1fr 1fr !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 720px !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* แถบหัวข้อด้านบน */}
      <div className="no-print bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <QrCode size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-text tracking-tight">
                คิวอาร์โค้ดหน้าร้าน
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                พร้อมใช้งาน
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-3 mt-1 leading-relaxed">
              เลือกขนาดที่ต้องการ แล้วสั่งพิมพ์ป้ายตั้งโต๊ะหรือบันทึกไฟล์ภาพได้ทันที
            </p>
          </div>
        </div>

        {/* ปุ่มพิมพ์และบันทึกภาพ */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          <Button
            onClick={() => setShowPrintModal(true)}
            variant="outline"
            className="flex-1 sm:flex-initial text-xs sm:text-sm font-bold rounded-xl py-2 px-3.5 border-border hover:bg-surface-2 text-text whitespace-nowrap"
          >
            <Printer size={15} className="mr-1.5 text-text-2" /> พิมพ์ป้าย
          </Button>
          <Button
            onClick={handleDownloadQR}
            loading={isDownloading}
            className="flex-1 sm:flex-initial bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl py-2 px-4 shadow-xs whitespace-nowrap"
          >
            <Download size={15} className="mr-1.5" /> บันทึกภาพ PNG
          </Button>
        </div>
      </div>

      {/* เลย์เอาต์หลัก 2 คอลัมน์ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* คอลัมน์ซ้าย: ตัวอย่าง Standee Card และตัวเลือกขนาด */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col items-center">
            
            {/* ตัวเลือกขนาดป้าย */}
            <div className="no-print w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Sliders size={13} className="text-brand-600" />
                  <span>ขนาดป้ายและคิวอาร์โค้ด:</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                  {currentConfig.qrDimensionText}
                </span>
              </div>

              {/* ปุ่มเลือกขนาดเดี่ยว (A5, A4, A6) */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 border border-border rounded-xl">
                {(["A5", "A4", "A6"] as PrintSizeOption[]).map((size) => {
                  const cfg = PRINT_SIZE_CONFIGS.find((c) => c.id === size);
                  const isSelected = selectedPrintSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedPrintSize(size)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                        isSelected
                          ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                          : "text-text-3 hover:text-text hover:bg-surface"
                      )}
                    >
                      <span>{size}</span>
                      {cfg?.badge && (
                        <span className="text-[9px] bg-brand-100 text-brand-700 px-1 rounded">
                          {cfg.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ปุ่มเลือกพิมพ์หลายใบบนแผ่น A4 */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {(["2x_A5", "4x_A6"] as PrintSizeOption[]).map((size) => {
                  const cfg = PRINT_SIZE_CONFIGS.find((c) => c.id === size);
                  const isSelected = selectedPrintSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedPrintSize(size)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer",
                        isSelected
                          ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs"
                          : "bg-surface border-border text-text-3 hover:text-text hover:bg-surface-2"
                      )}
                    >
                      <Layers size={12} />
                      <span>{cfg?.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* แสดงตัวอย่าง Standee Card */}
            <div className="w-full flex justify-center pt-2 min-h-[460px] items-center">
              {renderStandeeCard(selectedPrintSize)}
            </div>

            <p className="no-print text-[11px] text-center text-text-3">
              ภาพตัวอย่างและคิวอาร์โค้ดปรับขยายตามขนาดที่เลือกอัตโนมัติ
            </p>
          </div>
        </div>

        {/* คอลัมน์ขวา: แชร์ลิงก์และคำแนะนำการใช้งาน */}
        <div className="no-print lg:col-span-7 space-y-5">
          
          {/* การ์ดแชร์ลิงก์ */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text text-sm sm:text-base flex items-center gap-2">
                <Share2 size={16} className="text-brand-600" />
                <span>ลิงก์หน้าร้านสำหรับแชร์</span>
              </h3>
              <span className="text-[11px] text-text-3 font-mono">/</span>
            </div>

            <p className="text-xs text-text-3 leading-relaxed">
              นำลิงก์นี้ไปโพสต์บนโซเชียลมีเดีย เช่น LINE Official Account, Facebook หรือ Instagram เพื่อให้ลูกค้ากดสั่งอาหารได้โดยตรง
            </p>

            {/* ช่องกรอกและปุ่มคัดลอก */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text">ลิงก์เมนูสั่งซื้อของร้าน:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={customerOrderUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-xs text-text font-mono select-all focus:outline-none focus:border-brand-500 transition-colors"
                />
                <Button
                  onClick={handleCopyLink}
                  className={cn(
                    "text-xs font-bold rounded-xl px-4 py-2.5 transition-all shrink-0",
                    isCopied
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  )}
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="mr-1.5" /> คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="mr-1.5" /> คัดลอกลิงก์
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* ปุ่มเปิดทดสอบ */}
            <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-text-3">ทดสอบเปิดมุมมองที่ลูกค้าเห็น:</span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <ExternalLink size={13} />
                <span>เปิดหน้าเมนูลูกค้า</span>
              </a>
            </div>
          </div>

          {/* การ์ดคำแนะนำวิธีใช้งาน */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-text flex items-center gap-2">
              <Info size={15} className="text-brand-600 shrink-0" />
              <span>วิธีใช้งานและเลือกขนาดพิมพ์</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-bold flex items-center justify-center border border-brand-200">
                  1
                </span>
                <p className="text-xs font-bold text-text">เลือกขนาดป้าย</p>
                <p className="text-[11px] text-text-3 leading-snug">
                  QR Code จะขยายใหญ่ขึ้นตามขนาด A4, A5 หรือ A6 โดยอัตโนมัติ
                </p>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-bold flex items-center justify-center border border-brand-200">
                  2
                </span>
                <p className="text-xs font-bold text-text">กดพิมพ์ป้าย</p>
                <p className="text-[11px] text-text-3 leading-snug">
                  กดปุ่ม "พิมพ์ป้าย" เพื่อสั่งพิมพ์หรือพรีวิวผ่านเครื่องพิมพ์
                </p>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-bold flex items-center justify-center border border-brand-200">
                  3
                </span>
                <p className="text-xs font-bold text-text">สแกนได้คมชัด</p>
                <p className="text-[11px] text-text-3 leading-snug">
                  ลูกค้าใช้กล้องสแกนได้สะดวกจากระยะใกล้และไกล
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── กล่องสำหรับพิมพ์ (แสดงผลเฉพาะเมื่อสั่งพิมพ์ @media print) ─── */}
      <div id="print-area-wrapper" className="hidden print:flex">
        {selectedPrintSize === "A4" && (
          <div className="print-card-A4">
            {renderStandeeCard("A4", true)}
          </div>
        )}

        {selectedPrintSize === "A5" && (
          <div className="print-card-A5">
            {renderStandeeCard("A5", true)}
          </div>
        )}

        {selectedPrintSize === "A6" && (
          <div className="print-card-A6">
            {renderStandeeCard("A6", true)}
          </div>
        )}

        {selectedPrintSize === "2x_A5" && (
          <div className="print-grid-2x">
            <div className="print-card-2x">{renderStandeeCard("2x_A5", true)}</div>
            <div className="print-card-2x">{renderStandeeCard("2x_A5", true)}</div>
          </div>
        )}

        {selectedPrintSize === "4x_A6" && (
          <div className="print-grid-4x">
            <div className="print-card-4x">{renderStandeeCard("4x_A6", true)}</div>
            <div className="print-card-4x">{renderStandeeCard("4x_A6", true)}</div>
            <div className="print-card-4x">{renderStandeeCard("4x_A6", true)}</div>
            <div className="print-card-4x">{renderStandeeCard("4x_A6", true)}</div>
          </div>
        )}
      </div>

      {/* ─── หน้าต่าง Modal ตั้งค่าการพิมพ์ (Print Setup Modal) ─── */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="no-print fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPrintModal(false)}
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xl bg-surface rounded-[24px] shadow-2xl border border-border overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-surface-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center shadow-xs">
                    <Printer size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-text text-base">ตั้งค่าและเลือกขนาดพิมพ์</h3>
                    <p className="text-xs text-text-3">เลือกขนาดป้ายและขนาดคิวอาร์โค้ดที่ต้องการพิมพ์</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-3 hover:text-text hover:bg-surface transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* รายการขนาดป้าย */}
              <div className="p-5 overflow-y-auto space-y-3">
                <p className="text-xs font-bold text-text-2">เลือกขนาดและรูปแบบการจัดวาง:</p>

                {PRINT_SIZE_CONFIGS.map((cfg) => {
                  const isSelected = selectedPrintSize === cfg.id;
                  return (
                    <div
                      key={cfg.id}
                      onClick={() => setSelectedPrintSize(cfg.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group",
                        isSelected
                          ? "bg-brand-50/70 border-brand-400 ring-2 ring-brand-100 shadow-xs"
                          : "bg-surface hover:bg-surface-2 border-border"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            isSelected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-text">{cfg.name}</span>
                            {cfg.badge && (
                              <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.2 rounded">
                                {cfg.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-3 leading-snug">{cfg.desc}</p>
                          <span className="inline-block text-[11px] font-medium text-brand-600 pt-0.5">
                            {cfg.qrDimensionText}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {cfg.dimensions}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer Modal */}
              <div className="p-4 sm:p-5 border-t border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-2 text-xs text-text-3 flex-wrap min-w-0">
                  <span className="shrink-0 text-text-3">ขนาดที่เลือก:</span>
                  <span className="font-bold text-text bg-white px-2.5 py-0.5 rounded-lg border border-border shrink-0 shadow-2xs">
                    {currentConfig.label}
                  </span>
                  <span className="text-[11px] font-mono text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md shrink-0">
                    {currentConfig.qrDimensionText}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPrintModal(false)}
                    className="flex-1 sm:flex-initial text-xs font-bold rounded-xl py-2.5 px-4 whitespace-nowrap cursor-pointer"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    onClick={handleExecutePrint}
                    className="flex-1 sm:flex-initial bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl py-2.5 px-6 shadow-md whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    icon={<Printer size={16} />}
                  >
                    พิมพ์ป้าย
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
