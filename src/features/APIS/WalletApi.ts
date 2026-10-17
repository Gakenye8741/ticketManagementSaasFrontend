import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/* ==========================================
   TYPES (match the backend exactly)
   ========================================== */

/** Every backend controller wraps its result like this */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Unwraps { success, message, data } so components receive just `data` */
const unwrap = <T>(res: ApiResponse<T>): T => res.data;

export interface Wallet {
  walletId: number;
  orgId: number;
  balance: string; // available to withdraw (net of platform fee)
  pendingBalance: string; // money tied up in payouts that are Pending or Processing
  totalEarned: string; // lifetime net earnings
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutMethod {
  methodId: number;
  orgId: number;
  accountType: string; // "M-Pesa" | "Till" | "Bank"
  accountNumber: string;
  accountName?: string;
  bankCode?: string | null; // only for Bank
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Pending    = waiting for an admin to send it
 * Processing = sent to Paystack, waiting for confirmation
 * Completed  = money delivered
 * Failed     = not delivered, money returned to the available balance
 * Reversed   = was delivered, then reversed by Paystack, money returned to the available balance
 */
export type PayoutStatus = "Pending" | "Processing" | "Completed" | "Failed" | "Reversed";

export interface Payout {
  payoutId: number;
  walletId: number;
  orgId: number;
  methodId?: number | null;
  amount: string;
  fee: string;
  status: PayoutStatus;
  destinationAccount: string;
  destinationType: string;
  reference?: string | null;
  transactionReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  name: string;
  code: string;
}

/** One row of the answer to POST payouts/bulk-send */
export interface BulkSendResult {
  payoutId: number;
  ok: boolean;
  error?: string;
}

/** GET /wallets/:orgId/overview */
export interface WalletOverview {
  wallet: Wallet;
  methodCount: number;
  defaultMethod: PayoutMethod | null;
}

/** GET /wallets/:orgId/stats (numbers, not strings) */
export interface WalletStats {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  currency: string;
}

export interface RequestPayoutResult {
  success: boolean;
  message: string;
  payout: Payout;
}

export const walletApi = createApi({
  reducerPath: "walletApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/`,
    credentials: "include",
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ["Wallet", "Wallets", "Payouts", "PayoutMethod", "PayoutMethods", "Banks"],

  endpoints: (builder) => ({
    /* ==========================================
       1. WALLET ENDPOINTS
       ========================================== */

    /** Get or Create Wallet (organizers: orgId is taken from the login on the server) */
    getOrCreateWallet: builder.mutation<Wallet, { orgId: number; currency: string }>({
      query: (payload) => ({
        url: "wallets",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", { type: "Wallet", id: orgId }],
    }),

    /** Get Wallet by Organization ID */
    getWalletByOrgId: builder.query<Wallet, number | string>({
      query: (orgId) => `wallets/${orgId}`,
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Credit Wallet (Admin) */
    creditWallet: builder.mutation<Wallet, { orgId: number; amount: number }>({
      query: (payload) => ({
        url: "wallets/credit",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Debit Wallet (Admin) */
    debitWallet: builder.mutation<Wallet, { orgId: number; amount: number }>({
      query: (payload) => ({
        url: "wallets/debit",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Get Wallet Stats */
    getWalletStats: builder.query<WalletStats, number | string>({
      query: (orgId) => `wallets/${orgId}/stats`,
      transformResponse: (r: ApiResponse<WalletStats>) => unwrap(r),
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Get Wallet Overview (wallet + method count + default method) */
    getWalletOverview: builder.query<WalletOverview, number | string>({
      query: (orgId) => `wallets/${orgId}/overview`,
      transformResponse: (r: ApiResponse<WalletOverview>) => unwrap(r),
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Check Wallet Existence */
    checkWalletExists: builder.query<{ exists: boolean }, number | string>({
      query: (orgId) => `wallets/${orgId}/exists`,
      transformResponse: (r: ApiResponse<{ exists: boolean }>) => unwrap(r),
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Check Sufficient Balance */
    checkSufficientBalance: builder.query<
      { hasSufficientBalance: boolean },
      { orgId: number | string; amount: number | string }
    >({
      query: ({ orgId, amount }) => `wallets/${orgId}/balance-check?amount=${amount}`,
      transformResponse: (r: ApiResponse<{ hasSufficientBalance: boolean }>) => unwrap(r),
      providesTags: (_r, _e, { orgId }) => [{ type: "Wallet", id: orgId }],
    }),

    /** Clear Pending Balance (Admin) */
    clearPendingBalance: builder.mutation<Wallet, number | string>({
      query: (orgId) => ({
        url: `wallets/${orgId}/clear-pending`,
        method: "POST",
      }),
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      invalidatesTags: (_r, _e, orgId) => ["Wallet", { type: "Wallet", id: orgId }],
    }),

    /** Reset Wallet (Admin) */
    resetWallet: builder.mutation<Wallet, number | string>({
      query: (orgId) => ({
        url: `wallets/${orgId}/reset`,
        method: "POST",
      }),
      transformResponse: (r: ApiResponse<Wallet>) => unwrap(r),
      invalidatesTags: (_r, _e, orgId) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Get Total Platform Pending Liability (Admin) */
    getPlatformPendingLiability: builder.query<{ totalPendingLiability: number }, void>({
      query: () => "platform/pending-liability",
      transformResponse: (r: ApiResponse<{ totalPendingLiability: number }>) => unwrap(r),
      providesTags: ["Wallets"],
    }),

    /* ==========================================
       2. PAYOUT ENDPOINTS
       ========================================== */

    /** Request Payout (omit methodId to use the default method) */
    requestPayout: builder.mutation<RequestPayoutResult, { orgId: number; amount: number; methodId?: number }>({
      query: (payload) => ({
        url: "payouts",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<RequestPayoutResult>) => unwrap(r),
      // Balance moves into pending, so the wallet must refresh too
      invalidatesTags: (_r, _e, { orgId }) => ["Payouts", "Wallet", { type: "Wallet", id: orgId }],
    }),

    /** Get payouts the admin still has to deal with: Pending + Processing (Admin) */
    getPendingPayouts: builder.query<Payout[], void>({
      query: () => "payouts/pending",
      transformResponse: (r: ApiResponse<Payout[]>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Send one Pending payout through Paystack (Admin) */
    sendPayout: builder.mutation<Payout, { payoutId: number | string }>({
      query: ({ payoutId }) => ({
        url: `payouts/${payoutId}/send`,
        method: "POST",
      }),
      transformResponse: (r: ApiResponse<Payout>) => unwrap(r),
      // Also invalidated when it fails: the payout may have moved to Processing or back to Pending with a reason
      invalidatesTags: ["Payouts", "Wallet"],
    }),

    /** Ask Paystack for the real state of a Processing payout (Admin) */
    reconcilePayout: builder.mutation<Payout, { payoutId: number | string }>({
      query: ({ payoutId }) => ({
        url: `payouts/${payoutId}/reconcile`,
        method: "POST",
      }),
      transformResponse: (r: ApiResponse<Payout>) => unwrap(r),
      invalidatesTags: ["Payouts", "Wallet"],
    }),

    /** Send several Pending payouts through Paystack (Admin, max 100). Replaces the old bulk-status route. */
    bulkSendPayouts: builder.mutation<BulkSendResult[], { payoutIds: number[] }>({
      query: (payload) => ({
        url: "payouts/bulk-send",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<BulkSendResult[]>) => unwrap(r),
      invalidatesTags: ["Payouts", "Wallet"],
    }),

    /** Get Organization Payouts */
    getPayoutsByOrg: builder.query<Payout[], number | string>({
      query: (orgId) => `payouts/org/${orgId}`,
      transformResponse: (r: ApiResponse<Payout[]>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Get Latest Payout for Organization (null if none) */
    getLatestPayoutByOrg: builder.query<Payout | null, number | string>({
      query: (orgId) => `payouts/org/${orgId}/latest`,
      transformResponse: (r: ApiResponse<Payout | null>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Get Payout Count */
    getPayoutCountByOrg: builder.query<{ count: number }, number | string>({
      query: (orgId) => `payouts/org/${orgId}/count`,
      transformResponse: (r: ApiResponse<{ count: number }>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Get Total Paid Out Amount */
    getTotalPaidByOrg: builder.query<{ totalPaidOut: number }, number | string>({
      query: (orgId) => `payouts/org/${orgId}/total-paid`,
      transformResponse: (r: ApiResponse<{ totalPaidOut: number }>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Get Payouts by Status */
    getPayoutsByStatus: builder.query<Payout[], { orgId: number | string; status: PayoutStatus }>({
      query: ({ orgId, status }) => `payouts/org/${orgId}/status/${status}`,
      transformResponse: (r: ApiResponse<Payout[]>) => unwrap(r),
      providesTags: ["Payouts"],
    }),

    /** Get Payout by ID */
    getPayoutById: builder.query<Payout, number | string>({
      query: (payoutId) => `payouts/${payoutId}`,
      transformResponse: (r: ApiResponse<Payout>) => unwrap(r),
      providesTags: (_r, _e, id) => [{ type: "Payouts", id }],
    }),

    /** Manual override (Admin): reject a Pending payout (Failed) or record one paid outside Paystack (Completed) */
    updatePayoutStatus: builder.mutation<
      Payout,
      { payoutId: number | string; status: "Completed" | "Failed"; transactionReference?: string }
    >({
      query: ({ payoutId, ...body }) => ({
        url: `payouts/${payoutId}/status`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: ApiResponse<Payout>) => unwrap(r),
      invalidatesTags: (_r, _e, { payoutId }) => ["Payouts", "Wallet", { type: "Payouts", id: payoutId }],
    }),

    /* ==========================================
       3. PAYOUT METHODS ENDPOINTS
       ========================================== */

    /** Kenyan banks (name + Paystack bank code) for the Bank option */
    getBanks: builder.query<Bank[], void>({
      query: () => "banks",
      transformResponse: (r: ApiResponse<Bank[]>) => unwrap(r),
      providesTags: ["Banks"],
    }),

    /** Add Payout Method (orgId is taken from the login on the server for organizers) */
    addPayoutMethod: builder.mutation<
      PayoutMethod,
      {
        orgId: number;
        accountType: string;
        accountNumber: string;
        accountName: string;
        bankCode?: string | null;
        isDefault?: boolean;
      }
    >({
      query: (payload) => ({
        url: "payout-methods",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: ApiResponse<PayoutMethod>) => unwrap(r),
      // The wallet overview shows methodCount / defaultMethod, so refresh it too
      invalidatesTags: (_r, _e, { orgId }) => ["PayoutMethods", { type: "Wallet", id: orgId }],
    }),

    /** Get Organization Payout Methods */
    getPayoutMethodsByOrg: builder.query<PayoutMethod[], number | string>({
      query: (orgId) => `payout-methods/org/${orgId}`,
      transformResponse: (r: ApiResponse<PayoutMethod[]>) => unwrap(r),
      providesTags: ["PayoutMethods"],
    }),

    /** Get Default Payout Method (null if none) */
    getDefaultPayoutMethod: builder.query<PayoutMethod | null, number | string>({
      query: (orgId) => `payout-methods/org/${orgId}/default`,
      transformResponse: (r: ApiResponse<PayoutMethod | null>) => unwrap(r),
      providesTags: ["PayoutMethods"],
    }),

    /** Count Payout Methods */
    getPayoutMethodCount: builder.query<{ count: number }, number | string>({
      query: (orgId) => `payout-methods/org/${orgId}/count`,
      transformResponse: (r: ApiResponse<{ count: number }>) => unwrap(r),
      providesTags: ["PayoutMethods"],
    }),

    /** Get Payout Method by ID */
    getPayoutMethodById: builder.query<PayoutMethod, number | string>({
      query: (id) => `payout-methods/${id}`,
      transformResponse: (r: ApiResponse<PayoutMethod>) => unwrap(r),
      providesTags: (_r, _e, id) => [{ type: "PayoutMethod", id }],
    }),

    /** Set Default Payout Method */
    setDefaultPayoutMethod: builder.mutation<PayoutMethod, { methodId: number | string; orgId: number | string }>({
      query: ({ methodId, orgId }) => ({
        url: `payout-methods/${methodId}/default`,
        method: "PATCH",
        body: { orgId },
      }),
      transformResponse: (r: ApiResponse<PayoutMethod>) => unwrap(r),
      invalidatesTags: (_r, _e, { orgId }) => ["PayoutMethods", { type: "Wallet", id: orgId }],
    }),

    /**
     * Update Payout Method
     * The backend validator reads { orgId, data: {...fields} }, so the fields are nested under `data`.
     */
    updatePayoutMethod: builder.mutation<
      PayoutMethod,
      {
        methodId: number | string;
        orgId: number | string;
        accountNumber?: string;
        accountName?: string;
        accountType?: string;
        bankCode?: string | null;
      }
    >({
      query: ({ methodId, orgId, ...fields }) => ({
        url: `payout-methods/${methodId}`,
        method: "PATCH",
        body: { orgId, data: fields },
      }),
      transformResponse: (r: ApiResponse<PayoutMethod>) => unwrap(r),
      invalidatesTags: (_r, _e, { methodId, orgId }) => [
        "PayoutMethods",
        { type: "PayoutMethod", id: methodId },
        { type: "Wallet", id: orgId },
      ],
    }),

    /** Delete Payout Method (backend returns only a message) */
    deletePayoutMethod: builder.mutation<{ message: string }, { methodId: number | string; orgId: number | string }>({
      query: ({ methodId, orgId }) => ({
        url: `payout-methods/${methodId}?orgId=${orgId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { message: string }) => ({ message: r.message }),
      invalidatesTags: (_r, _e, { orgId }) => ["PayoutMethods", { type: "Wallet", id: orgId }],
    }),

    /** Validate Payout Method Ownership */
    validatePayoutMethodOwnership: builder.query<
      { isValidOwner: boolean },
      { methodId: number | string; orgId: number | string }
    >({
      query: ({ methodId, orgId }) => `payout-methods/${methodId}/validate/${orgId}`,
      transformResponse: (r: ApiResponse<{ isValidOwner: boolean }>) => unwrap(r),
      providesTags: ["PayoutMethods"],
    }),
  }),
});

/* Auto-generated hooks */
export const {
  useGetOrCreateWalletMutation,
  useGetWalletByOrgIdQuery,
  useCreditWalletMutation,
  useDebitWalletMutation,
  useGetWalletStatsQuery,
  useGetWalletOverviewQuery,
  useCheckWalletExistsQuery,
  useCheckSufficientBalanceQuery,
  useClearPendingBalanceMutation,
  useResetWalletMutation,
  useGetPlatformPendingLiabilityQuery,
  useRequestPayoutMutation,
  useGetPendingPayoutsQuery,
  useSendPayoutMutation,
  useReconcilePayoutMutation,
  useBulkSendPayoutsMutation,
  useGetPayoutsByOrgQuery,
  useGetLatestPayoutByOrgQuery,
  useGetPayoutCountByOrgQuery,
  useGetTotalPaidByOrgQuery,
  useGetPayoutsByStatusQuery,
  useGetPayoutByIdQuery,
  useUpdatePayoutStatusMutation,
  useGetBanksQuery,
  useAddPayoutMethodMutation,
  useGetPayoutMethodsByOrgQuery,
  useGetDefaultPayoutMethodQuery,
  useGetPayoutMethodCountQuery,
  useGetPayoutMethodByIdQuery,
  useSetDefaultPayoutMethodMutation,
  useUpdatePayoutMethodMutation,
  useDeletePayoutMethodMutation,
  useValidatePayoutMethodOwnershipQuery,
} = walletApi;