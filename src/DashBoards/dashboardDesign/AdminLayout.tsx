import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSideNav } from "../dashboardDesign/AdminSidenav";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-base-100 text-base-content relative overflow-hidden">
      
      {/* 1. MOBILE HAMBURGER - Positioned to account for Fixed Top Bar */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-20 left-4 z-[40] p-3 bg-primary text-primary-content rounded-2xl shadow-2xl active:scale-95 transition-transform"
          aria-label="Open Sidebar"
        >
          <Menu size={20} strokeWidth={3} />
        </button>
      )}

      {/* 2. DESKTOP SIDEBAR - Starts below top bar (mt-16) */}
      <aside className="hidden md:block w-72 h-full fixed top-0 left-0 z-30 bg-base-200 border-r border-base-content/5 shadow-xl">
        <div className="h-full pt-20 overflow-y-auto custom-scrollbar">
           <AdminSideNav onNavItemClick={() => {}} />
        </div>
      </aside>

      {/* 3. MOBILE SIDEBAR & OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Dark Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm md:hidden"
            />

            {/* Sliding Mobile Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 z-[80] w-72 h-full bg-base-100 text-base-content border-r border-primary/20 shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-base-content/5">
                <span className="font-black italic uppercase tracking-tighter text-primary">Admin Menu</span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-base-200 rounded-xl transition-colors text-base-content/50"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-32">
                <AdminSideNav onNavItemClick={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA */}
      <main 
        className={`
          flex-1 h-full overflow-y-auto transition-all duration-300
          md:ml-72 bg-base-100
          /* pt-20 clears the Fixed Top Bar */
          /* pb-32 clears the Fixed Bottom Navbar */
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
      </main>
    </div>
  );
};