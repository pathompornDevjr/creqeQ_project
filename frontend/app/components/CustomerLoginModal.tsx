"use client";

/**
 * =========================================================================================
 * @file CustomerLoginModal.tsx
 * @description คอมโพเนนต์หน้าต่างเข้าสู่ระบบ / ลงทะเบียนสำหรับลูกค้า (Customer Auth Modal)
 * 
 * หน้าที่หลัก:
 * - สลับโหมด เข้าสู่ระบบ (Login) หรือ ลงทะเบียน (Register)
 * - ตรวจสอบความถูกต้องของฟอร์ม (Validation) ด้วย React Hook Form
 * - ทำการเชื่อมโยงข้อมูลกับ Backend ผ่าน `CustomerApi.loginCustomer` / `CustomerApi.registerCustomer`
 * - บันทึกข้อมูล Session ลูกค้าผ่าน `setCustomerSession()`
 * =========================================================================================
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, X, Sparkles, Loader2, CheckCircle2, Store, UserPlus, LogIn, AlertCircle } from "lucide-react";
import { CustomerApi } from "@/app/lib/api/customer.api";
import { setCustomerSession, useCustomerSession } from "@/app/lib/customer-auth";
import { toast } from "sonner";

/** Props ของคอมโพเนนต์ CustomerLoginModal */
interface CustomerLoginModalProps {
  /** ควบคุมการเปิด/ปิด */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** ฟังก์ชัน Callback เมื่อล็อกอิน/ลงทะเบียนสำเร็จ */
  onSuccess?: () => void;
  /** โหมดเริ่มต้น (login หรือ register) */
  initialMode?: "login" | "register";
  /** หัวข้อ Title */
  title?: string;
  /** ข้อความคำอธิบาย */
  description?: string;
}

/** โครงสร้างข้อมูลฟอร์ม */
interface AuthFormData {
  nickname: string;
  password: string;
  confirmPassword?: string;
}

/**
 * คอมโพเนนต์ CustomerLoginModal
 */
export function CustomerLoginModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
  title,
  description,
}: CustomerLoginModalProps) {
  const { customer, logout } = useCustomerSession();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    mode: "onTouched",
    defaultValues: {
      nickname: "",
      password: "",
      confirmPassword: "",
    },
  });

  // รีเซ็ตฟอร์มและซิงค์โหมดเมื่อเปิด Modal
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      reset({
        nickname: "",
        password: "",
        confirmPassword: "",
      });
      clearErrors();
    }
  }, [isOpen, initialMode, reset, clearErrors]);

  // สลับโหมด Login / Register
  const handleSwitchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    clearErrors();
  };

  /**
   * จัดการส่งข้อมูลฟอร์ม
   */
  const onSubmit = async (data: AuthFormData) => {
    const cleanNick = mode === "register" ? data.nickname.trim() : (data.nickname.trim() || "ลูกค้า");
    const rawPhoneDigits = data.password.replace(/[^0-9]/g, "");
    const cleanPhone = mode === "register" ? rawPhoneDigits : (rawPhoneDigits || data.password.trim() || "0000000000");

    try {
      let res;
      if (mode === "register") {
        res = await CustomerApi.registerCustomer({
          nickname: cleanNick,
          password: cleanPhone,
          phone: cleanPhone,
        });
      } else {
        res = await CustomerApi.loginCustomer({
          nickname: cleanNick,
          password: cleanPhone,
          phone: cleanPhone,
        });
      }

      if (res.success && res.data) {
        setCustomerSession(res.data);
        toast.success(
          mode === "register"
            ? `ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ ${res.data.nickname}`
            : `ยินดีต้อนรับคุณ ${res.data.nickname}! เข้าสู่ระบบเรียบร้อยแล้ว`
        );
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || (mode === "register" ? "ไม่สามารถลงทะเบียนได้" : "ไม่สามารถเข้าสู่ระบบได้"));
      }
    } catch (err: any) {
      console.error("Customer auth error:", err);
      toast.error(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const currentTitle =
    title || (mode === "register" ? "ลงทะเบียนลูกค้าเพื่อสั่งซื้อ" : "เข้าสู่ระบบลูกค้าเพื่อสั่งซื้อ");
  const currentDescription =
    description ||
    (mode === "register"
      ? "สร้างรหัสผู้ใช้งานและเบอร์โทรศัพท์เพื่อเริ่มสั่งอาหารและรับคิวเครป"
      : "กรุณากรอกรหัสผู้ใช้งานและเบอร์โทรศัพท์สำหรับเข้าสู่ระบบ");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-100 z-10 overflow-hidden"
          >
            {/* เส้นแสงสีตกแต่งด้านบน */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

            {/* ปุ่มปิด X */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="text-center pt-2 mb-4">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner border border-rose-100">
                <Store size={26} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{currentTitle}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed px-2">
                {currentDescription}
              </p>
            </div>

            {/* หากเข้าสู่ระบบอยู่แล้ว แสดงข้อมูลโปรไฟล์พร้อมปุ่มเปลี่ยนผู้ใช้งาน */}
            {customer ? (
              <div className="space-y-4">
                <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {customer.nickname.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-rose-900">เข้าสู่ระบบแล้ว</p>
                    <p className="text-sm font-extrabold text-slate-800 truncate">คุณ {customer.nickname}</p>
                    <p className="text-xs text-slate-500">เบอร์โทรศัพท์: {customer.phone}</p>
                  </div>
                  <CheckCircle2 size={20} className="text-rose-600 shrink-0" />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      reset({ nickname: "", password: "", confirmPassword: "" });
                    }}
                    className="flex-1 py-2.5 px-3 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                  >
                    เปลี่ยนผู้ใช้งาน
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSuccess) onSuccess();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    ดำเนินการสั่งต่อ
                  </button>
                </div>
              </div>
            ) : (
              /* ฟอร์มเข้าสู่ระบบ / ลงทะเบียน */
              <div>
                {/* แถบสลับแท็บ Login / Register */}
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4.5 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("login")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "login"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LogIn size={13} />
                    <span>เข้าสู่ระบบ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("register")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === "register"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <UserPlus size={13} />
                    <span>ลงทะเบียน</span>
                  </button>
                </div>

                {/* ฟอร์ม React Hook Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
                  {/* ช่องรหัสผู้ใช้งาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสผู้ใช้งาน {mode === "register" && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="กรอกชื่อของคุณ"
                        {...register("nickname", mode === "register" ? {
                          required: "กรุณากรอกชื่อของคุณ",
                          minLength: {
                            value: 2,
                            message: "รหัสผู้ใช้งานต้องมีความยาวอย่างน้อย 2 ตัวอักษร",
                          },
                        } : {})}
                        className={`w-full h-11 pl-10 pr-4 bg-slate-50 border rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden transition-all ${
                          mode === "register" && errors.nickname
                            ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                            : "border-slate-200 focus:border-rose-500"
                        }`}
                      />
                    </div>
                    {mode === "register" && errors.nickname && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1 pl-1 flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors.nickname.message}</span>
                      </p>
                    )}
                  </div>

                  {/* ช่องเบอร์โทรศัพท์ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ {mode === "register" && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder={mode === "register" ? "กรอกเบอร์โทรศัพท์ของคุณ" : "กรอกเบอร์โทรศัพท์"}
                        {...register("password", mode === "register" ? {
                          required: "กรุณากรอกเบอร์โทรศัพท์ของคุณ",
                          pattern: {
                            value: /^0[0-9]{8,9}$/,
                            message: "กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง (เช่น 0812345678)",
                          },
                        } : {})}
                        className={`w-full h-11 pl-10 pr-4 bg-slate-50 border rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden transition-all ${
                          mode === "register" && errors.password
                            ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                            : "border-slate-200 focus:border-rose-500"
                        }`}
                      />
                    </div>
                    {mode === "register" && errors.password && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1 pl-1 flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{errors.password.message}</span>
                      </p>
                    )}
                  </div>

                  {/* ช่องยืนยันเบอร์โทรศัพท์ (เฉพาะลงทะเบียน) */}
                  {mode === "register" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ยืนยันเบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="กรอกยืนยันเบอร์โทรศัพท์อีกครั้ง"
                          {...register("confirmPassword", {
                            required: "กรุณากรอกยืนยันเบอร์โทรศัพท์อีกครั้ง",
                            pattern: {
                              value: /^0[0-9]{8,9}$/,
                              message: "กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง (เช่น 0812345678)",
                            },
                            validate: (val) =>
                              val === watch("password") || "เบอร์โทรศัพท์และยืนยันเบอร์โทรศัพท์ไม่ตรงกัน",
                          })}
                          className={`w-full h-11 pl-10 pr-4 bg-slate-50 border rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden transition-all ${
                            errors.confirmPassword
                              ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                              : "border-slate-200 focus:border-rose-500"
                          }`}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1 pl-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.confirmPassword.message}</span>
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ปุ่มส่งข้อมูล Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold rounded-full shadow-lg shadow-rose-600/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{mode === "register" ? "กำลังลงทะเบียน..." : "กำลังเข้าสู่ระบบ..."}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>{mode === "register" ? "ลงทะเบียนและเริ่มสั่งอาหาร" : "เข้าสู่ระบบและเริ่มสั่งอาหาร"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ลิงก์สลับระหว่างโหมด Login และ Register */}
                  <div className="text-center pt-2">
                    {mode === "login" ? (
                      <p className="text-xs text-slate-500">
                        ยังไม่มีบัญชีผู้ใช้งาน?{" "}
                        <button
                          type="button"
                          onClick={() => handleSwitchMode("register")}
                          className="font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2 cursor-pointer transition-colors"
                        >
                          ลงทะเบียนที่นี่
                        </button>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        มีบัญชีผู้ใช้งานแล้ว?{" "}
                        <button
                          type="button"
                          onClick={() => handleSwitchMode("login")}
                          className="font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2 cursor-pointer transition-colors"
                        >
                          เข้าสู่ระบบที่นี่
                        </button>
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
