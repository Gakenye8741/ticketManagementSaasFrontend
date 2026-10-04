import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include', // Ensures cookies are sent/received with requests
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
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

    // 📋 1. Get all users (Admin only)
    getAllUsersProfiles: builder.query({
      query: () => 'users',
      providesTags: ['users'],
    }),

    // 🔍 2. Search users by last name (Admin only)
    searchUsersByLastName: builder.query({
      query: (lastName: string) => ({
        url: 'users-search',
        params: { lastName },
      }),
      providesTags: ['users'],
    }),

    // 🔍 3. Search users with details by query (Admin only) — uses `q`
    searchUsersWithDetails: builder.query({
      query: (q: string) => ({
        url: 'details/users-search',
        params: { q },
      }),
      providesTags: ['users'],
    }),

    // 🔍 4. Get user by digital ID
    getUserByDigitalId: builder.query({
      query: (digitalId: number | string) => `users/${digitalId}`,
      providesTags: ['user'],
    }),

    // 🔍 5. Get full user details by digital ID
    getUserDetails: builder.query({
      query: (digitalId: number | string) => `users/${digitalId}/details`,
      providesTags: ['user'],
    }),

    // ➕ 6. Create a new user (Public)
    createUser: builder.mutation({
      query: (newUserPayload) => ({
        url: 'users',
        method: 'POST',
        body: newUserPayload, // { firstName, lastName, email, contactPhone, password, city, country }
      }),
      invalidatesTags: ['users'],
    }),

    // 📧 7. Broadcast email to registered users (Admin only)
    sendEmailNotification: builder.mutation({
      query: (emailPayload) => ({
        url: 'users/send-email',
        method: 'POST',
        body: emailPayload, // { subject, message, preheader }
      }),
      invalidatesTags: ['emails'],
    }),

    // 🔁 8. Update user by digital ID
    updateUser: builder.mutation({
      query: ({ digitalId, ...patch }) => ({
        url: `users/${digitalId}`,
        method: 'PUT',
        body: patch, // e.g. { firstName: "Johnathan" }
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // 🔁 9. Update user by digital ID (Admin only)
    updateAdminUser: builder.mutation({
      query: ({ digitalId, ...adminUpdatePayload }) => ({
        url: `admin/users/${digitalId}`,
        method: 'PUT',
        body: adminUpdatePayload, // { firstName, lastName, email, password, role }
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // 🖼️ Update only profile image (uses the same PUT users/:digitalId route)
    updateUserProfileImage: builder.mutation({
      query: ({ digitalId, profile_picture }) => ({
        url: `users/${digitalId}`,
        method: 'PUT',
        body: { profile_picture },
      }),
      invalidatesTags: ['user', 'users'],
    }),

    // ❌ 10. Delete user by digital ID (Admin only)
    deleteUser: builder.mutation({
      query: (digitalId: number | string) => ({
        url: `users/${digitalId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['user', 'users'],
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
  useSearchUsersByLastNameQuery,
  useSearchUsersWithDetailsQuery,
  useGetUserByDigitalIdQuery,
  useGetUserDetailsQuery,
  useCreateUserMutation,
  useSendEmailNotificationMutation,
  useUpdateUserMutation,
  useUpdateAdminUserMutation,
  useUpdateUserProfileImageMutation,
  useDeleteUserMutation,
} = userApi;