import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  Mail, 
  RotateCcw, 
  Ticket, 
  Cpu, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';
import PuffLoader from 'react-spinners/PuffLoader';

import { bookingApi } from '../../features/APIS/BookingsApi';
import { userApi } from '../../features/APIS/UserApi';
import { emailApi } from '../../features/APIS/SendngEmails';
import { eventApi } from '../../features/APIS/EventsApi';
import { ticketApi } from '../../features/APIS/ticketsType.Api';

import TicketItem from './TicketsItem';
import type { RootState } from '../../App/store';

interface EnrichedBooking {
  bookingId: number;
  eventName: string;
  ticketType: {
    name: string;
    price: string;
  };
  quantity: number;
  paymentStatus: string;
  createdAt: string;
}

const SecurityModal = Swal.mixin({
  customClass: {
    popup: 'rounded-[2rem] bg-base-100 border border-base-content/10 shadow-2xl backdrop-blur-xl p-6 sm:p-8 max-w-lg w-full mx-4',
    title: 'text-xl sm:text-2xl font-bold text-base-content',
    htmlContainer: 'text-sm font-medium opacity-70 py-4',
    confirmButton: 'btn btn-primary px-8 sm:px-10 h-12 sm:h-14 rounded-2xl font-bold tracking-widest shadow-lg shadow-primary/20 mx-2',
    cancelButton: 'btn btn-ghost px-8 sm:px-10 h-12 sm:h-14 rounded-2xl font-bold opacity-50 mx-2',
  },
  buttonsStyling: false,
  background: 'var(--b1)',
  color: 'var(--bc)',
});

const ReceiptsDisplay: React.FC = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);

  const { data: bookings, isLoading: isBookingsLoading } =
    bookingApi.useGetBookingsByUserNationalIdQuery(nationalId!, { skip: !nationalId });

  const { data: user, isLoading: isUserLoading } =
    userApi.useGetUserByNationalIdQuery(nationalId!, { skip: !nationalId });

  const { data: events, isLoading: isEventsLoading } = eventApi.useGetAllEventsQuery({});
  const { data: ticketTypes, isLoading: isTicketTypesLoading } = ticketApi.useGetAllTicketTypesQuery({});

  const [sendTicketEmail, { isLoading: isEmailSending }] = emailApi.useSendTicketEmailMutation();

  const [searchEvent, setSearchEvent] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const isLoading =
    isBookingsLoading || isUserLoading || isEventsLoading || isTicketTypesLoading;

  const enrichedBookings: EnrichedBooking[] | undefined = bookings?.map((booking) => {
    const event = events?.find((e: any) => e.eventId === booking.eventId);
    const ticketType = ticketTypes?.find((t: any) => t.ticketTypeId === booking.ticketTypeId);

    return {
      bookingId: booking.bookingId,
      eventName: event?.title || 'Unknown Event',
      ticketType: {
        name: ticketType?.name || 'Unknown',
        price: ticketType?.price || '0',
      },
      quantity: booking.quantity,
      paymentStatus: booking.bookingStatus || 'Unknown',
      createdAt: booking.createdAt,
    };
  });

  const filteredBookings = enrichedBookings
    ?.filter((booking) => {
      const matchesEvent = booking.eventName
        .toLowerCase()
        .includes(searchEvent.toLowerCase());
      const matchesDate = searchDate
        ? new Date(booking.createdAt).toISOString().slice(0, 10) === searchDate
        : true;
      return matchesEvent && matchesDate;
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const totalPages = Math.ceil((filteredBookings?.length || 0) / itemsPerPage);

  const paginatedBookings = filteredBookings?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Generate pagination page numbers dynamically with ellipsis for robustness
  const paginationRange = React.useMemo(() => {
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

  const handleSendEmail = async () => {
    if (!filteredBookings || !user) return;

    const result = await SecurityModal.fire({
      title: 'Send Receipts',
      text: `Do you want to email your receipt details to ${user.email}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Send',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await sendTicketEmail({ bookings: filteredBookings, user }).unwrap();
        toast.success('Receipts sent to your inbox successfully');
      } catch (error) {
        console.error('Error sending email:', error);
        toast.error('Failed to send email. Please try again.');
      }
    }
  };

  const clearFilters = () => {
    setSearchDate('');
    setSearchEvent('');
    setCurrentPage(1);
    toast.info('Filters cleared');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 gap-6 px-4">
        <PuffLoader size={80} color="oklch(var(--p))" />
        <p className="text-sm font-bold animate-pulse text-center">Loading your receipts...</p>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-screen text-center py-20 bg-base-100 px-6"
      >
        <ShieldAlert size={64} className="opacity-10 mb-4" />
        <p className="text-lg font-medium opacity-60">No receipts found.</p>
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">My Receipts</h1>
            <p className="text-sm sm:text-base opacity-60 mt-1">
              This is your receipt page. You can view, search by event name, filter by date, or email your receipts.
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
            onClick={handleSendEmail}
            disabled={isEmailSending}
            className={`btn btn-primary h-14 sm:h-16 px-6 sm:px-10 rounded-[1.25rem] sm:rounded-[1.5rem] font-bold shadow-xl shadow-primary/20 transition-all w-full sm:w-auto ${isEmailSending ? 'loading' : ''}`}
          >
            <Mail size={18} className="mr-2" />
            {isEmailSending ? 'Sending...' : 'Email Receipts'}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearFilters} 
            className="btn btn-ghost h-14 sm:h-16 px-6 sm:px-8 rounded-[1.25rem] sm:rounded-[1.5rem] border border-base-content/10 font-bold opacity-60 hover:opacity-100 transition-all w-full sm:w-auto"
          >
            <RotateCcw size={16} className="mr-2" /> Reset
          </motion.button>
        </motion.div>
      </div>

      {/* --- SEARCH PANEL --- */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200/40 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-base-content/5 backdrop-blur-sm"
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
      </motion.div>

      {/* --- RECEIPTS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <AnimatePresence mode="popLayout">
          {paginatedBookings?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="col-span-full py-16 sm:py-20 text-center bg-base-200/20 rounded-[2.5rem] sm:rounded-[3rem] border border-dashed border-base-content/5 px-4"
            >
              <Ticket size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm opacity-60">No receipts found for these filters.</p>
            </motion.div>
          ) : (
            paginatedBookings?.map((booking) => (
              <motion.div
                key={booking.bookingId}
                layout="position"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-full flex justify-center"
              >
                <div className="w-full">
                  <TicketItem booking={booking} user={user!} />
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* --- PAGINATION & ITEMS PER PAGE SELECTOR --- */}
      {filteredBookings && filteredBookings.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-base-content/5 px-2"
        >
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs opacity-60 font-bold whitespace-nowrap">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} receipts
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

export default ReceiptsDisplay;