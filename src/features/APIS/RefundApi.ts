import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type RefundStatus = "Pending" | "Processing" | "Completed" | "Failed" | "Rejected";
export type RefundReasonType = "EventCancelled" | "EventPostponed" | "MaterialChange" | "Other";

/** Refund model matching backend API specifications (money fields come back as strings) */
export interface Refund {
  refundId: number;
  paymentId: number;
  bookingId: number;
  orgId: number | null;
  amount: string; // total sent back to the customer
  ticketAmount: string;
  serviceFeeAmount: string;
  organizerDebit: string; // taken from the organizer wallet
  ticketIds: number[] | null;
  reason: string | null;
  reasonType: RefundReasonType;
  status: RefundStatus;
  initiatedBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  transactionReference: string | null; // Paystack refund id
  failureReason: string | null;
  idempotencyKey: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Type used when an admin or organizer requests a refund */
export type RequestRefundPayload = {
  paymentId: number;
  ticketIds?: number[]; // omit = every remaining valid ticket on the booking
  includeServiceFee?: boolean; // default false: face value only
  reason?: string;
  reasonType?: RefundReasonType;
  idempotencyKey?: string;
  autoApprove?: boolean; // request + send to Paystack in one step
};

/**
 * Type used when a CUSTOMER requests a refund for their own payment.
 * The server fixes everything else (whole booking, ticket price only, reason type "Other",
 * never auto-approved), so none of those fields can be sent from here.
 */
export type RequestMyRefundPayload = {
  paymentId: number;
  reason?: string;
  idempotencyKey?: string;
};

/**
 * What a customer sees about their own refunds (no internal fields).
 * `note` is the organizer's reason when the refund was Rejected.
 */
export interface MyRefund {
  refundId: number;
  paymentId: number;
  bookingId: number;
  amount: string;
  ticketAmount: string;
  serviceFeeAmount: string;
  reason: string | null;
  reasonType: RefundReasonType;
  status: RefundStatus;
  note: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of the bulk "refund everyone for a cancelled event" result */
export interface BulkRefundResult {
  paymentId: number;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/** Backend envelope: { success, message, data } */
type ApiResponse<T> = { success: boolean; message?: string; data: T };

export const refundApi = createApi({
  reducerPath: "refundApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/`,
    credentials: "include",
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ["Refunds", "Refund"],

  endpoints: (builder) => ({
    /* 📥 1. Get All Refunds (Admin only), optionally filtered by status */
    getAllRefunds: builder.query<Refund[], RefundStatus | void>({
      query: (status) => (status ? `refunds?status=${status}` : "refunds"),
      transformResponse: (res: ApiResponse<Refund[]>) => res.data,
      providesTags: ["Refunds"],
    }),

    /* 🏢 2. Get Refunds for an Organization (Admin or Organizer, own org only) */
    getOrgRefunds: builder.query<Refund[], { orgId: number | string; status?: RefundStatus }>({
      query: ({ orgId, status }) =>
        status ? `refunds/org/${orgId}?status=${status}` : `refunds/org/${orgId}`,
      transformResponse: (res: ApiResponse<Refund[]>) => res.data,
      providesTags: ["Refunds"],
    }),

    /* ➕ 3. Request a Refund (Admin or Organizer; creates a Pending refund, moves no money unless autoApprove) */
    requestRefund: builder.mutation<Refund, RequestRefundPayload>({
      query: (payload) => ({
        url: "refunds",
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: ApiResponse<Refund>) => res.data,
      invalidatesTags: ["Refunds"],
    }),

    /* 🙋 2b. Customer: my own refunds (status tracking) */
    getMyRefunds: builder.query<MyRefund[], void>({
      query: () => "refunds/mine",
      transformResponse: (res: ApiResponse<MyRefund[]>) => res.data,
      providesTags: ["Refunds"],
    }),

    /* 🙋 3b. Customer: request a refund for their OWN payment (always created as Pending) */
    requestMyRefund: builder.mutation<Refund, RequestMyRefundPayload>({
      query: (payload) => ({
        url: "refunds/mine",
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: ApiResponse<Refund>) => res.data,
      invalidatesTags: ["Refunds"],
    }),

    /* ✅ 4. Approve a Refund (reserves tickets + wallet, sends it to Paystack → Processing) */
    approveRefund: builder.mutation<Refund, number | string>({
      query: (refundId) => ({
        url: `refunds/${refundId}/approve`,
        method: "POST",
      }),
      transformResponse: (res: ApiResponse<Refund>) => res.data,
      invalidatesTags: (_r, _e, id) => ["Refunds", { type: "Refund", id }],
    }),

    /* ⛔ 5. Reject a Pending Refund */
    rejectRefund: builder.mutation<Refund, { refundId: number | string; note?: string }>({
      query: ({ refundId, note }) => ({
        url: `refunds/${refundId}/reject`,
        method: "POST",
        body: { note },
      }),
      transformResponse: (res: ApiResponse<Refund>) => res.data,
      invalidatesTags: (_r, _e, { refundId }) => ["Refunds", { type: "Refund", id: refundId }],
    }),

    /* 🔄 6. Reconcile a Processing Refund with Paystack (Admin only, if the webhook was missed) */
    reconcileRefund: builder.mutation<Refund, number | string>({
      query: (refundId) => ({
        url: `refunds/${refundId}/reconcile`,
        method: "POST",
      }),
      transformResponse: (res: ApiResponse<Refund>) => res.data,
      invalidatesTags: (_r, _e, id) => ["Refunds", { type: "Refund", id }],
    }),

    /* 🎟️ 7. Refund Everyone for a Cancelled Event (Admin or Organizer) */
    refundCancelledEvent: builder.mutation<
      BulkRefundResult[],
      { eventId: number | string; includeServiceFee?: boolean }
    >({
      query: ({ eventId, includeServiceFee }) => ({
        url: `refunds/event/${eventId}/refund-all`,
        method: "POST",
        body: { includeServiceFee: Boolean(includeServiceFee) },
      }),
      transformResponse: (res: ApiResponse<BulkRefundResult[]>) => res.data,
      invalidatesTags: ["Refunds"],
    }),
  }),
});

/* Auto‑generated hooks */
export const {
  useGetAllRefundsQuery,
  useGetOrgRefundsQuery,
  useGetMyRefundsQuery,
  useRequestRefundMutation,
  useRequestMyRefundMutation,
  useApproveRefundMutation,
  useRejectRefundMutation,
  useReconcileRefundMutation,
  useRefundCancelledEventMutation,
} = refundApi;