import React from "react";
import { 
  Ticket, 
  Smartphone, 
  QrCode, 
  Zap, 
  Users, 
  Building2, 
  ArrowRight, 
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content relative overflow-hidden">
      <Navbar />

      {/* Background Glow Accents (Blue theme) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full space-y-20 relative z-10">
        
        {/* ========================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================= */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-8 sm:pt-12">
         
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
            Simplifying Event Ticketing & <span className="text-primary">Gate Admissions</span>
          </h1>

          <p className="text-base sm:text-lg text-base-content/80 font-medium leading-relaxed max-w-2xl mx-auto">
            Experience a smooth, reliable platform designed to connect event organizers with attendees—offering fast mobile check-ins, instant digital passes, and secure payments without the traditional gate queues.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/events" className="btn btn-primary rounded-2xl font-black px-8 shadow-xl shadow-primary/25 gap-2">
              Explore Active Events <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn btn-outline border-base-300 rounded-2xl font-bold px-6 hover:bg-base-200">
              Get in Touch
            </Link>
          </div>
        </section>

        {/* ========================================================= */}
        {/* QUICK STATS COUNTER BAR */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-base-300 bg-base-200/40 rounded-3xl px-4">
          <div className="text-center space-y-1 p-4">
            <p className="text-3xl sm:text-4xl font-black text-primary">99.9%</p>
            <p className="text-xs font-bold text-base-content/70">Platform Uptime</p>
          </div>
          <div className="text-center space-y-1 p-4">
            <p className="text-3xl sm:text-4xl font-black text-primary">&lt; 2s</p>
            <p className="text-xs font-bold text-base-content/70">Gate Scan Speed</p>
          </div>
          <div className="text-center space-y-1 p-4">
            <p className="text-3xl sm:text-4xl font-black text-primary">0%</p>
            <p className="text-xs font-bold text-base-content/70">Fraud & Duplication</p>
          </div>
          <div className="text-center space-y-1 p-4">
            <p className="text-3xl sm:text-4xl font-black text-primary">24/7</p>
            <p className="text-xs font-bold text-base-content/70">Reliable Support</p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* WHO WE ARE & OUR MISSION */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 bg-gradient-to-br from-base-200/90 via-base-200/50 to-base-100 border-2 border-base-300 p-8 sm:p-10 rounded-3xl shadow-xl backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
              <Users size={16} /> Who We Are & Our Story
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Eliminating Friction in <span className="text-primary">Event Admissions</span>
            </h2>
            <p className="text-sm sm:text-base text-base-content/75 leading-relaxed font-medium">
              We set out to eliminate the traditional frustrations of event ticketing—endless gate queues, lost paper receipts, manual guest lists, and complex payment reconciliations. Our platform provides a reliable digital ecosystem where event creators can launch ticketing operations in minutes while attendees enjoy zero friction from purchase to gate entry.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs space-y-1">
                <span className="text-2xl font-black text-primary">100%</span>
                <p className="text-xs font-bold text-base-content/70">Digital Gate Verification</p>
              </div>
              <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs space-y-1">
                <span className="text-2xl font-black text-primary">Instant</span>
                <p className="text-xs font-bold text-base-content/70">M-Pesa & Card Settlement</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-gradient-to-br from-base-200/90 via-base-200/50 to-base-100 border-2 border-base-300 p-8 sm:p-10 rounded-3xl shadow-xl backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
              <Sparkles size={16} /> Our Core Vision
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Creating <span className="text-primary">Unforgettable Live Moments</span>
            </h3>
            <p className="text-sm sm:text-base text-base-content/75 leading-relaxed font-medium">
              We believe that attending or hosting an event should be exciting, not stressful. By combining automated mobile payments, instant email ticket delivery, and lightning-fast QR code gate scanning, we ensure that every event runs smoothly from start to finish.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-base-content/80">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <span>Zero paperwork or manual counting required at event gates</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-base-content/80">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <span>Real-time ticket sales tracking and attendee capacity monitoring</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-base-content/80">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <span>Secure anti-fraud digital passes issued for every single ticket holder</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* HOW THE PLATFORM WORKS */}
        {/* ========================================================= */}
        <section className="space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Step-by-Step Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              How the <span className="text-primary">Platform Works</span>
            </h2>
            <p className="text-xs sm:text-sm text-base-content/70">A seamless, crystal-clear experience designed for both event organizers and attendees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Organizers Flow */}
            <div className="bg-gradient-to-br from-base-200/90 via-base-200/50 to-base-100 border-2 border-base-300 p-8 sm:p-10 rounded-3xl space-y-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-base-300 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Building2 size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">For Creators & Organizers</span>
                  <h3 className="text-xl font-black">Hosting Made Simple</h3>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">1</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Create Your Event Page</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Set up your event in minutes with custom descriptions, banner images, venue details, and precise date/time schedules.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">2</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Configure Ticket Tiers</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Set up different admission levels (such as Free, Regular, VIP, or Early Bird) with custom pricing and capacity limits.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">3</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Track Sales & Scan at Gate</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Monitor ticket sales and revenue in real-time from your dashboard, and use our mobile scanner app to verify guests instantly.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendees Flow */}
            <div className="bg-gradient-to-br from-base-200/90 via-base-200/50 to-base-100 border-2 border-base-300 p-8 sm:p-10 rounded-3xl space-y-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-base-300 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <HeartHandshake size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">For Event Attendees</span>
                  <h3 className="text-xl font-black">Seamless Purchasing & Entry</h3>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">1</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Browse & Select Passes</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Explore active campus and public events, choose your preferred ticket tier, and select the exact number of passes you need.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">2</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Instant Mobile Checkout</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Pay securely in seconds using local mobile payments (M-Pesa STK push) or global debit/credit cards (Stripe).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-xl bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0 mt-0.5 shadow-sm">3</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm">Get Pass & Skip Queues</h4>
                    <p className="text-xs text-base-content/70 leading-relaxed">Receive your secure QR-code ticket instantly on your screen and in your email. Present it at the gate for lightning-fast entry!</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* CORE PLATFORM FEATURES */}
        {/* ========================================================= */}
        <section className="space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Why Choose Our <span className="text-primary">Ecosystem?</span>
            </h2>
            <p className="text-xs sm:text-sm text-base-content/70">Built with reliability, high security, and maximum speed at its core.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Smartphone size={26} />
              </div>
              <h3 className="text-lg font-black">Instant M-Pesa & Card Pay</h3>
              <p className="text-xs text-base-content/70 leading-relaxed font-medium">
                Seamless STK push automation and global credit card rails via Stripe, ensuring instant payment confirmation and zero dropped orders.
              </p>
            </div>

            <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <QrCode size={26} />
              </div>
              <h3 className="text-lg font-black">Secure QR Gate Passes</h3>
              <p className="text-xs text-base-content/70 leading-relaxed font-medium">
                Anti-fraud digital passes verified instantly through our dedicated mobile scanner app to eliminate ticket duplication at entry points.
              </p>
            </div>

            <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Ticket size={26} />
              </div>
              <h3 className="text-lg font-black">Multi-Tier Management</h3>
              <p className="text-xs text-base-content/70 leading-relaxed font-medium">
                Full flexibility supporting free, regular, VIP, and custom ticket tiers with real-time capacity tracking and detailed attendee lists.
              </p>
            </div>

            <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Zap size={26} />
              </div>
              <h3 className="text-lg font-black">Automated Email Dispatch</h3>
              <p className="text-xs text-base-content/70 leading-relaxed font-medium">
                Instant delivery of digital tickets, payment receipts, and event gate passes straight to attendee emails immediately upon confirmation.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* FAQ SECTION */}
        {/* ========================================================= */}
        <section className="space-y-8 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Got Questions?</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-3xl">
              <input type="radio" name="about-faq-accordion" defaultChecked /> 
              <div className="collapse-title text-base font-black">How do I receive my ticket after purchasing?</div>
              <div className="collapse-content text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed">
                <p>As soon as your payment is confirmed (via M-Pesa STK push or card), your digital ticket featuring a secure QR code is displayed instantly on your screen and automatically sent straight to your email address.</p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-3xl">
              <input type="radio" name="about-faq-accordion" /> 
              <div className="collapse-title text-base font-black">Can event organizers scan tickets offline or at busy gates?</div>
              <div className="collapse-content text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed">
                <p>Yes! Our mobile scanner app is built to handle gate validations smoothly, ensuring fast entry and preventing duplicate check-ins even during peak event arrivals.</p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-3xl">
              <input type="radio" name="about-faq-accordion" /> 
              <div className="collapse-title text-base font-black">How do I set up an event as a creator?</div>
              <div className="collapse-content text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed">
                <p>Simply register your creator account, head over to your dashboard, click "Create Event," fill in your details, set up your ticket tiers, and publish your page live in under 5 minutes!</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TRUST & SECURITY HIGHLIGHT */}
        {/* ========================================================= */}
        <section className="bg-primary/5 border border-base-300 p-8 sm:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck size={16} /> Enterprise Grade Trust
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">Built for Absolute Reliability & Security</h3>
            <p className="text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed">
              Every booking is backed by idempotency keys to prevent duplicate transactions, encrypted authentication cookies, and real-time validation checks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link to="/events" className="btn btn-primary rounded-2xl font-black px-6 shadow-md">
              Browse Events
            </Link>
            <Link to="/contact" className="btn btn-outline border-base-300 rounded-2xl font-bold px-6">
              Partner With Us
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;