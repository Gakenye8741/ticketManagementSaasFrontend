import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  X,
  Info,
  Eye,
  Ticket,
  Calendar,
  Wallet,
  Hash,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Ban,
  Compass,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetBookingsByUserDigitalIdQuery,
  useCancelBookingMutation,
  type Booking,
} from "../../features/APIS/BookingsApi";
import usePageTitle from "../../hooks/usePageTitle";

// Change this if your tickets are sold in another currency.
const CURRENCY = "KES";
const PAGE_SIZES = [6, 12, 24];

type StatusFilter = "all" | "Pending" | "Confirmed" | "Cancelled";
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";

const toArray = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.bookings) ? d.bookings : []);
const amountOf = (b: Booking) => Number(b.totalAmount || 0);
const fmtMoney = (n: number) => `${CURRENCY} ${n.toLocaleString()}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const canCancel = (b: Booking) => b.bookingStatus === "Pending" || b.bookingStatus === "Confirmed";

const statusBadge = (s: Booking["bookingStatus"]) =>
  s === "Confirmed"
    ? "badge-success text-success-content"
    : s === "Cancelled"
    ? "badge-error text-error-content"
    : "badge-warning text-warning-content";

const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
const modalMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
};

export const MyBookings = () => {
  usePageTitle("My Bookings");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = user?.digitalId || user?.userId || "";

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  const bookingsQ = useGetBookingsByUserDigitalIdQuery(digitalId, { skip: !digitalId });
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  const bookings: Booking[] = useMemo(() => toArray(bookingsQ.data), [bookingsQ.data]);

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  const count = (s: Booking["bookingStatus"]) => bookings.filter((b) => b.bookingStatus === s).length;
  const totalSpent = bookings.filter((b) => b.bookingStatus === "Confirmed").reduce((sum, b) => sum + amountOf(b), 0);

  // ---------------------------------------------------------------------------
  // FILTER + SORT + PAGINATION
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    const list = bookings.filter((b) => {
      if (statusFilter !== "all" && b.bookingStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        String(b.bookingId).includes(q) ||
        String(b.eventId).includes(q) ||
        String(b.ticketTypeId).includes(q) ||
        (b.bookingStatus || "").toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "amount_desc") return amountOf(b) - amountOf(a);
      if (sortKey === "amount_asc") return amountOf(a) - amountOf(b);
      const diff = +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      return sortKey === "oldest" ? diff || a.bookingId - b.bookingId : -diff || b.bookingId - a.bookingId;
    });
  }, [bookings, search, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleCancel = async () => {
    if (!bookingToCancel) return;
    setErrorMessage("");
    try {
      await cancelBooking(bookingToCancel.bookingId).unwrap();
      setSuccessMessage(`Booking #${bookingToCancel.bookingId} was cancelled.`);
      setDetailBooking(null);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to cancel the booking. Please try again.");
    } finally {
      setBookingToCancel(null);
    }
  };

  const statusTabs: { key: StatusFilter; label: string; total: number }[] = [
    { key: "all", label: "All", total: bookings.length },
    { key: "Confirmed", label: "Confirmed", total: count("Confirmed") },
    { key: "Pending", label: "Pending", total: count("Pending") },
    { key: "Cancelled", label: "Cancelled", total: count("Cancelled") },
  ];

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">My Bookings</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Member</span>
            </div>
            <p className="text-[11px] text-base-content/60">Every ticket booking you have made</p>
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
              <span className="font-bold text-base-content">Bookings Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                A booking starts as <b>Pending</b> until payment goes through, then becomes <b>Confirmed</b>. Open a
                booking to see its details. You can cancel a Pending or Confirmed booking, but a cancelled booking cannot
                be brought back.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="alert alert-success text-xs font-semibold py-2 rounded-xl shadow-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="btn btn-ghost btn-xs btn-square">
            <X size={14} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings", value: bookings.length, icon: <ShoppingBag size={18} />, tone: "bg-primary/10 text-primary" },
          { label: "Confirmed", value: count("Confirmed"), icon: <CheckCircle2 size={18} />, tone: "bg-success/10 text-success" },
          { label: "Pending", value: count("Pending"), icon: <Clock size={18} />, tone: "bg-warning/10 text-warning" },
          { label: "Confirmed Spend", value: fmtMoney(totalSpent), icon: <Wallet size={18} />, tone: "bg-primary/10 text-primary" },
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
              placeholder="Search by booking number or event number"
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
      </div>

      {/* BOOKINGS */}
      {!digitalId ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>We couldn't find your account. Please sign in again.</span>
        </div>
      ) : bookingsQ.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : bookingsQ.isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span className="flex-1">Failed to load your bookings.</span>
          <button onClick={() => bookingsQ.refetch()} className="btn btn-ghost btn-xs">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <ShoppingBag size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">{bookings.length === 0 ? "No Bookings Yet" : "No Matching Bookings"}</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
            {bookings.length === 0 ? "When you book tickets for an event, they will show up here." : "Try a different search or status."}
          </p>
          {bookings.length === 0 ? (
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
            <span className="font-bold text-base-content">{filtered.length}</span> {filtered.length === 1 ? "booking" : "bookings"}
            {filtered.length !== bookings.length && <> (filtered from {bookings.length})</>}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((b, i) => (
              <motion.div
                key={`${safePage}-${b.bookingId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                role="button"
                tabIndex={0}
                onClick={() => setDetailBooking(b)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailBooking(b);
                  }
                }}
                className="group bg-base-100 border border-base-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40" />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                        <Ticket size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-sm font-black text-base-content truncate group-hover:text-primary transition-colors">
                          Booking #{b.bookingId}
                        </h3>
                        <span className="text-[11px] text-base-content/60 truncate">Event #{b.eventId}</span>
                      </div>
                    </div>
                    <span className={`badge badge-sm font-bold shrink-0 ${statusBadge(b.bookingStatus)}`}>{b.bookingStatus}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col">
                      <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                        <Ticket size={10} /> Tickets
                      </span>
                      <span className="text-sm font-black text-base-content">{b.quantity}</span>
                    </div>
                    <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                      <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                        <Wallet size={10} /> Total
                      </span>
                      <span className="text-sm font-black text-base-content truncate">{fmtMoney(amountOf(b))}</span>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2 flex items-center justify-between border-t border-base-200 bg-base-200/20">
                  <span className="text-[10px] text-base-content/40 truncate pr-2">Booked {fmtDate(b.createdAt)}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailBooking(b)}
                      className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg"
                      title="View booking"
                    >
                      <Eye size={13} />
                    </button>
                    {canCancel(b) && (
                      <button
                        onClick={() => setBookingToCancel(b)}
                        className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                        title="Cancel booking"
                      >
                        <Ban size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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

      {/* ================================================================= */}
      {/* MODAL: BOOKING DETAILS */}
      {/* ================================================================= */}
      <AnimatePresence>
        {detailBooking && (
          <div className={modalBackdrop} onClick={() => setDetailBooking(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Ticket size={16} className="text-primary shrink-0" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content truncate">
                    Booking #{detailBooking.bookingId}
                  </h3>
                </div>
                <button onClick={() => setDetailBooking(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-base-content/60 font-semibold">Status</span>
                <span className={`badge badge-sm font-bold ${statusBadge(detailBooking.bookingStatus)}`}>{detailBooking.bookingStatus}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Event", value: `#${detailBooking.eventId}`, icon: <Calendar size={11} /> },
                  { label: "Ticket type", value: `#${detailBooking.ticketTypeId}`, icon: <Hash size={11} /> },
                  { label: "Tickets", value: String(detailBooking.quantity), icon: <Ticket size={11} /> },
                  { label: "Total", value: fmtMoney(amountOf(detailBooking)), icon: <Wallet size={11} /> },
                  { label: "Booked on", value: fmtDateTime(detailBooking.createdAt), icon: <Clock size={11} /> },
                  { label: "Last updated", value: fmtDateTime(detailBooking.updatedAt), icon: <Clock size={11} /> },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] text-base-content/60 font-semibold flex items-center gap-1">
                      {f.icon} {f.label}
                    </span>
                    <span className="font-bold text-base-content break-words">{f.value}</span>
                  </div>
                ))}
              </div>

              {(detailBooking.guestName || detailBooking.guestEmail || detailBooking.guestPhone) && (
                <div className="flex flex-col gap-2 border-t border-base-200 pt-3 text-xs">
                  <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Booked for</span>
                  {detailBooking.guestName && (
                    <span className="flex items-center gap-2 font-bold text-base-content">
                      <User size={12} className="text-primary" /> {detailBooking.guestName}
                    </span>
                  )}
                  {detailBooking.guestEmail && (
                    <span className="flex items-center gap-2 text-base-content/80 break-all">
                      <Mail size={12} className="text-primary shrink-0" /> {detailBooking.guestEmail}
                    </span>
                  )}
                  {detailBooking.guestPhone && (
                    <span className="flex items-center gap-2 text-base-content/80">
                      <Phone size={12} className="text-primary shrink-0" /> {detailBooking.guestPhone}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                <button onClick={() => setDetailBooking(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                  Close
                </button>
                {canCancel(detailBooking) && (
                  <button
                    onClick={() => setBookingToCancel(detailBooking)}
                    className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold text-error bg-error/10 hover:bg-error/20 gap-1"
                  >
                    <XCircle size={14} /> Cancel booking
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL: CANCEL CONFIRMATION */}
      {/* ================================================================= */}
      <AnimatePresence>
        {bookingToCancel && (
          <div className={`${modalBackdrop} z-[60]`}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Cancel this booking?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  Booking <span className="font-bold text-base-content">#{bookingToCancel.bookingId}</span> for{" "}
                  <span className="font-bold text-base-content">
                    {bookingToCancel.quantity} {bookingToCancel.quantity === 1 ? "ticket" : "tickets"}
                  </span>{" "}
                  will be cancelled. This cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button type="button" onClick={() => setBookingToCancel(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancel}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isCancelling ? <span className="loading loading-spinner loading-xs"></span> : "Yes, cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyBookings;