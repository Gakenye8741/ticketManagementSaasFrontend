import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Ticket as TicketIcon, 
  MapPin, 
  Calendar, 
  AlertCircle,
  DollarSign,
  Download,
  ShieldCheck,
  Zap,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award
} from "lucide-react";
import { eventApi } from "../../features/APIS/EventsApi";
import { venueApi } from "../../features/APIS/VenueApi";
import { ticketApi } from "../../features/APIS/ticketsType.Api";
import { bookingApi } from "../../features/APIS/BookingsApi";
import PuffLoader from "react-spinners/PuffLoader";

interface TicketBreakdown {
  ticketTypeName: string;
  quantity: number;
  revenue: number;
}

interface EventReport {
  eventId: number;
  eventName: string;
  venueName: string;
  ticketBreakdown: TicketBreakdown[];
  totalTickets: number;
  totalRevenue: number;
  hasBookings: boolean;
}

const SalesReport: React.FC = () => {
  const { data: events, isLoading: loadingEvents } = eventApi.useGetAllEventsQuery({});
  const { data: venues } = venueApi.useGetAllVenuesQuery({});
  const [triggerBookings] = bookingApi.useLazyGetBookingsByEventIdQuery();
  const [triggerTicketTypes] = ticketApi.useLazyGetTicketTypesByEventIdQuery();

  const [reportData, setReportData] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("All Venues");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchReport = async () => {
      if (!events || !venues) return;
      setLoading(true);
      try {
        const eventReports = await Promise.all(
          events.map(async (ev: any) => {
            try {
              const venue = venues.find((v: any) => v.venueId === ev.venueId);
              const [bookings, ticketTypes] = await Promise.all([
                triggerBookings(ev.eventId).unwrap(),
                triggerTicketTypes(ev.eventId).unwrap(),
              ]);

              const confirmed = (bookings as any[]).filter((b: any) => b.bookingStatus === "Confirmed");
              const currentEventName = ev?.title || ev?.name || `Event #${ev.eventId}`;

              if (confirmed.length === 0) {
                return {
                  eventId: ev.eventId,
                  eventName: currentEventName,
                  venueName: venue?.name || "Standard Venue",
                  ticketBreakdown: [],
                  totalTickets: 0,
                  totalRevenue: 0,
                  hasBookings: false,
                };
              }

              const breakdown: TicketBreakdown[] = (ticketTypes as any[]).map((tt: any) => {
                const matching = confirmed.filter((b: any) => b.ticketTypeId === tt.ticketTypeId);
                const quantity = matching.reduce((s: number, b: any) => s + b.quantity, 0);
                const revenue = quantity * parseFloat(tt.price);
                return { ticketTypeName: tt.name, quantity, revenue };
              });

              return {
                eventId: ev.eventId,
                eventName: currentEventName,
                venueName: venue?.name || "Standard Venue",
                ticketBreakdown: breakdown,
                totalTickets: breakdown.reduce((s, d) => s + d.quantity, 0),
                totalRevenue: breakdown.reduce((s, d) => s + d.revenue, 0),
                hasBookings: true,
              };
            } catch (err) {
              return null;
            }
          })
        );
        setReportData(eventReports.filter((r) => r !== null) as EventReport[]);
      } catch (error) {
        console.error("Report Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [events, venues, triggerBookings, triggerTicketTypes]);

  // Filtering Logic
  const filteredData = useMemo(() => {
    return reportData.filter((event) => {
      const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVenue = selectedVenue === "All Venues" || event.venueName === selectedVenue;
      return matchesSearch && matchesVenue;
    });
  }, [reportData, searchTerm, selectedVenue]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const grandTotalTickets = filteredData.reduce((s, e) => s + e.totalTickets, 0);
  const grandTotalRevenue = filteredData.reduce((s, e) => s + e.totalRevenue, 0);

  const exportEventPDF = (event: EventReport) => {
    const doc = new jsPDF();
    const now = new Date();
    const timestamp = now.toLocaleString();
    const dateOnly = now.toLocaleDateString('en-GB');
    const docHash = `TS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("TICKETSTREAM", 14, 22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL SALES RECONCILIATION & AUDIT", 14, 30);
    doc.setFontSize(8);
    doc.text(`REPORT ID: ${docHash}`, 160, 20);
    doc.text(`GENERATED: ${timestamp}`, 160, 25);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(event.eventName.toUpperCase(), 14, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Authorized Venue: ${event.venueName}`, 14, 67);
    doc.text(`Event Reference: #EVT-${event.eventId.toString().padStart(4, '0')}`, 14, 72);

    autoTable(doc, {
      startY: 80,
      head: [["Financial Category", "Audited Figures"]],
      body: [
        ["Total Ticket Inventory Distributed", event.totalTickets.toLocaleString()],
        ["Gross Realized Revenue", `KSh ${event.totalRevenue.toLocaleString()}`],
        ["Revenue Per Unit (Avg)", `KSh ${(event.totalRevenue / (event.totalTickets || 1)).toFixed(2)}`],
        ["Audit Status", "SUCCESSFULLY RECONCILED"]
      ],
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
      styles: { cellPadding: 5, fontSize: 10 },
      theme: 'grid'
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Category Label", "Units Sold", "Category Yield (KSh)"]],
      body: event.ticketBreakdown.map((t) => [
        t.ticketTypeName,
        t.quantity.toLocaleString(),
        t.revenue.toLocaleString(),
      ]),
      headStyles: { fillColor: [15, 23, 42] },
      foot: [["NET TOTALS", event.totalTickets.toString(), `KSh ${event.totalRevenue.toLocaleString()}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 35;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.7);
    doc.circle(170, finalY, 20, 'S');
    doc.setLineWidth(0.2);
    doc.circle(170, finalY, 17, 'S');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text("VERIFIED", 160, finalY + 1);
    doc.text(dateOnly, 162, finalY + 7);

    doc.save(`${event.eventName.replace(/\s+/g, '_')}_Official_Audit.pdf`);
  };

  if (loading || loadingEvents) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4">
        <PuffLoader color="#3B82F6" size={80} />
        <p className="font-black uppercase text-[10px] tracking-[0.3em] opacity-40">Reconciling Ledger Tapes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-6 md:pt-10 pb-32 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-base-200 to-base-100 p-6 md:p-8 rounded-[2rem] border border-base-content/5 shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl text-primary-content shadow-lg">
              <TrendingUp size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">
                Sales <span className="text-primary">Insight</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 mt-1">Enterprise Audit Terminal</p>
            </div>
          </div>
          <div className="w-full md:w-auto bg-base-300/50 px-6 py-4 rounded-2xl border border-base-content/5 backdrop-blur-xl">
            <p className="text-[8px] font-black uppercase opacity-40 mb-1 flex items-center gap-1"><Zap size={10}/> Portfolio Yield</p>
            <p className="text-xl md:text-3xl font-black text-success tracking-tight">KSh {grandTotalRevenue.toLocaleString()}</p>
          </div>
        </motion.header>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary transition-all" size={18} />
            <input 
              type="text" 
              placeholder="Filter by event name..." 
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="w-full bg-base-200/50 border border-base-content/5 focus:border-primary/50 focus:bg-base-200 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <select 
              value={selectedVenue}
              onChange={(e) => {setSelectedVenue(e.target.value); setCurrentPage(1);}}
              className="w-full bg-base-200/50 border border-base-content/5 focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="All Venues">All Venues</option>
              {Array.from(new Set(reportData.map(e => e.venueName))).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Summary Graph */}
        {filteredData.length > 0 && (
          <motion.section 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-base-200/40 p-4 md:p-8 rounded-[2rem] border border-base-content/5"
          >
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentItems}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                  <XAxis dataKey="eventName" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(val) => `KSh ${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                    contentStyle={{ borderRadius: '1.2rem', fontSize: '12px', border: 'none', fontWeight: 'bold', backgroundColor: 'var(--b1)', color: 'var(--bc)' }} 
                  />
                  <Bar dataKey="totalRevenue" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        {/* Reports List */}
        <div className="grid grid-cols-1 gap-8">
          <AnimatePresence mode="popLayout">
            {currentItems.length > 0 ? (
              currentItems.map((ev) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={ev.eventId}
                  className="bg-base-200/30 backdrop-blur-md border border-base-content/5 rounded-[2rem] overflow-hidden shadow-sm"
                >
                  <div className="p-6 md:p-8 border-b border-base-content/5 bg-base-300/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-base-100 rounded-2xl flex items-center justify-center text-primary border border-base-content/5 shadow-sm">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{ev.eventName}</h3>
                        <p className="flex items-center gap-2 opacity-50 font-bold text-[10px] uppercase tracking-widest mt-0.5"><MapPin size={12} className="text-primary"/> {ev.venueName}</p>
                      </div>
                    </div>
                    <button onClick={() => exportEventPDF(ev)} className="btn btn-primary w-full md:w-auto rounded-xl font-black uppercase text-[10px] tracking-wider group shadow-md">
                      <Download size={16} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Export Audit
                    </button>
                  </div>

                  <div className="p-6 md:p-8">
                    {ev.hasBookings ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-base-100 p-5 rounded-2xl border border-base-content/5 shadow-sm">
                              <p className="text-[9px] font-black uppercase opacity-40 mb-2">Sold Volume</p>
                              <div className="flex items-center gap-3">
                                 <TicketIcon size={18} className="text-blue-500" />
                                 <p className="text-2xl font-black">{ev.totalTickets.toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="bg-base-100 p-5 rounded-2xl border border-base-content/5 shadow-sm">
                              <p className="text-[9px] font-black uppercase opacity-40 mb-2">Event Yield</p>
                              <div className="flex items-center gap-3">
                                 <DollarSign size={18} className="text-emerald-500" />
                                 <p className="text-2xl font-black text-success">KSh {ev.totalRevenue.toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="bg-base-100 p-5 rounded-2xl border border-base-content/5 shadow-sm">
                              <p className="text-[9px] font-black uppercase opacity-40 mb-2">Security</p>
                              <div className="flex items-center gap-3">
                                 <ShieldCheck size={18} className="text-purple-500" />
                                 <p className="text-base font-black uppercase opacity-70">Audited</p>
                              </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-base-content/5 bg-base-100 shadow-sm">
                          <table className="table w-full">
                            <thead className="bg-base-200/50">
                              <tr className="border-base-300">
                                <th className="text-[10px] font-black uppercase py-4 pl-6">Tier Name</th>
                                <th className="text-[10px] font-black uppercase py-4">Sold Units</th>
                                <th className="text-[10px] font-black uppercase py-4 pr-6 text-right">Category Yield</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ev.ticketBreakdown.map((t, i) => {
                                const isVip = t.ticketTypeName.toLowerCase().includes("vip");
                                const isVvvip = t.ticketTypeName.toLowerCase().includes("vvip") || t.ticketTypeName.toLowerCase().includes("platinum");
                                
                                return (
                                  <tr key={i} className="border-base-300/50 hover:bg-base-200/30">
                                    <td className="pl-6 py-4 align-middle">
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm ${
                                        isVvvip 
                                          ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-primary/20 text-amber-500 border-amber-500/35' 
                                          : isVip 
                                          ? 'bg-primary/15 text-primary border-primary/30' 
                                          : 'bg-base-200 text-base-content/70 border-base-300'
                                      }`}>
                                        {isVvvip ? <Sparkles size={12} className="text-amber-500 shrink-0" /> : isVip ? <Award size={12} className="text-primary shrink-0" /> : null}
                                        <span>{t.ticketTypeName}</span>
                                      </span>
                                    </td>
                                    <td className="font-bold align-middle">{t.quantity.toLocaleString()}</td>
                                    <td className="font-black text-success pr-6 text-right align-middle">KSh {t.revenue.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12 opacity-40 text-center">
                        <AlertCircle size={40} className="mb-3 text-warning" />
                        <p className="font-black uppercase text-xs tracking-wider">No sales ingestion recorded for this event</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center bg-base-200/20 rounded-[2rem] border border-dashed border-base-content/10">
                <Search size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-black uppercase text-xs tracking-wider opacity-40">No matching event audit records found</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="btn btn-outline btn-sm rounded-xl px-3 disabled:opacity-20"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-black text-xs uppercase tracking-wider opacity-60">
              Page {currentPage} <span className="opacity-30">/</span> {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="btn btn-outline btn-sm rounded-xl px-3 disabled:opacity-20"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Global Footer Summary Card */}
        <motion.footer className="bg-slate-950 text-white p-6 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
           <div>
              <p className="text-[9px] font-black uppercase text-primary tracking-[0.4em] mb-1">Audit Ledger Summary</p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Global Totals</h2>
           </div>
           <div className="flex gap-8 md:gap-16 items-center">
              <div className="text-center md:text-right">
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">Total Sold</p>
                <p className="text-2xl md:text-3xl font-black">{grandTotalTickets.toLocaleString()}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">Total Yield</p>
                <p className="text-2xl md:text-3xl font-black text-success tracking-tight">KSh {grandTotalRevenue.toLocaleString()}</p>
              </div>
           </div>
        </motion.footer>

      </div>
    </div>
  );
};

export default SalesReport;