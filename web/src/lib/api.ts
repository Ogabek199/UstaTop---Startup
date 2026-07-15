const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function extractErrorMessage(data: { message?: string | string[] }): string {
  const msg = data.message;
  if (Array.isArray(msg)) return msg[0] ?? "Xatolik yuz berdi";
  if (typeof msg === "string") return msg;
  return "Xatolik yuz berdi";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (!path.startsWith("/reports")) {
      const { reportToAdmin } = await import("@/lib/report");
      reportToAdmin({
        type: "api_error",
        message: err instanceof Error ? err.message : "Network request failed",
        apiPath: path,
        statusCode: "network",
      });
    }
    throw new ApiError("Serverga ulanib bo'lmadi", 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = extractErrorMessage(data);
    if (
      !path.startsWith("/reports") &&
      (res.status >= 500 || res.status === 0)
    ) {
      const { reportToAdmin } = await import("@/lib/report");
      reportToAdmin({
        type: "api_error",
        message,
        apiPath: path,
        statusCode: String(res.status),
      });
    }
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  checkPhone: (phone: string) =>
    request<{
      exists: boolean;
      hasPassword: boolean;
      role: User["role"] | null;
    }>("/auth/check-phone", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  login: (phone: string, password: string, role?: string) =>
    request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password, role }),
    }),

  register: (body: {
    phone: string;
    password: string;
    role: string;
    name?: string;
    district?: string;
    serviceCategoryIds?: string[];
    customServiceNames?: string[];
    priceMin?: number;
    priceMax?: number;
    bio?: string;
    experienceYears?: number;
  }) =>
    request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  sendOtp: (phone: string) =>
    request<{ message: string; mock?: boolean; code?: string }>(
      "/auth/send-otp",
      { method: "POST", body: JSON.stringify({ phone }) },
    ),

  verifyOtp: (body: {
    phone: string;
    code: string;
    password: string;
    role?: string;
    name?: string;
    district?: string;
    serviceCategoryIds?: string[];
    customServiceNames?: string[];
    priceMin?: number;
    priceMax?: number;
    bio?: string;
    experienceYears?: number;
  }) =>
    request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  getMe: (token: string) => request<User & { masterProfile?: MasterProfile }>("/users/me", {}, token),

  updateMe: (token: string, body: { name?: string; language?: string }) =>
    request<User & { masterProfile?: MasterProfile }>(
      "/users/me",
      { method: "PUT", body: JSON.stringify(body) },
      token,
    ),

  changePassword: (
    token: string,
    body: { currentPassword: string; newPassword: string },
  ) =>
    request<{ message: string }>(
      "/users/me/password",
      { method: "PUT", body: JSON.stringify(body) },
      token,
    ),

  changePhone: (
    token: string,
    body: { newPhone: string; currentPassword: string },
  ) =>
    request<User & { masterProfile?: MasterProfile }>(
      "/users/me/phone",
      { method: "PUT", body: JSON.stringify(body) },
      token,
    ),

  uploadAvatar: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(extractErrorMessage(data), res.status);
    }
    return data as User & { masterProfile?: MasterProfile };
  },

  getServices: () => request<Service[]>("/services"),

  searchProfessionals: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return request<{ items: MasterProfile[]; meta: PaginationMeta }>(
      `/professionals?${q}`,
    );
  },

  getProfessional: (id: string) =>
    request<MasterProfile>(`/professionals/${id}`),

  getProfessionalReviews: (
    id: string,
    params: { page?: number; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.set("page", String(params.page));
    if (params.limit !== undefined) q.set("limit", String(params.limit));
    const query = q.toString();
    return request<{ items: Review[]; meta: PaginationMeta }>(
      `/professionals/${id}/reviews${query ? `?${query}` : ""}`,
    );
  },

  getMyReviews: (
    token: string,
    params: { page?: number; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.set("page", String(params.page));
    if (params.limit !== undefined) q.set("limit", String(params.limit));
    const query = q.toString();
    return request<{ items: Review[]; meta: PaginationMeta }>(
      `/professionals/reviews${query ? `?${query}` : ""}`,
      {},
      token,
    );
  },

  createOrder: (token: string, body: CreateOrderBody) =>
    request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }, token),

  getOrders: (token: string) => request<Order[]>("/orders", {}, token),

  getOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}`, {}, token),

  createPayment: (token: string, orderId: string, provider: "payme" | "click") =>
    request(`/payments/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ provider }),
    }, token),

  createReview: (token: string, orderId: string, body: { rating: number; comment?: string }) =>
    request(`/reviews/${orderId}`, { method: "POST", body: JSON.stringify(body) }, token),

  getDashboard: (token: string) =>
    request<{ profile: MasterProfile; stats: DashboardStats }>(
      "/professionals/dashboard",
      {},
      token,
    ),

  getProAnalytics: (
    token: string,
    params: {
      period?: "1m" | "3m" | "6m" | "1y" | "all";
      from?: string;
      to?: string;
    } = { period: "1m" },
  ) => {
    const q = new URLSearchParams();
    if (params.from && params.to) {
      q.set("from", params.from);
      q.set("to", params.to);
    } else {
      q.set("period", params.period ?? "1m");
    }
    return request<ProAnalytics>(`/professionals/analytics?${q}`, {}, token);
  },

  acceptOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}/accept`, { method: "PUT" }, token),

  declineOrder: (token: string, id: string, reason: string) =>
    request<Order>(`/orders/${id}/decline`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }, token),

  updateOrderStatus: (token: string, id: string, status: string) =>
    request<Order>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }, token),

  getTelegramStatus: (token: string) =>
    request<{ connected: boolean; link: string | null }>(
      "/professionals/telegram/status",
      {},
      token,
    ),

  createTelegramLink: (token: string) =>
    request<{ connected: boolean; link: string | null }>(
      "/professionals/telegram/link",
      { method: "POST" },
      token,
    ),

  disconnectTelegram: (token: string) =>
    request<{ connected: boolean }>(
      "/professionals/telegram/disconnect",
      { method: "POST" },
      token,
    ),

  getCustomerTelegramStatus: (token: string) =>
    request<{ connected: boolean; link: string | null }>(
      "/users/me/telegram/status",
      {},
      token,
    ),

  createCustomerTelegramLink: (token: string) =>
    request<{ connected: boolean; link: string | null }>(
      "/users/me/telegram/link",
      { method: "POST" },
      token,
    ),

  disconnectCustomerTelegram: (token: string) =>
    request<{ connected: boolean }>(
      "/users/me/telegram/disconnect",
      { method: "POST" },
      token,
    ),

  getNotifications: (token: string) =>
    request<AppNotification[]>("/notifications", {}, token),

  getUnreadNotificationCount: (token: string) =>
    request<{ count: number }>("/notifications/unread-count", {}, token),

  markNotificationRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { method: "PUT" }, token),

  markAllNotificationsRead: (token: string) =>
    request<{ success: boolean }>("/notifications/read-all", { method: "PUT" }, token),

  cancelOrder: (token: string, id: string, reason?: string) =>
    request<Order>(`/orders/${id}/cancel`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }, token),

  getMessages: (token: string, orderId: string) =>
    request<OrderMessage[]>(`/messages/${orderId}`, {}, token),

  sendMessage: (
    token: string,
    orderId: string,
    body: { text?: string; imageUrl?: string },
  ) =>
    request<OrderMessage>(`/messages/${orderId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }, token),

  markMessagesRead: (token: string, orderId: string) =>
    request<{ success: boolean }>(
      `/messages/${orderId}/read`,
      { method: "PUT" },
      token,
    ),

  getAdminStats: (token: string) =>
    request<AdminStats>("/admin/stats", {}, token),

  getAdminUsers: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      role?: User["role"];
      pending?: boolean;
    },
  ) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.role) q.set("role", params.role);
    if (params?.pending) q.set("pending", "true");
    const qs = q.toString();
    return request<{ items: AdminUser[]; meta: PaginationMeta }>(
      `/admin/users${qs ? `?${qs}` : ""}`,
      {},
      token,
    );
  },

  approveProfessional: (token: string, userId: string) =>
    request<{ id: string; isApproved: boolean }>(
      `/admin/users/${userId}/approve`,
      { method: "PUT" },
      token,
    ),

  blockUser: (token: string, userId: string) =>
    request<User>(`/admin/users/${userId}/block`, { method: "PUT" }, token),

  unblockUser: (token: string, userId: string) =>
    request<User>(`/admin/users/${userId}/unblock`, { method: "PUT" }, token),

  getAdminOrders: (
    token: string,
    params?: { page?: number; limit?: number; status?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<{ items: Order[]; meta: PaginationMeta }>(
      `/admin/orders${qs ? `?${qs}` : ""}`,
      {},
      token,
    );
  },
};

export interface AdminStats {
  totalUsers: number;
  totalProfessionals: number;
  activeProfessionals: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalCommission: number;
}

export interface AdminUser extends User {
  createdAt: string;
  masterProfile: {
    id: string;
    isApproved: boolean;
    district: string | null;
    ratingAvg: string | number;
    reviewCount: number;
    completedOrders: number;
  } | null;
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: "customer" | "professional" | "admin";
  isVerified: boolean;
  avatarUrl: string | null;
  language: "uz" | "ru";
}

export interface Service {
  id: string;
  nameUz: string;
  nameRu: string;
  icon: string | null;
  category: string | null;
}

export interface MasterProfile {
  id: string;
  userId: string;
  bio: string | null;
  experienceYears: number;
  serviceCategoryIds: string[];
  priceMin: number;
  priceMax: number;
  ratingAvg: string | number;
  reviewCount: number;
  completedOrders: number;
  district: string | null;
  isApproved: boolean;
  isPremium: boolean;
  portfolioImages: string[];
  user: {
    id: string;
    name: string | null;
    phone: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  };
}

export interface Order {
  id: string;
  clientId: string;
  masterId: string | null;
  serviceId: string;
  status: string;
  description: string | null;
  address: string | null;
  scheduledAt: string | null;
  price: number;
  isExpress: boolean;
  expressFee: number;
  createdAt?: string;
  cancelReason?: string | null;
  service?: Service;
  master?: User;
  client?: User;
  payment?: { status: string };
  review?: { rating: number };
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  order?: {
    client: { name: string | null; avatarUrl: string | null };
    service?: { nameUz: string; nameRu: string };
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  pendingOrders: number;
  completedOrders: number;
  totalEarnings: number;
}

export interface ProAnalytics {
  profile: MasterProfile;
  period: { from: string; to: string };
  summary: {
    totalEarnings: number;
    completedOrders: number;
    pendingOrders: number;
    avgPerOrder: number;
  };
  dailyEarnings: { date: string; amount: number; orders: number }[];
  monthlyOrders: {
    month: string;
    label: string;
    count: number;
    earnings: number;
  }[];
  topLocations: { address: string; count: number; earnings: number }[];
  recentJobs: ProJobEntry[];
  pendingOrdersList: ProJobEntry[];
}

export interface ProJobEntry {
  id: string;
  date: string;
  address: string | null;
  price: number;
  service?: { nameUz: string; nameRu: string };
  clientName?: string | null;
  clientPhone?: string | null;
}

export interface CreateOrderBody {
  serviceId: string;
  masterId: string;
  description?: string;
  address?: string;
  scheduledAt?: string;
  price: number;
  isExpress?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: { orderId?: string; status?: string; type?: string } | null;
  isRead: boolean;
  createdAt: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  sentAt: string;
  sender?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role?: "customer" | "professional" | "admin";
  };
}
