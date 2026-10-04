import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Ticket,
  Images,
  CalendarCheck,
  Wallet,
  Users,
  QrCode,
  BarChart3,
  Banknote,
  UserCog,
  HelpCircle,
  Store,
  TicketCheckIcon,
  Wallet2,
  HouseIcon,
} from "lucide-react";
import { type RootState } from "../../App/store";

interface OrganizerSidebarProps {
  isCollapsed?: boolean;
}

export const OrganizerSidebar = ({ isCollapsed = false }: OrganizerSidebarProps) => {
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  const navigationLinks = [
    {
      title: "Overview",
      items: [
        { path: "/organizer/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/organizer-dashboard/wallet", label: "My Wallet", icon: Wallet2 },
        { path: "/organizer-dashboard/analytics", label: "Analytics & Sales", icon: BarChart3 },
        { path: "/organizer-dashboard/my-organization", label: "My Organization", icon: Building2 },
      ]
    },
    {
      title: "Event Management",
      items: [
        { path: "/organizer-dashboard/my-venues", label: "My venues", icon: HouseIcon },
        { path: "/organizer-dashboard/my-events", label: "My Events", icon: Calendar },
        { path: "/organizer-dashboard/ticket-types", label: "Manage TicketsTypes", icon: Ticket },
        { path: "/organizer-dashboard/media", label: "Manage Event Media", icon: Images },
        { path: "/organizer-dashboard/bookings", label: "Manage Event Bookings", icon: CalendarCheck },
        { path: "/organizer-dashboard/payments", label: "Manage Event Payments", icon: Wallet },
        { path: "/organizer-dashboard/tickets", label: "Manage Event Tickets", icon: TicketCheckIcon },
      ]
    },
 
    {
      title: "Account",
      items: [
        { path: "/organizer-dashboard/profile", label: "Organizer Profile", icon: UserCog },
        { path: "/contact", label: "Support", icon: HelpCircle },
      ]
    }
  ];

  return (
    <aside className="w-full h-full bg-base-100 flex flex-col justify-between shrink-0 select-none">
      
      {/* Top Section: Brand & User Info */}
      <div className={`p-4 flex flex-col gap-4 ${isCollapsed ? "items-center" : ""}`}>
        {/* Brand Logo */}
        <Link 
          to="/" 
          className={`flex items-center gap-2.5 group transition-all overflow-hidden ${
            isCollapsed ? "justify-center p-1" : "px-1"
          }`}
          title={isCollapsed ? "TicketStream Organizer Portal" : undefined}
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
                  Organizer Portal
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Organizer Quick Profile Card */}
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
                  user?.firstName?.charAt(0) || "O"
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-base-content truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Organizer"}
                </span>
                <span className="text-[10px] text-primary font-semibold truncate">
                  Event Host
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center Section: Scrollable Navigation Links */}
      <div className={`flex-1 px-3 py-2 overflow-y-auto flex flex-col gap-5 custom-scrollbar ${isCollapsed ? "items-center" : ""}`}>
        {navigationLinks.map((group, groupIdx) => (
          <div key={groupIdx} className={`flex flex-col gap-1 w-full ${isCollapsed ? "items-center" : ""}`}>
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
            
            {group.items.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  title={isCollapsed ? link.label : undefined}
                  className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isCollapsed ? "justify-center w-10 h-10 px-0" : "px-3 w-full"
                  } ${
                    isActive
                      ? "bg-primary text-primary-content shadow-sm font-bold"
                      : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
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
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Section: Quick Exit / Return to Site */}
      <div className={`p-3 border-t border-base-200 ${isCollapsed ? "flex justify-center" : ""}`}>
        <Link
          to="/"
          title={isCollapsed ? "Exit to Public Site" : undefined}
          className={`w-full btn btn-sm btn-ghost gap-2 text-xs font-semibold text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-xl transition-all ${
            isCollapsed ? "justify-center p-0 w-10 h-10" : "justify-start px-3"
          }`}
        >
          <Store size={18} className="text-primary shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                Exit to Public Site
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

    </aside>
  );
};

export default OrganizerSidebar;