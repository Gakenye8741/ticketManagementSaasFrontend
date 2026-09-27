import { eventApi } from "../../features/APIS/EventsApi";
import { mediaApi } from "../../features/APIS/mediaApi";
import { PuffLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs"; // Added for date comparison
import {
  ShoppingCart,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ticketApi } from "../../features/APIS/ticketsType.Api";

// Swiper Imports for the Mobile Carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

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
};

type TicketTypeData = {
  ticketTypeId: number;
  name: string;
  quantity: number;
  sold: number;
};

export const EventCard = () => {
  const navigate = useNavigate();

  const {
    data: allEvents = [],
    isLoading,
    error,
  } = eventApi.useGetAllEventsQuery({
    pollingInterval: 3000,
  });

  const displayedEvents = allEvents.slice(0, 6);

  return (
    <section className="relative min-h-screen py-2 px-4 sm:px-6 bg-transparent overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {error ? (
          <div className="text-error text-center font-bold bg-error/10 p-6 rounded-2xl backdrop-blur-md border border-error/20 max-w-lg mx-auto">
            Failed to sync with the stream. Please refresh.
          </div>
        ) : isLoading ? (
          <div className="flex flex-col justify-center h-96 items-center gap-4">
            <PuffLoader color="#06b6d4" size={80} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Syncing Feed</span>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center text-primary/60 text-xl italic p-20 border-2 border-dashed border-primary/20 rounded-[3rem]">
            The stage is currently empty. Stay tuned.
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              <Swiper
                modules={[Pagination, Autoplay]}
                spaceBetween={20}
                slidesPerView={1.1}
                centeredSlides={true}
                loop={displayedEvents.length > 1}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                pagination={{ 
                  clickable: true, 
                  dynamicBullets: true 
                }}
                className="pb-16 !overflow-visible"
              >
                {displayedEvents.map((event: EventDetails) => (
                  <SwiperSlide key={event.eventId} className="h-auto">
                    <EventCardItem event={event} navigate={navigate} />
                  </SwiperSlide>
                ))}
              </Swiper>
              <p className="text-center text-[10px] font-bold uppercase tracking-widest opacity-30 -mt-8">
                Swipe to browse events
              </p>
            </div>

            <div className="hidden lg:grid gap-8 grid-cols-3">
              {displayedEvents.slice(0, 3).map((event: EventDetails) => (
                <EventCardItem key={event.eventId} event={event} navigate={navigate} />
              ))}
            </div>
          </>
        )}

        {allEvents.length > 3 && (
          <div className="mt-20 text-center">
            <button
              onClick={() => navigate("/events")}
              className="group btn btn-primary px-12 rounded-2xl h-16 font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20 border-none"
            >
              Explore Full Scene
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .swiper-pagination-bullet { background: hsl(var(--bc)) !important; opacity: 0.2; }
        .swiper-pagination-bullet-active { background: hsl(var(--p)) !important; opacity: 1; width: 20px; border-radius: 4px; transition: all 0.3s; }
      `}</style>
    </section>
  );
};

const EventCardItem = ({
  event,
  navigate,
}: {
  event: EventDetails;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const { data: media = [] } = mediaApi.useGetMediaByEventIdQuery(event.eventId);
  const { data: ticketTypes = [] } = ticketApi.useGetTicketTypesByEventIdQuery(event.eventId);

  const firstImage = Array.isArray(media)
    ? media.find((m: any) => m.type === "image")
    : null;

  const price = parseFloat(event.ticketPrice as string);
  const available = (Number(event.ticketsTotal) || 0) - (Number(event.ticketsSold) || 0);
  
  // Logic: Check if the date is in the past compared to today
  const isPastEvent = dayjs(event.date).isBefore(dayjs(), 'day');

  return (
    <div className="group relative rounded-[2.5rem] p-[1px] bg-gradient-to-b from-white/20 to-transparent hover:from-primary/40 transition-all duration-500 h-full">
      <div className="flex flex-col h-full bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden border border-white/5 shadow-2xl">
        <figure className="relative h-60 sm:h-64 overflow-hidden m-3 rounded-[2rem]">
          {firstImage ? (
            <img src={firstImage.url} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-base-300/30 italic text-base-content/20 font-bold uppercase tracking-widest text-[10px]">
              Visual Pending
            </div>
          )}
          <div className="absolute top-4 right-4 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white font-black text-[10px] tracking-widest shadow-2xl">
            KSH {isNaN(price) ? "0" : price.toLocaleString()}
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-primary/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest shadow-lg">
            {event.category || "General"}
          </div>
        </figure>

        <div className="p-8 pt-2 flex flex-col flex-grow">
          <h3 className="text-2xl font-black tracking-tighter uppercase italic text-base-content leading-none mb-3 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <p className="text-sm font-medium text-base-content/50 line-clamp-2 italic mb-8 leading-relaxed">
            {event.description || "Join the most exclusive event of the campus season."}
          </p>

          <div className="grid grid-cols-2 gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 mb-8 shadow-inner">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-primary">
                 <CalendarDays className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Date</span>
              </div>
              <span className="text-xs font-bold">{event.date}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-primary">
                 <Clock className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Starts</span>
              </div>
              <span className="text-xs font-bold">{event.time}</span>
            </div>
            <div className="flex flex-col gap-1 col-span-2 mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2 text-secondary">
                 <MapPin className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Location</span>
              </div>
              <span className="text-xs font-bold truncate opacity-90 italic">
                {event.venue?.name || "Main Campus"}
              </span>
            </div>
          </div>

          {ticketTypes.length > 0 && (
             <div className="mb-8 space-y-2">
                <div className="flex flex-wrap gap-2 justify-center">
                   {ticketTypes.slice(0, 3).map((type: TicketTypeData) => (
                      <span key={type.ticketTypeId} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-bold opacity-60 uppercase">
                        {type.name}
                      </span>
                   ))}
                </div>
             </div>
          )}

          <div className="mt-auto">
            <button
              onClick={() => navigate(`/events/${event.eventId}`)}
              className={`btn w-full rounded-2xl border-none h-14 font-black uppercase text-[10px] tracking-[0.3em] transition-all duration-300 shadow-xl
                ${isPastEvent 
                  ? "bg-base-content/10 text-base-content/50 hover:bg-base-content/20" 
                  : available <= 0 
                    ? "bg-base-content/10 text-base-content/20 cursor-not-allowed" 
                    : "btn-primary hover:shadow-primary/40 active:scale-95"
                }`}
              disabled={!isPastEvent && available <= 0}
            >
              {isPastEvent ? (
                "See Details"
              ) : available <= 0 ? (
                "Sold Out"
              ) : (
                <div className="flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Get Access
                  <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};