import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import { OrganizerSidebar } from "./OrganizerSidebar";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2,
  MapPin,
  Calendar,
  Ticket,
  Images,
  CalendarCheck,
  Wallet,
  QrCode,
  Banknote,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// HOW IT WORKS
// ---------------------------------------------------------------------------
const GUIDE_STORAGE_KEY = "organizer_guide_seen";

// Fixed navbar height.
// Keep this synchronized with your actual Navbar height.
const NAVBAR_HEIGHT = "5rem";

interface GuideStep {
  icon: typeof Building2;
  phase: string;
  title: string;
  text: string;
  details: string[];
  path: string;
  badge?: string;
}

const guideSteps: GuideStep[] = [
  {
    icon: Building2,
    phase: "Get set up",
    title: "Set up your organization",
    text: "This is your home on the platform. Everything else is created under it.",
    details: [
      "Add your name, logo and support contacts.",
      "Set your payout details so you can get paid.",
      "Invite your team: managers, admins and gate scanners.",
      "Verify your organization. This is required first, and approval takes about 10 to 60 minutes.",
    ],
    path: "/organizer-dashboard/my-organization",
    badge: "Start here",
  },
  {
    icon: MapPin,
    phase: "Get set up",
    title: "Add your venues",
    text: "Create the places where your events will be hosted.",
    details: [
      "Add the venue name, address, city and capacity.",
      "Pin the location so attendees can find it easily.",
      "Create one venue for each place you host at.",
      "You will pick a venue from this list when you create an event.",
    ],
    path: "/organizer-dashboard/venues",
    badge: "Do next",
  },
  {
    icon: Calendar,
    phase: "Create your event",
    title: "Create your event",
    text: "Add the date, venue and description attendees will see.",
    details: [
      "Give your event a clear title, date and start time.",
      "Choose one of your saved venues.",
      "Write a description that tells people what to expect.",
    ],
    path: "/organizer-dashboard/my-events",
  },
  {
    icon: Ticket,
    phase: "Create your event",
    title: "Add ticket types",
    text: "Create tiers like Regular or VIP with a price and quantity.",
    details: [
      "Set a price and how many tickets are available for each tier.",
      "Add as many tiers as you need, for example Early Bird, Regular and VIP.",
    ],
    path: "/organizer-dashboard/ticket-types",
  },
  {
    icon: Images,
    phase: "Create your event",
    title: "Add photos and videos",
    text: "Upload event media and choose the main banner.",
    details: [
      "Upload photos and videos that show off your event.",
      "Pick the banner image shown first to attendees.",
    ],
    path: "/organizer-dashboard/media",
  },
  {
    icon: CalendarCheck,
    phase: "Run your event",
    title: "Track bookings",
    text: "See who booked, then confirm or cancel bookings.",
    details: [
      "Review every booking as it comes in.",
      "Confirm or cancel a booking when needed.",
    ],
    path: "/organizer-dashboard/bookings",
  },
  {
    icon: Wallet,
    phase: "Run your event",
    title: "Watch payments",
    text: "View every payment made for your events.",
    details: [
      "See each payment, its status and which event it belongs to.",
    ],
    path: "/organizer-dashboard/payments",
  },
  {
    icon: QrCode,
    phase: "Run your event",
    title: "Scan tickets at the gate",
    text: "Your scanners check attendees in with the Gate Pass Scanner.",
    details: [
      "Add scanners to your team first.",
      "Scanners check tickets in on the day, and each ticket works only once.",
    ],
    path: "/organizer/scanner",
  },
  {
    icon: Banknote,
    phase: "Get paid",
    title: "Get paid",
    text: "Check your earnings and payouts to your account.",
    details: [
      "See what you have earned and what has been paid out.",
      "Payouts go to the payout details saved on your organization.",
    ],
    path: "/organizer/payouts",
  },
];

export const OrganizerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // DESKTOP SIDEBAR COLLAPSE
  // ---------------------------------------------------------------------------
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const savedState = localStorage.getItem(
        "organizer_sidebar_collapsed"
      );

      return savedState ? JSON.parse(savedState) : false;
    } catch {
      return false;
    }
  });

  // ---------------------------------------------------------------------------
  // GUIDE MODAL
  // ---------------------------------------------------------------------------
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return !localStorage.getItem(GUIDE_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  // ---------------------------------------------------------------------------
  // SAVE SIDEBAR STATE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(
        "organizer_sidebar_collapsed",
        JSON.stringify(isCollapsed)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [isCollapsed]);

  // ---------------------------------------------------------------------------
  // CLOSE GUIDE
  // ---------------------------------------------------------------------------
  const closeGuide = () => {
    setGuideOpen(false);

    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors.
    }
  };

  // ---------------------------------------------------------------------------
  // ESCAPE KEY FOR GUIDE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!guideOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGuide();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [guideOpen]);

  // ---------------------------------------------------------------------------
  // LOCK BODY SCROLL WHEN GUIDE IS OPEN
  //
  // This prevents the page behind the modal from scrolling while the modal
  // itself remains scrollable.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!guideOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [guideOpen]);

  // ---------------------------------------------------------------------------
  // CLOSE MOBILE SIDEBAR WHEN SCREEN BECOMES DESKTOP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-base-100 text-base-content">
      {/* ===================================================================== */}
      {/* MOBILE HAMBURGER                                                     */}
      {/* ===================================================================== */}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            top: `calc(${NAVBAR_HEIGHT} + 0.75rem)`,
          }}
          className="
            lg:hidden
            fixed
            left-4
            z-[60]
            p-2.5
            bg-primary
            text-primary-content
            rounded-xl
            shadow-lg
            active:scale-95
            transition-transform
            flex
            items-center
            justify-center
          "
          aria-label="Open Sidebar"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ===================================================================== */}
      {/* DESKTOP SIDEBAR                                                       */}
      {/* ===================================================================== */}

      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? "80px" : "272px",
        }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          top: NAVBAR_HEIGHT,
          height: `calc(100dvh - ${NAVBAR_HEIGHT})`,
        }}
        className="
          hidden
          lg:block
          fixed
          left-0
          z-30
          bg-base-100
          border-r
          border-base-200
          shadow-xl
          overflow-visible
        "
      >
        <div className="h-full flex flex-col relative min-h-0">
          {/* Collapse button */}
          <button
            onClick={() => setIsCollapsed((previous:any) => !previous)}
            className="
              absolute
              -right-3.5
              top-6
              z-50
              bg-primary
              text-primary-content
              p-1.5
              rounded-full
              shadow-md
              hover:scale-110
              active:scale-95
              transition-transform
              hidden
              lg:flex
              items-center
              justify-center
              border-2
              border-base-100
            "
            aria-label={
              isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
            }
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={3} />
            ) : (
              <ChevronLeft size={14} strokeWidth={3} />
            )}
          </button>

          {/* Sidebar scrolling happens here only */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <OrganizerSidebar isCollapsed={isCollapsed} />
          </div>
        </div>
      </motion.aside>

      {/* ===================================================================== */}
      {/* MOBILE SIDEBAR OVERLAY + DRAWER                                      */}
      {/* ===================================================================== */}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay starts BELOW navbar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                top: NAVBAR_HEIGHT,
              }}
              className="
                fixed
                inset-x-0
                bottom-0
                z-[70]
                bg-black/70
                backdrop-blur-sm
                lg:hidden
              "
            />

            {/* Mobile sidebar also starts BELOW navbar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
              }}
              style={{
                top: NAVBAR_HEIGHT,
                height: `calc(100dvh - ${NAVBAR_HEIGHT})`,
              }}
              className="
                fixed
                left-0
                z-[80]
                w-72
                bg-base-100
                text-base-content
                border-r
                border-base-200
                shadow-2xl
                lg:hidden
                flex
                flex-col
                min-h-0
              "
            >
              {/* Mobile sidebar header */}
              <div
                className="
                  shrink-0
                  p-4
                  flex
                  justify-between
                  items-center
                  border-b
                  border-base-200
                "
              >
                <span
                  className="
                    font-black
                    italic
                    uppercase
                    tracking-tighter
                    text-primary
                    text-xs
                  "
                >
                  Organizer Menu
                </span>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="
                    p-2
                    hover:bg-base-200
                    rounded-xl
                    transition-colors
                    text-base-content/50
                  "
                  aria-label="Close Sidebar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Only sidebar content scrolls */}
              <div className="flex-1 min-h-0 overflow-y-auto pb-8">
                <OrganizerSidebar isCollapsed={false} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* DESKTOP MAIN CONTENT                                                  */}
      {/* ===================================================================== */}

      <motion.main
        initial={false}
        animate={{
          marginLeft: isCollapsed ? "80px" : "272px",
        }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          minHeight: `calc(100dvh - ${NAVBAR_HEIGHT})`,
          paddingTop: NAVBAR_HEIGHT,
        }}
        className="
          hidden
          lg:block
          bg-base-100
          overflow-x-hidden
        "
      >
        <div
          className="
            min-h-[calc(100dvh-5rem)]
            px-4
            md:px-8
            xl:px-10
            pb-32
          "
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>

      {/* ===================================================================== */}
      {/* MOBILE MAIN CONTENT                                                   */}
      {/* ===================================================================== */}

      <main
        className="
          lg:hidden
          min-h-screen
          bg-base-100
          overflow-x-hidden
        "
        style={{
          paddingTop: NAVBAR_HEIGHT,
        }}
      >
        <div className="w-full px-4 pb-32">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* HOW IT WORKS BUTTON                                                   */}
      {/* ===================================================================== */}

      <button
        onClick={() => setGuideOpen(true)}
        className="
          fixed
          bottom-5
          right-5
          z-[55]
          btn
          btn-primary
          btn-sm
          rounded-full
          shadow-lg
          gap-1.5
          text-xs
          font-bold
        "
        aria-label="How it works"
      >
        <HelpCircle size={16} />

        <span className="hidden sm:inline">
          How it works
        </span>
      </button>

      {/* ===================================================================== */}
      {/* HOW IT WORKS MODAL                                                    */}
      {/* ===================================================================== */}

      <AnimatePresence>
        {guideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed
              inset-0
              z-[100]
              bg-black/60
              backdrop-blur-sm
              flex
              items-center
              justify-center
              p-2
              sm:p-4
            "
            onClick={closeGuide}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.96,
                y: 10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 10,
              }}
              transition={{
                duration: 0.2,
              }}
              onClick={(event) => event.stopPropagation()}
              className="
                relative
                bg-base-100
                border
                border-base-200
                w-full
                max-w-2xl
                h-auto
                max-h-[calc(100dvh-1rem)]
                sm:max-h-[90dvh]
                rounded-2xl
                sm:rounded-3xl
                shadow-2xl
                flex
                flex-col
                overflow-hidden
              "
              role="dialog"
              aria-modal="true"
              aria-label="How the organizer portal works"
            >
              {/* ---------------------------------------------------------------- */}
              {/* MODAL HEADER                                                     */}
              {/* ---------------------------------------------------------------- */}

              <div
                className="
                  shrink-0
                  flex
                  justify-between
                  items-start
                  gap-3
                  p-4
                  sm:p-6
                  border-b
                  border-base-200
                  bg-gradient-to-br
                  from-primary/15
                  via-primary/5
                  to-transparent
                "
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="
                      w-10
                      h-10
                      sm:w-11
                      sm:h-11
                      rounded-2xl
                      bg-primary
                      text-primary-content
                      flex
                      items-center
                      justify-center
                      shadow-md
                      shrink-0
                    "
                  >
                    <HelpCircle size={21} />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3
                      className="
                        font-black
                        text-base
                        sm:text-lg
                        text-base-content
                        tracking-tight
                      "
                    >
                      How it works
                    </h3>

                    <p
                      className="
                        text-[11px]
                        sm:text-xs
                        text-base-content/60
                        leading-snug
                      "
                    >
                      From setup to payout, here is the usual order. Tap a
                      step to open that page.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeGuide}
                  className="
                    btn
                    btn-ghost
                    btn-sm
                    btn-square
                    rounded-xl
                    shrink-0
                  "
                  aria-label="Close guide"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* MODAL BODY                                                       */}
              {/* ---------------------------------------------------------------- */}

              <div
                className="
                  flex-1
                  min-h-0
                  overflow-y-auto
                  overscroll-contain
                  p-3
                  sm:p-6
                "
              >
                <div className="flex flex-col gap-4 sm:gap-5">
                  {/* Verification reminder */}
                  <div
                    className="
                      rounded-2xl
                      border
                      border-warning/40
                      bg-warning/10
                      p-3
                      sm:p-3.5
                      flex
                      gap-3
                    "
                  >
                    <ShieldCheck
                      size={20}
                      className="text-warning shrink-0 mt-0.5"
                    />

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-black text-base-content">
                        Verify first
                      </span>

                      <span
                        className="
                          text-[11px]
                          sm:text-xs
                          text-base-content/70
                          leading-snug
                        "
                      >
                        Your organization must be verified before you can do
                        anything else. Approval usually takes about 10 to 60
                        minutes after you submit.
                      </span>
                    </div>
                  </div>

                  {/* Steps */}
                  <ol className="flex flex-col">
                    {guideSteps.map((step, i) => {
                      const showPhase =
                        i === 0 ||
                        guideSteps[i - 1].phase !== step.phase;

                      const isLast =
                        i === guideSteps.length - 1;

                      return (
                        <li key={step.path}>
                          {/* Phase */}
                          {showPhase && (
                            <p
                              className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-widest
                                text-primary/70
                                pl-1
                                mb-2
                                mt-1
                              "
                            >
                              {step.phase}
                            </p>
                          )}

                          <div className="flex gap-2.5 sm:gap-3">
                            {/* Icon + line */}
                            <div
                              className="
                                flex
                                flex-col
                                items-center
                                shrink-0
                              "
                            >
                              <div className="relative">
                                <div
                                  className="
                                    w-9
                                    h-9
                                    sm:w-10
                                    sm:h-10
                                    rounded-xl
                                    bg-primary
                                    text-primary-content
                                    flex
                                    items-center
                                    justify-center
                                    shadow-sm
                                  "
                                >
                                  <step.icon size={17} />
                                </div>

                                <span
                                  className="
                                    absolute
                                    -top-1.5
                                    -left-1.5
                                    w-5
                                    h-5
                                    rounded-full
                                    bg-base-100
                                    border
                                    border-primary/40
                                    text-primary
                                    text-[10px]
                                    font-black
                                    flex
                                    items-center
                                    justify-center
                                  "
                                >
                                  {i + 1}
                                </span>
                              </div>

                              {!isLast && (
                                <div
                                  className="
                                    w-px
                                    flex-1
                                    min-h-4
                                    my-1
                                    bg-gradient-to-b
                                    from-primary/40
                                    to-base-300
                                  "
                                />
                              )}
                            </div>

                            {/* Step card */}
                            <Link
                              to={step.path}
                              onClick={closeGuide}
                              className="
                                group
                                flex-1
                                min-w-0
                                mb-3
                                p-3
                                sm:p-3.5
                                rounded-2xl
                                border
                                border-base-200
                                bg-base-200/30
                                hover:border-primary/40
                                hover:bg-primary/5
                                transition-all
                              "
                            >
                              <div
                                className="
                                  flex
                                  items-start
                                  justify-between
                                  gap-2
                                "
                              >
                                <div
                                  className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                    min-w-0
                                  "
                                >
                                  <span
                                    className="
                                      text-sm
                                      font-bold
                                      text-base-content
                                    "
                                  >
                                    {step.title}
                                  </span>

                                  {step.badge && (
                                    <span
                                      className="
                                        badge
                                        badge-sm
                                        badge-primary
                                        font-bold
                                        text-[10px]
                                      "
                                    >
                                      {step.badge}
                                    </span>
                                  )}
                                </div>

                                <ArrowRight
                                  size={16}
                                  className="
                                    text-base-content/30
                                    group-hover:text-primary
                                    group-hover:translate-x-0.5
                                    transition-all
                                    shrink-0
                                    mt-0.5
                                  "
                                />
                              </div>

                              <p
                                className="
                                  text-[11px]
                                  sm:text-xs
                                  text-base-content/60
                                  leading-snug
                                  mt-1
                                "
                              >
                                {step.text}
                              </p>

                              <ul
                                className="
                                  flex
                                  flex-col
                                  gap-1
                                  mt-2.5
                                "
                              >
                                {step.details.map((detail) => (
                                  <li
                                    key={detail}
                                    className="
                                      flex
                                      items-start
                                      gap-2
                                      text-[11px]
                                      sm:text-xs
                                      text-base-content/70
                                    "
                                  >
                                    <Check
                                      size={12}
                                      className="
                                        text-primary
                                        shrink-0
                                        mt-0.5
                                      "
                                    />

                                    <span className="leading-snug">
                                      {detail}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* MODAL FOOTER                                                     */}
              {/* ---------------------------------------------------------------- */}

              <div
                className="
                  shrink-0
                  flex
                  items-center
                  justify-end
                  gap-3
                  p-3
                  sm:p-5
                  border-t
                  border-base-200
                  bg-base-100
                "
              >
                <span
                  className="
                    hidden
                    sm:block
                    text-[11px]
                    text-base-content/50
                    mr-auto
                  "
                >
                  You can open this guide any time with the How it works
                  button.
                </span>

                <button
                  onClick={closeGuide}
                  className="
                    btn
                    btn-primary
                    btn-sm
                    rounded-xl
                    text-xs
                    font-bold
                  "
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizerLayout;
