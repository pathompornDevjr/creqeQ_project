/**
 * @file LiveOrderTrackingView.tsx
 * @description หน้าจอติดตามสถานะคำสั่งซื้อแบบสด (Live Order Tracking View)
 * รองรับ:
 * - การสลับดูหลายออเดอร์ (Multi-Order Selector)
 * - การแสดงสถานะขั้นตอน Timeline (ยืนยัน -> ชำระเงิน -> กำลังปรุง -> พร้อมรับ)
 * - การชำระเงินออนไลน์ (Dynamic PromptPay QR Code, Gateway หรือโอนเงินผ่านบัญชีธนาคาร)
 * - การดาวน์โหลดรูป QR Code ชำระเงิน
 * - การอัปโหลดและตรวจสอบสลิปโอนเงินผ่านระบบ EasySlip อัตโนมัติ (พร้อมระบบแสดงสลิปแบบ Lightbox)
 * - การแจ้งเตือนกรณีมีสินค้าหรือไส้หมด (Out of stock alert) พร้อมปุ่มแก้ไข
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  CheckCircle2,
  Circle,
  ChefHat,
  ChevronLeft,
  ChevronDown,
  QrCode,
  CreditCard,
  Banknote,
  Sparkles,
  Clock,
  Check,
  Volume2,
  Plus,
  Edit2,
  Utensils,
  Ban,
  AlertTriangle,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  Download,
  Upload,
  Copy,
  ImageIcon,
  Lock,
  Receipt,
  ZoomIn,
  Eye
} from "lucide-react";
import { HelpButton } from "../ui/GuidedTourModal";
import { SafeImage } from "../ui/SafeImage";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import {
  cn,
  formatDriveImageUrl,
  formatCrustName,
  parseCrepeDetails,
  isNameOutOfStock,
  generatePromptPayPayload,
  formatQueueDayBadge,
} from "@/app/lib/utils";
import { CustomerApi, OnlinePaymentIntentDTO } from "@/app/lib/api";
import { toast } from "sonner";

/**
 * ฟังก์ชันแปลงรหัสหรือชื่อธนาคารเป็นชื่อภาษาไทยที่เป็นทางการ
 * @param codeOrName รหัสหรือชื่อธนาคาร เช่น "kbank", "scb"
 */
function getThaiBankLabel(codeOrName?: string): string {
  if (!codeOrName) return "ธนาคาร";
  const lower = codeOrName.toLowerCase().trim();
  if (lower === "kbank" || lower.includes("กสิกร")) return "ธนาคารกสิกรไทย (KBANK)";
  if (lower === "scb" || lower.includes("ไทยพาณิชย์")) return "ธนาคารไทยพาณิชย์ (SCB)";
  if (lower === "bbl" || lower.includes("กรุงเทพ")) return "ธนาคารกรุงเทพ (BBL)";
  if (lower === "ktb" || lower.includes("กรุงไทย")) return "ธนาคารกรุงไทย (KTB)";
  if (lower === "ttb" || lower.includes("ทหารไทย") || lower.includes("ทีทีบี")) return "ธนาคารทีทีบี (ttb)";
  if (lower === "gsb" || lower.includes("ออมสิน")) return "ธนาคารออมสิน (GSB)";
  if (lower === "bay" || lower.includes("กรุงศรี")) return "ธนาคารกรุงศรีอยุธยา (BAY)";
  if (lower === "promptpay" || lower.includes("พร้อมเพย์")) return "พร้อมเพย์ (PromptPay)";
  return codeOrName;
}

/** โครงสร้างข้อมูลสรุปรายการสินค้าในออเดอร์ */
export interface OrderItemSummary {
  id?: string;
  name: string;
  crust?: string;
  toppings?: { name: string; price?: number }[];
  toppingsText?: string;
  quantity: number;
  price: number;
  note?: string;
  image?: string;
  optionsText?: string;
  selectedOptions?: { choiceLabel: string; price?: number }[];
  base?: any;
  isOutOfStock?: boolean;
  isCancelled?: boolean;
}

/** ข้อมูลแท็บออเดอร์ที่ยังทำงานอยู่ (สำหรับ Dropdown สลับดูหลายออเดอร์) */
export interface ActiveOrderItemTab {
  id: string;
  queueNumber: string;
  dailyQueueIndex?: number;
  createdAt?: string | Date;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  itemCount?: number;
}

/** พร็อพส์สำหรับคอมโพเนนต์ LiveOrderTrackingView */
export interface LiveOrderTrackingViewProps {
  queueNumber: string;
  dailyQueueIndex?: number;
  createdAt?: string | Date;
  currentCookingQueue?: string;
  queuesAhead?: number;
  status: "pending" | "confirmed" | "cooking" | "preparing" | "ready" | "served" | "completed" | "cancelled" | string;
  confirmedAt?: string;
  cookingAt?: string;
  readyAt?: string;
  estimatedRemainingMinutes?: number;
  items: OrderItemSummary[];
  totalAmount: number;
  paymentMethod?: "promptpay" | "cash" | string;
  paymentStatus?: "pending" | "paid" | "processing" | string;
  pickupQrPayload?: string;
  promptPayQrImage?: string;
  promptPayNumber?: string;
  promptPayName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  hasSlip?: boolean;
  slipUrl?: string;
  shopPhone?: string;
  ordersList?: ActiveOrderItemTab[];
  selectedOrderId?: string;
  menuAvailabilityMap?: Record<string, boolean>;
  onSelectOrder?: (orderId: string) => void;
  onNewOrder?: () => void;
  onEditOrder?: () => void;
  onChangePaymentMethod?: (method: "promptpay" | "cash") => void;
  onPayNow?: () => void;
  onNotifyCash?: () => void;
  onSlipUploaded?: (slipUrl: string) => void;
  onCallShop?: () => void;
  onOpenHelp?: () => void;
  onBack?: () => void;
}

/**
 * คอมโพเนนต์ LiveOrderTrackingView
 */
export function LiveOrderTrackingView({
  queueNumber = "-",
  dailyQueueIndex,
  createdAt,
  currentCookingQueue = "-",
  queuesAhead = 0,
  status = "pending",
  confirmedAt = "-",
  cookingAt,
  readyAt,
  estimatedRemainingMinutes = 0,
  items = [],
  totalAmount = 0,
  paymentMethod = "promptpay",
  paymentStatus = "pending",
  pickupQrPayload,
  promptPayQrImage,
  promptPayNumber,
  promptPayName,
  bankName,
  bankAccountNumber,
  bankAccountName,
  hasSlip = false,
  slipUrl,
  shopPhone = "",
  ordersList = [],
  selectedOrderId,
  menuAvailabilityMap,
  onSelectOrder,
  onNewOrder,
  onEditOrder,
  onChangePaymentMethod,
  onPayNow,
  onNotifyCash,
  onSlipUploaded,
  onCallShop,
  onOpenHelp,
  onBack,
}: LiveOrderTrackingViewProps) {
  // สถานะเปิด/ปิดเมนูสลับออเดอร์
  const [isOrderSelectOpen, setIsOrderSelectOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // ดักจับการคลิกนอกเมนูดรอปดาวน์เพื่อปิด
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOrderSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // คำนวณสถานะความคืบหน้าของออเดอร์
  const normStatus = String(status || "").toLowerCase();
  const isCancelled = normStatus === "cancelled";
  const isConfirmed = normStatus !== "pending" && !isCancelled;
  const isCookingCurrent = normStatus === "cooking" || normStatus === "preparing";
  const isReady = normStatus === "ready" || normStatus === "served" || normStatus === "completed" || normStatus === "paid";
  const isCookingDoneOrCurrent = isCookingCurrent || isReady;
  const isPaid = paymentStatus === "paid" || normStatus === "completed" || normStatus === "paid";

  // สถานะการชำระเงินออนไลน์ (Payment Intent / Gateway)
  const [onlineInvoice, setOnlineInvoice] = useState<OnlinePaymentIntentDTO | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // ดึงรหัสออเดอร์เป้าหมาย
  const activeOrderTargetId = selectedOrderId || (ordersList && ordersList.length > 0 && ordersList[0]?.id !== "current" ? ordersList[0]?.id : null);

  // ฟังก์ชันดึงใบแจ้งหนี้การชำระเงินออนไลน์
  const fetchPaymentInvoice = async () => {
    if (!activeOrderTargetId || isPaid || paymentMethod === "cash") return;
    const numericId = Number(String(activeOrderTargetId).replace(/\D/g, ""));
    if (!numericId || isNaN(numericId) || numericId <= 0) return;

    setIsLoadingInvoice(true);
    setInvoiceError(null);
    try {
      const res = await CustomerApi.createPaymentIntent(numericId);
      if (res.success && res.data) {
        setOnlineInvoice(res.data);
      } else {
        setInvoiceError(res.message || "ไม่สามารถดึงข้อมูลรายการชำระเงินได้");
      }
    } catch (err: any) {
      console.error("Payment Invoice Fetch Error:", err);
      setInvoiceError(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบชำระเงิน");
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  useEffect(() => {
    fetchPaymentInvoice();
  }, [activeOrderTargetId, isPaid, paymentMethod, totalAmount]);

  // ฟังก์ชันตรวจสอบสถานะการชำระเงินด้วยตนเอง
  const handleManualCheckStatus = async () => {
    if (!activeOrderTargetId) return;
    const numericId = Number(String(activeOrderTargetId).replace(/\D/g, ""));
    if (!numericId || isNaN(numericId)) return;

    setIsCheckingPayment(true);
    try {
      const res = await CustomerApi.getPaymentStatus(numericId);
      const isPaidSuccess =
        res.success &&
        (res.data?.order?.payment_status === "paid" ||
          res.data?.order?.status === "paid" ||
          res.data?.payment?.status === "PAID" ||
          res.data?.payment?.status === "paid" ||
          res.data?.payment?.status === "succeeded" ||
          res.data?.status === "paid" ||
          res.data?.status === "successful");

      if (isPaidSuccess) {
        toast.success("ชำระเงินเรียบร้อยแล้ว!");
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        // กรณีโหมดทดสอบ ให้จำลองการชำระเงินสำเร็จ
        const simRes = await CustomerApi.simulatePayment(numericId).catch(() => null);
        if (simRes?.success) {
          toast.success("ชำระเงินเรียบร้อยแล้ว! (Test Mode)");
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          toast.info("ยังไม่พบยอดเงินเข้า กรุณารอสักครู่หลังสแกนจ่าย หรือกดตรวจสอบใหม่อีกครั้ง");
        }
      }
    } catch (err) {
      console.error("Check payment error:", err);
      toast.error("ไม่สามารถตรวจสอบสถานะการชำระเงินได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setTimeout(() => setIsCheckingPayment(false), 800);
    }
  };

  // ตัวแปรและ Ref สำหรับการอัปโหลดและตรวจสอบสลิป
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [uploadedSlipUrl, setUploadedSlipUrl] = useState<string | null>(slipUrl || null);
  
  // สถานะ Modal การตรวจสอบสลิป
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifySlipPreview, setVerifySlipPreview] = useState<string | null>(null);
  const [selectedSlipFile, setSelectedSlipFile] = useState<File | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"preview" | "loading" | "success" | "error">("preview");
  const [verifyStep, setVerifyStep] = useState<0 | 1 | 2 | 3>(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [pendingSlipFileRef] = useState<{ file: File | null }>({ file: null });
  // สถานะ Lightbox ดูภาพสลิปขนาดเต็ม
  const [slipLightboxOpen, setSlipLightboxOpen] = useState(false);

  useEffect(() => {
    if (slipUrl) setUploadedSlipUrl(slipUrl);
  }, [slipUrl]);

  const activeSlipUrl = uploadedSlipUrl || slipUrl || null;

  // จัดการเมื่อเลือกรูปภาพสลิปจากอุปกรณ์
  const handleSlipUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = "";

    if (!file.type.startsWith("image/")) { toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB"); return; }

    setSelectedSlipFile(file);
    pendingSlipFileRef.file = file;
    const objectUrl = URL.createObjectURL(file);
    setVerifySlipPreview(objectUrl);
    setVerifyStatus("preview");
    setVerifyStep(0);
    setVerifyError(null);
    setVerifyModalOpen(true);
  };

  // กดยืนยันเพื่อเริ่มตรวจสอบสลิป
  const handleConfirmAndVerify = () => {
    const fileToVerify = selectedSlipFile || pendingSlipFileRef.file;
    if (!fileToVerify) {
      toast.error("กรุณาเลือกรูปภาพสลิปก่อน");
      return;
    }
    setVerifyStatus("loading");
    setVerifyStep(1);
    setVerifyError(null);
    handleVerifySlip(fileToVerify);
  };

  // ส่งรูปสลิปไปยังเซิร์ฟเวอร์เพื่อตรวจสอบผ่าน EasySlip
  const handleVerifySlip = async (file: File) => {
    if (!activeOrderTargetId) {
      setVerifyStatus("error");
      setVerifyError(null);
      return;
    }
    const numericId = Number(String(activeOrderTargetId).replace(/\D/g, ""));
    if (!numericId || isNaN(numericId)) {
      setVerifyStatus("error");
      setVerifyError(null);
      return;
    }

    setIsUploadingSlip(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const fileBase64 = base64.includes(",") ? base64.split(",")[1] : base64;

          const apiPromise = CustomerApi.uploadSlip(String(numericId), { fileBase64 });

          setVerifyStep(1);
          await new Promise((r) => setTimeout(r, 1200));

          setVerifyStep(2);
          await new Promise((r) => setTimeout(r, 1400));

          const res = await apiPromise;

          if (res.data?.isPaid === true || res.data?.status === "verified") {
            setVerifyStep(3);
            const returnedUrl = res.data?.slipUrl || "";
            setUploadedSlipUrl(returnedUrl);
            setVerifyStatus("success");
            if (onSlipUploaded) onSlipUploaded(returnedUrl);
            setTimeout(() => window.location.reload(), 2000);
          } else {
            const errMsg =
              res.data?.message ||
              res.message ||
              "ข้อมูลในสลิปไม่ถูกต้อง หรือรูปภาพไม่ชัดเจน กรุณาตรวจสอบและลองใหม่อีกครั้ง";
            setVerifyError(errMsg);
            setVerifyStatus("error");
          }
        } catch (err: any) {
          const catchErrMsg =
            err?.response?.data?.message ||
            err?.message ||
            "ไม่สามารถเชื่อมต่อระบบตรวจสอบสลิปได้ กรุณาลองใหม่อีกครั้ง";
          setVerifyError(catchErrMsg);
          setVerifyStatus("error");
        } finally {
          setIsUploadingSlip(false);
        }
      };
      reader.onerror = () => {
        setVerifyStatus("error");
        setVerifyError("ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาเลือกรูปภาพใหม่อีกครั้ง");
        setIsUploadingSlip(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setVerifyStatus("error");
      setVerifyError(err?.message || "เกิดข้อผิดพลาดในการโหลดรูปภาพ กรุณาลองใหม่");
      setIsUploadingSlip(false);
    }
  };

  // ฟังก์ชันดาวน์โหลดรูปภาพ QR Code ชำระเงิน
  const handleDownloadPaymentQR = async () => {
    const filename = `PromptPay_QR_${queueNumber && queueNumber !== "-" ? queueNumber : "Payment"}_${Date.now()}.png`;
    setIsDownloadingQR(true);
    const toastId = toast.loading("กำลังบันทึกรูป QR Code...");

    try {
      if (paymentCardRef.current) {
        const dataUrl = await toPng(paymentCardRef.current, {
          pixelRatio: 3,
          quality: 1,
          backgroundColor: "#ffffff",
        });

        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success("บันทึกรูป QR Code เรียบร้อยแล้ว (ตรงกับหน้าจอ 100%)", { id: toastId });
        return;
      }

      const svg =
        document.getElementById("online-payment-qr-svg") ||
        document.getElementById("stripe-payment-qr-svg");
      if (svg) {
        let svgData = new XMLSerializer().serializeToString(svg);
        if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
          svgData = svgData.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 600;
          canvas.height = 750;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#003B70";
            ctx.fillRect(0, 0, canvas.width, 100);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 32px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("พร้อมเพย์ PROMPTPAY", canvas.width / 2, 60);

            ctx.drawImage(img, 100, 140, 400, 400);

            ctx.fillStyle = "#F8FAFC";
            ctx.fillRect(0, 560, canvas.width, 190);
            ctx.fillStyle = "#64748B";
            ctx.font = "20px sans-serif";
            ctx.fillText("ยอดชำระ", canvas.width / 2, 600);

            ctx.fillStyle = "#E11D48";
            ctx.font = "bold 36px sans-serif";
            ctx.fillText(`฿${totalAmount.toLocaleString()}`, canvas.width / 2, 645);

            const accName = promptPayName || bankAccountName || "";
            if (accName) {
              ctx.fillStyle = "#334155";
              ctx.font = "bold 22px sans-serif";
              ctx.fillText(accName, canvas.width / 2, 685);
            }
            if (promptPayNumber) {
              ctx.fillStyle = "#64748B";
              ctx.font = "18px monospace";
              ctx.fillText(`พร้อมเพย์: ${promptPayNumber}`, canvas.width / 2, 715);
            }

            const pngUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobURL);
            toast.success("บันทึกรูป QR Code เรียบร้อยแล้ว", { id: toastId });
          }
        };
        img.src = blobURL;
        return;
      }

      const targetQrUrl = promptPayQrImage ? formatDriveImageUrl(promptPayQrImage) : onlineInvoice?.qrCodeUrl;
      if (targetQrUrl) {
        try {
          const res = await fetch(targetQrUrl);
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success("ดาวน์โหลดคิวอาร์โค้ดเรียบร้อยแล้ว");
          return;
        } catch {
          const a = document.createElement("a");
          a.href = targetQrUrl;
          a.target = "_blank";
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("กำลังดาวน์โหลดคิวอาร์โค้ด...");
          return;
        }
      }
    } catch (err) {
      console.error("Failed to download QR code:", err);
      toast.error("ไม่สามารถดาวน์โหลด QR Code ได้");
    }
  };

  // ฟังก์ชันโทรหาร้านค้า
  const handleCall = () => {
    if (onCallShop) {
      onCallShop();
    } else if (shopPhone) {
      window.location.href = `tel:${shopPhone.replace(/[^0-9]/g, "")}`;
    }
  };

  const totalItemCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // ตรวจสอบว่ามีสินค้าในรายการหมดหรือไม่
  const hasOutOfStockItem = items.some((it) => {
    if (it.isOutOfStock) return true;
    if (!menuAvailabilityMap) return false;
    const d = parseCrepeDetails(it);
    if (d.crust && isNameOutOfStock(d.crust, menuAvailabilityMap)) return true;
    return (d.toppingsList || []).some((t) => isNameOutOfStock(t, menuAvailabilityMap));
  });

  return (
    <>
      {/* ─── Modal ตรวจสอบสลิปการโอนเงิน (Slip Verification Modal) ─── */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={() => {
              if (verifyStatus !== "loading") {
                setVerifyModalOpen(false);
                setVerifySlipPreview(null);
                setSelectedSlipFile(null);
                setVerifyError(null);
                setVerifyStep(0);
                setVerifyStatus("preview");
              }
            }}
          />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] animate-scale-up border border-zinc-100">
            {verifyStatus !== "loading" && (
              <button
                type="button"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setVerifySlipPreview(null);
                  setSelectedSlipFile(null);
                  setVerifyError(null);
                  setVerifyStep(0);
                  setVerifyStatus("preview");
                }}
                aria-label="ปิดหน้าต่าง"
                className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90 shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* แสดงภาพสลิปที่เลือก พร้อมแอนิเมชัน Loading ซ้อนทับ */}
            {verifySlipPreview && (
              <div className="relative w-full bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[320px] max-h-[52vh] shrink-0 select-none">
                <SafeImage
                  src={verifySlipPreview}
                  alt="สลิปหลักฐานการชำระเงิน"
                  className="w-full h-full object-contain max-h-[52vh]"
                  fallbackType="receipt"
                />

                {verifyStatus === "loading" && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-3 max-w-xs w-full">
                      <div className="space-y-1">
                        <p className="font-bold text-white text-base tracking-tight">
                          {verifyStep === 1
                            ? "กำลังตรวจสอบสลิป..."
                            : verifyStep === 2
                            ? "กำลังตรวจสอบยอดชำระกับร้าน..."
                            : "กำลังบันทึกข้อมูลหลักฐาน..."}
                        </p>
                        <p className="text-xs text-zinc-300">
                          กรุณารอสักครู่ ระบบกำลังตรวจสอบความถูกต้อง
                        </p>
                      </div>

                      {/* ตัวชี้วัดขั้นตอนการตรวจสอบ (Step Progress Indicators) */}
                      <div className="flex flex-col gap-2 pt-2 text-left">
                        <div
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            verifyStep > 1
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/15 text-white border border-white/25"
                          }`}
                        >
                          {verifyStep > 1 ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                          ) : (
                            <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                          )}
                          <span>1. กำลังตรวจสอบสลิป</span>
                        </div>

                        <div
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            verifyStep > 2
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : verifyStep === 2
                              ? "bg-white/15 text-white border border-white/25"
                              : "bg-white/5 text-zinc-400 border border-white/5"
                          }`}
                        >
                          {verifyStep > 2 ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                          ) : verifyStep === 2 ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-zinc-500 flex items-center justify-center text-[10px] text-zinc-400 shrink-0">
                              2
                            </span>
                          )}
                          <span>2. กำลังตรวจสอบยอดชำระกับร้าน</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ส่วนเนื้อหาด้านล่างของ Modal */}
            <div className="p-5 sm:p-6 flex flex-col gap-4 bg-white overflow-y-auto">
              {/* สถานะเตรียมความพร้อมก่อนตรวจสอบ (Preview State) */}
              {verifyStatus === "preview" && (
                <div className="flex flex-col gap-3 animate-fade-in text-left">
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-zinc-900">ตรวจสอบความถูกต้องของสลิป</p>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        โปรดตรวจสอบยอดเงินและรายละเอียดในสลิปให้ถูกต้องก่อนกดยืนยันเพื่อเริ่มการตรวจสอบ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-blue-950">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-blue-950">ข้อกำหนดการชำระเงิน:</p>
                      <p className="text-[11px] leading-relaxed font-medium text-blue-900">
                        การชำระต้องชำระผ่าน<strong className="text-blue-950 font-bold underline decoration-blue-400">แอปพลิเคชันธนาคารเท่านั้น</strong> หากชำระผ่านแอปอื่น เช่น TrueMoney Wallet หรือเป๋าตัง ระบบจะไม่รองรับ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-50/90 border border-rose-200/80 rounded-2xl text-rose-950">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-rose-950">คำเตือนทางกฎหมาย:</p>
                      <p className="text-[11px] leading-relaxed font-medium text-rose-900">
                        กรุณาอัปโหลดหลักฐานการชำระจริง หากเป็นหลักฐานปลอมถือเป็นสิ่งผิดกฎหมาย ร้านสามารถแจ้งดำเนินคดีพร้อมหลักฐานการชำระของคุณได้
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmAndVerify}
                      className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span>ยืนยันและเริ่มตรวจสอบสลิป</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="py-3.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>เปลี่ยนรูป</span>
                    </button>
                  </div>
                </div>
              )}

              {/* สถานะตรวจสอบสำเร็จ (Success State) */}
              {verifyStatus === "success" && (
                <div className="flex flex-col items-center gap-3 py-2 text-center animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-900">ชำระเงินสำเร็จเรียบร้อย!</h3>
                    <p className="text-xs text-zinc-500">
                      ระบบได้รับการยืนยันการชำระเงินแล้ว กำลังปรับสถานะออเดอร์...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังเข้าสู่หน้ารอรับสินค้า...</span>
                  </div>
                </div>
              )}

              {/* สถานะตรวจสอบไม่ผ่าน (Error State) */}
              {verifyStatus === "error" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <p className="text-sm font-bold text-red-800">ตรวจสอบไม่ผ่าน / สลิปไม่ถูกต้อง</p>
                      <p className="text-xs text-red-600 leading-relaxed font-medium">
                        {verifyError || "รูปภาพไม่ชัดเจน ไม่พบ QR Code หรือยอดเงินไม่ตรงกับยอดชำระ"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>อัปโหลดสลิปใหม่</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVerifyModalOpen(false);
                        setVerifySlipPreview(null);
                        setSelectedSlipFile(null);
                        setVerifyError(null);
                        setVerifyStep(0);
                        setVerifyStatus("preview");
                      }}
                      className="py-3.5 px-6 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-sm transition active:scale-95 cursor-pointer text-center"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}

              {verifyStatus === "loading" && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>กำลังตรวจสอบความถูกต้องผ่านระบบอัตโนมัติ กรุณารอสักครู่</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Lightbox ดูสลิปขนาดเต็ม (Slip Lightbox Modal) ─── */}
      {slipLightboxOpen && activeSlipUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={() => setSlipLightboxOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] border border-zinc-800 animate-scale-up">
            <div className="px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold truncate">หลักฐานการชำระเงิน</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  ตรวจสอบแล้ว
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={formatDriveImageUrl(activeSlipUrl)}
                  download={`Slip_${queueNumber && queueNumber !== "-" ? queueNumber : "Payment"}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                  title="เปิดรูปต้นฉบับ / ดาวน์โหลด"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setSlipLightboxOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                  title="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center bg-zinc-950 overflow-y-auto max-h-[72vh] select-none">
              <SafeImage
                src={activeSlipUrl}
                alt="สลิปหลักฐานการชำระเงิน"
                className="w-full h-auto max-h-[70vh] object-contain rounded-xl shadow-lg"
                fallbackType="receipt"
              />
            </div>

            <div className="px-5 py-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>ยอดเงิน: <strong className="text-white font-mono text-sm">฿{totalAmount}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setSlipLightboxOpen(false)}
                className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── หน้าหลักของการติดตามคิว (Main Tracking View) ─── */}
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4 sm:p-6 pb-20 text-zinc-900 animate-fade-in gap-3.5">
        {/* แถบนำทางด้านบน (Top Navbar) */}
        <div className="w-full max-w-lg flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="ย้อนกลับ"
                className="w-9 h-9 rounded-full border border-zinc-200/90 bg-white shadow-xs flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold text-zinc-900 tracking-tight">
                ติดตามสถานะออเดอร์
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium">อัปเดตสถานะคิวแบบ Real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
            {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
          </div>
        </div>

        {/* กล่องเนื้อหาหลัก */}
        <div className="w-full max-w-lg flex flex-col gap-3.5 animate-fade-up">
          {/* เมนูดรอปดาวน์สำหรับเลือกสลับดูออเดอร์ (Multi-Order Select Dropdown) */}
          {((ordersList && ordersList.length > 0) || queueNumber !== "-") && (() => {
            const allOrders = ordersList && ordersList.length > 0
              ? ordersList
              : [{
                  id: "current",
                  queueNumber: queueNumber,
                  status: status,
                  paymentStatus: paymentStatus,
                  totalAmount: totalAmount,
                  itemCount: items.length || 1,
                }];
            
            const currentOrder = allOrders.find(
              (o) => String(o.id) === String(selectedOrderId) || (selectedOrderId && String(o.id) === String(selectedOrderId))
            ) || allOrders.find((o) => o.queueNumber && o.queueNumber !== "-" && String(o.queueNumber) === String(queueNumber)) || allOrders[0];

            const currentQueueDisplay = currentOrder.queueNumber && currentOrder.queueNumber !== "-"
              ? currentOrder.queueNumber
              : (currentOrder.id && currentOrder.id !== "current" ? `A${String(currentOrder.id).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : (queueNumber !== "-" ? queueNumber : "A001"));

            const currentDailyIndex = currentOrder.dailyQueueIndex || dailyQueueIndex;

            // กำหนดสีและป้ายสถานะของออเดอร์
            const getBadgeInfo = (ordStatus: string, ordPaymentStatus?: string) => {
              const norm = String(ordStatus || "").toLowerCase();
              const payNorm = String(ordPaymentStatus || "").toLowerCase();
              const isOrdPaid = payNorm === "paid" || norm === "completed" || norm === "paid";

              if (norm === "cancelled") {
                return {
                  label: "ยกเลิกแล้ว",
                  dotClass: "bg-red-500",
                  badgeClass: "bg-red-50 text-red-700 border border-red-200/80",
                };
              }
              if (norm === "ready" || norm === "served") {
                return {
                  label: "เสร็จแล้ว",
                  dotClass: "bg-emerald-500 animate-bounce",
                  badgeClass: "bg-emerald-100 text-emerald-800",
                };
              }
              if (norm === "cooking" || norm === "preparing") {
                return {
                  label: "กำลังปรุง",
                  dotClass: "bg-amber-500 animate-pulse",
                  badgeClass: "bg-amber-100 text-amber-800",
                };
              }
              if (isOrdPaid) {
                return {
                  label: "ชำระเงินแล้ว",
                  dotClass: "bg-emerald-500",
                  badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
                };
              }
              if (norm === "confirmed") {
                return {
                  label: "ร้านรับแล้ว",
                  dotClass: "bg-blue-500",
                  badgeClass: "bg-blue-50 text-blue-700 border border-blue-200/60",
                };
              }
              return {
                label: "รอยืนยัน",
                dotClass: "bg-zinc-400",
                badgeClass: "bg-zinc-200 text-zinc-700",
              };
            };

            const currentBadge = getBadgeInfo(
              currentOrder.status || status,
              currentOrder.paymentStatus || paymentStatus
            );

            return (
              <div ref={selectRef} className="relative w-full z-20 animate-fade-down">
                <div className="w-full bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-zinc-200/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="font-bold text-zinc-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>ออเดอร์ที่คุณสั่ง ({allOrders.length} คิว):</span>
                    </span>
                    {onNewOrder && (
                      <button
                        type="button"
                        onClick={onNewOrder}
                        style={{ color: "var(--brand-500, #F43F5E)" }}
                        className="font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>สั่งเครปเพิ่ม</span>
                      </button>
                    )}
                  </div>

                  {/* ปุ่มกดเปิดดรอปดาวน์เลือกออเดอร์ */}
                  <button
                    type="button"
                    onClick={() => setIsOrderSelectOpen((prev) => !prev)}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/90 active:scale-[0.99] border border-zinc-200/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-all cursor-pointer select-none text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          currentBadge.dotClass
                        )}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-zinc-900 tracking-tight">
                          คิว {currentQueueDisplay}
                        </span>
                        {formatQueueDayBadge(currentDailyIndex, currentOrder.createdAt || createdAt) ? (
                          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200/60">
                            ({formatQueueDayBadge(currentDailyIndex, currentOrder.createdAt || createdAt)})
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            currentBadge.badgeClass
                          )}
                        >
                          {currentBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {currentOrder.totalAmount ? (
                        <span className="text-xs font-bold text-zinc-600 bg-white px-2 py-1 rounded-lg border border-zinc-200/60">
                          {currentOrder.itemCount ? `${currentOrder.itemCount} ชิ้น • ` : ""}฿{currentOrder.totalAmount}
                        </span>
                      ) : null}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-zinc-500 transition-transform duration-200",
                          isOrderSelectOpen && "rotate-180 text-brand-600"
                        )}
                      />
                    </div>
                  </button>
                </div>

                {/* รายการดรอปดาวน์ */}
                {isOrderSelectOpen && (
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 animate-fade-in overflow-hidden">
                    <div className="px-3.5 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      เลือกดูสถานะออเดอร์
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100">
                      {allOrders.map((ord) => {
                        const isSelected = String(ord.id) === String(currentOrder.id);
                        const ordQueueDisplay = ord.queueNumber && ord.queueNumber !== "-"
                          ? ord.queueNumber
                          : (ord.id && ord.id !== "current" ? `A${String(ord.id).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : "A001");
                        const itemBadge = getBadgeInfo(ord.status, ord.paymentStatus);
                        const ordDailyIndex = ord.dailyQueueIndex;

                        return (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              if (ord.id !== "current") onSelectOrder?.(String(ord.id));
                              setIsOrderSelectOpen(false);
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none",
                              isSelected ? "bg-rose-50/80" : "hover:bg-zinc-50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={cn(
                                 "w-2 h-2 rounded-full shrink-0",
                                  itemBadge.dotClass
                                )}
                              />
                              <span className={cn("text-sm font-bold tracking-tight", isSelected ? "text-rose-700 font-extrabold" : "text-zinc-900")}>
                                คิว {ordQueueDisplay}
                              </span>
                              {formatQueueDayBadge(ordDailyIndex, ord.createdAt) ? (
                                <span className="text-[10px] font-medium text-zinc-400">
                                  ({formatQueueDayBadge(ordDailyIndex, ord.createdAt)})
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                  itemBadge.badgeClass
                                )}
                              >
                                {itemBadge.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              {ord.totalAmount ? (
                                <span className="text-xs font-semibold text-zinc-500">
                                  {ord.itemCount ? `${ord.itemCount} ชิ้น • ` : ""}฿{ord.totalAmount}
                                </span>
                              ) : null}
                              {isSelected && <Check className="w-4 h-4 text-rose-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {onNewOrder && (
                      <div className="p-2 border-t border-zinc-100 bg-zinc-50/60">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOrderSelectOpen(false);
                            onNewOrder();
                          }}
                          style={{ color: "var(--brand-600, #E11D48)" }}
                          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-dashed border-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>สั่งเครปเพิ่มอีกชิ้น (คิวใหม่)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* แบนเนอร์สถานะคำสั่งซื้อแบบเด่นชัด (Status Callout Banner) */}
          {isCancelled ? (
            <div className="bg-gradient-to-r from-red-50 to-rose-50/80 border border-red-200/80 rounded-[20px] p-4 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Ban className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h3 className="text-xs font-black text-red-950">ออเดอร์นี้ถูกยกเลิกแล้ว</h3>
                <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                  ทางร้านได้ยกเลิกออเดอร์นี้แล้ว และไม่มีการคิดค่าบริการ (คุณสามารถดูรายการย้อนหลังได้)
                </p>
              </div>
            </div>
          ) : normStatus === "pending" && hasOutOfStockItem ? (
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border-2 border-red-300/90 rounded-[20px] p-4 flex items-start gap-3 shadow-md animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black text-red-950">ร้านแจ้งว่ามีไส้/เมนูหมดในออเดอร์นี้!</h3>
                  {onEditOrder && (
                    <button
                      type="button"
                      onClick={onEditOrder}
                      style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                      className="text-[11px] font-bold text-white px-3 py-1 rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Edit2 className="w-3 h-3 text-white" />
                      <span>แก้ไขเปลี่ยนไส้</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                  มีวัตถุดิบ/ไส้บางรายการหมด กรุณากดปุ่ม <strong>แก้ไขเปลี่ยนไส้</strong> เพื่อเลือกไส้หรือเมนูใหม่ ทางร้านจะรีบดำเนินการให้ทันทีค่ะ
                </p>
              </div>
            </div>
          ) : normStatus === "pending" ? (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-300/80 rounded-[20px] p-4 flex items-start gap-3 shadow-2xs animate-pulse">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-950">รอร้านค้ายืนยันรับออเดอร์</h3>
                  {onEditOrder && (
                    <button
                      type="button"
                      onClick={onEditOrder}
                      className="text-[11px] font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-300/80 px-2 py-0.5 rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>แก้ไข</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  ทางร้านกำลังตรวจสอบรายการ เมื่อร้านกดยืนยัน คุณจะสามารถชำระเงินออนไลน์ได้ทันที
                </p>
              </div>
            </div>
          ) : isReady ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/80 border border-emerald-300/80 rounded-[20px] p-4 flex items-center gap-3 shadow-2xs animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-black text-emerald-950">ออเดอร์เสร็จแล้ว พร้อมรับอาหาร!</h3>
                <p className="text-[11px] text-emerald-800 font-medium">
                  ร้านทำเครปเสร็จเรียบร้อยแล้ว เชิญมารับอาหารที่หน้าร้านได้เลยค่ะ
                </p>
              </div>
            </div>
          ) : isCookingCurrent ? (
            <div className="bg-gradient-to-r from-brand-50 to-rose-50/80 border border-brand-200/80 rounded-[20px] p-4 flex items-center gap-3 shadow-2xs">
              <div
                style={{ backgroundColor: "var(--brand-500, #F43F5E)" }}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
              >
                <ChefHat className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-black text-zinc-900">เชฟกำลังปรุงเครปสดใหม่</h3>
                <p className="text-[11px] text-zinc-600 font-medium">
                  คิวของคุณอยู่ในกระบวนการปรุงแล้ว รอรับความอร่อยสักครู่ค่ะ
                </p>
              </div>
            </div>
          ) : isConfirmed && !isPaid ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 border border-blue-300/80 rounded-[20px] p-4 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h3 className="text-xs font-black text-blue-950">ร้านยืนยันรับออเดอร์แล้ว!</h3>
                <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                  {paymentMethod === "cash"
                    ? "แจ้งชำระเงินสดหน้าร้านเรียบร้อย รอคิวเริ่มจัดทำอาหารค่ะ"
                    : "กรุณาชำระเงินออนไลน์ผ่าน QR พร้อมเพย์เพื่อเริ่มคิวทำอาหารทันที"}
                </p>
              </div>
            </div>
          ) : null}

          {/* การ์ดเปรียบเทียบคิวของคุณ vs คิวที่กำลังทำ */}
          <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  คิวของคุณ
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-black text-brand-600 font-mono tracking-tight">
                    {queueNumber}
                  </span>
                  {formatQueueDayBadge(dailyQueueIndex, createdAt) ? (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
                      {formatQueueDayBadge(dailyQueueIndex, createdAt)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  กำลังทำคิว
                </span>
                <div className="text-4xl font-black text-zinc-600 font-mono tracking-tight">
                  {currentCookingQueue}
                </div>
              </div>
            </div>

            {/* แถบแจ้งเวลารอโดยประมาณ */}
            <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
              {isCancelled ? (
                <span className="text-red-500 font-bold flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" />
                  ออเดอร์ถูกยกเลิกแล้ว
                </span>
              ) : isReady ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ทำเสร็จแล้ว พร้อมรับอาหารที่เคาน์เตอร์!
                </span>
              ) : isCookingCurrent ? (
                <div className="w-full flex items-center justify-between">
                  <span className="text-brand-600 font-bold flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 animate-bounce" />
                    กำลังปรุงออเดอร์ของคุณอยู่
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-100">
                    ประมาณ {estimatedRemainingMinutes || 15} นาที
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <span className="text-zinc-600 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {queuesAhead > 0 ? `รออีก ${queuesAhead} คิว` : "คิวถัดไปพร้อมทำ"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[11px] border border-zinc-200/60">
                    ประมาณ {estimatedRemainingMinutes || 15} นาที
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ส่วนชำระเงิน QR พร้อมเพย์ และอัปโหลดสลิป */}
          {isConfirmed && !isPaid && normStatus !== "cancelled" && (() => {
            const isBank = Boolean(bankName && bankName.toLowerCase() !== "promptpay" && bankAccountNumber);
            const dynamicPromptPayPayload = (!isBank && promptPayNumber && totalAmount > 0)
              ? generatePromptPayPayload(promptPayNumber, totalAmount)
              : null;
            const hasUploadedQr = Boolean(promptPayQrImage || onlineInvoice?.qrCodeUrl || onlineInvoice?.qrPayload);
            const hasDirectQr = Boolean(dynamicPromptPayPayload || hasUploadedQr);

            const sectionTitle = dynamicPromptPayPayload
              ? "สแกน QR พร้อมเพย์"
              : hasUploadedQr
              ? "ชำระเงินผ่าน QR Code"
              : "ชำระเงินผ่านบัญชีธนาคาร";

            return (
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-brand-200/80 space-y-3.5 animate-fade-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-black text-zinc-900">{sectionTitle}</span>
                  </div>
                  <span className="text-xs font-black text-brand-600 font-mono">฿{totalAmount}</span>
                </div>

                <div className="pt-2 flex flex-col items-center justify-center gap-3 text-center">
                  {dynamicPromptPayPayload ? (
                    <>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ไม่มีค่าธรรมเนียม · ปลอดภัย · กำหนดยอดอัตโนมัติ</span>
                      </div>

                      {/* การ์ด PromptPay อย่างเป็นทางการพร้อม Dynamic QR */}
                      <div
                        ref={paymentCardRef}
                        className="w-full max-w-[240px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-center"
                      >
                        <div className="bg-[#003B70] text-white py-2.5 px-3 flex items-center justify-center gap-2">
                          <span className="font-black text-sm tracking-wide">พร้อมเพย์</span>
                          <span className="text-[10px] font-bold bg-[#0070BA] px-1.5 py-0.5 rounded text-white uppercase">PromptPay</span>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-white">
                          <QRCodeSVG
                            id="online-payment-qr-svg"
                            value={dynamicPromptPayPayload}
                            size={170}
                            level="M"
                            includeMargin={true}
                          />
                        </div>
                        <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/90 space-y-0.5">
                          <p className="text-[11px] font-semibold text-slate-500">ยอดชำระ</p>
                          <p className="text-xl font-black text-brand-600 tracking-tight font-mono">฿{totalAmount.toLocaleString()}</p>
                          {(promptPayName || bankAccountName) && (
                            <p className="text-[11px] font-bold text-slate-700 truncate">{promptPayName || bankAccountName}</p>
                          )}
                          {promptPayNumber && (
                            <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">พร้อมเพย์: {promptPayNumber}</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : hasUploadedQr ? (
                    <>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ไม่มีค่าธรรมเนียม · ปลอดภัย</span>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border-2 border-brand-200 shadow-md flex items-center justify-center min-w-[170px] min-h-[170px] max-w-[210px] max-h-[210px] overflow-hidden relative">
                        {promptPayQrImage ? (
                          <SafeImage
                            src={promptPayQrImage}
                            alt="พร้อมเพย์ QR ของร้าน"
                            className="w-full h-full object-contain max-w-[180px] max-h-[180px] rounded-xl"
                            fallback={
                              onlineInvoice?.qrPayload ? (
                                <QRCodeSVG
                                  id="online-payment-qr-svg"
                                  value={onlineInvoice.qrPayload}
                                  size={160}
                                  level="M"
                                  includeMargin
                                />
                              ) : (
                                <div className="text-center p-2 text-xs text-zinc-400">QR ไม่พร้อมใช้งาน</div>
                              )
                            }
                          />
                        ) : onlineInvoice?.qrCodeUrl ? (
                          <SafeImage
                            src={onlineInvoice.qrCodeUrl}
                            alt="Omise PromptPay QR"
                            className="w-full h-full object-contain max-w-[180px] max-h-[180px] rounded-xl"
                            fallback={
                              onlineInvoice?.qrPayload ? (
                                <QRCodeSVG
                                  id="online-payment-qr-svg"
                                  value={onlineInvoice.qrPayload}
                                  size={160}
                                  level="M"
                                  includeMargin
                                />
                              ) : null
                            }
                          />
                        ) : onlineInvoice?.qrPayload ? (
                          <QRCodeSVG
                            id="online-payment-qr-svg"
                            value={onlineInvoice.qrPayload}
                            size={160}
                            level="M"
                            includeMargin
                          />
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs">
                        <Banknote className="w-4 h-4 text-amber-600" />
                        <span>ชำระเงินผ่านข้อมูลบัญชีนี้เท่านั้น</span>
                      </div>
                      <p className="text-[11.5px] text-amber-800 leading-relaxed font-medium max-w-xs mx-auto">
                        กรุณาคัดลอกเลขบัญชีด้านล่างเพื่อโอนเงินผ่านแอปธนาคาร จากนั้นอัปโหลดหลักฐานการชำระเพื่อตรวจสอบการชำระเงิน
                      </p>
                    </div>
                  )}

                  {/* การ์ดข้อมูลบัญชีธนาคาร/พร้อมเพย์ */}
                  <div className="w-full bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 text-left space-y-2.5 shadow-2xs">
                    {(() => {
                      const displayAccountName = isBank
                        ? (bankAccountName || promptPayName || "ทางร้าน")
                        : (promptPayName || bankAccountName || "ทางร้าน");

                      return (
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200/70">
                          <span className="text-zinc-500 font-medium">ชื่อบัญชี:</span>
                          <span className="font-bold text-zinc-900 text-right">
                            {displayAccountName}
                          </span>
                        </div>
                      );
                    })()}

                    {(() => {
                      const isPromptPay = promptPayNumber || bankName?.toLowerCase() === "promptpay" || (!bankAccountNumber && !bankName);
                      const displayNumber = isBank ? bankAccountNumber : (promptPayNumber || bankAccountNumber);
                      const label = isBank ? getThaiBankLabel(bankName) : "พร้อมเพย์ (PromptPay)";

                      if (!displayNumber && !isBank) return null;

                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 font-medium">{label}:</span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900">
                            <span className="tracking-wide">{displayNumber || "-"}</span>
                            {displayNumber && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(displayNumber.replace(/[^0-9]/g, ""));
                                  toast.success(isBank ? "คัดลอกเลขบัญชีแล้ว" : "คัดลอกเบอร์พร้อมเพย์แล้ว");
                                }}
                                className="p-1 hover:bg-zinc-200 rounded-md text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                                title="คัดลอก"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200/70">
                      <span className="text-zinc-600 font-bold">ยอดชำระทั้งหมด:</span>
                      <span className="font-black text-brand-600 text-sm font-mono">฿{totalAmount}</span>
                    </div>
                  </div>

                  {/* ปุ่มดาวน์โหลดภาพ QR Code */}
                  {hasDirectQr && (
                    <button
                      type="button"
                      onClick={handleDownloadPaymentQR}
                      disabled={isDownloadingQR}
                      className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200/90 text-zinc-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isDownloadingQR ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                      ) : (
                        <Download className="w-4 h-4 text-brand-600" />
                      )}
                      <span>{isDownloadingQR ? "กำลังบันทึกรูปภาพ..." : "บันทึกรูป QR Code"}</span>
                    </button>
                  )}

                  {/* ส่วนอัปโหลดสลิปหลักฐานการโอนเงิน */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSlipUpload}
                  />

                  {uploadedSlipUrl || hasSlip || slipUrl ? (
                    <div className="w-full py-2.5 px-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-800">ส่งหลักฐานการชำระแล้ว</span>
                    </div>
                  ) : (
                    <div className="w-full space-y-2.5">
                      <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-2xl text-left space-y-1.5">
                        <div className="flex items-start gap-1.5 text-[11px] text-zinc-700">
                          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>ชำระผ่าน<strong>แอปธนาคารเท่านั้น</strong> (ไม่รองรับ TrueMoney / เป๋าตัง)</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[10.5px] text-zinc-500">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span>โปรดใช้สลิปจริง การใช้สลิปปลอมมีความผิดตามกฎหมาย</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingSlip}
                        className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-75"
                      >
                        <Upload className="w-4 h-4" />
                        <span>อัปโหลดหลักฐานการชำระ (สลิป)</span>
                      </button>
                      <div className="flex items-center justify-center w-full px-1 pt-0.5 text-[11px] text-zinc-500 text-center">
                        <span>ตรวจสอบทันที - เมื่อชำระเรียบร้อยจะได้รับอาหาร</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ไทม์ไลน์สถานะออเดอร์ (Status Timeline Card) */}
          {isCancelled ? (
            <div className="bg-white rounded-[24px] p-5 shadow-xs border border-red-200 space-y-2.5">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>สถานะ: ยกเลิกออเดอร์แล้ว</span>
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถแก้ไขหรือชำระเงินได้ (ดูรายการอาหารได้อย่างเดียว)
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] p-6 shadow-xs border border-zinc-200/70 space-y-6">
              {/* ขั้นตอนที่ 1: ร้านค้ายืนยันรับออเดอร์ */}
              <div className="flex items-start gap-4 relative">
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 mt-0.5 shadow-xs ${
                    isConfirmed ? "bg-zinc-900 text-white" : "bg-amber-500 text-white animate-pulse"
                  }`}
                >
                  {isConfirmed ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : <Clock className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`absolute left-[13px] top-7 bottom-[-24px] w-0.5 ${
                    isConfirmed ? "bg-zinc-900" : "bg-zinc-200"
                  }`}
                />

                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
                    {isConfirmed ? "ร้านยืนยันรับออเดอร์แล้ว" : "รอร้านค้ายืนยันรับออเดอร์"}
                  </h4>
                  <p className="text-xs text-zinc-500 font-medium">
                    {isConfirmed
                      ? confirmedAt && confirmedAt !== "-" ? `${confirmedAt} · ร้านตอบรับออเดอร์แล้ว` : "ร้านตอบรับออเดอร์แล้ว"
                      : "กำลังรอร้านตรวจสอบรายการ..."}
                  </p>
                </div>
              </div>

              {/* ขั้นตอนที่ 2: ชำระเงิน */}
              <div className="flex items-start gap-4 relative">
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 mt-0.5 shadow-xs ${
                    isPaid
                      ? "bg-zinc-900 text-white"
                      : isConfirmed
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-white border-2 border-zinc-300 text-transparent"
                  }`}
                >
                  {isPaid ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : <CreditCard className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`absolute left-[13px] top-7 bottom-[-24px] w-0.5 ${
                    isCookingDoneOrCurrent ? "bg-zinc-900" : isPaid ? "bg-zinc-400" : "bg-zinc-200"
                  }`}
                />

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-bold tracking-tight ${isPaid || isConfirmed ? "text-zinc-900" : "text-zinc-400"}`}>
                      ชำระเงิน
                    </h4>
                    {isPaid && activeSlipUrl && (
                      <button
                        type="button"
                        onClick={() => setSlipLightboxOpen(true)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>ดูสลิปที่แนบ</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">
                    {isPaid
                      ? "ชำระเงินเรียบร้อยแล้ว"
                      : isConfirmed
                      ? paymentMethod === "cash"
                        ? "รอชำระเงินสดหน้าร้าน"
                        : "รอชำระเงินผ่านพร้อมเพย์ QR"
                      : "รอเริ่มกระบวนการชำระเงิน"}
                  </p>
                </div>
              </div>

              {/* ขั้นตอนที่ 3: กำลังจัดทำ */}
              <div className="flex items-start gap-4 relative">
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 mt-0.5 shadow-xs ${
                    isReady
                      ? "bg-zinc-900 text-white"
                      : isCookingCurrent
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-white border-2 border-zinc-300 text-transparent"
                  }`}
                >
                  {isReady ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  ) : isCookingCurrent ? (
                    <ChefHat className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3 h-3 text-zinc-300" />
                  )}
                </div>
                <div
                  className={`absolute left-[13px] top-7 bottom-[-24px] w-0.5 ${
                    isReady ? "bg-zinc-900" : isCookingCurrent ? "bg-amber-400" : "bg-zinc-200"
                  }`}
                />

                <div className="space-y-0.5">
                  <h4 className={`text-sm font-bold tracking-tight ${isCookingDoneOrCurrent ? "text-zinc-900" : "text-zinc-400"}`}>
                    กำลังจัดทำ
                  </h4>
                  <p className="text-xs text-zinc-500 font-medium">
                    {isReady
                      ? `${cookingAt ? cookingAt + " · " : ""}จัดทำเสร็จเรียบร้อยแล้ว`
                      : isCookingCurrent
                      ? `${cookingAt ? cookingAt + " · " : ""}กำลังปรุงอาหาร... เหลืออีกประมาณ ${estimatedRemainingMinutes || 15} นาที`
                      : "รอเริ่มจัดทำ"}
                  </p>
                </div>
              </div>

              {/* ขั้นตอนที่ 4: เสร็จสิ้น พร้อมรับของ */}
              <div className="flex items-start gap-4 relative">
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 mt-0.5 shadow-xs ${
                    isReady
                      ? "bg-emerald-500 text-white animate-pulse"
                      : "bg-white border-2 border-dashed border-zinc-300 text-transparent"
                  }`}
                >
                  {isReady ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : <CheckCircle2 className="w-4 h-4 text-zinc-300" />}
                </div>

                <div className="space-y-0.5">
                  <h4 className={`text-sm font-bold tracking-tight ${isReady ? "text-emerald-700" : "text-zinc-400"}`}>
                    เสร็จสิ้น พร้อมรับของ
                  </h4>
                  <p className="text-xs text-zinc-500 font-medium">
                    {isReady
                      ? readyAt && readyAt !== "-"
                        ? `${readyAt} · ออเดอร์เสร็จแล้ว สามารถมารับได้เลย!`
                        : "ออเดอร์เสร็จแล้ว สามารถมารับได้เลย!"
                      : "รอคิวปรุงเสร็จ"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* การ์ดแสดงหลักฐานการชำระเงินเมื่อชำระแล้ว (Paid Proof Card) */}
          {isPaid && (activeSlipUrl || hasSlip) && normStatus !== "cancelled" && (
            <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/80 space-y-3.5 animate-fade-up">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-900">หลักฐานการชำระเงิน</h3>
                    <p className="text-[10.5px] text-zinc-500 font-medium">ตรวจสอบสลิปผ่านระบบอัตโนมัติแล้ว</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ชำระเงินแล้ว</span>
                </span>
              </div>

              {activeSlipUrl ? (
                <div className="space-y-2.5">
                  <div
                    onClick={() => setSlipLightboxOpen(true)}
                    className="relative group rounded-2xl overflow-hidden border border-zinc-200/90 bg-zinc-950 cursor-pointer shadow-xs hover:border-brand-300 transition-all"
                  >
                    <SafeImage
                      src={activeSlipUrl}
                      alt="หลักฐานการชำระเงิน"
                      className="w-full h-48 sm:h-56 object-contain bg-zinc-950 group-hover:scale-[1.02] transition-transform duration-300"
                      fallbackType="receipt"
                    />
                    <div className="absolute inset-0 bg-black/35 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                      <span className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-lg group-hover:scale-105 transition-transform">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>แตะเพื่อดูภาพสลิปขนาดเต็ม</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 text-xs text-zinc-600 font-medium">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ยอดชำระ: <strong className="text-zinc-900 font-mono font-bold">฿{totalAmount}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlipLightboxOpen(true)}
                      className="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูสลิปเต็ม</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ได้รับการยืนยันการชำระเงินเรียบร้อยแล้ว</span>
                </div>
              )}
            </div>
          )}

          {/* การ์ดสรุปรายการอาหารที่สั่ง (Detailed Order Items Breakdown Card) */}
          <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-200/70 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-1.5 font-bold text-zinc-800 text-xs">
                <Utensils className="w-3.5 h-3.5 text-brand-600" />
                <span>รายการที่สั่ง ({totalItemCount} ชิ้น)</span>
              </div>
              {normStatus === "pending" && onEditOrder && (
                <button
                  type="button"
                  onClick={onEditOrder}
                  className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3 h-3 text-rose-600" />
                  <span>แก้ไขรายการ</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-zinc-100 space-y-2.5">
              {items.map((it, idx) => {
                const details = parseCrepeDetails(it);
                const hasToppings = Boolean(details.toppingsList && details.toppingsList.length > 0);
                const formattedImg = hasToppings && it.image ? it.image : "";
                const isCrustOOS = isNameOutOfStock(details.crust, menuAvailabilityMap);
                const allToppingsOOS = hasToppings && details.toppingsList!.every((t) => isNameOutOfStock(t, menuAvailabilityMap));
                const isItemOOS = Boolean(it.isOutOfStock || isCrustOOS || (hasToppings && allToppingsOOS));

                return (
                  <div
                    key={it.id || idx}
                    className={cn(
                      "pt-2.5 first:pt-0 flex items-start gap-3 rounded-xl transition-all",
                      isItemOOS && "p-2 bg-red-50/40 border border-red-200/60"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative">
                      <SafeImage
                        src={formattedImg}
                        alt={details.firstTopping || details.crust}
                        className="w-full h-full object-cover"
                        fallback={<ChefHat className="w-5 h-5 text-brand-500" />}
                      />
                      <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-brand-600 text-white font-black text-[9px] rounded-tl-md">
                        x{it.quantity || 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "font-bold text-sm tracking-tight",
                              normStatus === "cancelled"
                                ? "text-zinc-500"
                                : isItemOOS
                                ? "line-through text-red-600 font-bold"
                                : isCrustOOS
                                ? "line-through text-red-600"
                                : "text-zinc-900"
                            )}
                          >
                            {details.crust}
                          </span>
                          {isItemOOS && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-red-100 text-red-700 border border-red-200">
                              สินค้าหมด
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-black font-mono text-xs shrink-0",
                            normStatus === "cancelled" || isItemOOS ? "text-zinc-400 line-through" : "text-zinc-900"
                          )}
                        >
                          ฿{it.price * (it.quantity || 1)}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-700 leading-snug">
                        <span className="text-zinc-500 font-medium">ไส้: </span>
                        {hasToppings ? (
                          <span>
                            {details.toppingsList!.map((top, tIdx) => {
                              const isTopOOS = isNameOutOfStock(top, menuAvailabilityMap);
                              return (
                                <span key={tIdx}>
                                  {tIdx > 0 && <span className="text-zinc-400 font-normal"> , </span>}
                                  <span
                                    className={cn(
                                      "font-bold",
                                      isTopOOS
                                        ? "line-through text-red-500 font-medium"
                                        : "text-zinc-900"
                                    )}
                                  >
                                    {top}
                                  </span>
                                  {isTopOOS && (
                                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded-xs ml-1 font-normal">
                                      (หมด)
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        ) : (
                          <span className="text-zinc-900 font-bold">{details.toppings}</span>
                        )}
                      </div>

                      {details.note && (
                        <div className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 text-[10px] font-medium">
                          หมายเหตุ: {details.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between font-bold text-sm text-zinc-900">
              {normStatus === "cancelled" ? (
                <span className="text-red-700 font-bold text-xs bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80">
                  ยกเลิกออเดอร์แล้ว (฿0)
                </span>
              ) : (
                <span className={isPaid ? "text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60" : "text-amber-700 font-bold text-xs bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60"}>
                  {isPaid ? "ชำระเงินเรียบร้อย" : "รอดำเนินการชำระเงิน"}
                </span>
              )}
              <span className={cn("text-base font-black font-mono", normStatus === "cancelled" && "text-zinc-400 line-through")}>
                ฿{totalAmount}
              </span>
            </div>
          </div>

          {/* ปุ่มโทรติดต่อร้านค้า */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleCall}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/90 font-bold rounded-full text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-zinc-600" />
              <span>โทรติดต่อร้าน</span>
            </button>
            <p className="text-center text-[11px] text-zinc-400 font-medium">
              หน้านี้จะอัปเดตสถานะอัตโนมัติเมื่ออาหารพร้อมรับ
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
