"use client";

/**
 * =========================================================================================
 * @file RestaurantContactModal.tsx
 * @description คอมโพเนนต์หน้าต่างแสดงช่องทางการติดต่อและโซเชียลมีเดียของร้านค้า (Restaurant Contact BottomSheet)
 * 
 * หน้าที่หลัก:
 * - แสดงข้อมูลวันและเวลาทำการ / วันหยุดร้าน
 * - ปุ่มโทรออกทันทีและคัดลอกเบอร์โทรศัพท์
 * - ลิงก์เชื่อมโยงโซเชียลมีเดีย: LINE Official, Facebook, Instagram, TikTok, YouTube, X, เว็บไซต์
 * - ลิงก์แพลตฟอร์มเดลิเวอรี่: LINE MAN, GrabFood, ShopeeFood, Robinhood
 * - ที่อยู่และลิงก์เปิดแผนที่นำทางผ่าน Google Maps
 * =========================================================================================
 */

import { useState } from "react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { Button } from "@/app/components/ui/Button";
import { RestaurantProfileDTO } from "@/app/lib/api";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { formatDriveImageUrl, formatDisplayPhone, cn } from "@/app/lib/utils";
import {
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Store,
  Navigation,
  Share2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  LineIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  XTwitterIcon,
  LineManIcon,
  GrabFoodIcon,
  ShopeeFoodIcon,
  RobinhoodIcon,
  GoogleMapsIcon,
} from "@/app/components/icons/SocialIcons";
import { toast } from "sonner";

/** Props ของคอมโพเนนต์ RestaurantContactModal */
interface RestaurantContactModalProps {
  /** ควบคุมการเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** ข้อมูลโปรไฟล์ร้านค้า */
  restaurant: RestaurantProfileDTO;
  /** ข้อมูลแบรนดิ้งและสีของร้าน */
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string | null;
  };
}

/**
 * คอมโพเนนต์ RestaurantContactModal
 */
export function RestaurantContactModal({
  isOpen,
  onClose,
  restaurant,
  branding,
}: RestaurantContactModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedLine, setCopiedLine] = useState(false);

  const rawPhone = restaurant.phone || restaurant.restaurant_phone || "";
  const phone = formatDisplayPhone(rawPhone);

  // ตรวจสอบความถูกต้องของ LINE ID & LINE OA URL
  const rawLine = restaurant.lineId || restaurant.line_id || "";
  const isValidLine =
    rawLine &&
    !rawLine.startsWith("http") &&
    !rawLine.includes("googleusercontent") &&
    !rawLine.includes("drive.google") &&
    rawLine.trim() !== "-" &&
    rawLine.trim() !== "";
  const lineId = isValidLine ? rawLine.trim() : "";

  const rawLineOa = (restaurant as any).lineOaUrl || (restaurant as any).line_oa_url || "";
  const lineOaUrl = rawLineOa && rawLineOa.trim() !== "-" ? rawLineOa.trim() : "";

  // ตรวจสอบความถูกต้องของ Facebook URL
  const rawFb = restaurant.facebookUrl || restaurant.facebook_url || "";
  const isValidFb =
    rawFb &&
    !rawFb.includes("googleusercontent") &&
    !rawFb.includes("drive.google") &&
    rawFb.trim() !== "-" &&
    rawFb.trim() !== "";
  const facebookUrl = isValidFb ? rawFb.trim() : "";

  // ตรวจสอบความถูกต้องของ Instagram URL
  const rawIg = restaurant.instagramUrl || restaurant.instagram_url || "";
  const isValidIg =
    rawIg &&
    !rawIg.includes("googleusercontent") &&
    !rawIg.includes("drive.google") &&
    rawIg.trim() !== "-" &&
    rawIg.trim() !== "";
  const instagramUrl = isValidIg ? rawIg.trim() : "";

  // ตรวจสอบความถูกต้องของ TikTok URL
  const rawTt = restaurant.tiktokUrl || restaurant.tiktok_url || "";
  const isValidTt =
    rawTt &&
    !rawTt.includes("googleusercontent") &&
    !rawTt.includes("drive.google") &&
    rawTt.trim() !== "-" &&
    rawTt.trim() !== "";
  const tiktokUrl = isValidTt ? rawTt.trim() : "";

  // ตรวจสอบความถูกต้องของ YouTube URL
  const rawYt = (restaurant as any).youtubeUrl || (restaurant as any).youtube_url || "";
  const youtubeUrl = rawYt && rawYt.trim() !== "-" ? rawYt.trim() : "";

  // ตรวจสอบความถูกต้องของ X (Twitter) URL
  const rawX = (restaurant as any).xUrl || (restaurant as any).x_url || "";
  const xUrl = rawX && rawX.trim() !== "-" ? rawX.trim() : "";

  // ตรวจสอบความถูกต้องของ Website URL
  const rawWebsite = restaurant.websiteUrl || restaurant.website_url || "";
  const isValidWebsite =
    rawWebsite &&
    !rawWebsite.includes("googleusercontent") &&
    !rawWebsite.includes("drive.google") &&
    rawWebsite.trim() !== "-" &&
    rawWebsite.trim() !== "";
  const websiteUrl = isValidWebsite ? rawWebsite.trim() : "";

  // ตรวจสอบความถูกต้องของ Google Maps URL
  const rawMaps = (restaurant as any).googleMapsUrl || (restaurant as any).google_maps_url || "";
  const googleMapsUrl = rawMaps && rawMaps.trim() !== "-" ? rawMaps.trim() : "";

  // ตรวจสอบความถูกต้องของ Email
  const rawEmail = restaurant.email || (restaurant as any).restaurant_email || "";
  const email = rawEmail && rawEmail.trim() !== "-" ? rawEmail.trim() : "";

  // แพลตฟอร์มเดลิเวอรี่
  const rawLineman = (restaurant as any).linemanUrl || (restaurant as any).lineman_url || "";
  const linemanUrl = rawLineman && rawLineman.trim() !== "-" ? rawLineman.trim() : "";

  const rawGrab = (restaurant as any).grabUrl || (restaurant as any).grab_url || "";
  const grabUrl = rawGrab && rawGrab.trim() !== "-" ? rawGrab.trim() : "";

  const rawShopee = (restaurant as any).shopeefoodUrl || (restaurant as any).shopeefood_url || "";
  const shopeefoodUrl = rawShopee && rawShopee.trim() !== "-" ? rawShopee.trim() : "";

  const rawRobinhood = (restaurant as any).robinhoodUrl || (restaurant as any).robinhood_url || "";
  const robinhoodUrl = rawRobinhood && rawRobinhood.trim() !== "-" ? rawRobinhood.trim() : "";

  const address = (restaurant.address || restaurant.restaurant_address || "").trim();
  const isValidAddress = Boolean(address && address !== "-" && address !== "");

  const openTime = (restaurant.openTime || restaurant.restaurant_open_time || "").trim();
  const closeTime = (restaurant.closeTime || restaurant.restaurant_close_time || "").trim();
  const days = (restaurant.operatingDays || restaurant.restaurant_day || "").trim();
  const closedDays = (restaurant.closedDays || restaurant.closed_days || "").trim();

  const hasHours = Boolean(openTime && closeTime && openTime !== "-" && closeTime !== "-");
  const isValidDays = Boolean(days && days !== "-" && days !== "");
  const isValidClosedDays = Boolean(closedDays && closedDays !== "-" && closedDays !== "");
  const hasHoursSection = hasHours || isValidDays || isValidClosedDays;

  /**
   * คัดลอกข้อความลงคลิปบอร์ด
   */
  const handleCopy = (text: string, type: "phone" | "line") => {
    navigator.clipboard.writeText(text);
    if (type === "phone") {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      toast.success("คัดลอกเบอร์โทรศัพท์แล้ว");
    } else {
      setCopiedLine(true);
      setTimeout(() => setCopiedLine(false), 2000);
      toast.success("คัดลอก LINE ID แล้ว");
    }
  };

  const hasPhoneSection = Boolean(phone || email);
  const hasSocials = Boolean(
    lineId || lineOaUrl || facebookUrl || instagramUrl || tiktokUrl || youtubeUrl || xUrl || websiteUrl
  );
  const hasDelivery = Boolean(
    linemanUrl || grabUrl || shopeefoodUrl || robinhoodUrl
  );
  const hasAddressSection = Boolean(isValidAddress || googleMapsUrl);
  const hasAnyContact = hasHoursSection || hasPhoneSection || hasSocials || hasDelivery || hasAddressSection;

  return (
    <BottomSheet open={isOpen} onClose={onClose} title="ช่องทางติดต่อร้าน">
      <div className="space-y-4 pb-6 max-w-md mx-auto">
        {/* หัวข้อข้อมูลร้านค้า Header */}
        <div className="flex items-center gap-3.5 p-3.5 bg-surface-2 rounded-2xl border border-border">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0 bg-white">
            <SafeImage
              src={branding?.logoUrl || "/LogoSquare.png"}
              alt="โลโก้ร้าน"
              className="w-full h-full object-cover"
              fallbackType="logo"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-base text-text truncate">
              {restaurant.name || restaurant.restaurant_name || "ร้านอาหาร"}
            </h3>
            <div className="flex items-center gap-2 text-xs text-text-3 mt-0.5">
              <Clock size={12} className="shrink-0 text-brand-600" />
              {hasHours ? (
                <span>
                  {openTime} - {closeTime} น. {days ? `(${days})` : ""}
                </span>
              ) : (
                <span>{days || "ไม่ได้ระบุเวลาเปิด-ปิด"}</span>
              )}
            </div>
          </div>
        </div>

        {/* การ์ดเวลาเปิด-ปิดและวันหยุด */}
        {hasHoursSection && (
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-2">
                <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center">
                  <Calendar size={14} />
                </div>
                <span>เวลาทำการ & วันเปิด-ปิด</span>
              </div>
              <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                เวลาบริการ
              </span>
            </div>

            <div className="bg-surface-2 p-3.5 rounded-xl border border-border space-y-2 text-xs">
              {isValidDays && (
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-bold text-text">
                      วันเปิดทำการ: <span className="font-semibold text-text-2">{days}</span>
                    </p>
                    {hasHours && (
                      <p className="text-text-3 font-medium mt-0.5">
                        เวลา {openTime} - {closeTime} น.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isValidDays && hasHours && (
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-bold text-text">
                      เวลาเปิดทำการ: <span className="font-semibold text-text-2">{openTime} - {closeTime} น.</span>
                    </p>
                  </div>
                </div>
              )}

              {isValidClosedDays && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-border/60">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-bold text-text">
                      วันหยุดร้าน: <span className="font-semibold text-amber-600">{closedDays}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* การ์ดเบอร์โทรศัพท์และอีเมล */}
        {hasPhoneSection && (
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Phone size={14} />
                </div>
                <span>ข้อมูลการติดต่อร้าน</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ติดต่อสอบถาม
              </span>
            </div>

            {phone && (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-surface-2 p-3 rounded-xl border border-border">
                  <span className="font-mono font-black text-base sm:text-lg text-text tracking-wide">
                    {phone}
                  </span>
                  <button
                    onClick={() => handleCopy(phone, "phone")}
                    className="p-1.5 rounded-lg hover:bg-surface-3 text-text-3 hover:text-text transition-colors"
                    title="คัดลอกเบอร์โทร"
                  >
                    {copiedPhone ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>

                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <PhoneCall size={15} />
                  โทรออกทันที
                </a>
              </div>
            )}

            {email && (
              <div className={cn("flex items-center justify-between", phone && "pt-2 border-t border-border/60")}>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={14} className="text-blue-600 shrink-0" />
                  <span className="text-xs text-text font-medium truncate">{email}</span>
                </div>
                <a
                  href={`mailto:${email}`}
                  className="text-xs font-bold text-blue-600 hover:underline shrink-0 ml-2"
                >
                  ส่งอีเมล
                </a>
              </div>
            )}
          </div>
        )}

        {/* การ์ดโซเชียลมีเดีย & ช่องทางออนไลน์ */}
        {hasSocials && (
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text-2">
              <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center">
                <Share2 size={14} />
              </div>
              <span>โซเชียลมีเดีย & ช่องทางออนไลน์</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* LINE */}
              {(lineId || lineOaUrl) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#06C755]/5 border border-[#06C755]/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#06C755] text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <LineIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">LINE ID / OA</p>
                      <p className="text-xs font-bold text-text truncate">
                        {lineId ? (lineId.startsWith("@") ? lineId : `@${lineId}`) : "LINE Official"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {lineId && (
                      <button
                        onClick={() => handleCopy(lineId, "line")}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 border border-border text-text-3 hover:text-text transition-colors text-xs font-bold"
                        title="คัดลอก LINE ID"
                      >
                        {copiedLine ? <Check size={14} className="text-[#06C755]" /> : <Copy size={14} />}
                      </button>
                    )}
                    <a
                      href={lineOaUrl || `https://line.me/R/ti/p/~${lineId.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      เพิ่มเพื่อน
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Facebook */}
              {facebookUrl && (
                <a
                  href={facebookUrl.startsWith("http") ? facebookUrl : `https://${facebookUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1877F2]/5 hover:bg-[#1877F2]/10 border border-[#1877F2]/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <FacebookIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">Facebook Page</p>
                      <p className="text-xs font-bold text-text truncate">
                        {facebookUrl.replace(/https?:\/\/(www\.)?facebook\.com\//, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1877F2] flex items-center gap-1">
                    เปิดเพจ <ExternalLink size={12} />
                  </span>
                </a>
              )}

              {/* Instagram */}
              {instagramUrl && (
                <a
                  href={
                    instagramUrl.startsWith("http")
                      ? instagramUrl
                      : `https://instagram.com/${instagramUrl.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <InstagramIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">Instagram</p>
                      <p className="text-xs font-bold text-text truncate">
                        {instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-pink-600 flex items-center gap-1">
                    เยี่ยมชม <ExternalLink size={12} />
                  </span>
                </a>
              )}

              {/* TikTok */}
              {tiktokUrl && (
                <a
                  href={
                    tiktokUrl.startsWith("http")
                      ? tiktokUrl
                      : `https://tiktok.com/@${tiktokUrl.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900/10 border border-border transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <TikTokIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">TikTok</p>
                      <p className="text-xs font-bold text-text truncate">
                        {tiktokUrl.replace(/https?:\/\/(www\.)?tiktok\.com\//, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-text flex items-center gap-1">
                    ติดตาม <ExternalLink size={12} />
                  </span>
                </a>
              )}

              {/* YouTube */}
              {youtubeUrl && (
                <a
                  href={youtubeUrl.startsWith("http") ? youtubeUrl : `https://${youtubeUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-red-600/5 hover:bg-red-600/10 border border-red-600/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <YouTubeIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">YouTube Channel</p>
                      <p className="text-xs font-bold text-text truncate">
                        {youtubeUrl.replace(/https?:\/\/(www\.)?youtube\.com\//, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    รับชม <ExternalLink size={12} />
                  </span>
                </a>
              )}

              {/* X / Twitter */}
              {xUrl && (
                <a
                  href={xUrl.startsWith("http") ? xUrl : `https://x.com/${xUrl.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-black/5 hover:bg-black/10 border border-border transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <XTwitterIcon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">X (Twitter)</p>
                      <p className="text-xs font-bold text-text truncate">
                        {xUrl.replace(/https?:\/\/(www\.)?x\.com\//, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-text flex items-center gap-1">
                    ติดตาม <ExternalLink size={12} />
                  </span>
                </a>
              )}

              {/* Website */}
              {websiteUrl && (
                <a
                  href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-3 text-text flex items-center justify-center font-bold text-xs shrink-0 border border-border">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-3 font-medium">เว็บไซต์ร้าน</p>
                      <p className="text-xs font-bold text-text truncate">
                        {websiteUrl.replace(/https?:\/\/(www\.)?/, "")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-600 flex items-center gap-1">
                    เยี่ยมชม <ExternalLink size={12} />
                  </span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* แพลตฟอร์มเดลิเวอรี่ Delivery */}
        {hasDelivery && (
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Store size={14} />
              </div>
              <span>สั่งอาหารผ่านแอปเดลิเวอรี่ (Delivery)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {linemanUrl && (
                <a
                  href={linemanUrl.startsWith("http") ? linemanUrl : `https://${linemanUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LineManIcon size={20} className="rounded-md shrink-0 shadow-2xs" />
                    <span>LINE MAN</span>
                  </div>
                  <ExternalLink size={12} />
                </a>
              )}
              {grabUrl && (
                <a
                  href={grabUrl.startsWith("http") ? grabUrl : `https://${grabUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GrabFoodIcon size={20} className="rounded-md shrink-0 shadow-2xs" />
                    <span>GrabFood</span>
                  </div>
                  <ExternalLink size={12} />
                </a>
              )}
              {shopeefoodUrl && (
                <a
                  href={shopeefoodUrl.startsWith("http") ? shopeefoodUrl : `https://${shopeefoodUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShopeeFoodIcon size={20} className="rounded-md shrink-0 shadow-2xs" />
                    <span>ShopeeFood</span>
                  </div>
                  <ExternalLink size={12} />
                </a>
              )}
              {robinhoodUrl && (
                <a
                  href={robinhoodUrl.startsWith("http") ? robinhoodUrl : `https://${robinhoodUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RobinhoodIcon size={20} className="rounded-md shrink-0 shadow-2xs" />
                    <span>Robinhood</span>
                  </div>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ที่อยู่และการนำทางด้วย Google Maps */}
        {hasAddressSection && (
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-2">
                <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center">
                  <MapPin size={14} />
                </div>
                <span>ที่อยู่และการเดินทาง</span>
              </div>
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl.startsWith("http") ? googleMapsUrl : `https://${googleMapsUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 hover:underline"
                >
                  <Navigation size={11} /> แผนที่ Google Maps
                </a>
              )}
            </div>

            {isValidAddress && (
              <div className="p-3 bg-surface-2 rounded-xl border border-border">
                <p className="text-xs text-text-2 leading-relaxed">{address}</p>
              </div>
            )}

            {googleMapsUrl && (
              <a
                href={googleMapsUrl.startsWith("http") ? googleMapsUrl : `https://${googleMapsUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <MapPin size={14} />
                เปิดนำทางด้วย Google Maps
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {/* กรณีไม่มีข้อมูลช่องทางติดต่อใดๆ เลย */}
        {!hasAnyContact && (
          <div className="p-6 rounded-2xl bg-surface-2 border border-border text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-surface-3 text-text-3 flex items-center justify-center mx-auto mb-2">
              <Store size={22} />
            </div>
            <p className="font-bold text-sm text-text">ยังไม่ได้ระบุข้อมูลช่องทางติดต่อ</p>
            <p className="text-xs text-text-3">ร้านค้ายังไม่ได้ระบุข้อมูลช่องทางการติดต่อหรือโซเชียลมีเดียในระบบ</p>
          </div>
        )}

        <Button variant="outline" fullWidth onClick={onClose} className="rounded-xl">
          ปิดหน้าต่าง
        </Button>
      </div>
    </BottomSheet>
  );
}
