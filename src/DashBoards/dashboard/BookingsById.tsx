// import React, { useState, useEffect, useMemo, useRef } from "react";
// import { useSelector } from "react-redux";
// import Swal from "sweetalert2";
// import PuffLoader from "react-spinners/PuffLoader";
// import { motion, AnimatePresence } from "framer-motion";
// import { 
//   ShieldCheck, 
//   Search, 
//   CreditCard, 
//   Smartphone, 
//   Trash2, 
//   Edit3, 
//   ChevronLeft, 
//   ChevronRight,
//   TrendingUp,
//   CheckCircle,
//   Zap,
//   XCircle,
//   ArrowRight,
//   Calendar,
//   Fingerprint,
//   Sparkles,
//   Award,
//   Tag
// } from "lucide-react";

// /**
//  * -----------------------------------------------------------------------------------------
//  * API HOOKS
//  * -----------------------------------------------------------------------------------------
//  */
// import {
//   useGetBookingsByUserNationalIdQuery,
//   useUpdateBookingMutation,
//   useCancelBookingMutation,
// } from "../../features/APIS/BookingsApi";

// import { eventApi } from "../../features/APIS/EventsApi";
// import { ticketApi } from "../../features/APIS/ticketsType.Api";
// import { paymentApi } from "../../features/APIS/PaymentApi";
// import { mpesaApi } from "../../features/APIS/MpesaApi";

// // Data Types
// interface BookingData {
//   bookingId: number;
//   eventId: number;
//   quantity: number;
//   totalAmount: string;
//   bookingStatus: "Pending" | "Confirmed" | "Cancelled";
//   ticketTypeId: number;
//   createdAt: string;
// }

// interface EventData {
//   eventId: number;
//   title: string;
// }

// interface TicketTypeData {
//   ticketTypeId: number;
//   eventId: number; 
//   name: string;
//   price: number;
// }

// /**
//  * -----------------------------------------------------------------------------------------
//  * ALERT DIALOG STYLES (Opaque background enforced)
//  * -----------------------------------------------------------------------------------------
//  */
// const AlertBox = Swal.mixin({
//   customClass: {
//     popup: "rounded-[2rem] bg-base-100 border border-base-300 shadow-2xl max-w-lg p-6 backdrop-blur-none opacity-100",
//     title: "text-xl font-black text-base-content uppercase tracking-tight pb-3 border-b border-base-300/50 w-full bg-base-100",
//     htmlContainer: "text-base-content/80 font-medium py-4 w-full m-0 backdrop-blur-none bg-base-100",
//     confirmButton: "btn btn-primary px-8 mx-2 rounded-xl font-bold uppercase text-xs h-12 shadow-md",
//     cancelButton: "btn btn-ghost px-8 mx-2 rounded-xl font-bold opacity-70 hover:opacity-100 text-xs h-12",
//     input: "input input-bordered w-full text-center text-lg h-14 rounded-xl bg-base-200 text-base-content",
//   },
//   buttonsStyling: false,
//   background: "var(--b1)", 
//   color: "var(--bc)",    
//   backdrop: "rgba(0, 0, 0, 0.85)",
// });

// const UserBookings: React.FC = () => {
//   const { user } = useSelector((state: any) => state.auth);
//   const [nationalId, setNationalId] = useState<number | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(6);
//   const [activeEventId, setActiveEventId] = useState<number | null>(null);
//   const timerRef = useRef<any>(null);

//   // Fetch data with loading states for mutations/actions
//   const { data: bookings, isLoading: isBookingsLoading, refetch: refetchBookings } = 
//     useGetBookingsByUserNationalIdQuery(nationalId!, { skip: nationalId === null });

//   const { data: events, isLoading: isEventsLoading } = eventApi.useGetAllEventsQuery({});
//   const { data: ticketTypes, isLoading: isTicketTypesLoading } = ticketApi.useGetAllTicketTypesQuery({});
  
//   const { data: allPayments } = paymentApi.useGetPaymentsByNationalIdQuery(nationalId!, {
//     skip: nationalId === null,
//   });

//   const { refetch: refetchPayments } = paymentApi.useGetPaymentsByEventIdQuery(activeEventId!, {
//     skip: activeEventId === null,
//   });

//   const [updateBooking, { isLoading: isUpdating }] = useUpdateBookingMutation();
//   const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
//   const [createCheckoutSession, { isLoading: isStripeLoading }] = paymentApi.useCreateCheckoutSessionMutation();
//   const [stkPush, { isLoading: isMpesaLoading }] = mpesaApi.useInitiateStkPushMutation();

//   const isActionLoading = isUpdating || isCancelling || isStripeLoading || isMpesaLoading;
//   const isInitialLoading = isBookingsLoading || isEventsLoading || isTicketTypesLoading;

//   useEffect(() => {
//     if (user?.nationalId) setNationalId(user.nationalId);
//   }, [user]);

//   // Refresh data every 10 seconds
//   useEffect(() => {
//     const timer = setInterval(() => {
//       if (nationalId) refetchBookings();
//     }, 10000); 

//     return () => clearInterval(timer);
//   }, [nationalId, refetchBookings]);

//   // Automatically update pending bookings if paid
//   useEffect(() => {
//     if (bookings && allPayments) {
//       bookings.forEach(async (booking: BookingData) => {
//         if (booking.bookingStatus === "Pending") {
//           const paidRecord = allPayments.find(
//             (p: any) => 
//               p.bookingId === booking.bookingId && 
//               (p.paymentStatus === "Completed" || p.paymentStatus === "PAID")
//           );

//           if (paidRecord) {
//             await updateBooking({
//               bookingId: booking.bookingId,
//               body: {
//                 bookingStatus: "Confirmed",
//                 quantity: booking.quantity,
//                 totalAmount: booking.totalAmount,
//                 ticketTypeId: booking.ticketTypeId,
//                 eventId: booking.eventId,
//                 nationalId: user.nationalId,
//               }
//             }).unwrap();
//             refetchBookings();
//           }
//         }
//       });
//     }
//   }, [bookings, allPayments, updateBooking, user?.nationalId, refetchBookings]);

//   const clearPollingTimer = () => {
//     if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }
//     setActiveEventId(null);
//   };

//  // Calculate stats showing total bookings count made today, this week, this month, and total bookings
//   const stats = useMemo(() => {
//     const todayDate = new Date();
//     const allList = bookings || [];
//     const countList = (list: BookingData[]) => list.length;

//     return {
//       today: countList(allList.filter(b => new Date(b.createdAt).toDateString() === todayDate.toDateString())),
//       week: countList(allList.filter(b => (todayDate.getTime() - new Date(b.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000)),
//       month: countList(allList.filter(b => new Date(b.createdAt).getMonth() === todayDate.getMonth() && new Date(b.createdAt).getFullYear() === todayDate.getFullYear())),
//       total: countList(allList)
//     };
//   }, [bookings]);

//   // Handle payment process
//   const handlePayment = async (booking: BookingData) => {
//     if (!user?.nationalId) return;

//     const { value: paymentMethod } = await AlertBox.fire({
//       title: "Select Payment Method",
//       html: `
//         <div class="grid grid-cols-1 gap-3.5 pt-2 bg-base-100">
//           <div id="pay-mpesa" class="flex items-center justify-between p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-all shadow-sm">
//             <div class="flex items-center gap-3.5">
//               <div class="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
//                 <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
//               </div>
//               <div class="text-left">
//                 <p class="font-black text-sm tracking-wide text-base-content">M-Pesa Express</p>
//                 <p class="text-[11px] font-bold opacity-60 uppercase tracking-wider">Instant STK Push Prompt</p>
//               </div>
//             </div>
//             <div class="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
//               <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
//             </div>
//           </div>
//           <div id="pay-stripe" class="flex items-center justify-between p-4 rounded-2xl border border-base-300 bg-base-200 hover:bg-base-300/70 cursor-pointer transition-all shadow-sm">
//             <div class="flex items-center gap-3.5">
//               <div class="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
//                 <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
//               </div>
//               <div class="text-left">
//                 <p class="font-black text-sm tracking-wide text-base-content">Credit / Debit Card</p>
//                 <p class="text-[11px] font-bold opacity-60 uppercase tracking-wider">Secure Online Checkout</p>
//               </div>
//             </div>
//             <div class="h-8 w-8 rounded-full bg-base-300 flex items-center justify-center opacity-70">
//               <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
//             </div>
//           </div>
//         </div>
//       `,
//       showConfirmButton: false,
//       showCancelButton: true,
//       didOpen: () => {
//         document.getElementById('pay-mpesa')?.addEventListener('click', () => {
//           (Swal as any).getPopup().setAttribute('chosen-method', 'mpesa');
//           Swal.clickConfirm();
//         });
//         document.getElementById('pay-stripe')?.addEventListener('click', () => {
//           (Swal as any).getPopup().setAttribute('chosen-method', 'stripe');
//           Swal.clickConfirm();
//         });
//       },
//       preConfirm: () => (Swal as any).getPopup().getAttribute('chosen-method') === 'stripe' ? 'stripe' : 'mpesa'
//     });

//     if (!paymentMethod) return;

//     if (paymentMethod === "mpesa") {
//       const { value: phone } = await AlertBox.fire({
//         title: "Enter Phone Number",
//         input: "text",
//         inputValue: user?.phone || "254",
//         confirmButtonText: "Send Request",
//         inputValidator: (val) => (!val || val.length < 10) && "Please enter a valid phone number"
//       });

//       if (!phone) return;

//       AlertBox.fire({
//         title: "Waiting for Payment",
//         html: `
//           <div class="flex flex-col items-center gap-5 py-6 bg-base-100 rounded-3xl border border-base-300 shadow-2xl p-6">
//             <div class="relative flex items-center justify-center">
//               <div class="absolute h-20 w-20 rounded-full bg-emerald-500/20 animate-ping"></div>
//               <div class="relative h-16 w-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
//                 <svg class="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
//               </div>
//             </div>
//             <div class="text-center space-y-1.5">
//               <p class="font-black text-lg text-base-content tracking-tight">Check your phone now</p>
//               <p class="text-xs opacity-60 font-medium px-4">An M-Pesa prompt has been sent to <span class="font-bold text-emerald-600">${phone}</span>. Enter your PIN to approve.</p>
//             </div>
//             <button id="cancel-payment" class="btn btn-outline btn-error btn-sm rounded-xl px-6 py-2.5 mt-1 font-black uppercase text-xs tracking-wider shadow-sm">Cancel Request</button>
//           </div>
//         `,
//         allowOutsideClick: false,
//         showConfirmButton: false,
//         didOpen: () => {
//           stkPush({ phoneNumber: phone, amount: Math.round(Number(booking.totalAmount)), bookingId: booking.bookingId, nationalId: Number(user.nationalId) }).unwrap();
//           setActiveEventId(booking.eventId);
//           document.getElementById('cancel-payment')?.addEventListener('click', () => { clearPollingTimer(); Swal.close(); });
//         },
//       });

//       timerRef.current = setInterval(async () => {
//         const { data: pool } = await refetchPayments();
//         const success = pool?.find((p: any) => p.bookingId === booking.bookingId && (p.paymentStatus === "Completed" || p.paymentStatus === "PAID"));
        
//         if (success) {
//           clearPollingTimer();
//           await updateBooking({ 
//             bookingId: booking.bookingId, 
//             body: { 
//                 bookingStatus: "Confirmed",
//                 quantity: booking.quantity,
//                 totalAmount: booking.totalAmount,
//                 ticketTypeId: booking.ticketTypeId,
//                 eventId: booking.eventId,
//                 nationalId: user.nationalId
//             } 
//           }).unwrap();
//           Swal.close();
//           AlertBox.fire({ title: "Payment Successful!", icon: "success", timer: 2000, showConfirmButton: false });
//           refetchBookings();
//         }
//       }, 3000);

//       setTimeout(() => { 
//         if (timerRef.current) { 
//           clearPollingTimer(); 
//           if (Swal.isVisible()) Swal.close(); 
//         } 
//       }, 120000);
//     } else {
//       try {
//         const session = await createCheckoutSession({ 
//           amount: Math.round(Number(booking.totalAmount) * 100), 
//           nationalId: Number(user.nationalId), 
//           bookingId: booking.bookingId, 
//           currency: "kes", 
//           successUrl: `${window.location.origin}/success`, 
//           cancelUrl: `${window.location.origin}/cancel` 
//         }).unwrap();
//         if (session.url) window.location.href = session.url;
//       } catch { 
//         AlertBox.fire("Error", "Could not start card payment. Try again.", "error"); 
//       }
//     }
//   };

//   // Modify booking
//   const handleModify = async (booking: BookingData) => {
//     const list = (ticketTypes as TicketTypeData[])?.filter(t => t.eventId === booking.eventId) || [];
//     const options = list.map(t => `<option value="${t.ticketTypeId}" ${t.ticketTypeId === booking.ticketTypeId ? 'selected' : ''}>${t.name}</option>`).join("");

//     const { value: formData } = await AlertBox.fire({
//       title: "Edit Booking",
//       html: `
//         <div class="flex flex-col gap-4 text-left pt-2 bg-base-100">
//           <div>
//             <label class="text-xs font-bold uppercase opacity-60 mb-1 block">Ticket Type</label>
//             <select id="edit-tier" class="select select-bordered w-full rounded-xl bg-base-200 font-bold">${options}</select>
//           </div>
//           <div>
//             <label class="text-xs font-bold uppercase opacity-60 mb-1 block">Quantity</label>
//             <input id="edit-qty" type="number" min="1" value="${booking.quantity}" class="input input-bordered w-full rounded-xl bg-base-200 font-bold">
//           </div>
//         </div>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Save",
//       preConfirm: () => ({
//         tier: Number((document.getElementById('edit-tier') as any).value),
//         qty: Number((document.getElementById('edit-qty') as any).value)
//       })
//     });

//     if (formData) {
//       const selectedTier = list.find(t => t.ticketTypeId === formData.tier);
//       await updateBooking({ 
//         bookingId: booking.bookingId, 
//         body: { 
//           bookingStatus: booking.bookingStatus, 
//           quantity: formData.qty, 
//           ticketTypeId: formData.tier, 
//           totalAmount: ((selectedTier?.price || 0) * formData.qty).toFixed(2), 
//           eventId: booking.eventId,
//           nationalId: user.nationalId 
//         } 
//       }).unwrap();
//       AlertBox.fire({ title: "Updated Successfully", icon: "success", timer: 1500, showConfirmButton: false });
//       refetchBookings();
//     }
//   };

//   // Cancel booking
//   const handleCancel = async (bookingId: number) => {
//     const { isConfirmed } = await AlertBox.fire({
//       title: "Cancel Booking?",
//       text: "Are you sure you want to cancel this ticket reservation?",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, Cancel",
//       confirmButtonColor: "#ef4444"
//     });

//     if (isConfirmed) {
//       await cancelBooking(bookingId).unwrap();
//       AlertBox.fire({ title: "Booking Cancelled", icon: "success", timer: 1500, showConfirmButton: false });
//       refetchBookings();
//     }
//   };

//   // Filter bookings based on search input
//   const filteredBookings = useMemo(() => {
//     return (bookings || [])
//       .filter((b: BookingData) => {
//         if (!searchTerm) return true;
//         const ev = events?.find((e: EventData) => e.eventId === b.eventId);
//         return ev?.title.toLowerCase().includes(searchTerm.toLowerCase());
//       })
//       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//   }, [bookings, events, searchTerm]);

//   const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
//   const displayedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   // Generate pagination page numbers dynamically with ellipsis for robustness
//   const paginationRange = useMemo(() => {
//     const totalPageNumbers = 7;
//     if (totalPages <= totalPageNumbers) {
//       return Array.from({ length: totalPages }, (_, i) => i + 1);
//     }

//     const leftSiblingIndex = Math.max(currentPage - 1, 1);
//     const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

//     const shouldShowLeftDots = leftSiblingIndex > 2;
//     const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

//     if (!shouldShowLeftDots && shouldShowRightDots) {
//       const leftItemCount = 3;
//       const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
//       return [...leftRange, '...', totalPages];
//     }

//     if (shouldShowLeftDots && !shouldShowRightDots) {
//       const rightItemCount = 3;
//       const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + 1 + i);
//       return [1, '...', ...rightRange];
//     }

//     if (shouldShowLeftDots && shouldShowRightDots) {
//       const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
//       return [1, '...', ...middleRange, '...', totalPages];
//     }

//     return [];
//   }, [totalPages, currentPage]);

//   return (
//     <motion.div 
//       initial={{ opacity: 0, y: 15 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.4 }}
//       className="min-h-screen bg-base-100 text-base-content p-4 md:p-8 mt-0 max-w-7xl mx-auto space-y-8 relative"
//     >
//       {/* Global Action Loading Overlay */}
//       <AnimatePresence>
//         {isActionLoading && (
//           <motion.div 
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="absolute inset-0 z-50 bg-base-100/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
//           >
//             <div className="p-6 bg-base-100 rounded-3xl border border-base-300 shadow-2xl flex flex-col items-center gap-4">
//               <PuffLoader color="var(--p)" size={45} />
//               <p className="text-xs font-bold uppercase opacity-70 tracking-widest animate-pulse">Processing request...</p>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Top Header & Search */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-300 pb-6">
//         <div>
//            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
//               My <span className="text-primary">Bookings</span>
//            </h1>
//            <p className="text-xs opacity-60 font-medium mt-1">Manage your event reservations and payments</p>
//         </div>
//         <div className="relative w-full md:w-80">
//            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={16} />
//            <input 
//              type="text" 
//              placeholder="Search by event title..." 
//              className="input input-bordered w-full pl-11 rounded-xl text-xs font-medium" 
//              value={searchTerm} 
//              onChange={(e) => {
//                setSearchTerm(e.target.value);
//                setCurrentPage(1);
//              }} 
//            />
//         </div>
//       </div>

//       {/* Summary Stats Cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//          {[
//            { label: "Bookings Today", value: stats.today, icon: <Zap size={16} /> },
//           { label: "Bookings This Week", value: stats.week, icon: <TrendingUp size={16} /> },
//           { label: "Bookings This Month", value: stats.month, icon: <Calendar size={16} /> },
//           { label: "Total Bookings", value: stats.total, icon: <ShieldCheck size={16} /> },
//          ].map((stat, index) => (
//            <div key={index} className="p-5 rounded-2xl bg-base-200/50 border border-base-300 flex flex-col gap-2">
//               <div className="flex items-center justify-between opacity-60">
//                  <span className="text-xs font-bold uppercase">{stat.label}</span>
//                  {stat.icon}
//               </div>
//               <div className="text-2xl font-black">
//                 <span className="text-xs opacity-50 font-normal mr-1"></span>{stat.value.toLocaleString()}
//               </div>
//            </div>
//          ))}
//       </div>

//       {/* Bookings Table Section */}
//       <div className="rounded-2xl bg-base-100 border border-base-300 p-4 md:p-6 shadow-sm">
//         {isInitialLoading ? (
//           <div className="flex flex-col items-center justify-center py-32 gap-4">
//              <PuffLoader color="var(--p)" size={50} />
//              <p className="text-xs font-bold uppercase opacity-60 animate-pulse">Loading Bookings...</p>
//           </div>
//         ) : displayedBookings.length === 0 ? (
//           <div className="text-center py-20 opacity-50 text-sm font-bold uppercase">
//              No bookings found
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//              <table className="table w-full">
//                <thead>
//                  <tr className="text-xs uppercase opacity-50 border-base-300">
//                    <th>ID</th>
//                    <th>Event</th>
//                    <th>Ticket Type</th>
//                    <th className="text-center">Qty</th>
//                    <th className="text-right">Total Price</th>
//                    <th className="text-center">Status</th>
//                    <th className="text-right">Actions</th>
//                  </tr>
//                </thead>
//                <tbody>
//                  {displayedBookings.map((b) => {
//                    const event = events?.find((e: EventData) => e.eventId === b.eventId);
//                    const tier = (ticketTypes as TicketTypeData[])?.find(t => t.ticketTypeId === b.ticketTypeId);
//                    const tierName = tier?.name || "Standard";
                   
//                    const isVip = tierName.toLowerCase().includes("vip");
//                    const isVvvip = tierName.toLowerCase().includes("vvip") || tierName.toLowerCase().includes("platinum") || tierName.toLowerCase().includes("ultra");
//                    const isEarly = tierName.toLowerCase().includes("early") || tierName.toLowerCase().includes("bird");

//                    return (
//                      <tr key={b.bookingId} className="hover:bg-base-200/40 border-base-300/50">
//                        <td className="font-mono text-xs opacity-50">#{b.bookingId}</td>
//                        <td className="font-bold">{event?.title || "Unknown Event"}</td>
//                        <td>
//                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm transition-all duration-300 ${
//                            isVvvip 
//                              ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-primary/20 text-amber-500 border-amber-500/35 shadow-amber-500/10' 
//                              : isVip 
//                              ? 'bg-primary/15 text-primary border-primary/30 shadow-primary/10' 
//                              : isEarly 
//                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' 
//                              : 'bg-base-200 text-base-content/70 border-base-300'
//                          }`}>
//                            {isVvvip ? <Sparkles size={13} className="text-amber-500 animate-pulse" /> : isVip ? <Award size={13} className="text-primary" /> : <Tag size={12} className="opacity-60" />}
//                            <span>{tierName}</span>
//                          </span>
//                        </td>
//                        <td className="text-center font-bold">{b.quantity}</td>
//                        <td className="text-right font-bold">KSH {Number(b.totalAmount).toLocaleString()}</td>
//                        <td className="text-center">
//                          <span className={`badge text-xs font-bold border-none ${
//                            b.bookingStatus === 'Confirmed' ? 'bg-success/15 text-success' : 
//                            b.bookingStatus === 'Cancelled' ? 'bg-error/15 text-error' : 'bg-warning/15 text-warning'
//                          }`}>
//                            {b.bookingStatus}
//                          </span>
//                        </td>
//                        <td className="text-right">
//                          <div className="flex justify-end gap-2">
//                            {b.bookingStatus === 'Pending' ? (
//                              <>
//                                <button onClick={() => handleModify(b)} className="btn btn-ghost btn-square btn-sm text-warning" title="Edit">
//                                  <Edit3 size={16}/>
//                                </button>
//                                <button onClick={() => handleCancel(b.bookingId)} className="btn btn-ghost btn-square btn-sm text-error" title="Cancel">
//                                  <Trash2 size={16}/>
//                                </button>
//                                <button onClick={() => handlePayment(b)} className="btn btn-primary btn-sm px-4 rounded-xl font-bold text-xs">
//                                  Pay Now
//                                </button>
//                              </>
//                            ) : (
//                              <div className="flex items-center gap-1 opacity-50 text-xs font-bold justify-end">
//                                {b.bookingStatus === 'Cancelled' ? <XCircle size={14}/> : <CheckCircle size={14}/>} 
//                                <span>Done</span>
//                              </div>
//                            )}
//                          </div>
//                        </td>
//                      </tr>
//                    );
//                  })}
//                </tbody>
//              </table>
//           </div>
//         )}

//         {/* Enhanced Pagination Controls */}
//         {filteredBookings.length > 0 && (
//            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-base-300">
//               <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
//                 <span className="text-xs opacity-60 font-bold whitespace-nowrap">
//                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
//                 </span>
//                 <div className="flex items-center gap-2">
//                   <span className="text-[11px] font-bold opacity-60 uppercase">Per page:</span>
//                   <select 
//                     value={itemsPerPage} 
//                     onChange={(e) => {
//                       setItemsPerPage(Number(e.target.value));
//                       setCurrentPage(1);
//                     }}
//                     className="select select-bordered select-xs rounded-lg font-bold text-xs bg-base-200"
//                   >
//                     <option value={4}>4</option>
//                     <option value={6}>6</option>
//                     <option value={10}>10</option>
//                     <option value={20}>20</option>
//                   </select>
//                 </div>
//               </div>

//               {totalPages > 1 && (
//                 <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
//                    <button 
//                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
//                      disabled={currentPage === 1} 
//                      className="btn btn-outline btn-sm rounded-xl px-2.5"
//                      title="Previous Page"
//                    >
//                      <ChevronLeft size={16}/>
//                    </button>

//                    {paginationRange.map((pageNumber, idx) => {
//                      if (pageNumber === '...') {
//                        return (
//                          <span key={`dots-${idx}`} className="px-2 text-xs font-bold opacity-40 select-none">
//                            ...
//                          </span>
//                        );
//                      }

//                      return (
//                        <button
//                          key={`page-${pageNumber}`}
//                          onClick={() => setCurrentPage(Number(pageNumber))}
//                          className={`btn btn-sm rounded-xl min-h-0 h-8 w-8 px-0 font-bold text-xs transition-all ${
//                            currentPage === pageNumber 
//                              ? 'btn-primary shadow-sm' 
//                              : 'btn-ghost hover:bg-base-200 border border-base-300/40'
//                          }`}
//                        >
//                          {pageNumber}
//                        </button>
//                      );
//                    })}

//                    <button 
//                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
//                      disabled={currentPage === totalPages} 
//                      className="btn btn-outline btn-sm rounded-xl px-2.5"
//                      title="Next Page"
//                    >
//                      <ChevronRight size={16}/>
//                    </button>
//                 </div>
//               )}
//            </div>
//         )}
//       </div>
//     </motion.div>
//   );
// };

// export default UserBookings;