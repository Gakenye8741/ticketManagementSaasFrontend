import { NavLink } from "react-router-dom";
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
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { useDispatch } from "react-redux";
import { clearCredentials } from "../../features/Auth/AuthSlice";

// Organized by Operational Flow: Venue -> Event -> Media -> Ticket Types
const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Analytics", path: "analytics", icon: <TrendingUp size={18} className="text-indigo-400" /> },
    ]
  },
  {
    label: "Event Pipeline",
    items: [
      { name: "Manage Venues", path: "Allvenues", icon: <House size={18} className="text-emerald-400" /> },
      { name: "Manage Events", path: "AllEvents", icon: <Calendar size={18} className="text-amber-400" /> },
      { name: "Manage Medias", path: "AllMedia", icon: <Camera size={18} className="text-yellow-400" /> },
      { name: "Ticket Types", path: "ticketTypes", icon: <FileText size={18} className="text-teal-400" /> },
    ]
  },
  {
    label: "Administration",
    items: [
      { name: "Manage Users", path: "AllUsers", icon: <Users size={18} className="text-blue-400" /> },
      { name: "Manage Bookings", path: "AllBookings", icon: <ClipboardList size={18} className="text-pink-400" /> },
      { name: "Manage Payments", path: "AllPayments", icon: <DollarSign size={18} className="text-emerald-500" /> },
      { name: "Support Tickets", path: "supportTickets", icon: <Ticket size={18} className="text-purple-400" /> },
    ]
  },
  {
    label: "Reports & Profile",
    items: [
      { name: "Sales Report", path: "SalesReports", icon: <LayoutDashboard size={18} className="text-red-400" /> },
      { name: "My Profile", path: "adminprofile", icon: <User size={18} className="text-indigo-500" /> },
    ]
  }
];

export const AdminSideNav = ({ onNavItemClick }: { onNavItemClick?: () => void }) => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(clearCredentials());
    onNavItemClick?.();
  };

  return (
    <div className="flex flex-col h-full bg-base-200/40 backdrop-blur-xl border-r border-base-content/5 selection:bg-primary selection:text-primary-content">
      {/* Header / Branding */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary text-primary-content flex items-center justify-center shadow-lg shadow-primary/25 border border-primary/20 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-base font-black uppercase italic tracking-tighter text-base-content truncate leading-none">
              Admin <span className="text-primary">Panel</span>
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40 mt-1">System Flow</p>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-base-content/10 to-transparent mt-5"></div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto custom-scrollbar">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.35em] opacity-30">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.path}
                  onClick={onNavItemClick}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-300 ${
                      isActive 
                      ? "bg-primary text-primary-content shadow-xl shadow-primary/20 scale-[1.02]" 
                      : "hover:bg-base-300/60 text-base-content/70 hover:text-base-content"
                    }`
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <span className="h-9 w-9 rounded-xl bg-base-100 flex items-center justify-center shadow-inner border border-base-content/5 group-hover:scale-110 transition-transform shrink-0">
                      {item.icon}
                    </span>
                    <span className="font-bold text-xs tracking-wide">{item.name}</span>
                  </div>
                  <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 mt-auto border-t border-base-content/5 bg-base-200/30">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-error/10 text-error hover:bg-error hover:text-error-content transition-all duration-300 font-black uppercase text-[11px] tracking-widest border border-error/20 shadow-sm"
        >
          <LogOut size={16} />
          <span>Terminate Session</span>
        </button>
      </div>
    </div>
  );
};