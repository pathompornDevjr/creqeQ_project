/**
 * Restaurant Prisma Repository Implementation
 * คลาสสำหรับจัดการฐานข้อมูลส่วนของร้านค้า (Restaurant Backend Repository):
 * - การจัดการออเดอร์ในครัว (Kitchen Queue): ออกคิว, เลื่อนสถานะ (pending -> cooking -> ready -> completed)
 * - การแจ้งเตือนแบบเรียลไทม์ผ่าน RealtimeService (SSE/WebSocket)
 * - การสรุปยอดขายและการวิเคราะห์ (Sales Stats, Daily/Weekly/Monthly/Yearly Summary, Best Sellers)
 * - การจัดการรายการอาหาร, หมวดหมู่, แป้งเครป, เมนูตัวอย่าง และสต็อกวัตถุดิบ (Inventory)
 * - การตั้งค่าโปรไฟล์ร้านค้า, ข้อมูลบัญชีธนาคาร/พร้อมเพย์ และการพักร้านชั่วคราว (Pause Store)
 */

import prisma from "../../database/prisma";
import { hashPassword, verifyPassword } from "../../libs/password";
import { parseThaiAddress } from "../../libs/thai-address";
import {
  BankAccountDTO,
  CartItemDTO,
  CategoryDTO,
  CrustDTO,
  DailySalesDTO,
  IRestaurantRepository,
  MenuItemDTO,
  OptionChoice,
  OptionGroup,
  OrderDTO,
  OrderStatus,
  RestaurantProfileDTO,
  RestaurantQueryOptions,
  RestaurantStatsDTO,
  UserProfileDTO,
  BestSellerItemDTO,
  CategoryShareDTO,
  RestaurantSummaryResponseDTO,
  SummaryQueryParams,
  InventoryItemDTO,
  SampleMenuDTO,
} from "../interfaces/restaurant.repository.interface";
import { RealtimeService } from "../../services/realtime.service";

/**
 * แยกส่วนประกอบของวันเวลาตามเขตเวลาประเทศไทย (Asia/Bangkok: UTC+7)
 * ใช้สำหรับการจัดกลุ่มข้อมูลสถิติยอดขายตาม ปี, เดือน, วัน, วันในสัปดาห์ และชั่วโมง
 * 
 * @param dateInput วันที่ที่ต้องการแปลง (Date object หรือ ISO string)
 * @returns ออบเจกต์ประกอบด้วย year, month, day, dayOfWeek, hour, dateStr, timeStr
 */
export function getThaiDateComponents(dateInput: Date | string) {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const now = new Date();
    const hour = now.getHours();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      dayOfWeek: now.getDay(),
      hour,
      dateStr: "",
      timeStr: `${String(hour).padStart(2, "0")}:00`,
    };
  }

  // แปลงวันเวลาให้อยู่ใน Timezone Asia/Bangkok
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;

  const bangkokDate = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`);
  const dayOfWeek = bangkokDate.getDay();

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hour).padStart(2, "0")}:00`;

  return { year, month, day, dayOfWeek, hour, dateStr, timeStr };
}

/**
 * ฟังก์ชันช่วยแปลงและค้นหารหัสร้านค้า (res_id) จากรหัสผู้ใช้หรือตัวเลขที่ส่งเข้ามา
 * 
 * @param input รหัสผู้ใช้ (res_user_id) หรือ รหัสร้านค้า (res_id)
 * @returns Promise คืนค่า res_id ตัวเลขที่ถูกต้อง
 */
async function resolveRestaurantId(input?: string | number): Promise<number> {
  if (input) {
    const strInput = String(input).trim();

    // ค้นหาจาก res_user_id ในตาราง restaurant_users
    try {
      const user = await prisma.restaurant_users.findUnique({
        where: { res_user_id: strInput },
        include: { restaurant_data: true },
      });
      if (user && user.restaurantId) {
        return user.restaurantId;
      }
    } catch {}

    // กรณีส่งเป็นตัวเลข res_id มาโดยตรง
    const num = Number(strInput);
    if (!isNaN(num) && num > 0) {
      try {
        const exists = await prisma.restaurant_data.findUnique({ where: { res_id: num } });
        if (exists) return exists.res_id;
      } catch {}
    }
  }

  // Fallback: ดึงร้านค้าแรกในระบบ
  try {
    const firstUser = await prisma.restaurant_users.findFirst({
      include: { restaurant_data: true },
    });
    if (firstUser && firstUser.restaurantId) {
      return firstUser.restaurantId;
    }
  } catch {}

  try {
    const firstRest = await prisma.restaurant_data.findFirst();
    if (firstRest) return firstRest.res_id;

    // หากยังไม่มีร้านค้าเลย ให้สร้างร้านค้าเริ่มต้นขึ้นมา
    const created = await prisma.restaurant_data.create({
      data: {
        restaurant_name: "ร้านเครป CrepeQ",
        restaurant_phone: "0812345678",
        restaurant_desc: "ร้านเครปแสนอร่อย สั่งล่วงหน้าผ่านคิวเรียลไทม์",
        is_open: true,
      },
    });
    return created.res_id;
  } catch {
    return 1;
  }
}

export class RestaurantPrismaRepository implements IRestaurantRepository {
  // ==========================================
  // การจัดการออเดอร์และคิวในครัว (Orders & Kitchen Queue)
  // ==========================================
  async getOrders(restaurantId?: string | number, status?: string, date?: string): Promise<OrderDTO[]> {
    try {
      const restId = restaurantId ? Number(restaurantId) : undefined;
      let dateFilter: any = {};
      if (date) {
        const start = new Date(`${date}T00:00:00.000+07:00`);
        const end = new Date(`${date}T23:59:59.999+07:00`);
        dateFilter = {
          createdAt: {
            gte: start,
            lte: end,
          },
        };
      }

      const orders = await prisma.orders.findMany({
        where: {
          ...(restId ? { restaurant_id: restId } : {}),
          ...(status && status !== "all" ? { order_status: status } : {}),
          ...dateFilter,
        },
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          orderItems: {
            include: {
              menu: {
                include: { images: true },
              },
              selected_options: {
                include: { menuOptions: true },
              },
            },
          },
        },
      });

      // Preload all menus for this restaurant to map topping names -> topping images
      const allRestaurantMenus = await prisma.menu.findMany({
        where: restId ? { restaurantId: restId } : {},
        include: { images: true },
      });
      const menuImageByName = new Map<string, string>();
      const menuAvailabilityByName = new Map<string, boolean>();
      allRestaurantMenus.forEach((m) => {
        const cleanName = m.menu_name.trim().toLowerCase();
        menuAvailabilityByName.set(cleanName, m.is_available);
        const imgs = (m.images || []).map((im) => im.image_url || "").filter(Boolean);
        const img = imgs[0] || m.image_url || "";
        if (img) {
          menuImageByName.set(cleanName, img);
        }
      });

      // Calculate daily queue sequence index (1, 2, 3...) per date
      const dateOrderCounters: Record<string, number> = {};
      const sortedByDate = [...orders].sort((a, b) => a.order_id - b.order_id);
      const dailyIndexMap = new Map<number, number>();
      sortedByDate.forEach((o) => {
        const d = o.queue_date || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "today");
        dateOrderCounters[d] = (dateOrderCounters[d] || 0) + 1;
        dailyIndexMap.set(o.order_id, dateOrderCounters[d]);
      });

      return orders.map((o) => {
        const queueNum = o.queue_number || `A${String(o.order_id).padStart(3, "0")}`;
        const dailyIndex = dailyIndexMap.get(o.order_id) || 1;
        const rawMethod = String(o.payment_method || "").toLowerCase();
        const isCash = rawMethod.includes("cash") || rawMethod.includes("เงินสด") || rawMethod.includes("หน้าร้าน");
        const isPaid = o.payment_status === "paid" || o.order_status === "paid" || o.order_status === "completed" || Boolean(o.slip_url || o.has_slip);
        let mappedStatus = (o.order_status as any) || "pending";
        if (!isCash && isPaid && (mappedStatus === "served" || mappedStatus === "ready")) {
          mappedStatus = "paid";
        }
        return {
          id: String(o.order_id),
          restaurantId: o.restaurant_id,
          tableId: String(o.order_id),
          tableNumber: queueNum,
          queueNumber: queueNum,
          queueLetter: queueNum,
          dailyQueueIndex: dailyIndex,
          items: (o.orderItems || []).map((it) => {
            const imgs = (it.menu?.images || []).map((im) => im.image_url || "").filter(Boolean);
            let primaryImage = "";

            // Extract toppings in order to find the first topping image
            const toppingList: string[] = [];
            const addT = (tName?: string) => {
              if (!tName) return;
              const tr = tName.trim();
              if (
                tr &&
                !tr.includes("กลับบ้าน") &&
                !tr.includes("ทานที่ร้าน") &&
                !tr.startsWith("แป้ง") &&
                !tr.startsWith("แผ่น") &&
                !tr.includes("ไม่ใส่ไส้") &&
                !tr.includes("แป้งเปล่า") &&
                !toppingList.includes(tr)
              ) {
                toppingList.push(tr);
              }
            };

            (it.selected_options || []).forEach((opt) => {
              addT(opt.selected_choice || undefined);
            });

            if (it.remark && it.remark.includes("ไส้:")) {
              const match = it.remark.match(/ไส้:\s*([^,\n]+(?:,[^,\n]+)*)/);
              if (match && match[1]) {
                match[1].split(/[+•,]/).forEach(addT);
              }
            } else if (it.remark) {
              it.remark.split(/[+•,]/).forEach(addT);
            }

            if (it.menu_name && (it.menu_name.includes("·") || it.menu_name.includes("•"))) {
              it.menu_name.split(/[·•]/).slice(1).join(" ").split(/[+•,]/).forEach(addT);
            }

            const isMenuOutOfStock = it.menu?.is_available === false;
            const isCrustOutOfStock = it.menu_name ? menuAvailabilityByName.get(it.menu_name.trim().toLowerCase()) === false : false;
            const allToppingsOutOfStock = toppingList.length > 0 && toppingList.every((t) => menuAvailabilityByName.get(t.trim().toLowerCase()) === false);
            const isOutOfStock = isMenuOutOfStock || isCrustOutOfStock || allToppingsOutOfStock || (toppingList.length === 0 && Boolean(isMenuOutOfStock || isCrustOutOfStock));

            // Find image for the first topping that has one ONLY if toppingList has items
            if (toppingList.length > 0) {
              for (const t of toppingList) {
                const cleanT = t.toLowerCase();
                const matchedImg = menuImageByName.get(cleanT) ||
                  Array.from(menuImageByName.entries()).find(([k]) => k.includes(cleanT) || cleanT.includes(k))?.[1];
                if (matchedImg) {
                  primaryImage = matchedImg;
                  break;
                }
              }
            } else {
              primaryImage = "";
            }

            return {
              id: String(it.item_id),
              menuItem: {
                id: String(it.menu_id),
                name: it.menu_name || it.menu?.menu_name || "เมนูเครป",
                price: Number(it.price) || 0,
                category: "",
                image: primaryImage,
                images: imgs,
                available: !isOutOfStock,
              },
              quantity: it.quantity || 1,
              note: it.remark || undefined,
              selectedOptions: (it.selected_options || []).map((opt) => ({
                groupName: opt.option_name || opt.menuOptions?.option_name || "ตัวเลือก",
                choiceLabel: opt.selected_choice || "",
                price: Number(opt.price) || 0,
              })),
              subtotal: Number(it.price) * (it.quantity || 1),
              isOutOfStock,
            };
          }),
          total: Number(o.total) || 0,
          status: mappedStatus,
          hasSlip: o.has_slip,
          slipUrl: o.slip_url || undefined,
          deviceId: o.device_id || undefined,
          customerId: o.customer_id || o.customer?.customer_id || undefined,
          customerNickname: o.customer_nickname || o.customer?.nickname || undefined,
          customerPhone: o.customer_phone || o.customer?.phone || undefined,
          pickupType: (o.pickup_type as any) || "asap",
          scheduledTime: o.scheduled_time || undefined,
          pickupQrCode: o.pickup_qr_code || undefined,
          paymentMethod: (o.payment_method as any) || "promptpay",
          paymentStatus: isPaid ? "paid" : (o.payment_status as any) || "pending",
          cookingStartedAt: o.cooking_started_at ? new Date(o.cooking_started_at).toISOString() : undefined,
          confirmedAt: o.confirmed_at ? new Date(o.confirmed_at).toISOString() : undefined,
          readyAt: o.ready_at ? new Date(o.ready_at).toISOString() : undefined,
          completedAt: o.completed_at ? new Date(o.completed_at).toISOString() : undefined,
          cancelReason: o.cancel_reason || undefined,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error("Prisma getOrders error:", err);
      return [];
    }
  }

  async getOrderById(id: string): Promise<OrderDTO | null> {
    try {
      const order = await prisma.orders.findUnique({
        where: { order_id: Number(id) },
        include: {
          customer: true,
          orderItems: {
            include: {
              menu: {
                include: { images: true },
              },
              selected_options: {
                include: { menuOptions: true },
              },
            },
          },
        },
      });
      if (!order) return null;

      const queueNum = order.queue_number || `A${String(order.order_id).padStart(3, "0")}`;

      // Calculate dailyQueueIndex for this order
      const orderDateStr = order.queue_date || (order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      const earlierOrdersCountToday = await prisma.orders.count({
        where: {
          restaurant_id: order.restaurant_id,
          queue_date: orderDateStr,
          order_id: { lte: order.order_id },
        },
      });
      const dailyQueueIndex = Math.max(1, earlierOrdersCountToday);

      // Preload all menus for this restaurant to map topping names -> topping images
      const allRestaurantMenus = await prisma.menu.findMany({
        where: order.restaurant_id ? { restaurantId: order.restaurant_id } : {},
        include: { images: true },
      });
      const menuImageByName = new Map<string, string>();
      const menuAvailabilityByName = new Map<string, boolean>();
      allRestaurantMenus.forEach((m) => {
        const cleanName = m.menu_name.trim().toLowerCase();
        menuAvailabilityByName.set(cleanName, m.is_available);
        const imgs = (m.images || []).map((im) => im.image_url || "").filter(Boolean);
        const img = imgs[0] || m.image_url || "";
        if (img) {
          menuImageByName.set(cleanName, img);
        }
      });

      const rawMethod = String(order.payment_method || "").toLowerCase();
      const isCash = rawMethod.includes("cash") || rawMethod.includes("เงินสด") || rawMethod.includes("หน้าร้าน");
      const isPaid = order.payment_status === "paid" || order.order_status === "paid" || order.order_status === "completed" || Boolean(order.slip_url || order.has_slip);
      let mappedStatus = (order.order_status as any) || "pending";
      if (!isCash && isPaid && (mappedStatus === "served" || mappedStatus === "ready")) {
        mappedStatus = "paid";
      }

      return {
        id: String(order.order_id),
        restaurantId: order.restaurant_id,
        tableId: String(order.order_id),
        tableNumber: queueNum,
        queueNumber: queueNum,
        queueLetter: queueNum,
        dailyQueueIndex,
        items: (order.orderItems || []).map((it) => {
          const imgs = (it.menu?.images || []).map((im) => im.image_url || "").filter(Boolean);
          let primaryImage = "";

          // Extract toppings in order to find the first topping image
          const toppingList: string[] = [];
          const addT = (tName?: string) => {
            if (!tName) return;
            const tr = tName.trim();
            if (
              tr &&
              !tr.includes("กลับบ้าน") &&
              !tr.includes("ทานที่ร้าน") &&
              !tr.startsWith("แป้ง") &&
              !tr.startsWith("แผ่น") &&
              !toppingList.includes(tr)
            ) {
              toppingList.push(tr);
            }
          };

          (it.selected_options || []).forEach((opt) => {
            addT(opt.selected_choice || undefined);
          });

          if (it.remark && it.remark.includes("ไส้:")) {
            const match = it.remark.match(/ไส้:\s*([^,\n]+(?:,[^,\n]+)*)/);
            if (match && match[1]) {
              match[1].split(/[+•,]/).forEach(addT);
            }
          } else if (it.remark) {
            it.remark.split(/[+•,]/).forEach(addT);
          }

          if (it.menu_name && (it.menu_name.includes("·") || it.menu_name.includes("•"))) {
            it.menu_name.split(/[·•]/).slice(1).join(" ").split(/[+•,]/).forEach(addT);
          }

          const isMenuOutOfStock = it.menu?.is_available === false;
          const isCrustOutOfStock = it.menu_name ? menuAvailabilityByName.get(it.menu_name.trim().toLowerCase()) === false : false;
          const allToppingsOutOfStock = toppingList.length > 0 && toppingList.every((t) => menuAvailabilityByName.get(t.trim().toLowerCase()) === false);
          const isOutOfStock = isMenuOutOfStock || isCrustOutOfStock || allToppingsOutOfStock || (toppingList.length === 0 && Boolean(isMenuOutOfStock || isCrustOutOfStock));

          // Find image for the first topping that has one
          if (toppingList.length > 0) {
            for (const t of toppingList) {
              const cleanT = t.toLowerCase();
              const matchedImg = menuImageByName.get(cleanT) ||
                Array.from(menuImageByName.entries()).find(([k]) => k.includes(cleanT) || cleanT.includes(k))?.[1];
              if (matchedImg) {
                primaryImage = matchedImg;
                break;
              }
            }
          }

          return {
            id: String(it.item_id),
            menuItem: {
              id: String(it.menu_id),
              name: it.menu_name || it.menu?.menu_name || "เมนูเครป",
              price: Number(it.price) || 0,
              category: "",
              image: primaryImage,
              images: imgs,
              available: !isOutOfStock,
            },
            quantity: it.quantity || 1,
            note: it.remark || undefined,
            selectedOptions: (it.selected_options || []).map((opt) => ({
              groupName: opt.option_name || opt.menuOptions?.option_name || "ตัวเลือก",
              choiceLabel: opt.selected_choice || "",
              price: Number(opt.price) || 0,
            })),
            subtotal: Number(it.price) * (it.quantity || 1),
            isOutOfStock,
          };
        }),
        total: Number(order.total) || 0,
        status: mappedStatus,
        hasSlip: order.has_slip,
        slipUrl: order.slip_url || undefined,
        deviceId: order.device_id || undefined,
        customerId: order.customer_id || order.customer?.customer_id || undefined,
        customerNickname: order.customer_nickname || order.customer?.nickname || undefined,
        customerPhone: order.customer_phone || order.customer?.phone || undefined,
        pickupType: (order.pickup_type as any) || "asap",
        scheduledTime: order.scheduled_time || undefined,
        pickupQrCode: order.pickup_qr_code || undefined,
        paymentMethod: (order.payment_method as any) || "promptpay",
        paymentStatus: isPaid ? "paid" : (order.payment_status as any) || "pending",
        cookingStartedAt: order.cooking_started_at ? new Date(order.cooking_started_at).toISOString() : undefined,
        confirmedAt: order.confirmed_at ? new Date(order.confirmed_at).toISOString() : undefined,
        readyAt: order.ready_at ? new Date(order.ready_at).toISOString() : undefined,
        completedAt: order.completed_at ? new Date(order.completed_at).toISOString() : undefined,
        cancelReason: order.cancel_reason || undefined,
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      console.error("Prisma getOrderById error:", err);
      return null;
    }
  }

  async createOrder(order: OrderDTO): Promise<OrderDTO> {
    try {
      const restId = order.restaurantId ? Number(order.restaurantId) : await resolveRestaurantId();
      const todayStr = new Date().toISOString().slice(0, 10);

      // Find the highest existing queue number in the database (e.g. A005 -> next is A006)
      const allOrdersWithA = await prisma.orders.findMany({
        where: {
          restaurant_id: restId,
          queue_number: { startsWith: "A" },
        },
        select: { queue_number: true },
      });

      let maxQueueNum = 0;
      for (const ord of allOrdersWithA) {
        const m = ord.queue_number?.match(/A(\d+)/i);
        if (m && m[1]) {
          const val = parseInt(m[1], 10);
          if (!isNaN(val) && val > maxQueueNum) {
            maxQueueNum = val;
          }
        }
      }

      const nextQueueNum = maxQueueNum + 1;
      const queueNumber = `A${String(nextQueueNum).padStart(3, "0")}`;

      // Calculate daily queue index (e.g. 1st order of today, 2nd order of today...)
      const todayOrdersCount = await prisma.orders.count({
        where: {
          restaurant_id: restId,
          queue_date: todayStr,
        },
      });
      const dailyQueueIndex = todayOrdersCount + 1;

      const totalAmount = order.total || order.items.reduce((sum, it) => {
        const itemPrice = Number(it.menuItem?.price ?? (it as any).price ?? (it.subtotal && it.quantity ? Math.round(it.subtotal / it.quantity) : 0));
        const itemQty = Number(it.quantity) || 1;
        return sum + (it.subtotal || (itemPrice * itemQty));
      }, 0);

      const created = await prisma.orders.create({
        data: {
          queue_number: queueNumber,
          queue_date: todayStr,
          restaurant_id: restId,
          order_status: order.status || "pending",
          customer_id: order.customerId ? Number(order.customerId) : null,
          customer_nickname: order.customerNickname || null,
          customer_phone: order.customerPhone || null,
          pickup_type: order.pickupType || "asap",
          scheduled_time: order.scheduledTime || null,
          pickup_qr_code: `PICKUP-${queueNumber}-${Date.now()}`,
          total: totalAmount,
          device_id: order.deviceId || null,
          has_slip: !!order.hasSlip,
          slip_url: order.slipUrl || null,
          payment_method: order.paymentMethod || "promptpay",
          payment_status: order.paymentStatus || "pending",
        },
      });

      // Find fallback menu item for foreign key safety
      let fallbackMenuId = 1;
      const firstMenu = await prisma.menu.findFirst({
        where: { restaurantId: restId },
        select: { menu_id: true },
      });
      if (firstMenu) {
        fallbackMenuId = firstMenu.menu_id;
      } else {
        const anyMenu = await prisma.menu.findFirst({ select: { menu_id: true } });
        if (anyMenu) {
          fallbackMenuId = anyMenu.menu_id;
        } else {
          const createdMenu = await prisma.menu.create({
            data: {
              menu_name: "เครป",
              price: 10,
              restaurantId: restId,
              is_available: true,
            },
          });
          fallbackMenuId = createdMenu.menu_id;
        }
      }

      // Create order items
      for (const it of order.items) {
        let menuId = Number(it.menuItem?.id || (it as any).menu_id || (it as any).id);
        if (isNaN(menuId) || menuId <= 0) {
          menuId = fallbackMenuId;
        } else {
          const menuExists = await prisma.menu.findUnique({ where: { menu_id: menuId }, select: { menu_id: true } });
          if (!menuExists) {
            menuId = fallbackMenuId;
          }
        }

        const itemName = it.menuItem?.name || (it as any).name || (it as any).menu_name || "เมนูเครป";
        const itemPrice = Number(it.menuItem?.price ?? (it as any).price ?? (it.subtotal && it.quantity ? Math.round(it.subtotal / it.quantity) : 0));
        const itemQty = Number(it.quantity) || 1;
        const itemRemark = it.note || (it as any).remark || null;

        const createdItem = await prisma.order_items.create({
          data: {
            order_id: created.order_id,
            menu_id: menuId,
            menu_name: itemName,
            price: itemPrice,
            quantity: itemQty,
            remark: itemRemark,
          },
        });

        if (it.selectedOptions && it.selectedOptions.length > 0) {
          for (const opt of it.selectedOptions) {
            await prisma.menu_option_orderItem.create({
              data: {
                order_item_id: createdItem.item_id,
                option_name: opt.groupName || (opt as any).option_name || "ตัวเลือก",
                selected_choice: opt.choiceLabel || (opt as any).selected_choice || "",
                price: Number(opt.price) || 0,
              },
            });
          }
        }
      }

      const fullOrder = await this.getOrderById(String(created.order_id));
      if (fullOrder) {
        RealtimeService.broadcast(restId, "ORDER_CREATED", fullOrder);
        return fullOrder;
      }

      return {
        ...order,
        id: String(created.order_id),
        restaurantId: restId,
        tableNumber: queueNumber,
        queueNumber: queueNumber,
        queueLetter: queueNumber,
        pickupType: order.pickupType || "asap",
        scheduledTime: order.scheduledTime,
        pickupQrCode: created.pickup_qr_code || undefined,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (err) {
      console.error("Prisma createOrder error:", err);
      return order;
    }
  }

  async advanceOrderStatus(id: string, nextStatus?: OrderStatus): Promise<OrderDTO | null> {
    try {
      const numId = Number(id);
      const current = await prisma.orders.findUnique({ where: { order_id: numId } });
      if (!current) return null;

      let newStatus: string = nextStatus || "confirmed";
      if (!nextStatus) {
        const isPaid = current.payment_status === "paid" || (current.payment_method !== "cash" && current.payment_method !== "cash_on_delivery");
        if (current.order_status === "pending") newStatus = "confirmed";
        else if (current.order_status === "confirmed") newStatus = "preparing";
        else if (current.order_status === "preparing" || current.order_status === "cooking") newStatus = isPaid ? "paid" : "ready";
        else if (current.order_status === "ready" || current.order_status === "served") newStatus = "paid";
        else newStatus = "completed";
      }

      const updateData: any = {
        order_status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === "confirmed") updateData.confirmed_at = new Date();
      if (newStatus === "cooking" || newStatus === "preparing") {
        updateData.cooking_at = new Date();
        if (!current.cooking_started_at) {
          updateData.cooking_started_at = new Date();
        }
      }
      if (newStatus === "ready" || newStatus === "served") updateData.ready_at = new Date();
      if (newStatus === "completed" || newStatus === "paid") {
        updateData.completed_at = new Date();
        updateData.payment_status = "paid";
      }

      await prisma.orders.update({
        where: { order_id: numId },
        data: updateData,
      });

      const updated = await this.getOrderById(id);
      if (updated) {
        const restId = updated.restaurantId || current.restaurant_id || "global";
        RealtimeService.broadcast(restId, "ORDER_STATUS_CHANGED", updated);
        if (restId !== "global") {
          RealtimeService.broadcast("global", "ORDER_STATUS_CHANGED", updated);
        }
      }
      return updated;
    } catch (err) {
      console.error("Prisma advanceOrderStatus error:", err);
      return null;
    }
  }

  async cancelOrder(orderId: string, reason: string, itemIds?: string[], cancelEntireOrder?: boolean): Promise<OrderDTO | null> {
    try {
      const numId = Number(orderId);
      await prisma.orders.update({
        where: { order_id: numId },
        data: {
          order_status: "cancelled",
          cancel_reason: reason,
          updatedAt: new Date(),
        },
      });
      return this.getOrderById(orderId);
    } catch (err) {
      console.error("Prisma cancelOrder error:", err);
      return null;
    }
  }

  async toggleOrderItemOutOfStock(orderId: string, itemId: string): Promise<OrderDTO | null> {
    try {
      const item = await prisma.order_items.findUnique({
        where: { item_id: Number(itemId) },
        include: { menu: true, selected_options: true },
      });

      if (item) {
        // Toggle the availability: if currently false (out of stock), make it true (in stock), and vice versa
        const isCurrentlyAvailable = item.menu ? item.menu.is_available : false;
        const nextAvailable = !isCurrentlyAvailable;

        // 1. Update the primary menu item (e.g. crust / base menu)
        if (item.menu_id) {
          await prisma.menu.update({
            where: { menu_id: item.menu_id },
            data: { is_available: nextAvailable },
          });
        }

        // 2. Also update by menu_name if it matches a menu
        if (item.menu_name) {
          await prisma.menu.updateMany({
            where: { menu_name: item.menu_name },
            data: { is_available: nextAvailable },
          });
        }

        // 3. Also update any selected toppings in this order item
        const toppingNames = (item.selected_options || [])
          .map((opt) => opt.selected_choice?.trim())
          .filter(Boolean) as string[];

        if (toppingNames.length > 0) {
          await prisma.menu.updateMany({
            where: { menu_name: { in: toppingNames } },
            data: { is_available: nextAvailable },
          });
        }
      }

      return this.getOrderById(orderId);
    } catch (err) {
      console.error("Prisma toggleOrderItemOutOfStock error:", err);
      return null;
    }
  }

  async replaceOrderItem(orderId: string, outOfStockItemId: string, newItem: CartItemDTO): Promise<OrderDTO | null> {
    try {
      await prisma.order_items.delete({ where: { item_id: Number(outOfStockItemId) } });
      const createdItem = await prisma.order_items.create({
        data: {
          order_id: Number(orderId),
          menu_id: Number(newItem.menuItem.id) || 1,
          menu_name: newItem.menuItem.name,
          price: newItem.menuItem.price,
          quantity: newItem.quantity || 1,
          remark: newItem.note || null,
        },
      });

      if (newItem.selectedOptions) {
        for (const opt of newItem.selectedOptions) {
          await prisma.menu_option_orderItem.create({
            data: {
              order_item_id: createdItem.item_id,
              option_name: opt.groupName,
              selected_choice: opt.choiceLabel,
              price: opt.price || 0,
            },
          });
        }
      }

      return this.getOrderById(orderId);
    } catch (err) {
      console.error("Prisma replaceOrderItem error:", err);
      return null;
    }
  }

  async updateOrderItems(orderId: string, items: CartItemDTO[]): Promise<OrderDTO | null> {
    try {
      const numId = Number(orderId);
      const existing = await prisma.orders.findUnique({ where: { order_id: numId } });
      if (!existing) return null;

      // Delete existing order items and their options (cascade / deleteMany)
      await prisma.order_items.deleteMany({ where: { order_id: numId } });

      let newTotal = 0;
      for (const it of items) {
        const itemQty = it.quantity || 1;
        const itemPrice = it.subtotal ? Math.round(it.subtotal / itemQty) : (it.menuItem?.price || 0);
        newTotal += (it.subtotal || (itemPrice * itemQty));

        const createdItem = await prisma.order_items.create({
          data: {
            order_id: numId,
            menu_id: Number(it.menuItem?.id) || 1,
            menu_name: it.menuItem?.name || (it as any).name || "เมนูเครป",
            price: itemPrice,
            quantity: itemQty,
            remark: it.note || null,
          },
        });

        if (it.selectedOptions && it.selectedOptions.length > 0) {
          for (const opt of it.selectedOptions) {
            await prisma.menu_option_orderItem.create({
              data: {
                order_item_id: createdItem.item_id,
                option_name: opt.groupName || "ตัวเลือก",
                selected_choice: opt.choiceLabel || (opt as any).name || "",
                price: opt.price || 0,
              },
            });
          }
        }
      }

      await prisma.orders.update({
        where: { order_id: numId },
        data: {
          total: newTotal,
          updatedAt: new Date(),
        },
      });

      const updated = await this.getOrderById(orderId);
      if (updated) {
        RealtimeService.broadcast(updated.restaurantId || "global", "ORDER_UPDATED", updated);
        if (updated.restaurantId) {
          RealtimeService.broadcast("global", "ORDER_UPDATED", updated);
        }
      }
      return updated;
    } catch (err) {
      console.error("Prisma updateOrderItems error:", err);
      return null;
    }
  }

  async removeOrderItem(orderId: string, itemId: string): Promise<OrderDTO | null> {
    try {
      await prisma.order_items.delete({ where: { item_id: Number(itemId) } });
      return this.getOrderById(orderId);
    } catch (err) {
      console.error("Prisma removeOrderItem error:", err);
      return null;
    }
  }

  async getOrderSlip(orderId: string): Promise<{ orderId: string; hasSlip: boolean; slipUrl?: string; total: number; tableNumber: number | string } | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;
    return {
      orderId: order.id,
      hasSlip: !!order.hasSlip,
      slipUrl: order.slipUrl,
      total: order.total,
      tableNumber: order.tableNumber,
    };
  }

  // ==========================================
  // ==========================================
  // Analytics & Summary (Strictly Paid Orders Only)
  // ==========================================
  async getSalesStats(restaurantId?: string | number): Promise<RestaurantStatsDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayStart = new Date(`${todayStr}T00:00:00.000+07:00`);
      const todayEnd = new Date(`${todayStr}T23:59:59.999+07:00`);

      const [todayOrders, allCompletedOrders] = await Promise.all([
        prisma.orders.findMany({
          where: {
            restaurant_id: restId,
            order_status: { notIn: ["cancelled", "declined"] },
            payment_status: { notIn: ["pending", "declined", "failed", "unpaid"] },
            OR: [
              { payment_status: { in: ["paid", "completed", "received", "success"] } },
              { order_status: { in: ["completed", "paid"] } },
            ],
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.orders.findMany({
          where: {
            restaurant_id: restId,
            order_status: { notIn: ["cancelled", "declined"] },
            payment_status: { notIn: ["pending", "declined", "failed", "unpaid"] },
            OR: [
              { payment_status: { in: ["paid", "completed", "received", "success"] } },
              { order_status: { in: ["completed", "paid"] } },
            ],
          },
        }),
      ]);

      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const todayCount = todayOrders.length;
      const avgBill = todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0;
      const weekRevenue = allCompletedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        todayRevenue,
        todayOrders: todayCount,
        avgBill,
        weekRevenue,
        revenueTrend: 12.5,
        ordersTrend: 8.3,
        weekTrend: 15.0,
      };
    } catch (err) {
      console.error("Prisma getSalesStats error:", err);
      return {
        todayRevenue: 0,
        todayOrders: 0,
        avgBill: 0,
        weekRevenue: 0,
        revenueTrend: 0,
        ordersTrend: 0,
        weekTrend: 0,
      };
    }
  }

  async getDailySales(restaurantId?: string | number, timeframe?: string, day?: string, month?: string, year?: string): Promise<DailySalesDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const tf = timeframe || (day ? "daily" : month ? "monthly" : year ? "yearly" : "daily");

      let dateFilter: any = {};
      if (tf === "daily") {
        const targetDay = day || new Date().toISOString().slice(0, 10);
        dateFilter = {
          createdAt: {
            gte: new Date(`${targetDay}T00:00:00.000+07:00`),
            lte: new Date(`${targetDay}T23:59:59.999+07:00`),
          },
        };
      } else if (tf === "weekly") {
        const baseDate = day ? new Date(`${day}T12:00:00.000+07:00`) : new Date();
        const dayOfWeek = baseDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + diffToMonday);
        const startDayStr = monday.toISOString().slice(0, 10);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const endDayStr = sunday.toISOString().slice(0, 10);
        dateFilter = {
          createdAt: {
            gte: new Date(`${startDayStr}T00:00:00.000+07:00`),
            lte: new Date(`${endDayStr}T23:59:59.999+07:00`),
          },
        };
      } else if (tf === "monthly") {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const [y, m] = targetMonth.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        dateFilter = {
          createdAt: {
            gte: new Date(`${targetMonth}-01T00:00:00.000+07:00`),
            lte: new Date(`${targetMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999+07:00`),
          },
        };
      } else if (tf === "yearly") {
        const targetYear = year || String(new Date().getFullYear());
        dateFilter = {
          createdAt: {
            gte: new Date(`${targetYear}-01-01T00:00:00.000+07:00`),
            lte: new Date(`${targetYear}-12-31T23:59:59.999+07:00`),
          },
        };
      }

      // Query ONLY paid/completed orders
      const orders = await prisma.orders.findMany({
        where: {
          restaurant_id: restId,
          order_status: { notIn: ["cancelled", "declined"] },
          payment_status: { notIn: ["pending", "declined", "failed", "unpaid"] },
          OR: [
            { payment_status: { in: ["paid", "completed", "received", "success"] } },
            { order_status: { in: ["completed", "paid"] } },
          ],
          ...dateFilter,
        },
        orderBy: { createdAt: "asc" },
      });

      if (tf === "daily") {
        const hourlyMap: Record<string, { revenue: number; orders: number }> = {};
        for (let h = 8; h <= 21; h++) {
          const timeKey = `${String(h).padStart(2, "0")}:00`;
          hourlyMap[timeKey] = { revenue: 0, orders: 0 };
        }
        for (const o of orders) {
          const d = new Date(o.createdAt);
          const hourKey = `${String(d.getHours()).padStart(2, "0")}:00`;
          if (hourlyMap[hourKey]) {
            hourlyMap[hourKey].revenue += Number(o.total || 0);
            hourlyMap[hourKey].orders += 1;
          }
        }
        return Object.entries(hourlyMap).map(([time, val]) => ({
          time,
          label: time,
          revenue: val.revenue,
          orders: val.orders,
        }));
      }

      if (tf === "weekly") {
        const dayNames = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
        const dayMap: Record<string, { revenue: number; orders: number }> = {};
        dayNames.forEach((d) => { dayMap[d] = { revenue: 0, orders: 0 }; });

        for (const o of orders) {
          const d = new Date(o.createdAt);
          const jsDay = d.getDay(); // 0 is Sunday, 1 is Monday...
          const idx = jsDay === 0 ? 6 : jsDay - 1;
          const key = dayNames[idx];
          if (dayMap[key]) {
            dayMap[key].revenue += Number(o.total || 0);
            dayMap[key].orders += 1;
          }
        }

        return Object.entries(dayMap).map(([label, val]) => ({
          time: label,
          label,
          revenue: val.revenue,
          orders: val.orders,
        }));
      }

      if (tf === "monthly") {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const [y, m] = targetMonth.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const dateMap: Record<string, { revenue: number; orders: number }> = {};
        for (let d = 1; d <= lastDay; d++) {
          const k = String(d);
          dateMap[k] = { revenue: 0, orders: 0 };
        }

        for (const o of orders) {
          const d = new Date(o.createdAt);
          const key = String(d.getDate());
          if (dateMap[key]) {
            dateMap[key].revenue += Number(o.total || 0);
            dateMap[key].orders += 1;
          }
        }

        return Object.entries(dateMap).map(([dStr, val]) => ({
          time: `วันที่ ${dStr}`,
          label: `วันที่ ${dStr}`,
          revenue: val.revenue,
          orders: val.orders,
        }));
      }

      if (tf === "yearly") {
        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const monthMap: Record<string, { revenue: number; orders: number }> = {};
        monthNames.forEach((m) => { monthMap[m] = { revenue: 0, orders: 0 }; });

        for (const o of orders) {
          const d = new Date(o.createdAt);
          const key = monthNames[d.getMonth()];
          if (monthMap[key]) {
            monthMap[key].revenue += Number(o.total || 0);
            monthMap[key].orders += 1;
          }
        }

        return Object.entries(monthMap).map(([label, val]) => ({
          time: label,
          label,
          revenue: val.revenue,
          orders: val.orders,
        }));
      }

      return [];
    } catch (err) {
      console.error("Prisma getDailySales error:", err);
      return [];
    }
  }

  async getRecentOrders(restaurantId?: string | number, limit: number = 10): Promise<OrderDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const orders = await prisma.orders.findMany({
        where: {
          restaurant_id: restId,
          order_status: { notIn: ["cancelled", "declined"] },
          payment_status: { notIn: ["pending", "declined", "failed", "unpaid"] },
          OR: [
            { payment_status: { in: ["paid", "completed", "received", "success"] } },
            { order_status: { in: ["paid", "completed"] } },
          ],
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              menu: {
                include: { images: true, category: true },
              },
              selected_options: {
                include: { menuOptions: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return orders.map((o) => {
        const queueNum = o.queue_number || `A${String(o.order_id).padStart(3, "0")}`;
        return {
          id: String(o.order_id),
          restaurantId: o.restaurant_id,
          tableId: String(o.order_id),
          tableNumber: queueNum,
          queueNumber: queueNum,
          queueLetter: queueNum,
          items: (o.orderItems || []).map((it) => {
            const imgs = (it.menu?.images || []).map((im) => im.image_url || "").filter(Boolean);
            const isOutOfStock = it.menu?.is_available === false;
            return {
              id: String(it.item_id),
              menuItem: {
                id: String(it.menu_id),
                name: it.menu_name || it.menu?.menu_name || "เมนูเครป",
                price: Number(it.price) || 0,
                category: it.menu?.category?.category_name || "",
                image: imgs[0] || it.menu?.image_url || "",
                images: imgs,
                available: !isOutOfStock,
              },
              quantity: it.quantity || 1,
              note: it.remark || undefined,
              selectedOptions: (it.selected_options || []).map((opt) => ({
                groupName: opt.option_name || opt.menuOptions?.option_name || "ตัวเลือก",
                choiceLabel: opt.selected_choice || "",
                price: Number(opt.price) || 0,
              })),
              subtotal: Number(it.price) * (it.quantity || 1),
              isOutOfStock,
            };
          }),
          total: Number(o.total) || 0,
          status: (o.order_status as any) || "pending",
          hasSlip: o.has_slip,
          slipUrl: o.slip_url || undefined,
          deviceId: o.device_id || undefined,
          customerId: o.customer_id || o.customer?.customer_id || undefined,
          customerNickname: o.customer_nickname || o.customer?.nickname || undefined,
          customerPhone: o.customer_phone || o.customer?.phone || undefined,
          pickupType: (o.pickup_type as any) || "asap",
          scheduledTime: o.scheduled_time || undefined,
          pickupQrCode: o.pickup_qr_code || undefined,
          paymentMethod: (o.payment_method as any) || "promptpay",
          paymentStatus: (o.payment_status as any) || "pending",
          cookingStartedAt: o.cooking_started_at ? new Date(o.cooking_started_at).toISOString() : undefined,
          confirmedAt: o.confirmed_at ? new Date(o.confirmed_at).toISOString() : undefined,
          readyAt: o.ready_at ? new Date(o.ready_at).toISOString() : undefined,
          completedAt: o.completed_at ? new Date(o.completed_at).toISOString() : undefined,
          cancelReason: o.cancel_reason || undefined,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error("Prisma getRecentOrders error:", err);
      return [];
    }
  }

  async getSalesSummary(restaurantId?: string | number, params?: SummaryQueryParams): Promise<RestaurantSummaryResponseDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const tf = params?.timeframe || (params?.day ? "daily" : params?.month ? "monthly" : params?.year ? "yearly" : "daily");

      let dateFilter: any = {};
      if (tf === "daily") {
        const targetDay = params?.day || new Date().toISOString().slice(0, 10);
        dateFilter = {
          OR: [
            {
              createdAt: {
                gte: new Date(`${targetDay}T00:00:00.000+07:00`),
                lte: new Date(`${targetDay}T23:59:59.999+07:00`),
              },
            },
            { queue_date: targetDay },
          ],
        };
      } else if (tf === "weekly") {
        const baseDate = params?.day ? new Date(`${params.day}T12:00:00.000+07:00`) : new Date();
        const dayOfWeek = baseDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + diffToMonday);
        const startDayStr = monday.toISOString().slice(0, 10);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const endDayStr = sunday.toISOString().slice(0, 10);
        dateFilter = {
          OR: [
            {
              createdAt: {
                gte: new Date(`${startDayStr}T00:00:00.000+07:00`),
                lte: new Date(`${endDayStr}T23:59:59.999+07:00`),
              },
            },
            {
              queue_date: {
                gte: startDayStr,
                lte: endDayStr,
              },
            },
          ],
        };
      } else if (tf === "monthly") {
        const targetMonth = params?.month || new Date().toISOString().slice(0, 7);
        const [y, m] = targetMonth.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        dateFilter = {
          OR: [
            {
              createdAt: {
                gte: new Date(`${targetMonth}-01T00:00:00.000+07:00`),
                lte: new Date(`${targetMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999+07:00`),
              },
            },
            {
              queue_date: {
                startsWith: targetMonth,
              },
            },
          ],
        };
      } else if (tf === "yearly") {
        const targetYear = params?.year || String(new Date().getFullYear());
        dateFilter = {
          OR: [
            {
              createdAt: {
                gte: new Date(`${targetYear}-01-01T00:00:00.000+07:00`),
                lte: new Date(`${targetYear}-12-31T23:59:59.999+07:00`),
              },
            },
            {
              queue_date: {
                startsWith: targetYear,
              },
            },
          ],
        };
      }

      // 1. Query ALL orders in the selected period (to display order list & statuses accurately)
      const allPeriodOrders = await prisma.orders.findMany({
        where: {
          restaurant_id: restId,
          ...dateFilter,
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              menu: {
                include: { images: true, category: true },
              },
              selected_options: {
                include: { menuOptions: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2. Filter ONLY paid/completed orders for financial statistics & ranking aggregations
      const paidOrders = allPeriodOrders.filter((o) => {
        if (o.order_status === "cancelled" || o.order_status === "declined") return false;
        if (o.payment_status === "paid" || o.payment_status === "completed" || o.payment_status === "received" || o.payment_status === "success") return true;
        if (o.order_status === "paid" || o.order_status === "completed") return true;
        if (o.has_slip || o.slip_url) return true;
        return false;
      });

      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalOrders = paidOrders.length;
      const avgBill = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      // Pre-load all available menu/fillings and crusts to match images and details
      const [allMenus, allCrusts] = await Promise.all([
        prisma.menu.findMany({
          where: { restaurantId: restId },
          include: { images: true, category: true },
        }),
        prisma.crepe_crusts.findMany({
          where: { restaurantId: restId },
        }),
      ]);

      const menuLookup = new Map<string, { name: string; price: number; category: string; image?: string }>();
      for (const m of allMenus) {
        const img = (m.images && m.images[0]?.image_url) || m.image_url || "";
        const catName = m.category?.category_name || "ไส้เครป";
        menuLookup.set(m.menu_name.trim().toLowerCase(), {
          name: m.menu_name.trim(),
          price: Number(m.price) || 0,
          category: catName,
          image: img,
        });
      }

      const crustLookup = new Map<string, { name: string; price: number; image?: string }>();
      for (const c of allCrusts) {
        const img = c.image_url || "";
        crustLookup.set(c.crust_name.trim().toLowerCase(), {
          name: c.crust_name.trim(),
          price: Number(c.price) || 0,
          image: img,
        });
      }

      // Best-selling fillings (ไส้ขายดี) and crusts (แป้งขายดี) aggregated strictly from paid orders
      const fillingMap: Record<string, { name: string; category: string; unitsSold: number; totalRevenue: number; image?: string }> = {};
      const crustMap: Record<string, { name: string; category: string; unitsSold: number; totalRevenue: number; image?: string }> = {};
      const categoryMap: Record<string, number> = {};

      const isCrustCandidate = (raw: string): boolean => {
        const lower = raw.trim().toLowerCase();
        if (crustLookup.has(lower)) return true;
        if (lower.startsWith("แป้ง") || lower.startsWith("แผ่น") || lower.startsWith("เครปกรอบ") || lower.startsWith("เครปนุ่ม")) return true;
        return false;
      };

      const formatStandardCrustName = (raw: string): string => {
        let c = raw.trim();
        if (c.startsWith("แผ่น")) {
          c = c.replace(/^แผ่น/, "แป้ง");
        } else if (c.startsWith("เครป")) {
          c = c.replace(/^เครป/, "แป้ง");
        } else if (!c.startsWith("แป้ง")) {
          c = `แป้ง${c}`;
        }
        return c;
      };

      for (const o of paidOrders) {
        for (const it of o.orderItems || []) {
          const qty = it.quantity || 1;
          const foundFillings: string[] = [];
          let foundCrust: string | null = null;

          // 1. Process selected options
          if (it.selected_options && it.selected_options.length > 0) {
            for (const opt of it.selected_options) {
              const choice = opt.selected_choice?.trim();
              if (!choice) continue;
              const gName = (opt.menuOptions?.option_name || "").toLowerCase();

              // Check if this option is crust
              if (
                gName.includes("แป้ง") ||
                gName.includes("crust") ||
                gName.includes("base") ||
                isCrustCandidate(choice)
              ) {
                if (!foundCrust) {
                  foundCrust = choice;
                }
                continue;
              }

              // Skip takeaway/dinein or empty options
              if (choice.includes("กลับบ้าน") || choice.includes("ทานที่ร้าน") || choice.includes("ไม่ใส่")) {
                continue;
              }

              // It's a filling
              if (!foundFillings.includes(choice)) {
                foundFillings.push(choice);
              }
            }
          }

          // 2. Process menu item name
          const rawItemName = (it.menu_name || it.menu?.menu_name || "").trim();
          const cleanName = rawItemName.replace(/^.*?[·•]\s*/, "").trim();

          // If no crust found from options, check menu name
          if (!foundCrust && rawItemName) {
            if (isCrustCandidate(rawItemName)) {
              foundCrust = rawItemName.split(/[·•+,-]/)[0].trim();
            } else if (rawItemName.includes("แป้ง") || rawItemName.includes("แผ่น")) {
              const mMatch = rawItemName.match(/(?:แป้ง|แผ่น)[^\s+•·,-]+/);
              if (mMatch) {
                foundCrust = mMatch[0].trim();
              }
            }
          }

          // Extract fillings from menu name if formatted e.g. "เครปกรอบ · ฝอยทอง + นูเทลล่า"
          if (cleanName) {
            const splitParts = cleanName
              .split(/[+,/]/)
              .map((p) => p.trim())
              .filter((p) => p && !isCrustCandidate(p) && p !== "เครป" && p !== "เมนูเครป" && !p.includes("ไม่ใส่ไส้"));

            for (const p of splitParts) {
              if (!foundFillings.includes(p)) {
                foundFillings.push(p);
              }
            }
          }

          // If no specific filling parsed and cleanName is not a crust, use cleanName
          if (foundFillings.length === 0 && cleanName && !isCrustCandidate(cleanName) && cleanName !== "เมนูเครป" && cleanName !== "เครป") {
            foundFillings.push(cleanName);
          }

          // Aggregate Crust
          if (foundCrust) {
            const crustStd = formatStandardCrustName(foundCrust);
            const lookup = crustLookup.get(foundCrust.toLowerCase()) || crustLookup.get(crustStd.toLowerCase());
            const img = lookup?.image || "";
            const price = lookup?.price || 0;

            if (!crustMap[crustStd]) {
              crustMap[crustStd] = {
                name: crustStd,
                category: "แป้งเครป",
                unitsSold: 0,
                totalRevenue: 0,
                image: img,
              };
            }
            crustMap[crustStd].unitsSold += qty;
            crustMap[crustStd].totalRevenue += price * qty;
          }

          // Aggregate Fillings
          for (const fName of foundFillings) {
            const lookup = menuLookup.get(fName.toLowerCase());
            const img = lookup?.image || (it.menu?.images && it.menu.images[0]?.image_url) || it.menu?.image_url || "";
            const cat = lookup?.category || it.menu?.category?.category_name || "ไส้เครป";
            const price = lookup?.price || (foundFillings.length > 0 ? Math.round(Number(it.price || 0) / foundFillings.length) : Number(it.price || 0));

            if (!fillingMap[fName]) {
              fillingMap[fName] = {
                name: fName,
                category: cat,
                unitsSold: 0,
                totalRevenue: 0,
                image: img,
              };
            }
            fillingMap[fName].unitsSold += qty;
            fillingMap[fName].totalRevenue += price * qty;

            categoryMap[cat] = (categoryMap[cat] || 0) + price * qty;
          }
        }
      }

      const totalFillingsCount = Object.values(fillingMap).reduce((s, f) => s + f.unitsSold, 0);
      const totalCrustsCount = Object.values(crustMap).reduce((s, c) => s + c.unitsSold, 0);

      const bestSellers: BestSellerItemDTO[] = Object.entries(fillingMap)
        .map(([name, val], idx) => ({
          id: `filling-${idx + 1}`,
          name: val.name,
          category: val.category || "ไส้เครป",
          image: val.image,
          price: val.unitsSold > 0 ? Math.round(val.totalRevenue / val.unitsSold) : 0,
          unitsSold: val.unitsSold,
          totalRevenue: val.totalRevenue,
          percentage: totalFillingsCount > 0 ? Math.round((val.unitsSold / totalFillingsCount) * 100) : 0,
          growth: 10,
        }))
        .sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      const bestCrusts: BestSellerItemDTO[] = Object.entries(crustMap)
        .map(([name, val], idx) => ({
          id: `crust-${idx + 1}`,
          name: val.name,
          category: "แป้งเครป",
          image: val.image,
          price: val.unitsSold > 0 ? Math.round(val.totalRevenue / val.unitsSold) : 0,
          unitsSold: val.unitsSold,
          totalRevenue: val.totalRevenue,
          percentage: totalCrustsCount > 0 ? Math.round((val.unitsSold / totalCrustsCount) * 100) : 0,
          growth: 10,
        }))
        .sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      const chartData = await this.getDailySales(restId, tf, params?.day, params?.month, params?.year);

      // Find peak time slot from chartData
      let peakLabel = "-";
      let maxChartRev = 0;
      for (const pt of chartData) {
        if (pt.revenue > maxChartRev) {
          maxChartRev = pt.revenue;
          peakLabel = pt.label || pt.time || "-";
        }
      }

      const CATEGORY_COLORS = ["#E11D48", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
      const categoryShare = Object.entries(categoryMap).length > 0
        ? Object.entries(categoryMap).map(([name, val], i) => ({
            name,
            value: val,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }))
        : [
            { name: "เครปหวาน", value: 0, color: "#E11D48" },
            { name: "เครปคาว", value: 0, color: "#F59E0B" },
          ];

      // Map all period orders to standard OrderDTO
      const mappedOrders: OrderDTO[] = allPeriodOrders.map((o) => {
        const queueNum = o.queue_number || `A${String(o.order_id).padStart(3, "0")}`;
        const rawMethod = String(o.payment_method || "").toLowerCase();
        const isCash = rawMethod.includes("cash") || rawMethod.includes("เงินสด") || rawMethod.includes("หน้าร้าน");
        const isPaid = o.payment_status === "paid" || o.order_status === "paid" || o.order_status === "completed" || Boolean(o.slip_url || o.has_slip);
        let mappedStatus = (o.order_status as any) || "pending";
        if (!isCash && isPaid && (mappedStatus === "served" || mappedStatus === "ready")) {
          mappedStatus = "paid";
        }

        return {
          id: String(o.order_id),
          restaurantId: o.restaurant_id,
          tableId: String(o.order_id),
          tableNumber: queueNum,
          queueNumber: queueNum,
          queueLetter: queueNum,
          items: (o.orderItems || []).map((it) => {
            const imgs = (it.menu?.images || []).map((im) => im.image_url || "").filter(Boolean);
            const isOutOfStock = it.menu?.is_available === false;
            return {
              id: String(it.item_id),
              menuItem: {
                id: String(it.menu_id),
                name: it.menu_name || it.menu?.menu_name || "เมนูเครป",
                price: Number(it.price) || 0,
                category: it.menu?.category?.category_name || "",
                image: imgs[0] || it.menu?.image_url || "",
                images: imgs,
                available: !isOutOfStock,
              },
              quantity: it.quantity || 1,
              note: it.remark || undefined,
              selectedOptions: (it.selected_options || []).map((opt) => ({
                groupName: opt.option_name || opt.menuOptions?.option_name || "ตัวเลือก",
                choiceLabel: opt.selected_choice || "",
                price: Number(opt.price) || 0,
              })),
              subtotal: Number(it.price) * (it.quantity || 1),
              isOutOfStock,
            };
          }),
          total: Number(o.total) || 0,
          status: mappedStatus,
          hasSlip: Boolean(o.has_slip || o.slip_url),
          slipUrl: o.slip_url || undefined,
          deviceId: o.device_id || undefined,
          customerId: o.customer_id || o.customer?.customer_id || undefined,
          customerNickname: o.customer_nickname || o.customer?.nickname || undefined,
          customerPhone: o.customer_phone || o.customer?.phone || undefined,
          pickupType: (o.pickup_type as any) || "asap",
          scheduledTime: o.scheduled_time || undefined,
          pickupQrCode: o.pickup_qr_code || undefined,
          paymentMethod: (o.payment_method as any) || "promptpay",
          paymentStatus: isPaid ? "paid" : (o.payment_status as any) || "pending",
          cookingStartedAt: o.cooking_started_at ? new Date(o.cooking_started_at).toISOString() : undefined,
          confirmedAt: o.confirmed_at ? new Date(o.confirmed_at).toISOString() : undefined,
          readyAt: o.ready_at ? new Date(o.ready_at).toISOString() : undefined,
          completedAt: o.completed_at ? new Date(o.completed_at).toISOString() : undefined,
          cancelReason: o.cancel_reason || undefined,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        };
      });

      return {
        stats: {
          revenue: totalRevenue,
          orders: totalOrders,
          avgBill,
          peakTime: peakLabel,
          peakDay: peakLabel,
          peakWeek: peakLabel,
          peakMonth: peakLabel,
          growth: 15.2,
        },
        chartData,
        bestSellers,
        bestCrusts,
        categoryShare,
        orders: mappedOrders,
      };
    } catch (err) {
      console.error("Prisma getSalesSummary error:", err);
      return {
        stats: { revenue: 0, orders: 0, avgBill: 0, growth: 0 },
        chartData: [],
        bestSellers: [],
        bestCrusts: [],
        categoryShare: [],
        orders: [],
      };
    }
  }


  // ==========================================
  // Menu & Categories
  // ==========================================
  async getCategories(restaurantId?: string | number): Promise<CategoryDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const cats = await prisma.menu_categories.findMany({
        where: { restaurantId: restId, is_active: true },
        orderBy: { category_order: "asc" },
      });

      return cats.map((c) => ({
        id: String(c.category_id),
        category_id: c.category_id,
        category_name: c.category_name,
        name: c.category_name,
        label: c.category_name,
        remark: c.remark || undefined,
      }));
    } catch (err) {
      console.error("Prisma getCategories error:", err);
      return [];
    }
  }

  async createCategory(data: Partial<CategoryDTO> | { category_name?: string; name?: string; label?: string; remark?: string }, restaurantId?: string | number): Promise<CategoryDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const name = (data as any).category_name || (data as any).name || (data as any).label || "หมวดหมู่ใหม่";
      const created = await prisma.menu_categories.create({
        data: {
          category_name: name,
          remark: data.remark || null,
          restaurantId: restId,
        },
      });
      return {
        id: String(created.category_id),
        category_id: created.category_id,
        name: created.category_name,
        label: created.category_name,
        remark: created.remark || undefined,
      };
    } catch (err) {
      console.error("Prisma createCategory error:", err);
      return { id: `cat-${Date.now()}`, label: "หมวดหมู่ใหม่" };
    }
  }

  async createCategories(labels: (string | Partial<CategoryDTO>)[], restaurantId?: string | number): Promise<CategoryDTO[]> {
    const results: CategoryDTO[] = [];
    for (const item of labels) {
      if (typeof item === "string") {
        results.push(await this.createCategory({ label: item }, restaurantId));
      } else {
        results.push(await this.createCategory(item, restaurantId));
      }
    }
    return results;
  }

  async updateCategory(id: string | number, data: Partial<CategoryDTO> | string | { category_name?: string; name?: string; label?: string; remark?: string }): Promise<CategoryDTO | null> {
    try {
      const numId = Number(id);
      const name = typeof data === "string" ? data : (data as any).category_name || (data as any).name || (data as any).label;
      const remark = typeof data === "object" ? data.remark : undefined;

      const updated = await prisma.menu_categories.update({
        where: { category_id: numId },
        data: {
          ...(name ? { category_name: name } : {}),
          ...(remark !== undefined ? { remark } : {}),
        },
      });

      return {
        id: String(updated.category_id),
        category_id: updated.category_id,
        name: updated.category_name,
        label: updated.category_name,
        remark: updated.remark || undefined,
      };
    } catch (err) {
      console.error("Prisma updateCategory error:", err);
      return null;
    }
  }

  async deleteCategory(id: string | number): Promise<boolean> {
    try {
      await prisma.menu_categories.delete({ where: { category_id: Number(id) } });
      return true;
    } catch (err) {
      console.error("Prisma deleteCategory error:", err);
      return false;
    }
  }

  async getMenuItems(options: RestaurantQueryOptions): Promise<{ data: MenuItemDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const restId = await resolveRestaurantId(options.restaurantId);
      const where: any = { restaurantId: restId };

      if (options.category && options.category !== "all") {
        where.category = { category_name: options.category };
      }
      if (options.search) {
        where.OR = [
          { menu_name: { contains: options.search } },
          { description: { contains: options.search } },
        ];
      }

      const total = await prisma.menu.count({ where });
      const page = options.page || 1;
      const limit = options.limit || 50;
      const totalPages = Math.ceil(total / limit) || 1;

      const menus = await prisma.menu.findMany({
        where,
        include: {
          category: true,
          images: true,
          options: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { menu_id: "asc" },
      });

      const data: MenuItemDTO[] = menus.map((m) => {
        const imgs = (m.images || []).map((img) => img.image_url || "").filter(Boolean);
        const optGroups: OptionGroup[] = (m.options || []).map((opt) => {
          let choices: OptionChoice[] = [];
          if (opt.choices) {
            try {
              const parsed = JSON.parse(opt.choices);
              if (Array.isArray(parsed)) {
                choices = parsed.map((c: any) => ({
                  label: typeof c === "string" ? c : c.name || c.label || "",
                  price: Number(c.price) || 0,
                }));
              }
            } catch {
              choices = opt.choices.split(",").map((s) => ({ label: s.trim(), price: 0 })).filter((c) => c.label);
            }
          }
          return {
            name: opt.option_name || "",
            required: opt.required,
            allowMultiple: opt.allowMultiple,
            choices,
          };
        });

        return {
          id: String(m.menu_id),
          restaurantId: m.restaurantId,
          name: m.menu_name || "",
          description: m.description || "",
          price: Number(m.price) || 0,
          image: imgs[0] || m.image_url || "",
          images: imgs,
          category: m.category?.category_name || "",
          popular: m.is_popular || false,
          available: m.is_available !== false,
          optionGroups: optGroups,
          options: {
            optionGroups: optGroups,
          },
        };
      });

      return { data, total, page, limit, totalPages };
    } catch (err) {
      console.error("Prisma getMenuItems error:", err);
      return { data: [], total: 0, page: 1, limit: 50, totalPages: 1 };
    }
  }

  async getMenuItemById(id: string): Promise<MenuItemDTO | null> {
    try {
      const numId = Number(id);
      const m = await prisma.menu.findUnique({
        where: { menu_id: numId },
        include: { category: true, images: true, options: true },
      });
      if (!m) return null;

      const optGroups: OptionGroup[] = (m.options || []).map((opt) => {
        let choices: OptionChoice[] = [];
        if (opt.choices) {
          try {
            const parsed = JSON.parse(opt.choices);
            if (Array.isArray(parsed)) {
              choices = parsed.map((c: any) => ({
                label: typeof c === "string" ? c : c.name || c.label || "",
                price: Number(c.price) || 0,
              }));
            }
          } catch {
            choices = opt.choices.split(",").map((s) => ({ label: s.trim(), price: 0 })).filter((c) => c.label);
          }
        }
        return {
          name: opt.option_name || "",
          required: opt.required,
          allowMultiple: opt.allowMultiple,
          choices,
        };
      });

      const imgs = (m.images || []).map((img) => img.image_url || "").filter(Boolean);
      return {
        id: String(m.menu_id),
        restaurantId: m.restaurantId,
        name: m.menu_name || "",
        description: m.description || "",
        price: Number(m.price) || 0,
        image: imgs[0] || m.image_url || "",
        images: imgs,
        category: m.category?.category_name || "",
        popular: m.is_popular || false,
        available: m.is_available !== false,
        optionGroups: optGroups,
        options: {
          optionGroups: optGroups,
        },
      };
    } catch (err) {
      console.error("Prisma getMenuItemById error:", err);
      return null;
    }
  }

  async createMenuItem(item: MenuItemDTO): Promise<MenuItemDTO> {
    try {
      const restId = item.restaurantId ? Number(item.restaurantId) : await resolveRestaurantId();
      let categoryId: number | null = null;
      if (item.category) {
        const cat = await prisma.menu_categories.findFirst({ where: { category_name: item.category, restaurantId: restId } });
        if (cat) categoryId = cat.category_id;
      }

      const created = await prisma.menu.create({
        data: {
          restaurantId: restId,
          menu_name: item.name,
          description: item.description || null,
          price: item.price || 0,
          is_available: item.available !== false,
          is_popular: !!item.popular,
          image_url: item.image || null,
          category_id: categoryId,
        },
        include: { category: true },
      });

      const imagesList = Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : item.image ? [item.image] : [];

      for (const imgUrl of imagesList) {
        if (imgUrl && typeof imgUrl === "string") {
          await prisma.menu_images.create({
            data: {
              menu_id: created.menu_id,
              image_url: imgUrl,
            },
          });
        }
      }

      const optionGroups = item.optionGroups || item.options?.optionGroups || [];
      for (const grp of optionGroups) {
        if (grp && grp.name) {
          await prisma.menu_options.create({
            data: {
              menu_id: created.menu_id,
              option_name: grp.name,
              required: !!grp.required,
              allowMultiple: !!grp.allowMultiple,
              choices: JSON.stringify(grp.choices || []),
            },
          });
        }
      }

      return {
        id: String(created.menu_id),
        restaurantId: created.restaurantId,
        name: created.menu_name || "",
        description: created.description || "",
        price: Number(created.price) || 0,
        image: imagesList[0] || created.image_url || "",
        images: imagesList,
        category: created.category?.category_name || item.category || "",
        popular: created.is_popular || false,
        available: created.is_available !== false,
        optionGroups,
        options: { optionGroups },
      };
    } catch (err) {
      console.error("Prisma createMenuItem error:", err);
      return { ...item, id: item.id || `m-${Date.now()}` };
    }
  }

  async updateMenuItem(id: string, item: Partial<MenuItemDTO>): Promise<MenuItemDTO | null> {
    try {
      const numId = Number(id);
      let categoryId: number | undefined | null = undefined;
      if (item.category !== undefined) {
        if (!item.category) {
          categoryId = null;
        } else {
          const cat = await prisma.menu_categories.findFirst({ where: { category_name: item.category } });
          categoryId = cat ? cat.category_id : null;
        }
      }

      const updated = await prisma.menu.update({
        where: { menu_id: numId },
        data: {
          ...(item.name !== undefined ? { menu_name: item.name } : {}),
          ...(item.description !== undefined ? { description: item.description || null } : {}),
          ...(item.price !== undefined ? { price: item.price } : {}),
          ...(item.available !== undefined ? { is_available: item.available } : {}),
          ...(item.popular !== undefined ? { is_popular: item.popular } : {}),
          ...(item.image !== undefined ? { image_url: item.image } : {}),
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
          updatedAt: new Date(),
        },
        include: { category: true },
      });

      if (item.images !== undefined || item.image !== undefined) {
        await prisma.menu_images.deleteMany({ where: { menu_id: numId } });
        const finalImages = Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : item.image ? [item.image] : [];

        for (const imgUrl of finalImages) {
          if (imgUrl && typeof imgUrl === "string") {
            await prisma.menu_images.create({
              data: {
                menu_id: numId,
                image_url: imgUrl,
              },
            });
          }
        }
      }

      const finalOptionGroups = item.optionGroups || item.options?.optionGroups;
      if (finalOptionGroups !== undefined) {
        await prisma.menu_options.deleteMany({ where: { menu_id: numId } });
        for (const grp of finalOptionGroups) {
          if (grp && grp.name) {
            await prisma.menu_options.create({
              data: {
                menu_id: numId,
                option_name: grp.name,
                required: !!grp.required,
                allowMultiple: !!grp.allowMultiple,
                choices: JSON.stringify(grp.choices || []),
              },
            });
          }
        }
      }

      return this.getMenuItemById(id);
    } catch (err) {
      console.error("Prisma updateMenuItem error:", err);
      return null;
    }
  }

  async toggleMenuItemAvailability(id: string): Promise<MenuItemDTO | null> {
    try {
      const current = await prisma.menu.findUnique({ where: { menu_id: Number(id) } });
      if (!current) return null;
      return this.updateMenuItem(id, { available: !current.is_available });
    } catch (err) {
      console.error("Prisma toggleMenuItemAvailability error:", err);
      return null;
    }
  }

  async updateMenuBatchAvailability(items: Array<{ id: string | number; isAvailable: boolean }>, restaurantId?: string | number): Promise<boolean> {
    try {
      for (const item of items) {
        const numId = Number(item.id);
        if (!isNaN(numId)) {
          await prisma.menu.update({
            where: { menu_id: numId },
            data: { is_available: !!item.isAvailable },
          });
        }
      }
      return true;
    } catch (err) {
      console.error("Prisma updateMenuBatchAvailability error:", err);
      return false;
    }
  }

  async toggleMenuItemPopular(id: string): Promise<MenuItemDTO | null> {
    try {
      const current = await prisma.menu.findUnique({ where: { menu_id: Number(id) } });
      if (!current) return null;
      return this.updateMenuItem(id, { popular: !current.is_popular });
    } catch (err) {
      console.error("Prisma toggleMenuItemPopular error:", err);
      return null;
    }
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    try {
      const numId = Number(id);
      await prisma.menu_images.deleteMany({ where: { menu_id: numId } });
      await prisma.menu_options.deleteMany({ where: { menu_id: numId } });
      await prisma.menu.delete({ where: { menu_id: numId } });
      return true;
    } catch (err) {
      console.error("Prisma deleteMenuItem error:", err);
      return false;
    }
  }

  // ==========================================
  // Crepe Crusts Management
  // ==========================================
  async getCrusts(restaurantId?: string | number): Promise<CrustDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const items = await prisma.crepe_crusts.findMany({
        where: { restaurantId: restId },
        orderBy: [{ sort_order: "asc" }, { crust_id: "asc" }],
      });

      return items.map((c) => ({
        id: c.crust_id,
        crust_id: c.crust_id,
        restaurantId: c.restaurantId,
        name: c.crust_name,
        crust_name: c.crust_name,
        description: c.description || "",
        price: Number(c.price) || 0,
        image_url: c.image_url || undefined,
        crust_image: c.image_url || undefined,
        is_available: c.is_available !== false,
        isAvailable: c.is_available !== false,
        sort_order: c.sort_order || 0,
        createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
        updatedAt: c.updatedAt ? c.updatedAt.toISOString() : undefined,
      }));
    } catch (err) {
      console.error("Prisma getCrusts error:", err);
      return [];
    }
  }

  async getCrustById(crustId: number | string): Promise<CrustDTO | null> {
    try {
      const c = await prisma.crepe_crusts.findUnique({
        where: { crust_id: Number(crustId) },
      });
      if (!c) return null;
      return {
        id: c.crust_id,
        crust_id: c.crust_id,
        restaurantId: c.restaurantId,
        name: c.crust_name,
        crust_name: c.crust_name,
        description: c.description || "",
        price: Number(c.price) || 0,
        image_url: c.image_url || undefined,
        crust_image: c.image_url || undefined,
        is_available: c.is_available !== false,
        isAvailable: c.is_available !== false,
        sort_order: c.sort_order || 0,
        createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
        updatedAt: c.updatedAt ? c.updatedAt.toISOString() : undefined,
      };
    } catch (err) {
      console.error("Prisma getCrustById error:", err);
      return null;
    }
  }

  async createCrust(data: Partial<CrustDTO>, restaurantId?: string | number): Promise<CrustDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId || data.restaurantId);
      const name = (data.name || data.crust_name || "แป้งเครป").trim();
      const price = data.price !== undefined && data.price !== null ? Number(data.price) : 10;
      const description = data.description || null;
      const imageUrl = data.image_url || (data as any).crust_image || null;
      const isAvailable = data.is_available !== false && data.isAvailable !== false;
      const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) : 0;

      // Duplicate check for this restaurant
      const existing = await prisma.crepe_crusts.findFirst({
        where: {
          crust_name: name,
          restaurantId: restId,
        },
      });
      if (existing) {
        throw new Error(`ชื่อแป้งเครป "${name}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
      }

      const created = await prisma.crepe_crusts.create({
        data: {
          crust_name: name,
          description,
          price,
          image_url: imageUrl,
          is_available: isAvailable,
          sort_order: sortOrder,
          restaurantId: restId,
        },
      });

      return {
        id: created.crust_id,
        crust_id: created.crust_id,
        restaurantId: created.restaurantId,
        name: created.crust_name,
        crust_name: created.crust_name,
        description: created.description || "",
        price: Number(created.price) || 0,
        image_url: created.image_url || undefined,
        crust_image: created.image_url || undefined,
        is_available: created.is_available !== false,
        isAvailable: created.is_available !== false,
        sort_order: created.sort_order || 0,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error("Prisma createCrust error:", err);
      throw err;
    }
  }

  async updateCrust(crustId: number | string, data: Partial<CrustDTO>): Promise<CrustDTO | null> {
    try {
      const numId = Number(crustId);
      const name = data.name !== undefined ? data.name.trim() : (data.crust_name !== undefined ? data.crust_name.trim() : undefined);
      const price = data.price !== undefined && data.price !== null ? Number(data.price) : undefined;
      const description = data.description !== undefined ? data.description : undefined;
      const imageUrl = data.image_url !== undefined ? data.image_url : ((data as any).crust_image !== undefined ? (data as any).crust_image : undefined);
      const isAvailable = data.is_available !== undefined ? data.is_available : data.isAvailable;
      const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) : undefined;

      if (name !== undefined) {
        const current = await prisma.crepe_crusts.findUnique({ where: { crust_id: numId } });
        if (current) {
          const duplicate = await prisma.crepe_crusts.findFirst({
            where: {
              crust_name: name,
              restaurantId: current.restaurantId,
              NOT: { crust_id: numId },
            },
          });
          if (duplicate) {
            throw new Error(`ชื่อแป้งเครป "${name}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`);
          }
        }
      }

      const updated = await prisma.crepe_crusts.update({
        where: { crust_id: numId },
        data: {
          ...(name !== undefined ? { crust_name: name } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(imageUrl !== undefined ? { image_url: imageUrl || null } : {}),
          ...(isAvailable !== undefined ? { is_available: isAvailable } : {}),
          ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
          updatedAt: new Date(),
        },
      });

      return {
        id: updated.crust_id,
        crust_id: updated.crust_id,
        restaurantId: updated.restaurantId,
        name: updated.crust_name,
        crust_name: updated.crust_name,
        description: updated.description || "",
        price: Number(updated.price) || 0,
        image_url: updated.image_url || undefined,
        crust_image: updated.image_url || undefined,
        is_available: updated.is_available !== false,
        isAvailable: updated.is_available !== false,
        sort_order: updated.sort_order || 0,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error("Prisma updateCrust error:", err);
      return null;
    }
  }

  async deleteCrust(crustId: number | string): Promise<boolean> {
    try {
      await prisma.crepe_crusts.delete({
        where: { crust_id: Number(crustId) },
      });
      return true;
    } catch (err) {
      console.error("Prisma deleteCrust error:", err);
      return false;
    }
  }

  async toggleCrustAvailability(crustId: number | string, isAvailable?: boolean): Promise<CrustDTO | null> {
    try {
      const numId = Number(crustId);
      const current = await prisma.crepe_crusts.findUnique({ where: { crust_id: numId } });
      if (!current) return null;
      const target = isAvailable !== undefined ? isAvailable : !current.is_available;
      return this.updateCrust(numId, { is_available: target });
    } catch (err) {
      console.error("Prisma toggleCrustAvailability error:", err);
      return null;
    }
  }

  // ==========================================
  // Sample Crepe Menus (จัดการเมนูตัวอย่าง)
  // ==========================================
  async getSampleMenus(restaurantId?: string | number): Promise<SampleMenuDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const items = await prisma.sample_menus.findMany({
        where: { restaurantId: restId },
        orderBy: [
          { sort_order: "asc" },
          { createdAt: "desc" },
        ],
      });

      return items.map((s: any) => ({
        id: s.sample_id,
        sample_id: s.sample_id,
        restaurantId: s.restaurantId,
        name: s.menu_name,
        menu_name: s.menu_name,
        description: s.description || "",
        price: Number(s.price) || 0,
        image_url: s.image_url || undefined,
        imageUrl: s.image_url || undefined,
        sample_image: s.image_url || undefined,
        is_active: s.is_active !== false,
        isActive: s.is_active !== false,
        sort_order: s.sort_order || 0,
        tags: s.tags || "",
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error("Prisma getSampleMenus error:", err);
      return [];
    }
  }

  async getSampleMenuById(sampleId: number | string): Promise<SampleMenuDTO | null> {
    try {
      const numId = Number(sampleId);
      const s = await prisma.sample_menus.findUnique({
        where: { sample_id: numId },
      });
      if (!s) return null;

      return {
        id: s.sample_id,
        sample_id: s.sample_id,
        restaurantId: s.restaurantId,
        name: s.menu_name,
        menu_name: s.menu_name,
        description: s.description || "",
        price: Number(s.price) || 0,
        image_url: s.image_url || undefined,
        imageUrl: s.image_url || undefined,
        sample_image: s.image_url || undefined,
        is_active: s.is_active !== false,
        isActive: s.is_active !== false,
        sort_order: s.sort_order || 0,
        tags: s.tags || "",
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error("Prisma getSampleMenuById error:", err);
      return null;
    }
  }

  async createSampleMenu(data: Partial<SampleMenuDTO>, restaurantId?: string | number): Promise<SampleMenuDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const name = data.menu_name || data.name || "เมนูตัวอย่าง";
      const price = data.price !== undefined && data.price !== null ? Number(data.price) : 0;
      const description = data.description || "";
      const imageUrl = data.image_url || data.imageUrl || (data as any).sample_image || null;
      const isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true);
      const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) : (data.sortOrder !== undefined ? Number(data.sortOrder) : 0);
      const tags = data.tags || "";

      const created = await prisma.sample_menus.create({
        data: {
          restaurantId: restId,
          menu_name: name,
          description: description || null,
          price,
          image_url: imageUrl,
          is_active: isActive,
          sort_order: sortOrder,
          tags: tags || null,
        },
      });

      return {
        id: created.sample_id,
        sample_id: created.sample_id,
        restaurantId: created.restaurantId,
        name: created.menu_name,
        menu_name: created.menu_name,
        description: created.description || "",
        price: Number(created.price) || 0,
        image_url: created.image_url || undefined,
        imageUrl: created.image_url || undefined,
        sample_image: created.image_url || undefined,
        is_active: created.is_active !== false,
        isActive: created.is_active !== false,
        sort_order: created.sort_order || 0,
        tags: created.tags || "",
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error("Prisma createSampleMenu error:", err);
      throw err;
    }
  }

  async updateSampleMenu(sampleId: number | string, data: Partial<SampleMenuDTO>): Promise<SampleMenuDTO | null> {
    try {
      const numId = Number(sampleId);
      const name = data.menu_name !== undefined ? data.menu_name : data.name;
      const price = data.price !== undefined && data.price !== null ? Number(data.price) : undefined;
      const description = data.description !== undefined ? data.description : undefined;
      const imageUrl = data.image_url !== undefined ? data.image_url : (data.imageUrl !== undefined ? data.imageUrl : ((data as any).sample_image !== undefined ? (data as any).sample_image : undefined));
      const isActive = data.is_active !== undefined ? data.is_active : data.isActive;
      const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) : (data.sortOrder !== undefined ? Number(data.sortOrder) : undefined);
      const tags = data.tags !== undefined ? data.tags : undefined;

      const updated = await prisma.sample_menus.update({
        where: { sample_id: numId },
        data: {
          ...(name !== undefined ? { menu_name: name } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(imageUrl !== undefined ? { image_url: imageUrl || null } : {}),
          ...(isActive !== undefined ? { is_active: isActive } : {}),
          ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
          ...(tags !== undefined ? { tags: tags || null } : {}),
          updatedAt: new Date(),
        },
      });

      return {
        id: updated.sample_id,
        sample_id: updated.sample_id,
        restaurantId: updated.restaurantId,
        name: updated.menu_name,
        menu_name: updated.menu_name,
        description: updated.description || "",
        price: Number(updated.price) || 0,
        image_url: updated.image_url || undefined,
        imageUrl: updated.image_url || undefined,
        sample_image: updated.image_url || undefined,
        is_active: updated.is_active !== false,
        isActive: updated.is_active !== false,
        sort_order: updated.sort_order || 0,
        tags: updated.tags || "",
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

    } catch (err) {
      console.error("Prisma updateSampleMenu error:", err);
      return null;
    }
  }

  async deleteSampleMenu(sampleId: number | string): Promise<boolean> {
    try {
      await prisma.sample_menus.delete({
        where: { sample_id: Number(sampleId) },
      });
      return true;
    } catch (err) {
      console.error("Prisma deleteSampleMenu error:", err);
      return false;
    }
  }

  async toggleSampleMenu(sampleId: number | string, isActive?: boolean): Promise<SampleMenuDTO | null> {
    try {
      const numId = Number(sampleId);
      const current = await prisma.sample_menus.findUnique({ where: { sample_id: numId } });
      if (!current) return null;
      const target = isActive !== undefined ? isActive : !current.is_active;
      return this.updateSampleMenu(numId, { is_active: target });
    } catch (err) {
      console.error("Prisma toggleSampleMenu error:", err);
      return null;
    }
  }

  // ==========================================
  // Info & Settings
  // ==========================================
  async getRestaurantInfo(restaurantId?: string | number): Promise<RestaurantProfileDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const rest = await prisma.restaurant_data.findUnique({
        where: { res_id: restId },
        include: { restaurant_users: true },
      });

      if (rest) {
        const qrUrl = rest.qrpayment_url || rest.promptpay_qr || "";

        return {
          id: String(rest.res_id),
          name: rest.restaurant_name || "ร้านเครป CrepeQ",
          restaurant_name: rest.restaurant_name || "ร้านเครป CrepeQ",
          description: rest.restaurant_desc || "",
          restaurant_desc: rest.restaurant_desc || "",
          phone: rest.restaurant_phone || "",
          restaurant_phone: rest.restaurant_phone || "",
          address: rest.restaurant_address || "",
          restaurant_address: rest.restaurant_address || "",
          logoUrl: rest.restaurant_logo || "",
          restaurant_logo: rest.restaurant_logo || "",
          bannerUrl: rest.restaurant_cover || "",
          restaurant_cover: rest.restaurant_cover || "",
          themeColor: rest.restaurant_primary_theme || "#E11D48",
          primaryColor: rest.restaurant_primary_theme || "#E11D48",
          restaurant_primary_theme: rest.restaurant_primary_theme || "#E11D48",
          secondaryColor: rest.restaurant_secondary_theme || "#F59E0B",
          restaurant_secondary_theme: rest.restaurant_secondary_theme || "#F59E0B",
          accentColor: rest.restaurant_other_theme || "#FB923C",
          otherTheme: rest.restaurant_other_theme || "",
          restaurant_other_theme: rest.restaurant_other_theme || "",
          openTime: rest.restaurant_open_time || "10:00",
          restaurant_open_time: rest.restaurant_open_time || "10:00",
          closeTime: rest.restaurant_close_time || "22:00",
          restaurant_close_time: rest.restaurant_close_time || "22:00",
          operatingDays: rest.restaurant_day || "ทุกวัน",
          restaurant_day: rest.restaurant_day || "ทุกวัน",
          isOpen: rest.is_open !== false,
          is_open: rest.is_open !== false,
          isPaused: !!rest.is_paused,
          is_paused: !!rest.is_paused,
          pauseUntil: rest.pause_until ? rest.pause_until.toISOString() : undefined,
          pause_until: rest.pause_until ? rest.pause_until.toISOString() : undefined,
          pauseReason: rest.pause_reason || "",
          pause_reason: rest.pause_reason || "",
          allowPreorderWhenPaused: !!rest.allow_preorder_when_paused,
          allow_preorder_when_paused: !!rest.allow_preorder_when_paused,
          lineId: rest.line_id || "",
          line_id: rest.line_id || "",
          lineOaUrl: rest.line_oa_url || "",
          line_oa_url: rest.line_oa_url || "",
          facebookUrl: rest.facebook_url || "",
          facebook_url: rest.facebook_url || "",
          instagramUrl: rest.instagram_url || "",
          instagram_url: rest.instagram_url || "",
          tiktokUrl: rest.tiktok_url || "",
          tiktok_url: rest.tiktok_url || "",
          youtubeUrl: rest.youtube_url || "",
          youtube_url: rest.youtube_url || "",
          xUrl: rest.x_url || "",
          x_url: rest.x_url || "",
          websiteUrl: rest.website_url || "",
          website_url: rest.website_url || "",
          googleMapsUrl: rest.google_maps_url || "",
          google_maps_url: rest.google_maps_url || "",
          email: rest.restaurant_email || "",
          restaurant_email: rest.restaurant_email || "",
          linemanUrl: rest.lineman_url || "",
          lineman_url: rest.lineman_url || "",
          grabUrl: rest.grab_url || "",
          grab_url: rest.grab_url || "",
          shopeefoodUrl: rest.shopeefood_url || "",
          shopeefood_url: rest.shopeefood_url || "",
          robinhoodUrl: rest.robinhood_url || "",
          robinhood_url: rest.robinhood_url || "",
          promptPayNumber: rest.promptpay_number || "",
          promptpay_number: rest.promptpay_number || "",
          promptPayName: rest.promptpay_name || "",
          promptpay_name: rest.promptpay_name || "",
          promptPayQrImage: qrUrl,
          promptpay_qr: qrUrl,
          qrpayment_url: qrUrl,
          bankName: rest.bank_name || "",
          bank_name: rest.bank_name || "",
          bankAccountNumber: rest.bank_account_number || "",
          bank_account_number: rest.bank_account_number || "",
          bankAccountName: rest.bank_account_name || "",
          bank_account_name: rest.bank_account_name || "",
        };
      }
    } catch (err) {
      console.error("Prisma getRestaurantInfo error:", err);
    }

    return {
      id: "1",
      name: "ร้านเครป CrepeQ",
      isOpen: true,
      isPaused: false,
      primaryColor: "#E11D48",
      secondaryColor: "#F59E0B",
    };
  }

  async updateRestaurantInfo(data: Partial<RestaurantProfileDTO>, restaurantId?: string | number): Promise<RestaurantProfileDTO> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const updatePayload: any = {};

      if (data.name || data.restaurant_name) updatePayload.restaurant_name = data.name || data.restaurant_name;
      if (data.description !== undefined || data.restaurant_desc !== undefined) updatePayload.restaurant_desc = data.description ?? data.restaurant_desc;
      if (data.phone !== undefined || data.restaurant_phone !== undefined) updatePayload.restaurant_phone = data.phone ?? data.restaurant_phone;
      if (data.email !== undefined || (data as any).restaurant_email !== undefined) updatePayload.restaurant_email = data.email ?? (data as any).restaurant_email;
      if (data.address !== undefined || data.restaurant_address !== undefined) updatePayload.restaurant_address = data.address ?? data.restaurant_address;
      if (data.logoUrl !== undefined || data.restaurant_logo !== undefined) updatePayload.restaurant_logo = data.logoUrl ?? data.restaurant_logo;
      if (data.bannerUrl !== undefined || data.restaurant_cover !== undefined) updatePayload.restaurant_cover = data.bannerUrl ?? data.restaurant_cover;
      if (data.primaryColor || data.themeColor || data.restaurant_primary_theme) updatePayload.restaurant_primary_theme = data.primaryColor || data.themeColor || data.restaurant_primary_theme;
      if (data.secondaryColor || data.restaurant_secondary_theme) updatePayload.restaurant_secondary_theme = data.secondaryColor || data.restaurant_secondary_theme;
      if (data.accentColor || data.otherTheme || data.restaurant_other_theme) updatePayload.restaurant_other_theme = data.accentColor || data.otherTheme || data.restaurant_other_theme;
      if (data.openTime || data.restaurant_open_time) updatePayload.restaurant_open_time = data.openTime || data.restaurant_open_time;
      if (data.closeTime || data.restaurant_close_time) updatePayload.restaurant_close_time = data.closeTime || data.restaurant_close_time;
      if (data.operatingDays || data.restaurant_day) updatePayload.restaurant_day = data.operatingDays || data.restaurant_day;
      if (data.isOpen !== undefined || data.is_open !== undefined) updatePayload.is_open = data.isOpen ?? data.is_open;
      if (data.isPaused !== undefined || data.is_paused !== undefined) updatePayload.is_paused = data.isPaused ?? data.is_paused;
      if (data.pauseUntil !== undefined || data.pause_until !== undefined) {
        updatePayload.pause_until = data.pauseUntil ? new Date(data.pauseUntil) : null;
      }
      if (data.pauseReason !== undefined || data.pause_reason !== undefined) updatePayload.pause_reason = data.pauseReason ?? data.pause_reason;
      if (data.allowPreorderWhenPaused !== undefined || data.allow_preorder_when_paused !== undefined) {
        updatePayload.allow_preorder_when_paused = data.allowPreorderWhenPaused ?? data.allow_preorder_when_paused;
      }
      if (data.promptPayNumber !== undefined || data.promptpay_number !== undefined) updatePayload.promptpay_number = data.promptPayNumber ?? data.promptpay_number;
      if (data.promptPayName !== undefined || data.promptpay_name !== undefined) updatePayload.promptpay_name = data.promptPayName ?? data.promptpay_name;
      if (data.promptPayQrImage !== undefined || data.promptpay_qr !== undefined || data.qrpayment_url !== undefined) {
        const qr = data.promptPayQrImage ?? data.promptpay_qr ?? data.qrpayment_url;
        updatePayload.promptpay_qr = qr || null;
        updatePayload.qrpayment_url = qr || null;
      }
      if (data.bankName !== undefined || data.bank_name !== undefined) updatePayload.bank_name = data.bankName ?? data.bank_name;
      if (data.bankAccountNumber !== undefined || data.bank_account_number !== undefined) updatePayload.bank_account_number = data.bankAccountNumber ?? data.bank_account_number;
      if (data.bankAccountName !== undefined || data.bank_account_name !== undefined) updatePayload.bank_account_name = data.bankAccountName ?? data.bank_account_name;
      if (data.lineId !== undefined || data.line_id !== undefined) updatePayload.line_id = data.lineId ?? data.line_id;
      if ((data as any).lineOaUrl !== undefined || (data as any).line_oa_url !== undefined) updatePayload.line_oa_url = (data as any).lineOaUrl ?? (data as any).line_oa_url;
      if (data.facebookUrl !== undefined || data.facebook_url !== undefined) updatePayload.facebook_url = data.facebookUrl ?? data.facebook_url;
      if (data.instagramUrl !== undefined || data.instagram_url !== undefined) updatePayload.instagram_url = data.instagramUrl ?? data.instagram_url;
      if (data.tiktokUrl !== undefined || data.tiktok_url !== undefined) updatePayload.tiktok_url = data.tiktokUrl ?? data.tiktok_url;
      if ((data as any).youtubeUrl !== undefined || (data as any).youtube_url !== undefined) updatePayload.youtube_url = (data as any).youtubeUrl ?? (data as any).youtube_url;
      if ((data as any).xUrl !== undefined || (data as any).x_url !== undefined) updatePayload.x_url = (data as any).xUrl ?? (data as any).x_url;
      if (data.websiteUrl !== undefined || data.website_url !== undefined) updatePayload.website_url = data.websiteUrl ?? data.website_url;
      if ((data as any).googleMapsUrl !== undefined || (data as any).google_maps_url !== undefined) updatePayload.google_maps_url = (data as any).googleMapsUrl ?? (data as any).google_maps_url;
      if ((data as any).linemanUrl !== undefined || (data as any).lineman_url !== undefined) updatePayload.lineman_url = (data as any).linemanUrl ?? (data as any).lineman_url;
      if ((data as any).grabUrl !== undefined || (data as any).grab_url !== undefined) updatePayload.grab_url = (data as any).grabUrl ?? (data as any).grab_url;
      if ((data as any).shopeefoodUrl !== undefined || (data as any).shopeefood_url !== undefined) updatePayload.shopeefood_url = (data as any).shopeefoodUrl ?? (data as any).shopeefood_url;
      if ((data as any).robinhoodUrl !== undefined || (data as any).robinhood_url !== undefined) updatePayload.robinhood_url = (data as any).robinhoodUrl ?? (data as any).robinhood_url;

      await prisma.restaurant_data.update({
        where: { res_id: restId },
        data: updatePayload,
      });

      return this.getRestaurantInfo(restId);
    } catch (err) {
      console.error("Prisma updateRestaurantInfo error:", err);
      return this.getRestaurantInfo(restaurantId);
    }
  }

  async getBankAccount(restaurantId?: string | number): Promise<BankAccountDTO> {
    const info = await this.getRestaurantInfo(restaurantId);
    return {
      bank: info.bankName || "",
      bankName: info.bankName || "",
      accountNumber: info.bankAccountNumber || "",
      bankAccountNumber: info.bankAccountNumber || "",
      accountName: info.bankAccountName || "",
      bankAccountName: info.bankAccountName || "",
      promptPayNumber: info.promptPayNumber || "",
      promptPayName: info.promptPayName || "",
      promptPayQrImage: info.promptPayQrImage || "",
      qrpayment_url: info.promptPayQrImage || "",
    };
  }

  async updateBankAccount(data: Partial<BankAccountDTO>, restaurantId?: string | number): Promise<BankAccountDTO> {
    await this.updateRestaurantInfo({
      bankName: data.bankName || data.bank,
      bankAccountNumber: data.bankAccountNumber || data.accountNumber,
      bankAccountName: data.bankAccountName || data.accountName,
      promptPayNumber: data.promptPayNumber,
      promptPayName: data.promptPayName,
      promptPayQrImage: data.promptPayQrImage || data.qrpayment_url,
    }, restaurantId);
    return this.getBankAccount(restaurantId);
  }

  async updateSecurity(email?: string, newPassword?: string, restaurantId?: string | number): Promise<boolean> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      const user = await prisma.restaurant_users.findFirst({ where: { restaurantId: restId } });
      if (!user) return false;

      const updateData: any = {};
      if (email) updateData.email = email;
      if (newPassword) updateData.passwordHash = await hashPassword(newPassword);

      await prisma.restaurant_users.update({
        where: { res_user_id: user.res_user_id },
        data: updateData,
      });
      return true;
    } catch (err) {
      console.error("Prisma updateSecurity error:", err);
      return false;
    }
  }


  // ==========================================
  // User Profile
  // ==========================================
  async getUserProfile(userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null> {
    try {
      const restId = await resolveRestaurantId(restaurantId || userId);
      const user = await prisma.restaurant_users.findFirst({ where: { restaurantId: restId } });
      if (!user) return null;

      return {
        id: user.res_user_id,
        res_user_id: user.res_user_id,
        username: user.username,
        fname: user.fname,
        lname: user.lname,
        firstName: user.fname,
        lastName: user.lname,
        phone: user.phone || "",
        email: user.email || "",
        restaurantId: user.restaurantId,
      };
    } catch (err) {
      console.error("Prisma getUserProfile error:", err);
      return null;
    }
  }

  async updateUserProfile(data: Partial<UserProfileDTO>, userId?: string | number, restaurantId?: string | number): Promise<UserProfileDTO | null> {
    try {
      const restId = await resolveRestaurantId(restaurantId || userId);
      const user = await prisma.restaurant_users.findFirst({ where: { restaurantId: restId } });
      if (!user) return null;

      const updated = await prisma.restaurant_users.update({
        where: { res_user_id: user.res_user_id },
        data: {
          ...(data.fname || data.firstName ? { fname: data.fname || data.firstName } : {}),
          ...(data.lname || data.lastName ? { lname: data.lname || data.lastName } : {}),
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.email ? { email: data.email } : {}),
        },
      });

      return {
        id: updated.res_user_id,
        res_user_id: updated.res_user_id,
        username: updated.username,
        fname: updated.fname,
        lname: updated.lname,
        firstName: updated.fname,
        lastName: updated.lname,
        phone: updated.phone || "",
        email: updated.email || "",
        restaurantId: updated.restaurantId,
      };
    } catch (err) {
      console.error("Prisma updateUserProfile error:", err);
      return null;
    }
  }

  async updateUserPassword(currentPassword: string, newPassword: string, userId?: string | number, restaurantId?: string | number): Promise<{ success: boolean; message?: string }> {
    try {
      const restId = await resolveRestaurantId(restaurantId || userId);
      const user = await prisma.restaurant_users.findFirst({ where: { restaurantId: restId } });
      if (!user) return { success: false, message: "ไม่พบข้อมูลผู้ใช้" };

      const isMatch = await verifyPassword(currentPassword, user.passwordHash);
      if (!isMatch) return { success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

      const passwordHash = await hashPassword(newPassword);
      await prisma.restaurant_users.update({
        where: { res_user_id: user.res_user_id },
        data: { passwordHash },
      });

      return { success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" };
    } catch (err: any) {
      console.error("Prisma updateUserPassword error:", err);
      return { success: false, message: err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
    }
  }

  // ==========================================
  // Inventory & Stock Management
  // ==========================================
  async getInventoryItems(restaurantId?: string | number): Promise<InventoryItemDTO[]> {
    try {
      const restId = await resolveRestaurantId(restaurantId);
      let items = await prisma.inventory_items.findMany({
        where: { restaurant_id: restId },
        orderBy: [{ category: "asc" }, { item_id: "asc" }],
      });

      // If empty, auto-seed default items from design mockups
      if (items.length === 0) {
        const seedItems = [
          { name: "แผ่นเครป", category: "base", topping_group: "sweet", quantity: 120, unit: "แผ่น", status: "available", price: 25 },
          { name: "ไส้กรอก", category: "topping", topping_group: "savory", quantity: 6, unit: "ชิ้น", status: "low_stock", price: 15 },
          { name: "ชีส", category: "topping", topping_group: "savory", quantity: 25, unit: "แผ่น", status: "available", price: 10 },
          { name: "สตรอว์เบอร์รี", category: "topping", topping_group: "fruit", quantity: 0, unit: "กล่อง", status: "out_of_stock", price: 10 },
          { name: "นูเทลล่า", category: "topping", topping_group: "sweet", quantity: 1, unit: "กระปุก", status: "low_stock", price: 15 },
          { name: "ช็อกโกแลต", category: "topping", topping_group: "sweet", quantity: 50, unit: "ชิ้น", status: "available", price: 10 },
          { name: "มาร์ชเมลโลว์", category: "topping", topping_group: "sweet", quantity: 40, unit: "ชิ้น", status: "available", price: 10 },
          { name: "กล้วย", category: "topping", topping_group: "fruit", quantity: 30, unit: "ลูก", status: "available", price: 10 },
          { name: "ชาไทยเย็น", category: "ingredient", topping_group: "sweet", quantity: 20, unit: "แก้ว", status: "available", price: 35 },
        ];

        for (const it of seedItems) {
          await prisma.inventory_items.create({
            data: {
              restaurant_id: restId,
              name: it.name,
              category: it.category,
              topping_group: it.topping_group,
              quantity: it.quantity,
              unit: it.unit,
              status: it.status,
              price: it.price,
            },
          });
        }

        items = await prisma.inventory_items.findMany({
          where: { restaurant_id: restId },
          orderBy: [{ category: "asc" }, { item_id: "asc" }],
        });
      }

      return items.map((it) => ({
        id: it.item_id,
        restaurantId: it.restaurant_id,
        name: it.name,
        category: (it.category as any) || "topping",
        toppingGroup: (it.topping_group as any) || "sweet",
        quantity: it.quantity,
        unit: it.unit,
        status: (it.status as any) || "available",
        price: it.price,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error("Prisma getInventoryItems error:", err);
      return [];
    }
  }

  async createInventoryItem(restaurantId: string | number, data: Partial<InventoryItemDTO>): Promise<InventoryItemDTO> {
    const restId = await resolveRestaurantId(restaurantId);
    const created = await prisma.inventory_items.create({
      data: {
        restaurant_id: restId,
        name: data.name || "วัตถุดิบใหม่",
        category: data.category || "topping",
        topping_group: data.toppingGroup || "sweet",
        quantity: Number(data.quantity) || 50,
        unit: data.unit || "ชิ้น",
        status: data.status || "available",
        price: Number(data.price) || 10,
      },
    });

    const result: InventoryItemDTO = {
      id: created.item_id,
      restaurantId: created.restaurant_id,
      name: created.name,
      category: created.category as any,
      toppingGroup: created.topping_group as any,
      quantity: created.quantity,
      unit: created.unit,
      status: created.status as any,
      price: created.price,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    RealtimeService.broadcast(restId, "MENU_UPDATED", result);
    return result;
  }

  async updateInventoryItem(id: number, data: Partial<InventoryItemDTO>): Promise<InventoryItemDTO | null> {
    try {
      const updated = await prisma.inventory_items.update({
        where: { item_id: id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.toppingGroup ? { topping_group: data.toppingGroup } : {}),
          ...(data.quantity !== undefined ? { quantity: Number(data.quantity) } : {}),
          ...(data.unit ? { unit: data.unit } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.price !== undefined ? { price: Number(data.price) } : {}),
          updatedAt: new Date(),
        },
      });

      const result: InventoryItemDTO = {
        id: updated.item_id,
        restaurantId: updated.restaurant_id,
        name: updated.name,
        category: updated.category as any,
        toppingGroup: updated.topping_group as any,
        quantity: updated.quantity,
        unit: updated.unit,
        status: updated.status as any,
        price: updated.price,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      RealtimeService.broadcast(updated.restaurant_id, "MENU_UPDATED", result);
      return result;
    } catch (err) {
      console.error("Prisma updateInventoryItem error:", err);
      return null;
    }
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    try {
      const item = await prisma.inventory_items.findUnique({ where: { item_id: id } });
      await prisma.inventory_items.delete({ where: { item_id: id } });
      if (item) {
        RealtimeService.broadcast(item.restaurant_id, "MENU_UPDATED", { deletedId: id });
      }
      return true;
    } catch (err) {
      console.error("Prisma deleteInventoryItem error:", err);
      return false;
    }
  }

  // ==========================================
  // Store Pause Management
  // ==========================================
  async setStorePauseStatus(
    restaurantId: string | number,
    isPaused: boolean,
    durationMinutes?: number,
    reason?: string,
    allowPreorder?: boolean
  ): Promise<any> {
    const restId = await resolveRestaurantId(restaurantId);
    let pauseUntilDate: Date | null = null;

    if (isPaused && durationMinutes && durationMinutes > 0) {
      pauseUntilDate = new Date(Date.now() + durationMinutes * 60 * 1000);
    }

    const updated = await prisma.restaurant_data.update({
      where: { res_id: restId },
      data: {
        is_paused: isPaused,
        pause_until: isPaused ? pauseUntilDate : null,
        pause_reason: isPaused ? (reason || "ออเดอร์แน่นอยู่") : null,
        allow_preorder_when_paused: isPaused ? !!allowPreorder : false,
        updatedAt: new Date(),
      },
    });

    const payload = {
      isPaused: updated.is_paused,
      pauseUntil: updated.pause_until ? updated.pause_until.toISOString() : null,
      pauseReason: updated.pause_reason || "",
      allowPreorderWhenPaused: updated.allow_preorder_when_paused,
    };

    RealtimeService.broadcast(restId, "ORDER_UPDATED", { storePause: payload });
    return payload;
  }
}
