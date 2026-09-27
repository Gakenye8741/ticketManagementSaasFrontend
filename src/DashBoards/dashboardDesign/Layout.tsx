import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { SideNav } from "./Sidenav";
import { motion, AnimatePresence } from "framer-motion";

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-base-100 text-base-content relative overflow-hidden">
      
      {/* 1. MOBILE TRIGGER (Hamburger) 
          - Positioned top-20 to sit below your fixed Top Bar
      */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-24 left-4 z-[40] p-3 bg-primary text-primary-content rounded-2xl shadow-2xl active:scale-95 transition-transform"
          aria-label="Open Menu"
        >
          <Menu size={20} strokeWidth={3} />
        </button>
      )}

      {/* 2. DESKTOP SIDEBAR 
          - Fixed width (w-72) with a top-padding to clear the Top Bar
      */}
      <aside className="hidden md:block w-72 h-full fixed top-0 left-0 z-30 bg-base-200 border-r border-base-content/5 shadow-xl">
        <div className="h-full pt-20 overflow-y-auto custom-scrollbar">
           <SideNav />
        </div>
      </aside>

      {/* 3. MOBILE SIDEBAR DRAWER (Framer Motion for smooth sliding) */}
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
              className="fixed top-0 left-0 z-[80] w-80 h-full bg-base-100 text-base-content border-r border-primary/20 shadow-2xl md:hidden flex flex-col"
            >
              {/* Header inside drawer */}
              <div className="p-6 flex justify-between items-center border-b border-base-content/5">
                <span className="font-black italic uppercase tracking-tighter text-primary text-lg">Menu</span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-base-200 rounded-xl transition-colors text-base-content/50"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Sidebar Content 
                  - Added pb-32 to ensure items don't get stuck behind bottom nav
              */}
              <div className="flex-1 overflow-y-auto pb-32">
                <SideNav onNavItemClick={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA 
          - ml-72 pushes content past the desktop sidebar
          - pt-28 clears your Fixed Top Bar
          - pb-36 clears your Fixed Bottom Navbar (Safety margin)
      */}
      <main 
        className={`
          flex-1 h-full overflow-y-auto transition-all duration-300
          md:ml-72 bg-base-100
          pt-28 pb-36 px-4 md:px-10
        `}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <Outlet />
        </motion.div>
        
        {/* Background Glow Decoration */}
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10 pointer-events-none" />
      </main>
    </div>
  );
};