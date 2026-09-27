import { 
  User, 
  LogOut, 
  CreditCard, 
  Ticket, 
  TicketCheck, 
  Home, 
  ShoppingBag, 
  ChevronRight, 
  LayoutGrid,
  Zap,
  QrCode,
  TrendingUp
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCredentials } from "../../features/Auth/AuthSlice";

// Organized into logical sections matching the AdminSideNav structure
const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Explore", path: "/", icon: <Home size={18} className="text-slate-400" /> },
      { name: "My Analytics", path: "analytics", icon: <TrendingUp size={18} className="text-red-400" /> },
    ]
  },
  {
    label: "My Activity",
    items: [
      { name: "Bookings", path: "MyBookings", icon: <ShoppingBag size={18} className="text-purple-400" /> },
      { name: "Reciepts", path: "MyTickets", icon: <Ticket size={18} className="text-orange-400" /> },
      { name: "QR Wallet", path: "qr-codes", icon: <QrCode size={18} className="text-indigo-400" /> },
    ]
  },
  {
    label: "Finance & Support",
    items: [
      { name: "My Payments", path: "Payments", icon: <CreditCard size={18} className="text-emerald-500" /> },
      { name: "Support", path: "supportTickets", icon: <TicketCheck size={18} className="text-pink-400" /> },
    ]
  },
  {
    label: "Account",
    items: [
      { name: "Profile", path: "me", icon: <User size={18} className="text-blue-400" /> },
    ]
  }
];

export const SideNav = ({ onNavItemClick }: { onNavItemClick?: () => void }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate("/login");
    onNavItemClick?.();
  };

  return (
    <div className="flex flex-col h-full bg-base-200/40 backdrop-blur-xl border-r border-base-content/5 selection:bg-primary selection:text-primary-content">
      
      {/* 1. BRANDING SECTION */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary text-primary-content flex items-center justify-center shadow-lg shadow-primary/25 border border-primary/20 shrink-0">
            <LayoutGrid size={22} strokeWidth={2.5} />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-base font-black uppercase italic tracking-tighter text-base-content truncate leading-none">
              Ticket<span className="text-primary">Stream</span>
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40 mt-1">Member Portal</p>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-base-content/10 to-transparent mt-5"></div>
      </div>

      {/* 2. NAVIGATION SECTIONS */}
      <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto custom-scrollbar">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.35em] opacity-30">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item, index) => {
                const isActive = location.pathname.includes(item.path) && item.path !== "/";
                const isHomeActive = location.pathname === "/" && item.path === "/";
                const active = isActive || isHomeActive;

                return (
                  <NavLink
                    key={index}
                    to={item.path}
                    onClick={onNavItemClick}
                    className={({ isActive: routerIsActive }) => {
                      const isCurrentlyActive = (routerIsActive && item.path !== "/") || (location.pathname === "/" && item.path === "/");
                      return `group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-300 ${
                        isCurrentlyActive 
                        ? "bg-primary text-primary-content shadow-xl shadow-primary/20 scale-[1.02]" 
                        : "hover:bg-base-300/60 text-base-content/70 hover:text-base-content"
                      }`;
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`h-9 w-9 rounded-xl bg-base-100 flex items-center justify-center shadow-inner border border-base-content/5 group-hover:scale-110 transition-transform shrink-0 ${active ? "text-primary bg-base-100" : ""}`}>
                        {item.icon}
                      </span>
                      <span className="font-bold text-xs tracking-wide">{item.name}</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. FOOTER */}
      <div className="p-4 mt-auto border-t border-base-content/5 bg-base-200/30 space-y-3">
        <div className="p-3 bg-base-200/50 rounded-2xl flex items-center justify-between border border-base-content/5 shadow-sm">
           <div>
              <p className="text-[9px] font-black uppercase opacity-40">Membership</p>
              <p className="text-xs font-bold uppercase tracking-wide text-base-content mt-0.5">VIP Access</p>
           </div>
           <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Zap size={14} className="fill-primary/20" />
           </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-error/10 text-error hover:bg-error hover:text-error-content transition-all duration-300 font-black uppercase text-[11px] tracking-widest border border-error/20 shadow-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};