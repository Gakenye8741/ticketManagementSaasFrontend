/**
 * ======================================================================
 * ORGANIZER REFUND MANAGER
 * ======================================================================
 *
 * HOW THIS PAGE WORKS
 * -------------------
 * 0. YOUR ORGANIZATION
 *    The page shows only your own organization's refunds
 *    (GET refunds/org/:orgId). The org id comes from the `orgId` prop, or
 *    from the logged-in user in the Redux store. The backend also checks it,
 *    so you can never see another organization's refunds.
 *
 * 1. OVERVIEW
 *    The status tiles show how many refunds are in each state and how much
 *    money they hold. Click a tile to filter the list, click it again to
 *    clear. The colored card shows what has been refunded so far, plus the
 *    money waiting for an admin or already with Paystack. The list
 *    refreshes every 15 seconds.
 *
 * 2. REFUNDS LIST  (cards or table)
 *      - PENDING    = waiting for an ADMIN to approve or reject it.
 *                     Organizers can't approve refunds from this page.
 *      - PROCESSING = already approved and with Paystack. It finishes by
 *                     itself once Paystack confirms, so there is nothing to do.
 *      - COMPLETED / FAILED / REJECTED = finished. Open "Details" to see
 *                     everything, including why a refund failed.
 *
 * 3. NEW REFUND
 *    Request a refund for a payment on one of your events: the whole booking
 *    or only chosen tickets. It starts as Pending until an admin approves it.
 *
 * 4. CANCELLED EVENTS
 *    Refunding everyone after an event is cancelled is done by an admin,
 *    not from this page.
 *
 * 5. FEEDBACK
 *    Success and error banners are dismissible. Success banners close after
 *    5 seconds, errors stay until dismissed. Errors inside a modal show in
 *    that modal.
 * ======================================================================
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";

import {
  Undo2,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Banknote,
  Clock,
  Inbox,
  Info,
  LayoutGrid,
  Table as TableIcon,
  Send,
  Eye,
  Ban,
} from "lucide-react";

import {
  useGetOrgRefundsQuery,
  useRequestRefundMutation,
  type Refund,
  type RefundStatus,
  type RefundReasonType,
  type RequestRefundPayload,
} from "../../features/APIS/RefundApi"; // 👈 adjust to where your refundApi lives

import type { RootState } from "../../App/store"; // 👈 adjust if your store lives elsewhere
import { usePageTitle } from "../../hooks/usePageTitle";

// ======================================================
// CONSTANTS
// ======================================================

type ViewMode = "cards" | "table";

/** How often the list refreshes by itself, so Processing refunds update once Paystack confirms */
const REFRESH_MS = 15_000;
const PAGE_SIZE = 12;

const STATUSES: RefundStatus[] = ["Pending", "Processing", "Completed", "Failed", "Rejected"];

const STATUS_HINT: Record<RefundStatus, string> = {
  Pending: "Waiting for admin",
  Processing: "With Paystack",
  Completed: "Paid back",
  Failed: "Needs attention",
  Rejected: "Declined",
};

const REASON_LABEL: Record<RefundReasonType, string> = {
  Other: "Other",
  EventCancelled: "Event cancelled",
  EventPostponed: "Event postponed",
  MaterialChange: "Material change",
};

const STATUS_ICON: Record<RefundStatus, ReactNode> = {
  Pending: <Clock size={15} />,
  Processing: <Send size={15} />,
  Completed: <CheckCircle2 size={15} />,
  Failed: <AlertCircle size={15} />,
  Rejected: <Ban size={15} />,
};

// ======================================================
// STYLES (same system as the admin refund manager)
// ======================================================

const inputClass = "input input-bordered input-sm rounded-xl w-full text-xs";
const selectClass = "select select-bordered select-sm rounded-xl w-full text-xs";
const textareaClass = "textarea textarea-bordered rounded-xl w-full text-xs";
const labelClass = "font-semibold text-base-content/70 text-[11px]";
const panelClass = "bg-base-100 border border-base-200 rounded-2xl shadow-sm";
const btnBase = "rounded-xl text-xs font-bold";

const modalBackdrop = "fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
const modalMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

// ======================================================
// HELPERS
// ======================================================

/** Always returns a plain string, never an object */
const getErrorMessage = (err: any, fallback: string): string => {
  const msg = err?.data?.message ?? err?.data?.error;
  if (typeof msg === "string" && msg) return msg;

  if (err?.status === 400) return "Invalid request. Please check your details.";
  if (err?.status === 401) return "Your session has expired. Please log in again.";
  if (err?.status === 403) return "You can only manage refunds for your own organization.";
  if (err?.status === 404) return "That refund or payment was not found.";
  if (err?.status === 409) return "This refund can't be changed in its current state.";
  if (err?.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (err?.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection or API URL.";

  return fallback;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (value: number | string | undefined | null, currency = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(num(value));

const formatDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ======================================================
// SHARED UI
// ======================================================

const InlineError = ({ message }: { message: string }) =>
  message ? (
    <div role="alert" className="alert alert-error text-xs font-semibold py-2 rounded-xl">
      <AlertCircle size={16} className="shrink-0" />
      <span className="break-words min-w-0">{message}</span>
    </div>
  ) : null;

/** Round icon box that stands in for a logo on each refund */
const RefundAvatar = ({ size = "w-11 h-11" }: { size?: string }) => (
  <div className={`${size} rounded-xl bg-primary/10 text-primary border border-base-200 flex items-center justify-center shrink-0`}>
    <Undo2 size={16} />
  </div>
);

const StatusBadge = ({ status }: { status: RefundStatus }) => {
  switch (status) {
    case "Processing":
      return (
        <span className="badge badge-sm badge-info gap-1 font-bold text-info-content">
          <span className="loading loading-spinner loading-xs" /> Processing
        </span>
      );
    case "Pending":
      return <span className="badge badge-sm badge-warning font-bold text-warning-content">Pending</span>;
    case "Completed":
      return <span className="badge badge-sm badge-success font-bold text-success-content">Completed</span>;
    case "Failed":
      return <span className="badge badge-sm badge-error font-bold text-error-content">Failed</span>;
    default:
      return <span className="badge badge-sm badge-ghost font-bold">Rejected</span>;
  }
};

const ModalShell = ({
  title,
  onClose,
  maxWidth = "max-w-md",
  icon,
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidth?: string;
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <div className={modalBackdrop}>
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      {...modalMotion}
      className={`bg-base-100 border border-base-200 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon ?? <Undo2 size={16} />}</span>
          <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
        </div>

        <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg" type="button" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {children}
    </motion.div>
  </div>
);

const ModalActions = ({
  onCancel,
  isLoading,
  submitLabel,
  disabled,
  danger,
}: {
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
    <button type="button" onClick={onCancel} disabled={isLoading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
      Cancel
    </button>

    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`btn btn-xs sm:btn-sm rounded-xl font-bold ${danger ? "btn-error text-error-content" : "btn-primary"}`}
    >
      {isLoading ? <span className="loading loading-spinner loading-xs" /> : submitLabel}
    </button>
  </div>
);

const Banner = ({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) => (
  <div
    role={type === "error" ? "alert" : "status"}
    className={`alert ${type === "success" ? "alert-success" : "alert-error"} text-xs font-semibold py-2 rounded-xl shadow-sm sticky top-3 z-40`}
  >
    {type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
    <span className="break-words min-w-0 flex-1">{message}</span>
    <button onClick={onDismiss} className="btn btn-ghost btn-xs btn-square" aria-label="Dismiss message">
      <X size={14} />
    </button>
  </div>
);

// ======================================================
// DETAILS MODAL
// ======================================================

const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-0.5 sm:gap-4 py-2 border-b border-base-200 last:border-b-0">
    <span className="text-[11px] text-base-content/60 font-semibold shrink-0">{label}</span>
    <span className="text-xs font-bold text-base-content break-words sm:text-right min-w-0">{children}</span>
  </div>
);

const DetailsModal = ({ refund: r, onClose, actions }: { refund: Refund; onClose: () => void; actions: ReactNode }) => (
  <ModalShell title={`Refund #${r.refundId}`} maxWidth="max-w-lg" icon={<Eye size={16} />} onClose={onClose}>
    <div className="flex items-center gap-3 rounded-2xl bg-base-200/50 p-3">
      <RefundAvatar />
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className="font-black text-sm text-base-content tabular-nums">{money(r.amount)}</span>
        <span className="text-[11px] text-base-content/60">Booking #{r.bookingId}</span>
      </div>
      <div className="ml-auto">
        <StatusBadge status={r.status} />
      </div>
    </div>

    {r.status === "Failed" && r.failureReason && (
      <div className="flex items-start gap-2 text-[11px] text-error bg-error/10 rounded-xl p-3">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span className="break-words min-w-0">{r.failureReason}</span>
      </div>
    )}

    <div className="flex flex-col">
      <DetailRow label="Ticket price">{money(r.ticketAmount)}</DetailRow>
      <DetailRow label="Service fee">{money(r.serviceFeeAmount)}</DetailRow>
      <DetailRow label="Taken from your wallet">{money(r.organizerDebit)}</DetailRow>
      <DetailRow label="Booking">#{r.bookingId}</DetailRow>
      <DetailRow label="Payment">#{r.paymentId}</DetailRow>
      <DetailRow label="Tickets">{r.ticketIds?.length ? r.ticketIds.join(", ") : "Whole booking"}</DetailRow>
      <DetailRow label="Reason type">{REASON_LABEL[r.reasonType] ?? r.reasonType}</DetailRow>
      <DetailRow label="Reason">{r.reason || "—"}</DetailRow>
      <DetailRow label="Approved at">{formatDate(r.approvedAt)}</DetailRow>
      <DetailRow label="Paystack refund id">
        <span className="font-mono">{r.transactionReference || "—"}</span>
      </DetailRow>
      <DetailRow label="Processed at">{formatDate(r.processedAt)}</DetailRow>
      <DetailRow label="Created">{formatDate(r.createdAt)}</DetailRow>
      <DetailRow label="Last updated">{formatDate(r.updatedAt)}</DetailRow>
    </div>

    <div className="flex justify-end gap-2 pt-3 border-t border-base-200">{actions}</div>
  </ModalShell>
);

// ======================================================
// NEW REFUND MODAL
// ======================================================

const NewRefundModal = ({
  loading,
  error,
  onClose,
  onSubmit,
  onInvalid,
}: {
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (p: RequestRefundPayload) => void;
  onInvalid: (msg: string) => void;
}) => {
  const [paymentId, setPaymentId] = useState("");
  const [tickets, setTickets] = useState("");
  const [reasonType, setReasonType] = useState<RefundReasonType>("Other");
  const [reason, setReason] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();

    const pid = Number(paymentId);
    if (!Number.isInteger(pid) || pid <= 0) return onInvalid("Enter a valid payment ID.");

    const ticketIds = tickets
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number);
    if (ticketIds.some((n) => !Number.isInteger(n) || n <= 0)) return onInvalid("Ticket IDs must be numbers separated by commas.");

    onSubmit({
      paymentId: pid,
      ticketIds: ticketIds.length ? ticketIds : undefined,
      reasonType,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <ModalShell title="New refund" icon={<Plus size={16} />} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Payment ID</label>
          <input type="text" inputMode="numeric" autoFocus placeholder="e.g. 13" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Ticket IDs (optional)</label>
          <input type="text" placeholder="93, 94" value={tickets} onChange={(e) => setTickets(e.target.value)} className={inputClass} />
          <span className="text-[11px] text-base-content/50">Leave empty to refund every valid ticket on the booking.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Reason type</label>
          <select value={reasonType} onChange={(e) => setReasonType(e.target.value as RefundReasonType)} className={selectClass}>
            {(Object.keys(REASON_LABEL) as RefundReasonType[]).map((k) => (
              <option key={k} value={k}>
                {REASON_LABEL[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Note</label>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="Why is this refund needed?" />
        </div>

        <div className="flex items-start gap-2 text-[11px] text-base-content/70 bg-base-200/60 rounded-xl p-3">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <span>The refund is created as Pending. No money moves until an admin approves it.</span>
        </div>

        <InlineError message={error} />

        <ModalActions onCancel={onClose} isLoading={loading} submitLabel="Create refund" />
      </form>
    </ModalShell>
  );
};

// ======================================================
// "HOW IT WORKS" MODAL
// ======================================================

const HOW_IT_WORKS = [
  {
    title: "Watch the status tiles",
    text: "Each tile shows how many refunds are in that state and how much money they hold. Click one to filter the list.",
  },
  {
    title: "Request a refund",
    text: "Use New refund for one payment. It is created as Pending and an admin approves or rejects it. You can't approve refunds yourself.",
  },
  {
    title: "Let Paystack finish",
    text: "Once an admin approves, the refund goes to Paystack and shows as Processing. It completes by itself. If one shows Failed, open Details to see why.",
  },
  {
    title: "Cancelled events",
    text: "If you cancel an event, an admin refunds all attendees. Contact support if it is taking long.",
  },
];

const HowItWorksModal = ({ onClose }: { onClose: () => void }) => (
  <ModalShell title="How this page works" maxWidth="max-w-lg" icon={<Info size={16} />} onClose={onClose}>
    <ol className="flex flex-col gap-3 text-xs">
      {HOW_IT_WORKS.map((step, i) => (
        <li key={step.title} className="flex gap-3 rounded-2xl bg-base-200/50 p-3">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center font-black shrink-0">{i + 1}</span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-black text-sm text-base-content">{step.title}</span>
            <span className="text-base-content/70 leading-relaxed">{step.text}</span>
          </div>
        </li>
      ))}
    </ol>

    <div className="flex items-start gap-2 text-[11px] text-base-content/60 bg-base-200/60 rounded-xl p-3">
      <Info size={14} className="text-primary shrink-0 mt-0.5" />
      <span>The list refreshes by itself every few seconds and after every action. Use the refresh button if something looks out of date.</span>
    </div>

    <div className="flex justify-end pt-4 border-t border-base-200">
      <button onClick={onClose} className={`btn btn-primary btn-sm ${btnBase}`}>
        Got it
      </button>
    </div>
  </ModalShell>
);

// ======================================================
// PAGE
// ======================================================

type Dialog =
  | { kind: "details"; refund: Refund }
  | { kind: "new" }
  | null;

export const OrganizerRefunds = ({ orgId: orgIdProp }: { orgId?: number }) => {
  usePageTitle("Refunds · Organizer");

  // The org id comes from the prop, or from the logged-in user. Adjust the field name to match your auth state.
  const authUser = useSelector((state: RootState) => (state as any).auth?.user) as any;
  const orgId = Number(orgIdProp ?? authUser?.orgId ?? authUser?.organizationId) || null;

  const { data: refunds = [], isLoading, isFetching, isError, error, refetch } = useGetOrgRefundsQuery(
    { orgId: orgId ?? 0 },
    { skip: orgId === null, pollingInterval: REFRESH_MS }
  );

  const [requestRefund, { isLoading: requesting }] = useRequestRefundMutation();

  const [view, setView] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [modalError, setModalError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // One timer for the success banner, so a newer message isn't closed early by an older timer
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showSuccess = (msg: string) => {
    clearTimeout(timer.current);
    setErrorMessage("");
    setSuccessMessage(msg);
    if (msg) timer.current = setTimeout(() => setSuccessMessage(""), 5000);
  };

  const showError = (msg: string) => {
    clearTimeout(timer.current);
    setSuccessMessage("");
    setErrorMessage(msg);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // ---- numbers for the status tiles and the colored card ----
  const stats = useMemo(() => {
    const s = {} as Record<RefundStatus, { count: number; total: number }>;
    STATUSES.forEach((k) => (s[k] = { count: 0, total: 0 }));
    refunds.forEach((r) => {
      s[r.status].count += 1;
      s[r.status].total += num(r.amount);
    });
    return s;
  }, [refunds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...refunds]
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter(
        (r) =>
          !q ||
          [r.refundId, r.paymentId, r.bookingId, r.transactionReference, r.reason]
            .filter((x) => x !== null && x !== undefined)
            .some((x) => String(x).toLowerCase().includes(q))
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [refunds, statusFilter, search]);

  const shown = filtered.slice(0, visibleCount);
  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  // ---- dialogs ----
  const openDialog = (d: Exclude<Dialog, null>) => {
    setModalError("");
    setDialog(d);
  };
  const closeDialog = () => setDialog(null);

  // ---- new refund ----
  const handleNew = async (payload: RequestRefundPayload) => {
    setModalError("");
    try {
      const r = await requestRefund(payload).unwrap();
      showSuccess(`Refund #${r.refundId} created and waiting for admin approval.`);
      closeDialog();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to create the refund."));
    }
  };

  /** Action buttons, shared by the card, table and details layouts */
  const rowActions = (r: Refund, compact = false, withDetails = true) => {
    const size = compact ? "btn-xs rounded-lg font-bold" : `btn-sm ${btnBase}`;

    return (
      <div className="flex flex-wrap gap-2">
        {r.status === "Pending" && (
          <span className="badge badge-warning badge-outline gap-1 font-bold text-[10px] py-3">
            <Clock size={11} /> Waiting for admin
          </span>
        )}

        {withDetails && (
          <button onClick={() => openDialog({ kind: "details", refund: r })} className={`btn btn-ghost bg-base-200 gap-1.5 ${size}`}>
            <Eye size={13} /> Details
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Undo2 size={20} />
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Refunds</h1>
            <p className="text-[11px] text-base-content/60">Request and track refunds for your events</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:flex gap-2 w-full lg:w-auto">
          <button onClick={() => setShowHelp(true)} className="btn btn-ghost btn-sm bg-base-200 gap-1.5 rounded-xl text-xs font-bold">
            <Info size={14} /> How it works
          </button>
          <button onClick={() => openDialog({ kind: "new" })} className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold">
            <Plus size={14} /> New refund
          </button>
        </div>
      </div>

      {/* DISMISSIBLE NOTIFICATIONS */}
      {successMessage && <Banner type="success" message={successMessage} onDismiss={() => setSuccessMessage("")} />}
      {errorMessage && <Banner type="error" message={errorMessage} onDismiss={() => setErrorMessage("")} />}

      {orgId === null ? (
        <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Inbox size={36} className="mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-xs text-base-content">We couldn't find your organization</p>
          <p className="text-[11px] text-base-content/60 mt-0.5">Log in again, or ask an admin to link your account to an organization.</p>
        </div>
      ) : (
        <>
          {/* WAITING FOR ADMIN */}
          {stats.Pending.count > 0 && statusFilter !== "Pending" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-primary/5 border border-primary/20 p-4">
              <span className="text-xs font-bold text-base-content">
                {stats.Pending.count} refund{stats.Pending.count === 1 ? "" : "s"} waiting for admin approval, totalling {money(stats.Pending.total)}
              </span>
              <button
                onClick={() => {
                  setStatusFilter("Pending");
                  resetPaging();
                }}
                className={`btn btn-primary btn-sm gap-2 ${btnBase}`}
              >
                <Clock size={14} /> View pending
              </button>
            </div>
          )}

          {/* OVERVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className={`lg:col-span-2 ${panelClass} p-4 sm:p-5 flex flex-col gap-4`}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Refunds by status</h3>
                  <Banknote size={16} className="text-primary" />
                </div>
                <p className="text-[11px] text-base-content/60">Click a status to filter the list below. Click it again to clear.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STATUSES.map((s) => {
                  const active = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setStatusFilter(active ? "all" : s);
                        resetPaging();
                      }}
                      className={`text-left p-4 rounded-2xl border transition-colors flex items-start justify-between gap-2 ${
                        active ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-base-100 border-base-200 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[11px] text-base-content/60 font-semibold">{s}</span>
                        <span className="text-lg font-black text-base-content tabular-nums">{stats[s].count}</span>
                        <span className="text-[10px] text-base-content/50 break-words">
                          {STATUS_HINT[s]}, {money(stats[s].total)}
                        </span>
                      </div>
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">{STATUS_ICON[s]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOTAL REFUNDED */}
            <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-content shadow-lg flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Total refunded</span>

                  {isLoading ? (
                    <div className="skeleton h-9 w-44 rounded-lg opacity-30" />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-black tracking-tight break-words">
                      {isError ? "Unavailable" : money(stats.Completed.total)}
                    </span>
                  )}

                  <span className="text-[11px] opacity-75 break-words">
                    {isError
                      ? getErrorMessage(error, "Could not load refunds.")
                      : `${stats.Completed.count} completed refund${stats.Completed.count === 1 ? "" : "s"}`}
                  </span>
                </div>

                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors disabled:opacity-60 shrink-0"
                  title="Refresh refunds"
                  aria-label="Refresh refunds"
                >
                  <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5 min-w-0">
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                    <Clock size={11} /> Awaiting admin
                  </span>
                  <span className="text-base font-black break-words">
                    {isLoading ? <span className="loading loading-dots loading-xs" /> : money(stats.Pending.total)}
                  </span>
                </div>

                <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5 min-w-0">
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                    <Send size={11} /> With Paystack
                  </span>
                  <span className="text-base font-black break-words">
                    {isLoading ? <span className="loading loading-dots loading-xs" /> : money(stats.Processing.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* REFUNDS LIST */}
          <div className={`${panelClass} p-4 sm:p-5 flex flex-col gap-4`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Undo2 size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Your refunds</h3>
                  {filtered.length > 0 && <span className="badge badge-sm badge-ghost font-bold">{filtered.length}</span>}
                </div>
                <p className="text-[11px] text-base-content/60">Follow your refunds. An admin approves the pending ones.</p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
                <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 text-xs sm:w-60">
                  <Search size={14} className="text-base-content/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search refund, booking, payment"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      resetPaging();
                    }}
                    className="grow"
                    aria-label="Search refunds"
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as RefundStatus | "all");
                    resetPaging();
                  }}
                  className={`${selectClass} sm:w-40 font-semibold`}
                  aria-label="Filter refunds by status"
                >
                  <option value="all">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <div className="join self-start" role="group" aria-label="Choose how refunds are shown">
                  <button
                    onClick={() => setView("cards")}
                    aria-pressed={view === "cards"}
                    className={`btn btn-sm join-item gap-2 ${btnBase} ${view === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                  >
                    <LayoutGrid size={14} /> Cards
                  </button>
                  <button
                    onClick={() => setView("table")}
                    aria-pressed={view === "table"}
                    className={`btn btn-sm join-item gap-2 ${btnBase} ${view === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                  >
                    <TableIcon size={14} /> Table
                  </button>
                </div>
              </div>
            </div>

            {/* LIST */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-base-100 border border-base-200">
                    <span className="skeleton w-11 h-11 rounded-xl shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <span className="skeleton h-4 w-40 rounded" />
                      <span className="skeleton h-3 w-56 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <InlineError message={getErrorMessage(error, "Could not load refunds.")} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
                <Inbox size={36} className="mx-auto text-primary/40 mb-2" />
                <p className="font-bold text-xs text-base-content">{refunds.length === 0 ? "No refunds yet" : "No refunds match these filters"}</p>
                <p className="text-[11px] text-base-content/60 mt-0.5">
                  {refunds.length === 0 ? "Refunds requested by your customers or created by you will show up here." : "Clear the search or pick another status."}
                </p>
              </div>
            ) : view === "table" ? (
              <div className="overflow-x-auto bg-base-100 border border-base-200 rounded-2xl shadow-sm">
                <table className="table table-sm w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                      <th className="py-3 px-4 font-bold">Refund</th>
                      <th className="py-3 px-4 font-bold">Booking</th>
                      <th className="py-3 px-4 font-bold text-right">Refunded</th>
                      <th className="py-3 px-4 font-bold text-right">From your wallet</th>
                      <th className="py-3 px-4 font-bold">Reason</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Requested</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.refundId} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs">#{r.refundId}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col text-xs">
                            <span>Booking #{r.bookingId}</span>
                            <span className="text-[10px] text-base-content/50">Payment #{r.paymentId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-success tabular-nums text-xs">{money(r.amount)}</span>
                            {num(r.serviceFeeAmount) > 0 && <span className="text-[10px] text-base-content/50">incl. {money(r.serviceFeeAmount)} fee</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-xs text-base-content/60">{money(r.organizerDebit)}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col text-xs max-w-[14rem]">
                            <span>{REASON_LABEL[r.reasonType] ?? r.reasonType}</span>
                            {r.reason && <span className="text-[10px] text-base-content/50 truncate">{r.reason}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={r.status} />
                            {r.status === "Failed" && r.failureReason && <span className="text-[10px] text-error max-w-[12rem] break-words">{r.failureReason}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-base-content/60 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="py-3 px-4">{rowActions(r, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {shown.map((r) => (
                  <div key={r.refundId} className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl border shadow-sm bg-base-100 border-base-200">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <RefundAvatar />

                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-black text-sm text-base-content tabular-nums">{money(r.amount)}</span>
                          <StatusBadge status={r.status} />
                          {num(r.serviceFeeAmount) > 0 && <span className="badge badge-ghost badge-xs font-bold">Incl. fee {money(r.serviceFeeAmount)}</span>}
                        </div>

                        <span className="text-xs font-bold text-base-content truncate">Booking #{r.bookingId}</span>

                        <span className="text-[11px] text-base-content/60 break-words">
                          Payment #{r.paymentId}. {REASON_LABEL[r.reasonType] ?? r.reasonType}
                          {r.reason ? `: ${r.reason}` : ""}
                        </span>

                        {num(r.organizerDebit) > 0 && (
                          <span className="text-[11px] text-base-content/60">Taken from your wallet: {money(r.organizerDebit)}</span>
                        )}

                        {r.status === "Processing" && (
                          <span className="text-[11px] text-base-content/60">With Paystack. This finishes by itself.</span>
                        )}

                        {r.status === "Failed" && r.failureReason && <span className="text-[11px] text-error break-words">Failed: {r.failureReason}</span>}

                        <span className="text-[10px] text-base-content/40 font-mono">
                          Refund #{r.refundId}, requested {formatDate(r.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="lg:shrink-0">{rowActions(r)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* LOAD MORE */}
            {filtered.length > visibleCount && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)} className={`btn btn-ghost btn-sm bg-base-200 ${btnBase}`}>
                  Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                </button>
                <span className="text-[11px] text-base-content/50">
                  Showing {visibleCount} of {filtered.length}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* DETAILS */}
      <AnimatePresence>
        {dialog?.kind === "details" && (
          <DetailsModal refund={dialog.refund} onClose={closeDialog} actions={rowActions(dialog.refund, false, false)} />
        )}
      </AnimatePresence>

      {/* NEW REFUND */}
      <AnimatePresence>
        {dialog?.kind === "new" && (
          <NewRefundModal loading={requesting} error={modalError} onClose={closeDialog} onSubmit={handleNew} onInvalid={setModalError} />
        )}
      </AnimatePresence>

      <AnimatePresence>{showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}</AnimatePresence>

      {/* Extra room for the phone home bar, on top of pb-28 for the fixed bottom nav */}
      <div className="h-[env(safe-area-inset-bottom)] lg:hidden" aria-hidden />
    </div>
  );
};

export default OrganizerRefunds;