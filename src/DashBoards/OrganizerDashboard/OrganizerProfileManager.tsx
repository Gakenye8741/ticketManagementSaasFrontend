import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Fingerprint,
  CalendarDays,
  ArrowLeft,
  Camera,
  Info,
  Building2,
  UploadCloud,
  LocateFixed,
  Home,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useGetUserByDigitalIdQuery,
  useGetUserDetailsQuery,
  useUpdateUserMutation,
  useUpdateUserProfileImageMutation,
} from "../../features/APIS/UserApi";
import usePageTitle from "../../hooks/usePageTitle";

// Cloudinary config (unsigned upload preset)
const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";

interface OrganizerProfileManagerProps {
  digitalId?: string | number;
  onBack?: () => void;
}

export const OrganizerProfileManager = ({ digitalId: propDigitalId, onBack }: OrganizerProfileManagerProps) => {
  usePageTitle("Organizer Profile");

  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = propDigitalId || user?.digitalId || user?.userId || "";

  // ---------------------------------------------------------------------------
  // DATA FETCHING: USER PROFILE & FULL DETAILS
  // ---------------------------------------------------------------------------
  const {
    data: userData,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useGetUserByDigitalIdQuery(digitalId, {
    skip: !digitalId,
  });

  const { data: detailsData, refetch: refetchDetails } = useGetUserDetailsQuery(digitalId, {
    skip: !digitalId,
  });

  const rawUser = (userData as any)?.data || userData || {};
  const rawDetails = (detailsData as any)?.data || detailsData || {};
  const profile: any = { ...rawUser, ...rawDetails };

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Organizer";
  const initials = `${(profile.firstName || "O")[0]}${(profile.lastName || "")[0] || ""}`.toUpperCase();
  const profilePicture = profile.profileImageUrl || profile.profile_picture || profile.profilePicture || "";
  const isVerified = profile.emailVerified ?? profile.isVerified;
  const joinedDate = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A";

  // ---------------------------------------------------------------------------
  // MUTATION HOOKS (RTK QUERY)
  // ---------------------------------------------------------------------------
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [updateUserProfileImage, { isLoading: isUpdatingImage }] = useUpdateUserProfileImageMutation();

  // ---------------------------------------------------------------------------
  // COMPONENT UI STATES & MODAL CONTROLS
  // ---------------------------------------------------------------------------
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [profileFormData, setProfileFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactPhone: "",
    address: "",
    city: "",
    country: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const closeZoom = () => {
    setIsZoomOpen(false);
    setIsZoomed(false);
  };

  // Close the photo viewer with the Escape key
  useEffect(() => {
    if (!isZoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsZoomOpen(false);
        setIsZoomed(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZoomOpen]);

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS & API ACTIONS
  // ---------------------------------------------------------------------------
  const openEditModal = () => {
    setProfileFormData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: profile.email || "",
      contactPhone: profile.contactPhone || "",
      address: profile.address || "",
      city: profile.city || "",
      country: profile.country || "",
    });
    setErrorMessage("");
    setIsEditModalOpen(true);
  };

  const openImageModal = () => {
    setSelectedImage(null);
    setImagePreview("");
    setUploadProgress(0);
    setErrorMessage("");
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview("");
    setUploadProgress(0);
    setIsImageModalOpen(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file (PNG, JPG or WEBP).");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("The image exceeds the 10MB limit.");
      e.target.value = "";
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  // Detects the user's location with the browser's GPS/Wi-Fi location, then
  // converts the coordinates into a city and country using OpenStreetMap.
  const handleDetectLocation = () => {
    setErrorMessage("");

    if (!navigator.geolocation) {
      setErrorMessage("Your browser doesn't support location detection. Please enter it manually.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: {
              lat: coords.latitude,
              lon: coords.longitude,
              format: "jsonv2",
              "accept-language": "en",
            },
          });

          const address = response.data?.address || {};
          const detectedCity =
            address.city || address.town || address.village || address.suburb || address.county || address.state || "";
          const detectedCountry = address.country || "";

          if (!detectedCity && !detectedCountry) {
            setErrorMessage("We couldn't work out your location. Please enter it manually.");
            return;
          }

          setProfileFormData((prev) => ({
            ...prev,
            city: detectedCity || prev.city,
            country: detectedCountry || prev.country,
          }));
        } catch {
          setErrorMessage("We couldn't look up your location. Please enter it manually.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        setErrorMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow it in your browser settings or enter it manually."
            : "We couldn't get your location. Please enter it manually."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalId) return;
    setErrorMessage("");
    try {
      await updateUser({
        digitalId,
        ...profileFormData,
      }).unwrap();

      setSuccessMessage("Profile updated successfully!");
      setIsEditModalOpen(false);
      refetchUser();
      refetchDetails();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to update profile.");
    }
  };

  const handleUpdateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalId || !selectedImage) return;
    setErrorMessage("");
    setIsUploading(true);
    setUploadProgress(0);

    // 1. Upload the file to Cloudinary and get its secure URL back
    let uploadedUrl = "";
    try {
      const cloudFormData = new FormData();
      cloudFormData.append("file", selectedImage);
      cloudFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        cloudFormData,
        {
          onUploadProgress: (progressEvent) => {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1)));
          },
        }
      );
      uploadedUrl = response.data.secure_url as string;
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error?.message || "Failed to upload the image. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    // 2. Save the Cloudinary URL to the user's profile
    try {
      await updateUserProfileImage({
        digitalId,
        profile_picture: uploadedUrl,
      }).unwrap();

      setSuccessMessage("Profile picture updated successfully!");
      closeImageModal();
      refetchUser();
      refetchDetails();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Uploaded to Cloudinary but failed to save to your profile.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">

      {/* =================================================================== */}
      {/* HEADER BAR                                                          */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="btn btn-ghost btn-xs btn-square rounded-xl" title="Go Back">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <User size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Organizer Profile</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Active</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Managing profile for: <span className="font-bold text-base-content">{fullName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={openEditModal}
            disabled={userLoading}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm shrink-0 w-full sm:w-auto"
          >
            <Edit size={14} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* IN-DASHBOARD GUIDE / EXPLANATION BANNER                             */}
      {/* =================================================================== */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">Profile Guide & Features</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                This module lets organizers view and manage their account details. Update your name, contact
                information and location, or change your profile picture. Attendees and your team will see these
                details across the platform, so keep them current.
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

      {/* Global Success / Error Notification Banners */}
      {successMessage && (
        <div className="alert alert-success text-xs font-semibold py-2 rounded-xl shadow-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && !isEditModalOpen && !isImageModalOpen && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* PROFILE CONTENT                                                     */}
      {/* =================================================================== */}
      {userLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : !digitalId || !profile || Object.keys(profile).length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <User size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">Profile Not Found</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5">
            We couldn't load your profile. Sign in again and retry.
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-base-content/60 font-semibold">Digital ID</span>
                <span className="text-base sm:text-lg font-black text-base-content">{profile.digitalId || digitalId}</span>
              </div>
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Fingerprint size={18} />
              </div>
            </div>

            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-base-content/60 font-semibold">Account Role</span>
                <span className="text-base sm:text-lg font-black text-base-content capitalize">{profile.role || "organizer"}</span>
              </div>
              <div className="p-2.5 bg-success/10 text-success rounded-xl">
                <ShieldCheck size={18} />
              </div>
            </div>

            <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-base-content/60 font-semibold">Member Since</span>
                <span className="text-base sm:text-lg font-black text-base-content">{joinedDate}</span>
              </div>
              <div className="p-2.5 bg-warning/10 text-warning rounded-xl">
                <CalendarDays size={18} />
              </div>
            </div>
          </div>

          {/* PROFILE CARD */}
          <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 p-4 sm:p-5 border-b border-base-200">
              <div className="relative shrink-0">
                {profilePicture ? (
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="group relative block rounded-3xl cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Click to zoom"
                    aria-label="View profile picture"
                  >
                    <img
                      src={profilePicture}
                      alt={fullName}
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-2 border-base-200 shadow-md"
                    />
                    <span className="absolute inset-0 rounded-3xl bg-black/35 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={22} />
                    </span>
                  </button>
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-3xl sm:text-4xl font-black border-2 border-base-200 shadow-md">
                    {initials}
                  </div>
                )}
                <button
                  onClick={openImageModal}
                  className="btn btn-primary btn-sm btn-square rounded-xl absolute -bottom-2 -right-2 shadow-md"
                  title="Change Profile Picture"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="flex flex-col items-center sm:items-start gap-1 min-w-0">
                <h2 className="text-base sm:text-lg font-black text-base-content tracking-tight break-words">{fullName}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="badge badge-primary badge-sm font-bold capitalize">{profile.role || "organizer"}</span>
                  {isVerified !== undefined && (
                    <span className={`badge badge-sm font-bold ${isVerified ? "badge-success text-success-content" : "badge-warning text-warning-content"}`}>
                      {isVerified ? "Verified" : "Unverified"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-base-200">
              <div className="bg-base-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Mail size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold">Email Address</span>
                  <span className="text-xs font-bold text-base-content truncate">{profile.email || "Not set"}</span>
                </div>
              </div>

              <div className="bg-base-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Phone size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold">Contact Phone</span>
                  <span className="text-xs font-bold text-base-content truncate">{profile.contactPhone || "Not set"}</span>
                </div>
              </div>

              <div className="bg-base-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Building2 size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold">City</span>
                  <span className="text-xs font-bold text-base-content truncate">{profile.city || "Not set"}</span>
                </div>
              </div>

              <div className="bg-base-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold">Country</span>
                  <span className="text-xs font-bold text-base-content truncate">{profile.country || "Not set"}</span>
                </div>
              </div>

              <div className="bg-base-100 p-4 flex items-center gap-3 sm:col-span-2">
                <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                  <Home size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-base-content/60 font-semibold">Address</span>
                  <span className="text-xs font-bold text-base-content">{profile.address || "Not set"}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* MODALS SECTION                                                      */}
      {/* =================================================================== */}

      {/* 1. Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Edit Profile</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              {errorMessage && (
                <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">First Name</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.firstName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, firstName: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Last Name</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.lastName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, lastName: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +254712345678"
                    value={profileFormData.contactPhone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, contactPhone: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Kimathi Street, CBD"
                    value={profileFormData.address}
                    onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg gap-1 text-[11px] self-start"
                >
                  {isLocating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <LocateFixed size={12} />
                  )}
                  <span>{isLocating ? "Detecting location..." : "Use my current location"}</span>
                </button>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Nairobi"
                      value={profileFormData.city}
                      onChange={(e) => setProfileFormData({ ...profileFormData, city: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. Kenya"
                      value={profileFormData.country}
                      onChange={(e) => setProfileFormData({ ...profileFormData, country: e.target.value })}
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

      {/* 2. Profile Picture Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Profile Picture</h3>
                </div>
                <button onClick={closeImageModal} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              {errorMessage && (
                <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateImage} className="flex flex-col gap-3 text-xs">
                <div className="flex justify-center">
                  {imagePreview || profilePicture ? (
                    <img
                      src={imagePreview || profilePicture}
                      alt="Preview"
                      className="w-36 h-36 rounded-3xl object-cover border-2 border-base-200 shadow-md"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-4xl font-black border-2 border-base-200 shadow-md">
                      {initials}
                    </div>
                  )}
                </div>

                <label className="relative border-2 border-dashed border-base-300 hover:border-primary/60 transition-colors rounded-2xl p-5 text-center cursor-pointer bg-base-200/20 block">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageFileChange}
                    disabled={isUploading || isUpdatingImage}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1 pointer-events-none">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl mb-1">
                      <UploadCloud size={20} />
                    </div>
                    <p className="text-xs font-bold text-base-content">
                      {selectedImage ? selectedImage.name : "Click to browse or drag and drop"}
                    </p>
                    <p className="text-[11px] text-base-content/60">PNG, JPG or WEBP · up to 10MB</p>
                  </div>
                </label>

                {isUploading && (
                  <div className="flex flex-col gap-1">
                    <progress className="progress progress-primary w-full h-1.5" value={uploadProgress} max={100}></progress>
                    <p className="text-center text-[11px] font-bold text-primary">{uploadProgress}% uploaded</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button type="button" onClick={closeImageModal} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedImage || isUploading || isUpdatingImage}
                    className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold"
                  >
                    {isUploading || isUpdatingImage ? <span className="loading loading-spinner loading-xs"></span> : "Upload & Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Profile Picture Zoom Viewer */}
      <AnimatePresence>
        {isZoomOpen && profilePicture && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs"
            onClick={closeZoom}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 text-white">
                <p className="text-xs font-bold truncate">{fullName}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsZoomed((z) => !z)}
                    className="btn btn-ghost btn-xs btn-square rounded-lg text-white"
                    title={isZoomed ? "Zoom out" : "Zoom in"}
                  >
                    {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={closeZoom}
                    className="btn btn-ghost btn-xs btn-square rounded-lg text-white"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[80vh] rounded-2xl bg-black/40">
                <img
                  src={profilePicture}
                  alt={fullName}
                  onClick={() => setIsZoomed((z) => !z)}
                  className={`mx-auto transition-all duration-200 ${
                    isZoomed
                      ? "w-[200%] max-w-none h-auto cursor-zoom-out"
                      : "max-h-[78vh] max-w-full object-contain cursor-zoom-in"
                  }`}
                />
              </div>
              <p className="text-center text-[11px] text-white/60">
                {isZoomed ? "Scroll to look around · click to zoom out" : "Click the photo to zoom in"}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OrganizerProfileManager;