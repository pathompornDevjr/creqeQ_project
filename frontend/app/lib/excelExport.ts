/**
 * =========================================================================================
 * @file excelExport.ts
 * @description ยูทิลิตี้สำหรับส่งออกข้อมูลสรุปยอดขายร้านค้าเป็นไฟล์ Excel (.xlsx) แบบหลาย Sheet
 * 
 * หน้าที่หลัก:
 * - สร้าง Workbook ด้วยไลบรารี XLSX พร้อมฟอร์แมตข้อมูลภาษาไทยสวยงาม
 * - Sheet 1: สรุปภาพรวมยอดขาย (KPIs, ข้อมูลแยกตามช่วงเวลา, สัดส่วนหมวดหมู่)
 * - Sheet 2: อันดับไส้และเมนูขายดี (Best Sellers)
 * - Sheet 3: อันดับแป้งเครปขายดี (Best-Selling Crusts)
 * - Sheet 4: รายการคำสั่งซื้อทั้งหมด (Order Details)
 * =========================================================================================
 */

import * as XLSX from "xlsx";
import { parseCrepeDetails } from "./utils";

/**
 * โครงสร้างข้อมูลสำหรับส่งออกรายงานสรุปยอดขาย
 */
export interface ExportSummaryData {
  /** ชื่อร้านอาหาร */
  restaurantName?: string;
  /** ช่วงเวลาที่เลือก (daily, weekly, monthly, yearly) */
  timeframe: "daily" | "weekly" | "monthly" | "yearly" | string;
  /** ข้อความแสดงช่วงเวลา เช่น "12 ก.ย. 2569" */
  dateLabel: string;
  /** สถิติภาพรวม */
  stats: {
    revenue: number;
    orders: number;
    avgBill: number;
    peakTime?: string;
    peakDay?: string;
    peakWeek?: string;
    peakMonth?: string;
    growth?: number;
  };
  /** ข้อมูลสำหรับกราฟตามช่วงเวลา */
  chartData: Array<{
    time?: string;
    day?: string;
    month?: string;
    revenue?: number;
    orders?: number;
    [key: string]: any;
  }>;
  /** รายการสินค้า/ไส้ขายดี */
  bestSellers: Array<{
    name: string;
    category?: string;
    unitsSold: number;
    totalRevenue: number;
    percentage: number;
    growth?: number;
  }>;
  /** รายการแป้งเครปขายดี */
  bestCrusts?: Array<{
    name: string;
    category?: string;
    unitsSold: number;
    totalRevenue: number;
    percentage: number;
    growth?: number;
  }>;
  /** สัดส่วนยอดขายตามหมวดหมู่ */
  categoryShare: Array<{
    name: string;
    revenue?: number;
    percentage?: number;
    count?: number;
  }>;
  /** รายการออเดอร์ทั้งหมด */
  orders: Array<any>;
}

/**
 * ฟังก์ชันส่งออกรายงานสรุปยอดขายเป็นไฟล์ Excel (.xlsx) และกระตุ้นการดาวน์โหลดทันที
 * @param data ข้อมูลรายงานสรุปยอดขาย
 */
export function exportSalesSummaryToExcel(data: ExportSummaryData) {
  const wb = XLSX.utils.book_new();
  const shopName = data.restaurantName || "ร้านเครป CrepeQ";
  const exportedAt = new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // -------------------------------------------------------------
  // Sheet 1: สรุปภาพรวมยอดขาย (Overview & Summary)
  // -------------------------------------------------------------
  const peakDisplay =
    (data.timeframe === "daily"
      ? data.stats.peakTime
      : data.timeframe === "weekly"
      ? data.stats.peakDay
      : data.timeframe === "monthly"
      ? data.stats.peakWeek
      : data.stats.peakMonth) || "-";

  const overviewRows: any[][] = [
    [`รายงานสรุปยอดขาย — ${shopName}`],
    [`ช่วงเวลาที่เลือก: ${data.dateLabel}`, "", `วันที่ออกรายงาน: ${exportedAt}`],
    [],
    ["1. สรุปตัวเลขสำคัญ (Key Performance Indicators)"],
    ["ตัวชี้วัด (KPIs)", "ค่าที่ได้", "หน่วย", "หมายเหตุ"],
    ["ยอดขายรวมสุทธิ (Total Revenue)", data.stats.revenue, "บาท", `เติบโต ${data.stats.growth ?? 0}% vs ช่วงก่อนหน้า`],
    ["จำนวนคำสั่งซื้อทั้งหมด (Total Orders)", data.stats.orders, "บิล", ""],
    ["ยอดขายเฉลี่ยต่อบิล (Avg. Bill Size)", Math.round(data.stats.avgBill), "บาท / บิล", ""],
    ["ช่วงเวลา/วันที่ขายดีที่สุด (Peak Period)", peakDisplay, "", ""],
    [],
  ];

  // Section 2: Chart Breakdown Data (ข้อมูลตามช่วงเวลา)
  if (data.chartData && data.chartData.length > 0) {
    const timeColHeader =
      data.timeframe === "daily"
        ? "ช่วงเวลา (ชั่วโมง)"
        : data.timeframe === "weekly"
        ? "วันในสัปดาห์"
        : data.timeframe === "monthly"
        ? "สัปดาห์/วันที่"
        : "เดือน";

    overviewRows.push(["2. ยอดขายแยกตามช่วงเวลา (Sales Breakdown by Time)"]);
    overviewRows.push([timeColHeader, "ยอดขาย (บาท)", "จำนวนบิล (บิล)"]);

    data.chartData.forEach((row) => {
      const label = row.time || row.day || row.month || row.label || "-";
      overviewRows.push([label, Number(row.revenue) || 0, Number(row.orders) || 0]);
    });

    // แถวสรุปผลรวมสำหรับกราฟ
    const totalRev = data.chartData.reduce((acc, r) => acc + (Number(r.revenue) || 0), 0);
    const totalOrd = data.chartData.reduce((acc, r) => acc + (Number(r.orders) || 0), 0);
    overviewRows.push(["รวมทั้งหมด", totalRev, totalOrd]);
    overviewRows.push([]);
  }

  // Section 3: Category Share Breakdown (สัดส่วนตามหมวดหมู่)
  if (data.categoryShare && data.categoryShare.length > 0) {
    overviewRows.push(["3. สัดส่วนยอดขายตามหมวดหมู่ (Category Share)"]);
    overviewRows.push(["หมวดหมู่สินค้า", "ยอดขาย (บาท)", "สัดส่วน (%)"]);

    data.categoryShare.forEach((cat) => {
      overviewRows.push([
        cat.name || "ทั่วไป",
        cat.revenue !== undefined ? Number(cat.revenue) : "-",
        cat.percentage !== undefined ? `${cat.percentage}%` : "-",
      ]);
    });
    overviewRows.push([]);
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);

  // ปรับความกว้างของคอลัมน์ Sheet 1
  wsOverview["!cols"] = [
    { wch: 38 },
    { wch: 20 },
    { wch: 15 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, wsOverview, "สรุปภาพรวมยอดขาย");

  // -------------------------------------------------------------
  // Sheet 2: ไส้และเมนูขายดี (Best Sellers Ranking)
  // -------------------------------------------------------------
  const bestSellerRows: any[][] = [
    [`อันดับไส้และเมนูขายดี — ${shopName}`],
    [`ช่วงเวลา: ${data.dateLabel}`, "", `วันที่ออกรายงาน: ${exportedAt}`],
    [],
    [
      "อันดับ (Rank)",
      "ชื่อเมนู / ไส้เครป",
      "หมวดหมู่",
      "จำนวนที่ขายได้ (ชิ้น)",
      "ยอดขายรวม (บาท)",
      "สัดส่วนยอดขาย (%)",
      "การเติบโต vs ช่วงก่อนหน้า (%)",
    ],
  ];

  if (data.bestSellers && data.bestSellers.length > 0) {
    data.bestSellers.forEach((item, idx) => {
      bestSellerRows.push([
        idx + 1,
        item.name,
        item.category || "ไส้เครป",
        item.unitsSold || 0,
        item.totalRevenue || 0,
        `${item.percentage || 0}%`,
        item.growth !== undefined ? `${item.growth >= 0 ? "+" : ""}${item.growth}%` : "-",
      ]);
    });

    const totalUnits = data.bestSellers.reduce((s, i) => s + (i.unitsSold || 0), 0);
    const totalRev = data.bestSellers.reduce((s, i) => s + (i.totalRevenue || 0), 0);
    bestSellerRows.push([
      "รวมทั้งหมด",
      `รวม ${data.bestSellers.length} เมนู`,
      "",
      totalUnits,
      totalRev,
      "100%",
      "",
    ]);
  } else {
    bestSellerRows.push(["-", "ไม่มีข้อมูลการขายในช่วงเวลานี้", "-", 0, 0, "0%", "-"]);
  }

  const wsBestSellers = XLSX.utils.aoa_to_sheet(bestSellerRows);
  wsBestSellers["!cols"] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBestSellers, "ไส้ขายดี");

  // -------------------------------------------------------------
  // Sheet 3: แป้งเครปขายดี (Best-Selling Crusts Ranking)
  // -------------------------------------------------------------
  const bestCrustRows: any[][] = [
    [`อันดับแป้งเครปขายดี — ${shopName}`],
    [`ช่วงเวลา: ${data.dateLabel}`, "", `วันที่ออกรายงาน: ${exportedAt}`],
    [],
    [
      "อันดับ (Rank)",
      "ชื่อแป้งเครป",
      "หมวดหมู่",
      "จำนวนที่ขายได้ (ชิ้น)",
      "ยอดขายรวม (บาท)",
      "สัดส่วนยอดขาย (%)",
      "การเติบโต vs ช่วงก่อนหน้า (%)",
    ],
  ];

  if (data.bestCrusts && data.bestCrusts.length > 0) {
    data.bestCrusts.forEach((item, idx) => {
      bestCrustRows.push([
        idx + 1,
        item.name,
        item.category || "แป้งเครป",
        item.unitsSold || 0,
        item.totalRevenue || 0,
        `${item.percentage || 0}%`,
        item.growth !== undefined ? `${item.growth >= 0 ? "+" : ""}${item.growth}%` : "-",
      ]);
    });

    const totalCrustUnits = data.bestCrusts.reduce((s, i) => s + (i.unitsSold || 0), 0);
    const totalCrustRev = data.bestCrusts.reduce((s, i) => s + (i.totalRevenue || 0), 0);
    bestCrustRows.push([
      "รวมทั้งหมด",
      `รวม ${data.bestCrusts.length} แป้ง`,
      "",
      totalCrustUnits,
      totalCrustRev,
      "100%",
      "",
    ]);
  } else {
    bestCrustRows.push(["-", "ไม่มีข้อมูลการขายในช่วงเวลานี้", "-", 0, 0, "0%", "-"]);
  }

  const wsBestCrusts = XLSX.utils.aoa_to_sheet(bestCrustRows);
  wsBestCrusts["!cols"] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBestCrusts, "แป้งเครปขายดี");

  // -------------------------------------------------------------
  // Sheet 4: รายการคำสั่งซื้อทั้งหมด (Order Details)
  // -------------------------------------------------------------
  const orderRows: any[][] = [
    [`รายการออเดอร์ทั้งหมด — ${shopName}`],
    [`ช่วงเวลา: ${data.dateLabel}`, "", `วันที่ออกรายงาน: ${exportedAt}`],
    [],
    [
      "ลำดับ",
      "รหัสออเดอร์ (Order ID)",
      "หมายเลขคิว (Queue)",
      "โต๊ะ / ประเภท (Table/Type)",
      "เวลาสั่งซื้อ (Time)",
      "ชื่อลูกค้า (Customer)",
      "เบอร์โทรศัพท์ (Phone)",
      "รายการแป้งและไส้ (Crepe Details)",
      "จำนวนชิ้น (Qty)",
      "ยอดรวม (บาท)",
      "ช่องทางชำระเงิน (Payment Method)",
      "สถานะการชำระ (Payment Status)",
      "สถานะออเดอร์ (Order Status)",
      "หมายเหตุ (Note)",
    ],
  ];

  if (data.orders && data.orders.length > 0) {
    data.orders.forEach((ord, idx) => {
      const orderIdDisplay = ord.orderNumber || (ord.id ? `#ORD-${String(ord.id).replace(/\D/g, "").slice(-4)}` : `#ORD-${idx + 1}`);
      const queueDisplay = ord.queueNumber || (ord.id ? `A${String(ord.id).replace(/\D/g, "").slice(-3).padStart(3, "0")}` : "A001");
      const tableDisplay = ord.tableNumber ? `โต๊ะ ${ord.tableNumber}` : (ord.tableId ? `โต๊ะ ${ord.tableId}` : "กลับบ้าน/ออนไลน์");
      const orderTime = ord.createdAt ? new Date(ord.createdAt).toLocaleString("th-TH") : (ord.confirmedAt || "-");

      const rawItems = Array.isArray(ord.items) ? ord.items : [];
      const totalItemQty = rawItems.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 1;

      const itemSummaryTexts: string[] = [];
      const notesList: string[] = [];

      rawItems.forEach((it: any, itIdx: number) => {
        const details = parseCrepeDetails(it);
        const itemQty = it.quantity ? ` x${it.quantity}` : "";
        itemSummaryTexts.push(`${itIdx + 1}. [${details.crust}] ไส้: ${details.toppings}${itemQty}`);
        if (details.note) {
          notesList.push(details.note);
        }
      });

      const itemsText = itemSummaryTexts.length > 0 ? itemSummaryTexts.join("\n") : (ord.itemName || "เมนูเครป");
      const combinedNotes = notesList.length > 0 ? notesList.join(", ") : (ord.note || ord.remark || "-");

      const payMethodDisplay =
        ord.paymentMethod === "promptpay" || ord.payment_method === "promptpay"
          ? "พร้อมเพย์ (PromptPay)"
          : ord.paymentMethod === "cash" || ord.payment_method === "cash"
          ? "เงินสด (Cash)"
          : ord.paymentMethod || "พร้อมเพย์";

      const payStatusDisplay =
        ord.paymentStatus === "paid" || ord.payment_status === "paid" || ord.status === "completed"
          ? "ชำระเงินแล้ว"
          : "รอดำเนินการ";

      const orderStatusDisplay =
        ord.status === "completed"
          ? "เสร็จสิ้น / รับอาหารแล้ว"
          : ord.status === "ready"
          ? "พร้อมรับอาหาร"
          : ord.status === "cooking" || ord.status === "preparing"
          ? "กำลังปรุง"
          : ord.status === "confirmed"
          ? "ยืนยันแล้ว"
          : ord.status === "cancelled"
          ? "ยกเลิก"
          : "รอยืนยัน";

      orderRows.push([
        idx + 1,
        orderIdDisplay,
        queueDisplay,
        tableDisplay,
        orderTime,
        ord.customerNickname || ord.customerName || "-",
        ord.customerPhone || "-",
        itemsText,
        totalItemQty,
        Number(ord.total || ord.totalAmount) || 0,
        payMethodDisplay,
        payStatusDisplay,
        orderStatusDisplay,
        combinedNotes,
      ]);
    });

    const totalOrdersSum = data.orders.reduce((s, o) => s + (Number(o.total || o.totalAmount) || 0), 0);
    orderRows.push([
      "รวมทั้งหมด",
      `รวม ${data.orders.length} ออเดอร์`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalOrdersSum,
      "",
      "",
      "",
      "",
    ]);
  } else {
    orderRows.push(["-", "ไม่มีรายการออเดอร์ในช่วงเวลานี้", "-", 0, 0, "-", "-", "-", 0, 0, "-", "-", "-", "-"]);
  }

  const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
  wsOrders["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 45 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, "รายการคำสั่งซื้อ");

  // -------------------------------------------------------------
  // สร้างชื่อไฟล์และสั่งดาวน์โหลด
  // -------------------------------------------------------------
  const cleanDateStr = data.dateLabel.replace(/[\s\(\)\:\/\\\,\.\-]/g, "_");
  const fileName = `รายงานยอดขาย_${cleanDateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
