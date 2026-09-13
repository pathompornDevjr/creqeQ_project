/**
 * @file loading.tsx
 * @description คอมโพเนนต์แสดงผลหน้าจอ Loading สากลของ Root Layout
 */

import { Loading } from "@/app/components/ui/Loading";

export default function GlobalLoading() {
  return (
    <Loading
      title="QOrder"
      message="กำลังโหลดข้อมูลระบบจัดการร้านค้าครบวงจร..."
      variant="teal"
      fullscreen={true}
    />
  );
}
