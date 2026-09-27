import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../../App/store";

// 🎯 Response model (same shape as in your DB)
export interface AdminResponse {
  responseId: number;
  ticketId: number;
  nationalId: number;
  message: string;
  createdAt: string;
}

// ➕ Type used when creating a new response
export type NewAdminResponse = Omit<AdminResponse, "responseId" | "createdAt">;

// 🛠️ Partial update type (e.g. message edit)
export type UpdateAdminResponse = {
  responseId: number;
  body: Partial<Pick<AdminResponse, "message">>;
};

// ⚙️ RTK Query API
export const adminResponseApi = createApi({
  reducerPath: "adminResponseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://ticket-backend-ufx5.onrender.com/api/",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["AdminResponses", "AdminResponse"],

  endpoints: (builder) => ({
    // ✅ Get all responses for a ticket
    getResponsesByTicket: builder.query<AdminResponse[], number>({
      query: (ticketId) => `responses/ticket/${ticketId}`,
      providesTags: (_result, _error, ticketId) => [
        { type: "AdminResponses", id: ticketId },
      ],
    }),

    // ➕ Create new admin response
    createAdminResponse: builder.mutation<AdminResponse, NewAdminResponse>({
      query: (payload) => ({
        url: "responses",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_r, _e, { ticketId }) => [
        { type: "AdminResponses", id: ticketId },
      ],
    }),

    // ✏️ Update a response message
    updateAdminResponse: builder.mutation<AdminResponse, UpdateAdminResponse>({
      query: ({ responseId, body }) => ({
        url: `responses/${responseId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["AdminResponses"],
    }),

    // ❌ Delete a response
    deleteAdminResponse: builder.mutation<{ message: string }, number>({
      query: (responseId) => ({
        url: `responses/${responseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminResponses"],
    }),
  }),
});
