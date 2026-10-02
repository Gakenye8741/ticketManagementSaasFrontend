import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Star,
  UploadCloud,
  Link2,
  Info,
  CheckSquare,
  Images,
  Copy,
  ExternalLink,
  Maximize2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import {
  useGetMediaByEventIdQuery,
  useCreateMediaMutation,
  useBulkCreateMediaMutation,
  useDeleteMediaMutation,
  useBulkDeleteMediaMutation,
  useSetMediaAsPrimaryMutation,
} from "../../features/APIS/mediaApi";
import usePageTitle from "../../hooks/usePageTitle";

// Cloudinary config (unsigned upload preset)
const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";

export const EventMediaManager = () => {
  usePageTitle("Event Media Manager");

  // ---------------------------------------------------------------------------
  // ORG ID (Redux with localStorage fallback)
  // ---------------------------------------------------------------------------
  const authUser = useSelector((state: any) => state.auth?.user);
  let orgId = authUser?.orgId || authUser?.organizationId;

  if (!orgId) {
    try {
      const persistedAuth = localStorage.getItem("persist:auth");
      if (persistedAuth) {
        const parsed = JSON.parse(persistedAuth);
        const userObj = parsed.user ? JSON.parse(parsed.user) : null;
        orgId = userObj?.orgId;
      } else {
        const localUser = localStorage.getItem("user");
        if (localUser) orgId = JSON.parse(localUser)?.orgId;
      }
    } catch (err) {
      console.error("Failed to parse orgId from localStorage", err);
    }
  }

  // ---------------------------------------------------------------------------
  // DATA FETCHING: EVENTS
  // ---------------------------------------------------------------------------
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useGetEventsByOrganizationQuery(orgId, { skip: !orgId });

  const rawEvents = Array.isArray(eventsData)
    ? eventsData
    : Array.isArray((eventsData as any)?.data)
    ? (eventsData as any).data
    : [];

  const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;

  const [pickedEventId, setPickedEventId] = useState<string | number>("");
  // Falls back to the first event once events finish loading
  const selectedEventId = pickedEventId || (rawEvents.length > 0 ? getEventId(rawEvents[0]) : "");
  const numericEventId = Number(selectedEventId);

  const activeEvent = rawEvents.find((ev: any) => String(getEventId(ev)) === String(selectedEventId));
  const eventTitle = activeEvent?.title || `Event #${selectedEventId}`;

  // ---------------------------------------------------------------------------
  // DATA FETCHING: MEDIA
  // ---------------------------------------------------------------------------
  const { data: mediaData, isLoading: isLoadingMedia } = useGetMediaByEventIdQuery(numericEventId, {
    skip: !numericEventId || isNaN(numericEventId),
  });

  const mediaList = Array.isArray(mediaData)
    ? mediaData
    : Array.isArray((mediaData as any)?.data)
    ? (mediaData as any).data
    : [];

  const [createMedia, { isLoading: isCreating }] = useCreateMediaMutation();
  const [bulkCreateMedia, { isLoading: isBulkCreating }] = useBulkCreateMediaMutation();
  const [deleteMedia, { isLoading: isDeleting }] = useDeleteMediaMutation();
  const [bulkDeleteMedia, { isLoading: isBulkDeleting }] = useBulkDeleteMediaMutation();
  const [setAsPrimary] = useSetMediaAsPrimaryMutation();

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isBulkUrlModalOpen, setIsBulkUrlModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [page, setPage] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<{ id: number; name: string } | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);

  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [altTextInput, setAltTextInput] = useState("");
  const [bulkUrlsInput, setBulkUrlsInput] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-dismiss success banner
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleEventChange = (value: string) => {
    setPickedEventId(value);
    setPage(1);
    setSelectedMediaIds([]);
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setErrorMessage("");
  };

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    if (!e.target.files) return;

    const validFiles: { file: File; preview: string }[] = [];
    let skipped = false;

    Array.from(e.target.files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        skipped = true;
        return;
      }
      validFiles.push({ file, preview: URL.createObjectURL(file) });
    });

    if (skipped) setErrorMessage("Some files exceeded the 10MB limit and were skipped.");
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const handleRemoveQueuedFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleBulkFileUploadSubmit = async () => {
    if (selectedFiles.length === 0 || !numericEventId) return;

    setErrorMessage("");
    setIsUploading(true);
    setUploadProgress(0);

    const progress = selectedFiles.map(() => 0);

    // 1. Upload each file to Cloudinary and get its secure URL back
    const uploadOne = async (item: { file: File; preview: string }, idx: number) => {
      const type: "image" | "video" = item.file.type.startsWith("video") ? "video" : "image";

      const cloudFormData = new FormData();
      cloudFormData.append("file", item.file);
      cloudFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`,
        cloudFormData,
        {
          onUploadProgress: (e) => {
            progress[idx] = Math.round((e.loaded * 100) / (e.total || 1));
            setUploadProgress(Math.round(progress.reduce((a, b) => a + b, 0) / progress.length));
          },
        }
      );

      return { idx, type, url: response.data.secure_url as string, name: item.file.name };
    };

    const results = await Promise.allSettled(selectedFiles.map(uploadOne));

    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadOne>>> => r.status === "fulfilled")
      .map((r) => r.value);
    const failedCount = results.length - uploaded.length;

    // 2. Save the Cloudinary URLs to the backend
    if (uploaded.length > 0) {
      try {
        const items = uploaded.map((u, i) => ({
          eventId: numericEventId,
          url: u.url,
          type: u.type,
          altText: u.name,
          isPrimary: mediaList.length === 0 && i === 0,
        }));

        await bulkCreateMedia({ items }).unwrap();

        // Remove saved files from the queue, keep any that failed
        const savedIdx = new Set(uploaded.map((u) => u.idx));
        setSelectedFiles((prev) => {
          prev.forEach((f, i) => savedIdx.has(i) && URL.revokeObjectURL(f.preview));
          return prev.filter((_, i) => !savedIdx.has(i));
        });

        setSuccessMessage(`${uploaded.length} files uploaded successfully!`);
      } catch (err: any) {
        setErrorMessage(err?.data?.error || err?.message || "Uploaded to Cloudinary but failed to save to the database.");
      }
    }

    if (failedCount > 0) {
      setErrorMessage(`${failedCount} file(s) failed to upload. They are still in the queue, so you can try again.`);
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleAddMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrlInput.trim() || !numericEventId) {
      setErrorMessage("Please provide a valid media URL and select an event.");
      return;
    }
    try {
      setErrorMessage("");
      await createMedia({
        eventId: numericEventId,
        url: mediaUrlInput.trim(),
        type: mediaType,
        altText: altTextInput.trim() || undefined,
        isPrimary: mediaList.length === 0,
      }).unwrap();

      setSuccessMessage("Media added successfully!");
      setIsUrlModalOpen(false);
      setMediaUrlInput("");
      setAltTextInput("");
    } catch (err: any) {
      setErrorMessage(err?.data?.error || err?.message || "Failed to save media.");
    }
  };

  const handleBulkCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkUrlsInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0 || !numericEventId) {
      setErrorMessage("Please provide at least one URL.");
      return;
    }
    try {
      setErrorMessage("");
      const items = urls.map((url, idx) => ({
        eventId: numericEventId,
        url,
        type: mediaType,
        altText: `Batch Asset ${idx + 1}`,
        isPrimary: mediaList.length === 0 && idx === 0,
      }));

      await bulkCreateMedia({ items }).unwrap();
      setSuccessMessage(`${items.length} URLs added successfully!`);
      setIsBulkUrlModalOpen(false);
      setBulkUrlsInput("");
    } catch (err: any) {
      setErrorMessage(err?.data?.error || err?.message || "Failed to add URLs.");
    }
  };

  const confirmDeleteMedia = (id: number, name: string) => {
    setMediaToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!mediaToDelete) return;
    try {
      await deleteMedia(mediaToDelete.id).unwrap();
      setSelectedMediaIds((prev) => prev.filter((id) => id !== mediaToDelete.id));
      setSuccessMessage("Media deleted successfully.");
    } catch (err: any) {
      setErrorMessage(err?.data?.error || "Failed to delete media.");
    } finally {
      setIsDeleteModalOpen(false);
      setMediaToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    try {
      await bulkDeleteMedia({ mediaIds: selectedMediaIds }).unwrap();
      setSuccessMessage(`${selectedMediaIds.length} media items deleted.`);
      setSelectedMediaIds([]);
    } catch (err: any) {
      setErrorMessage(err?.data?.error || "Failed to delete selected media.");
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  const handleSetPrimary = async (mediaId: number) => {
    try {
      await setAsPrimary(mediaId).unwrap();
      setSuccessMessage("Primary media updated.");
    } catch (err: any) {
      setErrorMessage(err?.data?.error || "Failed to update primary media.");
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("Could not copy the link.");
    }
  };

  const formatKey = (k: string) =>
    k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

  const formatValue = (k: string, v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (/(date|createdat|updatedat|time)/i.test(k) && !isNaN(Date.parse(String(v)))) {
      return new Date(v).toLocaleString();
    }
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const toggleSelectMedia = (id: number) =>
    setSelectedMediaIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const allIds: number[] = mediaList.map((m: any) => m.mediaId || m.id);
  const allSelected = allIds.length > 0 && selectedMediaIds.length === allIds.length;
  const toggleSelectAll = () => setSelectedMediaIds(allSelected ? [] : allIds);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(mediaList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMedia = mediaList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalImages = mediaList.filter((m: any) => m.type !== "video").length;
  const totalVideos = mediaList.filter((m: any) => m.type === "video").length;
  const queuedBulkUrls = bulkUrlsInput.split("\n").filter((u) => u.trim()).length;

  // Shared modal shell
  const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
  const modalMotion = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
  };

  const TypeSelect = (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-base-content/70 text-[11px]">Media Type</label>
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value as "image" | "video")}
        className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs"
      >
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER & EVENT SELECTOR BAR                                         */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Images size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Event Media Manager</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Active</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Managing media for: <span className="font-bold text-base-content">{eventTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-48 font-semibold"
          >
            {rawEvents.map((ev: any) => {
              const id = getEventId(ev);
              return (
                <option key={id} value={id}>
                  {ev.title || `Event #${id}`}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setIsUrlModalOpen(true)}
            disabled={!selectedEventId}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm shrink-0"
          >
            <Plus size={14} />
            <span>Add Media</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* GUIDE BANNER                                                        */}
      {/* =================================================================== */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">Media Guide & Features</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Upload images and videos for your events, add media from links, and choose the primary banner shown
                to attendees. Use the event dropdown to switch events, tick items in the gallery to delete several at
                once.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

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
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="btn btn-ghost btn-xs btn-square">
            <X size={14} />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* STATES: NO ORG / LOADING / ERROR / EMPTY                            */}
      {/* =================================================================== */}
      {!orgId ? (
        <div className="text-center py-16 bg-warning/10 rounded-2xl border border-dashed border-warning/40 p-6">
          <AlertTriangle size={36} className="mx-auto text-warning/60 mb-2" />
          <h3 className="font-bold text-xs text-base-content">Organization not found</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">Please log in again as an organizer to load your events.</p>
        </div>
      ) : isLoadingEvents ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : eventsError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Failed to load events for organization {orgId}.</span>
        </div>
      ) : rawEvents.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <ImageIcon size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No Events Found</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">Create an event first to start adding media.</p>
        </div>
      ) : (
        <>
          {/* =============================================================== */}
          {/* SUMMARY METRICS                                                 */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-base-content/60 font-semibold">Total Media</span>
                <span className="text-base sm:text-lg font-black text-base-content">{mediaList.length}</span>
              </div>
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Layers size={18} />
              </div>
            </div>

            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-base-content/60 font-semibold">Images / Videos</span>
                <span className="text-base sm:text-lg font-black text-base-content">
                  {totalImages} / {totalVideos}
                </span>
              </div>
              <div className="p-2.5 bg-success/10 text-success rounded-xl">
                <ImageIcon size={18} />
              </div>
            </div>

            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-base-content/60 font-semibold">Bulk Tools</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsBulkUrlModalOpen(true)}
                    className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg gap-1 text-[11px]"
                  >
                    <Link2 size={12} />
                    <span>Bulk URLs</span>
                  </button>
                  {selectedMediaIds.length > 0 && (
                    <button
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="btn btn-ghost btn-xs text-error bg-error/10 hover:bg-error/20 rounded-lg gap-1 text-[11px]"
                    >
                      <Trash2 size={12} />
                      <span>Delete ({selectedMediaIds.length})</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2.5 bg-warning/10 text-warning rounded-xl shrink-0">
                <UploadCloud size={18} />
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* FILE UPLOADER                                                   */}
          {/* =============================================================== */}
          <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Upload Files</h3>
                <p className="text-[11px] text-base-content/60">Select multiple images or videos to upload at once.</p>
              </div>
              <span className="badge badge-primary badge-outline badge-sm font-bold shrink-0">
                {selectedFiles.length} queued
              </span>
            </div>

            <label className="relative border-2 border-dashed border-base-300 hover:border-primary/60 transition-colors rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-base-200/20 block">
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp, video/mp4"
                onChange={handleMultipleFilesChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1 pointer-events-none">
                <div className="p-3 bg-primary/10 text-primary rounded-xl mb-1">
                  <UploadCloud size={22} />
                </div>
                <p className="text-xs font-bold text-base-content">Click to browse or drag and drop files</p>
                <p className="text-[11px] text-base-content/60">PNG, JPG, WEBP or MP4 · up to 10MB each</p>
              </div>
            </label>

            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={item.preview}
                      className="relative bg-base-100 border border-base-200 rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="h-24 bg-base-200/50 relative">
                        {item.file.type.startsWith("video") ? (
                          <div className="w-full h-full flex items-center justify-center text-primary">
                            <Video size={22} />
                          </div>
                        ) : (
                          <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedFile(idx)}
                          className="btn btn-error btn-xs btn-circle absolute top-1.5 right-1.5 h-6 w-6 min-h-0"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="p-2 text-[10px] text-base-content/70 truncate">{item.file.name}</p>
                    </div>
                  ))}
                </div>

                {isUploading && (
                  <div className="flex flex-col gap-1">
                    <progress className="progress progress-primary w-full h-1.5" value={uploadProgress} max={100}></progress>
                    <p className="text-center text-[11px] font-bold text-primary">{uploadProgress}% uploaded</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleBulkFileUploadSubmit}
                    disabled={isUploading || isBulkCreating}
                    className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5"
                  >
                    {isUploading || isBulkCreating ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        <span>Upload {selectedFiles.length} Files</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* MEDIA GALLERY                                                   */}
          {/* =============================================================== */}
          <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Media Gallery</h3>
              {mediaList.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]"
                >
                  <CheckSquare size={12} />
                  <span>{allSelected ? "Clear selection" : "Select all"}</span>
                </button>
              )}
            </div>

            {isLoadingMedia ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
                <ImageIcon size={36} className="mx-auto text-primary/40 mb-2" />
                <h3 className="font-bold text-xs text-base-content">No Media Yet</h3>
                <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
                  Upload files or add links for <span className="font-bold text-base-content">{eventTitle}</span>.
                </p>
                <button onClick={() => setIsUrlModalOpen(true)} className="btn btn-primary btn-xs rounded-xl font-bold">
                  Add Media
                </button>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pagedMedia.map((item: any) => {
                  const mId = item.mediaId || item.id;
                  const isSelected = selectedMediaIds.includes(mId);

                  return (
                    <div
                      key={mId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailItem(item);
                        }
                      }}
                      className={`group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer bg-base-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100" : ""
                      }`}
                    >
                      {/* Media */}
                      {item.type === "video" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-base-200 to-secondary/20 text-primary">
                          <Video size={40} />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.altText || "Event media"}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      {/* Top row: primary badge + checkbox */}
                      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                        {item.isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-content text-[10px] font-bold shadow-lg">
                            <Star size={10} className="fill-current" />
                            Primary
                          </span>
                        ) : (
                          <span />
                        )}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-full bg-black/40 backdrop-blur-md"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectMedia(mId)}
                            className="checkbox checkbox-primary checkbox-xs bg-base-100/80 block"
                            aria-label="Select media"
                          />
                        </div>
                      </div>

                      {/* Hover hint */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/30">
                          <Maximize2 size={12} />
                          View details
                        </span>
                      </div>

                      {/* Bottom info glass panel */}
                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.altText || "Untitled asset"}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-white/70 font-semibold capitalize">
                              {item.type === "video" ? <Video size={10} /> : <ImageIcon size={10} />}
                              {item.type}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteMedia(mId, item.altText || "this media");
                            }}
                            className="btn btn-xs btn-circle bg-error/80 hover:bg-error border-none text-white shrink-0"
                            title="Delete media"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="btn btn-ghost btn-xs btn-square rounded-lg"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[11px] font-semibold text-base-content/70">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="btn btn-ghost btn-xs btn-square rounded-lg"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}

      {/* 0. Media Detail */}
      <AnimatePresence>
        {detailItem && (
          <div
            className={modalBackdrop}
            onClick={() => setDetailItem(null)}
            onKeyDown={(e) => e.key === "Escape" && setDetailItem(null)}
          >
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-base-200 px-4 sm:px-5 py-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Maximize2 size={16} className="text-primary shrink-0" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content truncate">
                    {detailItem.altText || "Media details"}
                  </h3>
                  {detailItem.isPrimary && (
                    <span className="badge badge-primary badge-sm font-bold gap-1 shrink-0">
                      <Star size={10} /> Primary
                    </span>
                  )}
                </div>
                <button onClick={() => setDetailItem(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-y-auto flex flex-col md:flex-row">
                {/* Preview */}
                <div className="md:w-1/2 bg-base-200/50 flex items-center justify-center p-3 sm:p-4 shrink-0">
                  {detailItem.type === "video" ? (
                    <video src={detailItem.url} controls className="w-full max-h-[50vh] rounded-2xl bg-black" />
                  ) : (
                    <img
                      src={detailItem.url}
                      alt={detailItem.altText || "Event media"}
                      className="w-full max-h-[50vh] object-contain rounded-2xl"
                    />
                  )}
                </div>

                {/* All data */}
                <div className="md:w-1/2 p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-base-content/60">
                    <Calendar size={12} />
                    <span>
                      Event: <span className="font-bold text-base-content">{eventTitle}</span>
                    </span>
                  </div>

                  <div className="rounded-2xl border border-base-200 divide-y divide-base-200 overflow-hidden">
                    {Object.entries(detailItem).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 px-3 py-2 text-xs">
                        <span className="sm:w-28 shrink-0 font-semibold text-base-content/60 text-[11px]">
                          {formatKey(key)}
                        </span>
                        <span className="font-semibold text-base-content break-all">{formatValue(key, value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCopyUrl(detailItem.url)}
                      className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg gap-1 text-[11px]"
                    >
                      <Copy size={12} />
                      <span>{copied ? "Copied!" : "Copy link"}</span>
                    </button>
                    <a
                      href={detailItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg gap-1 text-[11px]"
                    >
                      <ExternalLink size={12} />
                      <span>Open original</span>
                    </a>
                    {!detailItem.isPrimary && (
                      <button
                        onClick={async () => {
                          await handleSetPrimary(detailItem.mediaId || detailItem.id);
                          setDetailItem(null);
                        }}
                        className="btn btn-ghost btn-xs text-warning bg-warning/10 hover:bg-warning/20 rounded-lg gap-1 text-[11px]"
                      >
                        <Star size={12} />
                        <span>Set Primary</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        confirmDeleteMedia(detailItem.mediaId || detailItem.id, detailItem.altText || "this media");
                        setDetailItem(null);
                      }}
                      className="btn btn-ghost btn-xs text-error bg-error/10 hover:bg-error/20 rounded-lg gap-1 text-[11px] ml-auto"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Add Media by URL */}
      <AnimatePresence>
        {isUrlModalOpen && (
          <div className={modalBackdrop}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Add Media by URL</h3>
                </div>
                <button onClick={() => setIsUrlModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddMediaSubmit} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Media URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://res.cloudinary.com/.../image.jpg"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {TypeSelect}
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Alt Text</label>
                    <input
                      type="text"
                      placeholder="Banner description"
                      value={altTextInput}
                      onChange={(e) => setAltTextInput(e.target.value)}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsUrlModalOpen(false)}
                    className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isCreating ? <span className="loading loading-spinner loading-xs"></span> : "Save Media"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Bulk URLs */}
      <AnimatePresence>
        {isBulkUrlModalOpen && (
          <div className={modalBackdrop}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Bulk Add URLs</h3>
                </div>
                <button onClick={() => setIsBulkUrlModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleBulkCreateSubmit} className="flex flex-col gap-3 text-xs">
                {TypeSelect}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">URLs (one per line)</label>
                  <textarea
                    rows={5}
                    required
                    placeholder={"https://url-one.jpg\nhttps://url-two.jpg"}
                    value={bulkUrlsInput}
                    onChange={(e) => setBulkUrlsInput(e.target.value)}
                    className="textarea textarea-bordered rounded-xl w-full text-xs font-mono resize-none"
                  />
                  <span className="text-[11px] text-base-content/50">
                    {queuedBulkUrls > 0 ? `${queuedBulkUrls} links ready` : "Paste direct links to your files"}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkUrlModalOpen(false)}
                    className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBulkCreating}
                    className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold"
                  >
                    {isBulkCreating ? <span className="loading loading-spinner loading-xs"></span> : "Add URLs"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Delete Single */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className={modalBackdrop}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete Media?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-base-content">"{mediaToDelete?.name}"</span>? This action is permanent.
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
                  onClick={handleDelete}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Bulk Delete */}
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <div className={modalBackdrop}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete Selected Media?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  This will permanently remove{" "}
                  <span className="font-bold text-base-content">{selectedMediaIds.length} items</span> from{" "}
                  <span className="font-bold text-base-content">"{eventTitle}"</span>.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleBulkDelete}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isBulkDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete All"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventMediaManager;