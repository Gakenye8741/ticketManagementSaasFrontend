import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Used by the admin organization page for the team roles
export type OrgRole = 'owner' | 'admin' | 'manager' | 'scanner';

export const organizationsApi = createApi({
  reducerPath: 'organizationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include',
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ['organizations', 'organization', 'orgMembers', 'orgStats'],
  endpoints: (builder) => ({
    // 1. Create a New Organization
    createOrganization: builder.mutation({
      query: (createOrganizationPayload) => ({
        url: 'organizations',
        method: 'POST',
        body: createOrganizationPayload,
      }),
      invalidatesTags: ['organizations']
    }),

    // 2. Get Active Organizations
    getActiveOrganizations: builder.query({
      query: () => 'organizations/active',
      providesTags: ['organizations']
    }),

    // 3. Get All Organizations (Admin Only)
    getAllOrganizationsAdmin: builder.query({
      query: () => 'organizations/admin/all',
      providesTags: ['organizations']
    }),

    // 4. Search Organizations
    searchOrganizations: builder.query({
      query: (q) => `organizations/search?q=${encodeURIComponent(q)}`,
      providesTags: ['organizations']
    }),

    // 5. Get Single Organization by Slug
    getOrganizationBySlug: builder.query({
      query: (slug) => `organizations/slug/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: 'organization', id: slug }]
    }),

    // 6. Get Organization Stats
    getOrganizationStats: builder.query({
      query: (orgId) => `organizations/${orgId}/stats`,
      providesTags: (_result, _error, orgId) => [{ type: 'orgStats', id: orgId }]
    }),

    // 7. Get Organization Members Count
    getOrganizationMembersCount: builder.query({
      query: (orgId) => `organizations/${orgId}/members/count`,
      providesTags: (_result, _error, orgId) => [{ type: 'orgMembers', id: orgId }]
    }),

    // 8. Get All Members of an Organization
    getOrganizationMembers: builder.query({
      query: (orgId) => `organizations/${orgId}/members`,
      providesTags: (_result, _error, orgId) => [{ type: 'orgMembers', id: orgId }]
    }),

    // 9. Check Member Mapping by User Digital ID
    checkMemberMapping: builder.query({
      query: ({ orgId, digitalId }) => `organizations/${orgId}/members/user/${digitalId}`,
      providesTags: (_result, _error, { orgId }) => [{ type: 'orgMembers', id: orgId }]
    }),

    // 10. Get Organization with Full Relations
    getOrganizationRelations: builder.query({
      query: (orgId) => `organizations/${orgId}/relations`,
      providesTags: (_result, _error, orgId) => [{ type: 'organization', id: orgId }]
    }),

    // 11. Get Single Organization by ID
    getOrganizationById: builder.query({
      query: (orgId) => `organizations/${orgId}`,
      providesTags: (_result, _error, orgId) => [{ type: 'organization', id: orgId }]
    }),

    // 12. Get All Organizations a User Belongs To
    getUserOrganizations: builder.query({
      query: (digitalId) => `organizations/user/${digitalId}`,
      providesTags: ['organizations']
    }),

    // 13. Update Organization Details
    updateOrganization: builder.mutation({
      query: ({ orgId, data }) => ({
        url: `organizations/${orgId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['organizations', { type: 'organization', id: orgId }]
    }),

    // 14. Update Payout Configuration
    updatePayoutConfig: builder.mutation({
      query: ({ orgId, data }) => ({
        url: `organizations/${orgId}/payout`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['organizations', { type: 'organization', id: orgId }]
    }),

    // 15. Update Commission Percentage (Admin Only)
    updateCommission: builder.mutation({
      query: ({ orgId, data }) => ({
        url: `organizations/${orgId}/commission`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['organizations', { type: 'organization', id: orgId }]
    }),

    // 16. Verify or Unverify Organization (Admin Only)
    verifyOrganization: builder.mutation({
      query: ({ orgId, data }) => ({
        url: `organizations/${orgId}/verify`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['organizations', { type: 'organization', id: orgId }]
    }),

    // 17. Activate or Suspend Organization (Admin Only)
    toggleOrganizationStatus: builder.mutation({
      query: ({ orgId, data }) => ({
        url: `organizations/${orgId}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['organizations', { type: 'organization', id: orgId }]
    }),

    // 18. Delete an Organization (Admin Only)
    deleteOrganization: builder.mutation({
      query: (orgId) => ({
        url: `organizations/${orgId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['organizations']
    }),

    // 19. Add a Member to an Organization
    addOrganizationMember: builder.mutation({
      query: (addMemberPayload) => ({
        url: 'organizations/members',
        method: 'POST',
        body: addMemberPayload,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [
        { type: 'orgMembers', id: orgId },
        { type: 'orgStats', id: orgId },
      ]
    }),

    // 20. Update a Member's Role
    updateMemberRole: builder.mutation({
      query: ({ memberId, data }) => ({
        url: `organizations/members/${memberId}/role`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['orgMembers', 'orgStats']
    }),

    // 21. Remove a Member from an Organization
    removeOrganizationMember: builder.mutation({
      query: (memberId) => ({
        url: `organizations/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['orgMembers', 'orgStats']
    }),
  }),
});

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
  useGetUserOrganizationsQuery,
  useUpdateOrganizationMutation,
  useUpdatePayoutConfigMutation,
  useUpdateCommissionMutation,
  useVerifyOrganizationMutation,
  useToggleOrganizationStatusMutation,
  useDeleteOrganizationMutation,
  useAddOrganizationMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
} = organizationsApi;