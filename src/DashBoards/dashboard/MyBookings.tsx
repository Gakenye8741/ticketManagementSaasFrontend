import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ShoppingBag, Search, X, Info, Eye, Ticket, Calendar, Wallet, CheckCircle2, Clock, XCircle,
  AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown, Ban, Compass, User, Mail, Phone,
  LayoutGrid, Table as TableIcon, Tag, Smartphone, CreditCard, RefreshCw, Banknote, Receipt, MapPin, Hash, FileText,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetBookingsByUserDigitalIdQuery,
  useCancelBookingMutation,
  useGetCheckoutTotalsQuery,
  type Booking,
} from "../../features/APIS/BookingsApi";
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetAllTicketTypesQuery, useGetTicketTypeByIdQuery } from "../../features/APIS/ticketsType.Api";
import {
  useInitiatePaystackMpesaMutation,
  useInitializePaystackCheckoutMutation,
  useLazyVerifyPaystackPaymentQuery,
} from "../../features/APIS/MpesaApi";
import { useRequestMyRefundMutation } from "../../features/APIS/RefundApi";

import usePageTitle from "../../hooks/usePageTitle";
import ModalShell from "../../components/ModalShell";

const CURRENCY = "KES";
const PAGE_SIZES = [6, 12, 24];
const POLL_EVERY_MS = 5000;
const POLL_MAX_ATTEMPTS = 24;
const SUPPORT_EMAIL = "support@yourdomain.com";
const REFUND_REASON_MIN = 10;
const REFUND_REASON_MAX = 500;

const REFUND_TERMS_TITLE = "8. Refunds, cancellations and postponements";
const REFUND_TERMS: { lead: string; text: ReactNode }[] = [
  {
    lead: "General rule.",
    text: "Unless the Organizer's refund policy for the Event says otherwise, or the law requires it, all Ticket sales are final. A change of mind, a change of plans or a failure to attend is not a reason for a refund.",
  },
  {
    lead: "Cancelled Events.",
    text: "If an Event is cancelled, Attendees are entitled to a refund of the Ticket price. We will refund the face value of the Ticket through the original payment method where possible. Platform and payment processing Fees may be refunded or retained as shown at checkout or in the Organizer's agreement.",
  },
  {
    lead: "Postponed or rescheduled Events.",
    text: "If an Event is moved to a new date, Tickets stay valid for the new date. If you cannot attend the new date, you may request a refund within the period the Organizer sets, or within 14 days of the announcement if no period is set.",
  },
  {
    lead: "Material changes.",
    text: "If the Venue, headline performer or other essential feature changes in a way that substantially alters the Event, Attendees may ask for a refund within 14 days of the change being announced.",
  },
  {
    lead: "Who pays.",
    text: "Because the Organizer receives the proceeds, refunds for cancelled or materially changed Events are funded by the Organizer. We may deduct refund amounts from the Organizer's future payouts, or request repayment where there are no payouts to deduct from.",
  },
  {
    lead: "Processing time.",
    text: "Approved refunds are normally sent within 14 business days, but the time they take to arrive depends on the payment provider.",
  },
  {
    lead: "Refund requests.",
    text: (
      <>
        Send requests to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="link link-primary font-semibold">
          {SUPPORT_EMAIL}
        </a>{" "}
        with your order reference. We may need to confirm your identity and the Ticket details.
      </>
    ),
  },
];

type StatusFilter = "all" | "Pending" | "Confirmed" | "Cancelled" | "Refunded";
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
const unwrapOne = (d: any): any => (d && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : d);

const amountOf = (b: Booking) => Number(b.totalAmount || 0);
const fmtMoney = (n: number) => `${CURRENCY} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const fmtEventWhen = (date?: string, time?: string) => {
  if (!date) return "—";
  const d = new Date(`${date}T${time || "00:00:00"}`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleString(undefined, time ? { dateStyle: "full", timeStyle: "short" } : { dateStyle: "full" });
};
const canCancel = (b: Booking) => b.bookingStatus === "Pending" || b.bookingStatus === "Confirmed";
const canPay = (b: Booking) => b.bookingStatus === "Pending";
const isPaid = (b: Booking) => b.bookingStatus === "Confirmed";

/** 🆕 Read the cart lines from booking.items, falling back to the legacy single-type fields. */
const cartItemsOf = (b: Booking): { ticketTypeId?: number; name: string; quantity: number; unitPrice: number; lineTotal: number }[] => {
  const items = Array.isArray((b as any).items) ? (b as any).items : [];
  if (items.length > 0) {
    return items.map((it: any) => ({
      ticketTypeId: Number(it.ticketTypeId ?? 0),
      name: String(it.ticketTypeName ?? it.name ?? "Ticket"),
      quantity: Number(it.quantity ?? 0),
      unitPrice: Number(it.unitPrice ?? 0),
      lineTotal: Number(it.lineTotal ?? 0),
    }));
  }
  // Legacy fallback — one row from the booking's own fields
  return [{
    ticketTypeId: Number(b.ticketTypeId ?? 0),
    name: String(b.ticketTypeName ?? "Ticket"),
    quantity: Number(b.quantity ?? 0),
    unitPrice: amountOf(b) / Math.max(1, Number(b.quantity ?? 1)),
    lineTotal: amountOf(b),
  }];
};

const completedPaymentOf = (b: Booking): any => {
  const list: any[] = Array.isArray((b as any)?.payments) ? (b as any).payments : [];
  return list.find((p) => String(p?.paymentStatus ?? "").toLowerCase() === "completed") ?? null;
};
const latestPaymentOf = (b: Booking): any => {
  const list: any[] = Array.isArray((b as any)?.payments) ? (b as any).payments : [];
  return completedPaymentOf(b) ?? (list.length ? list[list.length - 1] : null);
};
const paymentIdOf = (b: Booking): number => Number(completedPaymentOf(b)?.paymentId ?? 0);
const validTicketCount = (b: Booking): number | null => {
  const t = (b as any)?.tickets;
  return Array.isArray(t) ? t.filter((x: any) => x?.lifecycleStatus === "Valid").length : null;
};

const feeBreakdownOf = (b: Booking) => {
  const p = completedPaymentOf(b);
  const bk = b as any;
  const ticket = Number(p?.amount) > 0 ? Number(p.amount) : amountOf(b);
  const fee = Number((p ? p.serviceFee : bk.serviceFee) ?? 0) || 0;
  let total = Number((p ? p.totalCharged : bk.totalCharged) ?? 0) || 0;
  if (!(total > 0)) total = ticket + fee;
  const rawPct = p?.serviceFeePercent;
  const percent = rawPct !== null && rawPct !== undefined && rawPct !== "" && Number.isFinite(Number(rawPct)) ? Number(rawPct) : null;
  return { ticket, fee, total, percent, hasPayment: !!p };
};
const totalPaidOf = (b: Booking) => feeBreakdownOf(b).total;

const normalizeKenyanPhone = (raw: string): string | null => {
  const m = raw.replace(/[\s-]/g, "").match(/^(?:\+?254|0)?([17]\d{8})$/);
  return m ? `0${m[1]}` : null;
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const apiError = (err: any, fallback: string): string => err?.data?.message || err?.data?.error || err?.error || fallback;

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

/**
 * Legacy single-ticket name lookup, kept for legacy bookings only.
 * New bookings use `booking.items` directly via `CartLines`.
 */
const TicketTypeName = ({ booking, names, loadingAll }: { booking: Booking; names: Map<number, string>; loadingAll: boolean }) => {
  const id = Number(booking.ticketTypeId);
  const direct: string = (booking as any).ticketTypeName || "";
  const known = names.get(id);
  const q = useGetTicketTypeByIdQuery(id, { skip: !!direct || !!known || !id });
  if (direct) return <>{direct}</>;
  if (known) return <>{known}</>;
  const fetched = ticketNameOf(unwrapOne(q.data));
  if (fetched) return <>{fetched}</>;
  if (q.isLoading || loadingAll) return <>Loading…</>;
  return <>{`Ticket type #${id}`}</>;
};

const statusBadge = (s: string) =>
  s === "Confirmed"
    ? "badge-success text-success-content"
    : s === "Cancelled"
    ? "badge-error text-error-content"
    : s === "Refunded"
    ? "badge-info text-info-content"
    : "badge-warning text-warning-content";

const paymentBadge = (s: string) => {
  const v = String(s ?? "").toLowerCase();
  return v === "completed" ? "badge-success text-success-content" : v === "failed" ? "badge-error text-error-content" : "badge-warning text-warning-content";
};

const ticketBadge = (s: string) =>
  s === "Valid" ? "badge-success text-success-content" : s === "Refunded" ? "badge-info text-info-content" : "badge-ghost";

/** 🆕 Compact multi-line cart summary used in cards + table rows. */
const CartLines = ({ booking }: { booking: Booking }) => {
  const lines = cartItemsOf(booking);
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => (
        <div key={`${line.ticketTypeId}-${i}`} className="flex items-center justify-between gap-2 text-xs">
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

const PriceBreakdown = ({
  booking,
  ticket,
  fee,
  total,
  percent,
  quantity,
  totalLabel = "Total",
  feeNote = "included",
}: {
  booking?: Booking;
  ticket: number;
  fee: number;
  total: number;
  percent: number | null;
  quantity: number;
  totalLabel?: string;
  feeNote?: "included" | "none";
}) => {
  const lines = booking ? cartItemsOf(booking) : [];
  const hasMultipleLines = lines.length > 1;

  return (
    <div className="rounded-2xl border border-base-200 bg-base-200/30 overflow-hidden">
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-base-200 bg-base-200/50">
        <Receipt size={14} className="text-primary" />
        <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Price breakdown</span>
      </div>

      <div className="p-3.5 flex flex-col gap-2 text-xs">
        {/* 🆕 per-line breakdown when it's a cart */}
        {hasMultipleLines ? (
          <div className="flex flex-col gap-1.5">
            {lines.map((line, i) => (
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
            <span className="text-base-content/70">
              Tickets <span className="text-base-content/40">× {quantity}</span>
            </span>
            <span className="font-bold text-base-content whitespace-nowrap">{fmtMoney(ticket)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-base-content/70">
            Service fee
            {percent !== null && fee > 0 && <span className="text-base-content/40"> ({Number(percent.toFixed(2))}%)</span>}
          </span>
          <span className="font-bold text-base-content whitespace-nowrap">
            {fee > 0 ? fmtMoney(fee) : feeNote === "none" ? "None" : fmtMoney(0)}
          </span>
        </div>

        <div className="border-t border-dashed border-base-300 my-0.5" />

        <div className="flex items-center justify-between gap-3">
          <span className="font-black text-base-content">{totalLabel}</span>
          <span className="text-base font-black text-primary whitespace-nowrap">{fmtMoney(total)}</span>
        </div>
      </div>

      {fee > 0 && (
        <div className="px-3.5 py-3 flex items-start gap-2.5 bg-primary/5 border-t border-primary/15">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-base-content/70">
            <span className="font-bold text-base-content">Why a service fee?</span> It is added on top of the ticket price and goes towards running and
            maintaining the app, so we can keep payments secure, send your tickets and keep the platform available for you.
          </p>
        </div>
      )}
    </div>
  );
};

export const MyBookings = () => {
  usePageTitle("My Bookings");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = user?.digitalId || user?.userId || "";

  const bookingsQ = useGetBookingsByUserDigitalIdQuery(digitalId, { skip: !digitalId });
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [requestRefund, { isLoading: isRequestingRefund }] = useRequestMyRefundMutation();
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
    (b as any).event?.title ?? eventNames.get(Number(b.eventId)) ?? (eventsQ.isLoading ? "Loading event…" : `Event #${b.eventId}`);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [wantRefund, setWantRefund] = useState(true);
  const [cancelError, setCancelError] = useState("");
  const [showRefundTerms, setShowRefundTerms] = useState(false);
  const [agreedRefundTerms, setAgreedRefundTerms] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [payStage, setPayStage] = useState<PayStage>("form");
  const [payReference, setPayReference] = useState("");
  const [payError, setPayError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const checkoutQ = useGetCheckoutTotalsQuery(bookingToPay?.bookingId ?? 0, {
    skip: !bookingToPay,
    refetchOnMountOrArgChange: true,
  });

  const payTotals = useMemo(() => {
    if (!bookingToPay) return null;
    const d = unwrapOne(checkoutQ.data);
    if (d && d.totalCharged !== undefined && d.totalCharged !== null) {
      const pct = d.serviceFeePercent !== undefined && d.serviceFeePercent !== null ? Number(d.serviceFeePercent) : null;
      return {
        ticket: Number(d.ticketAmount ?? amountOf(bookingToPay)),
        fee: Number(d.serviceFee ?? 0),
        total: Number(d.totalCharged),
        percent: pct !== null && Number.isFinite(pct) ? pct : null,
      };
    }
    const f = feeBreakdownOf(bookingToPay);
    return { ticket: f.ticket, fee: f.fee, total: f.total, percent: f.percent };
  }, [bookingToPay, checkoutQ.data]);

  const payTotalLoading = !!bookingToPay && checkoutQ.isLoading;
  const payBlocked = isSendingPrompt || isOpeningCheckout || payTotalLoading;

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 6000);
    return () => clearTimeout(t);
  }, [successMessage]);

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
        /* keep trying */
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

  const count = (s: string) => bookings.filter((b) => b.bookingStatus === s).length;
  const totalSpent = bookings.filter((b) => b.bookingStatus === "Confirmed").reduce((sum, b) => sum + totalPaidOf(b), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    const list = bookings.filter((b) => {
      if (statusFilter !== "all" && b.bookingStatus !== statusFilter) return false;
      if (!q) return true;
      const lineNames = cartItemsOf(b).map((l) => l.name.toLowerCase()).join(" ");
      return (
        String(b.bookingId).includes(q) ||
        String(b.eventId).includes(q) ||
        ((b as any).event?.title || eventNames.get(Number(b.eventId)) || "").toLowerCase().includes(q) ||
        lineNames.includes(q) ||
        (b.bookingStatus || "").toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "amount_desc") return totalPaidOf(b) - totalPaidOf(a);
      if (sortKey === "amount_asc") return totalPaidOf(a) - totalPaidOf(b);
      const diff = +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      return sortKey === "oldest" ? diff || a.bookingId - b.bookingId : -diff || b.bookingId - a.bookingId;
    });
  }, [bookings, search, statusFilter, sortKey, eventNames]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const openCancel = (b: Booking) => {
    setBookingToCancel(b);
    setWantRefund(true);
    setCancelError("");
    setShowRefundTerms(false);
    setAgreedRefundTerms(false);
    setRefundReason("");
  };

  const closeCancel = () => {
    setBookingToCancel(null);
    setCancelError("");
    setShowRefundTerms(false);
    setAgreedRefundTerms(false);
    setRefundReason("");
  };

  const openRefundTerms = () => {
    setCancelError("");
    setAgreedRefundTerms(false);
    setShowRefundTerms(true);
  };

  const cancelBusy = isCancelling || isRequestingRefund;
  const refundPaymentId = bookingToCancel ? paymentIdOf(bookingToCancel) : 0;
  const refundValidTickets = bookingToCancel ? validTicketCount(bookingToCancel) : null;
  const alreadyRefunded = !!bookingToCancel && isPaid(bookingToCancel) && refundValidTickets === 0;
  const refundAvailable =
    !!bookingToCancel && isPaid(bookingToCancel) && refundPaymentId > 0 && !alreadyRefunded;
  const refundMissingPayment =
    !!bookingToCancel && isPaid(bookingToCancel) && refundPaymentId === 0;
  const refundPayment = bookingToCancel ? completedPaymentOf(bookingToCancel) : null;
  const refundTicketAmount = Number(refundPayment?.amount ?? 0);
  const refundServiceFee = Number(refundPayment?.serviceFee ?? 0);
  const askingForRefund = refundAvailable && wantRefund;
  const refundReasonOk = refundReason.trim().length >= REFUND_REASON_MIN;

  const handleCancel = async () => {
    if (!bookingToCancel) return;
    const b = bookingToCancel;
    setCancelError("");

    let refundAmount: number | null = null;
    if (askingForRefund) {
      if (!refundReasonOk) {
        setCancelError(`Please tell us why you are asking for a refund (at least ${REFUND_REASON_MIN} characters).`);
        return;
      }
      try {
        const payload = {
          paymentId: refundPaymentId,
          reason: refundReason.trim(),
          reasonType: "Other",
          idempotencyKey: `booking-${b.bookingId}-cancel`,
        };
        const refund = await requestRefund(payload).unwrap();
        refundAmount = Number(refund.amount);
      } catch (err: any) {
        setCancelError(`We could not request your refund, so the booking was not cancelled. ${apiError(err, "Please try again.")}`);
        return;
      }
    }

    try {
      await cancelBooking(b.bookingId).unwrap();
      setSuccessMessage(
        askingForRefund
          ? `Booking #${b.bookingId} was cancelled.${refundAmount ? ` A refund of ${fmtMoney(refundAmount)} was requested.` : " Your refund was requested."} The organizer will review it.`
          : `Booking #${b.bookingId} was cancelled.`
      );
      setDetailBooking(null);
      closeCancel();
    } catch (err: any) {
      setCancelError(
        `${askingForRefund ? "Your refund request was sent, but the booking could not be cancelled. Select the button again to retry. " : ""}${apiError(
          err,
          "Failed to cancel the booking. Please try again."
        )}`
      );
    }
  };

  const statusTabs: { key: StatusFilter; label: string; total: number }[] = [
    { key: "all", label: "All", total: bookings.length },
    { key: "Confirmed", label: "Confirmed", total: count("Confirmed") },
    { key: "Pending", label: "Pending", total: count("Pending") },
    { key: "Cancelled", label: "Cancelled", total: count("Cancelled") },
    { key: "Refunded", label: "Refunded", total: count("Refunded") },
  ];

  const detail = detailBooking as any;
  const detailEvent = detail?.event ?? null;
  const detailVenue = detailEvent?.venue ?? null;
  const detailTickets: any[] = Array.isArray(detail?.tickets) ? detail.tickets : [];
  const detailPayment = detailBooking ? latestPaymentOf(detailBooking) : null;
  const detailFees = detailBooking ? feeBreakdownOf(detailBooking) : null;
  const detailLines = detailBooking ? cartItemsOf(detailBooking) : [];

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
                A booking starts as <b>Pending</b> until payment goes through, then becomes <b>Confirmed</b>. You can mix ticket types in one booking — all
                of them show on the same cart. A small <b>service fee</b> is added on top of the ticket price and is discounted as you buy more tickets.
                You can cancel a Pending or Confirmed booking, and on a Confirmed booking you can request a refund of the ticket price (the service fee is
                not refunded).
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

      {/* SUMMARY */}
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
              {paged.map((b, i) => {
                const f = feeBreakdownOf(b);
                const ev = (b as any).event;
                return (
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

                      {ev?.date && (
                        <div className="flex flex-col gap-1 text-[11px] text-base-content/60">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Calendar size={11} className="text-primary shrink-0" />
                            <span className="truncate">{fmtEventWhen(ev.date, ev.time)}</span>
                          </span>
                          {ev?.venue?.name && (
                            <span className="flex items-center gap-1.5 min-w-0">
                              <MapPin size={11} className="text-primary shrink-0" />
                              <span className="truncate">{ev.venue.name}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* 🆕 Cart lines — shows every ticket type */}
                      <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col gap-1">
                        <span className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Tag size={10} /> {b.quantity} {b.quantity === 1 ? "ticket" : "tickets"}
                        </span>
                        <CartLines booking={b} />
                      </div>

                      {/* 🆕 Total summary */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Receipt size={10} /> Service fee
                          </span>
                          <span className="text-sm font-black text-base-content truncate">{f.fee > 0 ? fmtMoney(f.fee) : "—"}</span>
                        </div>
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col min-w-0">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Wallet size={10} /> Total
                          </span>
                          <span className="text-sm font-black text-base-content truncate">{fmtMoney(f.total)}</span>
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
                          <button
                            onClick={() => openCancel(b)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                            title={isPaid(b) ? "Cancel booking and request a refund" : "Cancel booking"}
                          >
                            <Ban size={13} />
                          </button>
                        )}
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
                    <th>Booking</th>
                    <th>Ticket types</th>
                    <th className="text-right">Tickets</th>
                    <th className="text-right">Ticket price</th>
                    <th className="text-right">Service fee</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                    <th>Booked on</th>
                    <th className="text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => {
                    const f = feeBreakdownOf(b);
                    const lines = cartItemsOf(b);
                    return (
                      <tr key={b.bookingId} onClick={() => setDetailBooking(b)} className="hover cursor-pointer">
                        <td className="font-bold text-base-content max-w-[14rem] truncate" title={eventLabel(b)}>
                          {eventLabel(b)}
                        </td>
                        <td>#{b.bookingId}</td>
                        <td className="max-w-[14rem]">
                          {lines.length === 0 ? (
                            "—"
                          ) : lines.length === 1 ? (
                            <span className="truncate">{lines[0].name}</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {lines.slice(0, 3).map((l, i) => (
                                <span key={i} className="truncate text-[11px]">
                                  {l.quantity}× {l.name}
                                </span>
                              ))}
                              {lines.length > 3 && <span className="text-[10px] text-base-content/40">+{lines.length - 3} more</span>}
                            </div>
                          )}
                        </td>
                        <td className="text-right">{b.quantity}</td>
                        <td className="text-right whitespace-nowrap">{fmtMoney(f.ticket)}</td>
                        <td className="text-right whitespace-nowrap">{f.fee > 0 ? fmtMoney(f.fee) : "—"}</td>
                        <td className="text-right font-bold whitespace-nowrap">{fmtMoney(f.total)}</td>
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
                            <button
                              onClick={() => openCancel(b)}
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                              title={isPaid(b) ? "Cancel booking and request a refund" : "Cancel booking"}
                            >
                              <Ban size={13} />
                            </button>
                          )}
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
                  onClick={() => openCancel(detailBooking)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold text-error bg-error/10 hover:bg-error/20 gap-1 flex-1 sm:flex-none"
                >
                  <XCircle size={14} /> {isPaid(detailBooking) ? "Cancel and refund" : "Cancel booking"}
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
        {detailBooking && detailFees && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-base-content/60 font-semibold">Status</span>
              <span className={`badge badge-sm font-bold ${statusBadge(detailBooking.bookingStatus)}`}>{detailBooking.bookingStatus}</span>
            </div>

            {canPay(detailBooking) && (
              <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3 text-[11px] text-base-content/80">
                <Clock size={14} className="text-warning shrink-0 mt-0.5" />
                <span>This booking is waiting for payment. Pay now to confirm your tickets. The service fee is shown before you pay.</span>
              </div>
            )}

            {/* Event */}
            <div className="rounded-2xl border border-base-200 bg-base-200/30 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-sm text-base-content break-words">{eventLabel(detailBooking)}</span>
                  {detailEvent?.category && (
                    <span className="text-[11px] text-base-content/50 capitalize">{detailEvent.category}</span>
                  )}
                </div>
              </div>
              {detailEvent?.date && (
                <span className="flex items-center gap-2 text-xs text-base-content/80">
                  <Clock size={12} className="text-primary shrink-0" /> {fmtEventWhen(detailEvent.date, detailEvent.time)}
                </span>
              )}
              {detailVenue?.name && (
                <span className="flex items-start gap-2 text-xs text-base-content/80">
                  <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold text-base-content">{detailVenue.name}</span>
                    {detailVenue.address ? `, ${detailVenue.address}` : ""}
                  </span>
                </span>
              )}
            </div>

            {/* 🆕 Cart lines */}
            <div className="rounded-2xl border border-base-200 overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/50">
                <span className="flex items-center gap-2">
                  <Tag size={14} className="text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">
                    Ticket types ({detailLines.length})
                  </span>
                </span>
                <span className="text-[11px] font-bold text-base-content/60">{detailBooking.quantity} tickets</span>
              </div>
              <ul className="divide-y divide-base-200">
                {detailLines.map((line, i) => (
                  <li key={`${line.ticketTypeId}-${i}`} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-base-content truncate">{line.name}</span>
                      <span className="text-[10px] text-base-content/50">
                        {line.quantity} × {fmtMoney(line.unitPrice)}
                      </span>
                    </div>
                    <span className="font-black text-base-content whitespace-nowrap">{fmtMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Booking facts */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
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

            {/* Price breakdown */}
            <PriceBreakdown
              booking={detailBooking}
              ticket={detailFees.ticket}
              fee={detailFees.fee}
              total={detailFees.total}
              percent={detailFees.percent}
              quantity={detailBooking.quantity}
              totalLabel={detailFees.hasPayment ? "Total paid" : "Total"}
              feeNote={detailFees.hasPayment ? "none" : "included"}
            />

            {/* Payment */}
            {detailPayment && (
              <div className="rounded-2xl border border-base-200 overflow-hidden">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/50">
                  <span className="flex items-center gap-2">
                    <CreditCard size={14} className="text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Payment</span>
                  </span>
                  <span className={`badge badge-sm font-bold ${paymentBadge(detailPayment.paymentStatus)}`}>{detailPayment.paymentStatus}</span>
                </div>
                <div className="p-3.5 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] text-base-content/60 font-semibold">Method</span>
                    <span className="font-bold text-base-content break-words">{detailPayment.paymentMethod || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] text-base-content/60 font-semibold">Paid on</span>
                    <span className="font-bold text-base-content">{fmtDateTime(detailPayment.paymentDate)}</span>
                  </div>
                  {detailPayment.transactionId && (
                    <div className="flex flex-col gap-0.5 min-w-0 col-span-2">
                      <span className="text-[11px] text-base-content/60 font-semibold flex items-center gap-1">
                        <Hash size={11} /> Transaction ID
                      </span>
                      <span className="font-bold text-base-content break-all">{detailPayment.transactionId}</span>
                    </div>
                  )}
                  {detailBooking.checkoutRequestId && (
                    <div className="flex flex-col gap-0.5 min-w-0 col-span-2">
                      <span className="text-[11px] text-base-content/60 font-semibold">Reference</span>
                      <span className="font-bold text-base-content break-all">{detailBooking.checkoutRequestId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tickets */}
            {detailTickets.length > 0 && (
              <div className="rounded-2xl border border-base-200 overflow-hidden">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/50">
                  <span className="flex items-center gap-2">
                    <Ticket size={14} className="text-primary" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Your tickets</span>
                  </span>
                  <span className="text-[11px] font-bold text-base-content/60">{detailTickets.length}</span>
                </div>
                <ul className="max-h-56 overflow-y-auto divide-y divide-base-200">
                  {detailTickets.map((t: any) => (
                    <li key={t.ticketId ?? t.ticketNumber} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-base-content truncate">{t.attendeeName || "Unassigned"}</span>
                        <span className="text-[10px] text-base-content/50 truncate">{t.ticketNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.isScanned && <span className="badge badge-ghost badge-sm font-bold">Scanned</span>}
                        <span className={`badge badge-sm font-bold ${ticketBadge(t.lifecycleStatus)}`}>{t.lifecycleStatus}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                    disabled={payBlocked}
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
            <div className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 p-3">
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base-content truncate">{eventLabel(bookingToPay)}</span>
                <span className="text-[11px] text-base-content/60">
                  {bookingToPay.quantity} {bookingToPay.quantity === 1 ? "ticket" : "tickets"}
                </span>
              </div>
            </div>

            {/* 🆕 Cart summary in the pay modal */}
            <div className="rounded-xl border border-base-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-base-200 bg-base-200/40 flex items-center gap-2">
                <ShoppingBag size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-base-content/60">Your cart</span>
              </div>
              <ul className="divide-y divide-base-200">
                {cartItemsOf(bookingToPay).map((line, i) => (
                  <li key={`${line.ticketTypeId}-${i}`} className="px-3 py-2 flex items-center justify-between gap-3 text-[11px]">
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{line.quantity}×</span> {line.name}
                    </span>
                    <span className="shrink-0 font-bold whitespace-nowrap">{fmtMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {payStage !== "success" &&
              (payTotalLoading ? (
                <div className="skeleton h-32 rounded-2xl" />
              ) : (
                payTotals && (
                  <PriceBreakdown
                    booking={bookingToPay}
                    ticket={payTotals.ticket}
                    fee={payTotals.fee}
                    total={payTotals.total}
                    percent={payTotals.percent}
                    quantity={bookingToPay.quantity}
                    totalLabel="Total to pay"
                  />
                )
              ))}

            {checkoutQ.isError && payStage === "form" && (
              <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3 text-[11px] text-base-content/80">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <span>We could not load the service fee. The total above may not include it. The exact amount is shown on the M-Pesa prompt before you approve.</span>
              </div>
            )}

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
                  We will send a prompt to this number. Enter your M-Pesa PIN on your phone to approve {payTotals ? fmtMoney(payTotals.total) : "the payment"}.
                </p>

                <div className="divider my-0 text-[10px] text-base-content/40">or</div>

                <button
                  onClick={handleCheckout}
                  disabled={payBlocked}
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
                    Enter your M-Pesa PIN to pay {payTotals ? fmtMoney(payTotals.total) : "now"}. This page will update when the payment arrives.
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

      {/* MODAL: CANCEL (AND REFUND) CONFIRMATION */}
      <ModalShell
        open={!!bookingToCancel && !showRefundTerms}
        onClose={closeCancel}
        placement="center"
        maxWidth="sm"
        hideHeader
        dismissible={!cancelBusy}
        footer={
          <div className="flex items-center justify-center gap-2 w-full">
            <button type="button" onClick={closeCancel} disabled={cancelBusy} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
              Keep booking
            </button>
            <button
              type="button"
              disabled={cancelBusy}
              onClick={askingForRefund ? openRefundTerms : handleCancel}
              className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
            >
              {cancelBusy ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : askingForRefund ? (
                "Review refund terms"
              ) : (
                "Yes, cancel"
              )}
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
                <span className="font-bold text-base-content">{eventLabel(bookingToCancel)}</span> ({bookingToCancel.quantity}{" "}
                {bookingToCancel.quantity === 1 ? "ticket" : "tickets"}) will be cancelled. This cannot be undone.
              </p>
            </div>

            {refundAvailable && (
              <label className="w-full flex items-start gap-2.5 text-left rounded-xl border border-base-200 bg-base-200/40 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantRefund}
                  onChange={(e) => setWantRefund(e.target.checked)}
                  disabled={cancelBusy}
                  className="checkbox checkbox-primary checkbox-sm mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <Banknote size={13} className="text-primary" /> Request a refund
                  </span>
                  <span className="text-[11px] text-base-content/60 leading-relaxed">
                    We will ask for the ticket price back
                    {refundTicketAmount > 0 ? ` (${fmtMoney(refundTicketAmount)})` : ""}.{" "}
                    {refundServiceFee > 0
                      ? `The service fee of ${fmtMoney(refundServiceFee)} is not refunded. `
                      : "The service fee, if any, is not refunded. "}
                    The organizer reviews the request, and approved refunds go back to the number or card you paid with.
                  </span>
                </span>
              </label>
            )}

            {alreadyRefunded && (
              <p className="text-[11px] text-base-content/50">The tickets on this booking have already been refunded.</p>
            )}

            {refundMissingPayment && (
              <div className="w-full flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3 text-left text-[11px] text-base-content/80">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <span>We could not find the payment for this booking, so a refund cannot be requested here. Contact support before you cancel if you paid.</span>
              </div>
            )}

            {bookingToCancel.bookingStatus === "Pending" && (
              <p className="text-[11px] text-base-content/50">You have not paid for this booking, so there is nothing to refund.</p>
            )}

            {cancelError && (
              <div className="alert alert-error text-[11px] font-semibold py-2 rounded-xl text-left" role="alert">
                <AlertCircle size={14} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* MODAL: REFUND TERMS */}
      <ModalShell
        open={!!bookingToCancel && showRefundTerms}
        onClose={() => setShowRefundTerms(false)}
        icon={<FileText size={16} />}
        title="Refund terms"
        dismissible={!cancelBusy}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRefundTerms(false)}
              disabled={cancelBusy}
              className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={!agreedRefundTerms || !refundReasonOk || cancelBusy}
              className="btn btn-error btn-sm rounded-xl font-bold text-error-content gap-1 flex-1 sm:flex-none"
            >
              {cancelBusy ? <span className="loading loading-spinner loading-xs" /> : <Banknote size={14} />}
              Agree and request refund
            </button>
          </div>
        }
      >
        {bookingToCancel && (
          <div className="flex flex-col gap-4 text-xs">
            <p className="text-base-content/70 leading-relaxed">
              Please read the refund terms before you continue. Cancelling booking{" "}
              <span className="font-bold text-base-content">#{bookingToCancel.bookingId}</span> for{" "}
              <span className="font-bold text-base-content">{eventLabel(bookingToCancel)}</span> cannot be undone.
            </p>

            <div className="rounded-xl bg-base-200/50 border border-base-200 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base-content/70">Ticket price to be requested</span>
                <span className="font-black text-base-content whitespace-nowrap">{fmtMoney(refundTicketAmount)}</span>
              </div>
              {refundServiceFee > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base-content/70">Service fee (not part of this request)</span>
                  <span className="font-bold text-base-content/70 whitespace-nowrap">{fmtMoney(refundServiceFee)}</span>
                </div>
              )}
            </div>

            {(bookingToCancel as any).event?.cancellationPolicy && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-base-content/60">Organizer's refund policy</span>
                <p className="text-base-content/80 leading-relaxed whitespace-pre-line">{(bookingToCancel as any).event.cancellationPolicy}</p>
              </div>
            )}

            <div className="rounded-2xl border border-base-200 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-base-200 bg-base-200/50 flex items-center gap-2">
                <FileText size={14} className="text-primary shrink-0" />
                <span className="font-black text-base-content">{REFUND_TERMS_TITLE}</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-3.5 flex flex-col gap-3">
                {REFUND_TERMS.map((t) => (
                  <p key={t.lead} className="text-base-content/70 leading-relaxed">
                    <span className="font-bold text-base-content">{t.lead}</span> {t.text}
                  </p>
                ))}
                <p className="text-[11px] text-base-content/50">
                  Your order reference: <span className="font-bold break-all">{bookingToCancel.checkoutRequestId || `#${bookingToCancel.bookingId}`}</span>
                </p>
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-base-content">
                  Why are you asking for a refund? <span className="text-error">*</span>
                </span>
                <span className={`text-[10px] ${refundReason.trim().length > 0 && !refundReasonOk ? "text-error" : "text-base-content/40"}`}>
                  {refundReason.length}/{REFUND_REASON_MAX}
                </span>
              </span>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value.slice(0, REFUND_REASON_MAX))}
                disabled={cancelBusy}
                rows={3}
                placeholder="For example: the event date was moved and I can no longer attend."
                className="textarea textarea-bordered rounded-xl w-full text-xs leading-relaxed"
                aria-required="true"
              />
              {refundReason.trim().length > 0 && !refundReasonOk && (
                <span className="text-[11px] text-error">Please write at least {REFUND_REASON_MIN} characters so the organizer understands your request.</span>
              )}
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedRefundTerms}
                onChange={(e) => setAgreedRefundTerms(e.target.checked)}
                disabled={cancelBusy}
                className="checkbox checkbox-primary checkbox-sm mt-0.5"
              />
              <span className="text-base-content/80 leading-relaxed">
                I have read and agree to the refund terms above. I understand that refunds are subject to the Organizer's review and are not guaranteed.
              </span>
            </label>

            {cancelError && (
              <div className="alert alert-error text-[11px] font-semibold py-2 rounded-xl" role="alert">
                <AlertCircle size={14} className="shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default MyBookings;