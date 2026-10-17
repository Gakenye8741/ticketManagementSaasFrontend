import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** POST /paystack/mpesa: direct M-Pesa "Enter PIN" prompt */
export interface PaystackMpesaPayload {
  phoneNumber: string;
  bookingId: number | string;
  email: string;
}

/** POST /paystack/initialize: hosted checkout (M-Pesa + card) */
export interface PaystackInitializePayload {
  bookingId: number | string;
  email: string;
}

export interface PaystackMpesaResponse {
  reference: string;
  [key: string]: any;
}

export interface PaystackInitializeResponse {
  authorizationUrl: string;
  reference?: string;
  [key: string]: any;
}

export const mpesaApi = createApi({
  reducerPath: 'mpesaApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/payments/`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ['Payments', 'Bookings'],
  endpoints: (builder) => ({
    /** GET /api/payments/health */
    checkPaymentHealth: builder.query<any, void>({
      query: () => 'health',
    }),

    /** GET /api/payments/booking-status/:bookingId */
    checkPaymentStatus: builder.query<any, number | string>({
      query: (bookingId) => `booking-status/${bookingId}`,
      providesTags: (_r, _e, id) => [{ type: 'Payments', id }],
    }),

    /** POST /api/payments/paystack/mpesa (replaces STK Push) */
    initiatePaystackMpesa: builder.mutation<PaystackMpesaResponse, PaystackMpesaPayload>({
      query: (body) => ({
        url: 'paystack/mpesa',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments', 'Bookings'],
    }),

    /** POST /api/payments/paystack/initialize (redirect to authorizationUrl) */
    initializePaystackCheckout: builder.mutation<PaystackInitializeResponse, PaystackInitializePayload>({
      query: (body) => ({
        url: 'paystack/initialize',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments', 'Bookings'],
    }),

    /** GET /api/payments/paystack/verify/:reference (backup if the webhook is late) */
    verifyPaystackPayment: builder.query<any, string>({
      query: (reference) => `paystack/verify/${reference}`,
      async onQueryStarted(_ref, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Verify records success/failure server-side, so refresh cached statuses
          dispatch(mpesaApi.util.invalidateTags(['Payments', 'Bookings']));
        } catch {
          /* handled by the caller via the hook's error state */
        }
      },
    }),
  }),
});

export const {
  useCheckPaymentHealthQuery,
  useCheckPaymentStatusQuery,
  useInitiatePaystackMpesaMutation,
  useInitializePaystackCheckoutMutation,
  useVerifyPaystackPaymentQuery,
  useLazyVerifyPaystackPaymentQuery,
} = mpesaApi;