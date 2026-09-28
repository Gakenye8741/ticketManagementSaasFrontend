import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../App/store';

// Media Payload and Input Interfaces
export interface MediaPayload {
  eventId: number;
  url: string;
  type: 'image' | 'video' | 'banner' | 'gallery' | 'poster';
  altText?: string;
  isPrimary?: boolean;
}

export interface BulkCreateMediaPayload {
  items: MediaPayload[];
}

export interface UpdateMediaPayload {
  mediaId: number;
  url?: string;
  type?: 'image' | 'video' | 'banner' | 'gallery' | 'poster';
  altText?: string;
  isPrimary?: boolean;
}

export interface CloneMediaPayload {
  sourceEventId: number;
  targetEventId: number;
}

export interface BatchUpdateAltTextPayload {
  updates: Array<{
    mediaId: number;
    altText: string;
  }>;
}

export interface BulkDeleteMediaPayload {
  mediaIds: number[];
}

export const mediaApi = createApi({
  reducerPath: 'mediaApi',
 baseQuery: fetchBaseQuery({
     baseUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/`,
     credentials: 'include',
   }),
   refetchOnReconnect: true,
   refetchOnMountOrArgChange: true,

  tagTypes: [
    'media',
    'mediaByEvent',
    'primaryMedia',
    'mediaStats',
    'recentMedia',
  ],
  endpoints: (builder) => ({
    // 1. Create a Single Media Record
    createMedia: builder.mutation<any, MediaPayload>({
      query: (mediaData) => ({
        url: 'media',
        method: 'POST',
        body: mediaData,
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'recentMedia'],
    }),

    // 2. Bulk Create Media Items
    bulkCreateMedia: builder.mutation<any, BulkCreateMediaPayload>({
      query: (payload) => ({
        url: 'media/bulk',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'recentMedia'],
    }),

    // 3. Clone Event Media
    cloneEventMedia: builder.mutation<any, CloneMediaPayload>({
      query: (payload) => ({
        url: 'media/clone',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['media', 'mediaByEvent'],
    }),

    // 4. Batch Update Alt Text
    batchUpdateAltText: builder.mutation<any, BatchUpdateAltTextPayload>({
      query: (payload) => ({
        url: 'media/alt-text/batch',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['media', 'mediaByEvent'],
    }),

    // 5. Set Media as Primary
    setMediaAsPrimary: builder.mutation<any, number>({
      query: (mediaId) => ({
        url: `media/${mediaId}/primary`,
        method: 'PATCH',
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'primaryMedia'],
    }),

    // 6. Update Media Metadata
    updateMedia: builder.mutation<any, UpdateMediaPayload>({
      query: ({ mediaId, ...data }) => ({
        url: `media/${mediaId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'primaryMedia'],
    }),

    // 7. Delete Single Media Record
    deleteMedia: builder.mutation<any, number>({
      query: (mediaId) => ({
        url: `media/${mediaId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'recentMedia'],
    }),

    // 8. Bulk Delete Media Items
    bulkDeleteMedia: builder.mutation<any, BulkDeleteMediaPayload>({
      query: (payload) => ({
        url: 'media/bulk/delete',
        method: 'DELETE',
        body: payload,
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'recentMedia'],
    }),

    // 9. Get All Media Paginated (Admin) - Made args optional to prevent {} type errors
    getAllMediaPaginated: builder.query<any, { limit?: number; offset?: number } | void>({
      query: (params) => {
        const limit = params?.limit ?? 20;
        const offset = params?.offset ?? 0;
        return `media/admin/all?limit=${limit}&offset=${offset}`;
      },
      providesTags: ['media'],
    }),

    // 10. Get Recent Media - Made limit optional
    getRecentMedia: builder.query<any, number | void>({
      query: (limit = 10) => `media/recent?limit=${limit}`,
      providesTags: ['recentMedia'],
    }),

    // 11. Search Media by Alt Text
    searchMediaByAltText: builder.query<any, string>({
      query: (searchTerm) => `media/search?q=${encodeURIComponent(searchTerm)}`,
      providesTags: ['media'],
    }),

    // 12. Get All Media for an Event
    getMediaByEventId: builder.query<any, number>({
      query: (eventId) => `media/event/${eventId}`,
      providesTags: (_result, _error, eventId) => [{ type: 'mediaByEvent', id: eventId }],
    }),

    // 13. Get Primary Media for an Event
    getPrimaryMediaByEventId: builder.query<any, number>({
      query: (eventId) => `media/event/${eventId}/primary`,
      providesTags: (_result, _error, eventId) => [{ type: 'primaryMedia', id: eventId }],
    }),

    // 14. Get Media Filtered by Type for an Event
    getMediaByType: builder.query<any, { eventId: number; type: string }>({
      query: ({ eventId, type }) => `media/event/${eventId}/type?type=${type}`,
      providesTags: ['mediaByEvent'],
    }),

    // 15. Count Total Media for an Event
    countEventMedia: builder.query<any, number>({
      query: (eventId) => `media/event/${eventId}/count`,
      providesTags: ['mediaStats'],
    }),

    // 16. Get Event Media Stats (Grouped by Type)
    getEventMediaStats: builder.query<any, number>({
      query: (eventId) => `media/event/${eventId}/stats`,
      providesTags: ['mediaStats'],
    }),

    // 17. Delete All Media Attached to an Event
    deleteAllEventMedia: builder.mutation<any, number>({
      query: (eventId) => ({
        url: `media/event/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['media', 'mediaByEvent', 'mediaStats', 'primaryMedia'],
    }),

    // 18. Verify if Media Belongs to an Event
    verifyMediaBelongsToEvent: builder.query<any, { mediaId: number; eventId: number }>({
      query: ({ mediaId, eventId }) => `media/${mediaId}/verify/${eventId}`,
    }),

    // 19. Get Single Media Record by ID
    getMediaById: builder.query<any, number>({
      query: (mediaId) => `media/${mediaId}`,
      providesTags: (_result, _error, mediaId) => [{ type: 'media', id: mediaId }],
    }),
  }),
});

export const {
  useCreateMediaMutation,
  useBulkCreateMediaMutation,
  useCloneEventMediaMutation,
  useBatchUpdateAltTextMutation,
  useSetMediaAsPrimaryMutation,
  useUpdateMediaMutation,
  useDeleteMediaMutation,
  useBulkDeleteMediaMutation,
  useGetAllMediaPaginatedQuery,
  useGetRecentMediaQuery,
  useSearchMediaByAltTextQuery,
  useGetMediaByEventIdQuery,
  useGetPrimaryMediaByEventIdQuery,
  useGetMediaByTypeQuery,
  useCountEventMediaQuery,
  useGetEventMediaStatsQuery,
  useDeleteAllEventMediaMutation,
  useVerifyMediaBelongsToEventQuery,
  useGetMediaByIdQuery,
} = mediaApi;