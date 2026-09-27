import { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PuffLoader } from "react-spinners";
import { eventApi } from "../../features/APIS/EventsApi";
import { venueApi } from "../../features/APIS/VenueApi";
import { FaEdit } from "react-icons/fa";
import { FaDeleteLeft } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { Search, Filter, Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RootState } from "../../App/store";

const MySwal = withReactContent(Swal);

// ✅ Event Status Enum
const eventStatusEnum = ["upcoming", "in_progress", "ended", "cancelled"] as const;
type EventStatus = (typeof eventStatusEnum)[number];

interface VenueData {
  venueId: number;
  name: string;
  capacity: number;
}

interface EventData {
  eventId: number;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  venueId: number;
  ticketPrice: number;
  ticketsTotal: number;
  createdAt: string;
  status: EventStatus;
  venue?: VenueData;
}

export const EventDetailsPage = () => {
  const { data: allEvents = [], isLoading, refetch } = eventApi.useGetAllEventsQuery(undefined, { pollingInterval: 30000 });
  const { data: allVenues = [] } = venueApi.useGetAllVenuesQuery({});
  const [createEvent] = eventApi.useCreateEventMutation();
  const [updateEvent] = eventApi.useUpdateEventMutation();
  const [deleteEvent] = eventApi.useDeleteEventMutation();
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories: string[] = Array.from(new Set(allEvents.map((e: EventData) => e.category)));

  const filteredEvents = allEvents
    .map((event: EventData) => {
      const now = new Date();
      const eventDateTime = new Date(`${event.date}T${event.time}`);
      
      let currentStatus = event.status;
      if (eventDateTime <= now && event.status !== "ended" && event.status !== "cancelled") {
        currentStatus = "in_progress";
      }

      return { ...event, status: currentStatus };
    })
    .filter((event: EventData) => {
      return (
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (categoryFilter ? event.category === categoryFilter : true) &&
        (dateFilter ? event.date === dateFilter : true)
      );
    });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const displayedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const glassModalConfig = {
    background: "rgba(15, 23, 42, 0.9)",
    color: "#fff",
    customClass: {
      popup: "rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl",
      confirmButton: "!rounded-xl !bg-primary !px-8 !py-3 !text-xs !font-black !uppercase",
      cancelButton: "!rounded-xl !bg-white/10 !px-8 !py-3 !text-xs !font-black !uppercase",
    }
  };

  const openEventModal = async (initialData?: EventData) => {
    const { value } = await MySwal.fire({
      ...glassModalConfig,
      title: initialData ? "EDIT EVENT" : "ADD NEW EVENT",
      html: `
        <div class="flex flex-col gap-4 p-4 text-left">
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Event Title</label>
            <input id="title" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.title ?? ""}">
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Description</label>
            <input id="description" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.description ?? ""}">
          </div>
          <div class="grid grid-cols-2 gap-3">
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Category</label>
               <input id="category" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.category ?? ""}">
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Status</label>
               <select id="status" class="w-full px-5 py-4 bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none appearance-none">
                  ${eventStatusEnum.map((s: string) => `<option value="${s}" ${initialData?.status === s ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}
               </select>
             </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Date</label>
               <input id="date" type="date" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.date ?? ""}">
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Time</label>
               <input id="time" type="time" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.time ?? ""}">
             </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Price (KES)</label>
               <input id="ticketPrice" type="number" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.ticketPrice ?? ""}">
             </div>
             <div class="space-y-1">
               <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Set Event Capacity</label>
               <input id="ticketsTotal" type="number" class="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none" value="${initialData?.ticketsTotal ?? ""}">
             </div>
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Venue Location</label>
            <select id="venueId" class="w-full px-5 py-4 bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none appearance-none">
               <option value="" disabled ${!initialData ? 'selected' : ''}>SELECT VENUE</option>
               ${allVenues.map((v: VenueData) => `<option value="${v.venueId}" ${initialData?.venueId === v.venueId ? "selected" : ""}>${v.name} (Max Cap: ${v.capacity})</option>`).join("")}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: initialData ? "UPDATE EVENT" : "CREATE EVENT",
      preConfirm: () => {
        const title = (document.getElementById("title") as HTMLInputElement).value.trim();
        const description = (document.getElementById("description") as HTMLInputElement).value.trim();
        const category = (document.getElementById("category") as HTMLInputElement).value.trim();
        const date = (document.getElementById("date") as HTMLInputElement).value;
        const time = (document.getElementById("time") as HTMLInputElement).value;
        const ticketPrice = Number((document.getElementById("ticketPrice") as HTMLInputElement).value);
        const ticketsTotal = Number((document.getElementById("ticketsTotal") as HTMLInputElement).value);
        const venueId = Number((document.getElementById("venueId") as HTMLSelectElement).value);
        const status = (document.getElementById("status") as HTMLSelectElement).value as EventStatus;

        if (!title || !venueId || !date || !time || isNaN(ticketPrice) || isNaN(ticketsTotal)) {
          Swal.showValidationMessage("⚠️ PLEASE FILL ALL FIELDS CORRECTLY");
          return;
        }

        const selectedVenue = allVenues.find((v: VenueData) => v.venueId === venueId);
        if (selectedVenue && ticketsTotal > selectedVenue.capacity) {
          Swal.showValidationMessage(`❌ CAPACITY ERROR: ${selectedVenue.name} only holds ${selectedVenue.capacity} people!`);
          return;
        }

        const isDoubleBooked = allEvents.some((event: EventData) => 
          event.venueId === venueId && 
          event.date === date && 
          event.eventId !== initialData?.eventId && 
          event.status !== "cancelled"
        );

        if (isDoubleBooked) {
          Swal.showValidationMessage(`❌ DOUBLE-BOOKING: This venue is already booked for ${date}!`);
          return;
        }

        return { eventId: initialData?.eventId, title, description, category, date, time, ticketPrice, ticketsTotal, venueId, status };
      },
    });

    if (!value) return;

    try {
      if (value.eventId) {
        await updateEvent(value).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "SUCCESS", text: "Event updated.", icon: "success", timer: 1500, showConfirmButton: false });
      } else {
        await createEvent(value).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "SUCCESS", text: "Event created.", icon: "success", timer: 1500, showConfirmButton: false });
      }
      refetch();
    } catch (err: any) {
      MySwal.fire("Error", err?.data?.message || "Failed to save event.", "error");
    }
  };

  const handleDelete = async (eventId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: "DELETE EVENT?",
      text: "THIS IS PERMANENT!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "YES, DELETE",
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteEvent(eventId).unwrap();
      MySwal.fire({ ...glassModalConfig, title: "DELETED", icon: "success", timer: 1500, showConfirmButton: false });
      refetch();
    } catch (err: any) {
      MySwal.fire("Error", err?.data?.message || "Failed to delete event.", "error");
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const colorMap: Record<EventStatus, string> = {
      upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/50",
      in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/50",
      ended: "bg-white/5 text-white/40 border-white/10",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/50",
    };
    return (
      <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${colorMap[status]}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-base-100 text-base-content font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* BIG HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-base-200/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
              👋 HEY <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-1 text-primary">Conflict Guard Active</p>
          </div>
          <button onClick={() => openEventModal()} className="btn btn-primary rounded-2xl px-8 font-black uppercase italic tracking-widest w-full md:w-auto">
            <Plus size={18} className="mr-2" /> ADD EVENT
          </button>
        </div>

        {/* SMART FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:text-primary transition-all" size={18} />
            <input type="text" placeholder="SEARCH TITLE..." className="input input-bordered w-full pl-14 pr-6 py-7 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="relative group">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <select className="select select-bordered w-full pl-14 pr-6 py-5 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase tracking-widest outline-none appearance-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">ALL CATEGORIES</option>
              {categories.map((c: string) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="relative group">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input type="date" className="input input-bordered w-full pl-14 pr-6 py-7 bg-base-200/50 rounded-2xl border-none font-black text-[10px] uppercase outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-base-200/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="py-24 flex justify-center"><PuffLoader color="hsl(var(--p))" size={60} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full border-separate border-spacing-y-2 px-4">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest opacity-30 border-none">
                    <th className="pl-8">Event Info</th>
                    <th>Venue</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Tickets/Price</th>
                    <th className="text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold">
                  {displayedEvents.map((event: EventData) => (
                    <tr key={event.eventId} className="bg-base-100/40 hover:bg-base-100 transition-all">
                      <td className="pl-8 py-5 rounded-l-3xl">
                        <div className="font-black text-primary uppercase italic text-sm">{event.title}</div>
                        <div className="text-[9px] opacity-40 uppercase">{event.category}</div>
                      </td>
                      <td>
                        <div className="uppercase text-white">{event.venue?.name || "N/A"}</div>
                        <div className="text-[9px] opacity-30 uppercase">Capacity: {event.ticketsTotal}</div>
                      </td>
                      <td>
                        <div className="uppercase text-white">{new Date(`${event.date}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[9px] opacity-40 uppercase">{event.time}</div>
                      </td>
                      <td>{getStatusBadge(event.status)}</td>
                      <td>
                        <div className="text-primary font-black uppercase">KES {event.ticketPrice}</div>
                      </td>
                      <td className="text-right pr-8 rounded-r-3xl">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEventModal(event)} className="p-3 bg-info/10 text-info rounded-xl hover:bg-info hover:text-white transition-all">
                            <FaEdit size={14} />
                          </button>
                          <button onClick={() => handleDelete(event.eventId)} className="p-3 bg-error/10 text-error rounded-xl hover:bg-error hover:text-white transition-all">
                            <FaDeleteLeft size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAGINATION */}
              <div className="flex justify-center items-center py-10 gap-6 border-t border-white/5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="btn btn-sm btn-ghost font-black uppercase tracking-widest italic disabled:opacity-20">
                  <ChevronLeft size={16} /> PREV
                </button>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">PAGE {currentPage} / {totalPages || 1}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || totalPages === 0} className="btn btn-sm btn-ghost font-black uppercase tracking-widest italic disabled:opacity-20">
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