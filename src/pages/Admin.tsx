import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  DollarSign,
  Download,
  Inbox,
  LayoutDashboard,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: number;
};

type DirectMessage = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: "instagram" | "facebook" | "website" | "other";
  handle?: string;
  message: string;
  createdAt: number;
};

type Order = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  paymentMethod: "stripe" | "email";
  status: "checkout_started" | "submitted";
  items: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  total: number;
  createdAt: number;
};

type InboxItem =
  | {
      id: string;
      type: "message";
      customerName: string;
      email: string;
      phone?: string;
      preview: string;
      body: string;
      createdAt: number;
    }
  | {
      id: string;
      type: "direct";
      customerName: string;
      email?: string;
      phone?: string;
      preview: string;
      body: string;
      createdAt: number;
      platform: DirectMessage["platform"];
      handle?: string;
    }
  | {
      id: string;
      type: "order";
      customerName: string;
      email: string;
      phone: string;
      preview: string;
      notes?: string;
      createdAt: number;
      paymentMethod: "stripe" | "email";
      status: "checkout_started" | "submitted";
      items: Order["items"];
      total: number;
    };

type Filter = "all" | "message" | "order" | "direct";
type SalesRange = "daily" | "weekly" | "monthly";
type ProductStatus = "active" | "draft" | "low_stock";
type AdminPage =
  | "dashboard"
  | "orders"
  | "products"
  | "inventory"
  | "customers"
  | "marketing"
  | "reports"
  | "fulfillment"
  | "events"
  | "settings";

type CustomerContact = {
  key: string;
  name: string;
  email: string;
  phone: string;
  sources: Array<"Message" | "Inquiry" | "Direct">;
  lastContactAt: number;
  totalMessages: number;
  totalDirectMessages: number;
  totalInquiries: number;
};

type ConversationItem = Extract<InboxItem, { type: "message" | "direct" }>;

type CustomerProfile = CustomerContact & {
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt?: number;
  orders: Extract<InboxItem, { type: "order" }>[];
  messages: ConversationItem[];
  notes: {
    vip: string;
    issues: string;
    preferences: string;
  };
  tags: string[];
};

type AdminProduct = {
  _id?: Id<"products">;
  productId: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  cost?: number;
  stock: number;
  inventoryThreshold?: number;
  status: ProductStatus;
  variants?: string[];
  imageKey: string;
  imageUploadName?: string;
};

type AdminInboxResult = {
  access: "granted" | "denied" | "missing";
  user: {
    id: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  messages: ContactMessage[];
  directMessages: DirectMessage[];
  orders: Order[];
};

const workosClientId = import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined;
const workosApiHostname = import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined;
const ADMIN_KEY_STORAGE = "mames-admin-key";
const adminNavItems: Array<{ id: AdminPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "products", label: "Products", icon: ShoppingBag },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "fulfillment", label: "Fulfillment", icon: Truck },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings },
];

const topNavItems = adminNavItems.slice(0, 5);
const emptyProductForm: AdminProduct = {
  productId: "",
  name: "",
  sku: "",
  description: "",
  category: "Full Size",
  price: 0,
  cost: 0,
  stock: 0,
  inventoryThreshold: 10,
  status: "draft",
  variants: [],
  imageKey: "beef-pork",
  imageUploadName: "",
};

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const getInboxItemLabel = (type: InboxItem["type"]) => {
  if (type === "order") {
    return "Inquiry";
  }

  if (type === "direct") {
    return "Direct";
  }

  return "Message";
};

const getInboxItemHeading = (type: InboxItem["type"]) => {
  if (type === "order") {
    return "Order Inquiry";
  }

  if (type === "direct") {
    return "Direct Message";
  }

  return "Customer Message";
};

const formatDirectPlatform = (platform: DirectMessage["platform"]) =>
  platform.charAt(0).toUpperCase() + platform.slice(1);

const calculateMargin = (price: number, cost = 0) => {
  if (price <= 0) {
    return 0;
  }

  return ((price - cost) / price) * 100;
};

const formatMargin = (price: number, cost = 0) => `${Math.round(calculateMargin(price, cost))}%`;

const getInventoryStatus = (product: AdminProduct) => {
  const threshold = product.inventoryThreshold ?? 10;

  if (product.stock <= threshold || product.status === "low_stock") {
    return "Low Stock";
  }

  if (product.status === "draft") {
    return "Draft";
  }

  return "Healthy";
};

const escapeCsvValue = (value: string | number) => {
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
};

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getStoredAdminKey = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
};

const AdminConfigurationMissing = () => (
  <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-cajun"
        >
          <ArrowLeft size={16} />
          Back to website
        </Link>
        <h1 className="font-serif text-3xl font-bold text-foreground md:text-5xl">Admin Portal</h1>
      </div>
    </header>
    <section className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-lg space-y-4 border border-destructive/30 bg-destructive/10 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-cajun/10 text-cajun">
          <Lock size={22} />
        </div>
        <h2 className="font-serif text-2xl font-bold">WorkOS is not configured</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Add <span className="font-semibold">VITE_WORKOS_CLIENT_ID</span> in Vercel, then add{" "}
          <span className="font-semibold">WORKOS_CLIENT_ID</span>,{" "}
          <span className="font-semibold">WORKOS_API_KEY</span>, and{" "}
          <span className="font-semibold">WORKOS_ADMIN_EMAILS</span> in Convex.
        </p>
      </div>
    </section>
  </main>
);

const AdminPortal = () => {
  const { getAccessToken, isLoading: authLoading, signIn, signOut, user } = useAuth();
  const getInboxForAdmin = useAction(api.admin.getInboxForAdmin);
  const createProduct = useMutation(api.products.createForAdmin);
  const updateProduct = useMutation(api.products.updateForAdmin);
  const [adminResult, setAdminResult] = useState<AdminInboxResult | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [fallbackInput, setFallbackInput] = useState(getStoredAdminKey);
  const [fallbackKey, setFallbackKey] = useState(getStoredAdminKey);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<AdminPage>("dashboard");
  const [salesRange, setSalesRange] = useState<SalesRange>("daily");
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<AdminProduct>(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);
  const [productNotice, setProductNotice] = useState<string | null>(null);

  const passwordContactResult = useQuery(
    api.contactMessages.listForAdmin,
    fallbackKey ? { adminKey: fallbackKey, limit: 1000 } : "skip"
  );
  const passwordDirectResult = useQuery(
    api.directMessages.listForAdmin,
    fallbackKey ? { adminKey: fallbackKey, limit: 1000 } : "skip"
  );
  const passwordOrderResult = useQuery(api.orders.listForAdmin, fallbackKey ? { adminKey: fallbackKey, limit: 1000 } : "skip");
  const productResult = useQuery(api.products.listForAdmin, fallbackKey ? { adminKey: fallbackKey } : "skip");

  const passwordAccess = passwordContactResult?.access ?? passwordDirectResult?.access ?? passwordOrderResult?.access;
  const access = adminResult?.access ?? passwordAccess;
  const isLoading =
    authLoading || inboxLoading || Boolean(fallbackKey && (!passwordContactResult || !passwordDirectResult || !passwordOrderResult));
  const isUnlocked = access === "granted";
  const isUsingPassword = Boolean(fallbackKey);

  const loadInbox = useCallback(async () => {
    if (!user) {
      return;
    }

    setInboxLoading(true);
    setInboxError(null);

    try {
      const accessToken = await getAccessToken();
      const result = await getInboxForAdmin({ accessToken, limit: 1000 });
      setAdminResult(result as AdminInboxResult);
    } catch {
      setInboxError("Could not load the admin inbox. Please sign in again.");
      setAdminResult(null);
    } finally {
      setInboxLoading(false);
    }
  }, [getAccessToken, getInboxForAdmin, user]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const selectedProduct = productResult?.products.find((product: AdminProduct) => product._id === selectedProductId);

    setProductForm(selectedProduct ?? emptyProductForm);
  }, [productResult?.products, selectedProductId]);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const contactMessages = isUsingPassword ? passwordContactResult?.messages : adminResult?.messages;
    const directMessages = isUsingPassword ? passwordDirectResult?.directMessages : adminResult?.directMessages;
    const orderInquiries = isUsingPassword ? passwordOrderResult?.orders : adminResult?.orders;

    const messages =
      contactMessages?.map((message: ContactMessage) => ({
        id: message._id,
        type: "message" as const,
        customerName: message.name,
        email: message.email,
        phone: message.phone,
        preview: message.message,
        body: message.message,
        createdAt: message.createdAt,
      })) ?? [];

    const direct =
      directMessages?.map((message: DirectMessage) => ({
        id: message._id,
        type: "direct" as const,
        customerName: message.name,
        email: message.email,
        phone: message.phone,
        preview: message.message,
        body: message.message,
        createdAt: message.createdAt,
        platform: message.platform,
        handle: message.handle,
      })) ?? [];

    const orders =
      orderInquiries?.map((order: Order) => ({
        id: order._id,
        type: "order" as const,
        customerName: order.name,
        email: order.email,
        phone: order.phone,
        preview: order.notes || `${order.items.length} item${order.items.length === 1 ? "" : "s"}`,
        notes: order.notes,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        status: order.status,
        items: order.items,
        total: order.total,
      })) ?? [];

    return [...messages, ...direct, ...orders].sort((a, b) => b.createdAt - a.createdAt);
  }, [
    adminResult?.directMessages,
    adminResult?.messages,
    adminResult?.orders,
    isUsingPassword,
    passwordContactResult?.messages,
    passwordDirectResult?.directMessages,
    passwordOrderResult?.orders,
  ]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return inboxItems.filter((item) => {
      const matchesFilter = filter === "all" || item.type === filter;
      const matchesSearch =
        !normalizedSearch ||
        [item.customerName, item.email, item.phone, item.preview, item.type === "direct" ? item.platform : undefined]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, inboxItems, search]);

  const activeItem = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;
  const customerContacts = useMemo<CustomerContact[]>(() => {
    const contactsByKey = new Map<string, CustomerContact>();

    inboxItems.forEach((item) => {
      const emailKey = (item.email ?? "").trim().toLowerCase();
      const phoneKey = (item.phone ?? "").replace(/\D/g, "");
      const key = emailKey || phoneKey || item.customerName.trim().toLowerCase();
      const source = getInboxItemLabel(item.type);
      const existing = contactsByKey.get(key);

      if (!existing) {
        contactsByKey.set(key, {
          key,
          name: item.customerName,
          email: item.email ?? "",
          phone: item.phone ?? "",
          sources: [source],
          lastContactAt: item.createdAt,
          totalMessages: item.type === "message" ? 1 : 0,
          totalDirectMessages: item.type === "direct" ? 1 : 0,
          totalInquiries: item.type === "order" ? 1 : 0,
        });
        return;
      }

      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }

      existing.lastContactAt = Math.max(existing.lastContactAt, item.createdAt);
      existing.totalMessages += item.type === "message" ? 1 : 0;
      existing.totalDirectMessages += item.type === "direct" ? 1 : 0;
      existing.totalInquiries += item.type === "order" ? 1 : 0;

      if (!existing.phone && item.phone) {
        existing.phone = item.phone;
      }

      if (item.createdAt >= existing.lastContactAt) {
        existing.name = item.customerName || existing.name;
        existing.email = item.email || existing.email;
      }
    });

    return Array.from(contactsByKey.values()).sort((a, b) => b.lastContactAt - a.lastContactAt);
  }, [inboxItems]);

  const customerProfiles = useMemo<CustomerProfile[]>(() => {
    const profilesByKey = new Map<string, CustomerProfile>();

    inboxItems.forEach((item) => {
      const emailKey = (item.email ?? "").trim().toLowerCase();
      const phoneKey = (item.phone ?? "").replace(/\D/g, "");
      const key = emailKey || phoneKey || item.customerName.trim().toLowerCase();
      const source = getInboxItemLabel(item.type);
      const existing = profilesByKey.get(key);
      const profile =
        existing ??
        ({
          key,
          name: item.customerName,
          email: item.email ?? "",
          phone: item.phone ?? "",
          sources: [],
          lastContactAt: item.createdAt,
          totalMessages: 0,
          totalDirectMessages: 0,
          totalInquiries: 0,
          orderCount: 0,
          lifetimeValue: 0,
          orders: [],
          messages: [],
          notes: {
            vip: "",
            issues: "",
            preferences: "",
          },
          tags: [],
        } satisfies CustomerProfile);

      if (!profile.sources.includes(source)) {
        profile.sources.push(source);
      }

      if (item.createdAt >= profile.lastContactAt) {
        profile.name = item.customerName || profile.name;
        profile.email = item.email || profile.email;
      }

      profile.lastContactAt = Math.max(profile.lastContactAt, item.createdAt);
      profile.phone = profile.phone || item.phone || "";

      if (item.type === "order") {
        profile.totalInquiries += 1;
        profile.orderCount += 1;
        profile.lifetimeValue += item.total;
        profile.lastOrderAt = Math.max(profile.lastOrderAt ?? 0, item.createdAt);
        profile.orders.push(item);
      } else {
        if (item.type === "direct") {
          profile.totalDirectMessages += 1;
        } else {
          profile.totalMessages += 1;
        }
        profile.messages.push(item);
      }

      profilesByKey.set(key, profile);
    });

    return Array.from(profilesByKey.values())
      .map((profile) => {
        const orderNotes = profile.orders.map((order) => order.notes).filter(Boolean) as string[];
        const messageNotes = profile.messages.map((message) => message.body).filter(Boolean);
        const combinedNotes = [...orderNotes, ...messageNotes].join(" ").toLowerCase();
        const tags = new Set<string>();

        if (profile.lifetimeValue >= 200 || profile.orderCount >= 3) {
          tags.add("VIP");
        }

        if (/\b(wholesale|bulk|restaurant|resale)\b/.test(combinedNotes)) {
          tags.add("Wholesale");
        }

        if (/\b(event|wedding|festival|party|catering|corporate)\b/.test(combinedNotes)) {
          tags.add("Event Buyer");
        }

        return {
          ...profile,
          orders: profile.orders.sort((a, b) => b.createdAt - a.createdAt),
          messages: profile.messages.sort((a, b) => b.createdAt - a.createdAt),
          notes: {
            vip:
              profile.lifetimeValue >= 200
                ? `${formatCurrency(profile.lifetimeValue)} lifetime value across ${profile.orderCount} order${profile.orderCount === 1 ? "" : "s"}.`
                : profile.orderCount > 0
                  ? `${profile.orderCount} order${profile.orderCount === 1 ? "" : "s"} so far.`
                  : "No orders yet.",
            issues:
              /\b(issue|problem|late|refund|missing|wrong|cancel)\b/.test(combinedNotes)
                ? "Review recent notes for possible service follow-up."
                : "No issues flagged.",
            preferences: orderNotes.length > 0 ? orderNotes.slice(0, 2).join(" ") : "No preferences recorded yet.",
          },
          tags: Array.from(tags),
        };
      })
      .sort((a, b) => (b.lastOrderAt ?? b.lastContactAt) - (a.lastOrderAt ?? a.lastContactAt));
  }, [inboxItems]);

  const visibleContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return customerContacts;
    }

    return customerContacts.filter((contact) =>
      [contact.name, contact.email, contact.phone, contact.sources.join(" ")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [customerContacts, search]);

  const visibleCustomerProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return customerProfiles;
    }

    return customerProfiles.filter((profile) =>
      [profile.name, profile.email, profile.phone, profile.tags.join(" "), profile.sources.join(" ")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [customerProfiles, search]);

  const selectedCustomer = visibleCustomerProfiles.find((profile) => profile.key === selectedCustomerKey) ?? null;

  const contactMessageCount = (isUsingPassword ? passwordContactResult?.messages.length : adminResult?.messages.length) ?? 0;
  const directMessageCount =
    (isUsingPassword ? passwordDirectResult?.directMessages.length : adminResult?.directMessages.length) ?? 0;
  const messageCount = contactMessageCount + directMessageCount;
  const orderCount = (isUsingPassword ? passwordOrderResult?.orders.length : adminResult?.orders.length) ?? 0;
  const contactCount = customerContacts.length;
  const orderItems = inboxItems.filter((item) => item.type === "order");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrderItems = orderItems.filter((item) => item.createdAt >= todayStart.getTime());
  const todayRevenue = todayOrderItems.reduce((sum, item) => sum + item.total, 0);
  const conversionRate = inboxItems.length > 0 ? Math.round((orderCount / inboxItems.length) * 100) : 0;
  const recentOrders = orderItems.slice(0, 5);
  const adminProductRows = useMemo(() => (productResult?.products ?? []) as AdminProduct[], [productResult?.products]);
  const lowStockProducts = adminProductRows.filter(
    (product) => product.status === "low_stock" || product.stock <= (product.inventoryThreshold ?? 10)
  );
  const lowStockAlerts = lowStockProducts.length;
  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return adminProductRows;
    }

    return adminProductRows.filter((product) =>
      [product.name, product.sku, product.status].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [adminProductRows, search]);
  const selectedProduct = adminProductRows.find((product) => product._id === selectedProductId);
  const dashboardAlerts = [
    {
      title: "Low inventory: Meat Pies",
      detail:
        lowStockAlerts > 0
          ? `${lowStockAlerts} product${lowStockAlerts === 1 ? "" : "s"} need inventory attention.`
          : "Inventory counts are healthy.",
    },
    {
      title: "Failed payment alert",
      detail: "Stripe checkout monitoring is ready for the next integration step.",
    },
  ];
  const promoCodeRows = [
    {
      code: "MAMES10",
      discount: "10% off",
      usage: "Ready",
      expiration: "No expiration set",
    },
    {
      code: "LOCALPICKUP",
      discount: "$5 off",
      usage: "Ready",
      expiration: "No expiration set",
    },
  ];
  const inactiveSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const audienceSegments = [
    {
      name: "Repeat Customers",
      count: customerProfiles.filter((profile) => profile.orderCount > 1).length,
      detail: "Customers with more than one order inquiry.",
    },
    {
      name: "First-Time Buyers",
      count: customerProfiles.filter((profile) => profile.orderCount === 1).length,
      detail: "Customers with one recorded order inquiry.",
    },
    {
      name: "Inactive (30+ days)",
      count: customerProfiles.filter((profile) => profile.lastContactAt < inactiveSince).length,
      detail: "Customers without recent messages or order inquiries.",
    },
  ];
  const salesBuckets = useMemo(() => {
    const buckets =
      salesRange === "daily"
        ? Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            return {
              label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
              start: date.getTime(),
              end: nextDate.getTime(),
            };
          })
        : salesRange === "weekly"
          ? Array.from({ length: 4 }, (_, index) => {
              const end = new Date();
              end.setDate(end.getDate() - (3 - index) * 7);
              end.setHours(23, 59, 59, 999);
              const start = new Date(end);
              start.setDate(end.getDate() - 6);
              start.setHours(0, 0, 0, 0);

              return {
                label: `W${index + 1}`,
                start: start.getTime(),
                end: end.getTime(),
              };
            })
          : Array.from({ length: 6 }, (_, index) => {
              const date = new Date();
              date.setMonth(date.getMonth() - (5 - index), 1);
              date.setHours(0, 0, 0, 0);
              const nextDate = new Date(date);
              nextDate.setMonth(date.getMonth() + 1);

              return {
                label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
                start: date.getTime(),
                end: nextDate.getTime(),
              };
            });

    const values = buckets.map((bucket) => ({
      label: bucket.label,
      total: orderItems
        .filter((item) => item.createdAt >= bucket.start && item.createdAt < bucket.end)
        .reduce((sum, item) => sum + item.total, 0),
    }));
    const maxTotal = Math.max(...values.map((bucket) => bucket.total), 1);

    return values.map((bucket) => ({
      ...bucket,
      height: Math.max((bucket.total / maxTotal) * 100, bucket.total > 0 ? 12 : 4),
    }));
  }, [orderItems, salesRange]);
  const latestActivityAt = inboxItems[0]?.createdAt;
  const currentUserLabel = user?.email ?? (isUsingPassword ? "Password access" : "Not signed in");

  const handleDownloadContacts = (contacts: CustomerContact[]) => {
    downloadCsv(
      `mames-customer-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      contacts.map((contact) => ({
        Name: contact.name,
        Email: contact.email,
        Phone: contact.phone || "Not provided",
        Source: contact.sources.join(" + "),
        "Message Count": contact.totalMessages,
        "Direct Message Count": contact.totalDirectMessages,
        "Inquiry Count": contact.totalInquiries,
        "Last Contact": formatDate(contact.lastContactAt),
      }))
    );
  };

  const updateProductForm = (field: keyof AdminProduct, value: string | number | string[]) => {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductNotice(null);

    if (!fallbackKey) {
      setProductNotice("Unlock with the admin password before saving products.");
      return;
    }

    const productPayload = {
      productId: productForm.productId.trim(),
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      description: productForm.description.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      cost: Number(productForm.cost ?? 0),
      stock: Number(productForm.stock),
      inventoryThreshold: Number(productForm.inventoryThreshold ?? 10),
      status: productForm.status,
      variants: productForm.variants?.map((variant) => variant.trim()).filter(Boolean) ?? [],
      imageKey: productForm.imageKey.trim(),
      imageUploadName: productForm.imageUploadName?.trim() || undefined,
    };

    if (!productPayload.productId || !productPayload.name || !productPayload.sku) {
      setProductNotice("Product ID, name, and SKU are required.");
      return;
    }

    setProductSaving(true);

    try {
      if (selectedProduct?._id) {
        const result = await updateProduct({
          adminKey: fallbackKey,
          id: selectedProduct._id,
          product: productPayload,
        });
        setProductNotice(result.access === "granted" ? "Product updated." : "That admin password did not match.");
      } else {
        const result = await createProduct({
          adminKey: fallbackKey,
          product: productPayload,
        });
        setProductNotice(result.access === "granted" ? "Product added." : "That admin password did not match.");
        if (result.access === "granted") {
          setSelectedProductId(null);
          setProductForm(emptyProductForm);
        }
      }
    } catch (error) {
      setProductNotice(error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setProductSaving(false);
    }
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKey = fallbackInput.trim();

    if (trimmedKey) {
      window.localStorage.setItem(ADMIN_KEY_STORAGE, trimmedKey);
    }

    setFallbackKey(trimmedKey);
    setAdminResult(null);
    setSelectedId(null);
  };

  const handleSignOut = () => {
    setAdminResult(null);
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setFallbackInput("");
    setFallbackKey("");
    setSelectedId(null);

    if (user) {
      signOut({ returnTo: window.location.origin });
    }
  };

  const alertPanel = (
    <>
      {access === "missing" && (
        <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
          WorkOS admin access is not fully configured. Set <span className="font-semibold">WORKOS_CLIENT_ID</span>,{" "}
          <span className="font-semibold">WORKOS_API_KEY</span>, and{" "}
          <span className="font-semibold">WORKOS_ADMIN_EMAILS</span> in Convex.
        </div>
      )}
      {access === "denied" && (
        <div className="flex flex-col gap-3 border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {isUsingPassword
              ? "That admin password did not match. Try again with the current password."
              : "Your WorkOS account is not allowed to view this admin portal."}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-fit rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
          >
            {isUsingPassword ? "Enter password again" : "Sign out"}
          </button>
        </div>
      )}
      {inboxError && (
        <div className="flex flex-col gap-3 border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{inboxError}</span>
          <button
            type="button"
            onClick={() => void loadInbox()}
            className="w-fit rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
          >
            Try again
          </button>
        </div>
      )}
    </>
  );

  const dashboardOverviewPanel = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Today's Revenue</p>
            <DollarSign className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? formatCurrency(todayRevenue) : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">From today's order inquiries</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Orders</p>
            <PackageCheck className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? todayOrderItems.length : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Created today</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Conversion</p>
            <BarChart3 className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? `${conversionRate}%` : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Inquiries from total activity</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Low Stock Alert</p>
            <AlertTriangle className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? lowStockAlerts : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Inventory tracking ready</p>
        </div>
      </div>

      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Sales Graph</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revenue trend from order inquiry totals.</p>
          </div>
          <div className="flex w-fit rounded-[8px] border border-border bg-background p-1">
            {[
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSalesRange(value as SalesRange)}
                className={`rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
                  salesRange === value ? "bg-cajun text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex h-64 items-end gap-3 border-l border-b border-border px-3 pb-3">
          {salesBuckets.map((bucket) => (
            <div key={bucket.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-[8px] bg-cajun/80 transition-all"
                  style={{ height: `${bucket.height}%` }}
                  title={`${bucket.label}: ${formatCurrency(bucket.total)}`}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">{bucket.label}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(bucket.total)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-2xl font-bold text-foreground">Recent Orders</h2>
          </div>
          <div>
            {isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading recent orders...</p>
            ) : !isUnlocked ? (
              <p className="p-5 text-sm text-muted-foreground">Unlock the portal to review recent orders.</p>
            ) : recentOrders.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No recent orders yet.</p>
            ) : (
              recentOrders.map((order, index) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setActivePage("orders");
                    setSelectedId(order.id);
                  }}
                  className="grid w-full gap-2 border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-muted md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-foreground">Order #{String(1023 + index)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{order.customerName}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(order.total)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-2xl font-bold text-foreground">Alerts / Notifications</h2>
          </div>
          <div>
            {dashboardAlerts.map((alert) => (
              <div key={alert.title} className="flex gap-3 border-b border-border p-4 last:border-b-0">
                <AlertTriangle className="mt-0.5 shrink-0 text-cajun" size={18} />
                <div>
                  <p className="font-semibold text-foreground">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump into common admin tasks.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActivePage("products")}
              className="inline-flex items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
            >
              <Plus size={15} />
              Add Product
            </button>
            <button
              type="button"
              onClick={() => setActivePage("marketing")}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Tag size={15} />
              Create Promo
            </button>
            <button
              type="button"
              onClick={() => setActivePage("orders")}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <PackageCheck size={15} />
              New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const metricsPanel = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Customer Messages</p>
          <MessageSquare className="text-cajun" size={20} />
        </div>
        <p className="mt-3 text-3xl font-bold">{isUnlocked ? messageCount : "-"}</p>
      </div>
      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Order Inquiries</p>
          <PackageCheck className="text-cajun" size={20} />
        </div>
        <p className="mt-3 text-3xl font-bold">{isUnlocked ? orderCount : "-"}</p>
      </div>
      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Direct Messages</p>
          <Inbox className="text-cajun" size={20} />
        </div>
        <p className="mt-3 text-3xl font-bold">{isUnlocked ? directMessageCount : "-"}</p>
      </div>
      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Saved Contacts</p>
          <Users className="text-cajun" size={20} />
        </div>
        <p className="mt-3 text-3xl font-bold">{isUnlocked ? contactCount : "-"}</p>
      </div>
    </div>
  );

  const customerDatabasePanel = (
    <div className="border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Customer Database</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Names, phone numbers, and emails collected from messages and order inquiries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDownloadContacts(visibleContacts)}
            disabled={!isUnlocked || visibleContacts.length === 0}
            className="inline-flex items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Download shown
          </button>
          <button
            type="button"
            onClick={() => handleDownloadContacts(customerContacts)}
            disabled={!isUnlocked || customerContacts.length === 0}
            className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Download all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  Loading contacts...
                </td>
              </tr>
            ) : !isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  Unlock the portal to review customer contacts.
                </td>
              </tr>
            ) : visibleContacts.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  No saved contacts match that search.
                </td>
              </tr>
            ) : (
              visibleContacts.map((contact) => (
                <tr key={contact.key} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-foreground">{contact.name}</td>
                  <td className="px-5 py-4">
                    {contact.email ? (
                      <a className="break-words text-cajun hover:underline" href={`mailto:${contact.email}`}>
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {contact.phone ? (
                      <a className="text-foreground hover:underline" href={`tel:${contact.phone}`}>
                        {contact.phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {contact.sources.join(" + ")}
                    <span className="ml-2 text-xs">
                      ({contact.totalMessages + contact.totalDirectMessages + contact.totalInquiries})
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDate(contact.lastContactAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const customerDirectoryPanel = (
    <div className="space-y-6">
      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Search Customers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find customers by name, email, phone, source, or tag.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDownloadContacts(visibleCustomerProfiles)}
            disabled={!isUnlocked || visibleCustomerProfiles.length === 0}
            className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Download shown
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedCustomerKey(null);
            }}
            placeholder="Search customers"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Lifetime Value</th>
                <th className="px-5 py-3">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                    Loading customers...
                  </td>
                </tr>
              ) : !isUnlocked ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                    Unlock the portal to review customers.
                  </td>
                </tr>
              ) : visibleCustomerProfiles.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                    No customers match that search.
                  </td>
                </tr>
              ) : (
                visibleCustomerProfiles.map((profile) => (
                  <tr
                    key={profile.key}
                    className={`border-b border-border last:border-b-0 ${selectedCustomerKey === profile.key ? "bg-muted" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerKey(profile.key)}
                        className="text-left font-semibold text-foreground transition-colors hover:text-cajun"
                      >
                        {profile.name}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <a className="break-words text-cajun hover:underline" href={`mailto:${profile.email}`}>
                        {profile.email}
                      </a>
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground">{profile.orderCount}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(profile.lifetimeValue)}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {profile.lastOrderAt ? formatDate(profile.lastOrderAt) : "No orders yet"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <article className="min-h-[520px] border border-border bg-card p-5">
          {!selectedCustomer ? (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <Users className="mx-auto mb-3 text-muted-foreground" size={36} />
                <p className="font-semibold text-foreground">No customer selected</p>
                <p className="mt-1 text-sm text-muted-foreground">Click a customer to open their profile.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-border pb-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">Customer Profile</p>
                <h3 className="mt-2 font-serif text-3xl font-bold text-foreground">{selectedCustomer.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedCustomer.tags.length > 0 ? selectedCustomer.tags : ["New Customer"]).map((tag) => (
                    <span key={tag} className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <section>
                <h4 className="font-serif text-xl font-bold text-foreground">Contact Info</h4>
                <dl className="mt-3 grid gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Email</dt>
                    <dd className="mt-1 break-words">
                      <a className="text-cajun hover:underline" href={`mailto:${selectedCustomer.email}`}>
                        {selectedCustomer.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Phone</dt>
                    <dd className="mt-1 text-foreground">
                      {selectedCustomer.phone ? (
                        <a className="hover:underline" href={`tel:${selectedCustomer.phone}`}>
                          {selectedCustomer.phone}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Source</dt>
                    <dd className="mt-1 text-foreground">{selectedCustomer.sources.join(" + ")}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h4 className="font-serif text-xl font-bold text-foreground">Order History</h4>
                <div className="mt-3 overflow-hidden border border-border">
                  {selectedCustomer.orders.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No orders recorded yet.</p>
                  ) : (
                    selectedCustomer.orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setActivePage("orders");
                          setSelectedId(order.id);
                        }}
                        className="grid w-full gap-2 border-b border-border p-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted md:grid-cols-[1fr_auto]"
                      >
                        <span>
                          <span className="font-semibold text-foreground">{order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                        </span>
                        <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h4 className="font-serif text-xl font-bold text-foreground">Notes</h4>
                <div className="mt-3 grid gap-3 text-sm">
                  <div className="border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">VIP</p>
                    <p className="mt-1 text-foreground">{selectedCustomer.notes.vip}</p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Issues</p>
                    <p className="mt-1 text-foreground">{selectedCustomer.notes.issues}</p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Preferences</p>
                    <p className="mt-1 text-foreground">{selectedCustomer.notes.preferences}</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-serif text-xl font-bold text-foreground">Tags</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["VIP", "Wholesale", "Event Buyer"].map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-[8px] border px-3 py-2 text-xs font-bold uppercase ${
                        selectedCustomer.tags.includes(tag)
                          ? "border-cajun bg-cajun text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}
        </article>
      </div>
    </div>
  );

  const marketingPanel = (
    <div className="space-y-6">
      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Marketing</h2>
            <p className="mt-1 text-sm text-muted-foreground">Plan campaigns, promo codes, email, and SMS outreach.</p>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
          >
            <Megaphone size={15} />
            Create Campaign
          </button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Campaigns", icon: Megaphone },
            { label: "Promo Codes", icon: Tag },
            { label: "Email", icon: Mail },
            { label: "SMS", icon: MessageSquare },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex items-center justify-between rounded-[8px] border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <span>{item.label}</span>
                <Icon className="text-cajun" size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground">Promo Codes</h3>
              <p className="mt-1 text-sm text-muted-foreground">Track discount codes and expirations.</p>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
            >
              <Plus size={15} />
              Create Promo Code
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {promoCodeRows.map((promoCode) => (
                  <tr key={promoCode.code} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-4 font-semibold text-foreground">{promoCode.code}</td>
                    <td className="px-5 py-4 text-muted-foreground">{promoCode.discount}</td>
                    <td className="px-5 py-4 text-muted-foreground">{promoCode.usage}</td>
                    <td className="px-5 py-4 text-muted-foreground">{promoCode.expiration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground">Email / SMS</h3>
              <p className="mt-1 text-sm text-muted-foreground">Audience segments for campaign targeting.</p>
            </div>
            <div className="flex gap-2">
              <Mail className="text-cajun" size={18} />
              <MessageSquare className="text-cajun" size={18} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Audience Segments</p>
            {audienceSegments.map((segment) => (
              <div key={segment.name} className="border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{segment.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{segment.detail}</p>
                  </div>
                  <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                    {isUnlocked ? segment.count : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-border px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Megaphone size={15} />
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );

  const inboxWorkspace = (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
      <aside className="border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2">
            <Search size={16} className="text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["message", "Messages"],
              ["order", "Inquiries"],
              ["direct", "Direct"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value as Filter);
                  setSelectedId(null);
                }}
                className={`rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
                  filter === value
                    ? "bg-cajun text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[620px] overflow-y-auto">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading inbox...</p>
          ) : !isUnlocked ? (
            <p className="p-5 text-sm text-muted-foreground">Unlock the portal to view messages.</p>
          ) : visibleItems.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No matching messages yet.</p>
          ) : (
            visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`block w-full border-b border-border p-4 text-left transition-colors hover:bg-muted ${
                  activeItem?.id === item.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item.customerName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.email || (item.type === "direct" ? item.handle || formatDirectPlatform(item.platform) : "No email")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-semibold text-foreground">
                    {getInboxItemLabel(item.type)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.preview}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{formatDate(item.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <article className="min-h-[460px] border border-border bg-card p-5 md:p-6">
        {!activeItem ? (
          <div className="flex min-h-[360px] items-center justify-center text-center">
            <div>
              <Inbox className="mx-auto mb-3 text-muted-foreground" size={36} />
              <p className="font-semibold text-foreground">No message selected</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose an inbox item to read the details.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="rounded-[8px] bg-cajun/10 px-3 py-1 text-xs font-bold uppercase text-cajun">
                  {getInboxItemHeading(activeItem.type)}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-bold text-foreground">{activeItem.customerName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(activeItem.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeItem.email && (
                  <a
                    href={`mailto:${activeItem.email}`}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
                  >
                    <Mail size={15} />
                    Email
                  </a>
                )}
                {activeItem.phone && (
                  <a
                    href={`tel:${activeItem.phone}`}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <Phone size={15} />
                    Call
                  </a>
                )}
              </div>
            </div>

            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Email</dt>
                <dd className="mt-1 break-words text-sm text-foreground">{activeItem.email || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Phone</dt>
                <dd className="mt-1 text-sm text-foreground">{activeItem.phone || "Not provided"}</dd>
              </div>
              {activeItem.type === "direct" && (
                <>
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Platform</dt>
                    <dd className="mt-1 text-sm text-foreground">{formatDirectPlatform(activeItem.platform)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">Handle</dt>
                    <dd className="mt-1 text-sm text-foreground">{activeItem.handle || "Not provided"}</dd>
                  </div>
                </>
              )}
            </dl>

            {activeItem.type !== "order" ? (
              <div className="mt-6">
                <h3 className="font-serif text-xl font-bold">Message</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{activeItem.body}</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-bold">Inquiry Details</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Status</p>
                      <p className="mt-1 text-sm font-semibold">
                        {activeItem.status === "submitted" ? "Submitted" : "Checkout started"}
                      </p>
                    </div>
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Payment</p>
                      <p className="mt-1 text-sm font-semibold">{activeItem.paymentMethod === "stripe" ? "Stripe" : "Email"}</p>
                    </div>
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Total</p>
                      <p className="mt-1 text-sm font-semibold">{formatCurrency(activeItem.total)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold">Items</h3>
                  <div className="mt-3 overflow-hidden border border-border">
                    {activeItem.items.map((item) => (
                      <div key={item.productId} className="grid gap-2 border-b border-border p-3 text-sm last:border-b-0 md:grid-cols-[1fr_auto_auto]">
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-muted-foreground">Qty {item.quantity}</span>
                        <span>{formatCurrency(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold">Notes</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{activeItem.notes || "No notes included."}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );

  const ordersPanel = (
    <div className="space-y-6">
      <div className="border border-border bg-card p-5">
        <h2 className="font-serif text-2xl font-bold text-foreground">Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review order inquiries and checkout starts.</p>
      </div>
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
                  Loading orders...
                </td>
              </tr>
            ) : !isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
                  Unlock the portal to review orders.
                </td>
              </tr>
            ) : orderItems.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
                  No order inquiries yet.
                </td>
              </tr>
            ) : (
              orderItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-foreground">{item.customerName}</td>
                  <td className="px-5 py-4 text-cajun">{item.email}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.status === "submitted" ? "Submitted" : "Checkout started"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{item.paymentMethod === "stripe" ? "Stripe" : "Email"}</td>
                  <td className="px-5 py-4 font-semibold">{formatCurrency(item.total)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDate(item.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const productsPanel = (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product details, pricing, cost, margins, variants, images, and linked inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedProductId(null);
            setProductForm(emptyProductForm);
            setProductNotice(null);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
        >
          <Plus size={15} />
          Add Product
        </button>
      </div>

      <form onSubmit={handleProductSubmit} className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">
              {selectedProduct ? `Editing ${selectedProduct.name}` : "Product Details"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Margin is calculated from the current price and cost.
            </p>
          </div>
          <div className="border border-border bg-background p-3 text-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Margin</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatMargin(Number(productForm.price), Number(productForm.cost ?? 0))}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Product Name
            <input
              value={productForm.name}
              onChange={(event) => updateProductForm("name", event.target.value)}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="Beef & Pork Meat Pie"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Product ID
            <input
              value={productForm.productId}
              onChange={(event) => updateProductForm("productId", event.target.value)}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="beef-pork"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground md:col-span-2">
            Description
            <textarea
              value={productForm.description}
              onChange={(event) => updateProductForm("description", event.target.value)}
              className="min-h-24 rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="Product description"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(event) => updateProductForm("price", Number(event.target.value))}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.cost ?? 0}
              onChange={(event) => updateProductForm("cost", Number(event.target.value))}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            SKU
            <input
              value={productForm.sku}
              onChange={(event) => updateProductForm("sku", event.target.value)}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="MAME-BP-DOZ"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Category
            <input
              value={productForm.category}
              onChange={(event) => updateProductForm("category", event.target.value)}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="Full Size"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground md:col-span-2">
            Variants (Size / Flavor)
            <input
              value={(productForm.variants ?? []).join(", ")}
              onChange={(event) =>
                updateProductForm(
                  "variants",
                  event.target.value
                    .split(",")
                    .map((variant) => variant.trim())
                    .filter(Boolean)
                )
              }
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              placeholder="Full Size, Beef & Pork"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Storefront Image
            <select
              value={productForm.imageKey}
              onChange={(event) => updateProductForm("imageKey", event.target.value)}
              className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
            >
              <option value="beef-pork">Beef & Pork</option>
              <option value="spicy">Spicy</option>
              <option value="turkey">Turkey</option>
              <option value="mini">Mini Pies</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            Images Upload
            <span className="flex items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3 py-2 font-normal text-muted-foreground">
              <Upload size={16} />
              <span className="truncate">{productForm.imageUploadName || "Choose image file"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => updateProductForm("imageUploadName", event.target.files?.[0]?.name ?? "")}
                className="sr-only"
              />
            </span>
          </label>
        </div>

        <div className="mt-6 border border-border bg-background p-4">
          <div className="flex flex-col gap-1">
            <h4 className="font-serif text-lg font-bold text-foreground">Inventory Linked</h4>
            <p className="text-sm text-muted-foreground">Stock and threshold feed the Inventory tab and dashboard alerts.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.stock}
                onChange={(event) => updateProductForm("stock", Number(event.target.value))}
                className="rounded-[8px] border border-border bg-card px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Threshold
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.inventoryThreshold ?? 10}
                onChange={(event) => updateProductForm("inventoryThreshold", Number(event.target.value))}
                className="rounded-[8px] border border-border bg-card px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Status
              <select
                value={productForm.status}
                onChange={(event) => updateProductForm("status", event.target.value as ProductStatus)}
                className="rounded-[8px] border border-border bg-card px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
              >
                <option value="active">Active</option>
                <option value="low_stock">Low Stock</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
        </div>

        {productNotice && <p className="mt-4 text-sm font-semibold text-cajun">{productNotice}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={productSaving || !fallbackKey}
            className="rounded-[8px] bg-cajun px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {productSaving ? "Saving..." : "Save Product"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProductId(null);
              setProductForm(emptyProductForm);
              setProductNotice(null);
            }}
            className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-serif text-xl font-bold text-foreground">Product List</h3>
        </div>
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Margin</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Edit</th>
            </tr>
          </thead>
          <tbody>
            {!fallbackKey ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={8}>
                  Unlock with the admin password to manage products.
                </td>
              </tr>
            ) : productResult === undefined ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={8}>
                  Loading products...
                </td>
              </tr>
            ) : visibleProducts.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={8}>
                  No products match that search.
                </td>
              </tr>
            ) : (
              visibleProducts.map((product) => (
                <tr key={product._id ?? product.productId} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-foreground">{product.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{product.sku}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(product.price)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatCurrency(product.cost ?? 0)}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatMargin(product.price, product.cost ?? 0)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{product.stock}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${
                        getInventoryStatus(product) === "Healthy"
                          ? "bg-green-100 text-green-800"
                          : getInventoryStatus(product) === "Low Stock"
                            ? "bg-red-100 text-red-800"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getInventoryStatus(product)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(product._id ?? null);
                        setProductNotice(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const inventoryPanel = (
    <div className="space-y-6">
      <div className="border border-border bg-card p-5">
        <h2 className="font-serif text-2xl font-bold text-foreground">Inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stock thresholds are linked to each product and highlighted when inventory runs low.
        </p>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Threshold</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!fallbackKey ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  Unlock with the admin password to review inventory.
                </td>
              </tr>
            ) : productResult === undefined ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  Loading inventory...
                </td>
              </tr>
            ) : visibleProducts.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  No inventory rows match that search.
                </td>
              </tr>
            ) : (
              visibleProducts.map((product) => {
                const status = getInventoryStatus(product);
                const isLowStock = status === "Low Stock";

                return (
                  <tr
                    key={product._id ?? product.productId}
                    className={`border-b border-border last:border-b-0 ${isLowStock ? "bg-red-50" : ""}`}
                  >
                    <td className="px-5 py-4 font-semibold text-foreground">{product.sku}</td>
                    <td className="px-5 py-4 text-foreground">{product.name}</td>
                    <td className={`px-5 py-4 font-semibold ${isLowStock ? "text-red-800" : "text-foreground"}`}>{product.stock}</td>
                    <td className="px-5 py-4 text-muted-foreground">{product.inventoryThreshold ?? 10}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${
                          isLowStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="border border-red-200 bg-red-50 p-5">
          <h3 className="font-serif text-xl font-bold text-red-900">Alerts: Highlight Low Stock</h3>
          <div className="mt-3 grid gap-2">
            {lowStockProducts.map((product) => (
              <button
                key={product._id ?? product.productId}
                type="button"
                onClick={() => {
                  setActivePage("products");
                  setSelectedProductId(product._id ?? null);
                }}
                className="flex flex-col gap-1 rounded-[8px] border border-red-200 bg-card p-3 text-left text-sm transition-colors hover:bg-red-100 md:flex-row md:items-center md:justify-between"
              >
                <span className="font-semibold text-red-900">{product.name}</span>
                <span className="text-red-800">
                  {product.stock} in stock, threshold {product.inventoryThreshold ?? 10}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const placeholderPanel = (title: string, description: string) => (
    <div className="border border-border bg-card p-6">
      <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );

  const renderPageContent = () => {
    if (activePage === "orders") {
      return ordersPanel;
    }

    if (activePage === "products") {
      return productsPanel;
    }

    if (activePage === "inventory") {
      return inventoryPanel;
    }

    if (activePage === "customers") {
      return customerDirectoryPanel;
    }

    if (activePage === "marketing") {
      return marketingPanel;
    }

    if (activePage === "reports") {
      return (
        <div className="space-y-6">
          {metricsPanel}
          {placeholderPanel("Reports", "High-level reports are ready for sales, customer, and message trends as more data comes in.")}
        </div>
      );
    }

    if (activePage !== "dashboard") {
      const item = adminNavItems.find((navItem) => navItem.id === activePage);
      return placeholderPanel(item?.label ?? "Admin Area", "This workspace is ready for the next set of tools.");
    }

    return (
      <div className="space-y-6">
        {dashboardOverviewPanel}
        {metricsPanel}
        {customerDatabasePanel}
        {inboxWorkspace}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="font-serif text-xl font-bold text-foreground">
              Mame's
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              {topNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  className={`rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
                    activePage === item.id ? "bg-cajun text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={15} />
              Website
            </Link>
            {(user || fallbackKey) && (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {user ? "Sign out" : "Lock portal"}
              </button>
            )}
          </div>
        </div>
      </header>

      {authLoading ? (
        <section className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-md border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Checking your WorkOS session...</p>
          </div>
        </section>
      ) : !user && !fallbackKey ? (
        <section className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-md space-y-5 border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-cajun/10 text-cajun">
              <Lock size={22} />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">Admin Portal</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sign in to manage messages, orders, customers, and operations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signIn({ screenHint: "sign-in" })}
              className="w-full rounded-[8px] bg-cajun px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
            >
              Sign in with WorkOS
            </button>
            <div className="border-t border-border pt-5">
              <p className="mb-3 text-sm font-semibold text-foreground">WorkOS not ready?</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  value={fallbackInput}
                  onChange={(event) => setFallbackInput(event.target.value)}
                  placeholder="Admin password"
                  className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                />
                <button
                  type="submit"
                  className="w-full rounded-[8px] border border-border px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Use admin password instead
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-border bg-card lg:border-b-0 lg:border-r">
            <div className="border-b border-border p-5">
              <p className="font-serif text-2xl font-bold text-foreground">Admin Portal</p>
              <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Mame's Cane River Meat Pies</p>
            </div>
            <nav className="grid gap-1 p-3">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    className={`flex items-center gap-3 rounded-[8px] px-3 py-3 text-left text-sm font-semibold transition-colors ${
                      activePage === item.id ? "bg-cajun text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-h-[calc(100vh-65px)] flex-col">
            <section className="flex-1 space-y-6 px-4 py-6 md:px-6 lg:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Dashboard</p>
                  <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                    {adminNavItems.find((item) => item.id === activePage)?.label ?? "Dashboard"}
                  </h1>
                </div>
                <div className="flex items-center gap-2 rounded-[8px] border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Search size={16} />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search admin data"
                    className="w-48 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {alertPanel}
              {renderPageContent()}
            </section>

            <footer className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
              <span>System Status: {isUnlocked ? "Online" : "Locked"}</span>
              <span>Last Sync: {latestActivityAt ? formatDate(latestActivityAt) : "Waiting for data"}</span>
              <span>User Logged In: {currentUserLabel}</span>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
};

const Admin = () => {
  if (!workosClientId) {
    return <AdminConfigurationMissing />;
  }

  return (
    <AuthKitProvider
      clientId={workosClientId}
      apiHostname={workosApiHostname}
      redirectUri={`${window.location.origin}/admin`}
      onRefreshFailure={({ signIn }) => {
        void signIn({ screenHint: "sign-in" });
      }}
    >
      <AdminPortal />
    </AuthKitProvider>
  );
};

export default Admin;
