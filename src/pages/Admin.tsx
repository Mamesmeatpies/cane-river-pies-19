import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowLeft, Inbox, Lock, Mail, MessageSquare, PackageCheck, Phone, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
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

const ADMIN_KEY_STORAGE = "mames-admin-key";

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

const getStoredAdminKey = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
};

const Admin = () => {
  const [keyInput, setKeyInput] = useState(getStoredAdminKey);
  const [adminKey, setAdminKey] = useState(getStoredAdminKey);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contactResult = useQuery(
    api.contactMessages.listForAdmin,
    adminKey ? { adminKey, limit: 100 } : "skip"
  );
  const orderResult = useQuery(api.orders.listForAdmin, adminKey ? { adminKey, limit: 100 } : "skip");

  const access = contactResult?.access ?? orderResult?.access;
  const isLoading = Boolean(adminKey) && (!contactResult || !orderResult);
  const isUnlocked = access === "granted";

  const inboxItems = useMemo<InboxItem[]>(() => {
    const messages =
      contactResult?.messages.map((message: ContactMessage) => ({
        id: message._id,
        type: "message" as const,
        customerName: message.name,
        email: message.email,
        phone: message.phone,
        preview: message.message,
        body: message.message,
        createdAt: message.createdAt,
      })) ?? [];

    const orders =
      orderResult?.orders.map((order: Order) => ({
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

    return [...messages, ...orders].sort((a, b) => b.createdAt - a.createdAt);
  }, [contactResult?.messages, orderResult?.orders]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return inboxItems.filter((item) => {
      const matchesFilter = filter === "all" || item.type === filter;
      const matchesSearch =
        !normalizedSearch ||
        [item.customerName, item.email, item.phone, item.preview]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, inboxItems, search]);

  const activeItem = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;

  const messageCount = contactResult?.messages.length ?? 0;
  const orderCount = orderResult?.orders.length ?? 0;

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKey = keyInput.trim();

    if (trimmedKey) {
      window.localStorage.setItem(ADMIN_KEY_STORAGE, trimmedKey);
    }

    setAdminKey(trimmedKey);
  };

  const handleLock = () => {
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setKeyInput("");
    setSelectedId(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-cajun"
            >
              <ArrowLeft size={16} />
              Back to website
            </Link>
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-5xl">Admin Portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Customer messages, order inquiries, and direct message follow-ups in one place.
            </p>
          </div>
          {adminKey && (
            <button
              type="button"
              onClick={handleLock}
              className="w-fit rounded-[8px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Lock portal
            </button>
          )}
        </div>
      </header>

      {!adminKey ? (
        <section className="container mx-auto px-4 py-12">
          <form onSubmit={handleUnlock} className="mx-auto max-w-md space-y-5 border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-cajun/10 text-cajun">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold">Enter admin key</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Use the private key configured in Convex as <span className="font-semibold">ADMIN_PORTAL_KEY</span>.
              </p>
            </div>
            <input
              type="password"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              placeholder="Admin key"
              className="w-full rounded-[8px] border border-border bg-background px-4 py-3 text-foreground outline-none transition-all focus:ring-2 focus:ring-cajun/50"
            />
            <button
              type="submit"
              className="w-full rounded-[8px] bg-cajun px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
            >
              Open portal
            </button>
          </form>
        </section>
      ) : (
        <section className="container mx-auto px-4 py-8 md:py-10">
          {access === "missing" && (
            <div className="mb-6 border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
              Set <span className="font-semibold">ADMIN_PORTAL_KEY</span> in Convex before using the admin portal.
            </div>
          )}
          {access === "denied" && (
            <div className="mb-6 border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
              That admin key did not match. Try again or update the saved key.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
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
              <p className="mt-3 text-3xl font-bold">0</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
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
                ) : filter === "direct" ? (
                  <div className="p-5 text-sm leading-relaxed text-muted-foreground">
                    Direct social messages will appear here after an inbox integration is connected.
                  </div>
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
                          <p className="truncate text-sm text-muted-foreground">{item.email}</p>
                        </div>
                        <span className="shrink-0 rounded-[8px] bg-gold/20 px-2 py-1 text-xs font-semibold text-foreground">
                          {item.type === "message" ? "Message" : "Inquiry"}
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
                      <span className="rounded-[8px] bg-cajun/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cajun">
                        {activeItem.type === "message" ? "Customer Message" : "Order Inquiry"}
                      </span>
                      <h2 className="mt-3 font-serif text-3xl font-bold text-foreground">{activeItem.customerName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(activeItem.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${activeItem.email}`}
                        className="inline-flex items-center gap-2 rounded-[8px] bg-cajun px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
                      >
                        <Mail size={15} />
                        Email
                      </a>
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
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</dt>
                      <dd className="mt-1 break-words text-sm text-foreground">{activeItem.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone</dt>
                      <dd className="mt-1 text-sm text-foreground">{activeItem.phone || "Not provided"}</dd>
                    </div>
                  </dl>

                  {activeItem.type === "message" ? (
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
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
                            <p className="mt-1 text-sm font-semibold">
                              {activeItem.status === "submitted" ? "Submitted" : "Checkout started"}
                            </p>
                          </div>
                          <div className="border border-border bg-background p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment</p>
                            <p className="mt-1 text-sm font-semibold">
                              {activeItem.paymentMethod === "stripe" ? "Stripe" : "Email"}
                            </p>
                          </div>
                          <div className="border border-border bg-background p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</p>
                            <p className="mt-1 text-sm font-semibold">{formatCurrency(activeItem.total)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-serif text-xl font-bold">Items</h3>
                        <div className="mt-3 overflow-hidden border border-border">
                          {activeItem.items.map((item) => (
                            <div
                              key={item.productId}
                              className="grid gap-2 border-b border-border p-3 text-sm last:border-b-0 md:grid-cols-[1fr_auto_auto]"
                            >
                              <span className="font-semibold">{item.name}</span>
                              <span className="text-muted-foreground">Qty {item.quantity}</span>
                              <span>{formatCurrency(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-serif text-xl font-bold">Notes</h3>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {activeItem.notes || "No notes included."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          </div>
        </section>
      )}
    </main>
  );
};

export default Admin;
