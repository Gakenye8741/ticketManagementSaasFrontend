import { useState, useMemo } from "react";
import { PuffLoader } from "react-spinners";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ShoppingCart, 
  LogIn, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Frown,
  Tag,
  Ticket,
  Building2,
  Info,
  CheckCircle2,
  Globe,
  Share2,
  ArrowLeft
} from "lucide-react";
import dayjs from "dayjs";
import { useGetAllEventsQuery, useGetEventByIdQuery } from "../../features/APIS/EventsApi";
import { useSelector } from "react-redux";
import type { RootState } from "../../App/store";
import { mediaApi } from "../../features/APIS/mediaApi";

type Venue = {
  name: string;
  address: string;
  capacity: number;
};

type EventDetails = {
  eventId: number;
  title: string;
  description?: string;
  venue?: Venue;
  category?: string;
  date: string;
  time: string;
  ticketPrice: number | string;
  ticketsTotal: number;
  ticketsSold: number;
  organizationId?: number;
};

const getEventStatus = (event: EventDetails) => {
  const eventDateTime = dayjs(`${event.date} ${event.time}`);
  const now = dayjs();
  if (eventDateTime.isBefore(now)) return "past";
  if (eventDateTime.isSame(now, "day")) return "ongoing";
  return "upcoming";
};

// ==========================================
// INDIVIDUAL EVENT DETAILED VIEW PAGE
// ==========================================
const SingleEventDetailsView = ({ eventId, onBack }: { eventId: number; onBack: () => void }) => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  const { data: eventResponse, isLoading, error } = useGetEventByIdQuery(eventId);
  const event: EventDetails | undefined = eventResponse?.data || eventResponse;
  
  const { data: media = [] } = mediaApi.useGetMediaByEventIdQuery(eventId);
  const firstImageUrl = media.length > 0 ? media[0].url : null;

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] gap-6">
        <PuffLoader color="oklch(var(--p))" size={90} />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 animate-pulse">Loading Event Specifications...</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto py-24 text-center space-y-6">
        <div className="p-6 rounded-full bg-error/10 text-error inline-block"><Frown className="w-12 h-12" /></div>
        <h2 className="text-3xl font-black uppercase italic">Event Not Found</h2>
        <p className="text-xs text-base-content/60">The requested event could not be retrieved from the server stream.</p>
        <button onClick={onBack} className="btn btn-primary rounded-2xl font-black uppercase tracking-widest text-[10px] px-8">
          Back to Event Directory
        </button>
      </div>
    );
  }

  const price = parseFloat(event.ticketPrice as string);
  const status = getEventStatus(event);
  const isPast = status === "past";
  const ticketsRemaining = (event.ticketsTotal || 0) - (event.ticketsSold || 0);
  const percentSold = event.ticketsTotal > 0 ? Math.min(100, Math.round((event.ticketsSold / event.ticketsTotal) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 space-y-10 animate-fade-in">
      <button 
        onClick={onBack}
        className="btn btn-ghost btn-sm rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border border-base-content/10 hover:bg-base-200"
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Events
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Visuals & Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-[3rem] overflow-hidden bg-base-300/40 border border-base-content/10 shadow-2xl h-[400px] sm:h-[480px]">
            {firstImageUrl ? (
              <img src={firstImageUrl} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-base-300/40 to-base-300/10 italic text-base-content/30 font-black uppercase tracking-widest text-xs">
                <Sparkles className="w-8 h-8 opacity-40 animate-spin" />
                No Visual Media Uploaded
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className={`px-4 py-2 rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-widest shadow-lg ${
                status === "past" ? "bg-base-300 text-base-content" : status === "ongoing" ? "bg-warning text-black animate-pulse" : "bg-success text-black"
              }`}>
                {status === "past" ? "Event Concluded" : status === "ongoing" ? "Ongoing Now" : "Upcoming Event"}
              </span>
              {event.category && (
                <span className="px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                  {event.category}
                </span>
              )}
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-md">
                  {event.title}
                </h1>
              </div>
            </div>
          </div>

          <div className="bg-base-200/50 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-base-content/10 shadow-xl space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-primary">
              <Info className="w-5 h-5" /> Comprehensive Event Description
            </h3>
            <p className="text-sm font-medium text-base-content/80 leading-relaxed italic whitespace-pre-line">
              {event.description || "No full description has been provided by the organizer for this session yet."}
            </p>
          </div>
        </div>

        {/* Right Column: Ticket Purchase & Details Sidebar */}
        <div className="space-y-6">
          <div className="bg-base-200/80 dark:bg-black/60 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-base-content/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-base-content/10">
              <span className="text-xs font-black uppercase tracking-widest text-base-content/60">Ticket Investment</span>
              <span className="text-2xl font-black text-primary">
                KSH {isNaN(price) ? "0.00" : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-base-100/70 border border-base-content/5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest opacity-50">Event Date</div>
                  <div className="text-base-content">{event.date}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-base-100/70 border border-base-content/5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest opacity-50">Start Time</div>
                  <div className="text-base-content">{event.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-base-100/70 border border-base-content/5">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest opacity-50">Venue Location</div>
                  <div className="text-base-content italic">{event.venue?.name || "Main Arena"} {event.venue?.address ? `• ${event.venue.address}` : ""}</div>
                </div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="p-4 rounded-2xl bg-base-300/30 border border-base-content/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1 text-base-content/70"><Ticket className="w-3.5 h-3.5 text-primary" /> Availability</span>
                <span className={ticketsRemaining > 0 ? "text-success" : "text-error"}>
                  {ticketsRemaining > 0 ? `${ticketsRemaining} Tickets Left` : "Sold Out"}
                </span>
              </div>
              <div className="w-full bg-base-300/50 rounded-full h-2 overflow-hidden border border-base-content/10">
                <div className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-1000" style={{ width: `${percentSold}%` }} />
              </div>
              <div className="flex items-center justify-between text-[9px] font-bold text-base-content/50 uppercase">
                <span>Capacity: {event.venue?.capacity || event.ticketsTotal || "Unlimited"}</span>
                <span>{event.ticketsSold || 0} Booked</span>
              </div>
            </div>

            <div>
              {isAuthenticated ? (
                <button 
                  onClick={() => !isPast && navigate(`/events/${event.eventId}`)}
                  className={`btn w-full rounded-2xl border-none h-14 font-black uppercase text-[10px] tracking-[0.3em] shadow-xl ${
                    isPast ? "btn-disabled bg-base-300/50 text-base-content/30" : "btn-primary hover:shadow-primary/40 hover:scale-[1.02] transition-all"
                  }`}
                  disabled={isPast || ticketsRemaining === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isPast ? "Event Concluded" : ticketsRemaining === 0 ? "Sold Out" : "Secure Ticket Now"}
                </button>
              ) : (
                <a 
                  href="/login"
                  className="btn btn-primary w-full rounded-2xl border-none h-14 font-black uppercase text-[10px] tracking-[0.3em] shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                >
                  <LogIn className="w-4 h-4" /> Sign In To Purchase Pass
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// EVENT CARD COMPONENT
// ==========================================
const EventCard = ({
  event,
  isAuthenticated,
  onSelectEvent,
}: {
  event: EventDetails;
  isAuthenticated: boolean;
  onSelectEvent: (id: number) => void;
}) => {
  const { data: media = [] } = mediaApi.useGetMediaByEventIdQuery(event.eventId);
  const firstImageUrl = media.length > 0 ? media[0].url : null;
  const price = parseFloat(event.ticketPrice as string);
  const status = getEventStatus(event);
  const isPast = status === "past";
  
  const statusText = status === "past" ? "Event Ended" : status === "ongoing" ? "Ongoing Now" : "Upcoming";
  const statusColor = status === "past" 
    ? "bg-base-300 text-base-content/70 border-base-content/10" 
    : status === "ongoing" 
    ? "bg-warning/20 text-warning border-warning/30 animate-pulse" 
    : "bg-success/20 text-success border-success/30";

  const ticketsRemaining = (event.ticketsTotal || 0) - (event.ticketsSold || 0);
  const percentSold = event.ticketsTotal > 0 ? Math.min(100, Math.round((event.ticketsSold / event.ticketsTotal) * 100)) : 0;

  return (
    <div className="group relative rounded-[2.5rem] p-[1px] bg-gradient-to-b from-primary/30 via-base-content/15 to-transparent hover:from-primary/60 hover:to-accent/40 transition-all duration-500 h-full flex flex-col shadow-xl hover:shadow-2xl hover:shadow-primary/10">
      <div className="flex flex-col h-full bg-base-200/60 dark:bg-black/50 backdrop-blur-3xl rounded-[2.4rem] overflow-hidden border border-base-content/10">
        <figure className="relative h-60 overflow-hidden m-3 rounded-[2rem] bg-base-300/40">
          {firstImageUrl ? (
            <img src={firstImageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-base-300/30 to-base-300/10 italic text-base-content/30 font-black uppercase tracking-widest text-[10px]">
              <Sparkles className="w-6 h-6 opacity-40 animate-spin" />
              Visual Pending
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

          <div className="absolute top-4 right-4 px-4 py-2 rounded-2xl bg-base-100/90 dark:bg-black/80 backdrop-blur-xl border border-base-content/10 text-primary font-black text-xs tracking-wider shadow-2xl">
            KSH {isNaN(price) ? "0.00" : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl border backdrop-blur-md text-[9px] font-black uppercase tracking-widest shadow-lg ${statusColor}`}>
            {statusText}
          </div>

          {event.category && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">
              <Tag className="w-2.5 h-2.5 text-primary" />
              {event.category}
            </div>
          )}
        </figure>

        <div className="p-8 pt-2 flex flex-col flex-grow">
          <h3 className="text-2xl font-black tracking-tighter uppercase italic text-primary leading-tight mb-3 group-hover:text-accent transition-colors">
            {event.title}
          </h3>
          
          <p className="text-xs font-medium text-base-content/70 line-clamp-3 italic mb-6 leading-relaxed">
            {event.description || "No description provided for this event experience yet. Stay tuned for further updates."}
          </p>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-3xl bg-base-100/70 dark:bg-white/5 border border-base-content/5 mb-6 shadow-inner">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-primary/80">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Date</span>
              </div>
              <span className="text-[11px] font-black text-base-content">{event.date}</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-primary/80">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Time</span>
              </div>
              <span className="text-[11px] font-black text-base-content">{event.time}</span>
            </div>

            <div className="flex flex-col gap-1 pt-3 border-t border-base-content/10 col-span-2">
              <div className="flex items-center gap-1.5 text-accent">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Venue & Location</span>
              </div>
              <span className="text-[11px] font-bold truncate text-base-content italic">
                {event.venue?.name || "Main Arena"} {event.venue?.address ? `• ${event.venue.address}` : ""}
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-3xl bg-base-300/30 border border-base-content/5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-base-content/70">
                <Ticket className="w-3.5 h-3.5 text-primary" /> Tickets Status
              </span>
              <span className={ticketsRemaining > 0 ? "text-success font-bold" : "text-error font-bold"}>
                {ticketsRemaining > 0 ? `${ticketsRemaining} Left` : "Sold Out"}
              </span>
            </div>

            <div className="w-full bg-base-300/50 rounded-full h-2 overflow-hidden border border-base-content/10">
              <div 
                className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-1000"
                style={{ width: `${percentSold}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-base-content/50">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> Capacity: {event.venue?.capacity || event.ticketsTotal || "Unlimited"}
              </span>
              <span>{event.ticketsSold || 0} Booked ({percentSold}%)</span>
            </div>
          </div>

          <div className="mt-auto pt-2 flex gap-3">
            <button 
              onClick={() => onSelectEvent(event.eventId)}
              className="btn btn-ghost border border-base-content/10 flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest hover:bg-base-200 transition-all"
            >
              View Details
            </button>
            {isAuthenticated ? (
              <button 
                onClick={() => !isPast && onSelectEvent(event.eventId)} 
                className={`btn flex-1 rounded-2xl border-none h-14 font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 shadow-xl ${
                  isPast 
                    ? "btn-disabled bg-base-300/50 text-base-content/30" 
                    : "btn-primary hover:shadow-primary/40 hover:scale-[1.02]"
                }`} 
                disabled={isPast}
              >
                <ShoppingCart className="w-4 h-4 mr-1" /> 
                {isPast ? "Ended" : ticketsRemaining === 0 ? "Sold Out" : "Book"}
              </button>
            ) : (
              <a 
                href="/login" 
                className="btn btn-primary flex-1 rounded-2xl border-none h-14 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:shadow-primary/40 flex items-center justify-center gap-1"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN EVENT DETAILS PAGE WRAPPER & DIRECTORY
// ==========================================
export const EventDetailsPage = () => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [searchTitle, setSearchTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const { data: eventsResponse, isLoading, error } = useGetAllEventsQuery(undefined);
  const allEvents = eventsResponse?.data || [];

  const categories = useMemo(() => {
    const cats = allEvents.map((e: EventDetails) => e.category).filter(Boolean);
    return ["All", ...Array.from(new Set(cats))];
  }, [allEvents]);

  // Filtering Logic
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e: EventDetails) => {
      const matchesTitle = e.title.toLowerCase().includes(searchTitle.toLowerCase());
      const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
      return matchesTitle && matchesCategory;
    });
  }, [allEvents, searchTitle, selectedCategory]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const ongoingEvents = paginatedEvents.filter((e: EventDetails) => getEventStatus(e) === "ongoing");
  const upcomingEvents = paginatedEvents.filter((e: EventDetails) => getEventStatus(e) === "upcoming");
  const pastEvents = paginatedEvents.filter((e: EventDetails) => getEventStatus(e) === "past");

  // If a specific event is selected, render the detailed view page
  if (selectedEventId !== null) {
    return <SingleEventDetailsView eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />;
  }

  return (
    <section className="relative min-h-screen py-24 px-4 sm:px-6 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-primary/5">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" /> Live Event Directory & Ticketing Stream
          </div>
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-base-content">
            Explore Ultimate <span className="text-primary">Experiences</span>
          </h2>
          <p className="max-w-2xl mx-auto text-xs md:text-sm font-medium text-base-content/60 italic">
            Discover immersive upcoming gatherings, real-time live activities, and archived landmark moments. Secure your verified access pass instantly.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-20 space-y-6">
          <div className="relative group p-1 rounded-[2.5rem] bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 shadow-2xl">
            <div className="flex items-center bg-base-100 dark:bg-black/80 backdrop-blur-3xl rounded-[2.4rem] overflow-hidden px-6">
              <Search className="w-5 h-5 text-primary mr-3" />
              <input
                type="text"
                placeholder="Search events by title, keyword, or experience..."
                className="w-full bg-transparent p-6 text-sm font-bold focus:outline-none text-base-content placeholder:text-base-content/30 placeholder:italic"
                value={searchTitle}
                onChange={(e) => { setSearchTitle(e.target.value); setCurrentPage(1); }}
              />
              {searchTitle && (
                <button 
                  onClick={() => setSearchTitle("")}
                  className="btn btn-ghost btn-xs font-black uppercase text-[9px] text-primary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 shadow-md
                  ${selectedCategory === cat 
                    ? "bg-primary border-primary text-primary-content shadow-primary/30 scale-105" 
                    : "bg-base-200/80 border-base-content/5 text-base-content/60 hover:border-base-content/20 hover:text-base-content"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FEED CONTENT */}
        {error ? (
          <div className="text-error text-center font-black uppercase tracking-widest bg-error/10 p-12 rounded-[3rem] border border-error/20 shadow-2xl">
            System Error: Failed to synchronize event streams. Please check your connection.
          </div>
        ) : isLoading ? (
          <div className="flex flex-col justify-center items-center h-96 gap-6">
            <PuffLoader color="oklch(var(--p))" size={90} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 animate-pulse">Synchronizing Live Feed Stream...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-base-content/10 rounded-[4rem] text-center space-y-6 bg-base-200/20 backdrop-blur-md">
             <div className="p-6 rounded-full bg-base-200 shadow-xl"><Frown className="w-12 h-12 text-base-content/30" /></div>
             <div className="space-y-2">
               <h3 className="text-3xl font-black uppercase italic text-base-content/50 tracking-tighter">No Events Matching Parameters</h3>
               <p className="text-xs font-medium text-base-content/40 italic">Try clearing your filters or adjusting your search keyword query.</p>
             </div>
             <button onClick={() => { setSearchTitle(""); setSelectedCategory("All"); setCurrentPage(1); }} className="btn btn-primary rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 shadow-lg">Reset All Filters</button>
          </div>
        ) : (
          <>
            <div className="space-y-32">
              {ongoingEvents.length > 0 && (
                <section>
                  <SectionLabel title="Ongoing Events" subtitle="Happening right now. Jump into the action live." color="text-warning" />
                  <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {ongoingEvents.map((event: any) => (
                      <EventCard key={event.eventId} event={event} isAuthenticated={isAuthenticated} onSelectEvent={(id) => setSelectedEventId(id)} />
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length > 0 && (
                <section>
                  <SectionLabel title="Upcoming Events" subtitle="Secure your spot before passes sell out completely." color="text-success" />
                  <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((event: any) => (
                      <EventCard key={event.eventId} event={event} isAuthenticated={isAuthenticated} onSelectEvent={(id) => setSelectedEventId(id)} />
                    ))}
                  </div>
                </section>
              )}

              {pastEvents.length > 0 && (
                <section className="opacity-75">
                  <SectionLabel title="Event Archive" subtitle="Explore historical summaries and memorable past legends." color="text-base-content/50" />
                  <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {pastEvents.map((event: any) => (
                      <EventCard key={event.eventId} event={event} isAuthenticated={isAuthenticated} onSelectEvent={(id) => setSelectedEventId(id)} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="mt-24 flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-base-200/60 dark:bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-base-content/10 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-base-content/60">Display Density:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-base-100 dark:bg-black/60 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl border border-base-content/10 focus:ring-2 focus:ring-primary outline-none shadow-md cursor-pointer text-base-content"
                >
                  {[3, 6, 9, 12, 18].map(n => <option key={n} value={n}>{n} Events Per Page</option>)}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="btn btn-ghost rounded-2xl font-black text-xs uppercase tracking-widest px-4 border border-base-content/10 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </button>
                <div className="px-6 py-3 rounded-2xl bg-base-100 dark:bg-black/60 border border-base-content/10 shadow-inner text-[10px] font-black uppercase tracking-widest text-primary">
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="btn btn-ghost rounded-2xl font-black text-xs uppercase tracking-widest px-4 border border-base-content/10 disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const SectionLabel = ({ title, subtitle, color }: { title: string; subtitle: string; color: string }) => (
  <div className="mb-12 border-l-4 border-current pl-6 space-y-1">
    <h3 className={`text-3xl md:text-4xl font-black uppercase italic tracking-tighter ${color}`}>{title}</h3>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{subtitle}</p>
  </div>
);