import { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PuffLoader } from "react-spinners";
import { bookingApi } from "../../features/APIS/BookingsApi";
import { eventApi } from "../../features/APIS/EventsApi";
import { FaEdit, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FaDeleteLeft, FaX, FaCalendarDay, FaDollarSign, FaLayerGroup } from "react-icons/fa6";
import { useSelector } from "react-redux";
import type { RootState } from "../../App/store";

const MySwal = withReactContent(Swal);

interface Booking {
  bookingId: number;
  nationalId: number;
  eventId: number;
  quantity: number;
  totalAmount: string;
  bookingStatus: "Pending" | "Confirmed" | "Cancelled";
  ticketTypeId: number;
  createdAt: string;
  updatedAt: string;
}

const bookingStatusEnum = ["Pending", "Confirmed", "Cancelled"] as const;
type BookingStatus = (typeof bookingStatusEnum)[number];

export const AllBookings: React.FC = () => {
  const { data: bookings = [], isLoading, error } = bookingApi.useGetAllBookingsQuery(undefined, {
    pollingInterval: 30000,
  });

  const { data: events = [] } = eventApi.useGetAllEventsQuery(undefined);
  const [updateStatus] = bookingApi.useUpdateBookingStatusMutation();
  const [cancelBooking] = bookingApi.useCancelBookingMutation();
  const [deleteBooking] = bookingApi.useDeleteBookingMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Reduced for better mobile scrolling

  const eventMap = new Map<number, string>(events.map((e: any) => [e.eventId, e.title]));
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);

  const filteredBookings = bookings.filter((b: Booking) => {
    const eventTitle = eventMap.get(b.eventId) ?? "";
    return (
      (!searchTerm || b.bookingId.toString().includes(searchTerm) || b.nationalId.toString().includes(searchTerm)) &&
      (!statusFilter || b.bookingStatus === statusFilter) &&
      (!eventFilter || eventTitle.toLowerCase().includes(eventFilter.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Glassmorphism Modal Config ---
  const glassModalConfig = {
    background: "rgba(15, 23, 42, 0.8)",
    color: "#fff",
    customClass: {
      popup: "rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl w-[90%] max-w-md",
      input: "!bg-slate-800/50 !text-white !rounded-xl !border-white/10 !text-sm",
      confirmButton: "!rounded-xl !bg-primary !px-8 !py-3 !text-xs !font-black !uppercase",
      cancelButton: "!rounded-xl !bg-slate-700 !px-8 !py-3 !text-xs !font-black !uppercase"
    }
  };

  const openStatusModal = async (booking: Booking) => {
    const { value: newStatus } = await MySwal.fire({
      ...glassModalConfig,
      title: `UPDATE STATUS #${booking.bookingId}`,
      input: "select",
      inputOptions: bookingStatusEnum.reduce((acc, status) => { acc[status] = status; return acc; }, {} as Record<string, string>),
      inputValue: booking.bookingStatus,
      showCancelButton: true,
      confirmButtonText: "UPDATE",
    });

    if (newStatus && newStatus !== booking.bookingStatus) {
      try {
        await updateStatus({ bookingId: booking.bookingId, status: newStatus as BookingStatus }).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "SUCCESS", icon: "success", showConfirmButton: false, timer: 1500 });
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "ERROR", text: "Update failed", icon: "error" });
      }
    }
  };

  const handleCancel = async (bookingId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: "CANCEL BOOKING?",
      text: "This action will refund the tickets.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#eab308",
      confirmButtonText: "YES, CANCEL",
    });

    if (confirm.isConfirmed) {
      try {
        await cancelBooking(bookingId).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "CANCELLED", icon: "success", timer: 1500 });
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "ERROR", icon: "error" });
      }
    }
  };

  const handleDelete = async (bookingId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: "DELETE RECORD?",
      text: "This is permanent!",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "DELETE NOW",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteBooking(bookingId).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "DELETED", icon: "success", timer: 1500 });
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "ERROR", icon: "error" });
      }
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const styles: Record<BookingStatus, string> = {
      Pending: "badge-warning shadow-warning/20",
      Confirmed: "badge-success shadow-success/20",
      Cancelled: "badge-error shadow-error/20",
    };
    return (
      <div className={`badge badge-outline gap-1 font-black italic uppercase text-[7px] tracking-widest p-2 rounded-lg ${styles[status]}`}>
        {status}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
        <PuffLoader color="hsl(var(--p))" size={60} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 pb-32 font-sans md:p-8"> {/* pb-32 accounts for fixed navbar */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-base-200/50 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-base-content/5 shadow-xl">
          <h1 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter">
            👋 HEY <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Booking Control Center</p>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 gap-3 bg-base-200/30 p-4 rounded-[2rem] md:grid-cols-3">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" />
            <input
              type="text"
              placeholder="SEARCH ID..."
              className="w-full pl-10 pr-4 py-3 bg-base-100/50 rounded-xl border border-base-content/5 text-[10px] font-bold uppercase outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="w-full px-4 py-3 bg-base-100/50 rounded-xl border border-base-content/5 text-[10px] font-bold uppercase outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ALL STATUSES</option>
            {bookingStatusEnum.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="text"
            placeholder="FILTER BY EVENT..."
            className="w-full px-4 py-3 bg-base-100/50 rounded-xl border border-base-content/5 text-[10px] font-bold uppercase outline-none"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          />
        </div>

        {/* Mobile List / Desktop Table */}
        <div className="space-y-4">
          {/* Desktop Table View (Hidden on Mobile) */}
          <div className="hidden md:block bg-base-200/30 backdrop-blur-md rounded-[2.5rem] p-6 overflow-hidden">
            <table className="table w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest opacity-30 border-none">
                  <th className="px-8">Booking</th>
                  <th>Event</th>
                  <th>Finance</th>
                  <th>Status</th>
                  <th className="text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.map((b) => (
                  <tr key={b.bookingId} className="bg-base-100/40 hover:bg-base-100/80 transition-all border-none">
                    <td className="px-8 py-5 rounded-l-3xl">
                      <p className="font-black text-xs uppercase tracking-tighter">#{b.bookingId}</p>
                      <p className="text-[9px] opacity-40 font-bold tracking-widest">NAT: {b.nationalId}</p>
                    </td>
                    <td>
                      <p className="font-black text-[11px] uppercase italic text-primary/80 truncate max-w-[150px]">{eventMap.get(b.eventId)}</p>
                      <p className="text-[9px] opacity-40 font-bold">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td>
                      <p className="font-black text-xs">${Number(b.totalAmount).toFixed(2)}</p>
                      <p className="text-[9px] opacity-40 font-bold uppercase">Qty: {b.quantity}</p>
                    </td>
                    <td>{getStatusBadge(b.bookingStatus)}</td>
                    <td className="rounded-r-3xl text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openStatusModal(b)} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><FaEdit size={12}/></button>
                        <button onClick={() => handleCancel(b.bookingId)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"><FaX size={12}/></button>
                        <button onClick={() => handleDelete(b.bookingId)} className="p-2.5 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-all"><FaDeleteLeft size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Hidden on Desktop) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedBookings.map((b) => (
              <div key={b.bookingId} className="bg-base-200/50 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block">Booking ID</span>
                    <h3 className="font-black italic text-sm text-primary">#{b.bookingId}</h3>
                  </div>
                  {getStatusBadge(b.bookingStatus)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-3">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30 flex items-center gap-1"><FaCalendarDay size={8}/> Created</span>
                    <p className="text-[10px] font-bold">{new Date(b.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30 flex items-center gap-1"><FaLayerGroup size={8}/> Tickets</span>
                    <p className="text-[10px] font-bold uppercase">Qty: {b.quantity}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-xs font-black">
                    <FaDollarSign size={10} className="text-success" />
                    {Number(b.totalAmount).toFixed(2)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openStatusModal(b)} className="p-3 bg-blue-500/20 text-blue-500 rounded-xl active:scale-95"><FaEdit size={14}/></button>
                    <button onClick={() => handleCancel(b.bookingId)} className="p-3 bg-yellow-500/20 text-yellow-500 rounded-xl active:scale-95"><FaX size={14}/></button>
                    <button onClick={() => handleDelete(b.bookingId)} className="p-3 bg-error/20 text-error rounded-xl active:scale-95"><FaDeleteLeft size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center bg-base-200/30 p-4 rounded-2xl">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 bg-base-100 rounded-xl disabled:opacity-20"><FaChevronLeft size={10}/></button>
          <span className="text-[10px] font-black italic text-primary uppercase">Page {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 bg-base-100 rounded-xl disabled:opacity-20"><FaChevronRight size={10}/></button>
        </div>
      </div>
    </div>
  );
};