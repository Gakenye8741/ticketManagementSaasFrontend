import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useGetEventsByTitleQuery, useGetAllEventsQuery } from '../features/APIS/EventsApi'; // Adjust import path to your eventApi
import { Search, Calendar, MapPin, ArrowRight, Sparkles, Filter, AlertCircle } from 'lucide-react';
import { Toaster } from 'sonner';

const EventSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const navigate = useNavigate();

  // Handle live search typing debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm.trim()) {
        setSearchParams({ search: searchTerm });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, setSearchParams]);

  // Fetch events using title query if search term exists, otherwise fetch all events catalog
  const { 
    data: searchedEvents = [], 
    isLoading: isSearchLoading, 
    isError: isSearchError 
  } = useGetEventsByTitleQuery(debouncedSearch, {
    skip: !debouncedSearch.trim(),
  });

  const { 
    data: allEvents = [], 
    isLoading: isAllLoading, 
    isError: isAllError 
  } = useGetAllEventsQuery(undefined, {
    skip: Boolean(debouncedSearch.trim()),
  });

  const displayedEvents = debouncedSearch.trim() ? searchedEvents : allEvents;
  const isLoading = debouncedSearch.trim() ? isSearchLoading : isAllLoading;
  const isError = debouncedSearch.trim() ? isSearchError : isAllError;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ search: searchTerm });
    }
  };

  return (
    <div className="min-h-screen w-full bg-base-100 font-sans selection:bg-primary selection:text-primary-content flex flex-col">
      <Toaster richColors position="top-right" />
      <Navbar />

      {/* Hero Section & Search Header */}
      <div className="relative pt-28 pb-16 px-6 lg:px-16 bg-gradient-to-br from-primary/10 via-base-200/50 to-base-100 border-b border-base-300 overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black uppercase tracking-[0.3em] shadow-sm">
            <Sparkles size={14} className="animate-spin" /> Event Discovery Engine
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight text-base-content leading-tight">
            Find Your Next <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-8">Experience</span>
          </h1>
          
          <p className="text-sm sm:text-base font-medium text-base-content/70 max-w-2xl mx-auto">
            Search through live concerts, expos, galas, and tech summits. Click any event to check full details and secure your passes.
          </p>

          {/* Interactive Search Input Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="flex items-center bg-base-100/90 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] border-2 border-base-300 focus-within:border-primary shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-2 transition-all max-w-2xl mx-auto">
              <div className="pl-4 text-primary">
                <Search size={22} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events by title, keyword, or show name..."
                className="input w-full bg-transparent border-none focus:outline-none font-bold text-base-content text-sm sm:text-base h-12"
              />
              <button
                type="submit"
                className="btn btn-primary rounded-xl sm:rounded-2xl px-6 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/25 shrink-0"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content Catalog Grid */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-8 py-12">
        
        {/* Section Status & Count Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-base-content">
              {debouncedSearch ? `Search Results for "${debouncedSearch}"` : "All Available Events"}
            </h2>
          </div>
          <span className="badge badge-neutral font-bold text-xs">
            {isLoading ? "Searching..." : `${displayedEvents.length} Events Found`}
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-xs font-bold uppercase tracking-widest text-base-content/60 animate-pulse">
              Loading amazing events for you...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="p-8 rounded-3xl bg-error/10 border border-error/30 text-error flex items-center gap-4 max-w-lg mx-auto my-12">
            <AlertCircle size={32} className="shrink-0" />
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Failed to load events</h3>
              <p className="text-xs font-medium opacity-90">Please check your network connection or server status and try again.</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && displayedEvents.length === 0 && (
          <div className="text-center py-24 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-base-200 flex items-center justify-center mx-auto text-base-content/40 shadow-inner">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-black italic">No events found</h3>
            <p className="text-xs font-medium text-base-content/60">
              We couldn't find any events matching your search criteria. Try searching with different keywords or browse our catalog.
            </p>
            <button 
              onClick={() => setSearchTerm('')} 
              className="btn btn-sm btn-outline btn-primary rounded-xl font-bold uppercase tracking-wider mt-2"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !isError && displayedEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedEvents.map((event: any) => (
              <div 
                key={event.eventId || event.id} 
                className="card bg-base-200/60 backdrop-blur-xl border border-base-300 rounded-[2rem] overflow-hidden hover:border-primary/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col group"
              >
                {/* Event Image Banner / Header */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-base-300">
                  <img
                    src={event.bannerUrl || event.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-base-300/80 via-transparent to-transparent" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="badge badge-primary font-black uppercase text-[10px] tracking-widest shadow-md">
                      {event.category || event.eventType || "General"}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-2.5">
                    <h3 className="text-xl font-black italic tracking-tight text-base-content group-hover:text-primary transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    
                    <p className="text-xs font-medium text-base-content/70 line-clamp-2 leading-relaxed">
                      {event.description || "Join us for an incredible experience filled with engaging activities, networking, and unforgettable moments."}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-base-300/60">
                    <div className="flex items-center gap-2 text-xs font-bold text-base-content/80">
                      <Calendar size={14} className="text-primary shrink-0" />
                      <span>{event.date ? new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Upcoming Date"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-base-content/80">
                      <MapPin size={14} className="text-primary shrink-0" />
                      <span className="truncate">{event.location || event.venue || "Virtual / Physical Venue"}</span>
                    </div>

                    {/* Action Button linking directly to Event Slug detail page */}
                    <Link
                      to={`/events/${event.slug}`}
                      className="btn btn-primary w-full rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-lg shadow-primary/20 hover:shadow-primary/40 gap-2 mt-2"
                    >
                      View Event & Book <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default EventSearchPage;