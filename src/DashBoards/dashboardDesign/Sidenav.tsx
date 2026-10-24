import { NavLink, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  CreditCard,
  Ticket,
  LifeBuoy,
  Home,
  ShoppingBag,
  TrendingUp,
  Store,
  LayoutDashboard,
  Wallet,
  CalendarDays,
  ScanLine,
  BadgeCheck,
} from "lucide-react";
import { clearCredentials } from "../../features/Auth/AuthSlice";
import { type RootState } from "../../App/store";

interface SideNavProps {
  onNavItemClick?: () => void;
  isCollapsed?: boolean;
}

/**
 * Navigation groups. Icons are chosen to match each item's real purpose:
 *  - Explore        → Home            (discover events)
 *  - My Analytics   → TrendingUp      (charts and spend insights)
 *  - Bookings       → ShoppingBag     (orders you placed)
 *  - My Tickets     → Ticket          (individual passes in your wallet)
 *  - My Payments    → Wallet          (money side of your activity)
 *  - Support        → LifeBuoy        (help / customer support)
 *  - Profile        → User            (account, name, contact details)
 *
 * Paths are kept as relative strings, exactly as you had them, so they
 * still resolve under your /dashboard-style parent route.
 */
const navigationLinks = [
  {
    title: "Overview",
    items: [
      { path: "/", label: "Explore", icon: Home },
      { path: "analytics", label: "My Analytics", icon: TrendingUp },
    ],
  },
  {
    title: "My Activity",
    items: [
      { path: "my-bookings", label: "Bookings", icon: ShoppingBag },
      { path: "tickets", label: "My Tickets", icon: Ticket },
    ],
  },
  {
    title: "Finance & Support",
    items: [
      { path: "Payments", label: "My Payments", icon: Wallet },
      { path: "supportTickets", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    title: "Account",
    items: [{ path: "profile", label: "Profile", icon: User }],
  },
];

export const SideNav = ({ onNavItemClick, isCollapsed = false }: SideNavProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate("/login");
    onNavItemClick?.();
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";

  return (
    <aside className="w-full h-full bg-base-100 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section: Brand & User Info */}
      <div className={`p-4 flex flex-col gap-4 ${isCollapsed ? "items-center" : ""}`}>
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={onNavItemClick}
          className={`flex items-center gap-2.5 group transition-all overflow-hidden ${
            isCollapsed ? "justify-center p-1" : "px-1"
          }`}
          title={isCollapsed ? "TicketStream Member Portal" : undefined}
        >
          <div className="w-9 h-9 bg-primary text-primary-content rounded-xl flex items-center justify-center font-black shadow-sm tracking-tighter shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <span className="text-sm font-black tracking-tight uppercase text-base-content leading-none">
                  TicketStream
                </span>
                <span className="text-[9px] font-bold tracking-widest text-primary uppercase mt-0.5">
                  Member Portal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* User Quick Profile Card */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-base-200/60 border border-base-200 p-3 rounded-2xl flex items-center gap-3 overflow-hidden w-full"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.firstName?.charAt(0) || "U").toUpperCase()
                )}
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-xs font-bold text-base-content truncate" title={fullName}>
                  {fullName}
                </span>
                <span className="text-[10px] text-primary font-semibold truncate inline-flex items-center gap-1">
                  <BadgeCheck size={10} /> Member
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center Section: Scrollable Navigation Links */}
      <div className={`flex-1 px-3 py-2 overflow-y-auto flex flex-col gap-5 custom-scrollbar ${isCollapsed ? "items-center" : ""}`}>
        {navigationLinks.map((group) => (
          <div key={group.title} className={`flex flex-col gap-1 w-full ${isCollapsed ? "items-center" : ""}`}>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 px-3 mb-1 truncate"
                >
                  {group.title}
                </motion.span>
              )}
            </AnimatePresence>

            {group.items.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                onClick={onNavItemClick}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isCollapsed ? "justify-center w-10 h-10 px-0" : "px-3 w-full"
                  } ${
                    isActive
                      ? "bg-primary text-primary-content shadow-sm font-bold"
                      : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon
                      size={18}
                      className={`transition-transform group-hover:scale-110 shrink-0 ${
                        isActive ? "text-primary-content" : "text-primary"
                      }`}
                    />
                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="truncate"
                        >
                          {link.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active dot on the right edge of the pill */}
                    {isActive && !isCollapsed && (
                      <motion.span
                        layoutId="sidenav-active-dot"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-content/80 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Section: Logout */}
      <div className={`p-3 border-t border-base-200 ${isCollapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`w-full btn btn-sm btn-ghost gap-2 text-xs font-semibold text-error hover:bg-error/10 rounded-xl transition-all ${
            isCollapsed ? "justify-center p-0 w-10 h-10" : "justify-start px-3"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
};

export default SideNav;