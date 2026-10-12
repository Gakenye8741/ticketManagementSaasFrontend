import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom"; // NEW (claim)
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  UserPlus,
  UserMinus,
  UserX,
  Pencil,
  Send,
  Copy,
  Check,
  QrCode,
  X,
  Eye,
  Info,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Clock,
  Mail,
  Phone,
  User,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hourglass,
  ArrowRightLeft,
  Gift, // NEW (claim)
  Link2, // NEW (claim)
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetTicketsByPurchaserIdQuery,
  useGetTicketsByHolderIdQuery, // NEW (claim): claimed tickets are held by me, not purchased by me
  useAssignTicketMutation,
  useUnassignTicketMutation,
  useInitiateTicketTransferMutation,
  useClaimTransferredTicketMutation, // NEW (claim)
  type Ticket as TicketType,
} from "../../features/APIS/ticketsApi";
import { useGetAllEventsQuery, } from "../../features/APIS/EventsApi";
import {
  useGetAllTicketTypesQuery,
} from "../../features/APIS/ticketsType.Api";
import { useGetPrimaryMediaByEventIdQuery } from "../../features/APIS/mediaApi";
import usePageTitle from "../../hooks/usePageTitle";

/* ==========================================
   TYPES + HELPERS
   ========================================== */

type TicketRow = TicketType & {
  eventTitle?: string;
  ticketTypeName?: string;
  _event?: any;
  _typeName?: string;
  _received?: boolean; // NEW (claim): bought by someone else and claimed/transferred to me
  _gone?: boolean; // NEW (claim): the ticket now belongs to someone else
  [key: string]: any;
};

type TicketState = "unassigned" | "assigned" | "scanned" | "transferred";
type Filter = "all" | TicketState | "received"; // NEW (claim): "received"
type ViewMode = "cards" | "table";

const VIEW_KEY = "mytickets_view_mode";
const CARD_SIZES = [6, 12, 24];
const TABLE_SIZES = [10, 20, 50];

const getId = (t: TicketRow) => (t.ticketId ?? t.id) as number;

/** Your endpoints return `any`, so accept an array or a { data } / { tickets } wrapper */
const toList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.tickets)) return res.tickets;
  if (Array.isArray(res?.data?.tickets)) return res.data.tickets;
  return [];
};

const getState = (t: TicketRow): TicketState => {
  if (t.transferStatus === "transferred" && t._gone) return "transferred"; // NEW (claim): receivers keep full control
  if (t.isScanned) return "scanned";
  const assigned = t.isAssigned ?? Boolean(t.attendeeEmail || t.attendeeName);
  return assigned ? "assigned" : "unassigned";
};

const stateMeta: Record<TicketState, { label: string; badge: string; strip: string }> = {
  unassigned: { label: "Not assigned", badge: "badge-warning text-warning-content", strip: "bg-warning" },
  assigned: { label: "Assigned", badge: "badge-success text-success-content", strip: "bg-primary" },
  scanned: { label: "Checked in", badge: "badge-neutral", strip: "bg-success" },
  transferred: { label: "Transferred", badge: "badge-info text-info-content", strip: "bg-info" },
};

const errMsg = (err: any): string =>
  err?.data?.message || err?.data?.error || err?.error || "Something went wrong. Please try again.";

const fmtDate = (d?: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const fmtTime = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour) || m === undefined) return t;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const getPageNumbers = (current: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
};

const initials = (s: string) => s.trim().charAt(0).toUpperCase();

/* ==========================================
   SMALL PIECES
   ========================================== */

/** Event photo (primary media), falls back to a ticket icon */
const EventThumb = ({ eventId, title }: { eventId: number | string; title: string }) => {
  const numericId = Number(eventId);
  const { data } = useGetPrimaryMediaByEventIdQuery(numericId, { skip: !numericId || isNaN(numericId) }) as {
    data: any;
  };
  const url =
    typeof data === "string"
      ? data
      : data?.url ||
        data?.data?.url ||
        (Array.isArray(data) ? data[0]?.url || data[0] : null) ||
        (Array.isArray(data?.data) ? data.data[0]?.url : null);

  if (!url || typeof url !== "string") return <TicketIcon size={18} />;
  return (
    <img
      src={url}
      alt={title}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
};

const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
const modalMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
};

const ModalShell = ({
  title,
  icon,
  onClose,
  children,
  maxW = "max-w-md",
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}) => (
  <div className={modalBackdrop} onClick={onClose}>
    <motion.div
      {...modalMotion}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={title}
      className={`bg-base-100 border border-base-200 w-full ${maxW} max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

/** One-line description of the ticket, used at the top of each modal */
const TicketSummary = ({ ticket }: { ticket: TicketRow }) => (
  <div className="flex items-center gap-3 bg-base-200/50 border border-base-200 rounded-xl p-3">
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <EventThumb eventId={ticket.eventId} title={ticket.eventTitle || ""} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-bold truncate">{ticket.eventTitle || `Event #${ticket.eventId}`}</p>
      <p className="text-[11px] text-base-content/50 truncate">
        {ticket.ticketTypeName ? `${ticket.ticketTypeName} · ` : ""}Ticket #{getId(ticket)}
      </p>
    </div>
  </div>
);

/* ==========================================
   PAGE
   ========================================== */

const filterTabs: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Not assigned" },
  { key: "assigned", label: "Assigned" },
  { key: "received", label: "Received" }, // NEW (claim)
  { key: "scanned", label: "Checked in" },
  { key: "transferred", label: "Transferred" },
];

export default function MyTickets() {
  usePageTitle("My Tickets");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = Number((user as { digitalId?: number } | null)?.digitalId);
  // NEW (claim): used to prefill the claim form
  const me = user as { firstName?: string; lastName?: string; email?: string; phone?: string } | null;

  // NEW (claim): lets a shared link like /my-tickets?claim=CODE open the claim form
  const [searchParams, setSearchParams] = useSearchParams();
  const claimParam = searchParams.get("claim");

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  const {
    data,
    isLoading: purchasedLoading,
    isError: purchasedError,
    refetch: refetchPurchased,
  } = useGetTicketsByPurchaserIdQuery(digitalId, { skip: !digitalId });
  // NEW (claim): tickets I hold (claimed or transferred to me)
  const heldQ = useGetTicketsByHolderIdQuery(digitalId, { skip: !digitalId });
  const isLoading = purchasedLoading || heldQ.isLoading;
  const isError = purchasedError && heldQ.isError;
  const refetch = () => {
    refetchPurchased();
    heldQ.refetch();
  };

  const eventsQ = useGetAllEventsQuery(undefined);
  const typesQ = useGetAllTicketTypesQuery(undefined);

  const eventById = useMemo(() => {
    const map = new Map<string, any>();
    toList((eventsQ.data as any)?.data ?? eventsQ.data).forEach((e: any) => map.set(String(e.eventId ?? e.id), e));
    return map;
  }, [eventsQ.data]);

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    toList((typesQ.data as any)?.data ?? typesQ.data).forEach((t: any) => map.set(String(t.ticketTypeId ?? t.id), t.name));
    return map;
  }, [typesQ.data]);

  const tickets: TicketRow[] = useMemo(() => {
    // NEW (claim): merge purchased + held tickets, each ticket once
    const byId = new Map<number, any>();
    [...toList(data), ...toList(heldQ.data)].forEach((t: any) => {
      const id = t.ticketId ?? t.id;
      if (id !== undefined && !byId.has(id)) byId.set(id, t);
    });
    return Array.from(byId.values()).map((t: any) => {
      const ev = eventById.get(String(t.eventId));
      return {
        ...t,
        eventTitle: t.eventTitle ?? ev?.title,
        ticketTypeName: t.ticketTypeName ?? typeNameById.get(String(t.ticketTypeId)),
        _event: ev,
        // NEW (claim): the backend columns are purchaserDigitalId (buyer) and digitalId (current holder)
        _received:
          Boolean(t.purchaserDigitalId ?? t.purchaserId) &&
          Number(t.purchaserDigitalId ?? t.purchaserId) !== digitalId,
        _gone: (t.digitalId ?? t.holderId) != null && Number(t.digitalId ?? t.holderId) !== digitalId,
      } as TicketRow;
    });
  }, [data, heldQ.data, eventById, typeNameById, digitalId]);

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const [assignTicket, { isLoading: assigning }] = useAssignTicketMutation();
  const [unassignTicket, { isLoading: unassigning }] = useUnassignTicketMutation();
  const [initiateTransfer, { isLoading: transferring }] = useInitiateTicketTransferMutation();
  const [claimTicket, { isLoading: claiming }] = useClaimTransferredTicketMutation(); // NEW (claim)

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "cards";
    } catch {
      return "cards";
    }
  });
  const [pageSize, setPageSize] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "table" ? 10 : 6;
    } catch {
      return 6;
    }
  });
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [assignFor, setAssignFor] = useState<TicketRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState("");

  const [unassignFor, setUnassignFor] = useState<TicketRow | null>(null);

  const [transferFor, setTransferFor] = useState<TicketRow | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [transferError, setTransferError] = useState("");
  const [copied, setCopied] = useState("");

  // NEW (claim): claim form state
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ token: "", name: "", email: "", phone: "" });
  const [claimError, setClaimError] = useState("");

  const [detailFor, setDetailFor] = useState<TicketRow | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // NEW (claim): CLAIM FLOW
  // ---------------------------------------------------------------------------
  const openClaim = (token = "") => {
    setClaimForm({
      token,
      name: [me?.firstName, me?.lastName].filter(Boolean).join(" "),
      email: me?.email ?? "",
      phone: me?.phone ?? "",
    });
    setClaimError("");
    setClaimOpen(true);
  };

  const closeClaim = () => {
    setClaimOpen(false);
    if (searchParams.get("claim")) {
      const next = new URLSearchParams(searchParams);
      next.delete("claim");
      setSearchParams(next, { replace: true });
    }
  };

  // A shared claim link opens the claim form with the code already filled in
  useEffect(() => {
    if (claimParam && digitalId) openClaim(claimParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimParam, digitalId]);

  const handleClaim = async (e: FormEvent) => {
    e.preventDefault();
    setClaimError("");
    try {
      await claimTicket({
        claimToken: claimForm.token.trim(),
        newHolderDigitalId: digitalId,
        attendeeInfo: {
          name: claimForm.name.trim(),
          email: claimForm.email.trim(),
          phone: claimForm.phone.trim() || undefined,
        },
      }).unwrap();
      setSuccessMessage("Ticket claimed! It now appears in your tickets.");
      setFilter("received");
      setPage(1);
      closeClaim();
      refetch();
    } catch (err) {
      setClaimError(errMsg(err));
    }
  };

  const claimLink = (token: string) =>
    `${window.location.origin}${window.location.pathname}?claim=${encodeURIComponent(token)}`;

  // ---------------------------------------------------------------------------
  // FILTER + PAGINATION
  // ---------------------------------------------------------------------------
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: tickets.length, unassigned: 0, assigned: 0, scanned: 0, transferred: 0, received: 0 };
    tickets.forEach((t) => {
      c[getState(t)] += 1;
      if (t._received) c.received += 1; // NEW (claim)
    });
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "received") {
        if (!t._received) return false; // NEW (claim)
      } else if (filter !== "all" && getState(t) !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        String(getId(t)).includes(q) ||
        (t.eventTitle || "").toLowerCase().includes(q) ||
        (t.ticketTypeName || "").toLowerCase().includes(q) ||
        (t.attendeeName || "").toLowerCase().includes(q) ||
        (t.attendeeEmail || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setPageSize(mode === "table" ? 10 : 6);
    setPage(1);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* storage unavailable, ignore */
    }
  };

  const openAssign = (t: TicketRow) => {
    setForm({ name: t.attendeeName ?? "", email: t.attendeeEmail ?? "", phone: t.attendeePhone ?? "" });
    setFormError("");
    setDetailFor(null);
    setAssignFor(t);
  };

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignFor) return;
    setFormError("");
    try {
      await assignTicket({
        ticketId: getId(assignFor),
        name: form.name.trim(),
        email: form.email.trim(),
        attendeePhone: form.phone.trim() || undefined,
      }).unwrap();
      setSuccessMessage(`Ticket #${getId(assignFor)} is now assigned to ${form.name.trim()}.`);
      setAssignFor(null);
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const handleUnassign = async () => {
    if (!unassignFor) return;
    try {
      await unassignTicket({ ticketId: getId(unassignFor), ownerId: digitalId }).unwrap();
      setSuccessMessage(`Ticket #${getId(unassignFor)} no longer has an attendee.`);
    } catch (err) {
      setErrorMessage(errMsg(err));
    } finally {
      setUnassignFor(null);
    }
  };

  const openTransfer = (t: TicketRow) => {
    setClaimToken(null);
    setTransferError("");
    setDetailFor(null);
    setTransferFor(t);
  };

  const handleTransfer = async () => {
    if (!transferFor) return;
    setTransferError("");
    try {
      const res: any = await initiateTransfer({ ticketId: getId(transferFor), holderId: digitalId }).unwrap();
      const token = res?.data?.claimToken ?? res?.claimToken ?? res?.data?.token ?? res?.token;
      setClaimToken(token ?? "Transfer started. Share the claim link you received.");
      refetchPurchased(); // NEW (claim): show the "transfer pending" state right away
    } catch (err) {
      setTransferError(errMsg(err));
    }
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setErrorMessage("Could not copy to the clipboard.");
    }
  };

  /** Ticket actions shared by the card and table views */
  const Actions = ({ t }: { t: TicketRow }) => {
    const state = getState(t);
    const locked = state === "scanned" || state === "transferred";
    return (
      <div className="flex items-center justify-end gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setDetailFor(t)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View ticket">
          <Eye size={13} />
        </button>
        {!locked && (
          <>
            <button
              onClick={() => openAssign(t)}
              className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
              title={state === "assigned" ? "Change attendee" : "Assign attendee"}
            >
              {state === "assigned" ? <Pencil size={13} /> : <UserPlus size={13} />}
              <span className="hidden sm:inline">{state === "assigned" ? "Change" : "Assign"}</span>
            </button>
            {state === "assigned" && (
              <button onClick={() => setUnassignFor(t)} className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 rounded-lg" title="Remove attendee">
                <UserMinus size={13} />
              </button>
            )}
            <button onClick={() => openTransfer(t)} className="btn btn-ghost btn-xs text-info hover:bg-info/10 rounded-lg" title="Transfer to another account">
              <Send size={13} />
            </button>
          </>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <TicketIcon size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">My Tickets</h1>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{counts.all}</span> {counts.all === 1 ? "ticket" : "tickets"}
              {counts.unassigned > 0 && (
                <>
                  {" "}
                  · <span className="font-bold text-warning">{counts.unassigned}</span> still need an attendee
                </>
              )}
            </p>
          </div>
        </div>
        {/* NEW (claim) */}
        {digitalId ? (
          <button onClick={() => openClaim()} className="btn btn-primary btn-sm rounded-xl gap-2 text-xs font-bold">
            <Gift size={14} /> Claim a ticket
          </button>
        ) : null}
      </div>

      {/* GUIDE BANNER */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">How your tickets work</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                If you booked for several people, each person can get their own ticket: choose <b>Assign</b> and enter their
                name and email. Tickets you don't assign stay with you, so you can use them yourself. To give a ticket to
                someone who has their own account, choose <b>Transfer</b> and send them the claim link. Got a claim code or
                link from someone? Choose <b>Claim a ticket</b>. Tickets that have been
                scanned at the gate can't be changed.
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

      {!digitalId ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <TicketIcon size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">Sign in to see your tickets</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">
            {claimParam
              ? "Someone sent you a ticket. Sign in or create an account, then open the link again to claim it." // NEW (claim)
              : "Your tickets appear here once you are logged in."}
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total tickets", value: counts.all, icon: <TicketIcon size={18} />, tone: "bg-primary/10 text-primary" },
              { label: "Not assigned", value: counts.unassigned, icon: <Hourglass size={18} />, tone: "bg-warning/10 text-warning" },
              { label: "Assigned", value: counts.assigned, icon: <UserPlus size={18} />, tone: "bg-success/10 text-success" },
              { label: "Received", value: counts.received, icon: <Gift size={18} />, tone: "bg-secondary/10 text-secondary" },
              { label: "Transferred", value: counts.transferred, icon: <ArrowRightLeft size={18} />, tone: "bg-info/10 text-info" },
              { label: "Checked in", value: counts.scanned, icon: <QrCode size={18} />, tone: "bg-base-200 text-base-content/60" },
            ].map((c) => (
              <div key={c.label} className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">{c.label}</span>
                  <span className="text-base sm:text-lg font-black text-base-content">{c.value}</span>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${c.tone}`}>{c.icon}</div>
              </div>
            ))}
          </div>

          {/* FILTERS */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {filterTabs
                .filter((f) => f.key === "all" || counts[f.key] > 0)
                .map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setPage(1);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      filter === f.key
                        ? "bg-primary text-primary-content shadow-sm font-bold"
                        : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }`}
                  >
                    {f.label} <span className="opacity-60">({counts[f.key]})</span>
                  </button>
                ))}
            </div>

            <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 text-xs w-full lg:w-80">
              <Search size={14} className="text-base-content/40" />
              <input
                type="text"
                placeholder="Search event, attendee or ticket #"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="grow"
              />
            </label>
          </div>

          {/* LIST */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-56 rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
              <AlertCircle size={16} />
              <span className="flex-1">We couldn't load your tickets.</span>
              <button onClick={() => refetch()} className="btn btn-xs btn-ghost">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
              <TicketIcon size={36} className="mx-auto text-primary/40 mb-2" />
              <h3 className="font-bold text-xs text-base-content">{tickets.length === 0 ? "No Tickets Yet" : "No Matching Tickets"}</h3>
              <p className="text-[11px] text-base-content/60 mt-0.5">
                {tickets.length === 0
                  ? "Tickets you buy or claim will show up here."
                  : "Try a different search or filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-base-content/60">
                  <span className="font-bold text-base-content">{filtered.length}</span> {filtered.length === 1 ? "ticket" : "tickets"}
                </p>
                <div className="join" role="group" aria-label="Switch view">
                  <button
                    onClick={() => changeView("cards")}
                    className={`btn btn-xs join-item gap-1 ${viewMode === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                    aria-pressed={viewMode === "cards"}
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={() => changeView("table")}
                    className={`btn btn-xs join-item gap-1 ${viewMode === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                    aria-pressed={viewMode === "table"}
                  >
                    <List size={13} />
                    <span>Table</span>
                  </button>
                </div>
              </div>

              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paged.map((t, i) => {
                    const state = getState(t);
                    const meta = stateMeta[state];
                    const hasAttendee = Boolean(t.attendeeName || t.attendeeEmail);
                    const ev = t._event;
                    return (
                      <motion.div
                        key={`${safePage}-${getId(t)}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailFor(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDetailFor(t);
                          }
                        }}
                        className="group relative bg-base-100 border border-base-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className={`h-1.5 w-full ${meta.strip}`} />

                        <div className="p-4 flex flex-col gap-4 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <EventThumb eventId={t.eventId} title={t.eventTitle || ""} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black text-base-content truncate">{t.eventTitle || `Event #${t.eventId}`}</span>
                                <span className="text-[11px] text-base-content/50 truncate">
                                  {t.ticketTypeName ? `${t.ticketTypeName} · ` : ""}Ticket #{getId(t)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`badge badge-sm font-bold ${meta.badge}`}>{meta.label}</span>
                              {/* NEW (claim) */}
                              {t._received && (
                                <span className="badge badge-sm badge-outline gap-1 font-bold">
                                  <Gift size={10} /> Received
                                </span>
                              )}
                            </div>
                          </div>

                          {ev?.date && (
                            <div className="flex items-center gap-3 text-[11px] text-base-content/60">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={12} className="text-primary" />
                                {fmtDate(ev.date)}
                              </span>
                              {ev.time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="text-primary" />
                                  {fmtTime(ev.time)}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                                hasAttendee ? "bg-primary/10 text-primary" : "bg-base-200 text-base-content/40"
                              }`}
                            >
                              {hasAttendee ? initials(t.attendeeName || t.attendeeEmail || "?") : <UserX size={16} />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              {hasAttendee ? (
                                <>
                                  <span className="text-xs font-bold text-base-content truncate">{t.attendeeName || "Name not set"}</span>
                                  <span className="text-[11px] text-base-content/50 truncate">{t.attendeeEmail || t.attendeePhone || "—"}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-base-content/60">No attendee yet</span>
                                  <span className="text-[11px] text-base-content/40">Kept with you until you assign it</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="relative border-t border-dashed border-base-300">
                          <span className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-base-100 border border-base-200" />
                          <span className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-base-100 border border-base-200" />
                        </div>

                        <div className="px-3 py-2.5 bg-base-200/30">
                          <Actions t={t} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="table table-sm w-full text-xs min-w-[760px]">
                      <thead>
                        <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                          <th className="py-3 px-4 font-bold">Ticket</th>
                          <th className="py-3 px-4 font-bold">Event</th>
                          <th className="py-3 px-4 font-bold">Attendee</th>
                          <th className="py-3 px-4 font-bold">Status</th>
                          <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((t) => {
                          const state = getState(t);
                          const hasAttendee = Boolean(t.attendeeName || t.attendeeEmail);
                          return (
                            <tr key={getId(t)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="font-bold">#{getId(t)}</span>
                                  <span className="text-[10px] text-base-content/50">{t.ticketTypeName || "—"}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <EventThumb eventId={t.eventId} title={t.eventTitle || ""} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold truncate max-w-[200px]">{t.eventTitle || `Event #${t.eventId}`}</span>
                                    <span className="text-[10px] text-base-content/50">{fmtDate(t._event?.date)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {hasAttendee ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold">{t.attendeeName || "Name not set"}</span>
                                    <span className="text-[10px] text-base-content/50">{t.attendeeEmail || t.attendeePhone || "—"}</span>
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-base-content/50 font-semibold">
                                    <UserX size={13} /> Not assigned
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className={`badge badge-sm font-bold ${stateMeta[state].badge}`}>{stateMeta[state].label}</span>
                                  {/* NEW (claim) */}
                                  {t._received && <span className="badge badge-sm badge-outline font-bold">Received</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <Actions t={t} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                      {(viewMode === "table" ? TABLE_SIZES : CARD_SIZES).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {totalPages > 1 && (
                  <div className="join">
                    <button onClick={() => setPage(1)} disabled={safePage === 1} className="btn btn-xs join-item" aria-label="First page">
                      <ChevronsLeft size={14} />
                    </button>
                    <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="btn btn-xs join-item" aria-label="Previous page">
                      <ChevronLeft size={14} />
                    </button>
                    {getPageNumbers(safePage, totalPages).map((n, idx) =>
                      n === "…" ? (
                        <button key={`gap-${idx}`} className="btn btn-xs join-item btn-disabled" tabIndex={-1}>
                          …
                        </button>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`btn btn-xs join-item ${n === safePage ? "btn-primary" : ""}`}
                          aria-current={n === safePage ? "page" : undefined}
                        >
                          {n}
                        </button>
                      )
                    )}
                    <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="btn btn-xs join-item" aria-label="Next page">
                      <ChevronRight size={14} />
                    </button>
                    <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="btn btn-xs join-item" aria-label="Last page">
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ====================== MODALS ====================== */}

      {/* Ticket detail */}
      <AnimatePresence>
        {detailFor && (
          <ModalShell title={`Ticket #${getId(detailFor)}`} icon={<TicketIcon size={16} />} onClose={() => setDetailFor(null)}>
            <TicketSummary ticket={detailFor} />

            <div className="flex items-center gap-2">
              <span className={`badge badge-sm font-bold ${stateMeta[getState(detailFor)].badge}`}>{stateMeta[getState(detailFor)].label}</span>
              {/* NEW (claim) */}
              {detailFor._received && (
                <span className="badge badge-sm badge-outline gap-1 font-bold">
                  <Gift size={10} /> Received
                </span>
              )}
              {detailFor.transferStatus === "pending_claim" && (
                <span className="badge badge-sm badge-outline gap-1 font-bold">
                  <ArrowRightLeft size={10} /> Transfer pending
                </span>
              )}
            </div>

            {detailFor._event?.date && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Date</span>
                  <span className="font-bold">{fmtDate(detailFor._event.date)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Time</span>
                  <span className="font-bold">{fmtTime(detailFor._event.time) || "—"}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-base-200/40 p-3 flex flex-col gap-2 text-xs">
              <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Attendee</span>
              {detailFor.attendeeName || detailFor.attendeeEmail ? (
                <>
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-primary shrink-0" />
                    <span className="font-bold">{detailFor.attendeeName || "Name not set"}</span>
                  </div>
                  {detailFor.attendeeEmail && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Mail size={13} className="shrink-0" />
                      <span className="break-all">{detailFor.attendeeEmail}</span>
                    </div>
                  )}
                  {detailFor.attendeePhone && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Phone size={13} className="shrink-0" />
                      <span>{detailFor.attendeePhone}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-base-content/60 font-semibold">
                  <UserX size={13} /> No attendee yet. This ticket stays with you.
                </span>
              )}
            </div>

            {detailFor.ticketToken && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-base-content/60 font-semibold">Ticket code</span>
                <div className="flex items-center gap-2 bg-base-200/60 border border-base-200 rounded-xl p-2">
                  <code className="text-[11px] font-mono flex-1 truncate px-1">{detailFor.ticketToken}</code>
                  <button onClick={() => copyText(detailFor.ticketToken as string, "token")} className="btn btn-primary btn-xs rounded-lg gap-1">
                    {copied === "token" ? <Check size={12} /> : <Copy size={12} />}
                    {copied === "token" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {getState(detailFor) === "scanned" && (
              <p className="text-xs text-base-content/50 flex items-center gap-2">
                <QrCode size={14} className="text-primary shrink-0" />
                This ticket has been scanned at the gate, so it can't be changed.
              </p>
            )}

            {getState(detailFor) !== "scanned" && getState(detailFor) !== "transferred" && (
              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-base-200">
                <button onClick={() => openTransfer(detailFor)} className="btn btn-ghost btn-sm rounded-xl text-xs font-bold gap-1 text-info bg-info/10 hover:bg-info/20">
                  <Send size={13} /> Transfer
                </button>
                <button onClick={() => openAssign(detailFor)} className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1">
                  {getState(detailFor) === "assigned" ? <Pencil size={13} /> : <UserPlus size={13} />}
                  {getState(detailFor) === "assigned" ? "Change attendee" : "Assign attendee"}
                </button>
              </div>
            )}
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Assign / change attendee */}
      <AnimatePresence>
        {assignFor && (
          <ModalShell
            title={getState(assignFor) === "assigned" ? "Change attendee" : "Assign attendee"}
            icon={<UserPlus size={16} />}
            onClose={() => setAssignFor(null)}
          >
            <TicketSummary ticket={assignFor} />
            <form onSubmit={handleAssign} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Full name</label>
                <input
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jane Wanjiru"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Email</label>
                <input
                  type="email"
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="They will receive the ticket here"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Phone (optional)</label>
                <input
                  type="tel"
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="254712345678"
                />
              </div>

              {formError && (
                <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
                <button type="button" onClick={() => setAssignFor(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={assigning} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                  {assigning ? <span className="loading loading-spinner loading-xs"></span> : "Save attendee"}
                </button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Unassign confirmation */}
      <AnimatePresence>
        {unassignFor && (
          <div className={`${modalBackdrop} z-[60]`} onClick={() => setUnassignFor(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Remove this attendee?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  <span className="font-bold text-base-content">{unassignFor.attendeeName || unassignFor.attendeeEmail}</span> will no longer be
                  linked to ticket #{getId(unassignFor)}. The ticket stays with you.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button onClick={() => setUnassignFor(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
                  Cancel
                </button>
                <button
                  onClick={handleUnassign}
                  disabled={unassigning}
                  className="btn btn-warning btn-sm rounded-xl font-bold w-1/2 text-xs text-warning-content shadow-sm"
                >
                  {unassigning ? <span className="loading loading-spinner loading-xs"></span> : "Remove"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer */}
      <AnimatePresence>
        {transferFor && (
          <ModalShell title="Transfer this ticket" icon={<Send size={16} />} onClose={() => setTransferFor(null)}>
            <TicketSummary ticket={transferFor} />

            {!claimToken ? (
              <>
                <p className="text-xs text-base-content/60 leading-relaxed">
                  This creates a claim code. Send it to the person receiving the ticket. Once they claim it with their own
                  account, the ticket moves to them and you can no longer use it.
                </p>
                {transferError && (
                  <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{transferError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                  <button onClick={() => setTransferFor(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button onClick={handleTransfer} disabled={transferring} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {transferring ? <span className="loading loading-spinner loading-xs"></span> : "Create claim code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* NEW (claim): shareable link that opens the claim form with the code filled in */}
                <p className="text-xs text-base-content/60">Share this link with the new ticket holder:</p>
                <div className="flex items-center gap-2 bg-base-200/60 border border-base-200 rounded-xl p-2">
                  <code className="text-[11px] font-mono flex-1 truncate px-1">{claimLink(claimToken)}</code>
                  <button onClick={() => copyText(claimLink(claimToken), "link")} className="btn btn-primary btn-xs rounded-lg gap-1">
                    {copied === "link" ? <Check size={12} /> : <Link2 size={12} />}
                    {copied === "link" ? "Copied" : "Copy"}
                  </button>
                </div>

                <p className="text-xs text-base-content/60">Or share just the code:</p>
                <div className="flex items-center gap-2 bg-base-200/60 border border-base-200 rounded-xl p-2">
                  <code className="text-xs font-mono flex-1 truncate px-1">{claimToken}</code>
                  <button onClick={() => copyText(claimToken, "claim")} className="btn btn-primary btn-xs rounded-lg gap-1">
                    {copied === "claim" ? <Check size={12} /> : <Copy size={12} />}
                    {copied === "claim" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex justify-end pt-3 border-t border-base-200">
                  <button onClick={() => setTransferFor(null)} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    Done
                  </button>
                </div>
              </>
            )}
          </ModalShell>
        )}
      </AnimatePresence>

      {/* NEW (claim): Claim a ticket */}
      <AnimatePresence>
        {claimOpen && (
          <ModalShell title="Claim a ticket" icon={<Gift size={16} />} onClose={closeClaim}>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Paste the claim code someone sent you. The ticket moves into your account, and the details below become the
              attendee on the ticket.
            </p>
            <form onSubmit={handleClaim} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Claim code</label>
                <input
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs font-mono"
                  value={claimForm.token}
                  onChange={(e) => setClaimForm({ ...claimForm, token: e.target.value })}
                  placeholder="Paste the code here"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Attendee name</label>
                <input
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={claimForm.name}
                  onChange={(e) => setClaimForm({ ...claimForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Attendee email</label>
                <input
                  type="email"
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={claimForm.email}
                  onChange={(e) => setClaimForm({ ...claimForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-base-content/70 text-[11px]">Phone (optional)</label>
                <input
                  type="tel"
                  className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  value={claimForm.phone}
                  onChange={(e) => setClaimForm({ ...claimForm, phone: e.target.value })}
                  placeholder="254712345678"
                />
              </div>

              {claimError && (
                <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{claimError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
                <button type="button" onClick={closeClaim} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={claiming} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold gap-1">
                  {claiming ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <>
                      <Gift size={13} /> Claim ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}