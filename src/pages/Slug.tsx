import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  ArrowLeft,
  Ticket,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  CreditCard,
  Plus,
  Minus,
  User,
  Mail,
  Phone,
  Loader2,
  Smartphone,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Trash2,
  ShoppingBag,
  Sparkles,
  Store,
  BadgeCheck,
  ZoomIn,
  X,
  Maximize2,
} from "lucide-react";

import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

import { useGetEventBySlugQuery } from "../features/APIS/EventsApi";
import { useGetTicketTypesByEventIdQuery } from "../features/APIS/ticketsType.Api";
import { useGetMediaByEventIdQuery } from "../features/APIS/mediaApi";
import { useGetVenueByIdQuery } from "../features/APIS/VenueApi";
import { useCreateBookingMutation } from "../features/APIS/BookingsApi";
import {
  useInitiatePaystackMpesaMutation,
  useInitializePaystackCheckoutMutation,
  useCheckPaymentStatusQuery,
  useLazyVerifyPaystackPaymentQuery,
} from "../features/APIS/MpesaApi";
import { useGetServiceFeePreviewQuery } from "../features/APIS/PaymentApi";

import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
 * HELPERS
 * ============================================================ */

const formatKES = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const MpesaLogo = ({ className = "h-6" }: { className?: string }) => (
  <svg viewBox="0 0 120 32" className={className} role="img" aria-label="M-PESA">
    <rect width="120" height="32" rx="8" fill="#43B02A" />
    <text
      x="60"
      y="22"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight="900"
      fontSize="17"
      letterSpacing="1"
      fill="#fff"
    >
      M-PESA
    </text>
  </svg>
);

const PageLoader = () => {
  const mask =
    "radial-gradient(circle 7px at calc(100% - 3.5rem) 0, #0000 98%, #000), radial-gradient(circle 7px at calc(100% - 3.5rem) 100%, #0000 98%, #000)";
  const maskStyle: any = {
    WebkitMask: mask,
    WebkitMaskComposite: "source-in",
    mask,
    maskComposite: "intersect",
  };
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-24 sm:py-32"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <span className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping"></span>
        <div
          style={maskStyle}
          className="relative flex w-44 h-24 rounded-2xl bg-base-200 overflow-hidden shadow-xl"
        >
          <div className="flex-1 flex flex-col justify-center gap-2.5 px-4">
            <span className="h-3 w-3/4 rounded-full bg-base-300 animate-pulse"></span>
            <span className="h-2 w-full rounded-full bg-base-300 animate-pulse"></span>
            <span className="h-2 w-1/2 rounded-full bg-base-300 animate-pulse"></span>
          </div>
          <span className="absolute top-3 bottom-3 right-14 border-l-2 border-dashed border-base-content/20"></span>
          <div className="w-14 shrink-0 bg-primary text-primary-content flex items-center justify-center">
            <Ticket size={26} className="animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-base font-bold">Getting your event ready</p>
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            ></span>
          ))}
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};

const ENDED_STATUSES = new Set([
  "ended",
  "completed",
  "finished",
  "past",
  "closed",
  "expired",
]);

const checkEventEnded = (event: any): boolean => {
  if (!event) return false;
  const status = String(event?.status ?? event?.eventStatus ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (status) return ENDED_STATUSES.has(status);
  const rawDate = event?.endDate ?? event?.date;
  if (!rawDate) return false;
  const end = new Date(rawDate);
  if (isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
};

const BOTTOM_NAV_HEIGHT = "4rem";

type Attendee = { name: string; email: string; phone: string };

const isBlankAttendee = (a: Attendee) =>
  !a.name.trim() && !a.email.trim() && !a.phone.trim();

/* ============================================================
 * CART TYPES
 * ============================================================ */

type CartLine = {
  ticketTypeId: number;
  ticketTypeName: string;
  unitPrice: number;
  quantity: number;
  maxAvailable: number;
};

/* ============================================================
 * ORGANIZER CHIP
 * Shows the organization / organizer name and logo from
 * `event.organization` in the API payload. Renders nothing
 * if the payload has no organization.
 * ============================================================ */

const OrganizerChip = ({ organization }: { organization: any }) => {
  if (!organization) return null;

  const name =
    organization?.name || organization?.organizationName || "Organizer";
  const logoUrl = organization?.logoUrl || organization?.logo;
  const verified = !!organization?.isVerified;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl bg-base-200/70 border border-base-300 pl-1.5 pr-3 py-1.5 max-w-full">
      <span className="w-8 h-8 rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Store size={14} />
        )}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-base-content/50 leading-none">
          Organized by
        </span>
        <div className="flex items-center gap-1 min-w-0">
          <span
            className="text-xs font-black text-base-content truncate"
            title={name}
          >
            {name}
          </span>
          {verified && <BadgeCheck size={12} className="text-primary shrink-0" />}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * PAGE
 * ============================================================ */

export const EventSlugPage = () => {
  const { user: loggedInUser, isAuthenticated } = useSelector(
    (state: any) => state.auth ?? {}
  );

  const loggedInName = [loggedInUser?.firstName, loggedInUser?.lastName]
    .filter((p: unknown) => typeof p === "string" && p.trim())
    .join(" ")
    .trim();

  const loggedInEmail =
    typeof loggedInUser?.email === "string" ? loggedInUser.email : "";

  const { slug } = useParams<{ slug: string }>();

  const {
    data: eventResponse,
    isLoading: isEventLoading,
    isError: isEventError,
  } = useGetEventBySlugQuery(slug || "");

  const event = eventResponse?.data;
  const eventId = event?.id || event?.eventId;
  const eventEnded = checkEventEnded(event);

  const { data: ticketTypesResponse, isLoading: isTicketsLoading } =
    useGetTicketTypesByEventIdQuery(eventId, { skip: !eventId });

  const ticketTypes: any[] = Array.isArray(ticketTypesResponse)
    ? ticketTypesResponse
    : ticketTypesResponse?.data || ticketTypesResponse?.ticketTypes || [];

  const { data: mediaApiResponse } = useGetMediaByEventIdQuery(eventId, {
    skip: !eventId,
  });

  const rawEventMedia = Array.isArray(mediaApiResponse)
    ? mediaApiResponse
    : mediaApiResponse?.data || [];

  const { data: venueResponse } = useGetVenueByIdQuery(Number(event?.venueId), {
    skip: !event?.venueId,
  });

  const venue = event?.venue ?? venueResponse?.data ?? venueResponse;

  const [createBooking, { isLoading: isBookingLoading }] =
    useCreateBookingMutation();

  const [initiatePaystackMpesa, { isLoading: isStkLoading }] =
    useInitiatePaystackMpesaMutation();

  const [initializePaystackCheckout, { isLoading: isCardLoading }] =
    useInitializePaystackCheckoutMutation();

  const [triggerVerifyPayment] = useLazyVerifyPaystackPaymentQuery();

  /* ---------------- CART STATE ---------------- */

  const [cart, setCart] = useState<CartLine[]>([]);
  const [highlightedTierId, setHighlightedTierId] = useState<number | null>(
    null
  );
  const [pickerQuantity, setPickerQuantity] = useState(1);

  const [attendeeDetails, setAttendeeDetails] = useState<Attendee[]>([
    { name: "", email: "", phone: "" },
  ]);

  const [assignNow, setAssignNow] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">(
    "mpesa"
  );

  const [activeTab, setActiveTab] = useState<"overview" | "location">(
    "overview"
  );

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<
    string | null
  >(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [isWaitingForMpesa, setIsWaitingForMpesa] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPickedModal, setShowPickedModal] = useState(false);

  // 🆕 Image zoom lightbox state
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const totalQuantity = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const shouldAssign = assignNow && totalQuantity > 1;

  /* ---------------- AUTH PREFILL ---------------- */

  useEffect(() => {
    if (!isAuthenticated || !loggedInUser) return;
    setAttendeeDetails((prev) => {
      const updated = [...prev];
      const main = updated[0] ?? { name: "", email: "", phone: "" };
      updated[0] = {
        ...main,
        name: loggedInName || main.name,
        email: loggedInEmail || main.email,
      };
      return updated;
    });
  }, [
    isAuthenticated,
    loggedInUser?.firstName,
    loggedInUser?.lastName,
    loggedInUser?.email,
    loggedInName,
    loggedInEmail,
  ]);

  /* ---------------- ATTENDEE SLOTS ---------------- */

  useEffect(() => {
    setAttendeeDetails((prev) => {
      const updated = [...prev];
      if (totalQuantity > updated.length) {
        for (let i = updated.length; i < totalQuantity; i++) {
          updated.push({ name: "", email: "", phone: "" });
        }
      } else if (totalQuantity < updated.length) {
        updated.splice(Math.max(totalQuantity, 1));
      }
      return updated;
    });

    if (totalQuantity <= 1) setAssignNow(false);
  }, [totalQuantity]);

  /* ---------------- MODAL SCROLL LOCK ---------------- */

  const anyModalOpen =
    isWaitingForMpesa ||
    showSuccessModal ||
    showPickedModal ||
    !!checkoutError ||
    zoomOpen;

  useEffect(() => {
    if (!anyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [anyModalOpen]);

 
  /* ---------------- PAYMENT POLLING ---------------- */

  const { data: statusResponse } = useCheckPaymentStatusQuery(
    activeBookingId ?? 0,
    {
      skip: !isWaitingForMpesa || !activeBookingId,
      pollingInterval: 3000,
    }
  );

  useEffect(() => {
    const bookingData = statusResponse?.data || statusResponse;
    const currentStatus = bookingData?.bookingStatus || bookingData?.status;

    if (
      currentStatus === "Confirmed" ||
      currentStatus === "completed" ||
      currentStatus === "paid"
    ) {
      setIsWaitingForMpesa(false);
      setCheckoutSuccessMessage(
        "🎉 Payment confirmed successfully! Your digital gate tickets have been emailed."
      );
      setShowSuccessModal(true);
      setActiveBookingId(null);
      setPaymentReference(null);
    }
  }, [statusResponse]);

  useEffect(() => {
    if (!isWaitingForMpesa || !paymentReference) return;
    const interval = window.setInterval(() => {
      triggerVerifyPayment(paymentReference);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [isWaitingForMpesa, paymentReference, triggerVerifyPayment]);

  /* ---------------- DOC TITLE ---------------- */

  useEffect(() => {
    if (!event?.title) return;
    const previousTitle = document.title;
    document.title = `${event.title} | Tickets`;
    return () => {
      document.title = previousTitle;
    };
  }, [event?.title]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  /* ============================================================
   * CART OPERATIONS
   * ============================================================ */

  const getTierById = (id: number | null) =>
    ticketTypes.find((t) => (t.id || t.ticketTypeId) === id);

  const getMaxForTier = (tier: any) =>
    Math.max(0, (tier?.quantity || 0) - (tier?.sold || 0));

  const getCartQtyFor = (tierId: number) =>
    cart.find((l) => l.ticketTypeId === tierId)?.quantity ?? 0;

  const addToCart = (tier: any, qty: number) => {
    const tierId = Number(tier.id || tier.ticketTypeId);
    const max = getMaxForTier(tier);
    const clamped = Math.max(1, Math.min(qty, max));

    setCart((prev) => {
      const existing = prev.find((l) => l.ticketTypeId === tierId);
      if (existing) {
        return prev.map((l) =>
          l.ticketTypeId === tierId
            ? { ...l, quantity: Math.min(l.quantity + clamped, l.maxAvailable) }
            : l
        );
      }
      return [
        ...prev,
        {
          ticketTypeId: tierId,
          ticketTypeName: tier.name,
          unitPrice: Number(tier.price || 0),
          quantity: clamped,
          maxAvailable: max,
        },
      ];
    });

    setHighlightedTierId(null);
    setPickerQuantity(1);
  };

  const updateCartLine = (tierId: number, newQty: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.ticketTypeId === tierId
            ? {
                ...l,
                quantity: Math.max(1, Math.min(newQty, l.maxAvailable)),
              }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const removeCartLine = (tierId: number) => {
    setCart((prev) => prev.filter((l) => l.ticketTypeId !== tierId));
  };

  /* ============================================================
   * FEE PREVIEW
   * ============================================================ */

  const feeQuery = useGetServiceFeePreviewQuery(
    { amount: cartSubtotal, method: paymentMethod },
    { skip: cartSubtotal <= 0 || eventEnded }
  );

  const feePreview = feeQuery.currentData;
  const feeFailed = feeQuery.isError;

  const serviceFee = feePreview ? Number(feePreview.serviceFee) : 0;
  const serviceFeePercent = feePreview
    ? Number(feePreview.serviceFeePercent)
    : 0;
  const grandTotal = feePreview ? Number(feePreview.totalCharged) : cartSubtotal;
  const feeReady = cartSubtotal <= 0 || !!feePreview;

  /* ============================================================
   * ATTENDEE VALIDATION + PAYLOAD
   * ============================================================ */

  const validateAttendees = () => {
    if (attendeeDetails.length !== totalQuantity) {
      setCheckoutError("Please make sure every ticket has an attendee.");
      return false;
    }
    const main = attendeeDetails[0];
    if (!main?.name?.trim()) {
      setCheckoutError("Please enter your full name.");
      return false;
    }
    if (!main?.email?.trim()) {
      setCheckoutError("Please enter your email address.");
      return false;
    }
    if (!main?.phone?.trim()) {
      setCheckoutError("Please enter your phone number.");
      return false;
    }
    if (shouldAssign) {
      for (let i = 1; i < attendeeDetails.length; i++) {
        const a = attendeeDetails[i];
        if (isBlankAttendee(a)) continue;
        if (!a.name.trim()) {
          setCheckoutError(
            `You started adding details for ticket ${
              i + 1
            }. Please enter a name, or clear the fields to skip it.`
          );
          return false;
        }
      }
    }
    return true;
  };

  const getBookingAttendees = () => {
    const main = {
      name: attendeeDetails[0].name.trim(),
      email: attendeeDetails[0].email.trim(),
      phone: attendeeDetails[0].phone.trim(),
    };
    if (!shouldAssign) {
      return attendeeDetails.map(() => ({ ...main }));
    }
    return attendeeDetails.map((a, i) => {
      if (i === 0 || isBlankAttendee(a)) return { ...main };
      return {
        name: a.name.trim(),
        email: a.email.trim() || main.email,
        phone: a.phone.trim() || main.phone,
      };
    });
  };

  /* ============================================================
   * CHECKOUT
   * ============================================================ */

  const buildBookingPayload = (idempotencyKey: string) => {
    const main = attendeeDetails[0];
    return {
      eventId: Number(eventId),
      lines: cart.map((l) => ({
        ticketTypeId: Number(l.ticketTypeId),
        quantity: l.quantity,
      })),
      guestName: main.name.trim(),
      guestEmail: main.email.trim(),
      guestPhone: main.phone.trim(),
      attendees: getBookingAttendees(),
      idempotencyKey,
    };
  };

  const handleMpesaCheckout = async () => {
    setCheckoutError(null);
    setCheckoutSuccessMessage(null);

    if (eventEnded) {
      setCheckoutError("This event has ended, so tickets can no longer be booked.");
      return;
    }
    if (cart.length === 0) {
      setCheckoutError("Add at least one ticket to your cart before paying.");
      return;
    }
    if (!validateAttendees()) return;

    const main = attendeeDetails[0];

    try {
      const idempotencyKey = `checkout-mpesa-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const bookingResponse: any = await createBooking(
        buildBookingPayload(idempotencyKey) as any
      ).unwrap();

      const responseData = bookingResponse?.data || bookingResponse;
      const createdBookingId = responseData?.bookingId || responseData?.id;

      if (!createdBookingId) {
        throw new Error("Booking record created, but failed to retrieve booking ID.");
      }

      setActiveBookingId(Number(createdBookingId));

      const mpesaResponse: any = await initiatePaystackMpesa({
        phoneNumber: main.phone.trim(),
        bookingId: Number(createdBookingId),
        email: main.email.trim(),
      }).unwrap();

      const mpesaData = mpesaResponse?.data || mpesaResponse;
      setPaymentReference(mpesaData?.reference || null);
      setIsWaitingForMpesa(true);
    } catch (err: any) {
      console.error("M-Pesa Checkout Error:", err);
      setCheckoutError(
        err?.data?.message ||
          err?.data?.error ||
          err?.message ||
          "Failed to trigger M-Pesa payment. Please try again."
      );
    }
  };

  const handleCardCheckout = async () => {
    setCheckoutError(null);
    setCheckoutSuccessMessage(null);

    if (eventEnded) {
      setCheckoutError("This event has ended, so tickets can no longer be booked.");
      return;
    }
    if (cart.length === 0) {
      setCheckoutError("Add at least one ticket to your cart before paying.");
      return;
    }
    if (!validateAttendees()) return;

    const main = attendeeDetails[0];

    try {
      const idempotencyKey = `checkout-card-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const bookingResponse: any = await createBooking(
        buildBookingPayload(idempotencyKey) as any
      ).unwrap();

      const responseData = bookingResponse?.data || bookingResponse;
      const createdBookingId = responseData?.bookingId || responseData?.id;

      if (!createdBookingId) {
        throw new Error("Booking created, but failed to retrieve booking ID.");
      }

      const checkoutResponse: any = await initializePaystackCheckout({
        bookingId: Number(createdBookingId),
        email: main.email.trim(),
      }).unwrap();

      const checkoutData = checkoutResponse?.data || checkoutResponse;
      const authorizationUrl =
        checkoutData?.authorizationUrl || checkoutData?.authorization_url;

      if (authorizationUrl) {
        setCheckoutSuccessMessage("Redirecting to secure Paystack checkout...");
        window.location.href = authorizationUrl;
      } else {
        throw new Error(
          "Paystack checkout initialized, but no redirect URL was returned."
        );
      }
    } catch (err: any) {
      console.error("Card Checkout Error:", err);
      setCheckoutError(
        err?.data?.message ||
          err?.data?.error ||
          err?.message ||
          "Failed to initiate card payment."
      );
    }
  };

  const isProcessing = isBookingLoading || isStkLoading || isCardLoading;

  /* ============================================================
   * MEDIA
   * ============================================================ */

  const galleryRef = useRef<HTMLDivElement>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => setGalleryIndex(0), [activeTab]);

  type GalleryItem = { url: string; type: "image" | "video"; altText?: string };

  const apiMediaItems: GalleryItem[] = rawEventMedia
    .slice()
    .sort(
      (a: any, b: any) => (b?.isPrimary ? 1 : 0) - (a?.isPrimary ? 1 : 0)
    )
    .map((m: any) => ({
      url: m?.url,
      type: m?.type === "video" ? "video" : "image",
      altText: m?.altText,
    }))
    .filter((m: GalleryItem) => Boolean(m.url));

  const embeddedRawMedia = event?.media || event?.images || event?.gallery || [];
  const embeddedMediaItems: GalleryItem[] = (
    Array.isArray(embeddedRawMedia) ? embeddedRawMedia : []
  )
    .map((m: any) =>
      typeof m === "string" ? m : m?.url || m?.imageUrl || m?.mediaUrl
    )
    .filter(Boolean)
    .map((url: string) => ({ url, type: "image" as const }));

  const mediaItems: GalleryItem[] =
    apiMediaItems.length > 0 ? apiMediaItems : embeddedMediaItems;

  if (mediaItems.length === 0 && event?.bannerUrl) {
    mediaItems.push({ url: event.bannerUrl, type: "image" });
  }

  /* ---------------- ZOOM KEYBOARD NAV ---------------- */

useEffect(() => {
  if (!zoomOpen) return;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setZoomOpen(false);

    if (e.key === "ArrowLeft") {
      setZoomIndex((i) => Math.max(0, i - 1));
    }

    if (e.key === "ArrowRight") {
      setZoomIndex((i) =>
        Math.min(mediaItems.length - 1, i + 1)
      );
    }
  };

  window.addEventListener("keydown", onKey);

  return () => window.removeEventListener("keydown", onKey);
}, [zoomOpen, mediaItems.length]);

  const goToMedia = (i: number) => {
    const el = galleryRef.current;
    if (!el || mediaItems.length === 0) return;
    const next = (i + mediaItems.length) % mediaItems.length;
    el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
  };

  const handleGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || !el.clientWidth) return;
    setGalleryIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    if (mediaItems.length <= 1) return;
    const interval = window.setInterval(() => {
      const el = galleryRef.current;
      if (!el || !el.clientWidth) return;
      const next = (galleryIndex + 1) % mediaItems.length;
      el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [galleryIndex, mediaItems.length]);

  // 🆕 Open the zoom lightbox at the currently visible image
  const openZoom = (index: number) => {
    setZoomIndex(index);
    setZoomOpen(true);
  };

  /* ============================================================
   * VENUE
   * ============================================================ */

  const venueName = venue?.name || venue?.venueName || "Venue TBA";
  const venueAddress =
    venue?.location ||
    venue?.address ||
    event?.location ||
    event?.address ||
    "";
  const venueLatitude =
    venue?.latitude ?? venue?.lat ?? event?.latitude ?? event?.lat;
  const venueLongitude =
    venue?.longitude ??
    venue?.lng ??
    venue?.lon ??
    event?.longitude ??
    event?.lng ??
    event?.lon;
  const venueMapQuery =
    venueLatitude && venueLongitude
      ? `${venueLatitude},${venueLongitude}`
      : [venueName, venueAddress].filter(Boolean).join(", ");
  const googleMapsEmbedUrl = venueMapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        venueMapQuery
      )}&output=embed`
    : "";
  const googleMapsUrl = venueMapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        venueMapQuery
      )}`
    : "https://www.google.com/maps";

  const openVenueOnMap = () => {
    setActiveTab("location");
    window.setTimeout(() => {
      document
        .getElementById("event-venue")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  /* ============================================================
   * DATE
   * ============================================================ */

  const eventDateObj = event?.date ? new Date(event.date) : null;
  const hasValidDate = !!eventDateObj && !isNaN(eventDateObj.getTime());
  const dateMonth = hasValidDate
    ? eventDateObj!.toLocaleDateString(undefined, { month: "short" })
    : "";
  const dateDay = hasValidDate ? eventDateObj!.getDate() : "";
  const dateWeekday = hasValidDate
    ? eventDateObj!.toLocaleDateString(undefined, { weekday: "short" })
    : "";

  /* ============================================================
   * STYLES
   * ============================================================ */

  const ticketMask =
    "radial-gradient(circle 9px at calc(100% - 7rem) 0, #0000 98%, #000), radial-gradient(circle 9px at calc(100% - 7rem) 100%, #0000 98%, #000)";
  const ticketMaskStyle: any = {
    WebkitMask: ticketMask,
    WebkitMaskComposite: "source-in",
    mask: ticketMask,
    maskComposite: "intersect",
  };

  const inputCls =
    "input input-bordered w-full h-12 rounded-xl pl-10 text-base sm:text-sm bg-base-100 focus:border-primary focus:outline-none";
  const overlayCls =
    "fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200";
  const sheetCls =
    "bg-base-100 w-full sm:max-w-md max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl shadow-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-300";

  const mpesaSteps = [
    { label: "Payment request sent", state: "done" },
    { label: "Enter your PIN on your phone", state: "active" },
    { label: "Get your tickets by email", state: "todo" },
  ];

  const visibleAttendees = shouldAssign
    ? attendeeDetails
    : attendeeDetails.slice(0, 1);

  const highlightedTier = getTierById(highlightedTierId);
  const highlightedMax = highlightedTier ? getMaxForTier(highlightedTier) : 0;

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content relative">
      <Navbar />

      {/* ---------- POPUP 1: Waiting for M-Pesa ---------- */}
      {isWaitingForMpesa && (
        <div className={overlayCls}>
          <div className={sheetCls}>
            <div className="bg-[#43B02A]/10 px-6 pt-8 pb-6 text-center space-y-3">
              <div className="relative w-20 h-20 mx-auto">
                <span className="absolute inset-0 rounded-full bg-[#43B02A]/25 animate-ping"></span>
                <span className="relative w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center border border-base-300">
                  <MpesaLogo className="h-7" />
                </span>
              </div>
              <h3 className="text-2xl font-black">Check your phone</h3>
              <p className="text-sm text-base-content/70 leading-relaxed">
                We sent a payment request for{" "}
                <span className="font-bold text-base-content">
                  KES {formatKES(grandTotal)}
                </span>{" "}
                to{" "}
                <span className="font-bold text-base-content">
                  {attendeeDetails[0]?.phone}
                </span>
                .
              </p>
              {serviceFee > 0 && (
                <p className="text-xs text-base-content/60">
                  Includes KES {formatKES(serviceFee)} service fee
                </p>
              )}
            </div>
            <div className="px-6 py-6 space-y-5">
              <ol className="space-y-4">
                {mpesaSteps.map((s) => (
                  <li key={s.label} className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        s.state === "done"
                          ? "bg-success text-success-content"
                          : s.state === "active"
                          ? "bg-primary text-primary-content"
                          : "bg-base-300 text-base-content/40"
                      }`}
                    >
                      {s.state === "done" ? (
                        <Check size={15} strokeWidth={3} />
                      ) : s.state === "active" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        s.state === "todo" ? "text-base-content/40" : ""
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-base-content/60 text-center">
                Please keep this page open. It updates by itself once you pay.
              </p>
              <button
                onClick={() => {
                  setIsWaitingForMpesa(false);
                  setActiveBookingId(null);
                  setPaymentReference(null);
                }}
                className="btn btn-ghost h-12 rounded-2xl text-base-content/70 w-full"
              >
                Cancel payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP: Tier picker (add quantity to cart) ---------- */}
      {showPickedModal && highlightedTier && (
        <div className={overlayCls} onClick={() => setShowPickedModal(false)}>
          <div className={sheetCls} onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary/10 px-6 pt-7 pb-5 text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center mx-auto shadow-lg mb-2">
                <ShoppingBag size={26} strokeWidth={3} />
              </div>
              <p className="text-sm font-semibold text-primary">Add to cart</p>
              <h3 className="text-2xl font-black break-words">
                {highlightedTier.name}
              </h3>
              <p className="text-sm text-base-content/70">
                KES {Number(highlightedTier.price || 0).toLocaleString()} per
                ticket
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">How many tickets?</label>
                <div className="flex items-center justify-between bg-base-200/60 p-2 rounded-2xl border border-base-300">
                  <button
                    onClick={() =>
                      setPickerQuantity((q) => Math.max(1, q - 1))
                    }
                    disabled={pickerQuantity <= 1}
                    className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                    aria-label="Fewer tickets"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black leading-none">
                      {pickerQuantity}
                    </span>
                    <span className="text-xs text-base-content/50 mt-1">
                      {pickerQuantity === 1 ? "ticket" : "tickets"}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPickerQuantity((q) =>
                        Math.min(highlightedMax, q + 1)
                      )
                    }
                    disabled={pickerQuantity >= highlightedMax}
                    className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                    aria-label="More tickets"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p
                  className={`text-xs ${
                    pickerQuantity >= highlightedMax
                      ? "text-warning font-semibold"
                      : "text-base-content/50"
                  }`}
                >
                  {pickerQuantity >= highlightedMax
                    ? "That's all the tickets left for this tier"
                    : `${highlightedMax} tickets available`}
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-sm text-base-content/70">
                  <span>Tickets</span>
                  <span className="font-semibold">
                    KES{" "}
                    {formatKES(
                      Number(highlightedTier.price || 0) * pickerQuantity
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-black pt-1.5 border-t border-base-300">
                  <span>Line total</span>
                  <span className="text-primary">
                    KES{" "}
                    {formatKES(
                      Number(highlightedTier.price || 0) * pickerQuantity
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  addToCart(highlightedTier, pickerQuantity);
                  setShowPickedModal(false);
                  setTimeout(() => {
                    document
                      .getElementById("holder-details")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }, 100);
                }}
                className="btn btn-primary h-14 rounded-2xl w-full font-black text-base gap-2"
              >
                <ShoppingBag size={18} /> Add to cart
              </button>

              <button
                onClick={() => setShowPickedModal(false)}
                className="btn btn-ghost h-11 rounded-2xl w-full text-base-content/70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP 2: Payment success ---------- */}
      {showSuccessModal && (
        <div className={overlayCls}>
          <div className={sheetCls}>
            <div className="bg-success/10 px-6 pt-8 pb-6 text-center space-y-3">
              <div className="relative w-20 h-20 mx-auto">
                <span className="absolute inset-0 rounded-full bg-success/30 animate-ping"></span>
                <span className="relative w-20 h-20 rounded-full bg-success text-success-content flex items-center justify-center shadow-lg">
                  <Check size={40} strokeWidth={3} />
                </span>
              </div>
              <h3 className="text-2xl font-black">You're going!</h3>
              <p className="text-sm text-base-content/70 leading-relaxed">
                Payment received. We emailed your tickets to{" "}
                <span className="font-bold text-base-content break-all">
                  {attendeeDetails[0]?.email}
                </span>
                .
              </p>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">Event</span>
                  <span className="font-bold text-right">{event?.title}</span>
                </div>

                {cart.map((line) => (
                  <div
                    key={line.ticketTypeId}
                    className="flex justify-between gap-4"
                  >
                    <span className="text-base-content/60">
                      {line.ticketTypeName} × {line.quantity}
                    </span>
                    <span className="font-bold">
                      KES {formatKES(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                ))}

                {serviceFee > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-base-content/60">Service fee</span>
                    <span className="font-bold">
                      KES {formatKES(serviceFee)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4 pt-2.5 border-t border-base-300 text-base">
                  <span className="font-bold">Total paid</span>
                  <span className="font-black text-success">
                    KES {formatKES(grandTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCheckoutSuccessMessage(null);
                  setCart([]);
                }}
                className="btn btn-primary h-14 rounded-2xl w-full font-black text-base"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP 3: Error ---------- */}
      {checkoutError && (
        <div className={overlayCls}>
          <div className={sheetCls}>
            <div className="px-6 pt-8 pb-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black">We couldn't continue</h3>
              <p className="text-sm text-base-content/70 leading-relaxed">
                {checkoutError}
              </p>
              <button
                onClick={() => setCheckoutError(null)}
                className="btn btn-primary h-12 rounded-2xl w-full font-bold mt-2"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP 4: 🆕 Image zoom lightbox ---------- */}
      {zoomOpen && mediaItems.length > 0 && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in fade-in duration-200"
          onClick={() => setZoomOpen(false)}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold">
              {zoomIndex + 1} / {mediaItems.length}
            </span>
            <button
              onClick={() => setZoomOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Close image"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image area */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center px-3 sm:px-10 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={mediaItems[zoomIndex]?.url}
              alt={mediaItems[zoomIndex]?.altText || event?.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Prev/next */}
          {mediaItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((i) => Math.max(0, i - 1));
                }}
                disabled={zoomIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center disabled:opacity-30"
                aria-label="Previous image"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((i) =>
                    Math.min(mediaItems.length - 1, i + 1)
                  );
                }}
                disabled={zoomIndex === mediaItems.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center disabled:opacity-30"
                aria-label="Next image"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Footer hint */}
          <p
            className="shrink-0 text-center text-[11px] text-white/60 px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            Tap outside or press Esc to close · use ← → to navigate
          </p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-48 lg:pb-24 w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/events"
              className="btn btn-ghost btn-circle w-10 h-10 min-h-0 shrink-0 bg-base-200/70 hover:bg-base-200 sm:hidden"
              aria-label="Back to events"
            >
              <ArrowLeft size={18} />
            </Link>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-sm text-base-content/60 whitespace-nowrap overflow-hidden">
                <li className="shrink-0 hidden sm:block">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Home size={14} />
                    <span>Home</span>
                  </Link>
                </li>
                <li className="shrink-0 hidden sm:flex items-center gap-1.5">
                  <ChevronRight size={14} className="opacity-50" />
                  <Link
                    to="/events"
                    className="hover:text-primary transition-colors"
                  >
                    Events
                  </Link>
                </li>
                <li className="min-w-0 flex items-center gap-1.5">
                  <ChevronRight
                    size={14}
                    className="opacity-50 shrink-0 hidden sm:block"
                  />
                  <span
                    aria-current="page"
                    className="truncate font-semibold text-base-content"
                  >
                    {event?.title || "Event"}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShare}
              className="btn btn-ghost btn-circle w-10 h-10 min-h-0 bg-base-200/70 hover:bg-base-200"
              title="Share event"
              aria-label="Share event"
            >
              <Share2 size={17} />
            </button>
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`btn btn-ghost btn-circle w-10 h-10 min-h-0 ${
                isBookmarked
                  ? "text-primary bg-primary/10"
                  : "bg-base-200/70 hover:bg-base-200"
              }`}
              title="Bookmark event"
              aria-label="Bookmark event"
            >
              <Bookmark
                size={17}
                className={isBookmarked ? "fill-primary" : ""}
              />
            </button>
          </div>
        </div>

        {copiedLink && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 alert alert-success py-2.5 px-5 rounded-full text-sm font-semibold w-fit flex items-center gap-2 shadow-lg">
            <CheckCircle2 size={16} /> Link copied
          </div>
        )}

        {isEventLoading ? (
          <PageLoader />
        ) : isEventError || !event ? (
          <div className="text-center py-20 px-6 bg-base-200/50 rounded-3xl space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
              <AlertCircle size={30} />
            </div>
            <h3 className="text-2xl font-extrabold">Event unavailable</h3>
            <p className="text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
              This event may have ended, been unlisted, or the link may be
              incorrect.
            </p>
            <Link
              to="/events"
              className="btn btn-primary rounded-full font-bold px-8"
            >
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {/* Hero */}
            <section className="space-y-5 sm:space-y-6">
              {/* 🆕 Well-fitted hero with click-to-zoom */}
              <div className="relative w-full overflow-hidden rounded-3xl bg-base-300 shadow-lg aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1] lg:max-h-[30rem]">
                {/* Blurred backdrop so the picture never looks stretched */}
                {mediaItems[galleryIndex]?.type !== "video" &&
                  mediaItems[galleryIndex]?.url && (
                    <img
                      src={mediaItems[galleryIndex].url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 pointer-events-none"
                    />
                  )}

                {mediaItems.length > 0 ? (
                  <div
                    ref={galleryRef}
                    onScroll={handleGalleryScroll}
                    className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {mediaItems.map((item, i) => (
                      <div
                        key={i}
                        className="w-full h-full shrink-0 snap-center relative"
                      >
                        {item.type === "video" ? (
                          <video
                            src={item.url}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain bg-black"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => openZoom(i)}
                            className="relative w-full h-full flex items-center justify-center group cursor-zoom-in"
                            aria-label="Click to zoom image"
                          >
                            <img
                              src={item.url}
                              alt={
                                item.altText || `${event.title} photo ${i + 1}`
                              }
                              loading={i === 0 ? "eager" : "lazy"}
                              className="max-w-full max-h-full object-contain"
                            />
                            {/* 🆕 Zoom hint */}
                            <span className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[11px] font-bold px-3 py-1.5 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity">
                              <ZoomIn size={13} /> Click to zoom
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {event.bannerUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(event.bannerUrl!, "_blank", "noopener")
                        }
                        className="absolute inset-0 cursor-zoom-in group"
                        aria-label="Click to zoom image"
                      >
                        <img
                          src={event.bannerUrl}
                          alt={event.title}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <span className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[11px] font-bold px-3 py-1.5 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity">
                          <ZoomIn size={13} /> Click to zoom
                        </span>
                      </button>
                    ) : (
                      <div className="absolute inset-0 bg-base-200 flex items-center justify-center">
                        <CalendarIcon className="w-16 h-16 sm:w-20 sm:h-20 text-base-content/20" />
                      </div>
                    )}
                  </>
                )}

                {mediaItems.length > 1 && (
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                )}

                {mediaItems.length > 1 && (
                  <>
                    <span className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-xs font-bold text-white bg-black/55 backdrop-blur px-3 py-1.5 rounded-full">
                      {galleryIndex + 1} / {mediaItems.length}
                    </span>
                    <button
                      onClick={() => goToMedia(galleryIndex - 1)}
                      className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-base-100/90 shadow-md items-center justify-center hover:bg-base-100 active:scale-95 transition"
                      aria-label="Previous media"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => goToMedia(galleryIndex + 1)}
                      className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-base-100/90 shadow-md items-center justify-center hover:bg-base-100 active:scale-95 transition"
                      aria-label="Next media"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-10 flex justify-center gap-1.5">
                      {mediaItems.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToMedia(i)}
                          aria-label={`Go to media ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            i === galleryIndex
                              ? "w-6 bg-white"
                              : "w-1.5 bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Event header */}
              <div className="flex items-start gap-4 sm:gap-5">
                {hasValidDate && (
                  <div className="shrink-0 w-[4.25rem] sm:w-20 overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-center shadow-sm">
                    <div className="bg-primary text-primary-content text-xs font-bold py-1">
                      {dateMonth}
                    </div>
                    <div className="py-2">
                      <div className="text-3xl sm:text-4xl font-black leading-none">
                        {dateDay}
                      </div>
                      <div className="text-[11px] font-medium text-base-content/60 mt-1">
                        {dateWeekday}
                      </div>
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold capitalize">
                      {(
                        event.category?.replace("_", " ") || "Featured event"
                      ).toLowerCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Verified gate ticket
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] break-words">
                    {event.title}
                  </h1>

                  {/* 🆕 ORGANIZER */}
                  {event.organization && (
                    <div className="pt-0.5">
                      <OrganizerChip organization={event.organization} />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 text-sm font-medium">
                    <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
                      <CalendarIcon
                        size={15}
                        className="text-primary shrink-0"
                      />
                      <span>
                        {new Date(event.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
                      <Clock size={15} className="text-primary shrink-0" />
                      <span>{event.time || "Time TBA"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={openVenueOnMap}
                      className="inline-flex items-center gap-2 min-w-0 max-w-full rounded-full bg-base-200 px-3 py-1.5 text-left hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={`View ${venueName} on the map`}
                    >
                      <MapPin size={15} className="text-primary shrink-0" />
                      <span className="truncate">{venueName}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {eventEnded && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/70 px-4 py-3.5"
              >
                <AlertCircle
                  size={20}
                  className="text-warning shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <p className="font-extrabold text-sm sm:text-base">
                    This event has ended
                  </p>
                  <p className="text-sm text-base-content/70">
                    Ticket sales are closed, so booking is no longer available.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
              {/* LEFT */}
              <div className="lg:col-span-2 space-y-10 min-w-0">
                {/* Step 1: ticket tiers */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center font-black shrink-0">
                        1
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Pick your tickets
                      </h2>
                    </div>
                    <span className="text-xs sm:text-sm text-base-content/60 font-medium shrink-0">
                      {eventEnded
                        ? "Sales closed"
                        : `${ticketTypes.length} to choose from`}
                    </span>
                  </div>

                  {eventEnded ? (
                    <div className="text-center py-14 px-6 bg-base-200/50 rounded-3xl border border-dashed border-base-300 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-neutral/10 text-neutral flex items-center justify-center mx-auto">
                        <Clock size={28} />
                      </div>
                      <h4 className="font-extrabold text-lg">
                        Ticket sales have closed
                      </h4>
                      <p className="text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
                        This event has ended, so tickets can no longer be
                        bought.
                      </p>
                      <Link
                        to="/events"
                        className="btn btn-primary rounded-full font-bold px-8"
                      >
                        Browse upcoming events
                      </Link>
                    </div>
                  ) : isTicketsLoading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-24 w-full bg-base-300 rounded-xl"></div>
                      <div className="h-24 w-full bg-base-300 rounded-xl"></div>
                    </div>
                  ) : ticketTypes.length === 0 ? (
                    <div className="text-center py-14 px-6 bg-base-200/50 rounded-3xl border border-dashed border-base-300 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto">
                        <AlertCircle size={28} />
                      </div>
                      <h4 className="font-extrabold text-lg">
                        Tickets are not on sale yet
                      </h4>
                      <p className="text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
                        The organizer has not opened ticket sales for this
                        event. Please check back soon.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                      {ticketTypes.map((tier: any) => {
                        const tierId = Number(tier.id || tier.ticketTypeId);
                        const isSoldOut =
                          tier.sold >= tier.quantity || tier.isSoldOut;
                        const remaining = getMaxForTier(tier);
                        const inCartQty = getCartQtyFor(tierId);
                        const isLow =
                          !isSoldOut && remaining > 0 && remaining <= 10;
                        const isHighlighted = highlightedTierId === tierId;

                        return (
                          <div
                            key={tierId}
                            role="button"
                            aria-pressed={isHighlighted}
                            tabIndex={isSoldOut ? -1 : 0}
                            onClick={() => {
                              if (isSoldOut) return;
                              setHighlightedTierId(tierId);
                              setPickerQuantity(1);
                              setShowPickedModal(true);
                            }}
                            className={`drop-shadow-md transition-transform duration-200 focus-visible:outline-none ${
                              isSoldOut
                                ? "opacity-60 grayscale cursor-not-allowed"
                                : "cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]"
                            } ${
                              isHighlighted || inCartQty > 0
                                ? "drop-shadow-xl"
                                : ""
                            }`}
                          >
                            <div
                              style={ticketMaskStyle}
                              className="relative flex rounded-2xl bg-base-200 overflow-hidden"
                            >
                              <div
                                className={`flex-1 min-w-0 px-4 sm:px-5 py-4 flex flex-col justify-center gap-1.5 ${
                                  isHighlighted || inCartQty > 0
                                    ? "bg-primary/10"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-base leading-snug line-clamp-2 break-words">
                                    {tier.name}
                                  </h4>
                                  {inCartQty > 0 && (
                                    <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-content px-2 py-0.5 rounded-full">
                                      <ShoppingBag size={11} />{" "}
                                      {inCartQty} in cart
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-base-content/70 leading-snug line-clamp-2">
                                  {tier.description ||
                                    "Entry to the event. Show your QR code at the gate."}
                                </p>
                                <p
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                    isSoldOut
                                      ? "text-error"
                                      : isLow
                                      ? "text-warning"
                                      : "text-success"
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {isSoldOut
                                    ? "Sold out"
                                    : isLow
                                    ? `Only ${remaining} left`
                                    : `${remaining} available`}
                                </p>
                              </div>

                              <div
                                className={`absolute top-4 bottom-4 right-28 border-l-2 border-dashed ${
                                  isHighlighted || inCartQty > 0
                                    ? "border-primary/40"
                                    : "border-base-content/20"
                                }`}
                              ></div>

                              <div
                                className={`w-28 shrink-0 flex flex-col items-center justify-center gap-2 px-2 py-4 text-center ${
                                  isHighlighted || inCartQty > 0
                                    ? "bg-primary text-primary-content"
                                    : "bg-base-300/40"
                                }`}
                              >
                                <div className="leading-none">
                                  <p className="text-[11px] font-bold opacity-70 mb-1">
                                    KES
                                  </p>
                                  <p
                                    className={`text-xl font-black ${
                                      isHighlighted || inCartQty > 0
                                        ? ""
                                        : "text-primary"
                                    }`}
                                  >
                                    {Number(tier.price || 0).toLocaleString()}
                                  </p>
                                </div>
                                {isSoldOut ? (
                                  <span className="text-[11px] font-bold text-base-content/50">
                                    Not available
                                  </span>
                                ) : inCartQty > 0 ? (
                                  <span className="w-7 h-7 rounded-full flex items-center justify-center bg-primary-content text-primary border-2 border-primary-content">
                                    <Check size={16} strokeWidth={3} />
                                  </span>
                                ) : (
                                  <span className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-base-content/25 text-transparent">
                                    <Plus size={16} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-2.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                        <ShoppingBag size={14} />
                      </span>
                      <span className="min-w-0">
                        <b className="font-extrabold">
                          {totalQuantity}{" "}
                          {totalQuantity === 1 ? "ticket" : "tickets"}
                        </b>{" "}
                        in your cart · <b>KES {formatKES(cartSubtotal)}</b>
                      </span>
                    </div>
                  )}
                </section>

                {/* Step 2: attendees */}
                {cart.length > 0 && (
                  <section
                    id="holder-details"
                    className="space-y-4 animate-in fade-in duration-300 scroll-mt-24"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center font-black shrink-0">
                        2
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                          Who is coming?
                        </h3>
                        <p className="text-sm text-base-content/60 mt-0.5">
                          {totalQuantity > 1
                            ? shouldAssign
                              ? "Your details are required. Details for the other tickets are optional."
                              : "Just your details are needed. All tickets will be sent to you."
                            : "Add your details so we can send your ticket."}
                        </p>
                      </div>
                    </div>

                    {totalQuantity > 1 && (
                      <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4 space-y-3">
                        <div>
                          <p className="text-sm font-bold">
                            Do you want to assign these {totalQuantity} tickets
                            now?
                          </p>
                          <p className="text-xs text-base-content/60 mt-0.5">
                            If not, all tickets will be sent to you and you can
                            share them with your guests later.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAssignNow(false)}
                            className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                              !assignNow
                                ? "border-primary bg-primary/10"
                                : "border-base-300 bg-base-100 hover:border-base-content/30"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                !assignNow
                                  ? "bg-primary border-primary text-primary-content"
                                  : "border-base-content/25 text-transparent"
                              }`}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                            No, send them all to me
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignNow(true)}
                            className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                              assignNow
                                ? "border-primary bg-primary/10"
                                : "border-base-300 bg-base-100 hover:border-base-content/30"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                assignNow
                                  ? "bg-primary border-primary text-primary-content"
                                  : "border-base-content/25 text-transparent"
                              }`}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                            Yes, assign now
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {visibleAttendees.map((attendee, index) => (
                        <div
                          key={index}
                          className="p-4 sm:p-5 rounded-2xl bg-base-100 border border-base-300 shadow-sm space-y-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold leading-tight">
                                  {shouldAssign
                                    ? `ticket ${index + 1}`
                                    : "Your details"}
                                </p>
                                {index === 0 ? (
                                  <p className="text-xs font-semibold text-primary">
                                    {shouldAssign
                                      ? "Main contact · required"
                                      : "Buyer · required"}
                                  </p>
                                ) : (
                                  <p className="text-xs font-semibold text-base-content/50">
                                    Optional
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                <User size={16} />
                              </span>
                              <input
                                type="text"
                                autoComplete={index === 0 ? "name" : "off"}
                                placeholder={
                                  index === 0
                                    ? "Full name"
                                    : "Full name (optional)"
                                }
                                value={attendee.name}
                                readOnly={
                                  index === 0 &&
                                  isAuthenticated &&
                                  !!loggedInName
                                }
                                onChange={(e) =>
                                  setAttendeeDetails((prev) => {
                                    const updated = [...prev];
                                    updated[index] = {
                                      ...updated[index],
                                      name: e.target.value,
                                    };
                                    return updated;
                                  })
                                }
                                className={`${inputCls} ${
                                  index === 0 &&
                                  isAuthenticated &&
                                  loggedInName
                                    ? "cursor-not-allowed bg-base-200/70"
                                    : ""
                                }`}
                                required={index === 0}
                              />
                            </div>

                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                <Phone size={16} />
                              </span>
                              <input
                                type="tel"
                                autoComplete={index === 0 ? "tel" : "off"}
                                inputMode="tel"
                                placeholder={
                                  index === 0
                                    ? "Phone (e.g. 2547...)"
                                    : "Phone (optional)"
                                }
                                value={attendee.phone}
                                onChange={(e) =>
                                  setAttendeeDetails((prev) => {
                                    const updated = [...prev];
                                    updated[index] = {
                                      ...updated[index],
                                      phone: e.target.value,
                                    };
                                    return updated;
                                  })
                                }
                                className={inputCls}
                                required={index === 0}
                              />
                            </div>

                            <div className="relative sm:col-span-2">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                <Mail size={16} />
                              </span>
                              <input
                                type="email"
                                autoComplete={index === 0 ? "email" : "off"}
                                inputMode="email"
                                placeholder={
                                  index === 0
                                    ? "Email address"
                                    : "Email address (optional)"
                                }
                                value={attendee.email}
                                readOnly={
                                  index === 0 &&
                                  isAuthenticated &&
                                  !!loggedInEmail
                                }
                                onChange={(e) =>
                                  setAttendeeDetails((prev) => {
                                    const updated = [...prev];
                                    updated[index] = {
                                      ...updated[index],
                                      email: e.target.value,
                                    };
                                    return updated;
                                  })
                                }
                                className={`${inputCls} ${
                                  index === 0 &&
                                  isAuthenticated &&
                                  loggedInEmail
                                    ? "cursor-not-allowed bg-base-200/70"
                                    : ""
                                }`}
                                required={index === 0}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {shouldAssign && (
                        <p className="text-xs text-base-content/60 flex items-start gap-2 px-1">
                          <Info size={14} className="shrink-0 mt-0.5" />
                          Tickets without details are sent to the main
                          contact's email.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Info tabs */}
                <section className="space-y-5">
                  <div className="inline-flex max-w-full overflow-x-auto scrollbar-none p-1 rounded-full bg-base-200 border border-base-300">
                    {[
                      { id: "overview", label: "About", icon: Info },
                      { id: "location", label: "Venue", icon: Building2 },
                    ].map((tab) => {
                      const IconComponent = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 shrink-0 h-10 px-4 sm:px-5 rounded-full text-sm font-bold transition-colors ${
                            active
                              ? "bg-base-100 text-primary shadow-sm"
                              : "text-base-content/60 hover:text-base-content"
                          }`}
                        >
                          <IconComponent size={16} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="animate-in fade-in duration-300">
                    {activeTab === "overview" && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-extrabold flex items-center gap-2">
                          <FileText size={18} className="text-primary" /> About
                          this event
                        </h3>
                        <p className="text-base text-base-content/80 leading-relaxed whitespace-pre-line max-w-prose break-words">
                          {event.description ||
                            "No full description provided for this event yet."}
                        </p>
                      </div>
                    )}

                    {activeTab === "location" && (
                      <div id="event-venue" className="space-y-4 scroll-mt-24">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h3 className="text-lg font-extrabold flex items-center gap-2">
                            <Building2 size={18} className="text-primary" />{" "}
                            Venue
                          </h3>
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm h-10 btn-outline rounded-full gap-2 w-full sm:w-auto"
                          >
                            <MapPin size={15} />
                            Open in Google Maps
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              googleMapsUrl,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="w-full text-left p-4 rounded-2xl bg-base-100 border border-base-300 shadow-sm hover:border-primary/40 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <MapPin size={20} />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h4 className="font-extrabold text-base break-words">
                                {venueName}
                              </h4>
                              <p className="text-sm text-base-content/70 break-words">
                                {venueAddress ||
                                  "The exact location is sent with your ticket."}
                              </p>
                              <p className="text-xs font-bold text-primary pt-1">
                                Tap to open directions in Google Maps →
                              </p>
                            </div>
                          </div>
                        </button>

                        {googleMapsEmbedUrl ? (
                          <div className="relative w-full overflow-hidden rounded-2xl border border-base-300 bg-base-200 shadow-sm aspect-[4/3] sm:aspect-[16/9]">
                            <iframe
                              title={`Map showing ${venueName}`}
                              src={googleMapsEmbedUrl}
                              className="absolute inset-0 w-full h-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-base-300 bg-base-200/50 p-6 text-center">
                            <MapPin
                              size={30}
                              className="mx-auto text-primary mb-2"
                            />
                            <p className="text-sm text-base-content/70">
                              A map will appear once this venue has a location
                              or address.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* RIGHT: CART + CHECKOUT */}
              <aside
                id="checkout"
                className="lg:col-span-1 lg:sticky lg:top-28 scroll-mt-24 min-w-0"
              >
                <div className="bg-base-100 border border-base-300 rounded-3xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-base-200/70 border-b border-base-300">
                    <h3 className="text-lg font-extrabold flex items-center gap-2">
                      <ShoppingBag size={18} className="text-primary" />
                      Your cart
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full shrink-0">
                      <ShieldCheck size={13} /> Instant ticket
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    {checkoutSuccessMessage && !showSuccessModal && (
                      <div className="alert alert-success p-3 rounded-2xl text-sm font-medium flex items-start gap-2">
                        <CheckCircle2
                          size={16}
                          className="shrink-0 mt-0.5"
                        />
                        <span>{checkoutSuccessMessage}</span>
                      </div>
                    )}

                    {eventEnded ? (
                      <div className="text-center py-8 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-neutral/10 text-neutral flex items-center justify-center mx-auto">
                          <Ticket size={26} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold">Event ended</h4>
                          <p className="text-sm text-base-content/70 max-w-xs mx-auto">
                            Booking is closed for this event.
                          </p>
                        </div>
                      </div>
                    ) : cart.length === 0 ? (
                      <div className="text-center py-8 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          <Ticket size={26} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold">Your cart is empty</h4>
                          <p className="text-sm text-base-content/70 max-w-xs mx-auto">
                            Pick any ticket type above to add it here. You can
                            mix Comrade, Regular and VIP in one checkout.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="space-y-2">
                          {cart.map((line) => (
                            <div
                              key={line.ticketTypeId}
                              className="rounded-2xl border border-base-300 bg-base-200/60 p-3 flex items-center gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-sm leading-snug break-words">
                                  {line.ticketTypeName}
                                </p>
                                <p className="text-xs text-base-content/60">
                                  KES {formatKES(line.unitPrice)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() =>
                                    updateCartLine(
                                      line.ticketTypeId,
                                      line.quantity - 1
                                    )
                                  }
                                  disabled={line.quantity <= 1}
                                  className="btn btn-ghost btn-xs w-7 h-7 min-h-0 rounded-md disabled:opacity-30"
                                  aria-label={`Fewer ${line.ticketTypeName}`}
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 text-center text-sm font-black">
                                  {line.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCartLine(
                                      line.ticketTypeId,
                                      line.quantity + 1
                                    )
                                  }
                                  disabled={
                                    line.quantity >= line.maxAvailable
                                  }
                                  className="btn btn-ghost btn-xs w-7 h-7 min-h-0 rounded-md disabled:opacity-30"
                                  aria-label={`More ${line.ticketTypeName}`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <button
                                onClick={() =>
                                  removeCartLine(line.ticketTypeId)
                                }
                                className="btn btn-ghost btn-xs w-7 h-7 min-h-0 rounded-md text-error"
                                aria-label={`Remove ${line.ticketTypeName}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            document
                              .getElementById("ticket-tiers")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="btn btn-ghost btn-sm w-full rounded-xl border border-dashed border-base-300 text-primary font-bold"
                        >
                          <Plus size={14} /> Add another ticket type
                        </button>

                        <div className="space-y-2">
                          <label className="text-sm font-bold">Pay with</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("mpesa")}
                              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                                paymentMethod === "mpesa"
                                  ? "border-[#43B02A] bg-[#43B02A]/10 shadow-md"
                                  : "border-base-300 bg-base-100 hover:border-base-content/30"
                              }`}
                            >
                              {paymentMethod === "mpesa" && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#43B02A] text-white flex items-center justify-center">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              )}
                              <MpesaLogo className="h-7" />
                              <span className="text-[11px] font-semibold text-base-content/60">
                                Pay from your phone
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("card")}
                              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                                paymentMethod === "card"
                                  ? "border-primary bg-primary/10 shadow-md"
                                  : "border-base-300 bg-base-100 hover:border-base-content/30"
                              }`}
                            >
                              {paymentMethod === "card" && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              )}
                              <span className="h-7 flex items-center gap-2 font-black text-sm">
                                <CreditCard
                                  size={20}
                                  className="text-primary"
                                />{" "}
                                Card
                              </span>
                              <span className="text-[11px] font-semibold text-base-content/60">
                                Visa · Mastercard
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-dashed border-base-300 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-base-content/70">
                              Subtotal ({totalQuantity}{" "}
                              {totalQuantity === 1 ? "ticket" : "tickets"})
                            </span>
                            <span className="font-bold shrink-0">
                              KES {formatKES(cartSubtotal)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-base-content/70">
                              Service fee
                              {feePreview && serviceFeePercent > 0
                                ? ` (${serviceFeePercent}%)`
                                : ""}
                            </span>
                            {cartSubtotal <= 0 ? (
                              <span className="font-bold text-success shrink-0">
                                Free
                              </span>
                            ) : feePreview ? (
                              <span className="font-bold shrink-0">
                                KES {formatKES(serviceFee)}
                              </span>
                            ) : feeFailed ? (
                              <button
                                type="button"
                                onClick={() => feeQuery.refetch()}
                                className="text-xs font-bold text-error underline shrink-0"
                              >
                                Retry
                              </button>
                            ) : (
                              <span className="inline-block h-4 w-16 rounded bg-base-300 animate-pulse shrink-0"></span>
                            )}
                          </div>

                          {feePreview && serviceFee > 0 && (
                            <p className="text-[11px] text-base-content/50 leading-snug flex items-start gap-1.5">
                              <Sparkles
                                size={12}
                                className="shrink-0 mt-0.5 text-primary"
                              />
                              Buy more tickets in one order to unlock a lower
                              fee.
                            </p>
                          )}

                          {feeFailed && (
                            <p className="text-xs text-error leading-snug">
                              We couldn't load the fees. Please retry before
                              paying.
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-3 text-xl font-black pt-3 border-t border-base-300">
                            <span>Total</span>
                            {feeReady ? (
                              <span className="text-primary shrink-0">
                                KES {formatKES(grandTotal)}
                              </span>
                            ) : (
                              <span className="inline-block h-6 w-24 rounded bg-base-300 animate-pulse shrink-0"></span>
                            )}
                          </div>
                        </div>

                        {paymentMethod === "mpesa" ? (
                          <>
                            <button
                              onClick={handleMpesaCheckout}
                              disabled={isProcessing || !feeReady}
                              className="btn w-full h-14 rounded-2xl font-black text-base gap-3 border-0 text-white bg-[#43B02A] hover:bg-[#3a9a24] shadow-lg shadow-[#43B02A]/30 disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2
                                    size={18}
                                    className="animate-spin"
                                  />{" "}
                                  Sending request...
                                </>
                              ) : (
                                <>
                                  <span className="bg-white rounded-lg px-1.5 py-1 flex items-center">
                                    <MpesaLogo className="h-4" />
                                  </span>
                                  {feeReady
                                    ? `Pay KES ${formatKES(grandTotal)}`
                                    : "Calculating..."}
                                </>
                              )}
                            </button>
                            <p className="text-xs text-center text-base-content/60 -mt-2">
                              A payment prompt will be sent to{" "}
                              <span className="font-bold">
                                {attendeeDetails[0]?.phone || "your phone"}
                              </span>
                            </p>
                          </>
                        ) : (
                          <button
                            onClick={handleCardCheckout}
                            disabled={isProcessing || !feeReady}
                            className="btn btn-primary w-full h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/25 gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />{" "}
                                Opening card page...
                              </>
                            ) : (
                              <>
                                <CreditCard size={18} />{" "}
                                {feeReady
                                  ? `Pay KES ${formatKES(grandTotal)} with card`
                                  : "Calculating..."}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleShare}
                      className="btn btn-ghost border border-base-300 w-full h-11 rounded-2xl font-semibold gap-2 text-sm"
                    >
                      <Share2 size={15} /> Share event link
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky summary bar */}
      {event && cart.length > 0 && !isEventLoading && (
        <div
          style={{ bottom: BOTTOM_NAV_HEIGHT }}
          className="lg:hidden fixed inset-x-0 z-30 bg-base-100/95 backdrop-blur-xl border-t border-base-300 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-xs text-base-content/60 truncate">
              {totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"}
              {serviceFee > 0 ? " + service fee" : ""}
            </p>
            {feeReady ? (
              <p className="text-lg font-black text-primary leading-tight">
                KES {formatKES(grandTotal)}
              </p>
            ) : (
              <span className="inline-block h-6 w-24 rounded bg-base-300 animate-pulse"></span>
            )}
          </div>
          <a
            href="#checkout"
            className="btn btn-primary h-12 rounded-2xl px-6 font-black shrink-0"
          >
            Checkout
          </a>
        </div>
      )}

      <Footer />
    </div>
  );
};