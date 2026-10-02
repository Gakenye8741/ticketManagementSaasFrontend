import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  Ticket,
  Eye,
  Check,
  Ban,
  Info,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetBookingsByEventIdQuery,
  useGetRecentBookingsQuery,
  useGetEventBookingStatsQuery,
  useUpdateBookingStatusMutation,
  useCancelBookingMutation,
  type Booking,
} from "../../features/APIS/BookingsApi";
import { useGetTicketTypesByEventIdQuery } from "../../features/APIS/ticketsType.Api";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";

// Change this to match the currency used on your Ticket Types page
const CURRENCY = "KSH";
const PAGE_SIZE = 10;

type StatusFilter = "all" | "Pending" | "Confirmed" | "Cancelled";

const statusBadge: Record<Booking["bookingStatus"], string> = {
  Confirmed: "badge-success text-success-content",
  Pending: "badge-warning text-warning-content",
  Cancelled: "badge-error text-error-content",
};

const toMoney = (v: unknown) => Number(v || 0);
const fmtMoney = (v: unknown) =>
  `${CURRENCY}${toMoney(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export const BookingsManager = () => {
  usePageTitle("Bookings");

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

  const eventTitleById = (id: number | string) => {
    const ev = rawEvents.find((e: any) => String(getEventId(e)) === String(id));
    return ev?.title || `Event #${id}`;
  };
  const eventTitle = eventTitleById(selectedEventId);

  // ---------------------------------------------------------------------------
  // VIEW MODE: bookings for one event, or the recent feed across events
  // ---------------------------------------------------------------------------
  const [view, setView] = useState<"event" | "recent">("event");

  const {
    data: eventBookingsData,
    isLoading: eventBookingsLoading,
    isError: eventBookingsError,
  } = useGetBookingsByEventIdQuery(selectedEventId, { skip: !selectedEventId || view !== "event" });

  const {
    data: recentData,
    isLoading: recentLoading,
    isError: recentError,
  } = useGetRecentBookingsQuery(undefined, { skip: view !== "recent" });

  const { data: statsData } = useGetEventBookingStatsQuery(selectedEventId, {
    skip: !selectedEventId || view !== "event",
  });

  const { data: ticketTypesData } = useGetTicketTypesByEventIdQuery(selectedEventId, {
    skip: !selectedEventId,
  });

  const toArray = (d: any): Booking[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);

  const bookings: Booking[] = view === "event" ? toArray(eventBookingsData) : toArray(recentData);
  const isLoading = view === "event" ? eventBookingsLoading : recentLoading;
  const isError = view === "event" ? eventBookingsError : recentError;

  const ticketNameById = useMemo(() => {
    const list = toArray(ticketTypesData);
    const map = new Map<string, string>();
    list.forEach((t: any) => map.set(String(t.ticketTypeId || t.id || t._id), t.name));
    return map;
  }, [ticketTypesData]);

  const getTicketName = (b: Booking) => ticketNameById.get(String(b.ticketTypeId)) || `Ticket #${b.ticketTypeId}`;

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const [updateBookingStatus, { isLoading: isUpdating }] = useUpdateBookingStatusMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ booking: Booking; type: "confirm" | "cancel" } | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // FILTERING + PAGINATION
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.bookingStatus === statusFilter;
      const matchesSearch =
        !q ||
        String(b.bookingId).includes(q) ||
        (b.guestName || "").toLowerCase().includes(q) ||
        (b.guestEmail || "").toLowerCase().includes(q) ||
        (b.guestPhone || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // METRICS (computed from the list, with the stats endpoint preferred for revenue)
  // ---------------------------------------------------------------------------
  const confirmedCount = bookings.filter((b) => b.bookingStatus === "Confirmed").length;
  const pendingCount = bookings.filter((b) => b.bookingStatus === "Pending").length;
  const computedRevenue = bookings
    .filter((b) => b.bookingStatus === "Confirmed")
    .reduce((sum, b) => sum + toMoney(b.totalAmount), 0);
  const revenue =
    view === "event" && statsData && typeof statsData === "object"
      ? toMoney(statsData.totalRevenue ?? statsData.revenue ?? statsData.total ?? computedRevenue)
      : computedRevenue;
  const ticketsSold = bookings
    .filter((b) => b.bookingStatus === "Confirmed")
    .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleEventChange = (value: string) => {
    setPickedEventId(value);
    setPage(1);
    setSearch("");
    setStatusFilter("all");
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { booking, type } = confirmAction;
    setErrorMessage("");
    try {
      if (type === "confirm") {
        await updateBookingStatus({ bookingId: booking.bookingId, bookingStatus: "Confirmed" }).unwrap();
        setSuccessMessage(`Booking #${booking.bookingId} confirmed.`);
      } else {
        await cancelBooking(booking.bookingId).unwrap();
        setSuccessMessage(`Booking #${booking.bookingId} cancelled.`);
      }
      setDetailBooking(null);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || err?.data?.error || "Failed to update the booking.");
    } finally {
      setConfirmAction(null);
    }
  };

  const guestLabel = (b: Booking) =>
    b.guestName || (b.digitalId ? `Registered user #${b.digitalId}` : "Unknown guest");

  const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
  const modalMotion = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
  };

  const RowActions = ({ b }: { b: Booking }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => setDetailBooking(b)}
        className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg"
        title="View booking"
      >
        <Eye size={13} />
      </button>
      {b.bookingStatus === "Pending" && (
        <button
          onClick={() => setConfirmAction({ booking: b, type: "confirm" })}
          className="btn btn-ghost btn-xs text-success hover:bg-success/10 rounded-lg"
          title="Confirm booking"
        >
          <Check size={13} />
        </button>
      )}
      {b.bookingStatus !== "Cancelled" && (
        <button
          onClick={() => setConfirmAction({ booking: b, type: "cancel" })}
          className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
          title="Cancel booking"
        >
          <Ban size={13} />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER & EVENT SELECTOR                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Bookings</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Organizer</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              {view === "event" ? (
                <>
                  Bookings for: <span className="font-bold text-base-content">{eventTitle}</span>
                </>
              ) : (
                "Latest bookings across your events"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div role="tablist" className="tabs tabs-boxed tabs-xs bg-base-200 rounded-xl shrink-0">
            <button
              role="tab"
              onClick={() => {
                setView("event");
                setPage(1);
              }}
              className={`tab text-[11px] font-bold ${view === "event" ? "tab-active" : ""}`}
            >
              By event
            </button>
            <button
              role="tab"
              onClick={() => {
                setView("recent");
                setPage(1);
              }}
              className={`tab text-[11px] font-bold ${view === "recent" ? "tab-active" : ""}`}
            >
              Recent
            </button>
          </div>

          <select
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
            disabled={view === "recent"}
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
              <span className="font-bold text-base-content">Bookings Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                See who has booked tickets for your events. Pick an event to view its bookings, or switch to
                Recent for the latest activity across all events. Confirm pending bookings, cancel ones that
                should not go ahead, and search by name, phone, email or booking number.
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

      {/* Notifications */}
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

      {/* =================================================================== */}
      {/* SUMMARY METRICS                                                     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Total Bookings</span>
            <span className="text-base sm:text-lg font-black text-base-content">{bookings.length}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Confirmed</span>
            <span className="text-base sm:text-lg font-black text-base-content">
              {confirmedCount}
              <span className="text-[11px] font-semibold text-base-content/50"> · {ticketsSold} tickets</span>
            </span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Pending</span>
            <span className="text-base sm:text-lg font-black text-base-content">{pendingCount}</span>
          </div>
          <div className="p-2.5 bg-warning/10 text-warning rounded-xl shrink-0">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Confirmed Revenue</span>
            <span className="text-base sm:text-lg font-black text-base-content">{fmtMoney(revenue)}</span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* FILTERS                                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 flex-1 text-xs">
          <Search size={14} className="text-base-content/40" />
          <input
            type="text"
            placeholder="Search name, phone, email or booking #"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="grow"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-44 font-semibold"
        >
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* =================================================================== */}
      {/* BOOKINGS TABLE                                                      */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Failed to load bookings. Check that you are logged in as an organizer and try again.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Ticket size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">
            {bookings.length === 0 ? "No Bookings Yet" : "No Matching Bookings"}
          </h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">
            {bookings.length === 0
              ? "Bookings will show up here as soon as attendees buy tickets."
              : "Try a different search or status filter."}
          </p>
        </div>
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[760px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold">Booking</th>
                  <th className="py-3 px-4 font-bold">Guest</th>
                  <th className="py-3 px-4 font-bold">{view === "recent" ? "Event" : "Ticket"}</th>
                  <th className="py-3 px-4 font-bold">Qty</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-base-content">#{b.bookingId}</span>
                        <span className="text-[10px] text-base-content/50">{fmtDate(b.createdAt)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-base-content">{guestLabel(b)}</span>
                        <span className="text-[10px] text-base-content/50">{b.guestPhone || b.guestEmail || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-base-content/70 font-semibold">
                      {view === "recent" ? eventTitleById(b.eventId) : getTicketName(b)}
                    </td>
                    <td className="py-3 px-4 text-base-content/70 font-semibold">{b.quantity}</td>
                    <td className="py-3 px-4 font-bold text-success">{fmtMoney(b.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge badge-sm font-bold ${statusBadge[b.bookingStatus]}`}>
                        {b.bookingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <RowActions b={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-200">
              <span className="text-[11px] text-base-content/60">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="btn btn-ghost btn-xs btn-square rounded-lg"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-semibold text-base-content/70">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="btn btn-ghost btn-xs btn-square rounded-lg"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}

      {/* 1. Booking detail */}
      <AnimatePresence>
        {detailBooking && (
          <div className={modalBackdrop} onClick={() => setDetailBooking(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">
                    Booking #{detailBooking.bookingId}
                  </h3>
                  <span className={`badge badge-sm font-bold ${statusBadge[detailBooking.bookingStatus]}`}>
                    {detailBooking.bookingStatus}
                  </span>
                </div>
                <button onClick={() => setDetailBooking(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="rounded-xl bg-base-200/40 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-primary shrink-0" />
                    <span className="font-bold text-base-content">{guestLabel(detailBooking)}</span>
                  </div>
                  {detailBooking.guestEmail && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Mail size={13} className="shrink-0" />
                      <span className="break-all">{detailBooking.guestEmail}</span>
                    </div>
                  )}
                  {detailBooking.guestPhone && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Phone size={13} className="shrink-0" />
                      <span>{detailBooking.guestPhone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Event</span>
                    <span className="font-bold text-base-content">{eventTitleById(detailBooking.eventId)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Ticket</span>
                    <span className="font-bold text-base-content">{getTicketName(detailBooking)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Quantity</span>
                    <span className="font-bold text-base-content">{detailBooking.quantity}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-base-content/60 font-semibold">Total</span>
                    <span className="font-bold text-success">{fmtMoney(detailBooking.totalAmount)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[11px] text-base-content/60 font-semibold">Booked on</span>
                    <span className="font-bold text-base-content">{fmtDate(detailBooking.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                {detailBooking.bookingStatus === "Pending" && (
                  <button
                    onClick={() => setConfirmAction({ booking: detailBooking, type: "confirm" })}
                    className="btn btn-success btn-xs sm:btn-sm rounded-xl font-bold text-success-content gap-1"
                  >
                    <Check size={14} /> Confirm
                  </button>
                )}
                {detailBooking.bookingStatus !== "Cancelled" && (
                  <button
                    onClick={() => setConfirmAction({ booking: detailBooking, type: "cancel" })}
                    className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold text-error bg-error/10 hover:bg-error/20 gap-1"
                  >
                    <Ban size={14} /> Cancel booking
                  </button>
                )}
                <button onClick={() => setDetailBooking(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Confirm / Cancel action */}
      <AnimatePresence>
        {confirmAction && (
          <div className={`${modalBackdrop} z-[60]`}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmAction.type === "confirm" ? "bg-success/10 text-success" : "bg-error/10 text-error"
                }`}
              >
                {confirmAction.type === "confirm" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">
                  {confirmAction.type === "confirm" ? "Confirm Booking?" : "Cancel Booking?"}
                </h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  {confirmAction.type === "confirm" ? (
                    <>
                      Mark booking <span className="font-bold text-base-content">#{confirmAction.booking.bookingId}</span>{" "}
                      for <span className="font-bold text-base-content">{guestLabel(confirmAction.booking)}</span> as
                      confirmed.
                    </>
                  ) : (
                    <>
                      Cancel booking <span className="font-bold text-base-content">#{confirmAction.booking.bookingId}</span>{" "}
                      for <span className="font-bold text-base-content">{guestLabel(confirmAction.booking)}</span>? The
                      guest's tickets will no longer be valid.
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={isUpdating || isCancelling}
                  onClick={handleConfirmAction}
                  className={`btn btn-sm rounded-xl font-bold w-1/2 text-xs shadow-sm ${
                    confirmAction.type === "confirm"
                      ? "btn-success text-success-content"
                      : "btn-error text-error-content"
                  }`}
                >
                  {isUpdating || isCancelling ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : confirmAction.type === "confirm" ? (
                    "Confirm"
                  ) : (
                    "Cancel booking"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingsManager;