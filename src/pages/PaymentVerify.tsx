import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster, toast } from "sonner";
import {
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  ReceiptText,
  Home,
  LayoutDashboard,
  Ticket,
  Sparkles,
  Users,
  CalendarDays,
  ShoppingBag,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import type { RootState } from "../App/store";
import { useVerifyPaystackPaymentQuery } from "../features/APIS/MpesaApi";

const REDIRECT_DELAY_SECONDS = 20;

const keyframes = `
@keyframes pvFloat1{50%{transform:translate(80px,60px) scale(1.15)}}
@keyframes pvFloat2{50%{transform:translate(-70px,-60px) scale(1.1)}}
@keyframes pvFall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(110vh) rotate(720deg) translateX(60px)}}
@keyframes pvCardIn{0%{opacity:0;transform:translateY(50px) scale(.9)}100%{opacity:1;transform:none}}
@keyframes pvUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes pvPulse{50%{opacity:.55}}
@keyframes pvText{to{background-position:300% 0}}
@keyframes pvDraw{to{stroke-dashoffset:0}}
@keyframes pvPop{0%{transform:scale(0) rotate(-180deg)}100%{transform:scale(1) rotate(0)}}
@keyframes pvRing{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.1);opacity:0}}
@keyframes pvShake{10%,90%{transform:translateX(-3px)}20%,80%{transform:translateX(6px)}30%,50%,70%{transform:translateX(-9px)}40%,60%{transform:translateX(9px)}}
@keyframes pvBounce{50%{transform:translateY(-12px)}}
@keyframes pvCore{50%{transform:scale(1.5);opacity:.6}}
@keyframes pvBar{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}
@keyframes pvShine{0%{left:-80%}60%,100%{left:150%}}
@keyframes pvCountdown{from{width:100%}to{width:0%}}
@keyframes pvSlide{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
`;

const CONFETTI_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-success",
  "bg-warning",
  "bg-info",
];

/* ============================================================
 * Small presentational helpers
 * ============================================================ */

const formatKES = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const asNumber = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** Read the booking/money summary from the verify response if the backend returns it. */
const extractSummary = (data: any) => {
  const root = data?.data ?? data;
  const booking = root?.booking ?? root?.payment?.booking ?? null;
  const payment = root?.payment ?? null;

  const totalCharged = asNumber(
    booking?.totalCharged ?? payment?.totalCharged ?? root?.totalCharged ?? 0
  );
  const serviceFee = asNumber(
    booking?.serviceFee ?? payment?.serviceFee ?? root?.serviceFee ?? 0
  );
  const ticketAmount = asNumber(
    booking?.totalAmount ?? payment?.amount ?? root?.amount ?? 0
  );
  const itemCount =
    booking?.items?.length ??
    (Array.isArray(booking?.items) ? booking.items.length : 0);

  return {
    totalCharged,
    serviceFee,
    ticketAmount,
    items: Array.isArray(booking?.items) ? booking.items : [],
    itemCount,
    quantity: Number(booking?.quantity ?? 0),
    eventTitle: booking?.event?.title ?? null,
  };
};

/* ============================================================
 * PAGE
 * ============================================================ */

const PaymentVerify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const user = useSelector((state: RootState) => state.auth.user) as any;
  const isAuthFlag = useSelector(
    (state: RootState) => (state.auth as any).isAuthenticated
  );
  const isAuthenticated =
    !!user || isAuthFlag === true || (isAuthFlag as any) === "true";

  const { data, isLoading, isError } = useVerifyPaystackPaymentQuery(
    reference as string,
    { skip: !reference }
  );

  const status = data?.data?.status ?? data?.status;
  const success = status === "success";
  const failed = !!reference && !isLoading && (isError || !success);

  const summary = useMemo(() => extractSummary(data), [data]);

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [stayHere, setStayHere] = useState(false);
  const [copied, setCopied] = useState(false);
  const toasted = useRef(false);

  useEffect(() => {
    if (toasted.current || isLoading || !reference) return;
    if (success) {
      toast.success("Payment verified successfully!");
      toasted.current = true;
    } else if (isError || status) {
      toast.error("We couldn't confirm this payment.");
      toasted.current = true;
    }
  }, [success, isError, isLoading, reference, status]);

  useEffect(() => {
    if (!success || !isAuthenticated || stayHere) return;
    const tick = setInterval(
      () => setCountdown((c) => (c > 0 ? c - 1 : 0)),
      1000
    );
    const t = setTimeout(
      () => navigate("/user-dashboard/my-bookings", { replace: true }),
      REDIRECT_DELAY_SECONDS * 1000
    );
    return () => {
      clearInterval(tick);
      clearTimeout(t);
    };
  }, [success, isAuthenticated, stayHere, navigate]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2.5,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    []
  );

  const goHome = () => navigate("/", { replace: true });
  const goBookings = () =>
    navigate("/user-dashboard/my-bookings", { replace: true });

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(reference || "");
      setCopied(true);
      toast.success("Reference copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const up = (delay: string) => ({ animation: `pvUp .6s ${delay} both` });

  /* ============================================================
   * SUB-COMPONENTS
   * ============================================================ */

  const ReferenceBox = ({ tone }: { tone: "success" | "error" }) => (
    <div
      className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 text-left"
      style={up(".7s")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            tone === "success"
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error"
          }`}
        >
          <ReceiptText size={18} />
        </div>
        <div className="min-w-0">
          <span className="block text-[9px] font-black uppercase tracking-wider text-base-content/60">
            Payment Reference
          </span>
          <strong className="block break-all text-xs font-extrabold sm:text-sm">
            {reference}
          </strong>
        </div>
      </div>
      <button
        onClick={copyRef}
        className="btn btn-ghost btn-sm btn-circle shrink-0"
        aria-label="Copy reference"
      >
        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
      </button>
    </div>
  );

  const PrimaryBtn = ({
    onClick,
    label,
    icon,
  }: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="btn btn-primary relative h-14 w-full gap-2 overflow-hidden rounded-2xl border-none text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95"
      style={up(".85s")}
    >
      <span className="relative z-[2] flex items-center gap-2">
        {icon} {label} <ArrowRight size={16} />
      </span>
      <i
        className="absolute left-[-80%] top-0 h-full w-1/2 -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{ animation: "pvShine 2.5s ease-in-out infinite" }}
      />
    </button>
  );

  /** NEW — the receipt-style booking summary shown on the success screen. */
  const BookingSummary = () => {
    if (summary.totalCharged <= 0 && summary.items.length === 0) return null;

    return (
      <div
        className="mb-6 overflow-hidden rounded-2xl border-2 border-dashed border-base-300 bg-base-100"
        style={{ animation: "pvSlide .5s .7s both" }}
      >
        <div className="flex items-center gap-2 bg-success/10 px-4 py-2.5">
          <Sparkles size={14} className="text-success" />
          <span className="text-[10px] font-black uppercase tracking-wider text-success">
            {summary.itemCount > 1
              ? `${summary.itemCount} ticket types in this order`
              : "Your ticket"}
          </span>
        </div>

        {summary.eventTitle && (
          <div className="flex items-start gap-3 border-b border-base-300 px-4 py-3">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-base-content/60">
                Event
              </p>
              <p className="truncate text-sm font-extrabold">
                {summary.eventTitle}
              </p>
            </div>
          </div>
        )}

        {summary.items.length > 0 && (
          <ul className="divide-y divide-base-300">
            {summary.items.map((item: any, i: number) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-black text-primary">
                    ×{item.quantity}
                  </span>
                  <span className="truncate text-xs font-bold">
                    {item.ticketTypeName || "Ticket"}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-extrabold">
                  KES {formatKES(asNumber(item.lineTotal))}
                </span>
              </li>
            ))}
          </ul>
        )}

        {summary.totalCharged > 0 && (
          <div className="space-y-1.5 border-t border-dashed border-base-300 bg-base-200/40 px-4 py-3 text-xs">
            {summary.ticketAmount > 0 && (
              <div className="flex justify-between text-base-content/70">
                <span>Tickets</span>
                <span className="font-bold text-base-content">
                  KES {formatKES(summary.ticketAmount)}
                </span>
              </div>
            )}
            {summary.serviceFee > 0 && (
              <div className="flex justify-between text-base-content/70">
                <span>Service fee</span>
                <span className="font-bold text-base-content">
                  KES {formatKES(summary.serviceFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-base-300 pt-2 text-sm">
              <span className="font-extrabold">Total paid</span>
              <span className="font-black text-success">
                KES {formatKES(summary.totalCharged)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-base-100 font-sans text-base-content selection:bg-primary selection:text-primary-content">
      <style>{keyframes}</style>
      <Navbar />
      <Toaster richColors position="top-right" />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        style={{ animation: "pvFloat1 10s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute right-10 top-1/3 h-80 w-80 rounded-full bg-success/10 blur-3xl"
        style={{ animation: "pvFloat2 12s ease-in-out infinite" }}
      />
      <div className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

      {success &&
        confetti.map((c) => (
          <span
            key={c.id}
            className={`pointer-events-none absolute -top-5 z-[5] opacity-0 ${c.color}`}
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.round ? c.size : c.size * 1.8,
              borderRadius: c.round ? "50%" : "2px",
              animation: `pvFall ${c.duration}s linear ${c.delay}s forwards`,
            }}
          />
        ))}

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div
          className="w-full max-w-md rounded-3xl border-2 border-base-300 bg-base-200/70 p-6 text-center shadow-xl backdrop-blur-xl sm:p-10"
          style={{ animation: "pvCardIn .8s cubic-bezier(.2,1.2,.4,1) both" }}
        >
          {/* NO REFERENCE */}
          {!reference && (
            <>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-warning/10">
                <span
                  className="text-5xl font-black text-warning"
                  style={{ animation: "pvBounce 1.2s ease infinite" }}
                >
                  ?
                </span>
              </div>
              <h1
                className="mb-2 mt-5 text-2xl font-black tracking-tight sm:text-3xl"
                style={up(".3s")}
              >
                No Payment Reference
              </h1>
              <p
                className="mb-6 text-xs font-medium text-base-content/70 sm:text-sm"
                style={up(".45s")}
              >
                We couldn't find a payment to verify.
              </p>
              <PrimaryBtn
                onClick={goHome}
                label="Back to Home"
                icon={<Home size={16} />}
              />
            </>
          )}

          {/* LOADING */}
          {reference && isLoading && (
            <>
              <div className="relative mx-auto h-28 w-28">
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
                <div
                  className="absolute inset-3.5 rounded-full border-[3px] border-transparent border-r-success"
                  style={{ animation: "spin 1.4s linear infinite reverse" }}
                />
                <div
                  className="absolute inset-7 rounded-full border-[3px] border-transparent border-b-secondary"
                  style={{ animation: "spin .8s linear infinite" }}
                />
                <div
                  className="absolute inset-[42px] rounded-full bg-primary shadow-lg shadow-primary/50"
                  style={{ animation: "pvCore 1.2s ease-in-out infinite" }}
                />
              </div>
              <h1
                className="mb-2 mt-6 text-2xl font-black tracking-tight sm:text-3xl"
                style={{
                  animation:
                    "pvUp .6s .3s both, pvPulse 1.6s 1s ease-in-out infinite",
                }}
              >
                Verifying Payment...
              </h1>
              <p
                className="mb-5 text-xs font-medium text-base-content/70 sm:text-sm"
                style={up(".45s")}
              >
                Please don't close this page.
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-base-300">
                <div
                  className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary via-success to-secondary"
                  style={{ animation: "pvBar 1.4s ease-in-out infinite" }}
                />
              </div>
            </>
          )}

          {/* FAILED */}
          {failed && (
            <>
              <div
                className="relative mx-auto flex h-28 w-28 items-center justify-center text-error"
                style={{ animation: "pvShake .6s .5s both" }}
              >
                <svg viewBox="0 0 52 52" className="relative z-[2] h-28 w-28">
                  <circle
                    cx="26"
                    cy="26"
                    r="24"
                    className="fill-none stroke-current [filter:drop-shadow(0_0_8px_currentColor)] [stroke-dasharray:151] [stroke-dashoffset:151] [stroke-width:2.5]"
                    style={{ animation: "pvDraw .8s .2s ease forwards" }}
                  />
                  <path
                    d="M16 16 36 36 M36 16 16 36"
                    className="fill-none stroke-current [stroke-dasharray:60] [stroke-dashoffset:60] [stroke-linecap:round] [stroke-width:4]"
                    style={{ animation: "pvDraw .5s .8s ease forwards" }}
                  />
                </svg>
              </div>
              <h1
                className="mb-2 mt-5 text-2xl font-black tracking-tight sm:text-3xl"
                style={up(".3s")}
              >
                Payment Not Confirmed
              </h1>
              <p
                className="mb-6 text-xs font-medium text-base-content/70 sm:text-sm"
                style={up(".45s")}
              >
                We couldn't confirm this payment. If money was deducted, contact
                support with your reference.
              </p>
              <ReferenceBox tone="error" />
              <PrimaryBtn
                onClick={isAuthenticated ? goBookings : goHome}
                label={
                  isAuthenticated ? "Back to My Bookings" : "Back to Home"
                }
                icon={
                  isAuthenticated ? (
                    <LayoutDashboard size={16} />
                  ) : (
                    <Home size={16} />
                  )
                }
              />
            </>
          )}

          {/* SUCCESS */}
          {reference && !isLoading && !isError && success && (
            <>
              <div
                className="relative mx-auto flex h-28 w-28 items-center justify-center text-success"
                style={{
                  animation: "pvPop .9s .1s cubic-bezier(.2,1.6,.4,1) both",
                }}
              >
                {[0, 0.8, 1.6].map((d) => (
                  <span
                    key={d}
                    className="absolute inset-0 rounded-full border-2 border-success opacity-0"
                    style={{ animation: `pvRing 2.4s ease-out ${d}s infinite` }}
                  />
                ))}
                <svg viewBox="0 0 52 52" className="relative z-[2] h-28 w-28">
                  <circle
                    cx="26"
                    cy="26"
                    r="24"
                    className="fill-none stroke-current [filter:drop-shadow(0_0_8px_currentColor)] [stroke-dasharray:151] [stroke-dashoffset:151] [stroke-width:2.5]"
                    style={{ animation: "pvDraw .8s .2s ease forwards" }}
                  />
                  <path
                    d="M14 27 l8 8 l16 -17"
                    className="fill-none stroke-current [filter:drop-shadow(0_0_6px_currentColor)] [stroke-dasharray:50] [stroke-dashoffset:50] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:4]"
                    style={{ animation: "pvDraw .6s .9s ease forwards" }}
                  />
                </svg>
              </div>

              <h1
                className="mb-2 mt-5 bg-gradient-to-r from-primary via-secondary to-accent bg-[length:300%_100%] bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl"
                style={{
                  animation: "pvUp .6s .3s both, pvText 4s linear infinite",
                }}
              >
                Payment Successful!
              </h1>
              <p
                className="mb-5 text-xs font-medium text-base-content/70 sm:text-sm"
                style={up(".45s")}
              >
                Your booking is confirmed. Get ready for the event! 🎉
              </p>

              {/* NEW — receipt-style summary */}
              <BookingSummary />

              <ReferenceBox tone="success" />

              {isAuthenticated ? (
                <>
                  <p
                    className="mb-2 text-xs font-medium text-base-content/70"
                    style={up(".8s")}
                  >
                    Hi {user?.firstName ? <b>{user.firstName}</b> : "there"},{" "}
                    {stayHere ? (
                      "take your time. Head to your bookings when you're ready."
                    ) : (
                      <>
                        redirecting to your bookings in{" "}
                        <b className="text-primary">{countdown}s</b>...
                      </>
                    )}
                  </p>

                  {!stayHere && (
                    <div className="mb-4 h-1 overflow-hidden rounded-full bg-base-300">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          animation: `pvCountdown ${REDIRECT_DELAY_SECONDS}s linear forwards`,
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <PrimaryBtn
                      onClick={goBookings}
                      label="View My Bookings"
                      icon={<LayoutDashboard size={16} />}
                    />
                    {!stayHere && (
                      <button
                        onClick={() => setStayHere(true)}
                        className="btn btn-ghost btn-sm text-[10px] font-black uppercase tracking-widest"
                      >
                        Stay on this page
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p
                    className="mb-4 text-xs font-medium text-base-content/70"
                    style={up(".8s")}
                  >
                    Please keep this reference for your records.
                  </p>
                  <PrimaryBtn
                    onClick={goHome}
                    label="Back to Home"
                    icon={<Home size={16} />}
                  />
                </>
              )}
            </>
          )}

          {/* Trust footer */}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-base-300 pt-4 text-[10px] font-medium text-base-content/60">
            <ShieldCheck size={14} className="shrink-0 text-primary" />
            <span>Secured by Paystack. Your payment details are never stored.</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentVerify;