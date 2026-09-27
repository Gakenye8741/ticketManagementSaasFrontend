import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetMobileWalletQuery } from '../../features/APIS/QrcodeTicketApi';
import QrCodes from '../../components/Qrcodes';
import { eventApi } from '../../features/APIS/EventsApi';
import { PuffLoader } from 'react-spinners';
import { Ticket, Calendar, Clock, Layers, Search, Filter, ShieldAlert, SortAsc, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RootState {
  auth: {
    user: { nationalId: number } | null;
  };
}

const MyWalletPage: React.FC = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);

  const { data: walletData, isLoading, isFetching, error } = useGetMobileWalletQuery(
    nationalId as number, 
    { skip: !nationalId }
  );

  console.log("My tickets :", walletData);

  const { data: allEvents = [] } = eventApi.useGetAllEventsQuery({});

  const passes = walletData?.passes || [];

  // 🔍 Filter, Sort & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedFilter, setScannedFilter] = useState<'All' | 'Scanned' | 'Not Scanned'>('All');
  const [selectedEventId, setSelectedEventId] = useState<string>('All');
  const [sortByLatest, setSortByLatest] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6); // User can choose how many tickets to see

  // 🧠 Filter tickets, calculate analytics, sort, and slice for pagination
  const { paginatedPasses, totalFilteredCount, analytics, groupedTickets } = useMemo(() => {
    if (!passes || passes.length === 0) {
      return { 
        paginatedPasses: [], 
        totalFilteredCount: 0,
        groupedTickets: {},
        analytics: { totalTickets: 0, uniqueEvents: 0, latestDate: 'N/A' }
      };
    }

    let latestTimestamp = 0;

    // 1. Apply Search, Status, and Event Filters
    const filtered = passes.filter((pass: any) => {
      const event = allEvents.find((e: any) => e.eventId === Number(pass.eventId) || e.eventId === pass.eventId);
      const eventName = event ? event.title.toLowerCase() : "event details unavailable";
      
      const matchesSearch = eventName.includes(searchTerm.toLowerCase()) || 
                            (pass.ticketToken && pass.ticketToken.toLowerCase().includes(searchTerm.toLowerCase()));

      const isScanned = pass.isScanned === true || pass.isScanned === 'true' || pass.status?.toLowerCase() === 'scanned';
      const matchesStatus = 
        scannedFilter === 'All' ||
        (scannedFilter === 'Scanned' && isScanned) ||
        (scannedFilter === 'Not Scanned' && !isScanned);

      const passEventIdStr = pass.eventId?.toString();
      const matchesEventDropdown = selectedEventId === 'All' || passEventIdStr === selectedEventId;

      return matchesSearch && matchesStatus && matchesEventDropdown;
    });

    // 2. Sort by latest creation timestamp if enabled
    if (sortByLatest) {
      filtered.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA; 
      });
    }

    // 3. Calculate metrics for analytics
    const uniqueEventIds = new Set(filtered.map((p: any) => p.eventId));

    filtered.forEach((pass: any) => {
      const time = new Date(pass.createdAt || pass.updatedAt || 0).getTime();
      if (time > latestTimestamp) latestTimestamp = time;
    });

    // 4. Slice for Pagination based on user's chosen limit
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    // 5. Group paginated results by event for visual display
    const grouped = paginated.reduce((acc: Record<string, any[]>, pass: any) => {
      const id = pass.eventId || 'unknown';
      if (!acc[id]) acc[id] = [];
      acc[id].push(pass);
      return acc;
    }, {});

    return {
      paginatedPasses: paginated,
      totalFilteredCount: filtered.length,
      groupedTickets: grouped,
      analytics: {
        totalTickets: passes.length, 
        uniqueEvents: uniqueEventIds.size,
        latestDate: latestTimestamp > 0 
          ? new Date(latestTimestamp).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Recent'
      }
    };
  }, [passes, searchTerm, scannedFilter, selectedEventId, sortByLatest, allEvents, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);

  // Reset to page 1 whenever a filter or items-per-page changes
  const handleFilterChange = (setter: Function, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  if (!nationalId) return <div className="text-center p-10 font-medium">Please log in to view your tickets.</div>;
  
  if (isLoading || isFetching) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <PuffLoader color="oklch(var(--p))" />
      <p className="font-medium opacity-60 text-sm">Loading your tickets...</p>
    </div>
  );

  if (error) return <div className="text-error p-10 text-center font-medium">Unable to load your wallet. Please try again later.</div>;

  return (
    <div className="min-h-screen bg-base-100 p-4 sm:p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* 📋 Header Section */}
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-base-content">
              My <span className="text-primary">Wallet</span>
            </h1>
            <p className="text-base-content/60 mt-1 font-medium text-xs sm:text-sm">View, manage, and access your event tickets easily.</p>
          </div>
        </header>

        {/* 💡 Gate Entry Notice Card */}
        <div className="mb-8 bg-primary/10 border border-primary/20 p-4 sm:p-5 rounded-2xl flex items-start gap-3 text-primary">
          <Sparkles className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            <span className="font-bold uppercase tracking-wide">Notice:</span> Please show your <span className="font-bold underline">latest event QR code</span> at the gate for quick entry. Make sure your brightness is turned up when scanning!
          </div>
        </div>

        {passes.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border-2 border-dashed border-base-content/10 rounded-3xl p-4">
            <p className="text-base-content/50 font-medium text-sm">You don't have any tickets yet.</p>
          </div>
        ) : (
          <>
            {/* 📊 Analytics Dashboard */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
              <div className="bg-base-200/50 p-4 sm:p-5 rounded-2xl border border-base-content/5 flex items-center gap-4 shadow-sm backdrop-blur-md">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                  <Ticket size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Total Tickets</p>
                  <p className="text-xl sm:text-2xl font-black text-base-content">{analytics.totalTickets}</p>
                </div>
              </div>

              <div className="bg-base-200/50 p-4 sm:p-5 rounded-2xl border border-base-content/5 flex items-center gap-4 shadow-sm backdrop-blur-md">
                <div className="p-3 bg-secondary/10 rounded-xl text-secondary shrink-0">
                  <Layers size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Events</p>
                  <p className="text-xl sm:text-2xl font-black text-base-content">{analytics.uniqueEvents}</p>
                </div>
              </div>

              <div className="bg-base-200/50 p-4 sm:p-5 rounded-2xl border border-base-content/5 flex items-center gap-4 shadow-sm backdrop-blur-md">
                <div className="p-3 bg-accent/10 rounded-xl text-accent shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Latest Update</p>
                  <p className="text-xl sm:text-2xl font-black text-base-content">{analytics.latestDate}</p>
                </div>
              </div>
            </motion.div>

            {/* 🛠️ Filters Control Panel */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-10 bg-base-200 p-4 sm:p-6 rounded-[1.5rem] border border-base-content/5 shadow-sm"
            >
              {/* Search Field */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity" size={18} />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="input input-bordered h-12 sm:h-14 w-full pl-12 rounded-2xl bg-base-100 border-base-content/10 focus:ring-1 focus:ring-primary font-medium text-xs"
                  value={searchTerm}
                  onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                />
              </div>

              {/* Event Dropdown Filter */}
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50" size={18} />
                <select
                  className="select select-bordered h-12 sm:h-14 w-full pl-12 rounded-2xl bg-base-100 border-base-content/10 focus:ring-1 focus:ring-primary font-black uppercase italic tracking-widest text-[11px]"
                  value={selectedEventId}
                  onChange={(e) => handleFilterChange(setSelectedEventId, e.target.value)}
                >
                  <option value="All" className="bg-base-100">Filter: All Events</option>
                  {allEvents.map((evt: any) => (
                    <option key={evt.eventId} value={evt.eventId?.toString()} className="bg-base-100">
                      Event: {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scanned Status Filter */}
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50" size={18} />
                <select
                  className="select select-bordered h-12 sm:h-14 w-full pl-12 rounded-2xl bg-base-100 border-base-content/10 focus:ring-1 focus:ring-primary font-black uppercase italic tracking-widest text-[11px]"
                  value={scannedFilter}
                  onChange={(e) => handleFilterChange(setScannedFilter, e.target.value as any)}
                >
                  <option value="All" className="bg-base-100">Status: All Statuses</option>
                  <option value="Not Scanned" className="bg-base-100">Status: Not Scanned</option>
                  <option value="Scanned" className="bg-base-100">Status: Scanned / Used</option>
                </select>
              </div>

              {/* Chronological Sort Control Dropdown */}
              <div className="relative group">
                <SortAsc className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50" size={18} />
                <select
                  className="select select-bordered h-12 sm:h-14 w-full pl-12 rounded-2xl bg-base-100 border-base-content/10 focus:ring-1 focus:ring-primary font-black uppercase italic tracking-widest text-[11px]"
                  value={sortByLatest ? 'latest' : 'default'}
                  onChange={(e) => handleFilterChange(setSortByLatest, e.target.value === 'latest')}
                >
                  <option value="latest" className="bg-base-100">Sort: Latest QR Codes</option>
                  <option value="default" className="bg-base-100">Sort: Unsorted Registry</option>
                </select>
              </div>
            </motion.div>

            {/* 📂 Grouped Tickets Render */}
            <AnimatePresence mode="wait">
              {totalFilteredCount === 0 ? (
                <motion.div 
                  key="no-results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-16 border-2 border-dashed border-base-content/10 rounded-[2rem] p-4"
                >
                  <ShieldAlert size={40} className="mx-auto mb-3 opacity-20 text-warning" />
                  <p className="font-mono text-xs sm:text-sm opacity-50 uppercase tracking-wider">No tickets match your search or filter.</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="results-grid"
                  className="space-y-8 sm:space-y-12"
                  layout
                >
                  {Object.entries(groupedTickets).map(([eventId, eventPasses]: [string, any]) => {
                    const event = allEvents.find((e: any) => e.eventId === Number(eventId) || e.eventId === eventId);
                    const eventName = event ? event.title : "Event Details Unavailable";

                    return (
                      <motion.div 
                        key={eventId} 
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="bg-base-200/20 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-base-content/5 shadow-inner"
                      >
                        {/* Event Group Label Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-base-content/5">
                          <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-primary shrink-0" />
                            <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-secondary">
                              {eventName}
                            </h2>
                          </div>
                          <span className="badge badge-primary font-black font-mono text-xs px-2.5 py-0.5 rounded-md">
                            {eventPasses.length} {eventPasses.length === 1 ? 'PASS' : 'PASSES'}
                          </span>
                        </div>

                        {/* Grids containing specific tickets */}
                        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" layout>
                          <AnimatePresence>
                            {eventPasses.map((pass: any) => (
                              <motion.div
                                key={pass.ticketToken}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                              >
                                <QrCodes 
                                  qrPass={{ 
                                    ...pass, 
                                    eventName 
                                  }} 
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 📄 Premium Pagination Bar */}
            {totalFilteredCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-10 pt-6 border-t border-base-content/10 gap-4">
                
                {/* Tickets per page selector */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-primary opacity-60" />
                    <span className="text-xs font-semibold opacity-70">Tickets Per Page:</span>
                  </div>
                  <select
                    className="select select-bordered select-sm font-bold text-xs rounded-xl bg-base-200"
                    value={itemsPerPage}
                    onChange={(e) => handleFilterChange(setItemsPerPage, Number(e.target.value))}
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>

                {/* Page info text */}
                <p className="text-xs font-medium opacity-60 text-center">
                  Page <span className="font-bold text-base-content">{currentPage}</span> of <span className="font-bold text-base-content">{totalPages || 1}</span> ({totalFilteredCount} total)
                </p>

                {/* Next / Prev buttons */}
                <div className="join w-full sm:w-auto justify-center">
                  <button 
                    className="join-item btn btn-sm bg-base-200 border-base-content/10 font-bold flex-1 sm:flex-none"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  
                  <div className="join-item btn btn-sm bg-base-100 border-base-content/10 font-mono pointer-events-none">
                    {currentPage} / {totalPages || 1}
                  </div>

                  <button 
                    className="join-item btn btn-sm bg-base-200 border-base-content/10 font-bold flex-1 sm:flex-none"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyWalletPage;