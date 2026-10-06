import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  MapPin,
  Building2,
  Plus,
  RefreshCw,
  PlayCircle,
  XCircle,
  ExternalLink,
  Tag,
  FileText,
  Flag,
  Ticket as TicketIcon,
  Images,
  Image as ImageIcon,
  Video,
  DollarSign,
  ShieldCheck,
  Phone,
  Mail,
  Users,
  Star,
} from "lucide-react";

import {
  useGetAllEventsQuery,
  useGetEventsByTitleQuery,
  useGetEventsByCategoryQuery,
  useGetEventByIdQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useDeleteEventMutation,
} from "../../features/APIS/EventsApi";
import {
  useGetMediaByEventIdQuery,
  useGetPrimaryMediaByEventIdQuery,
} from "../../features/APIS/mediaApi";
import {
  useGetAllOrganizationsAdminQuery,
  useGetOrganizationByIdQuery,
} from "../../features/APIS/organizationApi";
import { useGetAllVenuesQuery } from "../../features/APIS/VenueApi";
import {
  useGetAllTicketTypesQuery,
  useGetTicketTypesByEventIdQuery,
  useGetEventRevenueQuery,
} from "../../features/APIS/ticketsType.Api";

import usePageTitle from "../../hooks/usePageTitle";

const NAVBAR_HEIGHT = "5rem";
const CURRENCY = "KSH";
const PAGE_SIZES = [10, 20, 50];

// -----------------------------------------------------------------------------
// OPTIONS (these match your database enums)
// -----------------------------------------------------------------------------

const CATEGORIES = [
  "music",
  "conference",
  "workshop",
  "festival",
  "sports",
  "arts_theatre",
  "networking",
  "nightlife",
  "charity",
  "exhibition",
  "religious",
  "food_drink",
  "technology",
  "comedy",
  "other",
];

const catLabel = (c?: string) => (c || "").replace(/_/g, " ");

// eventStatus enum: in_progress | ended | cancelled | upcoming
const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", hint: "The event has not started yet and tickets can be sold." },
  { value: "in_progress", label: "In progress", hint: "The event is happening right now." },
  { value: "ended", label: "Ended", hint: "The event is over. It moves to the past-events archive." },
  { value: "cancelled", label: "Cancelled", hint: "The event is cancelled. Attendees should be refunded." },
];

type StatusTone = { label: string; cls: string; Icon: any };

const STATUS_META: Record<string, StatusTone> = {
  upcoming: { label: "Upcoming", cls: "badge-info", Icon: CalendarDays },
  in_progress: { label: "In progress", cls: "badge-primary", Icon: PlayCircle },
  ended: { label: "Ended", cls: "badge-success", Icon: Flag },
  cancelled: { label: "Cancelled", cls: "badge-error", Icon: XCircle },
};

// -----------------------------------------------------------------------------
// TYPES + NORMALIZATION
// -----------------------------------------------------------------------------

type RawEvent = Record<string, any>;

type EventItem = {
  id: number | string;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  date?: string;
  time?: string;
  venueId?: number | string | null;
  orgId?: number | string | null;
  status?: string;
  cancellationPolicy?: string | null;
  ticketPrice?: string | number | null;
  ticketsTotal?: number | null;
  ticketsSold?: number | null;
  createdAt?: string;
  updatedAt?: string;
  venue?: any;
  organization?: any;
  [key: string]: any;
};

const hasValue = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== "";

const getEventId = (event?: RawEvent | null): number | string | null => {
  if (!event) return null;
  if (hasValue(event.id)) return event.id;
  if (hasValue(event.eventId)) return event.eventId;
  if (hasValue(event._id)) return event._id;
  return null;
};

const normalizeEvent = (raw: RawEvent): EventItem | null => {
  const id = getEventId(raw);
  if (id === null) return null;
  return { ...(raw as EventItem), id, status: raw.status ?? raw.eventStatus };
};

const toList = (data: any): EventItem[] => {
  const rawList: RawEvent[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.events)
    ? data.events
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.results)
    ? data.results
    : data?.event
    ? [data.event]
    : Array.isArray(data?.data?.events)
    ? data.data.events
    : [];

  return rawList.map(normalizeEvent).filter((e): e is EventItem => e !== null);
};

/** Read one object whether the API returns it directly or wrapped in { data } / { event } */
const unwrapObject = (data: any): any => {
  if (!data || typeof data !== "object") return undefined;
  if (data.event && typeof data.event === "object") return data.event;
  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) return data.data;
  return data;
};

const toArray = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.items) ? d.items : [];

const getApiEventId = (event: EventItem): number | string => {
  const id = getEventId(event);
  if (id === null) throw new Error("This event does not have a valid ID.");
  return id;
};

const errMsg = (e: any, fallback: string) =>
  e?.data?.message ||
  (Array.isArray(e?.data?.error) ? e.data.error.map((x: any) => x.message).join(", ") : e?.data?.error) ||
  e?.message ||
  e?.error ||
  fallback;

const num = (v: unknown) => Number(v || 0);
const money = (v: unknown) => `${CURRENCY} ${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const fmtDate = (date?: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (date?: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const fmtTime = (time?: string) => {
  if (!time) return "-";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const hour = Number(parts[0]);
  if (Number.isNaN(hour)) return time;
  return `${hour % 12 || 12}:${parts[1]} ${hour >= 12 ? "PM" : "AM"}`;
};

/** Status key used for filtering and badges ("completed" from older data counts as "ended") */
const statusKey = (event?: EventItem | null) => {
  const s = String(event?.status ?? "").toLowerCase();
  return s === "completed" ? "ended" : s;
};

const daysUntil = (date?: string) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
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

const StatusBadge = ({ status }: { status?: string }) => {
  const key = String(status ?? "").toLowerCase() === "completed" ? "ended" : String(status ?? "").toLowerCase();
  const meta = STATUS_META[key] ?? { label: status || "Unknown", cls: "badge-ghost", Icon: Info };
  const Icon = meta.Icon;
  return (
    <span className={`badge badge-sm gap-1 font-bold ${meta.cls}`}>
      <Icon size={10} />
      {meta.label}
    </span>
  );
};

const labelCls = "font-semibold text-base-content/70 text-[11px]";

// -----------------------------------------------------------------------------
// EVENT THUMBNAIL (primary media)
// -----------------------------------------------------------------------------

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

  if (!url || typeof url !== "string") {
    return <CalendarDays size={18} />;
  }
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

// -----------------------------------------------------------------------------
// MODAL SHELL
// -----------------------------------------------------------------------------

const ModalShell = ({
  title,
  icon,
  onClose,
  children,
  maxW = "max-w-md",
  z = "z-[85]",
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
  z?: string;
}) => (
  <div
    style={{ top: NAVBAR_HEIGHT }}
    className={`fixed inset-x-0 bottom-0 ${z} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm`}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={title}
      style={{ maxHeight: `calc(100vh - ${NAVBAR_HEIGHT} - 2rem)` }}
      className={`bg-base-100 border border-base-200 w-full ${maxW} rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 overflow-y-auto`}
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

// -----------------------------------------------------------------------------
// DELETE MODAL
// -----------------------------------------------------------------------------

const ConfirmDeleteModal = ({
  event,
  soldCount,
  onClose,
  onSuccess,
  onError,
}: {
  event: EventItem;
  soldCount: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const [deleteEvent, { isLoading }] = useDeleteEventMutation();
  const [understood, setUnderstood] = useState(false);
  const needsAck = soldCount > 0;

  const confirm = async () => {
    try {
      await deleteEvent(getApiEventId(event)).unwrap();
      onSuccess("Event deleted successfully.");
    } catch (error: any) {
      onError(errMsg(error, "Failed to delete event."));
    }
  };

  return (
    <div
      style={{ top: NAVBAR_HEIGHT }}
      className="fixed inset-x-0 bottom-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !isLoading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-base-100 border border-base-200 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-error/70 via-error to-error/70" />

        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-ghost btn-xs btn-square rounded-lg absolute top-4 right-3"
        >
          <X size={14} />
        </button>

        <div className="p-6 pt-7 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error">
            <Trash2 size={26} />
          </div>

          <div>
            <h3 className="font-black text-base">Delete this event?</h3>
            <p className="text-xs text-base-content/60 mt-1">This action permanently removes the event.</p>
          </div>

          <div className="w-full bg-base-200/50 border border-base-200 rounded-2xl p-3 text-left">
            <p className="font-bold text-xs truncate">{event.title}</p>
            <p className="text-[11px] text-base-content/60 mt-1">Event #{getApiEventId(event)}</p>
          </div>

          {needsAck ? (
            <div className="w-full flex flex-col gap-2 border border-error/30 bg-error/5 text-error rounded-xl px-3 py-3 text-[11px] font-semibold text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  {soldCount} {soldCount === 1 ? "ticket has" : "tickets have"} been sold for this event. Deleting it also
                  deletes its bookings, tickets and ticket types, and attendees may already have paid.
                </span>
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-base-content/80">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="checkbox checkbox-error checkbox-xs mt-0.5"
                />
                <span>I understand and want to delete it anyway.</span>
              </label>
            </div>
          ) : (
            <div className="w-full flex items-start gap-2 border border-error/20 bg-error/5 text-error rounded-xl px-3 py-2 text-[11px] font-semibold text-left">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>This action cannot be undone.</span>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-ghost bg-base-200/60 btn-sm rounded-xl flex-1 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={isLoading || (needsAck && !understood)}
              className="btn btn-error btn-sm rounded-xl flex-1 font-bold text-error-content"
            >
              {isLoading ? <span className="loading loading-spinner loading-xs" /> : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// EVENT FORM
// -----------------------------------------------------------------------------

type EventForm = {
  title: string;
  slug: string;
  description: string;
  category: string;
  date: string;
  time: string;
  venueId: string;
  orgId: string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  slug: "",
  description: "",
  category: "",
  date: "",
  time: "",
  venueId: "",
  orgId: "",
};

const eventToForm = (event?: EventItem | null): EventForm => ({
  title: event?.title ?? "",
  slug: event?.slug ?? "",
  description: event?.description ?? "",
  category: event?.category ?? "",
  date: event?.date ? String(event.date).slice(0, 10) : "",
  time: event?.time ? String(event.time).slice(0, 5) : "",
  venueId: event?.venueId != null ? String(event.venueId) : "",
  orgId: event?.orgId != null ? String(event.orgId) : "",
});

type Option = { value: string; label: string };

const EventFormModal = ({
  event,
  orgOptions,
  venueOptions,
  onClose,
  onSuccess,
  onError,
}: {
  event?: EventItem | null;
  orgOptions: Option[];
  venueOptions: Option[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const isEdit = Boolean(event);
  const [form, setForm] = useState<EventForm>(eventToForm(event));
  const [createEvent, createState] = useCreateEventMutation();
  const [updateEvent, updateState] = useUpdateEventMutation();
  const loading = createState.isLoading || updateState.isLoading;

  const updateField = <K extends keyof EventForm>(field: K, value: EventForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const createSlug = () =>
    updateField(
      "slug",
      form.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );

  // Keep the saved value selectable even if the list does not contain it
  const withCurrent = (options: Option[], current: string, prefix: string) =>
    current && !options.some((o) => o.value === current)
      ? [{ value: current, label: `${prefix} #${current}` }, ...options]
      : options;

  const orgSelectOptions = withCurrent(orgOptions, form.orgId, "Organization");
  const venueSelectOptions = withCurrent(venueOptions, form.venueId, "Venue");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) return onError("Event title is required.");
    if (!form.category) return onError("Event category is required.");
    if (!form.date) return onError("Event date is required.");
    if (!form.time) return onError("Event time is required.");

    const venueId = Number(form.venueId);
    const orgId = Number(form.orgId);
    if (!Number.isFinite(venueId) || venueId <= 0) return onError("Choose a valid venue.");
    if (!Number.isFinite(orgId) || orgId <= 0) return onError("Choose a valid organization.");

    const slug =
      form.slug.trim() ||
      form.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description.trim(),
      category: form.category,
      date: form.date,
      time: form.time,
      venueId,
      orgId,
    };

    try {
      if (isEdit && event) {
        await updateEvent({ eventId: getApiEventId(event), ...payload }).unwrap();
        onSuccess("Event updated successfully.");
      } else {
        await createEvent(payload).unwrap();
        onSuccess("Event created successfully.");
      }
    } catch (error: any) {
      onError(errMsg(error, isEdit ? "Failed to update event." : "Failed to create event."));
    }
  };

  return (
    <ModalShell
      title={isEdit ? "Edit Event" : "Create Event"}
      icon={isEdit ? <Pencil size={16} /> : <Plus size={16} />}
      onClose={onClose}
      maxW="max-w-2xl"
      z="z-[88]"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelCls}>Event title *</label>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Nairobi Tech Summit 2026"
              className="input input-bordered rounded-xl input-sm text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Slug</label>
            <div className="flex gap-1">
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="nairobi-tech-summit-2026"
                className="input input-bordered rounded-xl input-sm text-xs flex-1"
              />
              <button type="button" onClick={createSlug} className="btn btn-ghost btn-sm rounded-xl" title="Generate slug">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Category *</label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="select select-bordered rounded-xl select-sm text-xs capitalize"
              required
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Event date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              className="input input-bordered rounded-xl input-sm text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Event time *</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => updateField("time", e.target.value)}
              className="input input-bordered rounded-xl input-sm text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Organization *</label>
            {orgSelectOptions.length > 0 ? (
              <select
                value={form.orgId}
                onChange={(e) => updateField("orgId", e.target.value)}
                className="select select-bordered rounded-xl select-sm text-xs"
                required
              >
                <option value="">Select organization</option>
                {orgSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                value={form.orgId}
                onChange={(e) => updateField("orgId", e.target.value)}
                placeholder="Organization ID"
                className="input input-bordered rounded-xl input-sm text-xs"
                required
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Venue *</label>
            {venueSelectOptions.length > 0 ? (
              <select
                value={form.venueId}
                onChange={(e) => updateField("venueId", e.target.value)}
                className="select select-bordered rounded-xl select-sm text-xs"
                required
              >
                <option value="">Select venue</option>
                {venueSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                value={form.venueId}
                onChange={(e) => updateField("venueId", e.target.value)}
                placeholder="Venue ID"
                className="input input-bordered rounded-xl input-sm text-xs"
                required
              />
            )}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the event..."
              className="textarea textarea-bordered rounded-xl text-xs w-full"
            />
          </div>

          <div className="sm:col-span-2 flex items-start gap-2 bg-info/5 border border-info/20 text-info rounded-xl p-3 text-[11px] font-semibold">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              Photos and videos are managed on the event's media page, and ticket types on the ticket types page. Both
              appear in the event details here.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm rounded-xl font-bold">
            {loading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isEdit ? (
              <>
                <Pencil size={13} /> Save changes
              </>
            ) : (
              <>
                <Plus size={13} /> Create event
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// VIEW EVENT MODAL (full details: overview, tickets, media)
// -----------------------------------------------------------------------------

type Tab = "overview" | "tickets" | "media";

const Fact = ({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) => (
  <div className="bg-base-200/40 border border-base-200 rounded-xl p-3 min-w-0">
    <p className="text-[10px] uppercase font-bold text-base-content/50 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <div className="text-xs font-bold mt-1 break-words">{value}</div>
  </div>
);

const ViewEventModal = ({
  event,
  orgById,
  venueById,
  onClose,
  onEdit,
  onStatus,
  onDelete,
}: {
  event: EventItem;
  orgById: Map<string, any>;
  venueById: Map<string, any>;
  onClose: () => void;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) => {
  const eventId = getApiEventId(event);
  const [tab, setTab] = useState<Tab>("overview");

  // Latest event record
  const eventQ = useGetEventByIdQuery(eventId);
  const fetched = normalizeEvent(unwrapObject(eventQ.data) ?? {});
  const current: EventItem = { ...event, ...(fetched ?? {}) };

  // Organization (from the admin list when possible, otherwise fetched)
  const orgKey = current.orgId != null ? String(current.orgId) : "";
  const listedOrg = orgKey ? orgById.get(orgKey) : undefined;
  const orgQ = useGetOrganizationByIdQuery((current.orgId ?? 0) as number | string, {
    skip: !orgKey || Boolean(listedOrg),
  });
  const org = listedOrg ?? unwrapObject(orgQ.data);

  // Venue (nested on the event, or from the venues list)
  const venue = current.venue ?? (current.venueId != null ? venueById.get(String(current.venueId)) : undefined);

  // Ticket types, revenue and media
  const ticketsQ = useGetTicketTypesByEventIdQuery(eventId);
  const revenueQ = useGetEventRevenueQuery(eventId);
  const mediaQ = useGetMediaByEventIdQuery(Number(eventId), { skip: isNaN(Number(eventId)) });

  const tiers = toArray(ticketsQ.data).map((t: any) => ({
    id: t.ticketTypeId ?? t.id,
    name: t.name as string,
    price: num(t.price),
    quantity: num(t.quantity),
    sold: num(t.sold),
  }));
  const capacity = tiers.reduce((s, t) => s + t.quantity, 0);
  const sold = tiers.reduce((s, t) => s + t.sold, 0);
  const remaining = Math.max(capacity - sold, 0);
  const sellThrough = capacity > 0 ? Math.round((sold / capacity) * 1000) / 10 : 0;

  const revenueRaw: any = revenueQ.data;
  const revenueFromApi =
    typeof revenueRaw === "number"
      ? revenueRaw
      : revenueRaw && typeof revenueRaw === "object"
      ? revenueRaw.revenue ?? revenueRaw.totalRevenue ?? revenueRaw.total ?? revenueRaw.data?.revenue
      : undefined;
  const revenue = revenueFromApi !== undefined ? num(revenueFromApi) : tiers.reduce((s, t) => s + t.sold * t.price, 0);

  const media: any[] = toArray(mediaQ.data);
  const images = media.filter((m) => m.type !== "video");
  const videos = media.filter((m) => m.type === "video");
  const hero = media.find((m) => m.isPrimary && m.type !== "video") ?? images[0];

  const days = daysUntil(current.date);
  const when =
    statusKey(current) === "cancelled"
      ? "Cancelled"
      : statusKey(current) === "ended"
      ? "Event has ended"
      : days === null
      ? ""
      : days === 0
      ? "Today"
      : days > 0
      ? `In ${days} ${days === 1 ? "day" : "days"}`
      : `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;

  const tabs: { key: Tab; label: string; count?: number; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Info size={13} /> },
    { key: "tickets", label: "Tickets", count: tiers.length, icon: <TicketIcon size={13} /> },
    { key: "media", label: "Media", count: media.length, icon: <Images size={13} /> },
  ];

  return (
    <ModalShell title="Event Details" icon={<Eye size={16} />} onClose={onClose} maxW="max-w-4xl" z="z-[86]">
      {/* Hero */}
      <div className="relative h-44 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-base-200 to-secondary/20">
        {hero?.url && (
          <img
            src={hero.url}
            alt={hero.altText || current.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <StatusBadge status={current.status} />
            {current.category && (
              <span className="badge badge-sm gap-1 font-bold capitalize bg-white/20 border-0 text-white backdrop-blur-sm">
                <Tag size={10} />
                {catLabel(current.category)}
              </span>
            )}
            {when && <span className="text-[11px] font-bold text-white/80">{when}</span>}
          </div>
          <h2 className="font-black text-xl sm:text-2xl leading-tight">{current.title}</h2>
          <p className="text-[11px] text-white/70 mt-0.5">
            Event #{eventId}
            {current.slug ? ` · /${current.slug}` : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 rounded-xl p-1 self-start">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            onClick={() => setTab(t.key)}
            className={`tab text-[11px] font-bold rounded-lg gap-1.5 ${tab === t.key ? "tab-active" : ""}`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="badge badge-xs badge-ghost">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Fact label="Date" value={fmtDate(current.date)} icon={<CalendarDays size={10} />} />
            <Fact label="Time" value={fmtTime(current.time)} icon={<Clock size={10} />} />
            <Fact label="Tickets sold" value={ticketsQ.isLoading ? "…" : `${sold} / ${capacity}`} icon={<TicketIcon size={10} />} />
            <Fact label="Revenue" value={revenueQ.isLoading && ticketsQ.isLoading ? "…" : money(revenue)} icon={<DollarSign size={10} />} />
          </div>

          {current.description ? (
            <div className="bg-base-200/40 border border-base-200 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50 mb-1">Description</p>
              <p className="text-xs leading-relaxed text-base-content/80 whitespace-pre-line">{current.description}</p>
            </div>
          ) : (
            <div className="text-[11px] text-base-content/50">No description has been added.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Organization */}
            <div className="border border-base-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50 flex items-center gap-1.5">
                <Building2 size={11} /> Organization
              </p>
              {org ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-base-200">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate flex items-center gap-1.5">
                        {org.name}
                        {org.isVerified && <ShieldCheck size={14} className="text-success shrink-0" />}
                      </p>
                      <p className="text-[11px] text-base-content/50 truncate">
                        {org.slug ? `@${org.slug} · ` : ""}Org #{org.orgId ?? org.id ?? current.orgId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] text-base-content/70">
                    {org.supportEmail && (
                      <span className="flex items-center gap-1.5 break-all">
                        <Mail size={12} className="text-primary shrink-0" /> {org.supportEmail}
                      </span>
                    )}
                    {org.supportPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-primary shrink-0" /> {org.supportPhone}
                      </span>
                    )}
                    <span className="flex flex-wrap gap-1.5 pt-1">
                      <span className={`badge badge-sm font-bold ${org.isVerified ? "badge-success" : "badge-ghost"}`}>
                        {org.isVerified ? "Verified" : "Not verified"}
                      </span>
                      {org.isActive === false && <span className="badge badge-sm badge-error font-bold">Suspended</span>}
                      {org.commissionPercentage != null && (
                        <span className="badge badge-sm badge-outline font-bold">{org.commissionPercentage}% commission</span>
                      )}
                    </span>
                  </div>
                </>
              ) : orgQ.isLoading ? (
                <span className="loading loading-spinner loading-sm text-primary" />
              ) : (
                <p className="text-xs text-base-content/60">Organization #{current.orgId ?? "-"} (details not available)</p>
              )}
            </div>

            {/* Venue */}
            <div className="border border-base-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50 flex items-center gap-1.5">
                <MapPin size={11} /> Venue
              </p>
              {venue ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{venue.name}</p>
                      <p className="text-[11px] text-base-content/50 truncate">Venue #{venue.venueId ?? venue.id ?? current.venueId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] text-base-content/70">
                    {(venue.location || venue.address) && (
                      <span className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
                        {[venue.location, venue.address].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {venue.capacity != null && (
                      <span className="flex items-center gap-1.5">
                        <Users size={12} className="text-primary shrink-0" /> Capacity {num(venue.capacity).toLocaleString()} people
                      </span>
                    )}
                    {venue.description && <span className="text-base-content/60">{venue.description}</span>}
                  </div>
                </>
              ) : (
                <p className="text-xs text-base-content/60">Venue #{current.venueId ?? "-"} (details not available)</p>
              )}
            </div>
          </div>

          {current.cancellationPolicy && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-warning mb-1 flex items-center gap-1">
                <FileText size={11} /> Cancellation policy
              </p>
              <p className="text-xs leading-relaxed text-base-content/80 whitespace-pre-line">{current.cancellationPolicy}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] text-base-content/50">
            <span>Created: {fmtDateTime(current.createdAt)}</span>
            <span className="text-right">Updated: {fmtDateTime(current.updatedAt)}</span>
          </div>
        </div>
      )}

      {/* TICKETS */}
      {tab === "tickets" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Fact label="Capacity" value={capacity.toLocaleString()} />
            <Fact label="Sold" value={sold.toLocaleString()} />
            <Fact label="Remaining" value={remaining.toLocaleString()} />
            <Fact label="Revenue" value={money(revenue)} />
          </div>

          {ticketsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-10 bg-base-200/30 border border-dashed border-base-300 rounded-2xl">
              <TicketIcon size={30} className="mx-auto text-primary/40 mb-2" />
              <p className="text-xs font-bold">No ticket types yet</p>
              <p className="text-[11px] text-base-content/50">The organizer has not set up ticket tiers for this event.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-semibold text-base-content/60">
                  <span>Overall sell-through</span>
                  <span>{sellThrough}%</span>
                </div>
                <progress className="progress progress-primary w-full h-2" value={sellThrough} max={100} />
              </div>

              <div className="border border-base-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full text-xs min-w-[520px]">
                    <thead>
                      <tr className="bg-base-200/50 text-base-content/70">
                        <th>Ticket tier</th>
                        <th>Price</th>
                        <th>Sold / Qty</th>
                        <th>Revenue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t, i) => {
                        const full = t.quantity > 0 && t.sold >= t.quantity;
                        const pctSold = t.quantity > 0 ? Math.round((t.sold / t.quantity) * 100) : 0;
                        return (
                          <tr key={`${t.id}-${i}`} className="border-b border-base-100">
                            <td className="font-bold">{t.name}</td>
                            <td className="font-semibold">{money(t.price)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <progress className={`progress w-16 h-1.5 ${full ? "progress-error" : "progress-primary"}`} value={pctSold} max={100} />
                                <span className="font-semibold">
                                  {t.sold} / {t.quantity}
                                </span>
                              </div>
                            </td>
                            <td className="font-bold text-success">{money(t.sold * t.price)}</td>
                            <td>
                              <span className={`badge badge-sm font-bold ${full ? "badge-error" : "badge-success"}`}>
                                {full ? "Sold out" : "Available"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MEDIA */}
      {tab === "media" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Fact label="Total media" value={media.length} icon={<Images size={10} />} />
            <Fact label="Images" value={images.length} icon={<ImageIcon size={10} />} />
            <Fact label="Videos" value={videos.length} icon={<Video size={10} />} />
          </div>

          {mediaQ.isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-10 bg-base-200/30 border border-dashed border-base-300 rounded-2xl">
              <Images size={30} className="mx-auto text-primary/40 mb-2" />
              <p className="text-xs font-bold">No photos or videos yet</p>
              <p className="text-[11px] text-base-content/50">The organizer has not uploaded any media for this event.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {media.map((m) => (
                <a
                  key={m.mediaId ?? m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-base-200 border border-base-200"
                  title={m.altText || "Open media"}
                >
                  {m.type === "video" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-primary bg-gradient-to-br from-primary/15 to-secondary/15">
                      <Video size={28} />
                      <span className="text-[10px] font-bold">Video</span>
                    </div>
                  ) : (
                    <img
                      src={m.url}
                      alt={m.altText || "Event media"}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  {m.isPrimary && (
                    <span className="absolute top-2 left-2 badge badge-primary badge-sm gap-1 font-bold shadow">
                      <Star size={9} className="fill-current" /> Primary
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <ExternalLink size={10} /> {m.altText || "Open"}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-base-200">
        <button onClick={onClose} className="btn btn-ghost btn-sm rounded-xl font-bold mr-auto">
          Close
        </button>
        <button onClick={onDelete} className="btn btn-ghost bg-error/10 text-error hover:bg-error/20 btn-sm rounded-xl font-bold gap-1">
          <Trash2 size={13} />
          Delete
        </button>
        <button onClick={onStatus} className="btn btn-ghost bg-info/10 text-info hover:bg-info/20 btn-sm rounded-xl font-bold gap-1">
          <RefreshCw size={13} />
          Change status
        </button>
        <button onClick={onEdit} className="btn btn-primary btn-sm rounded-xl font-bold gap-1">
          <Pencil size={13} />
          Edit event
        </button>
      </div>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// STATUS MODAL
// -----------------------------------------------------------------------------

const StatusModal = ({
  event,
  onClose,
  onSuccess,
  onError,
}: {
  event: EventItem;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const [status, setStatus] = useState(statusKey(event) || "upcoming");
  const [updateStatus, { isLoading }] = useUpdateEventStatusMutation();
  const selected = STATUS_OPTIONS.find((o) => o.value === status);

  const submit = async () => {
    try {
      await updateStatus({ eventId: getApiEventId(event), status }).unwrap();
      onSuccess(`Event status changed to ${status.replace("_", " ")}.`);
    } catch (error: any) {
      onError(errMsg(error, "Failed to update event status."));
    }
  };

  return (
    <ModalShell title="Update Event Status" icon={<RefreshCw size={16} />} onClose={onClose} z="z-[91]">
      <div className="flex flex-col gap-4">
        <div className="bg-base-200/40 border border-base-200 rounded-xl p-3">
          <p className="font-bold text-xs">{event.title}</p>
          <p className="text-[11px] text-base-content/60 mt-1 flex items-center gap-1.5">
            Event #{getApiEventId(event)} · Current status: <StatusBadge status={event.status} />
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((o) => {
            const meta = STATUS_META[o.value];
            const Icon = meta.Icon;
            const active = status === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatus(o.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-base-200 hover:border-primary/40"
                }`}
              >
                <Icon size={15} />
                <span className="text-xs font-bold">{o.label}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-[11px] font-semibold border ${
              status === "cancelled" ? "bg-error/5 border-error/20 text-error" : "bg-info/5 border-info/20 text-info"
            }`}
          >
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>{selected.hint}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
          <button onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button onClick={submit} disabled={isLoading || status === statusKey(event)} className="btn btn-primary btn-sm rounded-xl font-bold">
            {isLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <>
                <CheckCircle2 size={13} /> Update status
              </>
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// EMPTY STATE
// -----------------------------------------------------------------------------

const NoEventsFound = ({
  search,
  hasFilters,
  onClear,
}: {
  search: string;
  hasFilters: boolean;
  onClear: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden text-center py-14 px-6 bg-gradient-to-b from-base-200/40 to-base-200/10 rounded-3xl border border-dashed border-base-300"
  >
    <div className="relative flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        {search ? <Search size={30} /> : <CalendarDays size={30} />}
      </div>
      <div className="max-w-sm">
        <h3 className="font-black text-lg">No events found</h3>
        <p className="text-xs text-base-content/60 mt-1">
          {search
            ? `Nothing matches "${search}". Try another event title.`
            : hasFilters
            ? "No events match the selected filters."
            : "No events have been created yet."}
        </p>
      </div>
      {(search || hasFilters) && (
        <button onClick={onClear} className="btn btn-primary btn-sm rounded-xl gap-1.5 font-bold">
          <X size={13} />
          Clear filters
        </button>
      )}
    </div>
  </motion.div>
);

// -----------------------------------------------------------------------------
// MAIN ADMIN EVENT MANAGER
// -----------------------------------------------------------------------------

export const AdminEventManager = () => {
  usePageTitle("Events");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [viewing, setViewing] = useState<EventItem | null>(null);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [statusEvent, setStatusEvent] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // API: EVENTS
  // ---------------------------------------------------------------------------

  const allEvents = useGetAllEventsQuery(undefined);
  const titleSearch = useGetEventsByTitleQuery(debouncedSearch, { skip: !debouncedSearch });
  const categoryEvents = useGetEventsByCategoryQuery(categoryFilter, {
    skip: categoryFilter === "all" || Boolean(debouncedSearch),
  });

  const source = debouncedSearch ? titleSearch : categoryFilter !== "all" ? categoryEvents : allEvents;

  const events = useMemo(() => {
    const list = toList(source.data);
    const seen = new Set<string>();
    return list.filter((event) => {
      const key = String(getEventId(event));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [source.data]);

  // ---------------------------------------------------------------------------
  // API: ORGANIZATIONS, VENUES, TICKET TYPES (used to enrich every event)
  // ---------------------------------------------------------------------------

  const orgsQ = useGetAllOrganizationsAdminQuery();
  const venuesQ = useGetAllVenuesQuery();
  const ticketTypesQ = useGetAllTicketTypesQuery(undefined);

  const orgList = useMemo(() => toArray(orgsQ.data), [orgsQ.data]);
  const venueList = useMemo(() => toArray(venuesQ.data), [venuesQ.data]);

  const orgById = useMemo(() => {
    const map = new Map<string, any>();
    orgList.forEach((o) => map.set(String(o.orgId ?? o.id), o));
    return map;
  }, [orgList]);

  const venueById = useMemo(() => {
    const map = new Map<string, any>();
    venueList.forEach((v) => map.set(String(v.venueId ?? v.id), v));
    return map;
  }, [venueList]);

  const orgOptions: Option[] = useMemo(
    () =>
      orgList
        .map((o) => ({ value: String(o.orgId ?? o.id), label: `${o.name}${o.isVerified ? " ✓" : ""}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [orgList]
  );

  const venueOptions: Option[] = useMemo(
    () =>
      venueList
        .map((v) => ({ value: String(v.venueId ?? v.id), label: `${v.name}${v.location ? ` · ${v.location}` : ""}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [venueList]
  );

  const ticketStats = useMemo(() => {
    const map = new Map<string, { tiers: number; minPrice: number; maxPrice: number; sold: number; capacity: number }>();
    toArray(ticketTypesQ.data).forEach((t: any) => {
      const key = String(t.eventId ?? t.event_id ?? t.event?.eventId ?? "");
      if (!key) return;
      const cur = map.get(key) ?? { tiers: 0, minPrice: Infinity, maxPrice: 0, sold: 0, capacity: 0 };
      const price = num(t.price);
      cur.tiers += 1;
      cur.minPrice = Math.min(cur.minPrice, price);
      cur.maxPrice = Math.max(cur.maxPrice, price);
      cur.sold += num(t.sold);
      cur.capacity += num(t.quantity);
      map.set(key, cur);
    });
    return map;
  }, [ticketTypesQ.data]);

  const statsFor = (event: EventItem) => ticketStats.get(String(getEventId(event)));

  // ---------------------------------------------------------------------------
  // CLIENT FILTERS
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    return events
      .filter((e) => statusFilter === "all" || statusKey(e) === statusFilter)
      .filter((e) => orgFilter === "all" || String(e.orgId ?? "") === orgFilter)
      .filter((e) => {
        if (!search) return true;
        const orgName = orgById.get(String(e.orgId ?? ""))?.name ?? "";
        return (
          e.title?.toLowerCase().includes(search) ||
          e.slug?.toLowerCase().includes(search) ||
          e.category?.toLowerCase().includes(search) ||
          String(orgName).toLowerCase().includes(search) ||
          String(getEventId(e)).includes(search)
        );
      })
      .sort(
        (a, b) =>
          new Date(`${String(b.date ?? "").slice(0, 10)}T${b.time ?? "00:00"}`).getTime() -
          new Date(`${String(a.date ?? "").slice(0, 10)}T${a.time ?? "00:00"}`).getTime()
      );
  }, [events, statusFilter, orgFilter, debouncedSearch, orgById]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, orgFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => statusKey(e) === "upcoming").length;
  const endedEvents = events.filter((e) => statusKey(e) === "ended").length;
  const totalSold = Array.from(ticketStats.values()).reduce((s, t) => s + t.sold, 0);

  const hasFilters = categoryFilter !== "all" || statusFilter !== "all" || orgFilter !== "all";
  const isLoading = source.isLoading || (source.isFetching && filtered.length === 0);

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  const notifySuccess = (message: string) => {
    setErrorMessage("");
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const notifyError = (message: string) => {
    setSuccessMessage("");
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOrgFilter("all");
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">Events</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Admin</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{totalEvents}</span> total events ·{" "}
              <span className="font-bold text-base-content">{upcomingEvents}</span> upcoming · open any event to see its
              organization, venue, tickets and media
            </p>
          </div>
        </div>

        <button onClick={() => setCreating(true)} className="btn btn-primary btn-sm rounded-xl font-bold gap-1.5">
          <Plus size={15} />
          Create event
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="alert alert-success text-xs font-semibold py-2 rounded-xl shadow-sm">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total events", value: totalEvents, Icon: CalendarDays, chip: "bg-primary/10 text-primary" },
          { label: "Upcoming", value: upcomingEvents, Icon: Clock, chip: "bg-info/10 text-info" },
          { label: "Ended", value: endedEvents, Icon: Flag, chip: "bg-success/10 text-success" },
          { label: "Tickets sold", value: totalSold.toLocaleString(), Icon: TicketIcon, chip: "bg-warning/10 text-warning" },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-base-content/60 font-semibold">{metric.label}</span>
              <div className="text-base sm:text-lg font-black">{metric.value}</div>
            </div>
            <div className={`p-2.5 rounded-xl ${metric.chip}`}>
              <metric.Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search events by title, slug, category, organization or ID"
            className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs pl-9 pr-8"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle h-5 min-h-0 w-5"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold capitalize"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All organizations</option>
            {orgOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : source.isError ? (
        <div className="alert alert-error text-xs font-semibold rounded-xl">
          <AlertCircle size={16} />
          <span>{errMsg((source as any).error, "Could not load events.")}</span>
        </div>
      ) : pageItems.length === 0 ? (
        <NoEventsFound search={debouncedSearch} hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs min-w-[1050px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Venue</th>
                  <th className="py-3 px-4">Organization</th>

                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((event) => {
                  const eventId = getApiEventId(event);
                  const org = orgById.get(String(event.orgId ?? ""));
                  const venue = event.venue ?? venueById.get(String(event.venueId ?? ""));
                  const stats = statsFor(event);

                  return (
                    <tr key={String(eventId)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                      {/* EVENT */}
                      <td className="py-3 px-4">
                        <button onClick={() => setViewing(event)} className="flex items-center gap-2.5 min-w-0 text-left group">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <EventThumb eventId={eventId} title={event.title} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base-content truncate max-w-[230px] group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            <p className="text-[11px] text-base-content/60 truncate">
                              #{eventId}
                              {event.slug ? ` · ${event.slug}` : ""}
                            </p>
                          </div>
                        </button>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 capitalize font-semibold text-base-content/70">
                          <Tag size={13} />
                          {catLabel(event.category) || "-"}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="py-3 px-4">
                        <p className="font-semibold">{fmtDate(event.date)}</p>
                        <p className="text-[11px] text-base-content/50">{fmtTime(event.time)}</p>
                      </td>

                      {/* VENUE */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-base-content/70 font-semibold max-w-[170px]">
                          <MapPin size={13} className="shrink-0" />
                          <span className="truncate">{venue?.name || (event.venueId != null ? `Venue #${event.venueId}` : "-")}</span>
                        </span>
                      </td>

                      {/* ORGANIZATION */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-base-content/70 font-semibold max-w-[180px]">
                          <Building2 size={13} className="shrink-0" />
                          <span className="truncate">{org?.name || (event.orgId != null ? `Org #${event.orgId}` : "-")}</span>
                          {org?.isVerified && <ShieldCheck size={12} className="text-success shrink-0" />}
                        </span>
                      </td>

                   

                      {/* STATUS */}
                      <td className="py-3 px-4">
                        <StatusBadge status={event.status} />
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <button
                            onClick={() => setViewing(event)}
                            className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg"
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setEditing(event)}
                            className="btn btn-ghost btn-xs text-info hover:bg-info/10 rounded-lg"
                            title="Edit event"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setStatusEvent(event)}
                            className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 rounded-lg"
                            title="Change status"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting(event)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                            title="Delete event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-base-200 bg-base-200/30">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-base-content/60 font-semibold">
              <span>
                Showing{" "}
                <span className="text-base-content">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="text-base-content">{filtered.length}</span>
              </span>
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
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
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {creating && (
          <EventFormModal
            key="create"
            orgOptions={orgOptions}
            venueOptions={venueOptions}
            onClose={() => setCreating(false)}
            onSuccess={(message) => {
              setCreating(false);
              notifySuccess(message);
            }}
            onError={notifyError}
          />
        )}

        {editing && (
          <EventFormModal
            key={`edit-${String(getApiEventId(editing))}`}
            event={editing}
            orgOptions={orgOptions}
            venueOptions={venueOptions}
            onClose={() => setEditing(null)}
            onSuccess={(message) => {
              setEditing(null);
              notifySuccess(message);
            }}
            onError={notifyError}
          />
        )}

        {viewing && (
          <ViewEventModal
            key={`view-${String(getApiEventId(viewing))}`}
            event={viewing}
            orgById={orgById}
            venueById={venueById}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setViewing(null);
              setEditing(viewing);
            }}
            onStatus={() => {
              setViewing(null);
              setStatusEvent(viewing);
            }}
            onDelete={() => {
              setViewing(null);
              setDeleting(viewing);
            }}
          />
        )}

        {statusEvent && (
          <StatusModal
            key={`status-${String(getApiEventId(statusEvent))}`}
            event={statusEvent}
            onClose={() => setStatusEvent(null)}
            onSuccess={(message) => {
              setStatusEvent(null);
              notifySuccess(message);
            }}
            onError={notifyError}
          />
        )}

        {deleting && (
          <ConfirmDeleteModal
            key={`delete-${String(getApiEventId(deleting))}`}
            event={deleting}
            soldCount={statsFor(deleting)?.sold ?? 0}
            onClose={() => setDeleting(null)}
            onSuccess={(message) => {
              setDeleting(null);
              notifySuccess(message);
            }}
            onError={notifyError}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEventManager;