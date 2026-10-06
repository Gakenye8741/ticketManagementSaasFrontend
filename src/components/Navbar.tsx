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
  LayoutDashboard,
  Phone,
  Search,
  PlusCircle,
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
  CalendarCheck
} from "lucide-react";

import "./animate.css"; 
import { ThemeToggle } from "./ThemeToggle";
import { useGetEventsByTitleQuery } from "../features/APIS/EventsApi";
import { useGetUserByDigitalIdQuery } from "../features/APIS/UserApi";

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role); // e.g., "admin", "organizer", "user"

  // Fetch the logged-in user's latest profile so the photo is always up to date
  // (this shares the same cache as the profile page, so it refreshes after an upload)
  const digitalId = user?.digitalId || user?.userId;
  const { data: profileData } = useGetUserByDigitalIdQuery(digitalId, {
    skip: !isAuthenticated || !digitalId,
  });
  const profile: any = (profileData as any)?.data || profileData;
  // Fresh value from the API first, then the value saved at login
  const avatarUrl = profile?.profileImageUrl || user?.profileImageUrl || "";
  const avatarInitial = (profile?.firstName || user?.firstName)?.charAt(0) || "U";

  // Debounce search query to prevent excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch events using RTK Query based on search title/slug
  const { data: searchResults, isFetching: isSearching } = useGetEventsByTitleQuery(debouncedQuery, {
    skip: debouncedQuery.length < 2,
  });

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns and menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Search modal: close with Escape and lock page scroll while it is open
  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSearchOpen]);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectEvent = (slug: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(`/events/${slug}`);
  };

  // Determine dashboard link and label based on user role
  const getDashboardRoute = () => {
    if (role === "admin") return "/admin-dashboard/";
    if (role === "organizer") return "/organizer-dashboard/";
    return "/dashboard/analytics";
  };

  const getDashboardLabel = () => {
    if (role === "admin") return "Admin Control Center";
    if (role === "organizer") return "Organizer Dashboard";
    return "My Dashboard";
  };

  const getDashboardIcon = () => {
    if (role === "admin") return <ShieldCheck size={15} className="text-primary" />;
    if (role === "organizer") return <CalendarCheck size={15} className="text-primary" />;
    return <LayoutDashboard size={15} className="text-primary" />;
  };

  return (
    <>
      {/* --- TOP NAVBAR --- */}
      <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-200 bg-base-100 ${
        scrolled ? "border-b border-base-200 shadow-sm py-2.5" : "border-b border-base-200/60 py-3.5"
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex justify-between items-center gap-2">
          
          {/* Left: Mobile Hamburger & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden btn btn-ghost btn-xs sm:btn-sm btn-square rounded-xl text-base-content/80 hover:bg-base-200"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary text-primary-content rounded-xl flex items-center justify-center font-black shadow-sm tracking-tighter shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-lg font-black tracking-tight uppercase text-base-content leading-none">
                  TicketStream
                </span>
                <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-primary uppercase mt-0.5">
                  Event Ticketing
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search trigger - opens the search modal */}
          <div className="flex flex-1 max-w-[150px] sm:max-w-xs md:max-w-md mx-1 sm:mx-4 relative">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search events"
              className="relative w-full bg-base-200/80 border border-transparent hover:border-primary/40 text-[11px] sm:text-xs rounded-xl py-1.5 sm:py-2 pl-7 sm:pl-9 pr-3 text-left text-base-content/40 truncate transition-all"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
              Search events...
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 font-semibold text-xs tracking-wide shrink-0">
            {[
              { path: "/", label: "Home", icon: Home },
              { path: "/events", label: "Events", icon: Compass },
              { path: "/pricing", label: "Pricing", icon: Tag },
              { path: "/about", label: "About", icon: Info },
              { path: "/contact", label: "Support", icon: Phone },
            ].map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  location.pathname === link.path 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                <link.icon size={14} />
                <span>{link.label}</span>
              </Link>
            ))}

            {isAuthenticated && (
              <Link 
                to="/tickets" 
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  location.pathname === "/tickets" 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                <Ticket size={14} />
                <span>Tickets</span>
              </Link>
            )}
          </div>

          {/* Right: Actions, Profile & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />

            {/* Launch Event Button */}
            <Link 
              to={isAuthenticated ? "/events/create" : "/login"} 
              className="hidden sm:flex items-center gap-1.5 btn btn-xs sm:btn-sm btn-primary rounded-xl font-bold text-[11px] sm:text-xs shadow-sm hover:scale-[1.02] transition-transform"
            >
              <Sparkles size={14} />
              <span>Launch</span>
            </Link>
            
            {isAuthenticated ? (
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="cursor-pointer">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-base-200/70 hover:bg-base-200 p-1 pl-1.5 pr-2 sm:pr-3 rounded-xl border border-base-300 transition-all">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        avatarInitial
                      )}
                    </div>
                    <span className="hidden xl:inline text-xs font-bold uppercase tracking-wider">
                      {user?.firstName || "Account"}
                    </span>
                    
                    <ChevronDown size={14} className="opacity-50" />
                  </div>
                </label>
                <ul tabIndex={0} className="menu dropdown-content mt-2 p-1.5 shadow-xl bg-base-100 rounded-2xl w-56 border border-base-200 z-[110]">
                  <li className="menu-title text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 opacity-40">
                    {role ? `${role.toUpperCase()} MENU` : "DASHBOARD"}
                  </li>
                  <li>
                    <Link to={getDashboardRoute()} className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-semibold">
                      {getDashboardIcon()} 
                      <span>{getDashboardLabel()}</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/tickets" className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-semibold">
                      <Ticket size={15} className="text-primary" /> 
                      <span>My Purchases</span>
                    </Link>
                  </li>
                  <div className="h-[1px] bg-base-200 my-1" />
                  <li>
                    <button onClick={handleLogout} className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-semibold text-error hover:bg-error/10">
                      <LogOut size={15} /> 
                      <span>Sign Out</span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn btn-ghost btn-xs sm:btn-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- SEARCH MODAL --- */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-200"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-base-100 rounded-2xl shadow-2xl border border-base-200 overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 p-3 border-b border-base-200">
              <Search className="text-base-content/40 w-4 h-4 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-base-content placeholder:text-base-content/40 focus:outline-none"
              />
              {isSearching && <Loader2 className="text-primary w-4 h-4 animate-spin shrink-0" />}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="btn btn-ghost btn-xs btn-square rounded-lg shrink-0"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </form>

            {/* Results */}
            <div className="overflow-y-auto">
              {debouncedQuery.length < 2 ? (
                <div className="p-6 text-center text-xs text-base-content/50 flex flex-col items-center gap-2">
                  <Search size={22} className="text-primary/40" />
                  <span>Type at least 2 characters to search events.</span>
                </div>
              ) : isSearching && (!searchResults || searchResults.length === 0) ? (
                <div className="p-6 text-center text-xs text-base-content/60 flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" /> Searching events...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="py-1">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/40 border-b border-base-100">
                    Matching Events ({searchResults.length})
                  </div>
                  {searchResults.map((event: any) => (
                    <button
                      key={event._id || event.id}
                      onClick={() => handleSelectEvent(event.slug)}
                      className="w-full text-left px-3 py-3 hover:bg-base-200 flex items-center gap-3 transition-colors border-b border-base-100/50 last:border-none"
                    >
                      {event.bannerImage || event.imageUrl ? (
                        <img
                          src={event.bannerImage || event.imageUrl}
                          alt={event.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Compass size={18} />
                        </div>
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-base-content truncate">{event.title}</span>
                        <span className="text-[10px] text-base-content/60 truncate">{event.category || event.location || "Event"}</span>
                      </div>
                    </button>
                  ))}
                  <div className="p-2 border-t border-base-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="btn btn-ghost btn-xs w-full text-primary rounded-lg text-[11px]"
                    >
                      See all results for "{searchQuery.trim()}"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-base-content/60 flex flex-col items-center gap-2">
                  <span>No events found matching "{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="btn btn-xs btn-outline btn-primary mt-1"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FULLSCREEN MOBILE DRAWER MENU --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[57px] bg-base-100/95 backdrop-blur-xl z-[90] lg:hidden flex flex-col p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex flex-col gap-3 font-bold text-sm tracking-wide">
            <span className="text-[10px] uppercase tracking-widest text-base-content/40 mb-1">Navigation</span>
            {[
              { path: "/", label: "Home", icon: Home },
              { path: "/events", label: "Explore Events", icon: Compass },
              { path: "/pricing", label: "Pricing Plans", icon: Tag },
              { path: "/about", label: "About", icon: Info },
              { path: "/contact", label: "Support", icon: Phone },
            ].map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                  location.pathname === link.path 
                    ? "bg-primary text-primary-content shadow-sm" 
                    : "bg-base-200/60 text-base-content hover:bg-base-200"
                }`}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </Link>
            ))}

            {isAuthenticated && (
              <>
                <Link 
                  to={getDashboardRoute()} 
                  className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                    location.pathname.includes("dashboard") 
                      ? "bg-primary text-primary-content shadow-sm" 
                      : "bg-base-200/60 text-base-content hover:bg-base-200"
                  }`}
                >
                  <LayoutDashboard size={18} />
                  <span>{getDashboardLabel()}</span>
                </Link>
                <Link 
                  to="/tickets" 
                  className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                    location.pathname === "/tickets" 
                      ? "bg-primary text-primary-content shadow-sm" 
                      : "bg-base-200/60 text-base-content hover:bg-base-200"
                  }`}
                >
                  <Ticket size={18} />
                  <span>My Tickets</span>
                </Link>
              </>
            )}

            <Link 
              to={isAuthenticated ? "/events/create" : "/login"} 
              className="mt-2 p-3 rounded-xl flex items-center gap-3 bg-primary text-primary-content shadow-md"
            >
              <Sparkles size={18} />
              <span>Launch Event</span>
            </Link>

            {/* Mobile Auth Actions */}
            {!isAuthenticated && (
              <div className="mt-4 pt-4 border-t border-base-200 flex flex-col gap-2">
                <Link to="/login" className="p-3 rounded-xl flex items-center justify-center gap-2 bg-primary text-primary-content text-xs uppercase font-bold shadow-sm">
                  <LogIn size={16} />
                  <span>Sign In / Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MOBILE APP-LIKE BOTTOM DOCK --- */}
      <div className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-[100]">
        <div className="bg-base-100/95 backdrop-blur-md border border-base-200 rounded-2xl shadow-lg px-2 py-1.5 flex justify-around items-center">
          {[
            { path: "/", icon: Home, label: "Home" },
            { path: "/events", icon: Compass, label: "Explore" },
            { path: isAuthenticated ? "/tickets" : "/login", icon: Ticket, label: "Tickets", hide: !isAuthenticated },
            { path: "/pricing", icon: Tag, label: "Pricing" },
            { path: "/events/create", icon: PlusCircle, label: "Launch", highlight: true },
            { path: "/login", icon: LogIn, label: "Sign In", hide: isAuthenticated },
          ].map((item) => (
            !item.hide && (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  item.highlight 
                    ? "text-primary scale-105" 
                    : location.pathname === item.path 
                      ? "text-primary font-bold" 
                      : "text-base-content/60"
                }`}
              >
                <item.icon size={20} />
                <span className="text-[9px] tracking-tight mt-0.5 font-semibold">
                  {item.label}
                </span>
              </Link>
            )
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;