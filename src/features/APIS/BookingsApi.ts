import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type BookingStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded";

/** A payment attached to a booking (decimal columns arrive as strings) */
export interface BookingPayment {
  paymentId: number;
  orgId?: number | null;
  bookingId: number;
  digitalId?: number | null;
  /** Ticket total (what the organizer's tickets cost) */
  amount: string;
  platformFee?: string;
  netAmount?: string;
  /** Buyer service fee, paid on top of the tickets */
  serviceFee: string;
  /** Rate used at the time of purchase, for example "1.5" */
  serviceFeePercent?: string | null;
  /** What the buyer actually paid: amount + serviceFee */
  totalCharged: string;
  paymentStatus: "Pending" | "Completed" | "Failed" | string;
  paymentDate: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  checkoutRequestId?: string | null;
  resultCode?: string | null;
  resultDesc?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** An individual ticket issued for a booking */
export interface BookingTicket {
  ticketId: number;
  bookingId: number;
  eventId: number;
  digitalId?: number | null;
  purchaserDigitalId?: number | null;
  ticketToken?: string;
  ticketNumber: string;
  groupBundleId?: string | null;
  isAssigned?: boolean;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  attendeePhone?: string | null;
  transferStatus?: string;
  isScanned: boolean;
  scannedAt?: string | null;
  lifecycleStatus: "Valid" | "Refunded" | string;
  refundedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingVenue {
  venueId: number;
  name: string;
  address?: string;
  capacity?: number;
  status?: string;
}

/** The event that comes back with a booking */
export interface BookingEvent {
  eventId: number;
  orgId?: number;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  date?: string; // "2026-10-29"
  time?: string; // "10:00:00"
  status?: string;
  venue?: BookingVenue | null;
}

export interface BookingAttendee {
  name: string;
  email?: string;
  phone?: string;
}

/** Booking model matching backend API specifications */
export interface Booking {
  bookingId: number;
  eventId: number;
  quantity: number;
  /** Ticket price only. The buyer service fee is NOT included. */
  totalAmount?: string;
  bookingStatus: BookingStatus;
  ticketTypeId: number;
  ticketTypeName?: string | null;
  digitalId?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  attendees?: BookingAttendee[];
  isBundle?: boolean;
  idempotencyKey?: string;
  /** Paystack reference, saved when payment starts */
  checkoutRequestId?: string | null;
  /** Service fee saved when payment starts ("0.00" until then and on older bookings) */
  serviceFee?: string;
  /** Tickets + service fee, saved when payment starts */
  totalCharged?: string;
  createdAt: string;
  updatedAt: string;

  // Included by the "bookings by user" endpoint
  event?: BookingEvent | null;
  payments?: BookingPayment[];
  tickets?: BookingTicket[];
}

/** Server-calculated cost of a booking: tickets + service fee */
export interface CheckoutTotals {
  bookingId: number;
  quantity?: number;
  ticketAmount: string;
  serviceFee: string;
  totalCharged: string;
  serviceFeePercent: number;
}

/** Type used when creating a guest or user booking */
export type CreateBookingRequest = {
  eventId: number;
  ticketTypeId: number;
  quantity: number;
  digitalId?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  idempotencyKey?: string;
};

export const bookingApi = createApi({
  reducerPath: "bookingApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/`,
    credentials: "include",
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ["Bookings", "Booking"],

  endpoints: (builder) => ({
    /* 📥 13. Get All Bookings (Admin or Organizer) */
    getAllBookings: builder.query<Booking[], void>({
      query: () => "bookings",
      providesTags: ["Bookings"],
    }),

    /* 📊 14. Get Recent Bookings Feed (Admin or Organizer) */
    getRecentBookings: builder.query<Booking[], void>({
      query: () => "bookings/recent",
      providesTags: ["Bookings"],
    }),

    /* 🔍 18. Get Single Booking by ID (Protected) */
    getBookingById: builder.query<Booking, number | string>({
      query: (bookingId) => `bookings/${bookingId}`,
      providesTags: (_r, _e, id) => [{ type: "Booking", id }],
    }),

    /* 👤 15. Get Bookings by User Digital ID (Protected) */
    getBookingsByUserDigitalId: builder.query<Booking[], number | string>({
      query: (digitalId) => `bookings/user/${digitalId}`,
      providesTags: ["Bookings"],
    }),

    /* 🎟️ 16. Get Bookings by Event ID (Admin or Organizer) */
    getBookingsByEventId: builder.query<Booking[], number | string>({
      query: (eventId) => `bookings/event/${eventId}`,
      providesTags: ["Bookings"],
    }),

    /* 📈 17. Get Event Booking Statistics & Revenue Overview */
    getEventBookingStats: builder.query<any, number | string>({
      query: (eventId) => `bookings/event/${eventId}/stats`,
      providesTags: (_r, _e, eventId) => [{ type: "Bookings", id: eventId }],
    }),

    /* 💳 NEW: Ticket price + service fee + total, calculated by the server.
       The page shows these numbers instead of working out the fee itself. */
    getCheckoutTotals: builder.query<CheckoutTotals | { data: CheckoutTotals }, number | string>({
      query: (bookingId) => `bookings/${bookingId}/checkout-totals`,
    }),

    /* ➕ 1 & 2. Create Booking (Supports both Guest Checkout and Logged-in User Digital ID) */
    createBooking: builder.mutation<Booking, CreateBookingRequest>({
      query: (payload) => ({
        url: "bookings",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Bookings"],
    }),

    /* 🔄 19. Update Booking Status (Admin or Organizer) */
    updateBookingStatus: builder.mutation<
      { message: string },
      { bookingId: number | string; bookingStatus: BookingStatus }
    >({
      query: ({ bookingId, bookingStatus }) => ({
        url: `bookings/${bookingId}/status`,
        method: "PATCH",
        body: { bookingStatus },
      }),
      invalidatesTags: (_r, _e, { bookingId }) => ["Bookings", { type: "Booking", id: bookingId }],
    }),

    /* ❌ 20. Cancel a Booking */
    cancelBooking: builder.mutation<{ message: string }, number | string>({
      query: (bookingId) => ({
        url: `bookings/${bookingId}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => ["Bookings", { type: "Booking", id }],
    }),
  }),
});

/* Auto‑generated hooks */
export const {
  useGetAllBookingsQuery,
  useGetRecentBookingsQuery,
  useGetBookingByIdQuery,
  useGetBookingsByUserDigitalIdQuery,
  useGetBookingsByEventIdQuery,
  useGetEventBookingStatsQuery,
  useGetCheckoutTotalsQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
  useCancelBookingMutation,
} = bookingApi;