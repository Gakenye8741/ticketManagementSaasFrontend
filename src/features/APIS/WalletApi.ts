import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/** Wallet model matching backend API specifications */
export interface Wallet {
  walletId: number;
  orgId: number;
  balance: string;
  pendingBalance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/** Wallet stats model */
export interface WalletStats {
  totalCredits?: string;
  totalDebits?: string;
  pendingBalance?: string;
  availableBalance?: string;
  [key: string]: any;
}

/** Wallet overview model */
export interface WalletOverview {
  wallet: Wallet;
  stats?: WalletStats;
  recentTransactions?: any[];
  [key: string]: any;
}

/** Payout Method model */
export interface PayoutMethod {
  payoutMethodId: number;
  orgId: number;
  accountType: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payout model */
export interface Payout {
  payoutId: number;
  orgId: number;
  amount: string;
  payoutMethodId: number;
  status: "Pending" | "Completed" | "Failed";
  transactionReference?: string;
  createdAt: string;
  updatedAt: string;
}

export const walletApi = createApi({
  reducerPath: "walletApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include',
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ["Wallet", "Wallets", "Payouts", "PayoutMethod", "PayoutMethods"],

  endpoints: (builder) => ({
    /* ==========================================
       1. WALLET ENDPOINTS
       ========================================== */

    /** Get or Create Wallet */
    getOrCreateWallet: builder.mutation<Wallet, { orgId: number; currency: string }>({
      query: (payload) => ({
        url: "wallets",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", { type: "Wallet", id: orgId }],
    }),

    /** Get Wallet by Organization ID */
    getWalletByOrgId: builder.query<Wallet, number | string>({
      query: (orgId) => `wallets/${orgId}`,
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Credit Wallet (Admin) */
    creditWallet: builder.mutation<Wallet, { orgId: number; amount: number }>({
      query: (payload) => ({
        url: "wallets/credit",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Debit Wallet (Admin) */
    debitWallet: builder.mutation<Wallet, { orgId: number; amount: number }>({
      query: (payload) => ({
        url: "wallets/debit",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_r, _e, { orgId }) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Get Wallet Stats */
    getWalletStats: builder.query<WalletStats, number | string>({
      query: (orgId) => `wallets/${orgId}/stats`,
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Get Wallet Overview */
    getWalletOverview: builder.query<WalletOverview, number | string>({
      query: (orgId) => `wallets/${orgId}/overview`,
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Check Wallet Existence */
    checkWalletExists: builder.query<{ exists: boolean }, number | string>({
      query: (orgId) => `wallets/${orgId}/exists`,
      providesTags: (_r, _e, orgId) => [{ type: "Wallet", id: orgId }],
    }),

    /** Check Sufficient Balance */
    checkSufficientBalance: builder.query<{ sufficient: boolean }, { orgId: number | string; amount: number | string }>({
      query: ({ orgId, amount }) => `wallets/${orgId}/balance-check?amount=${amount}`,
      providesTags: (_r, _e, { orgId }) => [{ type: "Wallet", id: orgId }],
    }),

    /** Clear Pending Balance (Admin) */
    clearPendingBalance: builder.mutation<{ message: string }, number | string>({
      query: (orgId) => ({
        url: `wallets/${orgId}/clear-pending`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, orgId) => ["Wallet", { type: "Wallet", id: orgId }],
    }),

    /** Reset Wallet (Admin) */
    resetWallet: builder.mutation<{ message: string }, number | string>({
      query: (orgId) => ({
        url: `wallets/${orgId}/reset`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, orgId) => ["Wallet", "Wallets", { type: "Wallet", id: orgId }],
    }),

    /** Get Total Platform Pending Liability (Admin) */
    getPlatformPendingLiability: builder.query<{ totalPendingLiability: string }, void>({
      query: () => "platform/pending-liability",
      providesTags: ["Wallets"],
    }),


    /* ==========================================
       2. PAYOUT ENDPOINTS
       ========================================== */

    /** Request Payout */
    requestPayout: builder.mutation<Payout, { orgId: number; amount: number; payoutMethodId: number }>({
      query: (payload) => ({
        url: "payouts",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Payouts"],
    }),

    /** Get Pending Payouts (Admin) */
    getPendingPayouts: builder.query<Payout[], void>({
      query: () => "payouts/pending",
      providesTags: ["Payouts"],
    }),

    /** Bulk Update Payout Status (Admin) */
    bulkUpdatePayoutStatus: builder.mutation<{ message: string }, { payoutIds: number[]; status: "Pending" | "Completed" | "Failed" }>({
      query: (payload) => ({
        url: "payouts/bulk-status",
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["Payouts"],
    }),

    /** Get Organization Payouts */
    getPayoutsByOrg: builder.query<Payout[], number | string>({
      query: (orgId) => `payouts/org/${orgId}`,
      providesTags: ["Payouts"],
    }),

    /** Get Latest Payout for Organization */
    getLatestPayoutByOrg: builder.query<Payout, number | string>({
      query: (orgId) => `payouts/org/${orgId}/latest`,
      providesTags: ["Payouts"],
    }),

    /** Get Payout Count */
    getPayoutCountByOrg: builder.query<{ count: number }, number | string>({
      query: (orgId) => `payouts/org/${orgId}/count`,
      providesTags: ["Payouts"],
    }),

    /** Get Total Paid Out Amount */
    getTotalPaidByOrg: builder.query<{ totalPaid: string }, number | string>({
      query: (orgId) => `payouts/org/${orgId}/total-paid`,
      providesTags: ["Payouts"],
    }),

    /** Get Payouts by Status */
    getPayoutsByStatus: builder.query<Payout[], { orgId: number | string; status: string }>({
      query: ({ orgId, status }) => `payouts/org/${orgId}/status/${status}`,
      providesTags: ["Payouts"],
    }),

    /** Get Payout by ID */
    getPayoutById: builder.query<Payout, number | string>({
      query: (payoutId) => `payouts/${payoutId}`,
      providesTags: (_r, _e, id) => [{ type: "Payouts", id }],
    }),

    /** Update Payout Status (Admin) */
    updatePayoutStatus: builder.mutation<
      { message: string },
      { payoutId: number | string; status: "Pending" | "Completed" | "Failed"; transactionReference?: string }
    >({
      query: ({ payoutId, ...body }) => ({
        url: `payouts/${payoutId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { payoutId }) => ["Payouts", { type: "Payouts", id: payoutId }],
    }),


    /* ==========================================
       3. PAYOUT METHODS ENDPOINTS
       ========================================== */

    /** Add Payout Method */
    addPayoutMethod: builder.mutation<
      PayoutMethod,
      { orgId: number; accountType: string; accountNumber: string; accountName: string; isDefault?: boolean }
    >({
      query: (payload) => ({
        url: "payout-methods",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["PayoutMethods"],
    }),

    /** Get Organization Payout Methods */
    getPayoutMethodsByOrg: builder.query<PayoutMethod[], number | string>({
      query: (orgId) => `payout-methods/org/${orgId}`,
      providesTags: ["PayoutMethods"],
    }),

    /** Get Default Payout Method */
    getDefaultPayoutMethod: builder.query<PayoutMethod, number | string>({
      query: (orgId) => `payout-methods/org/${orgId}/default`,
      providesTags: ["PayoutMethods"],
    }),

    /** Count Payout Methods */
    getPayoutMethodCount: builder.query<{ count: number }, number | string>({
      query: (orgId) => `payout-methods/org/${orgId}/count`,
      providesTags: ["PayoutMethods"],
    }),

    /** Get Payout Method by ID */
    getPayoutMethodById: builder.query<PayoutMethod, number | string>({
      query: (id) => `payout-methods/${id}`,
      providesTags: (_r, _e, id) => [{ type: "PayoutMethod", id }],
    }),

    /** Set Default Payout Method */
    setDefaultPayoutMethod: builder.mutation<{ message: string }, { payoutMethodId: number | string; orgId: number | string }>({
      query: ({ payoutMethodId, orgId }) => ({
        url: `payout-methods/${payoutMethodId}/default`,
        method: "PATCH",
        body: { orgId },
      }),
      invalidatesTags: ["PayoutMethods"],
    }),

    /** Update Payout Method */
    updatePayoutMethod: builder.mutation<
      PayoutMethod,
      { payoutMethodId: number | string; orgId: number | string; accountNumber?: string; accountName?: string; accountType?: string }
    >({
      query: ({ payoutMethodId, ...body }) => ({
        url: `payout-methods/${payoutMethodId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { payoutMethodId }) => ["PayoutMethods", { type: "PayoutMethod", id: payoutMethodId }],
    }),

    /** Delete Payout Method */
    deletePayoutMethod: builder.mutation<{ message: string }, { payoutMethodId: number | string; orgId: number | string }>({
      query: ({ payoutMethodId, orgId }) => ({
        url: `payout-methods/${payoutMethodId}?orgId=${orgId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PayoutMethods"],
    }),

    /** Validate Payout Method Ownership */
    validatePayoutMethodOwnership: builder.query<{ valid: boolean }, { methodId: number | string; orgId: number | string }>({
      query: ({ methodId, orgId }) => `payout-methods/${methodId}/validate/${orgId}`,
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
  useBulkUpdatePayoutStatusMutation,
  useGetPayoutsByOrgQuery,
  useGetLatestPayoutByOrgQuery,
  useGetPayoutCountByOrgQuery,
  useGetTotalPaidByOrgQuery,
  useGetPayoutsByStatusQuery,
  useGetPayoutByIdQuery,
  useUpdatePayoutStatusMutation,
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