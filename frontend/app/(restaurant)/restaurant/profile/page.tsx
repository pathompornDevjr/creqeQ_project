/**
 * @file page.tsx (Restaurant Profile)
 * @description หน้าจัดการโปรไฟล์ผู้ดูแลร้านและรหัสผ่าน (User Profile & Security Management)
 * รองรับการแก้ไขชื่อ นามสกุล คำนำหน้า เบอร์โทรศัพท์ และการเปลี่ยนรหัสผ่านเข้าใช้งาน
 */

"use client";

import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { CustomSelect } from "@/app/components/ui/Select";
import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { AuthApi, RestaurantApi, clearAuthSession } from "@/app/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

/** อินเตอร์เฟซฟอร์มข้อมูลส่วนตัว */
interface ProfileFormInputs {
  titlePrefix: "นาย" | "นาง" | "นางสาว";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

/** อินเตอร์เฟซฟอร์มเปลี่ยนรหัสผ่าน */
interface PasswordFormInputs {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function RestaurantProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [isLoading, setIsLoading] = useState(true);

  // สถานะเปิด/ปิดแสดงรหัสผ่าน
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ฟอร์มข้อมูลโปรไฟล์
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    watch: watchProfile,
    setValue: setProfileValue,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormInputs>({
    defaultValues: {
      titlePrefix: "นาย",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    },
  });

  const titlePrefixValue = watchProfile("titlePrefix");

  // ดึงข้อมูลโปรไฟล์จริงจาก API
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await RestaurantApi.getProfile();
        if (res.success && res.data) {
          const u = res.data;
          resetProfile({
            titlePrefix: (u.titlePrefix as any) || "นาย",
            firstName: u.firstName || u.fname || "",
            lastName: u.lastName || u.lname || "",
            phone: u.phone || "",
            email: u.email || "",
          });
        }
      } catch (err) {
        console.warn("Failed to load user profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [resetProfile]);

  // ฟอร์มเปลี่ยนรหัสผ่าน
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormInputs>();

  const newPasswordValue = watchPassword("newPassword");

  /**
   * บันทึกการเปลี่ยนแปลงข้อมูลส่วนตัว
   */
  const onProfileSubmit = async (data: ProfileFormInputs) => {
    try {
      const res = await RestaurantApi.updateProfile({
        titlePrefix: data.titlePrefix,
        firstName: data.firstName,
        lastName: data.lastName,
        fname: `${data.titlePrefix} ${data.firstName}`.trim(),
        lname: data.lastName,
        phone: data.phone,
        email: data.email,
      });
      if (res.success) {
        if (res.data) {
          const u = res.data;
          resetProfile({
            titlePrefix: (u.titlePrefix as any) || data.titlePrefix,
            firstName: u.firstName || data.firstName,
            lastName: u.lastName || data.lastName,
            phone: u.phone || data.phone,
            email: u.email || data.email,
          });
        }
        toast.success("บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว");
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      toast.error(err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  /**
   * บันทึกการเปลี่ยนรหัสผ่าน
   */
  const onPasswordSubmit = async (data: PasswordFormInputs) => {
    try {
      const res = await RestaurantApi.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (res.success) {
        toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังออกจากระบบ...");
        resetPassword();
        try {
          await AuthApi.logout();
        } catch (_) {}
        clearAuthSession();
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      } else {
        toast.error(res.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    } catch (err: any) {
      toast.error(err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* ส่วนหัวหน้าโปรไฟล์ */}
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-text">โปรไฟล์ส่วนตัว</h1>
        <p className="text-xs text-text-3 mt-0.5">
          จัดการข้อมูลส่วนบุคคล เบอร์โทรศัพท์ อีเมล และรหัสผ่านเข้าใช้งานระบบ
        </p>
      </div>

      {/* แถบสลับแท็บโปรไฟล์และความปลอดภัย */}
      <div className="flex border-b border-border gap-2 relative">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer",
            activeTab === "profile" ? "text-brand-600 font-extrabold" : "text-text-3 hover:text-text"
          )}
        >
          <User size={15} /> ข้อมูลส่วนตัว
          {activeTab === "profile" && (
            <motion.div
              layoutId="profile-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer",
            activeTab === "security" ? "text-brand-600 font-extrabold" : "text-text-3 hover:text-text"
          )}
        >
          <ShieldCheck size={15} /> ความปลอดภัย & รหัสผ่าน
          {activeTab === "security" && (
            <motion.div
              layoutId="profile-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* เนื้อหาในแต่ละแท็บ */}
      {activeTab === "profile" ? (
        <motion.div
          key="profile-tab-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-surface rounded-[16px] border border-border p-5 lg:p-6 space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <UserCheck size={18} className="text-brand-600" />
            <h2 className="text-sm lg:text-base font-bold text-text">ข้อมูลผู้ดูแลร้าน</h2>
          </div>

          <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1.5">
                  คำนำหน้า <span className="text-danger">*</span>
                </label>
                <CustomSelect
                  className="w-full"
                  buttonClassName="!h-10 !rounded-[10px] !bg-surface !border-border !px-3.5 !text-sm !font-normal"
                  options={[
                    { value: "นาย", label: "นาย" },
                    { value: "นาง", label: "นาง" },
                    { value: "นางสาว", label: "นางสาว" },
                  ]}
                  value={titlePrefixValue}
                  onChange={(val) => setProfileValue("titlePrefix", val as any)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">
                  ชื่อจริง <span className="text-danger">*</span>
                </label>
                <Input
                  error={profileErrors.firstName?.message}
                  {...registerProfile("firstName", { required: "กรุณากรอกชื่อจริง" })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">
                  นามสกุล <span className="text-danger">*</span>
                </label>
                <Input
                  error={profileErrors.lastName?.message}
                  {...registerProfile("lastName", { required: "กรุณากรอกนามสกุล" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1.5">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-danger">*</span>
                </label>
                <Input
                  leftIcon={<Phone size={16} />}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="font-mono"
                  placeholder="เช่น 0812345678"
                  error={profileErrors.phone?.message}
                  {...registerProfile("phone", {
                    required: "กรุณากรอกเบอร์โทรศัพท์",
                    pattern: {
                      value: /^[0-9]*$/,
                      message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
                    },
                  })}
                  onKeyDown={(e) => {
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
                    if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setProfileValue("phone", numericOnly, { shouldValidate: true, shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text">
                    อีเมลใช้งานระบบ
                  </label>
                  <span className="text-[10px] font-semibold text-text-3 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock size={10} /> ล็อกไว้
                  </span>
                </div>
                <Input
                  leftIcon={<Mail size={16} />}
                  type="email"
                  readOnly
                  disabled
                  className="!bg-slate-100/90 !text-slate-600 !cursor-not-allowed !border-slate-200 select-none font-medium"
                  {...registerProfile("email")}
                />
                <p className="text-[11px] text-text-3 mt-1 flex items-center gap-1">
                  <span>อีเมลใช้สำหรับเข้าสู่ระบบ ไม่สามารถเปลี่ยนแปลงได้</span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                type="submit"
                disabled={isProfileSubmitting}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm"
                icon={<Save size={16} />}
              >
                {isProfileSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div
          key="security-tab-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-surface rounded-[16px] border border-border p-5 lg:p-6 space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="text-sm lg:text-base font-bold text-text">เปลี่ยนรหัสผ่านเข้าใช้งาน</h2>
          </div>

          <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-text mb-1.5">
                รหัสผ่านปัจจุบัน <span className="text-danger">*</span>
              </label>
              <Input
                type={showCurrentPw ? "text" : "password"}
                leftIcon={<Lock size={16} />}
                error={passwordErrors.currentPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="text-text-3 hover:text-text transition-colors flex items-center justify-center p-1"
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...registerPassword("currentPassword", { required: "กรุณากรอกรหัสผ่านปัจจุบัน" })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text mb-1.5">
                รหัสผ่านใหม่ <span className="text-danger">*</span>
              </label>
              <Input
                type={showNewPw ? "text" : "password"}
                leftIcon={<KeyRound size={16} />}
                error={passwordErrors.newPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...registerPassword("newPassword", {
                  required: "กรุณากรอกรหัสผ่านใหม่",
                  minLength: { value: 6, message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
                })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text mb-1.5">
                ยืนยันรหัสผ่านใหม่ <span className="text-danger">*</span>
              </label>
              <Input
                type={showConfirmPw ? "text" : "password"}
                leftIcon={<KeyRound size={16} />}
                error={passwordErrors.confirmPassword?.message}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1"
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...registerPassword("confirmPassword", {
                  required: "กรุณายืนยันรหัสผ่านใหม่",
                  validate: (val) => val === newPasswordValue || "รหัสผ่านยืนยันไม่ตรงกับรหัสผ่านใหม่",
                })}
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                type="submit"
                disabled={isPasswordSubmitting}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm"
                icon={<ShieldCheck size={16} />}
              >
                {isPasswordSubmitting ? "กำลังอัปเดตรหัสผ่าน..." : "อัปเดตรหัสผ่านใหม่"}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}
