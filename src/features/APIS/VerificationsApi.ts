import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// ==========================================
// TYPES (Inferred from the .http requests / Backend API)
// ==========================================

export type VerificationStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'resubmission_required';

export type VerificationEntityType = 'individual' | 'business';

// Slugs used in the itemized rejection URLs
export type RejectableField =
  | 'id-front'
  | 'id-back'
  | 'selfies'
  | 'business-doc'
  | 'tax-cert';

// Keys used in the "clear rejection" request body
export type ClearableField =
  | 'idFront'
  | 'idBack'
  | 'selfies'
  | 'businessDoc'
  | 'taxCert';

export interface Verification {
  id: number;
  userId: number;
  orgId: number;
  entityType: VerificationEntityType;
  legalFullName: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfiePhotos: string[];
  businessDocUrl?: string | null;
  taxCertUrl?: string | null;
  status: VerificationStatus;
  adminComment?: string | null;
  rejectionReason?: string | null;

  // Itemized rejection comments (null when the field is not rejected)
  idFrontRejection?: string | null;
  idBackRejection?: string | null;
  selfiesRejection?: string | null;
  businessDocRejection?: string | null;
  taxCertRejection?: string | null;

  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface SubmitVerificationRequest {
  userId: number;
  orgId: number;
  entityType: VerificationEntityType;
  legalFullName: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfiePhotos: string[];
  businessDocUrl?: string | null;
  taxCertUrl?: string | null;
}

export type UpdateVerificationRequest = Partial<
  Omit<SubmitVerificationRequest, 'userId' | 'orgId'>
>;

export interface GetAllVerificationsParams {
  limit?: number;
  offset?: number;
}

export interface UpdateVerificationStatusRequest {
  status: VerificationStatus;
  adminComment?: string;
}

export interface ApproveVerificationRequest {
  adminComment?: string;
}

export interface RejectVerificationRequest {
  reason: string;
}

export interface RequestResubmissionRequest {
  generalComment: string;
}

export interface RejectFieldRequest {
  comment: string;
}

export interface ClearRejectionRequest {
  field: ClearableField;
  newUrlValue: string;
}

// ==========================================
// RTK QUERY API SLICE
// ==========================================

// Dynamically uses your production environment variable or falls back to localhost for local testing
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/verifications`
    : 'http://localhost:5000/api/verifications';

export const verificationsApi = createApi({
  reducerPath: 'verificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,

    // CRITICAL: Tells the browser/fetch client to attach the HTTP-only 'token' cookie with requests
    credentials: 'include',

    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Verification', 'VerificationMetrics'],
  endpoints: (builder) => ({
    // 1. Submit New Organizer Verification (KYC)
    submitVerification: builder.mutation<Verification, SubmitVerificationRequest>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Verification', 'VerificationMetrics'],
    }),

    // 2. Get Verification Record by ID
    getVerificationById: builder.query<Verification, number | string>({
      query: (id) => `/${id}`,
      providesTags: (_result, _error, id) => [
        { type: 'Verification', id }
      ],
    }),

    // 3. Get Verification by User Digital ID
    getVerificationByUser: builder.query<Verification, number | string>({
      query: (userId) => `/user/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: 'Verification', id: `user-${userId}` }
      ],
    }),

    // 4. Get Verification by Organization ID
    getVerificationByOrganization: builder.query<Verification, number | string>({
      query: (orgId) => `/organization/${orgId}`,
      providesTags: (_result, _error, orgId) => [
        { type: 'Verification', id: `org-${orgId}` }
      ],
    }),

    // 5. Admin: Get All Verifications (With Pagination)
    getAllVerifications: builder.query<Verification[], GetAllVerificationsParams | void>({
      query: (params) => {
        const { limit = 10, offset = 0 } = params ?? {};
        return `?limit=${limit}&offset=${offset}`;
      },
      providesTags: ['Verification'],
    }),

    // 6. Admin: Get Verifications Filtered by Status
    getVerificationsByStatus: builder.query<Verification[], VerificationStatus>({
      query: (status) => `/status/${status}`,
      providesTags: ['Verification'],
    }),

    // 7. Admin: Get Verifications Filtered by Entity Type
    getVerificationsByEntityType: builder.query<Verification[], VerificationEntityType>({
      query: (entityType) => `/entity/${entityType}`,
      providesTags: ['Verification'],
    }),

    // 8. Update General Verification Details (Organizer)
    updateVerification: builder.mutation<
      Verification,
      {
        id: number | string;
        data: UpdateVerificationRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
      ],
    }),

    // 9. Admin: Update Global Review Status
    updateVerificationStatus: builder.mutation<
      Verification,
      {
        id: number | string;
        data: UpdateVerificationStatusRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 10. Admin: Fully Approve Organizer Verification
    approveVerification: builder.mutation<
      Verification,
      {
        id: number | string;
        data?: ApproveVerificationRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/approve`,
        method: 'PATCH',
        body: data ?? {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 11. Admin: Globally Reject Verification
    rejectVerification: builder.mutation<
      Verification,
      {
        id: number | string;
        data: RejectVerificationRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/reject`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 12. Admin: Request General Resubmission
    requestResubmission: builder.mutation<
      Verification,
      {
        id: number | string;
        data: RequestResubmissionRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/request-resubmission`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 13. Admin: Itemized Rejection (id-front | id-back | selfies | business-doc | tax-cert)
    rejectVerificationField: builder.mutation<
      Verification,
      {
        id: number | string;
        field: RejectableField;
        data: RejectFieldRequest;
      }
    >({
      query: ({ id, field, data }) => ({
        url: `/${id}/reject-field/${field}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 14. Clear Itemized Rejection on Re-upload (Organizer)
    clearFieldRejection: builder.mutation<
      Verification,
      {
        id: number | string;
        data: ClearRejectionRequest;
      }
    >({
      query: ({ id, data }) => ({
        url: `/${id}/clear-rejection`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Verification', id },
        'Verification',
        'VerificationMetrics',
      ],
    }),

    // 15. Admin: Get Count of Pending Verifications
    getPendingVerificationsCount: builder.query<{ count: number }, void>({
      query: () => '/metrics/pending-count',
      providesTags: ['VerificationMetrics'],
    }),

    // 16. Admin: Get All Verifications Awaiting Resubmission Review
    getVerificationsNeedingResubmission: builder.query<Verification[], void>({
      query: () => '/metrics/needing-resubmission',
      providesTags: ['VerificationMetrics'],
    }),

    // 17. Admin: Delete Verification Record
    deleteVerification: builder.mutation<
      { success: boolean },
      number | string
    >({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Verification', 'VerificationMetrics'],
    }),
  }),
});

// Export hooks for functional components
export const {
  useSubmitVerificationMutation,
  useGetVerificationByIdQuery,
  useGetVerificationByUserQuery,
  useGetVerificationByOrganizationQuery,
  useGetAllVerificationsQuery,
  useGetVerificationsByStatusQuery,
  useGetVerificationsByEntityTypeQuery,
  useUpdateVerificationMutation,
  useUpdateVerificationStatusMutation,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useRequestResubmissionMutation,
  useRejectVerificationFieldMutation,
  useClearFieldRejectionMutation,
  useGetPendingVerificationsCountQuery,
  useGetVerificationsNeedingResubmissionQuery,
  useDeleteVerificationMutation,
} = verificationsApi;