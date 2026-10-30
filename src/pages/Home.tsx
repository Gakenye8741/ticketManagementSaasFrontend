import { useState, useEffect, useRef, Children, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  MotionConfig,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  QrCode,
  Zap,
  Calendar,
  Shield,
  TrendingUp,
  Quote,
  Star,
  Check,
  Music,
  Trophy,
  PartyPopper,
  Briefcase,
  Tent,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { HeroEventSection } from "../components/HeroEventSection";

// ======================================================
// TYPE SCALE + SHARED STYLES (tune everything here)
// ======================================================
const FONT = "[font-family:Sora,ui-sans-serif,system-ui,sans-serif]";

const T = {
  display: `${FONT} text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.98]`, // hero only
  h2: `${FONT} text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08]`, // section titles
  h3: `${FONT} text-xl sm:text-2xl font-semibold tracking-tight`, // card titles
  big: `${FONT} text-3xl min-[420px]:text-4xl sm:text-6xl font-bold tracking-tight`, // big numbers
  lead: "text-lg sm:text-xl leading-relaxed", // intro paragraphs
  body: "text-base leading-relaxed", // normal text
  small: "text-sm", // meta
};

// No blur, no glass: cards are just a soft dark tint with a thin edge, so the
// video background shows through the whole page exactly like in the hero.
const CARD = "rounded-3xl border border-white/15 bg-black/30";
const CARD_HOVER = "transition-colors duration-200 hover:border-primary/70 hover:bg-black/45";

// ======================================================
// MOTION (one hero sequence + gentle reveals)
// ======================================================
const EASE = [0.22, 1, 0.36, 1] as const;
const viewport = { once: true, margin: "-80px" } as const;

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const stagger = (gap = 0.1, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

const useCountUp = (end: number, active: boolean, duration = 1800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      setCount(Math.floor((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * end));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [end, duration, active]);
  return count.toLocaleString();
};

// ======================================================
// MOBILE CAROUSEL
// Swipeable snap-scroll row on small screens. From the given breakpoint up it
// turns back into the original grid, so desktop layouts are untouched.
// ======================================================
const SCROLLER =
  "relative flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 sm:-mx-6 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const BREAKPOINT = {
  md: { wrap: "md:grid md:overflow-visible md:snap-none md:mx-0 md:px-0 md:pb-0", dots: "md:hidden" },
  lg: { wrap: "lg:grid lg:overflow-visible lg:snap-none lg:mx-0 lg:px-0 lg:pb-0", dots: "lg:hidden" },
};
// slide widths (each resets to auto at its breakpoint)
const CAT_SLIDE = "snap-start shrink-0 w-[44%] sm:w-[30%] md:w-auto md:shrink";
const TRUST_SLIDE = "snap-center shrink-0 w-[80%] sm:w-[46%] md:w-auto md:shrink";
const LG_SLIDE = "snap-center shrink-0 w-[88%] sm:w-[60%] lg:w-auto lg:shrink";

const Carousel = ({
  children,
  bp,
  gap = 0.1,
  className = "",
}: {
  children: ReactNode;
  bp: "md" | "lg";
  gap?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.toArray(children).length;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    (Array.from(el.children) as HTMLElement[]).forEach((k, i) => {
      const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - center);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const goTo = (i: number) =>
    (ref.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

  return (
    <>
      <motion.div
        ref={ref}
        onScroll={onScroll}
        variants={stagger(gap)}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className={`${SCROLLER} ${BREAKPOINT[bp].wrap} ${className}`}
      >
        {children}
      </motion.div>

      <div className={`mt-5 flex justify-center gap-2 ${BREAKPOINT[bp].dots}`}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-primary" : "w-2 bg-white/30"}`}
          />
        ))}
      </div>
    </>
  );
};

// ======================================================
// LAYOUT PIECES
// ======================================================
// Every section sits straight on the video, separated by a hairline.
const Section = ({ children, className = "", divider = true }: { children: ReactNode; className?: string; divider?: boolean }) => (
  <section className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-28 ${className}`}>
    {divider && (
      <div
        aria-hidden
        className="absolute top-0 inset-x-4 sm:inset-x-6 lg:inset-x-8 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
    )}
    {children}
  </section>
);

const SectionHeading = ({ title, subtitle, className = "" }: { title: string; subtitle?: string; className?: string }) => (
  <motion.div
    variants={stagger(0.08)}
    initial="hidden"
    whileInView="show"
    viewport={viewport}
    className={`max-w-2xl space-y-4 ${className}`}
  >
    <motion.h2 variants={reveal} className={T.h2}>
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p variants={reveal} className={`${T.lead} text-white/75`}>
        {subtitle}
      </motion.p>
    )}
  </motion.div>
);

const IconBadge = ({ children }: { children: ReactNode }) => (
  <div className="w-12 h-12 rounded-xl bg-primary text-primary-content flex items-center justify-center">{children}</div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <motion.div variants={reveal} className="px-2 sm:px-8 first:pl-0">
    <p className={`${T.big} tabular-nums text-primary`}>{value}</p>
    <p className={`${T.small} mt-2 text-white/70`}>{label}</p>
  </motion.div>
);

// ======================================================
// DATA
// ======================================================
const categories: { label: string; icon: LucideIcon; q: string }[] = [
  { label: "Music", icon: Music, q: "music" },
  { label: "Nightlife", icon: PartyPopper, q: "nightlife" },
  { label: "Sports", icon: Trophy, q: "sports" },
  { label: "Conferences", icon: Briefcase, q: "conference" },
  { label: "Festivals", icon: Tent, q: "festival" },
  { label: "Arts & culture", icon: Palette, q: "art" },
];

const audiences = [
  {
    title: "For attendees",
    lead: "Find something to do this weekend and be through the gate in minutes.",
    cta: { label: "Browse events", to: "/events" },
    points: [
      "Search events by name or browse by category",
      "Pay with an M-Pesa STK push or a card",
      "Get your digital ticket the moment you pay",
      "Walk in by showing a QR code",
    ],
  },
  {
    title: "For organizers",
    lead: "Publish, sell and manage entry from a single dashboard.",
    cta: { label: "Create an event", to: "/register" },
    points: [
      "List your event free, with no monthly fees",
      "Set as many ticket tiers and prices as you need",
      "Watch sales and attendance update live",
      "Scan tickets at the gate with your phone",
    ],
  },
];

const included = [
  "Free event page",
  "Multiple ticket tiers",
  "M-Pesa payments",
  "Card payments via Paystack",
  "Instant digital tickets",
  "QR code check-in",
  "Live sales dashboard",
  "Free and paid events",
];

const steps = [
  {
    title: "Create your event",
    text: "Sign up, add your schedule, venue and ticket tiers, then publish your event page.",
    detail: "Takes about two minutes",
    points: ["Add your schedule and venue", "Set free or paid ticket tiers", "Publish a shareable event page"],
  },
  {
    title: "Share your link",
    text: "Attendees pay with M-Pesa or Paystack and their digital tickets arrive instantly.",
    detail: "Works on any phone",
    points: ["Pay by M-Pesa STK push or card", "A QR code ticket arrives instantly", "Follow sales live on your dashboard"],
  },
  {
    title: "Scan at the gate",
    text: "Verify tickets with the scanner app at the entrance while your earnings settle into your account.",
    detail: "Your phone camera is enough",
    points: ["Scan each attendee's QR code", "Fake or reused tickets are flagged", "Earnings settle into your account"],
  },
];

const pricing = [
  { big: "KES 0", title: "to list your event", text: "Create your page, add tiers and publish without paying anything upfront." },
  { big: "No", title: "monthly subscription", text: "There is nothing to renew. You only pay when you actually sell tickets." },
  { big: "Small", title: "commission per ticket", text: "A transparent percentage is taken from each successful sale. Nothing is hidden." },
];

const testimonials = [
  {
    initials: "BK",
    name: "Brian K.",
    role: "Event organizer",
    quote:
      "Having both M-Pesa and Paystack means every attendee can buy a ticket, whether they're paying with mobile money or a card. It's seamless.",
  },
  {
    initials: "MW",
    name: "Mercy W.",
    role: "Community host",
    quote: "No monthly charges and no hidden fees. Listing for free makes starting out risk-free.",
  },
  {
    initials: "JN",
    name: "James N.",
    role: "Concert promoter",
    quote: "The commission model suits promoters. Payments are handled reliably every single time.",
  },
];

const trust: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Shield, title: "Secure payments", text: "Payments run through M-Pesa and Paystack, and a ticket is only issued once the payment is confirmed." },
  { icon: QrCode, title: "One QR code per ticket", text: "Every ticket carries its own QR code. Valid tickets are confirmed at the gate, while fake or reused ones are flagged." },
  { icon: Zap, title: "Instant confirmation", text: "Attendees get their digital ticket the moment they pay, ready to show straight from their phone." },
  { icon: TrendingUp, title: "Clear numbers", text: "Watch sales, attendance and revenue update live, with a transparent commission on each sale and nothing hidden." },
];

const faqs = [
  {
    q: "How do I start selling tickets?",
    a: "Create a free account, fill in your event details, set your ticket tiers and publish. You'll get a shareable link straight away.",
  },
  {
    q: "Which payment methods can buyers use?",
    a: "M-Pesa STK push for instant local checkout, and card payments through Paystack.",
  },
  {
    q: "Are there upfront listing fees?",
    a: "No. Listing is free. We only take a small commission when a ticket is sold.",
  },
  {
    q: "How do attendees receive their tickets?",
    a: "Straight after payment is confirmed, as a digital ticket with a QR code they can show at the entrance.",
  },
  {
    q: "How does gate scanning work?",
    a: "Open the scanner on your phone at the entrance and scan each attendee's QR code. Valid tickets are confirmed and fake or reused ones are flagged.",
  },
  {
    q: "Can I run a free event?",
    a: "Yes. You can set a ticket tier at KES 0, so attendees still reserve a ticket and check in with a QR code.",
  },
  {
    q: "Can I sell different types of tickets?",
    a: "Yes. Add as many ticket tiers as you need, each with its own price. Free tiers at KES 0 work alongside paid ones.",
  },
  {
    q: "What do I need at the gate?",
    a: "Just a phone with a camera. Open the scanner, point it at each QR code and you'll see straight away whether the ticket is valid.",
  },
  {
    q: "Where do my earnings go?",
    a: "Earnings from your ticket sales settle into your account, and you can follow sales and revenue live on your dashboard.",
  },
];

// ======================================================
// VIDEO BACKDROP (fixed; the page's background, same as the hero)
// ======================================================
const VideoBackdrop = ({ src = "/videos/video2.mp4", poster }: { src?: string; poster?: string }) => {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // bright in the hero, calmer further down so text stays readable with no panels
  const dim = useTransform(scrollY, [0, 600], [0.15, 0.7]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-neutral">
      {!reduce && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-black/40" />
      <motion.div style={{ opacity: dim }} className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-primary/15 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
    </div>
  );
};

// ======================================================
// PAGE
// ======================================================
export const Home = () => {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  const volume = useCountUp(5, statsInView);
  const tickets = useCountUp(10, statsInView);
  const events = useCountUp(50, statsInView);
  const success = useCountUp(100, statsInView);

  const heroWords = ["Discover", "top", "events", "& shows."];

  return (
    <MotionConfig reducedMotion="user">
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&display=swap" rel="stylesheet" />
        <title>Weetix | Discover and Book Events in Kenya</title>
        <meta
          name="description"
          content="Discover top events and shows in Kenya. Buy tickets securely with M-Pesa or Paystack, and experience seamless QR code check-ins with Weetix."
        />
      </Helmet>

      <div className="relative isolate min-h-screen bg-black text-white flex flex-col justify-between font-sans overflow-x-hidden">
        <VideoBackdrop />

        <Navbar />

        {/* soft shadow behind all text keeps it readable straight on the video */}
        <main className="[text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
          {/* ================= HERO ================= */}
          <section className="relative min-h-[100svh] w-full flex items-end overflow-hidden -mt-16">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-36 sm:pb-28 sm:pt-40">
              <div className="max-w-4xl space-y-6 sm:space-y-8">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="inline-flex items-center gap-2 text-sm sm:text-base font-medium text-white/90 bg-black/30 border border-white/25 rounded-full px-4 py-2"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Kenya's #1 ticketing platform
                </motion.p>

                {/* The one orchestrated moment on the page */}
                <h1 className={`${T.display} text-white`}>
                  {heroWords.map((word, i) => (
                    <motion.span
                      key={word}
                      initial={{ opacity: 0, y: 50, rotateX: -80 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.25 + i * 0.12, duration: 0.8, ease: EASE }}
                      className="inline-block mr-[0.22em] origin-bottom"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
                  className={`${T.lead} text-white/85 max-w-2xl`}
                >
                  Find upcoming events, get your ticket instantly with M-Pesa or Paystack, and walk in with a QR code.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.05, duration: 0.7, ease: EASE }}
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
                >
                  <Link to="/events" className="btn btn-primary btn-lg rounded-xl text-base gap-2 w-full sm:w-auto">
                    Browse events
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-lg rounded-xl text-base bg-black/30 border-white/30 text-white hover:bg-white/15 w-full sm:w-auto"
                  >
                    Sell tickets free
                  </Link>
                </motion.div>

                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                  className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm font-medium text-white/80"
                >
                  <li className="flex items-center gap-2">
                    <Shield size={16} className="text-green-400" /> Secure payments
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap size={16} className="text-green-400" /> Instant tickets
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400" /> No upfront fees
                  </li>
                </motion.ul>
              </div>
            </div>
          </section>

          {/* ================= FEATURED EVENTS ================= */}
          <Section divider={false}>
            <HeroEventSection />
          </Section>

          {/* ================= STATS ================= */}
          <Section className="py-14 sm:py-20">
            <motion.div
              ref={statsRef}
              variants={stagger(0.1)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:divide-x divide-white/15"
            >
              <Stat value={`KES ${volume}M+`} label="Processed volume" />
              <Stat value={`${tickets}K+`} label="Tickets issued" />
              <Stat value={`${events}+`} label="Successful events" />
              <Stat value={`${success}%`} label="Gateway uptime" />
            </motion.div>
          </Section>

          {/* ================= CATEGORIES (carousel on mobile) ================= */}
          <Section>
            <SectionHeading
              title="Find your kind of event"
              subtitle="Jump straight into what you're in the mood for."
              className="mb-10 sm:mb-12"
            />
            <Carousel bp="md" gap={0.07} className="md:grid-cols-3 lg:grid-cols-6">
              {categories.map(({ label, icon: Icon, q }) => (
                <motion.div key={label} variants={reveal} className={CAT_SLIDE}>
                  <Link
                    to={`/events?search=${encodeURIComponent(q)}`}
                    className={`${CARD} ${CARD_HOVER} flex flex-col items-start gap-6 p-6 h-full`}
                  >
                    <IconBadge>
                      <Icon size={22} />
                    </IconBadge>
                    <span className="text-lg font-semibold">{label}</span>
                  </Link>
                </motion.div>
              ))}
            </Carousel>
          </Section>

          {/* ================= FEATURES ================= */}
          <Section>
            <SectionHeading
              title="Everything you need to run your event"
              subtitle="Payments, tickets and gate entry in one place, without the technical fuss."
              className="mb-10 sm:mb-14"
            />

            <motion.div
              variants={stagger(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="grid grid-cols-1 lg:grid-cols-5 gap-5"
            >
              <motion.div
                variants={reveal}
                className="lg:col-span-3 lg:row-span-2 rounded-3xl bg-primary text-primary-content shadow-2xl shadow-primary/30 p-7 sm:p-12 flex flex-col justify-between gap-10 sm:gap-16 [text-shadow:none]"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-content/15 flex items-center justify-center">
                  <Zap size={28} />
                </div>
                <div className="space-y-4">
                  <h3 className={`${FONT} text-3xl sm:text-4xl font-bold tracking-tight`}>M-Pesa and Paystack checkout</h3>
                  <p className={`${T.lead} text-primary-content/85 max-w-lg`}>
                    Buyers pay with an M-Pesa STK push or a card through Paystack. Tickets are generated the moment payment is confirmed.
                  </p>
                </div>
              </motion.div>

              {[
                {
                  icon: <QrCode size={24} />,
                  title: "Fast QR gate scanning",
                  text: "Validate tickets with your phone camera, keep lines moving and block fake entries.",
                },
                {
                  icon: <Calendar size={24} />,
                  title: "Live dashboards",
                  text: "Publish your event page in two minutes and track sales, attendance and revenue as they happen.",
                },
              ].map((f) => (
                <motion.div key={f.title} variants={reveal} className={`${CARD} ${CARD_HOVER} lg:col-span-2 p-6 sm:p-8 space-y-4`}>
                  <IconBadge>{f.icon}</IconBadge>
                  <h3 className={T.h3}>{f.title}</h3>
                  <p className={`${T.body} text-white/75`}>{f.text}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* everything included */}
            <motion.ul
              variants={stagger(0.05)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="mt-10 flex flex-wrap gap-2 sm:gap-3"
            >
              {included.map((item) => (
                <motion.li
                  key={item}
                  variants={reveal}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3.5 py-2 sm:px-4 text-sm sm:text-base font-medium"
                >
                  <Check size={16} className="text-green-400 shrink-0" />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </Section>

          {/* ================= AUDIENCES (carousel on mobile) ================= */}
          <Section>
            <SectionHeading
              title="Built for both sides of the gate"
              subtitle="Whether you're buying a ticket or selling hundreds, the experience is the same: simple and fast."
              className="mb-10 sm:mb-14"
            />
            <Carousel bp="lg" gap={0.15} className="lg:grid-cols-2 lg:gap-5">
              {audiences.map((a) => (
                <motion.div key={a.title} variants={reveal} className={`${CARD} ${LG_SLIDE} p-6 sm:p-10 flex flex-col gap-6`}>
                  <div className="space-y-3">
                    <h3 className={T.h3}>{a.title}</h3>
                    <p className={`${T.body} text-white/75`}>{a.lead}</p>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-base">
                        <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center">
                          <Check size={14} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link to={a.cta.to} className="btn btn-primary rounded-xl text-base gap-2 self-start">
                    {a.cta.label}
                    <ArrowRight size={18} />
                  </Link>
                </motion.div>
              ))}
            </Carousel>
          </Section>

          {/* ================= TRUST & DETAILS (carousel on mobile) ================= */}
          <Section>
            <SectionHeading
              title="Built to keep payments and entry smooth"
              subtitle="The details that matter on the day of your event."
              className="mb-10 sm:mb-14"
            />
            <Carousel bp="md" gap={0.1} className="md:grid-cols-2 lg:grid-cols-4 md:gap-5">
              {trust.map(({ icon: Icon, title, text }) => (
                <motion.div key={title} variants={reveal} className={`${CARD} ${CARD_HOVER} ${TRUST_SLIDE} p-6 sm:p-8 space-y-4`}>
                  <IconBadge>
                    <Icon size={22} />
                  </IconBadge>
                  <h3 className={T.h3}>{title}</h3>
                  <p className={`${T.body} text-white/75`}>{text}</p>
                </motion.div>
              ))}
            </Carousel>
          </Section>

          {/* ================= HOW IT WORKS (a real sequence, with a timeline) ================= */}
          <Section>
            <div className="grid lg:grid-cols-5 gap-10 sm:gap-14">
              <div className="lg:col-span-2 lg:sticky lg:top-28 self-start">
                <SectionHeading
                  title="Selling tickets in three steps"
                  subtitle="No subscription and no complicated setup. We take a transparent commission only when you sell."
                />
              </div>

              <motion.ol
                variants={stagger(0.15)}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="relative lg:col-span-3 space-y-10"
              >
                <div aria-hidden className="absolute left-7 top-8 bottom-8 w-px bg-gradient-to-b from-primary via-white/25 to-transparent" />
                {steps.map((s, i) => (
                  <motion.li key={s.title} variants={reveal} className="relative flex gap-4 sm:gap-6 items-start">
                    <span className="relative z-10 shrink-0 w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold ring-8 ring-black/40">
                      {i + 1}
                    </span>
                    <div className="space-y-2 pt-1 min-w-0">
                      <h3 className={T.h3}>{s.title}</h3>
                      <p className={`${T.body} text-white/75`}>{s.text}</p>
                      <p className="text-sm font-medium text-primary">{s.detail}</p>
                      <ul className="pt-2 space-y-1.5">
                        {s.points.map((pt) => (
                          <li key={pt} className="flex items-start gap-2 text-sm text-white/70">
                            <Check size={14} className="mt-0.5 shrink-0 text-green-400" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </Section>

          {/* ================= PRICING (transparent) ================= */}
          <Section>
            <SectionHeading
              title="Free to list. Pay only when you sell."
              subtitle="Pricing that never gets in the way of your first event."
              className="mb-10 sm:mb-14"
            />
            <motion.div
              variants={stagger(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="grid grid-cols-1 md:grid-cols-3 gap-y-10 sm:gap-y-12 md:divide-x divide-white/15"
            >
              {pricing.map((p) => (
                <motion.div key={p.title} variants={reveal} className="md:px-10 first:md:pl-0 space-y-3">
                  <p className={`${T.big} text-primary`}>{p.big}</p>
                  <h3 className={T.h3}>{p.title}</h3>
                  <p className={`${T.body} text-white/75`}>{p.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </Section>

          {/* ================= TESTIMONIALS (carousel on mobile) ================= */}
          <Section>
            <SectionHeading
              title="Loved by Kenyan organizers"
              subtitle="What promoters and creators say about selling with Weetix."
              className="mb-10 sm:mb-14"
            />

            <Carousel bp="lg" gap={0.12} className="lg:grid-cols-2 lg:gap-5">
              <motion.figure
                variants={reveal}
                className={`${CARD} ${LG_SLIDE} lg:row-span-2 p-6 sm:p-12 flex flex-col justify-between gap-8 sm:gap-10`}
              >
                <Quote size={40} className="text-primary" />
                <blockquote className="text-xl sm:text-3xl font-medium leading-snug tracking-tight">
                  {testimonials[0].quote}
                </blockquote>
                <figcaption className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
                    {testimonials[0].initials}
                  </span>
                  <span>
                    <span className="block font-semibold">{testimonials[0].name}</span>
                    <span className={`${T.small} text-white/70`}>{testimonials[0].role}</span>
                  </span>
                </figcaption>
              </motion.figure>

              {testimonials.slice(1).map((t) => (
                <motion.figure key={t.name} variants={reveal} className={`${CARD} ${LG_SLIDE} p-6 sm:p-8 space-y-6`}>
                  <div className="flex gap-1 text-yellow-400" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg sm:text-xl leading-relaxed">{t.quote}</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">
                      {t.initials}
                    </span>
                    <span>
                      <span className="block font-semibold">{t.name}</span>
                      <span className={`${T.small} text-white/70`}>{t.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </Carousel>
          </Section>

          {/* ================= FAQ ================= */}
          <Section>
            <div className="grid lg:grid-cols-5 gap-10 sm:gap-14">
              <div className="lg:col-span-2">
                <SectionHeading
                  title="Frequently asked questions"
                  subtitle="Can't find your answer? Our team is happy to help."
                />
                <Link to="/contact" className="btn btn-outline rounded-xl text-base gap-2 mt-8 border-white/40 text-white hover:bg-white/10 hover:border-white">
                  Contact support
                  <ArrowRight size={18} />
                </Link>
              </div>

              <motion.div
                variants={stagger(0.08)}
                initial="hidden"
                whileInView="show"
                viewport={viewport}
                className="lg:col-span-3 space-y-3"
              >
                {faqs.map((faq, i) => (
                  <motion.div key={faq.q} variants={reveal} className="collapse collapse-plus rounded-2xl border border-white/15 bg-black/30">
                    <input type="radio" name="faq-accordion" defaultChecked={i === 0} aria-label={faq.q} />
                    <div className="collapse-title text-base sm:text-xl font-semibold pr-12">{faq.q}</div>
                    <div className={`collapse-content ${T.body} text-white/75`}>
                      <p>{faq.a}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </Section>

          {/* ================= FINAL CTA (open on the video, no box) ================= */}
          <Section className="pb-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.7, ease: EASE }}
              className="grid lg:grid-cols-5 gap-10 items-end"
            >
              <div className="lg:col-span-3 space-y-5">
                <h2 className={`${FONT} text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]`}>
                  Ready to sell your first ticket?
                </h2>
                <p className={`${T.lead} text-white/80 max-w-xl`}>
                  Zero upfront costs, automated M-Pesa and Paystack payments, and fast gate entry.
                </p>
              </div>
              <div className="lg:col-span-2 flex flex-col sm:flex-row sm:flex-wrap lg:justify-end gap-3">
                <Link to="/register" className="btn btn-primary btn-lg rounded-xl text-base gap-2 w-full sm:w-auto">
                  Get started free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/contact"
                  className="btn btn-lg rounded-xl text-base bg-black/30 border-white/30 text-white hover:bg-white/15 w-full sm:w-auto"
                >
                  Contact our team
                </Link>
              </div>
            </motion.div>
          </Section>
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
};