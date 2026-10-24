import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  CreditCard, Search, X, Info, Eye, Ticket, Calendar, Wallet, Hash, CheckCircle2, Clock, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown, Compass, User, Mail, Phone, Receipt, Copy,
  Check, Smartphone, LayoutGrid, Table as TableIcon, RotateCcw, Banknote, ShoppingBag, Tag,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetPaymentsByUserIdQuery, type Payment, type PaymentStatus } from "../../features/APIS/PaymentApi";
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetBookingsByUserDigitalIdQuery } from "../../features/APIS/BookingsApi";
import usePageTitle from "../../hooks/usePageTitle";
import ModalShell from "../../components/ModalShell";

const CURRENCY = "KES";
const PAGE_SIZES = [6, 12, 24];

type StatusFilter = "all" | PaymentStatus | "Refunds";
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";
type ViewMode = "cards" | "table";
type RefundState = "none" | "requested" | "refunded" | "declined";

const toArray = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.payments) ? d.payments : Array.isArray(d?.events) ? d.events : Array.isArray(d?.bookings) ? d.bookings : [];
const idOf = (p: Payment) => Number(p.paymentId ?? p.id ?? 0);
const norm = (s: any) => String(s ?? "").toLowerCase().trim();
const fmtMoney = (n: number) => `${CURRENCY} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

// ---------------------------------------------------------------------------
// MONEY
// ---------------------------------------------------------------------------
const ticketAmountOf = (p: Payment) => Number(p.amount || 0);
const serviceFeeOf = (p: Payment) => Number((p as any).serviceFee ?? 0) || 0;
const totalPaidOf = (p: Payment) => {
  const t = Number((p as any).totalCharged ?? 0) || 0;
  return t > 0 ? t : ticketAmountOf(p) + serviceFeeOf(p);
};
const feePercentOf = (p: Payment): number | null => {
  const raw = (p as any).serviceFeePercent;
  return raw !== null && raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
};

// ---------------------------------------------------------------------------
// CART LINES (from the booking, via payment.bookingId)
// ---------------------------------------------------------------------------
type CartLine = { ticketTypeId: number; name: string; quantity: number; unitPrice: number; lineTotal: number };

const cartItemsOfBooking = (booking: any): CartLine[] => {
  if (!booking) return [];
  const items = Array.isArray(booking.items) ? booking.items : [];
  if (items.length > 0) {
    return items.map((it: any) => ({
      ticketTypeId: Number(it.ticketTypeId ?? 0),
      name: String(it.ticketTypeName ?? it.name ?? "Ticket"),
      quantity: Number(it.quantity ?? 0),
      unitPrice: Number(it.unitPrice ?? 0),
      lineTotal: Number(it.lineTotal ?? 0),
    }));
  }
  // Legacy fallback
  if (booking.quantity || booking.totalAmount) {
    return [{
      ticketTypeId: Number(booking.ticketTypeId ?? 0),
      name: String(booking.ticketTypeName ?? "Ticket"),
      quantity: Number(booking.quantity ?? 0),
      unitPrice: Number(booking.totalAmount ?? 0) / Math.max(1, Number(booking.quantity ?? 1)),
      lineTotal: Number(booking.totalAmount ?? 0),
    }];
  }
  return [];
};

// ---------------------------------------------------------------------------
// REFUNDS
// ---------------------------------------------------------------------------
const refundStateOfStatus = (s: any): RefundState => {
  const v = norm(s);
  if (!v) return "none";
  if (["processed", "completed", "refunded", "success", "succeeded", "paid"].includes(v)) return "refunded";
  if (["rejected", "declined", "failed", "cancelled", "canceled", "denied"].includes(v)) return "declined";
  return "requested";
};

const refundInfoOf = (p: Payment, booking?: any) => {
  const raw: any[] = Array.isArray((p as any).refunds) ? (p as any).refunds : [];
  const list = raw.map((r) => {
    const status = String(r?.status ?? r?.refundStatus ?? "");
    return {
      id: r?.refundId ?? r?.id,
      amount: Number(r?.amount ?? 0) || 0,
      status,
      state: refundStateOfStatus(status),
      reason: String(r?.reason ?? ""),
      date: r?.processedAt ?? r?.updatedAt ?? r?.createdAt ?? r?.requestedAt,
    };
  });

  const refundedAmount = list.filter((r) => r.state === "refunded").reduce((s, r) => s + r.amount, 0);
  const pendingAmount = list.filter((r) => r.state === "requested").reduce((s, r) => s + r.amount, 0);

  let state: RefundState = "none";
  if (list.some((r) => r.state === "refunded")) state = "refunded";
  else if (list.some((r) => r.state === "requested")) state = "requested";
  else if (list.some((r) => r.state === "declined")) state = "declined";
  else {
    const tickets: any[] | null = Array.isArray(booking?.tickets) ? booking.tickets : null;
    if (norm(p.paymentStatus).includes("refund")) state = "refunded";
    else if (
      booking &&
      (norm(booking.bookingStatus) === "refunded" || (tickets && tickets.length > 0 && tickets.every((t) => t?.lifecycleStatus === "Refunded")))
    ) {
      state = "refunded";
    }
  }

  const partial = state === "refunded" && refundedAmount > 0 && refundedAmount + 0.01 < ticketAmountOf(p);
  return { state, list, refundedAmount, pendingAmount, partial };
};
type RefundInfo = ReturnType<typeof refundInfoOf>;

const displayStatus = (p: Payment, info: RefundInfo): string =>
  info.state === "refunded" ? (info.partial ? "Partially refunded" : "Refunded") : info.state === "requested" ? "Refund requested" : p.paymentStatus;

const eventIdOf = (e: any) => Number(e?.eventId ?? e?.id ?? 0);
const eventTitleOf = (e: any): string => e?.title ?? e?.eventName ?? e?.name ?? "";

const statusBadge = (s: string) =>
  s === "Completed"
    ? "badge-success text-success-content"
    : s === "Failed"
    ? "badge-error text-error-content"
    : s === "Refunded" || s === "Partially refunded"
    ? "badge-info text-info-content"
    : "badge-warning text-warning-content";

const statusIcon = (s: string, size = 12) =>
  s === "Completed" ? (
    <CheckCircle2 size={size} />
  ) : s === "Failed" ? (
    <XCircle size={size} />
  ) : s === "Refunded" || s === "Partially refunded" || s === "Refund requested" ? (
    <RotateCcw size={size} />
  ) : (
    <Clock size={size} />
  );

const refundEntryBadge = (state: RefundState) =>
  state === "refunded" ? "badge-info text-info-content" : state === "declined" ? "badge-error text-error-content" : "badge-warning text-warning-content";

// 🆕 Compact cart lines for card + table + modal
const CartLinesPreview = ({ booking }: { booking: any }) => {
  const lines = cartItemsOfBooking(booking);
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => (
        <div key={`${line.ticketTypeId}-${i}`} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="min-w-0 truncate">
            <span className="font-bold text-base-content">{line.quantity}×</span>{" "}
            <span className="text-base-content/80">{line.name}</span>
          </span>
          <span className="shrink-0 font-bold text-base-content/70 whitespace-nowrap">{fmtMoney(line.lineTotal)}</span>
        </div>
      ))}
    </div>
  );
};

export const MyPayments = () => {
  usePageTitle("My Payments");

  const user = useSelector((state: RootState) => state.auth.user) as any;
  const digitalId = user?.digitalId || user?.userId || "";

  const paymentsQ = useGetPaymentsByUserIdQuery(digitalId, { skip: !digitalId, refetchOnMountOrArgChange: true });
  const payments: Payment[] = useMemo(() => toArray(paymentsQ.data), [paymentsQ.data]);

  const bookingsQ = useGetBookingsByUserDigitalIdQuery(digitalId, { skip: !digitalId, refetchOnMountOrArgChange: true });
  const eventsQ = useGetAllEventsQuery(undefined);

  const bookingById = useMemo(() => {
    const m = new Map<number, any>();
    toArray(bookingsQ.data).forEach((b: any) => {
      if (b?.bookingId != null) m.set(Number(b.bookingId), b);
    });
    return m;
  }, [bookingsQ.data]);

  const bookingToEventId = useMemo(() => {
    const m = new Map<number, number>();
    bookingById.forEach((b, id) => {
      if (b?.eventId != null) m.set(id, Number(b.eventId));
    });
    return m;
  }, [bookingById]);

  const eventNames = useMemo(() => {
    const m = new Map<number, string>();
    toArray(eventsQ.data).forEach((e: any) => {
      const t = eventTitleOf(e);
      if (t) m.set(eventIdOf(e), t);
    });
    return m;
  }, [eventsQ.data]);

  const refundInfos = useMemo(() => {
    const m = new Map<number, RefundInfo>();
    payments.forEach((p) => m.set(idOf(p), refundInfoOf(p, bookingById.get(Number(p.bookingId)))));
    return m;
  }, [payments, bookingById]);
  const infoOf = (p: Payment): RefundInfo => refundInfos.get(idOf(p)) ?? refundInfoOf(p, bookingById.get(Number(p.bookingId)));

  const resolveEventId = (p: Payment): number | undefined => {
    const direct = p.eventId != null ? Number(p.eventId) : undefined;
    return direct || bookingToEventId.get(Number(p.bookingId));
  };
  const lookingUp = eventsQ.isLoading || bookingsQ.isLoading;
  const eventLabel = (p: Payment): string => {
    const id = resolveEventId(p);
    if (id && eventNames.has(id)) return eventNames.get(id)!;
    const fromBooking = bookingById.get(Number(p.bookingId))?.event?.title;
    if (fromBooking) return fromBooking;
    if (lookingUp) return "Loading event…";
    return id ? `Event #${id}` : "—";
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard not available */
    }
  };

  const count = (s: PaymentStatus) => payments.filter((p) => p.paymentStatus === s).length;
  const refundCount = payments.filter((p) => infoOf(p).state !== "none").length;
  const totalPaid = payments.filter((p) => p.paymentStatus === "Completed").reduce((sum, p) => sum + totalPaidOf(p), 0);
  const totalRefunded = payments.reduce((sum, p) => sum + infoOf(p).refundedAmount, 0);
  const netPaid = Math.max(0, totalPaid - totalRefunded);

  const methods = useMemo(() => Array.from(new Set(payments.map((p) => p.paymentMethod).filter(Boolean))) as string[], [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    const list = payments.filter((p) => {
      if (statusFilter === "Refunds") {
        if (infoOf(p).state === "none") return false;
      } else if (statusFilter !== "all" && p.paymentStatus !== statusFilter) return false;
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      const evId = resolveEventId(p);
      const booking = bookingById.get(Number(p.bookingId));
      const cartNames = cartItemsOfBooking(booking).map((l) => l.name.toLowerCase()).join(" ");
      return (
        String(idOf(p)).includes(q) ||
        String(p.bookingId).includes(q) ||
        String(evId ?? "").includes(q) ||
        (evId ? (eventNames.get(evId) || "").toLowerCase().includes(q) : false) ||
        (p.transactionId || "").toLowerCase().includes(q) ||
        (p.paymentMethod || "").toLowerCase().includes(q) ||
        cartNames.includes(q) ||
        displayStatus(p, infoOf(p)).toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "amount_desc") return totalPaidOf(b) - totalPaidOf(a);
      if (sortKey === "amount_asc") return totalPaidOf(a) - totalPaidOf(b);
      const diff = +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      return sortKey === "oldest" ? diff || idOf(a) - idOf(b) : -diff || idOf(b) - idOf(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, search, statusFilter, methodFilter, sortKey, eventNames, bookingToEventId, refundInfos, bookingById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setPage(1);
  };

  const statusTabs: { key: StatusFilter; label: string; total: number }[] = [
    { key: "all", label: "All", total: payments.length },
    { key: "Completed", label: "Completed", total: count("Completed") },
    { key: "Pending", label: "Pending", total: count("Pending") },
    { key: "Failed", label: "Failed", total: count("Failed") },
    { key: "Refunds", label: "Refunds", total: refundCount },
  ];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.fullName || user?.name || "";

  const detailInfo = detailPayment ? infoOf(detailPayment) : null;
  const detailStatus = detailPayment && detailInfo ? displayStatus(detailPayment, detailInfo) : "";
  const detailBooking = detailPayment ? bookingById.get(Number(detailPayment.bookingId)) : null;
  const detailLines = cartItemsOfBooking(detailBooking);

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <CreditCard size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">My Payments</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Member</span>
            </div>
            <p className="text-[11px] text-base-content/60">Every payment you have made for your tickets, and any refunds</p>
          </div>
        </div>
        <Link to="/" className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm w-full sm:w-auto">
          <Compass size={14} />
          <span>Explore Events</span>
        </Link>
      </div>

      {/* GUIDE */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">Payments Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                A payment is <b>Pending</b> while we wait for the payment provider to confirm it, <b>Completed</b> once the money is received, and{" "}
                <b>Failed</b> if it did not go through. Each payment is the ticket price plus a small service fee that helps us run and maintain the app.
                When a booking has several ticket types (for example Comrade + Regular + VIP), the payment covers all of them — open the payment to see
                each line in the receipt. When you ask for a refund, the payment shows <b>Refund requested</b> while the organizer reviews it, then{" "}
                <b>Refunded</b> once the money is sent back.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInfoBanner(false)} className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center">
            Dismiss
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Payments", value: payments.length, icon: <CreditCard size={18} />, tone: "bg-primary/10 text-primary" },
          { label: "Completed", value: count("Completed"), icon: <CheckCircle2 size={18} />, tone: "bg-success/10 text-success" },
          { label: "Pending", value: count("Pending"), icon: <Clock size={18} />, tone: "bg-warning/10 text-warning" },
          { label: "Refunds", value: refundCount, icon: <RotateCcw size={18} />, tone: "bg-info/10 text-info" },
          { label: totalRefunded > 0 ? "Net Paid" : "Total Paid", value: fmtMoney(totalRefunded > 0 ? netPaid : totalPaid), icon: <Wallet size={18} />, tone: "bg-primary/10 text-primary" },
        ].map((c, i, arr) => (
          <div
            key={c.label}
            className={`bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 min-w-0 ${
              i === arr.length - 1 ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] text-base-content/60 font-semibold">{c.label}</span>
              <span className="text-base sm:text-lg font-black text-base-content truncate">{c.value}</span>
              {c.label === "Net Paid" && <span className="text-[10px] text-base-content/50 truncate">after {fmtMoney(totalRefunded)} refunded</span>}
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${c.tone}`}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 flex-1 text-xs">
            <Search size={14} className="text-base-content/40" />
            <input
              type="text"
              placeholder="Search by event, ticket type, payment number or transaction code"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="grow"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[10px] font-bold text-primary shrink-0">
                Clear
              </button>
            )}
          </label>

          <label className="flex items-center gap-2">
            <Smartphone size={13} className="text-base-content/40 shrink-0" />
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold w-full"
            >
              <option value="all">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <ArrowUpDown size={13} className="text-base-content/40 shrink-0" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold w-full"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setStatusFilter(t.key);
                  setPage(1);
                }}
                aria-pressed={statusFilter === t.key}
                className={`btn btn-xs rounded-xl gap-1.5 font-bold ${statusFilter === t.key ? "btn-primary" : "btn-ghost bg-base-200"}`}
              >
                {t.label}
                <span className="opacity-70">{t.total}</span>
              </button>
            ))}
          </div>

          <div className="join" role="group" aria-label="Choose how payments are shown">
            <button
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
              className={`btn btn-xs join-item gap-1.5 font-bold ${viewMode === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
            >
              <LayoutGrid size={13} /> Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              className={`btn btn-xs join-item gap-1.5 font-bold ${viewMode === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
            >
              <TableIcon size={13} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENTS */}
      {!digitalId ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>We couldn't find your account. Please sign in again.</span>
        </div>
      ) : paymentsQ.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : paymentsQ.isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span className="flex-1">Failed to load your payments.</span>
          <button onClick={() => paymentsQ.refetch()} className="btn btn-ghost btn-xs">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <CreditCard size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">{payments.length === 0 ? "No Payments Yet" : "No Matching Payments"}</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
            {payments.length === 0 ? "When you pay for a booking, the payment will show up here." : "Try a different search, method or status."}
          </p>
          {payments.length === 0 ? (
            <Link to="/" className="btn btn-primary btn-xs rounded-xl font-bold">
              Explore Events
            </Link>
          ) : (
            <button onClick={resetFilters} className="btn btn-ghost btn-xs bg-base-200 rounded-xl font-bold">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-[11px] text-base-content/60">
            <span className="font-bold text-base-content">{filtered.length}</span> {filtered.length === 1 ? "payment" : "payments"}
            {filtered.length !== payments.length && <> (filtered from {payments.length})</>}
          </p>

          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((p, i) => {
                const info = infoOf(p);
                const status = displayStatus(p, info);
                const fee = serviceFeeOf(p);
                const booking = bookingById.get(Number(p.bookingId));
                const cartLines = cartItemsOfBooking(booking);
                return (
                  <motion.div
                    key={`${safePage}-${idOf(p)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailPayment(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailPayment(p);
                      }
                    }}
                    className="group bg-base-100 border border-base-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40" />
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                            <Receipt size={18} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="text-sm font-black text-base-content truncate group-hover:text-primary transition-colors" title={eventLabel(p)}>
                              {eventLabel(p)}
                            </h3>
                            <span className="text-[11px] text-base-content/60 truncate">
                              Payment #{idOf(p)} · Booking #{p.bookingId}
                            </span>
                          </div>
                        </div>
                        <span className={`badge badge-sm font-bold shrink-0 gap-1 ${statusBadge(status)}`}>
                          {statusIcon(status, 10)}
                          {status}
                        </span>
                      </div>

                      {/* 🆕 cart lines */}
                      {cartLines.length > 0 && (
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col gap-1">
                          <span className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <ShoppingBag size={10} /> Order
                          </span>
                          <CartLinesPreview booking={booking} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Smartphone size={10} /> Method
                          </span>
                          <span className="text-sm font-black text-base-content truncate">{p.paymentMethod || "—"}</span>
                        </div>
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Wallet size={10} /> Total paid
                          </span>
                          <span className="text-sm font-black text-base-content truncate">{fmtMoney(totalPaidOf(p))}</span>
                        </div>
                      </div>

                      {fee > 0 && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-[11px]">
                          <span className="text-base-content/60 truncate">Tickets {fmtMoney(ticketAmountOf(p))} + service fee</span>
                          <span className="font-bold text-primary whitespace-nowrap">{fmtMoney(fee)}</span>
                        </div>
                      )}

                      {info.state !== "none" && (
                        <div
                          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${
                            info.state === "refunded"
                              ? "bg-info/10 border-info/30 text-base-content/80"
                              : info.state === "declined"
                              ? "bg-error/10 border-error/30 text-base-content/80"
                              : "bg-warning/10 border-warning/30 text-base-content/80"
                          }`}
                        >
                          <RotateCcw size={12} className="shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            {info.state === "refunded" &&
                              (info.refundedAmount > 0
                                ? `${info.partial ? "Partly refunded" : "Refunded"}: ${fmtMoney(info.refundedAmount)}`
                                : "This payment was refunded.")}
                            {info.state === "requested" &&
                              `Refund requested${info.pendingAmount > 0 ? ` (${fmtMoney(info.pendingAmount)})` : ""}. Waiting for the organizer's review.`}
                            {info.state === "declined" && "Your refund request was declined."}
                          </span>
                        </div>
                      )}

                      {p.transactionId && (
                        <span className="text-[10px] text-base-content/50 flex items-center gap-1 truncate">
                          <Hash size={10} className="shrink-0" /> <span className="truncate">{p.transactionId}</span>
                        </span>
                      )}
                    </div>

                    <div className="px-3 py-2 flex items-center justify-between border-t border-base-200 bg-base-200/20">
                      <span className="text-[10px] text-base-content/40 truncate pr-2">Paid {fmtDate(p.createdAt)}</span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setDetailPayment(p)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View payment">
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-x-auto">
              <table className="table table-sm w-full text-xs">
                <thead>
                  <tr className="text-base-content/60">
                    <th>Event</th>
                    <th>Payment</th>
                    <th>Booking</th>
                    <th>Ticket types</th>
                    <th>Method</th>
                    <th className="text-right">Ticket price</th>
                    <th className="text-right">Service fee</th>
                    <th className="text-right">Total paid</th>
                    <th className="text-right">Refunded</th>
                    <th>Status</th>
                    <th>Paid on</th>
                    <th className="text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => {
                    const info = infoOf(p);
                    const status = displayStatus(p, info);
                    const fee = serviceFeeOf(p);
                    const booking = bookingById.get(Number(p.bookingId));
                    const cartLines = cartItemsOfBooking(booking);
                    return (
                      <tr key={idOf(p)} onClick={() => setDetailPayment(p)} className="hover cursor-pointer">
                        <td className="font-bold text-base-content max-w-[14rem] truncate" title={eventLabel(p)}>
                          {eventLabel(p)}
                        </td>
                        <td>#{idOf(p)}</td>
                        <td>#{p.bookingId}</td>
                        <td className="max-w-[14rem]">
                          {cartLines.length === 0 ? (
                            "—"
                          ) : cartLines.length === 1 ? (
                            <span className="truncate">{cartLines[0].name}</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {cartLines.slice(0, 3).map((l, i) => (
                                <span key={i} className="truncate text-[11px]">
                                  {l.quantity}× {l.name}
                                </span>
                              ))}
                              {cartLines.length > 3 && <span className="text-[10px] text-base-content/40">+{cartLines.length - 3} more</span>}
                            </div>
                          )}
                        </td>
                        <td>{p.paymentMethod || "—"}</td>
                        <td className="text-right whitespace-nowrap">{fmtMoney(ticketAmountOf(p))}</td>
                        <td className="text-right whitespace-nowrap">{fee > 0 ? fmtMoney(fee) : "—"}</td>
                        <td className="text-right font-bold whitespace-nowrap">{fmtMoney(totalPaidOf(p))}</td>
                        <td className="text-right whitespace-nowrap">{info.refundedAmount > 0 ? fmtMoney(info.refundedAmount) : "—"}</td>
                        <td>
                          <span className={`badge badge-sm font-bold gap-1 whitespace-nowrap ${statusBadge(status)}`}>
                            {statusIcon(status, 10)}
                            {status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setDetailPayment(p)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View payment">
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-base-100 border border-base-200 rounded-2xl shadow-sm px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-base-content/60">
              <span>
                Showing{" "}
                <span className="font-bold text-base-content">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-bold text-base-content">{filtered.length}</span>
              </span>
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="select select-bordered select-xs rounded-lg font-semibold"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {totalPages > 1 && (
              <div className="join">
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="btn btn-xs join-item" aria-label="Previous page">
                  <ChevronLeft size={14} />
                </button>
                <button className="btn btn-xs join-item btn-primary no-animation" aria-current="page">
                  {safePage} / {totalPages}
                </button>
                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="btn btn-xs join-item" aria-label="Next page">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL: PAYMENT DETAILS */}
      <ModalShell
        open={!!detailPayment}
        onClose={() => setDetailPayment(null)}
        icon={<Receipt size={16} />}
        title={detailPayment ? `Payment #${idOf(detailPayment)}` : ""}
        footer={
          <div className="flex justify-end">
            <button onClick={() => setDetailPayment(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-full sm:w-auto">
              Close
            </button>
          </div>
        }
      >
        {detailPayment && detailInfo && (
          <div className="flex flex-col gap-4">
            {/* Summary row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/60 font-semibold">Status</span>
              <span className={`badge badge-sm font-bold gap-1 ${statusBadge(detailStatus)}`}>
                {statusIcon(detailStatus, 10)}
                {detailStatus}
              </span>
            </div>

            {/* Event header block */}
            <div className="rounded-2xl border border-base-200 bg-base-200/30 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-sm text-base-content break-words">{eventLabel(detailPayment)}</span>
                  {detailBooking?.event?.category && (
                    <span className="text-[11px] text-base-content/50 capitalize">{detailBooking.event.category}</span>
                  )}
                </div>
              </div>
              {detailBooking?.event?.date && (
                <span className="flex items-center gap-2 text-xs text-base-content/80">
                  <Clock size={12} className="text-primary shrink-0" />
                  {new Date(`${detailBooking.event.date}T${detailBooking.event.time || "00:00:00"}`).toLocaleString(undefined, {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </span>
              )}
              {detailBooking?.event?.venue?.name && (
                <span className="flex items-start gap-2 text-xs text-base-content/80">
                  <Ticket size={12} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-base-content">{detailBooking.event.venue.name}</span>
                    {detailBooking.event.venue.address ? `, ${detailBooking.event.venue.address}` : ""}
                  </span>
                </span>
              )}
            </div>

            {/* 🆕 ORDER DETAILS — every ticket type in this payment */}
            {detailLines.length > 0 && (
              <div className="rounded-2xl border border-base-200 overflow-hidden">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/50">
                  <span className="flex items-center gap-2">
                    <ShoppingBag size={14} className="text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Order details</span>
                  </span>
                  <span className="text-[11px] font-bold text-base-content/60">
                    {detailLines.reduce((s, l) => s + l.quantity, 0)} tickets
                  </span>
                </div>
                <ul className="divide-y divide-base-200">
                  {detailLines.map((line, i) => (
                    <li key={`${line.ticketTypeId}-${i}`} className="px-3.5 py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-black text-[11px] shrink-0">
                          {line.quantity}×
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-base-content truncate">{line.name}</span>
                          <span className="text-[10px] text-base-content/50">
                            {fmtMoney(line.unitPrice)} each
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-base-content whitespace-nowrap">{fmtMoney(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Booking facts */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Payment", value: `#${idOf(detailPayment)}`, icon: <Hash size={11} /> },
                { label: "Booking", value: `#${detailPayment.bookingId}`, icon: <Ticket size={11} /> },
                { label: "Method", value: detailPayment.paymentMethod || "—", icon: <Smartphone size={11} /> },
                { label: "Paid on", value: fmtDateTime(detailPayment.createdAt), icon: <Clock size={11} /> },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold flex items-center gap-1">
                    {f.icon} {f.label}
                  </span>
                  <span className="font-bold text-base-content break-words">{f.value}</span>
                </div>
              ))}
            </div>

            {/* PRICE BREAKDOWN */}
            <div className="rounded-2xl border border-base-200 bg-base-200/30 overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-base-200 bg-base-200/50">
                <Receipt size={14} className="text-primary" />
                <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Price breakdown</span>
              </div>
              <div className="p-3.5 flex flex-col gap-2 text-xs">
                {detailLines.length > 1 ? (
                  <div className="flex flex-col gap-1.5">
                    {detailLines.map((line, i) => (
                      <div key={`${line.ticketTypeId}-${i}`} className="flex items-center justify-between gap-3">
                        <span className="text-base-content/70 min-w-0 truncate">
                          {line.name} <span className="text-base-content/40">× {line.quantity}</span>
                        </span>
                        <span className="font-bold text-base-content whitespace-nowrap">{fmtMoney(line.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base-content/70">Tickets</span>
                    <span className="font-bold text-base-content whitespace-nowrap">{fmtMoney(ticketAmountOf(detailPayment))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base-content/70">
                    Service fee
                    {feePercentOf(detailPayment) !== null && serviceFeeOf(detailPayment) > 0 && (
                      <span className="text-base-content/40"> ({Number(feePercentOf(detailPayment)!.toFixed(2))}%)</span>
                    )}
                  </span>
                  <span className="font-bold text-base-content whitespace-nowrap">
                    {serviceFeeOf(detailPayment) > 0 ? fmtMoney(serviceFeeOf(detailPayment)) : "None"}
                  </span>
                </div>
                <div className="border-t border-dashed border-base-300 my-0.5" />
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-base-content">Total paid</span>
                  <span className="text-base font-black text-primary whitespace-nowrap">{fmtMoney(totalPaidOf(detailPayment))}</span>
                </div>
              </div>
              {serviceFeeOf(detailPayment) > 0 && (
                <div className="px-3.5 py-3 flex items-start gap-2.5 bg-primary/5 border-t border-primary/15">
                  <Info size={14} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-base-content/70">
                    <span className="font-bold text-base-content">Why a service fee?</span> It is added on top of the ticket price and goes towards running and
                    maintaining the app.
                  </p>
                </div>
              )}
            </div>

            {/* REFUND */}
            {detailInfo.state !== "none" && (
              <div className="rounded-2xl border border-base-200 overflow-hidden">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/50">
                  <span className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Refund</span>
                  </span>
                  <span className={`badge badge-sm font-bold ${refundEntryBadge(detailInfo.state)}`}>
                    {detailInfo.state === "refunded" ? (detailInfo.partial ? "Partially refunded" : "Refunded") : detailInfo.state === "declined" ? "Declined" : "In review"}
                  </span>
                </div>

                <div className="p-3.5 flex flex-col gap-3 text-xs">
                  {detailInfo.state === "requested" && (
                    <p className="text-base-content/70 leading-relaxed">
                      Your refund request is waiting for the organizer's review. Approved refunds are normally sent within 14 business days, but the time they
                      take to arrive depends on the payment provider.
                    </p>
                  )}
                  {detailInfo.state === "refunded" && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-info/10 p-3">
                      <span className="flex items-center gap-1.5 text-base-content/70">
                        <Banknote size={13} className="text-info" /> Refunded to you
                      </span>
                      <span className="font-black text-base-content whitespace-nowrap">
                        {detailInfo.refundedAmount > 0 ? fmtMoney(detailInfo.refundedAmount) : "Amount not available"}
                      </span>
                    </div>
                  )}
                  {detailInfo.state === "declined" && (
                    <p className="text-base-content/70 leading-relaxed">
                      Your refund request was declined. If you think this is a mistake, contact support with your payment number #{idOf(detailPayment)}.
                    </p>
                  )}

                  {detailInfo.list.length > 0 && (
                    <ul className="flex flex-col divide-y divide-base-200 rounded-xl border border-base-200">
                      {detailInfo.list.map((r, i) => (
                        <li key={r.id ?? i} className="p-2.5 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-base-content">{r.amount > 0 ? fmtMoney(r.amount) : "Refund"}</span>
                            <span className={`badge badge-xs font-bold ${refundEntryBadge(r.state)}`}>{r.status || "Pending"}</span>
                          </div>
                          {r.reason && <span className="text-[11px] text-base-content/60 leading-relaxed break-words">Reason: {r.reason}</span>}
                          {r.date && <span className="text-[10px] text-base-content/40">{fmtDateTime(r.date)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* TRANSACTION */}
            <div className="flex flex-col gap-2 border-t border-base-200 pt-3 text-xs">
              <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Transaction</span>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-base-200/50 p-2.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-base-content/50 font-semibold">Transaction code</span>
                  <span className="font-bold text-base-content break-all">{detailPayment.transactionId || "Not available yet"}</span>
                </div>
                {detailPayment.transactionId && (
                  <button
                    onClick={() => copyText(detailPayment.transactionId)}
                    className="btn btn-ghost btn-xs btn-square rounded-lg text-primary hover:bg-primary/10 shrink-0"
                    title="Copy transaction code"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              {detailPayment.resultDesc && (
                <div
                  className={`rounded-xl p-2.5 flex flex-col gap-0.5 ${
                    detailPayment.paymentStatus === "Failed" ? "bg-error/10 text-error" : "bg-base-200/50 text-base-content/80"
                  }`}
                >
                  <span className="text-[10px] font-semibold opacity-70">
                    Provider message{detailPayment.resultCode ? ` (code ${detailPayment.resultCode})` : ""}
                  </span>
                  <span className="font-semibold leading-relaxed">{detailPayment.resultDesc}</span>
                </div>
              )}
            </div>

            {/* USER DETAILS */}
            <div className="flex flex-col gap-2 border-t border-base-200 pt-3 text-xs">
              <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Paid by</span>
              <span className="flex items-center gap-2 font-bold text-base-content">
                <User size={12} className="text-primary" /> {fullName || "Your account"}
              </span>
              {user?.email && (
                <span className="flex items-center gap-2 text-base-content/80 break-all">
                  <Mail size={12} className="text-primary shrink-0" /> {user.email}
                </span>
              )}
              {(user?.phone || user?.phoneNumber) && (
                <span className="flex items-center gap-2 text-base-content/80">
                  <Phone size={12} className="text-primary shrink-0" /> {user.phone || user.phoneNumber}
                </span>
              )}
              <span className="flex items-center gap-2 text-base-content/60">
                <Hash size={12} className="text-primary shrink-0" /> Account ID {detailPayment.digitalId ?? digitalId}
              </span>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default MyPayments;