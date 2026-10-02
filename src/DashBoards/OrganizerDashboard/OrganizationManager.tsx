import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import {
  Building2,
  Plus,
  Edit,
  DollarSign,
  Users,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Percent,
  Search,
  Check,
  CalendarDays,
} from "lucide-react";

import { type RootState } from "../../App/store";

import {
  useGetUserOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useUpdatePayoutConfigMutation,
  useGetOrganizationMembersQuery,
  useAddOrganizationMemberMutation,
  useRemoveOrganizationMemberMutation,
  type Organization,
  type OrgMember,
  type OrgRole,
  type CreateOrganizationRequest,
} from "../../features/APIS/organizationApi";

import { useSearchUsersByLastNameQuery } from "../../features/APIS/UserApi";

import { usePageTitle } from "../../hooks/usePageTitle";

// ======================================================
// CLOUDINARY CONFIG (unsigned upload preset)
// ======================================================

const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";
const MAX_LOGO_SIZE_MB = 5;

// ======================================================
// LOCAL TYPES
// ======================================================

interface OrgFormData {
  name: string;
  slug: string;
  supportEmail: string;
  supportPhone: string;
  logoUrl: string;
  payoutPhone: string;
  payoutType: CreateOrganizationRequest["payoutType"];
}

interface PayoutFormData {
  payoutPhone: string;
  payoutType: NonNullable<CreateOrganizationRequest["payoutType"]>;
}

interface NewMemberFormData {
  digitalId: string;
  orgRole: OrgRole;
}

// ======================================================
// DEFAULTS
// ======================================================

const EMPTY_ORG_FORM: OrgFormData = {
  name: "",
  slug: "",
  supportEmail: "",
  supportPhone: "",
  logoUrl: "",
  payoutPhone: "",
  payoutType: "mpesa_phone",
};

const EMPTY_MEMBER_FORM: NewMemberFormData = {
  digitalId: "",
  orgRole: "scanner",
};

// ======================================================
// LABELS
// ======================================================

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  scanner: "Gate Scanner",
};

const PAYOUT_LABELS: Record<string, string> = {
  mpesa_phone: "M-Pesa Phone",
  paybill: "Paybill",
  bank: "Bank",
};

// ======================================================
// STYLES
// ======================================================

const inputClass = "input input-bordered input-sm rounded-xl w-full text-xs";
const selectClass = "select select-bordered select-sm rounded-xl w-full text-xs";
const labelClass = "font-bold text-base-content/70";

// ======================================================
// RESPONSE HELPERS
// ======================================================

const toArray = <T,>(payload: unknown, key?: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (
    key &&
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as Record<string, unknown>)[key])
  ) {
    return (payload as Record<string, unknown>)[key] as T[];
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as Record<string, unknown>).data)
  ) {
    return (payload as Record<string, unknown>).data as T[];
  }

  return [];
};

/** The org endpoint may return the organization directly or wrapped in { data } */
const unwrapOrg = (payload: unknown): Organization | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const maybe = (payload as Record<string, any>).data;
  return (maybe && typeof maybe === "object" && !Array.isArray(maybe) ? maybe : payload) as Organization;
};

const getErrorMessage = (err: any, fallback: string): string => {
  if (err?.data?.message) return err.data.message;
  if (err?.data?.error) return err.data.error;
  if (err?.status === 400) return err?.data?.message || "Invalid request.";
  if (err?.status === 401) return "Your session has expired. Please log in again.";
  if (err?.status === 403) return "You don't have permission to do that.";
  if (err?.status === 404) return "The requested organization or member was not found.";
  if (err?.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (err?.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection or API URL.";
  return fallback;
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

// ======================================================
// LOGO (image or fallback icon)
// ======================================================

const OrgLogo = ({
  url,
  name,
  size = "w-16 h-16",
  iconSize = 28,
}: {
  url?: string | null;
  name?: string;
  size?: string;
  iconSize?: number;
}) => (
  <div
    className={`${size} rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 border border-base-300 overflow-hidden`}
  >
    {url ? (
      <img src={url} alt={name ? `${name} logo` : "Organization logo"} className="w-full h-full object-cover" />
    ) : (
      <Building2 size={iconSize} />
    )}
  </div>
);

// ======================================================
// LOGO UPLOADER (uploads to Cloudinary, returns secure URL)
// ======================================================

interface LogoUploaderProps {
  value: string;
  name?: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

const LogoUploader = ({ value, name, onChange, onUploadingChange }: LogoUploaderProps) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_LOGO_SIZE_MB}MB.`);
      return;
    }

    const cloudFormData = new FormData();
    cloudFormData.append("file", file);
    cloudFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      setUploading(true);
      onUploadingChange(true);
      setProgress(0);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        cloudFormData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setProgress(percent);
          },
        }
      );

      onChange(response.data.secure_url);
    } catch {
      setError("Logo upload failed. Please try again.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Organization Logo</label>

      <div className="flex items-center gap-3">
        <OrgLogo url={value} name={name} size="w-16 h-16" />

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`btn btn-sm btn-outline rounded-xl text-xs font-bold gap-2 ${
                uploading ? "btn-disabled" : ""
              }`}
            >
              <UploadCloud size={14} />
              {value ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>

            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="btn btn-ghost btn-sm rounded-xl text-xs font-bold text-error hover:bg-error/10"
              >
                Remove
              </button>
            )}
          </div>

          <span className="text-[11px] text-base-content/50">PNG, JPG or WEBP, up to {MAX_LOGO_SIZE_MB}MB</span>
        </div>
      </div>

      {uploading && (
        <div className="flex flex-col gap-1">
          <progress className="progress progress-primary w-full h-1.5" value={progress} max={100}></progress>
          <span className="text-[11px] font-bold text-primary">{progress}% uploaded</span>
        </div>
      )}

      {error && <span className="text-[11px] font-semibold text-error">{error}</span>}
    </div>
  );
};

// ======================================================
// ORGANIZATION TAB (loads the name for each org id)
// ======================================================

const OrgTab = ({ orgId, active, onSelect }: { orgId: number; active: boolean; onSelect: () => void }) => {
  const { data } = useGetOrganizationByIdQuery(orgId);
  const org = unwrapOrg(data);

  return (
    <button
      onClick={onSelect}
      className={`btn btn-sm rounded-xl text-xs font-bold transition-all gap-2 ${
        active ? "btn-primary shadow-sm" : "btn-ghost bg-base-200/60 text-base-content/70 hover:bg-base-200"
      }`}
    >
      {org?.logoUrl ? (
        <img src={org.logoUrl} alt="" className="w-5 h-5 rounded-md object-cover" />
      ) : (
        <Building2 size={14} />
      )}
      {org?.name || "Loading..."}
    </button>
  );
};

// ======================================================
// DETAIL ROW
// ======================================================

const DetailRow = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="flex items-start gap-2 text-base-content/70">
    <span className="text-primary shrink-0 mt-0.5">{icon}</span>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">{label}</span>
      <span className="font-semibold text-base-content break-words">{value || "—"}</span>
    </div>
  </div>
);

// ======================================================
// USER PICKER (search users by last name, pick from the list)
// ======================================================

interface PickedUser {
  digitalId: number;
  name: string;
  email?: string;
  picture?: string;
}

const normalizeUser = (u: any): PickedUser | null => {
  const digitalId = Number(u?.digitalId ?? u?.id);
  if (!digitalId) return null;

  const name =
    [u?.firstName ?? u?.first_name, u?.lastName ?? u?.last_name].filter(Boolean).join(" ") ||
    u?.name ||
    u?.email ||
    `User #${digitalId}`;

  return {
    digitalId,
    name,
    email: u?.email,
    picture: u?.profile_picture ?? u?.profilePicture,
  };
};

const UserAvatar = ({ user }: { user: PickedUser }) => (
  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
    {user.picture ? (
      <img src={user.picture} alt="" className="w-full h-full object-cover" />
    ) : (
      user.name.trim().charAt(0).toUpperCase()
    )}
  </div>
);

interface UserPickerProps {
  value: PickedUser | null;
  onChange: (user: PickedUser | null) => void;
  existingDigitalIds: number[];
}

const UserPicker = ({ value, onChange, existingDigitalIds }: UserPickerProps) => {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  // Wait until the person stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 400);
    return () => clearTimeout(t);
  }, [term]);

  const canSearch = debounced.length >= 2;

  const { data, isFetching, isError } = useSearchUsersByLastNameQuery(debounced, { skip: !canSearch });

  const results = toArray<any>(data, "users")
    .map(normalizeUser)
    .filter((u): u is PickedUser => u !== null)
    .slice(0, 8);

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Team member</label>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
          <UserAvatar user={value} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-base-content truncate">{value.name}</span>
            {value.email && <span className="text-[11px] text-base-content/60 truncate">{value.email}</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTerm("");
              setDebounced("");
            }}
            className="btn btn-ghost btn-xs rounded-lg text-xs font-bold"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Find a user</label>

      <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 w-full text-xs">
        <Search size={14} className="text-base-content/40 shrink-0" />
        <input
          type="text"
          autoFocus
          placeholder="Search by last name"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="grow"
        />
        {isFetching && <span className="loading loading-spinner loading-xs text-primary" />}
      </label>

      {term.trim().length > 0 && term.trim().length < 2 && (
        <span className="text-[11px] text-base-content/50">Type at least 2 letters.</span>
      )}

      {canSearch && !isFetching && (
        <div className="rounded-2xl border border-base-200 bg-base-100 overflow-hidden max-h-56 overflow-y-auto">
          {isError ? (
            <p className="p-3 text-[11px] text-error font-semibold">
              Search failed. You may not have permission to search users.
            </p>
          ) : results.length === 0 ? (
            <p className="p-3 text-[11px] text-base-content/60">No users found with the last name "{debounced}".</p>
          ) : (
            results.map((u) => {
              const alreadyMember = existingDigitalIds.includes(u.digitalId);
              return (
                <button
                  key={u.digitalId}
                  type="button"
                  disabled={alreadyMember}
                  onClick={() => onChange(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-base-200/60 disabled:opacity-50 disabled:hover:bg-transparent border-b border-base-200/60 last:border-b-0 transition-colors"
                >
                  <UserAvatar user={u} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-base-content truncate">{u.name}</span>
                    {u.email && <span className="text-[11px] text-base-content/60 truncate">{u.email}</span>}
                  </div>
                  {alreadyMember && (
                    <span className="badge badge-sm badge-ghost gap-1 text-[10px] font-bold">
                      <Check size={10} /> In team
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ======================================================
// MODAL SHELL
// ======================================================

interface ModalShellProps {
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: ReactNode;
}

const ModalShell = ({ title, onClose, maxWidth = "max-w-lg", children }: ModalShellProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-base-100 border border-base-200 w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-3xl p-6 shadow-2xl flex flex-col gap-6`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-4">
        <h3 className="font-black text-sm uppercase tracking-wider text-primary">{title}</h3>

        <button onClick={onClose} className="btn btn-ghost btn-sm btn-square rounded-xl" type="button">
          <X size={18} />
        </button>
      </div>

      {children}
    </motion.div>
  </div>
);

// ======================================================
// MODAL ACTIONS
// ======================================================

const ModalActions = ({
  onCancel,
  isLoading,
  submitLabel,
}: {
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
}) => (
  <div className="flex justify-end gap-2 pt-4 border-t border-base-200">
    <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm rounded-xl text-xs font-bold">
      Cancel
    </button>

    <button type="submit" disabled={isLoading} className="btn btn-primary btn-sm rounded-xl text-xs font-bold">
      {isLoading ? <span className="loading loading-spinner loading-xs" /> : submitLabel}
    </button>
  </div>
);

// ======================================================
// COMPONENT
// ======================================================

export const OrganizationManager = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const digitalId = Number(user?.digitalId || user?.id) || undefined;

  // ====================================================
  // ORGANIZATIONS
  // ====================================================

  const { data: userOrgs, isLoading: orgsLoading } = useGetUserOrganizationsQuery(digitalId ?? skipToken);

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // getUserOrganizations returns OrgMember[] (each has orgId)
  const orgs = toArray<OrgMember>(userOrgs);

  const membershipOrgIds = Array.from(new Set(orgs.map((member) => Number(member.orgId)).filter(Boolean)));

  // Include a just-created organization even if the membership list has not refreshed yet
  const organizationIds =
    selectedOrgId && !membershipOrgIds.includes(selectedOrgId) ? [...membershipOrgIds, selectedOrgId] : membershipOrgIds;

  const activeOrgId = selectedOrgId ?? organizationIds[0] ?? undefined;

  const currentMembership = orgs.find((member) => Number(member.orgId) === activeOrgId);

  // ====================================================
  // ACTIVE ORGANIZATION DETAILS
  // ====================================================

  const { data: orgData, isLoading: orgDetailsLoading } = useGetOrganizationByIdQuery(activeOrgId ?? skipToken);

  const org = unwrapOrg(orgData);

  usePageTitle(org?.name ? `${org.name} · Organization Management` : "Organization Management");

  // ====================================================
  // MEMBERS
  // ====================================================

  const { data: membersData, isLoading: membersLoading } = useGetOrganizationMembersQuery(activeOrgId ?? skipToken);

  const members = toArray<OrgMember>(membersData, "members");

  // ====================================================
  // MUTATIONS
  // ====================================================

  const [createOrganization, { isLoading: isCreating }] = useCreateOrganizationMutation();
  const [updateOrganization, { isLoading: isUpdating }] = useUpdateOrganizationMutation();
  const [updatePayoutConfig, { isLoading: isUpdatingPayout }] = useUpdatePayoutConfigMutation();
  const [addOrganizationMember, { isLoading: isAddingMember }] = useAddOrganizationMemberMutation();
  const [removeOrganizationMember] = useRemoveOrganizationMemberMutation();

  // ====================================================
  // MODAL STATES
  // ====================================================

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);
  const [memberFormError, setMemberFormError] = useState("");

  // ====================================================
  // FORM STATES
  // ====================================================

  const [formData, setFormData] = useState<OrgFormData>(EMPTY_ORG_FORM);

  const [payoutData, setPayoutData] = useState<PayoutFormData>({
    payoutPhone: "",
    payoutType: "mpesa_phone",
  });

  const [newMemberData, setNewMemberData] = useState<NewMemberFormData>(EMPTY_MEMBER_FORM);

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  const showSuccess = (msg: string) => {
    setErrorMessage("");
    setSuccessMessage(msg);

    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  const showError = (err: any, fallback: string) => {
    setSuccessMessage("");
    setErrorMessage(getErrorMessage(err, fallback));
  };

  // ====================================================
  // CREATE ORGANIZATION
  // ====================================================

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();

    setErrorMessage("");

    try {
      const created = await createOrganization({
        name: formData.name,
        slug: formData.slug,
        supportEmail: formData.supportEmail || null,
        supportPhone: formData.supportPhone || null,
        logoUrl: formData.logoUrl || null,
        payoutPhone: formData.payoutPhone || null,
        payoutType: formData.payoutType,
      }).unwrap();

      // API Organization uses `id`
      if (created?.id) {
        setSelectedOrgId(created.id);
      }

      showSuccess("Organization created successfully!");

      setIsCreateModalOpen(false);
      setFormData(EMPTY_ORG_FORM);
    } catch (err) {
      showError(err, "Failed to create organization.");
    }
  };

  // ====================================================
  // UPDATE ORGANIZATION
  // ====================================================

  const handleUpdateOrg = async (e: FormEvent) => {
    e.preventDefault();

    if (!activeOrgId) return;

    setErrorMessage("");

    try {
      await updateOrganization({
        orgId: activeOrgId,
        data: {
          name: formData.name,
          supportEmail: formData.supportEmail || null,
          supportPhone: formData.supportPhone || null,
          logoUrl: formData.logoUrl || null,
        },
      }).unwrap();

      showSuccess("Organization updated successfully!");

      setIsEditModalOpen(false);
    } catch (err) {
      showError(err, "Failed to update organization.");
    }
  };

  // ====================================================
  // UPDATE PAYOUT
  // ====================================================

  const handleUpdatePayout = async (e: FormEvent) => {
    e.preventDefault();

    if (!activeOrgId) return;

    setErrorMessage("");

    try {
      await updatePayoutConfig({
        orgId: activeOrgId,
        data: {
          payoutPhone: payoutData.payoutPhone,
          payoutType: payoutData.payoutType,
        },
      }).unwrap();

      showSuccess("Payout settings updated successfully!");

      setIsPayoutModalOpen(false);
    } catch (err) {
      showError(err, "Failed to update payout configuration.");
    }
  };

  // ====================================================
  // ADD MEMBER
  // ====================================================

  const handleAddMemberSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!activeOrgId) return;

    if (!selectedUser) {
      setMemberFormError("Please search for a user and select them from the list.");
      return;
    }

    const parsedDigitalId = selectedUser.digitalId;

    setMemberFormError("");

    try {
      await addOrganizationMember({
        orgId: activeOrgId,
        digitalId: parsedDigitalId,
        orgRole: newMemberData.orgRole,
      }).unwrap();

      showSuccess(`${selectedUser.name} was added to the team.`);

      setIsMemberModalOpen(false);
      setNewMemberData(EMPTY_MEMBER_FORM);
      setSelectedUser(null);
    } catch (err) {
      setMemberFormError(getErrorMessage(err, "Failed to add member."));
    }
  };

  // ====================================================
  // REMOVE MEMBER
  // ====================================================

  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setErrorMessage("");

    try {
      await removeOrganizationMember(memberId).unwrap();

      showSuccess("Member removed successfully.");
    } catch (err) {
      showError(err, "Failed to remove member.");
    }
  };

  // ====================================================
  // OPEN MODALS
  // ====================================================

  const openCreateModal = () => {
    setFormData(EMPTY_ORG_FORM);
    setIsCreateModalOpen(true);
  };

  const openEditModal = () => {
    if (!org) return;

    setFormData({
      name: org.name || "",
      slug: org.slug || "",
      supportEmail: org.supportEmail || "",
      supportPhone: org.supportPhone || "",
      logoUrl: org.logoUrl || "",
      payoutPhone: org.payoutPhone || "",
      payoutType: org.payoutType || "mpesa_phone",
    });

    setIsEditModalOpen(true);
  };

  const openMemberModal = () => {
    setSelectedUser(null);
    setMemberFormError("");
    setNewMemberData(EMPTY_MEMBER_FORM);
    setIsMemberModalOpen(true);
  };

  const openPayoutModal = () => {
    setPayoutData({
      payoutPhone: org?.payoutPhone || "",
      payoutType: org?.payoutType || "mpesa_phone",
    });

    setIsPayoutModalOpen(true);
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* ================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200/50 p-6 rounded-3xl border border-base-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-base-content">Organization Management</h1>

          <p className="text-xs text-base-content/60 mt-1">
            Manage your corporate entity, payment payouts, and operational team members.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm"
        >
          <Plus size={16} />
          <span>Create Organization</span>
        </button>
      </div>

      {/* ================================================
          NOTIFICATIONS
      ================================================= */}

      {successMessage && (
        <div className="alert alert-success text-xs font-bold rounded-2xl shadow-sm">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error text-xs font-bold rounded-2xl shadow-sm">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ================================================
          LOADING
      ================================================= */}

      {orgsLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : organizationIds.length === 0 ? (
        <div className="text-center py-16 bg-base-200/30 rounded-3xl border border-dashed border-base-300 p-8">
          <Building2 size={48} className="mx-auto text-primary/40 mb-3" />

          <h3 className="font-bold text-sm text-base-content">No Organizations Found</h3>

          <p className="text-xs text-base-content/60 mt-1 mb-4">
            You haven't created or joined any organizations yet.
          </p>

          <button onClick={openCreateModal} className="btn btn-primary btn-sm rounded-xl text-xs font-bold">
            Create Your First Organization
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* ============================================
              ORGANIZATION SELECTOR
          ============================================= */}

          {organizationIds.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {organizationIds.map((id) => (
                <OrgTab key={id} orgId={id} active={activeOrgId === id} onSelect={() => setSelectedOrgId(id)} />
              ))}
            </div>
          )}

          {/* ============================================
              ACTIVE ORGANIZATION
          ============================================= */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MAIN INFO */}

            <div className="lg:col-span-2 bg-base-200/40 border border-base-200 p-6 rounded-3xl flex flex-col justify-between gap-6">
              {orgDetailsLoading ? (
                <div className="flex justify-center py-10">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <OrgLogo url={org?.logoUrl} name={org?.name} />

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black tracking-tight text-base-content break-words">
                          {org?.name || "Organization"}
                        </h2>

                        {org?.isVerified && (
                          <span className="badge badge-sm badge-success gap-1 font-bold text-success-content">
                            <ShieldCheck size={11} />
                            Verified
                          </span>
                        )}

                        {org && (
                          <span
                            className={`badge badge-sm font-bold ${
                              org.isActive ? "badge-outline badge-success" : "badge-error text-error-content"
                            }`}
                          >
                            {org.isActive ? "Active" : "Suspended"}
                          </span>
                        )}
                      </div>

                      {org?.slug && <span className="text-xs text-base-content/50">@{org.slug}</span>}

                      {currentMembership && (
                        <span className="text-xs text-primary font-semibold">
                          Your role: {ROLE_LABELS[currentMembership.orgRole] ?? currentMembership.orgRole}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-base-200 text-xs">
                    <DetailRow icon={<Mail size={16} />} label="Support email" value={org?.supportEmail} />
                    <DetailRow icon={<Phone size={16} />} label="Support phone" value={org?.supportPhone} />
                    <DetailRow icon={<Globe size={16} />} label="Page link" value={org?.slug ? `/${org.slug}` : ""} />
                    <DetailRow
                      icon={<CalendarDays size={16} />}
                      label="Created"
                      value={formatDate(org?.createdAt)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={openEditModal}
                      disabled={!org}
                      className="btn btn-sm btn-outline rounded-xl text-xs font-bold gap-2"
                    >
                      <Edit size={14} />
                      Edit Profile
                    </button>

                    <button
                      onClick={openPayoutModal}
                      className="btn btn-sm btn-ghost bg-base-200 hover:bg-base-300 rounded-xl text-xs font-bold gap-2"
                    >
                      <DollarSign size={14} className="text-primary" />
                      Payout Settings
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* PAYOUT WIDGET */}

            <div className="bg-base-200/40 border border-base-200 p-6 rounded-3xl flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                  Payout Configuration
                </span>

                <DollarSign size={18} className="text-primary" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-base-content/60">Payout method</span>

                <span className="text-sm font-black text-base-content">
                  {org?.payoutType ? PAYOUT_LABELS[org.payoutType] ?? org.payoutType : "Not set"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-base-content/60">Payout phone / account</span>

                <span className="text-sm font-black text-base-content break-all">{org?.payoutPhone || "Not set"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-base-content/60 flex items-center gap-1">
                  <Percent size={12} /> Platform commission
                </span>

                <span className="text-sm font-black text-primary">
                  {org?.commissionPercentage !== undefined && org?.commissionPercentage !== null
                    ? `${org.commissionPercentage}%`
                    : "—"}
                </span>
              </div>

              <button
                onClick={openPayoutModal}
                className="w-full btn btn-sm btn-primary rounded-xl text-xs font-bold mt-2"
              >
                Update Payout Info
              </button>
            </div>
          </div>

          {/* ============================================
              MEMBERS
          ============================================= */}

          <div className="bg-base-200/40 border border-base-200 p-6 rounded-3xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-black tracking-tight text-base-content flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  Organization Team & Staff
                </h3>

                <p className="text-xs text-base-content/60 mt-0.5">
                  Manage permissions and roles for scanners and organization managers.
                </p>
              </div>

              <button
                onClick={openMemberModal}
                className="btn btn-sm btn-primary rounded-xl text-xs font-bold gap-2"
              >
                <Plus size={15} />
                Add Team Member
              </button>
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-10 bg-base-100/50 rounded-2xl border border-dashed border-base-300 p-6">
                <p className="text-xs text-base-content/60">
                  No additional staff members mapped to this organization yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="border-b border-base-300 text-base-content/50 uppercase tracking-widest text-[10px]">
                      <th>Member ID</th>
                      <th>Digital ID</th>
                      <th>Role</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-base-200/50 hover:bg-base-200/50 transition-colors"
                      >
                        <td className="font-bold">#{member.id}</td>

                        <td className="font-bold">#{member.digitalId}</td>

                        <td>
                          <span className="badge badge-sm badge-outline font-bold uppercase text-[10px] text-primary border-primary/40">
                            {ROLE_LABELS[member.orgRole] ?? member.orgRole}
                          </span>
                        </td>

                        <td className="text-right">
                          {member.orgRole !== "owner" && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                              title="Remove Member"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          CREATE ORGANIZATION MODAL
      ================================================= */}

      <AnimatePresence>
        {isCreateModalOpen && (
          <ModalShell title="Create New Organization" onClose={() => setIsCreateModalOpen(false)}>
            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4 text-xs">
              <LogoUploader
                value={formData.logoUrl}
                name={formData.name}
                onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                onUploadingChange={setIsUploadingLogo}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Organization Name</label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Tech Fest Kenya"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>URL Slug</label>

                <input
                  type="text"
                  required
                  placeholder="e.g. tech-fest-2026"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Email</label>

                  <input
                    type="email"
                    placeholder="support@domain.co.ke"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Phone</label>

                  <input
                    type="text"
                    placeholder="+254712345678"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Payout Phone / Account</label>

                  <input
                    type="text"
                    placeholder="+254712345678"
                    value={formData.payoutPhone}
                    onChange={(e) => setFormData({ ...formData, payoutPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Payout Type</label>

                  <select
                    value={formData.payoutType ?? "mpesa_phone"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payoutType: e.target.value as OrgFormData["payoutType"],
                      })
                    }
                    className={selectClass}
                  >
                    <option value="mpesa_phone">M-Pesa Phone</option>
                    <option value="paybill">Paybill</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
              </div>

              <ModalActions
                onCancel={() => setIsCreateModalOpen(false)}
                isLoading={isCreating || isUploadingLogo}
                submitLabel="Save Organization"
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================================================
          EDIT ORGANIZATION MODAL
      ================================================= */}

      <AnimatePresence>
        {isEditModalOpen && (
          <ModalShell title="Edit Organization Profile" onClose={() => setIsEditModalOpen(false)}>
            <form onSubmit={handleUpdateOrg} className="flex flex-col gap-4 text-xs">
              <LogoUploader
                value={formData.logoUrl}
                name={formData.name}
                onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                onUploadingChange={setIsUploadingLogo}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Organization Name</label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Email</label>

                  <input
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Phone</label>

                  <input
                    type="text"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <ModalActions
                onCancel={() => setIsEditModalOpen(false)}
                isLoading={isUpdating || isUploadingLogo}
                submitLabel="Save Changes"
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================================================
          PAYOUT MODAL
      ================================================= */}

      <AnimatePresence>
        {isPayoutModalOpen && (
          <ModalShell
            title="Update Payout Configuration"
            maxWidth="max-w-md"
            onClose={() => setIsPayoutModalOpen(false)}
          >
            <form onSubmit={handleUpdatePayout} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Payout Phone / Account Number</label>

                <input
                  type="text"
                  required
                  placeholder="+254712345678"
                  value={payoutData.payoutPhone}
                  onChange={(e) => setPayoutData({ ...payoutData, payoutPhone: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Payout Type</label>

                <select
                  value={payoutData.payoutType}
                  onChange={(e) =>
                    setPayoutData({
                      ...payoutData,
                      payoutType: e.target.value as PayoutFormData["payoutType"],
                    })
                  }
                  className={selectClass}
                >
                  <option value="mpesa_phone">M-Pesa Phone</option>
                  <option value="paybill">Paybill</option>
                  <option value="bank">Bank</option>
                </select>
              </div>

              <ModalActions
                onCancel={() => setIsPayoutModalOpen(false)}
                isLoading={isUpdatingPayout}
                submitLabel="Save Payout"
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================================================
          ADD MEMBER MODAL
      ================================================= */}

      <AnimatePresence>
        {isMemberModalOpen && (
          <ModalShell title="Add Team Member" maxWidth="max-w-md" onClose={() => setIsMemberModalOpen(false)}>
            <form onSubmit={handleAddMemberSubmit} className="flex flex-col gap-4 text-xs">
              <UserPicker
                value={selectedUser}
                onChange={setSelectedUser}
                existingDigitalIds={members.map((m) => Number(m.digitalId))}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Organization Role</label>

                <select
                  value={newMemberData.orgRole}
                  onChange={(e) =>
                    setNewMemberData({
                      ...newMemberData,
                      orgRole: e.target.value as OrgRole,
                    })
                  }
                  className={selectClass}
                >
                  <option value="scanner">Gate Scanner</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {memberFormError && (
                <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{memberFormError}</span>
                </div>
              )}

              <ModalActions
                onCancel={() => setIsMemberModalOpen(false)}
                isLoading={isAddingMember}
                submitLabel="Add Member"
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationManager;