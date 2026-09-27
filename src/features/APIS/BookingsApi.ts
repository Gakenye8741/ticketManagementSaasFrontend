import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/** Booking model matching backend API specifications */
export interface Booking {
  bookingId: number;
  eventId: number;
  quantity: number;
  totalAmount?: string;
  bookingStatus: "Pending" | "Confirmed" | "Cancelled";
  ticketTypeId: number;
  digitalId?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
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
    baseUrl: "http://localhost:5000/api/",
    // Credentials included for cookie-based authentication sessions instead of Bearer headers
    credentials: "include",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
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
      { bookingId: number | string; bookingStatus: "Pending" | "Confirmed" | "Cancelled" }
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
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
  useCancelBookingMutation,
} = bookingApi;