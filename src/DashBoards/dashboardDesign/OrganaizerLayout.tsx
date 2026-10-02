import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { OrganizerSidebar } from "./OrganizerSidebar";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2,
  Calendar,
  Ticket,
  Images,
  CalendarCheck,
  Wallet,
  QrCode,
  Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// HOW IT WORKS: short steps shown in the guide (paths match the sidebar links)
// ---------------------------------------------------------------------------
const GUIDE_STORAGE_KEY = "organizer_guide_seen";

const guideSteps = [
  {
    icon: Building2,
    title: "Set up your organization",
    text: "Add your name, logo and payout details, and invite your team.",
    path: "/organizer-dashboard/my-organization",
  },
  {
    icon: Calendar,
    title: "Create your event",
    text: "Add the date, venue and description attendees will see.",
    path: "/organizer-dashboard/my-events",
  },
  {
    icon: Ticket,
    title: "Add ticket types",
    text: "Create tiers like Regular or VIP with a price and quantity.",
    path: "/organizer-dashboard/ticket-types",
  },
  {
    icon: Images,
    title: "Add photos and videos",
    text: "Upload event media and choose the main banner.",
    path: "/organizer-dashboard/media",
  },
  {
    icon: CalendarCheck,
    title: "Track bookings",
    text: "See who booked, then confirm or cancel bookings.",
    path: "/organizer-dashboard/bookings",
  },
  {
    icon: Wallet,
    title: "Watch payments",
    text: "View every payment made for your events.",
    path: "/organizer-dashboard/payments",
  },
  {
    icon: QrCode,
    title: "Scan tickets at the gate",
    text: "Your scanners check attendees in with the Gate Pass Scanner.",
    path: "/organizer/scanner",
  },
  {
    icon: Banknote,
    title: "Get paid",
    text: "Check your earnings and payouts to your account.",
    path: "/organizer/payouts",
  },
];

export const OrganizerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  
  // Desktop collapse state loaded from localStorage (defaulting to false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem("organizer_sidebar_collapsed");
    return savedState ? JSON.parse(savedState) : false;
  });

  // "How it works" guide: opens by itself the first time, then only from the help button
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return !localStorage.getItem(GUIDE_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const closeGuide = () => {
    setGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    } catch {
      /* storage unavailable, ignore */
    }
  };

  // Save state to localStorage whenever isCollapsed changes
  useEffect(() => {
    localStorage.setItem("organizer_sidebar_collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Close the guide with the Escape key
  useEffect(() => {
    if (!guideOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeGuide();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  return (
    <div className="flex h-screen bg-base-100 text-base-content relative overflow-hidden">
      
      {/*MOBILE HAMBURGER BUTTON - Appears on small screens*/}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-20 left-4 z-[60] p-2.5 bg-primary text-primary-content rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Open Sidebar"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* 2. DESKTOP COLLAPSIBLE SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "80px" : "272px" }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:block h-full fixed top-0 left-0 z-30 bg-base-100 border-r border-base-200 shadow-xl overflow-visible"
      >
        <div className="h-full flex flex-col relative">
          
          {/* Sleek Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3.5 top-24 z-50 bg-primary text-primary-content p-1.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform hidden lg:flex items-center justify-center border-2 border-base-100"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
          </button>

          {/* Sidebar Content Component (Passing collapsed state) */}
          <div className="h-full overflow-y-auto custom-scrollbar">
             <OrganizerSidebar isCollapsed={isCollapsed} />
          </div>
        </div>
      </motion.aside>

      {/* 3. MOBILE SLIDING DRAWER & OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Dark Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
            />

            {/* Sliding Mobile Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 z-[80] w-72 h-full bg-base-100 text-base-content border-r border-base-200 shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-4 flex justify-between items-center border-b border-base-200">
                <span className="font-black italic uppercase tracking-tighter text-primary text-xs">Organizer Menu</span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-base-200 rounded-xl transition-colors text-base-content/50"
                  aria-label="Close Sidebar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-32">
                <OrganizerSidebar isCollapsed={false} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA (Dynamically shifts based on desktop sidebar width) */}
      <motion.main 
        initial={false}
        animate={{ marginLeft: isCollapsed ? "80px" : "272px" }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className={`
          flex-1 h-full overflow-y-auto transition-colors
          hidden lg:block bg-base-100
          pt-24 pb-32 px-4 md:px-10
        `}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <Outlet />
        </motion.div>
      </motion.main>

      {/* Mobile Main Content View (No margin shifting required for small viewports) */}
      <main className="lg:hidden flex-1 h-full overflow-y-auto bg-base-100 pt-24 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 5. HOW IT WORKS: help button */}
      <button
        onClick={() => setGuideOpen(true)}
        className="fixed bottom-5 right-5 z-[55] btn btn-primary btn-sm rounded-full shadow-lg gap-1.5 text-xs font-bold"
        aria-label="How it works"
      >
        <HelpCircle size={16} />
        <span className="hidden sm:inline">How it works</span>
      </button>

      {/* 6. HOW IT WORKS: guide modal */}
      <AnimatePresence>
        {guideOpen && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeGuide}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              role="dialog"
              aria-label="How the organizer portal works"
            >
              <div className="flex justify-between items-start gap-3 p-4 sm:p-5 border-b border-base-200">
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-black text-sm text-base-content tracking-tight">How it works</h3>
                  <p className="text-[11px] text-base-content/60">
                    From setup to payout, here is the usual order. Tap a step to open that page.
                  </p>
                </div>
                <button onClick={closeGuide} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Close guide">
                  <X size={14} />
                </button>
              </div>

              <ol className="overflow-y-auto p-3 sm:p-4 flex flex-col gap-1.5">
                {guideSteps.map((step, i) => (
                  <li key={step.path}>
                    <Link
                      to={step.path}
                      onClick={closeGuide}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-base-200/70 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <step.icon size={18} />
                        </div>
                        <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary text-primary-content text-[9px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-base-content">{step.title}</span>
                        <span className="text-[11px] text-base-content/60 leading-snug">{step.text}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="flex justify-end p-3 sm:p-4 border-t border-base-200">
                <button onClick={closeGuide} className="btn btn-primary btn-sm rounded-xl text-xs font-bold">
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizerLayout;