/**
 * @file page.tsx (Restaurant Summary Page)
 * @description หน้ารายงานสรุปยอดขาย ประวัติคำสั่งซื้อ และสถิติของร้านค้า (Restaurant Sales & Order Summary Page)
 * เรียกใช้งาน SummaryClient
 */

import { SummaryClient } from "./SummaryClient";

export default function SummaryPage() {
  return <SummaryClient />;
}
