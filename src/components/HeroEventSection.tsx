import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Ticket } from 'lucide-react';
import { useGetPrimaryMediaByEventIdQuery } from '../features/APIS/mediaApi';
import { useGetTicketTypesByEventIdQuery } from '../features/APIS/ticketsType.Api';
import { useGetUpcomingEventsQuery } from '../features/APIS/EventsApi';

// Sub-component to manage individual slide's primary media and ticket types
const HeroSlideItem: React.FC<{ event: any }> = ({ event }) => {
  const eventId = event.id || event.eventId;
  const { data: mediaData } = useGetPrimaryMediaByEventIdQuery(eventId);
  const { data: ticketTypesResponse } = useGetTicketTypesByEventIdQuery(eventId);

  // Extract image URL securely
  const imageUrl = 
    mediaData?.url || 
    mediaData?.data?.url || 
    event.imageUrl || 
    event.bannerUrl || 
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop';

  // Safely format venue text string
  const venueDisplay = event.venue?.name 
    ? `${event.venue.name}${event.venue?.address ? `, ${event.venue.address}` : ''}` 
    : event.location || 'Virtual / TBD';

  const formattedDate = event.date || event.startDate 
    ? new Date(event.date || event.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Upcoming Event';

  // Extract ticket tiers/pricing from ticketApi response
  const ticketTypes = Array.isArray(ticketTypesResponse) 
    ? ticketTypesResponse 
    : ticketTypesResponse?.data || [];
  
  const startingPrice = ticketTypes.length > 0 
    ? Math.min(...ticketTypes.map((t: any) => Number(t.price || 0)))
    : event.ticketPrice;

  return (
    <div className="relative w-full h-[520px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl group flex flex-col justify-end shrink-0">
      {/* Background Image with Smooth Zoom Effect */}
      <img
        src={imageUrl}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
      />

      {/* Premium Multi-layer Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />

      {/* Content Container */}
      <div className="relative z-10 p-6 md:p-12 max-w-4xl space-y-4">
        
        {/* Category & Dynamic Pricing Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold tracking-wider text-white uppercase bg-primary/90 backdrop-blur-md rounded-full shadow-lg">
            <Sparkles size={12} />
            {event.category || 'Featured Event'}
          </span>
          {startingPrice !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-white uppercase bg-white/20 backdrop-blur-md rounded-full border border-white/10">
              <Ticket size={12} />
              {Number(startingPrice) === 0 ? "Free Entry" : `From KES ${Number(startingPrice).toLocaleString()}`}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight group-hover:text-primary-content transition-colors line-clamp-2">
          {event.title}
        </h2>

        {/* Date & Location Meta */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-gray-200 text-xs sm:text-sm md:text-base pt-1">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{venueDisplay}</span>
          </div>
        </div>

        {/* Action Button using Slug */}
        <div className="pt-2">
          <Link
            to={`/events/${event.slug || eventId}`}
            className="inline-flex items-center gap-2.5 bg-white text-gray-900 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl shadow-xl hover:bg-primary hover:text-primary-content transition-all duration-300 group/btn text-sm sm:text-base"
          >
            <span>Get Tickets Now</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const HeroEventSection: React.FC = () => {
  const { data: eventsResponse, isLoading, isError } = useGetUpcomingEventsQuery({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Extract raw events and limit strictly to the latest 10
  const rawEvents = Array.isArray(eventsResponse) 
    ? eventsResponse 
    : eventsResponse?.data || [];
  
  const events = rawEvents.slice(0, 10);

  // Reliable Auto-Rotation Every 5 Seconds (Pauses on Hover)
  useEffect(() => {
    if (events.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === events.length - 1 ? 0 : prevIndex + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length, isPaused]);

  if (isLoading) {
    return (
      <div className="w-full h-[520px] md:h-[600px] rounded-3xl bg-base-300/40 animate-pulse flex items-center justify-center border border-base-300">
        <div className="text-base-content/60 font-bold flex items-center gap-2">
          <span className="loading loading-spinner loading-md text-primary"></span>
          Loading featured events...
        </div>
      </div>
    );
  }

  if (isError || !events.length) {
    return (
      <div className="w-full h-[350px] rounded-3xl bg-base-200 text-base-content flex flex-col items-center justify-center p-6 text-center shadow-lg border border-base-300">
        <h3 className="text-2xl font-bold mb-2">No Upcoming Events Found</h3>
        <p className="text-base-content/70 text-sm max-w-sm">Check back soon or publish a new event from your dashboard to see it featured here!</p>
      </div>
    );
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      className="relative w-full max-w-7xl mx-auto px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 
        DESKTOP VIEW: Smooth Horizontal Translate Carousel for Auto-Scroll
      */}
      <div className="hidden md:block relative w-full overflow-hidden rounded-3xl">
        <div 
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {events.map((event: any) => (
            <div key={event.id || event.eventId} className="w-full shrink-0">
              <HeroSlideItem event={event} />
            </div>
          ))}
        </div>

        {/* Desktop Navigation Arrows */}
        {events.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-xl border border-white/10"
              aria-label="Previous event"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-xl border border-white/10"
              aria-label="Next event"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-6 right-10 z-20 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
              {events.map((_, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all rounded-full ${
                    currentIndex === idx ? 'w-8 h-2.5 bg-primary' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 
        MOBILE VIEW: Smooth Swipeable Horizontal Scroll
      */}
      <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar scroll-smooth">
        {events.map((event: any) => (
          <div key={event.id || event.eventId} className="w-[88vw] shrink-0 snap-center transition-transform duration-300">
            <HeroSlideItem event={event} />
          </div>
        ))}
      </div>
    </div>
  );
};