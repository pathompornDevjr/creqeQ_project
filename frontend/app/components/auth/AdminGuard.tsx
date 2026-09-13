/**
 * @file AdminGuard.tsx
 * @description คอมโพเนนต์ป้องกันเส้นทาง (Route Guard) สำหรับตรวจสอบสิทธิ์การเข้าถึงของผู้ดูแลระบบ (Admin)
 * หากผู้ใช้ยังไม่ได้เข้าสู่ระบบหรือไม่มีบทบาทเป็น 'admin' ระบบจะทำการเปลี่ยนเส้นทางไปยังหน้า /login โดยอัตโนมัติ
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/app/lib/api/auth.api";
import { AdminDashboardSkeleton } from "@/app/components/skeletons/AdminDashboardSkeleton";

/**
 * คอมโพเนนต์ AdminGuard
 * @param children องค์ประกอบ React ย่อยที่จะแสดงผลเมื่อตรวจสอบสิทธิ์ผ่าน
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // สถานะการผ่านการตรวจสอบสิทธิ์
  const [isAuthorized, setIsAuthorized] = useState(false);
  // สถานะกำลังตรวจสอบสิทธิ์
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // ฟังก์ชันตรวจสอบข้อมูลผู้ใช้ปัจจุบันจากเซิร์ฟเวอร์
    async function verifyAdminAuth() {
      try {
        const res = await AuthApi.me();
        if (isMounted) {
          // ตรวจสอบว่าสำเร็จและมีบทบาทเป็น admin หรือไม่
          if (res.success && res.data && res.data.role === "admin") {
            setIsAuthorized(true);
          } else {
            // หากไม่ใช่ admin นำทางไปยังหน้าเข้าสู่ระบบ
            router.replace("/login");
          }
        }
      } catch {
        if (isMounted) {
          // กรณีเกิดข้อผิดพลาดในการดึงข้อมูล นำทางไปยังหน้าเข้าสู่ระบบ
          router.replace("/login");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyAdminAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // หากอยู่ในระหว่างการตรวจสอบ หรือไม่มีสิทธิ์ ให้แสดง Skeleton หน้าต่างโหลด
  if (loading || !isAuthorized) {
    return <AdminDashboardSkeleton />;
  }

  // แสดงผลหน้าเว็บสำหรับ Admin เมื่อผ่านการตรวจสอบสิทธิ์
  return <>{children}</>;
}
