import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  DollarSign,
  CalendarCheck,
  Ticket as TicketIcon,
  Percent,
  CheckCircle2,
  ScanLine,
  Gauge,
  TrendingUp,
  Wallet,
  Info,
  Sparkles,
  Building2,
  Users,
  Layers,
  AlertCircle,
  Receipt,
  Clock,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  UserCheck,
  Hourglass,
  Trophy,
  MapPin,
  Plus,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetBookingsByEventIdQuery, type Booking } from "../../features/APIS/BookingsApi";
import { useGetPaymentsByOrgIdQuery, type Payment } from "../../features/APIS/PaymentApi";
import { useGetTicketsByEventIdQuery, type Ticket } from "../../features/APIS/ticketsApi";
import { useGetTicketTypesByEventIdQuery } from "../../features/APIS/ticketsType.Api";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import { useGetOrganizationStatsQuery } from "../../features/APIS/organizationApi";
import { useGetAllVenuesQuery, type Venue } from "../../features/APIS/VenueApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";

// Change this to match the currency used on your other pages
const CURRENCY = "KSH";

type Range = 7 | 30 | 90 | 0; // 0 = all time
type SortKey = "revenue" | "bookings" | "ticketsSold" | "capacityUsed" | "checkIn";

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: 0, label: "All" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "bookings", label: "Bookings" },
  { value: "ticketsSold", label: "Tickets sold" },
  { value: "capacityUsed", label: "Capacity used" },
  { value: "checkIn", label: "Check-in rate" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// FORMATTERS & SMALL HELPERS
// ---------------------------------------------------------------------------
const num = (v: unknown) => Number(v || 0);
const fmtMoney = (v: unknown) =>
  `${CURRENCY}${num(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtCompact = (v: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const fmtMoneyCompact = (v: number) => `${CURRENCY}${fmtCompact(v)}`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const toArray = <T,>(d: any, key?: string): T[] =>
  Array.isArray(d) ? d : key && Array.isArray(d?.[key]) ? d[key] : Array.isArray(d?.data) ? d.data : [];

const tScanned = (t: any): boolean => Boolean(t.isScanned ?? t.scanned ?? t.scannedAt);
const tName = (t: any): string => t.attendeeName ?? t.name ?? "";
const tEmail = (t: any): string => t.attendeeEmail ?? t.email ?? "";
const tPhone = (t: any): string => t.attendeePhone ?? t.phone ?? "";
const tId = (t: any) => t.ticketId ?? t.id;
const pId = (p: any) => p.paymentId ?? p.id;

const niceCeil = (max: number) => {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
};

// ---------------------------------------------------------------------------
// CSV DOWNLOAD
// ---------------------------------------------------------------------------
const csvEscape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// TIME SERIES (daily / weekly / monthly buckets depending on the range)
// ---------------------------------------------------------------------------
const DAY_MS = 86400000;
type Bucket = "day" | "week" | "month";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const bucketStart = (d: Date, bucket: Bucket) => {
  const s = startOfDay(d);
  if (bucket === "week") s.setDate(s.getDate() - s.getDay());
  if (bucket === "month") s.setDate(1);
  return s;
};

const nextBucket = (d: Date, bucket: Bucket) => {
  const n = new Date(d);
  if (bucket === "day") n.setDate(n.getDate() + 1);
  else if (bucket === "week") n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
};

const buildSeries = (rows: { date: Date; value: number }[], range: Range) => {
  const today = startOfDay(new Date());
  let start: Date;
  if (range > 0) {
    start = new Date(today);
    start.setDate(start.getDate() - (range - 1));
  } else if (rows.length) {
    start = startOfDay(new Date(Math.min(...rows.map((r) => r.date.getTime()))));
  } else {
    start = today;
  }

  const spanDays = Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1;
  const bucket: Bucket = spanDays <= 45 ? "day" : spanDays <= 200 ? "week" : "month";

  const map = new Map<number, number>();
  const keys: Date[] = [];
  for (let d = bucketStart(start, bucket); d <= today; d = nextBucket(d, bucket)) {
    keys.push(d);
    map.set(d.getTime(), 0);
  }

  rows.forEach((r) => {
    const k = bucketStart(r.date, bucket).getTime();
    if (map.has(k)) map.set(k, (map.get(k) || 0) + r.value);
  });

  return {
    bucket,
    points: keys.map((d) => ({
      label:
        bucket === "month"
          ? d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: map.get(d.getTime()) || 0,
    })),
  };
};

// ---------------------------------------------------------------------------
// CHART COMPONENTS (plain SVG, no chart library needed)
// ---------------------------------------------------------------------------
interface Point {
  label: string;
  value: number;
}

const W = 600;
const H = 220;
const PAD = { l: 46, r: 12, t: 16, b: 28 };

const ChartEmpty = ({ text = "No data for this period" }: { text?: string }) => (
  <div className="h-[200px] flex flex-col items-center justify-center gap-1 text-base-content/40">
    <BarChart3 size={28} />
    <span className="text-[11px] font-semibold">{text}</span>
  </div>
);

const xLabelIndexes = (n: number, max = 6) => {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: max }, (_, i) => Math.round((i * (n - 1)) / (max - 1)));
};

const AreaChart = ({
  data,
  format,
  colorClass = "text-primary",
}: {
  data: Point[];
  format: (v: number) => string;
  colorClass?: string;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) return <ChartEmpty />;

  const niceMax = niceCeil(max);
  const x = (i: number) => PAD.l + (data.length <= 1 ? 0.5 : i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / niceMax) * (H - PAD.t - PAD.b);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`;
  const band = (W - PAD.l - PAD.r) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-auto ${colorClass}`} onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(niceMax * f)}
            y2={y(niceMax * f)}
            stroke="currentColor"
            className="text-base-300"
            strokeDasharray="3 4"
          />
          <text x={PAD.l - 8} y={y(niceMax * f) + 3} textAnchor="end" className="fill-base-content/50" fontSize="10">
            {format(niceMax * f)}
          </text>
        </g>
      ))}

      <path d={area} fill="currentColor" opacity="0.15" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {xLabelIndexes(data.length).map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-base-content/50" fontSize="10">
          {data[i].label}
        </text>
      ))}

      {data.map((_, i) => (
        <rect
          key={i}
          x={x(i) - band / 2}
          y={PAD.t}
          width={band}
          height={H - PAD.t - PAD.b}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}

      {hover !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" opacity="0.3" />
          <circle cx={x(hover)} cy={y(data[hover].value)} r="4.5" fill="currentColor" className="stroke-base-100" strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(x(hover) - 50, PAD.l), W - PAD.r - 100)},${PAD.t - 4})`}>
            <rect width="100" height="34" rx="8" className="fill-base-content" opacity="0.92" />
            <text x="50" y="14" textAnchor="middle" className="fill-base-100" fontSize="10" opacity="0.7">
              {data[hover].label}
            </text>
            <text x="50" y="27" textAnchor="middle" className="fill-base-100" fontSize="12" fontWeight="700">
              {format(data[hover].value)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
};

const BarChart = ({
  data,
  format,
  colorClass = "text-primary",
  labelEvery,
}: {
  data: Point[];
  format: (v: number) => string;
  colorClass?: string;
  labelEvery?: number;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) return <ChartEmpty />;

  const niceMax = niceCeil(max);
  const band = (W - PAD.l - PAD.r) / data.length;
  const bw = Math.min(band * 0.62, 36);
  const y = (v: number) => PAD.t + (1 - v / niceMax) * (H - PAD.t - PAD.b);
  const cx = (i: number) => PAD.l + band * i + band / 2;
  const labels = labelEvery ? data.map((_, i) => i).filter((i) => i % labelEvery === 0) : xLabelIndexes(data.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-auto ${colorClass}`} onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(niceMax * f)}
            y2={y(niceMax * f)}
            stroke="currentColor"
            className="text-base-300"
            strokeDasharray="3 4"
          />
          <text x={PAD.l - 8} y={y(niceMax * f) + 3} textAnchor="end" className="fill-base-content/50" fontSize="10">
            {format(niceMax * f)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const h = Math.max(H - PAD.b - y(d.value), d.value > 0 ? 2 : 0);
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={cx(i) - band / 2} y={PAD.t} width={band} height={H - PAD.t - PAD.b} fill="transparent" />
            <rect
              x={cx(i) - bw / 2}
              y={H - PAD.b - h}
              width={bw}
              height={h}
              rx="4"
              fill="currentColor"
              opacity={hover === null || hover === i ? 0.9 : 0.35}
            />
          </g>
        );
      })}

      {labels.map((i) => (
        <text key={i} x={cx(i)} y={H - 8} textAnchor="middle" className="fill-base-content/50" fontSize="10">
          {data[i].label}
        </text>
      ))}

      {hover !== null && (
        <g pointerEvents="none" transform={`translate(${Math.min(Math.max(cx(hover) - 50, PAD.l), W - PAD.r - 100)},${PAD.t - 4})`}>
          <rect width="100" height="34" rx="8" className="fill-base-content" opacity="0.92" />
          <text x="50" y="14" textAnchor="middle" className="fill-base-100" fontSize="10" opacity="0.7">
            {data[hover].label}
          </text>
          <text x="50" y="27" textAnchor="middle" className="fill-base-100" fontSize="12" fontWeight="700">
            {format(data[hover].value)}
          </text>
        </g>
      )}
    </svg>
  );
};

interface Segment {
  label: string;
  value: number;
  color: string; // a Tailwind text-* class
}

const Donut = ({
  segments,
  centerValue,
  centerLabel,
  format = (v: number) => String(v),
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  format?: (v: number) => string;
}) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) return <ChartEmpty />;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="14" className="text-base-200" />
          {segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  className={s.color}
                >
                  <title>{`${s.label}: ${format(s.value)}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-base-content leading-none">{centerValue}</span>
          <span className="text-[10px] text-base-content/50 font-semibold mt-1">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 w-full sm:w-auto min-w-[160px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full bg-current shrink-0 ${s.color}`} />
            <span className="font-semibold text-base-content/80 flex-1 truncate">{s.label}</span>
            <span className="font-bold text-base-content">{format(s.value)}</span>
            <span className="text-[10px] text-base-content/40 w-9 text-right">{pct(s.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LAYOUT PIECES
// ---------------------------------------------------------------------------
const Panel = ({
  title,
  subtitle,
  icon,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <div className={`bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4 ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
        {subtitle && <p className="text-[11px] text-base-content/50">{subtitle}</p>}
      </div>
      {icon && <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">{icon}</div>}
    </div>
    {children}
  </div>
);

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

const Kpi = ({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  index,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: keyof typeof TONES;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2"
  >
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] text-base-content/60 font-semibold">{label}</span>
      <span className="text-base sm:text-xl font-black text-base-content truncate">{value}</span>
      {hint && <span className="text-[10px] text-base-content/50 truncate">{hint}</span>}
    </div>
    <div className={`p-2.5 rounded-xl shrink-0 ${TONES[tone]}`}>{icon}</div>
  </motion.div>
);

const PANEL_SKELETON = <div className="skeleton h-[200px] w-full rounded-xl" />;

// ---------------------------------------------------------------------------
// PER-EVENT DATA LOADER
// Fetches one event's bookings, tickets and ticket types and reports them to the
// page. One of these runs for each event in scope, so "All events" works with the
// APIs you already have.
// ---------------------------------------------------------------------------
interface EventPayload {
  eventId: number;
  loading: boolean;
  error: boolean;
  bookings: Booking[];
  tickets: Ticket[];
  types: any[];
}

const EventDataLoader = ({
  eventId,
  refreshKey,
  onData,
}: {
  eventId: number;
  refreshKey: number;
  onData: (p: EventPayload) => void;
}) => {
  const b = useGetBookingsByEventIdQuery(eventId);
  const t = useGetTicketsByEventIdQuery(eventId);
  const ty = useGetTicketTypesByEventIdQuery(eventId);

  const loading = b.isLoading || t.isLoading || ty.isLoading;
  const error = b.isError || t.isError;

  useEffect(() => {
    onData({
      eventId,
      loading,
      error,
      bookings: toArray<Booking>(b.data),
      tickets: toArray<Ticket>(t.data, "tickets"),
      types: toArray<any>(ty.data),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, loading, error, b.data, t.data, ty.data]);

  useEffect(() => {
    if (refreshKey > 0) {
      b.refetch();
      t.refetch();
      ty.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return null;
};

// ===========================================================================
// PAGE
// ===========================================================================
export const AnalyticsManager = () => {
  usePageTitle("Analytics");

  const user = useSelector((state: RootState) => state.auth.user);

  // The organizer's REAL organization. There is no fallback to a default one:
  // someone without an organization must not see other people's analytics.
  const { orgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();

  // ---------------------------------------------------------------------------
  // EVENTS, SCOPE & ORGANIZATION OVERVIEW (only this organization's events)
  // ---------------------------------------------------------------------------
  const { data: eventsData } = useGetEventsByOrganizationQuery(orgId as number, { skip: !orgId });
  const rawEvents = useMemo(() => toArray<any>(eventsData), [eventsData]);
  const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;

  // "all" or an event id. A picked event only counts if it belongs to this
  // organization, otherwise we fall back to "all my events".
  const [pickedScope, setPickedScope] = useState<string>("all");
  const allIds = useMemo(() => rawEvents.map((e) => Number(getEventId(e))).filter(Boolean), [rawEvents]);
  const scope = pickedScope === "all" || allIds.includes(Number(pickedScope)) ? pickedScope : "all";
  const scopeIds = useMemo(() => (scope === "all" ? allIds : [Number(scope)].filter(Boolean)), [scope, allIds]);
  const isAll = scope === "all";

  const eventTitleById = useCallback(
    (id: number | string) => {
      const ev = rawEvents.find((e) => String(getEventId(e)) === String(id));
      return ev?.title || `Event #${id}`;
    },
    [rawEvents]
  );

  const scopeTitle = isAll ? "All events" : eventTitleById(scope);

  const { data: orgStatsData } = useGetOrganizationStatsQuery(orgId as number, { skip: !orgId });
  const orgStats: any = (orgStatsData as any)?.data ?? orgStatsData;

  // ---------------------------------------------------------------------------
  // DATA: per-event payloads + organization payments + venues
  // ---------------------------------------------------------------------------
  const [payloads, setPayloads] = useState<Record<number, EventPayload>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const handleData = useCallback((p: EventPayload) => setPayloads((prev) => ({ ...prev, [p.eventId]: p })), []);

  const paymentsQ = useGetPaymentsByOrgIdQuery(orgId as number, { skip: !orgId });

  // The organizer's venues (the API already scopes them to the logged-in organizer;
  // we also drop any venue that clearly belongs to another organization)
  const venuesQ = useGetAllVenuesQuery(undefined, { skip: !hasOrg });
  const venues = useMemo(
    () => toArray<Venue>(venuesQ.data).filter((v: any) => v.orgId == null || Number(v.orgId) === Number(orgId)),
    [venuesQ.data, orgId]
  );

  const loadedCount = scopeIds.filter((id) => payloads[id] && !payloads[id].loading).length;
  const failedCount = scopeIds.filter((id) => payloads[id]?.error).length;
  const isLoading = loadedCount < scopeIds.length || paymentsQ.isLoading;

  const scoped = useMemo(() => scopeIds.map((id) => payloads[id]).filter(Boolean) as EventPayload[], [scopeIds, payloads]);

  const bookings = useMemo(
    () => scoped.flatMap((p) => p.bookings.map((b) => ({ ...b, eventId: b.eventId ?? p.eventId }))),
    [scoped]
  );
  const tickets = useMemo(
    () => scoped.flatMap((p) => p.tickets.map((t) => ({ ...t, eventId: t.eventId ?? p.eventId }))),
    [scoped]
  );
  const types = useMemo(() => scoped.flatMap((p) => p.types.map((t: any) => ({ ...t, _eventId: p.eventId }))), [scoped]);

  // Payments belong to events through their booking
  const payments = useMemo(() => {
    const bookingEvent = new Map<number, number>();
    bookings.forEach((b) => bookingEvent.set(Number(b.bookingId), Number(b.eventId)));
    const org = toArray<Payment>(paymentsQ.data);
    const withEvent = org.map((p: any) => ({
      ...p,
      _eventId: p.eventId ? Number(p.eventId) : bookingEvent.get(Number(p.bookingId)),
    }));
    return isAll ? withEvent : withEvent.filter((p) => p._eventId === Number(scope));
  }, [paymentsQ.data, bookings, isAll, scope]);

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [range, setRange] = useState<Range>(30);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [notice, setNotice] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const rangeStart = useMemo(() => {
    if (!range) return null;
    const t = startOfDay(new Date());
    t.setDate(t.getDate() - (range - 1));
    return t;
  }, [range]);

  const inRange = (iso?: string) => {
    if (!rangeStart) return true;
    if (!iso) return false;
    return new Date(iso) >= rangeStart;
  };

  const rangeLabel = range ? `Last ${range} days` : "All time";

  // ---------------------------------------------------------------------------
  // DERIVED ANALYTICS
  // ---------------------------------------------------------------------------
  const a = useMemo(() => {
    const b = bookings.filter((x) => inRange(x.createdAt));
    const p = payments.filter((x: any) => inRange(x.createdAt));

    const confirmed = b.filter((x) => x.bookingStatus === "Confirmed");
    const pending = b.filter((x) => x.bookingStatus === "Pending");
    const cancelled = b.filter((x) => x.bookingStatus === "Cancelled");

    const completedPayments = p.filter((x: any) => x.paymentStatus === "Completed");
    const pendingPayments = p.filter((x: any) => x.paymentStatus === "Pending");
    const failedPayments = p.filter((x: any) => x.paymentStatus === "Failed");

    const revenue = completedPayments.reduce((s: number, x: any) => s + num(x.amount), 0);
    const pendingRevenue = pendingPayments.reduce((s: number, x: any) => s + num(x.amount), 0);
    const ticketsSold = confirmed.reduce((s, x) => s + num(x.quantity), 0);
    const avgOrder = completedPayments.length ? revenue / completedPayments.length : 0;
    const ticketsPerBooking = confirmed.length ? ticketsSold / confirmed.length : 0;

    // Revenue by payment method
    const methodMap = new Map<string, number>();
    completedPayments.forEach((x: any) => {
      const k = x.paymentMethod || "Other";
      methodMap.set(k, (methodMap.get(k) || 0) + num(x.amount));
    });
    const methods = Array.from(methodMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((m, n) => n.value - m.value);

    // Trends
    const revenueSeries = buildSeries(
      completedPayments.filter((x: any) => x.createdAt).map((x: any) => ({ date: new Date(x.createdAt), value: num(x.amount) })),
      range
    );
    const bookingsSeries = buildSeries(
      b.filter((x) => x.createdAt).map((x) => ({ date: new Date(x.createdAt), value: 1 })),
      range
    );

    // Day-of-week pattern
    const weekday = WEEKDAYS.map((label) => ({ label, value: 0 }));
    b.forEach((x) => {
      if (x.createdAt) weekday[new Date(x.createdAt).getDay()].value += 1;
    });

    // Buyers
    const live = b.filter((x) => x.bookingStatus !== "Cancelled");
    const buyerCount = new Map<string, number>();
    live.forEach((x) => {
      const key = x.digitalId ? `u${x.digitalId}` : x.guestEmail || x.guestPhone || x.guestName || `b${x.bookingId}`;
      buyerCount.set(key, (buyerCount.get(key) || 0) + 1);
    });
    const uniqueBuyers = buyerCount.size;
    const repeatBuyers = Array.from(buyerCount.values()).filter((n) => n > 1).length;
    const registered = live.filter((x) => x.digitalId).length;
    const guests = live.length - registered;

    // Ticket tiers
    const tiers = types
      .map((t: any) => {
        const qty = num(t.quantity);
        const sold = num(t.sold);
        return {
          name: t.name as string,
          eventId: t._eventId as number,
          qty,
          sold,
          price: num(t.price),
          revenue: sold * num(t.price),
        };
      })
      .sort((m, n) => n.sold - m.sold);
    const totalCapacity = tiers.reduce((s, t) => s + t.qty, 0);
    const totalSoldTiers = tiers.reduce((s, t) => s + t.sold, 0);

    // Check-in
    const scannedList = tickets.filter(tScanned);
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: 0 }));
    scannedList.forEach((t: any) => {
      if (t.scannedAt) hours[new Date(t.scannedAt).getHours()].value += 1;
    });
    const assigned = tickets.filter((t: any) => tName(t) || tEmail(t) || t.holderId).length;

    // Per-event breakdown
    const perEvent = scopeIds.map((id) => {
      const eb = b.filter((x) => Number(x.eventId) === id);
      const ec = eb.filter((x) => x.bookingStatus === "Confirmed");
      const rev = completedPayments
        .filter((x: any) => x._eventId === id)
        .reduce((s: number, x: any) => s + num(x.amount), 0);
      const et = tickets.filter((t) => Number(t.eventId) === id);
      const sc = et.filter(tScanned).length;
      const ety = types.filter((t: any) => t._eventId === id);
      const cap = ety.reduce((s: number, t: any) => s + num(t.quantity), 0);
      const sold = ety.reduce((s: number, t: any) => s + num(t.sold), 0);
      return {
        id,
        title: eventTitleById(id),
        revenue: rev,
        bookings: eb.length,
        confirmed: ec.length,
        ticketsSold: ec.reduce((s, x) => s + num(x.quantity), 0),
        tickets: et.length,
        scanned: sc,
        capacity: cap,
        sold,
        capacityUsed: pct(sold, cap),
        checkIn: pct(sc, et.length),
      };
    });
    const unmatchedRevenue = Math.max(revenue - perEvent.reduce((s, e) => s + e.revenue, 0), 0);

    return {
      b,
      p,
      confirmed,
      pending,
      cancelled,
      completedPayments,
      pendingPayments,
      failedPayments,
      revenue,
      pendingRevenue,
      ticketsSold,
      avgOrder,
      ticketsPerBooking,
      methods,
      revenueSeries,
      bookingsSeries,
      weekday,
      uniqueBuyers,
      repeatBuyers,
      registered,
      guests,
      tiers,
      totalCapacity,
      totalSoldTiers,
      scannedList,
      hours,
      assigned,
      perEvent,
      unmatchedRevenue,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, payments, tickets, types, range, scopeIds, rawEvents]);

  const totalTickets = tickets.length;
  const scannedTickets = a.scannedList.length;
  const notScanned = Math.max(totalTickets - scannedTickets, 0);

  const confirmationRate = pct(a.confirmed.length, a.b.length);
  const paymentSuccess = pct(a.completedPayments.length, a.p.length);
  const checkInRate = pct(scannedTickets, totalTickets);
  const capacityUsed = pct(a.totalSoldTiers, a.totalCapacity);

  const sortedEvents = useMemo(() => [...a.perEvent].sort((m, n) => n[sortKey] - m[sortKey]), [a.perEvent, sortKey]);
  const maxEventRevenue = Math.max(...a.perEvent.map((e) => e.revenue), 0);
  const visibleTiers = showAllTiers ? a.tiers : a.tiers.slice(0, 6);

  // ---------------------------------------------------------------------------
  // VENUE STATS (events are linked to venues through event.venueId)
  // ---------------------------------------------------------------------------
  const venueStats = useMemo(() => {
    const eventVenueId = new Map<number, number | null>();
    rawEvents.forEach((ev: any) => {
      const id = Number(getEventId(ev));
      eventVenueId.set(id, ev?.venueId != null && ev.venueId !== "" ? Number(ev.venueId) : null);
    });

    const allRows = venues.map((v: any) => {
      const vid = Number(v.venueId ?? v.id);
      const evs = a.perEvent.filter((e) => eventVenueId.get(e.id) === vid);
      const ticketsSold = evs.reduce((s, e) => s + e.ticketsSold, 0);
      const capacity = num(v.capacity);
      return {
        id: vid,
        name: (v.name as string) || `Venue #${vid}`,
        location: (v.location || v.address || "") as string,
        capacity,
        events: evs.length,
        bookings: evs.reduce((s, e) => s + e.bookings, 0),
        ticketsSold,
        revenue: evs.reduce((s, e) => s + e.revenue, 0),
        scanned: evs.reduce((s, e) => s + e.scanned, 0),
        fill: pct(ticketsSold, capacity * evs.length),
        avgSold: evs.length ? Math.round(ticketsSold / evs.length) : 0,
      };
    });

    // When one event is selected, only show the venue that event uses
    const rows = (isAll ? allRows : allRows.filter((r) => r.events > 0)).sort((m, n) => n.revenue - m.revenue);

    const knownVenueIds = new Set(venues.map((v: any) => Number(v.venueId ?? v.id)));
    const noVenue = a.perEvent.filter((e) => {
      const vid = eventVenueId.get(e.id);
      return vid == null || !knownVenueIds.has(vid);
    });

    const used = rows.filter((r) => r.events > 0);
    const topVenue = used.find((r) => r.revenue > 0) || null;
    const avgFill = used.length ? Math.round((used.reduce((s, r) => s + r.fill, 0) / used.length) * 10) / 10 : 0;

    return {
      rows,
      usedCount: used.length,
      topVenue,
      avgFill,
      noVenueEvents: noVenue.length,
      noVenueRevenue: noVenue.reduce((s, e) => s + e.revenue, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, a.perEvent, rawEvents, isAll]);

  const maxVenueRevenue = Math.max(...venueStats.rows.map((r) => r.revenue), 0);

  // ---------------------------------------------------------------------------
  // HIGHLIGHTS (plain-language insights)
  // ---------------------------------------------------------------------------
  const highlights = useMemo(() => {
    const out: { icon: ReactNode; text: ReactNode }[] = [];

    if (a.perEvent.length > 1) {
      const top = [...a.perEvent].sort((m, n) => n.revenue - m.revenue)[0];
      if (top && top.revenue > 0) {
        out.push({
          icon: <Trophy size={14} />,
          text: (
            <>
              <b>{top.title}</b> is your top earner with <b>{fmtMoney(top.revenue)}</b> ({pct(top.revenue, a.revenue)}% of revenue).
            </>
          ),
        });
      }
    }

    if (venueStats.topVenue && venueStats.usedCount > 1) {
      out.push({
        icon: <MapPin size={14} />,
        text: (
          <>
            <b>{venueStats.topVenue.name}</b> is your best venue with <b>{fmtMoney(venueStats.topVenue.revenue)}</b> across{" "}
            <b>{venueStats.topVenue.events}</b> {venueStats.topVenue.events === 1 ? "event" : "events"}.
          </>
        ),
      });
    }

    const topDay = [...a.bookingsSeries.points].sort((m, n) => n.value - m.value)[0];
    if (topDay && topDay.value > 0) {
      out.push({
        icon: <CalendarCheck size={14} />,
        text: (
          <>
            Busiest {a.bookingsSeries.bucket === "day" ? "day" : a.bookingsSeries.bucket} for bookings was <b>{topDay.label}</b> with{" "}
            <b>{topDay.value}</b>.
          </>
        ),
      });
    }

    const topWeekday = [...a.weekday].sort((m, n) => n.value - m.value)[0];
    if (topWeekday && topWeekday.value > 0) {
      out.push({
        icon: <Clock size={14} />,
        text: (
          <>
            People book most on <b>{topWeekday.label}</b> ({pct(topWeekday.value, a.b.length)}% of bookings).
          </>
        ),
      });
    }

    const topTier = a.tiers.find((t) => t.sold > 0);
    if (topTier) {
      out.push({
        icon: <TicketIcon size={14} />,
        text: (
          <>
            <b>{topTier.name}</b>
            {isAll ? <> ({eventTitleById(topTier.eventId)})</> : null} is your best seller with <b>{topTier.sold}</b> sold.
          </>
        ),
      });
    }

    const soldOut = a.tiers.filter((t) => t.qty > 0 && t.sold >= t.qty);
    if (soldOut.length) {
      out.push({
        icon: <Gauge size={14} />,
        text: (
          <>
            Sold out: <b>{soldOut.map((t) => t.name).join(", ")}</b>.
          </>
        ),
      });
    }

    if (a.methods[0]) {
      out.push({
        icon: <Wallet size={14} />,
        text: (
          <>
            <b>{a.methods[0].label}</b> brings in the most money: <b>{fmtMoney(a.methods[0].value)}</b> (
            {pct(a.methods[0].value, a.revenue)}% of revenue).
          </>
        ),
      });
    }

    if (a.uniqueBuyers > 0 && a.repeatBuyers > 0) {
      out.push({
        icon: <UserCheck size={14} />,
        text: (
          <>
            <b>{a.repeatBuyers}</b> of your <b>{a.uniqueBuyers}</b> buyers booked more than once.
          </>
        ),
      });
    }

    if (a.b.length > 0 && a.cancelled.length > 0) {
      out.push({
        icon: <AlertCircle size={14} />,
        text: (
          <>
            <b>{pct(a.cancelled.length, a.b.length)}%</b> of bookings were cancelled ({a.cancelled.length} of {a.b.length}).
          </>
        ),
      });
    }

    if (a.pendingPayments.length > 0) {
      out.push({
        icon: <Hourglass size={14} />,
        text: (
          <>
            <b>{fmtMoney(a.pendingRevenue)}</b> is still waiting in <b>{a.pendingPayments.length}</b> pending payments.
          </>
        ),
      });
    }

    const peak = [...a.hours].sort((m, n) => n.value - m.value)[0];
    if (peak && peak.value > 0) {
      out.push({
        icon: <ScanLine size={14} />,
        text: (
          <>
            Most check-ins happened around <b>{peak.label.replace("h", ":00")}</b> ({peak.value} tickets).
          </>
        ),
      });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, isAll, venueStats]);

  const orgCards = orgStats
    ? [
        { label: "Events", value: orgStats.totalEvents, icon: <Layers size={14} /> },
        { label: "Tickets sold", value: orgStats.totalTicketsSold, icon: <TicketIcon size={14} /> },
        {
          label: "Total revenue",
          value: orgStats.totalRevenue !== undefined ? fmtMoney(orgStats.totalRevenue) : undefined,
          icon: <DollarSign size={14} />,
        },
        { label: "Active scanners", value: orgStats.activeScannersCount, icon: <Users size={14} /> },
      ].filter((c) => c.value !== undefined && c.value !== null)
    : [];

  // ---------------------------------------------------------------------------
  // REPORT DOWNLOADS
  // ---------------------------------------------------------------------------
  const closeMenu = () => (document.activeElement as HTMLElement | null)?.blur();
  const fileBase = () => `analytics-${slug(scopeTitle)}-${range ? `${range}d` : "all-time"}-${new Date().toISOString().slice(0, 10)}`;

  const exportSummaryCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-summary.csv`, [
      ["Analytics summary"],
      ["Scope", scopeTitle],
      ["Period", rangeLabel],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Revenue (completed payments)", a.revenue],
      ["Pending revenue", a.pendingRevenue],
      ["Bookings", a.b.length],
      ["Confirmed bookings", a.confirmed.length],
      ["Pending bookings", a.pending.length],
      ["Cancelled bookings", a.cancelled.length],
      ["Tickets sold (confirmed bookings)", a.ticketsSold],
      ["Average order value", Math.round(a.avgOrder * 100) / 100],
      ["Tickets per booking", Math.round(a.ticketsPerBooking * 100) / 100],
      ["Unique buyers", a.uniqueBuyers],
      ["Repeat buyers", a.repeatBuyers],
      ["Confirmation rate %", confirmationRate],
      ["Payments completed", a.completedPayments.length],
      ["Payments pending", a.pendingPayments.length],
      ["Payments failed", a.failedPayments.length],
      ["Payment success rate %", paymentSuccess],
      ["Tickets issued", totalTickets],
      ["Tickets scanned", scannedTickets],
      ["Check-in rate %", checkInRate],
      ["Ticket capacity", a.totalCapacity],
      ["Capacity used %", capacityUsed],
      [],
      ["Revenue by payment method"],
      ...a.methods.map((m) => [m.label, m.value]),
    ]);
  };

  const exportEventsCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-events.csv`, [
      ["Event", "Revenue", "Bookings", "Confirmed bookings", "Tickets sold", "Tickets issued", "Scanned", "Check-in %", "Capacity", "Sold (tiers)", "Capacity used %"],
      ...sortedEvents.map((e) => [e.title, e.revenue, e.bookings, e.confirmed, e.ticketsSold, e.tickets, e.scanned, e.checkIn, e.capacity, e.sold, e.capacityUsed]),
    ]);
  };

  const exportVenuesCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-venues.csv`, [
      ["Venue", "Location", "Venue capacity", "Events", "Bookings", "Tickets sold", "Revenue", "Scanned", "Avg tickets per event", "Fill rate %"],
      ...venueStats.rows.map((v) => [v.name, v.location, v.capacity, v.events, v.bookings, v.ticketsSold, v.revenue, v.scanned, v.avgSold, v.fill]),
    ]);
  };

  const exportBookingsCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-bookings.csv`, [
      ["Booking #", "Event", "Status", "Quantity", "Total", "Guest name", "Email", "Phone", "Digital ID", "Created"],
      ...a.b.map((x) => [
        x.bookingId,
        eventTitleById(x.eventId),
        x.bookingStatus,
        x.quantity,
        x.totalAmount ?? "",
        x.guestName ?? "",
        x.guestEmail ?? "",
        x.guestPhone ?? "",
        x.digitalId ?? "",
        fmtDateTime(x.createdAt),
      ]),
    ]);
  };

  const exportPaymentsCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-payments.csv`, [
      ["Payment #", "Booking #", "Event", "Method", "Status", "Amount", "Transaction ID", "Created"],
      ...a.p.map((x: any) => [
        pId(x),
        x.bookingId,
        x._eventId ? eventTitleById(x._eventId) : "",
        x.paymentMethod ?? "",
        x.paymentStatus,
        x.amount ?? "",
        x.transactionId ?? "",
        fmtDateTime(x.createdAt),
      ]),
    ]);
  };

  const exportTicketsCsv = () => {
    closeMenu();
    const typeName = new Map<string, string>();
    types.forEach((t: any) => typeName.set(String(t.ticketTypeId || t.id || t._id), t.name));
    downloadCsv(`${fileBase()}-tickets.csv`, [
      ["Ticket #", "Event", "Ticket type", "Booking #", "Attendee", "Email", "Phone", "Scanned", "Scanned at"],
      ...tickets.map((t: any) => [
        tId(t),
        eventTitleById(t.eventId),
        typeName.get(String(t.ticketTypeId)) ?? t.ticketTypeId ?? "",
        t.bookingId,
        tName(t),
        tEmail(t),
        tPhone(t),
        tScanned(t) ? "Yes" : "No",
        fmtDateTime(t.scannedAt),
      ]),
    ]);
  };

  /** Opens the report in its own window and starts the print dialog: choose "Save as PDF". */
  const downloadPdf = () => {
    closeMenu();
    const node = reportRef.current?.firstElementChild as HTMLElement | null;
    if (!node) return;

    const win = window.open("", "_blank", "width=920,height=1100");
    if (!win) {
      setNotice("Your browser blocked the report window. Allow pop-ups for this site and try again.");
      return;
    }
    setNotice("");

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => (n.tagName === "LINK" ? `<link rel="stylesheet" href="${(n as HTMLLinkElement).href}">` : n.outerHTML))
      .join("\n");

    const title = `Analytics report - ${scopeTitle} - ${rangeLabel}`.replace(/</g, "");

    win.document.open();
    win.document.write(`<!doctype html><html data-theme="light"><head><meta charset="utf-8"><title>${title}</title>${styles}
<style>
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; color: #111827; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${node.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 900);
  };

  // ---------------------------------------------------------------------------
  // STATIC PIECES USED ONLY IN THE PDF REPORT
  // ---------------------------------------------------------------------------
  const ReportSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="break-inside-avoid flex flex-col gap-2">
      <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1">{title}</h2>
      {children}
    </section>
  );

  const ReportStat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <div className="border border-gray-300 rounded-lg p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">{label}</div>
      <div className="text-base font-black text-gray-900">{value}</div>
      {hint && <div className="text-[9px] text-gray-500">{hint}</div>}
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
            Analytics are built from your events, and events belong to an organization. Create your organization and your
            first event, then your sales, check-ins and venue insights will show up here.
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
      {/* One data loader per event in scope (renders nothing) */}
      {scopeIds.map((id) => (
        <EventDataLoader key={id} eventId={id} refreshKey={refreshKey} onData={handleData} />
      ))}

      {/* =================================================================== */}
      {/* HEADER                                                              */}
      {/* =================================================================== */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <BarChart3 size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Analytics</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Organizer</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{scopeTitle}</span>
              {isAll && ` (${scopeIds.length} ${scopeIds.length === 1 ? "event" : "events"})`} · {rangeLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          <div role="tablist" className="join self-start sm:self-auto">
            {RANGES.map((r) => (
              <button
                key={r.label}
                role="tab"
                onClick={() => setRange(r.value)}
                className={`btn btn-xs join-item font-bold ${range === r.value ? "btn-primary" : "btn-ghost bg-base-200"}`}
                aria-selected={range === r.value}
              >
                {r.label}
              </button>
            ))}
          </div>

          <select
            value={scope}
            onChange={(e) => setPickedScope(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-52 font-semibold"
          >
            <option value="all">All my events</option>
            {rawEvents.map((ev: any) => {
              const id = getEventId(ev);
              return (
                <option key={id} value={id}>
                  {ev.title}
                </option>
              );
            })}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshKey((k) => k + 1);
                paymentsQ.refetch();
                venuesQ.refetch();
              }}
              className="btn btn-ghost btn-sm btn-square rounded-xl bg-base-200"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>

            <div className="dropdown dropdown-end">
              <button tabIndex={0} className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm">
                <Download size={14} />
                <span>Export</span>
              </button>
              <ul
                tabIndex={0}
                className="dropdown-content menu menu-sm z-30 mt-2 w-64 p-2 shadow-xl bg-base-100 border border-base-200 rounded-2xl"
              >
                <li className="menu-title text-[10px] uppercase tracking-widest">Report</li>
                <li>
                  <button onClick={downloadPdf} disabled={isLoading} className="text-xs font-semibold">
                    <FileText size={14} className="text-primary" /> PDF report (full)
                  </button>
                </li>
                <li className="menu-title text-[10px] uppercase tracking-widest mt-1">Spreadsheets (CSV)</li>
                <li>
                  <button onClick={exportSummaryCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Summary
                  </button>
                </li>
                <li>
                  <button onClick={exportEventsCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Events breakdown
                  </button>
                </li>
                <li>
                  <button onClick={exportVenuesCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Venues breakdown
                  </button>
                </li>
                <li>
                  <button onClick={exportBookingsCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Bookings
                  </button>
                </li>
                <li>
                  <button onClick={exportPaymentsCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Payments
                  </button>
                </li>
                <li>
                  <button onClick={exportTicketsCsv} disabled={isLoading} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Tickets
                  </button>
                </li>
              </ul>
            </div>
          </div>
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
              <span className="font-bold text-base-content">Analytics Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Everything here comes from <b>your own events and venues</b> only. See every event together with{" "}
                <b>All my events</b>, or pick a single event. The time range applies to bookings, payments and revenue, while
                ticket tiers and check-in figures show current totals. Use <b>Export</b> to save a PDF report (choose "Save as
                PDF" in the print window) or download spreadsheets for bookings, payments, tickets, venues and the per-event
                breakdown.
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

      {/* Organization overview strip */}
      {orgCards.length > 0 && (
        <div className="bg-base-200/40 border border-base-200 rounded-2xl p-3 sm:p-4 flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
            <Building2 size={11} /> Across your whole organization
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {orgCards.map((c) => (
              <div key={c.label} className="flex items-center gap-2.5">
                <span className="p-1.5 bg-base-100 text-primary rounded-lg shrink-0">{c.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-base-content truncate">{c.value}</span>
                  <span className="text-[10px] text-base-content/50">{c.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status messages */}
      {isLoading && scopeIds.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-base-200/40 border border-base-200 rounded-2xl p-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-base-content/70">
            <span>
              Loading data for {Math.min(loadedCount, scopeIds.length)} of {scopeIds.length}{" "}
              {scopeIds.length === 1 ? "event" : "events"}…
            </span>
          </div>
          <progress className="progress progress-primary w-full h-1.5" value={loadedCount} max={Math.max(scopeIds.length, 1)}></progress>
        </div>
      )}

      {(failedCount > 0 || paymentsQ.isError) && (
        <div className="alert alert-warning text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>
            {failedCount > 0 && `${failedCount} ${failedCount === 1 ? "event" : "events"} could not be loaded. `}
            {paymentsQ.isError && "Payments could not be loaded. "}
            The figures below only include the data that loaded. Try the refresh button.
          </span>
        </div>
      )}

      {notice && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
          <AlertCircle size={16} />
          <span>{notice}</span>
        </div>
      )}

      {!isLoading && scopeIds.length === 0 && (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <BarChart3 size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No Events Yet</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">Create an event to start seeing analytics.</p>
        </div>
      )}

      {/* =================================================================== */}
      {/* KPI CARDS                                                           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi index={0} label="Revenue" value={fmtMoney(a.revenue)} hint={`${a.completedPayments.length} completed payments`} icon={<DollarSign size={18} />} tone="success" />
        <Kpi index={1} label="Bookings" value={String(a.b.length)} hint={`${a.confirmed.length} confirmed · ${a.pending.length} pending`} icon={<CalendarCheck size={18} />} />
        <Kpi index={2} label="Tickets Sold" value={String(a.ticketsSold)} hint="From confirmed bookings" icon={<TicketIcon size={18} />} />
        <Kpi index={3} label="Avg. Order Value" value={fmtMoney(a.avgOrder)} hint="Per completed payment" icon={<Receipt size={18} />} tone="warning" />

        <Kpi index={4} label="Confirmation Rate" value={`${confirmationRate}%`} hint={`${a.confirmed.length} of ${a.b.length} bookings`} icon={<Percent size={18} />} />
        <Kpi
          index={5}
          label="Payment Success"
          value={`${paymentSuccess}%`}
          hint={`${a.failedPayments.length} failed · ${a.pendingPayments.length} pending`}
          icon={<CheckCircle2 size={18} />}
          tone={a.p.length > 0 && paymentSuccess < 60 ? "error" : "success"}
        />
        <Kpi index={6} label="Check-in Rate" value={`${checkInRate}%`} hint={`${scannedTickets} of ${totalTickets} scanned`} icon={<ScanLine size={18} />} />
        <Kpi index={7} label="Capacity Used" value={`${capacityUsed}%`} hint={`${a.totalSoldTiers} of ${a.totalCapacity} tickets`} icon={<Gauge size={18} />} tone="warning" />

        <Kpi index={8} label="Pending Revenue" value={fmtMoney(a.pendingRevenue)} hint={`${a.pendingPayments.length} payments waiting`} icon={<Hourglass size={18} />} tone="warning" />
        <Kpi index={9} label="Unique Buyers" value={String(a.uniqueBuyers)} hint={`${a.repeatBuyers} repeat buyers`} icon={<UserCheck size={18} />} />
        <Kpi index={10} label="Tickets / Booking" value={(Math.round(a.ticketsPerBooking * 10) / 10).toString()} hint="Average group size" icon={<Users size={18} />} />
        <Kpi
          index={11}
          label="Cancelled Bookings"
          value={String(a.cancelled.length)}
          hint={`${pct(a.cancelled.length, a.b.length)}% of bookings`}
          icon={<AlertCircle size={18} />}
          tone={a.cancelled.length > 0 ? "error" : "success"}
        />
      </div>

      {/* =================================================================== */}
      {/* REVENUE + BOOKING STATUS                                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Revenue over time" subtitle={`Completed payments · per ${a.revenueSeries.bucket}`} icon={<TrendingUp size={16} />} className="lg:col-span-2">
          {isLoading ? PANEL_SKELETON : <AreaChart data={a.revenueSeries.points} format={fmtMoneyCompact} colorClass="text-success" />}
        </Panel>

        <Panel title="Booking status" subtitle={rangeLabel} icon={<CalendarCheck size={16} />}>
          {isLoading ? (
            PANEL_SKELETON
          ) : (
            <Donut
              centerValue={String(a.b.length)}
              centerLabel="bookings"
              segments={[
                { label: "Confirmed", value: a.confirmed.length, color: "text-success" },
                { label: "Pending", value: a.pending.length, color: "text-warning" },
                { label: "Cancelled", value: a.cancelled.length, color: "text-error" },
              ]}
            />
          )}
        </Panel>
      </div>

      {/* =================================================================== */}
      {/* BOOKINGS + PAYMENT METHODS                                          */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Bookings over time" subtitle={`New bookings · per ${a.bookingsSeries.bucket}`} icon={<CalendarCheck size={16} />} className="lg:col-span-2">
          {isLoading ? PANEL_SKELETON : <BarChart data={a.bookingsSeries.points} format={(v) => String(Math.round(v))} />}
        </Panel>

        <Panel title="Revenue by payment method" subtitle={rangeLabel} icon={<Wallet size={16} />}>
          {isLoading ? (
            PANEL_SKELETON
          ) : (
            <Donut
              centerValue={fmtMoneyCompact(a.revenue)}
              centerLabel="total"
              format={fmtMoney}
              segments={a.methods.map((m, i) => ({
                label: m.label,
                value: m.value,
                color: ["text-primary", "text-secondary", "text-accent", "text-info", "text-warning"][i % 5],
              }))}
            />
          )}
        </Panel>
      </div>

      {/* =================================================================== */}
      {/* WEEKDAY PATTERN + BUYERS                                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Bookings by day of the week" subtitle="When people tend to book" icon={<Clock size={16} />} className="lg:col-span-2">
          {isLoading ? PANEL_SKELETON : <BarChart data={a.weekday} format={(v) => String(Math.round(v))} colorClass="text-accent" labelEvery={1} />}
        </Panel>

        <Panel title="Guests vs registered buyers" subtitle="Excluding cancelled bookings" icon={<Users size={16} />}>
          {isLoading ? (
            PANEL_SKELETON
          ) : (
            <Donut
              centerValue={String(a.registered + a.guests)}
              centerLabel="bookings"
              segments={[
                { label: "Registered users", value: a.registered, color: "text-primary" },
                { label: "Guest checkout", value: a.guests, color: "text-secondary" },
              ]}
            />
          )}
        </Panel>
      </div>

      {/* =================================================================== */}
      {/* EVENT COMPARISON (all events)                                       */}
      {/* =================================================================== */}
      {isAll && scopeIds.length > 0 && (
        <Panel title="Event leaderboard" subtitle="Compare how each of your events is doing" icon={<Trophy size={16} />}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-base-content/50">{sortedEvents.length} events</span>
            <label className="flex items-center gap-1.5 text-[11px] text-base-content/60">
              <span>Sort by</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="select select-bordered select-xs rounded-lg font-semibold"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            PANEL_SKELETON
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="table table-sm w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-base-content/60 border-b border-base-200">
                    <th className="font-bold w-8">#</th>
                    <th className="font-bold">Event</th>
                    <th className="font-bold">Revenue</th>
                    <th className="font-bold">Bookings</th>
                    <th className="font-bold">Tickets sold</th>
                    <th className="font-bold">Capacity used</th>
                    <th className="font-bold">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((e, i) => (
                    <tr key={e.id} className="hover:bg-base-200/30 border-b border-base-100">
                      <td className="font-bold text-base-content/40">{i + 1}</td>
                      <td className="font-bold text-base-content max-w-[220px] truncate">{e.title}</td>
                      <td className="min-w-[150px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-success">{fmtMoney(e.revenue)}</span>
                          <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                            <div className="h-full rounded-full bg-success" style={{ width: `${pct(e.revenue, maxEventRevenue)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold text-base-content/70">
                        {e.bookings} <span className="text-[10px] text-base-content/40">({e.confirmed} confirmed)</span>
                      </td>
                      <td className="font-semibold text-base-content/70">{e.ticketsSold}</td>
                      <td className="min-w-[110px]">
                        <div className="flex items-center gap-2">
                          <progress className="progress progress-primary w-16 h-1.5" value={e.capacityUsed} max={100}></progress>
                          <span className="font-semibold text-base-content/70">{e.capacityUsed}%</span>
                        </div>
                      </td>
                      <td className="font-semibold text-base-content/70">
                        {e.checkIn}% <span className="text-[10px] text-base-content/40">({e.scanned}/{e.tickets})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {a.unmatchedRevenue > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="text-[10px] text-base-content/50 pt-2">
                        Plus {fmtMoney(a.unmatchedRevenue)} in completed payments that could not be matched to one of the events above.
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* =================================================================== */}
      {/* VENUE PERFORMANCE                                                   */}
      {/* =================================================================== */}
      <Panel
        title="Venue performance"
        subtitle={isAll ? "How each of your venues is doing across its events" : "The venue used by this event"}
        icon={<MapPin size={16} />}
      >
        {isLoading || venuesQ.isLoading ? (
          PANEL_SKELETON
        ) : venuesQ.isError ? (
          <div className="alert alert-warning text-xs font-semibold py-2 rounded-xl">
            <AlertCircle size={16} />
            <span>Venues could not be loaded. Try the refresh button.</span>
          </div>
        ) : venueStats.rows.length === 0 ? (
          <ChartEmpty text={venues.length === 0 ? "No venues yet" : "This event has no venue assigned"} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-base-200/50 p-2.5">
                <span className="block text-sm font-black text-base-content">{venueStats.usedCount}</span>
                <span className="text-[10px] text-base-content/50">Venues in use</span>
              </div>
              <div className="rounded-xl bg-base-200/50 p-2.5 min-w-0">
                <span className="block text-sm font-black text-base-content truncate">{venueStats.topVenue?.name ?? "—"}</span>
                <span className="text-[10px] text-base-content/50">Top venue</span>
              </div>
              <div className="rounded-xl bg-base-200/50 p-2.5">
                <span className="block text-sm font-black text-base-content">{venueStats.avgFill}%</span>
                <span className="text-[10px] text-base-content/50">Avg. fill rate</span>
              </div>
              <div className="rounded-xl bg-base-200/50 p-2.5">
                <span className="block text-sm font-black text-base-content">{venueStats.noVenueEvents}</span>
                <span className="text-[10px] text-base-content/50">Events without a venue</span>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="table table-sm w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-base-content/60 border-b border-base-200">
                    <th className="font-bold w-8">#</th>
                    <th className="font-bold">Venue</th>
                    <th className="font-bold">Events</th>
                    <th className="font-bold">Revenue</th>
                    <th className="font-bold">Tickets sold</th>
                    <th className="font-bold">Capacity</th>
                    <th className="font-bold">Fill rate</th>
                  </tr>
                </thead>
                <tbody>
                  {venueStats.rows.map((v, i) => (
                    <tr key={v.id} className={`hover:bg-base-200/30 border-b border-base-100 ${v.events === 0 ? "opacity-60" : ""}`}>
                      <td className="font-bold text-base-content/40">{i + 1}</td>
                      <td className="max-w-[220px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-base-content truncate">{v.name}</span>
                          {v.location && <span className="text-[10px] text-base-content/40 truncate">{v.location}</span>}
                        </div>
                      </td>
                      <td className="font-semibold text-base-content/70">{v.events}</td>
                      <td className="min-w-[150px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-success">{fmtMoney(v.revenue)}</span>
                          <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                            <div className="h-full rounded-full bg-success" style={{ width: `${pct(v.revenue, maxVenueRevenue)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold text-base-content/70">
                        {v.ticketsSold} <span className="text-[10px] text-base-content/40">({v.avgSold}/event)</span>
                      </td>
                      <td className="font-semibold text-base-content/70">{v.capacity.toLocaleString()}</td>
                      <td className="min-w-[110px]">
                        <div className="flex items-center gap-2">
                          <progress className="progress progress-primary w-16 h-1.5" value={Math.min(v.fill, 100)} max={100}></progress>
                          <span className="font-semibold text-base-content/70">{v.fill}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {venueStats.noVenueRevenue > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="text-[10px] text-base-content/50 pt-2">
                        Plus {fmtMoney(venueStats.noVenueRevenue)} from events that have no venue assigned.
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-[10px] text-base-content/40">
              Fill rate = tickets sold ÷ (venue capacity × number of events held there), for the selected period.
            </p>
          </div>
        )}
      </Panel>

      {/* =================================================================== */}
      {/* TICKET TIERS + CHECK-IN                                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Ticket tier performance" subtitle="Sold vs available, with estimated revenue" icon={<TicketIcon size={16} />} className="lg:col-span-2">
          {isLoading ? (
            PANEL_SKELETON
          ) : a.tiers.length === 0 ? (
            <ChartEmpty text="No ticket types yet" />
          ) : (
            <div className="flex flex-col gap-4">
              {visibleTiers.map((t, i) => {
                const used = pct(t.sold, t.qty);
                const full = t.qty > 0 && t.sold >= t.qty;
                return (
                  <div key={`${t.eventId}-${t.name}-${i}`} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-base-content truncate">{t.name}</span>
                        {isAll && <span className="text-[10px] text-base-content/40 truncate">· {eventTitleById(t.eventId)}</span>}
                        {full && <span className="badge badge-error badge-xs font-bold text-error-content shrink-0">Sold out</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[11px]">
                        <span className="text-base-content/60">
                          <b className="text-base-content">{t.sold}</b> / {t.qty}
                        </span>
                        <span className="font-bold text-success">{fmtMoney(t.revenue)}</span>
                      </div>
                    </div>
                    <progress className={`progress w-full h-2 ${full ? "progress-error" : used >= 75 ? "progress-warning" : "progress-primary"}`} value={used} max={100}></progress>
                    <span className="text-[10px] text-base-content/40">
                      {fmtMoney(t.price)} each · {used}% sold
                    </span>
                  </div>
                );
              })}
              {a.tiers.length > 6 && (
                <button onClick={() => setShowAllTiers(!showAllTiers)} className="btn btn-ghost btn-xs self-center text-primary font-bold">
                  {showAllTiers ? "Show fewer" : `Show all ${a.tiers.length} tiers`}
                </button>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Gate check-in" subtitle="Scanned vs not yet scanned" icon={<ScanLine size={16} />}>
          {isLoading ? (
            PANEL_SKELETON
          ) : (
            <div className="flex flex-col gap-4">
              <Donut
                centerValue={`${checkInRate}%`}
                centerLabel="checked in"
                segments={[
                  { label: "Scanned", value: scannedTickets, color: "text-success" },
                  { label: "Not scanned", value: notScanned, color: "text-base-300" },
                ]}
              />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-base-200/50 p-2.5">
                  <span className="block text-sm font-black text-base-content">{a.assigned}</span>
                  <span className="text-[10px] text-base-content/50">Tickets assigned</span>
                </div>
                <div className="rounded-xl bg-base-200/50 p-2.5">
                  <span className="block text-sm font-black text-base-content">{Math.max(tickets.length - a.assigned, 0)}</span>
                  <span className="text-[10px] text-base-content/50">Unassigned</span>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* =================================================================== */}
      {/* CHECK-IN BY HOUR + HIGHLIGHTS                                       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Check-ins by hour" subtitle="When attendees were scanned in" icon={<Clock size={16} />} className="lg:col-span-2">
          {isLoading ? PANEL_SKELETON : <BarChart data={a.hours} format={(v) => String(Math.round(v))} colorClass="text-secondary" labelEvery={3} />}
        </Panel>

        <Panel title="Highlights" subtitle="What stands out" icon={<Sparkles size={16} />}>
          {isLoading ? (
            PANEL_SKELETON
          ) : highlights.length === 0 ? (
            <ChartEmpty text="Highlights appear once there is activity" />
          ) : (
            <ul className="flex flex-col gap-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-base-content/80 leading-relaxed">
                  <span className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">{h.icon}</span>
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* =================================================================== */}
      {/* PDF REPORT (hidden on screen, copied into the print window)         */}
      {/* =================================================================== */}
      <div ref={reportRef} className="hidden" aria-hidden="true">
        <div className="bg-white text-gray-900 font-sans p-6 flex flex-col gap-5 max-w-3xl mx-auto text-[11px]">
          <header className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-3">
            <div>
              <h1 className="text-xl font-black tracking-tight">Event Analytics Report</h1>
              <p className="text-gray-600 mt-0.5">
                {scopeTitle}
                {isAll && ` · ${scopeIds.length} ${scopeIds.length === 1 ? "event" : "events"}`}
              </p>
            </div>
            <div className="text-right text-gray-600">
              <div className="font-bold text-gray-900">{rangeLabel}</div>
              <div>Generated {new Date().toLocaleString()}</div>
              {user?.firstName && <div>For {user.firstName}</div>}
            </div>
          </header>

          <ReportSection title="Summary">
            <div className="grid grid-cols-4 gap-2">
              <ReportStat label="Revenue" value={fmtMoney(a.revenue)} hint={`${a.completedPayments.length} payments`} />
              <ReportStat label="Bookings" value={String(a.b.length)} hint={`${a.confirmed.length} confirmed`} />
              <ReportStat label="Tickets sold" value={String(a.ticketsSold)} />
              <ReportStat label="Avg. order" value={fmtMoney(a.avgOrder)} />
              <ReportStat label="Confirmation rate" value={`${confirmationRate}%`} />
              <ReportStat label="Payment success" value={`${paymentSuccess}%`} hint={`${a.failedPayments.length} failed`} />
              <ReportStat label="Check-in rate" value={`${checkInRate}%`} hint={`${scannedTickets}/${totalTickets}`} />
              <ReportStat label="Capacity used" value={`${capacityUsed}%`} hint={`${a.totalSoldTiers}/${a.totalCapacity}`} />
              <ReportStat label="Pending revenue" value={fmtMoney(a.pendingRevenue)} hint={`${a.pendingPayments.length} payments`} />
              <ReportStat label="Unique buyers" value={String(a.uniqueBuyers)} hint={`${a.repeatBuyers} repeat`} />
              <ReportStat label="Tickets / booking" value={(Math.round(a.ticketsPerBooking * 10) / 10).toString()} />
              <ReportStat label="Cancelled" value={String(a.cancelled.length)} hint={`${pct(a.cancelled.length, a.b.length)}%`} />
            </div>
          </ReportSection>

          {highlights.length > 0 && (
            <ReportSection title="Highlights">
              <ul className="flex flex-col gap-1.5 list-disc pl-4">
                {highlights.map((h, i) => (
                  <li key={i}>{h.text}</li>
                ))}
              </ul>
            </ReportSection>
          )}

          <ReportSection title={`Revenue over time (per ${a.revenueSeries.bucket})`}>
            <AreaChart data={a.revenueSeries.points} format={fmtMoneyCompact} colorClass="text-green-600" />
          </ReportSection>

          <ReportSection title={`Bookings over time (per ${a.bookingsSeries.bucket})`}>
            <BarChart data={a.bookingsSeries.points} format={(v) => String(Math.round(v))} colorClass="text-blue-600" />
          </ReportSection>

          <div className="grid grid-cols-2 gap-5">
            <ReportSection title="Booking status">
              <table className="w-full">
                <tbody>
                  {[
                    ["Confirmed", a.confirmed.length],
                    ["Pending", a.pending.length],
                    ["Cancelled", a.cancelled.length],
                  ].map(([l, v]) => (
                    <tr key={l as string} className="border-b border-gray-200">
                      <td className="py-1">{l}</td>
                      <td className="py-1 text-right font-bold">{v}</td>
                      <td className="py-1 text-right text-gray-500 w-12">{pct(Number(v), a.b.length)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            <ReportSection title="Revenue by payment method">
              <table className="w-full">
                <tbody>
                  {a.methods.length === 0 && (
                    <tr>
                      <td className="py-1 text-gray-500">No completed payments</td>
                    </tr>
                  )}
                  {a.methods.map((m) => (
                    <tr key={m.label} className="border-b border-gray-200">
                      <td className="py-1">{m.label}</td>
                      <td className="py-1 text-right font-bold">{fmtMoney(m.value)}</td>
                      <td className="py-1 text-right text-gray-500 w-12">{pct(m.value, a.revenue)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          </div>

          {isAll && (
            <ReportSection title="Event leaderboard">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-400 text-gray-600">
                    <th className="py-1">Event</th>
                    <th className="py-1 text-right">Revenue</th>
                    <th className="py-1 text-right">Bookings</th>
                    <th className="py-1 text-right">Tickets</th>
                    <th className="py-1 text-right">Capacity</th>
                    <th className="py-1 text-right">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((e) => (
                    <tr key={e.id} className="border-b border-gray-200">
                      <td className="py-1 font-bold">{e.title}</td>
                      <td className="py-1 text-right">{fmtMoney(e.revenue)}</td>
                      <td className="py-1 text-right">{e.bookings}</td>
                      <td className="py-1 text-right">{e.ticketsSold}</td>
                      <td className="py-1 text-right">{e.capacityUsed}%</td>
                      <td className="py-1 text-right">{e.checkIn}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          )}

          <ReportSection title="Venue performance">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-400 text-gray-600">
                  <th className="py-1">Venue</th>
                  <th className="py-1 text-right">Events</th>
                  <th className="py-1 text-right">Capacity</th>
                  <th className="py-1 text-right">Tickets sold</th>
                  <th className="py-1 text-right">Revenue</th>
                  <th className="py-1 text-right">Fill rate</th>
                </tr>
              </thead>
              <tbody>
                {venueStats.rows.length === 0 && (
                  <tr>
                    <td className="py-1 text-gray-500" colSpan={6}>
                      No venues
                    </td>
                  </tr>
                )}
                {venueStats.rows.map((v) => (
                  <tr key={v.id} className="border-b border-gray-200">
                    <td className="py-1 font-bold">
                      {v.name}
                      {v.location && <span className="font-normal text-gray-500"> · {v.location}</span>}
                    </td>
                    <td className="py-1 text-right">{v.events}</td>
                    <td className="py-1 text-right">{v.capacity.toLocaleString()}</td>
                    <td className="py-1 text-right">{v.ticketsSold}</td>
                    <td className="py-1 text-right">{fmtMoney(v.revenue)}</td>
                    <td className="py-1 text-right">{v.fill}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>

          <ReportSection title="Ticket tiers">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-400 text-gray-600">
                  <th className="py-1">Tier</th>
                  {isAll && <th className="py-1">Event</th>}
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Sold</th>
                  <th className="py-1 text-right">Capacity</th>
                  <th className="py-1 text-right">% sold</th>
                  <th className="py-1 text-right">Est. revenue</th>
                </tr>
              </thead>
              <tbody>
                {a.tiers.length === 0 && (
                  <tr>
                    <td className="py-1 text-gray-500" colSpan={7}>
                      No ticket types
                    </td>
                  </tr>
                )}
                {a.tiers.map((t, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1 font-bold">{t.name}</td>
                    {isAll && <td className="py-1 text-gray-600">{eventTitleById(t.eventId)}</td>}
                    <td className="py-1 text-right">{fmtMoney(t.price)}</td>
                    <td className="py-1 text-right">{t.sold}</td>
                    <td className="py-1 text-right">{t.qty}</td>
                    <td className="py-1 text-right">{pct(t.sold, t.qty)}%</td>
                    <td className="py-1 text-right">{fmtMoney(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>

          <div className="grid grid-cols-2 gap-5">
            <ReportSection title="Bookings by day of the week">
              <BarChart data={a.weekday} format={(v) => String(Math.round(v))} colorClass="text-purple-600" labelEvery={1} />
            </ReportSection>
            <ReportSection title="Check-ins by hour">
              <BarChart data={a.hours} format={(v) => String(Math.round(v))} colorClass="text-orange-600" labelEvery={3} />
            </ReportSection>
          </div>

          <footer className="border-t border-gray-300 pt-2 text-[9px] text-gray-500 flex justify-between">
            <span>Revenue counts completed payments only. Tier revenue is estimated as sold × price.</span>
            <span>Generated from your organizer dashboard</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsManager;