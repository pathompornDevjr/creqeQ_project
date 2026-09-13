/**
 * @file SummaryClient.tsx
 * @description คอมโพเนนต์หน้าแดชบอร์ดรายงานสรุปยอดขาย (Restaurant Sales Summary & Analytics)
 * แสดงสถิติภาพรวมรายวัน รายสัปดาห์ รายเดือน รายปี กราฟแนวโน้มรายได้ รายการเมนูและแป้งขายดี
 * ตารางประวัติออเดอร์พร้อมฟิลเตอร์ค้นหา และการส่งออกข้อมูลเป็นไฟล์ Excel (.xlsx)
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { StatCard } from "@/app/components/ui/Card";
import { Badge, orderStatusBadge } from "@/app/components/ui/Badge";
import { Pagination } from "@/app/components/ui/Pagination";
import { SafeImage } from "@/app/components/ui/SafeImage";
import { RestaurantApi, RestaurantStatsDTO } from "@/app/lib/api";
import { formatPrice, cn, formatDriveImageUrl, parseCrepeDetails } from "@/app/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Banknote,
  Clock,
  ShoppingBag,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Flame,
  Award,
  ChefHat,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Sparkles,
  Utensils,
  FileSpreadsheet,
  Loader2,
  CreditCard,
  Wallet,
  ListOrdered,
  Eye,
  Receipt,
  Phone,
  Download,
  ZoomIn,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Check,
  ImageIcon,
  User,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { RestaurantSummarySkeleton } from "@/app/components/skeletons/RestaurantSummarySkeleton";
import { exportSalesSummaryToExcel } from "@/app/lib/excelExport";

/** ช่วงเวลาในการแสดงผลรายงานยอดขาย */
type Timeframe = "daily" | "weekly" | "monthly" | "yearly";

/** อินเตอร์เฟซรายการเมนูขายดี */
interface BestSellerItem {
  id: string;
  name: string;
  category: string;
  image?: string;
  price: number;
  unitsSold: number;
  totalRevenue: number;
  percentage: number;
  growth: number;
}

export function SummaryClient() {
  // สถานะช่วงเวลาที่เลือก (รายวัน, รายสัปดาห์, รายเดือน, รายปี)
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");

  // พารามิเตอร์เลือกวันที่ เดือน ปี
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // สถานะข้อมูลสถิติที่ดึงมาจาก API
  const [activeData, setActiveData] = useState<{
    stats: { revenue: number; orders: number; avgBill: number; peakTime?: string; peakDay?: string; peakWeek?: string; peakMonth?: string; growth: number };
    chartData: any[];
    bestSellers: BestSellerItem[];
    bestCrusts: BestSellerItem[];
    categoryShare: any[];
    orders: any[];
  }>({
    stats: { revenue: 0, orders: 0, avgBill: 0, peakTime: "-", growth: 0 },
    chartData: [],
    bestSellers: [],
    bestCrusts: [],
    categoryShare: [],
    orders: [],
  });

  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [slipLightboxUrl, setSlipLightboxUrl] = useState<string | null>(null);

  /** แปลงวิธีการชำระเงินเป็นข้อความภาษาไทย */
  const paymentMethodLabel = (method?: string): string => {
    switch ((method || "").toLowerCase()) {
      case "promptpay": return "พร้อมเพย์";
      case "cash": return "เงินสด";
      case "card": return "บัตรเครดิต";
      case "transfer": return "โอนเงิน";
      case "qr": return "QR Code";
      default: return method || "พร้อมเพย์";
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let ordersToExport = recentOrders;
      try {
        const fullOrdersRes = await RestaurantApi.getOrders(undefined, undefined, timeframe === "daily" ? selectedDay : undefined);
        if (fullOrdersRes.success && Array.isArray(fullOrdersRes.data) && fullOrdersRes.data.length > 0) {
          ordersToExport = fullOrdersRes.data;
        }
      } catch (err) {
        console.warn("Could not fetch full orders list for excel, using recent orders", err);
      }

      exportSalesSummaryToExcel({
        timeframe,
        dateLabel: dateDisplayLabel,
        stats: activeData.stats,
        chartData: activeData.chartData,
        bestSellers: activeData.bestSellers,
        bestCrusts: activeData.bestCrusts,
        categoryShare: activeData.categoryShare,
        orders: ordersToExport,
      });

      toast.success("ดาวน์โหลดรายงานยอดขาย Excel เรียบร้อยแล้ว", {
        description: `ช่วงเวลา: ${dateDisplayLabel}`,
      });
    } catch (err) {
      console.error("Export Excel error", err);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Load live data from API
  useEffect(() => {
    async function loadSummaryData() {
      setLoading(true);
      try {
        const summaryRes = await RestaurantApi.getSummary({
          timeframe,
          day: selectedDay,
          month: selectedMonth,
          year: selectedYear,
        });

        if (summaryRes.success && summaryRes.data) {
          let ordersList = Array.isArray(summaryRes.data.orders) ? summaryRes.data.orders : [];
          if (ordersList.length === 0) {
            try {
              const fallbackOrders = await RestaurantApi.getRecentOrders();
              if (fallbackOrders.success && Array.isArray(fallbackOrders.data)) {
                ordersList = fallbackOrders.data;
              }
            } catch (err) {
              console.warn("Could not fetch fallback orders", err);
            }
          }

          setActiveData({
            stats: summaryRes.data.stats || { revenue: 0, orders: 0, avgBill: 0, peakTime: "-", growth: 0 },
            chartData: summaryRes.data.chartData || [],
            bestSellers: summaryRes.data.bestSellers || [],
            bestCrusts: summaryRes.data.bestCrusts || [],
            categoryShare: summaryRes.data.categoryShare || [],
            orders: ordersList,
          });

          setRecentOrders(ordersList);
        }
      } catch (err) {
        console.warn("Could not load restaurant summary from API", err);
      } finally {
        setLoading(false);
      }
    }

    loadSummaryData();
  }, [timeframe, selectedDay, selectedMonth, selectedYear]);

  // Format date display label
  const dateDisplayLabel = useMemo(() => {
    if (timeframe === "daily") {
      const [y, m, d] = selectedDay.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (timeframe === "weekly") {
      const curr = new Date(selectedDay || new Date());
      const day = curr.getDay();
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(curr.setDate(diff));
      const sun = new Date(curr.setDate(diff + 6));
      return `สัปดาห์นี้ (${mon.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${sun.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (timeframe === "monthly") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const date = new Date(y, m - 1, 1);
      return `เดือน ${date.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`;
    }
    if (timeframe === "yearly") {
      return `ปี พ.ศ. ${Number(selectedYear) + 543} (${selectedYear})`;
    }
    return "";
  }, [timeframe, selectedDay, selectedMonth, selectedYear]);

  // Pagination State (10 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter orders by status and search query
  const displayedOrders = useMemo(() => {
    return recentOrders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && order.status !== "pending" && order.status !== "confirmed") return false;
        if (statusFilter === "cooking" && order.status !== "cooking" && order.status !== "preparing") return false;
        if (statusFilter === "ready" && order.status !== "ready" && order.status !== "served") return false;
        if (statusFilter === "paid" && order.status !== "paid" && order.status !== "completed") return false;
        if (statusFilter === "cancelled" && order.status !== "cancelled") return false;
      }
      // 2. Search Query
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const idMatch = String(order.id || "").toLowerCase().includes(q);
        const queueMatch = String(order.queueNumber || "").toLowerCase().includes(q);
        const customerMatch = String(order.customerNickname || "").toLowerCase().includes(q);
        const phoneMatch = String(order.customerPhone || "").includes(q);
        const itemsMatch = (order.items || []).some((it: any) => {
          const details = parseCrepeDetails(it);
          return details.crust.toLowerCase().includes(q) || details.toppings.toLowerCase().includes(q);
        });
        if (!idMatch && !queueMatch && !customerMatch && !phoneMatch && !itemsMatch) {
          return false;
        }
      }
      return true;
    });
  }, [recentOrders, statusFilter, orderSearchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, orderSearchQuery, timeframe, selectedDay, selectedMonth, selectedYear]);

  // Paginated records for table view
  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedOrders, currentPage]);

  // Count orders per status category for badge display
  const statusCounts = useMemo(() => {
    const counts = {
      all: recentOrders.length,
      pending: 0,
      cooking: 0,
      ready: 0,
      paid: 0,
      cancelled: 0,
    };
    recentOrders.forEach((order) => {
      const st = String(order.status || "").toLowerCase();
      const ps = String(order.paymentStatus || "").toLowerCase();
      if (st === "pending" || st === "confirmed") counts.pending++;
      else if (st === "cooking" || st === "preparing") counts.cooking++;
      else if (st === "ready" || st === "served") counts.ready++;
      else if (st === "cancelled") counts.cancelled++;

      if (ps === "paid" || st === "paid" || st === "completed") {
        counts.paid++;
      }
    });
    return counts;
  }, [recentOrders]);

  const STATUS_OPTIONS = useMemo(() => [
    {
      value: "all",
      label: "สถานะ: ทั้งหมด",
      shortLabel: "ทั้งหมด",
      dotClass: "bg-zinc-400",
    },
    {
      value: "pending",
      label: "สถานะ: รอยืนยัน",
      shortLabel: "รอยืนยัน",
      dotClass: "bg-amber-500",
    },
    {
      value: "cooking",
      label: "สถานะ: กำลังทำ",
      shortLabel: "กำลังทำ",
      dotClass: "bg-blue-500",
    },
    {
      value: "ready",
      label: "สถานะ: เสร็จแล้ว",
      shortLabel: "เสร็จแล้ว",
      dotClass: "bg-emerald-500",
    },
    {
      value: "paid",
      label: "สถานะ: ชำระแล้ว",
      shortLabel: "ชำระแล้ว",
      dotClass: "bg-brand-500",
    },
    {
      value: "cancelled",
      label: "สถานะ: ยกเลิก",
      shortLabel: "ยกเลิก",
      dotClass: "bg-rose-500",
    },
  ], []);

  const selectedStatusOption = STATUS_OPTIONS.find((opt) => opt.value === statusFilter) || STATUS_OPTIONS[0];

  // Available years for yearly picker
  const currentYearNum = new Date().getFullYear();
  const AVAILABLE_YEARS = [String(currentYearNum - 2), String(currentYearNum - 1), String(currentYearNum), String(currentYearNum + 1)];

  if (loading) {
    return <RestaurantSummarySkeleton />;
  }

  return (
    <div className="w-full min-h-full flex flex-col p-3 sm:p-4 lg:p-6 gap-4 sm:gap-5 pb-32 lg:pb-12 overflow-x-hidden">

      {/* ── Top Header & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-[20px] border border-border shadow-xs">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-text flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp size={20} />
            </span>
            <span>สรุปยอดขาย & ไส้ขายดี</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-3 mt-1 flex items-center gap-1.5 font-medium">
            <Clock size={13} className="text-brand-600 shrink-0" />
            <span suppressHydrationWarning>{dateDisplayLabel}</span>
          </p>
        </div>


        {/* Timeframe Filter Tabs – scrollable on very small screens */}
        <div className="flex items-center gap-0.5 bg-surface-2 p-1 rounded-2xl border border-border/80 overflow-x-auto shrink-0 w-full sm:w-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: "daily", label: "รายวัน" },
            { id: "weekly", label: "สัปดาห์" },
            { id: "monthly", label: "รายเดือน" },
            { id: "yearly", label: "รายปี" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id as Timeframe)}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer min-w-[68px] text-center",
                timeframe === tab.id
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-text-3 hover:text-text hover:bg-surface"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Period Picker Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 sm:px-4 sm:py-3 rounded-[18px] border border-border text-xs shadow-xs">

        {/* Left: icon + label */}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-brand-600 shrink-0" />
          <span className="font-bold text-text">
            {timeframe === "daily" ? "เลือกวันที่:" :
              timeframe === "weekly" ? "ช่วงสัปดาห์:" :
                timeframe === "monthly" ? "เลือกเดือน:" : "เลือกปี:"}
          </span>
          {timeframe === "weekly" && (
            <span className="font-extrabold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200" suppressHydrationWarning>
              {dateDisplayLabel}
            </span>
          )}
        </div>

        {/* Right: picker controls & view mode */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Order Count Badge */}
          <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl shrink-0">
            <ListOrdered size={13} className="text-brand-600" />
            <span className="text-xs font-bold text-brand-700">{recentOrders.length} ออเดอร์</span>
          </div>

          {/* Daily: date picker */}
          {timeframe === "daily" && (
            <div className="flex items-center gap-2">
              <input
                id="daily-picker"
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="h-8 px-2.5 rounded-xl border border-border bg-surface text-text text-xs font-bold
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 cursor-pointer
                           appearance-none [color-scheme:light] dark:[color-scheme:dark]"
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const d = new Date(selectedDay);
                    d.setDate(d.getDate() - 1);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    const d = new Date(selectedDay);
                    d.setDate(d.getDate() + 1);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="วันถัดไป"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Weekly: week picker & navigation */}
          {timeframe === "weekly" && (
            <div className="flex items-center gap-2">
              <input
                id="weekly-picker"
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="h-8 px-2.5 rounded-xl border border-border bg-surface text-text text-xs font-bold
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 cursor-pointer
                           appearance-none [color-scheme:light] dark:[color-scheme:dark]"
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const d = new Date(selectedDay);
                    d.setDate(d.getDate() - 7);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="สัปดาห์ก่อนหน้า"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    const d = new Date(selectedDay);
                    d.setDate(d.getDate() + 7);
                    setSelectedDay(d.toISOString().slice(0, 10));
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="สัปดาห์ถัดไป"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Monthly: month picker */}
          {timeframe === "monthly" && (
            <div className="flex items-center gap-2">
              <input
                id="monthly-picker"
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="h-8 px-2.5 rounded-xl border border-border bg-surface text-text text-xs font-bold
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 cursor-pointer
                           appearance-none [color-scheme:light] dark:[color-scheme:dark]"
              />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const [y, m] = selectedMonth.split("-").map(Number);
                    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
                    setSelectedMonth(prev);
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    const [y, m] = selectedMonth.split("-").map(Number);
                    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
                    setSelectedMonth(next);
                  }}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all"
                  title="เดือนถัดไป"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Yearly: year select */}
          {timeframe === "yearly" && (
            <div className="flex items-center gap-2">
              <select
                id="yearly-picker"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-8 px-2.5 pr-7 rounded-xl border border-border bg-surface text-text text-xs font-bold
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 cursor-pointer"
              >
                {AVAILABLE_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    ปี {Number(yr) + 543} ({yr})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    const idx = AVAILABLE_YEARS.indexOf(selectedYear);
                    if (idx > 0) setSelectedYear(AVAILABLE_YEARS[idx - 1]);
                  }}
                  disabled={AVAILABLE_YEARS.indexOf(selectedYear) === 0}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="ปีก่อนหน้า"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    const idx = AVAILABLE_YEARS.indexOf(selectedYear);
                    if (idx < AVAILABLE_YEARS.length - 1) setSelectedYear(AVAILABLE_YEARS[idx + 1]);
                  }}
                  disabled={AVAILABLE_YEARS.indexOf(selectedYear) === AVAILABLE_YEARS.length - 1}
                  className="p-1.5 rounded-lg bg-surface-2 border border-border hover:bg-brand-50 hover:text-brand-600 text-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="ปีถัดไป"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Current period reset button (not for weekly) */}
          {timeframe !== "weekly" && (
            <button
              onClick={() => {
                const now = new Date();
                setSelectedDay(now.toISOString().split("T")[0]);
                setSelectedMonth(now.toISOString().slice(0, 7));
                setSelectedYear(String(now.getFullYear()));
              }}
              className="h-8 px-3 rounded-xl bg-surface-2 hover:bg-brand-50 text-text hover:text-brand-600 border border-border font-bold text-[11px] transition-all cursor-pointer"
            >
              ปัจจุบัน
            </button>
          )}

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="ส่งออกรายงานยอดขายเป็นไฟล์ Excel (.xlsx)"
          >
            {isExporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={13} />
            )}
            <span>{isExporting ? "กำลังออกรายงาน..." : "ออกรายงาน Excel"}</span>
          </button>

          {/* Selected period display badge */}
          <span className="hidden sm:inline font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200" suppressHydrationWarning>
            {dateDisplayLabel}
          </span>
        </div>
      </div>

      {/* ── Stats Grid Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={
            timeframe === "daily" ? "ยอดขายวันนี้" :
              timeframe === "weekly" ? "ยอดขายสัปดาห์นี้" :
                timeframe === "monthly" ? "ยอดขายเดือนนี้" : "ยอดขายทั้งปี"
          }
          value={formatPrice(activeData.stats.revenue)}
          icon={<Banknote size={20} />}
          trend={activeData.stats.growth !== 0 ? { value: activeData.stats.growth, label: "vs ช่วงก่อนหน้า" } : undefined}
          accent
        />
        <StatCard
          label={
            timeframe === "daily" ? "ออเดอร์วันนี้" :
              timeframe === "weekly" ? "ออเดอร์สัปดาห์นี้" :
                timeframe === "monthly" ? "ออเดอร์เดือนนี้" : "ออเดอร์ทั้งปี"
          }
          value={`${activeData.stats.orders.toLocaleString()} บิล`}
          icon={<ShoppingBag size={20} />}
          trend={activeData.stats.growth !== 0 ? { value: activeData.stats.growth, label: "vs ช่วงก่อนหน้า" } : undefined}
        />
        <StatCard
          label="ยอดเฉลี่ยต่อบิล"
          value={formatPrice(activeData.stats.avgBill)}
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label={
            timeframe === "daily" ? "ช่วงเวลาขายดีสุด" :
              timeframe === "weekly" ? "วันที่ขายดีสุด" :
                timeframe === "monthly" ? "สัปดาห์ที่ขายดีสุด" : "เดือนที่ขายดีสุด"
          }
          value={
            (timeframe === "daily" ? activeData.stats.peakTime :
              timeframe === "weekly" ? activeData.stats.peakDay :
                timeframe === "monthly" ? activeData.stats.peakWeek : activeData.stats.peakMonth) || "-"
          }
          icon={<Flame size={20} className="text-amber-500" />}
        />
      </div>

      {/* ── Main Content Grid: Charts (7 cols) + Best Sellers (5 cols) ────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">

        {/* Left Column: Sales Trend Chart & Category Share (7 cols) */}
        <div className="md:col-span-7 space-y-4 sm:space-y-5">

          {/* Sales Chart Card */}
          <div className="bg-surface rounded-[20px] border border-border p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                  <BarChartIcon size={16} className="text-brand-600 shrink-0" />
                  <span>
                    {timeframe === "daily" ? "ยอดขายรายชั่วโมง" :
                      timeframe === "weekly" ? "ยอดขายรายวันในสัปดาห์ (จันทร์ - อาทิตย์)" :
                        timeframe === "monthly" ? "ยอดขายตลอดทั้งเดือน (แบ่งตามสัปดาห์)" : "ยอดขายรายเดือนตลอดทั้งปี (12 เดือน)"}
                  </span>
                </h2>
                <p className="text-xs text-text-3 mt-0.5">กราฟแสดงมูลค่ายอดขายรวม (บาท)</p>
              </div>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200 self-start sm:self-auto">
                ฿{activeData.stats.revenue.toLocaleString()}
              </span>
            </div>

            <div className="h-48 sm:h-56 md:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeData.chartData} barSize={timeframe === "yearly" ? 18 : 28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey={timeframe === "daily" ? "time" : "label"}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-text-3)", fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-text-3)", fontWeight: 600 }}
                    tickFormatter={(v) => `฿${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, "ยอดขาย"]}
                    labelFormatter={(label) => `ช่วงเวลา: ${label}`}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 14,
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-brand-500)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution Breakdown Card */}
          <div className="bg-surface rounded-[20px] border border-border p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <PieChartIcon size={16} className="text-brand-600 shrink-0" />
                  <span>สัดส่วนยอดขายตามหมวดหมู่อาหาร</span>
                </h3>
                <p className="text-xs text-text-3 mt-0.5">แบ่งตามหมวดหมู่ในช่วงเวลาที่เลือก</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Category list with bars */}
              <div className="space-y-3">
                {activeData.categoryShare.map((cat: any, i: number) => {
                  const pct = Math.round((cat.value / activeData.stats.revenue) * 100) || 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-text flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                        <span className="text-text-2">{formatPrice(cat.value)} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini Pie Chart Preview */}
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeData.categoryShare}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {activeData.categoryShare.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, "ยอดขาย"]}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: TOP BEST SELLER FILLINGS & CRUSTS (5 cols) ───────── */}
        <div className="md:col-span-5 space-y-4 sm:space-y-5">

          {/* 1. Best Seller Fillings Card (ไส้ขายดี) */}
          <div className="bg-surface rounded-[20px] border border-border overflow-hidden shadow-xs">
            {/* Best Seller Fillings Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Award size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-text flex items-center gap-1.5">
                    <span>ไส้ขายดี</span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Top 5
                    </span>
                  </h2>
                  <p className="text-[11px] text-text-3">
                    จัดอันดับตามจำนวนไส้ที่ขายได้ ({timeframe === "daily" ? "ประจำวัน" : timeframe === "weekly" ? "ประจำสัปดาห์" : timeframe === "monthly" ? "ประจำเดือน" : "ประจำปี"})
                  </p>
                </div>
              </div>
              <Flame size={18} className="text-amber-500 animate-pulse shrink-0" />
            </div>

            {/* Best Seller Fillings List */}
            <div className="p-4 space-y-3 divide-y divide-border/60">
              {activeData.bestSellers.length === 0 ? (
                <div className="p-8 text-center text-text-3 text-xs">
                  ยังไม่มีข้อมูลไส้ขายดีในช่วงเวลานี้
                </div>
              ) : (
                activeData.bestSellers
                  .slice()
                  .sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0) || (b.totalRevenue || 0) - (a.totalRevenue || 0))
                  .map((item, index) => {
                    const isGold = index === 0;
                    const isSilver = index === 1;
                    const isBronze = index === 2;

                    return (
                      <motion.div
                        key={item.id || `filling-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn("pt-3 first:pt-0 flex items-center gap-3.5 group")}
                      >
                        {/* Rank Badge */}
                        <div
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs",
                            isGold ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300" :
                              isSilver ? "bg-slate-300 text-slate-900 ring-2 ring-slate-200" :
                                isBronze ? "bg-amber-700 text-amber-100 ring-2 ring-amber-600" :
                                  "bg-surface-2 text-text-3 border border-border"
                          )}
                        >
                          {index + 1}
                        </div>

                        {/* Food Thumbnail */}
                        <div className="relative w-12 h-12 rounded-xl bg-surface-3 border border-border overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                          <SafeImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            fallback={<Utensils size={18} className="text-brand-600" />}
                          />
                        </div>

                        {/* Filling Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-text truncate group-hover:text-brand-600 transition-colors">
                              {item.name}
                            </h4>
                            <span className="text-xs sm:text-sm font-black text-brand-700 shrink-0">
                              {item.unitsSold} ชิ้น
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-text-3 mt-1">
                            <span className="font-medium text-text-3">
                              ยอดขาย {formatPrice(item.totalRevenue)}
                            </span>
                            <div className="flex items-center gap-1 font-bold">
                              {item.growth >= 0 ? (
                                <span className="text-emerald-600 flex items-center">
                                  <ArrowUpRight size={12} />+{item.growth}%
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center">
                                  <ArrowDownRight size={12} />{item.growth}%
                                </span>
                              )}
                              <span className="text-text-3 font-normal">({item.percentage}%)</span>
                            </div>
                          </div>

                          {/* Mini Sales Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-400 transition-all duration-500"
                              style={{ width: `${Math.min(100, item.percentage * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>

            {/* Best Seller Fillings Footer Tip */}
            <div className="p-3.5 bg-surface-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-3 font-medium flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand-600" />
                <span>คำนวณจากยอดออเดอร์ที่ชำระเงินแล้ว</span>
              </span>
              <span className="text-brand-700 font-bold">
                รวม {activeData.bestSellers.length} ไส้: {activeData.bestSellers.reduce((s, i) => s + (i.unitsSold || 0), 0)} ชิ้น ({Math.round(activeData.bestSellers.reduce((s, i) => s + (i.percentage || 0), 0))}%)
              </span>
            </div>
          </div>

          {/* 2. Best Seller Crusts Card (แป้งเครปขายดี) */}
          <div className="bg-surface rounded-[20px] border border-border overflow-hidden shadow-xs">
            {/* Best Seller Crusts Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <ChefHat size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-text flex items-center gap-1.5">
                    <span>แป้งเครปขายดี</span>
                    <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                      Top 5
                    </span>
                  </h2>
                  <p className="text-[11px] text-text-3">
                    จัดอันดับตามจำนวนแป้งเครปที่ขายได้ ({timeframe === "daily" ? "ประจำวัน" : timeframe === "weekly" ? "ประจำสัปดาห์" : timeframe === "monthly" ? "ประจำเดือน" : "ประจำปี"})
                  </p>
                </div>
              </div>
              <Sparkles size={18} className="text-orange-500 animate-pulse shrink-0" />
            </div>

            {/* Best Seller Crusts List */}
            <div className="p-4 space-y-3 divide-y divide-border/60">
              {activeData.bestCrusts.length === 0 ? (
                <div className="p-8 text-center text-text-3 text-xs">
                  ยังไม่มีข้อมูลแป้งขายดีในช่วงเวลานี้
                </div>
              ) : (
                activeData.bestCrusts
                  .slice()
                  .sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0) || (b.totalRevenue || 0) - (a.totalRevenue || 0))
                  .map((item, index) => {
                    const isGold = index === 0;
                    const isSilver = index === 1;
                    const isBronze = index === 2;

                    return (
                      <motion.div
                        key={item.id || `crust-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn("pt-3 first:pt-0 flex items-center gap-3.5 group")}
                      >
                        {/* Rank Badge */}
                        <div
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs",
                            isGold ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300" :
                              isSilver ? "bg-slate-300 text-slate-900 ring-2 ring-slate-200" :
                                isBronze ? "bg-amber-700 text-amber-100 ring-2 ring-amber-600" :
                                  "bg-surface-2 text-text-3 border border-border"
                          )}
                        >
                          {index + 1}
                        </div>

                        {/* Food Thumbnail */}
                        <div className="relative w-12 h-12 rounded-xl bg-surface-3 border border-border overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                          <SafeImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            fallback={<ChefHat size={18} className="text-orange-500" />}
                          />
                        </div>

                        {/* Crust Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-text truncate group-hover:text-orange-600 transition-colors">
                              {item.name}
                            </h4>
                            <span className="text-xs sm:text-sm font-black text-orange-600 shrink-0">
                              {item.unitsSold} ชิ้น
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-text-3 mt-1">
                            <span className="font-medium text-text-3">
                              ยอดขาย {formatPrice(item.totalRevenue)}
                            </span>
                            <div className="flex items-center gap-1 font-bold">
                              {item.growth >= 0 ? (
                                <span className="text-emerald-600 flex items-center">
                                  <ArrowUpRight size={12} />+{item.growth}%
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center">
                                  <ArrowDownRight size={12} />{item.growth}%
                                </span>
                              )}
                              <span className="text-text-3 font-normal">({item.percentage}%)</span>
                            </div>
                          </div>

                          {/* Mini Sales Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                              style={{ width: `${Math.min(100, item.percentage * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>

            {/* Best Seller Crusts Footer Tip */}
            <div className="p-3.5 bg-surface-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-3 font-medium flex items-center gap-1.5">
                <Sparkles size={13} className="text-orange-500" />
                <span>คำนวณจากยอดออเดอร์ที่ชำระเงินแล้ว</span>
              </span>
              <span className="text-orange-700 font-bold">
                รวม {activeData.bestCrusts.length} แป้ง: {activeData.bestCrusts.reduce((s, i) => s + (i.unitsSold || 0), 0)} ชิ้น ({Math.round(activeData.bestCrusts.reduce((s, i) => s + (i.percentage || 0), 0))}%)
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ── Orders Table (always visible, filtered by timeframe) ───────────── */}
      {/* ── Table & Orders List ─────────────────────────────────────────── */}
      <div className="w-full h-auto">
        <div className="bg-surface rounded-[20px] border border-border shadow-xs w-full overflow-visible">

          {/* Table Header */}
          <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-brand-500/5 to-transparent space-y-3 rounded-t-[20px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-xs">
                    <ListOrdered size={14} />
                  </span>
                  <span>รายการออเดอร์</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold border border-brand-200">
                    {timeframe === "daily" ? "ประจำวัน" : timeframe === "weekly" ? "ประจำสัปดาห์" : timeframe === "monthly" ? "ประจำเดือน" : "ประจำปี"}
                  </span>
                </h2>
                <p className="text-xs text-text-3 mt-1" suppressHydrationWarning>
                  {dateDisplayLabel} · แสดง {displayedOrders.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, displayedOrders.length)} จาก {displayedOrders.length} รายการ
                </p>
              </div>
            </div>

            {/* Status Filter + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Custom Status Dropdown */}
              <div className="relative shrink-0 w-full sm:w-56">
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="w-full h-9 px-3 text-xs font-bold rounded-xl bg-surface border border-border hover:border-brand-400 text-text flex items-center justify-between gap-2 shadow-2xs transition-all active:scale-[0.99] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", selectedStatusOption.dotClass)} />
                    <span className="truncate">{selectedStatusOption.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-text-3">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-surface-2 text-text-3 border border-border leading-none">
                      {statusCounts[selectedStatusOption.value as keyof typeof statusCounts] ?? 0}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn("transition-transform duration-200 text-text-3", isStatusDropdownOpen && "rotate-180")}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {isStatusDropdownOpen && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-[90]"
                        onClick={() => setIsStatusDropdownOpen(false)}
                      />

                      {/* Popover Menu */}
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 sm:right-auto sm:w-60 top-full mt-1.5 z-[100] bg-surface rounded-[18px] border border-border shadow-2xl p-1.5 space-y-0.5"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-3 uppercase tracking-wider border-b border-border/60 mb-1 flex items-center justify-between">
                          <span>กรองสถานะ</span>
                          <span>รายการ</span>
                        </div>
                        {STATUS_OPTIONS.map((opt) => {
                          const isSelected = opt.value === statusFilter;
                          const count = statusCounts[opt.value as keyof typeof statusCounts] ?? 0;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setStatusFilter(opt.value);
                                setIsStatusDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer",
                                isSelected
                                  ? "bg-brand-50 text-brand-700 font-black shadow-2xs"
                                  : "text-text hover:bg-surface-3 hover:text-brand-700"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs", opt.dotClass)} />
                                <span className="truncate">{opt.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={cn(
                                    "text-[10.5px] font-black px-1.5 py-0.5 rounded-full border leading-none",
                                    isSelected
                                      ? "bg-brand-100 text-brand-800 border-brand-200"
                                      : "bg-surface-2 text-text-3 border-border"
                                  )}
                                >
                                  {count}
                                </span>
                                {isSelected && <Check size={13} className="text-brand-600 stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Modern Search Input */}
              <div className="relative shrink-0 w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาคิว, ชื่อ, หรือไส้..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8.5 pr-8 text-xs rounded-xl bg-surface border border-border text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-3 hover:text-text cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto rounded-b-[20px]">
            <table className="w-full text-sm" style={{ minWidth: "640px" }}>
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-text-3 whitespace-nowrap">คิว</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-3">รายการ</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-3 text-right whitespace-nowrap">ยอดเงิน</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-3 whitespace-nowrap">รูปแบบการชำระ</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-3 text-center whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-3 text-center whitespace-nowrap">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-3">
                        <ListOrdered size={28} className="opacity-30" />
                        <p className="text-xs font-medium">
                          {recentOrders.length === 0
                            ? "ไม่มีรายการออเดอร์ในช่วงเวลาที่เลือก"
                            : "ไม่พบรายการออเดอร์ตามเงื่อนไขการค้นหา"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order, rowIdx) => {
                    const createdAtDate = order.createdAt ? new Date(order.createdAt) : null;
                    const timeFormatted = createdAtDate
                      ? timeframe === "daily"
                        ? createdAtDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
                        : createdAtDate.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }) +
                        " " +
                        createdAtDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
                      : "-";

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(rowIdx * 0.03, 0.3) }}
                        className="hover:bg-brand-50/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrderDetail(order)}
                      >
                        {/* Queue */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-black text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md self-start">
                              {order.queueNumber || order.tableNumber || `#${String(order.id).slice(-4)}`}
                            </span>
                            {order.customerNickname && (
                              <span className="text-[11px] text-text-2 font-medium truncate max-w-[90px]">
                                {order.customerNickname}
                              </span>
                            )}
                            <span className="text-[10px] text-text-3">{timeFormatted}</span>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3">
                          <div className="space-y-1 max-w-[260px] sm:max-w-[360px]">
                            {(order.items || []).length === 0 && (
                              <span className="text-xs text-text-3">—</span>
                            )}
                            {(order.items || []).map((it: any, itIdx: number) => {
                              const details = parseCrepeDetails(it);
                              const qty = it.quantity && it.quantity > 1 ? (
                                <span className="ml-1 text-[10px] font-black text-brand-600">×{it.quantity}</span>
                              ) : null;
                              return (
                                <div key={it.id || itIdx} className="flex items-start gap-1.5 leading-snug">
                                  <span className="shrink-0 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                    {details.crust || "เครป"}
                                  </span>
                                  <span className="text-xs text-text font-medium">
                                    {details.toppings || "ไม่ระบุไส้"}{qty}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-black text-sm text-brand-700">
                            {formatPrice(order.total || 0)}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-2 bg-surface-2 border border-border px-2 py-0.5 rounded-lg">
                              <CreditCard size={11} className="text-brand-500" />
                              {paymentMethodLabel(order.paymentMethod)}
                            </span>
                            {(order.hasSlip || order.slipUrl || (order as any)?.slip_url) && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                                <Receipt size={10} />
                                <span>มีสลิป</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge variant={orderStatusBadge[order.status as keyof typeof orderStatusBadge]?.variant || "neutral"}>
                            {orderStatusBadge[order.status as keyof typeof orderStatusBadge]?.label || order.status || "—"}
                          </Badge>
                        </td>

                        {/* Action: View Details Button */}
                        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetail(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 hover:text-brand-800 border border-brand-200/80 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs"
                            title="คลิกดูรายละเอียดออเดอร์"
                          >
                            <Eye size={13} className="text-brand-600" />
                            <span>ดูรายละเอียด</span>
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {displayedOrders.length > 0 && (
            <div className="px-4 sm:px-5 py-3.5 bg-surface-2/50 border-t border-border flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-3 font-medium">
                <span>
                  รวมตามที่กรอง <strong className="text-text font-bold">{displayedOrders.length}</strong> รายการ
                  {displayedOrders.length !== recentOrders.length && (
                    <span className="text-text-3 ml-1">(จากทั้งหมด {recentOrders.length} รายการ)</span>
                  )}
                </span>
                <span>
                  ยอดรวมหน้านี้ <strong className="text-brand-700 font-bold">{formatPrice(paginatedOrders.reduce((s, o) => s + (o.total || 0), 0))}</strong>
                  <span className="mx-2 text-border">•</span>
                  ยอดรวมทั้งหมด <strong className="text-brand-700 font-bold">{formatPrice(displayedOrders.reduce((s, o) => s + (o.total || 0), 0))}</strong>
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={displayedOrders.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                className="pt-2 border-t border-border/60"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Order Detail Modal (รายละเอียดออเดอร์ & ข้อมูลผู้สั่ง & สลิป) ──────── */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderDetail(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh] my-auto"
            >
              {/* Header */}
              <div className="px-5 sm:px-6 py-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono font-black text-sm sm:text-base px-3 py-1 rounded-xl bg-brand-500 text-white shadow-xs">
                    {selectedOrderDetail.queueNumber || selectedOrderDetail.tableNumber || `#${String(selectedOrderDetail.id).slice(-4)}`}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      รายละเอียดออเดอร์
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      รหัสออเดอร์ #{selectedOrderDetail.id || selectedOrderDetail.order_id || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={orderStatusBadge[selectedOrderDetail.status as keyof typeof orderStatusBadge]?.variant || "neutral"}>
                    {orderStatusBadge[selectedOrderDetail.status as keyof typeof orderStatusBadge]?.label || selectedOrderDetail.status || "—"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderDetail(null)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90 cursor-pointer"
                    aria-label="ปิด"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-zinc-50/50">
                
                {/* 1. ข้อมูลผู้สั่ง (Customer Profile Card) */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 pb-2 border-b border-zinc-100">
                    <User size={14} className="text-brand-600" />
                    <span>ข้อมูลผู้สั่งอาหาร</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Customer Nickname */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-zinc-400">ชื่อลูกค้า / ชื่อเล่น:</span>
                      <p className="font-bold text-zinc-900 text-sm">
                        {selectedOrderDetail.customerNickname || selectedOrderDetail.customer_nickname || (selectedOrderDetail as any)?.customerName || "ลูกค้าทั่วไป (หน้าร้าน)"}
                      </p>
                    </div>

                    {/* Customer Phone */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-zinc-400">เบอร์โทรศัพท์:</span>
                      {selectedOrderDetail.customerPhone || selectedOrderDetail.customer_phone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 text-sm">
                            {selectedOrderDetail.customerPhone || selectedOrderDetail.customer_phone}
                          </span>
                          <a
                            href={`tel:${String(selectedOrderDetail.customerPhone || selectedOrderDetail.customer_phone).replace(/[^0-9+]/g, "")}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10.5px] border border-emerald-200 transition active:scale-95"
                          >
                            <Phone size={10} />
                            <span>โทร</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-zinc-500 font-normal">ไม่ได้ระบุเบอร์โทร</p>
                      )}
                    </div>

                    {/* Order Time */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-zinc-400">เวลาที่สั่งซื้อ:</span>
                      <p className="font-medium text-zinc-700">
                        {selectedOrderDetail.createdAt
                          ? new Date(selectedOrderDetail.createdAt).toLocaleString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) + " น."
                          : "-"}
                      </p>
                    </div>

                    {/* Table / Pickup */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-zinc-400">จุดรับ / โต๊ะ:</span>
                      <p className="font-medium text-zinc-700">
                        {selectedOrderDetail.tableNumber
                          ? `โต๊ะ ${selectedOrderDetail.tableNumber}`
                          : selectedOrderDetail.pickupType === "scheduled"
                          ? `สั่งล่วงหน้า (รับเวลา ${selectedOrderDetail.scheduledTime || "-"})`
                          : "รับที่หน้าร้าน (คิวปกติ)"}
                      </p>
                    </div>
                  </div>

                  {/* Customer Order Remark / Note */}
                  {(selectedOrderDetail.note || selectedOrderDetail.customerNote) && (
                    <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs">
                      <span className="font-bold text-amber-900 block mb-0.5">หมายเหตุจากลูกค้า:</span>
                      <p className="text-amber-800 font-medium">{selectedOrderDetail.note || selectedOrderDetail.customerNote}</p>
                    </div>
                  )}
                </div>

                {/* 2. รายการอาหารที่สั่ง (Ordered Items Breakdown) */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                      <Utensils size={14} className="text-brand-600" />
                      <span>รายการเครปที่สั่ง ({((selectedOrderDetail.items || []) as any[]).reduce((s, it) => s + (it.quantity || 1), 0)} ชิ้น)</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-500">
                      ยอดรวมสินค้า: <strong className="text-brand-700 font-mono text-sm">{formatPrice(selectedOrderDetail.total || 0)}</strong>
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 space-y-2">
                    {((selectedOrderDetail.items || []) as any[]).length === 0 ? (
                      <p className="text-xs text-zinc-400 py-3 text-center">ไม่มีข้อมูลรายการสินค้า</p>
                    ) : (
                      ((selectedOrderDetail.items || []) as any[]).map((it, idx) => {
                        const details = parseCrepeDetails(it);
                        const unitPrice = Number(it.price || it.subtotal || 0);
                        const qty = Number(it.quantity || 1);
                        const itemSubtotal = it.subtotal ? Number(it.subtotal) : unitPrice * qty;

                        return (
                          <div key={it.id || idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                                  {details.crust || "แป้งเครป"}
                                </span>
                                <span className="font-bold text-zinc-900">
                                  {details.toppings || "ไม่ระบุไส้"}
                                </span>
                                {qty > 1 && (
                                  <span className="font-black text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.2 rounded text-[11px]">
                                    ×{qty}
                                  </span>
                                )}
                              </div>

                              {/* Selected options / extras */}
                              {Array.isArray(it.selectedOptions) && it.selectedOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {it.selectedOptions.map((opt: any, oIdx: number) => (
                                    <span key={oIdx} className="text-[10.5px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                                      {opt.choiceLabel || opt.label} {opt.price ? `(+฿${opt.price})` : ""}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Item note */}
                              {it.note && (
                                <p className="text-[11px] text-zinc-500 font-medium italic">
                                  หมายเหตุ: {it.note}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-zinc-900 text-sm">
                                {formatPrice(itemSubtotal)}
                              </span>
                              {qty > 1 && (
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  (@{formatPrice(unitPrice)})
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. ข้อมูลการชำระเงิน & หลักฐานสลิป (Payment & Slip Proof) */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                      <CreditCard size={14} className="text-brand-600" />
                      <span>ข้อมูลการชำระเงิน & หลักฐาน</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                        {paymentMethodLabel(selectedOrderDetail.paymentMethod)}
                      </span>
                      {selectedOrderDetail.paymentStatus === "paid" || selectedOrderDetail.status === "paid" || selectedOrderDetail.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>ชำระเงินแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <Clock size={11} className="text-amber-600" />
                          <span>รอชำระเงิน</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slip Preview Card or Empty State */}
                  {selectedOrderDetail.hasSlip || selectedOrderDetail.slipUrl || (selectedOrderDetail as any)?.slip_url ? (
                    (() => {
                      const activeSlip = selectedOrderDetail.slipUrl || (selectedOrderDetail as any)?.slip_url;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-zinc-600">
                            <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-emerald-600" />
                              <span>รูปสลิปหลักฐานการชำระเงิน</span>
                            </span>
                            {activeSlip && (
                              <button
                                type="button"
                                onClick={() => setSlipLightboxUrl(activeSlip)}
                                className="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                <ZoomIn size={13} />
                                <span>ดูรูปขนาดเต็ม</span>
                              </button>
                            )}
                          </div>

                          {activeSlip ? (
                            <div
                              onClick={() => setSlipLightboxUrl(activeSlip)}
                              className="relative group rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-950 cursor-pointer shadow-xs hover:border-brand-300 transition-all flex items-center justify-center min-h-[160px] max-h-[260px]"
                            >
                              <SafeImage
                                src={activeSlip}
                                alt="สลิปหลักฐานการชำระเงิน"
                                className="w-full h-auto max-h-[260px] object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                fallbackType="receipt"
                              />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                                  <ZoomIn size={13} />
                                  <span>แตะเพื่อดูสลิปขนาดเต็ม</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                              <span>ออเดอร์นี้แนบสลิปและผ่านการตรวจสอบยอดเงินเรียบร้อยแล้ว</span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-500 font-medium flex items-center gap-2">
                      <Receipt size={14} className="text-zinc-400 shrink-0" />
                      <span>ไม่มีรูปสลิปแนบ (ชำระด้วยเงินสดหน้าร้าน หรือยังไม่ได้อัปโหลดสลิป)</span>
                    </div>
                  )}
                </div>

                {/* 4. ลำดับเวลาของออเดอร์ (Timestamps) */}
                <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-700 pb-1.5 border-b border-zinc-100">
                    <Clock size={14} className="text-brand-600" />
                    <span>ไทม์ไลน์เวลาของออเดอร์</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-600">
                    <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 space-y-0.5">
                      <span className="text-[10.5px] text-zinc-400 block font-medium">เวลาที่สั่ง</span>
                      <p className="font-bold text-zinc-800 text-[11.5px]">
                        {selectedOrderDetail.createdAt ? new Date(selectedOrderDetail.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น." : "-"}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 space-y-0.5">
                      <span className="text-[10.5px] text-zinc-400 block font-medium">เวลายืนยันรับ</span>
                      <p className="font-bold text-zinc-800 text-[11.5px]">
                        {selectedOrderDetail.confirmedAt ? new Date(selectedOrderDetail.confirmedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น." : "-"}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 space-y-0.5">
                      <span className="text-[10.5px] text-zinc-400 block font-medium">เวลาเริ่มปรุง</span>
                      <p className="font-bold text-zinc-800 text-[11.5px]">
                        {selectedOrderDetail.cookingStartedAt ? new Date(selectedOrderDetail.cookingStartedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น." : "-"}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 space-y-0.5">
                      <span className="text-[10.5px] text-zinc-400 block font-medium">เวลาทำเสร็จ/รับ</span>
                      <p className="font-bold text-emerald-700 text-[11.5px]">
                        {selectedOrderDetail.completedAt || selectedOrderDetail.readyAt ? new Date(selectedOrderDetail.completedAt || selectedOrderDetail.readyAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น." : "-"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-zinc-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>ยอดชำระสุทธิ:</span>
                  <strong className="text-brand-700 font-mono text-base font-black">
                    {formatPrice(selectedOrderDetail.total || 0)}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Fullscreen Slip Lightbox Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {slipLightboxUrl && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSlipLightboxUrl(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 w-full max-w-lg bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] border border-zinc-800"
            >
              {/* Top Bar */}
              <div className="px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Receipt size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold truncate">รูปสลิปหลักฐานการชำระเงิน</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={formatDriveImageUrl(slipLightboxUrl)}
                    download={`Slip_${selectedOrderDetail?.queueNumber || "Payment"}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                    title="เปิดรูปต้นฉบับ / ดาวน์โหลด"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSlipLightboxUrl(null)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                    title="ปิด"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Image Box */}
              <div className="p-4 flex items-center justify-center bg-zinc-950 overflow-y-auto max-h-[72vh] select-none">
                <SafeImage
                  src={slipLightboxUrl}
                  alt="สลิปหลักฐานการชำระเงิน"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-xl shadow-lg"
                  fallbackType="receipt"
                />
              </div>

              {/* Bottom Bar */}
              <div className="px-5 py-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>ตรวจสอบสลิปแล้ว</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSlipLightboxUrl(null)}
                  className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

