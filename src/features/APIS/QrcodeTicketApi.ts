import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../../App/store";

export interface QrTicket {
  ticketId: number;
  bookingId: number;
  eventId: number;
  nationalId: number;
  ticketToken: string;
  isScanned: boolean;
  scannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  qrDataUrl?: string;
  eventName?: string;
}

export interface MobileWalletResponse {
  success: boolean;
  count: number;
  passes: QrTicket[]; 
}

export interface IssueTicketPayload {
  bookingId: number;
  eventId: number;
  nationalId: number;
  quantity: number;
}

export interface VerificationResponse {
  message: string;
  ticket?: QrTicket;
}

export const qrTicketApi = createApi({
  reducerPath: "qrTicketApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://ticket-backend-ufx5.onrender.com/api/tickets/",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Tickets"],
  endpoints: (builder) => ({
    issueTicket: builder.mutation<QrTicket[], IssueTicketPayload>({
      query: (payload) => ({
        url: "issue",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Tickets"],
    }),

    getMobileWallet: builder.query<MobileWalletResponse, number>({
      query: (nationalId) => `my-passes/${nationalId}`,
      providesTags: ["Tickets"],
    }),

    verifyGatePass: builder.mutation<VerificationResponse, string>({
      query: (ticketToken) => ({
        url: "verify",
        method: "POST",
        body: { ticketToken },
      }),
      invalidatesTags: ["Tickets"], 
    }),
  }),
});

export const {
  useIssueTicketMutation,
  useGetMobileWalletQuery,
  useVerifyGatePassMutation,
} = qrTicketApi;