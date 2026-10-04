import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Search,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  DollarSign,
  Info,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Smartphone,
  Lock,
  Building2,
  Plus,
} from "lucide-react";
import {
  useGetPaymentsByOrgIdQuery,
  useGetPaymentsByEventIdQuery,
  useGetEventRevenueQuery,
  type Payment,
  type PaymentStatus,
} from "../../features/APIS/PaymentApi";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";

// Change this to match the currency used on your other pages
const CURRENCY = "KSH";
const PAGE_SIZE = 10;
const DEFAULT_METHODS = ["M-Pesa", "Stripe", "Card", "Cash"];

type StatusFilter = "all" | PaymentStatus;

const statusBadge: Record<PaymentStatus, string> = {
  Completed: "badge-success text-success-content",
  Pending: "badge-warning text-warning-content",
  Failed: "badge-error text-error-content",
};

const toMoney = (v: unknown) => Number(v || 0);
const fmtMoney = (v: unknown) =>
  `${CURRENCY}${toMoney(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const pid = (p: Payment) => (p.paymentId ?? p.id) as number;

export const PaymentsManager = () => {
  usePageTitle("Payments Manager");

  // The organizer's REAL organization. There is no fallback to a default one:
  // someone without an organization must not see other people's payments.
  const { orgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  const { data: eventsData } = useGetEventsByOrganizationQuery(orgId as number, { skip: !orgId });
  const rawEvents = Array.isArray(eventsData)
    ? eventsData
    : Array.isArray((eventsData as any)?.data)
    ? (eventsData as any).data
    : [];
  const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;

  // "" means all events for the organization
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const activeEvent = rawEvents.find((ev: any) => String(getEventId(ev)) === String(selectedEventId));

  // ---------------------------------------------------------------------------
  // PAYMENTS (whole organization, or one event)
  // ---------------------------------------------------------------------------
  const orgQuery = useGetPaymentsByOrgIdQuery(orgId as number, { skip: !orgId || !!selectedEventId });
  const eventQuery = useGetPaymentsByEventIdQuery(selectedEventId, { skip: !selectedEventId });
  const { data: eventRevenueData } = useGetEventRevenueQuery(selectedEventId, { skip: !selectedEventId });

  const active = selectedEventId ? eventQuery : orgQuery;
  const isLoading = active.isLoading;
  const isError = active.isError;

  const payments: Payment[] = useMemo(() => {
    const d: any = active.data;
    const list: Payment[] = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
    // Safety net: never show a payment that is clearly tagged with another organization
    return list.filter((p) => p.orgId === undefined || p.orgId === null || Number(p.orgId) === Number(orgId));
  }, [active.data, orgId]);

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  // ---------------------------------------------------------------------------
  // FILTERING + PAGINATION
  // ---------------------------------------------------------------------------
  const methodOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_METHODS);
    payments.forEach((p) => p.paymentMethod && set.add(p.paymentMethod));
    return Array.from(set);
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
      const matchesSearch =
        !q ||
        String(pid(p)).includes(q) ||
        String(p.bookingId).includes(q) ||
        (p.transactionId || "").toLowerCase().includes(q);
      return matchesStatus && matchesMethod && matchesSearch;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  const completed = payments.filter((p) => p.paymentStatus === "Completed");
  const pendingCount = payments.filter((p) => p.paymentStatus === "Pending").length;
  const failedCount = payments.filter((p) => p.paymentStatus === "Failed").length;
  const computedRevenue = completed.reduce((sum, p) => sum + toMoney(p.amount), 0);
  const revenue =
    selectedEventId && eventRevenueData && typeof eventRevenueData === "object"
      ? toMoney(eventRevenueData.totalRevenue ?? eventRevenueData.revenue ?? eventRevenueData.total ?? computedRevenue)
      : selectedEventId && typeof eventRevenueData === "number"
      ? eventRevenueData
      : computedRevenue;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const resetFilters = () => {
    setPage(1);
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
  };

  const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
  const modalMotion = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
  };

  const MethodIcon = ({ method }: { method?: string }) =>
    (method || "").toLowerCase().includes("pesa") ? (
      <Smartphone size={13} className="text-success shrink-0" />
    ) : (
      <Receipt size={13} className="text-primary shrink-0" />
    );

  const RowActions = ({ p }: { p: Payment }) => (
    <div className="flex items-center justify-end">
      <button
        onClick={() => setDetailPayment(p)}
        className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
        title="View payment"
      >
        <Eye size={13} />
        <span>View</span>
      </button>
    </div>
  );

  // --- WHILE WE CHECK THE ORGANIZER'S ORGANIZATION ---
  if (orgLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  // --- NO ORGANIZATION YET: ask them to create one first ---
  if (!hasOrg) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Building2 size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Create your organization first</h2>
          <p className="text-xs text-base-content/60 max-w-md leading-relaxed">
            Payments come from the tickets sold for your events, and events belong to an organization. Create your
            organization and your first event, then payments will appear here.
          </p>
          <Link
            to="/organizer-dashboard/my-organization"
            className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm mt-2"
          >
            <Plus size={14} />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER & EVENT SELECTOR                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Wallet size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Payments Manager</h1>
              <span className="badge badge-primary badge-outline badge-xs font-bold px-2 py-0.5 gap-1"><Lock size={9} />View only</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Showing payments for:{" "}
              <span className="font-bold text-base-content">{activeEvent ? activeEvent.title : "All your events"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              resetFilters();
            }}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-48 font-semibold"
          >
            <option value="">All events</option>
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
              <span className="font-bold text-base-content">Payments Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                See the payments made for your events. Filter by event, status or method, search by payment number,
                booking number or transaction ID, and open any payment to see its details. This page is for viewing
                only.
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
            <span className="text-[11px] text-base-content/60 font-semibold">Total Revenue</span>
            <span className="text-base sm:text-lg font-black text-base-content">{fmtMoney(revenue)}</span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Completed</span>
            <span className="text-base sm:text-lg font-black text-base-content">{completed.length}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
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
            <span className="text-[11px] text-base-content/60 font-semibold">Failed</span>
            <span className="text-base sm:text-lg font-black text-base-content">{failedCount}</span>
          </div>
          <div className="p-2.5 bg-error/10 text-error rounded-xl shrink-0">
            <XCircle size={18} />
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
            placeholder="Search payment #, booking # or transaction ID"
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
          className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-40 font-semibold"
        >
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Failed">Failed</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setPage(1);
          }}
          className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-40 font-semibold"
        >
          <option value="all">All methods</option>
          {methodOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* =================================================================== */}
      {/* PAYMENTS TABLE                                                      */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Failed to load payments. Check your connection and try again.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Wallet size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">
            {payments.length === 0 ? "No Payments Yet" : "No Matching Payments"}
          </h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">
            {payments.length === 0
              ? "Payments will appear here when attendees pay for your events."
              : "Try a different search, status or method."}
          </p>
        </div>
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[820px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold">Payment</th>
                  <th className="py-3 px-4 font-bold">Booking</th>
                  <th className="py-3 px-4 font-bold">Method</th>
                  <th className="py-3 px-4 font-bold">Transaction ID</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={pid(p)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-base-content">#{pid(p)}</span>
                        <span className="text-[10px] text-base-content/50">{fmtDate(p.createdAt)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-base-content/70">#{p.bookingId}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5 font-semibold text-base-content/80">
                        <MethodIcon method={p.paymentMethod} />
                        {p.paymentMethod || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-base-content/70">{p.transactionId || "—"}</td>
                    <td className="py-3 px-4 font-bold text-success">{fmtMoney(p.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge badge-sm font-bold ${statusBadge[p.paymentStatus]}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <RowActions p={p} />
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

      {/* 1. Payment detail */}
      <AnimatePresence>
        {detailPayment && (
          <div className={modalBackdrop} onClick={() => setDetailPayment(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">
                    Payment #{pid(detailPayment)}
                  </h3>
                  <span className={`badge badge-sm font-bold ${statusBadge[detailPayment.paymentStatus]}`}>
                    {detailPayment.paymentStatus}
                  </span>
                </div>
                <button onClick={() => setDetailPayment(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Amount</span>
                  <span className="font-bold text-success">{fmtMoney(detailPayment.amount)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Method</span>
                  <span className="font-bold text-base-content">{detailPayment.paymentMethod || "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Booking</span>
                  <span className="font-bold text-base-content">#{detailPayment.bookingId}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Date</span>
                  <span className="font-bold text-base-content">{fmtDate(detailPayment.createdAt)}</span>
                </div>
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-[11px] text-base-content/60 font-semibold">Transaction ID</span>
                  <span className="font-bold font-mono text-base-content break-all">
                    {detailPayment.transactionId || "—"}
                  </span>
                </div>
                {detailPayment.resultDesc && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[11px] text-base-content/60 font-semibold">Gateway message</span>
                    <span className="text-base-content/80">{detailPayment.resultDesc}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                <button onClick={() => setDetailPayment(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
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

export default PaymentsManager;