/**
 * ======================================================================
 * ADMIN ANALYTICS
 * ======================================================================
 *
 * WHERE THE NUMBERS COME FROM
 * ---------------------------
 *  paymentApi        getAllPayments, getPlatformEarnings,
 *                    getSuccessfulPaymentsCount, getPaymentsHealth,
 *                    getEventRevenue (event drill-down)
 *  WalletApi         getPlatformPendingLiability, getPendingPayouts
 *  EventsApi         getAllEvents
 *  organizationApi   getAllOrganizationsAdmin
 *  VerificationsApi  getAllVerifications, getPendingVerificationsCount,
 *                    getVerificationsNeedingResubmission
 *  ticketsApi        countEventTickets, countScannedAttendees (event drill-down)
 *  VenueApi          getAllVenues
 *
 * HOW IT WORKS
 * ------------
 *  1. Every list is fetched once. All charts, KPIs and tables are computed
 *     in the browser from those lists, so changing the date range or a
 *     filter is instant and costs no extra requests.
 *  2. The DATE RANGE (top right) decides which payments, events,
 *     organizations and verifications are counted. KPIs also compare with the
 *     previous period of the same length (the green/red arrows).
 *  3. "Revenue" always means COMPLETED payments only.
 *  4. Tickets have no platform-wide endpoint, so ticket numbers are shown per
 *     event: pick an event in the Events tab.
 *  5. If one source fails, the rest of the page still works and a banner
 *     lists what could not be loaded, with a Retry button.
 *  6. Charts are plain SVG/CSS, so no chart library is needed.
 *
 * NOTE: protect this route with your admin guard; the backend must still
 * enforce the admin role on every endpoint.
 * ======================================================================
 */

import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Banknote,
  Wallet as WalletIcon,
  Building2,
  CalendarDays,
  ShieldCheck,
  Ticket,
  RefreshCw,
  Download,
  Info,
  X,
  AlertCircle,
  Clock,
  Receipt,
  Activity,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  ScanLine,
  Inbox,
  CheckCircle2,
} from "lucide-react";

// 👇 adjust these paths/casing to match your project
import {
  useGetAllPaymentsQuery,
  useGetPlatformEarningsQuery,
  useGetSuccessfulPaymentsCountQuery,
  useGetPaymentsHealthQuery,
  useGetEventRevenueQuery,
  type Payment,
} from "../../features/APIS/PaymentApi";
import { useGetPlatformPendingLiabilityQuery, useGetPendingPayoutsQuery } from "../../features/APIS/WalletApi";
import { useGetAllEventsQuery } from "../../features/APIS/EventsApi";
import { useGetAllOrganizationsAdminQuery } from "../../features/APIS/organizationApi";
import {
  useGetAllVerificationsQuery,
  useGetPendingVerificationsCountQuery,
  useGetVerificationsNeedingResubmissionQuery,
} from "../../features/APIS/VerificationsApi";
import { useCountEventTicketsQuery, useCountScannedAttendeesQuery } from "../../features/APIS/ticketsApi";
import { useGetAllVenuesQuery } from "../../features/APIS/VenueApi";
import { usePageTitle } from "../../hooks/usePageTitle";

// ======================================================
// TYPES & CONSTANTS
// ======================================================

type Loose = Record<string, any>;
type RangeKey = "7d" | "30d" | "90d" | "12m" | "all";
type Tab = "overview" | "revenue" | "events" | "organizations" | "verifications";
type Tone = "primary" | "success" | "warning" | "error" | "info" | "secondary" | "accent";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "12m", label: "12 months", days: 365 },
  { key: "all", label: "All time", days: null },
];

/** Static class names so Tailwind can see them */
const TONE: Record<Tone, { text: string; bg: string }> = {
  primary: { text: "text-primary", bg: "bg-primary" },
  success: { text: "text-success", bg: "bg-success" },
  warning: { text: "text-warning", bg: "bg-warning" },
  error: { text: "text-error", bg: "bg-error" },
  info: { text: "text-info", bg: "bg-info" },
  secondary: { text: "text-secondary", bg: "bg-secondary" },
  accent: { text: "text-accent", bg: "bg-accent" },
};

const CYCLE: Tone[] = ["primary", "info", "secondary", "accent", "success", "warning", "error"];

const PAGE_SIZE = 10;
const DAY = 86_400_000;

const PAYMENT_BADGE: Record<string, string> = {
  Completed: "badge-success text-success-content",
  Pending: "badge-warning text-warning-content",
  Failed: "badge-error text-error-content",
};

const VERIFICATION_LABEL: Record<string, string> = {
  pending: "Pending review",
  in_progress: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_required: "Action needed",
};

const VERIFICATION_TONE: Record<string, Tone> = {
  pending: "warning",
  in_progress: "info",
  approved: "success",
  rejected: "error",
  resubmission_required: "secondary",
};

// ======================================================
// HELPERS
// ======================================================

const toArray = <T,>(payload: unknown, key?: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (key && Array.isArray(p[key])) return p[key] as T[];
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
};

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** Reads a number from 1500, "1500", { total }, { data: { total } } or the first numeric field */
const pickNumber = (payload: unknown, keys: string[]): number | null => {
  const direct = toNum(payload);
  if (direct !== null) return direct;
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  for (const k of keys) {
    const n = toNum(obj[k]);
    if (n !== null) return n;
  }
  if (obj.data !== undefined) return pickNumber(obj.data, keys);
  for (const v of Object.values(obj)) {
    const n = toNum(v);
    if (n !== null) return n;
  }
  return null;
};

const money = (v: number | null | undefined, currency = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v ?? 0));

const compact = (v: number) => new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(v);

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const pretty = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const asDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(+d) ? null : d;
};

const firstDate = (o: Loose, keys: string[]): Date | null => {
  for (const k of keys) {
    const d = asDate(o[k]);
    if (d) return d;
  }
  return null;
};

const within = (d: Date | null, from: Date | null, to: Date) => !!d && (!from || d >= from) && d <= to;

const payId = (p: Payment) => Number(p.paymentId ?? p.id ?? 0);
const payAmount = (p: Payment) => Number(p.amount ?? 0);
const payDate = (p: Payment) => asDate(p.createdAt);

const eventId = (e: Loose) => Number(e.eventId ?? e.id ?? 0);
const eventTitle = (e: Loose) => String(e.title ?? e.name ?? `Event ${eventId(e)}`);
const eventDate = (e: Loose) => firstDate(e, ["startDate", "startTime", "eventDate", "date", "startsAt", "start_date"]);
const orgIdOf = (o: Loose) => Number(o.orgId ?? o.id ?? 0);

/** Sum + count per key, biggest first */
const groupBy = <T,>(rows: T[], key: (r: T) => string | number | undefined | null, val: (r: T) => number) => {
  const m = new Map<string | number, { value: number; count: number }>();
  rows.forEach((r) => {
    const k = key(r);
    if (k === undefined || k === null || k === "") return;
    const cur = m.get(k) ?? { value: 0, count: 0 };
    cur.value += val(r);
    cur.count += 1;
    m.set(k, cur);
  });
  return Array.from(m.entries())
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.value - a.value);
};

/** Time buckets (daily or monthly) between `from` and `to`, filled with zeros */
const buildSeries = (rows: { date: Date; value: number }[], from: Date | null, to: Date) => {
  const earliest = rows.reduce<Date | null>((min, r) => (!min || r.date < min ? r.date : min), null);
  const start = new Date(from ?? earliest ?? new Date(+to - 29 * DAY));
  const monthly = +to - +start > 120 * DAY;

  start.setHours(0, 0, 0, 0);
  if (monthly) start.setDate(1);

  const keyOf = (d: Date) => (monthly ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  const buckets = new Map<string, { label: string; value: number; count: number }>();

  const cursor = new Date(start);
  while (cursor <= to) {
    buckets.set(keyOf(cursor), {
      label: cursor.toLocaleDateString(undefined, monthly ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }),
      value: 0,
      count: 0,
    });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  rows.forEach((r) => {
    const b = buckets.get(keyOf(r.date));
    if (b) {
      b.value += r.value;
      b.count += 1;
    }
  });

  return Array.from(buckets.values());
};

// ======================================================
// SMALL UI PIECES
// ======================================================

const Skeleton = ({ className = "h-40" }: { className?: string }) => <div className={`skeleton w-full rounded-xl ${className}`} />;

const Empty = ({ text, icon }: { text: string; icon?: ReactNode }) => (
  <div className="text-center py-8 text-base-content/50 flex flex-col items-center gap-1.5">
    <span className="opacity-40">{icon ?? <Inbox size={28} />}</span>
    <p className="text-[11px] font-semibold">{text}</p>
  </div>
);

const Panel = ({
  title,
  icon,
  right,
  className = "",
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <div className={`bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3 min-w-0 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
      {right ?? (icon && <span className="text-primary shrink-0">{icon}</span>)}
    </div>
    {children}
  </div>
);

const Delta = ({ current, previous }: { current: number; previous: number }) => {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-success" : "text-error"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}
      {change}%
    </span>
  );
};

const Kpi = ({
  icon,
  label,
  value,
  hint,
  delta,
  loading,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: ReactNode;
  delta?: ReactNode;
  loading?: boolean;
  tone?: Tone;
}) => (
  <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-start justify-between gap-2 min-w-0">
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] text-base-content/60 font-semibold">{label}</span>
      {loading ? (
        <span className="skeleton h-6 w-24 rounded mt-1" />
      ) : (
        <span className="text-base sm:text-lg font-black text-base-content break-words tabular-nums">{value}</span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {delta}
        {hint && <span className="text-[10px] text-base-content/50">{hint}</span>}
      </div>
    </div>
    <div className={`p-2.5 rounded-xl shrink-0 bg-base-200/60 ${TONE[tone].text}`}>{icon}</div>
  </div>
);

/** Horizontal bars: label, value, optional sub text */
const BarList = ({
  items,
  format,
  tone = "primary",
  empty = "Nothing to show yet",
}: {
  items: { label: string; value: number; sub?: string }[];
  format: (n: number) => string;
  tone?: Tone;
  empty?: string;
}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <Empty text={empty} />;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-base-content truncate">{i.label}</span>
            <span className="font-black tabular-nums shrink-0">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-base-200 overflow-hidden">
            <div className={`h-full rounded-full ${TONE[tone].bg}`} style={{ width: `${Math.max(3, (i.value / max) * 100)}%` }} />
          </div>
          {i.sub && <span className="text-[10px] text-base-content/50">{i.sub}</span>}
        </li>
      ))}
    </ul>
  );
};

/** Donut with a legend */
const Donut = ({
  segments,
  centerLabel,
  format = (n) => String(n),
}: {
  segments: { label: string; value: number; tone: Tone }[];
  centerLabel: string;
  format?: (n: number) => string;
}) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return <Empty text="No data yet" />;

  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-base-200" />
          {segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  strokeWidth="12"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  className={`${TONE[s.tone].text} stroke-current`}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-base-content tabular-nums">{format(total)}</span>
          <span className="text-[10px] text-base-content/50 font-semibold">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 w-full min-w-0">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONE[s.tone].bg}`} />
              <span className="truncate text-base-content/80 font-semibold">{s.label}</span>
            </span>
            <span className="tabular-nums shrink-0 text-base-content">
              <b>{format(s.value)}</b> <span className="text-base-content/50">({pct(s.value, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Area/line chart with hover read-out */
const AreaChart = ({
  data,
  format,
  tone = "primary",
}: {
  data: { label: string; value: number; count?: number }[];
  format: (n: number) => string;
  tone?: Tone;
}) => {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0 || data.every((d) => d.value === 0)) return <Empty text="No activity in this period" icon={<Activity size={28} />} />;

  const W = 600;
  const H = 180;
  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((d, i) => ({ x: data.length > 1 ? i * step : W / 2, y: H - (d.value / max) * H }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  const active = hover !== null ? data[hover] : data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
  const peak = hover === null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-base-content/60 font-semibold">
          {peak ? "Best period" : "Selected"}: <b className="text-base-content">{active.label}</b>
        </span>
        <span className="font-black tabular-nums">
          {format(active.value)}
          {active.count !== undefined && <span className="text-base-content/50 font-semibold"> · {active.count} payments</span>}
        </span>
      </div>

      <div className={`w-full ${TONE[tone].text}`}>
        <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full h-44 overflow-visible" preserveAspectRatio="none" role="img" aria-label="Trend chart">
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="stroke-base-200" strokeWidth="1" />
          ))}
          <path d={area} fill="currentColor" opacity="0.12" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <circle cx={pts[hover].x} cy={pts[hover].y} r="5" fill="currentColor" />}
          {pts.map((p, i) => (
            <rect
              key={i}
              x={p.x - step / 2}
              y="0"
              width={Math.max(step, 6)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-base-content/50 font-semibold">
        <span>{data[0].label}</span>
        <span>{data[Math.floor(data.length / 2)].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
};

const ModalShell = ({ title, icon, onClose, maxWidth = "max-w-lg", children }: { title: string; icon?: ReactNode; onClose: () => void; maxWidth?: string; children: ReactNode }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`bg-base-100 border border-base-200 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon ?? <BarChart3 size={16} />}</span>
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

const Pager = ({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) =>
  pages > 1 ? (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-base-200">
      <span className="text-[11px] text-base-content/60">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[11px] font-semibold text-base-content/70">
          Page {page} of {pages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page === pages} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  ) : null;

// ======================================================
// EVENT DRILL-DOWN (tickets, scans and revenue for one event)
// ======================================================

const EventInsight = ({ id, title, paymentsRevenue, paymentsCount }: { id: number; title: string; paymentsRevenue: number; paymentsCount: number }) => {
  const ticketsQ = useCountEventTicketsQuery(id, { skip: !id });
  const scannedQ = useCountScannedAttendeesQuery(id, { skip: !id });
  const revenueQ = useGetEventRevenueQuery(id, { skip: !id });

  const tickets = pickNumber(ticketsQ.data, ["count", "total", "totalTickets", "ticketCount"]);
  const scanned = pickNumber(scannedQ.data, ["count", "scanned", "scannedCount", "total"]);
  const revenue = pickNumber(revenueQ.data, ["totalRevenue", "revenue", "total", "amount"]);

  const val = (loading: boolean, v: number | null, fmt: (n: number) => string) => (loading ? "…" : v === null ? "—" : fmt(v));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-base-content/60">
        Live numbers for <b className="text-base-content">{title}</b>.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Ticket size={18} />} label="Tickets sold" value={val(ticketsQ.isLoading, tickets, (n) => n.toLocaleString())} loading={false} />
        <Kpi icon={<ScanLine size={18} />} label="Scanned at the gate" value={val(scannedQ.isLoading, scanned, (n) => n.toLocaleString())} tone="success" />
        <Kpi
          icon={<Activity size={18} />}
          label="Attendance rate"
          value={tickets && scanned !== null ? `${pct(scanned, tickets)}%` : "—"}
          hint={tickets && scanned !== null ? `${(tickets - scanned).toLocaleString()} not scanned` : undefined}
          tone="info"
        />
        <Kpi
          icon={<Banknote size={18} />}
          label="Event revenue"
          value={val(revenueQ.isLoading, revenue, money)}
          hint={`${paymentsCount} completed payment${paymentsCount === 1 ? "" : "s"}, ${money(paymentsRevenue)} in range`}
          tone="warning"
        />
      </div>

      {tickets !== null && scanned !== null && tickets > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-2.5 rounded-full bg-base-200 overflow-hidden">
            <div className="h-full rounded-full bg-success" style={{ width: `${pct(scanned, tickets)}%` }} />
          </div>
          <span className="text-[10px] text-base-content/50">
            {scanned.toLocaleString()} of {tickets.toLocaleString()} tickets scanned
          </span>
        </div>
      )}
    </div>
  );
};

// ======================================================
// PAGE
// ======================================================

export const AdminAnalytics = () => {
  usePageTitle("Analytics · Admin");

  const [range, setRange] = useState<RangeKey>("30d");
  const [tab, setTab] = useState<Tab>("overview");
  const [showAbout, setShowAbout] = useState(false);
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null);

  // payments table filters
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Pending" | "Failed">("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [paySearch, setPaySearch] = useState("");
  const [payPage, setPayPage] = useState(1);

  // organizations table
  const [orgSearch, setOrgSearch] = useState("");
  const [orgLimit, setOrgLimit] = useState(10);

  // event drill-down
  const [pickedEvent, setPickedEvent] = useState<number | null>(null);

  // ------------------------------------------------------
  // DATA
  // ------------------------------------------------------
  const paymentsQ = useGetAllPaymentsQuery();
  const earningsQ = useGetPlatformEarningsQuery();
  const successQ = useGetSuccessfulPaymentsCountQuery();
  const healthQ = useGetPaymentsHealthQuery();
  const liabilityQ = useGetPlatformPendingLiabilityQuery();
  const payoutsQ = useGetPendingPayoutsQuery();
  const eventsQ = useGetAllEventsQuery(undefined);
  const orgsQ = useGetAllOrganizationsAdminQuery(undefined);
  const verifQ = useGetAllVerificationsQuery({ limit: 1000, offset: 0 });
  const pendingVerifQ = useGetPendingVerificationsCountQuery();
  const resubQ = useGetVerificationsNeedingResubmissionQuery();
  const venuesQ = useGetAllVenuesQuery();

  const sources: { name: string; q: { isError: boolean; refetch: () => unknown; isFetching: boolean } }[] = [
    { name: "Payments", q: paymentsQ },
    { name: "Platform earnings", q: earningsQ },
    { name: "Wallet liability", q: liabilityQ },
    { name: "Pending payouts", q: payoutsQ },
    { name: "Events", q: eventsQ },
    { name: "Organizations", q: orgsQ },
    { name: "Verifications", q: verifQ },
  ];
  const failed = sources.filter((s) => s.q.isError).map((s) => s.name);
  const refreshing = sources.some((s) => s.q.isFetching);

  const refreshAll = () => {
    [paymentsQ, earningsQ, successQ, healthQ, liabilityQ, payoutsQ, eventsQ, orgsQ, verifQ, pendingVerifQ, resubQ, venuesQ].forEach((q) => q.refetch());
  };

  const payments = useMemo(() => toArray<Payment>(paymentsQ.data), [paymentsQ.data]);
  const events = useMemo(() => toArray<Loose>(eventsQ.data, "events"), [eventsQ.data]);
  const orgs = useMemo(() => toArray<Loose>(orgsQ.data, "organizations"), [orgsQ.data]);
  const verifications = useMemo(() => toArray<Loose>(verifQ.data), [verifQ.data]);
  const pendingPayouts = useMemo(() => toArray<Loose>(payoutsQ.data), [payoutsQ.data]);
  const venues = useMemo(() => toArray<Loose>(venuesQ.data, "venues"), [venuesQ.data]);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [orgIdOf(o), o])), [orgs]);
  const eventMap = useMemo(() => new Map(events.map((e) => [eventId(e), e])), [events]);
  const orgName = (id?: number) => (id && orgMap.get(id)?.name) || (id ? `Organization ${id}` : "Unknown");
  const evName = (id?: number) => (id && eventMap.get(id) ? eventTitle(eventMap.get(id)!) : id ? `Event ${id}` : "Unknown");

  // ------------------------------------------------------
  // RANGE
  // ------------------------------------------------------
  const now = useMemo(() => new Date(), [range, paymentsQ.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = RANGES.find((r) => r.key === range)!.days;
  const from = days ? new Date(+now - days * DAY) : null;
  const prevFrom = days ? new Date(+now - 2 * days * DAY) : null;
  const rangeLabel = RANGES.find((r) => r.key === range)!.label.toLowerCase();

  // ------------------------------------------------------
  // PAYMENT ANALYTICS
  // ------------------------------------------------------
  const pay = useMemo(() => {
    const inRange = payments.filter((p) => within(payDate(p), from, now));
    const prev = days ? payments.filter((p) => within(payDate(p), prevFrom, from!)) : [];

    const completed = inRange.filter((p) => p.paymentStatus === "Completed");
    const failed = inRange.filter((p) => p.paymentStatus === "Failed");
    const pending = inRange.filter((p) => p.paymentStatus === "Pending");
    const prevCompleted = prev.filter((p) => p.paymentStatus === "Completed");

    const sum = (rows: Payment[]) => rows.reduce((s, p) => s + payAmount(p), 0);
    const revenue = sum(completed);

    return {
      inRange,
      completed,
      revenue,
      prevRevenue: sum(prevCompleted),
      prevCount: prevCompleted.length,
      failedCount: failed.length,
      failedValue: sum(failed),
      pendingCount: pending.length,
      pendingValue: sum(pending),
      avg: completed.length ? revenue / completed.length : 0,
      successRate: pct(completed.length, inRange.length),
      series: buildSeries(
        completed.flatMap((p) => {
          const d = payDate(p);
          return d ? [{ date: d, value: payAmount(p) }] : [];
        }),
        from,
        now
      ),
      byMethod: groupBy(completed, (p) => p.paymentMethod || "Other", payAmount),
      byOrg: groupBy(completed, (p) => p.orgId, payAmount),
      byEvent: groupBy(completed, (p) => p.eventId, payAmount),
      methods: Array.from(new Set(payments.map((p) => p.paymentMethod).filter(Boolean) as string[])),
    };
  }, [payments, from, prevFrom, now, days]);

  // payments table (filters apply on top of the date range)
  const filteredPayments = useMemo(() => {
    const q = paySearch.trim().toLowerCase();
    return pay.inRange
      .filter((p) => statusFilter === "all" || p.paymentStatus === statusFilter)
      .filter((p) => methodFilter === "all" || p.paymentMethod === methodFilter)
      .filter(
        (p) =>
          !q ||
          String(p.transactionId ?? "").toLowerCase().includes(q) ||
          String(p.bookingId).includes(q) ||
          String(payId(p)).includes(q) ||
          orgName(p.orgId).toLowerCase().includes(q)
      )
      .sort((a, b) => +(payDate(b) ?? 0) - +(payDate(a) ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.inRange, statusFilter, methodFilter, paySearch, orgMap]);

  const payPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safePayPage = Math.min(payPage, payPages);
  const pagedPayments = filteredPayments.slice((safePayPage - 1) * PAGE_SIZE, safePayPage * PAGE_SIZE);

  // ------------------------------------------------------
  // PAYOUT QUEUE
  // ------------------------------------------------------
  const queue = useMemo(() => {
    const total = pendingPayouts.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const ageDays = (p: Loose) => (asDate(p.createdAt) ? (+now - +asDate(p.createdAt)!) / DAY : 0);
    const buckets = [
      { label: "Under 1 day", value: pendingPayouts.filter((p) => ageDays(p) < 1).length },
      { label: "1 to 3 days", value: pendingPayouts.filter((p) => ageDays(p) >= 1 && ageDays(p) < 3).length },
      { label: "Over 3 days", value: pendingPayouts.filter((p) => ageDays(p) >= 3).length },
    ];
    const oldest = pendingPayouts.reduce<number>((max, p) => Math.max(max, ageDays(p)), 0);
    return {
      count: pendingPayouts.length,
      total,
      buckets,
      oldest,
      byOrg: groupBy(pendingPayouts, (p) => p.orgId, (p) => Number(p.amount ?? 0)),
    };
  }, [pendingPayouts, now]);

  // ------------------------------------------------------
  // EVENT ANALYTICS
  // ------------------------------------------------------
  const ev = useMemo(() => {
    const status = groupBy(events, (e) => String(e.status ?? "unknown").toLowerCase(), () => 1);
    const category = groupBy(events, (e) => e.category ?? e.categoryName ?? "Uncategorised", () => 1);
    const upcoming = events
      .filter((e) => {
        const d = eventDate(e);
        return d && d >= now && !["cancelled", "canceled", "draft"].includes(String(e.status ?? "").toLowerCase());
      })
      .sort((a, b) => +eventDate(a)! - +eventDate(b)!);
    return {
      status,
      category,
      upcoming,
      createdInRange: events.filter((e) => within(asDate(e.createdAt), from, now)).length,
      byOrg: groupBy(events, (e) => e.orgId, () => 1),
    };
  }, [events, now, from]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => +(eventDate(b) ?? 0) - +(eventDate(a) ?? 0)), [events]);
  const activeEventId = pickedEvent ?? (sortedEvents[0] ? eventId(sortedEvents[0]) : null);
  const activeEvent = activeEventId ? eventMap.get(activeEventId) : undefined;
  const activeEventPayments = pay.completed.filter((p) => p.eventId === activeEventId);

  const venueCapacity = venues.reduce((s, v) => s + Number(v.capacity ?? 0), 0);

  // ------------------------------------------------------
  // ORGANIZATION ANALYTICS
  // ------------------------------------------------------
  const org = useMemo(() => {
    const verified = orgs.filter((o) => o.isVerified).length;
    const active = orgs.filter((o) => o.isActive !== false).length;
    const revenueByOrg = new Map(pay.byOrg.map((r) => [Number(r.key), r]));
    const eventsByOrg = new Map(ev.byOrg.map((r) => [Number(r.key), r.value]));
    const owed = new Map(queue.byOrg.map((r) => [Number(r.key), r.value]));

    return {
      verified,
      active,
      newInRange: orgs.filter((o) => within(asDate(o.createdAt), from, now)).length,
      signups: buildSeries(
        orgs.flatMap((o) => {
          const d = asDate(o.createdAt);
          return d ? [{ date: d, value: 1 }] : [];
        }),
        from,
        now
      ),
      rows: orgs.map((o) => ({
        o,
        id: orgIdOf(o),
        revenue: revenueByOrg.get(orgIdOf(o))?.value ?? 0,
        payments: revenueByOrg.get(orgIdOf(o))?.count ?? 0,
        events: eventsByOrg.get(orgIdOf(o)) ?? 0,
        owed: owed.get(orgIdOf(o)) ?? 0,
      })),
    };
  }, [orgs, pay.byOrg, ev.byOrg, queue.byOrg, from, now]);

  const orgRows = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    return org.rows
      .filter((r) => !q || String(r.o.name ?? "").toLowerCase().includes(q) || String(r.id).includes(q))
      .sort((a, b) => b.revenue - a.revenue);
  }, [org.rows, orgSearch]);

  // ------------------------------------------------------
  // VERIFICATION ANALYTICS
  // ------------------------------------------------------
  const ver = useMemo(() => {
    const status = groupBy(verifications, (v) => v.status, () => 1);
    const approved = verifications.filter((v) => v.status === "approved");
    const reviewHours = approved
      .map((v) => {
        const a = asDate(v.createdAt);
        const b = asDate(v.updatedAt);
        return a && b ? (+b - +a) / 3_600_000 : null;
      })
      .filter((h): h is number => h !== null && h >= 0);
    return {
      status,
      entity: groupBy(verifications, (v) => v.entityType, () => 1),
      approvalRate: pct(approved.length, verifications.filter((v) => v.status === "approved" || v.status === "rejected").length),
      avgReviewHours: reviewHours.length ? reviewHours.reduce((s, h) => s + h, 0) / reviewHours.length : null,
      submissions: buildSeries(
        verifications.flatMap((v) => {
          const d = asDate(v.createdAt);
          return d ? [{ date: d, value: 1 }] : [];
        }),
        from,
        now
      ),
      latest: [...verifications].sort((a, b) => +(asDate(b.createdAt) ?? 0) - +(asDate(a.createdAt) ?? 0)).slice(0, 8),
    };
  }, [verifications, from, now]);

  const pendingVerifCount = pickNumber(pendingVerifQ.data, ["count", "pending", "total"]) ?? ver.status.find((s) => s.key === "pending")?.value ?? 0;
  const resubCount = toArray<Loose>(resubQ.data).length || (pickNumber(resubQ.data, ["count"]) ?? 0);

  const platformEarnings = pickNumber(earningsQ.data, ["totalEarnings", "platformEarnings", "totalPlatformEarnings", "totalRevenue", "earnings", "total", "amount"]);
  const successfulAllTime = pickNumber(successQ.data, ["successfulCount", "successfulPayments", "totalSuccessful", "count", "total"]);
  const liability = liabilityQ.data?.totalPendingLiability ?? null;
  const paymentsOnline = healthQ.isError ? false : healthQ.isSuccess ? true : null;

  // ------------------------------------------------------
  // CSV EXPORT (payments in the selected range)
  // ------------------------------------------------------
  const exportCsv = () => {
    const rows = [
      ["Payment #", "Booking", "Event", "Organization", "Amount", "Method", "Status", "Transaction", "Created"],
      ...filteredPayments.map((p) => [payId(p), p.bookingId, evName(p.eventId), orgName(p.orgId), p.amount ?? "", p.paymentMethod ?? "", p.paymentStatus, p.transactionId ?? "", fmtDate(p.createdAt)]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadingPay = paymentsQ.isLoading;

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <BarChart3 size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Analytics</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Admin</span>
              {paymentsOnline !== null && (
                <span className={`badge badge-xs font-bold px-2 py-0.5 gap-1 ${paymentsOnline ? "badge-success text-success-content" : "badge-error text-error-content"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Payments {paymentsOnline ? "online" : "offline"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-base-content/60">Revenue, events, organizations and verifications across the platform</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="join overflow-x-auto" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setPayPage(1);
                }}
                aria-pressed={range === r.key}
                className={`btn btn-sm join-item text-xs font-bold ${range === r.key ? "btn-primary" : "btn-ghost bg-base-200"}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={refreshAll} disabled={refreshing} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => setShowAbout(true)} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none">
              <Info size={14} /> About the numbers
            </button>
          </div>
        </div>
      </div>

      {/* PARTIAL FAILURE BANNER */}
      {failed.length > 0 && (
        <div role="alert" className="alert alert-warning text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1 min-w-0 break-words">Could not load: {failed.join(", ")}. The rest of the page still works.</span>
          <button onClick={() => sources.filter((s) => s.q.isError).forEach((s) => s.q.refetch())} className="btn btn-ghost btn-xs rounded-lg font-bold">
            Retry
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<WalletIcon size={18} />} label="Platform earnings (all time)" value={platformEarnings === null ? "—" : money(platformEarnings)} loading={earningsQ.isLoading} hint={successfulAllTime !== null ? `${successfulAllTime.toLocaleString()} successful payments` : undefined} />
        <Kpi icon={<Banknote size={18} />} label={`Revenue, ${rangeLabel}`} value={money(pay.revenue)} loading={loadingPay} tone="success" delta={<Delta current={pay.revenue} previous={pay.prevRevenue} />} hint={days ? "vs previous period" : undefined} />
        <Kpi icon={<Receipt size={18} />} label={`Completed payments, ${rangeLabel}`} value={pay.completed.length.toLocaleString()} loading={loadingPay} tone="info" delta={<Delta current={pay.completed.length} previous={pay.prevCount} />} hint={`${pay.successRate}% success rate`} />
        <Kpi icon={<Clock size={18} />} label="Owed to organizers" value={liability === null ? "—" : money(liability)} loading={liabilityQ.isLoading} tone="warning" hint={`${queue.count} pending payout${queue.count === 1 ? "" : "s"}`} />
        <Kpi icon={<Building2 size={18} />} label="Organizations" value={orgs.length.toLocaleString()} loading={orgsQ.isLoading} tone="secondary" hint={`${org.verified} verified, ${org.newInRange} new in range`} />
        <Kpi icon={<CalendarDays size={18} />} label="Events" value={events.length.toLocaleString()} loading={eventsQ.isLoading} tone="accent" hint={`${ev.upcoming.length} upcoming`} />
        <Kpi icon={<ShieldCheck size={18} />} label="Verifications to review" value={String(pendingVerifCount)} loading={pendingVerifQ.isLoading} tone="error" hint={`${resubCount} awaiting resubmission`} />
        <Kpi icon={<MapPin size={18} />} label="Venues" value={venues.length.toLocaleString()} loading={venuesQ.isLoading} tone="primary" hint={venueCapacity ? `${venueCapacity.toLocaleString()} total capacity` : "As visible to your account"} />
      </div>

      {/* TABS */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 rounded-xl p-1 self-start max-w-full overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["revenue", "Revenue"],
            ["events", "Events & tickets"],
            ["organizations", "Organizations"],
            ["verifications", "Verifications"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button key={key} role="tab" onClick={() => setTab(key)} className={`tab text-[11px] font-bold rounded-lg whitespace-nowrap ${tab === key ? "tab-active" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* OVERVIEW                                                      */}
      {/* ============================================================ */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title={`Revenue trend, ${rangeLabel}`} icon={<TrendingUp size={16} />} className="lg:col-span-2">
              {loadingPay ? <Skeleton /> : <AreaChart data={pay.series} format={money} tone="success" />}
            </Panel>

            <Panel title="Payment outcomes" icon={<Receipt size={16} />}>
              {loadingPay ? (
                <Skeleton />
              ) : (
                <Donut
                  centerLabel="payments"
                  segments={[
                    { label: "Completed", value: pay.completed.length, tone: "success" },
                    { label: "Pending", value: pay.pendingCount, tone: "warning" },
                    { label: "Failed", value: pay.failedCount, tone: "error" },
                  ]}
                />
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Top organizations by revenue" icon={<Building2 size={16} />}>
              <BarList items={pay.byOrg.slice(0, 6).map((r) => ({ label: orgName(Number(r.key)), value: r.value, sub: `${r.count} payments` }))} format={compact} />
            </Panel>
            <Panel title="Top events by revenue" icon={<CalendarDays size={16} />}>
              <BarList tone="info" items={pay.byEvent.slice(0, 6).map((r) => ({ label: evName(Number(r.key)), value: r.value, sub: `${r.count} payments` }))} format={compact} />
            </Panel>
            <Panel title="Revenue by payment method" icon={<Banknote size={16} />}>
              <BarList tone="accent" items={pay.byMethod.slice(0, 6).map((r) => ({ label: String(r.key), value: r.value, sub: `${r.count} payments` }))} format={compact} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Recent payments" icon={<Receipt size={16} />}>
              {loadingPay ? (
                <Skeleton />
              ) : pay.inRange.length === 0 ? (
                <Empty text="No payments in this period" />
              ) : (
                <ul className="flex flex-col divide-y divide-base-200">
                  {[...pay.inRange]
                    .sort((a, b) => +(payDate(b) ?? 0) - +(payDate(a) ?? 0))
                    .slice(0, 6)
                    .map((p) => (
                      <li key={payId(p)}>
                        <button onClick={() => setPaymentDetail(p)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-base-200/40 rounded-lg px-1 transition-colors">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-base-content truncate">{evName(p.eventId)}</span>
                            <span className="text-[10px] text-base-content/50 truncate">
                              {orgName(p.orgId)}, {fmtDate(p.createdAt)}
                            </span>
                          </div>
                          <span className={`badge badge-sm font-bold shrink-0 ${PAYMENT_BADGE[p.paymentStatus]}`}>{p.paymentStatus}</span>
                          <span className="text-xs font-black tabular-nums shrink-0">{money(payAmount(p))}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </Panel>

            <Panel title="Upcoming events" icon={<CalendarDays size={16} />}>
              {eventsQ.isLoading ? (
                <Skeleton />
              ) : ev.upcoming.length === 0 ? (
                <Empty text="No upcoming events" />
              ) : (
                <ul className="flex flex-col divide-y divide-base-200">
                  {ev.upcoming.slice(0, 6).map((e) => (
                    <li key={eventId(e)} className="flex items-center gap-3 py-2.5">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                        <CalendarDays size={15} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-base-content truncate">{eventTitle(e)}</span>
                        <span className="text-[10px] text-base-content/50 truncate">
                          {orgName(Number(e.orgId))}, {fmtDate(eventDate(e))}
                        </span>
                      </div>
                      <span className="badge badge-sm badge-ghost font-bold shrink-0">{pretty(String(e.status ?? "scheduled"))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REVENUE                                                       */}
      {/* ============================================================ */}
      {tab === "revenue" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Banknote size={18} />} label="Average payment" value={money(pay.avg)} tone="success" />
            <Kpi icon={<CheckCircle2 size={18} />} label="Success rate" value={`${pay.successRate}%`} tone="info" hint={`${pay.completed.length} of ${pay.inRange.length}`} />
            <Kpi icon={<Clock size={18} />} label="Pending payments" value={money(pay.pendingValue)} tone="warning" hint={`${pay.pendingCount} payments`} />
            <Kpi icon={<AlertCircle size={18} />} label="Failed payments" value={money(pay.failedValue)} tone="error" hint={`${pay.failedCount} payments`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Payout queue" icon={<Clock size={16} />}>
              {payoutsQ.isLoading ? (
                <Skeleton />
              ) : queue.count === 0 ? (
                <Empty text="No pending payouts" />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-base-200/50 p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-base-content/60 font-semibold">Waiting to be paid</span>
                      <span className="font-black text-base-content tabular-nums">{money(queue.total)}</span>
                    </div>
                    <span className="badge badge-warning font-bold text-warning-content">{queue.count}</span>
                  </div>
                  <BarList tone="warning" format={(n) => `${n}`} items={queue.buckets.map((b) => ({ label: b.label, value: b.value }))} />
                  <span className="text-[10px] text-base-content/50">Oldest request: {queue.oldest < 1 ? "today" : `${Math.floor(queue.oldest)} days ago`}</span>
                </div>
              )}
            </Panel>

            <Panel title="Most owed to" icon={<Building2 size={16} />}>
              <BarList tone="warning" items={queue.byOrg.slice(0, 6).map((r) => ({ label: orgName(Number(r.key)), value: r.value, sub: `${r.count} payout${r.count === 1 ? "" : "s"}` }))} format={compact} empty="Nothing owed right now" />
            </Panel>

            <Panel title="Methods" icon={<Banknote size={16} />}>
              {loadingPay ? <Skeleton /> : <Donut centerLabel="revenue" format={compact} segments={pay.byMethod.slice(0, 6).map((r, i) => ({ label: String(r.key), value: r.value, tone: CYCLE[i % CYCLE.length] }))} />}
            </Panel>
          </div>

          <Panel
            title="Payments"
            icon={<Receipt size={16} />}
            right={
              <button onClick={exportCsv} disabled={filteredPayments.length === 0} className="btn btn-ghost btn-xs bg-base-200 rounded-lg font-bold gap-1.5">
                <Download size={13} /> Download CSV
              </button>
            }
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 w-full text-xs">
                <Search size={14} className="text-base-content/40 shrink-0" />
                <input value={paySearch} onChange={(e) => { setPaySearch(e.target.value); setPayPage(1); }} placeholder="Search booking, transaction, organization" className="grow" />
              </label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPayPage(1); }} className="select select-bordered select-sm rounded-xl text-xs font-semibold sm:w-40">
                <option value="all">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
              <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPayPage(1); }} className="select select-bordered select-sm rounded-xl text-xs font-semibold sm:w-40">
                <option value="all">All methods</option>
                {pay.methods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {loadingPay ? (
              <Skeleton />
            ) : filteredPayments.length === 0 ? (
              <Empty text="No payments match these filters" />
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="table table-sm w-full text-xs min-w-[760px]">
                    <thead>
                      <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                        <th className="py-3 px-4 font-bold">Payment</th>
                        <th className="py-3 px-4 font-bold">Event</th>
                        <th className="py-3 px-4 font-bold">Organization</th>
                        <th className="py-3 px-4 font-bold">Method</th>
                        <th className="py-3 px-4 font-bold text-right">Amount</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPayments.map((p) => (
                        <tr key={payId(p)} onClick={() => setPaymentDetail(p)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors cursor-pointer">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-base-content">#{payId(p)}</span>
                              <span className="text-[10px] text-base-content/50">{fmtDate(p.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[12rem] truncate">{evName(p.eventId)}</td>
                          <td className="py-3 px-4 max-w-[12rem] truncate">{orgName(p.orgId)}</td>
                          <td className="py-3 px-4 text-base-content/70">{p.paymentMethod || "—"}</td>
                          <td className="py-3 px-4 text-right font-bold text-success tabular-nums">{money(payAmount(p))}</td>
                          <td className="py-3 px-4"><span className={`badge badge-sm font-bold ${PAYMENT_BADGE[p.paymentStatus]}`}>{p.paymentStatus}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager page={safePayPage} pages={payPages} total={filteredPayments.length} onPage={setPayPage} />
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ============================================================ */}
      {/* EVENTS & TICKETS                                              */}
      {/* ============================================================ */}
      {tab === "events" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<CalendarDays size={18} />} label="Total events" value={events.length.toLocaleString()} loading={eventsQ.isLoading} />
            <Kpi icon={<Clock size={18} />} label="Upcoming" value={ev.upcoming.length.toLocaleString()} tone="info" />
            <Kpi icon={<Activity size={18} />} label={`Created, ${rangeLabel}`} value={ev.createdInRange.toLocaleString()} tone="success" />
            <Kpi icon={<MapPin size={18} />} label="Venues" value={venues.length.toLocaleString()} tone="accent" hint={venueCapacity ? `${venueCapacity.toLocaleString()} seats` : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Events by status" icon={<Activity size={16} />}>
              {eventsQ.isLoading ? <Skeleton /> : <Donut centerLabel="events" segments={ev.status.map((s, i) => ({ label: pretty(String(s.key)), value: s.count, tone: CYCLE[i % CYCLE.length] }))} />}
            </Panel>
            <Panel title="Events by category" icon={<Ticket size={16} />}>
              <BarList tone="secondary" items={ev.category.slice(0, 7).map((c) => ({ label: String(c.key), value: c.count }))} format={(n) => `${n}`} />
            </Panel>
            <Panel title="Most active organizers" icon={<Building2 size={16} />}>
              <BarList tone="accent" items={ev.byOrg.slice(0, 7).map((r) => ({ label: orgName(Number(r.key)), value: r.count }))} format={(n) => `${n} events`} />
            </Panel>
          </div>

          <Panel title="Event drill-down" icon={<Ticket size={16} />}>
            {eventsQ.isLoading ? (
              <Skeleton className="h-24" />
            ) : sortedEvents.length === 0 ? (
              <Empty text="No events yet" />
            ) : (
              <>
                <select value={activeEventId ?? ""} onChange={(e) => setPickedEvent(Number(e.target.value))} className="select select-bordered select-sm rounded-xl w-full sm:w-96 text-xs font-semibold" aria-label="Choose an event">
                  {sortedEvents.map((e) => (
                    <option key={eventId(e)} value={eventId(e)}>
                      {eventTitle(e)} ({orgName(Number(e.orgId))})
                    </option>
                  ))}
                </select>

                {activeEvent && activeEventId && (
                  <EventInsight id={activeEventId} title={eventTitle(activeEvent)} paymentsRevenue={activeEventPayments.reduce((s, p) => s + payAmount(p), 0)} paymentsCount={activeEventPayments.length} />
                )}
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ============================================================ */}
      {/* ORGANIZATIONS                                                 */}
      {/* ============================================================ */}
      {tab === "organizations" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Building2 size={18} />} label="Total organizations" value={orgs.length.toLocaleString()} loading={orgsQ.isLoading} />
            <Kpi icon={<ShieldCheck size={18} />} label="Verified" value={org.verified.toLocaleString()} tone="success" hint={`${pct(org.verified, orgs.length)}% of all`} />
            <Kpi icon={<Activity size={18} />} label="Active" value={org.active.toLocaleString()} tone="info" hint={`${orgs.length - org.active} suspended`} />
            <Kpi icon={<TrendingUp size={18} />} label={`New, ${rangeLabel}`} value={org.newInRange.toLocaleString()} tone="accent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="New organizations" icon={<TrendingUp size={16} />} className="lg:col-span-2">
              <AreaChart data={org.signups} format={(n) => `${n} new`} tone="accent" />
            </Panel>
            <Panel title="Verification and status" icon={<ShieldCheck size={16} />}>
              <div className="flex flex-col gap-4">
                <Donut centerLabel="orgs" segments={[{ label: "Verified", value: org.verified, tone: "success" }, { label: "Unverified", value: orgs.length - org.verified, tone: "warning" }]} />
                <Donut centerLabel="orgs" segments={[{ label: "Active", value: org.active, tone: "info" }, { label: "Suspended", value: orgs.length - org.active, tone: "error" }]} />
              </div>
            </Panel>
          </div>

          <Panel title="Organizations" icon={<Building2 size={16} />}>
            <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 w-full sm:w-80 text-xs">
              <Search size={14} className="text-base-content/40 shrink-0" />
              <input value={orgSearch} onChange={(e) => { setOrgSearch(e.target.value); setOrgLimit(10); }} placeholder="Search by name or ID" className="grow" />
            </label>

            {orgsQ.isLoading ? (
              <Skeleton />
            ) : orgRows.length === 0 ? (
              <Empty text="No organizations match" />
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="table table-sm w-full text-xs min-w-[760px]">
                    <thead>
                      <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                        <th className="py-3 px-4 font-bold">Organization</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold text-right">Events</th>
                        <th className="py-3 px-4 font-bold text-right">Payments</th>
                        <th className="py-3 px-4 font-bold text-right">Revenue ({rangeLabel})</th>
                        <th className="py-3 px-4 font-bold text-right">Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgRows.slice(0, orgLimit).map((r) => (
                        <tr key={r.id} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-[10rem]">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-base-200 flex items-center justify-center overflow-hidden shrink-0">
                                {r.o.logoUrl ? <img src={r.o.logoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 size={14} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-base-content truncate">{r.o.name}</span>
                                <span className="text-[10px] text-base-content/50 font-mono">ID {r.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {r.o.isVerified ? <span className="badge badge-xs badge-success font-bold text-success-content">Verified</span> : <span className="badge badge-xs badge-warning font-bold text-warning-content">Unverified</span>}
                              {r.o.isActive === false && <span className="badge badge-xs badge-error font-bold text-error-content">Suspended</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">{r.events}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{r.payments}</td>
                          <td className="py-3 px-4 text-right font-bold text-success tabular-nums">{money(r.revenue)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-base-content/70">{r.owed ? money(r.owed) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {orgRows.length > orgLimit && (
                  <button onClick={() => setOrgLimit((n) => n + 10)} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold self-center">
                    Show more ({orgRows.length - orgLimit} left)
                  </button>
                )}
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ============================================================ */}
      {/* VERIFICATIONS                                                 */}
      {/* ============================================================ */}
      {tab === "verifications" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<ShieldCheck size={18} />} label="Waiting for review" value={String(pendingVerifCount)} tone="warning" loading={pendingVerifQ.isLoading} />
            <Kpi icon={<AlertCircle size={18} />} label="Awaiting resubmission" value={String(resubCount)} tone="secondary" loading={resubQ.isLoading} />
            <Kpi icon={<CheckCircle2 size={18} />} label="Approval rate" value={`${ver.approvalRate}%`} tone="success" hint="Of decided cases" />
            <Kpi icon={<Clock size={18} />} label="Average review time" value={ver.avgReviewHours === null ? "—" : ver.avgReviewHours < 1 ? `${Math.round(ver.avgReviewHours * 60)} min` : ver.avgReviewHours < 48 ? `${ver.avgReviewHours.toFixed(1)} hrs` : `${(ver.avgReviewHours / 24).toFixed(1)} days`} tone="info" hint="Submitted to approved" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Submissions" icon={<TrendingUp size={16} />} className="lg:col-span-2">
              {verifQ.isLoading ? <Skeleton /> : <AreaChart data={ver.submissions} format={(n) => `${n} submitted`} tone="info" />}
            </Panel>
            <Panel title="By status" icon={<ShieldCheck size={16} />}>
              {verifQ.isLoading ? <Skeleton /> : <Donut centerLabel="cases" segments={ver.status.map((s) => ({ label: VERIFICATION_LABEL[String(s.key)] ?? pretty(String(s.key)), value: s.count, tone: VERIFICATION_TONE[String(s.key)] ?? "primary" }))} />}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Verified as" icon={<Building2 size={16} />}>
              <BarList tone="secondary" items={ver.entity.map((e) => ({ label: pretty(String(e.key)), value: e.count }))} format={(n) => `${n}`} />
            </Panel>

            <Panel title="Latest submissions" icon={<Clock size={16} />} className="lg:col-span-2">
              {verifQ.isLoading ? (
                <Skeleton />
              ) : ver.latest.length === 0 ? (
                <Empty text="No verification submissions yet" />
              ) : (
                <ul className="flex flex-col divide-y divide-base-200">
                  {ver.latest.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2.5">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                        <ShieldCheck size={15} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-base-content truncate">{v.legalFullName || orgName(Number(v.orgId))}</span>
                        <span className="text-[10px] text-base-content/50 truncate">
                          {orgName(Number(v.orgId))}, {pretty(String(v.entityType ?? ""))}, {fmtDate(v.createdAt)}
                        </span>
                      </div>
                      <span className={`badge badge-sm font-bold shrink-0 ${v.status === "approved" ? "badge-success text-success-content" : v.status === "rejected" ? "badge-error text-error-content" : v.status === "in_progress" ? "badge-info" : "badge-warning text-warning-content"}`}>
                        {VERIFICATION_LABEL[v.status] ?? pretty(String(v.status))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}
      <AnimatePresence>
        {paymentDetail && (
          <ModalShell title={`Payment #${payId(paymentDetail)}`} icon={<Receipt size={16} />} onClose={() => setPaymentDetail(null)}>
            <div className="flex items-center justify-between rounded-xl bg-base-200/50 p-3">
              <span className="text-lg font-black tabular-nums">{money(payAmount(paymentDetail))}</span>
              <span className={`badge font-bold ${PAYMENT_BADGE[paymentDetail.paymentStatus]}`}>{paymentDetail.paymentStatus}</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ["Booking", `#${paymentDetail.bookingId}`],
                ["Event", evName(paymentDetail.eventId)],
                ["Organization", orgName(paymentDetail.orgId)],
                ["Customer (Digital ID)", paymentDetail.digitalId ? String(paymentDetail.digitalId) : "—"],
                ["Method", paymentDetail.paymentMethod || "—"],
                ["Transaction", paymentDetail.transactionId || "—"],
                ["Result", [paymentDetail.resultCode, paymentDetail.resultDesc].filter(Boolean).join(": ") || "—"],
                ["Created", fmtDate(paymentDetail.createdAt)],
                ["Updated", fmtDate(paymentDetail.updatedAt)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-base-200/40 p-3 flex flex-col gap-0.5 min-w-0">
                  <dt className="text-[11px] text-base-content/50 font-semibold">{k}</dt>
                  <dd className="font-semibold text-base-content break-words">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex justify-end pt-3 border-t border-base-200">
              <button onClick={() => setPaymentDetail(null)} className="btn btn-primary btn-sm rounded-xl font-bold text-xs">
                Close
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <ModalShell title="About the numbers" icon={<Info size={16} />} onClose={() => setShowAbout(false)}>
            <ul className="flex flex-col gap-2.5 text-xs">
              {[
                ["Revenue", "The total of completed payments only. Pending and failed payments are shown separately."],
                ["Date range", "Applies to payments, new organizations, events created and verification submissions. Arrows compare with the previous period of the same length."],
                ["Platform earnings", "The all-time figure reported by the payments service. It does not change with the date range."],
                ["Owed to organizers", "The total of all payouts that are still pending, from the wallet service."],
                ["Tickets", "There is no platform-wide ticket count, so tickets, scans and attendance are shown per event in the Events tab."],
                ["Venues", "Counted as returned for your account, so it may show only the venues you can see."],
              ].map(([t, d]) => (
                <li key={t} className="rounded-xl bg-base-200/50 p-3 flex flex-col gap-0.5">
                  <span className="font-black text-sm text-base-content">{t}</span>
                  <span className="text-base-content/70 leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-3 border-t border-base-200">
              <button onClick={() => setShowAbout(false)} className="btn btn-primary btn-sm rounded-xl font-bold text-xs">
                Got it
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnalytics;