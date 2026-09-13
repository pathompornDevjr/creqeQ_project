/**
 * @file page.tsx
 * @description หน้าแรกสำหรับสั่งเครปออนไลน์และหน้าร้านของลูกค้า (Customer Root Page)
 * เรียกใช้งาน MenuClient ภายใต้ Suspense Boundary พร้อม MenuSkeleton
 */

import { Suspense } from "react";
import { MenuClient, MenuSkeleton } from "@/app/components/customer/MenuClient";

export const metadata = {
  title: "CREPEQ — สั่งเครปออนไลน์และหน้าร้าน",
  description: "ร้านเครป CrepeQ สั่งซื้อเครปแสนอร่อย ติดตามสถานะคิวแบบเรียลไทม์",
};

export default function RootPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuClient />
    </Suspense>
  );
}
