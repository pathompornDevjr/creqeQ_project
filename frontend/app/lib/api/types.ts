/**
 * Frontend API Types & DTO Definitions
 * รวบรวม Type และ Interface สำหรับสื่อสารระหว่าง Frontend กับ Backend API:
 * - OrderStatus, PaymentMethod, ApiResponse
 * - UserProfileDTO, RestaurantProfileDTO, CustomerProfileDTO
 * - MenuItemDTO, CartItemDTO, OrderDTO, CrustDTO, SampleMenuDTO
 * - PromptPayPaymentInfoDTO, SlipVerificationResultDTO
 * - Dashboard & Analytics DTOs
 */

// สถานะการทำงานของออเดอร์
export type OrderStatus = "pending" | "confirmed" | "preparing" | "cooking" | "served" | "ready" | "paid" | "completed" | "cancelled";
// ช่องทางการชำระเงิน
export type PaymentMethod = "qr" | "cash";

/**
 * โครงสร้างมาตรฐานของการตอบกลับจาก API (Standard API Response)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorType?: "SHOP_NOT_FOUND" | "TABLE_NOT_FOUND" | "SHOP_CLOSED" | "PACKAGE_EXPIRED" | "GENERAL_ERROR";
  count?: number;
}

export interface UserProfileDTO {
  res_user_id?: string;
  id?: string;
  username?: string;
  fname: string;
  lname: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  titlePrefix?: string;
  roleId?: number;
  restaurantId?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}


export interface OptionChoice {
  label: string;
  price: number;
}

export interface OptionGroup {
  name: string;
  choices: OptionChoice[];
  required?: boolean;
  allowMultiple?: boolean;
}

export interface MenuItemDTO {
  id?: string;
  restaurantId?: number | string;
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category: string;
  spicyLevel?: number;
  popular?: boolean;
  available?: boolean;
  options?: {
    sizes?: { label: string; price: number }[];
    spicy?: string[];
    extras?: { label: string; price: number }[];
    optionGroups?: OptionGroup[];
  };
  optionGroups?: OptionGroup[];
}

export interface SelectedOptionChoice {
  groupName: string;
  choiceLabel: string;
  price: number;
}

export interface CartItemDTO {
  id?: string;
  menuItem: MenuItemDTO;
  quantity: number;
  size?: string;
  spicy?: string;
  note?: string;
  selectedOptions?: SelectedOptionChoice[];
  subtotal: number;
  isOutOfStock?: boolean;
  isCancelled?: boolean;
  cancelReason?: string;
  status?: string;
}

export interface CustomerProfileDTO {
  customer_id: number;
  nickname: string;
  phone: string;
  avatar_url?: string | null;
}

export interface OrderDTO {
  id: string;
  tableNumber: string | number;
  tableId?: string;
  deviceId?: string;
  customerId?: number;
  customerNickname?: string;
  customerPhone?: string;
  items: CartItemDTO[];
  status: OrderStatus;
  createdAt: string;
  total?: number;
  totalAmount?: number;
  paymentMethod?: PaymentMethod;
  slipUrl?: string;
  customerNote?: string;
  cancelReason?: string;
  queuePosition?: number;
  queuesAhead?: number;
  totalActiveQueues?: number;
  queueNumber?: string;
  queue_number?: string;
  dailyQueueIndex?: number;
  orderNumber?: string;
  confirmedAt?: string;
  cookingAt?: string;
  readyAt?: string;
  pickupQrCode?: string;
  pickupType?: "asap" | "scheduled";
  scheduledTime?: string;
}

export interface RestaurantProfileDTO {
  id?: string | number;
  name: string;
  restaurant_name?: string;
  description?: string;
  restaurant_desc?: string;
  phone?: string;
  restaurant_phone?: string;
  email?: string;
  address?: string;
  restaurant_address?: string;
  addressDetail?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  zipCode?: string;
  lat?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  restaurant_lat?: string;
  restaurant_long?: string;
  openTime?: string;
  closeTime?: string;
  restaurant_open_time?: string;
  restaurant_close_time?: string;
  operatingDays?: string;
  restaurant_day?: string;
  closedDays?: string;
  closed_days?: string;
  isOpen?: boolean;
  is_open?: boolean;
  bankName?: string;
  bank_name?: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  bankAccountName?: string;
  bank_account_name?: string;
  promptPayId?: string;
  promptPayNumber?: string;
  promptpay_number?: string;
  promptPayName?: string;
  promptpay_name?: string;
  promptPayQrImage?: string | null;
  promptpay_qr?: string | null;
  qrpayment_url?: string | null;
  logoUrl?: string | null;
  restaurant_logo?: string | null;
  bannerUrl?: string | null;
  restaurant_cover?: string | null;
  themeColor?: string;
  primaryColor?: string;
  restaurant_primary_theme?: string;
  secondaryColor?: string;
  restaurant_secondary_theme?: string;
  accentColor?: string;
  otherTheme?: string;
  restaurant_other_theme?: string;
  lineId?: string;
  line_id?: string;
  lineOaUrl?: string;
  line_oa_url?: string;
  facebookUrl?: string;
  facebook_url?: string;
  instagramUrl?: string;
  instagram_url?: string;
  tiktokUrl?: string;
  tiktok_url?: string;
  youtubeUrl?: string;
  youtube_url?: string;
  xUrl?: string;
  x_url?: string;
  websiteUrl?: string;
  website_url?: string;
  googleMapsUrl?: string;
  google_maps_url?: string;
  restaurant_email?: string;
  linemanUrl?: string;
  lineman_url?: string;
  grabUrl?: string;
  grab_url?: string;
  shopeefoodUrl?: string;
  shopeefood_url?: string;
  robinhoodUrl?: string;
  robinhood_url?: string;
  plan?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CategoryDTO {
  id: string;
  category_id?: number;
  category_name?: string;
  name: string;
  label?: string;
  remark?: string;
  menuCount?: number;
  icon?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrustDTO {
  id: number;
  crust_id?: number;
  restaurantId?: number;
  crust_name: string;
  name?: string;
  description?: string;
  price: number;
  crust_image?: string;
  image_url?: string;
  is_available: boolean;
  isAvailable?: boolean;
  sort_order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SampleMenuDTO {
  id: number;
  sample_id?: number;
  restaurantId?: number;
  name: string;
  menu_name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  image_url?: string | null;
  sample_image?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  sortOrder?: number;
  sort_order?: number;
  tags?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerTableInfoDTO {
  tableId: string;
  tableNumber: string | number;
  restaurant: RestaurantProfileDTO;
  activeOrderId?: string | null;
}

export interface PlaceOrderDTO {
  tableId: string;
  shopId?: string | number;
  deviceId?: string;
  items: CartItemDTO[];
  note?: string;
  customerId?: number;
  customerNickname?: string;
  customerPhone?: string;
  pickupType?: "asap" | "scheduled";
  scheduledTime?: string;
  paymentMethod?: string;
}

export interface PromptPayPaymentInfoDTO {
  orderId: string;
  amount: number;
  accountNumber: string;
  accountName: string;
  bankName?: string;
  qrUrl: string;
  qrPayload: string;
}

export interface SlipVerificationResultDTO {
  orderId: string;
  status: "verified" | "verifying" | "error" | "failed";
  message: string;
  slipUrl?: string;
  paidAt?: string;
  isPaid?: boolean;
  amountInSlip?: number;
  easyslipData?: Record<string, any>;
}


export interface RestaurantStatsDTO {
  totalRevenue?: number;
  totalOrders?: number;
  activeTables?: number;
  pendingOrders?: number;
  todayRevenue?: number;
  todaySales?: number;
  todayOrders?: number;
  avgBill?: number;
  weekRevenue?: number;
  salesGrowth?: number;
  revenueTrend?: number;
  ordersTrend?: number;
  weekTrend?: number;
}

export interface ChartDataDTO {
  labels: string[];
  revenue: number[];
  orders: number[];
  [key: string]: any;
}

export interface AdminUserDTO {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fname?: string;
  lname?: string;
  titlePrefix?: string;
  email: string;
  phone: string;
  facebook?: string;
  lineId?: string;
  role: string;
  status?: string;
  restaurantName?: string;
  joinedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminRestaurantDTO {
  id: string;
  name: string;
  ownerId?: string;
  ownerName: string;
  email: string;
  phone?: string;
  plan?: string;
  description?: string;
  address?: string;
  addressDetail?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  status: string;
  paymentStatus?: string;
  activePlan?: string;
  validFrom?: string;
  validUntil?: string;
  expiresAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface RegisterDTO {
  titlePrefix?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password?: string;
  facebook?: string;
  lineId?: string;
  restaurantName: string;
  description?: string;
  address?: string;
  addressDetail?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  plan?: string;
  slipImage?: string;
}

export interface LoginDTO {
  emailOrPhone: string;
  password?: string;
}

export interface AuthResultDTO {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    role: string;
    restaurantId?: number;
  };
  restaurant?: {
    id: string | number;
    res_id: number;
    name: string;
    phone?: string;
    address?: string;
    is_open: boolean;
  };
  token?: string;
}

export interface OnlinePaymentIntentDTO {
  id?: string;
  invoiceId?: string;
  invoiceUrl?: string;
  qrCodeUrl?: string;
  qrPayload?: string;
  hostedInstructionsUrl?: string;
  clientSecret?: string;
  amount: number;
  status: string;
  expiryDate?: string;
  paymentId?: number;
  provider?: "omise" | "stripe" | "promptpay";
}

export type OmiseInvoiceDTO = OnlinePaymentIntentDTO;
export type StripeInvoiceDTO = OnlinePaymentIntentDTO;
