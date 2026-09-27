import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Wallet,
  Activity,
  Ticket,
  TrendingUp,
  Award,
  Clock,
  Download,
  DollarSign,
  BarChart2,
  FileText,
  Sparkles,
  CalendarPlus
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


import { eventApi } from "../../features/APIS/EventsApi";
import { paymentApi } from "../../features/APIS/PaymentApi";
import { qrTicketApi } from "../../features/APIS/QrcodeTicketApi";

export const UserAnalyticsPage: React.FC = () => {
  const { user } = useSelector((state: any) => state.auth);
  const nationalId = user?.nationalId || 0;

  // Local UI State for Interactive Filters & Tabs
  const [timeRange, setTimeRange] = useState<"all" | "30days" | "90days">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "passes">("overview");

  // // RTK Query hooks fetching user-specific data by National ID
  // const { 
  //   data: bookings = [], 
  //   isLoading: isBookingsLoading, 
  //   isError: isBookingsError,
  //   error: bookingsError
  // } = useGetBookingsByUserNationalIdQuery(nationalId, { 
  //   skip: !nationalId 
  // });

  const { data: events = [] } = eventApi.useGetAllEventsQuery({});
  const { data: payments = [], isLoading: isPaymentsLoading } = paymentApi.useGetPaymentsByNationalIdQuery(nationalId, {
    skip: !nationalId,
  });

  const { data: walletResponse, isLoading: isWalletLoading } = qrTicketApi.useGetMobileWalletQuery(nationalId, {
    skip: !nationalId,
  });

  // Helper function to check if the error is essentially a "not found / empty history" response from backend (e.g., 404 or empty array message)
  const isNoDataError = useMemo(() => {
    if (!isBookingsError) return false;
    const errStatus = (bookingsError as any)?.status || (bookingsError as any)?.originalStatus;
    const errData = (bookingsError as any)?.data;
    // Check if status is 404/400 or message indicates empty/no bookings found
    if (errStatus === 404 || errStatus === 400) return true;
    if (typeof errData === 'string' && (errData.toLowerCase().includes('not found') || errData.toLowerCase().includes('no booking'))) return true;
    if (errData?.message && (errData.message.toLowerCase().includes('not found') || errData.message.toLowerCase().includes('no booking'))) return true;
    return false;
  }, [isBookingsError, bookingsError]);

  /**
   * FILTERED BOOKINGS BASED ON TIME RANGE
   */
  const filteredBookings = useMemo(() => {
    if (timeRange === "all") return bookings;
    const now = new Date().getTime();
    const daysLimit = timeRange === "30days" ? 30 : 90;
    const limitTime = now - daysLimit * 24 * 60 * 60 * 1000;

    return bookings.filter((b: any) => {
      const bTime = new Date(b.createdAt || b.date || 0).getTime();
      return bTime >= limitTime;
    });
  }, [bookings, timeRange]);

  /**
   * ADVANCED ANALYTICS METRICS COMPUTATION
   */
 const stats = useMemo(() => {
    const totalBookingsCount = filteredBookings.length;
    
    const totalSpent = filteredBookings.reduce((acc: any, curr: any) => {
      const status = curr.bookingStatus || "";
      if (status.toLowerCase() === "cancelled") {
        return acc;
      }
      const amount = parseFloat(curr.totalAmount || curr.amount || "0");
      return acc + (isNaN(amount) ? 0 : amount);
    }, 0);

    const confirmedBookings = filteredBookings.filter((b: any) => b.bookingStatus === "Confirmed").length;
    const pendingBookings = filteredBookings.filter((b: any) => b.bookingStatus === "Pending").length;
    const cancelledBookings = filteredBookings.filter((b: any) => b.bookingStatus === "Cancelled").length;
    const cancellationRate = totalBookingsCount > 0 ? ((cancelledBookings / totalBookingsCount) * 100).toFixed(1) : "0.0";

    const totalWalletPasses = walletResponse?.count || 0;
    const activePasses = walletResponse?.passes?.filter((p: any) => !p.isScanned).length || 0;
    const scannedPasses = walletResponse?.passes?.filter((p: any) => p.isScanned).length || 0;
    const scanRate = totalWalletPasses > 0 ? ((scannedPasses / totalWalletPasses) * 100).toFixed(1) : "0.0";

    const avgBookingValue = totalBookingsCount > 0 ? (totalSpent / totalBookingsCount).toFixed(2) : "0.00";

    return {
      totalSpent,
      totalBookings: totalBookingsCount,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      cancellationRate,
      totalWalletPasses,
      activePasses,
      scannedPasses,
      scanRate,
      avgBookingValue
    };
  }, [filteredBookings, walletResponse]);

  /**
   * COMPREHENSIVE CHART DATA PREPARATION
   */
  const bookingStatusData = useMemo(() => [
    { name: "Confirmed", value: stats.confirmedBookings, color: "#10B981" },
    { name: "Pending", value: stats.pendingBookings, color: "#F59E0B" },
    { name: "Cancelled", value: stats.cancelledBookings, color: "#EF4444" },
  ].filter(item => item.value > 0), [stats]);

  const walletPassStatusData = useMemo(() => [
    { name: "Active Passes", value: stats.activePasses, color: "#3B82F6" },
    { name: "Scanned Passes", value: stats.scannedPasses, color: "#8B5CF6" },
  ].filter(item => item.value > 0), [stats]);

  const eventAttendanceData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    filteredBookings.forEach((booking: any) => {
      const eventObj = events.find((e: any) => e.eventId === booking.eventId);
      const title = eventObj?.title || `Event #${booking.eventId}`;
      counts[title] = (counts[title] || 0) + (booking.quantity || 1);
    });

    return Object.keys(counts).map(title => ({
      name: title,
      tickets: counts[title]
    }));
  }, [filteredBookings, events]);

  const spendingOverTimeData = useMemo(() => {
    const sortedBookings = [...filteredBookings].sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    let cumulative = 0;
    
    return sortedBookings.map((booking: any) => {
      const amount = parseFloat(booking.totalAmount || booking.amount || "0");
      cumulative += isNaN(amount) ? 0 : amount;
      const dateStr = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown';
      return {
        date: dateStr,
        spent: cumulative,
        currentSpend: amount
      };
    });
  }, [filteredBookings]);

  const paymentStatusData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    payments.forEach((payment: any) => {
      const status = payment.status || payment.paymentStatus || "Completed";
      counts[status] = (counts[status] || 0) + 1;
    });

    const colors = ["#10B981", "#F59E0B", "#EF4444", "#6366F1"];
    return Object.keys(counts).map((status, idx) => ({
      name: status,
      value: counts[status],
      color: colors[idx % colors.length]
    }));
  }, [payments]);

  const bookingsByDayData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0);

    filteredBookings.forEach((booking: any) => {
      if (booking.createdAt) {
        const dayIndex = new Date(booking.createdAt).getDay();
        counts[dayIndex] += 1;
      }
    });

    return days.map((day, index) => ({
      day,
      bookings: counts[index]
    }));
  }, [filteredBookings]);

  const userRadarData = useMemo(() => [
    { subject: "Activity Volume", A: Math.min(stats.totalBookings * 20, 100), fullMark: 100 },
    { subject: "Pass Utilization", A: parseFloat(stats.scanRate), fullMark: 100 },
    { subject: "Reliability (Success)", A: 100 - parseFloat(stats.cancellationRate), fullMark: 100 },
    { subject: "Wallet Adoption", A: Math.min(stats.totalWalletPasses * 25, 100), fullMark: 100 },
    { subject: "Payment Compliance", A: payments.length > 0 ? 100 : 0, fullMark: 100 },
  ], [stats, payments]);

  const spendingVelocityData = useMemo(() => {
    const map: { [key: string]: { date: string; total: number; count: number } } = {};
    filteredBookings.forEach((b: any) => {
      if (b.createdAt) {
        const dateKey = new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!map[dateKey]) {
          map[dateKey] = { date: dateKey, total: 0, count: 0 };
        }
        map[dateKey].total += parseFloat(b.totalAmount || b.amount || "0");
        map[dateKey].count += 1;
      }
    });
    return Object.values(map);
  }, [filteredBookings]);

  // CSV Report Generator Handler
  const handleExportCSV = () => {
    const headers = "BookingID,EventID,TotalAmount,BookingStatus,CreatedAt\n";
    const rows = filteredBookings.map((b: any) => 
      `"${b.bookingId || b.id}","${b.eventId}","${b.totalAmount || b.amount || 0}","${b.bookingStatus}","${b.createdAt}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `user_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Report Generator Handler
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
    doc.text('User Analytics & Insights Report', 40, 60);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${generatedOn.toLocaleDateString()} ${generatedOn.toLocaleTimeString()}  |  Range: ${timeRange.toUpperCase()}  |  Digital ID: ${nationalId || 'N/A'}`,
      40,
      78
    );

    // --- Executive Summary Table ---
    const summaryData = [
      ['Total Spent', `KES ${stats.totalSpent.toLocaleString()}`],
      ['Total Bookings', stats.totalBookings.toString()],
      ['Confirmed Bookings', stats.confirmedBookings.toString()],
      ['Gate Pass Scan Rate', `${stats.scanRate}%`],
      ['Cancellation Rate', `${stats.cancellationRate}%`],
      ['Average Booking Value', `KES ${stats.avgBookingValue}`],
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

    // --- Detailed Bookings List Table ---
    const finalY = (doc as any).lastAutoTable.finalY + 25;

    if (finalY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'bold');
      doc.text('Stream Tickets - Detailed Bookings List', 40, 40);
    } else {
      doc.setFontSize(13);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'bold');
      doc.text('Stream Tickets - Detailed Bookings List', 40, finalY);
    }

    const bookingTableRows = filteredBookings.map((b: any) => [
      b.bookingId || b.id || 'N/A',
      b.eventId || 'N/A',
      `KES ${b.totalAmount || b.amount || 0}`,
      b.bookingStatus || 'N/A',
      b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A',
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 35 > doc.internal.pageSize.getHeight() - 100 ? 55 : (doc as any).lastAutoTable.finalY + 35,
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
        'Ticket Stream — Confidential User Analytics Report',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 80,
        doc.internal.pageSize.getHeight() - 20
      );
    }

    doc.save(`user_analytics_report_${generatedOn.toISOString().slice(0, 10)}.pdf`);
  };

  // Loading state
  if (isBookingsLoading || isPaymentsLoading || isWalletLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle missing National ID scenario
  if (!nationalId) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-20">
        <h2 className="text-xl font-semibold text-base-content">No National ID Found</h2>
        <p className="text-base-content/60 mt-2">Please log in with a valid user profile linked to a National ID to view your analytics.</p>
      </div>
    );
  }

  // Graceful First-Time User / No Data State (triggered if bookings array is empty or backend returns a 404/not-found error for missing history)
  if (bookings.length === 0 || isNoDataError) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-4xl mx-auto p-6 md:p-12 text-center mt-16 space-y-6 bg-base-100 rounded-3xl border border-base-200 shadow-sm"
      >
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Sparkles size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome to Ticket Stream Analytics!</h1>
          <p className="text-base-content/60 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            It looks like you're brand new here or haven't made any event bookings yet. Once you book tickets or add passes to your mobile wallet, your spending insights, attendance trends, and performance metrics will appear right here!
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-4">
          <a href="/events" className="btn btn-primary gap-2 px-6 shadow-lg">
            <CalendarPlus size={18} /> Explore Live Events
          </a>
        </div>
      </motion.div>
    );
  }

  // Handle actual server/network errors distinctly from empty user history
  if (isBookingsError) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-error mt-20">
        <p>Failed to load your analytics data. Please try again later.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-7xl mx-auto p-6 space-y-6 mt-16 text-base-content"
    >
      {/* Page Header & Interactive Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Analytics & Insights Dashboard</h1>
          <p className="text-base-content/60">Comprehensive deep-dive into your bookings, spending velocity, attendance patterns, and gate passes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter */}
          <div className="join bg-base-200 p-1 rounded-lg">
            <button 
              onClick={() => setTimeRange("all")} 
              className={`btn btn-xs join-item ${timeRange === "all" ? "btn-primary" : "btn-ghost"}`}
            >
              All Time
            </button>
            <button 
              onClick={() => setTimeRange("90days")} 
              className={`btn btn-xs join-item ${timeRange === "90days" ? "btn-primary" : "btn-ghost"}`}
            >
              Last 90 Days
            </button>
            <button 
              onClick={() => setTimeRange("30days")} 
              className={`btn btn-xs join-item ${timeRange === "30days" ? "btn-primary" : "btn-ghost"}`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Export CSV Button */}
          <button 
            onClick={handleExportCSV}
            className="btn btn-sm btn-outline gap-2 border-base-300 hover:btn-primary"
          >
            <Download size={16} /> Export CSV
          </button>

          {/* Export PDF Button */}
          <button 
            onClick={handleExportPDF}
            className="btn btn-sm btn-primary gap-2"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 w-fit">
        <button 
          onClick={() => setActiveTab("overview")} 
          className={`tab tab-sm ${activeTab === "overview" ? "tab-active bg-primary text-primary-content" : ""}`}
        >
          Overview & Activity
        </button>
        <button 
          onClick={() => setActiveTab("financial")} 
          className={`tab tab-sm ${activeTab === "financial" ? "tab-active bg-primary text-primary-content" : ""}`}
        >
          Financial & Spending
        </button>
        <button 
          onClick={() => setActiveTab("passes")} 
          className={`tab tab-sm ${activeTab === "passes" ? "tab-active bg-primary text-primary-content" : ""}`}
        >
          Wallet & Gate Passes
        </button>
      </div>

      {/* Enhanced Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spent */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-base-content/60">Total Spent</p>
              <DollarSign size={18} className="text-success" />
            </div>
            <h3 className="text-3xl font-bold text-base-content mt-2">
              KES {stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-md w-fit mt-4">
            Avg: KES {stats.avgBookingValue} / booking
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-base-content/60">Total Bookings</p>
              <Ticket size={18} className="text-primary" />
            </div>
            <h3 className="text-3xl font-bold text-base-content mt-2">{stats.totalBookings}</h3>
          </div>
          <div className="flex gap-2 mt-4 text-xs">
            <span className="text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">{stats.confirmedBookings} Confirmed</span>
            <span className="text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded font-medium">{stats.pendingBookings} Pending</span>
          </div>
        </div>

        {/* Mobile Wallet Passes & Scan Rate */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-base-content/60">Gate Pass Scan Rate</p>
              <Wallet size={18} className="text-blue-500" />
            </div>
            <h3 className="text-3xl font-bold text-base-content mt-2">{stats.scanRate}%</h3>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md w-fit mt-4">
            {stats.scannedPasses} of {stats.totalWalletPasses} Passes Scanned
          </span>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-base-content/60">Cancellation Rate</p>
              <Activity size={18} className="text-error" />
            </div>
            <h3 className="text-3xl font-bold text-base-content mt-2">{stats.cancellationRate}%</h3>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-md w-fit mt-4">
            {stats.cancelledBookings} Cancelled Bookings
          </span>
        </div>
      </div>

      {/* Tab-Based Conditional Chart Views */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Bar Chart: Tickets Booked per Event */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <Award size={18} className="text-primary" /> Tickets Booked per Event
              </h3>
              <div className="h-72 w-full">
                {eventAttendanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventAttendanceData}>
                      <XAxis dataKey="name" stroke="currentColor" fontSize={12} tickLine={false} />
                      <YAxis stroke="currentColor" fontSize={12} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Bar dataKey="tickets" fill="hsl(var(--p))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No event attendance data available for this range.
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart: Bookings by Day of Week */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <Clock size={18} className="text-info" /> Booking Activity by Day of Week
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsByDayData}>
                    <XAxis dataKey="day" stroke="currentColor" fontSize={12} tickLine={false} />
                    <YAxis stroke="currentColor" fontSize={12} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                    />
                    <Bar dataKey="bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart: User Engagement Profile */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <Activity size={18} className="text-purple-500" /> User Engagement Profile Score
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius={80} data={userRadarData}>
                    <PolarGrid stroke="currentColor" opacity={0.2} />
                    <PolarAngleAxis dataKey="subject" stroke="currentColor" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="currentColor" opacity={0.4} />
                    <Radar name="User Profile" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Booking Status Breakdown */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4">Booking Status Distribution</h3>
              <div className="h-72 w-full">
                {bookingStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {bookingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No booking status data available.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "financial" && (
          <motion.div 
            key="financial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Area Chart: Cumulative Spending Over Time */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-success" /> Cumulative Spending Over Time
              </h3>
              <div className="h-72 w-full">
                {spendingOverTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spendingOverTimeData}>
                      <XAxis dataKey="date" stroke="currentColor" fontSize={12} tickLine={false} />
                      <YAxis stroke="currentColor" fontSize={12} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Area type="monotone" dataKey="spent" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No spending trend data available.
                  </div>
                )}
              </div>
            </div>

            {/* Composed Chart: Spending Velocity & Volume */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-primary" /> Spending Velocity & Volume
              </h3>
              <div className="h-72 w-full">
                {spendingVelocityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={spendingVelocityData}>
                      <XAxis dataKey="date" stroke="currentColor" fontSize={12} tickLine={false} />
                      <YAxis yAxisId="left" stroke="currentColor" fontSize={12} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={12} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Bar yAxisId="right" dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Bookings Count" />
                      <Line yAxisId="left" type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} name="Total (KES)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No transaction velocity data available.
                  </div>
                )}
              </div>
            </div>

            {/* Pie Chart: Payment Records Status Breakdown */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 lg:col-span-2">
              <h3 className="text-lg font-semibold text-base-content mb-4">Payment Transaction Status Breakdown</h3>
              <div className="h-72 w-full">
                {paymentStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`pay-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No payment status records found.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "passes" && (
          <motion.div 
            key="passes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Pie Chart: Mobile Wallet Passes Breakdown */}
            <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 lg:col-span-2">
              <h3 className="text-lg font-semibold text-base-content mb-4">Gate Pass Scan Status Breakdown</h3>
              <div className="h-80 w-full">
                {walletPassStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={walletPassStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {walletPassStatusData.map((entry, index) => (
                          <Cell key={`wallet-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--b1))', borderColor: 'hsl(var(--b3))', borderRadius: '0.5rem', color: 'hsl(var(--bc))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40 text-sm">
                    No wallet pass records available.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};