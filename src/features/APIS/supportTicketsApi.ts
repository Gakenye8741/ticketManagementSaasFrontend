import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../App/store';

export const supportTicketApi = createApi({
  reducerPath: 'supportTicketApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ticket-backend-ufx5.onrender.com/api/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    }
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ['supportTickets', 'supportTicket'],
  endpoints: (builder) => ({
    // ➕ Create Support Ticket
    createSupportTicket: builder.mutation({
      query: (ticketData) => ({
        url: 'tickets',
        method: 'POST',
        body: ticketData,
      }),
      invalidatesTags: ['supportTickets']
    }),

    // 🔄 Update Support Ticket
    updateSupportTicket: builder.mutation({
      query: ({ ticketId, ...data }) => ({
        url: `tickets/${ticketId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['supportTickets']
    }),

    // 📥 Get All Support Tickets
    getAllSupportTickets: builder.query({
      query: () => 'tickets',
      providesTags: ['supportTickets']
    }),

    // 🆔 Get Support Ticket By ID
    getSupportTicketById: builder.query({
      query: (ticketId) => `tickets/${ticketId}`,
      providesTags: ['supportTicket']
    }),

    // 🔍 Get Support Ticket With Details
    getSupportTicketByIdDetails: builder.query({
      query: (ticketId) => `tickets/${ticketId}/details`,
      providesTags: ['supportTicket']
    }),

    // 👤 Get Support Tickets by National ID
    getSupportTicketsByNationalId: builder.query({
      query: (nationalId: number) => `tickets/user/${nationalId}`,
      providesTags: ['supportTickets']
    }),

    // ❌ Delete Support Ticket
    deleteSupportTicket: builder.mutation({
      query: (ticketId) => ({
        url: `tickets/${ticketId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['supportTickets']
    }),
  }),
});

// Export hooks for usage in components
export const {
  useCreateSupportTicketMutation,
  useUpdateSupportTicketMutation,
  useGetAllSupportTicketsQuery,
  useGetSupportTicketByIdQuery,
  useGetSupportTicketByIdDetailsQuery,
  useGetSupportTicketsByNationalIdQuery,
  useDeleteSupportTicketMutation,
} = supportTicketApi;
