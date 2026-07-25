import {
  ChangeEvent,
  Component,
  DragEvent,
  ErrorInfo,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  DollarSign,
  Download,
  Eye,
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
import { marketingAssetOptions, marketingAssetPublicPathMap } from "../../shared/marketingAssets";
import { PROMO_CODES } from "@/lib/promos";

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
  email?: string;
  phone: string;
  preferredContactMethod: "email" | "phone";
  salesperson?: string;
  notes?: string;
  paymentMethod: "stripe" | "email";
  status: "checkout_started" | "submitted";
  fulfillmentStatus?: "new" | "confirmed" | "in_kitchen" | "ready" | "completed" | "canceled";
  fulfillmentMethod?: "pickup" | "delivery" | "event" | "unknown";
  neededBy?: string;
  assignedTo?: string;
  internalNotes?: string;
  lastFulfillmentUpdateAt?: number;
  items: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal?: number;
  promoCode?: string;
  promoDiscount?: number;
  promoSource?: string;
  promoCampaign?: string;
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
      email?: string;
      phone: string;
      preferredContactMethod: "email" | "phone";
      salesperson?: string;
      preview: string;
      notes?: string;
      createdAt: number;
      paymentMethod: "stripe" | "email";
      status: "checkout_started" | "submitted";
      fulfillmentStatus?: Order["fulfillmentStatus"];
      fulfillmentMethod?: Order["fulfillmentMethod"];
      neededBy?: string;
      assignedTo?: string;
      internalNotes?: string;
      lastFulfillmentUpdateAt?: number;
      items: Order["items"];
      subtotal?: number;
      promoCode?: string;
      promoDiscount?: number;
      promoSource?: string;
      promoCampaign?: string;
      total: number;
    };

type Filter = "all" | "message" | "order" | "direct";
type SalesRange = "daily" | "weekly" | "monthly";
type ProductStatus = "active" | "draft" | "low_stock";
type MarketingDraftType = "product" | "event" | "promotion" | "testimonial" | "founder-story" | "weekly-update";
type MarketingPriority = "high" | "medium" | "low";
type MarketingApprovalStatus = "draft" | "ready" | "approved" | "scheduled";
type AdminPage =
  | "dashboard"
  | "orders"
  | "promos"
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

type PromoUsageRow = Extract<InboxItem, { type: "order" }> & {
  customerKey: string;
  promoCode: string;
  promoDiscount: number;
  subtotal: number;
  customerOrderCount: number;
  customerType: "new" | "returning";
};

type PromoSummaryRow = {
  code: string;
  label: string;
  channelHint?: string;
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  uses: number;
  remainingRedemptions?: number;
  uniqueCustomers: number;
  totalDiscount: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastUsedAt?: number;
  returningCustomerUses: number;
  newCustomerUses: number;
  completedOrders: number;
  canceledOrders: number;
  checkoutStarts: number;
  sourceBreakdown: string[];
  marginImpact: number;
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

type MarketingAssetUpload = {
  storageId: Id<"_storage">;
  fileName: string;
  contentType?: string;
  url?: string | null;
};

type MarketingDraft = {
  _id?: Id<"marketingDrafts">;
  title: string;
  type: MarketingDraftType;
  summary: string;
  facts: string;
  cta?: string;
  channels: string[];
  assetLinks?: string[];
  assetUploads?: MarketingAssetUpload[];
  priority: MarketingPriority;
  publishBy?: string;
  approvalStatus: MarketingApprovalStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

type GeneratedSocialDraft = {
  sourceId?: Id<"marketingDrafts">;
  title: string;
  channelLabel: string;
  caption: string;
  shortPost: string;
  hashtags: string[];
  assetHint: string;
};

type GeneratedWeeklyNote = {
  title: string;
  body: string;
  recapPost: string;
  followUps: string[];
};

type MarketingOutputStatus = "draft" | "approved" | "scheduled" | "posted";
type FulfillmentStatus = NonNullable<Order["fulfillmentStatus"]>;
type FulfillmentMethod = NonNullable<Order["fulfillmentMethod"]>;

type MarketingGenerationResult = {
  access: "granted" | "denied" | "missing";
  runLabel?: string;
  provider: string | null;
  generatedAt: number | null;
  socialDrafts: GeneratedSocialDraft[];
  weeklyNote: GeneratedWeeklyNote | null;
};

type SavedMarketingPack = {
  _id?: Id<"marketingGeneratedPacks">;
  runLabel: string;
  provider: string;
  generatedAt: number;
  sourceCount: number;
  socialDrafts: GeneratedSocialDraft[];
  weeklyNote: GeneratedWeeklyNote | null;
};

type MarketingOutput = {
  _id?: Id<"marketingOutputs">;
  packId?: Id<"marketingGeneratedPacks">;
  kind: "social" | "weekly-note";
  sourceDraftId?: Id<"marketingDrafts">;
  title: string;
  channelLabel: string;
  body: string;
  shortPost?: string;
  hashtags?: string[];
  assetHint: string;
  selectedAssets: string[];
  sourceType?: string;
  status: MarketingOutputStatus;
  publishAt?: string;
  publishedPlatforms?: Array<"instagram" | "facebook">;
  publishHistory?: Array<{
    platform: "instagram" | "facebook";
    externalId: string;
    publishedAt: number;
  }>;
  lastPublishError?: string;
  lastPublishAttemptAt?: number;
  provider: string;
  runLabel: string;
  createdAt: number;
  updatedAt: number;
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
  products: AdminProduct[];
  marketingDrafts: MarketingDraft[];
  marketingGeneratedPacks: SavedMarketingPack[];
  marketingOutputs: MarketingOutput[];
  analytics: AnalyticsSummary | null;
};

type FulfillmentForm = {
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentMethod: FulfillmentMethod;
  neededBy: string;
  assignedTo: string;
  internalNotes: string;
};

type AnalyticsSummary = {
  totalVisits: number;
  uniqueVisitorsToday: number;
  topPages: Array<{
    route: string;
    views: number;
  }>;
  sevenDayTrend: Array<{
    day: string;
    label: string;
    visits: number;
    uniqueVisitors: number;
  }>;
  recentActivity: Array<{
    route: string;
    referrer?: string;
    deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
    browser?: string;
    createdAt: number;
  }>;
};

const workosClientId = import.meta.env.VITE_WORKOS_CLIENT_ID as string | undefined;
const workosApiHostname = import.meta.env.VITE_WORKOS_API_HOSTNAME as string | undefined;
const ADMIN_KEY_STORAGE = "mames-admin-key";
const adminNavItems: Array<{ id: AdminPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "promos", label: "Promos", icon: Tag },
  { id: "products", label: "Products", icon: ShoppingBag },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "fulfillment", label: "Fulfillment", icon: Truck },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings },
];

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

const marketingTypeOptions: MarketingDraftType[] = [
  "product",
  "event",
  "promotion",
  "testimonial",
  "founder-story",
  "weekly-update",
];
const marketingPriorityOptions: MarketingPriority[] = ["high", "medium", "low"];
const marketingApprovalOptions: MarketingApprovalStatus[] = ["draft", "ready", "approved", "scheduled"];
const marketingChannelOptions = ["Instagram", "Facebook", "LinkedIn", "X", "Email", "Website Notes"];
const marketingAssetPreviewMap: Record<string, string> = {
  "src/assets/mini-pies-tray.png": new URL("../assets/mini-pies-tray.png", import.meta.url).href,
  "src/assets/product-mini.jpg": new URL("../assets/product-mini.jpg", import.meta.url).href,
  "src/assets/product-spicy.png": new URL("../assets/product-spicy.png", import.meta.url).href,
  "src/assets/product-beef-pork.jpg": new URL("../assets/product-beef-pork.jpg", import.meta.url).href,
  "src/assets/product-spicy.jpg": new URL("../assets/product-spicy.jpg", import.meta.url).href,
  "src/assets/product-turkey.png": new URL("../assets/product-turkey.png", import.meta.url).href,
  "src/assets/product-turkey.jpg": new URL("../assets/product-turkey.jpg", import.meta.url).href,
  "src/assets/hero-meat-pies.png": new URL("../assets/hero-meat-pies.png", import.meta.url).href,
  "src/assets/hero-meatpies.jpg": new URL("../assets/hero-meatpies.jpg", import.meta.url).href,
  "src/assets/mame-kitchen-1.jpg": new URL("../assets/mame-kitchen-1.jpg", import.meta.url).href,
  "src/assets/mame-kitchen-2.jpg": new URL("../assets/mame-kitchen-2.jpg", import.meta.url).href,
  "src/assets/mame-portrait-2026.jpg": new URL("../assets/mame-portrait-2026.jpg", import.meta.url).href,
  "src/assets/mame-portrait-2026 2.jpg": new URL("../assets/mame-portrait-2026 2.jpg", import.meta.url).href,
};
const marketingOutputStatusOptions: MarketingOutputStatus[] = ["draft", "approved", "scheduled", "posted"];
const fulfillmentStatusOptions: FulfillmentStatus[] = ["new", "confirmed", "in_kitchen", "ready", "completed", "canceled"];
const fulfillmentMethodOptions: FulfillmentMethod[] = ["pickup", "delivery", "event", "unknown"];
const emptyFulfillmentForm: FulfillmentForm = {
  fulfillmentStatus: "new",
  fulfillmentMethod: "unknown",
  neededBy: "",
  assignedTo: "",
  internalNotes: "",
};
const emptyMarketingDraftForm = {
  title: "",
  type: "weekly-update",
  summary: "",
  facts: "",
  cta: "",
  channels: ["Instagram", "Facebook", "Website Notes"],
  assetLinks: [],
  assetUploads: [],
  priority: "medium",
  publishBy: "",
  approvalStatus: "draft",
  notes: "",
} satisfies Omit<MarketingDraft, "_id" | "createdAt" | "updatedAt">;
const emptyMarketingOutputForm = {
  title: "",
  channelLabel: "Instagram / Facebook",
  body: "",
  shortPost: "",
  hashtags: [],
  assetHint: "",
  selectedAssets: [],
  status: "draft",
  publishAt: "",
} satisfies Omit<
  MarketingOutput,
  "_id" | "packId" | "kind" | "sourceType" | "provider" | "runLabel" | "createdAt" | "updatedAt"
>;

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

const formatLabel = (value: string) =>
  value
    .split(/[-\s]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatShortDate = (value?: string) => {
  if (!value) {
    return "Open";
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed)
    ? value
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(parsed);
};

const getPromoScheduleStatus = ({
  startsAt,
  endsAt,
  maxRedemptions,
  uses,
}: {
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  uses: number;
}) => {
  const now = Date.now();
  const startsAtTime = startsAt ? Date.parse(startsAt) : Number.NEGATIVE_INFINITY;
  const endsAtTime = endsAt ? Date.parse(endsAt) : Number.POSITIVE_INFINITY;

  if (startsAt && !Number.isNaN(startsAtTime) && now < startsAtTime) {
    return "scheduled";
  }

  if ((endsAt && !Number.isNaN(endsAtTime) && now > endsAtTime) || (maxRedemptions !== undefined && uses >= maxRedemptions)) {
    return "closed";
  }

  return "active";
};

const getCustomerLookupKey = ({
  customerName,
  email,
  phone,
}: {
  customerName: string;
  email?: string;
  phone?: string;
}) => {
  const emailKey = (email ?? "").trim().toLowerCase();
  const phoneKey = (phone ?? "").replace(/\D/g, "");
  return emailKey || phoneKey || customerName.trim().toLowerCase();
};

const getOrderFulfillmentStatus = (order: Pick<Order, "fulfillmentStatus"> | Pick<Extract<InboxItem, { type: "order" }>, "fulfillmentStatus">) =>
  order.fulfillmentStatus ?? "new";

const getOrderFulfillmentMethod = (order: Pick<Order, "fulfillmentMethod"> | Pick<Extract<InboxItem, { type: "order" }>, "fulfillmentMethod">) =>
  order.fulfillmentMethod ?? "unknown";

const getFulfillmentStatusTone = (status: FulfillmentStatus) => {
  if (status === "completed") {
    return "bg-green-100 text-green-800";
  }

  if (status === "ready") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "in_kitchen") {
    return "bg-amber-100 text-amber-900";
  }

  if (status === "canceled") {
    return "bg-slate-200 text-slate-700";
  }

  if (status === "confirmed") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-red-100 text-red-800";
};

const getFulfillmentStatusDescription = (status: FulfillmentStatus) => {
  if (status === "new") {
    return "Needs confirmation and a plan.";
  }

  if (status === "confirmed") {
    return "Confirmed with the customer and scheduled.";
  }

  if (status === "in_kitchen") {
    return "Actively being prepared.";
  }

  if (status === "ready") {
    return "Ready for pickup, delivery, or event handoff.";
  }

  if (status === "completed") {
    return "Finished and delivered to the customer.";
  }

  return "Canceled or no longer moving forward.";
};

const formatAssetLabel = (value: string) => {
  const segments = value.trim().split("/");
  return segments[segments.length - 1] || value;
};

const getAssetHref = (value: string) =>
  /^https?:\/\//i.test(value) ? value : marketingAssetPublicPathMap[value] ?? `/${value}`;
const getAssetPreviewUrl = (value: string) => marketingAssetPreviewMap[value] ?? getAssetHref(value);

const normalizeMarketingTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const getDraftAssetItems = (draft?: Pick<MarketingDraft, "assetLinks" | "assetUploads"> | null) => {
  if (!draft) {
    return [];
  }

  const uploadedAssets = (draft.assetUploads ?? [])
    .filter((asset) => asset.url)
    .map((asset) => ({
      key: asset.storageId,
      href: asset.url ?? "",
      label: asset.fileName,
      kind: "uploaded" as const,
    }));

  const linkedAssets = (draft.assetLinks ?? []).map((asset) => ({
    key: asset,
    href: getAssetHref(asset),
    label: formatAssetLabel(asset),
    kind: "linked" as const,
  }));

  return [...uploadedAssets, ...linkedAssets];
};

const getUploadSelectionValue = (storageId: Id<"_storage">) => `upload:${storageId}`;

type MarketingAssetChoice = {
  value: string;
  label: string;
  href: string;
  previewUrl: string;
  source: "uploaded" | "library";
};

const getPriorityWeight = (priority: MarketingPriority) => {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
};

const summarizeFacts = (facts: string) =>
  facts
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

const buildHashtags = (draft: MarketingDraft) => {
  const baseTags = ["MamesMeatPies", "CaneRiver", "SouthernFlavor"];
  const typeTag = formatLabel(draft.type).replace(/\s+/g, "");
  const channelTags = draft.channels
    .slice(0, 2)
    .map((channel) => channel.replace(/\s+/g, ""))
    .filter((channel) => channel !== "WebsiteNotes");

  return Array.from(new Set([...baseTags, typeTag, ...channelTags])).slice(0, 5);
};

const buildSocialCaption = (draft: MarketingDraft) => {
  const facts = summarizeFacts(draft.facts);
  const lead =
    draft.type === "event"
      ? `We're bringing Mame's Meat Pies on the road with ${draft.title.toLowerCase()}.`
      : draft.type === "promotion"
        ? `${draft.title} is ready to share with folks who love bold Southern flavor.`
        : draft.type === "weekly-update"
          ? `This week at Mame's Meat Pies: ${draft.title.toLowerCase()}.`
          : `${draft.title} brings another taste of Mame's kitchen to the table.`;

  return [lead, draft.summary, facts.join(" "), draft.cta].filter(Boolean).join(" ");
};

const buildShortPost = (draft: MarketingDraft) => {
  const fact = summarizeFacts(draft.facts)[0];
  return [draft.title, fact, draft.cta].filter(Boolean).join(" • ");
};

const buildWeeklyNote = (drafts: MarketingDraft[]): GeneratedWeeklyNote | null => {
  if (drafts.length === 0) {
    return null;
  }

  const weeklyUpdate = drafts.find((draft) => draft.type === "weekly-update") ?? drafts[0];
  const highlights = drafts.slice(0, 3);
  const bodySections = [
    `${weeklyUpdate.title} kept the week rooted in Mame's story and the flavor people know us for.`,
    ...highlights.map((draft) => `- ${draft.summary}${draft.cta ? ` ${draft.cta}` : ""}`),
    "We're keeping the momentum going with handcrafted pies, warm hospitality, and more stories worth sharing next week.",
  ];

  return {
    title: `Weekly Notes: ${weeklyUpdate.title}`,
    body: bodySections.join("\n\n"),
    recapPost: `This week at Mame's Meat Pies: ${highlights.map((draft) => draft.title).join(", ")}.`,
    followUps: highlights.map((draft) => `Turn "${draft.title}" into a follow-up post for ${draft.channels[0] ?? "social"}.`),
  };
};

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

type AdminPortalAuthProps = {
  getAccessToken: () => Promise<string>;
  authLoading: boolean;
  signIn: (options?: { screenHint?: string }) => Promise<void> | void;
  signOut: (options?: { returnTo?: string }) => Promise<void> | void;
  user:
    | {
        email?: string | null;
      }
    | null;
};

const AdminPortalContent = ({ getAccessToken, authLoading, signIn, signOut, user }: AdminPortalAuthProps) => {
  const getInboxForAdmin = useAction(api.admin.getInboxForAdmin);
  const createProduct = useMutation(api.products.createForAdmin);
  const seedDefaultProducts = useMutation(api.products.seedDefaultsForAdmin);
  const updateProduct = useMutation(api.products.updateForAdmin);
  const updateOrderFulfillment = useMutation(api.orders.updateFulfillmentForAdmin);
  const createMarketingDraft = useMutation(api.marketingDrafts.createForAdmin);
  const generateMarketingDraftUploadUrl = useMutation(api.marketingDrafts.generateUploadUrlForAdmin);
  const updateMarketingDraft = useMutation(api.marketingDrafts.updateForAdmin);
  const updateMarketingOutput = useMutation(api.marketingOutputs.updateForAdmin);
  const seedSampleMarketingQueue = useMutation(api.marketingGenerator.seedSampleQueueForAdmin);
  const importBellPhotoPromo = useMutation(api.marketingGenerator.importBellPhotoPromoForAdmin);
  const generateMarketingPack = useAction(api.marketingGenerator.generateForAdmin);
  const requestMarketingApproval = useAction(api.marketingPublisher.requestApprovalForAdmin);
  const [adminResult, setAdminResult] = useState<AdminInboxResult | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [fallbackInput, setFallbackInput] = useState(getStoredAdminKey);
  const [fallbackKey, setFallbackKey] = useState(getStoredAdminKey);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [promoSearch, setPromoSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<AdminPage>("dashboard");
  const [salesRange, setSalesRange] = useState<SalesRange>("daily");
  const [selectedFulfillmentOrderId, setSelectedFulfillmentOrderId] = useState<string | null>(null);
  const [fulfillmentForm, setFulfillmentForm] = useState<FulfillmentForm>(emptyFulfillmentForm);
  const [fulfillmentSaving, setFulfillmentSaving] = useState(false);
  const [fulfillmentNotice, setFulfillmentNotice] = useState<string | null>(null);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<AdminProduct>(emptyProductForm);
  const [productSaving, setProductSaving] = useState(false);
  const [productNotice, setProductNotice] = useState<string | null>(null);
  const [selectedMarketingDraftId, setSelectedMarketingDraftId] = useState<string | null>(null);
  const [marketingDraftForm, setMarketingDraftForm] =
    useState<Omit<MarketingDraft, "_id" | "createdAt" | "updatedAt">>(emptyMarketingDraftForm);
  const [marketingDraftSaving, setMarketingDraftSaving] = useState(false);
  const [marketingDraftNotice, setMarketingDraftNotice] = useState<string | null>(null);
  const [marketingAssetUploading, setMarketingAssetUploading] = useState(false);
  const [marketingAssetDragActive, setMarketingAssetDragActive] = useState(false);
  const [marketingReviewAssetUploading, setMarketingReviewAssetUploading] = useState(false);
  const [marketingReviewAssetDragActive, setMarketingReviewAssetDragActive] = useState(false);
  const [selectedMarketingOutputId, setSelectedMarketingOutputId] = useState<string | null>(null);
  const [shouldAutoSelectLatestOutput, setShouldAutoSelectLatestOutput] = useState(false);
  const [marketingOutputForm, setMarketingOutputForm] =
    useState<Omit<MarketingOutput, "_id" | "packId" | "kind" | "sourceType" | "provider" | "runLabel" | "createdAt" | "updatedAt">>(
      emptyMarketingOutputForm
    );
  const [marketingOutputSaving, setMarketingOutputSaving] = useState(false);
  const [marketingOutputPublishing, setMarketingOutputPublishing] = useState(false);
  const [marketingOutputNotice, setMarketingOutputNotice] = useState<string | null>(null);
  const [marketingGeneration, setMarketingGeneration] = useState<MarketingGenerationResult | null>(null);
  const [marketingGenerationLoading, setMarketingGenerationLoading] = useState(false);
  const marketingAssetInputRef = useRef<HTMLInputElement | null>(null);
  const marketingReviewAssetInputRef = useRef<HTMLInputElement | null>(null);

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
  const marketingDraftResult = useQuery(
    api.marketingDrafts.listForAdmin,
    fallbackKey ? { adminKey: fallbackKey, limit: 250 } : "skip"
  );
  const marketingOutputResult = useQuery(
    api.marketingOutputs.listForAdmin,
    fallbackKey ? { adminKey: fallbackKey, limit: 250 } : "skip"
  );
  const marketingPackResult = useQuery(
    api.marketingGenerator.listGeneratedPacksForAdmin,
    fallbackKey ? { adminKey: fallbackKey, limit: 20 } : "skip"
  );
  const passwordAnalyticsResult = useQuery(
    api.analytics.summaryForAdmin,
    fallbackKey ? { adminKey: fallbackKey } : "skip"
  );

  const passwordAccess =
    passwordContactResult?.access ??
    passwordDirectResult?.access ??
    passwordOrderResult?.access ??
    productResult?.access ??
    marketingDraftResult?.access ??
    marketingOutputResult?.access ??
    marketingPackResult?.access ??
    passwordAnalyticsResult?.access;
  const access = adminResult?.access ?? passwordAccess;
  const isLoading =
    authLoading ||
    inboxLoading ||
    Boolean(
      fallbackKey && (!passwordContactResult || !passwordDirectResult || !passwordOrderResult || !productResult || !passwordAnalyticsResult)
    );
  const isUnlocked = access === "granted";
  const isUsingPassword = Boolean(fallbackKey);
  const showPasswordFallback = !isUsingPassword && (!isUnlocked || Boolean(inboxError));

  useEffect(() => {
    if (!fallbackKey || productResult?.access !== "granted") {
      return;
    }

    void seedDefaultProducts({ adminKey: fallbackKey });
  }, [fallbackKey, productResult?.access, seedDefaultProducts]);

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
    } finally {
      setInboxLoading(false);
    }
  }, [getAccessToken, getInboxForAdmin, user]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!fallbackKey) {
      return;
    }

    void seedDefaultProducts({ adminKey: fallbackKey }).catch(() => undefined);
  }, [fallbackKey, seedDefaultProducts]);

  useEffect(() => {
    const productRows = isUsingPassword ? productResult?.products : adminResult?.products;
    const selectedProduct = productRows?.find((product: AdminProduct) => product._id === selectedProductId);

    setProductForm(selectedProduct ?? emptyProductForm);
  }, [adminResult?.products, isUsingPassword, productResult?.products, selectedProductId]);

  useEffect(() => {
    const draftRows = ((isUsingPassword ? marketingDraftResult?.drafts : adminResult?.marketingDrafts) ?? []) as MarketingDraft[];
    const selectedDraft = draftRows.find((draft) => draft._id === selectedMarketingDraftId);

    if (selectedDraft) {
      setMarketingDraftForm({
        title: selectedDraft.title,
        type: selectedDraft.type,
        summary: selectedDraft.summary,
        facts: selectedDraft.facts,
        cta: selectedDraft.cta ?? "",
        channels: selectedDraft.channels,
        assetLinks: selectedDraft.assetLinks ?? [],
        assetUploads: selectedDraft.assetUploads ?? [],
        priority: selectedDraft.priority,
        publishBy: selectedDraft.publishBy ?? "",
        approvalStatus: selectedDraft.approvalStatus,
        notes: selectedDraft.notes ?? "",
      });
      return;
    }

    setMarketingDraftForm(emptyMarketingDraftForm);
  }, [adminResult?.marketingDrafts, isUsingPassword, marketingDraftResult?.drafts, selectedMarketingDraftId]);

  useEffect(() => {
    const outputRows = ((isUsingPassword ? marketingOutputResult?.outputs : adminResult?.marketingOutputs) ?? []) as MarketingOutput[];
    const selectedOutput = outputRows.find((output) => output._id === selectedMarketingOutputId);

    if (selectedOutput) {
      setMarketingOutputForm({
        title: selectedOutput.title,
        channelLabel: selectedOutput.channelLabel,
        body: selectedOutput.body,
        shortPost: selectedOutput.shortPost ?? "",
        hashtags: selectedOutput.hashtags ?? [],
        assetHint: selectedOutput.assetHint,
        selectedAssets: selectedOutput.selectedAssets,
        status: selectedOutput.status,
        publishAt: selectedOutput.publishAt ?? "",
      });
      return;
    }

    setMarketingOutputForm(emptyMarketingOutputForm);
  }, [adminResult?.marketingOutputs, isUsingPassword, marketingOutputResult?.outputs, selectedMarketingOutputId]);

  useEffect(() => {
    const outputRows = ((isUsingPassword ? marketingOutputResult?.outputs : adminResult?.marketingOutputs) ?? []) as MarketingOutput[];

    if (!shouldAutoSelectLatestOutput || outputRows.length === 0) {
      return;
    }

    setSelectedMarketingOutputId(outputRows[0]?._id ?? null);
    setShouldAutoSelectLatestOutput(false);
  }, [adminResult?.marketingOutputs, isUsingPassword, marketingOutputResult?.outputs, shouldAutoSelectLatestOutput]);

  useEffect(() => {
    if (!isUsingPassword || passwordAccess !== "denied") {
      return;
    }

    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setFallbackInput("");
    setFallbackKey("");
    setSelectedId(null);
    setSelectedProductId(null);
    setSelectedMarketingDraftId(null);
    setSelectedMarketingOutputId(null);
    setProductNotice("Enter the current admin password to view inventory levels.");
  }, [isUsingPassword, passwordAccess]);

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
        preferredContactMethod: order.preferredContactMethod,
        salesperson: order.salesperson,
        preview: order.notes || `${order.items.length} item${order.items.length === 1 ? "" : "s"}`,
        notes: order.notes,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        fulfillmentMethod: order.fulfillmentMethod,
        neededBy: order.neededBy,
        assignedTo: order.assignedTo,
        internalNotes: order.internalNotes,
        lastFulfillmentUpdateAt: order.lastFulfillmentUpdateAt,
        items: order.items,
        subtotal: order.subtotal,
        promoCode: order.promoCode,
        promoDiscount: order.promoDiscount,
        promoSource: order.promoSource,
        promoCampaign: order.promoCampaign,
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
      const key = getCustomerLookupKey(item);
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
      const key = getCustomerLookupKey(item);
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
  const orderItems = inboxItems.filter((item): item is Extract<InboxItem, { type: "order" }> => item.type === "order");
  const adminProductRows = useMemo(
    () => ((isUsingPassword ? productResult?.products : adminResult?.products) ?? []) as AdminProduct[],
    [adminResult?.products, isUsingPassword, productResult?.products]
  );
  const promoUsageRows = useMemo<PromoUsageRow[]>(() => {
    const orderCountsByCustomer = new Map<string, number>();

    for (const order of orderItems) {
      const customerKey = getCustomerLookupKey(order);
      orderCountsByCustomer.set(customerKey, (orderCountsByCustomer.get(customerKey) ?? 0) + 1);
    }

    return orderItems
      .filter((order): order is Extract<InboxItem, { type: "order" }> & { promoCode: string; promoDiscount: number } =>
        Boolean(order.promoCode) && (order.promoDiscount ?? 0) > 0
      )
      .map((order) => {
        const customerKey = getCustomerLookupKey(order);
        const customerOrderCount = orderCountsByCustomer.get(customerKey) ?? 1;
        return {
          ...order,
          customerKey,
          promoCode: order.promoCode,
          promoDiscount: order.promoDiscount,
          subtotal: order.subtotal ?? order.total + order.promoDiscount,
          customerOrderCount,
          customerType: customerOrderCount > 1 ? "returning" : "new",
        };
      });
  }, [orderItems]);
  const promoSummaryRows = useMemo<PromoSummaryRow[]>(() => {
    const configuredPromos = new Map(PROMO_CODES.map((promo) => [promo.code, promo]));
    const productCostsById = new Map(adminProductRows.map((product) => [product.productId, product.cost ?? 0]));
    const summaryByCode = new Map<string, PromoSummaryRow>();

    for (const promo of PROMO_CODES) {
      summaryByCode.set(promo.code, {
        code: promo.code,
        label: promo.label,
        channelHint: promo.channelHint,
        startsAt: promo.startsAt,
        endsAt: promo.endsAt,
        maxRedemptions: promo.maxRedemptions,
        uses: 0,
        remainingRedemptions: promo.maxRedemptions,
        uniqueCustomers: 0,
        totalDiscount: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        returningCustomerUses: 0,
        newCustomerUses: 0,
        completedOrders: 0,
        canceledOrders: 0,
        checkoutStarts: 0,
        sourceBreakdown: [],
        marginImpact: 0,
      });
    }

    const uniqueCustomersByCode = new Map<string, Set<string>>();
    const sourceBreakdownByCode = new Map<string, Map<string, number>>();

    for (const usage of promoUsageRows) {
      const configuredPromo = configuredPromos.get(usage.promoCode);
      const existing = summaryByCode.get(usage.promoCode) ?? {
        code: usage.promoCode,
        label: configuredPromo?.label ?? usage.promoCode,
        channelHint: configuredPromo?.channelHint,
        startsAt: configuredPromo?.startsAt,
        endsAt: configuredPromo?.endsAt,
        maxRedemptions: configuredPromo?.maxRedemptions,
        uses: 0,
        remainingRedemptions: configuredPromo?.maxRedemptions,
        uniqueCustomers: 0,
        totalDiscount: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        returningCustomerUses: 0,
        newCustomerUses: 0,
        completedOrders: 0,
        canceledOrders: 0,
        checkoutStarts: 0,
        sourceBreakdown: [],
        marginImpact: 0,
      };

      existing.uses += 1;
      existing.totalDiscount += usage.promoDiscount;
      existing.totalRevenue += usage.total;
      existing.lastUsedAt = Math.max(existing.lastUsedAt ?? 0, usage.createdAt);
      existing.returningCustomerUses += usage.customerType === "returning" ? 1 : 0;
      existing.newCustomerUses += usage.customerType === "new" ? 1 : 0;
      existing.completedOrders += getOrderFulfillmentStatus(usage) === "completed" ? 1 : 0;
      existing.canceledOrders += getOrderFulfillmentStatus(usage) === "canceled" ? 1 : 0;
      existing.checkoutStarts += usage.status === "checkout_started" ? 1 : 0;

      const estimatedCost = usage.items.reduce(
        (sum, item) => sum + (productCostsById.get(item.productId) ?? 0) * item.quantity,
        0
      );
      existing.marginImpact += usage.total - estimatedCost;
      summaryByCode.set(usage.promoCode, existing);

      const uniqueCustomers = uniqueCustomersByCode.get(usage.promoCode) ?? new Set<string>();
      uniqueCustomers.add(usage.customerKey);
      uniqueCustomersByCode.set(usage.promoCode, uniqueCustomers);

      const sourceLabel = usage.promoSource?.trim() || usage.promoCampaign?.trim() || "direct";
      const sourceBreakdown = sourceBreakdownByCode.get(usage.promoCode) ?? new Map<string, number>();
      sourceBreakdown.set(sourceLabel, (sourceBreakdown.get(sourceLabel) ?? 0) + 1);
      sourceBreakdownByCode.set(usage.promoCode, sourceBreakdown);
    }

    return Array.from(summaryByCode.values())
      .map((summary) => ({
        ...summary,
        uniqueCustomers: uniqueCustomersByCode.get(summary.code)?.size ?? 0,
        averageOrderValue: summary.uses > 0 ? summary.totalRevenue / summary.uses : 0,
        remainingRedemptions:
          summary.maxRedemptions === undefined ? undefined : Math.max(summary.maxRedemptions - summary.uses, 0),
        sourceBreakdown: Array.from(sourceBreakdownByCode.get(summary.code)?.entries() ?? [])
          .sort((a, b) => b[1] - a[1])
          .map(([source, count]) => `${source} (${count})`),
      }))
      .sort((a, b) => {
        if (b.uses !== a.uses) {
          return b.uses - a.uses;
        }

        return a.code.localeCompare(b.code);
      });
  }, [adminProductRows, promoUsageRows]);
  const visiblePromoUsageRows = useMemo(() => {
    const normalizedSearch = promoSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return promoUsageRows;
    }

    return promoUsageRows.filter((usage) =>
      [
        usage.customerName,
        usage.email,
        usage.phone,
        usage.promoCode,
        usage.promoSource,
        usage.promoCampaign,
        usage.paymentMethod,
        usage.salesperson,
        usage.items.map((item) => item.name).join(" "),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [promoSearch, promoUsageRows]);
  const visiblePromoSummaryRows = useMemo(() => {
    const normalizedSearch = promoSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return promoSummaryRows;
    }

    return promoSummaryRows.filter((summary) =>
      [summary.code, summary.label, summary.channelHint].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [promoSearch, promoSummaryRows]);
  const promoDiscountTotal = promoUsageRows.reduce((sum, usage) => sum + usage.promoDiscount, 0);
  const promoRevenueTotal = promoUsageRows.reduce((sum, usage) => sum + usage.total, 0);
  const promoReturningUseCount = promoUsageRows.filter((usage) => usage.customerType === "returning").length;
  const fulfillmentOrders = useMemo(
    () =>
      [...orderItems].sort((a, b) => {
        const aNeededBy = a.neededBy ? Date.parse(a.neededBy) : Number.POSITIVE_INFINITY;
        const bNeededBy = b.neededBy ? Date.parse(b.neededBy) : Number.POSITIVE_INFINITY;

        if (aNeededBy !== bNeededBy) {
          return aNeededBy - bNeededBy;
        }

        return b.createdAt - a.createdAt;
      }),
    [orderItems]
  );
  const selectedFulfillmentOrder =
    fulfillmentOrders.find((order) => order.id === selectedFulfillmentOrderId) ?? fulfillmentOrders[0] ?? null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrderItems = orderItems.filter((item) => item.createdAt >= todayStart.getTime());
  const todayRevenue = todayOrderItems.reduce((sum, item) => sum + item.total, 0);
  const conversionRate = inboxItems.length > 0 ? Math.round((orderCount / inboxItems.length) * 100) : 0;
  const recentOrders = orderItems.slice(0, 5);
  const lowStockProducts = adminProductRows.filter(
    (product) => product.status === "low_stock" || product.stock <= (product.inventoryThreshold ?? 10)
  );
  const lowStockAlerts = lowStockProducts.length;
  const marketingDraftRows = useMemo(
    () => ((isUsingPassword ? marketingDraftResult?.drafts : adminResult?.marketingDrafts) ?? []) as MarketingDraft[],
    [adminResult?.marketingDrafts, isUsingPassword, marketingDraftResult?.drafts]
  );
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
  const selectedMarketingDraft = marketingDraftRows.find((draft) => draft._id === selectedMarketingDraftId);
  const marketingCounts = useMemo(
    () => ({
      total: marketingDraftRows.length,
      weeklyNotes: marketingDraftRows.filter((draft) => draft.type === "weekly-update").length,
      readyToReview: marketingDraftRows.filter((draft) => draft.approvalStatus === "ready").length,
      scheduled: marketingDraftRows.filter((draft) => draft.approvalStatus === "scheduled").length,
    }),
    [marketingDraftRows]
  );
  const draftGeneratorSource = useMemo(
    () =>
      marketingDraftRows
        .filter((draft) => draft.approvalStatus !== "draft")
        .sort((a, b) => {
          const priorityDelta = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return b.updatedAt - a.updatedAt;
        }),
    [marketingDraftRows]
  );
  const generatedSocialDrafts = useMemo<GeneratedSocialDraft[]>(
    () =>
      draftGeneratorSource
        .filter((draft) => draft.type !== "weekly-update")
        .slice(0, 3)
        .map((draft) => ({
          sourceId: draft._id,
          title: draft.title,
          channelLabel: draft.channels.slice(0, 2).join(" / ") || "Social",
          caption: buildSocialCaption(draft),
          shortPost: buildShortPost(draft),
          hashtags: buildHashtags(draft),
          assetHint:
            (draft.assetLinks && draft.assetLinks.length > 0) || (draft.assetUploads && draft.assetUploads.length > 0)
              ? "Use the linked asset first, then pull from the full photo library to round out the promotion."
              : "Use all available photos in the library and match the strongest product, tray, hero, or Mame image to the post.",
        })),
    [draftGeneratorSource]
  );
  const generatedWeeklyNote = useMemo(() => buildWeeklyNote(draftGeneratorSource.slice(0, 4)), [draftGeneratorSource]);
  const savedMarketingPacks = useMemo(
    () =>
      ((isUsingPassword ? marketingPackResult?.packs : adminResult?.marketingGeneratedPacks) ?? []) as SavedMarketingPack[],
    [adminResult?.marketingGeneratedPacks, isUsingPassword, marketingPackResult?.packs]
  );
  const marketingOutputs = useMemo(
    () => ((isUsingPassword ? marketingOutputResult?.outputs : adminResult?.marketingOutputs) ?? []) as MarketingOutput[],
    [adminResult?.marketingOutputs, isUsingPassword, marketingOutputResult?.outputs]
  );
  const displayedSocialDrafts = marketingGeneration?.socialDrafts ?? generatedSocialDrafts;
  const displayedWeeklyNote = marketingGeneration?.weeklyNote ?? generatedWeeklyNote;
  const generationProviderLabel = marketingGeneration?.provider ?? "preview";
  const selectedMarketingOutput = marketingOutputs.find((output) => output._id === selectedMarketingOutputId) ?? null;
  const selectedMarketingOutputSourceDraft = useMemo(() => {
    if (!selectedMarketingOutput) {
      return null;
    }

    if (selectedMarketingOutput.sourceDraftId) {
      return marketingDraftRows.find((draft) => draft._id === selectedMarketingOutput.sourceDraftId) ?? null;
    }

    const outputTitle = normalizeMarketingTitle(selectedMarketingOutput.title);
    const titleMatch =
      marketingDraftRows.find((draft) => normalizeMarketingTitle(draft.title) === outputTitle) ??
      marketingDraftRows.find((draft) => normalizeMarketingTitle(`Weekly Notes: ${draft.title}`) === outputTitle);

    if (titleMatch) {
      return titleMatch;
    }

    return (
      marketingDraftRows.find(
        (draft) =>
          draft.type === selectedMarketingOutput.sourceType &&
          (draft.title === selectedMarketingOutput.title || `Weekly Notes: ${draft.title}` === selectedMarketingOutput.title)
      ) ?? null
    );
  }, [marketingDraftRows, selectedMarketingOutput]);
  const selectedMarketingOutputLinkedAssets = getDraftAssetItems(selectedMarketingOutputSourceDraft);
  const selectedMarketingAssetChoices = useMemo<MarketingAssetChoice[]>(() => {
    const uploadedChoices =
      selectedMarketingOutputSourceDraft?.assetUploads
        ?.filter((asset) => asset.url)
        .map((asset) => ({
          value: getUploadSelectionValue(asset.storageId),
          label: asset.fileName,
          href: asset.url ?? "",
          previewUrl: asset.url ?? "",
          source: "uploaded" as const,
        })) ?? [];

    const libraryChoices = marketingAssetOptions.map((asset) => ({
      value: asset,
      label: formatAssetLabel(asset),
      href: getAssetHref(asset),
      previewUrl: getAssetPreviewUrl(asset),
      source: "library" as const,
    }));

    return [...uploadedChoices, ...libraryChoices];
  }, [selectedMarketingOutputSourceDraft]);
  const selectedMarketingAssetChoiceMap = useMemo(
    () => new Map(selectedMarketingAssetChoices.map((asset) => [asset.value, asset])),
    [selectedMarketingAssetChoices]
  );
  const unresolvedSelectedMarketingAssets = useMemo(
    () => marketingOutputForm.selectedAssets.filter((asset) => !selectedMarketingAssetChoiceMap.has(asset)),
    [marketingOutputForm.selectedAssets, selectedMarketingAssetChoiceMap]
  );
  const dashboardAlerts = [
    {
      title: "Low inventory: Meat Pies",
      detail:
        lowStockAlerts > 0
          ? `${lowStockAlerts} product${lowStockAlerts === 1 ? "" : "s"} need inventory attention.`
          : "Inventory counts are healthy.",
    },
    {
      title: "Fulfillment queue",
      detail:
        fulfillmentDueSoon > 0
          ? `${fulfillmentDueSoon} order${fulfillmentDueSoon === 1 ? "" : "s"} need attention in the next 48 hours.`
          : "No urgent fulfillment deadlines right now.",
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
  const analyticsSummary = (isUsingPassword ? passwordAnalyticsResult?.summary : adminResult?.analytics) ?? null;
  const maxAnalyticsTrend = Math.max(...(analyticsSummary?.sevenDayTrend.map((bucket) => bucket.visits) ?? [0]), 1);

  useEffect(() => {
    if (!selectedFulfillmentOrder) {
      setFulfillmentForm(emptyFulfillmentForm);
      return;
    }

    setFulfillmentForm({
      fulfillmentStatus: getOrderFulfillmentStatus(selectedFulfillmentOrder),
      fulfillmentMethod: getOrderFulfillmentMethod(selectedFulfillmentOrder),
      neededBy: selectedFulfillmentOrder.neededBy ?? "",
      assignedTo: selectedFulfillmentOrder.assignedTo ?? "",
      internalNotes: selectedFulfillmentOrder.internalNotes ?? "",
    });
  }, [selectedFulfillmentOrder]);

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

  const handleDownloadPromoSummary = (summaryRows: PromoSummaryRow[]) => {
    downloadCsv(
      `mames-promo-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      summaryRows.map((summary) => ({
        Code: summary.code,
        Label: summary.label,
        Channel: summary.channelHint ?? "Not set",
        "Start Date": summary.startsAt ?? "Open",
        "End Date": summary.endsAt ?? "Open",
        "Max Redemptions": summary.maxRedemptions ?? "Unlimited",
        "Remaining Redemptions": summary.remainingRedemptions ?? "Unlimited",
        Uses: summary.uses,
        "Unique Customers": summary.uniqueCustomers,
        "Returning Customer Uses": summary.returningCustomerUses,
        "New Customer Uses": summary.newCustomerUses,
        "Completed Orders": summary.completedOrders,
        "Canceled Orders": summary.canceledOrders,
        "Checkout Starts": summary.checkoutStarts,
        "Total Discount": summary.totalDiscount.toFixed(2),
        "Total Revenue": summary.totalRevenue.toFixed(2),
        "Average Order Value": summary.averageOrderValue.toFixed(2),
        "Estimated Margin Impact": summary.marginImpact.toFixed(2),
        Sources: summary.sourceBreakdown.join(" | ") || "None yet",
        "Last Used": summary.lastUsedAt ? formatDate(summary.lastUsedAt) : "Never used",
      }))
    );
  };

  const handleDownloadPromoUsage = (usageRows: PromoUsageRow[]) => {
    downloadCsv(
      `mames-promo-usage-${new Date().toISOString().slice(0, 10)}.csv`,
      usageRows.map((usage) => ({
        Code: usage.promoCode,
        Customer: usage.customerName,
        Email: usage.email ?? "Not provided",
        Phone: usage.phone,
        "Date / Time": formatDate(usage.createdAt),
        Source: usage.promoSource ?? "Not provided",
        Campaign: usage.promoCampaign ?? "Not provided",
        Discount: usage.promoDiscount.toFixed(2),
        Subtotal: usage.subtotal.toFixed(2),
        Total: usage.total.toFixed(2),
        Payment: usage.paymentMethod === "stripe" ? "Stripe" : "Email",
        Status: usage.status === "submitted" ? "Submitted" : "Checkout started",
        "Customer Type": usage.customerType,
        "Order Count": usage.customerOrderCount,
        Salesperson: usage.salesperson ?? "",
        Items: usage.items.map((item) => `${item.name} x${item.quantity}`).join(" | "),
      }))
    );
  };

  const updateProductForm = (field: keyof AdminProduct, value: string | number | string[]) => {
    setProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateFulfillmentForm = (field: keyof FulfillmentForm, value: string) => {
    setFulfillmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleFulfillmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFulfillmentNotice(null);

    if (!fallbackKey) {
      setFulfillmentNotice("Unlock with the admin password before updating fulfillment.");
      return;
    }

    if (!selectedFulfillmentOrder?.id) {
      setFulfillmentNotice("Select an order to update.");
      return;
    }

    setFulfillmentSaving(true);

    try {
      const result = await updateOrderFulfillment({
        adminKey: fallbackKey,
        id: selectedFulfillmentOrder.id as Id<"orders">,
        fulfillmentStatus: fulfillmentForm.fulfillmentStatus,
        fulfillmentMethod: fulfillmentForm.fulfillmentMethod,
        neededBy: fulfillmentForm.neededBy.trim() || undefined,
        assignedTo: fulfillmentForm.assignedTo.trim() || undefined,
        internalNotes: fulfillmentForm.internalNotes.trim() || undefined,
      });

      setFulfillmentNotice(
        result.access === "granted" ? "Fulfillment plan updated." : "That admin password did not match."
      );
    } catch (error) {
      setFulfillmentNotice(error instanceof Error ? error.message : "Fulfillment details could not be saved.");
    } finally {
      setFulfillmentSaving(false);
    }
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

  const updateMarketingDraftForm = (
    field: keyof Omit<MarketingDraft, "_id" | "createdAt" | "updatedAt">,
    value: string | string[] | MarketingAssetUpload[]
  ) => {
    setMarketingDraftForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const buildMarketingDraftPayload = useCallback(
    (draft: Omit<MarketingDraft, "_id" | "createdAt" | "updatedAt">) => ({
      title: draft.title.trim(),
      type: draft.type,
      summary: draft.summary.trim(),
      facts: draft.facts.trim(),
      cta: draft.cta?.trim() || undefined,
      channels: draft.channels,
      assetLinks: draft.assetLinks?.map((link) => link.trim()).filter(Boolean) ?? [],
      assetUploads:
        draft.assetUploads?.map((asset) => ({
          storageId: asset.storageId,
          fileName: asset.fileName,
          contentType: asset.contentType,
        })) ?? [],
      priority: draft.priority,
      publishBy: draft.publishBy?.trim() || undefined,
      approvalStatus: draft.approvalStatus,
      notes: draft.notes?.trim() || undefined,
    }),
    []
  );

  const uploadFilesToMarketingStorage = useCallback(
    async (files: FileList | File[]) => {
      if (!fallbackKey) {
        throw new Error("Unlock with the admin password before uploading photos.");
      }

      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length === 0) {
        throw new Error("Choose image files such as JPG, PNG, or WebP.");
      }

      const uploadedAssets: MarketingAssetUpload[] = [];

      for (const file of imageFiles) {
        const uploadTarget = await generateMarketingDraftUploadUrl({ adminKey: fallbackKey });

        if (uploadTarget.access !== "granted" || !uploadTarget.uploadUrl) {
          throw new Error("That admin password did not match.");
        }

        const uploadResponse = await fetch(uploadTarget.uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}.`);
        }

        const { storageId } = (await uploadResponse.json()) as { storageId?: Id<"_storage"> };

        if (!storageId) {
          throw new Error(`Upload could not be completed for ${file.name}.`);
        }

        uploadedAssets.push({
          storageId,
          fileName: file.name,
          contentType: file.type || undefined,
          url: URL.createObjectURL(file),
        });
      }

      return uploadedAssets;
    },
    [fallbackKey, generateMarketingDraftUploadUrl]
  );

  const uploadMarketingAssets = useCallback(
    async (files: FileList | File[]) => {
      setMarketingAssetUploading(true);
      setMarketingDraftNotice(null);

      try {
        const uploadedAssets = await uploadFilesToMarketingStorage(files);

        setMarketingDraftForm((current) => ({
          ...current,
          assetUploads: [...(current.assetUploads ?? []), ...uploadedAssets],
        }));
        setMarketingDraftNotice(
          `${uploadedAssets.length} photo${uploadedAssets.length === 1 ? "" : "s"} added to this content item.`
        );
      } catch (error) {
        setMarketingDraftNotice(error instanceof Error ? error.message : "Photos could not be uploaded.");
      } finally {
        setMarketingAssetUploading(false);
      }
    },
    [uploadFilesToMarketingStorage]
  );

  const handleMarketingAssetInput = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      await uploadMarketingAssets(event.target.files);
    }

    event.target.value = "";
  };

  const handleMarketingAssetDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setMarketingAssetDragActive(false);

    if (event.dataTransfer.files?.length) {
      await uploadMarketingAssets(event.dataTransfer.files);
    }
  };

  const removeMarketingUploadedAsset = (storageId: Id<"_storage">) => {
    setMarketingDraftForm((current) => ({
      ...current,
      assetUploads: (current.assetUploads ?? []).filter((asset) => asset.storageId !== storageId),
    }));
  };

  const uploadMarketingReviewAssets = useCallback(
    async (files: FileList | File[]) => {
      if (!fallbackKey) {
        setMarketingOutputNotice("Unlock with the admin password before uploading photos.");
        return;
      }

      if (!selectedMarketingOutputSourceDraft?._id) {
        setMarketingOutputNotice("This draft is not linked to a source content item yet.");
        return;
      }

      setMarketingReviewAssetUploading(true);
      setMarketingOutputNotice(null);

      try {
        const uploadedAssets = await uploadFilesToMarketingStorage(files);
        const nextDraft = {
          title: selectedMarketingOutputSourceDraft.title,
          type: selectedMarketingOutputSourceDraft.type,
          summary: selectedMarketingOutputSourceDraft.summary,
          facts: selectedMarketingOutputSourceDraft.facts,
          cta: selectedMarketingOutputSourceDraft.cta ?? "",
          channels: selectedMarketingOutputSourceDraft.channels,
          assetLinks: selectedMarketingOutputSourceDraft.assetLinks ?? [],
          assetUploads: [...(selectedMarketingOutputSourceDraft.assetUploads ?? []), ...uploadedAssets],
          priority: selectedMarketingOutputSourceDraft.priority,
          publishBy: selectedMarketingOutputSourceDraft.publishBy ?? "",
          approvalStatus: selectedMarketingOutputSourceDraft.approvalStatus,
          notes: selectedMarketingOutputSourceDraft.notes ?? "",
        } satisfies Omit<MarketingDraft, "_id" | "createdAt" | "updatedAt">;

        const result = await updateMarketingDraft({
          adminKey: fallbackKey,
          id: selectedMarketingOutputSourceDraft._id,
          draft: buildMarketingDraftPayload(nextDraft),
        });

        if (result.access !== "granted") {
          throw new Error("That admin password did not match.");
        }

        setMarketingOutputNotice(
          `${uploadedAssets.length} photo${uploadedAssets.length === 1 ? "" : "s"} added to this draft review.`
        );
      } catch (error) {
        setMarketingOutputNotice(error instanceof Error ? error.message : "Photos could not be uploaded.");
      } finally {
        setMarketingReviewAssetUploading(false);
      }
    },
    [buildMarketingDraftPayload, fallbackKey, selectedMarketingOutputSourceDraft, updateMarketingDraft, uploadFilesToMarketingStorage]
  );

  const handleMarketingReviewAssetInput = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      await uploadMarketingReviewAssets(event.target.files);
    }

    event.target.value = "";
  };

  const handleMarketingReviewAssetDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setMarketingReviewAssetDragActive(false);

    if (event.dataTransfer.files?.length) {
      await uploadMarketingReviewAssets(event.dataTransfer.files);
    }
  };

  const handleMarketingDraftSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMarketingDraftNotice(null);

    if (!fallbackKey) {
      setMarketingDraftNotice("Unlock with the admin password before saving marketing updates.");
      return;
    }

    const draftPayload = buildMarketingDraftPayload(marketingDraftForm);

    if (!draftPayload.title || !draftPayload.summary || !draftPayload.facts || draftPayload.channels.length === 0) {
      setMarketingDraftNotice("Title, summary, facts, and at least one channel are required.");
      return;
    }

    setMarketingDraftSaving(true);

    try {
      if (selectedMarketingDraft?._id) {
        const result = await updateMarketingDraft({
          adminKey: fallbackKey,
          id: selectedMarketingDraft._id,
          draft: draftPayload,
        });
        setMarketingDraftNotice(result.access === "granted" ? "Content item updated." : "That admin password did not match.");
      } else {
        const result = await createMarketingDraft({
          adminKey: fallbackKey,
          draft: draftPayload,
        });
        setMarketingDraftNotice(result.access === "granted" ? "Content item added to the queue." : "That admin password did not match.");
        if (result.access === "granted") {
          setSelectedMarketingDraftId(null);
          setMarketingDraftForm(emptyMarketingDraftForm);
        }
      }
    } catch (error) {
      setMarketingDraftNotice(error instanceof Error ? error.message : "Content item could not be saved.");
    } finally {
      setMarketingDraftSaving(false);
    }
  };

  const handleSeedMarketingExamples = async () => {
    setMarketingDraftNotice(null);

    if (!fallbackKey) {
      setMarketingDraftNotice("Unlock with the admin password before loading sample content.");
      return;
    }

    try {
      const result = await seedSampleMarketingQueue({ adminKey: fallbackKey });
      setMarketingDraftNotice(
        result.access === "granted"
          ? result.inserted > 0
            ? "Sample marketing content loaded."
            : "Sample content was skipped because the queue already has items."
          : "That admin password did not match."
      );
    } catch (error) {
      setMarketingDraftNotice(error instanceof Error ? error.message : "Sample content could not be loaded.");
    }
  };

  const handleImportBellPhotoPromo = async () => {
    setMarketingDraftNotice(null);

    if (!fallbackKey) {
      setMarketingDraftNotice("Unlock with the admin password before loading the bell-photo promo.");
      return;
    }

    try {
      const result = await importBellPhotoPromo({ adminKey: fallbackKey });
      if (result.access === "granted" && result.inserted > 0) {
        setShouldAutoSelectLatestOutput(true);
      }
      setMarketingDraftNotice(
        result.access === "granted"
          ? result.inserted > 0
            ? "Bell-photo promo imported into Content Queue and Generated Drafts."
            : "Bell-photo promo was skipped because it already exists."
          : "That admin password did not match."
      );
    } catch (error) {
      setMarketingDraftNotice(error instanceof Error ? error.message : "Bell-photo promo could not be imported.");
    }
  };

  const handleGenerateMarketingPack = async () => {
    setMarketingDraftNotice(null);

    if (!fallbackKey) {
      setMarketingDraftNotice("Unlock with the admin password before generating drafts.");
      return;
    }

    setMarketingGenerationLoading(true);

    try {
      const result = await generateMarketingPack({ adminKey: fallbackKey });
      setMarketingGeneration(result as MarketingGenerationResult);
      if (result.access !== "granted") {
        setMarketingDraftNotice("That admin password did not match.");
      }
    } catch (error) {
      setMarketingDraftNotice(error instanceof Error ? error.message : "Marketing drafts could not be generated.");
    } finally {
      setMarketingGenerationLoading(false);
    }
  };

  const updateMarketingOutputForm = (
    field: keyof Omit<MarketingOutput, "_id" | "packId" | "kind" | "sourceType" | "provider" | "runLabel" | "createdAt" | "updatedAt">,
    value: string | string[]
  ) => {
    setMarketingOutputForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleMarketingOutputSelectedAsset = (assetValue: string) => {
    setMarketingOutputForm((current) => {
      const nextAssets = current.selectedAssets.includes(assetValue)
        ? current.selectedAssets.filter((value) => value !== assetValue)
        : [...current.selectedAssets, assetValue];

      return {
        ...current,
        selectedAssets: nextAssets,
      };
    });
  };

  const saveMarketingOutput = async (statusOverride?: MarketingOutputStatus) => {
    setMarketingOutputNotice(null);

    if (!fallbackKey) {
      setMarketingOutputNotice("Unlock with the admin password before updating generated drafts.");
      return false;
    }

    if (!selectedMarketingOutput?._id) {
      setMarketingOutputNotice("Select a generated draft first.");
      return false;
    }

    const nextStatus = statusOverride ?? marketingOutputForm.status;

    if ((nextStatus === "approved" || nextStatus === "scheduled" || nextStatus === "posted") && marketingOutputForm.selectedAssets.length === 0) {
      setMarketingOutputNotice("Choose at least one photo before marking this draft approved.");
      return false;
    }

    setMarketingOutputSaving(true);

    try {
      const result = await updateMarketingOutput({
        adminKey: fallbackKey,
        id: selectedMarketingOutput._id,
        output: {
          title: marketingOutputForm.title.trim(),
          channelLabel: marketingOutputForm.channelLabel.trim(),
          body: marketingOutputForm.body.trim(),
          shortPost: marketingOutputForm.shortPost.trim() || undefined,
          hashtags: marketingOutputForm.hashtags.map((tag) => tag.trim()).filter(Boolean),
          assetHint: marketingOutputForm.assetHint.trim(),
          selectedAssets: marketingOutputForm.selectedAssets,
          status: nextStatus,
          publishAt: marketingOutputForm.publishAt.trim() || undefined,
        },
      });
      if (result.access === "granted") {
        if (selectedMarketingOutputSourceDraft?._id && (nextStatus === "approved" || nextStatus === "scheduled")) {
          const sourceApprovalStatus =
            nextStatus === "scheduled" ? "scheduled" : "approved";

          if (selectedMarketingOutputSourceDraft.approvalStatus !== sourceApprovalStatus) {
            await updateMarketingDraft({
              adminKey: fallbackKey,
              id: selectedMarketingOutputSourceDraft._id,
              draft: buildMarketingDraftPayload({
                title: selectedMarketingOutputSourceDraft.title,
                type: selectedMarketingOutputSourceDraft.type,
                summary: selectedMarketingOutputSourceDraft.summary,
                facts: selectedMarketingOutputSourceDraft.facts,
                cta: selectedMarketingOutputSourceDraft.cta ?? "",
                channels: selectedMarketingOutputSourceDraft.channels,
                assetLinks: selectedMarketingOutputSourceDraft.assetLinks ?? [],
                assetUploads: selectedMarketingOutputSourceDraft.assetUploads ?? [],
                priority: selectedMarketingOutputSourceDraft.priority,
                publishBy: selectedMarketingOutputSourceDraft.publishBy ?? "",
                approvalStatus: sourceApprovalStatus,
                notes: selectedMarketingOutputSourceDraft.notes ?? "",
              }),
            });
          }
        }

        if (statusOverride) {
          setMarketingOutputForm((current) => ({
            ...current,
            status: nextStatus,
          }));
          setMarketingOutputNotice(
            nextStatus === "approved"
              ? "Draft approved and source content moved to Approved."
              : `Draft marked ${formatLabel(nextStatus)}.`
          );
        } else {
          setMarketingOutputNotice("Generated draft updated.");
        }

        return true;
      } else {
        setMarketingOutputNotice("That admin password did not match.");
        return false;
      }
    } catch (error) {
      setMarketingOutputNotice(error instanceof Error ? error.message : "Generated draft could not be updated.");
      return false;
    } finally {
      setMarketingOutputSaving(false);
    }
  };

  const handleAutoPostApprovedDraft = async () => {
    if (!fallbackKey) {
      setMarketingOutputNotice("Unlock with the admin password before auto-posting.");
      return;
    }

    if (!selectedMarketingOutput?._id) {
      setMarketingOutputNotice("Select a generated draft first.");
      return;
    }

    const saved = await saveMarketingOutput("approved");

    if (!saved) {
      return;
    }

    setMarketingOutputPublishing(true);

    try {
      const result = await requestMarketingApproval({
        adminKey: fallbackKey,
        id: selectedMarketingOutput._id,
      });

      if (result.access !== "granted") {
        setMarketingOutputNotice("That admin password did not match.");
        return;
      }
      setMarketingOutputNotice(result.message);
    } catch (error) {
      setMarketingOutputNotice(error instanceof Error ? error.message : "Auto-posting could not be completed.");
    } finally {
      setMarketingOutputPublishing(false);
    }
  };

  const handleMarketingOutputSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveMarketingOutput();
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
    setSelectedMarketingDraftId(null);
    setSelectedMarketingOutputId(null);
  };

  const handleSignOut = () => {
    setAdminResult(null);
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setFallbackInput("");
    setFallbackKey("");
    setSelectedId(null);
    setSelectedMarketingDraftId(null);
    setSelectedMarketingOutputId(null);

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
      {showPasswordFallback && (
        <div className="border border-border bg-card p-4 text-sm text-foreground">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Use the admin password to review product quantities.</p>
              <p className="text-muted-foreground">
                If WorkOS access is unavailable right now, the password fallback will still unlock products and inventory.
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={fallbackInput}
                onChange={(event) => setFallbackInput(event.target.value)}
                placeholder="Admin password"
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
              <button
                type="submit"
                className="rounded-[8px] border border-border px-4 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Unlock with password
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  const analyticsPanel = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Total Visits</p>
            <Eye className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{isUnlocked && analyticsSummary ? analyticsSummary.totalVisits : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Privacy-safe page views</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Unique Today</p>
            <Users className="text-cajun" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">
            {isUnlocked && analyticsSummary ? analyticsSummary.uniqueVisitorsToday : "-"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Anonymous daily visitors</p>
        </div>
        <div className="border border-border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">7-Day Trend</p>
            <BarChart3 className="text-cajun" size={20} />
          </div>
          <div className="mt-4 flex h-24 items-end gap-2">
            {(analyticsSummary?.sevenDayTrend ?? []).map((bucket) => (
              <div key={bucket.day} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  className="min-h-1 rounded-t-[8px] bg-cajun"
                  style={{ height: `${Math.max((bucket.visits / maxAnalyticsTrend) * 100, bucket.visits > 0 ? 12 : 4)}%` }}
                  title={`${bucket.label}: ${bucket.visits} visits`}
                />
                <p className="text-center text-xs font-semibold text-muted-foreground">{bucket.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-2xl font-bold text-foreground">Top Pages</h2>
            <p className="mt-1 text-sm text-muted-foreground">Top routes from accepted page views.</p>
          </div>
          <div>
            {!isUnlocked ? (
              <p className="p-5 text-sm text-muted-foreground">Unlock the portal to view analytics.</p>
            ) : !analyticsSummary || analyticsSummary.topPages.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No page views tracked yet.</p>
            ) : (
              analyticsSummary.topPages.map((page, index) => (
                <div key={page.route} className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{page.route}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Rank #{index + 1}</p>
                  </div>
                  <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                    {page.views} view{page.views === 1 ? "" : "s"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-2xl font-bold text-foreground">Recent Activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Route, referrer, device, and browser without IP addresses.</p>
          </div>
          <div>
            {!isUnlocked ? (
              <p className="p-5 text-sm text-muted-foreground">Unlock the portal to view recent activity.</p>
            ) : !analyticsSummary || analyticsSummary.recentActivity.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No recent analytics activity yet.</p>
            ) : (
              analyticsSummary.recentActivity.map((activity) => (
                <div key={`${activity.route}-${activity.createdAt}`} className="border-b border-border p-4 last:border-b-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{activity.route}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activity.referrer ? `Referrer: ${activity.referrer}` : "Direct or unavailable referrer"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-muted-foreground">{formatDate(activity.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                    {[activity.deviceType, activity.browser].filter(Boolean).join(" / ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
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
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Lifetime Value</th>
                <th className="px-5 py-3">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
                    Loading customers...
                  </td>
                </tr>
              ) : !isUnlocked ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
                    Unlock the portal to review customers.
                  </td>
                </tr>
              ) : visibleCustomerProfiles.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={6}>
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
                      {profile.email ? (
                        <a className="break-words text-cajun hover:underline" href={`mailto:${profile.email}`}>
                          {profile.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Phone only</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-foreground">{profile.phone || "Not provided"}</td>
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
                      {selectedCustomer.email ? (
                        <a className="text-cajun hover:underline" href={`mailto:${selectedCustomer.email}`}>
                          {selectedCustomer.email}
                        </a>
                      ) : (
                        "Not provided"
                      )}
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
            <p className="mt-1 text-sm text-muted-foreground">
              Capture weekly updates, promotions, and story ideas so the agent has reliable content to draft from.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSeedMarketingExamples}
              className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Plus size={15} />
              Load Sample Content
            </button>
            <button
              type="button"
              onClick={handleImportBellPhotoPromo}
              className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Plus size={15} />
              Import Bell Photo Promo
            </button>
            <button
              type="button"
              onClick={handleGenerateMarketingPack}
              disabled={marketingGenerationLoading}
              className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail size={15} />
              {marketingGenerationLoading ? "Generating..." : "Generate With AI"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMarketingDraftId(null);
                setMarketingDraftForm(emptyMarketingDraftForm);
                setMarketingDraftNotice(null);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
            >
              <Megaphone size={15} />
              New Content Item
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Content Queue", value: marketingCounts.total, detail: "Saved ideas and approved facts", icon: Megaphone },
            { label: "Weekly Notes", value: marketingCounts.weeklyNotes, detail: "Updates tagged for weekly recap", icon: CalendarDays },
            { label: "Ready For Review", value: marketingCounts.readyToReview, detail: "Drafts waiting for polish", icon: Pencil },
            { label: "Scheduled", value: marketingCounts.scheduled, detail: "Approved items ready to publish", icon: Mail },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[8px] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                  <Icon className="text-cajun" size={18} />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">{isUnlocked ? item.value : "-"}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.1fr)_minmax(340px,0.95fr)] 2xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.15fr)_minmax(380px,0.9fr)] xl:items-start">
        <div className="space-y-6">
        <form onSubmit={handleMarketingDraftSubmit} className="border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground">
                {selectedMarketingDraft ? "Edit Content Item" : "Content Inbox"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Save approved facts, upcoming events, and weekly notes inputs before the agent writes copy.
              </p>
            </div>
            <span className="rounded-[8px] bg-gold/20 px-3 py-2 text-xs font-bold uppercase text-foreground">
              Approval First
            </span>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Title</span>
              <input
                type="text"
                value={marketingDraftForm.title}
                onChange={(event) => updateMarketingDraftForm("title", event.target.value)}
                placeholder="Spring pop-up at the market"
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Type</span>
              <select
                value={marketingDraftForm.type}
                onChange={(event) => updateMarketingDraftForm("type", event.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              >
                {marketingTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-foreground">Summary</span>
              <textarea
                value={marketingDraftForm.summary}
                onChange={(event) => updateMarketingDraftForm("summary", event.target.value)}
                placeholder="Short summary of the update the agent can turn into a post."
                rows={3}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-foreground">Approved Facts</span>
              <textarea
                value={marketingDraftForm.facts}
                onChange={(event) => updateMarketingDraftForm("facts", event.target.value)}
                placeholder="Event date, location, flavor details, pricing, award mention, or any fact that is safe to publish."
                rows={5}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Priority</span>
              <select
                value={marketingDraftForm.priority}
                onChange={(event) => updateMarketingDraftForm("priority", event.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              >
                {marketingPriorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Approval Status</span>
              <select
                value={marketingDraftForm.approvalStatus}
                onChange={(event) => updateMarketingDraftForm("approvalStatus", event.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              >
                {marketingApprovalOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Call To Action</span>
              <input
                type="text"
                value={marketingDraftForm.cta ?? ""}
                onChange={(event) => updateMarketingDraftForm("cta", event.target.value)}
                placeholder="Order by phone, visit the pop-up, join the list..."
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-semibold text-foreground">Publish By</span>
              <input
                type="date"
                value={marketingDraftForm.publishBy ?? ""}
                onChange={(event) => updateMarketingDraftForm("publishBy", event.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-foreground">Channels</span>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {marketingChannelOptions.map((channel) => {
                  const isSelected = marketingDraftForm.channels.includes(channel);

                  return (
                    <label
                      key={channel}
                      className={`flex items-center gap-3 rounded-[8px] border px-3 py-3 text-sm transition-colors ${
                        isSelected ? "border-cajun bg-cajun/5 text-foreground" : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          const nextChannels = event.target.checked
                            ? [...marketingDraftForm.channels, channel]
                            : marketingDraftForm.channels.filter((value) => value !== channel);
                          updateMarketingDraftForm("channels", nextChannels);
                        }}
                        className="h-4 w-4 accent-cajun"
                      />
                      <span className="font-medium">{channel}</span>
                    </label>
                  );
                })}
              </div>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-foreground">Asset Links</span>
              <textarea
                value={(marketingDraftForm.assetLinks ?? []).join("\n")}
                onChange={(event) =>
                  updateMarketingDraftForm(
                    "assetLinks",
                    event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="Paste one image, drive, or folder link per line."
                rows={3}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>

            <div className="space-y-3 text-sm md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-foreground">Upload Photos</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, and WebP</span>
              </div>
              <input
                ref={marketingAssetInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleMarketingAssetInput}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => marketingAssetInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setMarketingAssetDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setMarketingAssetDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) {
                    setMarketingAssetDragActive(false);
                  }
                }}
                onDrop={handleMarketingAssetDrop}
                className={`flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed px-5 py-6 text-center transition-colors ${
                  marketingAssetDragActive ? "border-cajun bg-cajun/5" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Upload className="text-cajun" size={22} />
                <div>
                  <p className="font-semibold text-foreground">
                    {marketingAssetUploading ? "Uploading photos..." : "Click to add photos or drag them here"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploaded photos stay attached to this content item and show up in draft review.
                  </p>
                </div>
              </button>
              {marketingDraftForm.assetUploads && marketingDraftForm.assetUploads.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {marketingDraftForm.assetUploads.map((asset) => (
                    <div key={asset.storageId} className="overflow-hidden rounded-[8px] border border-border bg-background">
                      {asset.url ? (
                        <img src={asset.url} alt={asset.fileName} className="h-28 w-full object-cover" />
                      ) : (
                        <div className="flex h-28 items-center justify-center bg-muted text-xs text-muted-foreground">{asset.fileName}</div>
                      )}
                      <div className="flex items-center justify-between gap-2 p-3">
                        <p className="min-w-0 truncate text-xs font-medium text-foreground">{asset.fileName}</p>
                        <button
                          type="button"
                          onClick={() => removeMarketingUploadedAsset(asset.storageId)}
                          className="rounded-[8px] border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-foreground">Notes</span>
              <textarea
                value={marketingDraftForm.notes ?? ""}
                onChange={(event) => updateMarketingDraftForm("notes", event.target.value)}
                placeholder="Any extra context for the future agent: voice reminder, visual direction, missing fact to confirm."
                rows={3}
                className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-border p-5">
            {marketingDraftNotice && (
              <div className="rounded-[8px] border border-border bg-background px-4 py-3 text-sm text-foreground">
                {marketingDraftNotice}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedMarketingDraftId(null);
                  setMarketingDraftForm(emptyMarketingDraftForm);
                  setMarketingDraftNotice(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Plus size={15} />
                Clear Form
              </button>
              <button
                type="submit"
                disabled={marketingDraftSaving || marketingAssetUploading}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-cajun px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={15} />
                {marketingDraftSaving ? "Saving..." : marketingAssetUploading ? "Uploading..." : selectedMarketingDraft ? "Update Content Item" : "Save Content Item"}
              </button>
            </div>
          </div>
        </form>

          <div className="border border-border bg-card">
            <div className="border-b border-border p-5">
              <h3 className="font-serif text-2xl font-bold text-foreground">Content Queue</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select an item to edit or use it later for social drafts and weekly notes.</p>
            </div>
            <div>
              {!isUnlocked ? (
                <p className="p-5 text-sm text-muted-foreground">Unlock the portal to review the content queue.</p>
              ) : marketingDraftRows.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No content items saved yet. Add your first weekly update or promo above.</p>
              ) : (
                marketingDraftRows.map((draft) => (
                  <button
                    key={draft._id}
                    type="button"
                    onClick={() => {
                      setSelectedMarketingDraftId(draft._id ?? null);
                      setMarketingDraftNotice(null);
                    }}
                    className={`w-full border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-muted ${
                      selectedMarketingDraftId === draft._id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                        {formatLabel(draft.type)}
                      </span>
                      <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        {formatLabel(draft.priority)}
                      </span>
                      <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        {formatLabel(draft.approvalStatus)}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-foreground">{draft.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{draft.summary}</p>
                    {getDraftAssetItems(draft).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getDraftAssetItems(draft).map((asset) => (
                          <a
                            key={asset.key}
                            href={asset.href}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-border px-2 py-1 text-xs text-cajun hover:bg-cajun/5"
                          >
                            {asset.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.channels.map((channel) => (
                        <span key={channel} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                          {channel}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      Updated {formatDate(draft.updatedAt)}
                      {draft.publishBy ? ` • Publish by ${draft.publishBy}` : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-border bg-card xl:self-start">
            <div className="border-b border-border p-5">
              <h3 className="font-serif text-2xl font-bold text-foreground">Generated Drafts</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                  Every saved pack becomes individual editable drafts you can approve, schedule, and post.
                </p>
              </div>
              <div>
                {!isUnlocked ? (
                  <p className="p-5 text-sm text-muted-foreground">Unlock the portal to review generated drafts.</p>
                ) : marketingOutputs.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">No generated drafts yet. Generate a pack to populate this queue.</p>
                ) : (
                  marketingOutputs.map((output) => (
                    <button
                      key={output._id}
                      type="button"
                      onClick={() => {
                        setSelectedMarketingOutputId(output._id ?? null);
                        setMarketingOutputNotice(null);
                      }}
                      className={`w-full border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-muted ${
                        selectedMarketingOutputId === output._id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[8px] bg-cajun px-2 py-1 text-xs font-bold uppercase text-primary-foreground">
                          {output.kind === "social" ? "Social" : "Weekly Note"}
                        </span>
                        <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                          {formatLabel(output.status)}
                        </span>
                        <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                          {output.runLabel}
                        </span>
                      </div>
                      <p className="mt-3 font-semibold text-foreground">{output.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{output.channelLabel}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{output.body}</p>
                      <p className="mt-3 text-xs font-semibold text-muted-foreground">Updated {formatDate(output.updatedAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

          <form onSubmit={handleMarketingOutputSubmit} className="border border-border bg-card xl:min-w-0">
              <div className="border-b border-border p-5">
                <h3 className="font-serif text-2xl font-bold text-foreground">Review Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit the copy, choose photos, and move the draft through approval.
                </p>
              </div>

              {!selectedMarketingOutput ? (
                <div className="flex min-h-[420px] items-center justify-center p-6 text-center">
                  <div>
                    <Megaphone className="mx-auto mb-3 text-muted-foreground" size={36} />
                    <p className="font-semibold text-foreground">No draft selected</p>
                    <p className="mt-1 text-sm text-muted-foreground">Choose a generated draft from the queue to review it here.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Title</span>
                      <input
                        type="text"
                        value={marketingOutputForm.title}
                        onChange={(event) => updateMarketingOutputForm("title", event.target.value)}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-semibold text-foreground">Channel</span>
                      <input
                        type="text"
                        value={marketingOutputForm.channelLabel}
                        onChange={(event) => updateMarketingOutputForm("channelLabel", event.target.value)}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-semibold text-foreground">Status</span>
                      <select
                        value={marketingOutputForm.status}
                        onChange={(event) => updateMarketingOutputForm("status", event.target.value)}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      >
                        {marketingOutputStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatLabel(option)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Body</span>
                      <textarea
                        value={marketingOutputForm.body}
                        onChange={(event) => updateMarketingOutputForm("body", event.target.value)}
                        rows={7}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Short Post</span>
                      <textarea
                        value={marketingOutputForm.shortPost ?? ""}
                        onChange={(event) => updateMarketingOutputForm("shortPost", event.target.value)}
                        rows={3}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Hashtags</span>
                      <input
                        type="text"
                        value={(marketingOutputForm.hashtags ?? []).join(", ")}
                        onChange={(event) =>
                          updateMarketingOutputForm(
                            "hashtags",
                            event.target.value
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="#MamesMeatPies, #CaneRiver"
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Asset Guidance</span>
                      <textarea
                        value={marketingOutputForm.assetHint}
                        onChange={(event) => updateMarketingOutputForm("assetHint", event.target.value)}
                        rows={3}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <div className="space-y-2 text-sm md:col-span-2">
                      <span className="font-semibold text-foreground">Linked Assets</span>
                      {selectedMarketingOutputLinkedAssets.length === 0 ? (
                        <div className="rounded-[8px] border border-border bg-background px-4 py-3 text-muted-foreground">
                          No linked asset was saved with the source content item.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 rounded-[8px] border border-border bg-background p-3">
                          {selectedMarketingOutputLinkedAssets.map((asset) => (
                            <a
                              key={asset.key}
                              href={asset.href}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-border px-3 py-2 text-xs text-cajun hover:bg-cajun/5"
                            >
                              {asset.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-sm md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">Add Photos In Review</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedMarketingOutputSourceDraft?._id ? "Attaches to the source content item" : "Source item required"}
                        </span>
                      </div>
                      <input
                        ref={marketingReviewAssetInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMarketingReviewAssetInput}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={!selectedMarketingOutputSourceDraft?._id || marketingReviewAssetUploading}
                        onClick={() => marketingReviewAssetInputRef.current?.click()}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          if (selectedMarketingOutputSourceDraft?._id) {
                            setMarketingReviewAssetDragActive(true);
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (selectedMarketingOutputSourceDraft?._id) {
                            setMarketingReviewAssetDragActive(true);
                          }
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          if (event.currentTarget === event.target) {
                            setMarketingReviewAssetDragActive(false);
                          }
                        }}
                        onDrop={handleMarketingReviewAssetDrop}
                        className={`flex min-h-28 w-full flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed px-5 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          marketingReviewAssetDragActive ? "border-cajun bg-cajun/5" : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <Upload className="text-cajun" size={20} />
                        <div>
                          <p className="font-semibold text-foreground">
                            {marketingReviewAssetUploading ? "Uploading photos..." : "Click to add photos or drag them here"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            New uploads appear immediately in the linked assets and visual picker below.
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3 text-sm md:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">Selected Photos</span>
                        <span className="text-xs text-muted-foreground">
                          {marketingOutputForm.selectedAssets.length} selected
                        </span>
                      </div>
                      {selectedMarketingAssetChoices.some((asset) => asset.source === "uploaded") ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Uploaded With This Content</p>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {selectedMarketingAssetChoices
                              .filter((asset) => asset.source === "uploaded")
                              .map((asset) => {
                                const isSelected = marketingOutputForm.selectedAssets.includes(asset.value);

                                return (
                                  <button
                                    key={asset.value}
                                    type="button"
                                    onClick={() => toggleMarketingOutputSelectedAsset(asset.value)}
                                    className={`overflow-hidden rounded-[8px] border text-left transition-colors ${
                                      isSelected ? "border-cajun bg-cajun/5" : "border-border bg-background hover:bg-muted"
                                    }`}
                                  >
                                    <img src={asset.previewUrl} alt={asset.label} className="h-28 w-full object-cover" />
                                    <div className="flex items-center justify-between gap-3 p-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">{asset.label}</p>
                                        <p className="text-xs text-muted-foreground">Uploaded photo</p>
                                      </div>
                                      {isSelected ? <Check size={16} className="shrink-0 text-cajun" /> : null}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Photo Library</p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {selectedMarketingAssetChoices
                            .filter((asset) => asset.source === "library")
                            .map((asset) => {
                              const isSelected = marketingOutputForm.selectedAssets.includes(asset.value);

                              return (
                                <button
                                  key={asset.value}
                                  type="button"
                                  onClick={() => toggleMarketingOutputSelectedAsset(asset.value)}
                                  className={`overflow-hidden rounded-[8px] border text-left transition-colors ${
                                    isSelected ? "border-cajun bg-cajun/5" : "border-border bg-background hover:bg-muted"
                                  }`}
                                >
                                  <img src={asset.previewUrl} alt={asset.label} className="h-28 w-full object-cover" />
                                  <div className="flex items-center justify-between gap-3 p-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">{asset.label}</p>
                                      <p className="text-xs text-muted-foreground">Library image</p>
                                    </div>
                                    {isSelected ? <Check size={16} className="shrink-0 text-cajun" /> : null}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                      {unresolvedSelectedMarketingAssets.length > 0 ? (
                        <div className="rounded-[8px] border border-border bg-background p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved Selections</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {unresolvedSelectedMarketingAssets.map((asset) => (
                              <button
                                key={asset}
                                type="button"
                                onClick={() => toggleMarketingOutputSelectedAsset(asset)}
                                className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-muted"
                              >
                                {formatAssetLabel(asset)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <label className="space-y-2 text-sm">
                      <span className="font-semibold text-foreground">Publish At</span>
                      <input
                        type="date"
                        value={marketingOutputForm.publishAt ?? ""}
                        onChange={(event) => updateMarketingOutputForm("publishAt", event.target.value)}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
                      />
                    </label>

                    <div className="space-y-2 rounded-[8px] border border-border bg-background p-4 text-sm">
                      <p className="font-semibold text-foreground">Run Metadata</p>
                      <p className="text-muted-foreground">Run: {selectedMarketingOutput.runLabel}</p>
                      <p className="text-muted-foreground">Provider: {selectedMarketingOutput.provider}</p>
                      <p className="text-muted-foreground">
                        Type: {selectedMarketingOutput.kind === "social" ? "Social Draft" : "Weekly Note"}
                      </p>
                      {selectedMarketingOutput.publishedPlatforms && selectedMarketingOutput.publishedPlatforms.length > 0 ? (
                        <p className="text-muted-foreground">
                          Posted: {selectedMarketingOutput.publishedPlatforms.map((platform) => formatLabel(platform)).join(", ")}
                        </p>
                      ) : null}
                      {selectedMarketingOutput.lastPublishError ? (
                        <p className="text-destructive">Last auto-post error: {selectedMarketingOutput.lastPublishError}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border p-5">
                    {marketingOutputNotice && (
                      <div className="rounded-[8px] border border-border bg-background px-4 py-3 text-sm text-foreground">
                        {marketingOutputNotice}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={marketingOutputSaving || marketingOutputPublishing}
                      className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-cajun px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={15} />
                      {marketingOutputSaving ? "Saving..." : "Update Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={marketingOutputSaving || marketingOutputPublishing}
                      onClick={() => void saveMarketingOutput("approved")}
                      className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-cajun px-4 py-3 text-sm font-semibold text-cajun transition-colors hover:bg-cajun/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={15} />
                      {marketingOutputSaving ? "Saving..." : "Approve Draft"}
                    </button>
                    {selectedMarketingOutput?.kind === "social" ? (
                      <button
                        type="button"
                        disabled={marketingOutputSaving || marketingOutputPublishing}
                        onClick={() => void handleAutoPostApprovedDraft()}
                        className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-gold px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Mail size={15} />
                        {marketingOutputPublishing ? "Sending Approval..." : "Send Final Approval Email"}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
          </form>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="border border-border bg-card">
            <div className="border-b border-border p-5">
              <h3 className="font-serif text-2xl font-bold text-foreground">Draft Generator Preview</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the first-pass content pack built from items marked ready, approved, or scheduled.
              </p>
            </div>
            <div className="space-y-5 p-5">
              {!isUnlocked ? (
                <p className="text-sm text-muted-foreground">Unlock the portal to preview generated social posts and weekly notes.</p>
              ) : draftGeneratorSource.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Move a content item from `Draft` to `Ready`, `Approved`, or `Scheduled` to generate preview copy.
                </p>
              ) : (
                <>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-serif text-xl font-bold text-foreground">Social Drafts</h4>
                      <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                        {displayedSocialDrafts.length} ready
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Run: {marketingGeneration?.runLabel ?? "Manual Preview"}
                      {" • "}
                      Provider: {generationProviderLabel}
                      {marketingGeneration?.generatedAt ? ` • Generated ${formatDate(marketingGeneration.generatedAt)}` : ""}
                    </p>
                    {displayedSocialDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Add a product, event, promotion, or story item to the ready queue.</p>
                    ) : (
                      displayedSocialDrafts.map((draft) => (
                        <article key={`${draft.sourceId ?? draft.title}-${draft.channelLabel}`} className="rounded-[8px] border border-border bg-background p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-[8px] bg-cajun px-2 py-1 text-xs font-bold uppercase text-primary-foreground">
                              {draft.channelLabel}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{draft.title}</span>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-foreground">{draft.caption}</p>
                          <p className="mt-3 text-sm font-medium text-cajun">{draft.shortPost}</p>
                          <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
                            {draft.hashtags.map((tag) => `#${tag}`).join(" ")}
                          </p>
                          <p className="mt-3 text-xs text-muted-foreground">{draft.assetHint}</p>
                          {draft.sourceId ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {getDraftAssetItems(marketingDraftRows.find((item) => item._id === draft.sourceId)).map((asset) => (
                                <a
                                  key={asset.key}
                                  href={asset.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-border px-2 py-1 text-xs text-cajun hover:bg-cajun/5"
                                >
                                  {asset.label}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))
                    )}
                  </section>

                  <section className="space-y-3 border-t border-border pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-serif text-xl font-bold text-foreground">Weekly Notes Preview</h4>
                      <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        Friday Pack
                      </span>
                    </div>
                    {!displayedWeeklyNote ? (
                      <p className="text-sm text-muted-foreground">Add a weekly update item to build a weekly notes preview.</p>
                    ) : (
                      <article className="rounded-[8px] border border-border bg-background p-4">
                        <h5 className="font-semibold text-foreground">{displayedWeeklyNote.title}</h5>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{displayedWeeklyNote.body}</p>
                        <div className="mt-4 rounded-[8px] border border-border p-3">
                          <p className="text-xs font-bold uppercase text-muted-foreground">Recap Social Post</p>
                          <p className="mt-2 text-sm text-foreground">{displayedWeeklyNote.recapPost}</p>
                        </div>
                        <div className="mt-4">
                          <p className="text-xs font-bold uppercase text-muted-foreground">Follow-Up Ideas</p>
                          <div className="mt-2 space-y-2">
                            {displayedWeeklyNote.followUps.map((item) => (
                              <p key={item} className="text-sm text-muted-foreground">
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      </article>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="border-b border-border p-5">
              <h3 className="font-serif text-2xl font-bold text-foreground">Saved Runs</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every AI or fallback generation run is stored here so you can reopen recent output.
              </p>
            </div>
            <div>
              {!isUnlocked ? (
                <p className="p-5 text-sm text-muted-foreground">Unlock the portal to review saved marketing packs.</p>
              ) : savedMarketingPacks.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No saved runs yet. Generate a pack to store the first one.</p>
              ) : (
                savedMarketingPacks.map((pack) => (
                  <article key={pack._id ?? `${pack.generatedAt}-${pack.provider}`} className="border-b border-border p-4 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[8px] bg-cajun px-2 py-1 text-xs font-bold uppercase text-primary-foreground">
                        {pack.runLabel}
                      </span>
                      <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                        {pack.provider}
                      </span>
                      <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        {pack.socialDrafts.length} social
                      </span>
                      <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                        {pack.sourceCount} sources
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{formatDate(pack.generatedAt)}</p>
                    {pack.socialDrafts[0] ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Latest lead draft: {pack.socialDrafts[0].title}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No social drafts in this pack.</p>
                    )}
                    {pack.weeklyNote ? (
                      <p className="mt-2 text-sm text-muted-foreground">Weekly note: {pack.weeklyNote.title}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl font-bold text-foreground">Audience Segments</h3>
                <p className="mt-1 text-sm text-muted-foreground">Useful later for campaign targeting once drafts are approved.</p>
              </div>
              <div className="flex gap-2">
                <Mail className="text-cajun" size={18} />
                <MessageSquare className="text-cajun" size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
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

            <div className="mt-5 rounded-[8px] border border-border bg-background p-4 text-sm text-muted-foreground">
              Next step: use this queue as the source for an automated Tuesday social-draft run and a Friday weekly-notes run.
            </div>
          </div>
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
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Fulfillment</p>
                      <p className="mt-1 text-sm font-semibold">{formatLabel(getOrderFulfillmentStatus(activeItem))}</p>
                    </div>
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Method</p>
                      <p className="mt-1 text-sm font-semibold">{formatLabel(getOrderFulfillmentMethod(activeItem))}</p>
                    </div>
                    <div className="border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Salesperson</p>
                      <p className="mt-1 text-sm font-semibold">{activeItem.salesperson || "Not provided"}</p>
                    </div>
                    <div className="border border-border bg-background p-3 md:col-span-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Kitchen Notes</p>
                      <p className="mt-1 text-sm font-semibold">
                        {activeItem.internalNotes || activeItem.neededBy || activeItem.assignedTo
                          ? [activeItem.neededBy ? `Needed by ${activeItem.neededBy}` : null, activeItem.assignedTo ? `Owner: ${activeItem.assignedTo}` : null, activeItem.internalNotes].filter(Boolean).join(" • ")
                          : "No fulfillment details saved yet."}
                      </p>
                    </div>
                  </div>
                  {activeItem.promoCode && (
                    <div className="mt-3 border border-border bg-background p-3 text-sm">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Promo</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {activeItem.promoCode} saved {formatCurrency(activeItem.promoDiscount ?? 0)}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Subtotal: {formatCurrency(activeItem.subtotal ?? activeItem.total + (activeItem.promoDiscount ?? 0))}
                      </p>
                    </div>
                  )}
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
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Fulfillment</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={7}>
                  Loading orders...
                </td>
              </tr>
            ) : !isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={7}>
                  Unlock the portal to review orders.
                </td>
              </tr>
            ) : orderItems.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={7}>
                  No order inquiries yet.
                </td>
              </tr>
            ) : (
              orderItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-foreground">{item.customerName}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="text-cajun">{item.email || "No email"}</p>
                      <p className="text-muted-foreground">{item.phone}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.status === "submitted" ? "Submitted" : "Checkout started"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${getFulfillmentStatusTone(getOrderFulfillmentStatus(item))}`}>
                      {formatLabel(getOrderFulfillmentStatus(item))}
                    </span>
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

  const promosPanel = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-border bg-card p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Promo Codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor every promo code, who used it, what they ordered, and how much discount it drove.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDownloadPromoSummary(visiblePromoSummaryRows)}
            disabled={!isUnlocked || visiblePromoSummaryRows.length === 0}
            className="inline-flex items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Export summary
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPromoUsage(visiblePromoUsageRows)}
            disabled={!isUnlocked || visiblePromoUsageRows.length === 0}
            className="inline-flex items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Export usage
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border border-border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Promo Redemptions</p>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? promoUsageRows.length : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Orders with a recorded promo discount.</p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Discount Given</p>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? formatCurrency(promoDiscountTotal) : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Total dollars discounted across all promo uses.</p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Revenue with Promos</p>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? formatCurrency(promoRevenueTotal) : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Order totals attached to promo-driven purchases.</p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Returning Customer Uses</p>
          <p className="mt-3 text-3xl font-bold">{isUnlocked ? promoReturningUseCount : "-"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Helpful for spotting loyalty versus first-order promos.</p>
        </div>
      </div>

      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">Search Promo Activity</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by code, customer, email, phone, payment method, salesperson, or ordered item.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="search"
            value={promoSearch}
            onChange={(event) => setPromoSearch(event.target.value)}
            placeholder="Search promo codes or customers"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-serif text-xl font-bold text-foreground">Promo Summary</h3>
        </div>
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Schedule</th>
              <th className="px-5 py-3">Cap</th>
              <th className="px-5 py-3">Uses</th>
              <th className="px-5 py-3">Unique Customers</th>
              <th className="px-5 py-3">New / Returning</th>
              <th className="px-5 py-3">Completed / Canceled</th>
              <th className="px-5 py-3">Discount Given</th>
              <th className="px-5 py-3">Revenue</th>
              <th className="px-5 py-3">Avg Order</th>
              <th className="px-5 py-3">Margin Impact</th>
              <th className="px-5 py-3">Sources</th>
              <th className="px-5 py-3">Last Used</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={12}>
                  Loading promo performance...
                </td>
              </tr>
            ) : !isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={12}>
                  Unlock the portal to review promo performance.
                </td>
              </tr>
            ) : visiblePromoSummaryRows.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={12}>
                  No promo codes match that search.
                </td>
              </tr>
            ) : (
              visiblePromoSummaryRows.map((summary) => (
                <tr key={summary.code} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{summary.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{summary.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{summary.channelHint ?? "No channel set"}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <p>{formatShortDate(summary.startsAt)} to {formatShortDate(summary.endsAt)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase">
                      {getPromoScheduleStatus(summary)}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {summary.maxRedemptions === undefined
                      ? "Unlimited"
                      : `${summary.uses}/${summary.maxRedemptions} used${summary.remainingRedemptions !== undefined ? `, ${summary.remainingRedemptions} left` : ""}`}
                  </td>
                  <td className="px-5 py-4 font-semibold text-foreground">{summary.uses}</td>
                  <td className="px-5 py-4 text-muted-foreground">{summary.uniqueCustomers}</td>
                  <td className="px-5 py-4 text-muted-foreground">{summary.newCustomerUses} / {summary.returningCustomerUses}</td>
                  <td className="px-5 py-4 text-muted-foreground">{summary.completedOrders} / {summary.canceledOrders}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(summary.totalDiscount)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatCurrency(summary.totalRevenue)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatCurrency(summary.averageOrderValue)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatCurrency(summary.marginImpact)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{summary.sourceBreakdown.join(", ") || "None yet"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {summary.lastUsedAt ? formatDate(summary.lastUsedAt) : "Never used"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-serif text-xl font-bold text-foreground">Usage Log</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Track who used each code, when they used it, and whether it was a first-time or repeat order.
          </p>
        </div>
        <table className="w-full min-w-[1520px] text-left text-sm">
          <thead className="border-b border-border bg-background text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Date / Time</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Source / Campaign</th>
              <th className="px-5 py-3">Discount</th>
              <th className="px-5 py-3">Subtotal</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Customer Type</th>
              <th className="px-5 py-3">Salesperson</th>
              <th className="px-5 py-3">Items</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={14}>
                  Loading promo usage...
                </td>
              </tr>
            ) : !isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={14}>
                  Unlock the portal to review promo usage.
                </td>
              </tr>
            ) : visiblePromoUsageRows.length === 0 ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={14}>
                  No promo redemptions match that search yet.
                </td>
              </tr>
            ) : (
              visiblePromoUsageRows.map((usage) => (
                <tr key={usage.id} className="border-b border-border align-top last:border-b-0">
                  <td className="px-5 py-4 text-muted-foreground">{formatDate(usage.createdAt)}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{usage.customerName}</td>
                  <td className="px-5 py-4">
                    {usage.email ? (
                      <a className="break-words text-cajun hover:underline" href={`mailto:${usage.email}`}>
                        {usage.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-foreground">
                    <a className="hover:underline" href={`tel:${usage.phone}`}>
                      {usage.phone}
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-bold uppercase text-foreground">
                      {usage.promoCode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <p>{usage.promoSource ?? "Not provided"}</p>
                    <p className="mt-1 text-xs">{usage.promoCampaign ?? "No campaign"}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(usage.promoDiscount)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatCurrency(usage.subtotal)}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(usage.total)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{usage.paymentMethod === "stripe" ? "Stripe" : "Email"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {usage.status === "submitted" ? "Submitted" : "Checkout started"} / {formatLabel(getOrderFulfillmentStatus(usage))}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${
                        usage.customerType === "returning" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {usage.customerType}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{usage.salesperson || "Not provided"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {usage.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}
                  </td>
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
              <option value="mini-unfried">Mini Pies Unfried</option>
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
            {!isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={8}>
                  Unlock the portal to manage products.
                </td>
              </tr>
            ) : isUsingPassword && productResult === undefined ? (
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
            {!isUnlocked ? (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  Unlock the portal to review inventory.
                </td>
              </tr>
            ) : isUsingPassword && productResult === undefined ? (
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

  const fulfillmentColumns = fulfillmentStatusOptions.map((status) => ({
    status,
    label: formatLabel(status),
    orders: fulfillmentOrders.filter((order) => getOrderFulfillmentStatus(order) === status),
  }));
  const fulfillmentDueSoon = fulfillmentOrders.filter((order) => {
    if (!order.neededBy) {
      return false;
    }

    const dueAt = Date.parse(order.neededBy);
    return Number.isFinite(dueAt) && dueAt <= Date.now() + 48 * 60 * 60 * 1000 && getOrderFulfillmentStatus(order) !== "completed";
  }).length;
  const fulfillmentReadyCount = fulfillmentOrders.filter((order) => getOrderFulfillmentStatus(order) === "ready").length;
  const fulfillmentInKitchenCount = fulfillmentOrders.filter((order) => getOrderFulfillmentStatus(order) === "in_kitchen").length;

  const fulfillmentPanel = (
    <div className="space-y-6">
      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Fulfillment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Move orders from intake to kitchen, then mark them ready and completed.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-border bg-background p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Due Soon</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{isUnlocked ? fulfillmentDueSoon : "-"}</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">In Kitchen</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{isUnlocked ? fulfillmentInKitchenCount : "-"}</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Ready</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{isUnlocked ? fulfillmentReadyCount : "-"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1200px] gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {fulfillmentColumns.map((column) => (
              <section key={column.status} className="border border-border bg-card">
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-serif text-xl font-bold text-foreground">{column.label}</h3>
                    <span className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${getFulfillmentStatusTone(column.status)}`}>
                      {isUnlocked ? column.orders.length : "-"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{getFulfillmentStatusDescription(column.status)}</p>
                </div>
                <div className="space-y-3 p-3">
                  {!isUnlocked ? (
                    <p className="text-sm text-muted-foreground">Unlock the portal to review fulfillment.</p>
                  ) : column.orders.length === 0 ? (
                    <p className="rounded-[8px] border border-dashed border-border p-3 text-sm text-muted-foreground">
                      No orders in this stage.
                    </p>
                  ) : (
                    column.orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setSelectedFulfillmentOrderId(order.id);
                          setFulfillmentNotice(null);
                        }}
                        className={`w-full rounded-[8px] border p-3 text-left transition-colors ${
                          selectedFulfillmentOrder?.id === order.id
                            ? "border-cajun bg-cajun/5"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{order.customerName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(order.total)}</p>
                          </div>
                          <span className="rounded-[8px] bg-gold/20 px-2 py-1 text-[11px] font-bold uppercase text-foreground">
                            {formatLabel(getOrderFulfillmentMethod(order))}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} total item{order.items.length === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.neededBy ? `Needed by ${order.neededBy}` : "No target time yet"}
                        </p>
                        {order.assignedTo ? (
                          <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Owner: {order.assignedTo}</p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="border border-border bg-card p-5">
          {!selectedFulfillmentOrder ? (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <Truck className="mx-auto mb-3 text-muted-foreground" size={36} />
                <p className="font-semibold text-foreground">No order selected</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose an order from the board to plan fulfillment.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFulfillmentSubmit} className="space-y-5">
              <div className="border-b border-border pb-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">Fulfillment Detail</p>
                <h3 className="mt-2 font-serif text-3xl font-bold text-foreground">{selectedFulfillmentOrder.customerName}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-[8px] px-2 py-1 text-xs font-bold uppercase ${getFulfillmentStatusTone(getOrderFulfillmentStatus(selectedFulfillmentOrder))}`}>
                    {formatLabel(getOrderFulfillmentStatus(selectedFulfillmentOrder))}
                  </span>
                  <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                    {selectedFulfillmentOrder.paymentMethod === "stripe" ? "Stripe" : "Email"}
                  </span>
                  <span className="rounded-[8px] border border-border px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
                    {formatCurrency(selectedFulfillmentOrder.total)}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Stage
                  <select
                    value={fulfillmentForm.fulfillmentStatus}
                    onChange={(event) => updateFulfillmentForm("fulfillmentStatus", event.target.value)}
                    className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
                  >
                    {fulfillmentStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Fulfillment Type
                  <select
                    value={fulfillmentForm.fulfillmentMethod}
                    onChange={(event) => updateFulfillmentForm("fulfillmentMethod", event.target.value)}
                    className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
                  >
                    {fulfillmentMethodOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Needed By
                  <input
                    type="datetime-local"
                    value={fulfillmentForm.neededBy}
                    onChange={(event) => updateFulfillmentForm("neededBy", event.target.value)}
                    className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  Assigned To
                  <input
                    value={fulfillmentForm.assignedTo}
                    onChange={(event) => updateFulfillmentForm("assignedTo", event.target.value)}
                    placeholder="Mame, kitchen, driver, event team..."
                    className="rounded-[8px] border border-border bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
                  />
                </label>
              </div>

              <div className="rounded-[8px] border border-border bg-background p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Order Summary</p>
                <div className="mt-3 space-y-2 text-sm">
                  {selectedFulfillmentOrder.items.map((item) => (
                    <div key={`${selectedFulfillmentOrder.id}-${item.productId}`} className="flex items-center justify-between gap-3">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-semibold text-foreground">Qty {item.quantity}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Customer note: {selectedFulfillmentOrder.notes || "No customer note included."}
                </p>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                Internal Notes
                <textarea
                  value={fulfillmentForm.internalNotes}
                  onChange={(event) => updateFulfillmentForm("internalNotes", event.target.value)}
                  rows={6}
                  placeholder="Pickup instructions, packaging notes, follow-up reminders, allergies, event setup..."
                  className="rounded-[8px] border border-border bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-cajun/40"
                />
              </label>

              <div className="grid gap-3 text-sm text-muted-foreground">
                <p>
                  Created: <span className="font-semibold text-foreground">{formatDate(selectedFulfillmentOrder.createdAt)}</span>
                </p>
                <p>
                  Last update:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedFulfillmentOrder.lastFulfillmentUpdateAt
                      ? formatDate(selectedFulfillmentOrder.lastFulfillmentUpdateAt)
                      : "Not updated yet"}
                  </span>
                </p>
              </div>

              {fulfillmentNotice ? (
                <div className="rounded-[8px] border border-border bg-background px-4 py-3 text-sm text-foreground">
                  {fulfillmentNotice}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={fulfillmentSaving || !fallbackKey}
                  className="rounded-[8px] bg-cajun px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fulfillmentSaving ? "Saving..." : "Save Fulfillment Plan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage("orders");
                    setSelectedId(selectedFulfillmentOrder.id);
                  }}
                  className="rounded-[8px] border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Open Order Detail
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
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

    if (activePage === "promos") {
      return promosPanel;
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

    if (activePage === "fulfillment") {
      return fulfillmentPanel;
    }

    if (activePage === "reports") {
      return (
        <div className="space-y-6">
          {analyticsPanel}
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
        {analyticsPanel}
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
            <nav className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
              {adminNavItems.map((item) => (
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

const AdminPortalWithAuth = () => {
  const { getAccessToken, isLoading: authLoading, signIn, signOut, user } = useAuth();

  return (
    <AdminPortalContent
      getAccessToken={getAccessToken}
      authLoading={authLoading}
      signIn={signIn}
      signOut={signOut}
      user={user ? { email: user.email } : null}
    />
  );
};

const AdminPortalPasswordOnly = () => (
  <AdminPortalContent
    getAccessToken={async () => ""}
    authLoading={false}
    signIn={() => {}}
    signOut={() => {}}
    user={null}
  />
);

type WorkOSBoundaryProps = {
  children: ReactNode;
};

type WorkOSBoundaryState = {
  hasError: boolean;
};

class WorkOSBoundary extends Component<WorkOSBoundaryProps, WorkOSBoundaryState> {
  state: WorkOSBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WorkOS admin auth failed to render", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <AdminPortalPasswordOnly />;
    }

    return this.props.children;
  }
}

const Admin = () => {
  return <AdminPortalPasswordOnly />;
};

export default Admin;
