// features/api/paymentApi.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: fetchBaseQuery({
      baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
      credentials: 'include',
    }),
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  
  tagTypes: ['payments', 'payment'],
  endpoints: (builder) => ({
    // 📥 Get all payments
    getAllPayments: builder.query({
      query: () => 'payments',
      providesTags: ['payments'],
    }),

    // 📥 Get payment by ID
    getPaymentById: builder.query({
      query: (id: number) => `payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'payment', id }],
    }),

    // 📥 Get payments by booking ID
    getPaymentsByBookingId: builder.query({
      query: (bookingId: number) => `payments/booking/${bookingId}`,
      providesTags: ['payments'],
    }),

    // 📥 Get payments by national ID
    getPaymentsByNationalId: builder.query({
      query: (nationalId: number) => `payments/national-id/${nationalId}`,
      providesTags: ['payments'],
    }),

    // 📥 Get payments by Event ID ✅ NEW
    getPaymentsByEventId: builder.query({
      query: (eventId: number) => `payments/event/${eventId}`,
      providesTags: ['payments'],
    }),

    // 🔍 Search payments by status ("Pending", "Completed", "Failed")
    getPaymentsByStatus: builder.query({
      query: (status: 'Pending' | 'Completed' | 'Failed') =>
        `payments-status-search?status=${status}`,
      providesTags: ['payments'],
    }),

    // ➕ Create a payment
    createPayment: builder.mutation({
      query: (paymentData) => ({
        url: 'payments',
        method: 'POST',
        body: paymentData,
      }),
      invalidatesTags: ['payments'],
    }),

    // 🔄 Update a payment
    updatePayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `payments/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['payments', 'payment'],
    }),

    // 🗑️ Delete a payment
    deletePayment: builder.mutation({
      query: (id: number) => ({
        url: `payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['payments'],
    }),

    // 💳 Create Stripe checkout session
    createCheckoutSession: builder.mutation({
      query: (sessionData) => ({
        url: 'payments/create-session',
        method: 'POST',
        body: sessionData,
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetAllPaymentsQuery,
  useGetPaymentByIdQuery,
  useGetPaymentsByBookingIdQuery,
  useGetPaymentsByNationalIdQuery,
  useGetPaymentsByEventIdQuery,
  useGetPaymentsByStatusQuery,
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
  useCreateCheckoutSessionMutation,
} = paymentApi;