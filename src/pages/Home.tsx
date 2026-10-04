import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  QrCode, 
  Zap, 
  Calendar, 
  MapPin, 
  Rocket
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { HeroEventSection } from "../components/HeroEventSection"; // <-- Imported new Hero component
import { useGetAllEventsQuery } from "../features/APIS/EventsApi";

// Custom Hook for smooth animated counter numbers
const useCountUp = (end: number, duration: number = 2000, prefix: string = "", suffix: string = "") => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return `${prefix}${count.toLocaleString()}${suffix}`;
};

export const Home = () => {
  // Fetch live events from API
  const { data: eventsResponse, isLoading } = useGetAllEventsQuery(undefined);
  
  // Extract latest 3 events safely from the backend data array
  const eventsList = eventsResponse?.data || [];
  const latestEvents = eventsList.slice(0, 3);

  // Animated stats values for our traction metrics
  const animatedVolume = useCountUp(5, 2000, "KES ", "M+");
  const animatedTickets = useCountUp(10, 2000, "", "K+");
  const animatedEvents = useCountUp(50, 2000, "", "+");
  const animatedSuccess = useCountUp(100, 2000, "", "%");

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans">
      
      {/* Navigation Bar */}
      <Navbar />

      <main>
        {/* --- DYNAMIC HERO EVENT SECTION WITH SLUG & MEDIA API INTEGRATION --- */}
        <section className="pt-28 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
                       <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Discover top events & shows
            </h1>
            <p className="text-base text-base-content/70">
              Explore featured upcoming events, get your digital tickets instantly with M-Pesa or Stripe, and experience seamless check-ins.
            </p>
          </div>

          {/* Render the dynamic Hero Carousel Component */}
          <HeroEventSection />
        </section>

        {/* --- ANIMATED TRACTION STATS BAR --- */}
        <section className="border-y border-base-300/60 bg-base-200/40 py-12 my-12 shadow-inner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                Platform metrics & activity
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight">{animatedVolume}</h3>
                <p className="text-sm font-semibold text-base-content/70">Processed volume</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight">{animatedTickets}</h3>
                <p className="text-sm font-semibold text-base-content/70">Tickets issued</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight">{animatedEvents}</h3>
                <p className="text-sm font-semibold text-base-content/70">Successful events</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight">{animatedSuccess}</h3>
                <p className="text-sm font-semibold text-base-content/70">Gateway uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- DETAILED FEATURES SECTION --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Simple & powerful features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything you need to run your event</h2>
            <p className="text-base text-base-content/70">We built reliable tools that handle flexible payments, tickets, and gate entry without any technical friction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 shadow-sm space-y-4 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold">M-Pesa & Stripe Checkout</h3>
              <p className="text-base text-base-content/70 leading-relaxed">
                Attendees can pay seamlessly using automated M-Pesa STK pushes or global debit and credit cards via Stripe. Tickets are generated instantly upon confirmation.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 shadow-sm space-y-4 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <QrCode size={24} />
              </div>
              <h3 className="text-xl font-bold">Fast QR code gate scanning</h3>
              <p className="text-base text-base-content/70 leading-relaxed">
                Use your smartphone camera or scanner app to validate tickets at the event entrance. Keep lines moving rapidly while preventing fraudulent entries.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-base-200/50 border border-base-300 shadow-sm space-y-4 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold">Custom event dashboards</h3>
              <p className="text-base text-base-content/70 leading-relaxed">
                Publish a professional profile for your event in under two minutes. Track real-time ticket sales, attendance metrics, and revenue analytics.
              </p>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS STEP-BY-STEP --- */}
        <section className="bg-base-200/50 border-y border-base-300/60 py-20 mb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Easy process</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How it works in 3 simple steps</h2>
              <p className="text-base text-base-content/70">No subscription fees or complicated setup. We only take a transparent commission when you successfully sell tickets.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-base-100 border border-base-300 rounded-3xl p-8 space-y-4 shadow-sm text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-extrabold text-xl">
                  1
                </div>
                <h3 className="text-xl font-bold">Create your event</h3>
                <p className="text-base text-base-content/70 leading-relaxed">
                  Sign up in seconds, add your event schedule, venue details, ticket tiers, and publish your custom page free of charge.
                </p>
              </div>

              <div className="bg-base-100 border border-base-300 rounded-3xl p-8 space-y-4 shadow-sm text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-extrabold text-xl">
                  2
                </div>
                <h3 className="text-xl font-bold">Share link & collect funds</h3>
                <p className="text-base text-base-content/70 leading-relaxed">
                  Share your link with your audience. Attendees pay securely through M-Pesa or Stripe, and digital tickets are dispatched instantly to their wallets.
                </p>
              </div>

              <div className="bg-base-100 border border-base-300 rounded-3xl p-8 space-y-4 shadow-sm text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-extrabold text-xl">
                  3
                </div>
                <h3 className="text-xl font-bold">Manage gate entry</h3>
                <p className="text-base text-base-content/70 leading-relaxed">
                  Use our scanner application at your venue entrance to verify tickets smoothly while your earnings settle directly into your account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- DETAILED TESTIMONIALS SECTION --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Community trust</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Loved by Kenyan event organizers</h2>
            <p className="text-base text-base-content/70">See what promoters and creators are saying about using our platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-base-200/40 border border-base-300 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-1 text-warning">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-base">★</span>
                ))}
              </div>
              <p className="text-base text-base-content/80 leading-relaxed italic">
                "Having both M-Pesa and Stripe ensures all our attendees can buy tickets easily, whether local or international. Absolutely seamless!"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-base-300/60">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  BK
                </div>
                <div>
                  <h4 className="text-sm font-bold">Brian K.</h4>
                  <p className="text-xs text-base-content/60">Event Organizer</p>
                </div>
              </div>
            </div>

            <div className="bg-base-200/40 border border-base-300 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-1 text-warning">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-base">★</span>
                ))}
              </div>
              <p className="text-base text-base-content/80 leading-relaxed italic">
                "No monthly subscription charges or hidden fees. Being able to list my events for free makes starting out completely risk-free."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-base-300/60">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  MW
                </div>
                <div>
                  <h4 className="text-sm font-bold">Mercy W.</h4>
                  <p className="text-xs text-base-content/60">Community Host</p>
                </div>
              </div>
            </div>

            <div className="bg-base-200/40 border border-base-300 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-1 text-warning">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-base">★</span>
                ))}
              </div>
              <p className="text-base text-base-content/80 leading-relaxed italic">
                "The automated commission model is brilliant for concert promoters. TicketStream handles the payments reliably every single time."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-base-300/60">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  JN
                </div>
                <div>
                  <h4 className="text-sm font-bold">James N.</h4>
                  <p className="text-xs text-base-content/60">Concert Promoter</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- LIVE EVENTS CATALOG GRID --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Discover gigs</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">All upcoming events & shows</h2>
            </div>
            <Link to="/events" className="btn btn-ghost btn-sm text-sm font-bold text-primary flex items-center gap-1 hover:bg-primary/10">
              <span>View all events</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-base-200/60 border border-base-300 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : latestEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestEvents.map((event: any) => (
                <div key={event.eventId || event.id} className="bg-base-200/60 border border-base-300 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="h-48 bg-base-300 relative flex items-center justify-center overflow-hidden">
                      {event.bannerUrl || event.imageUrl ? (
                        <img src={event.bannerUrl || event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <Calendar className="w-12 h-12 text-base-content/20" />
                      )}
                      <span className="absolute top-3 left-3 px-3.5 py-1 rounded-full bg-base-100/90 text-base-content text-xs font-bold shadow-xs">
                        {event.category}
                      </span>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex items-center justify-between text-sm font-bold text-primary">
                        <span>{new Date(event.date || event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="px-3 py-1 rounded-lg bg-primary/10">
                          {Number(event.ticketPrice) === 0 ? "Free" : `KES ${Number(event.ticketPrice || 0).toLocaleString()}`}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-base-content/70">
                        <MapPin size={16} className="shrink-0" />
                        <span className="line-clamp-1">{event.venue?.name ? `${event.venue.name}, ${event.venue.address}` : event.location || "Venue TBA"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="pt-4 border-t border-base-300/60 flex items-center justify-between">
                      <span className="text-xs font-medium text-base-content/60">TicketStream Verified</span>
                      <Link to={`/events/${event.slug || event.eventId}`} className="btn btn-sm btn-primary rounded-xl font-bold">
                        Get Ticket
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-base-200/40 rounded-3xl border border-base-300">
              <p className="text-base text-base-content/70">No upcoming events available at the moment. Check back soon!</p>
            </div>
          )}
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Got questions?</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-2xl">
              <input type="radio" name="faq-accordion" defaultChecked /> 
              <div className="collapse-title text-base font-bold">
                How do I start selling tickets on TicketStream?
              </div>
              <div className="collapse-content text-sm text-base-content/70 leading-relaxed">
                <p>Simply sign up for a free account, fill in your event details, set your ticket tiers, and publish your page instantly to get your shareable link.</p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-2xl">
              <input type="radio" name="faq-accordion" /> 
              <div className="collapse-title text-base font-bold">
                What payment methods are supported for buyers?
              </div>
              <div className="collapse-content text-sm text-base-content/70 leading-relaxed">
                <p>TicketStream fully supports automated M-Pesa STK push payments for instant local checkouts as well as Stripe for global card transactions.</p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-2xl">
              <input type="radio" name="faq-accordion" /> 
              <div className="collapse-title text-base font-bold">
                Are there any upfront listing fees?
              </div>
              <div className="collapse-content text-sm text-base-content/70 leading-relaxed">
                <p>No! Listing your event on TicketStream is completely free. We only apply a small commission percentage when a ticket is successfully sold.</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CALL TO ACTION BANNER --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-base-200 border border-primary/30 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-lg">
            <div className="w-14 h-14 bg-primary text-primary-content rounded-2xl mx-auto flex items-center justify-center font-bold shadow-md">
              <Rocket className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to elevate your event ticketing?
            </h2>
            <p className="text-base text-base-content/80 max-w-xl mx-auto leading-relaxed">
              Join organizers using TicketStream for zero upfront costs, automated M-Pesa and Stripe payments, and streamlined gate entry.
            </p>
            <div className="pt-2 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register" className="btn btn-primary rounded-xl px-8 py-4 font-bold text-base shadow-md">
                Get started free
              </Link>
              <Link to="/contact" className="btn btn-ghost border border-base-300 rounded-xl px-8 py-4 font-bold text-base">
                Contact our team
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Component */}
      <Footer />

    </div>
  );
};