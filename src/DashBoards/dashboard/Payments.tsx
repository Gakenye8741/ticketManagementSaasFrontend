import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  CreditCard, Search, X, Info, Eye, Ticket, Calendar, Wallet, Hash, CheckCircle2, Clock, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown, Compass, User, Mail, Phone, Receipt, Copy,
  Check, Smartphone, LayoutGrid, Table as TableIcon,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetPaymentsByUserIdQuery, type Payment, type PaymentStatus } from "../../features/APIS/PaymentApi";
// ⚠️ Adjust these two import paths/file names to match your project
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetBookingsByUserDigitalIdQuery } from "../../features/APIS/BookingsApi";
import usePageTitle from "../../hooks/usePageTitle";
import ModalShell from "../../components/ModalShell";

const CURRENCY = "KES";
const PAGE_SIZES = [6, 12, 24];

type StatusFilter = "all" | PaymentStatus;
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";
type ViewMode = "cards" | "table";

const toArray = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.payments) ? d.payments : Array.isArray(d?.events) ? d.events : Array.isArray(d?.bookings) ? d.bookings : [];
const idOf = (p: Payment) => Number(p.paymentId ?? p.id ?? 0);
const amountOf = (p: Payment) => Number(p.amount || 0);
const fmtMoney = (n: number) => `${CURRENCY} ${n.toLocaleString()}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

// Event objects can name their fields differently, so we check the common ones.
const eventIdOf = (e: any) => Number(e?.eventId ?? e?.id ?? 0);
const eventTitleOf = (e: any): string => e?.title ?? e?.eventName ?? e?.name ?? "";

const statusBadge = (s: PaymentStatus) =>
  s === "Completed" ? "badge-success text-success-content" : s === "Failed" ? "badge-error text-error-content" : "badge-warning text-warning-content";

const statusIcon = (s: PaymentStatus, size = 12) =>
  s === "Completed" ? <CheckCircle2 size={size} /> : s === "Failed" ? <XCircle size={size} /> : <Clock size={size} />;

export const MyPayments = () => {
  usePageTitle("My Payments");

  const user = useSelector((state: RootState) => state.auth.user) as any;
  const digitalId = user?.digitalId || user?.userId || "";

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  const paymentsQ = useGetPaymentsByUserIdQuery(digitalId, { skip: !digitalId });
  const payments: Payment[] = useMemo(() => toArray(paymentsQ.data), [paymentsQ.data]);

  // Bookings hold the eventId, events hold the name.
  const bookingsQ = useGetBookingsByUserDigitalIdQuery(digitalId, { skip: !digitalId });
  const eventsQ = useGetAllEventsQuery(undefined);

  const bookingToEventId = useMemo(() => {
    const m = new Map<number, number>();
    toArray(bookingsQ.data).forEach((b: any) => {
      if (b?.bookingId != null && b?.eventId != null) m.set(Number(b.bookingId), Number(b.eventId));
    });
    return m;
  }, [bookingsQ.data]);

  const eventNames = useMemo(() => {
    const m = new Map<number, string>();
    toArray(eventsQ.data).forEach((e: any) => {
      const t = eventTitleOf(e);
      if (t) m.set(eventIdOf(e), t);
    });
    return m;
  }, [eventsQ.data]);

  // Payment may already carry eventId; otherwise get it from its booking.
  const resolveEventId = (p: Payment): number | undefined => {
    const direct = p.eventId != null ? Number(p.eventId) : undefined;
    return direct || bookingToEventId.get(Number(p.bookingId));
  };
  const lookingUp = eventsQ.isLoading || bookingsQ.isLoading;
  const eventLabel = (p: Payment): string => {
    const id = resolveEventId(p);
    if (id && eventNames.has(id)) return eventNames.get(id)!;
    if (lookingUp) return "Loading event…";
    return id ? `Event #${id}` : "—";
  };

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  const count = (s: PaymentStatus) => payments.filter((p) => p.paymentStatus === s).length;
  const totalPaid = payments.filter((p) => p.paymentStatus === "Completed").reduce((sum, p) => sum + amountOf(p), 0);

  const methods = useMemo(() => Array.from(new Set(payments.map((p) => p.paymentMethod).filter(Boolean))) as string[], [payments]);

  // ---------------------------------------------------------------------------
  // FILTER + SORT + PAGINATION
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    const list = payments.filter((p) => {
      if (statusFilter !== "all" && p.paymentStatus !== statusFilter) return false;
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      const evId = resolveEventId(p);
      return (
        String(idOf(p)).includes(q) ||
        String(p.bookingId).includes(q) ||
        String(evId ?? "").includes(q) ||
        (evId ? (eventNames.get(evId) || "").toLowerCase().includes(q) : false) ||
        (p.transactionId || "").toLowerCase().includes(q) ||
        (p.paymentMethod || "").toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "amount_desc") return amountOf(b) - amountOf(a);
      if (sortKey === "amount_asc") return amountOf(a) - amountOf(b);
      const diff = +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      return sortKey === "oldest" ? diff || idOf(a) - idOf(b) : -diff || idOf(b) - idOf(a);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, search, statusFilter, methodFilter, sortKey, eventNames, bookingToEventId]);

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
  ];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.fullName || user?.name || "";

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
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
            <p className="text-[11px] text-base-content/60">Every payment you have made for your tickets</p>
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
                <b>Failed</b> if it did not go through. Open a payment to see its receipt details and your account information. If a payment
                failed, go back to your booking and try again.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInfoBanner(false)} className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center">
            Dismiss
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Payments", value: payments.length, icon: <CreditCard size={18} />, tone: "bg-primary/10 text-primary" },
          { label: "Completed", value: count("Completed"), icon: <CheckCircle2 size={18} />, tone: "bg-success/10 text-success" },
          { label: "Pending", value: count("Pending"), icon: <Clock size={18} />, tone: "bg-warning/10 text-warning" },
          { label: "Total Paid", value: fmtMoney(totalPaid), icon: <Wallet size={18} />, tone: "bg-primary/10 text-primary" },
        ].map((c) => (
          <div key={c.label} className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] text-base-content/60 font-semibold">{c.label}</span>
              <span className="text-base sm:text-lg font-black text-base-content truncate">{c.value}</span>
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
              placeholder="Search by event name, payment number, booking number or transaction code"
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

          {/* VIEW TOGGLE */}
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
              {paged.map((p, i) => (
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
                      <span className={`badge badge-sm font-bold shrink-0 gap-1 ${statusBadge(p.paymentStatus)}`}>
                        {statusIcon(p.paymentStatus, 10)}
                        {p.paymentStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                        <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                          <Smartphone size={10} /> Method
                        </span>
                        <span className="text-sm font-black text-base-content truncate">{p.paymentMethod || "—"}</span>
                      </div>
                      <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                        <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                          <Wallet size={10} /> Amount
                        </span>
                        <span className="text-sm font-black text-base-content truncate">{fmtMoney(amountOf(p))}</span>
                      </div>
                    </div>

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
              ))}
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
                    <th>Method</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Transaction code</th>
                    <th>Paid on</th>
                    <th className="text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr key={idOf(p)} onClick={() => setDetailPayment(p)} className="hover cursor-pointer">
                      <td className="font-bold text-base-content max-w-[14rem] truncate" title={eventLabel(p)}>
                        {eventLabel(p)}
                      </td>
                      <td>#{idOf(p)}</td>
                      <td>#{p.bookingId}</td>
                      <td>{p.paymentMethod || "—"}</td>
                      <td className="text-right font-bold whitespace-nowrap">{fmtMoney(amountOf(p))}</td>
                      <td>
                        <span className={`badge badge-sm font-bold gap-1 ${statusBadge(p.paymentStatus)}`}>
                          {statusIcon(p.paymentStatus, 10)}
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="max-w-[10rem] truncate text-base-content/60" title={p.transactionId}>
                        {p.transactionId || "—"}
                      </td>
                      <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setDetailPayment(p)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View payment">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
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
        {detailPayment && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/60 font-semibold">Status</span>
              <span className={`badge badge-sm font-bold gap-1 ${statusBadge(detailPayment.paymentStatus)}`}>
                {statusIcon(detailPayment.paymentStatus, 10)}
                {detailPayment.paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Event", value: eventLabel(detailPayment), icon: <Calendar size={11} />, wide: true },
                { label: "Amount", value: fmtMoney(amountOf(detailPayment)), icon: <Wallet size={11} /> },
                { label: "Method", value: detailPayment.paymentMethod || "—", icon: <Smartphone size={11} /> },
                { label: "Booking", value: `#${detailPayment.bookingId}`, icon: <Ticket size={11} /> },
                { label: "Paid on", value: fmtDateTime(detailPayment.createdAt), icon: <Clock size={11} /> },
                { label: "Last updated", value: fmtDateTime(detailPayment.updatedAt), icon: <Clock size={11} /> },
              ].map((f) => (
                <div key={f.label} className={`flex flex-col gap-0.5 min-w-0 ${f.wide ? "col-span-2" : ""}`}>
                  <span className="text-[11px] text-base-content/60 font-semibold flex items-center gap-1">
                    {f.icon} {f.label}
                  </span>
                  <span className="font-bold text-base-content break-words">{f.value}</span>
                </div>
              ))}
            </div>

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