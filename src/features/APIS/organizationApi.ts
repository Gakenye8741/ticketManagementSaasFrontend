import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// ==========================================
// TYPES (Inferred from Zod / Backend API)
// ==========================================

export type OrgRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'scanner';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  logoUrl?: string | null;
  payoutPhone?: string | null;
  payoutType: 'mpesa_phone' | 'paybill' | 'bank';
  commissionPercentage: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrgMember {
  id: number;
  orgId: number;
  digitalId: number;
  orgRole: OrgRole;
  createdAt?: string;
}

export interface OrgStats {
  totalEvents?: number;
  totalTicketsSold?: number;
  totalRevenue?: number;
  activeScannersCount?: number;
  [key: string]: any;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  logoUrl?: string | null;
  payoutPhone?: string | null;
  payoutType?: 'mpesa_phone' | 'paybill' | 'bank';
  commissionPercentage?: string;
}

export type UpdateOrganizationRequest = Partial<CreateOrganizationRequest>;

export interface UpdateCommissionRequest {
  commissionPercentage: string;
}

export interface VerifyOrganizationRequest {
  isVerified: boolean;
}

export interface ToggleOrganizationStatusRequest {
  isActive: boolean;
}

export interface AddOrganizationMemberRequest {
  orgId: number;
  digitalId: number;
  orgRole: OrgRole;
}

export interface UpdateMemberRoleRequest {
  orgRole: OrgRole;
}

export interface UpdatePayoutConfigRequest {
  payoutPhone: string;
  payoutType: 'mpesa_phone' | 'paybill' | 'bank';
}

// ==========================================
// RTK QUERY API SLICE
// ==========================================

// Dynamically uses your production environment variable or falls back to localhost for local testing
const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/organizations` 
    : 'http://localhost:5000/api/organizations';

export const organizationsApi = createApi({
  reducerPath: 'organizationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    
    // CRITICAL: Tells the browser/fetch client to attach the HTTP-only 'auth_token' cookie with requests
    credentials: 'include',

    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Organization', 'OrgMembers', 'OrgStats'],
  endpoints: (builder) => ({
    // 1. Create Organization
    createOrganization: builder.mutation<Organization, CreateOrganizationRequest>({
      query: (body) => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Organization'],
    }),

    // 2. List Active Organizations
    getActiveOrganizations: builder.query<Organization[], void>({
      query: () => '/active',
      providesTags: ['Organization'],
    }),

    // 3. Admin: Get All Organizations
    getAllOrganizationsAdmin: builder.query<Organization[], void>({
      query: () => '/admin/all',
      providesTags: ['Organization'],
    }),

    // 4. Search Organizations by Query
    searchOrganizations: builder.query<Organization[], string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),

    // 5. Get Organization by URL Slug
    getOrganizationBySlug: builder.query<Organization, string>({
      query: (slug) => `/slug/${slug}`,
      providesTags: (_result, _error, slug) => [
        { type: 'Organization', id: slug }
      ],
    }),

    // 6. Get Organization Summary Dashboard Stats
    getOrganizationStats: builder.query<OrgStats, number | string>({
      query: (orgId) => `/${orgId}/stats`,
      providesTags: (_result, _error, orgId) => [
        { type: 'OrgStats', id: orgId }
      ],
    }),

    // 7. Get Total Active Members Count in an Organization
    getOrganizationMembersCount: builder.query<
      { count: number },
      number | string
    >({
      query: (orgId) => `/${orgId}/members/count`,
      providesTags: (_result, _error, orgId) => [
        { type: 'OrgMembers', id: orgId }
      ],
    }),

    // 8. Get All Members for an Organization
    getOrganizationMembers: builder.query<OrgMember[], number | string>({
      query: (orgId) => `/${orgId}/members`,
      providesTags: (_result, _error, orgId) => [
        { type: 'OrgMembers', id: orgId }
      ],
    }),

    // 9. Check Member Mapping by User Digital ID and Org ID
    checkMemberMapping: builder.query<
      OrgMember,
      { orgId: number | string; digitalId: number | string }
    >({
      query: ({ orgId, digitalId }) =>
        `/${orgId}/members/user/${digitalId}`,
    }),

    // 10. Get Organization with Full Relations
    getOrganizationRelations: builder.query<Organization, number | string>({
      query: (orgId) => `/${orgId}/relations`,
      providesTags: (_result, _error, orgId) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 11. Get Organization by ID (Public Profile)
    getOrganizationById: builder.query<Organization, number | string>({
      query: (orgId) => `/${orgId}`,
      providesTags: (_result, _error, orgId) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 12. Update Organization Profile Details
    updateOrganization: builder.mutation<
      Organization,
      {
        orgId: number | string;
        data: UpdateOrganizationRequest;
      }
    >({
      query: ({ orgId, data }) => ({
        url: `/${orgId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Organization', id: orgId },
        'Organization',
      ],
    }),

    // 13. Update Payout Configuration
    updatePayoutConfig: builder.mutation<
      Organization,
      {
        orgId: number | string;
        data: UpdatePayoutConfigRequest;
      }
    >({
      query: ({ orgId, data }) => ({
        url: `/${orgId}/payout`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 14. Admin: Update Organization Commission Percentage
    updateCommission: builder.mutation<
      Organization,
      {
        orgId: number | string;
        data: UpdateCommissionRequest;
      }
    >({
      query: ({ orgId, data }) => ({
        url: `/${orgId}/commission`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 15. Admin: Verify or Unverify Organization Badge
    verifyOrganization: builder.mutation<
      Organization,
      {
        orgId: number | string;
        data: VerifyOrganizationRequest;
      }
    >({
      query: ({ orgId, data }) => ({
        url: `/${orgId}/verify`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 16. Admin: Toggle Organization Active/Suspended Status
    toggleOrganizationStatus: builder.mutation<
      Organization,
      {
        orgId: number | string;
        data: ToggleOrganizationStatusRequest;
      }
    >({
      query: ({ orgId, data }) => ({
        url: `/${orgId}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'Organization', id: orgId }
      ],
    }),

    // 17. Delete Organization
    deleteOrganization: builder.mutation<
      { success: boolean },
      number | string
    >({
      query: (orgId) => ({
        url: `/${orgId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Organization'],
    }),

    // 18. Get All Organizations a Specific User Belongs To
    getUserOrganizations: builder.query<OrgMember[], number | string>({
      query: (digitalId) => `/user/${digitalId}`,
    }),

    // 19. Add a Member to an Organization
    addOrganizationMember: builder.mutation<
      OrgMember,
      AddOrganizationMemberRequest
    >({
      query: (body) => ({
        url: '/members',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'OrgMembers', id: orgId }
      ],
    }),

    // 20. Update Organization Member Role
    updateMemberRole: builder.mutation<
      OrgMember,
      {
        memberId: number | string;
        data: UpdateMemberRoleRequest;
      }
    >({
      query: ({ memberId, data }) => ({
        url: `/members/${memberId}/role`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['OrgMembers'],
    }),

    // 21. Remove Member from Organization
    removeOrganizationMember: builder.mutation<
      { success: boolean },
      number | string
    >({
      query: (memberId) => ({
        url: `/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OrgMembers'],
    }),
  }),
});

// Export hooks for functional components
export const {
  useCreateOrganizationMutation,
  useGetActiveOrganizationsQuery,
  useGetAllOrganizationsAdminQuery,
  useSearchOrganizationsQuery,
  useGetOrganizationBySlugQuery,
  useGetOrganizationStatsQuery,
  useGetOrganizationMembersCountQuery,
  useGetOrganizationMembersQuery,
  useCheckMemberMappingQuery,
  useGetOrganizationRelationsQuery,
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useUpdatePayoutConfigMutation,
  useUpdateCommissionMutation,
  useVerifyOrganizationMutation,
  useToggleOrganizationStatusMutation,
  useDeleteOrganizationMutation,
  useGetUserOrganizationsQuery,
  useAddOrganizationMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
} = organizationsApi;