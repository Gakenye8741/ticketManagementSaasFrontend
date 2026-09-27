import React from "react";
// Swiper Imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

// Icons
import { MapPin, Calendar, Sparkles } from "lucide-react";

import koroga from "../../../src/assets/event1.png";
import jazz from "../../../src/assets/event1.jpg";
import blankets from "../../../src/assets/wine.jpg";
import cakefest from "../../../src/assets/cake.jpg";
import restaurantweek from "../../../src/assets/event3.jpg";
import streetfood from "../../../src/assets/street.jpeg";

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  image: string;
}

const popularEvents: Event[] = [
  { id: "1", title: "Koroga Festival", location: "Nairobi Arboretum", date: "July 2024", image: koroga },
  { id: "2", title: "Nairobi Jazz Festival", location: "Uhuru Park, Nairobi", date: "May 2024", image: jazz },
  { id: "3", title: "Blankets & Wine", location: "Loresho Gardens, Nairobi", date: "June 2025", image: blankets },
  { id: "4", title: "Cake Festival", location: "Nairobi Arboretum", date: "October 2025", image: cakefest },
  { id: "5", title: "Nairobi Restaurant Week", location: "Various Restaurants", date: "February 2025", image: restaurantweek },
  { id: "6", title: "Street Food Festival", location: "Jamhuri Showgrounds", date: "March 2025", image: streetfood },
];

export const PopularEvents: React.FC = () => {
  return (
    <section className="relative py-2 px-6 overflow-hidden bg-transparent">
      {/* Background Glass Overlay for the whole section */}
      <div className="absolute inset-0 bg-base-100/10 backdrop-blur-3xl z-0" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-20 text-center">
          <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-primary/20 backdrop-blur-md">
            <Sparkles className="w-3 h-3 inline-block mr-2" />
            Our Legacy
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-base-content leading-none">
            Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Fame</span>
          </h2>
          <p className="text-base-content/50 mt-6 max-w-xl font-medium italic">
            Powering Kenya’s most iconic festivals and live shows—shaping the future of event management.
          </p>
        </div>

        {/* MOBILE CAROUSEL: Visible only on small screens */}
        <div className="lg:hidden">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1.2}
            centeredSlides={true}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            pagination={{ clickable: true, dynamicBullets: true }}
            className="pb-16 !overflow-visible"
          >
            {popularEvents.map((event) => (
              <SwiperSlide key={event.id}>
                <EventGlassCard event={event} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* DESKTOP GRID: Visible from lg screens up */}
        <div className="hidden lg:grid grid-cols-3 gap-10">
          {popularEvents.map((event) => (
            <EventGlassCard key={event.id} event={event} />
          ))}
        </div>
      </div>

      {/* Custom Swiper Bullet Styling */}
      <style>{`
        .swiper-pagination-bullet { background: hsl(var(--p)) !important; opacity: 0.2; }
        .swiper-pagination-bullet-active { opacity: 1; width: 24px; border-radius: 4px; transition: all 0.3s; }
      `}</style>
    </section>
  );
};

// Reusable Sub-Component for the Glass Card
const EventGlassCard = ({ event }: { event: Event }) => (
  <div className="group relative rounded-[2.5rem] p-[1px] bg-gradient-to-b from-white/20 to-transparent hover:from-primary/40 transition-all duration-700 h-full">
    <div className="card h-full bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 group-hover:bg-white/10 dark:group-hover:bg-black/40">
      
      <figure className="relative h-56 overflow-hidden m-3 rounded-[2rem]">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </figure>

      <div className="card-body p-8 pt-2">
        <h3 className="text-2xl font-black tracking-tighter uppercase italic text-base-content group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-2 text-base-content/60">
            <MapPin size={14} className="text-primary" />
            <span className="text-xs font-bold truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-base-content/40">
            <Calendar size={14} className="text-secondary" />
            <span className="text-[10px] font-black uppercase tracking-widest">{event.date}</span>
          </div>
        </div>

        {/* Decorative element */}
        <div className="mt-6 w-12 h-1 bg-primary/20 rounded-full group-hover:w-full group-hover:bg-primary transition-all duration-700" />
      </div>
    </div>
  </div>
);