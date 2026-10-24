// features/APIS/paymentApi.ts

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type PaymentStatus = "Pending" | "Completed" | "Failed";

/** Payment model (fields are optional where the backend may omit them) */
export interface Payment {
  paymentId?: number;
  id?: number;
  bookingId: number;
  eventId?: number;
  orgId?: number;
  digitalId?: number;
  amount?: string | number;            // ticket total
  platformFee?: string | number;       // 🆕 organizer commission
  netAmount?: string | number;         // 🆕 amount - platformFee (credited to organizer)
  serviceFee?: string | number;        // 🆕 buyer service fee, paid on top of the tickets
  serviceFeePercent?: string | number; // 🆕 rate used at purchase time
  totalCharged?: string | number;      // 🆕 amount + serviceFee (what the buyer paid)
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  resultCode?: string;
  resultDesc?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Create a manual payment record. If amount is omitted the backend takes it from the booking. */
export type CreatePaymentRequest = {
  bookingId: number;
  amount?: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  orgId?: number;
};

export type UpdatePaymentRequest = {
  id: number | string;
  amount?: number;
  paymentMethod?: string;
};

export type UpdatePaymentStatusRequest = {
  id: number | string;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  resultCode?: string;
  resultDesc?: string;
};

/* ======================= 🆕 SERVICE FEE TYPES ======================= */

/** Standard backend envelope: { success, message, data } */
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** What the buyer sees before paying (all money values are strings like "1025.00") */
export interface CheckoutTotals {
  bookingId: number;
  ticketAmount: string;
  serviceFee: string;
  totalCharged: string;
  serviceFeePercent: number;
}

export interface CheckoutTotalsRequest {
  bookingId: number | string;
  /** e.g. "mpesa" or "card". M-Pesa totals are rounded up to whole shillings. */
  method?: string;
}

/** 🆕 Fee preview for the event page (no booking needed yet). Money values are strings like "1025.00". */
export interface ServiceFeePreview {
  ticketAmount: string;
  serviceFee: string;
  totalCharged: string;
  serviceFeePercent: number;
}

export interface ServiceFeePreviewRequest {
  amount: number;
  /** "mpesa" or "card". M-Pesa totals are rounded up to whole shillings. */
  method?: string;
}

/** Admin-configurable buyer service fee */
export interface ServiceFeeSettings {
  percent: number; // e.g. 2.5
  flat: number;    // fixed amount per order, 0 = none
}

export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/`,
    credentials: "include",
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ["payments", "payment", "serviceFee"], // 🆕 serviceFee
  endpoints: (builder) => ({
    /* ======================= GATEWAY & HEALTH ======================= */

    // 1. Health check
    getPaymentsHealth: builder.query<any, void>({
      query: () => "payments/health",
    }),

    // 2. Check booking payment status (used for polling M-Pesa / Stripe)
    getBookingPaymentStatus: builder.query<any, number | string>({
      query: (bookingId) => `payments/booking-status/${bookingId}`,
    }),

    /* ================= 🆕 BUYER CHECKOUT TOTALS ===================== */

    // 🆕 Ticket + service fee + total for a booking. Show this BEFORE the buyer pays.
    //    The server reads the ticket price from the booking, so it can't be tampered with.
    getCheckoutTotals: builder.query<CheckoutTotals, CheckoutTotalsRequest>({
      query: ({ bookingId, method }) => ({
        url: "payments/checkout-totals",
        params: { bookingId, ...(method ? { method } : {}) },
      }),
      transformResponse: (response: ApiEnvelope<CheckoutTotals>) => response.data,
      providesTags: ["serviceFee"], // refetches automatically when the admin changes the fee
    }),

    // 🆕 Fee preview from a ticket amount. Used on the event page BEFORE a booking exists.
    //    Display only: the real charge is recalculated on the server from the booking.
    getServiceFeePreview: builder.query<ServiceFeePreview, ServiceFeePreviewRequest>({
      query: ({ amount, method }) => ({
        url: "payments/service-fee-preview",
        params: { amount, ...(method ? { method } : {}) },
      }),
      transformResponse: (response: ApiEnvelope<ServiceFeePreview>) => response.data,
      providesTags: ["serviceFee"],
    }),

    /* ============= 🆕 ADMIN: SERVICE FEE SETTINGS =================== */

    // 🆕 Read the current service fee (admin)
    getServiceFeeSettings: builder.query<ServiceFeeSettings, void>({
      query: () => "payments/settings/service-fee",
      transformResponse: (response: ApiEnvelope<ServiceFeeSettings>) => response.data,
      providesTags: ["serviceFee"],
    }),

    // 🆕 Change the service fee (admin). Applies to new payments straight away.
    updateServiceFeeSettings: builder.mutation<ServiceFeeSettings, ServiceFeeSettings>({
      query: (body) => ({
        url: "payments/settings/service-fee",
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiEnvelope<ServiceFeeSettings>) => response.data,
      invalidatesTags: ["serviceFee"],
    }),

    /* ========================= ANALYTICS ============================ */

    // 5. Platform total earnings (organizer commission only)
    getPlatformEarnings: builder.query<any, void>({
      query: () => "payments/analytics/platform-earnings",
      providesTags: ["payments"],
    }),

    // 🆕 Platform earnings from buyer service fees only (admin)
    getPlatformServiceFeeEarnings: builder.query<
      { success: boolean; message?: string; totalServiceFeeEarnings: number },
      void
    >({
      query: () => "payments/analytics/service-fee-earnings",
      providesTags: ["payments"],
    }),

    // 🆕 Total platform revenue = commission + service fees (admin)
    getPlatformTotalRevenue: builder.query<
      { success: boolean; message?: string; totalPlatformRevenue: number },
      void
    >({
      query: () => "payments/analytics/total-revenue",
      providesTags: ["payments"],
    }),

    // 6. Event total revenue
    getEventRevenue: builder.query<any, number | string>({
      query: (eventId) => `payments/analytics/event-revenue/${eventId}`,
      providesTags: ["payments"],
    }),

    // 7. Successful payments count
    getSuccessfulPaymentsCount: builder.query<any, void>({
      query: () => "payments/analytics/successful-count",
      providesTags: ["payments"],
    }),

    /* ======================= CORE CRUD & FILTERS ==================== */

    // 8. Get all payments
    getAllPayments: builder.query<Payment[], void>({
      query: () => "payments",
      providesTags: ["payments"],
    }),

    // 10. Get payment by ID
    getPaymentById: builder.query<Payment, number | string>({
      query: (id) => `payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: "payment", id }],
    }),

    // 13. Filter by booking ID
    getPaymentsByBookingId: builder.query<Payment[], number | string>({
      query: (bookingId) => `payments/booking/${bookingId}`,
      providesTags: ["payments"],
    }),

    // 14. Filter by event ID
    getPaymentsByEventId: builder.query<Payment[], number | string>({
      query: (eventId) => `payments/event/${eventId}`,
      providesTags: ["payments"],
    }),

    // 15. Filter by organization ID
    getPaymentsByOrgId: builder.query<Payment[], number | string>({
      query: (orgId) => `payments/org/${orgId}`,
      providesTags: ["payments"],
    }),

    // 16. Filter by user digital ID
    getPaymentsByUserId: builder.query<Payment[], number | string>({
      query: (digitalId) => `payments/user/${digitalId}`,
      providesTags: ["payments"],
    }),

    // 17. Filter by status ("Pending", "Completed", "Failed")
    getPaymentsByStatus: builder.query<Payment[], PaymentStatus>({
      query: (status) => `payments/status/${status}`,
      providesTags: ["payments"],
    }),

    // 18. Filter by method (e.g. "M-Pesa", "Stripe")
    getPaymentsByMethod: builder.query<Payment[], string>({
      query: (method) => `payments/method/${encodeURIComponent(method)}`,
      providesTags: ["payments"],
    }),

    // 9. Create a manual payment record
    createPayment: builder.mutation<Payment, CreatePaymentRequest>({
      query: (paymentData) => ({
        url: "payments",
        method: "POST",
        body: paymentData,
      }),
      invalidatesTags: ["payments"],
    }),

    // 11. Update a payment record
    updatePayment: builder.mutation<Payment, UpdatePaymentRequest>({
      query: ({ id, ...body }) => ({
        url: `payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["payments", "payment"],
    }),

    // 12. Update payment status (PATCH)
    updatePaymentStatus: builder.mutation<any, UpdatePaymentStatusRequest>({
      query: ({ id, ...body }) => ({
        url: `payments/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["payments", "payment"],
    }),

    // 19. Delete a payment record
    deletePayment: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["payments"],
    }),

    // 💳 Create Stripe checkout session (kept from your original API)
    createCheckoutSession: builder.mutation<any, any>({
      query: (sessionData) => ({
        url: "payments/create-session",
        method: "POST",
        body: sessionData,
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetPaymentsHealthQuery,
  useGetBookingPaymentStatusQuery,
  // 🆕 service fee
  useGetCheckoutTotalsQuery,
  useLazyGetCheckoutTotalsQuery,
  useGetServiceFeePreviewQuery,
  useGetServiceFeeSettingsQuery,
  useUpdateServiceFeeSettingsMutation,
  useGetPlatformServiceFeeEarningsQuery,
  useGetPlatformTotalRevenueQuery,
  // existing
  useGetPlatformEarningsQuery,
  useGetEventRevenueQuery,
  useGetSuccessfulPaymentsCountQuery,
  useGetAllPaymentsQuery,
  useGetPaymentByIdQuery,
  useGetPaymentsByBookingIdQuery,
  useGetPaymentsByEventIdQuery,
  useGetPaymentsByOrgIdQuery,
  useGetPaymentsByUserIdQuery,
  useGetPaymentsByStatusQuery,
  useGetPaymentsByMethodQuery,
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
  useUpdatePaymentStatusMutation,
  useDeletePaymentMutation,
  useCreateCheckoutSessionMutation,
} = paymentApi;