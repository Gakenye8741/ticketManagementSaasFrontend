import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AdminSideNav } from "../dashboardDesign/AdminSidenav";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_STORAGE_KEY = "admin_sidebar_collapsed";

// Height of your fixed top navbar. Change this one value if your navbar is taller or shorter.
const NAVBAR_HEIGHT = "5rem";

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state

  // Desktop collapse state loaded from localStorage (defaulting to false)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return savedState ? JSON.parse(savedState) : false;
    } catch {
      return false;
    }
  });

  // Save state to localStorage whenever isCollapsed changes
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
    } catch {
      /* storage unavailable, ignore */
    }
  }, [isCollapsed]);

  return (
    <div className="flex h-screen bg-base-100 text-base-content relative overflow-hidden">
      {/* 1. MOBILE HAMBURGER BUTTON - Appears on small screens */}
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

      {/* 2. DESKTOP COLLAPSIBLE SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "80px" : "272px" }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        style={{ top: NAVBAR_HEIGHT, height: `calc(100vh - ${NAVBAR_HEIGHT})` }}
        className="hidden lg:block fixed left-0 z-30 bg-base-100 border-r border-base-200 shadow-xl overflow-visible"
      >
        <div className="h-full flex flex-col relative">
          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3.5 top-6 z-50 bg-primary text-primary-content p-1.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform hidden lg:flex items-center justify-center border-2 border-base-100"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={3} />
            ) : (
              <ChevronLeft size={14} strokeWidth={3} />
            )}
          </button>

          {/* Sidebar content (receives collapsed state) */}
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AdminSideNav isCollapsed={isCollapsed} onNavItemClick={() => {}} />
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
              style={{ top: NAVBAR_HEIGHT }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
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
                <span className="font-black italic uppercase tracking-tighter text-primary text-xs">
                  Admin Menu
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-base-200 rounded-xl transition-colors text-base-content/50"
                  aria-label="Close Sidebar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-32">
                <AdminSideNav isCollapsed={false} onNavItemClick={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA (shifts with desktop sidebar width) */}
      <motion.main
        initial={false}
        animate={{ marginLeft: isCollapsed ? "80px" : "272px" }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="flex-1 h-full overflow-y-auto transition-colors hidden lg:block bg-base-100 pt-24 pb-32 px-4 md:px-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <Outlet />
        </motion.div>
      </motion.main>

      {/* Mobile main content (no margin shifting needed on small viewports) */}
      <main className="lg:hidden flex-1 h-full overflow-y-auto bg-base-100 pt-24 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;