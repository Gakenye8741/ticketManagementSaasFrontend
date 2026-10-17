import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Search,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Building2,
  Ticket,
  Rocket,
  Warehouse,
  UploadCloud,
  Star,
  Video,
  ArrowLeft,
  Check,
  FileText,
  ExternalLink,
  Flag,
  PlayCircle,
  Ban,
  ListChecks,
  // NEW icons (used by the guide, tips and page links)
  ArrowRight,
  BookOpen,
  Lightbulb,
  Copy,
  ChevronDown,
} from "lucide-react";
import {
  useGetEventsByOrganizationQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useDeleteEventMutation,
} from "../../features/APIS/EventsApi";
import {
  useGetAllVenuesQuery,
  useCreateVenueMutation,
} from "../../features/APIS/VenueApi";
import {
  useGetTicketTypesByEventIdQuery,
  useCreateTicketTypeMutation,
  useDeleteTicketTypeMutation,
} from "../../features/APIS/ticketsType.Api";
import {
  useGetMediaByEventIdQuery,
  useGetPrimaryMediaByEventIdQuery,
  useBulkCreateMediaMutation,
  useDeleteMediaMutation,
  useSetMediaAsPrimaryMutation,
} from "../../features/APIS/mediaApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";
import { useSelector } from "react-redux";
import { RootState } from "../../App/store";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const CURRENCY = "KSH";
const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";
const ITEMS_PER_PAGE = 6;

// Other dashboard pages (matches your router)
const ROUTES = {
  venues: "/organizer-dashboard/my-venues",
  ticketTypes: "/organizer-dashboard/ticket-types",
  media: "/organizer-dashboard/media",
  organization: "/organizer-dashboard/my-organization",
};

const EVENT_CATEGORIES = [
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

/**
 * Event status enum. These are the ONLY values the backend accepts.
 * There is no "draft" or "published". An event is simply "upcoming" until it starts,
 * and setup progress is calculated separately from the venue, tickets and media.
 */
const STATUSES = [
  { value: "upcoming", label: "Upcoming", hint: "Open for attendees, not started yet.", icon: Calendar, badge: "badge-info", select: "select-info", tint: "text-info bg-info/10" },
  { value: "in_progress", label: "In progress", hint: "The event is happening now.", icon: PlayCircle, badge: "badge-success", select: "select-success", tint: "text-success bg-success/10" },
  { value: "ended", label: "Ended", hint: "The event is over.", icon: Flag, badge: "badge-neutral", select: "select-ghost", tint: "text-base-content/70 bg-base-300/60" },
  { value: "cancelled", label: "Cancelled", hint: "The event will not take place.", icon: Ban, badge: "badge-error", select: "select-error", tint: "text-error bg-error/10" },
] as const;

type EventStatus = (typeof STATUSES)[number]["value"];
const statusCfg = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

// The four steps of setting up an event. Each one is worth 25% of the progress bar.
const STEPS = [
  { key: "venue", label: "Venue", desc: "Where it happens", icon: Warehouse },
  { key: "details", label: "Details", desc: "Title, date and time", icon: FileText },
  { key: "tickets", label: "Tickets", desc: "What attendees buy", icon: Ticket },
  { key: "media", label: "Media", desc: "Photos and videos", icon: ImageIcon },
  { key: "review", label: "Review", desc: "Check and set status", icon: ListChecks },
];

const toArray = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
const evId = (e: any) => e?.eventId ?? e?.id ?? e?._id;
/** Always returns one of the 4 valid enum values. Old values like "published" or "draft" show as upcoming. */
const evStatus = (e: any): EventStatus => {
  const raw = String(e?.eventStatus || e?.status || "upcoming");
  return (STATUSES.some((s) => s.value === raw) ? raw : "upcoming") as EventStatus;
};
const evVenueId = (e: any) => e?.venueId ?? e?.venue?.venueId ?? e?.venue?.id;

/** Reads the logged-in organizer's orgId from local storage. */
const getStoredOrgId = (): number | null => {
  const pick = (o: any): any =>
    o?.orgId ?? o?.organizationId ?? o?.organization?.orgId ?? o?.org?.orgId ?? null;
  try {
    // 👇 Add your real key here if it is not in this list
    for (const key of ["orgId", "organizationId", "user", "authUser", "userInfo", "organizer"]) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      let value: any = raw;
      try {
        value = JSON.parse(raw);
      } catch {
        /* it is a plain string, use it as it is */
      }
      const n = Number(typeof value === "object" ? pick(value) : value);
      if (Number.isInteger(n) && n > 0) return n;
    }
  } catch {
    /* local storage is not available */
  }
  return null;
};

const vId = (v: any) => Number(v?.venueId ?? v?.id);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const fmtDate = (d?: string) => {
  if (!d) return "Date not set";
  const dt = new Date(String(d).substring(0, 10));
  return isNaN(dt.getTime()) ? String(d).substring(0, 10) : dt.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

/** Pull an id out of whatever shape the API returns after a create call. */
const pickId = (res: any, keys: string[]) => {
  const o = res?.data ?? res;
  const first = Array.isArray(o) ? o[0] : o;
  for (const k of keys) if (first?.[k]) return first[k];
  return null;
};

const errMsg = (err: any, fallback: string) =>
  err?.data?.message ||
  (Array.isArray(err?.data?.error) ? err.data.error.map((x: any) => x.message).join(", ") : "") ||
  (typeof err?.data?.error === "string" ? err.data.error : "") ||
  err?.message ||
  fallback;

const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
const modalMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
};
const inputCls = "input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs";
const labelCls = "font-semibold text-base-content/70 text-[11px]";
const cardCls = "bg-base-100 border border-base-200 rounded-2xl shadow-sm";

/* -------------------------------------------------------------------------- */
/* NEW: GUIDE, STEP TIPS AND LINKS TO OTHER PAGES                             */
/*                                                                            */
/* 1. HowItWorksPanel / GuideModal  - a short guide in simple English         */
/* 2. StepTip                       - one helpful tip at the top of each step */
/* 3. PageLinkButton                - a nice link to another page. Before the */
/*    user leaves, a small window tells them to use the dropdown on that page */
/*    and choose the name of their event.                                     */
/* -------------------------------------------------------------------------- */

type PageKey = "venues" | "ticketTypes" | "media";

const PAGE_INFO: Record<PageKey, { title: string; short: string; route: string; icon: any; needsEvent: boolean; about: string }> = {
  venues: {
    title: "Venues page",
    short: "Venues",
    route: ROUTES.venues,
    icon: Warehouse,
    needsEvent: false,
    about: "Add, change or remove your venues.",
  },
  ticketTypes: {
    title: "Ticket Types page",
    short: "Ticket Types",
    route: ROUTES.ticketTypes,
    icon: Ticket,
    needsEvent: true,
    about: "Change the price or amount of your tickets.",
  },
  media: {
    title: "Media page",
    short: "Media",
    route: ROUTES.media,
    icon: ImageIcon,
    needsEvent: true,
    about: "See, add or remove photos and videos.",
  },
};

// "Don't show this again" is remembered in the browser
const SKIP_NOTICE_KEY = "eventManager.skipPageNotice";
const readSkipNotice = () => {
  try {
    return window.localStorage.getItem(SKIP_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
};
const writeSkipNotice = () => {
  try {
    window.localStorage.setItem(SKIP_NOTICE_KEY, "1");
  } catch {
    /* storage is not available, so we just ask again next time */
  }
};

const STEP_TIPS = [
  'Tip: Can\'t find your venue? Press "My venue isn\'t listed" and add it.',
  "Tip: Check the date and time well. Attendees will see them.",
  "Tip: Add at least one ticket type. Use a price of 0 for a free event.",
  "Tip: The first photo you upload becomes the banner. You can change it later.",
  "Tip: When all four parts are done, the bar reaches 100%.",
];

const GUIDE_STEPS = [
  { icon: Plus, title: "Start a new event", text: "Press the New Event button at the top of the page." },
  { icon: Warehouse, title: "Choose where it happens", text: "Pick a venue from the list. If your venue is not there, add it." },
  { icon: FileText, title: "Write the details", text: "Add the title, a short description, the type, the date and the time. Your event is saved here." },
  { icon: Ticket, title: "Add your tickets", text: "Give each ticket a name, a price and a number. Use 0 as the price for a free ticket." },
  { icon: ImageIcon, title: "Add photos", text: "Upload pictures or a video. The first picture becomes the banner." },
  { icon: ListChecks, title: "Check and finish", text: "Look at the checklist, fix what is missing, and set the status of your event." },
];

const useEscape = (active: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
};

/** One short tip at the top of every step. */
const StepTip = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15, duration: 0.25 }}
    className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2 text-[11px] text-base-content/70"
  >
    <Lightbulb size={13} className="text-warning shrink-0 mt-0.5" />
    <span>{text}</span>
  </motion.div>
);

/** The small window that opens before the user goes to another page. */
const GoToPageModal = ({ open, page, eventTitle, onClose }: { open: boolean; page: PageKey; eventTitle?: string; onClose: () => void }) => {
  const info = PAGE_INFO[page];
  const Icon = info.icon;
  const name = eventTitle?.trim();
  const [dontShow, setDontShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEscape(open, onClose);

  const copyName = async () => {
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* copy is not available, nothing to do */
    }
  };

  const steps = info.needsEvent
    ? [
        `You will open the ${info.title}.`,
        "Look at the top of that page. You will see a dropdown. A dropdown is a box that opens a list when you click it.",
        name ? `Click the dropdown and choose "${name}".` : "Click the dropdown and choose the name of your event.",
        "Do what you need to do there. Then press the Back button in your browser to come back here.",
      ]
    : [
        `You will open the ${info.title}.`,
        "Add or change your venue there.",
        "Press the Back button in your browser to come back here.",
        "Then choose your venue from the list.",
      ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            {...modalMotion}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Before you go to the ${info.title}`}
            className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary/15 via-base-200/50 to-transparent p-4 flex items-center gap-3">
              <motion.span
                initial={{ scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="p-2.5 rounded-xl bg-primary text-primary-content shrink-0"
              >
                <Icon size={18} />
              </motion.span>
              <div className="flex flex-col min-w-0">
                <h3 className="font-black text-sm text-base-content">Before you go to the {info.title}</h3>
                <p className="text-[11px] text-base-content/60">
                  {info.needsEvent ? "That page shows many events, so you must pick yours first." : info.about}
                </p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg ml-auto shrink-0" title="Close">
                <X size={14} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              {info.needsEvent && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-base-content/70">Choose this name in the dropdown:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-xs font-bold text-base-content">
                      <span className="truncate">{name || "The name of your event"}</span>
                      <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}>
                        <ChevronDown size={14} className="text-primary" />
                      </motion.span>
                    </div>
                    {name && (
                      <button type="button" onClick={copyName} className="btn btn-ghost btn-xs rounded-lg gap-1 text-[11px] text-primary bg-primary/10 shrink-0" title="Copy the event name">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <ol className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <motion.li
                    key={s}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i + 0.1, duration: 0.22 }}
                    className="flex items-start gap-2.5 text-xs text-base-content/80"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                    <span className="leading-relaxed">{s}</span>
                  </motion.li>
                ))}
              </ol>

              <label className="flex items-center gap-2 text-[11px] text-base-content/60 cursor-pointer w-fit">
                <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="checkbox checkbox-xs checkbox-primary" />
                Don't show this message again
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-base-200">
                <button onClick={onClose} className="btn btn-ghost btn-sm rounded-xl text-xs font-bold">
                  Stay here
                </button>
                <Link
                  to={info.route}
                  onClick={() => {
                    if (dontShow) writeSkipNotice();
                    onClose();
                  }}
                  className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5"
                >
                  Take me there <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/**
 * A good-looking link to another dashboard page.
 *  - compact: a small pill, good for headers and notes
 *  - card:    a bigger button with an icon and a short line of text
 * When clicked, it first shows the "Before you go" window (unless the user turned it off).
 */
const PageLinkButton = ({ page, eventTitle, label, compact = false }: { page: PageKey; eventTitle?: string; label?: string; compact?: boolean }) => {
  const info = PAGE_INFO[page];
  const Icon = info.icon;
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Let people open the page in a new tab without the message
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (readSkipNotice()) return;
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      {compact ? (
        <motion.div whileTap={{ scale: 0.96 }} className="inline-flex shrink-0">
          <Link
            to={info.route}
            onClick={handleClick}
            className="group inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-content transition-colors"
          >
            <Icon size={12} />
            <span>{label ?? `Open ${info.short}`}</span>
            <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </motion.div>
      ) : (
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="w-full">
          <Link
            to={info.route}
            onClick={handleClick}
            className="group flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-3 hover:border-primary/50 hover:shadow-md transition-all"
          >
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors shrink-0">
              <Icon size={16} />
            </span>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-black text-base-content">{label ?? info.title}</span>
              <span className="text-[10px] text-base-content/60 line-clamp-2">{info.about}</span>
            </span>
            <ArrowRight size={14} className="text-primary shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}
      <GoToPageModal open={open} page={page} eventTitle={eventTitle} onClose={() => setOpen(false)} />
    </>
  );
};

/** The guide itself: steps, a few notes, and links to the other pages. */
const GuideContent = ({ eventTitle }: { eventTitle?: string }) => (
  <div className="flex flex-col gap-5">
    <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {GUIDE_STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
            className="flex items-start gap-3 rounded-xl border border-base-200 bg-base-100 p-3"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon size={14} />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-base-content">
                {i + 1}. {s.title}
              </span>
              <span className="text-[11px] text-base-content/60 leading-relaxed">{s.text}</span>
            </span>
          </motion.li>
        );
      })}
    </ol>

    <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs font-black text-base-content">
        <Lightbulb size={14} className="text-warning" /> Good to know
      </div>
      <ul className="flex flex-col gap-1 text-[11px] text-base-content/70 leading-relaxed list-disc pl-5">
        <li>The bar shows how much you have done. Venue, Details, Tickets and Photos are each worth 25%.</li>
        <li>You can stop at any time. Press "Continue setup" on your event to carry on later.</li>
        <li>Status: an event is Upcoming first, then In progress, then Ended. Choose Cancelled if it will not happen.</li>
      </ul>
    </div>

    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-black text-base-content">Need to use another page?</h3>
        <p className="text-[11px] text-base-content/60 leading-relaxed">
          The Ticket Types and Media pages have a dropdown at the top. Choose the name of your event there first. Then you will see the right tickets and photos.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <PageLinkButton page="venues" eventTitle={eventTitle} />
        <PageLinkButton page="ticketTypes" eventTitle={eventTitle} />
        <PageLinkButton page="media" eventTitle={eventTitle} />
      </div>
    </div>
  </div>
);

/** The guide as a panel that slides open on the events list. */
const HowItWorksPanel = ({ open }: { open: boolean }) => (
  <AnimatePresence initial={false}>
    {open && (
      <motion.section
        key="how-it-works"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className={`${cardCls} p-4 sm:p-5 flex flex-col gap-4`}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <BookOpen size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-black text-sm text-base-content">How it works</h2>
              <p className="text-[11px] text-base-content/60">Follow these steps to make an event that is ready for attendees.</p>
            </div>
          </div>
          <GuideContent />
        </div>
      </motion.section>
    )}
  </AnimatePresence>
);

/** The guide as a window. It is used inside the event setup pages. */
const GuideModal = ({ open, onClose, eventTitle }: { open: boolean; onClose: () => void; eventTitle?: string }) => {
  useEscape(open, onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            {...modalMotion}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="How it works"
            className="bg-base-100 border border-base-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <BookOpen size={18} />
              </span>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-black text-sm text-base-content">How it works</h2>
                <p className="text-[11px] text-base-content/60">A short guide to setting up your event.</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg ml-auto shrink-0" title="Close">
                <X size={14} />
              </button>
            </div>
            <GuideContent eventTitle={eventTitle} />
            <div className="flex justify-end pt-3 border-t border-base-200">
              <button onClick={onClose} className="btn btn-primary btn-sm rounded-xl text-xs font-bold">
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/* SETUP PROGRESS                                                             */
/* One hook computes how complete an event is. Cards, table and wizard all    */
/* use it, so the percentage is the same everywhere.                          */
/* -------------------------------------------------------------------------- */

const useSetupProgress = (eventId: number | string | null | undefined, event: any, venueId?: number | null) => {
  const id = Number(eventId);
  const skip = !id || isNaN(id);

  const ticketsQ = useGetTicketTypesByEventIdQuery(id, { skip });
  const mediaQ = useGetMediaByEventIdQuery(id, { skip });

  const tickets = toArray(ticketsQ.data);
  const media = toArray(mediaQ.data);

  const checks = {
    venue: Boolean(venueId ?? evVenueId(event)),
    details: !skip,
    tickets: tickets.length > 0,
    media: media.length > 0,
  };

  const done = Object.values(checks).filter(Boolean).length;

  // The first step that still needs work. 4 = everything is done, go to review.
  const nextStep = !checks.venue ? 0 : !checks.details ? 1 : !checks.tickets ? 2 : !checks.media ? 3 : 4;

  return {
    checks,
    percent: done * 25,
    nextStep,
    complete: done === 4,
    tickets,
    media,
    refetchTickets: () => (skip ? undefined : ticketsQ.refetch()),
    refetchMedia: () => (skip ? undefined : mediaQ.refetch()),
  };
};

const ProgressBar = ({ percent, compact = false }: { percent: number; compact?: boolean }) => (
  <div className="flex flex-col gap-1 w-full">
    <progress
      className={`progress ${percent === 100 ? "progress-success" : "progress-primary"} w-full ${compact ? "h-1.5" : "h-2"}`}
      value={percent}
      max={100}
    ></progress>
    <div className="flex items-center justify-between text-[10px] font-semibold">
      <span className="text-base-content">{percent}% set up</span>
      <span className={percent === 100 ? "text-success" : "text-base-content/50"}>
        {percent === 100 ? "Setup complete" : `${100 - percent}% to go`}
      </span>
    </div>
  </div>
);

const StatusSelect = ({ value, onChange, size = "xs" }: { value: EventStatus; onChange: (v: EventStatus) => void; size?: "xs" | "sm" }) => {
  const cfg = statusCfg(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EventStatus)}
      title="Change event status"
      className={`select select-${size} ${cfg.select} rounded-lg font-bold text-[11px] cursor-pointer bg-base-100/90`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
};

/* -------------------------------------------------------------------------- */
/* EVENT THUMBNAIL                                                            */
/* -------------------------------------------------------------------------- */

const EventThumb = ({ eventId }: { eventId: number | string }) => {
  const numericId = Number(eventId);
  const { data: mediaData } = useGetPrimaryMediaByEventIdQuery(numericId, {
    skip: !numericId || isNaN(numericId),
  }) as { data: any };

  const imageUrl =
    typeof mediaData === "string"
      ? mediaData
      : mediaData?.url || mediaData?.data?.url || (Array.isArray(mediaData) ? mediaData[0]?.url || mediaData[0] : null);

  if (!imageUrl || typeof imageUrl !== "string") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-base-300/60 to-base-200 flex items-center justify-center text-base-content/40">
        <ImageIcon size={22} />
      </div>
    );
  }
  return <img src={imageUrl} alt="Event banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />;
};

/* -------------------------------------------------------------------------- */
/* EVENT ITEM (grid card or table row)                                        */
/* -------------------------------------------------------------------------- */

type ItemProps = {
  event: any;
  view: "grid" | "table";
  onOpen: (event: any, step: number) => void;
  onChangeStatus: (eventId: number | string, status: EventStatus) => void;
  onDelete: (eventId: number | string, title: string) => void;
};

const EventItem = ({ event, view, onOpen, onChangeStatus, onDelete }: ItemProps) => {
  const eventId = evId(event);
  const status = evStatus(event);
  const progress = useSetupProgress(eventId, event);

  const statusControl = <StatusSelect value={status} onChange={(v) => onChangeStatus(eventId, v)} />;

  const actions = (compact: boolean) => (
    <div className="flex items-center justify-end gap-1">
      {!progress.complete && (
        <button
          onClick={() => onOpen(event, progress.nextStep)}
          className="btn btn-primary btn-xs rounded-lg gap-1 text-[11px]"
          title="Continue where you left off"
        >
          <Rocket size={12} />
          {!compact && <span>Continue setup</span>}
        </button>
      )}
      <button
        onClick={() => onOpen(event, 1)}
        className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
        title="Edit details"
      >
        <Edit size={12} />
        {!compact && <span>Edit</span>}
      </button>
      <button
        onClick={() => onDelete(eventId, event.title)}
        className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg gap-1 text-[11px]"
        title="Delete"
      >
        <Trash2 size={12} />
        {!compact && <span>Delete</span>}
      </button>
    </div>
  );

  if (view === "table") {
    return (
      <tr className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
        <td className="py-2 px-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-base-200 border border-base-300 shrink-0">
            <EventThumb eventId={eventId} />
          </div>
        </td>
        <td className="py-3 px-4 font-bold text-base-content">
          <div className="flex flex-col">
            <span className="line-clamp-1">{event.title}</span>
            <span className="text-[10px] text-base-content/50 font-normal line-clamp-1">{event.description}</span>
          </div>
        </td>
        <td className="py-3 px-4 uppercase text-[10px] font-bold text-primary">{event.category?.replace("_", " ") || "General"}</td>
        <td className="py-3 px-4 text-base-content/70 whitespace-nowrap">
          {event.date ? `${fmtDate(event.date)}${event.time ? ` @ ${event.time}` : ""}` : "Flexible"}
        </td>
        <td className="py-3 px-4 min-w-[140px]">
          <ProgressBar percent={progress.percent} compact />
        </td>
        <td className="py-3 px-4">{statusControl}</td>
        <td className="py-3 px-4 text-right whitespace-nowrap">{actions(true)}</td>
      </tr>
    );
  }

  return (
    <div className="group bg-base-100 border border-base-200 hover:border-primary/40 transition-all duration-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg">
      <div className="w-full h-40 bg-base-200 relative overflow-hidden">
        <EventThumb eventId={eventId} />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5">
          <span className="badge badge-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-sm">
            {event.category?.replace("_", " ") || "General"}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5">{statusControl}</div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-black tracking-tight text-base-content line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
          <p className="text-[11px] text-base-content/60 line-clamp-2 leading-relaxed">{event.description}</p>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-base-100 text-[11px] text-base-content/70">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-primary shrink-0" />
            <span className="truncate">{event.venue?.name || event.venueName || "Venue assigned"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-primary shrink-0" />
            <span>{event.date ? `${fmtDate(event.date)}${event.time ? ` at ${event.time}` : ""}` : "Flexible"}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-base-100">
          <ProgressBar percent={progress.percent} compact />
        </div>

        <div className="pt-2 border-t border-base-100">{actions(false)}</div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* WIZARD                                                                     */
/* Venue → Details → Tickets → Media → Review                                 */
/* The current step lives in the URL (?event=12&step=tickets), so every step  */
/* has its own link you can open, bookmark or share.                          */
/* -------------------------------------------------------------------------- */

type WizardProps = {
  orgId: number;
  event: any | null; // null = brand new event
  stepIndex: number; // from the URL
  onNavigate: (step: number, eventId: number | string | null, replace?: boolean) => void;
  onClose: (message?: string) => void;
};

const emptyVenue = { name: "", address: "", capacity: "", description: "" };

const EventWizard = ({ orgId, event, stepIndex, onNavigate, onClose }: WizardProps) => {
  const eventsQ = useGetEventsByOrganizationQuery(orgId);
  const venuesQ = useGetAllVenuesQuery();
  const venues = useMemo(() => toArray(venuesQ.data), [venuesQ.data]);

  const [createVenue, { isLoading: creatingVenue }] = useCreateVenueMutation();
  const [createEvent, { isLoading: creatingEvent }] = useCreateEventMutation();
  const [updateEvent, { isLoading: updatingEvent }] = useUpdateEventMutation();
  const [updateEventStatus, { isLoading: changingStatus }] = useUpdateEventStatusMutation();
  const [createTicketType, { isLoading: creatingTicket }] = useCreateTicketTypeMutation();
  const [deleteTicketType] = useDeleteTicketTypeMutation();
  const [bulkCreateMedia, { isLoading: savingMedia }] = useBulkCreateMediaMutation();
  const [deleteMedia] = useDeleteMediaMutation();
  const [setAsPrimary] = useSetMediaAsPrimaryMutation();

  const [eventId, setEventId] = useState<number | null>(event ? Number(evId(event)) : null);
  const [venueId, setVenueId] = useState<number | null>(event ? Number(evVenueId(event)) || null : null);
  const [error, setError] = useState("");
  // NEW: opens the "How it works" window
  const [guideOpen, setGuideOpen] = useState(false);

  // The latest copy of this event from the server
  const liveEvent = useMemo(
    () => toArray(eventsQ.data).find((e) => String(evId(e)) === String(eventId)) ?? event,
    [eventsQ.data, eventId, event]
  );
  const progress = useSetupProgress(eventId, liveEvent, venueId);
  const { checks } = progress;
  const currentStatus = evStatus(liveEvent);

  // ---- Navigation -----------------------------------------------------------
  const canGoTo = (i: number) => i === 0 || (i === 1 && Boolean(venueId)) || (i >= 2 && Boolean(eventId));
  // If someone opens a link to a step they cannot reach yet, fall back to the first step
  const step = canGoTo(stepIndex) ? stepIndex : 0;

  const goTo = (i: number) => {
    if (!canGoTo(i)) return;
    onNavigate(i, eventId);
  };
  const stepLink = (i: number) => ({ search: `?event=${eventId ?? "new"}&step=${STEPS[i].key}` });

  useEffect(() => {
    setError("");
  }, [step]);

  // ---- Step 1: venue --------------------------------------------------------
  const [venueMode, setVenueMode] = useState<"existing" | "new" | null>(null);
  const mode = venueMode ?? (venues.length > 0 || venueId ? "existing" : "new");
  const [venueSearch, setVenueSearch] = useState("");
  const [newVenue, setNewVenue] = useState(emptyVenue);

  const filteredVenues = venues.filter((v) => {
    const q = venueSearch.trim().toLowerCase();
    return !q || `${v.name} ${v.address}`.toLowerCase().includes(q);
  });

  const submitVenue = async () => {
    setError("");
    if (mode === "existing") {
      if (!venueId) return setError("Pick a venue, or add a new one.");
      return onNavigate(1, eventId);
    }

    const name = newVenue.name.trim();
    const address = newVenue.address.trim();
    const capacity = Number(newVenue.capacity);
    if (!name) return setError("Give the venue a name.");
    if (!address) return setError("Add the venue address.");
    if (!Number.isInteger(capacity) || capacity <= 0) return setError("Capacity must be a whole number above zero.");

    // Already in the system? Point the organizer to it instead of creating a copy.
    const existing = venues.find((v) => String(v.name).trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      setVenueId(vId(existing));
      setVenueMode("existing");
      return setError(`"${existing.name}" is already in the system. We selected it for you. Press Continue to use it.`);
    }

    try {
      const res = await createVenue({ name, address, capacity, description: newVenue.description.trim() || undefined } as any).unwrap();
      let id = pickId(res, ["venueId", "id"]);
      if (!id) {
        const r = await venuesQ.refetch();
        const found = toArray(r.data).find((v) => String(v.name).trim().toLowerCase() === name.toLowerCase());
        id = found ? vId(found) : null;
      }
      if (!id) throw new Error("The venue was saved but we could not select it. Pick it from the list.");
      setVenueId(Number(id));
      setVenueMode("existing");
      setNewVenue(emptyVenue);
      await venuesQ.refetch();
      onNavigate(1, eventId);
    } catch (err: any) {
      setError(errMsg(err, "Failed to save the venue."));
    }
  };

  // ---- Step 2: details ------------------------------------------------------
  const [details, setDetails] = useState({
    title: event?.title || "",
    description: event?.description || "",
    category: event?.category || "technology",
    date: event?.date ? String(event.date).substring(0, 10) : "",
    time: event?.time || "",
  });

  const submitDetails = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!venueId) return onNavigate(0, eventId);

    const slug = slugify(details.title);
    // No status is sent here. New events start as "upcoming" on the server.
    const base = { ...details, slug, venueId, orgId: Number(orgId) };

    try {
      if (eventId) {
        await updateEvent({ eventId, ...base } as any).unwrap();
        await eventsQ.refetch();
        onNavigate(2, eventId);
      } else {
        const res = await createEvent(base as any).unwrap();
        let id = pickId(res, ["eventId", "id"]);
        if (!id) {
          const r = await eventsQ.refetch();
          const found = toArray(r.data).find((x) => x.slug === slug);
          id = found ? evId(found) : null;
        } else {
          await eventsQ.refetch();
        }
        if (!id) throw new Error("The event was saved but we could not open it. Close this page and continue from the list.");
        setEventId(Number(id));
        // Replace the "new" link with the real event link so a refresh keeps the user here
        onNavigate(2, Number(id), true);
      }
    } catch (err: any) {
      setError(errMsg(err, "Failed to save the event."));
    }
  };

  // ---- Step 3: tickets ------------------------------------------------------
  const [ticketForm, setTicketForm] = useState({ name: "", price: "", quantity: "100" });

  const addTicket = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const price = Number(ticketForm.price);
    const quantity = Number(ticketForm.quantity);
    if (isNaN(price) || price < 0) return setError("Enter a valid price. Use 0 for a free ticket.");
    if (!Number.isInteger(quantity) || quantity <= 0) return setError("Quantity must be a whole number above zero.");

    try {
      await createTicketType({
        eventId: Number(eventId),
        name: ticketForm.name.trim(),
        price: ticketForm.price,
        quantity,
        sold: 0,
      } as any).unwrap();
      setTicketForm({ name: "", price: "", quantity: "100" });
      await progress.refetchTickets();
    } catch (err: any) {
      setError(errMsg(err, "Failed to add the ticket."));
    }
  };

  const removeTicket = async (id: number | string) => {
    try {
      await deleteTicketType(id).unwrap();
      await progress.refetchTickets();
    } catch (err: any) {
      setError(errMsg(err, "Failed to delete the ticket."));
    }
  };

  // ---- Step 4: media --------------------------------------------------------
  const [queue, setQueue] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => () => queueRef.current.forEach((q) => URL.revokeObjectURL(q.preview)), []);

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (!e.target.files) return;
    const valid: { file: File; preview: string }[] = [];
    let skipped = false;
    Array.from(e.target.files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        skipped = true;
        return;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    });
    if (skipped) setError("Some files were over 10MB and were skipped.");
    setQueue((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const unqueue = (i: number) =>
    setQueue((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });

  const uploadAll = async () => {
    if (queue.length === 0 || !eventId) return;
    setError("");
    setUploading(true);
    setUploadPercent(0);
    const pct = queue.map(() => 0);

    const uploadOne = async (item: { file: File; preview: string }, idx: number) => {
      const type: "image" | "video" = item.file.type.startsWith("video") ? "video" : "image";
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`, fd, {
        onUploadProgress: (ev) => {
          pct[idx] = Math.round((ev.loaded * 100) / (ev.total || 1));
          setUploadPercent(Math.round(pct.reduce((a, b) => a + b, 0) / pct.length));
        },
      });
      return { idx, type, url: res.data.secure_url as string, name: item.file.name };
    };

    const results = await Promise.allSettled(queue.map(uploadOne));
    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadOne>>> => r.status === "fulfilled")
      .map((r) => r.value);
    const failed = results.length - uploaded.length;

    if (uploaded.length > 0) {
      try {
        await bulkCreateMedia({
          items: uploaded.map((u, i) => ({
            eventId: Number(eventId),
            url: u.url,
            type: u.type,
            altText: u.name,
            isPrimary: progress.media.length === 0 && i === 0,
          })),
        } as any).unwrap();

        const saved = new Set(uploaded.map((u) => u.idx));
        setQueue((prev) => {
          prev.forEach((f, i) => saved.has(i) && URL.revokeObjectURL(f.preview));
          return prev.filter((_, i) => !saved.has(i));
        });
        await progress.refetchMedia();
      } catch (err: any) {
        setError(errMsg(err, "Uploaded the files but could not save them. Try again."));
      }
    }
    if (failed > 0) setError(`${failed} file(s) failed to upload. They are still in the queue, so you can try again.`);

    setUploading(false);
    setUploadPercent(0);
  };

  const makePrimary = async (id: number) => {
    try {
      await setAsPrimary(id).unwrap();
      await progress.refetchMedia();
      eventsQ.refetch();
    } catch (err: any) {
      setError(errMsg(err, "Failed to set the primary image."));
    }
  };

  const removeMedia = async (id: number) => {
    try {
      await deleteMedia(id).unwrap();
      await progress.refetchMedia();
    } catch (err: any) {
      setError(errMsg(err, "Failed to delete the file."));
    }
  };

  // ---- Step 5: review & status ----------------------------------------------
  const changeStatus = async (status: EventStatus) => {
    setError("");
    try {
      await updateEventStatus({ eventId, status } as any).unwrap();
      await eventsQ.refetch();
    } catch (err: any) {
      setError(errMsg(err, "Failed to update the status."));
    }
  };

  const stepDone = [checks.venue, checks.details, checks.tickets, checks.media, progress.complete];
  const selectedVenue = venues.find((v) => vId(v) === venueId);

  const checklist = [
    { label: "Venue chosen", done: checks.venue, step: 0, hint: "Pick where the event happens." },
    { label: "Event details saved", done: checks.details, step: 1, hint: "Add a title, date and time." },
    { label: "At least one ticket type", done: checks.tickets, step: 2, hint: "Attendees need something to buy or claim." },
    { label: "At least one photo or video", done: checks.media, step: 3, hint: "Add a banner so the event stands out." },
  ];

  const navBtn = "btn btn-ghost btn-sm rounded-xl text-xs font-bold gap-1";
  const primaryBtn = "btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5";

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-6xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* Header + progress */}
      <div className="bg-gradient-to-r from-primary/10 via-base-200/50 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => onClose()} className="btn btn-ghost btn-xs btn-square rounded-xl shrink-0" title="Back to events">
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content truncate">{details.title || "New event"}</h1>
                {eventId && <span className={`badge badge-sm font-bold shrink-0 ${statusCfg(currentStatus).badge}`}>{statusCfg(currentStatus).label}</span>}
              </div>
              <p className="text-[11px] text-base-content/60">
                {eventId ? "Everything is saved as you go. Leave and continue any time, or jump to any step." : "Set up your event step by step. It is saved once you finish the details."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setGuideOpen(true)} className="btn btn-ghost btn-xs rounded-lg gap-1 text-[11px] text-primary" title="How it works">
              <BookOpen size={13} />
              <span className="hidden sm:inline">How it works</span>
            </button>
            <button onClick={() => onClose()} className="btn btn-ghost btn-xs btn-square rounded-lg shrink-0" title="Close">
              <X size={14} />
            </button>
          </div>
        </div>
        <ProgressBar percent={progress.percent} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5 items-start">
        {/* Step links: each one is a real link, so users can skip around freely */}
        <nav aria-label="Event setup steps" className={`${cardCls} p-2 md:sticky md:top-4`}>
          <ol className="flex md:flex-col gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = stepDone[i];
              const allowed = canGoTo(i);
              const inner = (
                <>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      done ? "bg-success text-success-content" : active ? "bg-primary text-primary-content" : "bg-base-300 text-base-content/60"
                    }`}
                  >
                    {done ? <Check size={15} /> : <Icon size={14} />}
                  </span>
                  <span className="flex flex-col min-w-0 text-left">
                    <span className={`text-xs font-bold whitespace-nowrap ${active ? "text-base-content" : "text-base-content/70"}`}>
                      {i + 1}. {s.label}
                    </span>
                    <span className="hidden md:block text-[10px] text-base-content/50 truncate">{s.desc}</span>
                  </span>
                </>
              );
              const cls = `flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors w-full ${active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-base-200/60"}`;
              return (
                <li key={s.key} className="shrink-0 md:shrink">
                  {allowed ? (
                    <Link to={stepLink(i)} className={cls} aria-current={active ? "step" : undefined}>
                      {inner}
                    </Link>
                  ) : (
                    <span className={`${cls} opacity-40 cursor-not-allowed`} title="Finish the earlier steps first">
                      {inner}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-col gap-4 min-w-0">
          {error && (
            <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError("")} className="btn btn-ghost btn-xs btn-square">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Step body */}
          <div className={`${cardCls} p-4 sm:p-6 flex flex-col gap-5`}>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                {/* NEW: a short tip for the current step */}
                <StepTip text={STEP_TIPS[step]} />

                {/* ---------------- STEP 1: VENUE ---------------- */}
                {step === 0 && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h2 className="font-black text-sm text-base-content">Where will the event be hosted?</h2>
                        <p className="text-[11px] text-base-content/60 leading-relaxed">
                          Check if your venue is already in the system. If it is not there, add it and we will use it for this event.
                        </p>
                      </div>
                      <PageLinkButton page="venues" label="Manage venues" eventTitle={details.title} compact />
                    </div>

                    <div className="join w-fit">
                      <button onClick={() => setVenueMode("existing")} className={`btn btn-xs join-item ${mode === "existing" ? "btn-primary" : "btn-ghost bg-base-200"}`}>
                        Choose existing venue
                      </button>
                      <button onClick={() => setVenueMode("new")} className={`btn btn-xs join-item ${mode === "new" ? "btn-primary" : "btn-ghost bg-base-200"}`}>
                        My venue isn't listed
                      </button>
                    </div>

                    {mode === "existing" ? (
                      <div className="flex flex-col gap-3">
                        <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 text-xs">
                          <Search size={14} className="text-base-content/40" />
                          <input type="text" placeholder="Search venues by name or address" value={venueSearch} onChange={(e) => setVenueSearch(e.target.value)} className="grow" />
                        </label>

                        {venuesQ.isLoading ? (
                          <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-md text-primary"></span>
                          </div>
                        ) : filteredVenues.length === 0 ? (
                          <div className="text-center py-8 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-4">
                            <Warehouse size={28} className="mx-auto text-primary/40 mb-1" />
                            <p className="text-xs font-bold text-base-content">{venues.length === 0 ? "No venues in the system yet" : "No venue matches your search"}</p>
                            <button onClick={() => setVenueMode("new")} className="btn btn-primary btn-xs rounded-xl font-bold mt-2">
                              Add a venue
                            </button>
                          </div>
                        ) : (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                            {filteredVenues.map((v) => {
                              const selected = vId(v) === venueId;
                              return (
                                <li key={vId(v)}>
                                  <button
                                    type="button"
                                    onClick={() => setVenueId(vId(v))}
                                    className={`w-full text-left rounded-xl border p-3 flex items-start gap-2.5 transition-colors ${selected ? "border-primary bg-primary/5" : "border-base-200 hover:border-primary/40"}`}
                                  >
                                    <span className={`p-2 rounded-lg shrink-0 ${selected ? "bg-primary text-primary-content" : "bg-primary/10 text-primary"}`}>
                                      {selected ? <Check size={14} /> : <Warehouse size={14} />}
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                      <span className="text-xs font-bold text-base-content truncate">{v.name}</span>
                                      <span className="text-[10px] text-base-content/60 truncate">{v.address}</span>
                                      <span className="text-[10px] text-base-content/50">Capacity {Number(v.capacity || 0).toLocaleString()}</span>
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={labelCls}>Venue name</label>
                            <input type="text" placeholder="e.g. KICC Tsavo Ballroom" value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} className={inputCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Capacity</label>
                            <input type="number" min="1" step="1" placeholder="e.g. 500" value={newVenue.capacity} onChange={(e) => setNewVenue({ ...newVenue, capacity: e.target.value })} className={inputCls} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Address</label>
                          <input type="text" placeholder="Street, area, city" value={newVenue.address} onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })} className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Description (optional)</label>
                          <textarea rows={2} placeholder="What kind of events suit this venue?" value={newVenue.description} onChange={(e) => setNewVenue({ ...newVenue, description: e.target.value })} className="textarea textarea-bordered rounded-xl w-full text-xs" />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-base-200">
                      <button onClick={submitVenue} disabled={creatingVenue} className={primaryBtn}>
                        {creatingVenue ? <span className="loading loading-spinner loading-xs"></span> : mode === "new" ? "Save venue and continue" : "Continue"}
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 2: DETAILS ---------------- */}
                {step === 1 && (
                  <form onSubmit={submitDetails} className="flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <h2 className="font-black text-sm text-base-content">Tell people about the event</h2>
                      <p className="text-[11px] text-base-content/60">
                        Hosting at <span className="font-bold text-base-content">{selectedVenue?.name || "your venue"}</span>.{" "}
                        <Link to={stepLink(0)} className="text-primary font-bold hover:underline">
                          Change venue
                        </Link>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Event title</label>
                      <input type="text" required placeholder="e.g. Nairobi Tech Meetup" value={details.title} onChange={(e) => setDetails({ ...details, title: e.target.value })} className={inputCls} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Description</label>
                      <textarea rows={4} required placeholder="What is the event about, and who is it for?" value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} className="textarea textarea-bordered rounded-xl w-full text-xs" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className={labelCls}>Category</label>
                        <select value={details.category} onChange={(e) => setDetails({ ...details, category: e.target.value })} className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs capitalize">
                          {EVENT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={labelCls}>Date</label>
                        <input type="date" required min={eventId ? undefined : new Date().toISOString().slice(0, 10)} value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={labelCls}>Time</label>
                        <input type="time" required value={details.time} onChange={(e) => setDetails({ ...details, time: e.target.value })} className={inputCls} />
                      </div>
                    </div>

                    <div className="flex justify-between gap-2 pt-3 border-t border-base-200">
                      <button type="button" onClick={() => goTo(0)} className={navBtn}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button type="submit" disabled={creatingEvent || updatingEvent} className={primaryBtn}>
                        {creatingEvent || updatingEvent ? <span className="loading loading-spinner loading-xs"></span> : eventId ? "Save and continue" : "Create event and continue"}
                      </button>
                    </div>
                  </form>
                )}

                {/* ---------------- STEP 3: TICKETS ---------------- */}
                {step === 2 && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h2 className="font-black text-sm text-base-content">Set up your tickets</h2>
                        <p className="text-[11px] text-base-content/60">
                          Add the ticket types attendees can get, like Regular, VIP or Early Bird. Use a price of 0 for free entry.
                        </p>
                      </div>
                    </div>

                    {progress.tickets.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <ul className="flex flex-col divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                          {progress.tickets.map((t: any) => {
                            const id = t.ticketTypeId ?? t.id ?? t._id;
                            return (
                              <li key={id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Ticket size={14} className="text-primary shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-base-content truncate">{t.name}</span>
                                    <span className="text-[10px] text-base-content/50">{Number(t.quantity).toLocaleString()} available</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-bold text-success">{Number(t.price) === 0 ? "Free" : `${CURRENCY} ${Number(t.price).toLocaleString()}`}</span>
                                  <button onClick={() => removeTicket(id)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete ticket">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        {/* Editing happens on the Ticket Types page */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-base-content/60 bg-info/10 rounded-xl px-3 py-2">
                          <AlertCircle size={13} className="text-info shrink-0" />
                          <span className="flex-1">
                            Need to change a price or quantity? Edit existing tickets on the Ticket Types page.{" "}
                            <span className="font-bold text-base-content">
                              Remember to choose {details.title ? `"${details.title}"` : "your event"} in the dropdown there.
                            </span>
                          </span>
                          <PageLinkButton page="ticketTypes" label="Open Ticket Types" eventTitle={details.title} compact />
                        </div>
                      </div>
                    )}

                    <form onSubmit={addTicket} className="rounded-xl border border-dashed border-base-300 bg-base-200/20 p-3 flex flex-col gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-base-content/50">Quick names:</span>
                        {["Regular", "VIP", "Early Bird", "Student"].map((n) => (
                          <button key={n} type="button" onClick={() => setTicketForm({ ...ticketForm, name: n })} className="btn btn-ghost btn-xs bg-base-200 rounded-lg text-[11px]">
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Ticket name</label>
                          <input type="text" required value={ticketForm.name} onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })} className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Price ({CURRENCY})</label>
                          <input type="number" required min="0" step="any" placeholder="e.g. 1500" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Quantity</label>
                          <input type="number" required min="1" value={ticketForm.quantity} onChange={(e) => setTicketForm({ ...ticketForm, quantity: e.target.value })} className={inputCls} />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={creatingTicket} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold gap-1.5">
                          {creatingTicket ? <span className="loading loading-spinner loading-xs"></span> : <><Plus size={14} /> Add ticket</>}
                        </button>
                      </div>
                    </form>

                    <div className="flex justify-between gap-2 pt-3 border-t border-base-200">
                      <button onClick={() => goTo(1)} className={navBtn}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button onClick={() => goTo(3)} className={primaryBtn}>
                        {progress.tickets.length === 0 ? "Skip for now" : "Continue"} <ChevronRight size={14} />
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 4: MEDIA ---------------- */}
                {step === 3 && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h2 className="font-black text-sm text-base-content">Add photos and videos</h2>
                        <p className="text-[11px] text-base-content/60">The primary image is the banner attendees see first.</p>
                      </div>
                      <PageLinkButton page="media" label="Media page" eventTitle={details.title} compact />
                    </div>

                    {progress.media.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {progress.media.map((m: any) => {
                          const id = m.mediaId ?? m.id;
                          return (
                            <div key={id} className="relative aspect-square rounded-xl overflow-hidden bg-base-200 border border-base-200 group">
                              {m.type === "video" ? (
                                <div className="w-full h-full flex items-center justify-center text-primary">
                                  <Video size={26} />
                                </div>
                              ) : (
                                <img src={m.url} alt={m.altText || "Event media"} loading="lazy" className="w-full h-full object-cover" />
                              )}
                              {m.isPrimary && (
                                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-content text-[10px] font-bold shadow">
                                  <Star size={10} className="fill-current" /> Primary
                                </span>
                              )}
                              <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1">
                                {!m.isPrimary && m.type !== "video" ? (
                                  <button onClick={() => makePrimary(id)} className="btn btn-xs bg-base-100/90 border-none rounded-lg text-[10px] gap-1">
                                    <Star size={10} /> Make primary
                                  </button>
                                ) : (
                                  <span />
                                )}
                                <button onClick={() => removeMedia(id)} className="btn btn-xs btn-circle bg-error/80 hover:bg-error border-none text-white" title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <label className="relative border-2 border-dashed border-base-300 hover:border-primary/60 transition-colors rounded-2xl p-6 text-center cursor-pointer bg-base-200/20 block">
                      <input type="file" multiple accept="image/png, image/jpeg, image/webp, video/mp4" onChange={pickFiles} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center gap-1 pointer-events-none">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl mb-1">
                          <UploadCloud size={22} />
                        </div>
                        <p className="text-xs font-bold text-base-content">Click to browse or drag and drop files</p>
                        <p className="text-[11px] text-base-content/60">PNG, JPG, WEBP or MP4, up to 10MB each</p>
                      </div>
                    </label>

                    {queue.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {queue.map((q, i) => (
                            <div key={q.preview} className="relative h-20 rounded-lg overflow-hidden bg-base-200 border border-base-200">
                              {q.file.type.startsWith("video") ? (
                                <div className="w-full h-full flex items-center justify-center text-primary">
                                  <Video size={20} />
                                </div>
                              ) : (
                                <img src={q.preview} alt="Queued upload" className="w-full h-full object-cover" />
                              )}
                              <button type="button" onClick={() => unqueue(i)} className="btn btn-error btn-xs btn-circle absolute top-1 right-1 h-5 w-5 min-h-0" title="Remove">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {uploading && (
                          <div className="flex flex-col gap-1">
                            <progress className="progress progress-primary w-full h-1.5" value={uploadPercent} max={100}></progress>
                            <p className="text-center text-[11px] font-bold text-primary">{uploadPercent}% uploaded</p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button onClick={uploadAll} disabled={uploading || savingMedia} className={primaryBtn}>
                            {uploading || savingMedia ? <span className="loading loading-spinner loading-xs"></span> : <><UploadCloud size={14} /> Upload {queue.length} {queue.length === 1 ? "file" : "files"}</>}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between gap-2 pt-3 border-t border-base-200">
                      <button onClick={() => goTo(2)} className={navBtn}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button onClick={() => goTo(4)} className={primaryBtn}>
                        {progress.media.length === 0 ? "Skip for now" : "Continue"} <ChevronRight size={14} />
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 5: REVIEW ---------------- */}
                {step === 4 && (
                  <>
                    <div className="flex flex-col gap-1">
                      <h2 className="font-black text-sm text-base-content">{progress.complete ? "Setup complete" : `${100 - progress.percent}% of setup left`}</h2>
                      <p className="text-[11px] text-base-content/60">
                        {progress.complete ? "Everything is in place. You can still change any step later." : "Use the Fix buttons to jump straight to what is missing. You can also finish later."}
                      </p>
                    </div>

                    <ul className="flex flex-col divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                      {checklist.map((c) => (
                        <li key={c.label} className="flex items-center justify-between gap-3 px-3 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${c.done ? "bg-success text-success-content" : "bg-base-300 text-base-content/50"}`}>
                              {c.done ? <Check size={13} /> : <X size={12} />}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-base-content">{c.label}</span>
                              {!c.done && <span className="text-[10px] text-base-content/50">{c.hint}</span>}
                            </div>
                          </div>
                          {canGoTo(c.step) ? (
                            <Link to={stepLink(c.step)} className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg text-[11px] shrink-0">
                              {c.done ? "Edit" : "Fix"}
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {/* Event status uses the backend enum */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-black text-xs text-base-content">Event status</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STATUSES.map((s) => {
                          const Icon = s.icon;
                          const selected = currentStatus === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              disabled={changingStatus || !eventId}
                              onClick={() => !selected && changeStatus(s.value)}
                              className={`text-left rounded-xl border p-3 flex items-start gap-2.5 transition-colors disabled:opacity-60 ${selected ? "border-primary bg-primary/5" : "border-base-200 hover:border-primary/40"}`}
                            >
                              <span className={`p-2 rounded-lg shrink-0 ${s.tint}`}>
                                <Icon size={14} />
                              </span>
                              <span className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-base-content flex items-center gap-1.5">
                                  {s.label} {selected && <Check size={12} className="text-primary" />}
                                </span>
                                <span className="text-[10px] text-base-content/60">{s.hint}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-3 border-t border-base-200">
                      <button onClick={() => goTo(3)} className={navBtn}>
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button onClick={() => onClose(eventId ? `"${details.title}" saved.` : undefined)} className={primaryBtn}>
                        <CheckCircle2 size={14} /> {progress.complete ? "Finish" : "Save and finish later"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* NEW: the "How it works" window */}
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} eventTitle={details.title} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* EVENT MANAGER (list + entry point to the wizard)                           */
/* -------------------------------------------------------------------------- */

export const EventManager = () => {
  usePageTitle("Event Manager");

  const { orgId: hookOrgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();
 
  

  const orgId = useSelector((state:RootState)=> state.auth.user?.orgId);
  console.log(orgId);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useGetEventsByOrganizationQuery(orgId as number, {
    skip: !orgId,
  });
  const [updateEventStatus] = useUpdateEventStatusMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  // The wizard lives in the URL:  ?event=<id | new>&step=<venue|details|tickets|media|review>
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get("event");
  const stepParam = searchParams.get("step");
  const [sessionKey, setSessionKey] = useState(0);
  const wizardMounted = useRef(false);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [toDelete, setToDelete] = useState<{ id: number | string; title: string } | null>(null);
  const [searchTitle, setSearchTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // NEW: shows or hides the "How it works" guide on the list page
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // Show only events that belong to this organizer's organization
  const orgEvents = useMemo(
    () =>
      toArray(events).filter((e: any) => {
        const eventOrg = e?.orgId ?? e?.organizationId ?? e?.organization?.orgId;
        // If the API doesn't send an org field, the query above is already limited to this org
        return eventOrg === undefined || eventOrg === null || String(eventOrg) === String(orgId);
      }),
    [events, orgId]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orgEvents.length, upcoming: 0, in_progress: 0, ended: 0, cancelled: 0 };
    orgEvents.forEach((e: any) => (c[evStatus(e)] += 1));
    return c;
  }, [orgEvents]);

  const q = searchTitle.trim().toLowerCase();
  const displayed = orgEvents.filter((e: any) => {
    const matchesTitle = !q || String(e.title || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || evStatus(e) === statusFilter;
    return matchesTitle && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(displayed.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paged = displayed.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const navigateWizard = (step: number, id: number | string | null, replace = false) =>
    setSearchParams({ event: String(id ?? "new"), step: STEPS[step].key }, { replace });

  const openWizard = (event: any | null, step: number) => {
    setSessionKey((k) => k + 1);
    navigateWizard(step, event ? evId(event) : null);
  };

  const closeWizard = (message?: string) => {
    wizardMounted.current = false;
    setSearchParams({});
    refetchEvents();
    if (message) setSuccessMessage(message);
  };

  const handleStatusChange = async (eventId: number | string, status: EventStatus) => {
    try {
      await updateEventStatus({ eventId, status } as any).unwrap();
      setSuccessMessage(`Status changed to ${statusCfg(status).label.toLowerCase()}.`);
      refetchEvents();
    } catch (err: any) {
      setErrorMessage(errMsg(err, "Failed to update status."));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteEvent(toDelete.id as any).unwrap();
      setSuccessMessage("Event deleted.");
      refetchEvents();
    } catch (err: any) {
      setErrorMessage(errMsg(err, "Failed to delete event."));
    } finally {
      setToDelete(null);
    }
  };

  if (orgLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (!hasOrg) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Building2 size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Create your organization first</h2>
          <p className="text-xs text-base-content/60 max-w-md leading-relaxed">
            Events belong to an organization, so you need one before you can create or manage events. It only takes a minute:
            add your organization's name and logo, then come back here to create your first event.
          </p>
          <Link to={ROUTES.organization} className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm mt-2">
            <Plus size={14} />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>
    );
  }

  // The wizard replaces the list while it is open
  if (eventParam) {
    const isNew = eventParam === "new";
    const found = isNew ? null : orgEvents.find((e: any) => String(evId(e)) === eventParam) ?? null;

    // Deep link to an event we have not loaded yet (or one that does not exist)
    if (!isNew && !found && !wizardMounted.current) {
      if (eventsLoading) {
        return (
          <div className="flex justify-center py-32">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
          <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-10 flex flex-col items-center gap-3">
            <AlertCircle size={30} className="text-error/70" />
            <h2 className="font-black text-sm text-base-content">We could not find that event</h2>
            <p className="text-xs text-base-content/60">It may have been deleted, or it belongs to another organization.</p>
            <button onClick={() => closeWizard()} className="btn btn-primary btn-sm rounded-xl text-xs font-bold">
              Back to events
            </button>
          </div>
        </div>
      );
    }

    wizardMounted.current = true;
    const stepIndex = Math.max(0, STEPS.findIndex((s) => s.key === stepParam));

    return (
      <MotionConfig reducedMotion="user">
        <EventWizard key={sessionKey} orgId={Number(orgId)} event={found} stepIndex={stepIndex} onNavigate={navigateWizard} onClose={closeWizard} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 via-base-200/50 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Events Dashboard</h1>
            <p className="text-[11px] text-base-content/60">Create events step by step, and pick up any unfinished one right where you left off.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowGuide((v) => !v)}
            aria-expanded={showGuide}
            className="btn btn-ghost btn-sm gap-2 rounded-xl text-xs font-bold bg-base-100 border border-base-200 w-full sm:w-auto"
          >
            <BookOpen size={14} className="text-primary" />
            <span>How it works</span>
            <motion.span animate={{ rotate: showGuide ? 180 : 0 }} transition={{ duration: 0.2 }} className="inline-flex">
              <ChevronDown size={13} />
            </motion.span>
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openWizard(null, 0)}
            className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm w-full sm:w-auto"
          >
            <Plus size={14} />
            <span>New Event</span>
          </motion.button>
        </div>
      </motion.div>

      {/* NEW: How it works guide (opens and closes with the button above) */}
      <HowItWorksPanel open={showGuide} />

      {/* Status summary: also works as a filter */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[{ value: "all", label: "All events", icon: Calendar, tint: "text-primary bg-primary/10" }, ...STATUSES].map((s: any, i: number) => {
          const Icon = s.icon;
          const active = statusFilter === s.value;
          return (
            <motion.button
              key={s.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setStatusFilter(s.value);
                setCurrentPage(1);
              }}
              className={`${cardCls} p-3 flex items-center gap-3 text-left transition-all hover:border-primary/40 ${active ? "ring-2 ring-primary/40 border-primary/40" : ""}`}
            >
              <span className={`p-2 rounded-xl shrink-0 ${s.tint}`}>
                <Icon size={16} />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-black leading-none text-base-content">{counts[s.value] ?? 0}</span>
                <span className="text-[10px] font-semibold text-base-content/60 mt-1">{s.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="alert alert-success text-xs font-semibold py-2 rounded-xl shadow-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}
      {errorMessage && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="btn btn-ghost btn-xs btn-square">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Search & view switch */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-base-200/50 border border-base-200 px-3 py-1.5 rounded-xl w-full sm:max-w-sm">
          <Search size={14} className="text-base-content/40 shrink-0" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={searchTitle}
            onChange={(e) => {
              setSearchTitle(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-none outline-none w-full text-xs text-base-content"
          />
          {searchTitle && (
            <button onClick={() => setSearchTitle("")} className="text-[10px] font-bold text-primary shrink-0">
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-xs text-base-content/60 font-medium">
            Showing <span className="font-bold text-base-content">{displayed.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + ITEMS_PER_PAGE, displayed.length)}</span> of{" "}
            <span className="font-bold text-base-content">{displayed.length}</span>
          </span>
          <div className="join bg-base-200 p-0.5 rounded-xl border border-base-300">
            <button onClick={() => setViewMode("grid")} className={`join-item btn btn-xs rounded-lg gap-1.5 px-3 font-semibold ${viewMode === "grid" ? "btn-primary text-primary-content" : "btn-ghost text-base-content/60"}`}>
              <LayoutGrid size={13} />
              <span>Grid</span>
            </button>
            <button onClick={() => setViewMode("table")} className={`join-item btn btn-xs rounded-lg gap-1.5 px-3 font-semibold ${viewMode === "table" ? "btn-primary text-primary-content" : "btn-ghost text-base-content/60"}`}>
              <TableIcon size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events */}
      {eventsLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Calendar size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">{q || statusFilter !== "all" ? "No matching events" : "No events yet"}</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
            {q || statusFilter !== "all" ? "Try a different title or status." : "We will guide you through the venue, tickets and photos."}
          </p>
          {!q && statusFilter === "all" && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => openWizard(null, 0)} className="btn btn-primary btn-xs rounded-xl font-bold">
                Create your first event
              </button>
              {/* NEW: shows the guide for first-time users */}
              <button
                onClick={() => {
                  setShowGuide(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="btn btn-ghost btn-xs rounded-xl font-bold gap-1 text-primary"
              >
                <BookOpen size={12} /> See how it works
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((event: any, i: number) => (
            <motion.div
              key={evId(event)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="h-full [&>div]:h-full"
            >
              <EventItem event={event} view="grid" onOpen={openWizard} onChangeStatus={handleStatusChange} onDelete={(id, title) => setToDelete({ id, title })} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[820px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold w-16">Poster</th>
                  <th className="py-3 px-4 font-bold">Event Title</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Setup progress</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((event: any) => (
                  <EventItem key={evId(event)} event={event} view="table" onOpen={openWizard} onChangeStatus={handleStatusChange} onDelete={(id, title) => setToDelete({ id, title })} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {displayed.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between bg-base-100 border border-base-200 px-4 py-3 rounded-2xl shadow-sm">
          <span className="text-xs text-base-content/60 font-medium">
            Page <span className="font-bold text-base-content">{safePage}</span> of <span className="font-bold text-base-content">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(Math.max(safePage - 1, 1))} disabled={safePage === 1} className="btn btn-ghost btn-xs rounded-xl gap-1 font-semibold disabled:opacity-40">
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Previous</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setCurrentPage(n)} className={`btn btn-xs rounded-xl w-7 h-7 font-bold ${safePage === n ? "btn-primary text-primary-content" : "btn-ghost text-base-content/70"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))} disabled={safePage === totalPages} className="btn btn-ghost btn-xs rounded-xl gap-1 font-semibold disabled:opacity-40">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {toDelete && (
          <div className={modalBackdrop}>
            <motion.div {...modalMotion} className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete event?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  Are you sure you want to delete <span className="font-bold text-base-content">"{toDelete.title}"</span>? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button type="button" onClick={() => setToDelete(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
                  Cancel
                </button>
                <button type="button" disabled={isDeleting} onClick={handleDelete} className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm">
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete event"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
};

export default EventManager;