import { Navbar } from "../components/Navbar";
import { AdminLayout } from "../DashBoards/dashboardDesign/Layout";
import { Toaster } from "sonner";

export const DAshboard = () => {
  return (
    // h-screen and overflow-hidden ensures the main page doesn't scroll
    // only the content inside AdminLayout will scroll if needed
    <div className="h-screen w-screen bg-base-100 flex flex-col overflow-hidden font-sans">
      {/* Toast notifications for dashboard actions */}
      <Toaster richColors position="top-right" />
      
      {/* Top Navigation */}
      <Navbar />
      
      {/* Main Content Area 
          flex-grow makes the layout take up the remaining space 
          below the navbar.
      */}
      <main className="flex-grow relative overflow-hidden">
        <AdminLayout />
      </main>

      {/* Subtle UI Glow for that high-tech dashboard feel */}
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-primary/5 blur-[120px] rounded-full -z-0 pointer-events-none" />
    </div>
  );
};

export default DAshboard;