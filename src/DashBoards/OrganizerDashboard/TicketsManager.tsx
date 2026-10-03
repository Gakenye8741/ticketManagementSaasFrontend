import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  Search,
  X,
  Eye,
  Download,
  Lock,
  Info,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Clock,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  User,
  Mail,
  Phone,
  Receipt,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetTicketsByEventIdQuery,
  useCountEventTicketsQuery,
  useCountScannedAttendeesQuery,
  type Ticket,
} from "../../features/APIS/ticketsApi";
import { useGetBookingByIdQuery } from "../../features/APIS/BookingsApi";
import { useGetTicketTypesByEventIdQuery } from "../../features/APIS/ticketsType.Api";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";

// Change this to match the currency used on your other pages
const CURRENCY = "$";
const VIEW_KEY = "tickets_view_mode";
const TABLE_SIZES = [10, 20, 50];
const CARD_SIZES = [8, 12, 24, 48];

type ViewMode = "table" | "cards";

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 20 */
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

type ScanFilter = "all" | "scanned" | "not-scanned";
type AssignFilter = "all" | "assigned" | "unassigned";

// ---------------------------------------------------------------------------
// HELPERS (the backend may name fields slightly differently, so read defensively)
// ---------------------------------------------------------------------------
const tId = (t: Ticket) => (t.ticketId ?? t.id) as number;
const tName = (t: any): string => t.attendeeName ?? t.name ?? "";
const tEmail = (t: any): string => t.attendeeEmail ?? t.email ?? "";
const tPhone = (t: any): string => t.attendeePhone ?? t.phone ?? "";
const tToken = (t: any): string => t.ticketToken ?? t.token ?? t.tokenUuid ?? "";
const tScanned = (t: any): boolean => Boolean(t.isScanned ?? t.scanned ?? t.scannedAt);

const toArray = (d: any): Ticket[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.tickets) ? d.tickets : []);

const pickCount = (d: any, fallback: number): number => {
  if (typeof d === "number") return d;
  const v = d?.count ?? d?.total ?? d?.totalTickets ?? d?.scannedCount ?? d?.data?.count;
  return typeof v === "number" ? v : Number(v) || fallback;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtMoney = (v: unknown) =>
  `${CURRENCY}${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// PURCHASER INFO (loaded from the booking when a ticket is opened)
// ---------------------------------------------------------------------------
const PurchaserInfo = ({ bookingId }: { bookingId: number }) => {
  const { data, isLoading, isError } = useGetBookingByIdQuery(bookingId, { skip: !bookingId });
  const booking: any = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <span className="loading loading-spinner loading-xs text-primary"></span>
      </div>
    );
  }
  if (isError || !booking) {
    return <p className="text-[11px] text-base-content/50">Booking details are not available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-base-content/60 font-semibold">Booked by</span>
        <span className="font-bold text-base-content">
          {booking.guestName || (booking.digitalId ? `Registered user #${booking.digitalId}` : "—")}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-base-content/60 font-semibold">Booking status</span>
        <span className="font-bold text-base-content">{booking.bookingStatus || "—"}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-base-content/60 font-semibold">Contact</span>
        <span className="font-bold text-base-content break-all">{booking.guestPhone || booking.guestEmail || "—"}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-base-content/60 font-semibold">Booking total</span>
        <span className="font-bold text-success">{fmtMoney(booking.totalAmount)}</span>
      </div>
    </div>
  );
};

export const TicketsManager = () => {
  usePageTitle("Tickets Manager");

  const user = useSelector((state: RootState) => state.auth.user);
  const orgId = user?.orgId || user?.organizationId || 1;

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  const { data: eventsData } = useGetEventsByOrganizationQuery(orgId, { skip: !orgId });

  const rawEvents = Array.isArray(eventsData)
    ? eventsData
    : Array.isArray((eventsData as any)?.data)
    ? (eventsData as any).data
    : [];

  const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;

  const [pickedEventId, setPickedEventId] = useState<string | number>("");
  const selectedEventId = pickedEventId || (rawEvents.length > 0 ? getEventId(rawEvents[0]) : "");
  const numericEventId = Number(selectedEventId);

  const activeEvent = rawEvents.find((ev: any) => String(getEventId(ev)) === String(selectedEventId));
  const eventTitle = activeEvent?.title || `Event #${selectedEventId}`;

  // ---------------------------------------------------------------------------
  // TICKETS + COUNTS + TICKET TYPES
  // ---------------------------------------------------------------------------
  const skipEvent = !numericEventId || isNaN(numericEventId);

  const {
    data: ticketsData,
    isLoading,
    isError,
  } = useGetTicketsByEventIdQuery(numericEventId, { skip: skipEvent });

  const { data: totalCountData } = useCountEventTicketsQuery(numericEventId, { skip: skipEvent });
  const { data: scannedCountData } = useCountScannedAttendeesQuery(numericEventId, { skip: skipEvent });

  const { data: ticketTypesData } = useGetTicketTypesByEventIdQuery(selectedEventId, { skip: !selectedEventId });

  const tickets: Ticket[] = useMemo(() => toArray(ticketsData), [ticketsData]);

  const ticketTypeList = useMemo(() => {
    const d: any = ticketTypesData;
    return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
  }, [ticketTypesData]);

  const ticketNameById = useMemo(() => {
    const map = new Map<string, string>();
    ticketTypeList.forEach((t: any) => map.set(String(t.ticketTypeId || t.id || t._id), t.name));
    return map;
  }, [ticketTypeList]);

  const getTypeName = (t: Ticket) =>
    ticketNameById.get(String(t.ticketTypeId)) || (t.ticketTypeId ? `Ticket #${t.ticketTypeId}` : "—");

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [scanFilter, setScanFilter] = useState<ScanFilter>("all");
  const [assignFilter, setAssignFilter] = useState<AssignFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });
  const [pageSize, setPageSize] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "cards" ? 12 : 10;
    } catch {
      return 10;
    }
  });
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  // ---------------------------------------------------------------------------
  // FILTERING + PAGINATION
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const scanned = tScanned(t);
      const assigned = Boolean(tName(t) || tEmail(t) || t.holderId);

      if (scanFilter === "scanned" && !scanned) return false;
      if (scanFilter === "not-scanned" && scanned) return false;
      if (assignFilter === "assigned" && !assigned) return false;
      if (assignFilter === "unassigned" && assigned) return false;
      if (typeFilter !== "all" && String(t.ticketTypeId) !== typeFilter) return false;

      if (!q) return true;
      return (
        String(tId(t)).includes(q) ||
        String(t.bookingId).includes(q) ||
        tName(t).toLowerCase().includes(q) ||
        tEmail(t).toLowerCase().includes(q) ||
        tPhone(t).toLowerCase().includes(q) ||
        tToken(t).toLowerCase().includes(q)
      );
    });
  }, [tickets, search, scanFilter, assignFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // METRICS (counts endpoints preferred, list used as a fallback)
  // ---------------------------------------------------------------------------
  const listScanned = tickets.filter(tScanned).length;
  const totalTickets = pickCount(totalCountData, tickets.length);
  const scannedTickets = pickCount(scannedCountData, listScanned);
  const notScanned = Math.max(totalTickets - scannedTickets, 0);
  const assignedCount = tickets.filter((t) => tName(t) || tEmail(t) || t.holderId).length;
  const unassignedCount = tickets.length - assignedCount;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const resetFilters = () => {
    setPage(1);
    setSearch("");
    setScanFilter("all");
    setAssignFilter("all");
    setTypeFilter("all");
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setPageSize(mode === "cards" ? 12 : 10);
    setPage(1);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* storage unavailable, ignore */
    }
  };

  const handleEventChange = (value: string) => {
    setPickedEventId(value);
    resetFilters();
  };

  const handleExportCsv = () => {
    const header = ["Ticket #", "Booking #", "Ticket type", "Attendee", "Email", "Phone", "Scanned", "Scanned at", "Token"];
    const rows = filtered.map((t) => [
      tId(t),
      t.bookingId,
      getTypeName(t),
      tName(t),
      tEmail(t),
      tPhone(t),
      tScanned(t) ? "Yes" : "No",
      t.scannedAt || "",
      tToken(t),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${(eventTitle || "event").replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
  const modalMotion = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
  };

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER & EVENT SELECTOR                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <TicketIcon size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Tickets Manager</h1>
              <span className="badge badge-primary badge-outline badge-xs font-bold px-2 py-0.5 gap-1">
                <Lock size={9} />
                View only
              </span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Tickets sold for: <span className="font-bold text-base-content">{eventTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-48 font-semibold"
          >
            {rawEvents.map((ev: any) => {
              const id = getEventId(ev);
              return (
                <option key={id} value={id}>
                  {ev.title}
                </option>
              );
            })}
          </select>

          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm shrink-0"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download CSV</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* GUIDE BANNER                                                        */}
      {/* =================================================================== */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">Tickets Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Every ticket issued for your event appears here, with the attendee it was assigned to and whether it has
                been scanned at the gate. Search by name, phone, email, ticket number or token, open a ticket to see who
                booked it, and download the list as a CSV. This page is for viewing only. Tickets are scanned from the
                Gate Pass Scanner.
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

      {/* =================================================================== */}
      {/* SUMMARY METRICS                                                     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Tickets Sold</span>
            <span className="text-base sm:text-lg font-black text-base-content">{totalTickets}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <TicketIcon size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Scanned In</span>
            <span className="text-base sm:text-lg font-black text-base-content">{scannedTickets}</span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
            <ScanLine size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Not Yet Scanned</span>
            <span className="text-base sm:text-lg font-black text-base-content">{notScanned}</span>
          </div>
          <div className="p-2.5 bg-warning/10 text-warning rounded-xl shrink-0">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Assigned / Unassigned</span>
            <span className="text-base sm:text-lg font-black text-base-content">
              {assignedCount} / {unassignedCount}
            </span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <UserCheck size={18} />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* FILTERS                                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row gap-2">
        <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 flex-1 text-xs">
          <Search size={14} className="text-base-content/40" />
          <input
            type="text"
            placeholder="Search name, phone, email, ticket #, booking # or token"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="grow"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={scanFilter}
            onChange={(e) => {
              setScanFilter(e.target.value as ScanFilter);
              setPage(1);
            }}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All scan states</option>
            <option value="scanned">Scanned</option>
            <option value="not-scanned">Not scanned</option>
          </select>

          <select
            value={assignFilter}
            onChange={(e) => {
              setAssignFilter(e.target.value as AssignFilter);
              setPage(1);
            }}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All attendees</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All ticket types</option>
            {ticketTypeList.map((t: any) => {
              const id = t.ticketTypeId || t.id || t._id;
              return (
                <option key={id} value={id}>
                  {t.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TICKETS: TABLE OR CARDS                                             */}
      {/* =================================================================== */}
      {isLoading ? (
        viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-52 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        )
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Failed to load tickets. Check that you are logged in as an organizer and try again.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <TicketIcon size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">
            {tickets.length === 0 ? "No Tickets Sold Yet" : "No Matching Tickets"}
          </h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">
            {tickets.length === 0
              ? "Tickets appear here once bookings are paid and tickets are generated."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar: result count + view switch */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "ticket" : "tickets"}
              {filtered.length !== tickets.length && <> (filtered from {tickets.length})</>}
            </p>

            <div className="join" role="group" aria-label="Switch view">
              <button
                onClick={() => changeView("table")}
                className={`btn btn-xs join-item gap-1 ${viewMode === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                aria-pressed={viewMode === "table"}
              >
                <List size={13} />
                <span>Table</span>
              </button>
              <button
                onClick={() => changeView("cards")}
                className={`btn btn-xs join-item gap-1 ${viewMode === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="table table-sm w-full text-xs min-w-[780px]">
                  <thead>
                    <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                      <th className="py-3 px-4 font-bold">Ticket</th>
                      <th className="py-3 px-4 font-bold">Attendee</th>
                      <th className="py-3 px-4 font-bold">Type</th>
                      <th className="py-3 px-4 font-bold">Booking</th>
                      <th className="py-3 px-4 font-bold">Gate status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t) => {
                      const scanned = tScanned(t);
                      const name = tName(t);
                      const contact = tPhone(t) || tEmail(t);
                      return (
                        <tr key={tId(t)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-base-content">#{tId(t)}</span>
                              <span className="text-[10px] text-base-content/50 font-mono">
                                {tToken(t) ? `${tToken(t).slice(0, 12)}…` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {name || contact ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-base-content">{name || "Name not set"}</span>
                                <span className="text-[10px] text-base-content/50">{contact || "—"}</span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1.5 text-base-content/50 font-semibold">
                                <UserX size={13} />
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-base-content/70">{getTypeName(t)}</td>
                          <td className="py-3 px-4 font-semibold text-base-content/70">#{t.bookingId}</td>
                          <td className="py-3 px-4">
                            {scanned ? (
                              <div className="flex flex-col">
                                <span className="badge badge-sm badge-success text-success-content font-bold">Scanned</span>
                                <span className="text-[10px] text-base-content/50 mt-0.5">{fmtDate(t.scannedAt)}</span>
                              </div>
                            ) : (
                              <span className="badge badge-sm badge-ghost font-bold">Not scanned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setDetailTicket(t)}
                              className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
                              title="View ticket"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paged.map((t, i) => {
                const scanned = tScanned(t);
                const name = tName(t);
                const contact = tPhone(t) || tEmail(t);
                const assigned = Boolean(name || contact);
                return (
                  <motion.div
                    key={`${safePage}-${tId(t)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailTicket(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailTicket(t);
                      }
                    }}
                    className="group relative bg-base-100 border border-base-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {/* Accent strip: green once scanned */}
                    <div className={`h-1.5 w-full ${scanned ? "bg-success" : "bg-primary"}`} />

                    <div className="p-4 flex flex-col gap-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                            Ticket #{tId(t)}
                          </span>
                          <span className="font-black text-sm text-base-content truncate">{getTypeName(t)}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          {scanned ? (
                            <span className="badge badge-sm badge-success text-success-content font-bold gap-1">
                              <CheckCircle2 size={10} /> Scanned
                            </span>
                          ) : (
                            <span className="badge badge-sm badge-ghost font-bold">Not scanned</span>
                          )}
                          {scanned && <span className="text-[10px] text-base-content/50">{fmtDate(t.scannedAt)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${
                            assigned ? "bg-primary/10 text-primary" : "bg-base-200 text-base-content/40"
                          }`}
                        >
                          {assigned ? (name || contact).trim().charAt(0).toUpperCase() : <UserX size={16} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          {assigned ? (
                            <>
                              <span className="text-xs font-bold text-base-content truncate">{name || "Name not set"}</span>
                              <span className="text-[11px] text-base-content/50 truncate">{contact || "—"}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-base-content/60">Unassigned</span>
                              <span className="text-[11px] text-base-content/40">No attendee yet</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ticket stub divider with notches */}
                    <div className="relative border-t border-dashed border-base-300">
                      <span className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-base-100 border border-base-200" />
                      <span className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-base-100 border border-base-200" />
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between gap-2 bg-base-200/30">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold text-base-content/70">Booking #{t.bookingId}</span>
                        <span className="text-[10px] font-mono text-base-content/40 truncate">
                          {tToken(t) ? `${tToken(t).slice(0, 14)}…` : "—"}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-primary shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <Eye size={12} />
                        Details
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination bar (shared by both views) */}
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
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="btn btn-xs join-item"
                  aria-label="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="btn btn-xs join-item"
                  aria-label="Previous page"
                >
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

                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="btn btn-xs join-item"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="btn btn-xs join-item"
                  aria-label="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* TICKET DETAIL MODAL                                                 */}
      {/* =================================================================== */}
      <AnimatePresence>
        {detailTicket && (
          <div className={modalBackdrop} onClick={() => setDetailTicket(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <TicketIcon size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">
                    Ticket #{tId(detailTicket)}
                  </h3>
                  {tScanned(detailTicket) ? (
                    <span className="badge badge-sm badge-success text-success-content font-bold gap-1">
                      <CheckCircle2 size={10} /> Scanned
                    </span>
                  ) : (
                    <span className="badge badge-sm badge-ghost font-bold">Not scanned</span>
                  )}
                </div>
                <button onClick={() => setDetailTicket(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs">
                {/* Attendee */}
                <div className="rounded-xl bg-base-200/40 p-3 flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Attendee</span>
                  {tName(detailTicket) || tEmail(detailTicket) || tPhone(detailTicket) ? (
                    <>
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-primary shrink-0" />
                        <span className="font-bold text-base-content">{tName(detailTicket) || "Name not set"}</span>
                      </div>
                      {tEmail(detailTicket) && (
                        <div className="flex items-center gap-2 text-base-content/70">
                          <Mail size={13} className="shrink-0" />
                          <span className="break-all">{tEmail(detailTicket)}</span>
                        </div>
                      )}
                      {tPhone(detailTicket) && (
                        <div className="flex items-center gap-2 text-base-content/70">
                          <Phone size={13} className="shrink-0" />
                          <span>{tPhone(detailTicket)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-base-content/60 font-semibold">
                      <UserX size={13} />
                      This ticket has not been assigned to an attendee yet.
                    </span>
                  )}
                </div>

                {/* Ticket info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Event</span>
                    <span className="font-bold text-base-content">{eventTitle}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Ticket type</span>
                    <span className="font-bold text-base-content">{getTypeName(detailTicket)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Booking</span>
                    <span className="font-bold text-base-content">#{detailTicket.bookingId}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Scanned at</span>
                    <span className="font-bold text-base-content">{fmtDate(detailTicket.scannedAt)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[11px] text-base-content/60 font-semibold">Ticket token</span>
                    <span className="font-bold font-mono text-base-content break-all">{tToken(detailTicket) || "—"}</span>
                  </div>
                </div>

                {/* Purchaser (from the booking) */}
                <div className="flex flex-col gap-2 border-t border-base-200 pt-3">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                    <Receipt size={11} /> Purchased by
                  </span>
                  <PurchaserInfo bookingId={detailTicket.bookingId} />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-base-200">
                <button onClick={() => setDetailTicket(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketsManager;