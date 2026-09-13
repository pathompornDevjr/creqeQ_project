"use client";

/**
 * =========================================================================================
 * @file GoogleMapPicker.tsx
 * @description คอมโพเนนต์เลือกและปักหมุดตำแหน่งร้านค้าบนแผนที่ (Interactive Map Picker)
 * 
 * หน้าที่หลัก:
 * - แสดงแผนที่ผ่าน Google Maps Embed พร้อมหมุดปัก (Draggable Pin)
 * - ค้นหาสถานที่ผ่าน OpenStreetMap Nominatim API
 * - ดึงพิกัดปัจจุบันผ่าน Geolocation API (GPS)
 * - แปลงพิกัดเป็นที่อยู่ภาษาไทยอัตโนมัติ (Reverse Geocoding: ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์)
 * =========================================================================================
 */

import { MapPin, Move, Navigation, RotateCcw, Search, Loader2, X, LocateFixed } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

/** โครงสร้างข้อมูลที่อยู่ที่ได้จากการแปลงพิกัด */
export interface AddressDetails {
  addressDetail?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  zipCode?: string;
  displayName?: string;
}

/** Props ของคอมโพเนนต์ GoogleMapPicker */
interface GoogleMapPickerProps {
  /** ละติจูดเริ่มต้น */
  lat?: number;
  /** ลองจิจูดเริ่มต้น */
  lng?: number;
  /** ชื่อร้านค้าสำหรับแสดงป้าย */
  storeName?: string;
  /** ที่อยู่แสดงผล */
  address?: string;
  /** Callback เมื่อมีการเลือกหรือเปลี่ยนตำแหน่ง */
  onLocationSelect?: (lat: number, lng: number, addressDetails?: AddressDetails) => void;
  /** เปิดโหมดให้ผู้ใช้ลากหมุดและค้นหาได้หรือไม่ */
  interactive?: boolean;
  /** คลาสสไตล์เพิ่มเติม */
  className?: string;
}

/**
 * คอมโพเนนต์ GoogleMapPicker
 */
export function GoogleMapPicker({
  lat = 13.736717,
  lng = 100.523186,
  storeName = "ตำแหน่งร้านค้า",
  address = "",
  onLocationSelect,
  interactive = false,
  className,
}: GoogleMapPickerProps) {
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const [pinPos, setPinPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lat !== undefined && lat !== currentLat) setCurrentLat(lat);
    if (lng !== undefined && lng !== currentLng) setCurrentLng(lng);
  }, [lat, lng]);

  const mapEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&z=16&output=embed`;
  const externalMapUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;

  /**
   * สกัดและจำแนกข้อมูลที่อยู่ภาษาไทยจากผลลัพธ์ของ OpenStreetMap Nominatim
   */
  const parseNominatimAddress = (data: any): AddressDetails => {
    const addr = data.address || {};
    const displayName = data.display_name || "";

    // 1. จังหวัด (Province)
    let province = addr.province || addr.state || addr.state_district || addr.region || "";
    if (province.includes("Bangkok") || province.includes("กรุงเทพ")) {
      province = "กรุงเทพมหานคร";
    } else if (province.startsWith("จังหวัด")) {
      province = province.replace("จังหวัด", "").trim();
    }
    if (!province && displayName) {
      const provMatch = displayName.match(/(?:จังหวัด|จ\.)\s*([^\s,]+)/);
      if (provMatch) province = provMatch[1].trim();
    }

    // 2. อำเภอ / เขต (District)
    let district = addr.city_district || addr.district || addr.county || addr.city || "";
    if (!district && displayName) {
      const distMatch = displayName.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s,]+)/);
      if (distMatch) district = distMatch[0].trim();
    }

    // 3. ตำบล / แขวง (Sub-district)
    let subDistrict =
      addr.subdistrict ||
      addr.suburb ||
      addr.quarter ||
      addr.neighbourhood ||
      addr.village ||
      addr.hamlet ||
      addr.town ||
      addr.municipality ||
      "";
    if (!subDistrict && displayName) {
      const subMatch = displayName.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s,]+)/);
      if (subMatch) subDistrict = subMatch[0].trim();
    }

    // 4. รหัสไปรษณีย์ (Postal Code)
    let zipCode = addr.postcode || "";
    if (!zipCode && displayName) {
      const zipMatch = displayName.match(/\b\d{5}\b/);
      if (zipMatch) zipCode = zipMatch[0];
    }

    // 5. รายละเอียดที่อยู่ (เลขที่, อาคาร, ถนน)
    const detailParts: string[] = [];
    if (data.name && data.name !== subDistrict && data.name !== district && data.name !== province) {
      detailParts.push(data.name);
    }
    if (addr.house_number) detailParts.push(addr.house_number);
    if (addr.building) detailParts.push(addr.building);
    if (addr.road) {
      const roadName = addr.road.startsWith("ถนน") || addr.road.startsWith("ถ.") ? addr.road : `ถ.${addr.road}`;
      detailParts.push(roadName);
    }

    let addressDetail = detailParts.join(" ").trim();
    if (!addressDetail && displayName) {
      const parts = displayName.split(",").map((s: string) => s.trim());
      const filteredParts = parts.filter(
        (p: string) =>
          p !== province &&
          p !== district &&
          p !== subDistrict &&
          p !== zipCode &&
          p !== "ประเทศไทย" &&
          p !== "Thailand"
      );
      if (filteredParts.length > 0) {
        addressDetail = filteredParts.slice(0, 2).join(" ");
      }
    }

    return {
      addressDetail: addressDetail || "",
      subDistrict: subDistrict || "",
      district: district || "",
      province: province || "",
      zipCode: zipCode || "",
      displayName: displayName || "",
    };
  };

  /**
   * แปลงพิกัด GPS เป็นข้อมูลที่อยู่ภาษาไทย (Reverse Geocoding)
   */
  const reverseGeocode = async (latitude: number, longitude: number): Promise<AddressDetails> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=th`,
        { headers: { "User-Agent": "QRShop-StoreApp/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        return parseNominatimAddress(data);
      }
    } catch (err) {
      console.warn("Reverse geocode fetch failed, using fallback", err);
    }

    return {
      addressDetail: "",
      subDistrict: "",
      district: "",
      province: "",
      zipCode: "",
      displayName: "",
    };
  };

  /**
   * ดึงพิกัดปัจจุบันของผู้ใช้จาก GPS
   */
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    setIsLocating(true);
    const toastId = toast.loading("กำลังดึงพิกัดตำแหน่งปัจจุบันของคุณ...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));

        setCurrentLat(newLat);
        setCurrentLng(newLng);
        setPinPos({ x: 0, y: 0 });

        const addressDetails = await reverseGeocode(newLat, newLng);

        if (onLocationSelect) {
          onLocationSelect(newLat, newLng, addressDetails);
        }

        setIsLocating(false);
        toast.dismiss(toastId);
        toast.success("ดึงตำแหน่งปัจจุบันและระบุข้อมูลที่อยู่ลงในฟอร์มเรียบร้อยแล้ว!");
      },
      (error) => {
        setIsLocating(false);
        toast.dismiss(toastId);
        let msg = "ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location Permission) ในเบราว์เซอร์";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  /**
   * ค้นหาสถานที่ตามคำค้นหา
   */
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const toastId = toast.loading(`กำลังค้นหา "${searchQuery}"...`);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&accept-language=th&limit=1`,
        { headers: { "User-Agent": "QRShop-StoreApp/1.0" } }
      );

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const top = results[0];
          const newLat = Number(parseFloat(top.lat).toFixed(6));
          const newLng = Number(parseFloat(top.lon).toFixed(6));

          setCurrentLat(newLat);
          setCurrentLng(newLng);
          setPinPos({ x: 0, y: 0 });

          const addressDetails = parseNominatimAddress(top);

          if (onLocationSelect) {
            onLocationSelect(newLat, newLng, addressDetails);
          }

          toast.dismiss(toastId);
          toast.success(`พบตำแหน่งและระบุข้อมูลที่อยู่: ${top.name || searchQuery}`);
          setIsSearching(false);
          return;
        }
      }

      toast.dismiss(toastId);
      toast.error(`ไม่พบผลการค้นหาสำหรับ "${searchQuery}" กรุณาลองคำค้นอื่น`);
    } catch (err) {
      console.warn("Search location error:", err);
      toast.dismiss(toastId);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อค้นหาสถานที่");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * เมื่อลากหมุดบนแผนที่เสร็จสิ้น
   */
  const handleDragEnd = async (_: any, info: any) => {
    setIsDragging(false);
    if (!interactive || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // แปลงระยะเลื่อน Pixel เป็นค่าพิกัด Lat/Lng โดยประมาณ
    const latDelta = -(info.offset.y / height) * 0.006;
    const lngDelta = (info.offset.x / width) * 0.006;

    const newLat = Number((currentLat + latDelta).toFixed(6));
    const newLng = Number((currentLng + lngDelta).toFixed(6));

    setCurrentLat(newLat);
    setCurrentLng(newLng);
    setPinPos({ x: 0, y: 0 });

    const addressDetails = await reverseGeocode(newLat, newLng);

    if (onLocationSelect) {
      onLocationSelect(newLat, newLng, addressDetails);
    }
  };

  /**
   * รีเซ็ตตำแหน่งกลับเป็นค่าเริ่มต้น
   */
  const handleResetLocation = async () => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setPinPos({ x: 0, y: 0 });
    const addressDetails = await reverseGeocode(lat, lng);
    if (onLocationSelect) {
      onLocationSelect(lat, lng, addressDetails);
    }
    toast.success("รีเซ็ตพิกัดตำแหน่งเริ่มต้นเรียบร้อยแล้ว");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── แถบค้นหาและปุ่มพิกัดปัจจุบัน ── */}
      {interactive && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* ช่องค้นหาสถานที่ */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none"
            />
            <input
              type="text"
              placeholder="ค้นหาสถานที่, อาคาร, ซอย, ถนน หรือพิกัด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchLocation();
                }
              }}
              className="w-full pl-9 pr-20 h-10 bg-slate-50 border border-border rounded-xl text-xs sm:text-sm text-text placeholder:text-text-3 outline-none focus:border-brand-500 focus:bg-white transition-all shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-text-3 hover:text-text p-1"
                title="ล้างคำค้นหา"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSearchLocation()}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-2xs flex items-center gap-1 active:scale-95"
            >
              {isSearching ? <Loader2 size={12} className="animate-spin" /> : "ค้นหา"}
            </button>
          </div>

          {/* ปุ่มใช้ตำแหน่ง GPS ปัจจุบัน */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0 disabled:opacity-60"
            title="ใช้พิกัดปัจจุบันจาก GPS ของอุปกรณ์"
          >
            {isLocating ? (
              <Loader2 size={14} className="animate-spin text-brand-600" />
            ) : (
              <LocateFixed size={15} className="text-brand-600" />
            )}
            <span>เลือกตำแหน่งปัจจุบัน</span>
          </button>
        </div>
      )}

      {/* ── กล่องแสดงแผนที่ ── */}
      <div
        ref={containerRef}
        className="relative w-full h-64 sm:h-72 rounded-[18px] overflow-hidden border-2 border-border bg-surface-3 shadow-inner group select-none"
      >
        {/* แผนที่ Google Maps Embed iframe */}
        <iframe
          title={`แผนที่ ${storeName}`}
          width="100%"
          height="100%"
          style={{ border: 0, filter: "contrast(1.02) saturate(1.1)", pointerEvents: "none" }}
          loading="lazy"
          src={mapEmbedUrl}
          className="w-full h-full"
        />

        {/* เส้นเล็งเป้าหมาย Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
          <div className="w-full h-px bg-brand-500" />
          <div className="h-full w-px bg-brand-500 absolute" />
        </div>

        {/* หมุดปัก Draggable Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {interactive ? (
            <motion.div
              drag
              dragConstraints={containerRef}
              dragElastic={0.2}
              dragMomentum={false}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              animate={pinPos}
              className="pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center group/pin z-20"
            >
              {/* Tooltip แนะนำการลากหมุด */}
              <div className="bg-text text-surface text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg mb-1 opacity-90 group-hover/pin:scale-105 transition-transform flex items-center gap-1">
                <Move size={10} /> ลากหมุดเพื่อเปลี่ยนตำแหน่ง
              </div>

              {/* หมุดปักสีแดง */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl border-2 border-white transform -translate-y-1 hover:scale-110 transition-transform">
                  <MapPin size={22} className="text-white fill-white/20" />
                </div>
                <div className="w-4 h-1.5 bg-black/40 rounded-full blur-[1px] mx-auto mt-0.5" />
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center z-20 pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                <MapPin size={20} className="fill-white/20" />
              </div>
              <div className="w-3.5 h-1 bg-black/40 rounded-full blur-[1px] mx-auto mt-0.5" />
            </div>
          )}
        </div>

        {/* ป้ายแสดงพิกัดมุมซ้ายบน */}
        <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-md px-3 py-2 rounded-[12px] border border-border shadow-md flex items-center gap-2 max-w-sm pointer-events-none z-10">
          <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <MapPin size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text truncate">{storeName}</p>
            <p className="text-[10px] text-text-3 font-mono font-bold">
              Lat: {currentLat.toFixed(5)}, Lng: {currentLng.toFixed(5)}
            </p>
          </div>
        </div>

        {/* ปุ่มควบคุมมุมขวาล่าง */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          {interactive && (
            <button
              type="button"
              onClick={handleResetLocation}
              className="bg-surface/90 hover:bg-surface text-text-2 hover:text-text text-xs font-bold px-2.5 py-1.5 rounded-[10px] shadow-md border border-border transition-all flex items-center gap-1"
              title="รีเซ็ตตำแหน่งเดิม"
            >
              <RotateCcw size={13} /> รีเซ็ต
            </button>
          )}
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-[10px] shadow-md transition-all flex items-center gap-1.5"
          >
            เปิดใน Google Maps
          </a>
        </div>
      </div>

      {interactive && (
        <p className="text-[11px] text-brand-600 font-bold flex items-center gap-1.5 px-1">
          <Move size={12} /> สามารถค้นหาสถานที่, กดเลือกตำแหน่งปัจจุบัน หรือใช้เมาส์ลากหมุดปักบนแผนที่เพื่อระบุพิกัดและที่อยู่อัตโนมัติ
        </p>
      )}

      {address && (
        <p className="text-xs text-text-3 flex items-start gap-1.5 font-medium px-1">
          <MapPin size={13} className="mt-0.5 text-brand-600 shrink-0" />
          <span>{address}</span>
        </p>
      )}
    </div>
  );
}
