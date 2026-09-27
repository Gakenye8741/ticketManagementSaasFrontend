import { Link } from "react-router-dom";
import { 
  Store, 
  Sparkles, 
  Compass, 
  Tag, 
  Info, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  QrCode, 
  CreditCard, 
  HelpCircle, 
  FileText, 
  Lock, 
  Globe, 
  ChevronUp 
} from "lucide-react";

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-base-200/40 border-t border-base-300/60 pt-16 pb-24 lg:pb-16 mt-20 relative overflow-hidden">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Conversion / SaaS Action Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 sm:p-10 mb-16 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm backdrop-blur-md">
          <div className="space-y-2 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={12} />
              Enterprise Ticketing Infrastructure
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-base-content">
              Ready to Scale Your Next Event?
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70 max-w-2xl">
              Deploy automated QR gate pass scanning, instant M-Pesa STK push checkouts, and real-time merchant analytics built explicitly for modern creators.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <Link 
              to="/events/create" 
              className="btn btn-primary rounded-xl px-6 font-black uppercase italic tracking-wider text-xs shadow-lg shadow-primary/20 flex items-center gap-2 group"
            >
              <span>Launch Event Free</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/pricing" 
              className="btn btn-ghost border border-base-300 rounded-xl px-6 font-black uppercase italic tracking-wider text-xs hover:bg-base-200"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Value Proposition Micro-Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 pb-12 border-b border-base-300/50">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-base-100/60 border border-base-200 shadow-xs">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-base-content">Instant Payouts</h4>
              <p className="text-[11px] text-base-content/60 mt-0.5">Automated M-Pesa and card processing settlement.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-base-100/60 border border-base-200 shadow-xs">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <QrCode size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-base-content">Secure Gate Passes</h4>
              <p className="text-[11px] text-base-content/60 mt-0.5">Built-in QR scanner mobile application for gate teams.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-base-100/60 border border-base-200 shadow-xs">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-base-content">Anti-Counterfeit</h4>
              <p className="text-[11px] text-base-content/60 mt-0.5">Single-use encrypted ticket validation system.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-base-100/60 border border-base-200 shadow-xs">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-base-content">Flexible Tiers</h4>
              <p className="text-[11px] text-base-content/60 mt-0.5">VIP, regular, and early bird pricing structures.</p>
            </div>
          </div>
        </div>

        {/* Main Detailed Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-16">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-primary text-primary-content rounded-xl flex items-center justify-center font-black shadow-md shadow-primary/20 tracking-tighter">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight uppercase text-base-content leading-none">
                  TicketStream
                </span>
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase mt-0.5">
                   Event Ticketing System
                </span>
              </div>
            </Link>
            <p className="text-xs text-base-content/60 leading-relaxed max-w-sm">
              TicketStream is an advanced multi-tenant event management and ticketing platform providing organizers with high-performance digital store fronts, scanner app utilities, and comprehensive analytics.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-base-content/70">
              <div className="flex items-center gap-1.5 bg-base-100 px-3 py-1.5 rounded-xl border border-base-300">
                <Globe size={14} className="text-primary" />
                <span>Global Uptime 99.9%</span>
              </div>
              <div className="flex items-center gap-1.5 bg-base-100 px-3 py-1.5 rounded-xl border border-base-300">
                <Lock size={14} className="text-primary" />
                <span>SSL Secured</span>
              </div>
            </div>
          </div>

          {/* Product & Solutions */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Solutions</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/events" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Discover Events
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Pricing Plans
                </Link>
              </li>
              <li>
                <Link to="/events/create" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Host an Event
                </Link>
              </li>
              <li>
                <Link to="/tickets" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Ticket Wallet
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Support */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Resources</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Help & Support
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> About Company
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> API Documentation
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Organizer Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Compliance</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Workspace & Merchant Portal */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Merchant Portal</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/dashboard/analytics" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Store Overview
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Organizer Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span> Register Account
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar with Back to Top */}
        <div className="border-t border-base-300/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-base-content/50">
          <p>© {new Date().getFullYear()} TicketStream SaaS Platform. All rights reserved.</p>
          
          <div className="flex items-center gap-4">
            <span>Designed for high-concurrency event transactions</span>
            <button 
              onClick={scrollToTop}
              className="btn btn-ghost btn-sm btn-square rounded-xl bg-base-100 border border-base-300 text-base-content/70 hover:text-primary hover:bg-base-200 transition-all"
              title="Back to Top"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};