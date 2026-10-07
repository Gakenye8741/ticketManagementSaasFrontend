import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig, useInView, type Variants } from "framer-motion";
import { ArrowRight, QrCode, Zap, Calendar, Rocket, Star } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { HeroEventSection } from "../components/HeroEventSection";

// ======================================================
// ANIMATION PRESETS
// ======================================================

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

const stagger = (gap = 0.12, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

const viewport = { once: true, margin: "-80px" } as const;

// ======================================================
// SMALL REUSABLE PIECES
// ======================================================

/** Counts up once, only when the stats scroll into view */
const useCountUp = (end: number, active: boolean, duration = 2000, prefix = "", suffix = "") => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [end, duration, active]);

  return `${prefix}${count.toLocaleString()}${suffix}`;
};

const SectionHeading = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) => (
  <motion.div
    variants={stagger(0.1)}
    initial="hidden"
    whileInView="show"
    viewport={viewport}
    className="text-center max-w-2xl mx-auto mb-14 space-y-3"
  >
    <motion.span
      variants={fadeUp}
      className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full"
    >
      {eyebrow}
    </motion.span>
    <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold tracking-tight">
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p variants={fadeUp} className="text-base text-base-content/70">
        {subtitle}
      </motion.p>
    )}
  </motion.div>
);

/** Soft floating colour blob used as background decoration */
const GlowBlob = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    aria-hidden
    className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
    animate={{ y: [0, -28, 0], x: [0, 16, 0], scale: [1, 1.08, 1] }}
    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <motion.div variants={fadeUp} className="space-y-1">
    <h3 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight tabular-nums">
      {value}
    </h3>
    <p className="text-sm font-semibold text-base-content/70">{label}</p>
  </motion.div>
);

const FeatureCard = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -8 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="group relative p-8 rounded-3xl bg-base-200/50 border border-base-300 shadow-sm space-y-4 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-colors overflow-hidden"
  >
    <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-content group-hover:rotate-6 transition-all duration-300">
      {icon}
    </div>
    <h3 className="relative text-xl font-bold">{title}</h3>
    <p className="relative text-base text-base-content/70 leading-relaxed">{text}</p>
  </motion.div>
);

const testimonials = [
  {
    initials: "BK",
    name: "Brian K.",
    role: "Event Organizer",
    quote:
      "Having both M-Pesa and Stripe ensures all our attendees can buy tickets easily, whether local or international. Absolutely seamless!",
  },
  {
    initials: "MW",
    name: "Mercy W.",
    role: "Community Host",
    quote:
      "No monthly subscription charges or hidden fees. Being able to list my events for free makes starting out completely risk-free.",
  },
  {
    initials: "JN",
    name: "James N.",
    role: "Concert Promoter",
    quote:
      "The automated commission model is brilliant for concert promoters. TicketStream handles the payments reliably every single time.",
  },
];

const steps = [
  {
    title: "Create your event",
    text: "Sign up in seconds, add your event schedule, venue details, ticket tiers, and publish your custom page free of charge.",
  },
  {
    title: "Share link & collect funds",
    text: "Share your link with your audience. Attendees pay securely through M-Pesa or Stripe, and digital tickets are dispatched instantly to their wallets.",
  },
  {
    title: "Manage gate entry",
    text: "Use our scanner application at your venue entrance to verify tickets smoothly while your earnings settle directly into your account.",
  },
];

const faqs = [
  {
    q: "How do I start selling tickets on TicketStream?",
    a: "Simply sign up for a free account, fill in your event details, set your ticket tiers, and publish your page instantly to get your shareable link.",
  },
  {
    q: "What payment methods are supported for buyers?",
    a: "TicketStream fully supports automated M-Pesa STK push payments for instant local checkouts as well as Stripe for global card transactions.",
  },
  {
    q: "Are there any upfront listing fees?",
    a: "No! Listing your event on TicketStream is completely free. We only apply a small commission percentage when a ticket is successfully sold.",
  },
];

// ======================================================
// PAGE
// ======================================================

export const Home = () => {
  // Stats only start counting once they scroll into view
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  const animatedVolume = useCountUp(5, statsInView, 2000, "KES ", "M+");
  const animatedTickets = useCountUp(10, statsInView, 2000, "", "K+");
  const animatedEvents = useCountUp(50, statsInView, 2000, "", "+");
  const animatedSuccess = useCountUp(100, statsInView, 2000, "", "%");

  return (
    // reducedMotion="user" automatically tones animations down for people who prefer less motion
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans overflow-x-hidden">
        {/* Navigation Bar */}
        <Navbar />

        <main>
          {/* ============================================================
              INTRO + HERO CAROUSEL
          ============================================================= */}
          <section className="relative pt-28 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Decorative background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <GlowBlob className="w-72 h-72 bg-primary/25 -top-10 -left-16" />
              <GlowBlob className="w-80 h-80 bg-primary/15 top-20 -right-20" delay={2} />
              <GlowBlob className="w-60 h-60 bg-primary/10 top-72 left-1/3" delay={4} />
            </div>

            <motion.div
              variants={stagger(0.12)}
              initial="hidden"
              animate="show"
              className="text-center max-w-3xl mx-auto mb-10 space-y-5"
            >
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Discover top <span className="text-primary">events & shows</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base sm:text-lg text-base-content/70 max-w-2xl mx-auto">
                Explore featured upcoming events, get your digital tickets instantly with M-Pesa or Stripe, and
                experience seamless check-ins.
              </motion.p>

              <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 flex-wrap pt-1">
                <Link
                  to="/events"
                  className="btn btn-primary rounded-xl px-7 font-bold shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-transform gap-2"
                >
                  Browse events
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/register"
                  className="btn btn-ghost border border-base-300 rounded-xl px-7 font-bold hover:-translate-y-0.5 transition-transform"
                >
                  Sell tickets free
                </Link>
              </motion.div>
            </motion.div>

            {/* Dynamic hero carousel */}
            <HeroEventSection />
          </section>

          {/* ============================================================
              ANIMATED TRACTION STATS
          ============================================================= */}
          <section className="relative border-y border-base-300/60 bg-base-200/40 py-14 my-14 overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="text-center mb-8"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                  Platform metrics & activity
                </span>
              </motion.div>

              <motion.div
                ref={statsRef}
                variants={stagger(0.12)}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
              >
                <StatItem value={animatedVolume} label="Processed volume" />
                <StatItem value={animatedTickets} label="Tickets issued" />
                <StatItem value={animatedEvents} label="Successful events" />
                <StatItem value={animatedSuccess} label="Gateway uptime" />
              </motion.div>
            </div>
          </section>

          {/* ============================================================
              FEATURES
          ============================================================= */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
            <SectionHeading
              eyebrow="Simple & powerful features"
              title="Everything you need to run your event"
              subtitle="We built reliable tools that handle flexible payments, tickets, and gate entry without any technical friction."
            />

            <motion.div
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
            >
              <FeatureCard
                icon={<Zap size={24} />}
                title="M-Pesa & Stripe Checkout"
                text="Attendees can pay seamlessly using automated M-Pesa STK pushes or global debit and credit cards via Stripe. Tickets are generated instantly upon confirmation."
              />
              <FeatureCard
                icon={<QrCode size={24} />}
                title="Fast QR code gate scanning"
                text="Use your smartphone camera or scanner app to validate tickets at the event entrance. Keep lines moving rapidly while preventing fraudulent entries."
              />
              <FeatureCard
                icon={<Calendar size={24} />}
                title="Custom event dashboards"
                text="Publish a professional profile for your event in under two minutes. Track real-time ticket sales, attendance metrics, and revenue analytics."
              />
            </motion.div>
          </section>

          {/* ============================================================
              HOW IT WORKS
          ============================================================= */}
          <section className="relative bg-base-200/50 border-y border-base-300/60 py-20 mb-28 overflow-hidden">
            <GlowBlob className="w-72 h-72 bg-primary/10 -bottom-20 -left-10" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeading
                eyebrow="Easy process"
                title="How it works in 3 simple steps"
                subtitle="No subscription fees or complicated setup. We only take a transparent commission when you successfully sell tickets."
              />

              <div className="relative">
                {/* Connector line (desktop) */}
                <motion.div
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={viewport}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                  className="hidden md:block absolute top-14 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 origin-left"
                />

                <motion.div
                  variants={stagger(0.18)}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewport}
                  className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
                >
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.title}
                      variants={fadeUp}
                      whileHover={{ y: -6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="bg-base-100 border border-base-300 rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-xl hover:border-primary/40 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-extrabold text-xl shadow-lg shadow-primary/30">
                        {i + 1}
                      </div>
                      <h3 className="text-xl font-bold">{step.title}</h3>
                      <p className="text-base text-base-content/70 leading-relaxed">{step.text}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          {/* ============================================================
              TESTIMONIALS
          ============================================================= */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
            <SectionHeading
              eyebrow="Community trust"
              title="Loved by Kenyan event organizers"
              subtitle="See what promoters and creators are saying about using our platform."
            />

            <motion.div
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
            >
              {testimonials.map((t) => (
                <motion.div
                  key={t.name}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="relative bg-base-200/40 border border-base-300 rounded-3xl p-8 space-y-6 shadow-sm hover:shadow-xl hover:border-primary/30 overflow-hidden"
                >
                  <span className="absolute top-2 right-6 text-8xl font-serif text-primary/10 leading-none select-none">
                    “
                  </span>

                  <div className="relative flex items-center gap-1 text-warning">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={viewport}
                        transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Star size={16} className="fill-current" />
                      </motion.span>
                    ))}
                  </div>

                  <p className="relative text-base text-base-content/80 leading-relaxed italic">"{t.quote}"</p>

                  <div className="relative flex items-center gap-3 pt-4 border-t border-base-300/60">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {t.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{t.name}</h4>
                      <p className="text-xs text-base-content/60">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ============================================================
              FAQ
          ============================================================= */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
            <SectionHeading eyebrow="Got questions?" title="Frequently asked questions" />

            <motion.div
              variants={stagger(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="space-y-4"
            >
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.q}
                  variants={fadeUp}
                  className="collapse collapse-plus bg-base-200/50 border border-base-300 rounded-2xl hover:border-primary/40 transition-colors"
                >
                  <input type="radio" name="faq-accordion" defaultChecked={i === 0} />
                  <div className="collapse-title text-base font-bold">{faq.q}</div>
                  <div className="collapse-content text-sm text-base-content/70 leading-relaxed">
                    <p>{faq.a}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ============================================================
              FINAL CALL TO ACTION
          ============================================================= */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={viewport}
              transition={{ duration: 0.8, ease: EASE }}
              className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-base-200 border border-primary/30 rounded-3xl p-8 sm:p-16 text-center space-y-6 shadow-xl"
            >
              <GlowBlob className="w-64 h-64 bg-primary/30 -top-20 -left-16" />
              <GlowBlob className="w-64 h-64 bg-primary/15 -bottom-24 -right-16" delay={3} />

              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-16 h-16 bg-primary text-primary-content rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xl shadow-primary/40"
              >
                <Rocket className="w-8 h-8" />
              </motion.div>

              <h2 className="relative text-3xl sm:text-5xl font-extrabold tracking-tight">
                Ready to elevate your event ticketing?
              </h2>
              <p className="relative text-base sm:text-lg text-base-content/80 max-w-xl mx-auto leading-relaxed">
                Join organizers using TicketStream for zero upfront costs, automated M-Pesa and Stripe payments, and
                streamlined gate entry.
              </p>
              <div className="relative pt-2 flex items-center justify-center gap-4 flex-wrap">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/register" className="btn btn-primary rounded-xl px-8 font-bold text-base shadow-lg shadow-primary/30">
                    Get started free
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/contact" className="btn btn-ghost border border-base-300 bg-base-100/50 backdrop-blur rounded-xl px-8 font-bold text-base">
                    Contact our team
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </section>
        </main>

        {/* Footer Component */}
        <Footer />
      </div>
    </MotionConfig>
  );
};