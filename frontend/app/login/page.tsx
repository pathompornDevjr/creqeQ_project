/**
 * @file page.tsx (Login)
 * @description หน้าจอเข้าสู่ระบบสำหรับร้านค้า (Restaurant Owner & Staff Login)
 * รองรับการตรวจสอบคุกกี้ Session อัตโนมัติ, จดจำรหัสผ่านผ่าน LocalStorage,
 * ระบบลืมรหัสผ่าน (Forgot Password Modal) และการเปลี่ยนเส้นทางไปยังหน้าจัดการคิว
 */

"use client";

import { Input } from "@/app/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  Store,
  KeyRound,
  Trash2,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthApi } from "@/app/lib/api/auth.api";
import { Loading } from "@/app/components/ui/Loading";

/** อินเตอร์เฟซฟอร์มเข้าสู่ระบบ */
interface LoginFormInputs {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // สถานะโมดอลลืมรหัสผ่าน
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);

  // ตรวจสอบ Token ที่มีอยู่แล้วเพื่อ Auto-login ไปยังหน้า Dashboard
  useEffect(() => {
    let isMounted = true;
    async function checkExistingAuth() {
      const cookies = typeof document !== "undefined" ? document.cookie : "";
      const match = cookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
      const token = match ? match[1]?.trim() : null;

      if (!token || token.length < 10) {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const res = await AuthApi.me();
        if (isMounted && res.success && res.data) {
          router.replace("/restaurant/queue");
          return;
        }
      } catch { }

      if (isMounted) {
        setIsCheckingAuth(false);
      }
    }
    checkExistingAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  /**
   * ส่งคำขอกู้คืนรหัสผ่าน
   */
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("กรุณาระบุอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้");
      return;
    }

    setIsSendingForgot(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsForgotSuccess(true);
      toast.success("ส่งคำขอกู้คืนรหัสผ่านเรียบร้อยแล้ว");
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSendingForgot(false);
    }
  };

  /**
   * ล้างข้อมูลการจดจำรหัสผ่านในเครื่อง
   */
  const handleClearRemembered = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("crepe_remember_login");
    }
    reset({
      email: "",
      password: "",
      rememberMe: false,
    });
    toast.info("ล้างข้อมูลการจำรหัสผ่านในเครื่องนี้เรียบร้อยแล้ว");
  };

  // โหลดข้อมูลการล็อกอินที่เคยจดจำไว้
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crepe_remember_login");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.email) {
            setValue("email", parsed.email);
          }
          if (parsed.password) {
            setValue("password", parsed.password);
          }
          if (typeof parsed.rememberMe === "boolean") {
            setValue("rememberMe", parsed.rememberMe);
          }
        }
      } catch (e) {
        console.warn("Failed to load saved login credentials", e);
      }
    }
  }, [setValue]);

  /**
   * ฟังก์ชัน Submit เข้าสู่ระบบ
   */
  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      const res = await AuthApi.login({
        emailOrPhone: data.email,
        password: data.password,
      });

      if (!res.success || !res.data) {
        toast.error(res.message || "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูล", {
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      // บันทึก Token ลงในคุกกี้
      if (res.data.token) {
        const maxAge = data.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
        document.cookie = `auth_token=${res.data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      // จัดการจดจำข้อมูลลงใน LocalStorage
      if (typeof window !== "undefined") {
        if (data.rememberMe) {
          localStorage.setItem(
            "crepe_remember_login",
            JSON.stringify({
              email: data.email,
              password: data.password,
              rememberMe: true,
            })
          );
        } else {
          localStorage.removeItem("crepe_remember_login");
        }
      }

      toast.success(`ยินดีต้อนรับ ${res.data.user.firstName || res.data.user.username} (${res.data.restaurant?.name || "ร้านเครป CrepeQ"})`);
      router.push("/restaurant/queue");
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", {
        duration: 5000,
      });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <Loading
        title="CREPEQ"
        message="กำลังตรวจสอบสถานะการเข้าสู่ระบบ..."
        variant="brand"
        fullscreen={true}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans py-8">
      {/* ภาพพื้นหลังตามอุปกรณ์ที่ใช้งาน (Responsive Background Images) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-rose-600">
        <picture className="block w-full h-full">
          {/* Mobile Landscape */}
          <source media="(max-height: 600px) and (min-width: 480px)" srcSet="/BG_PT.png" />
          <source media="(max-height: 600px)" srcSet="/BG_PT.png" />
          <source media="(max-width: 960px) and (min-aspect-ratio: 1.2/1)" srcSet="/BG_PT.png" />
          <source media="(max-width: 950px) and (orientation: landscape)" srcSet="/BG_PT.png" />
          {/* Mobile Portrait */}
          <source media="(max-width: 639px)" srcSet="/BG_M.png" />
          {/* iPad Portrait */}
          <source media="(min-width: 640px) and (max-width: 1023px) and (orientation: portrait)" srcSet="/BG_PT.png" />
          <source media="(min-width: 640px) and (max-width: 1023px) and (max-aspect-ratio: 1/1)" srcSet="/BG_PT.png" />
          {/* iPad Landscape */}
          <source media="(max-width: 1023px)" srcSet="/BG_P.png" />
          {/* Desktop Fallback */}
          <img
            src="/BG.png"
            alt="Background"
            className="w-full h-full object-cover object-top sm:object-center transition-all duration-300"
          />
        </picture>
      </div>

      {/* ส่วนหัวโลโก้แบรนด์ */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-center gap-4 text-white mb-6 z-10"
      >
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center border-4 border-white/90 shadow-2xl shrink-0 p-2 sm:p-2.5 overflow-hidden">
          <img src="/Logo.png" alt="CrepeQ Logo" className="w-full h-full object-contain scale-110" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-white uppercase leading-none drop-shadow-sm">
            CREPEQ
          </h1>
          <p className="text-sm sm:text-base text-white/95 font-black mt-1.5 drop-shadow-xs">
            ระบบจัดการร้านค้าครบวงจร
          </p>
        </div>
      </motion.div>

      {/* การ์ดฟอร์มเข้าสู่ระบบ */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-7 sm:p-9 relative z-20 border border-slate-100/90"
      >
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">เข้าสู่ระบบร้านค้า</h2>
          <p className="text-xs font-semibold text-slate-400">กรุณากรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
        </div>

        {/* ฟอร์มเข้าสู่ระบบ */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">อีเมล <span className="text-red-500 font-bold ml-0.5">*</span></label>
            <Input
              type="text"
              leftIcon={<Mail size={16} className="text-slate-400" />}
              className="h-12 bg-slate-50 border-slate-200 rounded-full text-xs font-medium focus:bg-white focus:border-rose-500 transition-all"
              error={errors.email?.message}
              {...register("email", {
                required: "กรุณากรอกอีเมลเข้าใช้งาน",
              })}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">รหัสผ่าน <span className="text-red-500 font-bold ml-0.5">*</span></label>
            <Input
              type={showPassword ? "text" : "password"}
              leftIcon={<Lock size={16} className="text-slate-400" />}
              className="h-12 bg-slate-50 border-slate-200 rounded-full text-xs font-medium focus:bg-white focus:border-rose-500 transition-all"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register("password", {
                required: "กรุณากรอกรหัสผ่าน",
              })}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-600 font-bold cursor-pointer group select-none">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="peer appearance-none w-4 h-4 rounded-md border-2 border-slate-300 bg-white checked:bg-rose-600 checked:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all cursor-pointer"
                  {...register("rememberMe")}
                />
                <svg
                  className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>จดจำการเข้าสู่ระบบ</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(watch("email") || "");
                setIsForgotSuccess(false);
                setShowForgotModal(true);
              }}
              className="font-extrabold text-rose-600 hover:text-rose-700 hover:underline focus:outline-none transition-colors"
            >
              ลืมรหัสผ่าน?
            </button>
          </div>

          {/* ปุ่มส่งฟอร์มเข้าสู่ระบบ */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-extrabold rounded-full shadow-lg shadow-rose-600/30 transition-all text-sm flex items-center justify-center gap-2"
            >
              {isLoading || isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>กำลังตรวจสอบข้อมูล...</span>
                </>
              ) : (
                "เข้าสู่ระบบจัดการร้าน"
              )}
            </button>
          </div>
        </form>

        {/* หน้าจอแสดงผลขณะกำลังล็อกอินแบบ Fullscreen Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center"
              >
                <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-100 border-t-rose-600 animate-spin" />
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700 shadow-inner">
                    <Store size={26} className="animate-pulse" />
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 mb-1.5">
                  กำลังเข้าสู่ระบบ
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                  กำลังตรวจสอบสิทธิ์และการอนุมัติบัญชี...
                </p>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full"
                    initial={{ width: "20%" }}
                    animate={{ width: ["20%", "75%", "95%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* โมดอลกู้คืนรหัสผ่าน (Forgot Password Modal) */}
        <AnimatePresence>
          {showForgotModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowForgotModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {/* หัวข้อโมดอล */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">ลืมรหัสผ่าน / กู้คืนบัญชี</h3>
                      <p className="text-xs text-slate-400 font-medium">ระบบกู้คืนรหัสผ่านเข้าใช้งานร้านค้า</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* เนื้อหาในโมดอล */}
                <div className="p-6">
                  {isForgotSuccess ? (
                    <div className="text-center py-4 space-y-4">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-800">ส่งคำขอกู้คืนรหัสผ่านแล้ว</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                          ระบบได้รับคำขอของท่านสำหรับ <span className="font-bold text-slate-700">{forgotEmail}</span> แล้ว กรุณาตรวจสอบอีเมลหรือรอการติดต่อกลับเพื่อดำเนินการกู้คืนรหัสผ่าน
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotModal(false);
                            setIsForgotSuccess(false);
                          }}
                          className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-xs shadow-md shadow-rose-600/20 transition-all"
                        >
                          ตกลงและกลับสู่หน้าเข้าสู่ระบบ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                          กรุณาระบุอีเมลหรือเบอร์โทรศัพท์ที่ใช้ลงทะเบียนร้านค้า ระบบจะส่งข้อมูลสำหรับตั้งค่ารหัสผ่านใหม่ไปยังบัญชีของท่าน
                        </p>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          อีเมลหรือเบอร์โทรศัพท์ร้านค้า <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="ตัวอย่าง: owner@crepeq.com หรือ 0812345678"
                          leftIcon={<Mail size={16} className="text-slate-400" />}
                          className="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-rose-500 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingForgot}
                        className="w-full h-11 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-extrabold rounded-full shadow-md shadow-rose-600/20 transition-all text-xs flex items-center justify-center gap-2"
                      >
                        {isSendingForgot ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span>กำลังส่งข้อมูล...</span>
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            <span>ส่งคำขอรีเซ็ตรหัสผ่าน</span>
                          </>
                        )}
                      </button>

                      {/* ตัวเลือกล้างรหัสผ่านที่เคยจำไว้ในเครื่อง */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 flex items-start gap-3">
                          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <p className="font-extrabold text-amber-900 mb-0.5">พบปัญหากับรหัสผ่านที่บันทึกไว้?</p>
                            <p className="text-amber-700 text-[11px] leading-relaxed mb-2">
                              หากเคยเลือก "จดจำการเข้าสู่ระบบ" แล้วรหัสผ่านไม่ถูกต้อง สามารถล้างข้อมูลที่บันทึกไว้ในเบราว์เซอร์นี้ได้
                            </p>
                            <button
                              type="button"
                              onClick={handleClearRemembered}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px] transition-colors shadow-2xs"
                            >
                              <Trash2 size={13} className="text-amber-700" />
                              <span>ล้างรหัสผ่านที่จำไว้ในเครื่องนี้</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}