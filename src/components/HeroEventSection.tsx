import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Ticket } from 'lucide-react';
import { useGetPrimaryMediaByEventIdQuery } from '../features/APIS/mediaApi';
import { useGetTicketTypesByEventIdQuery } from '../features/APIS/ticketsType.Api';
import { useGetUpcomingEventsQuery } from '../features/APIS/EventsApi';

const SLIDE_MS = 5000;
const EASE = [0.22, 1, 0.36, 1] as const;

const contentVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Sub-component to manage an individual slide's primary media and ticket types
const HeroSlideItem: React.FC<{ event: any; active: boolean }> = ({ event, active }) => {
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

  const formattedDate =
    event.date || event.startDate
      ? new Date(event.date || event.startDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Upcoming Event';

  // Extract ticket tiers/pricing from ticketApi response
  const ticketTypes = Array.isArray(ticketTypesResponse) ? ticketTypesResponse : ticketTypesResponse?.data || [];

  const startingPrice =
    ticketTypes.length > 0 ? Math.min(...ticketTypes.map((t: any) => Number(t.price || 0))) : event.ticketPrice;

  return (
    <div className="relative w-full h-[520px] md:h-[620px] rounded-3xl overflow-hidden shadow-2xl group flex flex-col justify-end shrink-0 bg-base-300">
      {/* Background image with slow cinematic zoom while the slide is active */}
      <motion.img
        src={imageUrl}
        alt={event.title}
        loading="lazy"
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ duration: active ? 7 : 0.8, ease: 'easeOut' }}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Layered gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {/* Content */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate={active ? 'show' : 'hidden'}
        className="relative z-10 p-6 md:p-12 max-w-4xl space-y-4"
      >
        {/* Category & pricing badges */}
        <motion.div variants={itemVariants} className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold tracking-wider text-white uppercase bg-primary/90 backdrop-blur-md rounded-full shadow-lg">
            <Sparkles size={12} />
            {event.category || 'Featured Event'}
          </span>
          {startingPrice !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-white uppercase bg-white/15 backdrop-blur-md rounded-full border border-white/20">
              <Ticket size={12} />
              {Number(startingPrice) === 0 ? 'Free Entry' : `From KES ${Number(startingPrice).toLocaleString()}`}
            </span>
          )}
        </motion.div>

        {/* Title */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.05] line-clamp-2 drop-shadow-lg"
        >
          {event.title}
        </motion.h2>

        {/* Date & location */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-100 text-xs sm:text-sm md:text-base pt-1"
        >
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{venueDisplay}</span>
          </div>
        </motion.div>

        {/* Action button (uses slug) */}
        <motion.div variants={itemVariants} className="pt-2">
          <Link
            to={`/events/${event.slug || eventId}`}
            className="inline-flex items-center gap-2.5 bg-white text-gray-900 font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl shadow-xl hover:bg-primary hover:text-primary-content hover:-translate-y-0.5 transition-all duration-300 group/btn text-sm sm:text-base"
          >
            <span>Get Tickets Now</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export const HeroEventSection: React.FC = () => {
  const { data: eventsResponse, isLoading, isError } = useGetUpcomingEventsQuery({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Extract raw events and limit strictly to the latest 10
  const rawEvents = Array.isArray(eventsResponse) ? eventsResponse : eventsResponse?.data || [];
  const events = rawEvents.slice(0, 10);

  // Auto-rotation every 5 seconds (pauses on hover)
  useEffect(() => {
    if (events.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1));
    }, SLIDE_MS);

    return () => clearInterval(interval);
  }, [events.length, isPaused, currentIndex]);

  if (isLoading) {
    return (
      <div className="w-full h-[520px] md:h-[620px] rounded-3xl bg-base-300/40 animate-pulse flex items-center justify-center border border-base-300">
        <div className="text-base-content/60 font-bold flex items-center gap-2">
          <span className="loading loading-spinner loading-md text-primary"></span>
          Loading featured events...
        </div>
      </div>
    );
  }

  if (isError || !events.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full h-[350px] rounded-3xl bg-base-200 text-base-content flex flex-col items-center justify-center p-6 text-center shadow-lg border border-base-300"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Ticket size={26} />
        </div>
        <h3 className="text-2xl font-bold mb-2">No Upcoming Events Found</h3>
        <p className="text-base-content/70 text-sm max-w-sm">
          Check back soon or publish a new event from your dashboard to see it featured here!
        </p>
      </motion.div>
    );
  }

  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  const nextSlide = () => setCurrentIndex((prev) => (prev === events.length - 1 ? 0 : prev + 1));

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const child = el.firstElementChild as HTMLElement | null;
    if (!child) return;
    const step = child.offsetWidth + 16; // card width + gap-4
    const idx = Math.round(el.scrollLeft / step);
    if (idx !== mobileIndex) setMobileIndex(Math.max(0, Math.min(events.length - 1, idx)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative w-full max-w-7xl mx-auto px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
      }}
    >
      <style>{`
        @keyframes heroProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .hero-no-scrollbar::-webkit-scrollbar { display: none; }
        .hero-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* DESKTOP: smooth horizontal carousel */}
      <div className="hidden md:block relative w-full overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div
          className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {events.map((event: any, idx: number) => (
            <div key={event.id || event.eventId} className="w-full shrink-0">
              <HeroSlideItem event={event} active={idx === currentIndex} />
            </div>
          ))}
        </div>

        {events.length > 1 && (
          <>
            {/* Navigation arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all shadow-xl border border-white/10 hover:scale-110 active:scale-95"
              aria-label="Previous event"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all shadow-xl border border-white/10 hover:scale-110 active:scale-95"
              aria-label="Next event"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Slide counter */}
            <div className="absolute top-6 right-8 z-20 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold tracking-widest">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="inline-block"
                >
                  {String(currentIndex + 1).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/50"> / {String(events.length).padStart(2, '0')}</span>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-8 right-10 z-20 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
              {events.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    currentIndex === idx ? 'w-8 h-2.5 bg-primary' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Auto-play progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
              <div
                key={currentIndex}
                className="h-full bg-primary origin-left"
                style={{
                  animation: `heroProgress ${SLIDE_MS}ms linear forwards`,
                  animationPlayState: isPaused ? 'paused' : 'running',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* MOBILE: swipeable horizontal scroll with dots */}
      <div className="md:hidden">
        <div
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar hero-no-scrollbar scroll-smooth"
        >
          {events.map((event: any, idx: number) => (
            <div key={event.id || event.eventId} className="w-[88vw] shrink-0 snap-center">
              <HeroSlideItem event={event} active={idx === mobileIndex} />
            </div>
          ))}
        </div>

        {events.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {events.map((_: any, idx: number) => (
              <span
                key={idx}
                className={`block rounded-full transition-all duration-300 ${
                  mobileIndex === idx ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-base-content/25'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};