import { useState, useMemo, useRef, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FileBarChart,
  Download,
  FileText,
  FileSpreadsheet,
  Building2,
  Plus,
  AlertCircle,
  Info,
  RefreshCw,
  DollarSign,
  Ticket as TicketIcon,
  CalendarCheck,
  Receipt,
  ScanLine,
  Hourglass,
  Users,
  UserCheck,
  XCircle,
  TrendingUp,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { type RootState } from "../../App/store";
import { useGetBookingsByEventIdQuery, type Booking } from "../../features/APIS/BookingsApi";
import { useGetPaymentsByOrgIdQuery, type Payment } from "../../features/APIS/PaymentApi";
import { useGetTicketsByEventIdQuery, type Ticket } from "../../features/APIS/ticketsApi";
import { useGetTicketTypesByEventIdQuery } from "../../features/APIS/ticketsType.Api";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";
import ModalShell from "../../components/ModalShell";

// Change this to match the currency used on your other pages
const CURRENCY = "KSH";

// Long tables in the report are capped so the PDF stays a sensible length
const MAX_ROWS = 100;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// What the organizer can choose to include in the PDF (the cover band is always included)
const PDF_OPTIONS: { id: string; label: string; hint: string }[] = [
  { id: "summary", label: "Summary numbers", hint: "Revenue, tickets, bookings, order values and rates" },
  { id: "highlights", label: "Highlights", hint: "Plain-language findings about this event" },
  { id: "timeline", label: "Sales over time", hint: "First and latest sale, best day, daily sales" },
  { id: "ticketTypes", label: "Sales by ticket type", hint: "Price, tickets sold, capacity and revenue per type" },
  { id: "payments", label: "Payments overview", hint: "Completed, pending and failed, plus payment methods" },
  { id: "buyers", label: "Bookings and buyers", hint: "Booking status, buyer mix, top buyers" },
  { id: "checkin", label: "Tickets and check-in", hint: "Issued, assigned and scanned tickets" },
  { id: "paymentRecords", label: "Payment records", hint: "The list of individual payments" },
  { id: "bookingRecords", label: "Booking records", hint: "The list of individual bookings" },
  { id: "charts", label: "Charts and graphs", hint: "Turn off to leave out every chart in the report" },
];
const ALL_PDF_IDS = PDF_OPTIONS.map((o) => o.id);
const PDF_OVERVIEW = ["summary", "highlights", "timeline", "ticketTypes", "payments", "charts"];
const PDF_RECORDS = ["paymentRecords", "bookingRecords"];

// ---------------------------------------------------------------------------
// HELPERS
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
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "");
const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const toArray = <T,>(d: any, key?: string): T[] =>
  Array.isArray(d) ? d : key && Array.isArray(d?.[key]) ? d[key] : Array.isArray(d?.data) ? d.data : [];

const tScanned = (t: any): boolean => Boolean(t.isScanned ?? t.scanned ?? t.scannedAt);
const tAssigned = (t: any): boolean =>
  Boolean(t.isAssigned ?? (t.attendeeName || t.attendeeEmail || t.attendeePhone || t.holderId));
const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;
const typeIdOf = (t: any) => String(t?.ticketTypeId ?? t?.id ?? t?._id ?? "");
const pId = (p: any) => p.paymentId ?? p.id;

const niceCeil = (max: number) => {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

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
// THEME TONES (all colors come from your daisyUI theme, nothing is hard-coded)
// ---------------------------------------------------------------------------
type Tone = "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info";

const TONE_CHIP: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
};
const TONE_BORDER: Record<Tone, string> = {
  primary: "border-l-primary",
  secondary: "border-l-secondary",
  accent: "border-l-accent",
  success: "border-l-success",
  warning: "border-l-warning",
  error: "border-l-error",
  info: "border-l-info",
};
const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};
const TONE_TEXT: Record<Tone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};
const TONE_CYCLE: Tone[] = ["primary", "secondary", "accent", "info", "warning"];

// ---------------------------------------------------------------------------
// CHARTS (plain SVG, colored with your theme through currentColor)
// ---------------------------------------------------------------------------
interface Point {
  label: string;
  value: number;
}
const CW = 600;
const CH = 190;
const PAD = { l: 48, r: 12, t: 14, b: 26 };

const ChartEmpty = ({ text }: { text: string }) => (
  <div className="py-8 flex flex-col items-center justify-center gap-1 text-base-content/40">
    <FileBarChart size={24} />
    <span className="text-[11px] font-semibold">{text}</span>
  </div>
);

const Grid = ({ niceMax, y, format }: { niceMax: number; y: (v: number) => number; format: (v: number) => string }) => (
  <>
    {[0, 0.5, 1].map((f) => (
      <g key={f}>
        <line
          x1={PAD.l}
          x2={CW - PAD.r}
          y1={y(niceMax * f)}
          y2={y(niceMax * f)}
          stroke="currentColor"
          className="text-base-300"
          strokeDasharray="3 4"
        />
        <text x={PAD.l - 6} y={y(niceMax * f) + 3} textAnchor="end" className="fill-base-content/50" fontSize="10">
          {format(niceMax * f)}
        </text>
      </g>
    ))}
  </>
);

const Bars = ({
  data,
  format,
  colorClass = "text-primary",
  emptyText = "No data yet",
}: {
  data: Point[];
  format: (v: number) => string;
  colorClass?: string;
  emptyText?: string;
}) => {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) return <ChartEmpty text={emptyText} />;
  const niceMax = niceCeil(max);
  const band = (CW - PAD.l - PAD.r) / data.length;
  const bw = Math.min(band * 0.62, 34);
  const y = (v: number) => PAD.t + (1 - v / niceMax) * (CH - PAD.t - PAD.b);
  const step = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${CW} ${CH}`} className={`w-full h-auto min-w-[460px] sm:min-w-0 ${colorClass}`}>
      <Grid niceMax={niceMax} y={y} format={format} />
      {data.map((d, i) => {
        const h = Math.max(CH - PAD.b - y(d.value), d.value > 0 ? 2 : 0);
        const cx = PAD.l + band * i + band / 2;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={CH - PAD.b - h} width={bw} height={h} rx="4" fill="currentColor" opacity="0.9" />
            {i % step === 0 && (
              <text x={cx} y={CH - 8} textAnchor="middle" className="fill-base-content/50" fontSize="10">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
    </div>
  );
};

const AreaLine = ({
  data,
  format,
  colorClass = "text-success",
  emptyText = "No data yet",
}: {
  data: Point[];
  format: (v: number) => string;
  colorClass?: string;
  emptyText?: string;
}) => {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) return <ChartEmpty text={emptyText} />;
  const niceMax = niceCeil(max);
  const x = (i: number) => PAD.l + (data.length <= 1 ? 0.5 : i / (data.length - 1)) * (CW - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / niceMax) * (CH - PAD.t - PAD.b);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${CH - PAD.b} L${x(0)},${CH - PAD.b} Z`;
  const step = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${CW} ${CH}`} className={`w-full h-auto min-w-[460px] sm:min-w-0 ${colorClass}`}>
      <Grid niceMax={niceMax} y={y} format={format} />
      <path d={area} fill="currentColor" opacity="0.15" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.length <= 40 &&
        data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="2.5" fill="currentColor" />)}
      {data.map(
        (d, i) =>
          i % step === 0 && (
            <text key={i} x={x(i)} y={CH - 8} textAnchor="middle" className="fill-base-content/50" fontSize="10">
              {d.label}
            </text>
          )
      )}
    </svg>
    </div>
  );
};

/** One horizontal bar split into colored parts, with a legend underneath. */
const ShareBar = ({
  parts,
  format = (v: number) => String(v),
}: {
  parts: { label: string; value: number; tone: Tone }[];
  format?: (v: number) => string;
}) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <p className="text-[11px] text-base-content/50">Nothing to show yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-base-200">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.label} className={TONE_BG[p.tone]} style={{ width: `${(p.value / total) * 100}%` }} />
          ))}
      </div>
      <ul className="flex flex-col gap-1">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-[11px]">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONE_BG[p.tone]}`} />
            <span className="flex-1 truncate text-base-content/80">{p.label}</span>
            <span className="font-bold text-base-content">{format(p.value)}</span>
            <span className="w-10 text-right text-base-content/50">{pct(p.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** A labelled progress bar, used for the funnels and ticket type fill. */
const MeterRow = ({
  label,
  value,
  of,
  tone = "primary",
  right,
}: {
  label: string;
  value: number;
  of: number;
  tone?: Tone;
  right?: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="font-semibold text-base-content truncate">{label}</span>
      <span className="text-base-content/60 shrink-0">
        {right ?? (
          <>
            <b className="text-base-content">{value}</b> / {of} · {pct(value, of)}%
          </>
        )}
      </span>
    </div>
    <div className="h-2 rounded-full bg-base-200 overflow-hidden">
      <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${Math.min(pct(value, of), 100)}%` }} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// REPORT LAYOUT PIECES
// ---------------------------------------------------------------------------
const Section = ({
  id,
  title,
  subtitle,
  tone = "primary",
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  children: ReactNode;
}) => (
  <section data-section={id} className="break-inside-avoid flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-base-300 pb-1.5">
      <span className={`w-1.5 h-4 rounded-full ${TONE_BG[tone]}`} />
      <h2 className="text-[11px] font-black uppercase tracking-wider text-base-content">{title}</h2>
      {subtitle && <span className="text-[10px] text-base-content/50 ml-auto">{subtitle}</span>}
    </div>
    {children}
  </section>
);

const Stat = ({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
}) => (
  <div className={`bg-base-100 border border-base-200 border-l-4 ${TONE_BORDER[tone]} rounded-xl p-3 flex items-start justify-between gap-2`}>
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-base-content/50 font-bold">{label}</div>
      <div className="text-base font-black text-base-content truncate">{value}</div>
      {hint && <div className="text-[9px] text-base-content/50">{hint}</div>}
    </div>
    {icon && <span className={`p-1.5 rounded-lg shrink-0 ${TONE_CHIP[tone]}`}>{icon}</span>}
  </div>
);

const Pill = ({ tone, children }: { tone: Tone | "ghost"; children: ReactNode }) => (
  <span
    className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
      tone === "ghost" ? "bg-base-200 text-base-content/70" : TONE_CHIP[tone]
    }`}
  >
    {children}
  </span>
);

const statusTone = (s?: string): Tone | "ghost" =>
  s === "Confirmed" || s === "Completed" ? "success" : s === "Pending" ? "warning" : s === "Cancelled" || s === "Failed" ? "error" : "ghost";

const TH = "py-1.5 px-2 font-bold text-base-content/60";
const TD = "py-1.5 px-2";

// ===========================================================================
// PAGE
// ===========================================================================
export const EventSalesReport = () => {
  usePageTitle("Event Sales Report");

  const user = useSelector((state: RootState) => state.auth.user) as any;
  const { orgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();

  // ---------------------------------------------------------------------------
  // EVENT PICKER (only this organization's events)
  // ---------------------------------------------------------------------------
  const { data: eventsData, isLoading: eventsLoading } = useGetEventsByOrganizationQuery(orgId as number, {
    skip: !orgId,
  });
  const rawEvents = useMemo(() => toArray<any>(eventsData), [eventsData]);

  const [pickedEventId, setPickedEventId] = useState<string>("");
  const selectedEventId = pickedEventId || (rawEvents.length > 0 ? String(getEventId(rawEvents[0])) : "");
  const numericEventId = Number(selectedEventId);
  const skipEvent = !numericEventId || isNaN(numericEventId);

  const activeEvent = rawEvents.find((ev: any) => String(getEventId(ev)) === String(selectedEventId));
  const eventTitle: string = activeEvent?.title || `Event #${selectedEventId}`;
  const eventDate: string | undefined = activeEvent?.startDate || activeEvent?.eventDate || activeEvent?.date;
  const eventLocation: string | undefined = activeEvent?.location || activeEvent?.venueName;

  // ---------------------------------------------------------------------------
  // DATA FOR THE SELECTED EVENT
  // ---------------------------------------------------------------------------
  const bookingsQ = useGetBookingsByEventIdQuery(numericEventId, { skip: skipEvent });
  const ticketsQ = useGetTicketsByEventIdQuery(numericEventId, { skip: skipEvent });
  const typesQ = useGetTicketTypesByEventIdQuery(selectedEventId, { skip: !selectedEventId });
  const paymentsQ = useGetPaymentsByOrgIdQuery(orgId as number, { skip: !orgId });

  const isLoading = bookingsQ.isLoading || ticketsQ.isLoading || typesQ.isLoading || paymentsQ.isLoading;
  const isError = bookingsQ.isError || paymentsQ.isError;

  const bookings = useMemo(
    () => toArray<Booking>(bookingsQ.data).filter((b: any) => !b.eventId || Number(b.eventId) === numericEventId),
    [bookingsQ.data, numericEventId]
  );
  const tickets = useMemo(
    () => toArray<Ticket>(ticketsQ.data, "tickets").filter((t: any) => !t.eventId || Number(t.eventId) === numericEventId),
    [ticketsQ.data, numericEventId]
  );
  const types = useMemo(() => toArray<any>(typesQ.data), [typesQ.data]);

  // Payments belong to this event through their booking
  const payments = useMemo(() => {
    const ids = new Set(bookings.map((b) => Number(b.bookingId)));
    return toArray<Payment>(paymentsQ.data).filter((p: any) =>
      p.eventId ? Number(p.eventId) === numericEventId : ids.has(Number(p.bookingId))
    );
  }, [paymentsQ.data, bookings, numericEventId]);

  // ---------------------------------------------------------------------------
  // REPORT NUMBERS
  // ---------------------------------------------------------------------------
  const r = useMemo(() => {
    const typeName = new Map<string, string>();
    const typePrice = new Map<string, number>();
    types.forEach((t: any) => {
      typeName.set(typeIdOf(t), t.name ?? t.title ?? `Ticket type #${typeIdOf(t)}`);
      typePrice.set(typeIdOf(t), num(t.price));
    });
    const nameOfType = (id: string) => typeName.get(id) || (id ? `Ticket type #${id}` : "Unknown");

    const bookingById = new Map<number, Booking>();
    bookings.forEach((b) => bookingById.set(Number(b.bookingId), b));

    const confirmed = bookings.filter((b) => b.bookingStatus === "Confirmed");
    const pending = bookings.filter((b) => b.bookingStatus === "Pending");
    const cancelled = bookings.filter((b) => b.bookingStatus === "Cancelled");
    const live = bookings.filter((b) => b.bookingStatus !== "Cancelled");

    const completed = payments.filter((p: any) => p.paymentStatus === "Completed");
    const pendingPay = payments.filter((p: any) => p.paymentStatus === "Pending");
    const failedPay = payments.filter((p: any) => p.paymentStatus === "Failed");
    const sum = (list: any[]) => list.reduce((s, p) => s + num(p.amount), 0);

    const revenue = sum(completed);
    const pendingRevenue = sum(pendingPay);
    const failedAmount = sum(failedPay);
    const ticketsSold = confirmed.reduce((s, b) => s + num(b.quantity), 0);
    const avgOrder = completed.length ? revenue / completed.length : 0;
    const ticketsPerBooking = confirmed.length ? ticketsSold / confirmed.length : 0;
    const orderTotals = confirmed.map((b) => num(b.totalAmount));
    const largestOrder = orderTotals.length ? Math.max(...orderTotals) : 0;

    // Sales per ticket type (confirmed bookings)
    const byType = new Map<string, { name: string; price: number; bookings: number; tickets: number; revenue: number }>();
    confirmed.forEach((b) => {
      const id = String(b.ticketTypeId ?? "");
      const price = typePrice.get(id) ?? 0;
      const row = byType.get(id) || { name: nameOfType(id), price, bookings: 0, tickets: 0, revenue: 0 };
      row.bookings += 1;
      row.tickets += num(b.quantity);
      row.revenue += b.totalAmount !== undefined && b.totalAmount !== null ? num(b.totalAmount) : num(b.quantity) * price;
      byType.set(id, row);
    });
    types.forEach((t: any) => {
      const id = typeIdOf(t);
      if (!byType.has(id)) byType.set(id, { name: nameOfType(id), price: num(t.price), bookings: 0, tickets: 0, revenue: 0 });
    });

    // Check-in per ticket type (a ticket's type comes from its booking)
    const scanByType = new Map<string, { issued: number; scanned: number }>();
    tickets.forEach((t: any) => {
      const id = String(t.ticketTypeId ?? bookingById.get(Number(t.bookingId))?.ticketTypeId ?? "");
      const row = scanByType.get(id) || { issued: 0, scanned: 0 };
      row.issued += 1;
      if (tScanned(t)) row.scanned += 1;
      scanByType.set(id, row);
    });

    const typeRows = Array.from(byType.entries())
      .map(([id, v]) => {
        const t = types.find((x: any) => typeIdOf(x) === id);
        const scan = scanByType.get(id) || { issued: 0, scanned: 0 };
        return { id, ...v, capacity: num(t?.quantity), sold: num(t?.sold), issued: scan.issued, scanned: scan.scanned };
      })
      .sort((a, b) => b.revenue - a.revenue);
    const capacity = types.reduce((s: number, t: any) => s + num(t.quantity), 0);
    const soldTiers = types.reduce((s: number, t: any) => s + num(t.sold), 0);
    const remaining = Math.max(capacity - soldTiers, 0);

    // Payment methods
    const methodMap = new Map<string, { count: number; amount: number }>();
    completed.forEach((p: any) => {
      const k = p.paymentMethod || "Other";
      const row = methodMap.get(k) || { count: 0, amount: 0 };
      row.count += 1;
      row.amount += num(p.amount);
      methodMap.set(k, row);
    });
    const methods = Array.from(methodMap.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.amount - a.amount);

    // Revenue per day (+ running total)
    const dayMap = new Map<number, number>();
    completed.forEach((p: any) => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);
      const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      dayMap.set(k, (dayMap.get(k) || 0) + num(p.amount));
    });
    const dayEntries = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
    const days: Point[] = dayEntries.map(([k, value]) => ({ label: fmtDay(new Date(k)), value }));
    let running = 0;
    const cumulative: Point[] = days.map((d) => ({ label: d.label, value: (running += d.value) }));
    const peakDay = [...days].sort((a, b) => b.value - a.value)[0];
    const firstSale = dayEntries.length ? new Date(dayEntries[0][0]) : null;
    const lastSale = dayEntries.length ? new Date(dayEntries[dayEntries.length - 1][0]) : null;
    const daysOnSale =
      firstSale && lastSale ? Math.round((lastSale.getTime() - firstSale.getTime()) / 86400000) + 1 : 0;
    const avgPerDay = daysOnSale ? revenue / daysOnSale : 0;

    // Bookings by weekday
    const weekday: Point[] = WEEKDAYS.map((label) => ({ label, value: 0 }));
    live.forEach((b) => {
      if (b.createdAt) weekday[new Date(b.createdAt).getDay()].value += 1;
    });

    // Buyers
    type Buyer = { name: string; contact: string; bookings: number; tickets: number; spend: number };
    const buyerMap = new Map<string, Buyer>();
    live.forEach((b) => {
      const key = b.digitalId ? `u${b.digitalId}` : b.guestEmail || b.guestPhone || b.guestName || `b${b.bookingId}`;
      const row = buyerMap.get(key) || {
        name: b.guestName || (b.digitalId ? `Registered user #${b.digitalId}` : "Guest"),
        contact: b.guestPhone || b.guestEmail || "",
        bookings: 0,
        tickets: 0,
        spend: 0,
      };
      row.bookings += 1;
      row.tickets += num(b.quantity);
      if (b.bookingStatus === "Confirmed") row.spend += num(b.totalAmount);
      buyerMap.set(key, row);
    });
    const buyers = Array.from(buyerMap.values());
    const topBuyers = [...buyers].sort((a, b) => b.spend - a.spend).slice(0, 5);
    const repeatBuyers = buyers.filter((b) => b.bookings > 1).length;
    const registered = live.filter((b) => b.digitalId).length;
    const guests = live.length - registered;

    // Tickets & check-in
    const scanned = tickets.filter(tScanned).length;
    const assigned = tickets.filter(tAssigned).length;
    const hours: Point[] = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: 0 }));
    tickets.filter(tScanned).forEach((t: any) => {
      if (t.scannedAt) hours[new Date(t.scannedAt).getHours()].value += 1;
    });
    const peakHour = [...hours].sort((a, b) => b.value - a.value)[0];

    return {
      typeName,
      nameOfType,
      confirmed,
      pending,
      cancelled,
      completed,
      pendingPay,
      failedPay,
      revenue,
      pendingRevenue,
      failedAmount,
      ticketsSold,
      avgOrder,
      ticketsPerBooking,
      largestOrder,
      typeRows,
      capacity,
      soldTiers,
      remaining,
      methods,
      days,
      cumulative,
      peakDay,
      firstSale,
      lastSale,
      daysOnSale,
      avgPerDay,
      weekday,
      buyers,
      topBuyers,
      repeatBuyers,
      registered,
      guests,
      scanned,
      assigned,
      hours,
      peakHour,
    };
  }, [bookings, payments, tickets, types]);

  const checkInRate = pct(r.scanned, tickets.length);
  const capacityUsed = pct(r.soldTiers, r.capacity);
  const confirmationRate = pct(r.confirmed.length, bookings.length);
  const paymentSuccess = pct(r.completed.length, payments.length);

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [bookings]
  );
  const recentPayments = useMemo(
    () => [...payments].sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [payments]
  );

  // Plain-language insights
  const insights = useMemo(() => {
    const out: { tone: Tone; text: ReactNode }[] = [];
    const top = r.typeRows.find((t) => t.revenue > 0);
    if (top)
      out.push({
        tone: "success",
        text: (
          <>
            <b>{top.name}</b> earned the most: <b>{fmtMoney(top.revenue)}</b> ({pct(top.revenue, r.revenue || top.revenue)}% of revenue) from{" "}
            <b>{top.tickets}</b> tickets.
          </>
        ),
      });
    if (r.peakDay && r.peakDay.value > 0)
      out.push({
        tone: "primary",
        text: (
          <>
            Best sales day was <b>{r.peakDay.label}</b> with <b>{fmtMoney(r.peakDay.value)}</b>.
          </>
        ),
      });
    if (r.methods[0])
      out.push({
        tone: "info",
        text: (
          <>
            <b>{r.methods[0].label}</b> was the most used payment method, bringing in <b>{fmtMoney(r.methods[0].amount)}</b>.
          </>
        ),
      });
    const soldOut = r.typeRows.filter((t) => t.capacity > 0 && t.sold >= t.capacity);
    if (soldOut.length)
      out.push({
        tone: "accent",
        text: (
          <>
            Sold out: <b>{soldOut.map((t) => t.name).join(", ")}</b>.
          </>
        ),
      });
    if (r.capacity > 0)
      out.push({
        tone: "primary",
        text: (
          <>
            <b>{capacityUsed}%</b> of the {r.capacity} available tickets are sold, leaving <b>{r.remaining}</b>.
          </>
        ),
      });
    if (r.repeatBuyers > 0)
      out.push({
        tone: "secondary",
        text: (
          <>
            <b>{r.repeatBuyers}</b> of <b>{r.buyers.length}</b> buyers booked more than once.
          </>
        ),
      });
    if (r.cancelled.length > 0)
      out.push({
        tone: "error",
        text: (
          <>
            <b>{pct(r.cancelled.length, bookings.length)}%</b> of bookings were cancelled ({r.cancelled.length} of {bookings.length}).
          </>
        ),
      });
    if (r.pendingPay.length > 0)
      out.push({
        tone: "warning",
        text: (
          <>
            <b>{fmtMoney(r.pendingRevenue)}</b> is still waiting in <b>{r.pendingPay.length}</b> pending payments.
          </>
        ),
      });
    if (r.failedPay.length > 0)
      out.push({
        tone: "error",
        text: (
          <>
            <b>{r.failedPay.length}</b> payments failed, worth <b>{fmtMoney(r.failedAmount)}</b>. Those buyers may still want to complete their purchase.
          </>
        ),
      });
    if (r.scanned > 0 && r.peakHour && r.peakHour.value > 0)
      out.push({
        tone: "info",
        text: (
          <>
            Most check-ins happened around <b>{r.peakHour.label.replace("h", ":00")}</b> ({r.peakHour.value} tickets).
          </>
        ),
      });
    return out;
  }, [r, bookings.length, capacityUsed]);

  // ---------------------------------------------------------------------------
  // DOWNLOADS
  // ---------------------------------------------------------------------------
  const reportRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfPick, setPdfPick] = useState<string[]>(ALL_PDF_IDS);
  const togglePick = (id: string) =>
    setPdfPick((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const fileBase = () => `sales-report-${slug(eventTitle)}-${new Date().toISOString().slice(0, 10)}`;
  const closeMenu = () => (document.activeElement as HTMLElement | null)?.blur();

  /** Opens only the report in its own window and starts the print dialog: choose "Save as PDF". */
  const downloadPdf = () => {
    closeMenu();
    const source = reportRef.current;
    if (!source || pdfPick.length === 0) return;

    // Make a copy of the report that only has the parts the organizer picked
    const node = source.cloneNode(true) as HTMLElement;
    node.querySelectorAll("[data-section]").forEach((el) => {
      if (!pdfPick.includes(el.getAttribute("data-section") || "")) el.remove();
    });
    if (!pdfPick.includes("charts")) node.querySelectorAll("[data-chart]").forEach((el) => el.remove());

    const win = window.open("", "_blank", "width=920,height=1100");
    if (!win) {
      setNotice("Your browser blocked the report window. Allow pop-ups for this site and try again.");
      return;
    }
    setNotice("");
    setPdfOpen(false);

    // Use your current theme so the PDF has your colors. A dark theme would print as a black page,
    // so for dark themes the "light" theme is used instead.
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme") || "light";
    const isDark = (getComputedStyle(root).colorScheme || "").includes("dark");
    const theme = isDark ? "light" : currentTheme;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => (n.tagName === "LINK" ? `<link rel="stylesheet" href="${(n as HTMLLinkElement).href}">` : n.outerHTML))
      .join("\n");
    const title = `Sales report - ${eventTitle}`.replace(/</g, "");

    win.document.open();
    win.document.write(`<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><title>${title}</title>${styles}
<style>
  @page { size: A4; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body class="bg-base-100 text-base-content">${node.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 900);
  };

  const exportSummaryCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-summary.csv`, [
      ["Event sales report"],
      ["Event", eventTitle],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Revenue (completed payments)", r.revenue],
      ["Pending revenue", r.pendingRevenue],
      ["Failed payments amount", r.failedAmount],
      ["Bookings", bookings.length],
      ["Confirmed bookings", r.confirmed.length],
      ["Pending bookings", r.pending.length],
      ["Cancelled bookings", r.cancelled.length],
      ["Tickets sold", r.ticketsSold],
      ["Average order value", Math.round(r.avgOrder * 100) / 100],
      ["Largest order", r.largestOrder],
      ["Unique buyers", r.buyers.length],
      ["Repeat buyers", r.repeatBuyers],
      ["Tickets issued", tickets.length],
      ["Tickets scanned", r.scanned],
      ["Check-in rate %", checkInRate],
      ["Capacity used %", capacityUsed],
      [],
      ["Ticket type", "Price", "Bookings", "Tickets sold", "Capacity", "Revenue"],
      ...r.typeRows.map((t) => [t.name, t.price, t.bookings, t.tickets, t.capacity, t.revenue]),
      [],
      ["Payment method", "Payments", "Amount"],
      ...r.methods.map((m) => [m.label, m.count, m.amount]),
    ]);
  };

  const exportBookingsCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-bookings.csv`, [
      ["Booking #", "Status", "Ticket type", "Quantity", "Total", "Guest name", "Email", "Phone", "Digital ID", "Created"],
      ...recentBookings.map((b) => [
        b.bookingId,
        b.bookingStatus,
        r.typeName.get(String(b.ticketTypeId)) ?? b.ticketTypeId ?? "",
        b.quantity,
        b.totalAmount ?? "",
        b.guestName ?? "",
        b.guestEmail ?? "",
        b.guestPhone ?? "",
        b.digitalId ?? "",
        fmtDateTime(b.createdAt),
      ]),
    ]);
  };

  const exportPaymentsCsv = () => {
    closeMenu();
    downloadCsv(`${fileBase()}-payments.csv`, [
      ["Payment #", "Booking #", "Method", "Status", "Amount", "Transaction ID", "Created"],
      ...recentPayments.map((p: any) => [
        pId(p),
        p.bookingId,
        p.paymentMethod ?? "",
        p.paymentStatus,
        p.amount ?? "",
        p.transactionId ?? "",
        fmtDateTime(p.createdAt),
      ]),
    ]);
  };

  const refresh = () => {
    bookingsQ.refetch();
    ticketsQ.refetch();
    typesQ.refetch();
    paymentsQ.refetch();
  };

  // --- WHILE WE CHECK THE ORGANIZER'S ORGANIZATION ---
  if (orgLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  // --- NO ORGANIZATION YET ---
  if (!hasOrg) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Building2 size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Create your organization first</h2>
          <p className="text-xs text-base-content/60 max-w-md leading-relaxed">
            Sales reports are built from your events, and events belong to an organization. Create your organization and
            your first event, then you can download its sales report here.
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

  const downloadsDisabled = isLoading || !selectedEventId;

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER: EVENT PICKER + DOWNLOADS                                    */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <FileBarChart size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Event Sales Report</h1>
            <p className="text-[11px] text-base-content/60">
              Report for: <span className="font-bold text-base-content">{selectedEventId ? eventTitle : "No event selected"}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => setPickedEventId(e.target.value)}
            disabled={rawEvents.length === 0}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-60 font-semibold"
          >
            {rawEvents.length === 0 && <option value="">No events yet</option>}
            {rawEvents.map((ev: any) => {
              const id = getEventId(ev);
              return (
                <option key={id} value={id}>
                  {ev.title}
                </option>
              );
            })}
          </select>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refresh}
              className="btn btn-ghost btn-sm btn-square rounded-xl bg-base-200"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setPdfOpen(true)}
              disabled={downloadsDisabled}
              className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm"
            >
              <FileText size={14} />
              <span>Download PDF</span>
            </button>

            <div className="dropdown dropdown-end">
              <button
                tabIndex={0}
                disabled={downloadsDisabled}
                className="btn btn-ghost btn-sm gap-1.5 rounded-xl text-xs font-bold bg-base-200"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
              <ul
                tabIndex={0}
                className="dropdown-content menu menu-sm z-30 mt-2 w-52 p-2 shadow-xl bg-base-100 border border-base-200 rounded-2xl"
              >
                <li>
                  <button onClick={exportSummaryCsv} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> Sales summary
                  </button>
                </li>
                <li>
                  <button onClick={exportBookingsCsv} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> All bookings
                  </button>
                </li>
                <li>
                  <button onClick={exportPaymentsCsv} className="text-xs font-semibold">
                    <FileSpreadsheet size={14} className="text-success" /> All payments
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* PDF OPTIONS MODAL                                                   */}
      {/* =================================================================== */}
      <ModalShell
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title="Download PDF report"
        icon={<FileText size={16} />}
        maxWidth="lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-[11px] text-base-content/50 text-center sm:text-left">
              {pdfPick.length} of {PDF_OPTIONS.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPdfOpen(false)} className="btn btn-ghost btn-sm rounded-xl font-bold flex-1 sm:flex-none">
                Cancel
              </button>
              <button
                onClick={downloadPdf}
                disabled={pdfPick.length === 0}
                className="btn btn-primary btn-sm gap-1.5 rounded-xl font-bold shadow-sm flex-1 sm:flex-none"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-xs">
          <p className="text-base-content/60 leading-relaxed">
            Choose what to include in the PDF for <b className="text-base-content">{eventTitle}</b>. The cover with the
            event name and total revenue is always included.
          </p>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setPdfPick(ALL_PDF_IDS)} className="btn btn-xs rounded-lg bg-base-200 border-0 font-bold">
              Everything
            </button>
            <button onClick={() => setPdfPick(PDF_OVERVIEW)} className="btn btn-xs rounded-lg bg-base-200 border-0 font-bold">
              Overview with charts
            </button>
            <button onClick={() => setPdfPick(PDF_RECORDS)} className="btn btn-xs rounded-lg bg-base-200 border-0 font-bold">
              Records only
            </button>
            <button onClick={() => setPdfPick([])} className="btn btn-xs btn-ghost rounded-lg font-bold">
              Clear
            </button>
          </div>

          <ul className="flex flex-col gap-1.5">
            {PDF_OPTIONS.map((o) => {
              const on = pdfPick.includes(o.id);
              return (
                <li key={o.id}>
                  <label
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      on ? "border-primary/40 bg-primary/5" : "border-base-200 hover:bg-base-200/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm mt-0.5"
                      checked={on}
                      onChange={() => togglePick(o.id)}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="font-bold text-base-content">{o.label}</span>
                      <span className="text-[11px] text-base-content/50">{o.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {pdfPick.length === 0 && (
            <p className="text-[11px] text-warning font-semibold">Pick at least one part to download.</p>
          )}
        </div>
      </ModalShell>

      {/* Guide */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
          <Info size={16} />
        </div>
        <p className="text-base-content/70 leading-relaxed text-[11px]">
          Pick one of your events to see its full sales report below. Press <b>Download PDF</b>, tick the parts you want, then choose{" "}
          <b>"Save as PDF"</b> as the destination in the print window. Revenue counts completed payments only, and ticket
          type revenue comes from confirmed bookings.
        </p>
      </div>

      {notice && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
          <AlertCircle size={16} />
          <span>{notice}</span>
        </div>
      )}

      {isError && (
        <div className="alert alert-warning text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Some data could not be loaded, so the figures may be incomplete. Try the refresh button.</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* REPORT (this exact block is what the PDF contains)                  */}
      {/* =================================================================== */}
      {eventsLoading || isLoading ? (
        <div className="flex justify-center py-24">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : !selectedEventId ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <FileBarChart size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No Events Yet</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">Create an event to get its sales report.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-base-200 shadow-sm">
          <div ref={reportRef}>
            <div className="bg-base-100 text-base-content font-sans p-3 sm:p-6 flex flex-col gap-6 max-w-4xl mx-auto text-[11px]">
              {/* ---------- Cover band ---------- */}
              <header className="bg-primary text-primary-content rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                <div className="min-w-0 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">Event sales report</span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight break-words">{eventTitle}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-90">
                    {eventDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} /> {fmtDateTime(eventDate)}
                      </span>
                    )}
                    {eventLocation && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} /> {eventLocation}
                      </span>
                    )}
                  </div>
                  <span className="opacity-75 text-[10px] mt-1">
                    Generated {new Date().toLocaleString()}
                    {user?.firstName ? ` · Prepared for ${user.firstName}` : ""}
                  </span>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">Total revenue</div>
                  <div className="text-2xl sm:text-3xl font-black leading-none mt-1">{fmtMoney(r.revenue)}</div>
                  <div className="opacity-85 mt-1.5">
                    {r.ticketsSold} tickets · {r.confirmed.length} confirmed bookings
                  </div>
                </div>
              </header>

              {/* ---------- Summary ---------- */}
              <Section id="summary" title="Summary" subtitle="Key numbers at a glance">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Stat label="Revenue" value={fmtMoney(r.revenue)} hint={`${r.completed.length} completed payments`} icon={<DollarSign size={14} />} tone="success" />
                  <Stat label="Tickets sold" value={String(r.ticketsSold)} hint={`${capacityUsed}% of capacity`} icon={<TicketIcon size={14} />} tone="primary" />
                  <Stat label="Bookings" value={String(bookings.length)} hint={`${r.confirmed.length} confirmed · ${r.pending.length} pending`} icon={<CalendarCheck size={14} />} tone="primary" />
                  <Stat label="Avg. order" value={fmtMoney(r.avgOrder)} hint="Per completed payment" icon={<Receipt size={14} />} tone="warning" />

                  <Stat label="Pending revenue" value={fmtMoney(r.pendingRevenue)} hint={`${r.pendingPay.length} payments waiting`} icon={<Hourglass size={14} />} tone="warning" />
                  <Stat label="Largest order" value={fmtMoney(r.largestOrder)} hint="Confirmed bookings" icon={<TrendingUp size={14} />} tone="info" />
                  <Stat label="Unique buyers" value={String(r.buyers.length)} hint={`${r.repeatBuyers} repeat buyers`} icon={<Users size={14} />} tone="secondary" />
                  <Stat label="Tickets / booking" value={(Math.round(r.ticketsPerBooking * 10) / 10).toString()} hint="Average group size" icon={<UserCheck size={14} />} tone="accent" />

                  <Stat label="Confirmation rate" value={`${confirmationRate}%`} hint={`${r.confirmed.length} of ${bookings.length} bookings`} icon={<CalendarCheck size={14} />} tone="success" />
                  <Stat label="Payment success" value={`${paymentSuccess}%`} hint={`${r.failedPay.length} failed`} icon={<DollarSign size={14} />} tone={payments.length > 0 && paymentSuccess < 60 ? "error" : "success"} />
                  <Stat label="Cancelled" value={String(r.cancelled.length)} hint={`${pct(r.cancelled.length, bookings.length)}% of bookings`} icon={<XCircle size={14} />} tone={r.cancelled.length > 0 ? "error" : "success"} />
                  <Stat label="Check-in rate" value={`${checkInRate}%`} hint={`${r.scanned} of ${tickets.length} scanned`} icon={<ScanLine size={14} />} tone="info" />
                </div>
              </Section>

              {/* ---------- Insights ---------- */}
              {insights.length > 0 && (
                <Section id="highlights" title="Highlights" subtitle="What stands out" tone="accent">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {insights.map((h, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 rounded-xl p-2.5 leading-relaxed text-base-content/80 ${TONE_CHIP[h.tone].split(" ")[0]}`}
                      >
                        <Sparkles size={12} className={`mt-0.5 shrink-0 ${TONE_TEXT[h.tone]}`} />
                        <span>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* ---------- Sales timeline ---------- */}
              <Section id="timeline" title="Sales over time" subtitle="Completed payments" tone="success">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Stat label="First sale" value={r.firstSale ? fmtDate(r.firstSale.toISOString()) : "—"} tone="primary" />
                  <Stat label="Latest sale" value={r.lastSale ? fmtDate(r.lastSale.toISOString()) : "—"} tone="primary" />
                  <Stat label="Days on sale" value={String(r.daysOnSale)} hint={`${fmtMoney(r.avgPerDay)} per day`} tone="info" />
                  <Stat label="Best day" value={r.peakDay ? fmtMoney(r.peakDay.value) : "—"} hint={r.peakDay?.label} tone="success" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div data-chart="true" className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-base-content/60">Revenue per day</span>
                    <Bars data={r.days} format={fmtMoneyCompact} colorClass="text-success" emptyText="No completed payments yet" />
                  </div>
                  <div data-chart="true" className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-base-content/60">Running total</span>
                    <AreaLine data={r.cumulative} format={fmtMoneyCompact} colorClass="text-primary" emptyText="No completed payments yet" />
                  </div>
                </div>
              </Section>

              {/* ---------- Ticket types ---------- */}
              <Section id="ticketTypes" title="Sales by ticket type" subtitle="Confirmed bookings" tone="primary">
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="w-full text-left min-w-[560px]">
                    <thead>
                      <tr className="bg-primary/10 text-primary">
                        <th className={TH}>Ticket type</th>
                        <th className={`${TH} text-right`}>Price</th>
                        <th className={`${TH} text-right`}>Bookings</th>
                        <th className={`${TH} text-right`}>Tickets sold</th>
                        <th className={`${TH} text-right`}>Capacity</th>
                        <th className={`${TH} text-right`}>Revenue</th>
                        <th className={`${TH} text-right`}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.typeRows.length === 0 && (
                        <tr>
                          <td className={`${TD} text-base-content/50`} colSpan={7}>
                            No ticket types
                          </td>
                        </tr>
                      )}
                      {r.typeRows.map((t) => (
                        <tr key={t.id} className="border-t border-base-200 break-inside-avoid">
                          <td className={`${TD} font-bold`}>{t.name}</td>
                          <td className={`${TD} text-right`}>{fmtMoney(t.price)}</td>
                          <td className={`${TD} text-right`}>{t.bookings}</td>
                          <td className={`${TD} text-right`}>{t.tickets}</td>
                          <td className={`${TD} text-right`}>{t.capacity || "—"}</td>
                          <td className={`${TD} text-right font-bold text-success`}>{fmtMoney(t.revenue)}</td>
                          <td className={`${TD} text-right text-base-content/60`}>
                            {pct(t.revenue, r.typeRows.reduce((s, x) => s + x.revenue, 0))}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {r.typeRows.some((t) => t.capacity > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {r.typeRows
                      .filter((t) => t.capacity > 0)
                      .map((t) => {
                        const full = t.sold >= t.capacity;
                        const used = pct(t.sold, t.capacity);
                        return (
                          <MeterRow
                            key={t.id}
                            label={t.name}
                            value={t.sold}
                            of={t.capacity}
                            tone={full ? "error" : used >= 75 ? "warning" : "primary"}
                            right={
                              <>
                                <b className="text-base-content">{t.sold}</b> / {t.capacity} · {used}%{full ? " · Sold out" : ""}
                              </>
                            }
                          />
                        );
                      })}
                  </div>
                )}
              </Section>

              {/* ---------- Payments ---------- */}
              <Section id="payments" title="Payments" subtitle={`${payments.length} payments in total`} tone="warning">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">By status</span>
                    <ShareBar
                      format={fmtMoney}
                      parts={[
                        { label: `Completed (${r.completed.length})`, value: r.revenue, tone: "success" },
                        { label: `Pending (${r.pendingPay.length})`, value: r.pendingRevenue, tone: "warning" },
                        { label: `Failed (${r.failedPay.length})`, value: r.failedAmount, tone: "error" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Revenue by payment method</span>
                    <ShareBar
                      format={fmtMoney}
                      parts={r.methods.map((m, i) => ({
                        label: `${m.label} (${m.count})`,
                        value: m.amount,
                        tone: TONE_CYCLE[i % TONE_CYCLE.length],
                      }))}
                    />
                  </div>
                </div>
              </Section>

              {/* ---------- Bookings & buyers ---------- */}
              <Section id="buyers" title="Bookings and buyers" tone="secondary">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Booking status</span>
                    <ShareBar
                      parts={[
                        { label: "Confirmed", value: r.confirmed.length, tone: "success" },
                        { label: "Pending", value: r.pending.length, tone: "warning" },
                        { label: "Cancelled", value: r.cancelled.length, tone: "error" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Registered vs guest</span>
                    <ShareBar
                      parts={[
                        { label: "Registered users", value: r.registered, tone: "primary" },
                        { label: "Guest checkout", value: r.guests, tone: "secondary" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Booking journey</span>
                    <div className="flex flex-col gap-2">
                      <MeterRow label="Bookings made" value={bookings.length} of={bookings.length} tone="primary" />
                      <MeterRow label="Confirmed" value={r.confirmed.length} of={bookings.length} tone="success" />
                      <MeterRow label="Paid" value={r.completed.length} of={bookings.length} tone="info" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div data-chart="true" className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-base-content/60">Bookings by day of the week</span>
                    <Bars data={r.weekday} format={(v) => String(Math.round(v))} colorClass="text-secondary" emptyText="No bookings yet" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Top buyers</span>
                    <div className="overflow-x-auto rounded-xl border border-base-200">
                      <table className="w-full text-left min-w-[380px]">
                        <thead>
                          <tr className="bg-secondary/10 text-secondary">
                            <th className={TH}>Buyer</th>
                            <th className={`${TH} text-right`}>Bookings</th>
                            <th className={`${TH} text-right`}>Tickets</th>
                            <th className={`${TH} text-right`}>Spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.topBuyers.length === 0 && (
                            <tr>
                              <td className={`${TD} text-base-content/50`} colSpan={4}>
                                No buyers yet
                              </td>
                            </tr>
                          )}
                          {r.topBuyers.map((b, i) => (
                            <tr key={i} className="border-t border-base-200">
                              <td className={TD}>
                                <div className="font-bold truncate max-w-[130px]">{b.name}</div>
                                {b.contact && <div className="text-[9px] text-base-content/50 truncate max-w-[130px]">{b.contact}</div>}
                              </td>
                              <td className={`${TD} text-right`}>{b.bookings}</td>
                              <td className={`${TD} text-right`}>{b.tickets}</td>
                              <td className={`${TD} text-right font-bold text-success`}>{fmtMoney(b.spend)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Section>

              {/* ---------- Tickets & check-in ---------- */}
              <Section id="checkin" title="Tickets and gate check-in" tone="info">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-base-content/60">Ticket journey</span>
                    <MeterRow label="Tickets issued" value={tickets.length} of={tickets.length} tone="primary" />
                    <MeterRow label="Assigned to an attendee" value={r.assigned} of={tickets.length} tone="info" />
                    <MeterRow label="Scanned at the gate" value={r.scanned} of={tickets.length} tone="success" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-base-content/60">Check-in by ticket type</span>
                    <div className="flex flex-col gap-2">
                      {r.typeRows.filter((t) => t.issued > 0).length === 0 && (
                        <p className="text-base-content/50">No tickets issued yet.</p>
                      )}
                      {r.typeRows
                        .filter((t) => t.issued > 0)
                        .map((t) => (
                          <MeterRow key={t.id} label={t.name} value={t.scanned} of={t.issued} tone="success" />
                        ))}
                    </div>
                  </div>
                </div>
                {r.scanned > 0 && (
                  <div data-chart="true" className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-base-content/60">Check-ins by hour</span>
                    <Bars
                      data={r.hours}
                      format={(v) => String(Math.round(v))}
                      colorClass="text-info"
                    />
                  </div>
                )}
              </Section>

              {/* ---------- Payments list ---------- */}
              <Section id="paymentRecords" title={`Payment records (${recentPayments.length})`} subtitle="Latest first" tone="warning">
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="w-full text-left min-w-[560px]">
                    <thead>
                      <tr className="bg-warning/10 text-warning">
                        <th className={TH}>#</th>
                        <th className={TH}>Booking</th>
                        <th className={TH}>Method</th>
                        <th className={TH}>Transaction ID</th>
                        <th className={`${TH} text-right`}>Amount</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.length === 0 && (
                        <tr>
                          <td className={`${TD} text-base-content/50`} colSpan={7}>
                            No payments yet
                          </td>
                        </tr>
                      )}
                      {recentPayments.slice(0, MAX_ROWS).map((p: any) => (
                        <tr key={pId(p)} className="border-t border-base-200 break-inside-avoid">
                          <td className={TD}>{pId(p)}</td>
                          <td className={TD}>#{p.bookingId}</td>
                          <td className={TD}>{p.paymentMethod || "—"}</td>
                          <td className={`${TD} font-mono text-[9px] break-all`}>{p.transactionId || "—"}</td>
                          <td className={`${TD} text-right font-bold`}>{fmtMoney(p.amount)}</td>
                          <td className={TD}>
                            <Pill tone={statusTone(p.paymentStatus)}>{p.paymentStatus}</Pill>
                          </td>
                          <td className={`${TD} text-base-content/60`}>{fmtDateTime(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {recentPayments.length > MAX_ROWS && (
                  <p className="text-[10px] text-base-content/50">
                    Showing the latest {MAX_ROWS} of {recentPayments.length} payments. Use the CSV download for the full list.
                  </p>
                )}
              </Section>

              {/* ---------- Bookings list ---------- */}
              <Section id="bookingRecords" title={`Booking records (${recentBookings.length})`} subtitle="Latest first" tone="primary">
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="w-full text-left min-w-[560px]">
                    <thead>
                      <tr className="bg-primary/10 text-primary">
                        <th className={TH}>#</th>
                        <th className={TH}>Buyer</th>
                        <th className={TH}>Ticket type</th>
                        <th className={`${TH} text-right`}>Qty</th>
                        <th className={`${TH} text-right`}>Total</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.length === 0 && (
                        <tr>
                          <td className={`${TD} text-base-content/50`} colSpan={7}>
                            No bookings yet
                          </td>
                        </tr>
                      )}
                      {recentBookings.slice(0, MAX_ROWS).map((b) => (
                        <tr key={b.bookingId} className="border-t border-base-200 break-inside-avoid">
                          <td className={TD}>{b.bookingId}</td>
                          <td className={TD}>
                            <div className="font-bold truncate max-w-[150px]">
                              {b.guestName || (b.digitalId ? `User #${b.digitalId}` : "—")}
                            </div>
                            {(b.guestPhone || b.guestEmail) && (
                              <div className="text-[9px] text-base-content/50 truncate max-w-[150px]">
                                {b.guestPhone || b.guestEmail}
                              </div>
                            )}
                          </td>
                          <td className={TD}>{r.typeName.get(String(b.ticketTypeId)) || "—"}</td>
                          <td className={`${TD} text-right`}>{b.quantity}</td>
                          <td className={`${TD} text-right font-bold`}>{fmtMoney(b.totalAmount)}</td>
                          <td className={TD}>
                            <Pill tone={statusTone(b.bookingStatus)}>{b.bookingStatus}</Pill>
                          </td>
                          <td className={`${TD} text-base-content/60`}>{fmtDateTime(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {recentBookings.length > MAX_ROWS && (
                  <p className="text-[10px] text-base-content/50">
                    Showing the latest {MAX_ROWS} of {recentBookings.length} bookings. Use the CSV download for the full list.
                  </p>
                )}
              </Section>

              <footer className="border-t border-base-300 pt-2 text-[9px] text-base-content/50 flex justify-between gap-4">
                <span>
                  Revenue counts completed payments only. Ticket type revenue comes from confirmed bookings. Check-in by
                  ticket type uses each ticket's booking.
                </span>
                <span className="shrink-0">Generated from your organizer dashboard</span>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventSalesReport;