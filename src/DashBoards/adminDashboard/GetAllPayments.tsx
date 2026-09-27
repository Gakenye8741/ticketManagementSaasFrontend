import React, { useState, useMemo } from 'react';
import { paymentApi } from '../../features/APIS/PaymentApi';
import { bookingApi } from '../../features/APIS/BookingsApi';
import { eventApi } from '../../features/APIS/EventsApi';
import { ticketApi } from '../../features/APIS/ticketsType.Api';
import { PuffLoader } from 'react-spinners';
import { saveAs } from 'file-saver';
import { Download, Filter, Calendar, CreditCard, TrendingUp, Clock, CheckCircle, Search } from 'lucide-react';

// ✅ Define Interfaces for Type Safety
interface Payment {
  paymentId: number;
  bookingId: number;
  transactionId: string;
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
}

interface EnrichedPayment extends Payment {
  eventName: string;
  ticketTypeName: string;
}

const AllPayments: React.FC = () => {
  // 1. Data Fetching
  const { data: payments = [], isLoading: paymentsLoading } = paymentApi.useGetAllPaymentsQuery({});
  const { data: bookings = [] } = bookingApi.useGetAllBookingsQuery();
  const { data: events = [] } = eventApi.useGetAllEventsQuery({});
  const { data: ticketTypes = [] } = ticketApi.useGetAllTicketTypesQuery({});

  // 2. State Management
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState(''); 
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 8;

  // 3. Data Enrichment
  const enriched = useMemo(() => {
    return payments.map((p: Payment) => {
      const b = bookings.find((x: any) => x.bookingId === p.bookingId);
      const ev = events.find((e: any) => b?.eventId === e.eventId);
      const t = ticketTypes.find((t: any) => b?.ticketTypeId === t.ticketTypeId);
      return {
        ...p,
        eventName: ev?.title ?? 'Unknown Event',
        ticketTypeName: t?.name ?? 'Standard',
      };
    });
  }, [payments, bookings, events, ticketTypes]);

  // 4. Filtering & Sorting
  const filtered = useMemo(() => {
    const result = enriched.filter((p: EnrichedPayment) => {
      const pd = new Date(p.paymentDate);
      if (statusFilter && p.paymentStatus !== statusFilter) return false;
      if (eventFilter && p.eventName !== eventFilter) return false;
      if (methodFilter && !p.paymentMethod.toLowerCase().includes(methodFilter.toLowerCase())) return false;
      if (dateFrom && pd < new Date(dateFrom)) return false;
      if (dateTo && pd > new Date(dateTo)) return false;
      return true;
    });

    return result.sort((a: EnrichedPayment, b: EnrichedPayment) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [enriched, statusFilter, eventFilter, methodFilter, dateFrom, dateTo]);

  // 5. Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  // 6. Financial Analytics (Fixed Implicit Any)
  const totalRevenue = filtered.reduce((sum: number, p: EnrichedPayment) => sum + Number(p.amount), 0);
  
  const getRevenueByRange = (startDate: Date) => {
    return filtered
      .filter((p: EnrichedPayment) => new Date(p.paymentDate) >= startDate)
      .reduce((sum: number, p: EnrichedPayment) => sum + Number(p.amount), 0);
  };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 7. CSV Export
  const exportCSV = () => {
    const header = ['Transaction ID', 'Event', 'Ticket', 'Amount (KES)', 'Status', 'Method', 'Date'];
    const rows = filtered.map((p: EnrichedPayment) => [
      p.transactionId, p.eventName, p.ticketTypeName,
      Number(p.amount).toFixed(2), p.paymentStatus, p.paymentMethod,
      new Date(p.paymentDate).toLocaleString()
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Revenue_Report_${new Date().toLocaleDateString()}.csv`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-base-100 text-base-content font-sans pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-base-200/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-base-content">
              👋 HI <span className="text-primary">ADMIN,</span> PAYMENTS
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-1 text-primary">Financial Guard Active</p>
          </div>
          <button onClick={exportCSV} className="btn btn-primary rounded-2xl px-8 font-black uppercase italic tracking-widest w-full md:w-auto">
            <Download size={18} className="mr-2" /> EXPORT REPORT
          </button>
        </div>

        {/* ANALYTICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: totalRevenue, icon: <TrendingUp className="text-primary" /> },
            { label: 'Today', value: getRevenueByRange(startOfDay), icon: <Clock className="text-info" /> },
            { label: 'This Week', value: getRevenueByRange(startOfWeek), icon: <Calendar className="text-warning" /> },
            { label: 'This Month', value: getRevenueByRange(startOfMonth), icon: <CheckCircle className="text-success" /> },
          ].map((card, idx) => (
            <div key={idx} className="bg-base-200/40 backdrop-blur-md p-6 rounded-[2rem] border border-base-content/5 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <span className="p-3 bg-base-content/5 rounded-xl">{card.icon}</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{card.label}</p>
              <h3 className="text-2xl font-black italic text-base-content mt-1">KES {card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          ))}
        </div>

        {/* FILTERS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="relative group">
             <Filter className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
             <select 
               value={statusFilter} 
               onChange={(e) => setStatusFilter(e.target.value)} 
               className="select select-bordered w-full pl-14 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase tracking-widest h-14 outline-none"
             >
                <option value="">ALL STATUSES</option>
                <option value="Completed">COMPLETED</option>
                <option value="Pending">PENDING</option>
                <option value="Failed">FAILED</option>
             </select>
          </div>

          <div className="relative group">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
             <select 
               value={eventFilter} 
               onChange={(e) => setEventFilter(e.target.value)} 
               className="select select-bordered w-full pl-14 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase tracking-widest h-14 outline-none"
             >
                <option value="">ALL EVENTS</option>
                {events.map((ev: any) => (
                  <option key={ev.eventId} value={ev.title}>{ev.title.toUpperCase()}</option>
                ))}
             </select>
          </div>

          <div className="relative group">
            <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input 
              type="text" 
              placeholder="METHOD (E.G. MPESA)" 
              value={methodFilter} 
              onChange={(e) => setMethodFilter(e.target.value)} 
              className="input input-bordered w-full pl-14 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase tracking-widest h-14 outline-none"
            />
          </div>

          <div className="relative group">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input input-bordered w-full pl-14 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase h-14 outline-none" />
          </div>

          <div className="relative group">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input input-bordered w-full pl-14 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase h-14 outline-none" />
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-base-200/40 backdrop-blur-md rounded-[2.5rem] border border-base-content/5 overflow-hidden shadow-2xl">
          {paymentsLoading ? (
            <div className="py-24 flex justify-center"><PuffLoader color="hsl(var(--p))" size={60} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full border-separate border-spacing-y-2 px-4">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest opacity-30 border-none">
                    <th className="pl-8">Transaction Details</th>
                    <th>Event & Ticket</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th className="text-right pr-8">Date</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold">
                  {paginated.map((p: EnrichedPayment) => (
                    <tr key={p.paymentId} className="bg-base-100/40 hover:bg-base-100 transition-all">
                      <td className="pl-8 py-5 rounded-l-3xl">
                        <div className="font-black text-primary uppercase italic"># {p.transactionId}</div>
                        <div className="text-[9px] opacity-40 uppercase">ID: {p.bookingId}</div>
                      </td>
                      <td>
                        <div className="uppercase text-base-content font-black">{p.eventName}</div>
                        <div className="text-[9px] opacity-40 uppercase">{p.ticketTypeName}</div>
                      </td>
                      <td>
                        <div className="text-base-content font-black">KES {Number(p.amount).toFixed(2)}</div>
                      </td>
                      <td>
                        <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${
                          p.paymentStatus === 'Completed' ? 'bg-success/10 text-success border-success/50' : 
                          p.paymentStatus === 'Pending' ? 'bg-warning/10 text-warning border-warning/50' : 
                          'bg-error/10 text-error border-error/50'
                        }`}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="uppercase opacity-60 font-black text-base-content">{p.paymentMethod}</td>
                      <td className="text-right pr-8 rounded-r-3xl">
                        <div className="text-base-content">{new Date(p.paymentDate).toLocaleDateString()}</div>
                        <div className="text-[9px] opacity-30">{new Date(p.paymentDate).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAGINATION */}
              <div className="flex justify-center items-center py-10 gap-6 border-t border-base-content/5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1} 
                  className="btn btn-sm btn-ghost font-black uppercase tracking-widest italic disabled:opacity-20"
                >
                  <ChevronLeft size={16} /> PREV
                </button>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">PAGE {currentPage} / {totalPages || 1}</div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  className="btn btn-sm btn-ghost font-black uppercase tracking-widest italic disabled:opacity-20"
                >
                  NEXT <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChevronLeft = ({ size }: { size: number }) => <span style={{ fontSize: size }}>←</span>;
const ChevronRight = ({ size }: { size: number }) => <span style={{ fontSize: size }}>→</span>;

export default AllPayments;