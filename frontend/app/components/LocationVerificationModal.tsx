"use client";

/**
 * =========================================================================================
 * @file LocationVerificationModal.tsx
 * @description คอมโพเนนต์หน้าต่างตรวจสอบตำแหน่ง GPS ของลูกค้าก่อนสั่งอาหาร (Geo-fencing Modal)
 * 
 * หน้าที่หลัก:
 * - ตรวจสอบตำแหน่งพิกัด GPS ของผู้ใช้เทียบกับพิกัดร้านอาหารด้วยสูตร Haversine (calculateDistanceKm)
 * - ป้องกันการสั่งอาหารจากนอกบริเวณร้าน (ค่าเริ่มต้นระยะห่างสูงสุด 1.0 กิโลเมตร)
 * - รองรับกรณี GPS ขัดข้อง, ผู้ใช้ปฏิเสธสิทธิ์ (Denied) และมีคำแนะนำการแก้ไขอย่างละเอียด
 * =========================================================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MapPinOff, AlertTriangle, Loader2, Navigation, ShieldCheck, X } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { calculateDistanceKm } from "@/app/lib/utils";

/** Props ของคอมโพเนนต์ LocationVerificationModal */
interface LocationVerificationModalProps {
  /** ควบคุมการเปิด/ปิด Modal */
  isOpen: boolean;
  /** ฟังก์ชันเมื่อสั่งปิด Modal */
  onClose: () => void;
  /** ละติจูดของร้านค้า */
  restaurantLat?: number | string;
  /** ลองจิจูดของร้านค้า */
  restaurantLng?: number | string;
  /** ชื่อร้านอาหาร */
  restaurantName?: string;
  /** ระยะห่างสูงสุดที่อนุญาต (กิโลเมตร) ค่าเริ่มต้น 1.0 km */
  maxDistanceKm?: number;
  /** Callback เมื่อตรวจสอบตำแหน่งผ่านแล้ว */
  onVerified: (coords: { lat: number; lng: number; distanceKm: number }) => void;
}

/**
 * คอมโพเนนต์ LocationVerificationModal
 */
export function LocationVerificationModal({
  isOpen,
  onClose,
  restaurantLat,
  restaurantLng,
  restaurantName = "ร้านอาหาร",
  maxDistanceKm = 1.0,
  onVerified,
}: LocationVerificationModalProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "denied" | "out_of_range" | "unsupported">("idle");
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  /**
   * ร้องขอพิกัด GPS จากเบราว์เซอร์และคำนวณระยะห่าง
   */
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setErrorMessage("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    setStatus("checking");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const targetLat = Number(restaurantLat);
        const targetLng = Number(restaurantLng);

        // หากร้านไม่ได้ตั้งพิกัด ให้ผ่านได้โดยตรง
        if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng) || (targetLat === 0 && targetLng === 0)) {
          onVerified({ lat: userLat, lng: userLng, distanceKm: 0 });
          return;
        }

        const distance = calculateDistanceKm(userLat, userLng, targetLat, targetLng);
        setCurrentDistance(distance);

        if (distance > maxDistanceKm) {
          setStatus("out_of_range");
        } else {
          onVerified({ lat: userLat, lng: userLng, distanceKm: distance });
        }
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setStatus("denied");
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage("คุณปฏิเสธการเข้าถึงตำแหน่ง กรุณากดอนุญาตสิทธิ์ตำแหน่งในเบราว์เซอร์");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage("ไม่สามารถค้นหาสัญญาณตำแหน่งของคุณได้ในขณะนี้ กรุณาเปิด GPS และลองใหม่");
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage("การค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
        } else {
          setErrorMessage("เกิดข้อผิดพลาดในการระบุตำแหน่ง กรุณาลองใหม่อีกครั้ง");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (status !== "checking") onClose();
          }}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="relative w-full max-w-sm bg-surface rounded-[24px] overflow-hidden shadow-2xl border border-border p-6 z-10 space-y-5"
        >
          {/* ปุ่มปิด */}
          {status !== "checking" && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-3 hover:text-text hover:bg-surface-3 transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {/* 1. สถานะ IDLE เริ่มต้น */}
          {status === "idle" && (
            <div className="text-center space-y-4 pt-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shadow-xs">
                <MapPin size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-text">
                  ยืนยันตำแหน่งก่อนสั่งอาหาร
                </h3>
                <p className="text-xs text-text-2 leading-relaxed px-1">
                  เพื่อความปลอดภัยและป้องกันการสั่งอาหารผิดโต๊ะหรือการสั่งจากนอกร้าน ระบบจำเป็นต้องตรวจสอบตำแหน่งของคุณเพื่อยืนยันว่าคุณอยู่ที่{" "}
                  <span className="font-semibold text-text">{restaurantName}</span>
                </p>
              </div>

              <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center gap-2.5 text-left text-xs text-brand-900">
                <ShieldCheck size={18} className="text-brand-600 shrink-0" />
                <span>ตำแหน่งของคุณจะถูกใช้เพื่อยืนยันระยะการสั่งอาหารเท่านั้น</span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleRequestLocation}
                  className="w-full h-11 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Navigation size={16} />
                  อนุญาตการเข้าถึงตำแหน่ง
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-9 text-xs text-text-3 hover:text-text"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}

          {/* 2. สถานะกำลังตรวจหาพิกัด GPS */}
          {status === "checking" && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text">กำลังตรวจสอบตำแหน่ง...</h3>
                <p className="text-xs text-text-3">กรุณารอสักครู่ ระบบกำลังยืนยันว่าคุณอยู่ที่ร้านอาหาร</p>
              </div>
            </div>
          )}

          {/* 3. สถานะถูกปฏิเสธสิทธิ์หรือเกิดข้อผิดพลาด */}
          {status === "denied" && (
            <div className="text-center space-y-4 pt-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-xs">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-text">ไม่สามารถเข้าถึงตำแหน่งได้</h3>
                <p className="text-xs text-text-2 leading-relaxed px-1">
                  {errorMessage || "ระบบไม่สามารถส่งออเดอร์ได้เนื่องจากยังไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง"}
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-left text-[11px] text-amber-950 dark:text-amber-200 space-y-1.5 shadow-2xs">
                <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600 shrink-0" />
                  วิธีแก้ไขเมื่อไม่สามารถระบุตำแหน่งได้:
                </p>
                <ul className="space-y-1 pl-4 list-disc text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  <li>
                    <strong className="font-bold text-amber-950 dark:text-amber-100">หากขึ้นเตือน "มีแอปอื่นเปิดทับหน้าจออยู่":</strong> ปิดไอคอนลอย (เช่น Messenger Chat Head, แอปอัดหน้าจอ หรือแอปปรับแสง) หรือลากปิดให้เรียบร้อยก่อนกดลองใหม่
                  </li>
                  <li>
                    <strong className="font-bold text-amber-950 dark:text-amber-100">กรณีเปิดสิทธิ์ตำแหน่ง:</strong> แตะไอคอนแม่กุญแจ/แถบ URL ด้านบนเบราว์เซอร์ แล้วเลือก "อนุญาตตำแหน่ง"
                  </li>
                  <li>
                    <strong className="font-bold text-amber-950 dark:text-amber-100">เปิดผ่านเบราว์เซอร์หลัก:</strong> แตะปุ่ม (⋯) แล้วเลือก "เปิดด้วย Safari / Chrome"
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleRequestLocation}
                  className="w-full h-11 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Navigation size={16} />
                  ลองใหม่อีกครั้ง
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-9 text-xs text-text-3"
                >
                  ปิด
                </Button>
              </div>
            </div>
          )}

          {/* 4. สถานะอยู่นอกพื้นที่ */}
          {status === "out_of_range" && (
            <div className="text-center space-y-4 pt-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-xs">
                <MapPinOff size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-text">อยู่นอกพื้นที่ให้บริการของร้าน</h3>
                <p className="text-xs text-text-2 leading-relaxed">
                  ตำแหน่งของคุณอยู่ห่างจากร้านอาหารประมาณ{" "}
                  <span className="font-bold text-red-600">
                    {currentDistance !== null
                      ? currentDistance < 1
                        ? `${Math.round(currentDistance * 1000)} เมตร`
                        : `${currentDistance.toFixed(2)} กม.`
                      : ""}
                  </span>{" "}
                  (เกินระยะที่กำหนด {maxDistanceKm * 1000 >= 1000 ? `${maxDistanceKm} กม.` : `${maxDistanceKm * 1000} ม.`})
                </p>
              </div>

              <p className="text-[11px] text-text-3 bg-surface-2 p-2.5 rounded-xl border border-border">
                ระบบอนุญาตให้สั่งอาหารเฉพาะผู้ที่กำลังใช้บริการในบริเวณร้านอาหารเท่านั้น เพื่อป้องกันการสั่งผิดโต๊ะ
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={handleRequestLocation}
                  variant="secondary"
                  className="w-full h-11 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Navigation size={16} />
                  ตรวจสอบตำแหน่งอีกครั้ง
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-9 text-xs text-text-3"
                >
                  ปิด
                </Button>
              </div>
            </div>
          )}

          {/* 5. สถานะเบราว์เซอร์ไม่รองรับ */}
          {status === "unsupported" && (
            <div className="text-center space-y-4 pt-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text">อุปกรณ์ไม่รองรับ GPS</h3>
                <p className="text-xs text-text-3">กรุณาเปิดลิงก์สั่งอาหารผ่านเบราว์เซอร์มาตรฐาน (Chrome หรือ Safari)</p>
              </div>
              <Button onClick={onClose} className="w-full h-10 text-xs font-bold">
                ปิด
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
