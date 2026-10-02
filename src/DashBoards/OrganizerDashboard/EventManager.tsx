import { useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  Search,
  Sparkles,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetEventsByOrganizationQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useUpdateEventStatusMutation,
  useDeleteEventMutation,
  useGetEventsByTitleQuery,
} from "../../features/APIS/EventsApi";
import { useGetAllVenuesQuery } from "../../features/APIS/VenueApi";
import { useGetPrimaryMediaByEventIdQuery } from "../../features/APIS/mediaApi";
import usePageTitle from "../../hooks/usePageTitle";

const EVENT_CATEGORIES = [
  "music",
  "conference",
  "workshop",
  "festival",
  "sports",
  "arts_theatre",
  "networking",
  "nightlife",
  "charity",
  "exhibition",
  "religious",
  "food_drink",
  "technology",
  "comedy",
  "other"
];

// Helper sub-component to fetch and render the primary event image cleanly
const EventImageThumbnail = ({ eventId }: { eventId: number | string }) => {
  const numericId = Number(eventId);
  const { data: mediaData } = useGetPrimaryMediaByEventIdQuery(numericId, {
    skip: !numericId || isNaN(numericId),
  }) as { data: any };

  const imageUrl =
    typeof mediaData === "string"
      ? mediaData
      : mediaData?.url || mediaData?.data?.url || (Array.isArray(mediaData) ? mediaData[0]?.url || mediaData[0] : null);

  if (!imageUrl || typeof imageUrl !== "string") {
    return (
      <div className="w-full h-full bg-base-300/50 flex items-center justify-center text-base-content/40">
        <ImageIcon size={20} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Event Banner"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
};

export const EventManager = () => {
  usePageTitle("Event Manager");

  const user = useSelector((state: RootState) => state.auth.user);
  const orgId = user?.orgId || user?.organizationId || 1;

  // 1. Queries
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useGetEventsByOrganizationQuery(orgId, {
    skip: !orgId,
  });

  const { data: venuesData } = useGetAllVenuesQuery();
  const rawVenues = Array.isArray(venuesData)
    ? venuesData
    : Array.isArray((venuesData as any)?.data)
    ? (venuesData as any).data
    : [];

  // 2. Mutations
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [updateEventStatus] = useUpdateEventStatusMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  // 3. Component UI & Pagination States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: searchResults } = useGetEventsByTitleQuery(searchTitle, {
    skip: !searchTitle || searchTitle.trim().length === 0,
  });

  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    category: "technology",
    date: "",
    time: "",
    venueId: "",
  });

  const rawEvents = searchTitle.trim() ? searchResults : events;
  const displayedEvents = Array.isArray(rawEvents)
    ? rawEvents
    : Array.isArray((rawEvents as any)?.data)
    ? (rawEvents as any).data
    : [];

  // Pagination calculation
  const totalPages = Math.ceil(displayedEvents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = displayedEvents.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const generatedSlug = eventFormData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const payload = {
      title: eventFormData.title,
      slug: generatedSlug,
      description: eventFormData.description,
      category: eventFormData.category,
      date: eventFormData.date,
      time: eventFormData.time,
      venueId: eventFormData.venueId ? Number(eventFormData.venueId) : 1,
      orgId: Number(orgId),
    };

    try {
      await createEvent(payload).unwrap();
      setSuccessMessage("Event created successfully!");
      setIsCreateModalOpen(false);
      setEventFormData({
        title: "",
        description: "",
        category: "technology",
        date: "",
        time: "",
        venueId: "",
      });
      refetchEvents();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          (Array.isArray(err?.data?.error)
            ? err.data.error.map((e: any) => e.message).join(", ")
            : "Failed to create event.")
      );
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setErrorMessage("");

    const generatedSlug = eventFormData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const payload = {
      eventId: selectedEventId,
      title: eventFormData.title,
      slug: generatedSlug,
      description: eventFormData.description,
      category: eventFormData.category,
      date: eventFormData.date,
      time: eventFormData.time,
      venueId: eventFormData.venueId ? Number(eventFormData.venueId) : 1,
      orgId: Number(orgId),
    };

    try {
      await updateEvent(payload).unwrap();
      setSuccessMessage("Event updated successfully!");
      setIsEditModalOpen(false);
      setSelectedEventId(null);
      refetchEvents();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          (Array.isArray(err?.data?.error)
            ? err.data.error.map((e: any) => e.message).join(", ")
            : "Failed to update event.")
      );
    }
  };

  const handleStatusToggle = async (eventId: string | number, currentStatus: string) => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await updateEventStatus({ eventId, status: nextStatus }).unwrap();
      setSuccessMessage(`Event status updated to ${nextStatus}!`);
      refetchEvents();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to update status.");
    }
  };

  const confirmDeleteEvent = (eventId: string | number, eventTitle: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    try {
      await deleteEvent(selectedEventId).unwrap();
      setSuccessMessage("Event deleted successfully.");
      setIsDeleteModalOpen(false);
      setSelectedEventId(null);
      setSelectedEventTitle("");
      refetchEvents();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to delete event.");
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Events Dashboard</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Live</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Monitor active listings, manage schedules, and track event performance across your organization.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm w-full sm:w-auto"
        >
          <Plus size={14} />
          <span>New Event</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="alert alert-success text-xs font-semibold py-2 rounded-xl shadow-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-base-200/50 border border-base-200 px-3 py-1.5 rounded-xl w-full sm:max-w-sm">
          <Search size={14} className="text-base-content/40 shrink-0" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={searchTitle}
            onChange={(e) => {
              setSearchTitle(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-none outline-none w-full text-xs text-base-content"
          />
          {searchTitle && (
            <button onClick={() => setSearchTitle("")} className="text-[10px] font-bold text-primary shrink-0">Clear</button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-xs text-base-content/60 font-medium">
            Showing <span className="font-bold text-base-content">{displayedEvents.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, displayedEvents.length)}</span> of <span className="font-bold text-base-content">{displayedEvents.length}</span>
          </span>
          <div className="join bg-base-200 p-0.5 rounded-xl border border-base-300">
            <button
              onClick={() => setViewMode("grid")}
              className={`join-item btn btn-xs rounded-lg gap-1.5 px-3 font-semibold ${
                viewMode === "grid" ? "btn-primary text-primary-content shadow-xs" : "btn-ghost text-base-content/60"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`join-item btn btn-xs rounded-lg gap-1.5 px-3 font-semibold ${
                viewMode === "table" ? "btn-primary text-primary-content shadow-xs" : "btn-ghost text-base-content/60"
              }`}
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events Display Area */}
      {eventsLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Calendar size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No Events Scheduled</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">Create your first event to get started.</p>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-xs rounded-xl font-bold">
            Create Event
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* --- GRID VIEW --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEvents.map((event: any) => {
            const eventId = event.eventId || event.id || event._id;
            const status = event.eventStatus || event.status || "draft";
            return (
              <div
                key={eventId}
                className="group bg-base-100 border border-base-200 hover:border-primary/40 transition-all duration-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                {/* Event Primary Image Thumbnail */}
                <div className="w-full h-36 bg-base-200 relative overflow-hidden">
                  <EventImageThumbnail eventId={eventId} />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="badge badge-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-sm">
                      {event.category?.replace("_", " ") || "General"}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={() => handleStatusToggle(eventId, status)}
                      className={`badge badge-[10px] font-bold cursor-pointer shadow-sm transition-all ${
                        status === "published" ? "badge-success text-success-content" : "badge-ghost bg-base-100/80 text-base-content"
                      }`}
                    >
                      {status}
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-black tracking-tight text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-[11px] text-base-content/60 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-base-100 text-[11px] text-base-content/70">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">
                        {event.venue?.name || event.venueName || "Venue Assigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-primary shrink-0" />
                      <span>{event.date ? `${event.date.substring(0, 10)} at ${event.time || ""}` : "Flexible"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-base-100 gap-1">
                    <button
                      onClick={() => {
                        setSelectedEventId(eventId);
                        setEventFormData({
                          title: event.title || "",
                          description: event.description || "",
                          category: event.category || "technology",
                          date: event.date ? event.date.substring(0, 10) : "",
                          time: event.time || "",
                          venueId: event.venueId?.toString() || event.venue?.venueId?.toString() || "",
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => confirmDeleteEvent(eventId, event.title)}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg gap-1 text-[11px]"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- TABLE VIEW --- */
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[650px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold w-16">Poster</th>
                  <th className="py-3 px-4 font-bold">Event Title</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Venue</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((event: any) => {
                  const eventId = event.eventId || event.id || event._id;
                  const status = event.eventStatus || event.status || "draft";
                  return (
                    <tr key={eventId} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                      <td className="py-2 px-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-base-200 border border-base-300 shrink-0">
                          <EventImageThumbnail eventId={eventId} />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-base-content">
                        <div className="flex flex-col">
                          <span className="line-clamp-1">{event.title}</span>
                          <span className="text-[10px] text-base-content/50 font-normal line-clamp-1">{event.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-primary">
                        {event.category?.replace("_", " ") || "General"}
                      </td>
                      <td className="py-3 px-4 text-base-content/70">
                        {event.venue?.name || event.venueName || "Assigned"}
                      </td>
                      <td className="py-3 px-4 text-base-content/70 whitespace-nowrap">
                        {event.date ? `${event.date.substring(0, 10)} @ ${event.time || ""}` : "Flexible"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleStatusToggle(eventId, status)}
                          className={`badge badge-[10px] font-bold cursor-pointer ${
                            status === "published" ? "badge-success text-success-content" : "badge-ghost text-base-content/60"
                          }`}
                        >
                          {status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedEventId(eventId);
                              setEventFormData({
                                title: event.title || "",
                                description: event.description || "",
                                category: event.category || "technology",
                                date: event.date ? event.date.substring(0, 10) : "",
                                time: event.time || "",
                                venueId: event.venueId?.toString() || event.venue?.venueId?.toString() || "",
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => confirmDeleteEvent(eventId, event.title)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PAGINATION CONTROLS --- */}
      {displayedEvents.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-base-100 border border-base-200 px-4 py-3 rounded-2xl shadow-sm">
          <span className="text-xs text-base-content/60 font-medium">
            Page <span className="font-bold text-base-content">{currentPage}</span> of <span className="font-bold text-base-content">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-ghost btn-xs rounded-xl gap-1 font-semibold disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`btn btn-xs rounded-xl w-7 h-7 font-bold ${
                    currentPage === pageNumber ? "btn-primary text-primary-content" : "btn-ghost text-base-content/70"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn btn-ghost btn-xs rounded-xl gap-1 font-semibold disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Create Event</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nairobi Tech Meetup"
                    value={eventFormData.title}
                    onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Brief description..."
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                    className="textarea textarea-bordered rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Category</label>
                    <select
                      value={eventFormData.category}
                      onChange={(e) => setEventFormData({ ...eventFormData, category: e.target.value })}
                      className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs capitalize"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Venue</label>
                    <select
                      value={eventFormData.venueId}
                      onChange={(e) => setEventFormData({ ...eventFormData, venueId: e.target.value })}
                      className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs"
                    >
                      <option value="">Select Venue</option>
                      {rawVenues.map((v: any) => (
                        <option key={v.venueId || v.id} value={v.venueId || v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Date</label>
                    <input
                      type="date"
                      required
                      value={eventFormData.date}
                      onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Time</label>
                    <input
                      type="time"
                      required
                      value={eventFormData.time}
                      onChange={(e) => setEventFormData({ ...eventFormData, time: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isCreating ? <span className="loading loading-spinner loading-xs"></span> : "Save Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT MODAL --- */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Edit Event</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleUpdateEvent} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Event Title</label>
                  <input
                    type="text"
                    required
                    value={eventFormData.title}
                    onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Description</label>
                  <textarea
                    rows={3}
                    required
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                    className="textarea textarea-bordered rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Category</label>
                    <select
                      value={eventFormData.category}
                      onChange={(e) => setEventFormData({ ...eventFormData, category: e.target.value })}
                      className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs capitalize"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Venue</label>
                    <select
                      value={eventFormData.venueId}
                      onChange={(e) => setEventFormData({ ...eventFormData, venueId: e.target.value })}
                      className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs"
                    >
                      <option value="">Select Venue</option>
                      {rawVenues.map((v: any) => (
                        <option key={v.venueId || v.id} value={v.venueId || v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Date</label>
                    <input
                      type="date"
                      required
                      value={eventFormData.date}
                      onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Time</label>
                    <input
                      type="time"
                      required
                      value={eventFormData.time}
                      onChange={(e) => setEventFormData({ ...eventFormData, time: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdating} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isUpdating ? <span className="loading loading-spinner loading-xs"></span> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- STYLISH DELETE CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete Event?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  Are you sure you want to delete <span className="font-bold text-base-content">"{selectedEventTitle}"</span>? This action is permanent and cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteEvent}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete Event"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default EventManager;