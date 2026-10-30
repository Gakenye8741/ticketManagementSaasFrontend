import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  QrCode,
  CreditCard,
  Globe,
  Lock,
  ChevronUp,
  Mail,
  MapPin,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Brand icons (removed from lucide-react in v1, so they live here as inline SVGs)
// ---------------------------------------------------------------------------
type IconProps = { size?: number; className?: string };

const brandIcon =
  (children: ReactNode) =>
  ({ size = 16, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );

const Twitter = brandIcon(
  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
);

const Instagram = brandIcon(
  <>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </>
);

const Linkedin = brandIcon(
  <>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </>
);

const Facebook = brandIcon(
  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
);

// ---------------------------------------------------------------------------
// Weetix brand mark (matches Navbar)
// ---------------------------------------------------------------------------
const WeetixLogo = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dims = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const letter = size === "sm" ? "text-base" : "text-lg";

  return (
    <div
      className={`relative ${dims} rounded-xl flex items-center justify-center shadow-md shadow-primary/25 shrink-0 overflow-hidden`}
      style={{
        // daisyUI 5 colour variables (the old --p / --s no longer exist)
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklab, var(--color-primary) 85%, transparent) 55%, var(--color-secondary) 100%)",
      }}
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-xl" />
      <span
        className={`relative ${letter} font-black leading-none tracking-tighter text-primary-content`}
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        W
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Footer link groups — keep every existing route, just regrouped
// ---------------------------------------------------------------------------
const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Discover Events", to: "/events" },
      { label: "Pricing Plans", to: "/pricing" },
      { label: "Host an Event", to: "/events/create" },
      { label: "Ticket Wallet", to: "/tickets" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Weetix", to: "/about" },
      { label: "Help & Support", to: "/contact" },
      { label: "API Documentation", to: "/contact" },
      { label: "Organizer Guide", to: "/events" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", to: "/contact" },
      { label: "Privacy Policy", to: "/contact" },
      { label: "Refund Policy", to: "/contact" },
      { label: "Security", to: "/contact" },
    ],
  },
  {
    title: "Merchant",
    links: [
      { label: "Store Overview", to: "/dashboard/analytics" },
      { label: "Organizer Login", to: "/login" },
      { label: "Register Account", to: "/register" },
    ],
  },
];

// Trust features — Paystack-powered payments
const TRUST_FEATURES = [
  {
    icon: Zap,
    title: "Instant Payouts",
    text: "Automated Paystack settlements straight to your bank or mobile wallet.",
  },
  {
    icon: QrCode,
    title: "Secure Gate Passes",
    text: "Built-in QR scanner mobile app for fast, fraud-free entry.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Counterfeit",
    text: "Single-use encrypted ticket validation at the gate.",
  },
  {
    icon: CreditCard,
    title: "Paystack Checkout",
    text: "Cards, bank transfer, USSD and mobile money in one flow.",
  },
];

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden mt-20 border-t border-base-300/60 bg-base-200/40 pt-20 pb-24 lg:pb-12">
      {/* Decorative glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ====================================================================
            CALL-TO-ACTION CARD
        ==================================================================== */}
        <div className="relative mb-20 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 sm:p-12 backdrop-blur-md">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} />
                Built for modern creators
              </span>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-[1.05] text-base-content">
                Ready to launch your next event?
              </h3>
              <p className="text-sm sm:text-base text-base-content/65 leading-relaxed">
                Go live in minutes with Paystack-powered checkout, instant QR ticketing,
                and real-time revenue analytics — no setup fees, ever.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                to="/events/create"
                className="btn btn-primary rounded-xl px-6 font-bold text-sm shadow-lg shadow-primary/25 gap-2 group"
              >
                Launch Event Free
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <Link
                to="/pricing"
                className="btn btn-ghost border border-base-300 rounded-xl px-6 font-bold text-sm hover:bg-base-200"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>

        {/* ====================================================================
            TRUST FEATURES GRID
        ==================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {TRUST_FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group flex items-start gap-3 p-5 rounded-2xl bg-base-100/70 border border-base-200 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-content transition-colors">
                <Icon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-base-content">
                  {title}
                </h4>
                <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ====================================================================
            MAIN FOOTER GRID
        ==================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-8 lg:gap-10 mb-16">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-4 space-y-5">
            <Link to="/" className="flex items-center gap-3 group">
              <WeetixLogo />
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter text-base-content leading-none">
                  Weetix
                </span>
                <span className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase mt-1">
                  Live Events
                </span>
              </div>
            </Link>

            <p className="text-sm text-base-content/60 leading-relaxed max-w-sm">
              Weetix is a modern event ticketing platform for organizers in Africa —
              beautifully designed storefronts, Paystack-powered payments, and
              instant QR gate scanning.
            </p>

            {/* Contact row */}
            <div className="space-y-2 pt-1">
              <a
                href="mailto:hello@weetix.app"
                className="flex items-center gap-2 text-xs font-semibold text-base-content/65 hover:text-primary transition-colors"
              >
                <Mail size={14} className="text-primary shrink-0" />
                hello@weetix.app
              </a>
              <div className="flex items-center gap-2 text-xs font-semibold text-base-content/65">
                <MapPin size={14} className="text-primary shrink-0" />
                Nairobi, Kenya
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2 pt-2">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Instagram, label: "Instagram" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Facebook, label: "Facebook" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-base-100 border border-base-300 flex items-center justify-center text-base-content/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          <div className="col-span-2 lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">
                  {group.title}
                </h4>
                <ul className="space-y-2.5 text-xs font-semibold">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-base-content/70 hover:text-primary transition-colors inline-flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-primary/40" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ====================================================================
            PAYMENT / TRUST STRIP
        ==================================================================== */}
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-5 rounded-2xl border border-base-300/60 bg-base-100/60 px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">
              Payments secured by
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#011b33] text-white text-[11px] font-black tracking-tight">
              {/* Paystack wordmark */}
              <span className="text-[#00c3f7]">pay</span>
              <span>stack</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center text-[11px] font-semibold text-base-content/55">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-primary" /> PCI-DSS compliant
            </span>
            <span className="w-1 h-1 rounded-full bg-base-content/25" />
            <span className="flex items-center gap-1.5">
              <Globe size={12} className="text-primary" /> 99.9% uptime
            </span>
          </div>
        </div>

        {/* ====================================================================
            BOTTOM BAR
        ==================================================================== */}
        <div className="border-t border-base-300/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-base-content/50">
          <p>© {new Date().getFullYear()} Weetix. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">
              Designed for high-concurrency event transactions
            </span>
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