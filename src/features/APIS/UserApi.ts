import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:5000/api/' }),
  tagTypes: ['users', 'user', 'emails'],
  endpoints: (builder) => ({
    // 🟢 Auth: Login
    loginUser: builder.mutation({
      query: (userLoginCredentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: userLoginCredentials,
      }),
    }),

    // 🟢 Auth: Register
    registerUser: builder.mutation({
      query: (userRegisterPayload) => ({
        url: 'auth/register',
        method: 'POST',
        body: userRegisterPayload,
      }),
    }),

    // ✉️ Auth: Request password reset
    requestPasswordReset: builder.mutation({
      query: (emailPayload) => ({
        url: 'auth/password-reset',
        method: 'POST',
        body: emailPayload, // { email: "user@example.com" }
      }),
    }),

    // 🔐 Auth: Reset password with token
    resetPassword: builder.mutation({
      query: ({ token, newPasswordPayload }) => ({
        url: `auth/reset/${token}`,
        method: 'PUT',
        body: newPasswordPayload, // { password: "newPassword123" }
      }),
    }),

    // ✅ Auth: Verify email
    verifyEmail: builder.mutation({
      query: (verificationPayload) => ({
        url: 'auth/verify-email',
        method: 'PUT',
        body: verificationPayload, // { token: "..." } or your defined payload
      }),
    }),

    // 📋 Get all users
    getAllUsersProfiles: builder.query({
      query: () => 'users',
      providesTags: ['users'],
    }),

    // 🔍 Get user by National ID
    getUserByNationalId: builder.query({
      query: (nationalId: number | string) => `users/${nationalId}`,
      providesTags: ['user'],
    }),

    // 🔍 Get full user details
    getUserDetails: builder.query({
      query: (nationalId: number | string) => `users/${nationalId}/details`,
      providesTags: ['user'],
    }),

    // 🔁 Update user by National ID (standard user update)
    updateUser: builder.mutation({
      query: ({ nationalId, ...patch }) => ({
        url: `users/${nationalId}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // 🔁 Admin: Update user by National ID (can update roles, etc.)
    updateAdminUser: builder.mutation({
      query: ({ nationalId, ...adminUpdatePayload }) => ({
        url: `admin/users/${nationalId}`,
        method: 'PUT',
        body: adminUpdatePayload,
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // 🖼️ Update only profile image
    updateUserProfileImage: builder.mutation({
      query: ({ nationalId, profile_picture }) => ({
        url: `users/${nationalId}`,
        method: 'PUT',
        body: { profile_picture },
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // ❌ Delete user by National ID
    deleteUser: builder.mutation({
      query: (nationalId: number | string) => ({
        url: `users/${nationalId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // 🔍 Search users by last name (basic)
    searchUsersByLastName: builder.query({
      query: (lastName: string) => `users-search?lastName=${lastName}`,
    }),

    // 🔍 Search users by last name (full details)
    searchUsersWithDetails: builder.query({
      query: (lastName: string) => `details/users-search?lastName=${lastName}`,
    }),

    // 📧 Broadcast/Send email to all registered users or a specific user by nationalId
    sendEmailNotification: builder.mutation({
      query: (emailPayload) => ({
        url: 'users/send-email',
        method: 'POST',
        body: emailPayload, // { subject, htmlContent, message, targetNationalId, preheader, redirectUrl, eventDetails }
      }),
      invalidatesTags: ['emails'],
    }),

  }),
});

// ✅ Export Hooks
export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useGetAllUsersProfilesQuery,
  useGetUserByNationalIdQuery,
  useGetUserDetailsQuery,
  useUpdateUserMutation,
  useUpdateAdminUserMutation,
  useUpdateUserProfileImageMutation,
  useDeleteUserMutation,
  useSearchUsersByLastNameQuery,
  useSearchUsersWithDetailsQuery,
  useSendEmailNotificationMutation, // ✅ NEW: Email broadcast & targeted notification hook
} = userApi;