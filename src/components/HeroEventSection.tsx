import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { MapPin, ArrowRight, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { useGetPrimaryMediaByEventIdQuery } from '../features/APIS/mediaApi';
import { useGetTicketTypesByEventIdQuery } from '../features/APIS/ticketsType.Api';
import { useGetUpcomingEventsQuery } from '../features/APIS/EventsApi';

const SLIDE_MS = 5000;
const FONT = "[font-family:Sora,ui-sans-serif,system-ui,sans-serif]";
const EASE = [0.22, 1, 0.36, 1] as const;
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop';

const contentVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

// ---------- helpers ----------
const getDate = (event: any): Date | null => {
  const raw = event.date || event.startDate;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};

const getVenue = (event: any): string =>
  event.venue?.name
    ? `${event.venue.name}${event.venue?.address ? `, ${event.venue.address}` : ''}`
    : event.location || 'Venue to be announced';

const getId = (event: any) => event.id || event.eventId;

// ---------- one slide ----------
const HeroSlideItem: React.FC<{ event: any; active: boolean }> = ({ event, active }) => {
  const eventId = getId(event);
  const { data: mediaData } = useGetPrimaryMediaByEventIdQuery(eventId);
  const { data: ticketTypesResponse } = useGetTicketTypesByEventIdQuery(eventId);

  const imageUrl =
    mediaData?.url || mediaData?.data?.url || event.imageUrl || event.bannerUrl || FALLBACK_IMG;

  const ticketTypes = Array.isArray(ticketTypesResponse) ? ticketTypesResponse : ticketTypesResponse?.data || [];
  const startingPrice =
    ticketTypes.length > 0 ? Math.min(...ticketTypes.map((t: any) => Number(t.price || 0))) : event.ticketPrice;

  const date = getDate(event);

  return (
    <div className="relative w-full h-[460px] md:h-[560px] rounded-3xl overflow-hidden flex flex-col justify-end bg-black">
      <motion.img
        src={imageUrl}
        alt={event.title}
        loading="lazy"
        animate={{ scale: active ? 1.08 : 1 }}
        transition={{ duration: active ? 7 : 0.8, ease: 'easeOut' }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Top-left badges */}
      <div className="absolute top-5 left-5 md:top-7 md:left-7 z-10 flex flex-wrap items-center gap-2">
        <span className="px-3.5 py-1.5 text-sm font-semibold text-primary-content bg-primary rounded-full">
          {event.category || 'Featured event'}
        </span>
        {startingPrice !== undefined && startingPrice !== null && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20">
            <Ticket size={14} />
            {Number(startingPrice) === 0 ? 'Free entry' : `From KES ${Number(startingPrice).toLocaleString()}`}
          </span>
        )}
      </div>

      {/* Content */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate={active ? 'show' : 'hidden'}
        className="relative z-10 p-5 md:p-10 flex items-end gap-5 md:gap-7"
      >
        {date && (
          <motion.div
            variants={itemVariants}
            className="hidden sm:flex shrink-0 flex-col items-center justify-center w-20 h-24 rounded-2xl bg-white text-gray-900"
          >
            <span className="text-sm font-semibold text-primary">
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-4xl font-bold leading-none tabular-nums">{date.getDate()}</span>
          </motion.div>
        )}

        <div className="min-w-0 space-y-4">
          <motion.h3
            variants={itemVariants}
            className={`${FONT} text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.05] line-clamp-2`}
          >
            {event.title}
          </motion.h3>

          <motion.p variants={itemVariants} className="flex items-center gap-2 text-base md:text-lg text-white/85">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <span className="line-clamp-1">{getVenue(event)}</span>
            {date && (
              <span className="sm:hidden text-white/70 shrink-0">
                · {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </motion.p>

          <motion.div variants={itemVariants}>
            <Link
              to={`/events/${event.slug || eventId}`}
              className="btn btn-primary btn-lg rounded-xl text-base gap-2"
            >
              Get tickets
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// ---------- section ----------
export const HeroEventSection: React.FC = () => {
  const { data: eventsResponse, isLoading, isError } = useGetUpcomingEventsQuery({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const rawEvents = Array.isArray(eventsResponse) ? eventsResponse : eventsResponse?.data || [];
  const events = rawEvents.slice(0, 10);

  // Auto-rotate (pauses on hover)
  useEffect(() => {
    if (events.length <= 1 || isPaused) return;
    const t = setInterval(() => setCurrentIndex((p) => (p === events.length - 1 ? 0 : p + 1)), SLIDE_MS);
    return () => clearInterval(t);
  }, [events.length, isPaused, currentIndex]);

  // Keep the active item visible in the "Up next" list
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.children[currentIndex] as HTMLElement | undefined;
    if (rail && el) rail.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
  }, [currentIndex]);

  const Header = (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="space-y-2">
        <h2 className={`${FONT} text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08]`}>Upcoming events</h2>
        <p className="text-lg text-white/70">Fresh events happening across Kenya.</p>
      </div>
      <Link to="/events" className="btn rounded-xl text-base gap-2 bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20">
        View all events
        <ArrowRight size={18} />
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {Header}
        <div className="w-full h-[460px] md:h-[560px] rounded-3xl bg-white/10 animate-pulse flex items-center justify-center">
          <span className="flex items-center gap-3 text-base font-medium text-white/65">
            <span className="loading loading-spinner loading-md text-primary" />
            Loading events...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !events.length) {
    return (
      <div>
        {Header}
        <div className="w-full min-h-[320px] rounded-3xl bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-content flex items-center justify-center mb-4">
            <Ticket size={26} />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No upcoming events yet</h3>
          <p className="text-base text-white/70 max-w-sm">
            Check back soon, or publish your own event from your dashboard and it will appear here.
          </p>
        </div>
      </div>
    );
  }

  const prev = () => setCurrentIndex((p) => (p === 0 ? events.length - 1 : p - 1));
  const next = () => setCurrentIndex((p) => (p === events.length - 1 ? 0 : p + 1));

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const child = el.firstElementChild as HTMLElement | null;
    if (!child) return;
    const idx = Math.round(el.scrollLeft / (child.offsetWidth + 16));
    if (idx !== mobileIndex) setMobileIndex(Math.max(0, Math.min(events.length - 1, idx)));
  };

  const arrowCls =
    'p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md border border-white/20 transition-colors';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
      }}
      className="outline-none"
    >
      <style>{`
        @keyframes heroProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .hero-no-scrollbar::-webkit-scrollbar { display: none; }
        .hero-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {Header}

      {/* DESKTOP: big carousel + "Up next" list */}
      <div className="hidden md:grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="relative overflow-hidden rounded-3xl">
          <div
            className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {events.map((event: any, idx: number) => (
              <div key={getId(event)} className="w-full shrink-0">
                <HeroSlideItem event={event} active={idx === currentIndex} />
              </div>
            ))}
          </div>

          {events.length > 1 && (
            <div className="absolute top-5 right-5 md:top-7 md:right-7 z-20 flex items-center gap-2">
              <button onClick={prev} className={arrowCls} aria-label="Previous event">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={next} className={arrowCls} aria-label="Next event">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* dots (tablet only; large screens use the list) */}
          {events.length > 1 && (
            <div className="lg:hidden absolute bottom-5 right-5 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-full px-3 py-2">
              {events.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to event ${idx + 1}`}
                  className={`rounded-full transition-all ${
                    currentIndex === idx ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/50 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Up next list (large screens) */}
        <aside className="hidden lg:flex flex-col h-[560px] rounded-3xl bg-white/[0.06] border border-white/10 p-4">
          <h3 className="text-lg font-semibold px-2 pb-3">
            Up next <span className="text-white/50 font-normal">({events.length})</span>
          </h3>
          <div ref={railRef} className="relative flex-1 overflow-y-auto hero-no-scrollbar space-y-2">
            {events.map((event: any, idx: number) => {
              const d = getDate(event);
              const isActive = idx === currentIndex;
              return (
                <button
                  key={getId(event)}
                  onClick={() => setCurrentIndex(idx)}
                  aria-current={isActive}
                  className={`relative w-full text-left flex items-center gap-4 p-3 rounded-2xl overflow-hidden transition-colors ${
                    isActive ? 'bg-white/15 shadow-md' : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                      isActive ? 'bg-primary text-primary-content' : 'bg-white/10'
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {d ? d.toLocaleDateString(undefined, { month: 'short' }) : 'TBD'}
                    </span>
                    <span className="text-xl font-bold leading-none tabular-nums">{d ? d.getDate() : '–'}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold line-clamp-1">{event.title}</span>
                    <span className="block text-sm text-white/65 line-clamp-1">{getVenue(event)}</span>
                  </span>

                  {isActive && events.length > 1 && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary/15">
                      <span
                        key={currentIndex}
                        className="block h-full bg-primary origin-left"
                        style={{
                          animation: `heroProgress ${SLIDE_MS}ms linear forwards`,
                          animationPlayState: isPaused ? 'paused' : 'running',
                        }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* MOBILE: swipeable cards */}
      <div className="md:hidden">
        <div
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 hero-no-scrollbar scroll-smooth"
        >
          {events.map((event: any, idx: number) => (
            <div key={getId(event)} className="w-[85vw] shrink-0 snap-center">
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
                  mobileIndex === idx ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};