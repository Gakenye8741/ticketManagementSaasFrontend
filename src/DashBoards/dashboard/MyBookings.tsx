import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ShoppingBag, Search, X, Info, Eye, Ticket, Calendar, Wallet, CheckCircle2, Clock, XCircle,
  AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown, Ban, Compass, User, Mail, Phone,
  LayoutGrid, Table as TableIcon, Tag, Smartphone, CreditCard, RefreshCw,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetBookingsByUserDigitalIdQuery, useCancelBookingMutation, type Booking } from "../../features/APIS/BookingsApi";
// ⚠️ Adjust these import paths/file names to match your project
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetAllTicketTypesQuery, useGetTicketTypeByIdQuery } from "../../features/APIS/ticketsType.Api";
import {
  useInitiatePaystackMpesaMutation,
  useInitializePaystackCheckoutMutation,
  useLazyVerifyPaystackPaymentQuery,
} from "../../features/APIS/MpesaApi"; 

import usePageTitle from "../../hooks/usePageTitle";
import ModalShell from "../../components/ModalShell";

const CURRENCY = "KES";
const PAGE_SIZES = [6, 12, 24];
const POLL_EVERY_MS = 5000;
const POLL_MAX_ATTEMPTS = 24; // 24 x 5s = 2 minutes

type StatusFilter = "all" | "Pending" | "Confirmed" | "Cancelled";
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";
type ViewMode = "cards" | "table";
type PayStage = "form" | "waiting" | "success" | "failed" | "timeout";

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    const first = Object.values(d).find((v) => Array.isArray(v));
    if (first) return first as any[];
    if (d.data && typeof d.data === "object") return toArray(d.data);
  }
  return [];
};
// A single item may arrive as the object itself or wrapped in { data: {...} }
const unwrapOne = (d: any): any => (d && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : d);
const amountOf = (b: Booking) => Number(b.totalAmount || 0);
const fmtMoney = (n: number) => `${CURRENCY} ${n.toLocaleString()}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const canCancel = (b: Booking) => b.bookingStatus === "Pending" || b.bookingStatus === "Confirmed";
const canPay = (b: Booking) => b.bookingStatus === "Pending";

/** Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX. Returns 0XXXXXXXXX or null. */
const normalizeKenyanPhone = (raw: string): string | null => {
  const m = raw.replace(/[\s-]/g, "").match(/^(?:\+?254|0)?([17]\d{8})$/);
  return m ? `0${m[1]}` : null;
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const apiError = (err: any, fallback: string): string => err?.data?.message || err?.data?.error || err?.error || fallback;

// Field names can differ between backends, so we check the common ones.
const eventIdOf = (e: any) => Number(e?.eventId ?? e?.id ?? 0);
const eventTitleOf = (e: any): string => e?.title ?? e?.eventName ?? e?.name ?? "";
const ticketIdOf = (t: any) => Number(t?.ticketTypeId ?? t?.ticketTypeID ?? t?.id ?? 0);
const ticketNameOf = (t: any): string => {
  if (!t) return "";
  for (const k of ["name", "typeName", "ticketName", "ticketTypeName", "title", "label", "category", "type"]) {
    if (typeof t[k] === "string" && t[k].trim()) return t[k];
  }
  const k = Object.keys(t).find((k) => /name|title|label/i.test(k) && !/event|user|guest|org/i.test(k) && typeof t[k] === "string" && t[k].trim());
  return k ? t[k] : "";
};

/** Shows the ticket type name. Uses the cached list first, then fetches that one ticket type by ID. */
const TicketTypeName = ({ booking, names, loadingAll }: { booking: Booking; names: Map<number, string>; loadingAll: boolean }) => {
  const id = Number(booking.ticketTypeId);
  const known = names.get(id);
  const q = useGetTicketTypeByIdQuery(id, { skip: !!known || !id });
  if (known) return <>{known}</>;
  const fetched = ticketNameOf(unwrapOne(q.data));
  if (fetched) return <>{fetched}</>;
  if (q.isLoading || loadingAll) return <>Loading…</>;
  return <>{`Ticket type #${id}`}</>;
};

const statusBadge = (s: Booking["bookingStatus"]) =>
  s === "Confirmed" ? "badge-success text-success-content" : s === "Cancelled" ? "badge-error text-error-content" : "badge-warning text-warning-content";

export const MyBookings = () => {
  usePageTitle("My Bookings");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = user?.digitalId || user?.userId || "";

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  const bookingsQ = useGetBookingsByUserDigitalIdQuery(digitalId, { skip: !digitalId });
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const eventsQ = useGetAllEventsQuery(undefined);
  const ticketsQ = useGetAllTicketTypesQuery(undefined);

  const [initiateMpesa, { isLoading: isSendingPrompt }] = useInitiatePaystackMpesaMutation();
  const [initializeCheckout, { isLoading: isOpeningCheckout }] = useInitializePaystackCheckoutMutation();
  const [verifyPayment] = useLazyVerifyPaystackPaymentQuery();

  const bookings: Booking[] = useMemo(() => toArray(bookingsQ.data), [bookingsQ.data]);

  const eventNames = useMemo(() => {
    const m = new Map<number, string>();
    toArray(eventsQ.data).forEach((e: any) => {
      const t = eventTitleOf(e);
      if (t) m.set(eventIdOf(e), t);
    });
    return m;
  }, [eventsQ.data]);

  const ticketNames = useMemo(() => {
    const m = new Map<number, string>();
    toArray(ticketsQ.data).forEach((t: any) => {
      const n = ticketNameOf(t);
      if (n) m.set(ticketIdOf(t), n);
    });
    return m;
  }, [ticketsQ.data]);

  const eventLabel = (b: Booking) =>
    eventNames.get(Number(b.eventId)) ?? (eventsQ.isLoading ? "Loading event…" : `Event #${b.eventId}`);

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // PAYMENT STATE
  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [payStage, setPayStage] = useState<PayStage>("form");
  const [payReference, setPayReference] = useState("");
  const [payError, setPayError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // PAYMENT
  // ---------------------------------------------------------------------------
  const openPay = (b: Booking) => {
    const u = user as any;
    setDetailBooking(null);
    setBookingToPay(b);
    setPayPhone(b.guestPhone || u?.phoneNumber || u?.phone || "");
    setPayEmail(b.guestEmail || u?.email || "");
    setPayStage("form");
    setPayReference("");
    setPayError("");
  };

  const closePay = () => {
    setBookingToPay(null);
    setPayStage("form");
    setPayReference("");
    setPayError("");
  };

  /** Asks the server (and Paystack) what happened to this payment. */
  const checkPayment = async (reference: string): Promise<"success" | "failed" | "pending"> => {
    const res: any = await verifyPayment(reference, false).unwrap();
    const s = String(res?.status ?? "").toLowerCase();
    if (s === "success") return "success";
    if (["failed", "abandoned", "reversed", "declined"].includes(s)) return "failed";
    return "pending";
  };

  const onPaid = (b: Booking) => {
    setPayStage("success");
    setSuccessMessage(`Payment received. Booking #${b.bookingId} is confirmed.`);
    bookingsQ.refetch();
  };

  // While waiting for the customer to enter their PIN, check the payment every few seconds.
  useEffect(() => {
    if (payStage !== "waiting" || !payReference || !bookingToPay) return;
    let cancelled = false;
    let attempts = 0;
    const paying = bookingToPay;

    const id = setInterval(async () => {
      attempts++;
      try {
        const result = await checkPayment(payReference);
        if (cancelled) return;
        if (result === "success") {
          clearInterval(id);
          onPaid(paying);
          return;
        }
        if (result === "failed") {
          clearInterval(id);
          setPayError("The payment was not completed. You can try again.");
          setPayStage("failed");
          return;
        }
      } catch {
        /* network hiccup: keep trying until the time runs out */
      }
      if (!cancelled && attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(id);
        setPayStage((s) => (s === "waiting" ? "timeout" : s));
      }
    }, POLL_EVERY_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payStage, payReference, bookingToPay]);

  const handleCheckNow = async () => {
    if (!payReference || !bookingToPay) return;
    setIsChecking(true);
    setPayError("");
    try {
      const result = await checkPayment(payReference);
      if (result === "success") onPaid(bookingToPay);
      else if (result === "failed") {
        setPayError("The payment was not completed. You can try again.");
        setPayStage("failed");
      } else {
        setPayError("We have not received the payment yet. If you already approved it, wait a moment and check again.");
      }
    } catch (err: any) {
      setPayError(apiError(err, "Could not check the payment. Please try again."));
    } finally {
      setIsChecking(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!bookingToPay) return;
    const phone = normalizeKenyanPhone(payPhone);
    if (!phone) return setPayError("Enter a valid Safaricom number, for example 0712 345 678.");
    if (!isEmail(payEmail)) return setPayError("Enter a valid email address for your receipt.");

    setPayError("");
    try {
      const res = await initiateMpesa({ phoneNumber: phone, bookingId: bookingToPay.bookingId, email: payEmail.trim() }).unwrap();
      setPayReference(res.reference);
      setPayStage("waiting");
    } catch (err: any) {
      setPayError(apiError(err, "Could not send the M-Pesa prompt. Please try again."));
    }
  };

  const handleCheckout = async () => {
    if (!bookingToPay) return;
    if (!isEmail(payEmail)) return setPayError("Enter a valid email address for your receipt.");

    setPayError("");
    try {
      const res = await initializeCheckout({ bookingId: bookingToPay.bookingId, email: payEmail.trim() }).unwrap();
      if (!res.authorizationUrl) throw new Error("No checkout link returned");
      window.location.href = res.authorizationUrl;
    } catch (err: any) {
      setPayError(apiError(err, "Could not open the checkout page. Please try again."));
    }
  };

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
        (eventNames.get(Number(b.eventId)) || "").toLowerCase().includes(q) ||
        (ticketNames.get(Number(b.ticketTypeId)) || "").toLowerCase().includes(q) ||
        (b.bookingStatus || "").toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "amount_desc") return amountOf(b) - amountOf(a);
      if (sortKey === "amount_asc") return amountOf(a) - amountOf(b);
      const diff = +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      return sortKey === "oldest" ? diff || a.bookingId - b.bookingId : -diff || b.bookingId - a.bookingId;
    });
  }, [bookings, search, statusFilter, sortKey, eventNames, ticketNames]);

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
    <div className="flex flex-col gap-5 pb-28 lg:pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
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
                A booking starts as <b>Pending</b> until payment goes through, then becomes <b>Confirmed</b>. If a booking is still Pending, use{" "}
                <b>Pay now</b> to finish paying with M-Pesa. Open a booking to see its details. You can cancel a Pending or Confirmed booking, but a
                cancelled booking cannot be brought back.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInfoBanner(false)} className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center">
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
              placeholder="Search by event name, ticket type or booking number"
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
          <div className="join" role="group" aria-label="Choose how bookings are shown">
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

          {viewMode === "cards" ? (
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
                          <h3 className="text-sm font-black text-base-content truncate group-hover:text-primary transition-colors" title={eventLabel(b)}>
                            {eventLabel(b)}
                          </h3>
                          <span className="text-[11px] text-base-content/60 truncate">Booking #{b.bookingId}</span>
                        </div>
                      </div>
                      <span className={`badge badge-sm font-bold shrink-0 ${statusBadge(b.bookingStatus)}`}>{b.bookingStatus}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                        <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                          <Tag size={10} /> Type
                        </span>
                        <span className="text-sm font-black text-base-content truncate">
                          <TicketTypeName booking={b} names={ticketNames} loadingAll={ticketsQ.isLoading} />
                        </span>
                      </div>
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
                      {canPay(b) && (
                        <button onClick={() => openPay(b)} className="btn btn-success btn-xs rounded-lg gap-1 font-bold text-success-content" title="Pay for this booking">
                          <Smartphone size={12} /> Pay now
                        </button>
                      )}
                      <button onClick={() => setDetailBooking(b)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View booking">
                        <Eye size={13} />
                      </button>
                      {canCancel(b) && (
                        <button onClick={() => setBookingToCancel(b)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Cancel booking">
                          <Ban size={13} />
                        </button>
                      )}
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
                    <th>Booking</th>
                    <th>Ticket type</th>
                    <th className="text-right">Tickets</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                    <th>Booked on</th>
                    <th className="text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => (
                    <tr key={b.bookingId} onClick={() => setDetailBooking(b)} className="hover cursor-pointer">
                      <td className="font-bold text-base-content max-w-[14rem] truncate" title={eventLabel(b)}>
                        {eventLabel(b)}
                      </td>
                      <td>#{b.bookingId}</td>
                      <td className="max-w-[10rem] truncate">
                        <TicketTypeName booking={b} names={ticketNames} loadingAll={ticketsQ.isLoading} />
                      </td>
                      <td className="text-right">{b.quantity}</td>
                      <td className="text-right font-bold whitespace-nowrap">{fmtMoney(amountOf(b))}</td>
                      <td>
                        <span className={`badge badge-sm font-bold ${statusBadge(b.bookingStatus)}`}>{b.bookingStatus}</span>
                      </td>
                      <td className="whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {canPay(b) && (
                          <button onClick={() => openPay(b)} className="btn btn-success btn-xs rounded-lg gap-1 font-bold text-success-content mr-1" title="Pay for this booking">
                            <Smartphone size={12} /> Pay now
                          </button>
                        )}
                        <button onClick={() => setDetailBooking(b)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View booking">
                          <Eye size={13} />
                        </button>
                        {canCancel(b) && (
                          <button onClick={() => setBookingToCancel(b)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Cancel booking">
                            <Ban size={13} />
                          </button>
                        )}
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

      {/* MODAL: BOOKING DETAILS */}
      <ModalShell
        open={!!detailBooking}
        onClose={() => setDetailBooking(null)}
        icon={<Ticket size={16} />}
        title={detailBooking ? `Booking #${detailBooking.bookingId}` : ""}
        footer={
          detailBooking && (
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => setDetailBooking(null)} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                Close
              </button>
              {canCancel(detailBooking) && (
                <button
                  onClick={() => setBookingToCancel(detailBooking)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold text-error bg-error/10 hover:bg-error/20 gap-1 flex-1 sm:flex-none"
                >
                  <XCircle size={14} /> Cancel booking
                </button>
              )}
              {canPay(detailBooking) && (
                <button
                  onClick={() => openPay(detailBooking)}
                  className="btn btn-success btn-sm rounded-xl font-bold text-success-content gap-1 flex-1 sm:flex-none"
                >
                  <Smartphone size={14} /> Pay now
                </button>
              )}
            </div>
          )
        }
      >
        {detailBooking && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/60 font-semibold">Status</span>
              <span className={`badge badge-sm font-bold ${statusBadge(detailBooking.bookingStatus)}`}>{detailBooking.bookingStatus}</span>
            </div>

            {canPay(detailBooking) && (
              <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3 text-[11px] text-base-content/80">
                <Clock size={14} className="text-warning shrink-0 mt-0.5" />
                <span>This booking is waiting for payment. Pay now to confirm your tickets.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Event", value: eventLabel(detailBooking), icon: <Calendar size={11} />, wide: true },
                { label: "Ticket type", value: <TicketTypeName booking={detailBooking} names={ticketNames} loadingAll={ticketsQ.isLoading} />, icon: <Tag size={11} /> },
                { label: "Tickets", value: String(detailBooking.quantity), icon: <Ticket size={11} /> },
                { label: "Total", value: fmtMoney(amountOf(detailBooking)), icon: <Wallet size={11} /> },
                { label: "Booked on", value: fmtDateTime(detailBooking.createdAt), icon: <Clock size={11} /> },
                { label: "Last updated", value: fmtDateTime(detailBooking.updatedAt), icon: <Clock size={11} /> },
              ].map((f) => (
                <div key={f.label} className={`flex flex-col gap-0.5 min-w-0 ${f.wide ? "col-span-2" : ""}`}>
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
          </div>
        )}
      </ModalShell>

      {/* MODAL: PAY FOR BOOKING */}
      <ModalShell
        open={!!bookingToPay}
        onClose={closePay}
        icon={<Smartphone size={16} />}
        title={bookingToPay ? `Pay for booking #${bookingToPay.bookingId}` : ""}
        dismissible={!isSendingPrompt && !isOpeningCheckout}
        footer={
          bookingToPay && (
            <div className="flex flex-wrap justify-end gap-2">
              {payStage === "form" && (
                <>
                  <button onClick={closePay} disabled={isSendingPrompt || isOpeningCheckout} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                    Not now
                  </button>
                  <button
                    onClick={handleSendPrompt}
                    disabled={isSendingPrompt || isOpeningCheckout}
                    className="btn btn-success btn-sm rounded-xl font-bold text-success-content gap-1 flex-1 sm:flex-none"
                  >
                    {isSendingPrompt ? <span className="loading loading-spinner loading-xs" /> : <Smartphone size={14} />}
                    Send M-Pesa prompt
                  </button>
                </>
              )}

              {payStage === "waiting" && (
                <button onClick={closePay} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                  Close
                </button>
              )}

              {payStage === "timeout" && (
                <>
                  <button onClick={closePay} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                    Close
                  </button>
                  <button onClick={handleCheckNow} disabled={isChecking} className="btn btn-primary btn-sm rounded-xl font-bold gap-1 flex-1 sm:flex-none">
                    {isChecking ? <span className="loading loading-spinner loading-xs" /> : <RefreshCw size={14} />}
                    Check payment
                  </button>
                </>
              )}

              {payStage === "failed" && (
                <>
                  <button onClick={closePay} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setPayError("");
                      setPayReference("");
                      setPayStage("form");
                    }}
                    className="btn btn-primary btn-sm rounded-xl font-bold flex-1 sm:flex-none"
                  >
                    Try again
                  </button>
                </>
              )}

              {payStage === "success" && (
                <button onClick={closePay} className="btn btn-primary btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                  Done
                </button>
              )}
            </div>
          )
        }
      >
        {bookingToPay && (
          <div className="flex flex-col gap-4 text-xs">
            {/* Amount summary */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 p-3">
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base-content truncate">{eventLabel(bookingToPay)}</span>
                <span className="text-[11px] text-base-content/60">
                  {bookingToPay.quantity} {bookingToPay.quantity === 1 ? "ticket" : "tickets"},{" "}
                  <TicketTypeName booking={bookingToPay} names={ticketNames} loadingAll={ticketsQ.isLoading} />
                </span>
              </div>
              <span className="text-base font-black text-base-content whitespace-nowrap">{fmtMoney(amountOf(bookingToPay))}</span>
            </div>

            {payStage === "form" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-base-content/60">M-Pesa phone number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0712 345 678"
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    className="input input-bordered input-sm rounded-xl w-full text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-base-content/60">Email for your receipt</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={payEmail}
                    onChange={(e) => setPayEmail(e.target.value)}
                    className="input input-bordered input-sm rounded-xl w-full text-xs"
                  />
                </label>
                <p className="text-[11px] text-base-content/60 leading-relaxed">
                  We will send a prompt to this number. Enter your M-Pesa PIN on your phone to approve {fmtMoney(amountOf(bookingToPay))}.
                </p>

                <div className="divider my-0 text-[10px] text-base-content/40">or</div>

                <button
                  onClick={handleCheckout}
                  disabled={isSendingPrompt || isOpeningCheckout}
                  className="btn btn-ghost bg-base-200 btn-sm rounded-xl font-bold gap-1.5 text-xs"
                >
                  {isOpeningCheckout ? <span className="loading loading-spinner loading-xs" /> : <CreditCard size={14} />}
                  Pay with card or another M-Pesa number
                </button>
              </>
            )}

            {payStage === "waiting" && (
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <span className="loading loading-spinner loading-md text-success" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-sm text-base-content">Check your phone</h3>
                  <p className="text-[11px] text-base-content/60 leading-relaxed px-2">
                    Enter your M-Pesa PIN to pay {fmtMoney(amountOf(bookingToPay))}. This page will update when the payment arrives.
                  </p>
                </div>
              </div>
            )}

            {payStage === "timeout" && (
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <Clock size={28} className="text-warning" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-sm text-base-content">Still waiting for payment</h3>
                  <p className="text-[11px] text-base-content/60 leading-relaxed px-2">
                    We have not received the payment yet. If you already approved it on your phone, select Check payment.
                  </p>
                </div>
              </div>
            )}

            {payStage === "failed" && (
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <XCircle size={28} className="text-error" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-sm text-base-content">Payment not completed</h3>
                  <p className="text-[11px] text-base-content/60 leading-relaxed px-2">
                    The prompt was cancelled or timed out. No money was taken. You can try again.
                  </p>
                </div>
              </div>
            )}

            {payStage === "success" && (
              <div className="flex flex-col items-center text-center gap-3 py-3">
                <CheckCircle2 size={28} className="text-success" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-sm text-base-content">Payment received</h3>
                  <p className="text-[11px] text-base-content/60 leading-relaxed px-2">
                    Booking #{bookingToPay.bookingId} is now confirmed.
                  </p>
                </div>
              </div>
            )}

            {payError && payStage !== "failed" && (
              <div className="alert alert-error text-[11px] font-semibold py-2 rounded-xl" role="alert">
                <AlertCircle size={14} className="shrink-0" />
                <span>{payError}</span>
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* MODAL: CANCEL CONFIRMATION */}
      <ModalShell
        open={!!bookingToCancel}
        onClose={() => setBookingToCancel(null)}
        placement="center"
        maxWidth="sm"
        hideHeader
        dismissible={!isCancelling}
        footer={
          <div className="flex items-center justify-center gap-2 w-full">
            <button type="button" onClick={() => setBookingToCancel(null)} disabled={isCancelling} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
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
        }
      >
        {bookingToCancel && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-black text-sm text-base-content tracking-tight">Cancel this booking?</h3>
              <p className="text-xs text-base-content/60 leading-relaxed px-2">
                Booking <span className="font-bold text-base-content">#{bookingToCancel.bookingId}</span> for{" "}
                <span className="font-bold text-base-content">{eventLabel(bookingToCancel)}</span> (
                {bookingToCancel.quantity} {bookingToCancel.quantity === 1 ? "ticket" : "tickets"},{" "}
                <TicketTypeName booking={bookingToCancel} names={ticketNames} loadingAll={ticketsQ.isLoading} />) will be
                cancelled. This cannot be undone.
              </p>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default MyBookings;