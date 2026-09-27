import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  RotateCcw, 
  Cpu, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt
} from 'lucide-react';
import PuffLoader from 'react-spinners/PuffLoader';

import { paymentApi } from '../../features/APIS/PaymentApi';
import { eventApi } from '../../features/APIS/EventsApi';
import type { RootState } from '../../App/store';
import type { Payment, Event as EventType } from './types';

const GetPaymentsByNationalId: React.FC = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);

  // 📥 Fetch Payments & Events
  const { data: payments, isLoading: isPaymentsLoading, isError, error } = 
    paymentApi.useGetPaymentsByNationalIdQuery(nationalId!, { skip: !nationalId });

  const { data: allEvents, isLoading: isEventsLoading } = eventApi.useGetAllEventsQuery({});

  const [searchEvent, setSearchEvent] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const isLoading = isPaymentsLoading || isEventsLoading;

  // 🧠 Create Event Name Lookup Map
  const eventMap = useMemo(() => {
    if (!allEvents) return {};
    return allEvents.reduce((acc: Record<number, string>, event: EventType & { eventId: number }) => {
      acc[event.eventId] = event.title;
      return acc;
    }, {});
  }, [allEvents]);

  // 📊 Analytics Calculations (Today, Week, Month, Year)
  const stats = useMemo(() => {
    if (!payments) return { today: 0, week: 0, month: 0, year: 0 };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const curr = new Date();
    const first = curr.getDate() - curr.getDay();
    const startOfWeek = new Date(curr.setDate(first)).setHours(0,0,0,0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return payments.reduce((acc: { today: number; week: number; month: number; year: number }, p: Payment) => {
      const pDate = new Date(p.paymentDate).getTime();
      const pAmount = parseFloat(String(p.amount) || '0');

      if (p.paymentStatus === 'Completed' || p.paymentStatus === 'PAID') {
        if (pDate >= startOfToday) acc.today += pAmount;
        if (pDate >= startOfWeek) acc.week += pAmount;
        if (pDate >= startOfMonth) acc.month += pAmount;
        if (pDate >= startOfYear) acc.year += pAmount;
      }
      return acc;
    }, { today: 0, week: 0, month: 0, year: 0 });
  }, [payments]);

  // 🔍 Filter & Search Payments
  const filteredPayments = payments
    ?.filter((p: Payment) => {
      const eventName = eventMap[p.booking?.eventId ?? p.eventId] || `Event #${p.booking?.eventId ?? p.eventId}`;
      const matchesEvent = eventName.toLowerCase().includes(searchEvent.toLowerCase());
      
      const matchesDate = searchDate
        ? new Date(p.paymentDate).toISOString().slice(0, 10) === searchDate
        : true;

      const matchesStatus = 
        statusFilter === 'All' ? true :
        statusFilter === 'Completed' ? (p.paymentStatus === 'Completed' || p.paymentStatus === 'PAID') :
        statusFilter === 'Pending' ? p.paymentStatus === 'Pending' : true;

      return matchesEvent && matchesDate && matchesStatus;
    })
    .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const totalPages = Math.ceil((filteredPayments?.length || 0) / itemsPerPage);
  const paginatedPayments = filteredPayments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Generate pagination page numbers dynamically with ellipsis for robustness
  const paginationRange = useMemo(() => {
    const totalPageNumbers = 7;
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + 1 + i);
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return [];
  }, [totalPages, currentPage]);

  const clearFilters = () => {
    setSearchDate('');
    setSearchEvent('');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 gap-6">
        <PuffLoader size={80} color="oklch(var(--p))" />
        <p className="text-sm font-bold animate-pulse">Loading your payment ledger...</p>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-screen text-center py-20 bg-base-100 px-6"
      >
        <ShieldAlert size={64} className="opacity-10 mb-4" />
        <p className="text-lg font-medium opacity-60">No payment history found.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="p-4 sm:p-6 md:p-10 space-y-8 sm:space-y-12 max-w-7xl mx-auto mt-2 sm:mt-8 bg-base-100 min-h-screen"
    >
      
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-base-content/5 pb-8 sm:pb-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-4 sm:gap-5 text-left w-full lg:w-auto"
        >
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="p-4 sm:p-5 bg-primary/10 rounded-[1.5rem] sm:rounded-[2rem] text-primary shadow-xl shadow-primary/5 flex-shrink-0"
          >
            <Cpu size={32} className="sm:w-9 sm:h-9" />
          </motion.div>
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Payment History</h1>
            <p className="text-sm sm:text-base opacity-60 mt-1">
              This is your payment ledger page. You can view your transactions, search by event name, filter by date or status.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto"
        >
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearFilters} 
            className="btn btn-ghost h-14 sm:h-16 px-6 sm:px-8 rounded-[1.25rem] sm:rounded-[1.5rem] border border-base-content/10 font-bold opacity-60 hover:opacity-100 transition-all w-full sm:w-auto"
          >
            <RotateCcw size={16} className="mr-2" /> Reset Filters
          </motion.button>
        </motion.div>
      </div>

      {/* --- ANALYTICS CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Today', amount: stats.today, color: 'text-primary' },
          { label: 'This Week', amount: stats.week, color: 'text-secondary' },
          { label: 'This Month', amount: stats.month, color: 'text-accent' },
          { label: 'This Year', amount: stats.year, color: 'text-success' },
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="bg-base-200/40 p-5 sm:p-6 rounded-[2rem] border border-base-content/5 backdrop-blur-sm text-center shadow-sm"
          >
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">{item.label}</p>
            <p className={`text-xl sm:text-2xl font-black ${item.color}`}>
              {item.amount.toLocaleString()} <span className="text-xs font-mono opacity-70">KSH</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* --- SEARCH & FILTER PANEL --- */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-base-200/40 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-base-content/5 backdrop-blur-sm"
      >
        <div className="relative group">
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-primary opacity-40 transition-all group-focus-within:opacity-100" size={20} />
          <input
            type="text"
            placeholder="Search by event name..."
            value={searchEvent}
            onChange={(e) => {
              setSearchEvent(e.target.value);
              setCurrentPage(1);
            }}
            className="input input-bordered h-14 sm:h-16 w-full pl-12 sm:pl-14 rounded-xl sm:rounded-2xl bg-base-100/50 border-base-content/10 focus:ring-1 focus:ring-primary transition-all text-sm sm:text-base"
          />
        </div>
        
        <div className="relative group">
          <Calendar className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-primary opacity-40 transition-all group-focus-within:opacity-100" size={20} />
          <input
            type="date"
            value={searchDate}
            onChange={(e) => {
              setSearchDate(e.target.value);
              setCurrentPage(1);
            }}
            className="input input-bordered h-14 sm:h-16 w-full pl-12 sm:pl-14 rounded-xl sm:rounded-2xl bg-base-100/50 border-base-content/10 focus:ring-1 focus:ring-primary transition-all text-sm sm:text-base"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-bordered h-14 sm:h-16 w-full px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-base-100/50 border-base-content/10 focus:ring-1 focus:ring-primary font-bold uppercase text-xs transition-all"
          >
            <option value="All">Filter: All Statuses</option>
            <option value="Completed">Status: Paid / Completed</option>
            <option value="Pending">Status: Pending</option>
          </select>
        </div>
      </motion.div>

      {isError && (
        <div className="alert alert-error shadow-lg rounded-2xl">
          <span className="font-mono text-xs uppercase italic">Error: {(error as { data?: { error?: string } })?.data?.error || 'Sync Interrupted'}</span>
        </div>
      )}

      {/* --- PAYMENTS TABLE --- */}
      <div className="bg-base-200/40 border border-base-content/5 rounded-[2.5rem] overflow-hidden shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-base-content/5 text-[11px] font-mono uppercase opacity-50">
                <th className="py-5 px-6">Transaction / ID</th>
                <th className="py-5 px-6">Event Name</th>
                <th className="py-5 px-6">Method</th>
                <th className="py-5 px-6">Timestamp</th>
                <th className="py-5 px-6">Status</th>
                <th className="py-5 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedPayments?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center bg-base-200/20">
                      <Receipt size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm opacity-60">No payment records match your search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments?.map((payment: Payment) => {
                    const eventTitle = eventMap[payment.booking?.eventId ?? payment.eventId] || `Event #${payment.booking?.eventId ?? payment.eventId}`;
                    const isSuccess = payment.paymentStatus === 'Completed' || payment.paymentStatus === 'PAID';
                    const isFailed = payment.paymentStatus === 'FAILED';

                    return (
                      <motion.tr
                        key={payment.paymentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b border-base-content/5 hover:bg-base-200/60 transition-colors group"
                      >
                        <td className="py-5 px-6 font-mono text-xs opacity-60 uppercase tracking-widest">
                          #{payment.transactionId?.slice(-8) || '00000000'}
                        </td>
                        <td className="py-5 px-6 font-bold uppercase tracking-tight text-base-content max-w-xs truncate">
                          {eventTitle}
                        </td>
                        <td className="py-5 px-6 text-xs uppercase font-bold tracking-wider opacity-80">
                          {payment.paymentMethod || 'SYSTEM'}
                        </td>
                        <td className="py-5 px-6 font-mono text-xs opacity-70 whitespace-nowrap">
                          {new Date(payment.paymentDate).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-5 px-6 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter inline-flex items-center gap-1 ${
                            isSuccess ? 'bg-success/10 text-success border border-success/20' :
                            isFailed ? 'bg-error/10 text-error border border-error/20' :
                            'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            {isSuccess && <CheckCircle2 size={12} />}
                            {isFailed && <XCircle size={12} />}
                            {!isSuccess && !isFailed && <Clock size={12} />}
                            {payment.paymentStatus}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right font-mono text-base font-black text-primary">
                          KSH {Number(payment.amount).toLocaleString()}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PAGINATION & ITEMS PER PAGE SELECTOR --- */}
      {filteredPayments && filteredPayments.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-base-content/5 px-2"
        >
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs opacity-60 font-bold whitespace-nowrap">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPayments.length)} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold opacity-60 uppercase">Per page:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="select select-bordered select-xs rounded-lg font-bold text-xs bg-base-200"
              >
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={15}>15</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
               <motion.button 
                 whileTap={{ scale: 0.85 }}
                 onClick={() => {
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                   setCurrentPage(p => Math.max(1, p - 1));
                 }} 
                 disabled={currentPage === 1} 
                 className="btn btn-outline btn-sm rounded-xl px-2.5"
                 title="Previous Page"
               >
                 <ChevronLeft size={16}/>
               </motion.button>

               {paginationRange.map((pageNumber, idx) => {
                 if (pageNumber === '...') {
                   return (
                     <span key={`dots-${idx}`} className="px-2 text-xs font-bold opacity-40 select-none">
                       ...
                     </span>
                   );
                 }

                 return (
                   <motion.button
                     whileTap={{ scale: 0.9 }}
                     key={`page-${pageNumber}`}
                     onClick={() => {
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                       setCurrentPage(Number(pageNumber));
                     }}
                     className={`btn btn-sm rounded-xl min-h-0 h-8 w-8 px-0 font-bold text-xs transition-all ${
                       currentPage === pageNumber 
                         ? 'btn-primary shadow-sm' 
                         : 'btn-ghost hover:bg-base-200 border border-base-content/10'
                     }`}
                   >
                     {pageNumber}
                   </motion.button>
                 );
               })}

               <motion.button 
                 whileTap={{ scale: 0.85 }}
                 onClick={() => {
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                   setCurrentPage(p => Math.min(totalPages, p + 1));
                 }} 
                 disabled={currentPage === totalPages} 
                 className="btn btn-outline btn-sm rounded-xl px-2.5"
                 title="Next Page"
               >
                 <ChevronRight size={16}/>
               </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default GetPaymentsByNationalId;