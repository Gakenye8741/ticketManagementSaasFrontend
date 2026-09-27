import '../../animations/TrueFocus.css';
import { useSelector } from 'react-redux';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Puff } from 'react-loader-spinner';
import Typed from 'typed.js';
import type { RootState } from '../../App/store';
import { eventApi } from '../../features/APIS/EventsApi';
import TrueFocus from '../../animations/TextFocus';
import { Search, CalendarX, Sparkles, LayoutDashboard, Ticket as TicketIcon, ChevronRight, Clock } from 'lucide-react';

const backgroundImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1920&q=80';

function App() {
  const user = useSelector((state: RootState) => state.auth.user);
  const firstName = user?.firstName ?? 'User';
  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 15) return 'Good Afternoon';
    if (h < 18) return 'Good Evening';
    return 'Hey';
  })();

  const [search, setSearch] = useState('');

  const {
    data: events = [],
    isLoading,
  } = eventApi.useGetAllEventsQuery(undefined);

  const getEventId = (e: any) => e.eventId ?? e.id ?? e._id;

  const getEventDate = (e: any): Date => {
    const dateLike: string | number | undefined =
      e.date ?? e.startDate ?? e.eventDate ?? e.event_date ?? e.start_date;
    const d = new Date(dateLike ?? 0);
    return isNaN(d.valueOf()) ? new Date(0) : d;
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((evt: any) => getEventDate(evt) >= now)
      .filter((evt: any) =>
        search.trim()
          ? evt.title?.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort((a: any, b: any) => getEventDate(a).getTime() - getEventDate(b).getTime())
      .slice(0, 5);
  }, [events, search]);

  const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-primary/30 text-primary font-black rounded-sm px-0.5">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const typedNameRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!typedNameRef.current) return;
    const typed = new Typed(typedNameRef.current, {
      strings: [firstName],
      typeSpeed: 100,
      backSpeed: 1000,
      showCursor: true,
      cursorChar: '📍',
      loop: false,
    });
    return () => typed.destroy();
  }, [firstName]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-base-100 text-base-content overflow-x-hidden font-sans">
      
      {/* --- Background Stack --- */}
      <div className="fixed inset-0 bg-cover bg-center transition-all duration-1000 z-0 scale-105 opacity-80"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="fixed inset-0 bg-black/40 mix-blend-multiply z-1" />
      <div className="fixed inset-0 bg-gradient-to-b from-base-100/20 via-base-100/80 to-base-100 z-10" />

      <div className="relative z-20 w-full max-w-7xl px-4 sm:px-6 pt-12 pb-24 flex flex-col items-center">
        
        {/* Branding Section */}
        <div className="mb-12 w-full flex justify-center transform hover:scale-105 transition-transform duration-500">
          <TrueFocus
            sentence={isAdmin ? "TicketStream 🎫 Admin Command Center" : "TicketStream 🎫 Campus Life & Event Gateway"}
            manualMode={false}
            blurAmount={3}
            borderColor="hsl(var(--p))" 
            animationDuration={2}
            pauseBetweenAnimations={2}
          />
        </div>

        {/* --- Main Dashboard --- */}
        <div className="w-full bg-base-200/30 backdrop-blur-[60px] rounded-[2.5rem] sm:rounded-[4rem] p-[2px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] border border-primary/20 shadow-primary/10">
          <div className="bg-base-200/80 rounded-[2.4rem] sm:rounded-[3.9rem] p-6 sm:p-12 md:p-16 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            
            {/* Left: Identity & Greeting */}
            <div className="w-full flex-1 text-left space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md bg-primary/10 text-primary border-primary/20">
                  <Sparkles size={12} className="animate-pulse" />
                  {isAdmin ? 'System Administrator' : 'Verified Campus User'}
                </div>
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[0.85] italic">
                  {greeting},<br />
                  <span ref={typedNameRef} className="text-primary" />
                </h1>
              </div>

              <p className="text-lg md:text-xl leading-relaxed text-base-content/70 max-w-md font-medium border-l-4 border-primary/50 pl-6 italic">
                {isAdmin 
                  ? "System integrity confirmed. Manage live listings and monitor campus engagement metrics below."
                  : "Find your next core memory. Browse the latest festivals and campus gatherings."}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to={isAdmin ? "/AdminDashBoard/analytics" : "/events"}
                  className="btn btn-primary btn-lg px-12 rounded-2xl font-black shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all group border-none h-16 uppercase tracking-[0.3em] text-[10px]">
                  {isAdmin ? 'Manage Events' : 'Explore Feed'}
                  <Search size={18} className="ml-2 group-hover:rotate-12 transition-transform" />
                </Link>
                
                <Link to={isAdmin ? "/admin/dashboard" : "/dashboard/MyTickets"} 
                  className="btn btn-ghost btn-lg bg-base-100/20 hover:bg-base-100/40 border-base-300 rounded-2xl font-bold px-10 transition-all backdrop-blur-sm h-16 uppercase tracking-[0.3em] text-[10px]">
                  {isAdmin ? <LayoutDashboard size={18} className="mr-2"/> : <TicketIcon size={18} className="mr-2"/>}
                  {isAdmin ? 'Admin Panel' : 'My Passes'}
                </Link>
              </div>
            </div>

            {/* Right: Search & Event Feed */}
            <div className="w-full flex-1 space-y-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-[2rem] blur opacity-20 group-focus-within:opacity-100 transition duration-1000"></div>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-base-content/40" size={24} />
                  <input
                    type="text"
                    placeholder={isAdmin ? "Query event records..." : "Search festivals, tech, arts..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input h-16 sm:h-20 w-full bg-base-100/40 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-white/5 focus:border-primary transition-all text-lg sm:text-xl font-bold pl-16 pr-8 backdrop-blur-xl"
                  />
                </div>
              </div>

              {/* Feed Container */}
              <div className="bg-black/10 dark:bg-white/5 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 border border-white/10 min-h-[450px] shadow-[inset_0_0_50px_rgba(0,0,0,0.2)] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-primary">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    {isAdmin ? 'Database Records' : 'Live Campus Pulse'}
                  </h2>
                  <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold opacity-30 uppercase tracking-widest">
                    <Clock size={10} />
                    Auto-Refreshing
                  </div>
                </div>

                <div className="flex-grow relative z-10">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-72">
                      <Puff height={60} width={60} color="hsl(var(--p))" />
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 animate-pulse">Connecting to Stream...</p>
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    <ul className="space-y-5">
                      {filteredEvents.map((evt: any, idx: number) => {
                        const eventId = getEventId(evt);
                        const eventDate = getEventDate(evt);
                        return (
                          <li key={eventId} className="group animate-fadeInUp" style={{ animationDelay: `${idx * 100}ms` }}>
                            <Link
                              to={`/events/${eventId}`}
                              className="flex justify-between items-center p-5 sm:p-6 bg-base-100/40 hover:bg-base-100/95 rounded-[1.8rem] transition-all duration-500 border border-white/5 hover:border-primary/40 group-hover:scale-[1.02] shadow-sm hover:shadow-primary/10"
                            >
                              <div className="flex items-center gap-5">
                                {/* Stylized Date Badge */}
                                <div className="hidden xs:flex flex-col items-center justify-center min-w-[55px] h-[55px] bg-primary/10 rounded-2xl border border-primary/20 group-hover:bg-primary group-hover:text-primary-content transition-colors duration-500">
                                  <span className="text-[10px] font-black uppercase leading-none">
                                    {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                                  </span>
                                  <span className="text-xl font-black leading-none">
                                    {eventDate.getDate()}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-lg sm:text-2xl group-hover:text-primary transition-colors tracking-tighter leading-tight">
                                    <HighlightText text={evt.title} highlight={search} />
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] uppercase font-black text-base-content/40 tracking-widest">
                                      {isAdmin ? `UID: ${eventId.toString().slice(0, 12)}` : 'Entry Confirmed'}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-base-content/20" />
                                    <span className="text-[9px] uppercase font-black text-primary/60 tracking-widest">
                                      Available Now
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-500 bg-white/5 text-primary group-hover:bg-primary group-hover:text-white group-hover:rotate-[-45deg] shadow-inner border border-white/5 group-hover:border-transparent">
                                  <ChevronRight size={22} strokeWidth={3} />
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-72 opacity-40 text-center px-4">
                      <div className="relative mb-6">
                        <CalendarX size={60} strokeWidth={1} className="text-primary/50" />
                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse -z-10 rounded-full" />
                      </div>
                      <p className="text-xl font-black uppercase tracking-tighter italic">
                        {search ? `No results for "${search}"` : "The stage is quiet..."}
                      </p>
                      <p className="text-xs font-bold opacity-60 mt-1 uppercase tracking-widest">Awaiting the next signal...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;