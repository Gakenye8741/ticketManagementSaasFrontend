import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../App/store';

export interface CreateVenuePayload {
  name: string;
  location?: string;
  capacity?: number;
  [key: string]: any;
}

export interface UpdateVenuePayload extends Partial<CreateVenuePayload> {
  venueId: number;
}

export const venueApi = createApi({
  reducerPath: 'venueApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'https://ticket-backend-ufx5.onrender.com'}/api/`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        headers.set('Authorization', formattedToken);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ['venues', 'venue'],

  endpoints: (builder) => ({
    // ➕ Create Venue
    createVenue: builder.mutation<any, CreateVenuePayload>({
      query: (createVenuePayload) => ({
        url: 'venues',
        method: 'POST',
        body: createVenuePayload,
      }),
      invalidatesTags: [{ type: 'venues', id: 'LIST' }],
    }),

    // 🔄 Update Venue
    updateVenue: builder.mutation<any, UpdateVenuePayload>({
      query: ({ venueId, ...body }) => ({
        url: `venues/${venueId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { venueId }) => [
        { type: 'venues', id: venueId },
        { type: 'venues', id: 'LIST' },
      ],
    }),

    // 🗑️ Delete Venue
    deleteVenue: builder.mutation<any, number>({
      query: (id) => ({
        url: `venues/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'venues', id },
        { type: 'venues', id: 'LIST' },
      ],
    }),

    // 📥 Get All Venues
    getAllVenues: builder.query<any, void>({
      query: () => 'venues',
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map((venue: { venueId: number }) => ({
                type: 'venues' as const,
                id: venue.venueId,
              })),
              { type: 'venues', id: 'LIST' },
            ]
          : [{ type: 'venues', id: 'LIST' }],
    }),

    // 🔍 Get Venue By Name
    getVenueByName: builder.query<any, string>({
      query: (name) => `venues/${name}`,
      providesTags: (_result, _error, name) => [{ type: 'venue', id: name }],
    }),
  }),
});

export const {
  useCreateVenueMutation,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
  useGetAllVenuesQuery,
  useGetVenueByNameQuery,
} = venueApi;