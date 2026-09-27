import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const eventApi = createApi({
  reducerPath: 'eventApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
    credentials: 'include',
  }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  tagTypes: ['events', 'event'],
  endpoints: (builder) => ({
    // 1. Get All Events Catalog
    getAllEvents: builder.query({
      query: () => 'events',
      providesTags: ['events']
    }),

    // 2. Get Upcoming Events Feed
    getUpcomingEvents: builder.query({
      query: () => 'events/upcoming',
      providesTags: ['events']
    }),

   // Inside your EventsApi.ts file
getEventsByTitle: builder.query({
  query: (title) => `/events/search/title?title=${title}`,
  // Transform the response so components receive the array directly
  transformResponse: (response: { data: any[] }) => response.data,
}),

    // 4. Get Events by Category
    getEventsByCategory: builder.query({
      query: (category) => `events/category/${category}`,
      providesTags: ['events']
    }),

    // 5. Get Events by Organization ID
    getEventsByOrganization: builder.query({
      query: (orgId) => `events/organization/${orgId}`,
      providesTags: ['events']
    }),

    // 6. Get Events by User Digital ID (Protected)
    getEventsByUserDigitalId: builder.query({
      query: (digitalId) => `events/user/${digitalId}`,
      providesTags: ['events']
    }),

    // 7. Get Single Event by Slug
    getEventBySlug: builder.query({
      query: (slug) => `events/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: 'event', id: slug }]
    }),

    // 8. Get Single Event by ID
    getEventById: builder.query({
      query: (eventId) => `events/${eventId}`,
      providesTags: (_result, _error, eventId) => [{ type: 'event', id: eventId }]
    }),

    // 9. Create a New Event (Admin or Organizer)
    createEvent: builder.mutation({
      query: (createEventPayload) => ({
        url: 'events',
        method: 'POST',
        body: createEventPayload,
      }),
      invalidatesTags: ['events']
    }),

    // 10. Update Event Details (Admin or Organizer)
    updateEvent: builder.mutation({
      query: ({ eventId, ...body }) => ({
        url: `events/${eventId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { eventId }) => ['events', { type: 'event', id: eventId }]
    }),

    // 11. Update Event Status (Admin or Organizer)
    updateEventStatus: builder.mutation({
      query: ({ eventId, status }) => ({
        url: `events/${eventId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { eventId }) => ['events', { type: 'event', id: eventId }]
    }),

    // 12. Delete an Event (Admin Only)
    deleteEvent: builder.mutation({
      query: (eventId) => ({
        url: `events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['events']
    }),
  }),
});

export const {
  useGetAllEventsQuery,
  useGetUpcomingEventsQuery,
  useGetEventsByTitleQuery,
  useGetEventsByCategoryQuery,
  useGetEventsByOrganizationQuery,
  useGetEventsByUserDigitalIdQuery,
  useGetEventBySlugQuery,
  useGetEventByIdQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useDeleteEventMutation,
} = eventApi;