import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the interface for the STK Push request based on your payments REST file
interface StkPushPayload {
  phoneNumber: string;
  bookingId: number | string;
}

// Define the interface for the Stripe Checkout Session request
interface StripeCheckoutPayload {
  bookingId: number | string;
  amount: number;
  eventName: string;
  ticketTypeName: string;
  quantity: number;
}

export const mpesaApi = createApi({
  reducerPath: 'mpesaApi',
  baseQuery: fetchBaseQuery({
    // Production Render URL for payments gateway (matches base route: /api/payments)
    baseUrl: 'http://localhost:5000/api/payments/',
    // Include credentials for cookie-based authentication sessions instead of Authorization headers
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    }
  }),
  tagTypes: ['Payments', 'Bookings'],
  endpoints: (builder) => ({
    
    /**
     * 1. Health Check
     * GET /api/payments/health
     */
    checkPaymentHealth: builder.query<any, void>({
      query: () => 'health',
    }),

    /**
     * 2. Check Booking Payment Status
     * GET /api/payments/booking-status/:bookingId
     */
    checkPaymentStatus: builder.query<any, number | string>({
      query: (bookingId) => `booking-status/${bookingId}`,
      providesTags: (_r, _e, id) => [{ type: 'Payments', id }],
    }),

    /**
     * 3. Initiate M-Pesa STK Push
     * POST /api/payments/stk-push
     */
    initiateStkPush: builder.mutation<any, StkPushPayload>({
      query: (stkPayload) => ({
        url: 'stk-push',
        method: 'POST',
        body: stkPayload,
      }),
      invalidatesTags: ['Payments', 'Bookings'],
    }),

    /**
     * 4. Create Stripe Checkout Session
     * POST /api/payments/stripe/create-checkout-session
     */
    createStripeCheckout: builder.mutation<{ url: string }, StripeCheckoutPayload>({
      query: (stripePayload) => ({
        url: 'stripe/create-checkout-session',
        method: 'POST',
        body: stripePayload,
      }),
      invalidatesTags: ['Payments', 'Bookings'],
    }),
  }),
});

// Export hooks for your React components
export const {
  useCheckPaymentHealthQuery,
  useCheckPaymentStatusQuery,
  useInitiateStkPushMutation,
  useCreateStripeCheckoutMutation,
} = mpesaApi;