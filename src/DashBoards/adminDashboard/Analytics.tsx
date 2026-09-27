import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { FaUsers, FaTicketAlt, FaHeadset, FaBookmark, FaDownload, FaSyncAlt, FaFilePdf } from 'react-icons/fa';
import { GiPartyPopper } from 'react-icons/gi';
import { MdLocationCity, MdPayments, MdAttachMoney } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { PuffLoader } from 'react-spinners';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import your custom APIs
import { userApi } from '../../features/APIS/UserApi';
import { eventApi } from '../../features/APIS/EventsApi';
import { paymentApi } from '../../features/APIS/PaymentApi';
import { qrTicketApi } from '../../features/APIS/QrcodeTicketApi';
import { supportTicketApi } from '../../features/APIS/supportTicketsApi';
import { venueApi } from '../../features/APIS/VenueApi';
import { bookingApi } from '../../features/APIS/BookingsApi';
import type { RootState } from '../../App/store';

interface EventData {
  date: string;
  venue?: { name: string; city?: string; county?: string };
  category?: string;
  attendance?: number;
  createdAt?: string;
  price?: number;
  status?: string;
  capacity?: number;
}

const cardVariants = {
  hover: { y: -5, transition: { duration: 0.3 } },
  tap: { scale: 0.98 },
};

const COMPANY_NAME = 'TicketStream Events';

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6699', '#33CCFF', '#9933FF'];

const getFilteredItems = (items: any[], timeRange: string) => {
  if (timeRange === 'all') return items;
  const now = new Date();
  const daysLimit = timeRange === 'today' ? 1 : timeRange === '7days' ? 7 : 30;

  const threshold = new Date(now);
  threshold.setDate(now.getDate() - daysLimit);

  return items.filter((item) => {
    const rawDate = item.createdAt || item.date || item.updatedAt;
    if (!rawDate) return true;
    return new Date(rawDate) >= threshold;
  });
};

const getDailyCounts = (items: { createdAt?: string; date?: string; updatedAt?: string }[], days = 7) => {
  const counts: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    counts[dayKey] = 0;
  }
  items.forEach((item) => {
    const rawDate = item.createdAt || item.date || item.updatedAt;
    if (rawDate) {
      const dayKey = rawDate.slice(0, 10);
      if (dayKey in counts) counts[dayKey]++;
    }
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

export const Analytics = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [selectedModalData, setSelectedModalData] = useState<{ title: string; items: any[] } | null>(null);

  // Queries with RTK Query Polling (Every 30s)
  const { data: rawUsers = [], isLoading: usersLoading, refetch: refetchUsers } = userApi.useGetAllUsersProfilesQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });
  const { data: rawEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = eventApi.useGetAllEventsQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });
  const { data: rawPayments = [], isLoading: paymentsLoading, refetch: refetchPayments } = paymentApi.useGetAllPaymentsQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });

  const nationalIdNum = user?.nationalId ? Number(user.nationalId) : 0;
  const { data: walletData, isLoading: ticketsLoading } = qrTicketApi.useGetMobileWalletQuery(nationalIdNum, { skip: !isAuthenticated || !nationalIdNum });
  const rawTickets = walletData?.passes || [];

  const { data: rawVenues = [], isLoading: venuesLoading } = venueApi.useGetAllVenuesQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });
  const { data: rawBookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = bookingApi.useGetAllBookingsQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });
  const { data: rawSupport = [], isLoading: supportLoading, refetch: refetchSupport } = supportTicketApi.useGetAllSupportTicketsQuery(undefined, { skip: !isAuthenticated, pollingInterval: 30000 });

  // Apply Time Range Filtering
  const users = useMemo(() => getFilteredItems(rawUsers, timeRange), [rawUsers, timeRange]);
  const events = useMemo(() => getFilteredItems(rawEvents, timeRange), [rawEvents, timeRange]);
  const payments = useMemo(() => getFilteredItems(rawPayments, timeRange), [rawPayments, timeRange]);
  const qrTickets = useMemo(() => getFilteredItems(rawTickets, timeRange), [rawTickets, timeRange]);
  const venues = useMemo(() => getFilteredItems(rawVenues, timeRange), [rawVenues, timeRange]);
  const bookings = useMemo(() => getFilteredItems(rawBookings, timeRange), [rawBookings, timeRange]);
  const supportTickets = useMemo(() => getFilteredItems(rawSupport, timeRange), [rawSupport, timeRange]);

  const usersCount = users.length;
  const eventsCount = events.length;
  const venuesCount = venues.length;
  const bookingsCount = bookings.length;
  const totalPaymentsCount = payments.length;
  const totalTicketsCount = qrTickets.length;
  const openSupportCount = supportTickets.filter((t: any) => t.status?.toLowerCase() === 'open' || t.status?.toLowerCase() === 'pending').length;
  const resolvedSupportCount = supportTickets.length - openSupportCount;

  const totalRevenue = useMemo(() => {
    return payments.reduce((acc: number, p: any) => acc + (Number(p.amount) || Number(p.price) || 0), 0);
  }, [payments]);

  const handleRefreshAll = () => {
    refetchUsers();
    refetchEvents();
    refetchPayments();
    refetchBookings();
    refetchSupport();
  };

  // --- PDF EXPORT (replaces CSV export) ---
 const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generatedOn = new Date();

    // --- Branded Header (Dark Navy Theme) ---
    doc.setFillColor(1, 24, 39); // Dark navy header band
    doc.rect(0, 0, pageWidth, 90, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Ticket Stream Tickets and Events', 40, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Admin System Analytics & Telemetry Report', 40, 60);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${generatedOn.toLocaleDateString()} ${generatedOn.toLocaleTimeString()}  |  Range: ${timeRange.toUpperCase()}  |  Admin Digital ID: ${nationalIdNum || 'N/A'}`,
      40,
      78
    );

    // --- Executive Summary Table ---
    const summaryData = [
      ['Total Users', usersCount.toLocaleString()],
      ['Live Events', eventsCount.toLocaleString()],
      ['Total Bookings', bookingsCount.toLocaleString()],
      ['Total Revenue (KES)', totalRevenue.toLocaleString()],
      ['Venues Registered', venuesCount.toLocaleString()],
      ['Issued Tickets', totalTicketsCount.toLocaleString()],
      ['Successful Payments', totalPaymentsCount.toLocaleString()],
      ['Open Support Tickets', openSupportCount.toLocaleString()],
      ['Resolved Support Tickets', resolvedSupportCount.toLocaleString()],
    ];

    autoTable(doc, {
      startY: 110,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [1, 24, 39], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    });

    // --- Breakdown Tables (Categories, Venues, Payments, Statuses) ---
    const afterSummaryY = (doc as any).lastAutoTable.finalY + 20;

    const breakdownSections: { title: string; rows: [string, number][] }[] = [
      { title: 'Top Event Categories', rows: popularEventTypes.map((d) => [d.name, d.value]) },
      { title: 'Top Booking Venues', rows: topVenues.map((d) => [d.name, d.value]) },
      { title: 'Payment Methods', rows: paymentMethodData.map((d) => [d.name, d.value]) },
      { title: 'Booking Status Breakdown', rows: bookingStatusData.map((d) => [d.name, d.value]) },
      { title: 'QR Ticket States', rows: ticketStatusData.map((d) => [d.name, d.value]) },
    ];

    let currentY = afterSummaryY;
    breakdownSections.forEach((section) => {
      if (section.rows.length === 0) return;

      if (currentY > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        currentY = 40;
      }

      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(section.title, 40, currentY);

      autoTable(doc, {
        startY: currentY + 10,
        head: [['Name', 'Count']],
        body: section.rows.map(([name, value]) => [name, String(value)]),
        theme: 'grid',
        headStyles: { fillColor: [1, 24, 39], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: 40, right: 40 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;
    });

    // --- Detailed System Bookings Table ---
    if (currentY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      currentY = 40;
    }

    doc.setTextColor(33, 37, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Stream Tickets - System-Wide Bookings List', 40, currentY);

    const bookingTableRows = bookings.map((b: any) => [
      b.bookingId || b.id || 'N/A',
      b.eventId || 'N/A',
      `KES ${b.totalAmount || b.amount || 0}`,
      b.bookingStatus || b.status || 'N/A',
      b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A',
    ]);

    autoTable(doc, {
      startY: currentY + 10,
      head: [['Booking ID', 'Event ID', 'Amount', 'Status', 'Date']],
      body: bookingTableRows.length > 0 ? bookingTableRows : [['No Bookings Found', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [1, 24, 39], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });

    // --- Page Footers ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Ticket Stream — Confidential Admin Analytics Report',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 80,
        doc.internal.pageSize.getHeight() - 20
      );
    }

    doc.save(`ticket_stream_admin_analytics_report_${generatedOn.toISOString().slice(0, 10)}.pdf`);
  };

  // --- NEW ADDITIONAL METRICS & BAR GRAPH DISTRIBUTIONS FROM API DATA ---

  // 1. User Roles / Account Types Distribution
  const userRolesFrequency: Record<string, number> = {};
  users.forEach((u: any) => {
    const role = u.role || u.userType || u.accountType || 'Standard User';
    userRolesFrequency[role] = (userRolesFrequency[role] || 0) + 1;
  });
  const userRolesData = Object.entries(userRolesFrequency).map(([name, value]) => ({ name, value }));

  // 2. Booking Status Distribution (Confirmed, Pending, Cancelled)
  const bookingStatusFrequency: Record<string, number> = {};
  bookings.forEach((b: any) => {
    const status = b.status || b.bookingStatus || 'Confirmed';
    bookingStatusFrequency[status] = (bookingStatusFrequency[status] || 0) + 1;
  });
  const bookingStatusData = Object.entries(bookingStatusFrequency).map(([name, value]) => ({ name, value }));

  // 3. Payment Methods Distribution (M-Pesa, Card, Bank, Cash, etc.)
  const paymentMethodFrequency: Record<string, number> = {};
  payments.forEach((p: any) => {
    const method = p.paymentMethod || p.gateway || p.provider || 'M-Pesa';
    paymentMethodFrequency[method] = (paymentMethodFrequency[method] || 0) + 1;
  });
  const paymentMethodData = Object.entries(paymentMethodFrequency).map(([name, value]) => ({ name, value }));

  // 4. Ticket Status Distribution (Valid, Used, Expired, Revoked)
  const ticketStatusFrequency: Record<string, number> = {};
  qrTickets.forEach((t: any) => {
    const status = t.status || t.ticketStatus || 'Active';
    ticketStatusFrequency[status] = (ticketStatusFrequency[status] || 0) + 1;
  });
  const ticketStatusData = Object.entries(ticketStatusFrequency).map(([name, value]) => ({ name, value }));

  // 5. Venue Capacities or Locations Distribution
  const venueLocationFrequency: Record<string, number> = {};
  venues.forEach((v: any) => {
    const location = v.city || v.location || v.county || 'Nyahururu';
    venueLocationFrequency[location] = (venueLocationFrequency[location] || 0) + 1;
  });
  const venueLocationData = Object.entries(venueLocationFrequency).map(([name, value]) => ({ name, value }));

  // Existing maps
  const venueBookingFrequency: Record<string, number> = {};
  events.forEach((event: EventData) => {
    const venueName = event.venue?.name || 'Unknown Venue';
    venueBookingFrequency[venueName] = (venueBookingFrequency[venueName] || 0) + 1;
  });
  const topVenues = Object.entries(venueBookingFrequency)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const eventTypeFrequency: Record<string, number> = {};
  events.forEach((event: EventData) => {
    const type = event.category || 'General';
    eventTypeFrequency[type] = (eventTypeFrequency[type] || 0) + 1;
  });
  const popularEventTypes = Object.entries(eventTypeFrequency)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const userDailyData = getDailyCounts(users, 7);
  const revenueDailyData = getDailyCounts(payments, 7);
  const bookingDailyData = getDailyCounts(bookings, 7);
  const ticketDailyData = getDailyCounts(qrTickets, 7);

  const pieData = [
    { name: 'Users', value: usersCount },
    { name: 'Events', value: eventsCount },
    { name: 'Venues', value: venuesCount },
    { name: 'Bookings', value: bookingsCount },
    { name: 'Tickets', value: totalTicketsCount },
    { name: 'Support', value: supportTickets.length },
  ];

  const radarData = [
    { subject: 'Users', A: Math.min(usersCount * 5, 100), fullMark: 100 },
    { subject: 'Events', A: Math.min(eventsCount * 10, 100), fullMark: 100 },
    { subject: 'Venues', A: Math.min(venuesCount * 10, 100), fullMark: 100 },
    { subject: 'Bookings', A: Math.min(bookingsCount * 4, 100), fullMark: 100 },
    { subject: 'Revenue', A: Math.min(Math.round(totalRevenue / 10000), 100), fullMark: 100 },
    { subject: 'Support', A: supportTickets.length ? Math.round((resolvedSupportCount / supportTickets.length) * 100) : 100, fullMark: 100 },
  ];

  const supportStatusData = [
    { name: 'Resolved', value: resolvedSupportCount },
    { name: 'Open / Pending', value: openSupportCount },
  ];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good Morning, Admin ${user?.firstName || 'Gakenye'}!`;
    if (hour < 18) return `Good Afternoon, Admin ${user?.firstName || 'Gakenye'}!`;
    return `Good Evening, Admin ${user?.firstName || 'Gakenye'}!`;
  })();

  return (
    <div className="min-h-screen bg-base-100 font-sans p-4 md:p-6 lg:p-0 pt-0 md:pt-0">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* --- Header Section with Filters & Actions --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-base-200/50 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-base-content/5 shadow-xl relative overflow-hidden">
          <div className="z-10">
            <h1 className="text-2xl md:text-4xl font-black text-base-content italic uppercase tracking-tighter">
              {greeting}
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 mt-2">{COMPANY_NAME} — Comprehensive System Analytics & Live Telemetry</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            {/* Timeframe Filter Buttons */}
            <div className="bg-base-100/60 p-1.5 rounded-2xl border border-base-content/5 flex items-center gap-1 shadow-inner">
              {(['today', '7days', '30days', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    timeRange === range ? 'bg-primary text-primary-content shadow-md' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshAll}
              className="h-11 w-11 bg-base-100 rounded-2xl flex items-center justify-center border border-base-content/5 shadow-sm hover:rotate-180 transition-transform duration-500"
              title="Refresh Telemetry Data"
            >
              <FaSyncAlt className="text-primary" size={16} />
            </button>

            {/* PDF Export Button (replaces CSV export) */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-content rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-95 transition-opacity"
            >
              <FaFilePdf size={14} /> Export PDF Report
            </button>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-[80px] rounded-full" />
        </div>

        {/* --- Summary Cards Grid (Interactive Drill-Down) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <FaUsers size={24} />, label: 'Total Users', count: usersCount, loading: usersLoading, color: "text-blue-500", items: users },
            { icon: <GiPartyPopper size={24} />, label: 'Live Events', count: eventsCount, loading: eventsLoading, color: "text-purple-500", items: events },
            { icon: <FaBookmark size={24} />, label: 'Total Bookings', count: bookingsCount, loading: bookingsLoading, color: "text-emerald-500", items: bookings },
            { icon: <MdAttachMoney size={24} />, label: 'Total Revenue', count: `KES ${totalRevenue.toLocaleString()}`, loading: paymentsLoading, color: "text-success", items: payments },
            { icon: <MdLocationCity size={24} />, label: 'Venues Registered', count: venuesCount, loading: venuesLoading, color: "text-amber-500", items: venues },
            { icon: <FaTicketAlt size={24} />, label: 'Issued Tickets', count: totalTicketsCount, loading: ticketsLoading, color: "text-cyan-500", items: qrTickets },
            { icon: <MdPayments size={24} />, label: 'Successful Pays', count: totalPaymentsCount, loading: paymentsLoading, color: "text-primary", items: payments },
            { icon: <FaHeadset size={24} />, label: 'Open Support', count: openSupportCount, loading: supportLoading, color: "text-error", items: supportTickets.filter((t: any) => t.status?.toLowerCase() === 'open' || t.status?.toLowerCase() === 'pending') },
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setSelectedModalData({ title: card.label, items: card.items })}
              className="bg-base-200/40 backdrop-blur-md p-6 rounded-[2rem] border border-base-content/5 shadow-lg flex items-center gap-5 group hover:bg-base-100 transition-colors cursor-pointer"
            >
              {card.loading ? (
                <div className="w-full flex justify-center py-4"><PuffLoader color="hsl(var(--p))" size={26} /></div>
              ) : (
                <>
                  <div className={`h-12 w-12 rounded-2xl bg-base-100 flex items-center justify-center shadow-inner border border-base-content/5 shrink-0 ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content truncate">{card.label}</h2>
                    <p className="text-xl md:text-2xl font-black italic tracking-tighter text-base-content truncate">{card.count}</p>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* --- Main Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Asset Distribution Pie Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Platform Asset Shares</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Proportion of users, events, venues, bookings, and tickets.</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={60} paddingAngle={5} stroke="none">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)', color: 'var(--bc)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Metric Performance Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Overall Health Index</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Multi-dimensional rating of core system modules.</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid strokeOpacity={0.2} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 'bold', fill: 'currentColor' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Score" dataKey="A" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth Line Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Daily New Users (Last 7 Days)</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Track daily user acquisition velocity.</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userDailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Line type="monotone" dataKey="value" stroke="#FF8042" strokeWidth={4} dot={{ r: 6, fill: '#FF8042' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Booking Velocity Line Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Daily Bookings (Last 7 Days)</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Monitor recent user booking activity trend.</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingDailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={4} dot={{ r: 6, fill: '#8884d8' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ticket Generation Line Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Daily Tickets Issued (Last 7 Days)</h2>
            <p className="text-xs opacity-60 font-medium mb-6">See how many entry passes are generated daily.</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ticketDailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Line type="monotone" dataKey="value" stroke="#33CCFF" strokeWidth={4} dot={{ r: 6, fill: '#33CCFF' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Area Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Daily Transactions (Last 7 Days)</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Volume of payments logged over the past week.</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueDailyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Area type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Popular Categories Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Top Event Categories</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Most common event types hosted on the platform.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularEventTypes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#00C49F" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Support Ticket Status Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Support Ticket Breakdown</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Comparison of resolved versus pending support requests.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supportStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#FF6699" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* --- NEW ADDED BAR GRAPHS FROM API DATA --- */}

          {/* 1. User Roles Distribution Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">User Roles Distribution</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Breakdown of user account types across the system.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userRolesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#33CCFF" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Booking Status Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Booking Status Breakdown</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Tracking confirmed, pending, or cancelled bookings.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#82ca9d" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Payment Methods Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Payment Gateways / Methods</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Distribution of transaction methods utilized.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#FFBB28" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Ticket Status Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">QR Ticket States</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Status of issued entry passes (Active, Used, Expired).</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#9933FF" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* High Performance Venues Bar Chart */}
          <div className="bg-base-200/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-base-content/5 shadow-xl lg:col-span-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-base-content mb-2">Top Booking Venues</h2>
            <p className="text-xs opacity-60 font-medium mb-6">Locations hosting the highest number of scheduled events.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVenues}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: 'var(--b1)' }} />
                <Bar dataKey="value" fill="#8884d8" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Global Telemetry Footer Summary --- */}
        <div className="bg-primary/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-primary/10 shadow-2xl text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-primary">Total System Payments Logged</h2>
            {paymentsLoading ? (
              <div className="flex justify-center mt-4"><PuffLoader color="hsl(var(--p))" size={40} /></div>
            ) : (
              <p className="text-5xl md:text-6xl font-black italic tracking-tighter text-base-content mt-2">
                {totalPaymentsCount.toLocaleString()} <span className="text-xl opacity-60 font-sans">Processed Transactions</span>
              </p>
            )}
          </div>
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-primary/20 blur-[100px] rounded-full" />
        </div>
      </div>

      {/* --- Drill-Down Inspection Modal --- */}
      {selectedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-base-100 w-full max-w-3xl max-h-[80vh] rounded-[2.5rem] shadow-2xl border border-base-content/10 flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-base-content/10 flex items-center justify-between bg-base-200/50">
              <h3 className="text-lg font-black uppercase tracking-tight italic">
                {selectedModalData.title} <span className="text-primary font-sans">({selectedModalData.items.length})</span>
              </h3>
              <button
                onClick={() => setSelectedModalData(null)}
                className="h-9 w-9 rounded-xl bg-base-300 flex items-center justify-center font-black text-xs hover:bg-error hover:text-error-content transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {selectedModalData.items.length === 0 ? (
                <p className="text-center py-12 opacity-40 font-bold uppercase tracking-widest text-xs">No records found for this timeframe.</p>
              ) : (
                selectedModalData.items.map((item, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-base-200/50 border border-base-content/5 flex flex-col gap-1 text-xs font-medium">
                    <span className="font-bold opacity-80">ID / Reference: #{item.id || item.userId || item.ticketId || item.bookingId || index + 1}</span>
                    <pre className="text-[11px] font-mono opacity-60 overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};