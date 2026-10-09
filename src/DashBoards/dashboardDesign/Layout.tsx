import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SideNav from "./Sidenav";

const SIDEBAR_STORAGE_KEY = "user_sidebar_collapsed";

// Fixed navbar height. Keep this synchronized with your actual Navbar height.
const NAVBAR_HEIGHT = "5rem";

const sidebarSpring = { duration: 0.3, type: "spring" as const, stiffness: 300, damping: 30 };

export const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // DESKTOP SIDEBAR COLLAPSE
  // ---------------------------------------------------------------------------
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
    } catch {
      // Ignore localStorage errors.
    }
  }, [isCollapsed]);

  // ---------------------------------------------------------------------------
  // CLOSE MOBILE SIDEBAR WHEN SCREEN BECOMES DESKTOP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen w-full bg-base-100 text-base-content">
      {/* ===================================================================== */}
      {/* MOBILE HAMBURGER                                                     */}
      {/* ===================================================================== */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ top: `calc(${NAVBAR_HEIGHT} + 0.75rem)` }}
          className="lg:hidden fixed left-4 z-[60] p-2.5 bg-primary text-primary-content rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Open Sidebar"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ===================================================================== */}
      {/* DESKTOP SIDEBAR                                                       */}
      {/* ===================================================================== */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "80px" : "272px" }}
        transition={sidebarSpring}
        style={{ top: NAVBAR_HEIGHT, height: `calc(100dvh - ${NAVBAR_HEIGHT})` }}
        className="hidden lg:block fixed left-0 z-30 bg-base-100 border-r border-base-200 shadow-xl overflow-visible"
      >
        <div className="h-full flex flex-col relative min-h-0">
          {/* Collapse button */}
          <button
            onClick={() => setIsCollapsed((previous) => !previous)}
            className="absolute -right-3.5 top-6 z-50 bg-primary text-primary-content p-1.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform hidden lg:flex items-center justify-center border-2 border-base-100"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
          </button>

          {/* Sidebar scrolling happens here only */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <SideNav isCollapsed={isCollapsed} />
          </div>
        </div>
      </motion.aside>

      {/* ===================================================================== */}
      {/* MOBILE SIDEBAR OVERLAY + DRAWER                                      */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay starts BELOW navbar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ top: NAVBAR_HEIGHT }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
            />

            {/* Mobile sidebar also starts BELOW navbar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ top: NAVBAR_HEIGHT, height: `calc(100dvh - ${NAVBAR_HEIGHT})` }}
              className="fixed left-0 z-[80] w-72 bg-base-100 text-base-content border-r border-base-200 shadow-2xl lg:hidden flex flex-col min-h-0"
            >
              {/* Mobile sidebar header */}
              <div className="shrink-0 p-4 flex justify-between items-center border-b border-base-200">
                <span className="font-black italic uppercase tracking-tighter text-primary text-xs">Member Menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-base-200 rounded-xl transition-colors text-base-content/50"
                  aria-label="Close Sidebar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Only sidebar content scrolls; tapping a link closes the drawer */}
              <div className="flex-1 min-h-0 overflow-y-auto pb-8">
                <SideNav isCollapsed={false} onNavItemClick={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* DESKTOP MAIN CONTENT                                                  */}
      {/* ===================================================================== */}
      <motion.main
        initial={false}
        animate={{ marginLeft: isCollapsed ? "80px" : "272px" }}
        transition={sidebarSpring}
        style={{ minHeight: `calc(100dvh - ${NAVBAR_HEIGHT})`, paddingTop: NAVBAR_HEIGHT }}
        className="hidden lg:block bg-base-100 overflow-x-hidden"
      >
        <div className="min-h-[calc(100dvh-5rem)] px-4 md:px-8 xl:px-10 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>

      {/* ===================================================================== */}
      {/* MOBILE MAIN CONTENT                                                   */}
      {/* ===================================================================== */}
      <main className="lg:hidden min-h-screen bg-base-100 overflow-x-hidden" style={{ paddingTop: NAVBAR_HEIGHT }}>
        <div className="w-full px-4 pb-32">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserLayout;