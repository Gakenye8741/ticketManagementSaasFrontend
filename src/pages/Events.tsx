import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Clock,
  Tag,
  ArrowUpDown,
  Sparkles,
  X,
  Flame,
  Bookmark,
  LayoutGrid,
  List as ListIcon,
  PlusCircle,
  Building2,
  Ticket,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Grid3x3,
  Music2,
  Mic2,
  Wrench,
  PartyPopper,
  Trophy,
  Drama,
  Users,
  Moon,
  HeartHandshake,
  Image as ImageIcon,
  Church,
  UtensilsCrossed,
  Cpu,
  Laugh,
  MoreHorizontal
} from "lucide-react";

// Icon per category value, used to give the category filter a scannable identity
const categoryIcons: Record<string, any> = {
  all: Grid3x3,
  music: Music2,
  conference: Mic2,
  workshop: Wrench,
  festival: PartyPopper,
  sports: Trophy,
  arts_theatre: Drama,
  networking: Users,
  nightlife: Moon,
  charity: HeartHandshake,
  exhibition: ImageIcon,
  religious: Church,
  food_drink: UtensilsCrossed,
  technology: Cpu,
  comedy: Laugh,
  other: MoreHorizontal,
};

import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useGetAllEventsQuery } from "../features/APIS/EventsApi";
import {
  useGetAllTicketTypesQuery,
  useGetTicketTypesByEventIdQuery
} from "../features/APIS/ticketsType.Api";
import { useGetMediaByEventIdQuery } from "../features/APIS/mediaApi";
import usePageTitle from "../hooks/usePageTitle";

// ---------------------------------------------------------------------------
// EVENT STATUS
// ---------------------------------------------------------------------------

type StatusTone =
  | "upcoming"
  | "live"
  | "ended"
  | "cancelled"
  | "neutral";

// The status filter that is selected when the page first opens
// (and what "Reset" goes back to).
const DEFAULT_STATUS_FILTER = "upcoming";

const ENDED_STATUSES = new Set([
  "ended",
  "completed",
  "finished",
  "past",
  "closed",
  "expired",
]);

const LIVE_STATUSES = new Set([
  "ongoing",
  "live",
  "in_progress",
  "started",
  "happening",
]);

const CANCELLED_STATUSES = new Set([
  "cancelled",
  "canceled",
]);

const UPCOMING_STATUSES = new Set([
  "upcoming",
  "published",
  "active",
  "scheduled",
  "open",
  "on_sale",
  "approved",
]);

const normalizeStatus = (event: any): string =>
  String(event?.status ?? event?.eventStatus ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isEventEnded = (event: any): boolean => {
  const status = normalizeStatus(event);

  if (status) {
    return ENDED_STATUSES.has(status);
  }

  const rawDate = event?.endDate ?? event?.date;

  if (!rawDate) return false;

  const end = new Date(rawDate);

  if (isNaN(end.getTime())) return false;

  end.setHours(23, 59, 59, 999);

  return end.getTime() < Date.now();
};

const getEventStatus = (
  event: any
): { label: string; tone: StatusTone } | null => {
  const status = normalizeStatus(event);

  if (status) {
    if (LIVE_STATUSES.has(status)) {
      return {
        label: "In progress",
        tone: "live",
      };
    }

    if (ENDED_STATUSES.has(status)) {
      return {
        label: "Ended",
        tone: "ended",
      };
    }

    if (CANCELLED_STATUSES.has(status)) {
      return {
        label: "Cancelled",
        tone: "cancelled",
      };
    }

    if (UPCOMING_STATUSES.has(status)) {
      return {
        label: "Upcoming",
        tone: "upcoming",
      };
    }

    // Any other status: show it as it is, in a neutral style
    const label = status
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase());

    return {
      label,
      tone: "neutral",
    };
  }

  // No status on the event:
  // determine status from its date.
  const date = new Date(event?.date);

  if (!isNaN(date.getTime())) {
    if (date.getTime() >= Date.now()) {
      return {
        label: "Upcoming",
        tone: "upcoming",
      };
    }

    return {
      label: "Ended",
      tone: "ended",
    };
  }

  return null;
};

const STATUS_ORDER: StatusTone[] = [
  "upcoming",
  "live",
  "ended",
  "cancelled",
  "neutral",
];

// Page numbers with ellipses, e.g. 1 … 4 5 6 … 20
const getPageNumbers = (
  current: number,
  total: number
): (number | "…")[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [1];

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push("…");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) {
    pages.push("…");
  }

  pages.push(total);

  return pages;
};

const PAGE_SIZE_OPTIONS = [9, 12, 24, 48];

const statusOverlayClasses: Record<StatusTone, string> = {
  upcoming: "bg-primary text-primary-content",
  live: "bg-success text-success-content",
  ended: "bg-neutral text-neutral-content",
  cancelled: "bg-error/90 text-error-content",
  neutral: "bg-base-100/90 text-base-content",
};

const statusListClasses: Record<StatusTone, string> = {
  upcoming: "bg-primary/10 text-primary",
  live: "bg-success/10 text-success",
  ended: "bg-neutral/10 text-neutral",
  cancelled: "bg-error/10 text-error",
  neutral: "bg-base-200 text-base-content/70",
};

const EventStatusBadge = ({
  status,
  variant = "overlay",
}: {
  status: {
    label: string;
    tone: StatusTone;
  } | null;
  variant?: "overlay" | "list";
}) => {
  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
        variant === "overlay"
          ? "px-2 py-0.5 sm:px-2.5 sm:py-1 shadow-sm"
          : "px-2 py-0.5"
      } ${
        (variant === "overlay"
          ? statusOverlayClasses
          : statusListClasses)[status.tone]
      }`}
    >
      {status.tone === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}

      {status.label}
    </span>
  );
};

// The clickable shell around an event card.
// - Normal events: a <Link> to the event page (where tickets are bought).
// - Ended events: a plain, dimmed <div>. It is NOT a link, so nobody can
//   click through to buy tickets for an event that is over.
const EventCardShell = ({
  ended,
  to,
  baseClass,
  activeClass,
  children,
}: {
  ended: boolean;
  to: string;
  baseClass: string;
  activeClass: string;
  children: React.ReactNode;
}) => {
  if (ended) {
    return (
      <div
        aria-disabled="true"
        title="This event has ended"
        className={`${baseClass} opacity-60 grayscale cursor-not-allowed select-none`}
      >
        {children}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`${baseClass} ${activeClass}`}
    >
      {children}
    </Link>
  );
};

// Presentational price badge — pricing is resolved once per event up in
// EventsPage (from real ticket types) and passed straight in as a prop.
const EventPriceBadge = ({
  pricing,
  variant = "overlay",
}: {
  pricing: {
    cheapest: number;
    isPaid: boolean;
  };
  variant?: "overlay" | "list";
}) => {
  const label = !pricing.isPaid
    ? "Free"
    : pricing.cheapest === 0
      ? "Free tier available"
      : `Starts from KES ${pricing.cheapest.toLocaleString()}`;

  // Shorter wording so it fits in half-width cards on phones
  const shortLabel = !pricing.isPaid
    ? "Free"
    : pricing.cheapest === 0
      ? "Free tier"
      : `From KES ${pricing.cheapest.toLocaleString()}`;

  if (variant === "overlay") {
    return (
      <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm text-white whitespace-nowrap">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    );
  }

  return (
    <span className="text-xs sm:text-sm font-bold text-primary">
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
};

// Resolves and renders an event's display image:
// - the primary media item (isPrimary === true) if one exists for the event
// - otherwise the first media item found for that event
// - otherwise falls back to the event's own bannerUrl
// - otherwise shows the calendar placeholder icon
const EventCardImage = ({
  eventId,
  bannerUrl,
  title,
  className,
}: {
  eventId: number | string;
  bannerUrl?: string;
  title: string;
  className: string;
}) => {
  const { data: mediaResponse } =
    useGetMediaByEventIdQuery(Number(eventId));

  const mediaList = mediaResponse?.data || [];

  const primaryMedia = mediaList.find((m: any) => m.isPrimary);
  const chosenMedia = primaryMedia || mediaList[0];

  const imageUrl = chosenMedia?.url || bannerUrl;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={chosenMedia?.altText || title}
        className={className}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-base-300 to-base-200">
      <CalendarIcon className="w-10 h-10 text-base-content/20" />
    </div>
  );
};

// Resolves and renders an event's price badge using that event's OWN ticket
// types, fetched directly.
const EventCardPrice = ({
  eventId,
  fallbackPricing,
  variant = "overlay",
}: {
  eventId: number | string;
  fallbackPricing: {
    cheapest: number;
    isPaid: boolean;
  };
  variant?: "overlay" | "list";
}) => {
  const { data: ticketTypesResponse } =
    useGetTicketTypesByEventIdQuery(Number(eventId));

  // Handles either { data: [...] } or a bare array response shape
  const rawTicketTypes =
    (ticketTypesResponse as any)?.data ??
    ticketTypesResponse ??
    [];

  const ticketTypes = Array.isArray(rawTicketTypes)
    ? rawTicketTypes
    : [];

  const getTierPrice = (t: any): number => {
    const raw =
      t?.price ??
      t?.ticketPrice ??
      t?.amount ??
      t?.cost ??
      0;

    return Number(raw) || 0;
  };

  const pricing =
    ticketTypes.length > 0
      ? {
          cheapest: Math.min(
            ...ticketTypes.map(getTierPrice)
          ),

          // Paid if ANY ticket type has a price greater than 0
          isPaid: ticketTypes.some(
            (t: any) => getTierPrice(t) > 0
          ),
        }
      : fallbackPricing;

  return (
    <EventPriceBadge
      pricing={pricing}
      variant={variant}
    />
  );
};

export const EventsPage = () => {
  usePageTitle("Events");

  // Fetch live events from API
  const {
    data: eventsResponse,
    isLoading,
  } = useGetAllEventsQuery(undefined);

  // Keep ALL events here so Ended events can be selected
  // from the status filter.
  const eventsList = useMemo(
    () => (eventsResponse?.data || []) as any[],
    [eventsResponse]
  );

  // Fetch every ticket type once, so category (Free/Paid) and displayed
  // price reflect real ticket tiers rather than the event's own ticketPrice field
  const {
    data: ticketTypesResponse,
  } = useGetAllTicketTypesQuery(undefined);

  const allTicketTypes =
    ticketTypesResponse?.data || [];

  // Pulls an event's own id, whatever field it's stored under
  const getEventId = (
    event: any
  ): string | undefined => {
    const raw =
      event?.eventId ??
      event?._id ??
      event?.id;

    if (
      raw === undefined ||
      raw === null
    ) {
      return undefined;
    }

    return typeof raw === "object"
      ? String(
          raw._id ??
            raw.$oid ??
            raw
        )
      : String(raw);
  };

  // Pulls the event id a ticket type points back to
  const getTicketEventId = (
    ticketType: any
  ): string | undefined => {
    const raw =
      ticketType?.eventId ??
      ticketType?.event_id ??
      ticketType?.EventId ??
      ticketType?.event?.eventId ??
      ticketType?.event?._id ??
      ticketType?.event?.id ??
      ticketType?.event;

    if (
      raw === undefined ||
      raw === null
    ) {
      return undefined;
    }

    return typeof raw === "object"
      ? String(
          raw._id ??
            raw.$oid ??
            raw
        )
      : String(raw);
  };

  // Pulls a ticket type's amount
  const getTierPrice = (
    ticketType: any
  ): number => {
    const raw =
      ticketType?.price ??
      ticketType?.ticketPrice ??
      ticketType?.amount ??
      ticketType?.cost ??
      0;

    return Number(raw) || 0;
  };

  // Group ticket types by event
  const ticketTypesByEvent = useMemo(() => {
    const map: Record<string, any[]> = {};

    allTicketTypes.forEach((t: any) => {
      const key = getTicketEventId(t);

      if (!key) return;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(t);
    });

    return map;
  }, [allTicketTypes]);

  // -------------------------------------------------------------------------
  // REAL EVENT PRICING
  //
  // Rules:
  // 1. If ticket types exist:
  //    - ANY ticket > 0 => Paid
  //    - ALL tickets === 0 => Free
  //
  // 2. If there are no ticket types:
  //    - fall back to event.ticketPrice
  // -------------------------------------------------------------------------
  const getEventPricing = (
    event: any
  ): {
    cheapest: number;
    isPaid: boolean;
  } => {
    const key = getEventId(event);

    const tiers = key
      ? ticketTypesByEvent[key]
      : undefined;

    // Event has ticket types.
    // Pricing is determined ONLY from the ticket types.
    if (tiers && tiers.length > 0) {
      const prices = tiers.map(
        (t: any) => getTierPrice(t)
      );

      return {
        cheapest: Math.min(...prices),

        // If even ONE ticket type costs money,
        // the event is considered Paid.
        isPaid: prices.some(
          (price: number) => price > 0
        ),
      };
    }

    // No ticket types recorded:
    // preserve the existing fallback.
    const fallback =
      Number(event.ticketPrice) || 0;

    return {
      cheapest: fallback,
      isPaid: fallback > 0,
    };
  };

  // Dev aid
  useEffect(() => {
    if (
      allTicketTypes.length > 0 &&
      Object.keys(ticketTypesByEvent).length === 0
    ) {
      console.warn(
        "[EventsPage] Loaded ticket types but couldn't match any to an event. " +
          "Check the actual field name used for the event reference on a ticket type " +
          "(sample record below) and update getTicketEventId/getEventId accordingly.",
        allTicketTypes[0]
      );
    }
  }, [
    allTicketTypes,
    ticketTypesByEvent,
  ]);

  // Filter & Sort & View states
  const [searchQuery, setSearchQuery] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [selectedCity, setSelectedCity] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("all");

  const [priceType, setPriceType] =
    useState("all");

  const [priceRange, setPriceRange] =
    useState<number>(50000);

  const [sortBy, setSortBy] =
    useState("date_asc");

  // Defaults to "Upcoming" so ended events are hidden until the
  // visitor chooses "All" or "Ended".
  const [statusFilter, setStatusFilter] =
    useState<string>(DEFAULT_STATUS_FILTER);

  const [viewMode, setViewMode] =
    useState<"grid" | "list">("grid");

  // Mobile Filter Modal State
  const [
    isMobileModalOpen,
    setIsMobileModalOpen,
  ] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] =
    useState(1);

  const [
    eventsPerPage,
    setEventsPerPage,
  ] = useState(PAGE_SIZE_OPTIONS[0]);

  const resultsRef =
    useRef<HTMLDivElement>(null);

  // Status options come from events actually loaded
  const statusOptions = useMemo(() => {
    const counts = new Map<
      StatusTone,
      {
        label: string;
        count: number;
      }
    >();

    eventsList.forEach((e: any) => {
      const st = getEventStatus(e);

      if (!st) return;

      const cur = counts.get(
        st.tone
      );

      counts.set(st.tone, {
        label:
          st.tone === "neutral"
            ? "Other"
            : st.label,
        count:
          (cur?.count || 0) + 1,
      });
    });

    return [
      {
        value: "all",
        label: "All",
        count: eventsList.length,
      },

      ...STATUS_ORDER
        .filter((t) => counts.has(t))
        .map((t) => ({
          value: t as string,
          label: counts.get(t)!.label,
          count: counts.get(t)!.count,
        })),
    ];
  }, [eventsList]);

  // Categories list based on backend enum
  const categories = [
    {
      label: "All Categories",
      value: "all",
    },
    {
      label: "Music",
      value: "music",
    },
    {
      label: "Conference",
      value: "conference",
    },
    {
      label: "Workshop",
      value: "workshop",
    },
    {
      label: "Festival",
      value: "festival",
    },
    {
      label: "Sports",
      value: "sports",
    },
    {
      label: "Arts & Theatre",
      value: "arts_theatre",
    },
    {
      label: "Networking",
      value: "networking",
    },
    {
      label: "Nightlife",
      value: "nightlife",
    },
    {
      label: "Charity",
      value: "charity",
    },
    {
      label: "Exhibition",
      value: "exhibition",
    },
    {
      label: "Religious",
      value: "religious",
    },
    {
      label: "Food & Drink",
      value: "food_drink",
    },
    {
      label: "Technology",
      value: "technology",
    },
    {
      label: "Comedy",
      value: "comedy",
    },
    {
      label: "Other",
      value: "other",
    },
  ];

  // Cities list
  const cities = [
    {
      label: "All Cities",
      value: "all",
    },
    {
      label: "Nairobi",
      value: "Nairobi",
    },
    {
      label: "Nakuru",
      value: "Nakuru",
    },
    {
      label: "Nyahururu",
      value: "Nyahururu",
    },
    {
      label: "Eldoret",
      value: "Eldoret",
    },
  ];

  // Filter and Sort logic
  const filteredAndSortedEvents =
    useMemo(() => {
      const now = new Date();

      // Helper date calculations
      const tomorrowDate =
        new Date(now);

      tomorrowDate.setDate(
        now.getDate() + 1
      );

      tomorrowDate.setHours(
        0,
        0,
        0,
        0
      );

      const endOfTomorrow =
        new Date(tomorrowDate);

      endOfTomorrow.setHours(
        23,
        59,
        59,
        999
      );

      const endOfWeek =
        new Date(now);

      endOfWeek.setDate(
        now.getDate() +
          (7 - now.getDay())
      );

      endOfWeek.setHours(
        23,
        59,
        59,
        999
      );

      const nextWeekStart =
        new Date(endOfWeek);

      nextWeekStart.setMilliseconds(
        nextWeekStart.getMilliseconds() +
          1
      );

      const nextWeekEnd =
        new Date(nextWeekStart);

      nextWeekEnd.setDate(
        nextWeekStart.getDate() +
          7
      );

      // 1. Filter
      const filtered =
        eventsList.filter(
          (event: any) => {
            // Search Query Filter
            const searchTerm =
              searchQuery.toLowerCase();

            const matchesSearch =
              event.title
                .toLowerCase()
                .includes(searchTerm) ||
              (event.description &&
                event.description
                  .toLowerCase()
                  .includes(searchTerm)) ||
              (event.venue?.name &&
                event.venue.name
                  .toLowerCase()
                  .includes(searchTerm));

            if (!matchesSearch)
              return false;

            // Status Filter
            if (
              statusFilter !==
                "all" &&
              getEventStatus(event)
                ?.tone !==
                statusFilter
            ) {
              return false;
            }

            // Category Filter
            if (
              selectedCategory !==
                "all" &&
              event.category !==
                selectedCategory
            ) {
              return false;
            }

            // City Filter
            if (
              selectedCity !== "all"
            ) {
              const venueString =
                `${
                  event.venue?.name ||
                  ""
                } ${
                  event.venue?.address ||
                  ""
                } ${
                  event.city || ""
                }`.toLowerCase();

              if (
                !venueString.includes(
                  selectedCity.toLowerCase()
                )
              ) {
                return false;
              }
            }

            // Price Type Filter
            // Based on real ticket type amounts
            const pricing =
              getEventPricing(event);

            if (
              priceType === "free" &&
              pricing.isPaid
            ) {
              return false;
            }

            if (
              priceType === "paid" &&
              !pricing.isPaid
            ) {
              return false;
            }

            // Slider Price Filter
            // Uses cheapest ticket tier
            if (
              pricing.cheapest >
              priceRange
            ) {
              return false;
            }

            // Date & Time Filter
            if (
              dateFilter !== "all"
            ) {
              const eventDate =
                new Date(event.date);

              if (
                dateFilter ===
                "tomorrow"
              ) {
                if (
                  eventDate <
                    tomorrowDate ||
                  eventDate >
                    endOfTomorrow
                ) {
                  return false;
                }
              } else if (
                dateFilter ===
                "this_week"
              ) {
                if (
                  eventDate < now ||
                  eventDate >
                    endOfWeek
                ) {
                  return false;
                }
              } else if (
                dateFilter ===
                "next_week"
              ) {
                if (
                  eventDate <
                    nextWeekStart ||
                  eventDate >
                    nextWeekEnd
                ) {
                  return false;
                }
              }
            }

            return true;
          }
        );

      // 2. Sort
      return filtered.sort(
        (a: any, b: any) => {
          if (
            sortBy === "date_asc"
          ) {
            return (
              new Date(
                a.date
              ).getTime() -
              new Date(
                b.date
              ).getTime()
            );
          }

          if (
            sortBy === "date_desc"
          ) {
            return (
              new Date(
                b.date
              ).getTime() -
              new Date(
                a.date
              ).getTime()
            );
          }

          if (
            sortBy === "price_asc"
          ) {
            return (
              getEventPricing(a)
                .cheapest -
              getEventPricing(b)
                .cheapest
            );
          }

          if (
            sortBy === "price_desc"
          ) {
            return (
              getEventPricing(b)
                .cheapest -
              getEventPricing(a)
                .cheapest
            );
          }

          if (
            sortBy === "title"
          ) {
            return a.title.localeCompare(
              b.title
            );
          }

          return 0;
        }
      );
    }, [
      eventsList,
      searchQuery,
      selectedCategory,
      selectedCity,
      dateFilter,
      priceType,
      priceRange,
      statusFilter,
      sortBy,
      ticketTypesByEvent,
    ]);

  // Reset back to page 1 whenever the filtered/sorted result set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedCity,
    dateFilter,
    priceType,
    priceRange,
    statusFilter,
    sortBy,
    eventsPerPage,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredAndSortedEvents.length /
        eventsPerPage
    )
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedEvents =
    useMemo(() => {
      const start =
        (safePage - 1) *
        eventsPerPage;

      return filteredAndSortedEvents.slice(
        start,
        start + eventsPerPage
      );
    }, [
      filteredAndSortedEvents,
      safePage,
      eventsPerPage,
    ]);

  const goToPage = (
    page: number
  ) => {
    setCurrentPage(
      Math.min(
        Math.max(1, page),
        totalPages
      )
    );

    resultsRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start",
      }
    );
  };

  // Fixed Left Sidebar Filter Controls Component
  const filterControlsContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-base-300 pb-4">
        <div className="flex items-center gap-2 font-bold text-base">
          <SlidersHorizontal
            size={17}
            className="text-primary"
          />
          <span>Filters</span>
        </div>

        {(
          selectedCategory !==
            "all" ||
          selectedCity !== "all" ||
          priceType !== "all" ||
          statusFilter !==
            DEFAULT_STATUS_FILTER ||
          searchQuery !== "" ||
          priceRange < 50000
        ) && (
          <button
            onClick={() => {
              setStatusFilter(
                DEFAULT_STATUS_FILTER
              );
              setSelectedCategory("all");
              setSelectedCity("all");
              setPriceType("all");
              setSearchQuery("");
              setPriceRange(50000);
            }}
            className="text-xs font-semibold text-primary hover:underline underline-offset-2 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Search Input Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-base-content/60">
          Search event
        </label>

        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/35"
          />

          <input
            type="text"
            placeholder="Search title, venue..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            className="input input-sm input-bordered w-full pl-10 rounded-lg bg-base-100 font-medium transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>
      </div>

      {/* Event Status Filter */}
      <div className="space-y-2.5 pt-5 border-t border-base-300">
        <label className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
          <Flame size={13} />
          Event status
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {statusOptions.map(
            (opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setStatusFilter(
                    opt.value
                  )
                }
                className={`flex items-center justify-between gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-colors duration-150 border ${
                  statusFilter ===
                  opt.value
                    ? "bg-primary text-primary-content border-primary"
                    : "bg-base-100 border-base-300 text-base-content/70 hover:border-primary/40 hover:text-base-content"
                }`}
              >
                <span className="truncate">
                  {opt.label}
                </span>

                <span
                  className={`text-[10px] font-bold ${
                    statusFilter ===
                    opt.value
                      ? "opacity-80"
                      : "text-base-content/40"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* City / Town Filter */}
      <div className="space-y-2.5 pt-5 border-t border-base-300">
        <label className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
          <Building2 size={13} />
          City / Town
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {cities.map(
            (city) => (
              <button
                key={city.value}
                onClick={() =>
                  setSelectedCity(
                    city.value
                  )
                }
                className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 truncate transition-colors duration-150 border ${
                  selectedCity ===
                  city.value
                    ? "bg-primary text-primary-content border-primary"
                    : "bg-base-100 border-base-300 text-base-content/70 hover:border-primary/40 hover:text-base-content"
                }`}
              >
                {city.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Price Type Filter */}
      <div className="space-y-2.5 pt-5 border-t border-base-300">
        <label className="text-xs font-semibold text-base-content/60">
          Ticket type
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            {
              label: "All",
              value: "all",
            },
            {
              label: "Free",
              value: "free",
            },
            {
              label: "Paid",
              value: "paid",
            },
          ].map(
            (price) => (
              <button
                key={price.value}
                onClick={() =>
                  setPriceType(
                    price.value
                  )
                }
                className={`text-xs font-semibold rounded-lg py-1.5 transition-colors duration-150 border ${
                  priceType ===
                  price.value
                    ? "bg-primary text-primary-content border-primary"
                    : "bg-base-100 border-base-300 text-base-content/70 hover:border-primary/40 hover:text-base-content"
                }`}
              >
                {price.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Price Range Slider Filter */}
      <div className="space-y-2.5 pt-5 border-t border-base-300">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-base-content/60">
            Max price
          </label>

          <span className="text-xs font-bold text-primary">
            {priceRange >=
            50000
              ? "Any price"
              : `KES ${priceRange.toLocaleString()}`}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="50000"
          step="500"
          value={priceRange}
          onChange={(e) =>
            setPriceRange(
              Number(e.target.value)
            )
          }
          className="range range-primary range-xs w-full cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-base-content/45 font-medium">
          <span>KES 0</span>
          <span>KES 5,000</span>
          <span>KES 15k+</span>
        </div>
      </div>

      {/* Categories Filter List */}
      <div className="space-y-2.5 pt-5 border-t border-base-300">
        <label className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
          <Tag size={13} />
          Category
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {categories.map(
            (cat) => {
              const Icon =
                categoryIcons[
                  cat.value
                ] || Tag;

              const isActive =
                selectedCategory ===
                cat.value;

              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setSelectedCategory(
                      cat.value
                    );

                    setIsMobileModalOpen(
                      false
                    );
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all duration-150 border ${
                    isActive
                      ? "bg-primary border-primary text-primary-content shadow-sm shadow-primary/25"
                      : "bg-base-100 border-base-300 text-base-content/70 hover:border-primary/40 hover:text-base-content"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      isActive
                        ? "bg-primary-content/20"
                        : "bg-base-200 text-base-content/50"
                    }`}
                  >
                    <Icon size={13} />
                  </span>

                  <span className="text-xs font-semibold leading-tight truncate">
                    {cat.label}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        {/* --- PAGE HEADER & TOP DATE FILTER BAR --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-7 border-b border-base-300">
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Discover events & shows
            </h1>

            <p className="text-sm text-base-content/60 max-w-md">
              Live concerts, tech meetups, workshops, and nightlife happening near you.
            </p>
          </div>

          {/* Top Date & Time Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-base-content/50 flex items-center gap-1 shrink-0 mr-1">
              <Clock size={13} />
              When
            </span>

            {[
              {
                label: "All upcoming",
                value: "all",
              },
              {
                label: "Tomorrow",
                value: "tomorrow",
              },
              {
                label: "This week",
                value: "this_week",
              },
              {
                label: "Next week",
                value: "next_week",
              },
            ].map(
              (tab) => (
                <button
                  key={tab.value}
                  onClick={() =>
                    setDateFilter(
                      tab.value
                    )
                  }
                  className={`text-sm font-semibold rounded-full px-4 py-1.5 shrink-0 transition-colors duration-150 border ${
                    dateFilter ===
                    tab.value
                      ? "bg-primary text-primary-content border-primary"
                      : "bg-base-100 border-base-300 text-base-content/65 hover:border-primary/40 hover:text-base-content"
                  }`}
                >
                  {tab.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* --- MOBILE FILTER BUTTON --- */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() =>
              setIsMobileModalOpen(
                true
              )
            }
            className="flex items-center justify-center gap-2 w-full rounded-xl font-bold text-sm py-2.5 bg-primary text-primary-content transition-transform active:scale-[0.98]"
          >
            <SlidersHorizontal
              size={16}
            />
            <span>
              Open filters & search
            </span>
          </button>
        </div>

        {/* --- MOBILE FILTER MODAL --- */}
        {isMobileModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden">
            <div className="bg-base-100 border border-base-300 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[88vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-base-300 shrink-0">
                <div className="flex items-center gap-2 font-bold text-base">
                  <SlidersHorizontal
                    size={17}
                    className="text-primary"
                  />
                  <span>
                    Filter events
                  </span>
                </div>

                <button
                  onClick={() =>
                    setIsMobileModalOpen(
                      false
                    )
                  }
                  className="rounded-full p-1.5 hover:bg-base-300/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body Controls */}
              <div className="overflow-y-auto pr-1 flex-1">
                {filterControlsContent}
              </div>

              {/* Modal Footer Action */}
              <div className="pt-4 mt-4 border-t border-base-300 shrink-0">
                <button
                  onClick={() =>
                    setIsMobileModalOpen(
                      false
                    )
                  }
                  className="w-full rounded-xl font-bold text-sm py-2.5 bg-primary text-primary-content transition-transform active:scale-[0.98]"
                >
                  View results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* FIXED STICKY LEFT SIDEBAR FILTER PANEL */}
          <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-28 bg-base-200/50 border border-base-300 p-6 rounded-2xl">
            {filterControlsContent}
          </aside>

          {/* MAIN EVENTS CONTENT GRID SECTION */}
          <div
            ref={resultsRef}
            className="lg:col-span-3 space-y-6 scroll-mt-28"
          >
            {/* --- CREATE EVENT BANNER --- */}
            <div className="relative overflow-hidden bg-primary text-primary-content px-6 py-6 sm:px-8 sm:py-7 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-primary-content/10 pointer-events-none" />
              <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full bg-primary-content/10 pointer-events-none" />

              <div className="flex items-center gap-4 relative">
                <div className="w-11 h-11 rounded-xl bg-primary-content/15 flex items-center justify-center shrink-0">
                  <PlusCircle size={22} />
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-base sm:text-lg">
                    Got an event to share?
                  </h3>

                  <p className="text-xs sm:text-sm text-primary-content/80 max-w-sm">
                    Launch your event in minutes and sell secure tickets via M-Pesa or card.
                  </p>
                </div>
              </div>

              <Link
                to="/organizer/dashboard"
                className="relative shrink-0 rounded-xl font-bold text-sm px-5 py-2.5 bg-primary-content text-primary transition-transform active:scale-95 hover:scale-[1.03]"
              >
                Create event
              </Link>
            </div>

            {/* RESULTS COUNT, VIEW TOGGLE & SORT BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-base-content/60">
                Showing{" "}
                <strong className="text-base-content font-bold">
                  {filteredAndSortedEvents.length ===
                  0
                    ? 0
                    : (safePage - 1) *
                        eventsPerPage +
                      1}
                  –
                  {Math.min(
                    safePage *
                      eventsPerPage,
                    filteredAndSortedEvents.length
                  )}
                </strong>{" "}
                of{" "}
                <strong className="text-base-content font-bold">
                  {
                    filteredAndSortedEvents.length
                  }
                </strong>{" "}
                event
                {filteredAndSortedEvents.length ===
                1
                  ? ""
                  : "s"}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Grid vs List View Toggle */}
                <div className="flex items-center bg-base-200/70 border border-base-300 p-0.5 rounded-lg">
                  <button
                    onClick={() =>
                      setViewMode(
                        "grid"
                      )
                    }
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode ===
                      "grid"
                        ? "bg-base-100 text-primary shadow-sm"
                        : "text-base-content/45 hover:text-base-content/70"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid
                      size={15}
                    />
                  </button>

                  <button
                    onClick={() =>
                      setViewMode(
                        "list"
                      )
                    }
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode ===
                      "list"
                        ? "bg-base-100 text-primary shadow-sm"
                        : "text-base-content/45 hover:text-base-content/70"
                    }`}
                    title="List view"
                  >
                    <ListIcon
                      size={15}
                    />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown
                    size={13}
                    className="text-base-content/40"
                  />

                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value
                      )
                    }
                    className="select select-sm select-bordered rounded-lg font-semibold bg-base-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="date_asc">
                      Date: soonest first
                    </option>

                    <option value="date_desc">
                      Date: latest first
                    </option>

                    <option value="price_asc">
                      Price: low to high
                    </option>

                    <option value="price_desc">
                      Price: high to low
                    </option>

                    <option value="title">
                      Title: A–Z
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5"
                    : "grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4"
                }
              >
                {Array.from(
                  {
                    length:
                      eventsPerPage,
                  },
                  (_, i) => i + 1
                ).map((n) => (
                  <div
                    key={n}
                    className={
                      viewMode ===
                      "grid"
                        ? "h-80 bg-base-200 border border-base-300 rounded-2xl animate-pulse"
                        : "h-48 sm:h-32 bg-base-200 border border-base-300 rounded-2xl animate-pulse"
                    }
                  />
                ))}
              </div>
            ) : filteredAndSortedEvents.length >
              0 ? (
              // GRID VIEW
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                  {paginatedEvents.map(
                    (event: any) => {
                      const eventDate =
                        new Date(
                          event.date
                        );

                      const eventStatus =
                        getEventStatus(
                          event
                        );

                      // Ended events are shown but cannot be opened
                      const ended =
                        eventStatus?.tone ===
                        "ended";

                      return (
                        <EventCardShell
                          key={
                            event.eventId
                          }
                          ended={ended}
                          to={`/events/${event.slug}`}
                          baseClass="flex flex-col bg-base-100 border border-base-300 rounded-2xl overflow-hidden transition-all duration-300"
                          activeClass="group hover:border-primary/50 hover:shadow-xl hover:shadow-base-300/40 hover:-translate-y-1"
                        >
                          {/* Media */}
                          <div className="relative h-32 sm:h-48 bg-base-300 overflow-hidden">
                            <EventCardImage
                              eventId={
                                event.eventId
                              }
                              bannerUrl={
                                event.bannerUrl
                              }
                              title={
                                event.title
                              }
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0" />

                            {/* Category + event status */}
                            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1 sm:gap-1.5">
                              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-base-100/90 text-base-content text-[10px] font-bold uppercase tracking-wide max-w-[110px] sm:max-w-none truncate">
                                {event.category?.replace(
                                  "_",
                                  " "
                                )}
                              </span>

                              <EventStatusBadge
                                status={
                                  eventStatus
                                }
                                variant="overlay"
                              />
                            </div>

                            {!ended && (
                              <button
                                onClick={(
                                  e
                                ) => {
                                  e.preventDefault();
                                }}
                                className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 rounded-full bg-base-100/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                title="Save event"
                              >
                                <Bookmark
                                  size={
                                    13
                                  }
                                  className="text-primary"
                                />
                              </button>
                            )}

                            <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-end justify-between gap-1 text-white">
                              <span className="text-xs font-bold">
                                {eventDate.toLocaleDateString(
                                  undefined,
                                  {
                                    month:
                                      "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>

                              <EventCardPrice
                                eventId={
                                  event.eventId
                                }
                                fallbackPricing={getEventPricing(
                                  event
                                )}
                                variant="overlay"
                              />
                            </div>
                          </div>

                          {/* Body */}
                          <div className="flex flex-col flex-1 p-3 sm:p-4 gap-1.5 sm:gap-2">
                            <h3
                              className={`text-sm sm:text-base font-bold leading-snug line-clamp-1 transition-colors ${
                                ended
                                  ? ""
                                  : "group-hover:text-primary"
                              }`}
                            >
                              {
                                event.title
                              }
                            </h3>

                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-base-content/60">
                              <MapPin
                                size={
                                  13
                                }
                                className="shrink-0 text-primary"
                              />

                              <span className="line-clamp-1">
                                {event
                                  .venue
                                  ?.name ||
                                  "Venue TBA"}
                              </span>
                            </div>

                            <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-base-300 flex items-center justify-end sm:justify-between">
                              <span className="text-[11px] font-medium text-base-content/45 hidden sm:flex items-center gap-1">
                                <Ticket
                                  size={
                                    12
                                  }
                                />
                                Verified
                              </span>

                              {ended ? (
                                <span className="text-xs font-bold text-base-content/50">
                                  Event ended
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-primary group-hover:underline underline-offset-2">
                                  Get ticket
                                </span>
                              )}
                            </div>
                          </div>
                        </EventCardShell>
                      );
                    }
                  )}
                </div>
              ) : (
                // LIST VIEW
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  {paginatedEvents.map(
                    (event: any) => {
                      const eventStatus =
                        getEventStatus(
                          event
                        );

                      // Ended events are shown but cannot be opened
                      const ended =
                        eventStatus?.tone ===
                        "ended";

                      return (
                        <EventCardShell
                          key={
                            event.eventId
                          }
                          ended={ended}
                          to={`/events/${event.slug}`}
                          baseClass="bg-base-100 border border-base-300 rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 transition-all duration-200"
                          activeClass="group hover:border-primary/50 hover:shadow-md"
                        >
                          <div className="w-full h-28 sm:w-32 sm:h-24 rounded-xl bg-base-300 shrink-0 relative overflow-hidden flex items-center justify-center">
                            <EventCardImage
                              eventId={
                                event.eventId
                              }
                              bannerUrl={
                                event.bannerUrl
                              }
                              title={
                                event.title
                              }
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                {event.category?.replace(
                                  "_",
                                  " "
                                ) ||
                                  "Event"}
                              </span>

                              <EventStatusBadge
                                status={
                                  eventStatus
                                }
                                variant="list"
                              />

                              <span className="text-xs font-semibold text-base-content/50">
                                {new Date(
                                  event.date
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    month:
                                      "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}{" "}
                                ·{" "}
                                {event.time ||
                                  "Time TBA"}
                              </span>
                            </div>

                            <h3
                              className={`text-sm sm:text-base font-bold line-clamp-1 transition-colors ${
                                ended
                                  ? ""
                                  : "group-hover:text-primary"
                              }`}
                            >
                              {
                                event.title
                              }
                            </h3>

                            <p className="hidden sm:block text-xs text-base-content/55 line-clamp-1">
                              {event.description ||
                                "No description provided for this upcoming event."}
                            </p>

                            <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                              <MapPin
                                size={
                                  13
                                }
                                className="text-primary shrink-0"
                              />

                              <span className="line-clamp-1">
                                {event
                                  .venue
                                  ?.name ||
                                  "Venue TBA"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-stretch sm:items-end justify-center gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-base-300 w-full sm:w-auto">
                            <EventCardPrice
                              eventId={
                                event.eventId
                              }
                              fallbackPricing={getEventPricing(
                                event
                              )}
                              variant="list"
                            />

                            {ended ? (
                              <span className="text-xs font-bold px-4 py-2 rounded-xl bg-base-300 text-base-content/50 text-center">
                                Event ended
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-4 py-2 rounded-xl bg-primary text-primary-content text-center transition-transform group-hover:scale-105">
                                Get ticket
                              </span>
                            )}
                          </div>
                        </EventCardShell>
                      );
                    }
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-24 bg-base-200/40 rounded-2xl border border-base-300 space-y-3">
                <CalendarIcon className="w-11 h-11 text-base-content/30 mx-auto" />

                <h3 className="text-lg font-bold">
                  No events found
                </h3>

                <p className="text-sm text-base-content/60 max-w-sm mx-auto">
                  Try clearing your filters or search terms to browse all available upcoming events.
                </p>

                <button
                  onClick={() => {
                    setStatusFilter(
                      DEFAULT_STATUS_FILTER
                    );
                    setSelectedCategory(
                      "all"
                    );
                    setSelectedCity(
                      "all"
                    );
                    setDateFilter(
                      "all"
                    );
                    setPriceType(
                      "all"
                    );
                    setSearchQuery(
                      ""
                    );
                    setPriceRange(
                      50000
                    );
                  }}
                  className="mt-2 text-sm font-bold px-5 py-2 rounded-xl bg-primary text-primary-content transition-transform active:scale-95"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* --- PAGINATION --- */}
            {!isLoading &&
              filteredAndSortedEvents.length >
                PAGE_SIZE_OPTIONS[0] && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-base-300">
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-base-content/60">
                    <span>
                      Page{" "}
                      <strong className="text-base-content font-bold">
                        {safePage}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-base-content font-bold">
                        {
                          totalPages
                        }
                      </strong>
                    </span>

                    <label className="flex items-center gap-2">
                      <span>
                        Per page
                      </span>

                      <select
                        value={
                          eventsPerPage
                        }
                        onChange={(e) =>
                          setEventsPerPage(
                            Number(
                              e.target
                                .value
                            )
                          )
                        }
                        className="select select-xs select-bordered rounded-lg font-semibold bg-base-100 cursor-pointer"
                      >
                        {PAGE_SIZE_OPTIONS.map(
                          (n) => (
                            <option
                              key={n}
                              value={n}
                            >
                              {n}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>

                  {totalPages >
                    1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          goToPage(
                            1
                          )
                        }
                        disabled={
                          safePage ===
                          1
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition-colors hover:border-primary/40 hover:text-base-content disabled:opacity-40 disabled:pointer-events-none"
                        aria-label="First page"
                      >
                        <ChevronsLeft
                          size={
                            15
                          }
                        />
                      </button>

                      <button
                        onClick={() =>
                          goToPage(
                            safePage -
                              1
                          )
                        }
                        disabled={
                          safePage ===
                          1
                        }
                        className="flex items-center gap-1 text-sm font-semibold px-3 h-8 rounded-lg border border-base-300 text-base-content/70 transition-colors hover:border-primary/40 hover:text-base-content disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronLeft
                          size={
                            15
                          }
                        />

                        <span className="hidden sm:inline">
                          Prev
                        </span>
                      </button>

                      {getPageNumbers(
                        safePage,
                        totalPages
                      ).map(
                        (
                          page,
                          idx
                        ) =>
                          page ===
                          "…" ? (
                            <span
                              key={`gap-${idx}`}
                              className="w-6 text-center text-base-content/40 select-none"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={
                                page
                              }
                              onClick={() =>
                                goToPage(
                                  page
                                )
                              }
                              aria-current={
                                page ===
                                safePage
                                  ? "page"
                                  : undefined
                              }
                              className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                                page ===
                                safePage
                                  ? "bg-primary text-primary-content"
                                  : "text-base-content/60 hover:bg-base-200"
                              }`}
                            >
                              {
                                page
                              }
                            </button>
                          )
                      )}

                      <button
                        onClick={() =>
                          goToPage(
                            safePage +
                              1
                          )
                        }
                        disabled={
                          safePage ===
                          totalPages
                        }
                        className="flex items-center gap-1 text-sm font-semibold px-3 h-8 rounded-lg border border-base-300 text-base-content/70 transition-colors hover:border-primary/40 hover:text-base-content disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <span className="hidden sm:inline">
                          Next
                        </span>

                        <ChevronRight
                          size={
                            15
                          }
                        />
                      </button>

                      <button
                        onClick={() =>
                          goToPage(
                            totalPages
                          )
                        }
                        disabled={
                          safePage ===
                          totalPages
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-base-300 text-base-content/70 transition-colors hover:border-primary/40 hover:text-base-content disabled:opacity-40 disabled:pointer-events-none"
                        aria-label="Last page"
                      >
                        <ChevronsRight
                          size={
                            15
                          }
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};