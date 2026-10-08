import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Venue Payload and Input Interfaces
export interface Venue {
  venueId?: number;
  id?: number;
  orgId?: number;
  name: string;
  location: string;
  address: string;
  capacity: number;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VenueWithEvents extends Venue {
  events?: any[];
}

export interface CreateVenuePayload {
  name: string;
  location: string;
  address: string;
  capacity: number;
  description?: string;
}

export interface UpdateVenuePayload {
  venueId: number;
  name?: string;
  location?: string;
  address?: string;
  capacity?: number;
  description?: string;
}

export const venueApi = createApi({
  reducerPath: 'venueApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include',
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ['venues', 'venue', 'venueDetails'],
  endpoints: (builder) => ({
    // 1. Get All Venues for the Logged-in Organizer
    getAllVenues: builder.query<any, void>({
      query: () => 'venues',
      providesTags: ['venues'],
    }),

    // 2. Search Venues by Name
    searchVenues: builder.query<any, string>({
      query: (searchTerm) => `venues/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: ['venues'],
    }),

    // 3. Create a New Venue (scoped to the organizer's organization)
    createVenue: builder.mutation<any, CreateVenuePayload>({
      query: (venueData) => ({
        url: 'venues',
        method: 'POST',
        body: venueData,
      }),
      invalidatesTags: ['venues'],
    }),

    // 4. Get Venue By Name
    getVenueByName: builder.query<any, string>({
      query: (name) => `venues/${encodeURIComponent(name)}`,
      providesTags: ['venue'],
    }),

    // 5. Get Venue Details including Events
    getVenueDetailsWithEvents: builder.query<any, string>({
      query: (name) => `details/venues/search?name=${encodeURIComponent(name)}`,
      providesTags: ['venueDetails'],
    }),

    // 6. Update an Existing Venue
    updateVenue: builder.mutation<any, UpdateVenuePayload>({
      query: ({ venueId, ...data }) => ({
        url: `venues/${venueId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['venues', 'venue', 'venueDetails'],
    }),

    // 7. Delete an Existing Venue
    deleteVenue: builder.mutation<any, number>({
      query: (venueId) => ({
        url: `venues/${venueId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['venues', 'venue', 'venueDetails'],
    }),

    // 8. NEW: Get Venue By ID (public, used by the event details page)
    getVenueById: builder.query<any, number>({
      query: (venueId) => `venues/id/${venueId}`,
      providesTags: (_result, _error, venueId) => [{ type: 'venue', id: venueId }],
    }),
  }),
});

export const {
  useGetAllVenuesQuery,
  useSearchVenuesQuery,
  useCreateVenueMutation,
  useGetVenueByNameQuery,
  useGetVenueDetailsWithEventsQuery,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
  useGetVenueByIdQuery, // NEW
} = venueApi;