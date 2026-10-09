import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../App/store";
import { clearCredentials } from "../features/Auth/AuthSlice";
import {
  Home,
  Info,
  LogOut,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Phone,
  Search,
  Ticket,
  Compass,
  Store,
  Menu,
  X,
  Sparkles,
  Tag,
  LogIn,
  Loader2,
  ShieldCheck,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

import "./animate.css";
import { ThemeToggle } from "./ThemeToggle";
import { useGetEventsByTitleQuery } from "../features/APIS/EventsApi";
import { useGetUserByDigitalIdQuery } from "../features/APIS/UserApi";
import { useGetPrimaryMediaByEventIdQuery } from "../features/APIS/mediaApi";

// ---------------------------------------------------------------------------
// ONE list of tabs, used by the desktop bar, the mobile menu and the bottom
// dock, so all three always show the same names, icons and active style.
// ---------------------------------------------------------------------------
type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  authOnly?: boolean;
};

const NAV_LINKS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/events", label: "Events", icon: Compass },
  { path: "/pricing", label: "Pricing", icon: Tag },
  { path: "/about", label: "About", icon: Info },
  { path: "/contact", label: "Support", icon: Phone },
  { path: "/tickets", label: "Tickets", icon: Ticket, authOnly: true },
];

const SIGN_IN_ITEM: NavItem = {
  path: "/login",
  label: "Sign In",
  icon: LogIn,
};

const findLink = (path: string) =>
  NAV_LINKS.find((l) => l.path === path)!;

// Shared tab look: the active tab is always a soft primary pill.
const TAB_ACTIVE = "bg-primary/10 text-primary";
const TAB_IDLE =
  "text-base-content/65 hover:bg-base-200 hover:text-base-content";

const isPathActive = (pathname: string, path: string) => {
  if (path === "/") return pathname === "/";

  // "Launch" lives under /events but is not the Events tab
  if (path === "/events" && pathname === "/events/create") return false;

  return pathname === path || pathname.startsWith(`${path}/`);
};

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
const Avatar = ({
  url,
  initial,
  className = "",
}: {
  url: string;
  initial: string;
  className?: string;
}) => (
  <div
    className={`overflow-hidden bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0 ${className}`}
  >
    
    {url ? (
      <img
        src={url}
        alt="Profile"
        className="w-full h-full object-cover"
      />
    ) : (
      initial
    )}
  </div>
);

// Thumbnail used by the search results. It lives outside Navbar so it is
// not re-created (and its image re-fetched) every time Navbar re-renders.
const EventSearchThumbnail = ({ event }: { event: any }) => {
  const eventId = event?.id ?? event?._id ?? event?.eventId;

  const { data: primaryMediaData } = useGetPrimaryMediaByEventIdQuery(
    Number(eventId),
    {
      skip: !eventId || Number.isNaN(Number(eventId)),
    }
  );

  // Handles { data: { url } }, { data: { media: { url } } },
  // { data: { data: { url } } } and { url }
  const primaryMedia: any =
    (primaryMediaData as any)?.data?.data ||
    (primaryMediaData as any)?.data?.media ||
    (primaryMediaData as any)?.data ||
    primaryMediaData;

  const primaryImage =
    primaryMedia?.url ||
    primaryMedia?.mediaUrl ||
    primaryMedia?.imageUrl ||
    primaryMedia?.fileUrl ||
    "";

  const fallbackImage =
    event?.bannerImage ||
    event?.bannerUrl ||
    event?.imageUrl ||
    event?.primaryImage ||
    "";

  const imageUrl = primaryImage || fallbackImage;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={event?.title || "Event"}
        className="w-12 h-12 rounded-xl object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Compass size={18} />
    </div>
  );
};

// One tab of the mobile bottom dock
const DockTab = ({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 min-w-[3.75rem] rounded-2xl px-3 py-1.5 transition-colors duration-150 ${
        active ? TAB_ACTIVE : "text-base-content/60"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.4 : 2} />

      <span className="text-[10px] font-semibold leading-none">
        {item.label}
      </span>
    </Link>
  );
};

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);

  // Fetch the logged-in user's latest profile so the photo is always up to date
  const digitalId = user?.digitalId || user?.userId;
  const { data: profileData } = useGetUserByDigitalIdQuery(digitalId, {
    skip: !isAuthenticated || !digitalId,
  });

  const profile: any = (profileData as any)?.data || profileData;

  const avatarUrl =
    profile?.profileImageUrl || user?.profileImageUrl || "";
  const avatarInitial =
    (profile?.firstName || user?.firstName)?.charAt(0) || "U";
  const displayName = profile?.firstName || user?.firstName || "Account";

  // Debounce search query to prevent excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch events using RTK Query based on search title/slug
  const { data: searchData, isFetching: isSearching } =
    useGetEventsByTitleQuery(debouncedQuery, {
      skip: debouncedQuery.length < 2,
    });

  const searchResults: any[] = Array.isArray(searchData)
    ? searchData
    : (searchData as any)?.data ?? [];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns and menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Search modal / mobile menu: close with Escape and lock page scroll
  const overlayOpen = isSearchOpen || mobileMenuOpen;

  useEffect(() => {
    if (!overlayOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  const handleLogout = () => {
    dispatch(clearCredentials());
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      setIsSearchOpen(false);

      navigate(
        `/events?search=${encodeURIComponent(searchQuery.trim())}`
      );
    }
  };

  const handleSelectEvent = (slug: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");

    navigate(`/events/${slug}`);
  };

  const openSearch = () => {
    setMobileMenuOpen(false);
    setIsSearchOpen(true);
  };

  // Determine dashboard link and label based on user role
  const getDashboardRoute = () => {
    if (role === "admin") return "/admin-dashboard/";
    if (role === "organizer") return "/organizer-dashboard/";

    return "/user-dashboard";
  };

  const getDashboardLabel = () => {
    if (role === "admin") return "Admin Control Center";
    if (role === "organizer") return "Organizer Dashboard";

    return "My Dashboard";
  };

  const getDashboardIcon = (size = 15) => {
    if (role === "admin") {
      return <ShieldCheck size={size} className="text-primary" />;
    }

    if (role === "organizer") {
      return <CalendarCheck size={size} className="text-primary" />;
    }

    return <LayoutDashboard size={size} className="text-primary" />;
  };

  const launchPath = isAuthenticated ? "/events/create" : "/login";

  // Tabs shown to this visitor (Tickets only when signed in)
  const visibleLinks = NAV_LINKS.filter(
    (l) => !l.authOnly || isAuthenticated
  );

  // Bottom dock: Home, Pricing, [Events], About, Tickets / Sign In
  const dockLeft = [findLink("/"), findLink("/pricing")];
  const dockRight = [
    findLink("/about"),
    isAuthenticated ? findLink("/tickets") : SIGN_IN_ITEM,
  ];
  const eventsActive = isPathActive(location.pathname, "/events");

  return (
    <>
      {/* --- TOP NAVBAR --- */}
      <nav
        className={`fixed top-0 left-0 w-full z-[100] h-14 sm:h-16 bg-base-100/90 backdrop-blur-xl border-b transition-shadow duration-200 ${
          scrolled
            ? "border-base-200 shadow-sm"
            : "border-base-200/60"
        }`}
      >
        <div className="h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: mobile menu button + brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden btn btn-ghost btn-sm btn-square rounded-xl text-base-content/80 hover:bg-base-200"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>

            <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-sm shadow-primary/25 shrink-0">
                <Store className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </div>

              <div className="hidden min-[420px]:flex flex-col">
                <span className="text-sm sm:text-base font-black tracking-tight uppercase text-base-content leading-none">
                  TicketStream
                </span>

                <span className="hidden sm:block text-[10px] font-bold tracking-widest text-primary uppercase mt-1 leading-none">
                  Event Ticketing
                </span>
              </div>
            </Link>
          </div>

          {/* Center: desktop tabs */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {visibleLinks.map((link) => {
              const active = isPathActive(location.pathname, link.path);
              const Icon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors duration-150 ${
                    active
                      ? `${TAB_ACTIVE} font-bold`
                      : `${TAB_IDLE} font-semibold`
                  }`}
                >
                  <Icon
                    size={15}
                    className="hidden 2xl:block"
                    strokeWidth={active ? 2.4 : 2}
                  />

                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Center on phones and tablets: search bar */}
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search events"
            className="lg:hidden relative flex-1 min-w-0 max-w-[11rem] sm:max-w-xs md:max-w-md mx-0.5 sm:mx-2 h-9 rounded-xl bg-base-200/80 border border-transparent hover:border-primary/40 pl-8 pr-3 text-left text-xs text-base-content/45 truncate transition-colors"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
            Search events...
          </button>

          {/* Right: search, theme, launch, account */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search bar (large screens) */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search events"
              className="hidden lg:flex items-center gap-2 h-9 w-36 xl:w-52 rounded-xl bg-base-200/70 hover:bg-base-200 border border-transparent hover:border-primary/30 px-3 text-xs text-base-content/45 transition-colors"
            >
              <Search size={14} className="shrink-0" />
              <span className="truncate">Search events...</span>
            </button>


            <ThemeToggle />

            <Link
              to={launchPath}
              className="hidden md:inline-flex items-center gap-1.5 btn btn-sm btn-primary rounded-xl font-bold text-xs shadow-sm shadow-primary/25"
            >
              <Sparkles size={14} />
              <span className="hidden md:inline lg:hidden xl:inline">
                Launch
              </span>
            </Link>

            {isAuthenticated ? (
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-base-300 bg-base-200/60 hover:bg-base-200 p-1 pr-2 2xl:pr-3 transition-colors"
                >
                  <Avatar
                    url={avatarUrl}
                    initial={avatarInitial}
                    className="w-7 h-7 rounded-lg text-xs"
                  />

                  <span className="hidden 2xl:inline text-xs font-bold uppercase tracking-wider">
                    {displayName}
                  </span>

                  <ChevronDown size={14} className="opacity-50" />
                </label>

                <ul
                  tabIndex={0}
                  className="menu dropdown-content mt-3 p-2 shadow-xl bg-base-100 rounded-2xl w-64 border border-base-200 z-[110]"
                >
                  <li className="pointer-events-none px-2 pt-1 pb-2">
                    <div className="flex items-center gap-3 p-0 hover:bg-transparent">
                      <Avatar
                        url={avatarUrl}
                        initial={avatarInitial}
                        className="w-10 h-10 rounded-xl text-sm"
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {displayName}
                        </p>

                        <p className="text-[11px] font-semibold text-primary capitalize">
                          {role || "Member"}
                        </p>
                      </div>
                    </div>
                  </li>

                  <div className="h-px bg-base-200 mb-1" />

                  <li>
                    <Link
                      to={getDashboardRoute()}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold"
                    >
                      {getDashboardIcon()}
                      <span>{getDashboardLabel()}</span>
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/tickets"
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold"
                    >
                      <Ticket size={15} className="text-primary" />
                      <span>My Purchases</span>
                    </Link>
                  </li>

                  <div className="h-px bg-base-200 my-1" />

                  <li>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-error hover:bg-error/10"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex btn btn-sm btn-ghost rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* --- SEARCH MODAL --- */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-200"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-base-100 rounded-3xl shadow-2xl border border-base-200 overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2.5 px-4 py-3 border-b border-base-200"
            >
              <Search className="text-base-content/40 w-[18px] h-[18px] shrink-0" />

              <input
                autoFocus
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-base-content placeholder:text-base-content/40 focus:outline-none"
              />

              {isSearching && (
                <Loader2 className="text-primary w-4 h-4 animate-spin shrink-0" />
              )}

              <kbd className="hidden sm:inline-block shrink-0 rounded-md border border-base-300 bg-base-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-base-content/50">
                Esc
              </kbd>

              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="sm:hidden btn btn-ghost btn-xs btn-square rounded-lg shrink-0"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </form>

            {/* Results */}
            <div className="overflow-y-auto overscroll-contain">
              {debouncedQuery.length < 2 ? (
                <div className="p-8 text-center text-xs text-base-content/50 flex flex-col items-center gap-2.5">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Search size={20} />
                  </span>

                  <span>
                    Type at least 2 characters to search events.
                  </span>
                </div>
              ) : isSearching && searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-base-content/60 flex items-center justify-center gap-2">
                  <Loader2
                    size={14}
                    className="animate-spin text-primary"
                  />
                  Searching events...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  <div className="px-4 py-2 text-[11px] font-semibold text-base-content/45">
                    {searchResults.length}{" "}
                    {searchResults.length === 1 ? "event" : "events"} found
                  </div>

                  {searchResults.map((event: any) => (
                    <button
                      key={event._id || event.id || event.eventId}
                      onClick={() => handleSelectEvent(event.slug)}
                      className="w-full text-left px-4 py-2.5 hover:bg-base-200/70 flex items-center gap-3 transition-colors"
                    >
                      <EventSearchThumbnail event={event} />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-base-content truncate">
                          {event.title}
                        </p>

                        <p className="text-xs text-base-content/60 truncate capitalize">
                          {(
                            event.category ||
                            event.location ||
                            "Event"
                          )
                            .toString()
                            .replace(/_/g, " ")}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-base-content/30 shrink-0"
                      />
                    </button>
                  ))}

                  <div className="p-2 border-t border-base-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(
                          `/events?search=${encodeURIComponent(
                            searchQuery.trim()
                          )}`
                        );
                      }}
                      className="btn btn-ghost btn-sm w-full text-primary rounded-xl text-xs"
                    >
                      See all results for "{searchQuery.trim()}"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-base-content/60 flex flex-col items-center gap-2">
                  <span>No events found matching "{searchQuery}"</span>

                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="btn btn-xs btn-outline btn-primary mt-1 rounded-lg"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE MENU (same tabs as the desktop bar) --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 sm:top-16 z-[90] lg:hidden bg-base-100/95 backdrop-blur-xl overflow-y-auto overscroll-contain px-4 pt-5 pb-32 animate-in fade-in duration-200">
          <div className="max-w-md mx-auto flex flex-col gap-5">
            {isAuthenticated && (
              <div className="flex items-center gap-3 rounded-2xl border border-base-200 bg-base-200/50 p-3">
                <Avatar
                  url={avatarUrl}
                  initial={avatarInitial}
                  className="w-11 h-11 rounded-xl text-base"
                />

                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {displayName}
                  </p>

                  <p className="text-xs font-semibold text-primary capitalize">
                    {role || "Member"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="px-3 pb-1 text-xs font-semibold text-base-content/45">
                Menu
              </span>

              {visibleLinks.map((link) => {
                const active = isPathActive(
                  location.pathname,
                  link.path
                );
                const Icon = link.icon;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-colors duration-150 ${
                      active
                        ? `${TAB_ACTIVE} font-bold`
                        : `${TAB_IDLE} font-semibold`
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight
                      size={16}
                      className="opacity-35"
                    />
                  </Link>
                );
              })}

              {isAuthenticated && (
                <Link
                  to={getDashboardRoute()}
                  aria-current={
                    location.pathname.includes("dashboard")
                      ? "page"
                      : undefined
                  }
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-colors duration-150 ${
                    location.pathname.includes("dashboard")
                      ? `${TAB_ACTIVE} font-bold`
                      : `${TAB_IDLE} font-semibold`
                  }`}
                >
                  {getDashboardIcon(18)}
                  <span className="flex-1">{getDashboardLabel()}</span>
                  <ChevronRight size={16} className="opacity-35" />
                </Link>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-base-200">
              <Link
                to={launchPath}
                className="btn btn-primary rounded-2xl h-12 font-bold gap-2 shadow-md shadow-primary/25"
              >
                <Sparkles size={18} />
                Launch an event
              </Link>

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost rounded-2xl h-12 font-semibold gap-2 text-error hover:bg-error/10"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="btn btn-outline rounded-2xl h-12 font-bold gap-2 border-base-300"
                >
                  <LogIn size={18} />
                  Sign in / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE BOTTOM DOCK (same tabs, same active style) --- */}
      <div
        className="lg:hidden fixed left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-[100]"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="bg-base-100/90 backdrop-blur-xl border border-base-200 rounded-3xl shadow-xl shadow-base-content/10 px-2 py-1.5 flex items-end justify-between">
          {dockLeft.map((item) => (
            <DockTab
              key={item.path}
              item={item}
              active={isPathActive(location.pathname, item.path)}
            />
          ))}

          {/* Centre action: Events is the main button */}
          <Link
            to="/events"
            aria-label="Browse events"
            aria-current={eventsActive ? "page" : undefined}
            className="-mt-7 flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/30 ring-4 transition-transform active:scale-95 ${
                eventsActive ? "ring-primary/25" : "ring-base-100"
              }`}
            >
              <Compass size={22} />
            </span>

            <span className="text-[10px] font-bold leading-none text-primary">
              Events
            </span>
          </Link>

          {dockRight.map((item) => (
            <DockTab
              key={item.path}
              item={item}
              active={isPathActive(location.pathname, item.path)}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;