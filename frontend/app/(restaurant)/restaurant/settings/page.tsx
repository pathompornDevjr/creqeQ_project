/**
 * @file page.tsx (Restaurant Settings)
 * @description หน้าตั้งค่าร้านค้าแบบครบวงจร (Comprehensive Restaurant Settings)
 * ประกอบด้วยระบบจัดการแท็บย่อย:
 * 1. คิวอาร์โค้ดร้านค้า (Shop QR Code)
 * 2. จัดการแป้งเครป (Crusts Management)
 * 3. จัดการหมวดหมู่ไส้ (Categories Management)
 * 4. จัดการรายการเมนูและท็อปปิ้ง (Menu & Toppings Management)
 * 5. เมนูตัวอย่างแนะนำ (Sample Menus)
 * 6. ข้อมูลทั่วไปของร้าน (General Shop Info)
 * 7. โลโก้ แบนเนอร์ และชุดสีธีมร้าน (Branding, Logo & Theme)
 * 8. ช่องทางติดต่อและโซเชียลมีเดีย (Contact & Social Links)
 * 9. บัญชีพร้อมเพย์และธนาคารรับเงิน (PromptPay & Bank Details)
 * 10. การตั้งค่าเสียงแจ้งเตือน (Voice & Chime Sound Settings)
 */

"use client";
import { Button } from "@/app/components/ui/Button";
import { Input, Textarea } from "@/app/components/ui/Input";
import { CustomSelect } from "@/app/components/ui/Select";
import { VerticalTabs } from "@/app/components/ui/Tabs";
import { RestaurantApi, CategoryDTO, CrustDTO, MenuItemDTO as MenuItem } from "@/app/lib/api";
import { cn, formatDriveImageUrl, getDriveThumbnailUrl } from "@/app/lib/utils";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { parseThaiAddress } from "@/app/lib/thai-address";
import { motion, AnimatePresence } from "framer-motion";
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
import { useRestaurant } from "../RestaurantProvider";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  DoorOpen,
  Droplets,
  Edit2,
  Grid3x3,
  Info,
  KeyRound,
  Loader2,
  Palette,
  Plus,
  QrCode,
  RefreshCw,
  Square,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
  Landmark,
  ShieldCheck,
  Phone,
  PhoneCall,
  Mail,
  CreditCard,
  Calendar,
  MapPin,
  Image,
  Upload,
  Sparkles,
  Settings,
  Minus,
  AlertTriangle,
  Menu,
  ImagePlus,
  Layers,
  Globe,
  MessageCircle,
  Share2,
  Link2,
  AtSign,
  ExternalLink,
  Eye,
  Smartphone,
  Flame,
  Leaf,
  ShoppingBag,
  Utensils,
  Search,
  Wheat,
  Wind,
  Soup,
  CupSoda,
  Star,
  Zap,
  Download,
  Printer,
  CircleDot,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
  Bell,
  Play,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ShopQRTab } from "@/app/components/ShopQRTab";
import { GoogleMapPicker } from "@/app/components/ui/GoogleMapPicker";
import { RestaurantSettingsSkeleton } from "@/app/components/skeletons/RestaurantSettingsSkeleton";
import {
  isNewOrderSoundEnabled,
  setNewOrderSoundEnabled,
  isPaymentSoundEnabled,
  setPaymentSoundEnabled,
  speakOrderVoiceAnnouncement,
  speakPaymentVoiceAnnouncement,
} from "@/app/lib/useRestaurantRealtime";

/** รายการประเภทแท็บการตั้งค่าทั้งหมด */
type SettingsTab =
  | 'shop-qr'
  | 'menu-crusts'
  | 'menu-categories'
  | 'menu-items'
  | 'menu-samples'
  | 'info-general'
  | 'info-branding'
  | 'info-location'
  | 'info-contact'
  | 'info-bank'
  | 'info-security'
  | 'sound-settings';

/** รายการกลุ่มเมนูแท็บทางด้านซ้าย */
const tabs = [
  {
    id: 'shop-group',
    label: 'คิวอาร์โค้ดร้าน',
    icon: <QrCode size={15} />,
    children: [
      { id: 'shop-qr', label: 'คิวอาร์โค้ดหน้าร้าน' },
    ]
  },
  {
    id: 'menu-group',
    label: 'จัดการเมนูเครป',
    icon: <UtensilsCrossed size={15} />,
    children: [
      { id: 'menu-crusts', label: 'จัดการแป้งเครป' },
      { id: 'menu-categories', label: 'หมวดหมู่ไส้' },
      { id: 'menu-items', label: 'จัดการเมนู/ไส้' },
      { id: 'menu-samples', label: 'เมนูตัวอย่าง' }
    ]
  },
  {
    id: 'info-group',
    label: 'ข้อมูลร้านค้า',
    icon: <Store size={15} />,
    children: [
      { id: 'info-general', label: 'ข้อมูลทั่วไป' },
      { id: 'info-branding', label: 'โลโก้, แบนเนอร์ & สีร้าน' },
      { id: 'info-contact', label: 'ช่องทางการติดต่อ & โซเชียล' },
      { id: 'info-bank', label: 'พร้อมเพย์ & บัญชีรับเงิน' }
    ]
  },
  {
    id: 'sound-group',
    label: 'เสียงแจ้งเตือน',
    icon: <Volume2 size={15} />,
    children: [
      { id: 'sound-settings', label: 'ตั้งค่าเสียงแจ้งเตือน' }
    ]
  },
];

// ── Menu Crusts Tab (จัดการแป้งเครป) ──────────────────────────────────────────
interface CrustFormInputs {
  crustName: string;
  price: number;
  description?: string;
  sortOrder?: number;
}

function MenuCrustsTab() {
  const [crustsList, setCrustsList] = useState<CrustDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCrust, setEditingCrust] = useState<CrustDTO | null>(null);
  const [confirmDeleteCrust, setConfirmDeleteCrust] = useState<CrustDTO | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Form
  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors },
  } = useForm<CrustFormInputs>({
    defaultValues: { crustName: "", price: 10, description: "", sortOrder: 1 },
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<CrustFormInputs>({
    defaultValues: { crustName: "", price: 10, description: "", sortOrder: 1 },
  });

  const fetchCrusts = async () => {
    setIsLoading(true);
    try {
      const res = await RestaurantApi.getCrusts();
      if (res.success && res.data) {
        setCrustsList(res.data);
      }
    } catch (err) {
      console.error("Failed to load crusts:", err);
      toast.error("ไม่สามารถโหลดรายการแป้งเครปได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrusts();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    resetAdd({
      crustName: "",
      price: 10,
      description: "",
      sortOrder: (crustsList.length + 1),
    });
    setImagePreview("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (crust: CrustDTO) => {
    setEditingCrust(crust);
    resetEdit({
      crustName: crust.crust_name || crust.name || "",
      price: Number(crust.price) || 0,
      description: crust.description || "",
      sortOrder: crust.sort_order || 1,
    });
    setImagePreview(crust.crust_image || crust.image_url || "");
  };

  const onAddCrust = async (data: CrustFormInputs) => {
    const trimmedName = data.crustName.trim();
    if (!trimmedName) {
      toast.error("กรุณากรอกชื่อแป้งเครป");
      return;
    }

    const isDuplicate = crustsList.some(
      (c) => (c.crust_name || c.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`ชื่อแป้งเครป "${trimmedName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<CrustDTO> = {
        crust_name: trimmedName,
        name: trimmedName,
        price: Number(data.price) || 0,
        description: data.description?.trim() || "",
        sort_order: Number(data.sortOrder) || (crustsList.length + 1),
        is_available: true,
        crust_image: imagePreview || undefined,
      };

      const res = await RestaurantApi.createCrust(payload);
      if (res.success && res.data) {
        toast.success(`เพิ่มแป้ง "${trimmedName}" เรียบร้อยแล้ว`);
        setIsAddModalOpen(false);
        resetAdd();
        setImagePreview("");
        await fetchCrusts();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการเพิ่มแป้ง");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเพิ่มแป้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditCrust = async (data: CrustFormInputs) => {
    if (!editingCrust) return;
    const trimmedName = data.crustName.trim();
    if (!trimmedName) {
      toast.error("กรุณากรอกชื่อแป้งเครป");
      return;
    }

    const currentId = editingCrust.id || editingCrust.crust_id;
    const isDuplicate = crustsList.some(
      (c) =>
        String(c.id || c.crust_id) !== String(currentId) &&
        (c.crust_name || c.name || "").trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`ชื่อแป้งเครป "${trimmedName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      return;
    }

    setIsSubmitting(true);
    try {
      const id = editingCrust.id || editingCrust.crust_id;
      if (!id) throw new Error("Crust ID is missing");

      const payload: Partial<CrustDTO> = {
        crust_name: trimmedName,
        name: trimmedName,
        price: Number(data.price) || 0,
        description: data.description?.trim() || "",
        sort_order: Number(data.sortOrder) || 1,
        is_available: true,
        crust_image: imagePreview,
      };

      const res = await RestaurantApi.updateCrust(id, payload);
      if (res.success) {
        toast.success(`อัปเดตแป้ง "${trimmedName}" เรียบร้อยแล้ว`);
        setEditingCrust(null);
        resetEdit();
        setImagePreview("");
        await fetchCrusts();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการอัปเดตแป้ง");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปเดตแป้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCrust = async () => {
    if (!confirmDeleteCrust) return;
    const id = confirmDeleteCrust.id || confirmDeleteCrust.crust_id;
    if (!id) return;

    setIsSubmitting(true);
    try {
      const res = await RestaurantApi.deleteCrust(id);
      if (res.success) {
        toast.success(`ลบแป้ง "${confirmDeleteCrust.crust_name || confirmDeleteCrust.name}" เรียบร้อยแล้ว`);
        setConfirmDeleteCrust(null);
        await fetchCrusts();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการลบแป้ง");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบแป้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Wheat size={20} />
            </div>
            <h2 className="text-xl font-black text-text">จัดการแป้งเครป</h2>
          </div>
          <p className="text-xs text-text-3 mt-1.5 leading-relaxed max-w-2xl">
            ตั้งค่าชนิดแป้งเครป ราคาเริ่มต้น คำอธิบาย และรูปภาพ สำหรับให้ลูกค้าเลือกในหน้าเมนูสร้างเครป (Crepe Builder)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={fetchCrusts}
            disabled={isLoading}
            className="rounded-2xl h-11 px-3 text-text-2 hover:text-text border border-border"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="rounded-2xl h-11 px-4 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 gap-2 shrink-0"
          >
            <Plus size={18} />
            <span>เพิ่มแป้งเครป</span>
          </Button>
        </div>
      </div>

      {/* ── Content / Cards ── */}
      {isLoading && crustsList.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-3xl p-5 border border-border animate-pulse space-y-4">
              <div className="h-6 bg-surface-3 rounded-lg w-1/2" />
              <div className="h-4 bg-surface-3 rounded-lg w-3/4" />
              <div className="h-10 bg-surface-3 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : crustsList.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 border border-border text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Wheat size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-black text-text">ยังไม่มีข้อมูลแป้งเครป</h3>
            <p className="text-xs text-text-3 mt-1">
              เพิ่มชนิดแป้งเครปเพื่อให้ลูกค้าสามารถเลือกแผ่นแป้งที่ต้องการในขั้นตอนการสั่งซื้อได้
            </p>
          </div>
          <Button
            onClick={handleOpenAddModal}
            className="rounded-2xl h-11 px-6 font-bold bg-brand-500 hover:bg-brand-600 text-white gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span>เพิ่มแป้งเครปแรกของคุณ</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crustsList.map((crust) => {
            const crustId = crust.id || crust.crust_id || 0;

            return (
              <motion.div
                key={crustId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface rounded-3xl p-5 border border-border transition-all relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md hover:border-brand-500/40"
              >
                <div>
                  {/* Top Bar: Icon/Image + Name & Price */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-2 border border-border shrink-0 flex items-center justify-center">
                        <SafeImage
                          src={crust.crust_image || crust.image_url}
                          alt={crust.crust_name || crust.name}
                          className="w-full h-full object-cover"
                          fallback={
                            <div className="w-full h-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                              <Wheat size={24} />
                            </div>
                          }
                        />
                      </div>
                      <div>
                        <h4 className="font-black text-text text-base leading-tight">
                          {crust.crust_name || crust.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-brand-600 bg-brand-500/10 px-2.5 py-0.5 rounded-full">
                            ฿{Number(crust.price || 0).toLocaleString()}
                          </span>
                          {crust.sort_order !== undefined && (
                            <span className="text-[10px] text-text-3 font-semibold">
                              ลำดับ {crust.sort_order}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {crust.description ? (
                    <p className="text-xs text-text-3 line-clamp-2 my-2.5 leading-relaxed bg-surface-2/60 p-2.5 rounded-2xl border border-border/50">
                      {crust.description}
                    </p>
                  ) : (
                    <p className="text-xs text-text-3/60 italic my-2.5">
                      ไม่มีคำอธิบายเพิ่มเติม
                    </p>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(crust)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-brand-600 text-xs font-bold transition-colors border border-border"
                    title="แก้ไขแป้งเครป"
                  >
                    <Edit2 size={13} />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCrust(crust)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-rose-50 text-text-3 hover:text-rose-600 text-xs font-bold transition-colors border border-border"
                    title="ลบแป้งเครป"
                  >
                    <Trash2 size={13} />
                    <span>ลบ</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add Crust Modal ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsAddModalOpen(false)}
            />
            <motion.form
              onSubmit={handleAddSubmit(onAddCrust)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <h3 className="font-black text-text text-base sm:text-lg">เพิ่มแป้งเครปใหม่</h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                <Input
                  label="ชื่อแป้งเครป *"
                  placeholder="เช่น แป้งกรอบ, แป้งนุ่ม, แป้งชาโคล, แป้งมัทฉะ"
                  error={addErrors.crustName?.message}
                  {...registerAdd("crustName", {
                    required: "กรุณากรอกชื่อแป้งเครป",
                    validate: (value) => {
                      const trimmed = value?.trim().toLowerCase();
                      if (!trimmed) return "กรุณากรอกชื่อแป้งเครป";
                      const exists = crustsList.some(
                        (c) => (c.crust_name || c.name || "").trim().toLowerCase() === trimmed
                      );
                      if (exists) {
                        return `ชื่อแป้งเครป "${value.trim()}" มีอยู่ในระบบแล้ว`;
                      }
                      return true;
                    },
                  })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="ราคาเริ่มต้น (บาท) *"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    error={addErrors.price?.message}
                    {...registerAdd("price", {
                      required: "กรุณาระบุราคา",
                      min: { value: 0, message: "ราคาต้องไม่ติดลบ" },
                    })}
                  />
                  <Input
                    label="ลำดับการแสดง"
                    type="number"
                    min="1"
                    placeholder="1"
                    {...registerAdd("sortOrder")}
                  />
                </div>

                <Textarea
                  label="คำอธิบาย / จุดเด่นของแป้ง"
                  placeholder="เช่น บางกรอบ หอมเนย ละมุน นุ่มหนึบสไตล์ญี่ปุ่น (ไม่บังคับ)"
                  rows={2}
                  {...registerAdd("description")}
                />

                {/* Image Upload for Crust */}
                <div>
                  <label className="block text-xs font-bold text-text-2 mb-1.5">
                    รูปภาพแป้ง (ไม่บังคับ)
                  </label>
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border shrink-0 bg-surface-2">
                        <img
                          src={formatDriveImageUrl(imagePreview)}
                          alt="Crust Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-border hover:border-brand-500/60 bg-surface-2 flex flex-col items-center justify-center text-text-3 hover:text-brand-600 transition-colors shrink-0"
                      >
                        <ImagePlus size={18} />
                        <span className="text-[9px] mt-0.5">เลือกรูป</span>
                      </button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <p className="text-[11px] text-text-3 leading-relaxed">
                      อัปโหลดรูปภาพตัวอย่างแป้งเครป (.png, .jpg, .webp) เพื่อแสดงในหน้าเลือกแป้ง
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button
                  type="button"
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-2xl h-11 font-bold"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  className="rounded-2xl h-11 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกแป้งเครป"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Crust Modal ── */}
      <AnimatePresence>
        {editingCrust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingCrust(null)}
            />
            <motion.form
              onSubmit={handleEditSubmit(onEditCrust)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                    <Edit2 size={18} />
                  </div>
                  <h3 className="font-black text-text text-base sm:text-lg">แก้ไขแป้งเครป</h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingCrust(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                <Input
                  label="ชื่อแป้งเครป *"
                  placeholder="เช่น แป้งกรอบ, แป้งนุ่ม, แป้งชาโคล"
                  error={editErrors.crustName?.message}
                  {...registerEdit("crustName", {
                    required: "กรุณากรอกชื่อแป้งเครป",
                    validate: (value) => {
                      const trimmed = value?.trim().toLowerCase();
                      if (!trimmed) return "กรุณากรอกชื่อแป้งเครป";
                      const currentId = editingCrust?.id || editingCrust?.crust_id;
                      const exists = crustsList.some(
                        (c) =>
                          String(c.id || c.crust_id) !== String(currentId) &&
                          (c.crust_name || c.name || "").trim().toLowerCase() === trimmed
                      );
                      if (exists) {
                        return `ชื่อแป้งเครป "${value.trim()}" มีอยู่ในระบบแล้ว`;
                      }
                      return true;
                    },
                  })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="ราคาเริ่มต้น (บาท) *"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    error={editErrors.price?.message}
                    {...registerEdit("price", {
                      required: "กรุณาระบุราคา",
                      min: { value: 0, message: "ราคาต้องไม่ติดลบ" },
                    })}
                  />
                  <Input
                    label="ลำดับการแสดง"
                    type="number"
                    min="1"
                    placeholder="1"
                    {...registerEdit("sortOrder")}
                  />
                </div>

                <Textarea
                  label="คำอธิบาย / จุดเด่นของแป้ง"
                  placeholder="เช่น บางกรอบ หอมเนย ละมุน นุ่มหนึบสไตล์ญี่ปุ่น (ไม่บังคับ)"
                  rows={2}
                  {...registerEdit("description")}
                />

                {/* Image Upload for Crust */}
                <div>
                  <label className="block text-xs font-bold text-text-2 mb-1.5">
                    รูปภาพแป้ง (ไม่บังคับ)
                  </label>
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border shrink-0 bg-surface-2">
                        <img
                          src={formatDriveImageUrl(imagePreview)}
                          alt="Crust Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-border hover:border-brand-500/60 bg-surface-2 flex flex-col items-center justify-center text-text-3 hover:text-brand-600 transition-colors shrink-0"
                      >
                        <ImagePlus size={18} />
                        <span className="text-[9px] mt-0.5">เลือกรูป</span>
                      </button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <p className="text-[11px] text-text-3 leading-relaxed">
                      อัปโหลดรูปภาพตัวอย่างแป้งเครป (.png, .jpg, .webp) เพื่อแสดงในหน้าเลือกแป้ง
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button
                  type="button"
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setEditingCrust(null)}
                  className="rounded-2xl h-11 font-bold"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  className="rounded-2xl h-11 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Crust Modal ── */}
      <AnimatePresence>
        {confirmDeleteCrust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setConfirmDeleteCrust(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10 border border-border"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-rose-100 text-rose-600 shadow-md">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="font-black text-text text-lg">ยืนยันการลบแป้งเครป?</h3>
                <p className="text-xs text-text-3 mt-1.5 leading-relaxed">
                  คุณกำลังจะลบชนิดแป้ง{" "}
                  <strong className="text-text font-bold">
                    "{confirmDeleteCrust.crust_name || confirmDeleteCrust.name}"
                  </strong>{" "}
                  ออกจากระบบอย่างถาวร
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setConfirmDeleteCrust(null)}
                  className="rounded-2xl h-11 font-bold"
                >
                  ยกเลิก
                </Button>
                <Button
                  fullWidth
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl h-11 shadow-md shadow-rose-600/20"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeleteCrust}
                >
                  {isSubmitting ? "กำลังลบ..." : "ยืนยันลบแป้ง"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ── Menu Categories Tab ───────────────────────────────────────────────────
interface CategoryFormInputs {
  categoryName: string;
  remark?: string;
}

function MenuCategoriesTab({
  categories: initialCategories,
  setCategories: setParentCategories,
  items,
}: {
  categories: string[];
  setCategories: any;
  items: MenuItem[];
}) {
  const [categoriesList, setCategoriesList] = useState<CategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<CategoryDTO | null>(null);

  // Add Form
  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors },
  } = useForm<CategoryFormInputs>({
    defaultValues: { categoryName: "", remark: "" },
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<CategoryFormInputs>({
    defaultValues: { categoryName: "", remark: "" },
  });

  // Fetch categories from API
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await RestaurantApi.getCategories();
      if (res.success && res.data && res.data.length > 0) {
        setCategoriesList(res.data);
        const nameList = res.data.map((c) => c.category_name || c.name || c.label || "");
        setParentCategories(nameList);
      } else if (initialCategories && initialCategories.length > 0) {
        // Fallback with initial categories
        const mapped = initialCategories.map((name, idx) => ({
          id: `cat-${idx + 1}`,
          category_id: idx + 1,
          category_name: name,
          name: name,
          label: name,
          remark: "",
        }));
        setCategoriesList(mapped);
      }
    } catch (err) {
      console.warn("Could not fetch categories from API", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    resetAdd({ categoryName: "", remark: "" });
    setIsAddModalOpen(true);
  };

  const openEditModal = (cat: CategoryDTO) => {
    setEditingCategory(cat);
    resetEdit({
      categoryName: cat.category_name || cat.name || cat.label || "",
      remark: cat.remark || "",
    });
  };

  const onAddCategory = async (data: CategoryFormInputs) => {
    const trimmedName = data.categoryName.trim();
    const trimmedRemark = (data.remark || "").trim();
    if (!trimmedName) return;

    // Check duplicate
    const exists = categoriesList.some(
      (c) => (c.category_name || c.name || c.label || "").toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      toast.error(`หมวดหมู่ไส้ "${trimmedName}" มีอยู่ในระบบแล้ว`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await RestaurantApi.createCategory({
        category_name: trimmedName,
        name: trimmedName,
        remark: trimmedRemark,
      });

      const newCategory: CategoryDTO = res.data || {
        id: `cat-${Date.now()}`,
        category_id: Date.now(),
        category_name: trimmedName,
        name: trimmedName,
        label: trimmedName,
        remark: trimmedRemark,
        menuCount: 0,
      };

      const updatedList = [...categoriesList, newCategory];
      setCategoriesList(updatedList);
      setParentCategories(updatedList.map((c) => c.category_name || c.name || c.label || ""));
      toast.success(`เพิ่มหมวดหมู่ไส้ "${trimmedName}" เรียบร้อยแล้ว`);
      setIsAddModalOpen(false);
      resetAdd();
    } catch (err: any) {
      console.error("Create category error:", err);
      toast.error(err.message || "ไม่สามารถเพิ่มหมวดหมู่ไส้ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditCategory = async (data: CategoryFormInputs) => {
    if (!editingCategory) return;
    const trimmedName = data.categoryName.trim();
    const trimmedRemark = (data.remark || "").trim();
    if (!trimmedName) return;

    const targetId = editingCategory.id || String(editingCategory.category_id);

    setIsSubmitting(true);
    try {
      await RestaurantApi.updateCategory(targetId, {
        category_name: trimmedName,
        name: trimmedName,
        remark: trimmedRemark,
      });

      const updatedList = categoriesList.map((c) => {
        if (c.id === targetId || String(c.category_id) === targetId) {
          return {
            ...c,
            category_name: trimmedName,
            name: trimmedName,
            label: trimmedName,
            remark: trimmedRemark,
          };
        }
        return c;
      });

      setCategoriesList(updatedList);
      setParentCategories(updatedList.map((c) => c.category_name || c.name || c.label || ""));
      toast.success(`แก้ไขหมวดหมู่ไส้ "${trimmedName}" เรียบร้อยแล้ว`);
      setEditingCategory(null);
    } catch (err: any) {
      console.error("Update category error:", err);
      toast.error(err.message || "ไม่สามารถแก้ไขหมวดหมู่ไส้ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!confirmDeleteCategory) return;
    const targetId = confirmDeleteCategory.id || String(confirmDeleteCategory.category_id);
    const catName = confirmDeleteCategory.category_name || confirmDeleteCategory.name || confirmDeleteCategory.label || "หมวดหมู่ไส้";

    setIsSubmitting(true);
    try {
      await RestaurantApi.deleteCategory(targetId);

      const updatedList = categoriesList.filter(
        (c) => c.id !== targetId && String(c.category_id) !== targetId
      );
      setCategoriesList(updatedList);
      setParentCategories(updatedList.map((c) => c.category_name || c.name || c.label || ""));
      toast.success(`ลบหมวดหมู่ไส้ "${catName}" เรียบร้อยแล้ว`);
      setConfirmDeleteCategory(null);
    } catch (err: any) {
      console.error("Delete category error:", err);
      toast.error(err.message || "ไม่สามารถลบหมวดหมู่ไส้ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-[16px] border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-text">หมวดหมู่ไส้</h2>
          <p className="text-xs text-text-3 mt-0.5">{categoriesList.length} หมวดหมู่ไส้ทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
            onClick={fetchCategories}
            title="รีเฟรชข้อมูล"
          >
            <span className="hidden sm:inline">รีเฟรช</span>
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAddModal}>
            เพิ่มหมวดหมู่ไส้ใหม่
          </Button>
        </div>
      </div>

      {/* Category Cards Grid */}
      {isLoading && categoriesList.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface p-4 rounded-[16px] border border-border shadow-xs animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-surface-3 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-md bg-surface-3" />
                <div className="h-3 w-1/2 rounded-md bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      ) : categoriesList.length === 0 ? (
        <div className="bg-surface rounded-[16px] border border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center mx-auto text-text-3">
            <Store size={24} />
          </div>
          <div>
            <h3 className="font-bold text-text text-sm">ยังไม่มีหมวดหมู่ไส้</h3>
            <p className="text-xs text-text-3 mt-1">เริ่มต้นสร้างหมวดหมู่แรกเพื่อจัดกลุ่มไส้และเมนูของคุณ</p>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAddModal}>
            เพิ่มหมวดหมู่ไส้ใหม่
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {categoriesList.map((cat, idx) => {
            const catName = cat.category_name || cat.name || cat.label || "";
            const menuCount =
              cat.menuCount !== undefined
                ? cat.menuCount
                : items.filter((i) => i.category === catName || i.category === cat.id).length;

            return (
              <div
                key={cat.id || idx}
                className="flex items-center justify-between bg-surface p-4 rounded-[16px] border border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                  <div className="w-10 h-10 bg-brand-50 rounded-[10px] flex items-center justify-center text-brand-500 shrink-0">
                    <Store size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-text truncate" title={catName}>
                      {catName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-3">{menuCount} เมนู/ไส้</span>
                      {cat.remark && (
                        <span
                          className="text-[10px] text-text-3 bg-surface-2 px-1.5 py-0.5 rounded truncate max-w-[100px]"
                          title={cat.remark}
                        >
                          {cat.remark}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-3 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                    title="แก้ไขหมวดหมู่ไส้"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCategory(cat)}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-text-3 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="ลบหมวดหมู่ไส้"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Category Modal ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsAddModalOpen(false)}
            />
            <motion.form
              onSubmit={handleAddSubmit(onAddCategory)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                  <h3 className="font-bold text-text text-base">เพิ่มหมวดหมู่ไส้ใหม่</h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <Input
                  label="ชื่อหมวดหมู่ไส้ *"
                  placeholder="เช่น ไส้หวาน, ไส้คาว, ซอส, ท็อปปิ้ง"
                  error={addErrors.categoryName?.message}
                  {...registerAdd("categoryName", { required: "กรุณากรอกชื่อหมวดหมู่ไส้" })}
                />

                <Textarea
                  label="หมายเหตุ"
                  placeholder="รายละเอียดเพิ่มเติมหรือหมายเหตุเกี่ยวกับหมวดหมู่ไส้นี้ (ไม่บังคับ)"
                  rows={3}
                  {...registerAdd("remark")}
                />
              </div>

              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button
                  type="button"
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" fullWidth className="font-bold" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกหมวดหมู่ไส้"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Category Modal ── */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingCategory(null)}
            />
            <motion.form
              onSubmit={handleEditSubmit(onEditCategory)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
                    <Edit2 size={16} />
                  </div>
                  <h3 className="font-bold text-text text-base">แก้ไขหมวดหมู่ไส้</h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingCategory(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <Input
                  label="ชื่อหมวดหมู่ไส้ *"
                  placeholder="เช่น ไส้หวาน, ไส้คาว, ซอส, ท็อปปิ้ง"
                  error={editErrors.categoryName?.message}
                  {...registerEdit("categoryName", { required: "กรุณากรอกชื่อหมวดหมู่ไส้" })}
                />

                <Textarea
                  label="หมายเหตุ"
                  placeholder="รายละเอียดเพิ่มเติมหรือหมายเหตุเกี่ยวกับหมวดหมู่ไส้นี้ (ไม่บังคับ)"
                  rows={3}
                  {...registerEdit("remark")}
                />
              </div>

              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button
                  type="button"
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setEditingCategory(null)}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" fullWidth className="font-bold" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {confirmDeleteCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setConfirmDeleteCategory(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10 border border-border"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-100 text-red-600 shadow-md">
                <AlertTriangle size={30} />
              </div>
              <div>
                <h3 className="font-bold text-text text-lg">ยืนยันการลบหมวดหมู่ไส้?</h3>
                <p className="text-xs text-text-3 mt-1.5 leading-relaxed">
                  คุณกำลังจะลบหมวดหมู่ไส้{" "}
                  <strong className="text-text">
                    "{confirmDeleteCategory.category_name || confirmDeleteCategory.name || confirmDeleteCategory.label}"
                  </strong>{" "}
                  ออกจากระบบ
                </p>
                {confirmDeleteCategory.menuCount !== undefined && confirmDeleteCategory.menuCount > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>มีเมนู/ไส้อยู่ในหมวดหมู่นี้ {confirmDeleteCategory.menuCount} รายการ</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setConfirmDeleteCategory(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  fullWidth
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeleteCategory}
                >
                  {isSubmitting ? "กำลังลบ..." : "ยืนยันลบหมวดหมู่ไส้"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Menu Items Tab ────────────────────────────────────────────────────────

// ── CategoryCombobox: searchable dropdown that loads from real DB ──────────
function CategoryCombobox({
  value,
  onChange,
  options,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    query === ""
      ? options
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setQuery("");
    setIsOpen(false);
  };

  const clearSelection = () => {
    onChange("");
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input field */}
      <div
        className={cn(
          "w-full h-10 flex items-center bg-surface border rounded-[10px] px-3 gap-2 cursor-text transition-all",
          error
            ? "border-red-500 ring-2 ring-red-500/15"
            : isOpen
              ? "border-brand-500 ring-2 ring-brand-500/15"
              : "border-border hover:border-brand-300"
        )}
        onClick={() => {
          setIsOpen(true);
          setQuery("");
        }}
      >
        {isOpen ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาหมวดหมู่ไส้..."
            className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-3 min-w-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") { setIsOpen(false); setQuery(""); }
              if (e.key === "Enter" && filtered.length > 0) { handleSelect(filtered[0]); }
            }}
          />
        ) : (
          <span className={cn("flex-1 text-sm min-w-0 truncate", value ? "text-text font-medium" : "text-text-3")}>
            {value || "-- เลือกหมวดหมู่ไส้ --"}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && !isOpen && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearSelection(); }}
              className="w-4 h-4 flex items-center justify-center text-text-3 hover:text-text rounded-full"
              title="ล้างหมวดหมู่ไส้"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={15}
            className={cn(
              "text-text-3 transition-transform duration-150",
              isOpen ? "rotate-180 text-brand-500" : ""
            )}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface rounded-[12px] shadow-xl border border-border overflow-hidden">
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                    value === opt
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-text hover:bg-surface-2"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && (
                    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-text-3 text-center">
                ไม่พบหมวดหมู่ไส้ที่ตรงกัน
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuItemFormInputs {
  name: string;
  price: number;
  description: string;
  remark?: string;
  category: string;
  available: boolean;
  popular: boolean;
}

// ── Client-side Image Compression (Reduces upload time from seconds to milliseconds) ──
async function compressImage(file: File, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function MenuItemsTab({
  items,
  setItems,
  categories,
}: {
  items: any[];
  setItems: any;
  categories: string[];
}) {
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStage, setSubmitStage] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [dbCategories, setDbCategories] = useState<CategoryDTO[]>([]);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const [togglingMenuId, setTogglingMenuId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadCategoriesFromDb = async () => {
    try {
      const res = await RestaurantApi.getCategories();
      if (res.success && res.data) {
        setDbCategories(res.data);
      }
    } catch (err) {
      console.warn("Could not load categories from DB in MenuItemsTab:", err);
    }
  };

  useEffect(() => {
    loadCategoriesFromDb();
  }, []);

  const availableCategoryNames = Array.from(
    new Set([
      ...dbCategories.map((c) => c.category_name || c.name || c.label || "").filter(Boolean),
      ...categories.filter(Boolean),
    ])
  );

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === "all" ||
      item.category === selectedCategory ||
      (selectedCategory === "ไม่มีหมวดหมู่" && !item.category);
    const matchesSearch =
      !searchQuery ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const {
    register: registerMenu,
    handleSubmit: handleMenuSubmit,
    reset: resetMenu,
    setValue: setMenuValue,
    setError: setMenuError,
    clearErrors: clearMenuErrors,
    watch: watchMenu,
    formState: { errors: menuErrors },
  } = useForm<MenuItemFormInputs>({
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      remark: "",
      category: "",
      available: true,
      popular: false,
    },
  });

  const MAX_IMAGES = 1;

  const fetchMenuItems = async () => {
    setIsLoading(true);
    try {
      await loadCategoriesFromDb();
      const res = await RestaurantApi.getMenuItems();
      if (res.success && res.data) {
        const mappedItems: MenuItem[] = res.data.map((item: any) => ({
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          name: item.name || "",
          nameEn: item.nameEn,
          description: item.description || "",
          remark: item.remark || "",
          price: Number(item.price) || 0,
          image: item.image || item.images?.[0] || "",
          images: item.images || (item.image ? [item.image] : []),
          category: item.category || "",
          spicyLevel: item.spicyLevel,
          popular: Boolean(item.popular),
          available: item.available !== false,
          optionGroups: [],
          options: { optionGroups: [] },
        }));
        setItems(mappedItems);
      }
    } catch (err) {
      console.warn("Could not reload menu items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddMenuModal = () => {
    loadCategoriesFromDb();
    setDeletedImageUrls([]);
    resetMenu({
      name: "",
      price: 0,
      description: "",
      remark: "",
      category: "",
      available: true,
      popular: false,
    });
    setEditingItem({
      name: "",
      price: 0,
      description: "",
      remark: "",
      category: "",
      available: true,
      popular: false,
      optionGroups: [],
      images: [],
      image: "",
    });
  };

  const openEditMenuModal = (item: any) => {
    loadCategoriesFromDb();
    setDeletedImageUrls([]);
    resetMenu({
      name: item.name,
      price: item.price,
      description: item.description || "",
      remark: item.remark || "",
      category: item.category || "",
      available: item.available ?? true,
      popular: !!item.popular,
    });
    setEditingItem({
      ...item,
      remark: item.remark || "",
      images: item.images || (item.image ? [item.image] : []),
      image: item.image || item.images?.[0] || "",
      optionGroups: [],
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedImage = await compressImage(file);
      setEditingItem((prev: any) => ({
        ...prev,
        images: [compressedImage],
        image: compressedImage,
      }));
    } catch (err) {
      console.warn("Image compression error, using raw file:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setEditingItem((prev: any) => ({
          ...prev,
          images: [dataUrl],
          image: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setEditingItem((prev: any) => {
      const removed = prev?.images?.[0] || prev?.image;
      if (removed && (removed.startsWith("http://") || removed.startsWith("https://"))) {
        setDeletedImageUrls((d) => [...d, removed]);
        RestaurantApi.deleteMenuImage(removed).catch(() => { });
      }
      return { ...prev, images: [], image: "" };
    });
  };

  const onSaveMenuForm = async (data: MenuItemFormInputs) => {
    if (!editingItem) return;

    if (!data.category || !data.category.trim()) {
      setMenuError("category", { type: "required", message: "กรุณาเลือกหมวดหมู่ไส้" });
      toast.error("กรุณาเลือกหมวดหมู่ไส้");
      return;
    }

    setIsSubmitting(true);
    const imagesList = (editingItem.images || (editingItem.image ? [editingItem.image] : [])).slice(0, 1);
    const hasNewUploads = imagesList.some((img: string) => img.startsWith("data:") || img.startsWith("blob:"));

    if (hasNewUploads) {
      setSubmitStage("กำลังอัปโหลดและประมวลผลรูปภาพ...");
    } else {
      setSubmitStage("กำลังบันทึกข้อมูลไส้ / เมนู...");
    }

    const payload = {
      ...editingItem,
      ...data,
      price: Number(data.price),
      remark: data.remark || "",
      images: imagesList,
      image: imagesList[0] || "",
      deletedImages: deletedImageUrls,
      optionGroups: [],
      options: {
        optionGroups: [],
      },
    };

    try {
      if (editingItem.id) {
        const res = await RestaurantApi.updateMenuItem(editingItem.id, payload);
        if (res.success) {
          toast.success(`อัปเดตไส้/เมนู "${data.name}" เรียบร้อยแล้ว`);
          setEditingItem(null);
          await fetchMenuItems();
        } else {
          throw new Error(res.message || "ไม่สามารถอัปเดตข้อมูลได้");
        }
      } else {
        const res = await RestaurantApi.createMenuItem(payload);
        if (res.success) {
          toast.success(`เพิ่มไส้/เมนู "${data.name}" เรียบร้อยแล้ว`);
          setEditingItem(null);
          await fetchMenuItems();
        } else {
          throw new Error(res.message || "ไม่สามารถสร้างรายการใหม่ได้");
        }
      }
    } catch (err: any) {
      console.error("Save menu item error:", err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
      setSubmitStage("");
    }
  };

  const handleToggleAvailable = async (item: any) => {
    if (togglingMenuId === item.id) return;
    setTogglingMenuId(item.id);
    const newStatus = !item.available;
    try {
      await RestaurantApi.updateMenuItem(item.id, { available: newStatus });
      setItems((prev: any[]) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: newStatus } : i))
      );
      toast.success(
        newStatus
          ? `เปิดขาย "${item.name}" (มีของแล้ว)`
          : `ตั้งสถานะ "${item.name}" เป็นหมดแล้ว`
      );
    } catch (err) {
      console.error("Toggle menu availability error:", err);
      toast.error("ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setTogglingMenuId(null);
    }
  };

  const handleConfirmDeleteMenu = async () => {
    if (!confirmDeleteMenu) return;
    setIsSubmitting(true);
    try {
      const res = await RestaurantApi.deleteMenuItem(confirmDeleteMenu.id);
      if (res.success) {
        toast.success(`ลบเมนู/ไส้ "${confirmDeleteMenu.name}" เรียบร้อยแล้ว`);
        setConfirmDeleteMenu(null);
        await fetchMenuItems();
      } else {
        throw new Error(res.message || "ไม่สามารถลบรายการได้");
      }
    } catch (err: any) {
      console.error("Delete menu item error:", err);
      toast.error(err.message || "ไม่สามารถลบรายการได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGroup = () => {
    const currentGroups = editingItem?.optionGroups || [];
    setEditingItem({
      ...editingItem,
      optionGroups: [
        ...currentGroups,
        { name: "", required: false, allowMultiple: false, choices: [{ label: "", price: 0 }] },
      ],
    });
  };

  const updateGroup = (gIndex: number, field: string, value: any) => {
    const currentGroups = [...(editingItem?.optionGroups || [])];
    currentGroups[gIndex] = { ...currentGroups[gIndex], [field]: value };
    setEditingItem({ ...editingItem, optionGroups: currentGroups });
  };

  const removeGroup = (gIndex: number) => {
    const currentGroups = [...(editingItem?.optionGroups || [])];
    currentGroups.splice(gIndex, 1);
    setEditingItem({ ...editingItem, optionGroups: currentGroups });
  };

  const addChoice = (gIndex: number) => {
    const currentGroups = [...(editingItem?.optionGroups || [])];
    currentGroups[gIndex].choices = [
      ...(currentGroups[gIndex].choices || []),
      { label: "", price: 0 },
    ];
    setEditingItem({ ...editingItem, optionGroups: currentGroups });
  };

  const updateChoice = (gIndex: number, cIndex: number, field: string, value: any) => {
    const currentGroups = [...(editingItem?.optionGroups || [])];
    const choices = [...(currentGroups[gIndex].choices || [])];
    choices[cIndex] = { ...choices[cIndex], [field]: value };
    currentGroups[gIndex].choices = choices;
    setEditingItem({ ...editingItem, optionGroups: currentGroups });
  };

  const removeChoice = (gIndex: number, cIndex: number) => {
    const currentGroups = [...(editingItem?.optionGroups || [])];
    const choices = [...(currentGroups[gIndex].choices || [])];
    choices.splice(cIndex, 1);
    currentGroups[gIndex].choices = choices;
    setEditingItem({ ...editingItem, optionGroups: currentGroups });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-[16px] border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-text">จัดการเมนู/ไส้</h2>
          <p className="text-xs text-text-3 mt-0.5">{items.length} เมนู/ไส้ ทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
            onClick={fetchMenuItems}
            title="รีเฟรชข้อมูล"
          >
            <span className="hidden sm:inline">รีเฟรช</span>
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAddMenuModal}>
            เพิ่มเมนู/ไส้ใหม่
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-[14px] border border-border">
          {/* Categories Pill Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                selectedCategory === "all"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-surface-2 text-text-2 hover:bg-surface-3"
              )}
            >
              ทั้งหมด ({items.length})
            </button>
            {categories.map((cat, idx) => {
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                    selectedCategory === cat
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-surface-2 text-text-2 hover:bg-surface-3"
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] sm:max-w-xs">
            <input
              type="text"
              placeholder="ค้นหาชื่อเมนู/ไส้..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 pl-8 pr-3 text-xs bg-surface-2 border border-border rounded-[10px] text-text placeholder:text-text-3 outline-none focus:border-brand-500 transition-all"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 w-3.5 h-3.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col bg-surface rounded-[18px] border border-border shadow-xs overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-surface-2 flex items-center justify-center">
                <UtensilsCrossed size={28} className="text-border" />
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-surface-3 rounded-md w-3/4" />
                  <div className="h-3 bg-surface-2 rounded-md w-1/2" />
                </div>
                <div className="h-8 bg-surface-3 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-[20px] border border-border p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-500 shadow-xs">
            <UtensilsCrossed size={32} />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="font-bold text-text text-base">ยังไม่มีเมนู/ไส้ ในระบบ</h3>
            <p className="text-xs text-text-3 leading-relaxed">
              เริ่มต้นสร้างเมนู/ไส้แรกของคุณ พร้อมตั้งราคา รูปภาพ และหมายเหตุเพื่อเปิดรับออเดอร์จากลูกค้า
            </p>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={openAddMenuModal}>
            เพิ่มเมนู/ไส้ใหม่
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty search results */
        <div className="bg-surface rounded-[16px] border border-border p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-text">ไม่พบรายการเมนู/ไส้ ที่ค้นหา</p>
          <p className="text-xs text-text-3">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          >
            ล้างตัวกรอง
          </Button>
        </div>
      ) : (
        /* Grid of Menu Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentItems.map((item) => {
            const primaryImage = item.images?.[0] || item.image;
            const imageCount = item.images?.length || (item.image ? 1 : 0);
            const optGroupsCount = item.optionGroups?.length || 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col bg-surface rounded-[18px] border shadow-sm overflow-hidden transition-all hover:shadow-md group relative",
                  item.available ? "border-border" : "border-border opacity-70 bg-surface-2/40"
                )}
              >
                {/* Image Cover */}
                <div className="h-40 bg-surface-2 relative flex items-center justify-center border-b border-border overflow-hidden">
                  <SafeImage
                    src={primaryImage}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fallback={
                      <div className="w-full h-full flex flex-col items-center justify-center text-text-3 bg-brand-50/40">
                        <UtensilsCrossed size={32} className="text-brand-300" />
                        <span className="text-[10px] text-text-3 mt-1">ไม่มีรูปภาพ</span>
                      </div>
                    }
                  />

                  {/* Badges */}
                  <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1 items-center">
                    {imageCount > 1 && (
                      <span className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
                        +{imageCount - 1} รูป
                      </span>
                    )}
                    {item.popular && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        ยอดฮิต
                      </span>
                    )}
                    {!item.available && (
                      <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        หมด
                      </span>
                    )}
                  </div>

                  {/* Category Pill on Image (Never display raw numeric IDs) */}
                  {(() => {
                    const catObj = dbCategories.find(
                      (c) =>
                        String(c.category_id) === String(item.category) ||
                        String(c.id) === String(item.category)
                    );
                    const catName =
                      catObj?.category_name ||
                      catObj?.name ||
                      (!/^\d+$/.test(String(item.category || "").trim())
                        ? item.category
                        : "");

                    if (!catName) return null;
                    return (
                      <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                        {catName}
                      </span>
                    );
                  })()}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3
                        className="font-bold text-text text-sm line-clamp-1 flex-1"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      <span className="font-extrabold text-brand-600 text-base whitespace-nowrap">
                        ฿{Number(item.price).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-text-3 line-clamp-2 leading-relaxed min-h-[32px]">
                      {item.description || "ไม่มีคำอธิบาย"}
                    </p>

                    {/* Option Groups Summary */}
                    {optGroupsCount > 0 && (
                      <div className="mt-2.5 p-2 bg-surface-2 rounded-[10px] border border-border/60 text-[11px] text-text-3 space-y-1">
                        <span className="font-bold text-text-2 block">ตัวเลือก ({optGroupsCount} กลุ่ม):</span>
                        <div className="space-y-0.5">
                          {item.optionGroups.slice(0, 2).map((g: any, gi: number) => (
                            <div key={gi} className="truncate">
                              <span className="text-text-2 font-medium">{g.name}: </span>
                              {g.choices?.map((c: any) => c.label).filter(Boolean).join(", ")}
                            </div>
                          ))}
                          {optGroupsCount > 2 && (
                            <span className="text-[10px] text-brand-600 font-medium">
                              +{optGroupsCount - 2} กลุ่มตัวเลือกเพิ่มเติม
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                    {/* Toggle Available Button */}
                    <button
                      type="button"
                      disabled={togglingMenuId === item.id}
                      onClick={() => handleToggleAvailable(item)}
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5",
                        togglingMenuId === item.id
                          ? "bg-surface-3 text-text-3 border-border cursor-wait opacity-80"
                          : item.available
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      )}
                      title="กดเพื่อสลับสถานะพร้อมขาย/หมด"
                    >
                      {togglingMenuId === item.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-brand-600" />
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : item.available ? (
                        "● พร้อมขาย"
                      ) : (
                        "○ หมด"
                      )}
                    </button>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditMenuModal(item)}
                        className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-brand-600 hover:bg-brand-50 rounded-[8px] transition-all"
                        title="แก้ไขเมนู/ไส้"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMenu(item)}
                        className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-red-600 hover:bg-red-50 rounded-[8px] transition-all"
                        title="ลบเมนู/ไส้"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-6">
          <p className="text-xs text-text-3">
            แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง{" "}
            {Math.min(currentPage * itemsPerPage, filteredItems.length)} จาก{" "}
            {filteredItems.length} รายการ
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ก่อนหน้า
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 rounded-[8px] text-xs font-semibold transition-all",
                    currentPage === i + 1
                      ? "bg-brand-500 text-white shadow-xs"
                      : "text-text-2 hover:bg-surface-3 bg-surface-2"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Menu Item Modal ── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingItem(null)}
            />
            <motion.form
              onSubmit={handleMenuSubmit(onSaveMenuForm)}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full sm:max-w-2xl bg-surface sm:rounded-[24px] rounded-t-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] z-10 border border-border"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
                    {editingItem.id ? <Edit2 size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-text text-base">
                      {editingItem.id ? "แก้ไขไส้ / เมนู" : "เพิ่มไส้ / เมนูใหม่"}
                    </h3>
                    <p className="text-xs text-text-3">
                      {editingItem.id ? "แก้ไขรายละเอียด ราคา รูปภาพ และหมายเหตุ" : "กรอกข้อมูลเพื่อสร้างไส้หรือเมนูใหม่ในระบบ"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ชื่อไส้ / เมนู *"
                    placeholder="เช่น นูเทลล่า, กล้วยหอม, ฝอยทอง, แฮม, ไส้กรอก"
                    error={menuErrors.name?.message}
                    {...registerMenu("name", { required: "กรุณากรอกชื่อไส้ / เมนู" })}
                  />

                  <Input
                    label="ราคา (บาท) *"
                    type="number"
                    placeholder="0"
                    error={menuErrors.price?.message}
                    {...registerMenu("price", {
                      required: "กรุณากรอกราคา",
                      min: { value: 0, message: "ราคาต้องไม่ติดลบ" },
                    })}
                  />
                </div>

                <Textarea
                  label="คำอธิบาย"
                  rows={2}
                  placeholder="รายละเอียด ส่วนผสม หรือรสชาติของเมนู (ไม่บังคับ)"
                  {...registerMenu("description")}
                />

                <Input
                  label="หมายเหตุ (ไม่บังคับ)"
                  placeholder="เช่น สำหรับเครปไส้หวาน หรือจัดเตรียมพิเศษ (ไม่บังคับ)"
                  {...registerMenu("remark")}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">
                      หมวดหมู่ไส้ <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <CategoryCombobox
                      value={watchMenu("category")}
                      onChange={(val) => {
                        setMenuValue("category", val);
                        if (val && val.trim()) clearMenuErrors("category");
                      }}
                      options={availableCategoryNames}
                      error={menuErrors.category?.message}
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="สถานะการขาย *"
                      options={[
                        { value: "true", label: "พร้อมขาย", badge: "พร้อมขาย" },
                        { value: "false", label: "สินค้าหมด (ปิดการขาย)", badge: "หมด" },
                      ]}
                      value={watchMenu("available") ? "true" : "false"}
                      onChange={(val) => setMenuValue("available", val === "true")}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 pb-1">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      id="popular"
                      checked={watchMenu("popular")}
                      onChange={(e) => setMenuValue("popular", e.target.checked)}
                      className="peer appearance-none w-4 h-4 rounded border-2 border-slate-300 bg-white checked:bg-brand-600 checked:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
                    />
                    <svg
                      className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <label
                    htmlFor="popular"
                    className="text-sm text-text font-medium cursor-pointer select-none"
                  >
                    ตั้งเป็นเมนูยอดฮิต (แนะนำบนหน้าแรก)
                  </label>
                </div>

                {/* ── Single Image Upload ── */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-bold text-text">รูปภาพ (อัปโหลด 1 ภาพ)</label>
                      <p className="text-[11px] text-text-3 mt-0.5">
                        รองรับไฟล์ภาพ JPG, PNG หรือ WebP
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full",
                        editingItem?.images?.length || editingItem?.image
                          ? "bg-brand-50 text-brand-600 border border-brand-200"
                          : "bg-surface-3 text-text-3"
                      )}
                    >
                      {editingItem?.images?.length || editingItem?.image ? "1/1" : "0/1"}
                    </span>
                  </div>

                  {/* Single Image Box */}
                  <div className="flex items-center gap-4">
                    {editingItem?.images?.[0] || editingItem?.image ? (
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-brand-200 group shadow-sm bg-surface-2 shrink-0">
                        <img
                          src={formatDriveImageUrl(editingItem.images?.[0] || editingItem.image)}
                          alt="รูปภาพเมนู"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const currentSrc = editingItem.images?.[0] || editingItem.image;
                            const match = currentSrc?.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
                            const fileId = match?.[1];
                            if (fileId && !target.dataset.fallback) {
                              target.dataset.fallback = "1";
                              target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow"
                          title="ลบรูปภาพ"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : isCompressing ? (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-brand-300 bg-brand-50 flex flex-col items-center justify-center gap-1.5 text-brand-600 animate-pulse shrink-0">
                        <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                        <span className="text-[10px] font-bold">กำลังปรับขนาด...</span>
                      </div>
                    ) : (
                      <label className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-border hover:border-brand-400 active:bg-brand-50 hover:bg-brand-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-text-3 hover:text-brand-600 shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <ImagePlus size={22} />
                        <span className="text-xs font-semibold">เพิ่มรูปภาพ</span>
                      </label>
                    )}

                    <div className="text-xs text-text-3 space-y-1">
                      <p className="font-medium text-text">คำแนะนำสำหรับรูปภาพ</p>
                      <p>• ภาพสัดส่วน 1:1 จะแสดงผลได้สวยงามที่สุด</p>
                      <p>• รูปภาพจะถูกปรับขนาดและบีบอัดให้อัตโนมัติ</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Progress Bar */}
              {isSubmitting && (
                <div className="px-5 py-2.5 bg-brand-50 border-t border-brand-200/70 flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin shrink-0" />
                  <p className="text-xs font-semibold text-brand-700 animate-pulse">
                    {submitStage || "กำลังบันทึกข้อมูล..."}
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button
                  type="button"
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setEditingItem(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  className="font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      กำลังบันทึก...
                    </span>
                  ) : editingItem.id ? (
                    "บันทึกการแก้ไข"
                  ) : (
                    "บันทึกไส้/เมนูใหม่"
                  )}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {confirmDeleteMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setConfirmDeleteMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-surface rounded-[24px] overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10 border border-border"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-100 text-red-600 shadow-md">
                <AlertTriangle size={30} />
              </div>
              <div>
                <h3 className="font-bold text-text text-lg">ยืนยันการลบเมนู/ไส้?</h3>
                <p className="text-xs text-text-3 mt-1.5 leading-relaxed">
                  คุณกำลังจะลบรายการ{" "}
                  <strong className="text-text">"{confirmDeleteMenu.name}"</strong>{" "}
                  ออกจากระบบ
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  fullWidth
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setConfirmDeleteMenu(null)}
                >
                  ยกเลิก
                </Button>
                <Button
                  fullWidth
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeleteMenu}
                >
                  {isSubmitting ? "กำลังลบ..." : "ยืนยันลบเมนู/ไส้"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}





interface InfoFormInputs {
  name: string;
  description: string;
  addressDetail: string;
  subDistrict: string;
  district: string;
  province: string;
  zipCode: string;
  openTime: string;
  closeTime: string;
  operatingDays?: string;
  closedDays?: string;
  phone: string;
  email: string;
  googleMapsUrl?: string;
  lineId?: string;
  lineOaUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
  linemanUrl?: string;
  grabUrl?: string;
  shopeefoodUrl?: string;
  robinhoodUrl?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

const bankOptions = [
  { value: "promptpay", label: "พร้อมเพย์ (PromptPay)", badge: "แนะนำ" },
  { value: "kbank", label: "ธนาคารกสิกรไทย (KBANK)" },
  { value: "scb", label: "ธนาคารไทยพาณิชย์ (SCB)" },
  { value: "ktb", label: "ธนาคารกรุงไทย (KTB)" },
  { value: "bbl", label: "ธนาคารกรุงเทพ (BBL)" },
  { value: "krungsri", label: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { value: "ttb", label: "ธนาคารทหารไทยธนชาต (TTB)" },
  { value: "gsb", label: "ธนาคารออมสิน (GSB)" },
];

// Helper to generate official PromptPay EMVCo QR Payload
function generatePromptPayPayload(target: string, amount?: number): string {
  const cleaned = target.replace(/[^0-9]/g, "");
  let targetTag = "";
  if (cleaned.length === 10) {
    const formatted = "0066" + cleaned.substring(1);
    targetTag = "01" + String(formatted.length).padStart(2, "0") + formatted;
  } else if (cleaned.length === 13) {
    targetTag = "02" + String(cleaned.length).padStart(2, "0") + cleaned;
  } else if (cleaned.length === 15) {
    targetTag = "03" + String(cleaned.length).padStart(2, "0") + cleaned;
  } else {
    const formatted = cleaned.startsWith("0") ? "0066" + cleaned.substring(1) : cleaned;
    targetTag = "01" + String(formatted.length).padStart(2, "0") + formatted;
  }

  const aid = "0016A000000677010111";
  const merchantAccountInfo = aid + targetTag;
  const tag29 = "29" + String(merchantAccountInfo.length).padStart(2, "0") + merchantAccountInfo;

  const hasAmount = amount !== undefined && amount !== null && amount > 0;
  const pointOfInitiation = hasAmount ? "010212" : "010211";

  let payload = "000201" + pointOfInitiation + tag29 + "5303764";
  if (hasAmount) {
    const formattedAmount = amount.toFixed(2);
    payload += "54" + String(formattedAmount.length).padStart(2, "0") + formattedAmount;
  }
  payload += "5802TH";
  payload += "6304";

  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    let c = payload.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return payload + crcHex;
}

interface SecurityFormInputs {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

// ── Info Tab ─────────────────────────────────────────────────────────────
function InfoTab({
  defaultSubTab = "general",
  activeTab = "info-general",
  setActiveTab = () => { },
}: {
  defaultSubTab?: "general" | "branding" | "location" | "contact" | "bank" | "security";
  activeTab?: string;
  setActiveTab?: (val: any) => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState(defaultSubTab);
  const [storeLocation, setStoreLocation] = useState({ lat: 13.7262, lng: 100.5731 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const { refreshRestaurant } = useRestaurant();

  const {
    register: registerInfo,
    handleSubmit: handleInfoSubmit,
    setValue: setInfoValue,
    watch: watchInfo,
    reset: resetInfoForm,
    formState: { errors: infoErrors },
  } = useForm<InfoFormInputs>({
    defaultValues: {
      name: "",
      description: "",
      addressDetail: "",
      subDistrict: "",
      district: "",
      province: "",
      zipCode: "",
      openTime: "10:00",
      closeTime: "22:00",
      operatingDays: "ทุกวัน",
      closedDays: "",
      phone: "",
      email: "",
      googleMapsUrl: "",
      lineId: "",
      lineOaUrl: "",
      facebookUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      youtubeUrl: "",
      xUrl: "",
      websiteUrl: "",
      linemanUrl: "",
      grabUrl: "",
      shopeefoodUrl: "",
      robinhoodUrl: "",
      bankName: "kbank",
      accountNumber: "",
      accountName: "",
    },
  });

  const selectedBank = watchInfo("bankName");
  const watchedOpenTime = watchInfo("openTime");
  const watchedCloseTime = watchInfo("closeTime");
  const watchedOperatingDays = watchInfo("operatingDays");
  const watchedClosedDays = watchInfo("closedDays");
  const watchedName = watchInfo("name");
  const watchedPhone = watchInfo("phone");
  const watchedEmail = watchInfo("email");
  const watchedGoogleMapsUrl = watchInfo("googleMapsUrl");
  const watchedLineId = watchInfo("lineId");
  const watchedLineOaUrl = watchInfo("lineOaUrl");
  const watchedFacebookUrl = watchInfo("facebookUrl");
  const watchedInstagramUrl = watchInfo("instagramUrl");
  const watchedTiktokUrl = watchInfo("tiktokUrl");
  const watchedYoutubeUrl = watchInfo("youtubeUrl");
  const watchedXUrl = watchInfo("xUrl");
  const watchedWebsiteUrl = watchInfo("websiteUrl");
  const watchedLinemanUrl = watchInfo("linemanUrl");
  const watchedGrabUrl = watchInfo("grabUrl");
  const watchedShopeefoodUrl = watchInfo("shopeefoodUrl");
  const watchedRobinhoodUrl = watchInfo("robinhoodUrl");

  // Store Theme Colors State (Primary, Secondary, Accent)
  const [primaryColor, setPrimaryColor] = useState("#E11D48");
  const [secondaryColor, setSecondaryColor] = useState("#F59E0B");
  const [accentColor, setAccentColor] = useState("#FB923C");

  // Logo & Banner Preview State
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Payment QR State (Uploaded QR image or auto-generated PromptPay payload)
  const [paymentQrImage, setPaymentQrImage] = useState<string | null>(null);
  const [promptpayQrPayload, setPromptpayQrPayload] = useState<string | null>(null);

  // Load real store info from API on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const [infoRes, accRes] = await Promise.all([
          RestaurantApi.getInfo(),
          RestaurantApi.getAccount(),
        ]);
        if (infoRes.success && infoRes.data) {
          const d = infoRes.data;
          const rawAddr = d.addressDetail || d.address || d.restaurant_address || "";
          const parsedAddr = parseThaiAddress(rawAddr);

          setInfoValue("name", d.name || d.restaurant_name || "");
          setInfoValue("description", d.description || d.restaurant_desc || "");
          setInfoValue("addressDetail", d.addressDetail && d.subDistrict ? d.addressDetail : (parsedAddr.addressDetail || rawAddr));
          setInfoValue("subDistrict", d.subDistrict || parsedAddr.subDistrict || "");
          setInfoValue("district", d.district || parsedAddr.district || "");
          setInfoValue("province", d.province || parsedAddr.province || "");
          setInfoValue("zipCode", d.zipCode || parsedAddr.zipCode || "");
          setInfoValue("openTime", d.openTime || d.restaurant_open_time || "10:00");
          setInfoValue("closeTime", d.closeTime || d.restaurant_close_time || "22:00");
          setInfoValue("operatingDays", d.operatingDays || d.restaurant_day || "ทุกวัน");
          setInfoValue("closedDays", d.closedDays || d.closed_days || "");
          setInfoValue("phone", d.phone || d.restaurant_phone || "");
          setInfoValue("email", d.email || (d as any).restaurant_email || "");
          setInfoValue("googleMapsUrl", (d as any).googleMapsUrl || (d as any).google_maps_url || "");
          setInfoValue("lineId", d.lineId || d.line_id || "");
          setInfoValue("lineOaUrl", (d as any).lineOaUrl || (d as any).line_oa_url || "");
          setInfoValue("facebookUrl", d.facebookUrl || d.facebook_url || "");
          setInfoValue("instagramUrl", d.instagramUrl || d.instagram_url || "");
          setInfoValue("tiktokUrl", d.tiktokUrl || d.tiktok_url || "");
          setInfoValue("youtubeUrl", (d as any).youtubeUrl || (d as any).youtube_url || "");
          setInfoValue("xUrl", (d as any).xUrl || (d as any).x_url || "");
          setInfoValue("websiteUrl", d.websiteUrl || d.website_url || "");
          setInfoValue("linemanUrl", (d as any).linemanUrl || (d as any).lineman_url || "");
          setInfoValue("grabUrl", (d as any).grabUrl || (d as any).grab_url || "");
          setInfoValue("shopeefoodUrl", (d as any).shopeefoodUrl || (d as any).shopeefood_url || "");
          setInfoValue("robinhoodUrl", (d as any).robinhoodUrl || (d as any).robinhood_url || "");

          if (d.primaryColor || d.themeColor || d.restaurant_primary_theme) {
            setPrimaryColor(d.primaryColor || d.themeColor || d.restaurant_primary_theme || "#E11D48");
          }
          if (d.secondaryColor || d.restaurant_secondary_theme) {
            setSecondaryColor(d.secondaryColor || d.restaurant_secondary_theme || "#F59E0B");
          }
          if (d.accentColor) setAccentColor(d.accentColor);
          if (d.logoUrl || d.restaurant_logo) setLogoPreview(d.logoUrl || d.restaurant_logo || null);
          if (d.bannerUrl || d.restaurant_cover) setBannerPreview(d.bannerUrl || d.restaurant_cover || null);
          if (d.lat && d.lng) {
            setStoreLocation({ lat: Number(d.lat) || 13.7262, lng: Number(d.lng) || 100.5731 });
          }
          setSecurityValue("email", d.email || "");

          if (d.bankName || d.bank_name) setInfoValue("bankName", d.bankName || d.bank_name || "kbank");
          if (d.bankAccountNumber || d.bank_account_number) setInfoValue("accountNumber", d.bankAccountNumber || d.bank_account_number || "");
          if (d.bankAccountName || d.bank_account_name) setInfoValue("accountName", d.bankAccountName || d.bank_account_name || "");

          const qrVal = d.qrpayment_url || d.promptPayQrImage || d.promptpay_qr;
          if (qrVal && typeof qrVal === "string" && qrVal.trim().length > 0) {
            const trimmed = qrVal.trim();
            if (trimmed.startsWith("000201") || trimmed.startsWith("promptpay://")) {
              setPromptpayQrPayload(trimmed);
              setPaymentQrImage(null);
            } else if (trimmed.startsWith("http") || trimmed.startsWith("data:")) {
              setPaymentQrImage(trimmed);
              setPromptpayQrPayload(null);
            } else {
              setPaymentQrImage(trimmed);
              setPromptpayQrPayload(null);
            }
          } else {
            setPaymentQrImage(null);
            setPromptpayQrPayload(null);
          }
        }

        if (accRes.success && accRes.data) {
          const a = accRes.data;
          if (a.bankName || (a as any).bank_name) setInfoValue("bankName", a.bankName || (a as any).bank_name || "kbank");
          if (a.bankAccountNumber || (a as any).bank_account_number) setInfoValue("accountNumber", a.bankAccountNumber || (a as any).bank_account_number || "");
          if (a.bankAccountName || (a as any).bank_account_name) setInfoValue("accountName", a.bankAccountName || (a as any).bank_account_name || "");
          const qrVal = (a as any).qrpayment_url || a.promptPayQrImage || (a as any).promptpay_qr;
          if (qrVal && typeof qrVal === "string" && qrVal.trim().length > 0) {
            const trimmed = qrVal.trim();
            if (trimmed.startsWith("000201") || trimmed.startsWith("promptpay://")) {
              setPromptpayQrPayload(trimmed);
              setPaymentQrImage(null);
            } else if (trimmed.startsWith("http") || trimmed.startsWith("data:")) {
              setPaymentQrImage(trimmed);
              setPromptpayQrPayload(null);
            } else {
              setPaymentQrImage(trimmed);
              setPromptpayQrPayload(null);
            }
          } else {
            setPaymentQrImage(null);
            setPromptpayQrPayload(null);
          }
        }
      } catch (e) {
        console.warn("Failed to load store settings from API", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const onSaveInfo = async (data: InfoFormInputs) => {
    setIsSaving(true);
    try {
      const isPromptPay = data.bankName === "promptpay";
      const promptPayNum = isPromptPay ? data.accountNumber : undefined;
      const promptPayNm = isPromptPay ? data.accountName : undefined;
      const qrImageToSend = paymentQrImage || promptpayQrPayload || null;

      const opDays = data.operatingDays || "ทุกวัน";
      const clDays = data.closedDays || "";
      const combinedDayText = clDays ? `${opDays} (${clDays})` : opDays;

      const infoRes = await RestaurantApi.updateInfo({
        name: data.name,
        restaurant_name: data.name,
        description: data.description,
        restaurant_desc: data.description,
        phone: data.phone,
        restaurant_phone: data.phone,
        email: data.email,
        addressDetail: data.addressDetail,
        subDistrict: data.subDistrict,
        district: data.district,
        province: data.province,
        zipCode: data.zipCode,
        lat: storeLocation.lat,
        lng: storeLocation.lng,
        openTime: data.openTime,
        closeTime: data.closeTime,
        operatingDays: opDays,
        closedDays: clDays,
        restaurant_day: combinedDayText,
        lineId: data.lineId,
        line_id: data.lineId,
        lineOaUrl: data.lineOaUrl,
        line_oa_url: data.lineOaUrl,
        facebookUrl: data.facebookUrl,
        facebook_url: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        instagram_url: data.instagramUrl,
        tiktokUrl: data.tiktokUrl,
        tiktok_url: data.tiktokUrl,
        youtubeUrl: data.youtubeUrl,
        youtube_url: data.youtubeUrl,
        xUrl: data.xUrl,
        x_url: data.xUrl,
        websiteUrl: data.websiteUrl,
        website_url: data.websiteUrl,
        googleMapsUrl: data.googleMapsUrl,
        google_maps_url: data.googleMapsUrl,
        linemanUrl: data.linemanUrl,
        lineman_url: data.linemanUrl,
        grabUrl: data.grabUrl,
        grab_url: data.grabUrl,
        shopeefoodUrl: data.shopeefoodUrl,
        shopeefood_url: data.shopeefoodUrl,
        robinhoodUrl: data.robinhoodUrl,
        robinhood_url: data.robinhoodUrl,
        primaryColor,
        restaurant_primary_theme: primaryColor,
        secondaryColor,
        restaurant_secondary_theme: secondaryColor,
        accentColor,
        logoUrl: logoPreview || undefined,
        restaurant_logo: logoPreview || undefined,
        bannerUrl: bannerPreview || undefined,
        restaurant_cover: bannerPreview || undefined,
        bankName: data.bankName,
        bank_name: data.bankName,
        bankAccountNumber: data.accountNumber,
        bank_account_number: data.accountNumber,
        bankAccountName: data.accountName,
        bank_account_name: data.accountName,
        promptPayId: promptPayNum,
        promptPayNumber: promptPayNum,
        promptpay_number: promptPayNum,
        promptPayName: promptPayNm,
        promptpay_name: promptPayNm,
        promptPayQrImage: qrImageToSend,
        promptpay_qr: promptpayQrPayload || (paymentQrImage ? paymentQrImage : null),
        qrpayment_url: paymentQrImage || (promptpayQrPayload ? promptpayQrPayload : null),
      });

      if (infoRes.success) {
        if (infoRes.data?.logoUrl || infoRes.data?.restaurant_logo) {
          setLogoPreview(infoRes.data.logoUrl || infoRes.data.restaurant_logo || null);
        }
        if (infoRes.data?.bannerUrl || infoRes.data?.restaurant_cover) {
          setBannerPreview(infoRes.data.bannerUrl || infoRes.data.restaurant_cover || null);
        }
        if (infoRes.data?.qrpayment_url || infoRes.data?.promptPayQrImage) {
          const resQr = infoRes.data.qrpayment_url || infoRes.data.promptPayQrImage;
          if (resQr && (resQr.startsWith("http") || resQr.startsWith("data:"))) {
            setPaymentQrImage(resQr);
          } else if (resQr && (resQr.startsWith("000201") || resQr.startsWith("promptpay://"))) {
            setPromptpayQrPayload(resQr);
            setPaymentQrImage(null);
          }
        } else {
          setPaymentQrImage(null);
          setPromptpayQrPayload(null);
        }
        if (infoRes.data?.primaryColor || infoRes.data?.themeColor || infoRes.data?.restaurant_primary_theme) {
          setPrimaryColor(infoRes.data.primaryColor || infoRes.data.themeColor || infoRes.data.restaurant_primary_theme || "#E11D48");
        }
        if (infoRes.data?.secondaryColor || infoRes.data?.restaurant_secondary_theme) {
          setSecondaryColor(infoRes.data.secondaryColor || infoRes.data.restaurant_secondary_theme || "#F59E0B");
        }
        if (infoRes.data?.accentColor) setAccentColor(infoRes.data.accentColor);
        await refreshRestaurant().catch(() => { });
        toast.success("บันทึกข้อมูลร้านค้าและการตกแต่งเรียบร้อยแล้ว");
      } else {
        toast.error(infoRes.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (e: any) {
      console.warn("Failed to sync settings with backend API", e);
      toast.error(e?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSaving(false);
    }
  };

  const {
    register: registerSecurity,
    handleSubmit: handleSecuritySubmit,
    setValue: setSecurityValue,
    watch: watchSecurity,
    reset: resetSecurityForm,
    formState: { errors: securityErrors },
  } = useForm<SecurityFormInputs>({
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSaveSecurity = async (data: SecurityFormInputs) => {
    setIsSavingSecurity(true);
    try {
      const res = await RestaurantApi.updateSecurity({
        email: data.email,
        newPassword: data.newPassword,
      });
      if (res.success) {
        setSecurityValue("newPassword", "");
        setSecurityValue("confirmPassword", "");
        toast.success("อัปเดตรหัสผ่านและความปลอดภัยเรียบร้อยแล้ว");
      } else {
        toast.error(res.message || "ไม่สามารถอัปเดตรหัสผ่านได้");
      }
    } catch (e: any) {
      console.warn("Failed to sync security settings", e);
      toast.error(e?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Sync activeSubTab when defaultSubTab prop changes from sidebar navigation
  useEffect(() => {
    setActiveSubTab(defaultSubTab);
  }, [defaultSubTab]);


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 600, 0.85);
        setLogoPreview(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1400, 0.85);
        setBannerPreview(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = (ev) => setBannerPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.9);
        setPaymentQrImage(compressed);
        setPromptpayQrPayload(null);
      } catch {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPaymentQrImage(ev.target?.result as string);
          setPromptpayQrPayload(null);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveLogo = () => setLogoPreview(null);
  const handleRemoveBanner = () => setBannerPreview(null);
  const handleSaveTheme = () => handleInfoSubmit(onSaveInfo)();
  const isSavingTheme = isSaving;

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12", "max-w-4xl")}>

      {/* Reassuring Saving & Cloud Processing Overlay */}
      <AnimatePresence>
        {(isSaving || isSavingSecurity) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border text-center space-y-5"
            >
              {/* Animated Icon Container */}
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-brand-100 dark:bg-brand-950 animate-ping opacity-30" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <ShieldCheck size={32} className="animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface shadow-md border border-border flex items-center justify-center">
                  <Loader2 size={16} className="text-brand-600 animate-spin" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-black text-text">
                  {isSaving ? "กำลังบันทึกข้อมูลและประมวลผล..." : "กำลังบันทึกความปลอดภัย..."}
                </h3>
                <p className="text-xs sm:text-sm text-text-2 leading-relaxed font-medium">
                  ระบบกำลังตรวจสอบความปลอดภัยของข้อมูล และทำการอัปโหลดบันทึกไฟล์รูปภาพ
                </p>
              </div>

              {/* Reassurance Badge / Note */}
              <div className="p-3.5 bg-brand-50/80 dark:bg-brand-950/40 rounded-2xl border border-brand-200/80 dark:border-brand-800/50 flex items-center gap-3 text-left">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping shrink-0" />
                <p className="text-xs text-brand-900 dark:text-brand-200 font-semibold leading-relaxed">
                  ขั้นตอนนี้อาจใช้เวลาสักครู่ เพื่อให้มั่นใจว่าไฟล์รูปภาพและข้อมูลทั้งหมดได้รับการจัดเก็บและสำรองข้อมูลอย่างสมบูรณ์และปลอดภัยครับ
                </p>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 via-teal-400 to-brand-600"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <h2 className="text-2xl font-black text-text mb-1">จัดการข้อมูลร้านค้า</h2>
        <p className="text-xs sm:text-sm text-text-3">จัดการข้อมูลพื้นฐาน ธีมสี/แบนเนอร์/โลโก้ พิกัดแผนที่ เวลาทำการ บัญชีรับเงิน และความปลอดภัย</p>
      </div>

      {isLoading ? (
        <RestaurantSettingsSkeleton />
      ) : (
        /* Main Form Content Container */
        <div className="space-y-6">

          {/* Sub-Tab 1: ข้อมูลทั่วไป (รวมชื่อร้าน, ที่ตั้ง & แผนที่, เวลาทำการ, เบอร์/อีเมลติดต่อ) */}
          {activeSubTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Store Name & Description Card */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store size={18} className="text-brand-600" />
                    <h3 className="font-bold text-text">ข้อมูลพื้นฐานของร้านค้า</h3>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <Input
                    label="ชื่อร้านค้า *"
                    placeholder="เช่น เครปป้าเฉื่อย สาขา 1, Crepe House Cafe"
                    error={infoErrors.name?.message}
                    {...registerInfo("name", { required: "กรุณากรอกชื่อร้านค้า" })}
                  />
                  <Textarea
                    label="คำอธิบายร้านสั้นๆ"
                    placeholder="เช่น เครปแป้งกรอบ หอมเนย ไส้แน่นคัดสรรพิเศษ อบสดใหม่ทุกชิ้น พร้อมส่งความอร่อยทุกวัน"
                    error={infoErrors.description?.message}
                    {...registerInfo("description")}
                    rows={3}
                  />
                </div>
              </div>

              {/* Location & Address Card */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-brand-600" />
                    <h3 className="font-bold text-text">ที่ตั้งและที่อยู่ร้านเครป</h3>
                  </div>
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                    พิกัด GPS &amp; Google Maps
                  </span>
                </div>
                <div className="p-6 space-y-6">

                  {/* Google Maps Location Picker Section */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-text flex items-center gap-1.5">
                          <MapPin size={15} className="text-brand-600" />
                          <span>เลือกตำแหน่งร้านจาก Google Maps &amp; GPS</span>
                        </label>
                        <p className="text-[11px] text-text-3">
                          ค้นหาสถานที่, เลื่อนหมุดบนแผนที่ หรือกดปุ่ม &quot;เลือกตำแหน่งปัจจุบัน&quot; เพื่อระบุพิกัดร้านค้าของคุณ
                        </p>
                      </div>
                    </div>

                    <GoogleMapPicker
                      lat={storeLocation.lat}
                      lng={storeLocation.lng}
                      storeName={watchInfo("name") || "ร้านเครป"}
                      address={watchInfo("addressDetail")}
                      interactive={true}
                      onLocationSelect={(newLat, newLng, addressDetails) => {
                        setStoreLocation({ lat: newLat, lng: newLng });
                        if (addressDetails) {
                          if (addressDetails.addressDetail) setInfoValue("addressDetail", addressDetails.addressDetail);
                          if (addressDetails.subDistrict) setInfoValue("subDistrict", addressDetails.subDistrict);
                          if (addressDetails.district) setInfoValue("district", addressDetails.district);
                          if (addressDetails.province) setInfoValue("province", addressDetails.province);
                          if (addressDetails.zipCode) setInfoValue("zipCode", addressDetails.zipCode);
                        }
                      }}
                    />

                    {/* Lat / Lng Direct Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <Input
                        label="ละติจูด (Latitude)"
                        placeholder="เช่น 13.736717"
                        value={storeLocation.lat}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setStoreLocation((prev) => ({ ...prev, lat: val }));
                        }}
                      />
                      <Input
                        label="ลองจิจูด (Longitude)"
                        placeholder="เช่น 100.523186"
                        value={storeLocation.lng}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setStoreLocation((prev) => ({ ...prev, lng: val }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Detailed Address Fields */}
                  <div className="space-y-1.5 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-text">รายละเอียดที่อยู่ (เลขที่, อาคาร, ซอย, ถนน)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = watchInfo("addressDetail");
                          if (currentVal) {
                            const parsed = parseThaiAddress(currentVal);
                            if (parsed.subDistrict) setInfoValue("subDistrict", parsed.subDistrict);
                            if (parsed.district) setInfoValue("district", parsed.district);
                            if (parsed.province) setInfoValue("province", parsed.province);
                            if (parsed.zipCode) setInfoValue("zipCode", parsed.zipCode);
                            if (parsed.addressDetail) setInfoValue("addressDetail", parsed.addressDetail);
                            toast.success("แยกข้อมูลตำบล อำเภอ จังหวัด และรหัสไปรษณีย์เรียบร้อยแล้ว");
                          }
                        }}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-0.5 rounded-lg border border-brand-200 transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles size={12} />
                        <span>แยกตำบล/อำเภอ/จังหวัดอัตโนมัติ</span>
                      </button>
                    </div>
                    <Input
                      placeholder="เช่น 123/45 ซอยสุขุมวิท 55 ถนนสุขุมวิท อาคารมาร์เก็ตเพลส ชั้น 1"
                      error={infoErrors.addressDetail?.message}
                      {...registerInfo("addressDetail")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="แขวง / ตำบล"
                      placeholder="เช่น คลองตันเหนือ (หรือ ตำบลในเมือง)"
                      error={infoErrors.subDistrict?.message}
                      {...registerInfo("subDistrict")}
                    />
                    <Input
                      label="เขต / อำเภอ"
                      placeholder="เช่น วัฒนา (หรือ อำเภอเมือง)"
                      error={infoErrors.district?.message}
                      {...registerInfo("district")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="จังหวัด"
                      placeholder="เช่น กรุงเทพมหานคร, เชียงใหม่, นนทบุรี"
                      error={infoErrors.province?.message}
                      {...registerInfo("province")}
                    />
                    <Input
                      label="รหัสไปรษณีย์"
                      placeholder="เช่น 10110, 50000"
                      error={infoErrors.zipCode?.message}
                      {...registerInfo("zipCode")}
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours & Days Card */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-brand-600" />
                    <h3 className="font-bold text-text">เวลาทำการ & วันเปิด-ปิดบริการ</h3>
                  </div>
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                    แสดงบนหน้าร้านค้า & เมนู
                  </span>
                </div>
                <div className="p-6 space-y-6">
                  {/* Operating Times (เวลาเปิด - เวลาปิด) */}
                  <div>
                    <h4 className="text-xs font-bold text-text mb-2.5 flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-600" />
                      <span>ช่วงเวลาเปิด - ปิดบริการ</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input
                        label="เวลาเปิด"
                        type="time"
                        placeholder="09:00"
                        error={infoErrors.openTime?.message}
                        {...registerInfo("openTime")}
                      />
                      <Input
                        label="เวลาปิด"
                        type="time"
                        placeholder="21:00"
                        error={infoErrors.closeTime?.message}
                        {...registerInfo("closeTime")}
                      />
                    </div>
                  </div>

                  {/* Operating Days (วันเปิดทำการ) */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-text flex items-center gap-1.5">
                        <Calendar size={14} className="text-emerald-600" />
                        <span>วันเปิดทำการ (Operating Days)</span>
                      </label>
                      <span className="text-[11px] text-text-3 font-normal">เลือกปุ่มด่วนหรือพิมพ์ระบุเอง</span>
                    </div>

                    {/* Quick Presets for Operating Days */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {[
                        "ทุกวัน",
                        "จันทร์ - ศุกร์",
                        "จันทร์ - เสาร์",
                        "อังคาร - อาทิตย์",
                        "พุธ - อาทิตย์",
                        "เสาร์ - อาทิตย์",
                      ].map((preset) => {
                        const isSelected = (watchedOperatingDays || "").trim() === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setInfoValue("operatingDays", preset)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold transition-all border",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-surface-2 text-text-2 border-border hover:bg-surface-3 hover:text-text"
                            )}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="เช่น จันทร์ - ศุกร์, ทุกวัน หรือ เปิดทุกวัน ยกเว้นวันหยุดนักขัตฤกษ์"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("operatingDays")}
                      />
                    </div>
                  </div>

                  {/* Closed Days & Holidays (วันหยุดประจำ / วันหยุดพิเศษ) */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-text flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span>วันหยุดประจำร้าน & วันหยุดนักขัตฤกษ์ (Closed Days / Holidays)</span>
                      </label>
                      <span className="text-[11px] text-text-3 font-normal">เลือกปุ่มด่วนหรือพิมพ์ระบุเอง</span>
                    </div>

                    {/* Quick Presets for Closed Days */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {[
                        "หยุดเสาร์ - อาทิตย์",
                        "หยุดเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์",
                        "หยุดทุกวันจันทร์",
                        "หยุดทุกวันอังคาร",
                        "หยุดทุกวันพุธ",
                        "หยุดวันหยุดนักขัตฤกษ์",
                        "ไม่มีวันหยุด (เปิดทุกวัน)",
                      ].map((preset) => {
                        const isSelected = (watchedClosedDays || "").trim() === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (preset === "ไม่มีวันหยุด (เปิดทุกวัน)") {
                                setInfoValue("closedDays", "");
                              } else {
                                setInfoValue("closedDays", preset);
                              }
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold transition-all border",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-surface-2 text-text-2 border-border hover:bg-surface-3 hover:text-text"
                            )}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="เช่น หยุดเสาร์ - อาทิตย์, หยุดทุกวันจันทร์ หรือ เปิดทุกวัน"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("closedDays")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: โลโก้, แบนเนอร์ & ธีมสีร้านค้า */}
          {activeSubTab === "branding" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="max-w-4xl space-y-6">

                {/* 1. Theme Colors Card */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">ชุดสีประจำร้าน (Color Theme)</h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      3 โทนสี
                    </span>
                  </div>
                  <div className="p-6 space-y-6">

                    {/* Primary Color */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: primaryColor }} />
                          <span>สีหลัก (Primary Color)</span>
                          <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded font-bold">ปุ่ม & ไฮไลท์</span>
                        </label>
                        <span className="font-mono text-xs font-bold text-text-2 bg-slate-100 px-2 py-0.5 rounded-md">{primaryColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-12 h-10 rounded-xl cursor-pointer border border-border p-1 bg-surface shrink-0"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-32 h-10 px-3 rounded-xl border border-border bg-slate-50 text-xs font-mono font-bold text-text uppercase outline-none focus:border-brand-500 focus:bg-white"
                        />
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {["#E11D48", "#F43F5E", "#FB7185", "#F59E0B", "#10B981", "#0284C7", "#6366F1", "#8B5CF6"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPrimaryColor(c)}
                              className={cn(
                                "w-6 h-6 rounded-lg border-2 transition-all transform hover:scale-110",
                                primaryColor.toLowerCase() === c.toLowerCase() ? "border-text scale-110 shadow-xs" : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Color */}
                    <div className="space-y-2.5 pt-4 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: secondaryColor }} />
                          <span>สีรอง (Secondary Color)</span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold">องค์ประกอบเสริม</span>
                        </label>
                        <span className="font-mono text-xs font-bold text-text-2 bg-slate-100 px-2 py-0.5 rounded-md">{secondaryColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-12 h-10 rounded-xl cursor-pointer border border-border p-1 bg-surface shrink-0"
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-32 h-10 px-3 rounded-xl border border-border bg-slate-50 text-xs font-mono font-bold text-text uppercase outline-none focus:border-brand-500 focus:bg-white"
                        />
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {["#F59E0B", "#EAB308", "#84CC16", "#06B6D4", "#FB7185", "#D97706"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSecondaryColor(c)}
                              className={cn(
                                "w-6 h-6 rounded-lg border-2 transition-all transform hover:scale-110",
                                secondaryColor.toLowerCase() === c.toLowerCase() ? "border-text scale-110 shadow-xs" : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="space-y-2.5 pt-4 border-t border-border/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: accentColor }} />
                          <span>สีอื่นๆ / สีเน้น (Accent Color)</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">พื้นหลังกราเดี้ยน</span>
                        </label>
                        <span className="font-mono text-xs font-bold text-text-2 bg-slate-100 px-2 py-0.5 rounded-md">{accentColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-12 h-10 rounded-xl cursor-pointer border border-border p-1 bg-surface shrink-0"
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-32 h-10 px-3 rounded-xl border border-border bg-slate-50 text-xs font-mono font-bold text-text uppercase outline-none focus:border-brand-500 focus:bg-white"
                        />
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {["#8B5CF6", "#A855F7", "#EC4899", "#3B82F6", "#14B8A6", "#64748B"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setAccentColor(c)}
                              className={cn(
                                "w-6 h-6 rounded-lg border-2 transition-all transform hover:scale-110",
                                accentColor.toLowerCase() === c.toLowerCase() ? "border-text scale-110 shadow-xs" : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleSaveTheme}
                        loading={isSavingTheme}
                        className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md text-xs font-bold px-5"
                      >
                        <Palette size={14} className="mr-1.5" />
                        บันทึกชุดสีธีมร้าน
                      </Button>
                    </div>

                  </div>
                </div>

                {/* 2. Logo Upload Card */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">โลโก้ประจำร้าน (Store Logo)</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    {logoPreview ? (
                      <div className="flex items-center gap-5">
                        <div className="w-24 h-24 rounded-2xl border-2 border-border overflow-hidden bg-slate-100 flex items-center justify-center relative group shadow-sm shrink-0">
                          <img
                            src={formatDriveImageUrl(logoPreview)}
                            alt="โลโก้ร้าน"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-text">โลโก้ปัจจุบันของร้าน</p>
                          <p className="text-xs text-text-3">จะแสดงบนหัวเว็บเมนูลูกค้า, ตั๋วคิว และใบเสร็จ</p>
                          <div className="flex items-center gap-2 pt-1">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-text hover:bg-slate-50 transition-colors shadow-2xs">
                              <Upload size={13} />
                              <span>เปลี่ยนรูปภาพ</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border hover:border-brand-400 hover:bg-brand-50/40 rounded-2xl cursor-pointer transition-all group text-center">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                          <Upload size={22} />
                        </div>
                        <p className="text-sm font-bold text-text">คลิกเพื่ออัปโหลดโลโก้ร้าน</p>
                        <p className="text-xs text-text-3 mt-1">รองรับไฟล์ PNG, JPG, WEBP (แนะนำขนาด 500x500 px)</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 3. Banner Upload Card */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImagePlus size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">ภาพแบนเนอร์ร้าน (Store Banner)</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    {bannerPreview ? (
                      <div className="space-y-4">
                        <div className="w-full h-44 rounded-2xl border-2 border-border overflow-hidden bg-slate-100 relative group shadow-sm">
                          <img
                            src={formatDriveImageUrl(bannerPreview)}
                            alt="แบนเนอร์ร้าน"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-3">ภาพแบนเนอร์หัวเว็บของร้าน</p>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-text hover:bg-slate-50 transition-colors shadow-2xs">
                              <Upload size={13} />
                              <span>เปลี่ยนรูปภาพ</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBannerUpload}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border hover:border-brand-400 hover:bg-brand-50/40 rounded-2xl cursor-pointer transition-all group text-center">
                          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                            <Upload size={22} />
                          </div>
                          <p className="text-sm font-bold text-text">คลิกเพื่ออัปโหลดภาพแบนเนอร์</p>
                          <p className="text-xs text-text-3 mt-1">รองรับไฟล์ PNG, JPG, WEBP (แนะนำขนาด 1200x480 px หรือ 16:9)</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBannerUpload}
                          />
                        </label>
                        <div className="p-3.5 bg-brand-50/80 rounded-xl border border-brand-200/80 flex items-start gap-2.5">
                          <Sparkles size={16} className="text-brand-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-brand-900 leading-relaxed font-medium">
                            <strong>หมายเหตุ:</strong> หากไม่ได้อัปโหลดภาพแบนเนอร์ ระบบจะสร้างพื้นหลังแบบไล่เฉดสี (Gradient) สวยงามตามสีหลัก สีรอง และสีอื่นๆ ที่คุณเลือกไว้ให้อัตโนมัติ!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sub-Tab 3: ช่องทางการติดต่อ & โซเชียลมีเดีย */}
          {activeSubTab === "contact" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="max-w-4xl space-y-6">

                {/* Card 1: Primary Contacts */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhoneCall size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">ช่องทางการติดต่อหลัก</h3>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ติดต่อด่วน
                    </span>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-1.5">
                          <Phone size={14} className="text-emerald-600" />
                          เบอร์โทรศัพท์ร้านค้า
                        </label>
                        {watchedPhone && (
                          <a
                            href={`tel:${watchedPhone.replace(/[^0-9+]/g, "")}`}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 hover:underline"
                          >
                            <PhoneCall size={11} /> ทดสอบโทร
                          </a>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="เช่น 0812345678, 029999999"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all font-medium shadow-2xs font-mono"
                        {...registerInfo("phone", {
                          pattern: {
                            value: /^[0-9]*$/,
                            message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
                          },
                        })}
                        onKeyDown={(e) => {
                          // Allow: backspace, delete, tab, escape, enter, copy/paste shortcuts, arrows
                          if (
                            [46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode >= 35 && e.keyCode <= 39)
                          ) {
                            return;
                          }
                          // Ensure that it is a number and stop the keypress
                          if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setInfoValue("phone", numericOnly, { shouldValidate: true, shouldDirty: true });
                        }}
                      />
                      {infoErrors.phone?.message && (
                        <p className="text-[11px] font-bold text-rose-500 mt-1">{infoErrors.phone.message}</p>
                      )}
                      <p className="text-[11px] text-text-3">กรอกเฉพาะตัวเลข 9-10 หลัก โดยไม่ต้องใส่เครื่องหมายขีด</p>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-1.5">
                          <Mail size={14} className="text-blue-600" />
                          อีเมลติดต่อร้านค้า
                        </label>
                        {watchedEmail && (
                          <a
                            href={`mailto:${watchedEmail}`}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline"
                          >
                            <Mail size={11} /> ทดสอบส่งอีเมล
                          </a>
                        )}
                      </div>
                      <input
                        type="email"
                        placeholder="เช่น contact@mycrepeshop.com"
                        className={cn(
                          "w-full px-3.5 h-10 bg-slate-50 border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none transition-all font-medium shadow-2xs",
                          infoErrors.email ? "border-rose-500 focus:border-rose-500 focus:bg-rose-50/20" : "border-border focus:border-brand-500 focus:bg-white"
                        )}
                        {...registerInfo("email", {
                          validate: (val) => {
                            if (!val || val.trim().length === 0) return true;
                            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            return emailRegex.test(val.trim()) || "รูปแบบอีเมลไม่ถูกต้อง (เช่น contact@domain.com)";
                          },
                        })}
                      />
                      {infoErrors.email?.message && (
                        <p className="text-[11px] font-bold text-rose-500 mt-1">{infoErrors.email.message}</p>
                      )}
                    </div>

                    {/* Google Maps Link */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-1.5">
                          <GoogleMapsIcon size={16} />
                          ลิงก์พิกัดร้านบน Google Maps
                        </label>
                        {watchedGoogleMapsUrl && (
                          <a
                            href={watchedGoogleMapsUrl.startsWith("http") ? watchedGoogleMapsUrl : `https://${watchedGoogleMapsUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิดแผนที่
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="เช่น https://maps.app.goo.gl/abcdefg123456 หรือ https://google.com/maps/..."
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("googleMapsUrl")}
                      />
                      <p className="text-[11px] text-text-3">คัดลอกลิงก์แชร์จาก Google Maps เพื่อให้ลูกค้ากดเปิดนำทาง GPS มาที่ร้านได้</p>
                    </div>
                  </div>
                </div>

                {/* Card 2: Social Media Networks */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">โซเชียลมีเดีย (Social Media)</h3>
                    </div>
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                      ออนไลน์
                    </span>
                  </div>

                  <div className="p-6 space-y-5">

                    {/* LINE Official Account / LINE ID */}
                    <div className="p-4 rounded-xl bg-[#06C755]/5 border border-[#06C755]/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#06C755] text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                            <LineIcon size={18} className="text-white" />
                          </div>
                          <span className="font-bold text-xs text-text">LINE ID / LINE Official Account</span>
                        </div>
                        {watchedLineId && (
                          <a
                            href={`https://line.me/R/ti/p/~${watchedLineId.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#06C755] hover:text-[#05a346] inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิด LINE
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-text-2 mb-1 block">LINE ID หรือ @LINE OA</label>
                          <input
                            type="text"
                            placeholder="เช่น @crepe_shop หรือ crepedelicious"
                            className="w-full px-3.5 h-9.5 bg-white border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#06C755] transition-all font-medium"
                            {...registerInfo("lineId")}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-text-2 mb-1 block">ลิงก์เพิ่มเพื่อน (LINE URL ถ้ามี)</label>
                          <input
                            type="text"
                            placeholder="เช่น https://lin.ee/xxxxxx หรือ https://page.line.me/..."
                            className="w-full px-3.5 h-9.5 bg-white border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#06C755] transition-all font-medium"
                            {...registerInfo("lineOaUrl")}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-text-3">
                        หากกรอกเพียง LINE ID ระบบจะสร้างลิงก์เพิ่มเพื่อน <code className="bg-white px-1 py-0.5 rounded text-[10px] text-text-2 font-mono">line.me/R/ti/p/~...</code> ให้โดยอัตโนมัติ
                      </p>
                    </div>

                    {/* Facebook Page */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[#1877F2] text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                            <FacebookIcon size={16} className="text-white" />
                          </div>
                          Facebook Page URL
                        </label>
                        {watchedFacebookUrl && (
                          <a
                            href={watchedFacebookUrl.startsWith("http") ? watchedFacebookUrl : `https://${watchedFacebookUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#1877F2] hover:text-[#1464cc] inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิดเพจ
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="เช่น https://facebook.com/mycrepeshop หรือ mycrepeshop"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-[#1877F2] focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("facebookUrl")}
                      />
                    </div>

                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                            <InstagramIcon size={16} className="text-white" />
                          </div>
                          Instagram Profile (URL หรือ @username)
                        </label>
                        {watchedInstagramUrl && (
                          <a
                            href={
                              watchedInstagramUrl.startsWith("http")
                                ? watchedInstagramUrl
                                : `https://instagram.com/${watchedInstagramUrl.replace(/^@/, "")}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิด IG
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="เช่น https://instagram.com/mycrepe หรือ @mycrepe"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-pink-500 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("instagramUrl")}
                      />
                    </div>

                    {/* TikTok */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-neutral-950 text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                            <TikTokIcon size={16} className="text-white" />
                          </div>
                          TikTok Profile (URL หรือ @username)
                        </label>
                        {watchedTiktokUrl && (
                          <a
                            href={
                              watchedTiktokUrl.startsWith("http")
                                ? watchedTiktokUrl
                                : `https://tiktok.com/@${watchedTiktokUrl.replace(/^@/, "")}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#FE2C55] hover:text-[#d91b42] inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิด TikTok
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="เช่น https://tiktok.com/@mycrepe หรือ @mycrepe"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-neutral-700 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("tiktokUrl")}
                      />
                    </div>

                    {/* YouTube & X (Twitter) in 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* YouTube */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                              <YouTubeIcon size={16} className="text-white" />
                            </div>
                            YouTube Channel
                          </label>
                          {watchedYoutubeUrl && (
                            <a
                              href={watchedYoutubeUrl.startsWith("http") ? watchedYoutubeUrl : `https://${watchedYoutubeUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> ทดสอบ
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="เช่น https://youtube.com/@mycrepe"
                          className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-red-500 focus:bg-white transition-all font-medium shadow-2xs"
                          {...registerInfo("youtubeUrl")}
                        />
                      </div>

                      {/* X / Twitter */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center shadow-xs shrink-0 p-1">
                              <XTwitterIcon size={16} className="text-white" />
                            </div>
                            X (Twitter) Profile
                          </label>
                          {watchedXUrl && (
                            <a
                              href={
                                watchedXUrl.startsWith("http")
                                  ? watchedXUrl
                                  : `https://x.com/${watchedXUrl.replace(/^@/, "")}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-text inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> ทดสอบ
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="เช่น https://x.com/mycrepe หรือ @mycrepe"
                          className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-black focus:bg-white transition-all font-medium shadow-2xs"
                          {...registerInfo("xUrl")}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Card 3: Food Delivery & Website */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">ช่องทางเดลิเวอรี่ & เว็บไซต์ (Delivery & Website)</h3>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      เดลิเวอรี่
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Website URL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text flex items-center gap-1.5">
                          <Globe size={14} className="text-brand-600" />
                          เว็บไซต์ทางการของร้าน (Website)
                        </label>
                        {watchedWebsiteUrl && (
                          <a
                            href={watchedWebsiteUrl.startsWith("http") ? watchedWebsiteUrl : `https://${watchedWebsiteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={11} /> ทดสอบเปิดเว็บ
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="เช่น https://www.mycrepeshop.com"
                        className="w-full px-3.5 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all font-medium shadow-2xs"
                        {...registerInfo("websiteUrl")}
                      />
                    </div>

                    {/* Delivery Apps (LINE MAN, GrabFood, ShopeeFood, Robinhood) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* LINE MAN */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <LineManIcon size={18} className="rounded-md shadow-2xs shrink-0" />
                            LINE MAN Store URL
                          </label>
                          {watchedLinemanUrl && (
                            <a
                              href={watchedLinemanUrl.startsWith("http") ? watchedLinemanUrl : `https://${watchedLinemanUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#06C755] inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> เปิด
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="ลิงก์ร้านบน LINE MAN"
                          className="w-full px-3.5 h-9.5 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#06C755] focus:bg-white transition-all font-medium"
                          {...registerInfo("linemanUrl")}
                        />
                      </div>

                      {/* GrabFood */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <GrabFoodIcon size={18} className="rounded-md shadow-2xs shrink-0" />
                            GrabFood Store URL
                          </label>
                          {watchedGrabUrl && (
                            <a
                              href={watchedGrabUrl.startsWith("http") ? watchedGrabUrl : `https://${watchedGrabUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#00B14F] inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> เปิด
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="ลิงก์ร้านบน GrabFood"
                          className="w-full px-3.5 h-9.5 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#00B14F] focus:bg-white transition-all font-medium"
                          {...registerInfo("grabUrl")}
                        />
                      </div>

                      {/* ShopeeFood */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <ShopeeFoodIcon size={18} className="rounded-md shadow-2xs shrink-0" />
                            ShopeeFood Store URL
                          </label>
                          {watchedShopeefoodUrl && (
                            <a
                              href={watchedShopeefoodUrl.startsWith("http") ? watchedShopeefoodUrl : `https://${watchedShopeefoodUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#EE4D2D] inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> เปิด
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="ลิงก์ร้านบน ShopeeFood"
                          className="w-full px-3.5 h-9.5 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#EE4D2D] focus:bg-white transition-all font-medium"
                          {...registerInfo("shopeefoodUrl")}
                        />
                      </div>

                      {/* Robinhood */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text flex items-center gap-2">
                            <RobinhoodIcon size={18} className="rounded-md shadow-2xs shrink-0" />
                            Robinhood Store URL
                          </label>
                          {watchedRobinhoodUrl && (
                            <a
                              href={watchedRobinhoodUrl.startsWith("http") ? watchedRobinhoodUrl : `https://${watchedRobinhoodUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#56298B] inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={11} /> เปิด
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="ลิงก์ร้านบน Robinhood"
                          className="w-full px-3.5 h-9.5 bg-slate-50 border border-border rounded-xl text-xs text-text placeholder:text-text-3 outline-none focus:border-[#56298B] focus:bg-white transition-all font-medium"
                          {...registerInfo("robinhoodUrl")}
                        />
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sub-Tab 5: บัญชีรับเงิน & QR Code */}
          {activeSubTab === "bank" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column: Bank / PromptPay Form (7 cols) */}
                <div className="lg:col-span-7 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">บัญชีรับเงิน (ธนาคาร / พร้อมเพย์)</h3>
                    </div>
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                      {selectedBank === "promptpay" ? "พร้อมเพย์ (PromptPay)" : "บัญชีธนาคาร"}
                    </span>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Select Bank */}
                    <div>
                      <CustomSelect
                        label="เลือกธนาคาร / พร้อมเพย์ *"
                        options={bankOptions}
                        value={selectedBank}
                        onChange={(val) => {
                          setInfoValue("bankName", val);
                        }}
                        className="w-full"
                        error={infoErrors.bankName?.message}
                      />
                    </div>

                    {/* Account Number / PromptPay ID */}
                    <div className="space-y-2">
                      <Input
                        label={selectedBank === "promptpay" ? "เบอร์โทรศัพท์ / เลขประจำตัวประชาชน (PromptPay ID) *" : "เลขที่บัญชีธนาคาร *"}
                        placeholder={selectedBank === "promptpay" ? "เช่น 0812345678 หรือ 1234567890123" : "เช่น 1234567890"}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={15}
                        className="font-mono"
                        error={infoErrors.accountNumber?.message}
                        {...registerInfo("accountNumber", {
                          required: selectedBank === "promptpay" ? "กรุณากรอกเบอร์โทรศัพท์หรือเลขประจำตัวประชาชนสำหรับพร้อมเพย์" : "กรุณากรอกเลขที่บัญชีธนาคาร",
                          pattern: {
                            value: /^[0-9]+$/,
                            message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
                          },
                        })}
                        onKeyDown={(e) => {
                          // Allow: backspace, delete, tab, escape, enter, copy/paste shortcuts, arrows
                          if (
                            [46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode >= 35 && e.keyCode <= 39)
                          ) {
                            return;
                          }
                          // Ensure that it is a number and stop the keypress
                          if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 15);
                          setInfoValue("accountNumber", numericOnly, { shouldValidate: true, shouldDirty: true });
                        }}
                      />

                      {/* Auto Generate Button if PromptPay */}
                      {selectedBank === "promptpay" && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const accNum = watchInfo("accountNumber");
                              if (!accNum || accNum.trim().length === 0) {
                                toast.error("กรุณากรอกเบอร์โทรศัพท์ หรือเลขประจำตัวประชาชนสำหรับพร้อมเพย์ก่อน");
                                return;
                              }
                              const cleaned = accNum.replace(/[^0-9]/g, "");
                              if (cleaned.length !== 10 && cleaned.length !== 13 && cleaned.length !== 15) {
                                toast.error("รูปแบบพร้อมเพย์ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร ปชช. 13 หลัก)");
                                return;
                              }
                              try {
                                const payload = generatePromptPayPayload(cleaned);
                                setPromptpayQrPayload(payload);

                                // Generate real PNG Data URL so it uploads to Google Drive directly
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(payload)}`;
                                const res = await fetch(qrUrl);
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (reader.result) {
                                      setPaymentQrImage(reader.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(blob);
                                }
                                toast.success("สร้าง QR Code พร้อมเพย์เรียบร้อยแล้ว!");
                              } catch (e) {
                                toast.error("ไม่สามารถสร้าง QR Code ได้");
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#003B70] to-[#0070BA] hover:from-[#002D57] hover:to-[#005FA0] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                          >
                            <Zap size={14} className="text-amber-300 fill-amber-300" />
                            <span>สร้าง QR Code พร้อมเพย์อัตโนมัติ</span>
                          </button>
                          <p className="text-[11px] text-text-3 mt-1.5 flex items-center gap-1">
                            <Sparkles size={12} className="text-brand-600" />
                            <span>ระบบจะสร้าง QR Code พร้อมเพย์มาตรฐาน EMVCo และบันทึกข้อมูลรับเงินของร้านอัตโนมัติ</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Account Name */}
                    <Input
                      label="ชื่อบัญชี (ชื่อ-นามสกุล หรือ นามร้านค้า) *"
                      placeholder="เช่น บจก. ครัวบ้านไผ่ หรือ สมชาย ใจดี"
                      error={infoErrors.accountName?.message}
                      {...registerInfo("accountName", { required: "กรุณากรอกชื่อบัญชี" })}
                    />

                    <div className="p-4 bg-brand-50/80 rounded-xl border border-brand-100 flex items-start gap-3">
                      <Info size={18} className="text-brand-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-brand-900 leading-relaxed space-y-1">
                        <p className="font-medium">
                          ข้อมูลบัญชีและ QR Code นี้จะแสดงบนหน้าชำระเงินของลูกค้า เพื่อให้ลูกค้าสแกนโอนชำระค่าอาหารได้โดยตรง
                        </p>
                        <p className="text-amber-700 dark:text-amber-600 font-semibold flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          <span>โปรดตรวจสอบความถูกต้องของหมายเลขบัญชีและชื่อบัญชีให้ถูกต้องก่อนบันทึก</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: QR Code Preview & Upload (5 cols) */}
                <div className="lg:col-span-5 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode size={18} className="text-brand-600" />
                      <h3 className="font-bold text-text">QR Code รับเงินของร้าน</h3>
                    </div>
                    <span className="text-xs text-text-3 font-semibold">แสดงตอนเช็คบิล</span>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* QR Display Card */}
                    <div className="p-5 rounded-2xl border border-border bg-slate-50 flex flex-col items-center justify-center text-center">

                      {promptpayQrPayload ? (
                        /* PromptPay Branded Card */
                        <div className="w-full max-w-[240px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-center">
                          {/* PromptPay Header Banner */}
                          <div className="bg-[#003B70] text-white py-2.5 px-3 flex items-center justify-center gap-2">
                            <span className="font-black text-sm tracking-wide">พร้อมเพย์</span>
                            <span className="text-[10px] font-bold bg-[#0070BA] px-1.5 py-0.5 rounded text-white uppercase">PromptPay</span>
                          </div>

                          {/* QR Code SVG */}
                          <div className="p-4 flex items-center justify-center bg-white">
                            <QRCodeSVG
                              value={promptpayQrPayload}
                              size={160}
                              level="M"
                              includeMargin={false}
                            />
                          </div>

                          {/* Store / Account Info */}
                          <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/80">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {watchInfo("accountName") || watchInfo("name") || "ร้านค้า"}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5 font-semibold">
                              {watchInfo("accountNumber") || "-"}
                            </p>
                          </div>
                        </div>
                      ) : paymentQrImage ? (
                        /* Custom Uploaded QR Image */
                        <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center">
                          <img
                            src={formatDriveImageUrl(paymentQrImage)}
                            alt="QR Code รับเงิน"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-2"
                            onError={() => {
                              setPaymentQrImage(null);
                              setPromptpayQrPayload(null);
                            }}
                          />
                          <span className="absolute bottom-2 right-2 text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded-full shadow">
                            QR ปัจจุบัน
                          </span>
                        </div>
                      ) : (
                        /* Empty State / Dropzone */
                        <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-brand-400 hover:bg-brand-50/30 rounded-2xl cursor-pointer transition-all group">
                          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                            <QrCode size={22} />
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-text">อัปโหลดรูปภาพ QR Code รับเงิน</p>
                          <p className="text-[11px] text-text-3 mt-1">บันทึกรูป QR จากแอปธนาคารมาอัปโหลด</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setPaymentQrImage(ev.target?.result as string);
                                  setPromptpayQrPayload(null);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}

                      {/* Action buttons if QR exists */}
                      {(promptpayQrPayload || paymentQrImage) && (
                        <div className="flex items-center gap-2 mt-4">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-text cursor-pointer transition-all active:scale-95 shadow-2xs">
                            <Upload size={13} /> อัปโหลดรูปใหม่
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setPaymentQrImage(ev.target?.result as string);
                                    setPromptpayQrPayload(null);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentQrImage(null);
                              setPromptpayQrPayload(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                          >
                            <Trash2 size={13} /> ลบ QR
                          </button>
                        </div>
                      )}

                    </div>

                    {selectedBank === "promptpay" ? (
                      /* PromptPay selected: explain auto-QR with amount feature */
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                        <Zap size={15} className="text-emerald-500 fill-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[11.5px] font-bold text-emerald-800">
                            QR Code กำหนดยอดชำระอัตโนมัติ ✓
                          </p>
                          <p className="text-[11px] text-emerald-700 leading-relaxed">
                            เมื่อร้านเลือก <span className="font-bold">พร้อมเพย์</span> ระบบจะสร้าง QR Code รับเงินโดยกำหนดยอดเงินจากการสั่งซื้อของลูกค้า<span className="font-bold">โดยอัตโนมัติ</span> ลูกค้าสแกนแล้วได้ยอดที่ถูกต้องทันที
                            <span className="block mt-1 font-semibold">ไม่จำเป็นต้องบันทึกภาพ QR Code</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-3 text-center leading-relaxed flex items-center justify-center gap-1.5">
                        <Info size={13} className="text-brand-600 shrink-0" />
                        <span>คุณสามารถเลือกสร้าง QR พร้อมเพย์อัตโนมัติ หรืออัปโหลดภาพ QR Code จากแอปธนาคารของคุณได้โดยตรง</span>
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sub-Tab 6: ความปลอดภัย */}
          {activeSubTab === "security" && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-600" />
                <h3 className="font-bold text-text">ความปลอดภัยและการเข้าสู่ระบบ</h3>
              </div>
              <div className="p-6 space-y-5">
                <Input
                  label="อีเมลสำหรับเข้าสู่ระบบ *"
                  type="email"
                  placeholder="เช่น store_admin@gmail.com"
                  error={securityErrors.email?.message}
                  {...registerSecurity("email", {
                    required: "กรุณากรอกอีเมลสำหรับเข้าสู่ระบบ",
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "รูปแบบอีเมลไม่ถูกต้อง" }
                  })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border pt-5">
                  <Input
                    label="รหัสผ่านใหม่ *"
                    type="password"
                    placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)"
                    error={securityErrors.newPassword?.message}
                    {...registerSecurity("newPassword", {
                      required: "กรุณากรอกรหัสผ่านใหม่",
                      minLength: { value: 6, message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }
                    })}
                  />
                  <Input
                    label="ยืนยันรหัสผ่านใหม่ *"
                    type="password"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน"
                    error={securityErrors.confirmPassword?.message}
                    {...registerSecurity("confirmPassword", {
                      required: "กรุณายืนยันรหัสผ่านใหม่",
                      validate: (val) => val === watchSecurity("newPassword") || "รหัสผ่านไม่ตรงกัน"
                    })}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <div className="mt-8 flex items-center justify-end">
        <Button
          type="button"
          loading={isSaving || isSavingSecurity}
          disabled={isSaving || isSavingSecurity || isLoading}
          onClick={activeSubTab === "security" ? handleSecuritySubmit(onSaveSecurity) : handleInfoSubmit(onSaveInfo)}
          icon={!(isSaving || isSavingSecurity) ? <CheckCircle2 size={16} /> : undefined}
          className="px-8 py-3 rounded-xl shadow-md font-extrabold text-sm w-full sm:w-auto min-w-[200px]"
        >
          {isSaving ? "กำลังบันทึกข้อมูล..." : isSavingSecurity ? "กำลังบันทึกความปลอดภัย..." : "บันทึกข้อมูลร้านค้า"}
        </Button>
      </div>

    </div>
  );
}

// ── Menu Samples Tab (เมนูตัวอย่าง) ──────────────────────────────────────────
interface SampleMenuFormInputs {
  name: string;
  description?: string;
  tags?: string;
  price?: number;
}

function MenuSamplesTab() {
  const [samples, setSamples] = useState<import("@/app/lib/api").SampleMenuDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<import("@/app/lib/api").SampleMenuDTO | null>(null);
  const [confirmDeleteSample, setConfirmDeleteSample] = useState<import("@/app/lib/api").SampleMenuDTO | null>(null);
  
  // Status switches
  const [addIsActive, setAddIsActive] = useState<boolean>(true);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  
  // Filter tab
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Image previews
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors },
  } = useForm<SampleMenuFormInputs>({ defaultValues: { name: "", description: "", tags: "" } });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<SampleMenuFormInputs>({ defaultValues: { name: "", description: "", tags: "" } });

  const fetchSamples = async () => {
    setIsLoading(true);
    try {
      const res = await RestaurantApi.getSampleMenus();
      if (res.success && res.data) setSamples(res.data);
    } catch (err) {
      console.error("Failed to load sample menus:", err);
      toast.error("ไม่สามารถโหลดเมนูตัวอย่างได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSamples(); }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        if (isEdit) setEditImagePreview(reader.result as string);
        else setImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    resetAdd({ name: "", description: "", tags: "" });
    setImagePreview("");
    setAddIsActive(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (sample: import("@/app/lib/api").SampleMenuDTO) => {
    setEditingSample(sample);
    resetEdit({
      name: sample.name || sample.menu_name || "",
      description: sample.description || "",
      tags: sample.tags || "",
      price: sample.price || 0,
    });
    setEditImagePreview(sample.imageUrl || sample.image_url || sample.sample_image || "");
    setEditIsActive(sample.isActive !== false && sample.is_active !== false);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const onAddSample = async (data: SampleMenuFormInputs) => {
    setIsSubmitting(true);
    try {
      const payload: Partial<import("@/app/lib/api").SampleMenuDTO> = {
        name: data.name.trim(),
        menu_name: data.name.trim(),
        description: data.description?.trim() || undefined,
        imageUrl: imagePreview || undefined,
        image_url: imagePreview || undefined,
        tags: data.tags?.trim() || undefined,
        isActive: addIsActive,
        is_active: addIsActive,
      };
      const res = await RestaurantApi.createSampleMenu(payload);
      if (res.success && res.data) {
        toast.success(`เพิ่มเมนูตัวอย่าง "${data.name}" เรียบร้อยแล้ว`);
        setIsAddModalOpen(false);
        resetAdd();
        setImagePreview("");
        await fetchSamples();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการเพิ่มเมนูตัวอย่าง");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSample = async (data: SampleMenuFormInputs) => {
    if (!editingSample) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<import("@/app/lib/api").SampleMenuDTO> = {
        name: data.name.trim(),
        menu_name: data.name.trim(),
        description: data.description?.trim() || undefined,
        imageUrl: editImagePreview,
        image_url: editImagePreview,
        tags: data.tags?.trim() || undefined,
        isActive: editIsActive,
        is_active: editIsActive,
      };
      const res = await RestaurantApi.updateSampleMenu(editingSample.id || (editingSample as any).sample_id, payload);
      if (res.success) {
        toast.success(`อัปเดตเมนู "${data.name}" เรียบร้อยแล้ว`);
        setEditingSample(null);
        await fetchSamples();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการอัปเดต");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteSample) return;
    setIsSubmitting(true);
    try {
      const res = await RestaurantApi.deleteSampleMenu(confirmDeleteSample.id || (confirmDeleteSample as any).sample_id);
      if (res.success) {
        toast.success(`ลบเมนู "${confirmDeleteSample.name || confirmDeleteSample.menu_name}" เรียบร้อยแล้ว`);
        setConfirmDeleteSample(null);
        await fetchSamples();
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (sample: import("@/app/lib/api").SampleMenuDTO) => {
    const currentActive = sample.isActive !== false && sample.is_active !== false;
    try {
      const res = await RestaurantApi.toggleSampleMenu(sample.id || (sample as any).sample_id, !currentActive);
      if (res.success) {
        toast.success(!currentActive ? `เปิดแสดงเมนู "${sample.name || sample.menu_name}" บนหน้าแรกแล้ว` : `ซ่อนเมนู "${sample.name || sample.menu_name}" แล้ว`);
        await fetchSamples();
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  };

  // Filtered samples
  const activeCount = samples.filter((s) => s.isActive !== false && s.is_active !== false).length;
  const inactiveCount = samples.filter((s) => s.isActive === false || s.is_active === false).length;

  const filteredSamples = samples.filter((s) => {
    const isAct = s.isActive !== false && s.is_active !== false;
    if (statusFilter === "active") return isAct;
    if (statusFilter === "inactive") return !isAct;
    return true;
  });

  const SampleImageUpload = ({
    preview, setPreview, inputRef, isEdit = false
  }: {
    preview: string; setPreview: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null>; isEdit?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-text">รูปภาพเมนูตัวอย่าง</label>
      <div className="border border-border/80 rounded-2xl p-3 bg-surface-2/60">
        {preview ? (
          <div className="flex items-center gap-3.5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border shrink-0 bg-surface shadow-xs">
              <img src={formatDriveImageUrl(preview)} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> เลือกรูปภาพแล้ว
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-3 text-text text-xs font-bold rounded-xl border border-border transition-colors cursor-pointer"
                >
                  เปลี่ยนรูป
                </button>
                <button
                  type="button"
                  onClick={() => { setPreview(""); if (inputRef.current) inputRef.current.value = ""; }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ลบรูป
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="w-full py-6 border-2 border-dashed border-border hover:border-brand-500/60 rounded-2xl flex flex-col items-center justify-center text-text-3 hover:text-brand-600 transition-colors cursor-pointer bg-surface/50 hover:bg-surface group"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ImagePlus size={22} />
            </div>
            <span className="text-xs font-bold text-text">คลิกเพื่ออัปโหลดรูปภาพ</span>
            <span className="text-[11px] text-text-3 mt-0.5">รองรับไฟล์ PNG, JPG, WebP ขนาดไม่เกิน 5MB</span>
          </div>
        )}
        <input
          type="file"
          ref={inputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageChange(e, isEdit)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <h2 className="text-xl font-black text-text">จัดการเมนูตัวอย่าง</h2>
          </div>
          <p className="text-xs text-text-3 mt-1.5 leading-relaxed max-w-2xl">
            เพิ่มเมนูตัวอย่างพร้อมรูปภาพ คำอธิบาย และกำหนดสถานะเปิด/ปิดการแสดงผล เพื่อสร้างความน่าสนใจในหน้าแรกของลูกค้า
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={fetchSamples}
            disabled={isLoading}
            className="rounded-2xl h-11 px-3 text-text-2 hover:text-text border border-border cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="rounded-2xl h-11 px-4 font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 gap-2 shrink-0 cursor-pointer"
          >
            <Plus size={18} />
            <span>เพิ่มเมนูตัวอย่าง</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Stats */}
      {samples.length > 0 && (
        <div className="flex items-center gap-2 p-1.5 bg-surface-2 rounded-2xl border border-border/80 w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              statusFilter === "all" ? "bg-surface text-text shadow-xs" : "text-text-3 hover:text-text"
            )}
          >
            ทั้งหมด ({samples.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              statusFilter === "active" ? "bg-emerald-500 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            เปิดแสดง ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              statusFilter === "inactive" ? "bg-zinc-700 text-white shadow-xs" : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            ซ่อนอยู่ ({inactiveCount})
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading && samples.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-3xl overflow-hidden border border-border animate-pulse">
              <div className="h-48 bg-surface-3" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-surface-3 rounded-lg w-2/3" />
                <div className="h-3 bg-surface-3 rounded-lg w-full" />
                <div className="h-3 bg-surface-3 rounded-lg w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : samples.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 border border-border text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Sparkles size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-black text-text">ยังไม่มีเมนูตัวอย่าง</h3>
            <p className="text-xs text-text-3 mt-1">
              เพิ่มเมนูตัวอย่างเพื่อแสดงในหน้าแรกของลูกค้า ช่วยดึงดูดและสร้างแรงบันดาลใจในการสั่งอาหาร
            </p>
          </div>
          <Button
            onClick={handleOpenAddModal}
            className="rounded-2xl h-11 px-6 font-bold bg-rose-500 hover:bg-rose-600 text-white gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={18} />
            <span>เพิ่มเมนูตัวอย่างแรก</span>
          </Button>
        </div>
      ) : filteredSamples.length === 0 ? (
        <div className="bg-surface rounded-3xl p-8 border border-border text-center text-text-3 text-xs">
          ไม่มีเมนูตัวอย่างในหมวดหมู่นี้
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSamples.map((sample) => {
            const isAct = sample.isActive !== false && sample.is_active !== false;
            const imgSrc = sample.imageUrl || sample.image_url || sample.sample_image;
            const title = sample.name || sample.menu_name || "เมนูตัวอย่าง";

            return (
              <motion.div
                key={sample.id || (sample as any).sample_id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "bg-surface rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group",
                  isAct ? "border-border hover:border-rose-500/40" : "border-border/60 opacity-60 bg-surface/60"
                )}
              >
                {/* Image & Status Overlay */}
                <div className="relative w-full h-48 bg-surface-2 overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={formatDriveImageUrl(imgSrc)}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 text-rose-300">
                      <Sparkles size={40} />
                      <span className="text-[10px] text-text-3 font-semibold mt-1">ไม่มีรูปภาพ</span>
                    </div>
                  )}

                  {/* Status Toggle Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={() => handleToggle(sample)}
                      title={isAct ? "คลิกเพื่อซ่อนจากหน้าแรก" : "คลิกเพื่อเปิดแสดงในหน้าแรก"}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md border",
                        isAct
                          ? "bg-emerald-500/90 text-white border-emerald-400 hover:bg-emerald-600"
                          : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full", isAct ? "bg-white animate-pulse" : "bg-zinc-400")} />
                      <span>{isAct ? "เปิดแสดง" : "ซ่อนไว้"}</span>
                    </button>
                  </div>

                  {sample.tags && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 backdrop-blur-md text-amber-300 border border-white/20">
                        {sample.tags}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4.5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-black text-text text-base leading-tight">{title}</h4>
                  </div>
                  {sample.description ? (
                    <p className="text-xs text-text-3 mt-2 leading-relaxed line-clamp-2">{sample.description}</p>
                  ) : (
                    <p className="text-xs text-text-3/50 italic mt-2">ไม่มีคำอธิบาย</p>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-border/70 flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[11px] font-bold text-text-3">
                      สถานะ: <strong className={isAct ? "text-emerald-600" : "text-zinc-500"}>{isAct ? "แสดงในหน้าแรก" : "ซ่อนไว้"}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sample)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-brand-600 text-xs font-bold transition-colors border border-border cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSample(sample)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-rose-50 text-text-3 hover:text-rose-600 text-xs font-bold transition-colors border border-border cursor-pointer"
                        title="ลบเมนูตัวอย่าง"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsAddModalOpen(false)}
            />
            <motion.form
              onSubmit={handleAddSubmit(onAddSample)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <h3 className="font-black text-text text-base sm:text-lg">เพิ่มเมนูตัวอย่างใหม่</h3>
                </div>
                <button type="button" disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                <Input
                  label="ชื่อเมนู *"
                  placeholder="เช่น ไก่ไข่ต้ม, สตรอว์เบอร์รีครีม, นูเทลล่ากล้วยหอม"
                  error={addErrors.name?.message}
                  {...registerAdd("name", { required: "กรุณากรอกชื่อเมนู" })}
                />
                <Textarea
                  label="คำอธิบาย (ไม่บังคับ)"
                  placeholder="เช่น เครปบางกรอบหอมเนย ไส้ไก่ย่างซอสพิเศษ เสิร์ฟพร้อมไข่ต้มสุก"
                  rows={3}
                  {...registerAdd("description")}
                />
                <Input
                  label="ป้ายแท็กกำกับ (ไม่บังคับ)"
                  placeholder="เช่น แนะนำ, ยอดนิยม, Signature"
                  {...registerAdd("tags")}
                />
                
                <SampleImageUpload
                  preview={imagePreview}
                  setPreview={setImagePreview}
                  inputRef={fileInputRef}
                />

                {/* Status Switch */}
                <div className="p-3.5 bg-surface-2 rounded-2xl border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-text block">สถานะการแสดงผล</label>
                    <p className="text-[11px] text-text-3">
                      {addIsActive ? "เปิดแสดงในหน้าแรกของลูกค้าทันที" : "ซ่อนไว้ชั่วคราว (ยังไม่แสดงให้ลูกค้าเห็น)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddIsActive(!addIsActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      addIsActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        addIsActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button type="button" fullWidth variant="ghost" disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} className="rounded-2xl h-11 font-bold cursor-pointer">ยกเลิก</Button>
                <Button type="submit" fullWidth className="rounded-2xl h-11 font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 cursor-pointer" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกเมนูตัวอย่าง"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSample && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingSample(null)}
            />
            <motion.form
              onSubmit={handleEditSubmit(onEditSample)}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 border border-border"
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                    <Edit2 size={18} />
                  </div>
                  <h3 className="font-black text-text text-base sm:text-lg">แก้ไขเมนูตัวอย่าง</h3>
                </div>
                <button type="button" disabled={isSubmitting} onClick={() => setEditingSample(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                <Input
                  label="ชื่อเมนู *"
                  placeholder="เช่น ไก่ไข่ต้ม, สตรอว์เบอร์รีครีม"
                  error={editErrors.name?.message}
                  {...registerEdit("name", { required: "กรุณากรอกชื่อเมนู" })}
                />
                <Textarea
                  label="คำอธิบาย (ไม่บังคับ)"
                  placeholder="คำอธิบายสั้น ๆ เกี่ยวกับเมนูนี้"
                  rows={3}
                  {...registerEdit("description")}
                />
                <Input
                  label="ป้ายแท็กกำกับ (ไม่บังคับ)"
                  placeholder="เช่น แนะนำ, ยอดนิยม, Signature"
                  {...registerEdit("tags")}
                />
                
                <SampleImageUpload
                  preview={editImagePreview}
                  setPreview={setEditImagePreview}
                  inputRef={editFileInputRef}
                  isEdit
                />

                {/* Status Switch */}
                <div className="p-3.5 bg-surface-2 rounded-2xl border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-text block">สถานะการแสดงผล</label>
                    <p className="text-[11px] text-text-3">
                      {editIsActive ? "เปิดแสดงในหน้าแรกของลูกค้า" : "ซ่อนไว้ชั่วคราว (ไม่แสดงในหน้าแรก)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      editIsActive ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                        editIsActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-border flex gap-3 bg-surface-2 shrink-0">
                <Button type="button" fullWidth variant="ghost" disabled={isSubmitting} onClick={() => setEditingSample(null)} className="rounded-2xl h-11 font-bold cursor-pointer">ยกเลิก</Button>
                <Button type="submit" fullWidth className="rounded-2xl h-11 font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 cursor-pointer" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {confirmDeleteSample && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setConfirmDeleteSample(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-surface rounded-[28px] overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10 border border-border"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-rose-100 text-rose-600 shadow-md">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="font-black text-text text-lg">ยืนยันการลบเมนูตัวอย่าง?</h3>
                <p className="text-xs text-text-3 mt-1.5 leading-relaxed">
                  คุณกำลังจะลบ <strong className="text-text font-bold">"{confirmDeleteSample.name || confirmDeleteSample.menu_name}"</strong> ออกจากระบบอย่างถาวร
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button fullWidth variant="ghost" disabled={isSubmitting} onClick={() => setConfirmDeleteSample(null)} className="rounded-2xl h-11 font-bold cursor-pointer">ยกเลิก</Button>
                <Button fullWidth className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl h-11 shadow-md shadow-rose-600/20 cursor-pointer" disabled={isSubmitting} onClick={handleConfirmDelete}>
                  {isSubmitting ? "กำลังลบ..." : "ยืนยันลบ"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ── Sound Settings Tab (ตั้งค่าเสียงแจ้งเตือน) ────────────────────────────────
function SoundSettingsTab() {
  const [newOrderSound, setNewOrderSound] = useState(true);
  const [paymentSound, setPaymentSound] = useState(true);
  const [isPlayingNewOrder, setIsPlayingNewOrder] = useState(false);
  const [isPlayingPayment, setIsPlayingPayment] = useState(false);

  useEffect(() => {
    setNewOrderSound(isNewOrderSoundEnabled());
    setPaymentSound(isPaymentSoundEnabled());
  }, []);

  const handleToggleNewOrder = (val: boolean) => {
    setNewOrderSound(val);
    setNewOrderSoundEnabled(val);
    toast.success(val ? "เปิดเสียงแจ้งเตือนเมื่อออเดอร์เข้าแล้ว" : "ปิดเสียงแจ้งเตือนเมื่อออเดอร์เข้าแล้ว");
  };

  const handleTogglePayment = (val: boolean) => {
    setPaymentSound(val);
    setPaymentSoundEnabled(val);
    toast.success(val ? "เปิดเสียงแจ้งเตือนเมื่อลูกค้าชำระเงินแล้ว" : "ปิดเสียงแจ้งเตือนเมื่อลูกค้าชำระเงินแล้ว");
  };

  const handleTestNewOrderSound = async () => {
    if (isPlayingNewOrder) return;
    setIsPlayingNewOrder(true);
    try {
      await speakOrderVoiceAnnouncement({
        queueNumber: "A001",
        itemCount: 3,
        force: true,
      });
      toast.success("กำลังเล่นเสียงตัวอย่าง: ออเดอร์เข้า");
    } catch (e) {
      console.warn("Test sound failed", e);
    } finally {
      setTimeout(() => setIsPlayingNewOrder(false), 2200);
    }
  };

  const handleTestPaymentSound = async () => {
    if (isPlayingPayment) return;
    setIsPlayingPayment(true);
    try {
      await speakPaymentVoiceAnnouncement({
        queueNumber: "A001",
        amount: 160,
        force: true,
      });
      toast.success("กำลังเล่นเสียงตัวอย่าง: ลูกค้าชำระเงิน");
    } catch (e) {
      console.warn("Test sound failed", e);
    } finally {
      setTimeout(() => setIsPlayingPayment(false), 2200);
    }
  };

  const handleEnableAll = () => {
    setNewOrderSound(true);
    setPaymentSound(true);
    setNewOrderSoundEnabled(true);
    setPaymentSoundEnabled(true);
    toast.success("เปิดเสียงแจ้งเตือนทั้งหมดเรียบร้อยแล้ว");
  };

  const handleDisableAll = () => {
    setNewOrderSound(false);
    setPaymentSound(false);
    setNewOrderSoundEnabled(false);
    setPaymentSoundEnabled(false);
    toast.info("ปิดเสียงแจ้งเตือนทั้งหมดแล้ว");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 text-xs font-bold border border-brand-200/60 dark:border-brand-800/40">
              <Volume2 size={14} className="text-brand-500" />
              <span>ระบบเสียงแจ้งเตือนร้านค้า (Audio Alerts)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight">
              ตั้งค่าเสียงแจ้งเตือน
            </h2>
            <p className="text-xs sm:text-sm text-text-3 max-w-xl leading-relaxed">
              กำหนดการเปิดหรือปิดเสียงแจ้งเตือนสำหรับเหตุการณ์สำคัญของร้าน เพื่อไม่ให้พลาดออเดอร์ใหม่และการชำระเงินจากลูกค้า
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleEnableAll}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition-all cursor-pointer active:scale-95"
            >
              เปิดทั้งหมด
            </button>
            <button
              type="button"
              onClick={handleDisableAll}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-2 hover:bg-surface-3 text-text-2 border border-border transition-all cursor-pointer active:scale-95"
            >
              ปิดทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: New Order Alert */}
        <div className={cn(
          "bg-surface border rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all duration-200",
          newOrderSound 
            ? "border-brand-300 dark:border-brand-800/80 ring-1 ring-brand-500/20" 
            : "border-border opacity-85"
        )}>
          <div className="space-y-4">
            {/* Top Bar: Icon & Switch */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors",
                  newOrderSound 
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60" 
                    : "bg-surface-3 text-text-3 border border-border"
                )}>
                  <UtensilsCrossed size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-text">
                    1. เสียงแจ้งเตือนเมื่อออเดอร์เข้า
                  </h3>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5",
                    newOrderSound 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40" 
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}>
                    {newOrderSound ? "เปิดใช้งาน (Active)" : "ปิดเสียง (Muted)"}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={newOrderSound}
                onClick={() => handleToggleNewOrder(!newOrderSound)}
                className={cn(
                  "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 shadow-inner cursor-pointer select-none",
                  newOrderSound ? "bg-emerald-500 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                )}
                title={newOrderSound ? "คลิกเพื่อปิดเสียง" : "คลิกเพื่อเปิดเสียง"}
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-text-3 leading-relaxed">
              เล่นเสียงกระดิ่งครัวพร้อมเสียงพูดภาษาไทยแจ้งเตือนคิวและจำนวนรายการ เมื่อลูกค้ากดสั่งซื้ออาหารเข้ามาใหม่
            </p>

            {/* Voice Preview Quote Box */}
            <div className="bg-surface-2 border border-border/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-brand-600 block uppercase tracking-wider">
                ตัวอย่างเสียงประกาศ (Voice Preview):
              </span>
              <p className="text-xs font-semibold text-text italic">
                &ldquo;มีออเดอร์ใหม่ คิวที่ A001 สั่งอาหาร 3 รายการค่ะ&rdquo;
              </p>
            </div>
          </div>

          {/* Test Sound Button */}
          <div className="pt-5 mt-4 border-t border-border/70 flex items-center justify-between">
            <span className="text-xs text-text-3 font-medium">กดเพื่อฟังเสียงตัวอย่าง:</span>
            <Button
              type="button"
              onClick={handleTestNewOrderSound}
              disabled={isPlayingNewOrder}
              className={cn(
                "rounded-xl text-xs font-bold py-2 px-4 shadow-xs transition-all active:scale-95 cursor-pointer",
                newOrderSound
                  ? "bg-brand-500 hover:bg-brand-600 text-white"
                  : "bg-surface-3 hover:bg-surface-2 text-text-2 border border-border"
              )}
              icon={isPlayingNewOrder ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
            >
              {isPlayingNewOrder ? "กำลังเล่นเสียง..." : "ทดสอบเสียงออเดอร์เข้า"}
            </Button>
          </div>
        </div>

        {/* Card 2: Payment Alert */}
        <div className={cn(
          "bg-surface border rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all duration-200",
          paymentSound 
            ? "border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20" 
            : "border-border opacity-85"
        )}>
          <div className="space-y-4">
            {/* Top Bar: Icon & Switch */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors",
                  paymentSound 
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60" 
                    : "bg-surface-3 text-text-3 border border-border"
                )}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-text">
                    2. เสียงแจ้งเตือนเมื่อลูกค้าชำระเงิน
                  </h3>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5",
                    paymentSound 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40" 
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  )}>
                    {paymentSound ? "เปิดใช้งาน (Active)" : "ปิดเสียง (Muted)"}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={paymentSound}
                onClick={() => handleTogglePayment(!paymentSound)}
                className={cn(
                  "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 shadow-inner cursor-pointer select-none",
                  paymentSound ? "bg-emerald-500 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                )}
                title={paymentSound ? "คลิกเพื่อปิดเสียง" : "คลิกเพื่อเปิดเสียง"}
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-text-3 leading-relaxed">
              เล่นเสียงกระดิ่งเตือนและเสียงประกาศยอดเงินภาษาไทย เมื่อลูกค้ายืนยันการชำระเงินหรือแนบหลักฐานสลิปเข้ามา
            </p>

            {/* Voice Preview Quote Box */}
            <div className="bg-surface-2 border border-border/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">
                ตัวอย่างเสียงประกาศ (Voice Preview):
              </span>
              <p className="text-xs font-semibold text-text italic">
                &ldquo;ออเดอร์คิวที่ A001 ลูกค้าแจ้งชำระเงินแล้ว 160 บาทค่ะ&rdquo;
              </p>
            </div>
          </div>

          {/* Test Sound Button */}
          <div className="pt-5 mt-4 border-t border-border/70 flex items-center justify-between">
            <span className="text-xs text-text-3 font-medium">กดเพื่อฟังเสียงตัวอย่าง:</span>
            <Button
              type="button"
              onClick={handleTestPaymentSound}
              disabled={isPlayingPayment}
              className={cn(
                "rounded-xl text-xs font-bold py-2 px-4 shadow-xs transition-all active:scale-95 cursor-pointer",
                paymentSound
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-surface-3 hover:bg-surface-2 text-text-2 border border-border"
              )}
              icon={isPlayingPayment ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
            >
              {isPlayingPayment ? "กำลังเล่นเสียง..." : "ทดสอบเสียงชำระเงิน"}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Advice Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <Sparkles size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-xs">คำแนะนำการใช้งานระบบเสียง:</p>
          <p className="text-[11px] sm:text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            การตั้งค่าเสียงจะถูกบันทึกไว้ในอุปกรณ์นี้โดยอัตโนมัติ เพื่อให้ได้ยินเสียงแจ้งเตือนอย่างต่อเนื่อง กรุณาปรับระดับเสียงของลำโพงหรือแท็บเล็ตหน้าร้านให้อยู่ในระดับที่เหมาะสม
          </p>
        </div>
      </div>
    </div>
  );
}


const VALID_SETTINGS_TABS: SettingsTab[] = [
  "shop-qr",
  "menu-crusts",
  "menu-categories",
  "menu-items",
  "menu-samples",
  "info-general",
  "info-branding",
  "info-location",
  "info-contact",
  "info-bank",
  "info-security",
  "sound-settings",
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>("shop-qr");
  const [mobileTabOpen, setMobileTabOpen] = useState(false);

  // Lifted State
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  // Restore and keep active tab in sync with URL & localStorage
  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab | null;
    if (tabParam && VALID_SETTINGS_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
      try {
        localStorage.setItem("crape_settings_active_tab", tabParam);
      } catch {}
      return;
    }

    try {
      const savedTab = localStorage.getItem("crape_settings_active_tab") as SettingsTab | null;
      if (savedTab && VALID_SETTINGS_TABS.includes(savedTab)) {
        setActiveTab(savedTab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", savedTab);
        window.history.replaceState(null, "", url.toString());
      }
    } catch {}
  }, [searchParams]);

  const handleTabChange = useCallback((id: string) => {
    const tabId = id as SettingsTab;
    if (VALID_SETTINGS_TABS.includes(tabId)) {
      setActiveTab(tabId);
      try {
        localStorage.setItem("crape_settings_active_tab", tabId);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tabId);
        window.history.replaceState(null, "", url.toString());
      } catch (err) {
        console.warn("Failed to persist settings tab:", err);
      }
    }
  }, []);

  useEffect(() => {
    async function loadMenuData() {
      try {
        const [catRes, itemRes] = await Promise.all([
          RestaurantApi.getCategories(),
          RestaurantApi.getMenuItems(),
        ]);
        if (catRes.success && catRes.data && catRes.data.length > 0) {
          setCategories(catRes.data.map((c: any) => c.category_name || c.name || c.label || c));
        }
        if (itemRes.success && itemRes.data && itemRes.data.length > 0) {
          const mappedItems: MenuItem[] = itemRes.data.map((item: any) => ({
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            name: item.name || "",
            nameEn: item.nameEn,
            description: item.description || "",
            price: Number(item.price) || 0,
            image: item.image || item.images?.[0] || "",
            images: item.images || (item.image ? [item.image] : []),
            category: item.category || "",
            spicyLevel: item.spicyLevel,
            popular: Boolean(item.popular),
            available: item.available !== false,
            optionGroups: item.optionGroups || item.options?.optionGroups || [],
            options: item.options || { optionGroups: item.optionGroups || [] },
          }));
          setItems(mappedItems);
        }
      } catch (err) {
        console.warn("Could not load menu items from API in settings", err);
      }
    }

    loadMenuData();
  }, []);

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    "shop-qr": <ShopQRTab />,
    "menu-crusts": <MenuCrustsTab />,
    "menu-categories": <MenuCategoriesTab categories={categories} setCategories={setCategories} items={items} />,
    "menu-items": <MenuItemsTab items={items} setItems={setItems} categories={categories} />,
    "menu-samples": <MenuSamplesTab />,
    "info-general": <InfoTab defaultSubTab="general" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "info-branding": <InfoTab defaultSubTab="branding" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "info-location": <InfoTab defaultSubTab="location" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "info-contact": <InfoTab defaultSubTab="contact" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "info-bank": <InfoTab defaultSubTab="bank" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "info-security": <InfoTab defaultSubTab="security" activeTab={activeTab} setActiveTab={handleTabChange} />,
    "sound-settings": <SoundSettingsTab />,
  };

  const findTab = (id: string, tabsArray: any[]): any => {
    for (const t of tabsArray) {
      if (t.id === id) return t;
      if (t.children) {
        const found = findTab(id, t.children);
        if (found) return found;
      }
    }
    return null;
  };
  const currentTab = findTab(activeTab, tabs);

  return (
    <div className="flex h-full">
      {/* Desktop Settings Sidebar */}
      <aside className="hidden md:flex w-52 lg:w-56 border-r border-border bg-surface flex-shrink-0 flex-col p-4">
        <div className="mb-5">
          <h1 className="text-base font-bold text-text">ตั้งค่าระบบ</h1>
          <p className="text-xs text-text-3 mt-0.5">จัดการร้านเครป CrepeQ</p>
        </div>
        <VerticalTabs tabs={tabs} active={activeTab} onChange={handleTabChange} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Tab Selector Trigger Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border shadow-sm shrink-0">
          <div>
            <span className="text-[11px] font-bold text-brand-600 block">เมนูตั้งค่าที่เลือก:</span>
            <span className="text-sm font-black text-text flex items-center gap-1.5 mt-0.5">
              {currentTab?.icon}
              {currentTab?.label}
            </span>
          </div>
          <button
            onClick={() => setMobileTabOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-text border border-border/80 shadow-2xs transition-all active:scale-95"
            title="เลือกเมนูตั้งค่า"
          >
            <Menu size={20} className="text-text" />
          </button>
        </div>

        {/* Mobile Tab Selection Modal Sheet */}
        <AnimatePresence>
          {mobileTabOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileTabOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full bg-surface rounded-t-[28px] overflow-hidden shadow-2xl flex flex-col z-10 max-h-[85vh] border-t border-border"
              >
                <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
                  <div className="flex items-center gap-2">
                    <Settings size={18} className="text-brand-600" />
                    <h3 className="font-bold text-text text-base">เลือกเมนูตั้งค่าระบบ</h3>
                  </div>
                  <button
                    onClick={() => setMobileTabOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-3 text-xs custom-scrollbar pb-10">
                  {tabs.map((tab) => {
                    if (tab.children) {
                      return (
                        <div key={tab.id} className="space-y-1 bg-surface-2 p-3 rounded-2xl border border-border">
                          <div className="px-2 py-1 text-xs font-black text-brand-700 uppercase tracking-wider flex items-center gap-2">
                            {tab.icon} {tab.label}
                          </div>
                          <div className="space-y-1 pt-1">
                            {tab.children.map((child) => (
                              <button
                                key={child.id}
                                onClick={() => { handleTabChange(child.id); setMobileTabOpen(false); }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all",
                                  activeTab === child.id ? "bg-brand-500 text-white shadow-sm font-extrabold" : "text-text-2 hover:bg-surface-3"
                                )}
                              >
                                <span>{child.label}</span>
                                {activeTab === child.id && <CheckCircle2 size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { handleTabChange(tab.id); setMobileTabOpen(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold text-left transition-all border",
                          activeTab === tab.id
                            ? "bg-brand-500 text-white border-brand-600 shadow-sm"
                            : "bg-surface-2 text-text-2 border-border hover:bg-surface-3"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          {tab.icon}
                          {tab.label}
                        </span>
                        {activeTab === tab.id && <CheckCircle2 size={14} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto p-4 lg:p-6 pb-28 md:pb-6 custom-scrollbar"
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
