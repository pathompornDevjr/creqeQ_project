/**
 * @file page.tsx (Restaurant Index)
 * @description รูทเริ่มต้นของส่วนร้านค้า ทำการ Redirect ไปยังหน้าจัดการคิว (/restaurant/queue) โดยอัตโนมัติ
 */

import { redirect } from "next/navigation";

export default function RestaurantRoot() {
  redirect("/restaurant/queue");
}
