import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { motion } from "framer-motion";
import {
  BarChart3, Wallet, ShoppingBag, Ticket, CheckCircle2, Clock, XCircle, AlertCircle, TrendingUp,
  CalendarDays, CreditCard, Tag, ScanLine, UserX, Percent, Trophy, Compass, Lightbulb, Download,
  RefreshCw, Printer, ArrowUpRight, ArrowDownRight, CalendarClock, Target, Users, Layers, MapPin,
  Ban, Timer, Grid3X3, LayoutDashboard, Activity, Award, Flame, Crown, Rocket, ShieldCheck, Star,
  Medal, Sparkles, Gem, Hourglass, Filter, Gauge, Repeat, Coins, Sunrise,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetBookingsByUserDigitalIdQuery } from "../../features/APIS/BookingsApi";
import { useGetPaymentsByUserIdQuery } from "../../features/APIS/PaymentApi";
import {
  useGetTicketsByHolderIdQuery,
  useGetTicketsByPurchaserIdQuery,
  useGetUnassignedUserTicketsQuery,
} from "../../features/APIS/ticketsApi";
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetAllTicketTypesQuery, useGetTicketTypeByIdQuery } from "../../features/APIS/ticketsType.Api";
import usePageTitle from "../../hooks/usePageTitle";

/* ------------------------------ config ------------------------------ */
const CURRENCY = "KES";
const BOOKINGS_PATH = "/dashboard/my-bookings"; // ⚠️ change to your My Bookings route
const EXPLORE_PATH = "/";
const HEATMAP_WEEKS = 26;
const BIG_SPEND = 20000; // spend needed for the "High roller" badge
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RANGES = [
  { key: "all", label: "All time", days: 0 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "365", label: "Last 12 months", days: 365 },
];
type TabKey = "overview" | "spending" | "events" | "tickets" | "payments" | "habits" | "achievements";
const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={14} /> },
  { key: "spending", label: "Spending", icon: <Wallet size={14} /> },
  { key: "events", label: "Events", icon: <CalendarClock size={14} /> },
  { key: "tickets", label: "Tickets", icon: <Ticket size={14} /> },
  { key: "payments", label: "Payments", icon: <CreditCard size={14} /> },
  { key: "habits", label: "Habits", icon: <Activity size={14} /> },
  { key: "achievements", label: "Achievements", icon: <Award size={14} /> },
];

/* ------------------------------ helpers ------------------------------ */
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
const num = (v: any) => Number(v || 0);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const fmtMoney = (n: number) => `${CURRENCY} ${Math.round(n).toLocaleString()}`;
const fmtDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDuration = (min: number) =>
  min < 60 ? `${Math.max(1, Math.round(min))} min` : min < 1440 ? `${(min / 60).toFixed(1)} hours` : `${(min / 1440).toFixed(1)} days`;
const countdown = (d: Date) => {
  const n = Math.ceil((d.getTime() - Date.now()) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};
const shortMoney = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(Math.round(n)));

// Event field names differ between backends, so we check the common ones.
const eventIdOf = (e: any) => Number(e?.eventId ?? e?.id ?? 0);
const eventTitleOf = (e: any): string => e?.title ?? e?.eventName ?? e?.name ?? "";
const eventCategoryOf = (e: any): string => e?.category ?? e?.eventCategory ?? e?.categoryName ?? "";
const eventPlaceOf = (e: any): string => e?.city ?? e?.location ?? e?.venue ?? e?.venueName ?? "";
const eventDateOf = (e: any): Date | null => {
  for (const k of ["startDate", "eventDate", "date", "startTime", "startsAt", "start", "eventStart"]) {
    if (e?.[k]) {
      const d = new Date(e[k]);
      if (!isNaN(+d)) return d;
    }
  }
  return null;
};
const ticketIdOf = (t: any) => Number(t?.ticketTypeId ?? t?.ticketTypeID ?? t?.id ?? 0);
const ticketNameOf = (t: any): string => {
  if (!t) return "";
  for (const k of ["name", "typeName", "ticketName", "ticketTypeName", "title", "label", "category", "type"]) {
    if (typeof t[k] === "string" && t[k].trim()) return t[k];
  }
  return "";
};

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** Totals for a set of bookings and payments. Spend uses completed payments, or confirmed bookings if there are none. */
const summarize = (bk: any[], pay: any[]) => {
  const confirmed = bk.filter((b) => b.bookingStatus === "Confirmed");
  const confirmedSum = sum(confirmed.map((b) => num(b.totalAmount)));
  const paidSum = sum(pay.filter((p) => p.paymentStatus === "Completed").map((p) => num(p.amount)));
  return {
    total: bk.length,
    spent: paidSum || confirmedSum,
    tickets: sum(bk.filter((b) => b.bookingStatus !== "Cancelled").map((b) => num(b.quantity))),
    avg: confirmed.length ? confirmedSum / confirmed.length : 0,
  };
};

/** Groups items by a key and returns the groups sorted by a number, largest first. */
const groupSum = <T,>(items: T[], key: (i: T) => string | number, val: (i: T) => number) => {
  const m = new Map<string | number, { value: number; count: number }>();
  items.forEach((i) => {
    const k = key(i);
    if (k === "" || k === undefined) return;
    const c = m.get(k) ?? { value: 0, count: 0 };
    m.set(k, { value: c.value + val(i), count: c.count + 1 });
  });
  return [...m.entries()].sort((a, b) => b[1].value - a[1].value);
};

/** Longest run of consecutive numbers, and the run that ends at the latest number. */
const runs = (sorted: number[]) => {
  let longest = 0, run = 0, prev = NaN;
  sorted.forEach((n) => {
    run = n === prev + 1 ? run + 1 : 1;
    prev = n;
    longest = Math.max(longest, run);
  });
  return { longest, last: run, lastValue: sorted[sorted.length - 1] };
};

/** Ticket type name: cached list first, then fetch that one type by ID. */
const TypeName = ({ id, names }: { id: number; names: Map<number, string> }) => {
  const known = names.get(id);
  const q = useGetTicketTypeByIdQuery(id, { skip: !!known || !id });
  if (known) return <>{known}</>;
  const fetched = ticketNameOf(unwrapOne(q.data));
  return <>{fetched || (q.isLoading ? "Loading…" : `Ticket type #${id}`)}</>;
};

const bookingTone = {
  Confirmed: { bar: "bg-success", badge: "badge-success text-success-content" },
  Pending: { bar: "bg-warning", badge: "badge-warning text-warning-content" },
  Cancelled: { bar: "bg-error", badge: "badge-error text-error-content" },
} as const;
const payTone = {
  Completed: { bar: "bg-success", badge: "badge-success text-success-content" },
  Pending: { bar: "bg-warning", badge: "badge-warning text-warning-content" },
  Failed: { bar: "bg-error", badge: "badge-error text-error-content" },
} as const;

/* ---------------------------- small pieces ---------------------------- */
const Delta = ({ cur, prev }: { cur: number; prev: number | null }) => {
  if (prev === null) return null;
  if (!prev) return cur ? <span>New this period</span> : <span>No change</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  if (d === 0) return <span>Same as last period</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {d > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(d)}% vs last period
    </span>
  );
};

const Kpi = ({ label, value, hint, icon, tone, i }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone: string; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
    className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 min-w-0"
  >
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] text-base-content/60 font-semibold">{label}</span>
      <span className="text-base sm:text-lg font-black text-base-content truncate">{value}</span>
      {hint && <span className="text-[10px] text-base-content/50 truncate">{hint}</span>}
    </div>
    <div className={`p-2.5 rounded-xl shrink-0 ${tone}`}>{icon}</div>
  </motion.div>
);

const Section = ({ title, subtitle, icon, children, className = "" }: { title: string; subtitle?: string; icon: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4 ${className}`}>
    <div className="flex items-center gap-2.5">
      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">{icon}</div>
      <div className="flex flex-col">
        <h2 className="text-sm font-black text-base-content leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-base-content/60">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const BarRow = ({ label, value, max, display, sub, bar = "bg-primary", to }: { label: ReactNode; value: number; max: number; display: string; sub?: string; bar?: string; to?: string }) => {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-base-content truncate">{label}</span>
        <span className="font-black text-base-content shrink-0">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-base-200 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${max ? Math.max(value ? 4 : 0, (value / max) * 100) : 0}%` }} />
      </div>
      {sub && <span className="text-[10px] text-base-content/50">{sub}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="flex flex-col gap-1 rounded-lg hover:bg-base-200/50 -mx-1.5 px-1.5 py-0.5 transition-colors" title="View these bookings">{body}</Link>
  ) : (
    <div className="flex flex-col gap-1">{body}</div>
  );
};

/** Vertical bar chart. */
const Columns = ({ data, format, height = "h-44", minW = "min-w-[20rem]", highlightMax = false }: {
  data: { key?: string; label: string; value: number; title?: string }[];
  format?: (n: number) => string; height?: string; minW?: string; highlightMax?: boolean;
}) => {
  const max = Math.max(0, ...data.map((d) => d.value));
  const show = (n: number) => (format ? format(n) : String(n));
  return (
    <div className="overflow-x-auto">
      <div className={`flex items-end gap-2 ${height} ${minW}`}>
        {data.map((d) => (
          <div key={d.key ?? d.label} className="flex-1 min-w-[1.5rem] min-h-0 h-full flex flex-col items-center gap-1" title={d.title ?? `${d.label}: ${show(d.value)}`}>
            <span className="text-[9px] font-bold text-base-content/60 h-3">{d.value ? show(d.value) : ""}</span>
            <div className="w-full flex-1 min-h-0 flex items-end">
              <div
                className={`w-full rounded-t-lg ${highlightMax && !(d.value === max && max > 0) ? "bg-primary/40" : "bg-primary"}`}
                style={{ height: `${max ? (d.value / max) * 100 : 0}%`, minHeight: d.value ? 4 : 0 }}
              />
            </div>
            <span className="text-[10px] text-base-content/60 font-semibold">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Running-total line chart that follows the theme colour. */
const LineChart = ({ values }: { values: number[] }) => {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 300},${100 - (v / max) * 90 - 5}`);
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="w-full h-40 text-primary" role="img" aria-label="Running total of your spending">
      <polygon points={`0,100 ${pts.join(" ")} 300,100`} fill="currentColor" opacity="0.12" />
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
};

const Ring = ({ value, stroke }: { value: number; stroke: string }) => {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90 shrink-0" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-base-200" />
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className={stroke} strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
    </svg>
  );
};

const NoData = ({ text }: { text: string }) => (
  <p className="text-[11px] text-base-content/60 text-center py-8 bg-base-200/30 rounded-xl border border-dashed border-base-300">{text}</p>
);

const Fact = ({ k, v }: { k: string; v: ReactNode }) => (
  <li className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 px-3 py-2 text-xs">
    <span className="text-base-content/60 font-semibold">{k}</span>
    <span className="font-black text-base-content text-right truncate">{v}</span>
  </li>
);

const Tile = ({ k, v, sub }: { k: string; v: ReactNode; sub?: ReactNode }) => (
  <div className="rounded-xl bg-base-200/50 p-3 flex flex-col min-w-0">
    <span className="text-[10px] text-base-content/50 font-semibold">{k}</span>
    <span className="text-sm font-black text-base-content truncate">{v}</span>
    {sub && <span className="text-[10px] text-base-content/50">{sub}</span>}
  </div>
);

const Shell = ({ header, children, className = "" }: { header: ReactNode; children: ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-5 pb-28 lg:pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6 ${className}`}>
    {header}
    {children}
  </div>
);

/* -------------------------------- page -------------------------------- */
export const UserAnalytics = () => {
  usePageTitle("My Analytics");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = user?.digitalId || user?.userId || "";
  const arg = digitalId || skipToken;

  const bookingsQ = useGetBookingsByUserDigitalIdQuery(arg);
  const paymentsQ = useGetPaymentsByUserIdQuery(arg);
  const ticketsQ = useGetTicketsByHolderIdQuery(arg);
  const purchasedQ = useGetTicketsByPurchaserIdQuery(arg);
  const unassignedQ = useGetUnassignedUserTicketsQuery(arg);
  const eventsQ = useGetAllEventsQuery(undefined);
  const typesQ = useGetAllTicketTypesQuery(undefined);

  const [tab, setTab] = useState<TabKey>("overview");
  const [rangeKey, setRangeKey] = useState("all");
  const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 0;
  const rangeLabel = RANGES.find((r) => r.key === rangeKey)?.label ?? "All time";

  // Monthly budget (saved on this device)
  const budgetKey = `ticketstream:budget:${digitalId}`;
  const [budget, setBudget] = useState<number>(() => {
    try { return Number(localStorage.getItem(budgetKey)) || 0; } catch { return 0; }
  });
  const [budgetInput, setBudgetInput] = useState("");
  const saveBudget = () => {
    const v = Number(budgetInput);
    if (!(v > 0)) return;
    setBudget(v);
    setBudgetInput("");
    try { localStorage.setItem(budgetKey, String(v)); } catch { /* storage unavailable */ }
  };
  const clearBudget = () => {
    setBudget(0);
    try { localStorage.removeItem(budgetKey); } catch { /* storage unavailable */ }
  };

  const allBookings = useMemo(() => toArray(bookingsQ.data), [bookingsQ.data]);
  const allPayments = useMemo(() => toArray(paymentsQ.data), [paymentsQ.data]);
  const allTickets = useMemo(() => toArray(ticketsQ.data), [ticketsQ.data]);
  const allPurchased = useMemo(() => toArray(purchasedQ.data), [purchasedQ.data]);

  const eventsById = useMemo(() => {
    const m = new Map<number, any>();
    toArray(eventsQ.data).forEach((e) => m.set(eventIdOf(e), e));
    return m;
  }, [eventsQ.data]);
  const eventName = (id: number) => eventTitleOf(eventsById.get(id)) || (eventsQ.isLoading ? "Loading event…" : `Event #${id}`);

  const typeNames = useMemo(() => {
    const m = new Map<number, string>();
    toArray(typesQ.data).forEach((t) => ticketNameOf(t) && m.set(ticketIdOf(t), ticketNameOf(t)));
    return m;
  }, [typesQ.data]);

  const s = useMemo(() => {
    const nowD = new Date();
    const now = nowD.getTime();
    const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
    const inRange = (iso?: string) => !days || now - t(iso) <= days * 864e5;
    const inPrev = (iso?: string) => t(iso) <= now - days * 864e5 && t(iso) > now - 2 * days * 864e5;

    const bookings = allBookings.filter((b) => inRange(b.createdAt));
    const payments = allPayments.filter((p) => inRange(p.createdAt));
    const tickets = allTickets.filter((x) => inRange(x.createdAt));
    const purchased = allPurchased.filter((x) => inRange(x.createdAt));
    const unassigned = toArray(unassignedQ.data).length;

    const cur = summarize(bookings, payments);
    const prev = days ? summarize(allBookings.filter((b) => inPrev(b.createdAt)), allPayments.filter((p) => inPrev(p.createdAt))) : null;

    const confirmed = bookings.filter((b) => b.bookingStatus === "Confirmed");
    const pending = bookings.filter((b) => b.bookingStatus === "Pending");
    const cancelled = bookings.filter((b) => b.bookingStatus === "Cancelled");
    const active = bookings.filter((b) => b.bookingStatus !== "Cancelled");
    const paid = payments.filter((p) => p.paymentStatus === "Completed");
    const pendingSum = sum(pending.map((b) => num(b.totalAmount)));
    const cancelledSum = sum(cancelled.map((b) => num(b.totalAmount)));
    const stalePending = pending.filter((b) => now - t(b.createdAt) > 864e5).length;
    const attended = tickets.filter((x) => x.isScanned).length;
    const eventCount = new Set(confirmed.map((b) => num(b.eventId))).size;

    /* ---- spending over time ---- */
    const spendRows = paid.length
      ? paid.map((p) => ({ date: p.createdAt as string, amount: num(p.amount) }))
      : confirmed.map((b) => ({ date: b.createdAt as string, amount: num(b.totalAmount) }));
    const byMonth = new Map<string, { spent: number; count: number }>();
    spendRows.forEach((r) => {
      if (!r.date) return;
      const k = r.date.slice(0, 7);
      const c = byMonth.get(k) ?? { spent: 0, count: 0 };
      byMonth.set(k, { spent: c.spent + r.amount, count: c.count + 1 });
    });
    const keys = [...byMonth.keys()].sort();
    const months: { key: string; label: string; spent: number; count: number }[] = [];
    if (keys.length) {
      let d = new Date(`${keys[0]}-01T00:00:00`);
      while (d.getTime() <= now) {
        const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        months.push({ key: k, label: d.toLocaleDateString(undefined, { month: "short" }), ...(byMonth.get(k) ?? { spent: 0, count: 0 }) });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    }
    const lastMonths = months.slice(-12);
    const momRows = lastMonths.slice(-6).map((m, i, arr) => ({ ...m, change: i && arr[i - 1].spent ? ((m.spent - arr[i - 1].spent) / arr[i - 1].spent) * 100 : null }));

    let run = 0;
    const running = [...spendRows].filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date)).map((r) => (run += r.amount));

    const qtyByMonth = new Map<string, { amt: number; qty: number }>();
    confirmed.forEach((b) => {
      const k = String(b.createdAt).slice(0, 7);
      const c = qtyByMonth.get(k) ?? { amt: 0, qty: 0 };
      qtyByMonth.set(k, { amt: c.amt + num(b.totalAmount), qty: c.qty + num(b.quantity) });
    });
    const avgPriceMonths = lastMonths.map((m) => {
      const c = qtyByMonth.get(m.key);
      return { key: m.key, label: m.label, value: c && c.qty ? Math.round(c.amt / c.qty) : 0 };
    });

    // This month vs last month, and the end-of-month forecast (ignores the time-period filter)
    const allConfirmed = allBookings.filter((b) => b.bookingStatus === "Confirmed");
    const allPaid = allPayments.filter((p) => p.paymentStatus === "Completed");
    const allSpendRows = (allPaid.length
      ? allPaid.map((p) => ({ date: p.createdAt as string, amount: num(p.amount) }))
      : allConfirmed.map((b) => ({ date: b.createdAt as string, amount: num(b.totalAmount) }))
    ).filter((r) => !isNaN(t(r.date)));
    const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime();
    const lastMonthStart = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1).getTime();
    const monthSpent = sum(allSpendRows.filter((r) => t(r.date) >= monthStart).map((r) => r.amount));
    const lastMonthSpent = sum(allSpendRows.filter((r) => t(r.date) >= lastMonthStart && t(r.date) < monthStart).map((r) => r.amount));
    const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
    const projected = (monthSpent / Math.max(1, nowD.getDate())) * daysInMonth;
    const allTimeSpent = sum(allSpendRows.map((r) => r.amount));

    /* ---- per event / type / category / place ---- */
    const topEvents = groupSum(confirmed, (b) => num(b.eventId), (b) => num(b.totalAmount)).slice(0, 5)
      .map(([id, v]) => ({ id: id as number, spent: v.value, bookings: v.count, tickets: sum(confirmed.filter((b) => num(b.eventId) === id).map((b) => num(b.quantity))) }));
    const typeList = groupSum(confirmed, (b) => num(b.ticketTypeId), (b) => num(b.quantity)).slice(0, 5).map(([id, v]) => {
      const rows = confirmed.filter((b) => num(b.ticketTypeId) === id && num(b.quantity) > 0);
      const unit = rows.map((b) => num(b.totalAmount) / num(b.quantity));
      const spent = sum(rows.map((b) => num(b.totalAmount)));
      return { id: id as number, tickets: v.value, spent, avg: v.value ? spent / v.value : 0, min: Math.min(...unit), max: Math.max(...unit) };
    });
    const byCategory = groupSum(confirmed, (b) => eventCategoryOf(eventsById.get(num(b.eventId))), (b) => num(b.totalAmount)).slice(0, 5);
    const byPlace = groupSum(confirmed, (b) => eventPlaceOf(eventsById.get(num(b.eventId))), (b) => num(b.totalAmount)).slice(0, 5);
    const repeatEvents = groupSum(allConfirmed, (b) => num(b.eventId), () => 1).filter(([, v]) => v.count >= 2).slice(0, 5);

    /* ---- group sizes ---- */
    const sizeBuckets = [
      { label: "Just 1", n: active.filter((b) => num(b.quantity) === 1).length },
      { label: "2 tickets", n: active.filter((b) => num(b.quantity) === 2).length },
      { label: "3 to 4", n: active.filter((b) => [3, 4].includes(num(b.quantity))).length },
      { label: "5 or more", n: active.filter((b) => num(b.quantity) >= 5).length },
    ];
    const avgGroup = active.length ? cur.tickets / active.length : 0;

    /* ---- payments ---- */
    const methodMap = new Map<string, { total: number; ok: number; amount: number }>();
    payments.forEach((p) => {
      const k = p.paymentMethod || "Other";
      const c = methodMap.get(k) ?? { total: 0, ok: 0, amount: 0 };
      const ok = p.paymentStatus === "Completed";
      methodMap.set(k, { total: c.total + 1, ok: c.ok + (ok ? 1 : 0), amount: c.amount + (ok ? num(p.amount) : 0) });
    });
    const methods = [...methodMap.entries()].sort((a, b) => b[1].amount - a[1].amount);
    const payCounts = {
      Completed: paid.length,
      Pending: payments.filter((p) => p.paymentStatus === "Pending").length,
      Failed: payments.filter((p) => p.paymentStatus === "Failed").length,
    };
    const bkById = new Map(allBookings.map((b) => [num(b.bookingId), b]));
    const gaps = paid
      .map((p) => {
        const b = bkById.get(num(p.bookingId));
        return b ? (t(p.createdAt) - t(b.createdAt)) / 6e4 : NaN;
      })
      .filter((x) => !isNaN(x) && x >= 0);
    const avgPayMinutes = gaps.length ? sum(gaps) / gaps.length : null;
    const recentPayments = [...payments].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    /* ---- events ---- */
    const evIds = [...new Set(allConfirmed.map((b) => num(b.eventId)))];
    const dated = evIds.map((id) => ({ id, date: eventDateOf(eventsById.get(id)) })).filter((x): x is { id: number; date: Date } => !!x.date);
    const upcoming = dated.filter((x) => x.date.getTime() >= now).sort((a, b) => +a.date - +b.date);
    const next = upcoming[0];
    const nextTickets = next ? sum(allConfirmed.filter((b) => num(b.eventId) === next.id).map((b) => num(b.quantity))) : 0;
    const isPast = (id: number) => {
      const d = eventDateOf(eventsById.get(id));
      return !!d && d.getTime() < now;
    };
    const attendedEvents = groupSum(tickets.filter((x) => x.isScanned), (x) => num(x.eventId), () => 1);
    const pastTickets = tickets.filter((x) => isPast(num(x.eventId)));
    const missed = pastTickets.filter((x) => !x.isScanned);
    const missedEvents = groupSum(missed, (x) => num(x.eventId), () => 1);
    const eventWeekday = WEEKDAYS.map((label, i) => ({ label, value: dated.filter((x) => x.date.getDay() === i).length }));
    const weekendShare = dated.length ? pct(dated.filter((x) => [0, 6].includes(x.date.getDay())).length, dated.length) : 0;
    const hasEventTimes = dated.some((x) => x.date.getHours() || x.date.getMinutes());
    const partOf = (h: number) => (h >= 5 && h < 12 ? "Morning" : h >= 12 && h < 17 ? "Afternoon" : h >= 17 && h < 22 ? "Evening" : "Night");
    const eventParts = ["Morning", "Afternoon", "Evening", "Night"].map((label) => ({ label, value: dated.filter((x) => partOf(x.date.getHours()) === label).length }));

    /* ---- tickets ---- */
    const forOthers = purchased.filter((x) => x.holderId && Number(x.holderId) !== Number(digitalId)).length;
    const bundleMap = groupSum(purchased.filter((x) => x.groupBundleId), (x) => x.groupBundleId, () => 1);
    const bundleTickets = sum(bundleMap.map(([, v]) => v.count));
    const bundleAssigned = purchased.filter((x) => x.groupBundleId && x.attendeeName).length;
    const funnel = [
      { label: "Tickets booked", n: cur.tickets },
      { label: "Paid for", n: sum(confirmed.map((b) => num(b.quantity))) },
      { label: "In your wallet", n: tickets.length },
      { label: "Given an attendee", n: Math.max(0, tickets.length - unassigned) },
      { label: "Scanned at the gate", n: attended },
    ];

    /* ---- habits ---- */
    const weekday = WEEKDAYS.map((label, i) => ({ label, value: bookings.filter((b) => b.createdAt && new Date(b.createdAt).getDay() === i).length }));
    const busiest = [...weekday].sort((a, b) => b.value - a.value)[0];
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: h % 3 === 0 ? String(h) : "", key: String(h), value: bookings.filter((b) => b.createdAt && new Date(b.createdAt).getHours() === h).length }));
    const parts = ["Morning", "Afternoon", "Evening", "Night"].map((label) => ({ label, n: bookings.filter((b) => b.createdAt && partOf(new Date(b.createdAt).getHours()) === label).length }));
    const topPart = [...parts].sort((a, b) => b.n - a.n)[0];
    const persona = !topPart?.n ? "" : ({ Morning: "Early bird", Afternoon: "Midday browser", Evening: "Evening booker", Night: "Night owl" } as Record<string, string>)[topPart.label];

    const counts = new Map<string, number>();
    allBookings.forEach((b) => {
      if (b.createdAt) counts.set(ymd(new Date(b.createdAt)), (counts.get(ymd(new Date(b.createdAt))) ?? 0) + 1);
    });
    const today = new Date(nowD);
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - today.getDay() - (HEATMAP_WEEKS - 1) * 7);
    const cells = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { key: ymd(d), count: counts.get(ymd(d)) ?? 0, future: d > today };
    });
    const lastBooking = allBookings.map((b) => t(b.createdAt)).filter((x) => !isNaN(x)).sort((a, b) => b - a)[0];
    const daysSinceLast = lastBooking ? Math.floor((now - lastBooking) / 864e5) : null;

    const monthIdx = [...new Set(allBookings.filter((b) => b.bookingStatus !== "Cancelled" && b.createdAt).map((b) => new Date(b.createdAt).getFullYear() * 12 + new Date(b.createdAt).getMonth()))].sort((a, b) => a - b);
    const r = runs(monthIdx);
    const nowIdx = nowD.getFullYear() * 12 + nowD.getMonth();
    const streak = { longest: r.longest, current: monthIdx.length && r.lastValue >= nowIdx - 1 ? r.last : 0 };

    const leads = confirmed
      .map((b) => {
        const d = eventDateOf(eventsById.get(num(b.eventId)));
        return d ? (d.getTime() - t(b.createdAt)) / 864e5 : NaN;
      })
      .filter((x) => !isNaN(x) && x >= 0);
    const avgLead = leads.length ? sum(leads) / leads.length : null;
    const leadBuckets = [
      { label: "Within a week", n: leads.filter((x) => x < 7).length },
      { label: "1 to 4 weeks", n: leads.filter((x) => x >= 7 && x < 28).length },
      { label: "1 to 3 months", n: leads.filter((x) => x >= 28 && x < 90).length },
      { label: "Over 3 months", n: leads.filter((x) => x >= 90).length },
    ];
    const leadPersona = avgLead === null ? "" : avgLead >= 30 ? "Planner" : avgLead <= 7 ? "Last-minute" : "Steady booker";

    /* ---- reliability score ---- */
    const comps = [
      { label: "Attendance", hint: "Past tickets you actually used", v: pastTickets.length ? attended / pastTickets.length : null, w: 35 },
      { label: "Payment success", hint: "Payments that went through", v: payments.length ? paid.length / payments.length : null, w: 25 },
      { label: "Tickets assigned", hint: "Tickets with an attendee", v: tickets.length ? Math.max(0, tickets.length - unassigned) / tickets.length : null, w: 20 },
      { label: "Bookings kept", hint: "Bookings you did not cancel", v: bookings.length ? 1 - cancelled.length / bookings.length : null, w: 20 },
    ];
    const usable = comps.filter((c) => c.v !== null);
    const score = usable.length ? Math.round((sum(usable.map((c) => (c.v as number) * c.w)) / sum(usable.map((c) => c.w))) * 100) : null;

    /* ---- badges (all time) ---- */
    const allTicketsBooked = sum(allBookings.filter((b) => b.bookingStatus !== "Cancelled").map((b) => num(b.quantity)));
    const allOk = allPayments.filter((p) => p.paymentStatus === "Completed").length;
    const badges = [
      { icon: <Star size={18} />, name: "First booking", desc: "Make your first booking", have: allBookings.length >= 1, progress: `${Math.min(allBookings.length, 1)} of 1` },
      { icon: <Medal size={18} />, name: "Regular", desc: "5 confirmed bookings", have: allConfirmed.length >= 5, progress: `${Math.min(allConfirmed.length, 5)} of 5` },
      { icon: <Ticket size={18} />, name: "Collector", desc: "Book 10 tickets", have: allTicketsBooked >= 10, progress: `${Math.min(allTicketsBooked, 10)} of 10` },
      { icon: <Users size={18} />, name: "Group leader", desc: "Buy a group bundle or 5 tickets for others", have: bundleMap.length >= 1 || forOthers >= 5, progress: `${Math.min(forOthers, 5)} of 5 for others` },
      { icon: <ShieldCheck size={18} />, name: "Perfect attendance", desc: "Use every ticket for 3 or more past events", have: pastTickets.length >= 3 && missed.length === 0, progress: `${missed.length} unused` },
      { icon: <Flame size={18} />, name: "On a roll", desc: "Book 3 months in a row", have: streak.longest >= 3, progress: `${Math.min(streak.longest, 3)} of 3 months` },
      { icon: <Gem size={18} />, name: "High roller", desc: `Spend over ${fmtMoney(BIG_SPEND)}`, have: allTimeSpent >= BIG_SPEND, progress: `${pct(allTimeSpent, BIG_SPEND)}%` },
      { icon: <Rocket size={18} />, name: "Planner", desc: "Book 30 or more days ahead on average", have: avgLead !== null && avgLead >= 30, progress: avgLead === null ? "No dated events" : `${Math.round(avgLead)} days` },
      { icon: <Crown size={18} />, name: "Smooth payer", desc: "3 or more payments with none failing", have: allOk >= 3 && allOk === allPayments.length, progress: `${allOk} of ${allPayments.length} succeeded` },
      { icon: <Sparkles size={18} />, name: "All set", desc: "Every ticket has an attendee", have: tickets.length >= 1 && unassigned === 0, progress: `${unassigned} left to assign` },
    ];

    const biggest = [...confirmed].sort((a, b) => num(b.totalAmount) - num(a.totalAmount))[0];
    const first = [...bookings].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];

    return {
      cur, prev, bookings, payments, confirmed, pending, cancelled, tickets, purchased, unassigned, attended, eventCount,
      pendingSum, cancelledSum, stalePending, months: lastMonths, momRows, running, avgPriceMonths,
      monthSpent, lastMonthSpent, projected, allTimeSpent,
      topEvents, typeList, byCategory, byPlace, repeatEvents, sizeBuckets, avgGroup,
      methods, payCounts, avgPayMinutes, recentPayments,
      upcomingCount: upcoming.length, pastCount: dated.length - upcoming.length, next, nextTickets,
      attendedEvents, missed, missedEvents, eventWeekday, weekendShare, hasEventTimes, eventParts,
      forOthers, bundleCount: bundleMap.length, bundleTickets, bundleAssigned, funnel,
      weekday, busiest, hours, parts, persona, cells, daysSinceLast, streak, avgLead, leadBuckets, leadPersona,
      comps, score, badges, biggest, first,
    };
  }, [allBookings, allPayments, allTickets, allPurchased, unassignedQ.data, eventsById, days, digitalId]);

  /* ------------------------------ actions ------------------------------ */
  const fetching = bookingsQ.isFetching || paymentsQ.isFetching || ticketsQ.isFetching;
  const refreshAll = () => {
    bookingsQ.refetch(); paymentsQ.refetch(); ticketsQ.refetch(); purchasedQ.refetch(); unassignedQ.refetch();
  };
  const typeLabel = (id: number) => typeNames.get(id) ?? `Ticket type #${id}`;
  const exportBookings = () =>
    downloadCsv(`bookings-${ymd(new Date())}.csv`, [
      ["Booking ID", "Event", "Ticket type", "Tickets", "Total (" + CURRENCY + ")", "Status", "Booked on"],
      ...s.bookings.map((b) => [b.bookingId, eventName(num(b.eventId)), typeLabel(num(b.ticketTypeId)), b.quantity, num(b.totalAmount), b.bookingStatus, fmtDate(b.createdAt)]),
    ]);
  const exportPayments = () =>
    downloadCsv(`payments-${ymd(new Date())}.csv`, [
      ["Payment ID", "Booking ID", "Method", "Amount (" + CURRENCY + ")", "Status", "Reference", "Date"],
      ...s.payments.map((p) => [p.paymentId ?? p.id ?? "", p.bookingId, p.paymentMethod ?? "", num(p.amount), p.paymentStatus, p.transactionId ?? "", fmtDate(p.createdAt)]),
    ]);
  /** Opens the print dialog. Choose "Save as PDF" as the destination. */
  const printPdf = () => {
    const previous = document.title;
    document.title = `ticketstream-statement-${ymd(new Date())}`;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  };

  /* ------------------------------ states ------------------------------ */
  const loading = bookingsQ.isLoading || paymentsQ.isLoading || ticketsQ.isLoading;
  const allFailed = bookingsQ.isError && paymentsQ.isError && ticketsQ.isError;
  const total = s.bookings.length;

  const header = (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0"><BarChart3 size={20} /></div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">My Analytics</h1>
            <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Member</span>
          </div>
          <p className="text-[11px] text-base-content/60">Your spending, bookings, payments and tickets in one place</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} aria-label="Choose a time period" className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold flex-1 lg:flex-none">
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button onClick={refreshAll} disabled={fetching} className="btn btn-ghost btn-sm bg-base-200 rounded-xl gap-1.5 text-xs font-bold" title="Refresh your data">
          <RefreshCw size={14} className={fetching ? "animate-spin" : ""} /> Refresh
        </button>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-sm bg-base-200 rounded-xl gap-1.5 text-xs font-bold"><Download size={14} /> Export</label>
          <ul tabIndex={0} className="dropdown-content menu menu-sm z-20 mt-1 w-52 rounded-xl border border-base-200 bg-base-100 p-1.5 shadow-lg">
            <li><button onClick={exportBookings} disabled={!s.bookings.length}>Bookings (CSV)</button></li>
            <li><button onClick={exportPayments} disabled={!s.payments.length}>Payments (CSV)</button></li>
          </ul>
        </div>
        <button onClick={printPdf} disabled={!total} className="btn btn-primary btn-sm rounded-xl gap-1.5 text-xs font-bold shadow-sm" title="Download your statement as a PDF">
          <Printer size={14} /> Download PDF
        </button>
      </div>
    </div>
  );

  if (!digitalId)
    return (
      <Shell header={header}>
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl"><AlertCircle size={16} /><span>We couldn't find your account. Please sign in again.</span></div>
      </Shell>
    );

  if (loading)
    return (
      <Shell header={header}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}</div>
      </Shell>
    );

  if (allFailed)
    return (
      <Shell header={header}>
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} /><span className="flex-1">We couldn't load your analytics.</span>
          <button onClick={refreshAll} className="btn btn-ghost btn-xs">Try again</button>
        </div>
      </Shell>
    );

  if (!total)
    return (
      <Shell header={header}>
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <BarChart3 size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No activity {days ? "in this period" : "yet"}</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">{days ? "Try a longer time period." : "Book tickets for an event and your analytics will show up here."}</p>
          {days ? (
            <button onClick={() => setRangeKey("all")} className="btn btn-ghost btn-xs bg-base-200 rounded-xl font-bold">Show all time</button>
          ) : (
            <Link to={EXPLORE_PATH} className="btn btn-primary btn-xs rounded-xl font-bold gap-1.5"><Compass size={13} /> Explore Events</Link>
          )}
        </div>
      </Shell>
    );

  /* ------------------------------ derived ------------------------------ */
  const maxOf = (a: number[]) => Math.max(0, ...a);
  const statusSegments = (["Confirmed", "Pending", "Cancelled"] as const).map((k) => ({
    k, n: k === "Confirmed" ? s.confirmed.length : k === "Pending" ? s.pending.length : s.cancelled.length,
  }));
  const budgetPct = budget ? Math.round((s.monthSpent / budget) * 100) : 0;
  const budgetBar = budgetPct > 100 ? "bg-error" : budgetPct >= 80 ? "bg-warning" : "bg-success";
  const heat = (c: number, future: boolean) => (future ? "bg-transparent" : c === 0 ? "bg-base-200" : c === 1 ? "bg-primary/30" : c === 2 ? "bg-primary/60" : "bg-primary");
  const overallSuccess = pct(s.payCounts.Completed, s.payments.length);
  const scoreStroke = s.score === null ? "stroke-base-300" : s.score >= 85 ? "stroke-success" : s.score >= 60 ? "stroke-primary" : "stroke-warning";
  const tier = s.score === null ? "Not enough data yet" : s.score >= 85 ? "Gold member" : s.score >= 70 ? "Silver member" : s.score >= 50 ? "Bronze member" : "Getting started";
  const unlocked = s.badges.filter((b) => b.have).length;
  const funnelMax = maxOf(s.funnel.map((f) => f.n));
  const monthDiff = s.lastMonthSpent ? Math.round(((s.projected - s.lastMonthSpent) / s.lastMonthSpent) * 100) : null;
  const story = [
    `You booked ${s.cur.tickets} ${s.cur.tickets === 1 ? "ticket" : "tickets"} for ${s.eventCount} ${s.eventCount === 1 ? "event" : "events"} and spent ${fmtMoney(s.cur.spent)}.`,
    s.topEvents[0] ? `${eventName(s.topEvents[0].id)} is where most of your money went.` : "",
    s.persona ? `You tend to book as an ${s.persona.toLowerCase().startsWith("e") ? "" : ""}${s.persona.toLowerCase()}${s.busiest?.value ? `, most often on ${s.busiest.label}s` : ""}.` : "",
    s.avgLead !== null ? `On average you book ${Math.round(s.avgLead)} days before the event.` : "",
    s.score !== null ? `Your reliability score is ${s.score} out of 100.` : "",
  ].filter(Boolean).join(" ").replace("as an early bird", "as an early bird").replace(/as an (midday|evening|night)/, "as a $1");
  const accountName = (user as any)?.fullName ?? (user as any)?.name ?? ((user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName ?? ""}` : "");

  /* ------------------------------- tabs ------------------------------- */
  const overview = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Your story" subtitle={rangeLabel} icon={<Sparkles size={16} />} className="lg:col-span-2">
          <p className="text-sm text-base-content/80 leading-relaxed">{story}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile k="Booking streak" v={`${s.streak.current} ${s.streak.current === 1 ? "month" : "months"}`} sub={`Best: ${s.streak.longest}`} />
            <Tile k="Badges" v={`${unlocked} of ${s.badges.length}`} sub="Unlocked" />
            <Tile k="Upcoming events" v={s.upcomingCount} sub={`${s.pastCount} past`} />
            <Tile k="All-time spend" v={fmtMoney(s.allTimeSpent)} />
          </div>
        </Section>

        <Section title="Reliability score" subtitle={tier} icon={<Gauge size={16} />}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Ring value={s.score ?? 0} stroke={scoreStroke} />
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-base-content">{s.score ?? "—"}</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-[11px] flex-1 min-w-0">
              {s.comps.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-2" title={c.hint}>
                  <span className="text-base-content/60 truncate">{c.label}</span>
                  <span className="font-black text-base-content">{c.v === null ? "—" : `${Math.round(c.v * 100)}%`}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Next up" subtitle="Your next event" icon={<CalendarClock size={16} />} className="lg:col-span-2">
          {s.next ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-base font-black text-base-content truncate">{eventName(s.next.id)}</span>
                <span className="text-[11px] text-base-content/60">
                  {s.next.date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} · {s.nextTickets} {s.nextTickets === 1 ? "ticket" : "tickets"}
                </span>
              </div>
              <span className="badge badge-primary font-bold shrink-0 self-start sm:self-center">{countdown(s.next.date)}</span>
            </div>
          ) : <NoData text="No upcoming events. Confirmed bookings for future events will show here." />}
        </Section>

        <Section title="Monthly budget" subtitle="Set a limit and track this month" icon={<Target size={16} />}>
          {budget ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-black text-base-content">{fmtMoney(s.monthSpent)}</span>
                <span className="text-base-content/60">of {fmtMoney(budget)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-base-200 overflow-hidden"><div className={`h-full rounded-full ${budgetBar}`} style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
              <p className="text-[11px] text-base-content/60">
                {budgetPct > 100 ? `You are ${fmtMoney(s.monthSpent - budget)} over budget this month.` : `${fmtMoney(budget - s.monthSpent)} left this month (${budgetPct}% used).`}
                {s.projected > budget && budgetPct <= 100 && " At this pace you will go over."}
              </p>
              <button onClick={clearBudget} className="btn btn-ghost btn-xs self-start text-error">Remove budget</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-base-content/60">Saved on this device only.</p>
              <div className="join w-full">
                <input type="number" min={1} inputMode="numeric" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveBudget()} placeholder={`Amount in ${CURRENCY}`} aria-label="Monthly budget" className="input input-bordered input-sm join-item w-full text-xs" />
                <button onClick={saveBudget} className="btn btn-primary btn-sm join-item text-xs font-bold">Save</button>
              </div>
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Ticket journey" subtitle="From booking to the gate" icon={<Filter size={16} />}>
          <div className="flex flex-col gap-3.5">
            {s.funnel.map((f, i) => (
              <BarRow key={f.label} bar={i === s.funnel.length - 1 ? "bg-success" : "bg-primary"} label={f.label} value={f.n} max={funnelMax} display={String(f.n)} sub={i === 0 ? undefined : `${pct(f.n, s.funnel[0].n)}% of booked${s.funnel[i - 1].n > f.n ? ` · ${s.funnel[i - 1].n - f.n} dropped off` : ""}`} />
            ))}
          </div>
        </Section>

        <Section title="Booking status" subtitle="Select a status to see those bookings" icon={<CheckCircle2 size={16} />}>
          <div className="flex h-3 rounded-full overflow-hidden bg-base-200">
            {statusSegments.map(({ k, n }) => n > 0 && <div key={k} className={bookingTone[k].bar} style={{ width: `${pct(n, total)}%` }} title={`${k}: ${n}`} />)}
          </div>
          <ul className="flex flex-col gap-1">
            {statusSegments.map(({ k, n }) => (
              <li key={k}>
                <Link to={`${BOOKINGS_PATH}?status=${k}`} className="flex items-center justify-between text-xs rounded-lg hover:bg-base-200/50 px-2 py-1.5 transition-colors">
                  <span className="flex items-center gap-2 font-semibold text-base-content"><span className={`w-2.5 h-2.5 rounded-full ${bookingTone[k].bar}`} /> {k}</span>
                  <span className="font-black text-base-content">{n} <span className="font-semibold text-base-content/50">({pct(n, total)}%)</span></span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2">
            {s.first && <Fact k="First booking" v={fmtDate(s.first.createdAt)} />}
            {s.biggest && <Fact k="Biggest booking" v={`${fmtMoney(num(s.biggest.totalAmount))} (#${s.biggest.bookingId})`} />}
          </ul>
        </Section>
      </div>
    </>
  );

  const spending = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Month forecast" subtitle="Where this month is heading" icon={<Coins size={16} />}>
          <div className="grid grid-cols-2 gap-2">
            <Tile k="Spent so far" v={fmtMoney(s.monthSpent)} />
            <Tile k="Projected" v={fmtMoney(s.projected)} sub={monthDiff === null ? undefined : `${monthDiff >= 0 ? "+" : ""}${monthDiff}% vs last month`} />
            <Tile k="Last month" v={fmtMoney(s.lastMonthSpent)} />
            <Tile k="Per day so far" v={fmtMoney(s.monthSpent / Math.max(1, new Date().getDate()))} />
          </div>
          {budget > 0 && <p className="text-[11px] text-base-content/60">{s.projected > budget ? `At this pace you will pass your ${fmtMoney(budget)} budget by ${fmtMoney(s.projected - budget)}.` : `You are on track to stay within your ${fmtMoney(budget)} budget.`}</p>}
        </Section>

        <Section title="Running total" subtitle="How your spending adds up" icon={<TrendingUp size={16} />} className="lg:col-span-2">
          {s.running.length > 1 ? (
            <>
              <LineChart values={s.running} />
              <div className="flex justify-between text-[10px] text-base-content/60"><span>First payment</span><span className="font-black text-base-content">{fmtMoney(s.running[s.running.length - 1])} in total</span></div>
            </>
          ) : <NoData text="Make a few payments to see your running total." />}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Spending by month" subtitle="Money you paid each month" icon={<BarChart3 size={16} />}>
          {s.months.length ? <Columns data={s.months.map((m) => ({ key: m.key, label: m.label, value: m.spent, title: `${m.label}: ${fmtMoney(m.spent)} across ${m.count} payments` }))} format={shortMoney} /> : <NoData text="No completed payments yet." />}
        </Section>

        <Section title="Average ticket price" subtitle="What you paid per ticket each month" icon={<Tag size={16} />}>
          {s.avgPriceMonths.some((m) => m.value) ? <Columns data={s.avgPriceMonths} format={shortMoney} /> : <NoData text="Confirmed bookings will show prices here." />}
        </Section>

        <Section title="Month by month" subtitle="Change from the month before" icon={<Activity size={16} />}>
          {s.momRows.length ? (
            <ul className="flex flex-col gap-2">
              {[...s.momRows].reverse().map((m) => (
                <li key={m.key} className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 px-3 py-2 text-xs">
                  <span className="text-base-content/60 font-semibold">{m.label}</span>
                  <span className="font-black text-base-content">{fmtMoney(m.spent)}</span>
                  <span className="w-20 text-right text-[11px] font-bold text-base-content/60">
                    {m.change === null ? "—" : <span className="inline-flex items-center gap-0.5">{m.change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(Math.round(m.change))}%</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <NoData text="No monthly data yet." />}
        </Section>

        <Section title="Where your money goes" subtitle="Events you spent the most on" icon={<Trophy size={16} />}>
          {s.topEvents.length ? (
            <div className="flex flex-col gap-3.5">
              {s.topEvents.map((e) => (
                <BarRow key={e.id} to={`${BOOKINGS_PATH}?q=${encodeURIComponent(eventName(e.id))}`} label={eventName(e.id)} value={e.spent} max={s.topEvents[0].spent} display={fmtMoney(e.spent)} sub={`${e.tickets} ${e.tickets === 1 ? "ticket" : "tickets"} in ${e.bookings} ${e.bookings === 1 ? "booking" : "bookings"}`} />
              ))}
            </div>
          ) : <NoData text="Confirmed bookings will show up here." />}
        </Section>

        {s.byCategory.length > 0 && (
          <Section title="Spending by category" subtitle="What kind of events you pay for" icon={<Layers size={16} />}>
            <div className="flex flex-col gap-3.5">
              {s.byCategory.map(([name, v]) => <BarRow key={name} label={String(name)} value={v.value} max={s.byCategory[0][1].value} display={fmtMoney(v.value)} sub={`${v.count} ${v.count === 1 ? "booking" : "bookings"} · ${pct(v.value, s.cur.spent)}% of spend`} />)}
            </div>
          </Section>
        )}

        {s.byPlace.length > 0 && (
          <Section title="Spending by location" subtitle="Where your events happen" icon={<MapPin size={16} />}>
            <div className="flex flex-col gap-3.5">
              {s.byPlace.map(([name, v]) => <BarRow key={name} bar="bg-success" label={String(name)} value={v.value} max={s.byPlace[0][1].value} display={fmtMoney(v.value)} sub={`${v.count} ${v.count === 1 ? "booking" : "bookings"}`} />)}
            </div>
          </Section>
        )}
      </div>
    </>
  );

  const events = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Events at a glance" subtitle="Upcoming and past" icon={<CalendarClock size={16} />}>
        <div className="grid grid-cols-3 gap-2">
          <Tile k="Upcoming" v={s.upcomingCount} />
          <Tile k="Past" v={s.pastCount} />
          <Tile k="Attended" v={s.attendedEvents.length} />
        </div>
        {s.next ? <p className="text-[11px] text-base-content/60">Next: <b className="text-base-content">{eventName(s.next.id)}</b> · {countdown(s.next.date)}</p> : <p className="text-[11px] text-base-content/60">No upcoming events yet.</p>}
      </Section>

      <Section title="Events you attended" subtitle="Events where a ticket was scanned" icon={<ScanLine size={16} />}>
        {s.attendedEvents.length ? (
          <ul className="flex flex-col gap-2">
            {s.attendedEvents.slice(0, 6).map(([id, v]) => (
              <li key={id} className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 px-3 py-2 text-xs">
                <span className="font-semibold text-base-content truncate">{eventName(Number(id))}</span>
                <span className="badge badge-success badge-sm font-bold text-success-content shrink-0">{v.count} {v.count === 1 ? "ticket" : "tickets"}</span>
              </li>
            ))}
          </ul>
        ) : <NoData text="Events you attend will be listed here." />}
      </Section>

      <Section title="Missed events" subtitle="Tickets for past events that were never scanned" icon={<XCircle size={16} />}>
        {s.missed.length ? (
          <>
            <p className="text-[11px] text-base-content/60">{s.missed.length} {s.missed.length === 1 ? "ticket was" : "tickets were"} not used across {s.missedEvents.length} {s.missedEvents.length === 1 ? "event" : "events"}.</p>
            <ul className="flex flex-col gap-2">
              {s.missedEvents.slice(0, 5).map(([id, v]) => (
                <li key={id} className="flex items-center justify-between gap-3 rounded-xl bg-base-200/50 px-3 py-2 text-xs">
                  <span className="font-semibold text-base-content truncate">{eventName(Number(id))}</span>
                  <span className="badge badge-warning badge-sm font-bold text-warning-content shrink-0">{v.count} unused</span>
                </li>
              ))}
            </ul>
          </>
        ) : <NoData text="No unused tickets for past events. Nice." />}
      </Section>

      <Section title="Events you keep coming back to" subtitle="Events you booked more than once" icon={<Repeat size={16} />}>
        {s.repeatEvents.length ? (
          <div className="flex flex-col gap-3.5">
            {s.repeatEvents.map(([id, v]) => <BarRow key={id} label={eventName(Number(id))} value={v.count} max={s.repeatEvents[0][1].count} display={`${v.count} bookings`} />)}
          </div>
        ) : <NoData text="You have not booked the same event twice yet." />}
      </Section>

      <Section title="Event days" subtitle={`Which days your events fall on · ${s.weekendShare}% on weekends`} icon={<CalendarDays size={16} />}>
        {s.eventWeekday.some((d) => d.value) ? <Columns data={s.eventWeekday} height="h-32" minW="min-w-[16rem]" highlightMax /> : <NoData text="Event dates are needed for this chart." />}
      </Section>

      {s.hasEventTimes && (
        <Section title="Event times" subtitle="When your events start" icon={<Sunrise size={16} />}>
          <Columns data={s.eventParts} height="h-32" minW="min-w-[16rem]" highlightMax />
        </Section>
      )}
    </div>
  );

  const ticketsTab = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Your ticket wallet" subtitle="Tickets you hold right now" icon={<Ticket size={16} />}>
        {s.tickets.length ? (
          <div className="flex flex-col gap-3.5">
            <BarRow bar="bg-success" label="Scanned at the gate" value={s.attended} max={s.tickets.length} display={`${s.attended} of ${s.tickets.length}`} sub={`${pct(s.attended, s.tickets.length)}% used`} />
            <BarRow label="Still to use" value={s.tickets.length - s.attended} max={s.tickets.length} display={String(s.tickets.length - s.attended)} />
            <BarRow bar="bg-warning" label="Waiting for an attendee" value={s.unassigned} max={s.tickets.length} display={String(s.unassigned)} sub={s.unassigned ? "Assign these so they can be scanned" : "Nothing to do here"} />
          </div>
        ) : <NoData text="Confirmed tickets will appear in your wallet." />}
      </Section>

      <Section title="Bought for others" subtitle="Tickets you purchased and group bundles" icon={<Users size={16} />}>
        {s.purchased.length ? (
          <>
            <div className="flex flex-col gap-3.5">
              <BarRow label="Kept for yourself" value={s.purchased.length - s.forOthers} max={s.purchased.length} display={String(s.purchased.length - s.forOthers)} />
              <BarRow bar="bg-success" label="Bought for others" value={s.forOthers} max={s.purchased.length} display={String(s.forOthers)} sub={`${pct(s.forOthers, s.purchased.length)}% of tickets you bought`} />
            </div>
            <ul className="flex flex-col gap-2.5">
              <Fact k="Group bundles" v={s.bundleCount} />
              <Fact k="Bundle tickets assigned" v={s.bundleTickets ? `${s.bundleAssigned} of ${s.bundleTickets}` : "—"} />
            </ul>
          </>
        ) : <NoData text="Tickets you purchase will be counted here." />}
      </Section>

      <Section title="Ticket types you buy" subtitle="Your most booked types and what they cost" icon={<Tag size={16} />}>
        {s.typeList.length ? (
          <div className="flex flex-col gap-3.5">
            {s.typeList.map((e) => (
              <BarRow key={e.id} bar="bg-success" label={<TypeName id={e.id} names={typeNames} />} value={e.tickets} max={s.typeList[0].tickets} display={`${e.tickets} ${e.tickets === 1 ? "ticket" : "tickets"}`}
                sub={e.min === e.max ? `${fmtMoney(e.avg)} each` : `${fmtMoney(e.avg)} each on average (${fmtMoney(e.min)} to ${fmtMoney(e.max)})`} />
            ))}
          </div>
        ) : <NoData text="Confirmed bookings will show up here." />}
      </Section>

      <Section title="Group size" subtitle={`You book ${s.avgGroup.toFixed(1)} tickets at a time on average`} icon={<Users size={16} />}>
        <div className="flex flex-col gap-3.5">
          {s.sizeBuckets.map((b) => <BarRow key={b.label} label={b.label} value={b.n} max={maxOf(s.sizeBuckets.map((x) => x.n))} display={`${b.n} ${b.n === 1 ? "booking" : "bookings"}`} />)}
        </div>
      </Section>
    </div>
  );

  const paymentsTab = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="How you pay" subtitle="Completed payments and how often each method works" icon={<CreditCard size={16} />}>
          {s.methods.length ? (
            <div className="flex flex-col gap-3.5">
              {s.methods.map(([name, v]) => <BarRow key={name} label={name} value={v.amount} max={maxOf(s.methods.map(([, x]) => x.amount))} display={fmtMoney(v.amount)} sub={`${v.ok} of ${v.total} succeeded (${pct(v.ok, v.total)}%)`} />)}
            </div>
          ) : <NoData text="No payments yet." />}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(["Completed", "Pending", "Failed"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-base-200/50 p-2.5 flex flex-col">
                <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${payTone[k].bar}`} /> {k}</span>
                <span className="text-sm font-black text-base-content">{s.payCounts[k]}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Money insights" subtitle="Payment speed and lost bookings" icon={<Timer size={16} />}>
          <ul className="flex flex-col gap-2.5">
            <Fact k="Payment success rate" v={s.payments.length ? `${overallSuccess}%` : "—"} />
            <Fact k="Average time to pay" v={s.avgPayMinutes === null ? "—" : fmtDuration(s.avgPayMinutes)} />
            <Fact k="Cancelled bookings" v={`${s.cancelled.length} (${fmtMoney(s.cancelledSum)})`} />
            <Fact k="Pending over 24 hours" v={s.stalePending} />
            <Fact k="Awaiting payment" v={fmtMoney(s.pendingSum)} />
          </ul>
          {s.cancelledSum > 0 && <p className="text-[11px] text-base-content/60 flex items-start gap-1.5"><Ban size={12} className="shrink-0 mt-0.5" /> Cancelled bookings add up to {fmtMoney(s.cancelledSum)} that you did not spend.</p>}
        </Section>
      </div>

      <Section title="Recent payments" subtitle="Your latest payment records" icon={<Wallet size={16} />}>
        {s.recentPayments.length ? (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs">
              <thead><tr className="text-base-content/60"><th>Booking</th><th>Method</th><th className="text-right">Amount</th><th>Status</th><th>Reference</th><th>Date</th></tr></thead>
              <tbody>
                {s.recentPayments.slice(0, 10).map((p: any) => (
                  <tr key={p.paymentId ?? p.id} className="hover">
                    <td>#{p.bookingId}</td>
                    <td>{p.paymentMethod || "—"}</td>
                    <td className="text-right font-bold whitespace-nowrap">{fmtMoney(num(p.amount))}</td>
                    <td><span className={`badge badge-sm font-bold ${payTone[p.paymentStatus as keyof typeof payTone]?.badge ?? ""}`}>{p.paymentStatus}</span></td>
                    <td className="max-w-[10rem] truncate text-base-content/60" title={p.transactionId}>{p.transactionId || "—"}</td>
                    <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <NoData text="No payments in this period." />}
      </Section>
    </>
  );

  const habits = (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi i={0} label="Booking style" value={s.persona || "—"} hint="Time of day you book" icon={<Sunrise size={18} />} tone="bg-primary/10 text-primary" />
        <Kpi i={1} label="Planning style" value={s.leadPersona || "—"} hint={s.avgLead === null ? "Needs event dates" : `${Math.round(s.avgLead)} days ahead on average`} icon={<Hourglass size={18} />} tone="bg-success/10 text-success" />
        <Kpi i={2} label="Current streak" value={`${s.streak.current} ${s.streak.current === 1 ? "month" : "months"}`} hint="Months in a row with a booking" icon={<Flame size={18} />} tone="bg-warning/10 text-warning" />
        <Kpi i={3} label="Longest streak" value={`${s.streak.longest} ${s.streak.longest === 1 ? "month" : "months"}`} hint={s.daysSinceLast === null ? "" : `Last booked ${s.daysSinceLast} days ago`} icon={<Trophy size={18} />} tone="bg-primary/10 text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Time of day" subtitle="The hour you usually book" icon={<Sunrise size={16} />}>
          <Columns data={s.hours} height="h-32" minW="min-w-[22rem]" highlightMax />
          <div className="grid grid-cols-4 gap-2">{s.parts.map((p) => <Tile key={p.label} k={p.label} v={p.n} />)}</div>
        </Section>

        <Section title="Day of the week" subtitle="Bookings by day" icon={<CalendarDays size={16} />}>
          <Columns data={s.weekday} height="h-32" minW="min-w-[16rem]" highlightMax />
        </Section>

        <Section title="How early you book" subtitle="Time between booking and the event" icon={<Hourglass size={16} />}>
          {s.avgLead !== null ? (
            <div className="flex flex-col gap-3.5">
              {s.leadBuckets.map((b) => <BarRow key={b.label} bar="bg-success" label={b.label} value={b.n} max={maxOf(s.leadBuckets.map((x) => x.n))} display={`${b.n} ${b.n === 1 ? "booking" : "bookings"}`} />)}
            </div>
          ) : <NoData text="Event dates are needed for this chart." />}
        </Section>

        <Section title="Booking activity" subtitle={`Your bookings over the last ${HEATMAP_WEEKS} weeks`} icon={<Grid3X3 size={16} />}>
          <div className="overflow-x-auto">
            <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
              {s.cells.map((c) => <div key={c.key} title={c.future ? "" : `${fmtDate(c.key)}: ${c.count} ${c.count === 1 ? "booking" : "bookings"}`} className={`w-3.5 h-3.5 rounded-sm ${heat(c.count, c.future)}`} />)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-base-content/60">
            Less {["bg-base-200", "bg-primary/30", "bg-primary/60", "bg-primary"].map((c) => <span key={c} className={`w-3 h-3 rounded-sm ${c}`} />)} More
          </div>
        </Section>
      </div>
    </>
  );

  const achievements = (
    <Section title="Badges" subtitle={`${unlocked} of ${s.badges.length} unlocked`} icon={<Award size={16} />}>
      <div className="h-2 rounded-full bg-base-200 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${pct(unlocked, s.badges.length)}%` }} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {s.badges.map((b) => (
          <div key={b.name} className={`flex items-start gap-3 rounded-2xl border p-3.5 ${b.have ? "bg-primary/5 border-primary/30" : "bg-base-200/30 border-base-200 opacity-60"}`}>
            <div className={`p-2.5 rounded-xl shrink-0 ${b.have ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/50"}`}>{b.icon}</div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-base-content">{b.name}</span>
              <span className="text-[11px] text-base-content/60">{b.desc}</span>
              <span className={`text-[10px] font-bold mt-1 ${b.have ? "text-success" : "text-base-content/50"}`}>{b.have ? "Unlocked" : b.progress}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );

  const tabContent: Record<TabKey, ReactNode> = { overview, spending, events, tickets: ticketsTab, payments: paymentsTab, habits, achievements };

  return (
    <>
      <Shell header={header} className="print:hidden">
        {/* ATTENTION */}
        {(s.pending.length > 0 || s.unassigned > 0 || s.payCounts.Failed > 0 || (s.daysSinceLast ?? 0) > 60) && (
          <div className="flex flex-col gap-2">
            {s.pending.length > 0 && (
              <div className="alert alert-warning text-xs font-semibold py-2 rounded-xl">
                <Clock size={16} className="shrink-0" />
                <span className="flex-1">
                  {s.pending.length} {s.pending.length === 1 ? "booking is" : "bookings are"} waiting for payment ({fmtMoney(s.pendingSum)})
                  {s.stalePending > 0 && `, ${s.stalePending} for more than a day`}. Pay soon so your tickets are not released.
                </span>
                <Link to={`${BOOKINGS_PATH}?status=Pending`} className="btn btn-ghost btn-xs">Pay now</Link>
              </div>
            )}
            {s.unassigned > 0 && (
              <div className="alert text-xs font-semibold py-2 rounded-xl bg-primary/5 border border-primary/20">
                <UserX size={16} className="shrink-0 text-primary" />
                <span>{s.unassigned} {s.unassigned === 1 ? "ticket has" : "tickets have"} no attendee yet. Assign names so everyone can get in.</span>
              </div>
            )}
            {s.payCounts.Failed > 0 && (
              <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                <XCircle size={16} className="shrink-0" />
                <span>{s.payCounts.Failed} {s.payCounts.Failed === 1 ? "payment" : "payments"} did not go through. No money was taken for failed payments.</span>
              </div>
            )}
            {(s.daysSinceLast ?? 0) > 60 && (
              <div className="alert text-xs font-semibold py-2 rounded-xl bg-base-200/60 border border-base-300">
                <Compass size={16} className="shrink-0 text-primary" />
                <span className="flex-1">You have not booked in {s.daysSinceLast} days. See what is happening near you.</span>
                <Link to={EXPLORE_PATH} className="btn btn-ghost btn-xs">Explore events</Link>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Spent", value: fmtMoney(s.cur.spent), hint: s.prev ? <Delta cur={s.cur.spent} prev={s.prev.spent} /> : "Completed payments", icon: <Wallet size={18} />, tone: "bg-primary/10 text-primary" },
            { label: "Bookings", value: total, hint: s.prev ? <Delta cur={s.cur.total} prev={s.prev.total} /> : `${s.confirmed.length} confirmed`, icon: <ShoppingBag size={18} />, tone: "bg-primary/10 text-primary" },
            { label: "Tickets Booked", value: s.cur.tickets, hint: s.prev ? <Delta cur={s.cur.tickets} prev={s.prev.tickets} /> : "Excludes cancelled", icon: <Ticket size={18} />, tone: "bg-success/10 text-success" },
            { label: "Avg per Booking", value: fmtMoney(s.cur.avg), hint: s.prev ? <Delta cur={s.cur.avg} prev={s.prev.avg} /> : "Confirmed bookings", icon: <TrendingUp size={18} />, tone: "bg-success/10 text-success" },
            { label: "Confirmation Rate", value: `${pct(s.confirmed.length, total)}%`, hint: `${pct(s.cancelled.length, total)}% cancelled`, icon: <Percent size={18} />, tone: "bg-success/10 text-success" },
            { label: "Awaiting Payment", value: fmtMoney(s.pendingSum), hint: `${s.pending.length} pending`, icon: <Clock size={18} />, tone: "bg-warning/10 text-warning" },
            { label: "Events Attended", value: s.attendedEvents.length, hint: `${s.attended} tickets scanned`, icon: <ScanLine size={18} />, tone: "bg-primary/10 text-primary" },
            { label: "Unassigned Tickets", value: s.unassigned, hint: s.unassigned ? "Need an attendee" : "All assigned", icon: <UserX size={18} />, tone: s.unassigned ? "bg-warning/10 text-warning" : "bg-success/10 text-success" },
          ].map((c, i) => <Kpi key={c.label} {...c} i={i} />)}
        </div>

        {/* GROUPS */}
        <div role="tablist" aria-label="Analytics groups" className="flex gap-1 overflow-x-auto rounded-2xl bg-base-200/60 p-1">
          {TABS.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={tab === x.key}
              onClick={() => setTab(x.key)}
              className={`btn btn-sm rounded-xl gap-1.5 text-xs font-bold shrink-0 border-0 ${tab === x.key ? "btn-primary shadow-sm" : "btn-ghost"}`}
            >
              {x.icon} {x.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="flex flex-col gap-4">{tabContent[tab]}</div>
      </Shell>

      {/* PRINTABLE STATEMENT: only visible when saving as PDF or printing */}
      <div className="hidden print:block bg-white text-black p-6 text-[11px] leading-relaxed">
        <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <h1 className="text-xl font-black">TicketStream activity statement</h1>
            <p>{String(accountName ?? "").trim() ? `${String(accountName).trim()} · ` : ""}Account #{String(digitalId)}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{rangeLabel}</p>
            <p>Created {fmtDate(new Date())}</p>
          </div>
        </div>

        <h2 className="font-black text-sm mb-1">Summary</h2>
        <table className="w-full mb-4 border-collapse">
          <tbody>
            {([
              ["Total spent", fmtMoney(s.cur.spent)],
              ["Bookings (confirmed / pending / cancelled)", `${total} (${s.confirmed.length} / ${s.pending.length} / ${s.cancelled.length})`],
              ["Tickets booked", s.cur.tickets],
              ["Average per confirmed booking", fmtMoney(s.cur.avg)],
              ["Awaiting payment", fmtMoney(s.pendingSum)],
              ["Cancelled amount", fmtMoney(s.cancelledSum)],
              ["Events attended", s.attendedEvents.length],
              ["Payment success rate", s.payments.length ? `${overallSuccess}%` : "—"],
              ["Reliability score", s.score === null ? "—" : `${s.score} / 100`],
              ["This month so far / projected", `${fmtMoney(s.monthSpent)} / ${fmtMoney(s.projected)}`],
            ] as [string, string | number][]).map(([k, v]) => (
              <tr key={k} className="border-b border-gray-300"><td className="py-1">{k}</td><td className="py-1 text-right font-bold">{v}</td></tr>
            ))}
          </tbody>
        </table>

        {s.topEvents.length > 0 && (
          <>
            <h2 className="font-black text-sm mb-1">Top events by spend</h2>
            <table className="w-full mb-4 border-collapse">
              <tbody>
                {s.topEvents.map((e) => (
                  <tr key={e.id} className="border-b border-gray-300"><td className="py-1">{eventName(e.id)}</td><td className="py-1 text-right">{e.tickets} tickets</td><td className="py-1 text-right font-bold">{fmtMoney(e.spent)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 className="font-black text-sm mb-1">Bookings</h2>
        <table className="w-full mb-4 border-collapse">
          <thead><tr className="border-b-2 border-black text-left"><th className="py-1">No.</th><th>Event</th><th>Ticket type</th><th className="text-right">Tickets</th><th className="text-right">Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {s.bookings.slice(0, 40).map((b) => (
              <tr key={b.bookingId} className="border-b border-gray-300" style={{ breakInside: "avoid" }}>
                <td className="py-1">#{b.bookingId}</td><td>{eventName(num(b.eventId))}</td><td>{typeLabel(num(b.ticketTypeId))}</td>
                <td className="text-right">{b.quantity}</td><td className="text-right">{fmtMoney(num(b.totalAmount))}</td><td>{b.bookingStatus}</td><td>{fmtDate(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.bookings.length > 40 && <p className="mb-4">Showing 40 of {s.bookings.length} bookings. Use Export for the full list.</p>}

        <h2 className="font-black text-sm mb-1">Payments</h2>
        <table className="w-full border-collapse">
          <thead><tr className="border-b-2 border-black text-left"><th className="py-1">Booking</th><th>Method</th><th className="text-right">Amount</th><th>Status</th><th>Reference</th><th>Date</th></tr></thead>
          <tbody>
            {s.recentPayments.slice(0, 40).map((p: any) => (
              <tr key={p.paymentId ?? p.id} className="border-b border-gray-300" style={{ breakInside: "avoid" }}>
                <td className="py-1">#{p.bookingId}</td><td>{p.paymentMethod || "—"}</td><td className="text-right">{fmtMoney(num(p.amount))}</td><td>{p.paymentStatus}</td><td>{p.transactionId || "—"}</td><td>{fmtDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.recentPayments.length > 40 && <p className="mt-2">Showing 40 of {s.recentPayments.length} payments.</p>}
      </div>
    </>
  );
};

export default UserAnalytics;