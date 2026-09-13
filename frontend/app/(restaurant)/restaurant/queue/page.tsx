/**
 * @file page.tsx (Restaurant Queue Page)
 * @description หน้าแดชบอร์ดจัดการคิวคำสั่งซื้อของร้านค้า (Restaurant Live Queue Management Page)
 * เรียกใช้งาน QueueClient
 */

import { QueueClient } from "./QueueClient";

export default function QueuePage() {
  return <QueueClient />;
}
