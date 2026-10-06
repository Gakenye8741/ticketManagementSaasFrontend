import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  ClipboardList,
  User,
  LogOut,
  DollarSign,
  Ticket,
  Camera,
  Calendar,
  FileText,
  House,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { clearCredentials } from "../../features/Auth/AuthSlice";
import { type RootState } from "../../App/store";
import { MdOutlineDomainVerification } from "react-icons/md";

interface AdminSideNavProps {
  isCollapsed?: boolean;
  onNavItemClick?: () => void;
}

// Organized by Operational Flow: Venue -> Event -> Media -> Ticket Types
const navSections = [
  {
    title: "Overview",
    items: [{ name: "Analytics", path: "analytics", icon: TrendingUp }],
  },
  {
    title: "Event Pipeline",
    items: [
      { name: "Manage Venues", path: "Allvenues", icon: House },
      { name: "Manage Events", path: "AllEvents", icon: Calendar },
      { name: "Manage Medias", path: "AllMedia", icon: Camera },
      { name: "Ticket Types", path: "ticketTypes", icon: FileText },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Manage Users", path: "users", icon: Users },
      { name: "Manage verification", path: "verification", icon: MdOutlineDomainVerification },
      { name: "Manage Bookings", path: "AllBookings", icon: ClipboardList },
      { name: "Manage Payments", path: "AllPayments", icon: DollarSign },
      { name: "Support Tickets", path: "supportTickets", icon: Ticket },
    ],
  },
  {
    title: "Reports & Profile",
    items: [
      { name: "Sales Report", path: "SalesReports", icon: LayoutDashboard },
      { name: "My Profile", path: "adminprofile", icon: User },
    ],
  },
];

export const AdminSideNav = ({ isCollapsed = false, onNavItemClick }: AdminSideNavProps) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    onNavItemClick?.();
  };

  return (
    <aside className="w-full h-full bg-base-100 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section: Brand & User Info */}
      <div className={`p-4 flex flex-col gap-4 ${isCollapsed ? "items-center" : ""}`}>
        {/* Brand Logo */}
        <div
          className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? "justify-center p-1" : "px-1"}`}
          title={isCollapsed ? "TicketStream Admin Panel" : undefined}
        >
          <div className="w-9 h-9 bg-primary text-primary-content rounded-xl flex items-center justify-center font-black shadow-sm tracking-tighter shrink-0">
            <ShieldCheck className="w-5 h-5" />
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
                  Admin Panel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin Quick Profile Card */}
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
                  user?.firstName?.charAt(0) || "A"
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-base-content truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Admin"}
                </span>
                <span className="text-[10px] text-primary font-semibold truncate">System Admin</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center Section: Scrollable Navigation Links */}
      <div
        className={`flex-1 px-3 py-2 overflow-y-auto flex flex-col gap-5 custom-scrollbar ${
          isCollapsed ? "items-center" : ""
        }`}
      >
        {navSections.map((group) => (
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

            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavItemClick}
                title={isCollapsed ? item.name : undefined}
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
                    <item.icon
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
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
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
          title={isCollapsed ? "Terminate Session" : undefined}
          className={`btn btn-sm btn-ghost gap-2 text-xs font-semibold text-error hover:bg-error/10 rounded-xl transition-all ${
            isCollapsed ? "justify-center p-0 w-10 h-10" : "justify-start px-3 w-full"
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
                Terminate Session
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
};

export default AdminSideNav;