import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Ticket Payload and Input Interfaces
export interface Ticket {
  ticketId?: number;
  id?: number;
  bookingId: number;
  eventId: number;
  ticketTypeId?: number;
  ticketToken?: string;
  groupBundleId?: string | null;
  purchaserId?: number;
  holderId?: number | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  attendeePhone?: string | null;
  isScanned?: boolean;
  scannedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignTicketPayload {
  ticketId: number;
  name: string;
  email: string;
  attendeePhone?: string;
  holderId?: number;
}

export interface BulkAssignAttendee {
  ticketId: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  holderId?: number;
}

export interface BulkAssignBundlePayload {
  groupBundleId: string;
  assignments: BulkAssignAttendee[];
}

export interface InitiateTransferPayload {
  ticketId: number;
  holderId: number;
}

export interface ClaimTransferPayload {
  claimToken: string;
  newHolderDigitalId: number;
  attendeeInfo: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface ScanTicketPayload {
  ticketToken: string;
}

export interface UnassignTicketPayload {
  ticketId: number;
  ownerId: number;
}

export interface UpdateTicketHolderPayload {
  ticketId: number;
  newDigitalId: number;
}

export const tikitiApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include',
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: [
    'tickets',
    'ticket',
    'ticketsByEvent',
    'ticketsByBooking',
    'ticketsByHolder',
    'ticketsByBundle',
    'ticketStats',
  ],
  endpoints: (builder) => ({
    // 1. Generate Tickets for a Booking
    generateTickets: builder.mutation<any, number>({
      query: (bookingId) => ({
        url: `tickets/booking/${bookingId}/generate`,
        method: 'POST',
      }),
      invalidatesTags: ['tickets', 'ticketsByBooking', 'ticketsByEvent', 'ticketStats'],
    }),

    // 2. Get Ticket by ID
    getTicketById: builder.query<any, number>({
      query: (ticketId) => `tickets/${ticketId}`,
      providesTags: (_result, _error, ticketId) => [{ type: 'ticket', id: ticketId }],
    }),

    // 3. Get Ticket by Token
    getTicketByToken: builder.query<any, string>({
      query: (tokenUuid) => `tickets/token/${tokenUuid}`,
      providesTags: ['ticket'],
    }),

    // 4. Get Tickets by Booking ID
    getTicketsByBookingId: builder.query<any, number>({
      query: (bookingId) => `tickets/booking/${bookingId}`,
      providesTags: (_result, _error, bookingId) => [{ type: 'ticketsByBooking', id: bookingId }],
    }),

    // 5. Get Tickets by Event ID (organizer's records of tickets sold)
    getTicketsByEventId: builder.query<any, number>({
      query: (eventId) => `tickets/event/${eventId}`,
      providesTags: (_result, _error, eventId) => [{ type: 'ticketsByEvent', id: eventId }],
    }),

    // 6. Get Tickets by Holder ID
    getTicketsByHolderId: builder.query<any, number>({
      query: (digitalId) => `tickets/holder/${digitalId}`,
      providesTags: (_result, _error, digitalId) => [{ type: 'ticketsByHolder', id: digitalId }],
    }),

    // 7. Get Tickets by Purchaser ID
    getTicketsByPurchaserId: builder.query<any, number>({
      query: (digitalId) => `tickets/purchaser/${digitalId}`,
      providesTags: ['tickets'],
    }),

    // 8. Assign Ticket to an Attendee
    assignTicket: builder.mutation<any, AssignTicketPayload>({
      query: ({ ticketId, ...data }) => ({
        url: `tickets/${ticketId}/assign`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByBooking', 'ticketsByHolder', 'ticketsByBundle'],
    }),

    // 9. Bulk Assign Bundle Tickets
    bulkAssignBundleTickets: builder.mutation<any, BulkAssignBundlePayload>({
      query: (payload) => ({
        url: 'tickets/bundle/assign-bulk',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByBooking', 'ticketsByHolder', 'ticketsByBundle'],
    }),

    // 10. Initiate Ticket Transfer
    initiateTicketTransfer: builder.mutation<any, InitiateTransferPayload>({
      query: (payload) => ({
        url: 'tickets/transfer/initiate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['ticket', 'ticketsByHolder'],
    }),

    // 11. Claim Transferred Ticket
    claimTransferredTicket: builder.mutation<any, ClaimTransferPayload>({
      query: (payload) => ({
        url: 'tickets/transfer/claim',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByHolder'],
    }),

    // 12. Scan Ticket at Gate
    scanTicket: builder.mutation<any, ScanTicketPayload>({
      query: (payload) => ({
        url: 'tickets/scan',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['ticket', 'ticketsByEvent', 'ticketStats'],
    }),

    // 13. Unassign Ticket
    unassignTicket: builder.mutation<any, UnassignTicketPayload>({
      query: ({ ticketId, ownerId }) => ({
        url: `tickets/${ticketId}/unassign`,
        method: 'PATCH',
        body: { ticketId, ownerId },
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByBooking', 'ticketsByHolder', 'ticketsByBundle'],
    }),

    // 14. Get Tickets by Bundle ID
    getTicketsByBundleId: builder.query<any, string>({
      query: (bundleUuid) => `tickets/bundle/${bundleUuid}`,
      providesTags: (_result, _error, bundleUuid) => [{ type: 'ticketsByBundle', id: bundleUuid }],
    }),

    // 15. Count Total Tickets for Event
    countEventTickets: builder.query<any, number>({
      query: (eventId) => `tickets/event/${eventId}/count`,
      providesTags: ['ticketStats'],
    }),

    // 16. Count Scanned Attendees for Event
    countScannedAttendees: builder.query<any, number>({
      query: (eventId) => `tickets/event/${eventId}/scanned-count`,
      providesTags: ['ticketStats'],
    }),

    // 17. Update Ticket Holder
    updateTicketHolder: builder.mutation<any, UpdateTicketHolderPayload>({
      query: (payload) => ({
        url: 'tickets/holder/update',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByHolder'],
    }),

    // 18. Reset Ticket Scan
    resetTicketScan: builder.mutation<any, number>({
      query: (ticketId) => ({
        url: `tickets/${ticketId}/reset-scan`,
        method: 'PATCH',
      }),
      invalidatesTags: ['ticket', 'ticketsByEvent', 'ticketStats'],
    }),

    // 19. Get Unassigned User Tickets
    getUnassignedUserTickets: builder.query<any, number>({
      query: (digitalId) => `tickets/holder/${digitalId}/unassigned`,
      providesTags: ['ticketsByHolder'],
    }),

    // 20. Delete Ticket Record
    deleteTicket: builder.mutation<any, number>({
      query: (ticketId) => ({
        url: `tickets/${ticketId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['tickets', 'ticket', 'ticketsByEvent', 'ticketsByBooking', 'ticketsByHolder', 'ticketStats'],
    }),
  }),
});

export const {
  useGenerateTicketsMutation,
  useGetTicketByIdQuery,
  useGetTicketByTokenQuery,
  useGetTicketsByBookingIdQuery,
  useGetTicketsByEventIdQuery,
  useGetTicketsByHolderIdQuery,
  useGetTicketsByPurchaserIdQuery,
  useAssignTicketMutation,
  useBulkAssignBundleTicketsMutation,
  useInitiateTicketTransferMutation,
  useClaimTransferredTicketMutation,
  useScanTicketMutation,
  useUnassignTicketMutation,
  useGetTicketsByBundleIdQuery,
  useCountEventTicketsQuery,
  useCountScannedAttendeesQuery,
  useUpdateTicketHolderMutation,
  useResetTicketScanMutation,
  useGetUnassignedUserTicketsQuery,
  useDeleteTicketMutation,
} =tikitiApi;