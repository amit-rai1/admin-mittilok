const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

/** API origin without `/api` suffix — used for static `/uploads/...` files. */
export function getApiOrigin() {
  return API_BASE.replace(/\/api\/?$/, "");
}

/**
 * Resolve image paths stored in DB (`/uploads/...`) to a browser-loadable URL.
 * Absolute http(s)/data URLs are returned as-is.
 */
export function mediaUrl(path?: string | null, fallback = "") {
  if (!path || !path.trim()) return fallback;
  const value = path.trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  let normalized = value.startsWith("/") ? value : `/${value}`;
  // Legacy paths saved before /uploads prefix
  if (
    !normalized.startsWith("/uploads/") &&
    (normalized.startsWith("/categories/") ||
      normalized.startsWith("/products/") ||
      normalized.startsWith("/banners/") ||
      normalized.startsWith("/images/") ||
      normalized.startsWith("/misc/"))
  ) {
    normalized = `/uploads${normalized}`;
  }

  return `${getApiOrigin()}${normalized}`;
}

const TOKEN_KEY = "mittilok-admin-token";
const REFRESH_KEY = "mittilok-admin-refresh";
const USER_KEY = "mittilok-admin-user";

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  userType: string;
  roles: string[];
  permissions: string[];
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: User;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
};

export type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  revenueToday: number;
  revenueMonth: number;
  totalCustomers: number;
  lowStockProducts: number;
  openEnquiries: number;
  unreadNotifications: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  parentCategoryId?: number | null;
  type: number;
  displayOrder: number;
  isActive: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  productCount?: number;
  childCount?: number;
};

export type CategoryTree = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  icon?: string | null;
  type?: number;
  displayOrder: number;
  isActive: boolean;
  children: CategoryTree[];
};

export type CategoryForm = {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  icon?: string;
  parentCategoryId?: number | null;
  type: number;
  displayOrder: number;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
};

export type ProductImage = {
  id?: number;
  url: string;
  alt?: string | null;
  displayOrder: number;
  isPrimary: boolean;
};

export type ProductVariant = {
  id?: number;
  sku: string;
  name: string;
  attributesJson?: string | null;
  price: number;
  mrp: number;
  stock: number;
  weight?: number | null;
  image?: string | null;
};

export type ProductHighlight = {
  id?: number;
  text: string;
  sortOrder: number;
};

export type ProductListItem = {
  id: number;
  sku: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  brand?: string | null;
  price: number;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  stockQuantity: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isOrganic: boolean;
  status: string;
  categoryId: number;
  categoryName?: string | null;
  subCategoryId?: number | null;
  subCategoryName?: string | null;
  stockStatus?: string | null;
  averageRating?: number | null;
  reviewCount: number;
};

export type ProductDetail = ProductListItem & {
  shortDescription?: string | null;
  fullDescription?: string | null;
  taxPercent: number;
  lowStockThreshold?: number;
  unit?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  careInstructions?: string | null;
  plantHeight?: string | null;
  potSize?: string | null;
  sunlightRequirement?: string | null;
  waterRequirement?: string | null;
  soilType?: string | null;
  deliveryInfo?: string | null;
  isReturnEligible: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  highlights?: ProductHighlight[];
};

export type ProductForm = {
  sku: string;
  name: string;
  slug?: string;
  categoryId: number;
  subCategoryId?: number | null;
  brand?: string;
  shortDescription?: string;
  fullDescription?: string;
  thumbnail?: string;
  price: number;
  mrp: number;
  discountPercent: number;
  sellingPrice: number;
  taxPercent: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isOrganic: boolean;
  careInstructions?: string;
  plantHeight?: string;
  potSize?: string;
  sunlightRequirement?: string;
  waterRequirement?: string;
  soilType?: string;
  deliveryInfo?: string;
  isReturnEligible: boolean;
  metaTitle?: string;
  metaDescription?: string;
  status: number;
  images?: ProductImage[];
  variants?: ProductVariant[];
  highlights?: ProductHighlight[];
};

export function resolveStockStatus(stock: number, lowStockThreshold = 5) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= lowStockThreshold) return "Low Stock";
  return "In Stock";
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export type Order = {
  id: number;
  orderNumber: string;
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
  paymentStatus: number;
  orderStatus: number;
  trackingNumber?: string | null;
  createdAt: string;
  itemCount: number;
};

export type OrderItem = {
  id: number;
  productId?: number | null;
  productName: string;
  sku: string;
  variantName?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderDetail = Order & {
  couponCodeSnapshot?: string | null;
  deliveryPartner?: string | null;
  notes?: string | null;
  fullName: string;
  mobile: string;
  houseFlat: string;
  street?: string | null;
  area?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  items: OrderItem[];
  statusHistory: Array<{ status: number; note?: string | null; createdAt: string }>;
};

export type InventoryItem = {
  id: number;
  productId: number;
  productName?: string | null;
  variantId?: number | null;
  sku: string;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
};

export type Coupon = {
  id: number;
  code: string;
  name: string;
  discountType: number;
  percentage?: number | null;
  fixedAmount?: number | null;
  minimumOrder: number;
  maximumDiscount?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type Banner = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  mobileImage?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type HomepageSection = {
  id: number;
  key: string;
  title: string;
  sectionType: string;
  configJson?: string | null;
  displayOrder: number;
  isEnabled: boolean;
};

export type Setting = {
  id: number;
  key: string;
  value: string;
  group?: string | null;
};

export type ServiceItem = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  categoryName?: string | null;
  subCategoryId?: number | null;
  description?: string | null;
  imagesJson?: string | null;
  basePrice: number;
  pricingType: number;
  duration?: string | null;
  serviceArea?: string | null;
  isActive: boolean;
};

export type ServiceBooking = {
  id: number;
  bookingNumber: string;
  serviceId: number;
  serviceName?: string | null;
  bookingDate: string;
  timeSlot?: string | null;
  notes?: string | null;
  estimatedPrice: number;
  finalPrice?: number | null;
  paymentStatus: number;
  status: number;
  createdAt: string;
};

export type Quote = {
  id: number;
  enquiryId: number;
  amount: number;
  details?: string | null;
  validUntil?: string | null;
  status: string;
  createdAt: string;
};

export type Enquiry = {
  id: number;
  name: string;
  mobile: string;
  email?: string | null;
  projectType?: string | null;
  location?: string | null;
  propertyType?: string | null;
  areaSize?: string | null;
  requirement?: string | null;
  budgetRange?: string | null;
  preferredDate?: string | null;
  status: number;
  createdAt: string;
  quotes: Quote[];
};

export type PodcastBooking = {
  id: number;
  bookingNumber: string;
  name: string;
  mobile: string;
  email?: string | null;
  packageId?: number | null;
  packageName?: string | null;
  bookingDate: string;
  preferredTime?: string | null;
  guestCount: number;
  topic?: string | null;
  amount: number;
  paymentStatus: number;
  status: number;
  createdAt: string;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  notificationType: number;
  entityType: number;
  entityId?: number | null;
  isRead: boolean;
  readAt?: string | null;
  referenceKey?: string | null;
  createdAt: string;
};

export type NotificationList = {
  items: Notification[];
  page: number;
  pageSize: number;
  totalCount: number;
  unreadCount: number;
};

export type Review = {
  id: number;
  userId: number;
  userName?: string | null;
  productId?: number | null;
  serviceId?: number | null;
  orderId?: number | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isVerifiedPurchase: boolean;
  status: number;
  createdAt: string;
};

export const ORDER_STATUS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Processing",
  3: "Packed",
  4: "Shipped",
  5: "Out for delivery",
  6: "Delivered",
  7: "Cancelled",
  8: "Returned",
  9: "Refund initiated",
  10: "Refunded",
};

export const PAYMENT_STATUS: Record<number, string> = {
  0: "Pending",
  1: "Processing",
  2: "Paid",
  3: "Failed",
  4: "Refunded",
  5: "Partial refund",
};

export const CATEGORY_TYPE: Record<number, string> = {
  0: "Product",
  1: "Service",
  2: "Podcast",
  3: "Mixed",
};

export const PRODUCT_STATUS = {
  Draft: 0,
  Active: 1,
  OutOfStock: 2,
  Inactive: 3,
} as const;

export const ENQUIRY_STATUS: Record<number, string> = {
  0: "New",
  1: "Contacted",
  2: "Site visit",
  3: "Quote sent",
  4: "Negotiation",
  5: "Approved",
  6: "Rejected",
  7: "Completed",
};

export const BOOKING_STATUS: Record<number, string> = {
  0: "Requested",
  1: "Confirmed",
  2: "Assigned",
  3: "In progress",
  4: "Completed",
  5: "Cancelled",
};

export const PODCAST_STATUS: Record<number, string> = {
  0: "Requested",
  1: "Confirmed",
  2: "Payment pending",
  3: "Paid",
  4: "Scheduled",
  5: "Completed",
  6: "Cancelled",
};

export const REVIEW_STATUS: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Hidden",
};

export const DISCOUNT_TYPE: Record<number, string> = {
  0: "Percentage",
  1: "Fixed amount",
};

export const PRICING_TYPE: Record<number, string> = {
  0: "Fixed",
  1: "Starting from",
  2: "Per hour",
  3: "Per visit",
  4: "Custom quote",
};

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.userType === "AdminStaff") return true;
  return user.roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? (response.statusText || "Request failed");
  } catch {
    return response.statusText || "Request failed";
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(await parseError(response), response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadImage(file: File, folder = "images") {
  const form = new FormData();
  form.append("file", file);
  return api<{ path: string; url: string; absoluteUrl?: string }>(`/uploads/image?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: form,
  });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusClass(label: string) {
  const key = label.toLowerCase();
  if (key.includes("cancel") || key.includes("fail") || key.includes("reject") || key.includes("hidden")) return "badge badge-danger";
  if (key.includes("pending") || key.includes("draft") || key.includes("request") || key.includes("new")) return "badge badge-warn";
  if (key.includes("deliver") || key.includes("paid") || key.includes("active") || key.includes("approv") || key.includes("complete")) return "badge badge-success";
  return "badge";
}
