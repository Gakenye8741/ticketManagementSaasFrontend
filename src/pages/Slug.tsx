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
} from "lucide-react";

import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

import { useGetEventBySlugQuery } from "../features/APIS/EventsApi";
import { useGetTicketTypesByEventIdQuery } from "../features/APIS/ticketsType.Api";

// NOTE: adjust this import path/filename if your media API file lives elsewhere
import { useGetMediaByEventIdQuery } from "../features/APIS/mediaApi";

// NOTE: adjust this import path/filename if your venue API file lives elsewhere
import { useGetVenueByIdQuery } from "../features/APIS/VenueApi";

import {
  useCreateBookingMutation,
} from "../features/APIS/BookingsApi";

import {
  useInitiateStkPushMutation,
  useCreateStripeCheckoutMutation,
  useCheckPaymentStatusQuery,
} from "../features/APIS/MpesaApi";
import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// Custom loader: a little ticket that pulses while the event loads
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

// Statuses that mean the event is over (same list the events page uses)
const ENDED_STATUSES = new Set([
  "ended",
  "completed",
  "finished",
  "past",
  "closed",
  "expired",
]);

// True when the event is over: by its status, or by its date
// when the event has no status.
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

// Height of your fixed bottom navbar on phones.
// Change this if your navbar is taller or shorter.
const BOTTOM_NAV_HEIGHT = "4rem";

export const EventSlugPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: eventResponse,
    isLoading: isEventLoading,
    isError: isEventError,
  } = useGetEventBySlugQuery(slug || "");

  const event = eventResponse?.data;

  const eventId = event?.id || event?.eventId;

  // Ended events can be viewed but not booked
  const eventEnded = checkEventEnded(event);

  const {
    data: ticketTypesResponse,
    isLoading: isTicketsLoading,
  } = useGetTicketTypesByEventIdQuery(eventId, {
    skip: !eventId,
  });

  const ticketTypes = Array.isArray(ticketTypesResponse)
    ? ticketTypesResponse
    : ticketTypesResponse?.data ||
      ticketTypesResponse?.ticketTypes ||
      [];

  // All uploaded media (images/videos) for this event,
  // straight from the media API
  const { data: mediaApiResponse } = useGetMediaByEventIdQuery(eventId, {
    skip: !eventId,
  });

  const rawEventMedia = Array.isArray(mediaApiResponse)
    ? mediaApiResponse
    : mediaApiResponse?.data || [];

  // Fetch this event's venue directly by its venueId through the public
  // get-venue-by-id endpoint (works for attendees, not just organizers).
  // If the event response already embeds a `venue` object, that is used first.
  const { data: venueResponse } = useGetVenueByIdQuery(
    Number(event?.venueId),
    {
      skip: !event?.venueId,
    }
  );

  const venue = event?.venue ?? venueResponse?.data ?? venueResponse;

  const [
    createBooking,
    { isLoading: isBookingLoading },
  ] = useCreateBookingMutation();

  const [
    initiateStkPush,
    { isLoading: isStkLoading },
  ] = useInitiateStkPushMutation();

  const [
    createStripeCheckout,
    { isLoading: isStripeLoading },
  ] = useCreateStripeCheckoutMutation();

  const [selectedTicketType, setSelectedTicketType] =
    useState<any | null>(null);

  const [ticketQuantity, setTicketQuantity] =
    useState<number>(1);

  /**
   * One attendee object is created for every ticket.
   *
   * Example:
   *
   * quantity = 3
   *
   * attendeeDetails = [
   *   { name: "", email: "", phone: "" },
   *   { name: "", email: "", phone: "" },
   *   { name: "", email: "", phone: "" }
   * ]
   */
  const [attendeeDetails, setAttendeeDetails] =
    useState<
      Array<{
        name: string;
        email: string;
        phone: string;
      }>
    >([
      {
        name: "",
        email: "",
        phone: "",
      },
    ]);

  const [paymentMethod, setPaymentMethod] =
    useState<"mpesa" | "stripe">("mpesa");

  const [activeTab, setActiveTab] =
    useState<"overview" | "location">("overview");

  const [isBookmarked, setIsBookmarked] =
    useState(false);

  const [copiedLink, setCopiedLink] =
    useState(false);

  const [checkoutError, setCheckoutError] =
    useState<string | null>(null);

  const [checkoutSuccessMessage, setCheckoutSuccessMessage] =
    useState<string | null>(null);

  const [activeBookingId, setActiveBookingId] =
    useState<number | null>(null);

  const [isWaitingForMpesa, setIsWaitingForMpesa] =
    useState(false);

  const [showSuccessModal, setShowSuccessModal] =
    useState(false);

  const [showPickedModal, setShowPickedModal] =
    useState(false);

  const [quantityText, setQuantityText] =
    useState("1");

  // Photo carousel state
  const galleryRef = useRef<HTMLDivElement>(null);

  const [galleryIndex, setGalleryIndex] =
    useState(0);

  useEffect(() => {
    setGalleryIndex(0);
  }, [activeTab]);

  useEffect(() => {
    setQuantityText(String(ticketQuantity));
  }, [ticketQuantity]);

  // Stop the page behind from scrolling while a popup is open
  const anyModalOpen =
    isWaitingForMpesa ||
    showSuccessModal ||
    showPickedModal ||
    !!checkoutError;

  useEffect(() => {
    if (!anyModalOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [anyModalOpen]);

  const { data: statusResponse } =
    useCheckPaymentStatusQuery(
      activeBookingId ?? 0,
      {
        skip:
          !isWaitingForMpesa ||
          !activeBookingId,
        pollingInterval: 3000,
      }
    );

  useEffect(() => {
    const bookingData =
      statusResponse?.data ||
      statusResponse;

    const currentStatus =
      bookingData?.bookingStatus ||
      bookingData?.status;

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
    }
  }, [statusResponse]);

  // Show the event name in the browser tab
  useEffect(() => {
    if (!event?.title) return;

    const previousTitle = document.title;

    document.title = `${event.title} | Tickets`;

    return () => {
      document.title = previousTitle;
    };
  }, [event?.title]);

  const handleShare = () => {
    navigator.clipboard.writeText(
      window.location.href
    );

    setCopiedLink(true);

    setTimeout(
      () => setCopiedLink(false),
      2000
    );
  };

  /**
   * Changes ticket quantity and automatically keeps
   * attendeeDetails in sync.
   *
   * Example:
   *
   * 1 ticket -> 1 attendee
   * 2 tickets -> 2 attendees
   * 3 tickets -> 3 attendees
   */
  const handleQuantityChange = (
    newQty: number
  ) => {
    if (!selectedTicketType) return;

    const maxLimit = Math.max(
      1,
      (selectedTicketType.quantity || 15) -
        (selectedTicketType.sold || 0)
    );

    const clampedQty = Math.max(
      1,
      Math.min(newQty, maxLimit)
    );

    setTicketQuantity(clampedQty);

    setAttendeeDetails((prev) => {
      const updated = [...prev];

      if (clampedQty > updated.length) {
        for (
          let i = updated.length;
          i < clampedQty;
          i++
        ) {
          updated.push({
            name: "",
            email: "",
            phone: "",
          });
        }
      } else {
        updated.splice(clampedQty);
      }

      return updated;
    });
  };

  const incrementQuantity = () =>
    handleQuantityChange(
      ticketQuantity + 1
    );

  const decrementQuantity = () =>
    handleQuantityChange(
      ticketQuantity - 1
    );

  const handleAttendeeChange = (
    index: number,
    field: "name" | "email" | "phone",
    value: string
  ) => {
    setAttendeeDetails((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  };

  /**
   * Validate EVERY attendee before creating the booking.
   *
   * This is important because the backend now accepts
   * individual attendee information for each ticket.
   */
  const validateAttendees = () => {
    if (
      attendeeDetails.length !==
      ticketQuantity
    ) {
      setCheckoutError(
        "Please make sure every ticket has an attendee."
      );

      return false;
    }

    for (
      let index = 0;
      index < attendeeDetails.length;
      index++
    ) {
      const attendee =
        attendeeDetails[index];

      if (!attendee?.name?.trim()) {
        setCheckoutError(
          `Please enter the full name for Pass ${
            index + 1
          }.`
        );

        return false;
      }

      if (!attendee?.email?.trim()) {
        setCheckoutError(
          `Please enter the email address for Pass ${
            index + 1
          }.`
        );

        return false;
      }

      if (!attendee?.phone?.trim()) {
        setCheckoutError(
          `Please enter the phone number for Pass ${
            index + 1
          }.`
        );

        return false;
      }
    }

    return true;
  };

  /**
   * Prepare attendees for the backend.
   *
   * We trim the values so we don't save accidental
   * leading/trailing spaces.
   */
  const getBookingAttendees = () => {
    return attendeeDetails.map(
      (attendee) => ({
        name: attendee.name.trim(),
        email: attendee.email.trim(),
        phone: attendee.phone.trim(),
      })
    );
  };

  const handleMpesaCheckout =
    async () => {
      setCheckoutError(null);
      setCheckoutSuccessMessage(null);

      // Never allow booking for an event that has ended
      if (eventEnded) {
        setCheckoutError(
          "This event has ended, so tickets can no longer be booked."
        );

        return;
      }

      if (!selectedTicketType) {
        setCheckoutError(
          "Please select a ticket tier before proceeding."
        );

        return;
      }

      /**
       * NEW:
       * Validate all people before creating
       * the booking.
       */
      if (!validateAttendees()) {
        return;
      }

      /**
       * The first attendee remains the primary
       * payer/contact because M-Pesa is sent to
       * their phone number.
       */
      const primaryAttendee =
        attendeeDetails[0];

      try {
        const idempotencyKey =
          `checkout-mpesa-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        /**
         * NEW:
         * Send ALL attendee details to the
         * new booking API.
         */
        const bookingPayload = {
          eventId: Number(eventId),

          ticketTypeId: Number(
            selectedTicketType.id ||
              selectedTicketType.ticketTypeId
          ),

          quantity: Number(
            ticketQuantity
          ),

          // Payer / primary customer
          guestName:
            primaryAttendee.name.trim(),

          guestEmail:
            primaryAttendee.email.trim(),

          guestPhone:
            primaryAttendee.phone.trim(),

          /**
           * Individual attendees for every ticket.
           */
          attendees:
            getBookingAttendees(),

          idempotencyKey,
        };

        const bookingResponse: any =
          await createBooking(
            bookingPayload
          ).unwrap();

        const responseData =
          bookingResponse?.data ||
          bookingResponse;

        const createdBookingId =
          responseData?.bookingId ||
          responseData?.id;

        if (!createdBookingId) {
          throw new Error(
            "Booking record created, but failed to retrieve booking ID."
          );
        }

        setActiveBookingId(
          Number(createdBookingId)
        );

        /**
         * M-Pesa is still sent to the
         * primary attendee's phone.
         */
        const stkPayload = {
          phoneNumber:
            primaryAttendee.phone.trim(),

          bookingId:
            Number(createdBookingId),
        };

        await initiateStkPush(
          stkPayload
        ).unwrap();

        setIsWaitingForMpesa(true);
      } catch (err: any) {
        console.error(
          "M-Pesa Checkout Error:",
          err
        );

        setCheckoutError(
          err?.data?.message ||
            err?.data?.error ||
            err?.message ||
            "Failed to trigger M-Pesa payment. Please try again."
        );
      }
    };

  const handleStripeCheckout =
    async () => {
      setCheckoutError(null);
      setCheckoutSuccessMessage(null);

      // Never allow booking for an event that has ended
      if (eventEnded) {
        setCheckoutError(
          "This event has ended, so tickets can no longer be booked."
        );

        return;
      }

      if (!selectedTicketType) {
        setCheckoutError(
          "Please select a ticket tier before proceeding."
        );

        return;
      }

      /**
       * NEW:
       * Validate every attendee.
       */
      if (!validateAttendees()) {
        return;
      }

      const primaryAttendee =
        attendeeDetails[0];

      try {
        const idempotencyKey =
          `checkout-stripe-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        const unitPrice = Number(
          selectedTicketType.price || 0
        );

        const totalAmount =
          unitPrice * ticketQuantity;

        /**
         * NEW:
         * Send ALL attendees to the backend.
         */
        const bookingPayload = {
          eventId: Number(eventId),
          ticketTypeId: Number(
            selectedTicketType.id || selectedTicketType.ticketTypeId
          ),
          quantity: Number(ticketQuantity),

          // Person paying for the booking
          guestName: primaryAttendee.name,
          guestEmail: primaryAttendee.email,
          guestPhone: primaryAttendee.phone,

          // Every person receiving a ticket
          attendees: attendeeDetails.map((attendee) => ({
            name: attendee.name,
            email: attendee.email,
            phone: attendee.phone,
          })),

          idempotencyKey,
        };

        const bookingResponse: any =
          await createBooking(
            bookingPayload
          ).unwrap();

        const responseData =
          bookingResponse?.data ||
          bookingResponse;

        const createdBookingId =
          responseData?.bookingId ||
          responseData?.id;

        if (!createdBookingId) {
          throw new Error(
            "Booking created, but failed to retrieve booking ID for Stripe checkout."
          );
        }

        const stripePayload = {
          bookingId:
            Number(createdBookingId),

          amount: totalAmount,

          eventName:
            event?.title ||
            "Event Ticket",

          ticketTypeName:
            selectedTicketType.name,

          quantity:
            Number(ticketQuantity),
        };

        const stripeResponse: any =
          await createStripeCheckout(
            stripePayload
          ).unwrap();

        if (stripeResponse?.url) {
          setCheckoutSuccessMessage(
            "Redirecting to Stripe checkout gateway..."
          );

          window.location.href =
            stripeResponse.url;
        } else {
          throw new Error(
            "Stripe checkout session initialized, but no redirect URL was returned."
          );
        }
      } catch (err: any) {
        console.error(
          "Stripe Checkout Error:",
          err
        );

        setCheckoutError(
          err?.data?.message ||
            err?.data?.error ||
            err?.message ||
            "Failed to initiate Stripe card payment."
        );
      }
    };

  const isProcessing =
    isBookingLoading ||
    isStkLoading ||
    isStripeLoading;

  const total =
    Number(
      selectedTicketType?.price || 0
    ) * ticketQuantity;

  const maxAvailable = Math.max(
    1,
    (selectedTicketType?.quantity || 15) -
      (selectedTicketType?.sold || 0)
  );

  const atMax =
    ticketQuantity >= maxAvailable;

  // Media for the carousel
  type GalleryItem = {
    url: string;
    type: "image" | "video";
    altText?: string;
  };

  const apiMediaItems: GalleryItem[] =
    rawEventMedia
      .slice()
      .sort(
        (a: any, b: any) =>
          (b?.isPrimary ? 1 : 0) -
          (a?.isPrimary ? 1 : 0)
      )
      .map((m: any) => ({
        url: m?.url,
        type:
          m?.type === "video"
            ? "video"
            : "image",
        altText: m?.altText,
      }))
      .filter(
        (m: GalleryItem) =>
          Boolean(m.url)
      );

  const embeddedRawMedia =
    event?.media ||
    event?.images ||
    event?.gallery ||
    [];

  const embeddedMediaItems: GalleryItem[] =
    (
      Array.isArray(
        embeddedRawMedia
      )
        ? embeddedRawMedia
        : []
    )
      .map((m: any) =>
        typeof m === "string"
          ? m
          : m?.url ||
            m?.imageUrl ||
            m?.mediaUrl
      )
      .filter(Boolean)
      .map((url: string) => ({
        url,
        type: "image" as const,
      }));

  const mediaItems: GalleryItem[] =
    apiMediaItems.length > 0
      ? apiMediaItems
      : embeddedMediaItems;

  if (
    mediaItems.length === 0 &&
    event?.bannerUrl
  ) {
    mediaItems.push({
      url: event.bannerUrl,
      type: "image",
    });
  }

  useEffect(() => {
    if (
      rawEventMedia.length > 0 &&
      apiMediaItems.length === 0
    ) {
      console.warn(
        "[EventSlugPage] Media API returned records for this event, but none had a usable 'url' field. " +
          "Check the actual field name on a media record (sample below) and update the mapping in mediaItems.",
        rawEventMedia[0]
      );
    }
  }, [
    rawEventMedia,
    apiMediaItems.length,
  ]);

  const goToMedia = (i: number) => {
    const el = galleryRef.current;

    if (
      !el ||
      mediaItems.length === 0
    )
      return;

    const next =
      (i + mediaItems.length) %
      mediaItems.length;

    el.scrollTo({
      left: el.clientWidth * next,
      behavior: "smooth",
    });
  };

  const handleGalleryScroll =
    () => {
      const el =
        galleryRef.current;

      if (
        !el ||
        !el.clientWidth
      )
        return;

      setGalleryIndex(
        Math.round(
          el.scrollLeft /
            el.clientWidth
        )
      );
    };

  // Automatically move to the next hero media item every 5 seconds.
  useEffect(() => {
    if (
      mediaItems.length <= 1
    )
      return;

    const interval =
      window.setInterval(() => {
        const el =
          galleryRef.current;

        if (
          !el ||
          !el.clientWidth
        )
          return;

        const next =
          (galleryIndex + 1) %
          mediaItems.length;

        el.scrollTo({
          left:
            el.clientWidth * next,
          behavior: "smooth",
        });
      }, 5000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [
    galleryIndex,
    mediaItems.length,
  ]);

  const venueName =
    venue?.name ||
    venue?.venueName ||
    "Venue TBA";

  const venueAddress =
    venue?.location ||
    venue?.address ||
    event?.location ||
    event?.address ||
    "";

  const venueLatitude =
    venue?.latitude ??
    venue?.lat ??
    event?.latitude ??
    event?.lat;

  const venueLongitude =
    venue?.longitude ??
    venue?.lng ??
    venue?.lon ??
    event?.longitude ??
    event?.lng ??
    event?.lon;

  const venueMapQuery =
    venueLatitude &&
    venueLongitude
      ? `${venueLatitude},${venueLongitude}`
      : [
          venueName,
          venueAddress,
        ]
          .filter(Boolean)
          .join(", ");

  const googleMapsEmbedUrl =
    venueMapQuery
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          venueMapQuery
        )}&output=embed`
      : "";

  const googleMapsUrl =
    venueMapQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          venueMapQuery
        )}`
      : "https://www.google.com/maps";

  const openVenueOnMap = () => {
    setActiveTab("location");

    window.setTimeout(() => {
      document
        .getElementById(
          "event-venue"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  };

  // Display-only date pieces
  const eventDateObj = event?.date
    ? new Date(event.date)
    : null;

  const hasValidDate =
    !!eventDateObj &&
    !isNaN(
      eventDateObj.getTime()
    );

  const dateMonth =
    hasValidDate
      ? eventDateObj!.toLocaleDateString(
          undefined,
          {
            month: "short",
          }
        )
      : "";

  const dateDay =
    hasValidDate
      ? eventDateObj!.getDate()
      : "";

  const dateWeekday =
    hasValidDate
      ? eventDateObj!.toLocaleDateString(
          undefined,
          {
            weekday: "short",
          }
        )
      : "";

  const ticketMask =
    "radial-gradient(circle 9px at calc(100% - 7rem) 0, #0000 98%, #000), radial-gradient(circle 9px at calc(100% - 7rem) 100%, #0000 98%, #000)";

  const ticketMaskStyle: any = {
    WebkitMask: ticketMask,
    WebkitMaskComposite:
      "source-in",
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
    {
      label: "Payment request sent",
      state: "done",
    },
    {
      label:
        "Enter your PIN on your phone",
      state: "active",
    },
    {
      label:
        "Get your tickets by email",
      state: "todo",
    },
  ];

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content relative">
      <Navbar />

      {/* ---------- POPUP 1: Waiting for M-Pesa ---------- */}
      {isWaitingForMpesa && (
        <div className={overlayCls}>
          <div className={sheetCls}>
            <div className="bg-primary/10 px-6 pt-8 pb-6 text-center space-y-3">
              <div className="relative w-20 h-20 mx-auto">
                <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping"></span>

                <span className="relative w-20 h-20 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-lg">
                  <Smartphone size={34} />
                </span>
              </div>

              <h3 className="text-2xl font-black">
                Check your phone
              </h3>

              <p className="text-sm text-base-content/70 leading-relaxed">
                We sent a payment request
                for{" "}
                <span className="font-bold text-base-content">
                  KES{" "}
                  {total.toLocaleString()}
                </span>{" "}
                to{" "}
                <span className="font-bold text-base-content">
                  {
                    attendeeDetails[0]
                      ?.phone
                  }
                </span>
                .
              </p>
            </div>

            <div className="px-6 py-6 space-y-5">
              <ol className="space-y-4">
                {mpesaSteps.map(
                  (s) => (
                    <li
                      key={s.label}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          s.state ===
                          "done"
                            ? "bg-success text-success-content"
                            : s.state ===
                              "active"
                            ? "bg-primary text-primary-content"
                            : "bg-base-300 text-base-content/40"
                        }`}
                      >
                        {s.state ===
                        "done" ? (
                          <Check
                            size={15}
                            strokeWidth={
                              3
                            }
                          />
                        ) : s.state ===
                          "active" ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        )}
                      </span>

                      <span
                        className={`text-sm font-semibold ${
                          s.state ===
                          "todo"
                            ? "text-base-content/40"
                            : ""
                        }`}
                      >
                        {s.label}
                      </span>
                    </li>
                  )
                )}
              </ol>

              <p className="text-xs text-base-content/60 text-center">
                Please keep this page
                open. It updates by itself
                once you pay.
              </p>

              <button
                onClick={() => {
                  setIsWaitingForMpesa(
                    false
                  );
                  setActiveBookingId(
                    null
                  );
                }}
                className="btn btn-ghost h-12 rounded-2xl text-base-content/70 w-full"
              >
                Cancel payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP: You picked this ticket ---------- */}
      {showPickedModal &&
        selectedTicketType && (
          <div
            className={overlayCls}
            onClick={() =>
              setShowPickedModal(
                false
              )
            }
          >
            <div
              className={sheetCls}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="bg-primary/10 px-6 pt-7 pb-5 text-center space-y-1.5">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center mx-auto shadow-lg mb-2">
                  <Check
                    size={28}
                    strokeWidth={3}
                  />
                </div>

                <p className="text-sm font-semibold text-primary">
                  You picked
                </p>

                <h3 className="text-2xl font-black break-words">
                  {
                    selectedTicketType.name
                  }
                </h3>

                <p className="text-sm text-base-content/70">
                  KES{" "}
                  {Number(
                    selectedTicketType.price ||
                      0
                  ).toLocaleString()}{" "}
                  per pass
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    How many tickets?
                  </label>

                  <div className="flex items-center justify-between bg-base-200/60 p-2 rounded-2xl border border-base-300">
                    <button
                      onClick={
                        decrementQuantity
                      }
                      disabled={
                        ticketQuantity <=
                        1
                      }
                      className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                      aria-label="Fewer tickets"
                    >
                      <Minus size={18} />
                    </button>

                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black leading-none">
                        {
                          ticketQuantity
                        }
                      </span>

                      <span className="text-xs text-base-content/50 mt-1">
                        {ticketQuantity ===
                        1
                          ? "pass"
                          : "tickets"}
                      </span>
                    </div>

                    <button
                      onClick={
                        incrementQuantity
                      }
                      disabled={atMax}
                      className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                      aria-label="More tickets"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <p
                    className={`text-xs ${
                      atMax
                        ? "text-warning font-semibold"
                        : "text-base-content/50"
                    }`}
                  >
                    {atMax
                      ? "That's all the tickets left"
                      : `${maxAvailable} tickets available`}
                  </p>
                </div>

                <div className="flex items-center justify-between text-lg font-black">
                  <span>Total</span>
                  <span className="text-primary">
                    KES{" "}
                    {total.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowPickedModal(
                      false
                    );

                    setTimeout(() => {
                      document
                        .getElementById(
                          "holder-details"
                        )
                        ?.scrollIntoView({
                          behavior:
                            "smooth",
                          block: "start",
                        });
                    }, 100);
                  }}
                  className="btn btn-primary h-14 rounded-2xl w-full font-black text-base"
                >
                  Continue
                </button>

                <button
                  onClick={() =>
                    setShowPickedModal(
                      false
                    )
                  }
                  className="btn btn-ghost h-11 rounded-2xl w-full text-base-content/70"
                >
                  Pick a different
                  ticket
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
                  <Check
                    size={40}
                    strokeWidth={3}
                  />
                </span>
              </div>

              <h3 className="text-2xl font-black">
                You're going!
              </h3>

              <p className="text-sm text-base-content/70 leading-relaxed">
                Payment received. We
                emailed your tickets to{" "}
                <span className="font-bold text-base-content break-all">
                  {
                    attendeeDetails[0]
                      ?.email
                  }
                </span>
                .
              </p>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="rounded-2xl border-2 border-dashed border-base-300 bg-base-200/40 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">
                    Event
                  </span>

                  <span className="font-bold text-right">
                    {event?.title}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">
                    Ticket
                  </span>

                  <span className="font-bold text-right">
                    {
                      selectedTicketType?.name
                    }
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-base-content/60">
                    tickets
                  </span>

                  <span className="font-bold">
                    {ticketQuantity}
                  </span>
                </div>

                <div className="flex justify-between gap-4 pt-2.5 border-t border-base-300 text-base">
                  <span className="font-bold">
                    Total paid
                  </span>

                  <span className="font-black text-success">
                    KES{" "}
                    {total.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(
                    false
                  );
                  setCheckoutSuccessMessage(
                    null
                  );
                }}
                className="btn btn-primary h-14 rounded-2xl w-full font-black text-base"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP 3: Something went wrong ---------- */}
      {checkoutError && (
        <div className={overlayCls}>
          <div className={sheetCls}>
            <div className="px-6 pt-8 pb-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
                <AlertCircle
                  size={32}
                />
              </div>

              <h3 className="text-xl font-black">
                We couldn't continue
              </h3>

              <p className="text-sm text-base-content/70 leading-relaxed">
                {checkoutError}
              </p>

              <button
                onClick={() =>
                  setCheckoutError(
                    null
                  )
                }
                className="btn btn-primary h-12 rounded-2xl w-full font-bold mt-2"
              >
                Got it
              </button>
            </div>
          </div>
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

            <nav
              aria-label="Breadcrumb"
              className="min-w-0"
            >
              <ol className="flex items-center gap-1.5 text-sm text-base-content/60 whitespace-nowrap overflow-hidden">
                <li className="shrink-0 hidden sm:block">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Home
                      size={14}
                    />
                    <span>Home</span>
                  </Link>
                </li>

                <li className="shrink-0 hidden sm:flex items-center gap-1.5">
                  <ChevronRight
                    size={14}
                    className="opacity-50"
                  />

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
                    {event?.title ||
                      "Event"}
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
              onClick={() =>
                setIsBookmarked(
                  !isBookmarked
                )
              }
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
                className={
                  isBookmarked
                    ? "fill-primary"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {copiedLink && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 alert alert-success py-2.5 px-5 rounded-full text-sm font-semibold w-fit flex items-center gap-2 shadow-lg">
            <CheckCircle2
              size={16}
            />{" "}
            Link copied
          </div>
        )}

        {isEventLoading ? (
          <PageLoader />
        ) : isEventError ||
          !event ? (
          <div className="text-center py-20 px-6 bg-base-200/50 rounded-3xl space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
              <AlertCircle
                size={30}
              />
            </div>

            <h3 className="text-2xl font-extrabold">
              Event unavailable
            </h3>

            <p className="text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
              This event may have
              ended, been unlisted, or
              the link may be incorrect.
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
              <div className="relative w-full overflow-hidden rounded-3xl bg-base-300 shadow-lg aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1] lg:max-h-[30rem]">
                {mediaItems.length >
                0 ? (
                  <div
                    ref={galleryRef}
                    onScroll={
                      handleGalleryScroll
                    }
                    className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {mediaItems.map(
                      (
                        item,
                        i
                      ) => (
                        <div
                          key={i}
                          className="w-full h-full shrink-0 snap-center relative bg-black"
                        >
                          {item.type ===
                          "video" ? (
                            <video
                              src={
                                item.url
                              }
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={
                                item.url
                              }
                              alt={
                                item.altText ||
                                `${event.title} photo ${
                                  i +
                                  1
                                }`
                              }
                              loading={
                                i === 0
                                  ? "eager"
                                  : "lazy"
                              }
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <>
                    {event.bannerUrl ? (
                      <img
                        src={
                          event.bannerUrl
                        }
                        alt={
                          event.title
                        }
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-base-200 flex items-center justify-center">
                        <CalendarIcon className="w-16 h-16 sm:w-20 sm:h-20 text-base-content/20" />
                      </div>
                    )}
                  </>
                )}

                {mediaItems.length >
                  1 && (
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                )}

                {mediaItems.length >
                  1 && (
                  <>
                    <span className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-xs font-bold text-white bg-black/55 backdrop-blur px-3 py-1.5 rounded-full">
                      {galleryIndex +
                        1}{" "}
                      /{" "}
                      {
                        mediaItems.length
                      }
                    </span>

                    <button
                      onClick={() =>
                        goToMedia(
                          galleryIndex -
                            1
                        )
                      }
                      className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-base-100/90 shadow-md items-center justify-center hover:bg-base-100 active:scale-95 transition"
                      aria-label="Previous media"
                    >
                      <ChevronLeft
                        size={20}
                      />
                    </button>

                    <button
                      onClick={() =>
                        goToMedia(
                          galleryIndex +
                            1
                        )
                      }
                      className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-base-100/90 shadow-md items-center justify-center hover:bg-base-100 active:scale-95 transition"
                      aria-label="Next media"
                    >
                      <ChevronRight
                        size={20}
                      />
                    </button>

                    <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-10 flex justify-center gap-1.5">
                      {mediaItems.map(
                        (_, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              goToMedia(
                                i
                              )
                            }
                            aria-label={`Go to media ${
                              i +
                              1
                            }`}
                            className={`h-1.5 rounded-full transition-all ${
                              i ===
                              galleryIndex
                                ? "w-6 bg-white"
                                : "w-1.5 bg-white/60"
                            }`}
                          />
                        )
                      )}
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
                        {
                          dateWeekday
                        }
                      </div>
                    </div>
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold capitalize">
                      {(
                        event.category?.replace(
                          "_",
                          " "
                        ) ||
                        "Featured event"
                      ).toLowerCase()}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck
                        size={13}
                      />{" "}
                      Verified gate
                      pass
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] break-words">
                    {event.title}
                  </h1>

                  <div className="flex flex-wrap gap-2 pt-1 text-sm font-medium">
                    <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
                      <CalendarIcon
                        size={15}
                        className="text-primary shrink-0"
                      />

                      <span>
                        {new Date(
                          event.date
                        ).toLocaleDateString(
                          undefined,
                          {
                            weekday:
                              "short",
                            month:
                              "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
                      <Clock
                        size={15}
                        className="text-primary shrink-0"
                      />

                      <span>
                        {event.time ||
                          "Time TBA"}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={
                        openVenueOnMap
                      }
                      className="inline-flex items-center gap-2 min-w-0 max-w-full rounded-full bg-base-200 px-3 py-1.5 text-left hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={`View ${venueName} on the map`}
                    >
                      <MapPin
                        size={15}
                        className="text-primary shrink-0"
                      />

                      <span className="truncate">
                        {venueName}
                      </span>
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
                {/* Step 1: tickets */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center font-black shrink-0">
                        1
                      </span>

                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Pick your ticket
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
                        This event has ended, so tickets can no longer be bought.
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
                  ) : ticketTypes.length ===
                    0 ? (
                    <div className="text-center py-14 px-6 bg-base-200/50 rounded-3xl border border-dashed border-base-300 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto">
                        <AlertCircle
                          size={28}
                        />
                      </div>

                      <h4 className="font-extrabold text-lg">
                        Tickets are not
                        on sale yet
                      </h4>

                      <p className="text-sm text-base-content/70 max-w-sm mx-auto leading-relaxed">
                        The organizer has
                        not opened ticket
                        sales for this
                        event. Please
                        check back soon.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                      {ticketTypes.map(
                        (tier: any) => {
                          const isSoldOut =
                            tier.sold >=
                              tier.quantity ||
                            tier.isSoldOut;

                          const remaining =
                            Math.max(
                              0,
                              (tier.quantity ||
                                0) -
                                (tier.sold ||
                                  0)
                            );

                          const isSelected =
                            selectedTicketType?.id ===
                            tier.id;

                          const isLow =
                            !isSoldOut &&
                            remaining >
                              0 &&
                            remaining <=
                              10;

                          return (
                            <div
                              key={
                                tier.id ||
                                tier.ticketTypeId
                              }
                              role="button"
                              aria-pressed={
                                isSelected
                              }
                              tabIndex={
                                isSoldOut
                                  ? -1
                                  : 0
                              }
                              onClick={() => {
                                if (
                                  !isSoldOut
                                ) {
                                  setSelectedTicketType(
                                    tier
                                  );

                                  handleQuantityChange(
                                    1
                                  );

                                  setShowPickedModal(
                                    true
                                  );
                                }
                              }}
                              className={`drop-shadow-md transition-transform duration-200 focus-visible:outline-none ${
                                isSoldOut
                                  ? "opacity-60 grayscale cursor-not-allowed"
                                  : "cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]"
                              } ${
                                isSelected
                                  ? "drop-shadow-xl"
                                  : ""
                              }`}
                            >
                              <div
                                style={
                                  ticketMaskStyle
                                }
                                className="relative flex rounded-2xl bg-base-200 overflow-hidden"
                              >
                                <div
                                  className={`flex-1 min-w-0 px-4 sm:px-5 py-4 flex flex-col justify-center gap-1.5 ${
                                    isSelected
                                      ? "bg-primary/10"
                                      : ""
                                  }`}
                                >
                                  <h4 className="font-extrabold text-base leading-snug line-clamp-2 break-words">
                                    {
                                      tier.name
                                    }
                                  </h4>

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
                                    isSelected
                                      ? "border-primary/40"
                                      : "border-base-content/20"
                                  }`}
                                ></div>

                                <div
                                  className={`w-28 shrink-0 flex flex-col items-center justify-center gap-2 px-2 py-4 text-center ${
                                    isSelected &&
                                    !isSoldOut
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
                                        isSelected &&
                                        !isSoldOut
                                          ? ""
                                          : "text-primary"
                                      }`}
                                    >
                                      {Number(
                                        tier.price ||
                                          0
                                      ).toLocaleString()}
                                    </p>
                                  </div>

                                  {isSoldOut ? (
                                    <span className="text-[11px] font-bold text-base-content/50">
                                      Not
                                      available
                                    </span>
                                  ) : (
                                    <span
                                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                        isSelected
                                          ? "bg-primary-content border-primary-content text-primary"
                                          : "border-base-content/25 text-transparent"
                                      }`}
                                    >
                                      <Check
                                        size={16}
                                        strokeWidth={
                                          3
                                        }
                                      />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {selectedTicketType && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-2.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                        <Check
                          size={14}
                          strokeWidth={
                            3
                          }
                        />
                      </span>

                      <span className="min-w-0">
                        You picked{" "}
                        <b className="font-extrabold">
                          {
                            selectedTicketType.name
                          }
                        </b>{" "}
                        · KES{" "}
                        {Number(
                          selectedTicketType.price ||
                            0
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </section>

                {/* Step 2 */}
                {selectedTicketType && (
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
                          {ticketQuantity}{" "}
                          {ticketQuantity ===
                          1
                            ? "pass"
                            : "tickets"}{" "}
                          · add the details
                          for each pass
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {attendeeDetails.map(
                        (
                          attendee,
                          index
                        ) => (
                          <div
                            key={index}
                            className="p-4 sm:p-5 rounded-2xl bg-base-100 border border-base-300 shadow-sm space-y-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
                                  {index +
                                    1}
                                </span>

                                <div className="min-w-0">
                                  <p className="text-sm font-bold leading-tight">
                                    Pass{" "}
                                    {index +
                                      1}
                                  </p>

                                  {index ===
                                    0 && (
                                    <p className="text-xs font-semibold text-primary">
                                      Main
                                      contact
                                    </p>
                                  )}
                                </div>
                              </div>

                              <span className="text-xs font-semibold text-base-content/50 shrink-0">
                                KES{" "}
                                {Number(
                                  selectedTicketType.price ||
                                    0
                                ).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                  <User
                                    size={16}
                                  />
                                </span>

                                <input
                                  type="text"
                                  autoComplete="name"
                                  placeholder="Full name"
                                  value={
                                    attendee.name
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleAttendeeChange(
                                      index,
                                      "name",
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputCls
                                  }
                                  required
                                />
                              </div>

                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                  <Phone
                                    size={16}
                                  />
                                </span>

                                <input
                                  type="tel"
                                  autoComplete="tel"
                                  inputMode="tel"
                                  placeholder="Phone (e.g. 2547...)"
                                  value={
                                    attendee.phone
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleAttendeeChange(
                                      index,
                                      "phone",
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputCls
                                  }
                                  required
                                />
                              </div>

                              <div className="relative sm:col-span-2">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
                                  <Mail
                                    size={16}
                                  />
                                </span>

                                <input
                                  type="email"
                                  autoComplete="email"
                                  inputMode="email"
                                  placeholder="Email address"
                                  value={
                                    attendee.email
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleAttendeeChange(
                                      index,
                                      "email",
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  className={
                                    inputCls
                                  }
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

                {/* Info tabs */}
                <section className="space-y-5">
                  <div className="inline-flex max-w-full overflow-x-auto scrollbar-none p-1 rounded-full bg-base-200 border border-base-300">
                    {[
                      {
                        id: "overview",
                        label: "About",
                        icon: Info,
                      },
                      {
                        id: "location",
                        label: "Venue",
                        icon: Building2,
                      },
                    ].map(
                      (tab) => {
                        const IconComponent =
                          tab.icon;

                        const active =
                          activeTab ===
                          tab.id;

                        return (
                          <button
                            key={
                              tab.id
                            }
                            onClick={() =>
                              setActiveTab(
                                tab.id as any
                              )
                            }
                            className={`flex items-center gap-2 shrink-0 h-10 px-4 sm:px-5 rounded-full text-sm font-bold transition-colors ${
                              active
                                ? "bg-base-100 text-primary shadow-sm"
                                : "text-base-content/60 hover:text-base-content"
                            }`}
                          >
                            <IconComponent
                              size={16}
                            />

                            <span>
                              {
                                tab.label
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="animate-in fade-in duration-300">
                    {activeTab ===
                      "overview" && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-extrabold flex items-center gap-2">
                          <FileText
                            size={18}
                            className="text-primary"
                          />{" "}
                          About this
                          event
                        </h3>

                        <p className="text-base text-base-content/80 leading-relaxed whitespace-pre-line max-w-prose break-words">
                          {event.description ||
                            "No full description provided for this event yet."}
                        </p>
                      </div>
                    )}

                    {activeTab ===
                      "location" && (
                      <div
                        id="event-venue"
                        className="space-y-4 scroll-mt-24"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h3 className="text-lg font-extrabold flex items-center gap-2">
                            <Building2
                              size={18}
                              className="text-primary"
                            />{" "}
                            Venue
                          </h3>

                          <a
                            href={
                              googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm h-10 btn-outline rounded-full gap-2 w-full sm:w-auto"
                          >
                            <MapPin
                              size={15}
                            />
                            Open in
                            Google
                            Maps
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
                              <MapPin
                                size={20}
                              />
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h4 className="font-extrabold text-base break-words">
                                {
                                  venueName
                                }
                              </h4>

                              <p className="text-sm text-base-content/70 break-words">
                                {venueAddress ||
                                  "The exact location is sent with your pass."}
                              </p>

                              <p className="text-xs font-bold text-primary pt-1">
                                Tap to open
                                directions
                                in Google
                                Maps →
                              </p>
                            </div>
                          </div>
                        </button>

                        {googleMapsEmbedUrl ? (
                          <div className="relative w-full overflow-hidden rounded-2xl border border-base-300 bg-base-200 shadow-sm aspect-[4/3] sm:aspect-[16/9]">
                            <iframe
                              title={`Map showing ${venueName}`}
                              src={
                                googleMapsEmbedUrl
                              }
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
                              A map will
                              appear once
                              this venue
                              has a
                              location or
                              address.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* RIGHT: checkout */}
              <aside
                id="checkout"
                className="lg:col-span-1 lg:sticky lg:top-28 scroll-mt-24 min-w-0"
              >
                <div className="bg-base-100 border border-base-300 rounded-3xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-base-200/70 border-b border-base-300">
                    <h3 className="text-lg font-extrabold">
                      Your order
                    </h3>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full shrink-0">
                      <ShieldCheck
                        size={13}
                      />{" "}
                      Instant pass
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    {checkoutSuccessMessage &&
                      !showSuccessModal && (
                        <div className="alert alert-success p-3 rounded-2xl text-sm font-medium flex items-start gap-2">
                          <CheckCircle2
                            size={16}
                            className="shrink-0 mt-0.5"
                          />

                          <span>
                            {
                              checkoutSuccessMessage
                            }
                          </span>
                        </div>
                      )}

                    {eventEnded ? (
                      <div className="text-center py-8 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-neutral/10 text-neutral flex items-center justify-center mx-auto">
                          <Ticket size={26} />
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold">
                            Event ended
                          </h4>

                          <p className="text-sm text-base-content/70 max-w-xs mx-auto">
                            Booking is closed for this event.
                          </p>
                        </div>
                      </div>
                    ) : selectedTicketType ? (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-base-200/60 border border-base-300">
                          <div className="min-w-0">
                            <h4 className="font-extrabold break-words">
                              {
                                selectedTicketType.name
                              }
                            </h4>

                            <p className="text-sm text-base-content/70">
                              KES{" "}
                              {Number(
                                selectedTicketType.price ||
                                  0
                              ).toLocaleString()}{" "}
                              per pass
                            </p>
                          </div>

                          <Ticket
                            size={22}
                            className="text-primary shrink-0"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold">
                            How many
                            tickets?
                          </label>

                          <div className="flex items-center justify-between bg-base-200/60 p-2 rounded-2xl border border-base-300">
                            <button
                              onClick={
                                decrementQuantity
                              }
                              disabled={
                                ticketQuantity <=
                                  1 ||
                                isProcessing
                              }
                              className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                              title="Fewer tickets"
                              aria-label="Fewer tickets"
                            >
                              <Minus
                                size={18}
                              />
                            </button>

                            <div className="flex flex-col items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label="Number of tickets"
                                value={
                                  quantityText
                                }
                                disabled={
                                  isProcessing
                                }
                                onChange={(
                                  e
                                ) => {
                                  const digits =
                                    e.target.value.replace(
                                      /\D/g,
                                      ""
                                    );

                                  if (
                                    digits ===
                                    ""
                                  ) {
                                    setQuantityText(
                                      ""
                                    );

                                    return;
                                  }

                                  const n =
                                    Math.max(
                                      1,
                                      Math.min(
                                        parseInt(
                                          digits,
                                          10
                                        ),
                                        maxAvailable
                                      )
                                    );

                                  setQuantityText(
                                    String(
                                      n
                                    )
                                  );

                                  handleQuantityChange(
                                    n
                                  );
                                }}
                                onBlur={() =>
                                  setQuantityText(
                                    String(
                                      ticketQuantity
                                    )
                                  )
                                }
                                className="w-16 text-center text-2xl font-black leading-none bg-transparent rounded-lg focus:outline-none focus:bg-base-100"
                              />

                              <span className="text-xs text-base-content/50 mt-1">
                                {ticketQuantity ===
                                1
                                  ? "pass"
                                  : "tickets"}
                              </span>
                            </div>

                            <button
                              onClick={
                                incrementQuantity
                              }
                              disabled={
                                isProcessing ||
                                atMax
                              }
                              className="btn btn-ghost w-12 h-12 min-h-0 rounded-xl disabled:opacity-30"
                              title="More tickets"
                              aria-label="More tickets"
                            >
                              <Plus
                                size={18}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-xs ${
                                atMax
                                  ? "text-warning font-semibold"
                                  : "text-base-content/50"
                              }`}
                            >
                              {atMax
                                ? "That's all the tickets left"
                                : `${maxAvailable} tickets available`}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  maxAvailable
                                )
                              }
                              disabled={
                                isProcessing ||
                                atMax
                              }
                              className="btn btn-ghost btn-xs rounded-full text-primary disabled:opacity-30"
                            >
                              Get the
                              max
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold">
                            Pay with
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPaymentMethod(
                                  "mpesa"
                                )
                              }
                              className={`btn h-12 rounded-xl font-bold gap-1.5 ${
                                paymentMethod ===
                                "mpesa"
                                  ? "btn-primary"
                                  : "btn-outline border-base-300"
                              }`}
                            >
                              <Smartphone
                                size={16}
                              />{" "}
                              M-Pesa
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPaymentMethod(
                                  "stripe"
                                )
                              }
                              className={`btn h-12 rounded-xl font-bold gap-1.5 ${
                                paymentMethod ===
                                "stripe"
                                  ? "btn-primary"
                                  : "btn-outline border-base-300"
                              }`}
                            >
                              <CreditCard
                                size={16}
                              />{" "}
                              Card
                            </button>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-dashed border-base-300 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-base-content/70">
                              Subtotal (
                              {
                                ticketQuantity
                              }{" "}
                              {ticketQuantity ===
                              1
                                ? "pass"
                                : "tickets"}
                              )
                            </span>

                            <span className="font-bold shrink-0">
                              KES{" "}
                              {total.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-base-content/70">
                              Fees
                            </span>

                            <span className="font-bold text-success">
                              Free
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-xl font-black pt-3 border-t border-base-300">
                            <span>
                              Total
                            </span>

                            <span className="text-primary shrink-0">
                              KES{" "}
                              {total.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {paymentMethod ===
                        "mpesa" ? (
                          <button
                            onClick={
                              handleMpesaCheckout
                            }
                            disabled={
                              isProcessing
                            }
                            className="btn btn-primary w-full h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/25 gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2
                                  size={18}
                                  className="animate-spin"
                                />{" "}
                                Sending
                                request...
                              </>
                            ) : (
                              <>
                                <Smartphone
                                  size={18}
                                />{" "}
                                Pay with
                                M-Pesa
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={
                              handleStripeCheckout
                            }
                            disabled={
                              isProcessing
                            }
                            className="btn btn-primary w-full h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/25 gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2
                                  size={18}
                                  className="animate-spin"
                                />{" "}
                                Opening
                                card
                                page...
                              </>
                            ) : (
                              <>
                                <CreditCard
                                  size={18}
                                />{" "}
                                Pay with
                                card
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          <Ticket
                            size={26}
                          />
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-extrabold">
                            No ticket
                            picked
                          </h4>

                          <p className="text-sm text-base-content/70 max-w-xs mx-auto">
                            Pick a ticket
                            above to
                            choose how
                            many tickets
                            you want and
                            pay.
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={
                        handleShare
                      }
                      className="btn btn-ghost border border-base-300 w-full h-11 rounded-2xl font-semibold gap-2 text-sm"
                    >
                      <Share2
                        size={15}
                      />{" "}
                      Share event link
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky summary bar */}
      {event &&
        selectedTicketType &&
        !isEventLoading && (
          <div
            style={{
              bottom:
                BOTTOM_NAV_HEIGHT,
            }}
            className="lg:hidden fixed inset-x-0 z-30 bg-base-100/95 backdrop-blur-xl border-t border-base-300 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-base-content/60 truncate">
                {
                  selectedTicketType.name
                }{" "}
                × {ticketQuantity}
              </p>

              <p className="text-lg font-black text-primary leading-tight">
                KES{" "}
                {total.toLocaleString()}
              </p>
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