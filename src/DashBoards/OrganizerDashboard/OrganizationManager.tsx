import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import {
  Building2,
  Plus,
  Edit,
  Wallet as WalletIcon,
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
  Camera,
  Clock,
  FileText,
  UserX,
} from "lucide-react";

import { type RootState } from "../../App/store";

import {
  useGetUserOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useGetOrganizationMembersQuery,
  useAddOrganizationMemberMutation,
  useRemoveOrganizationMemberMutation,
  type Organization,
  type OrgMember,
  type OrgRole,
} from "../../features/APIS/organizationApi";

import {
  useGetVerificationByOrganizationQuery,
  useSubmitVerificationMutation,
  useUpdateVerificationMutation,
  type Verification,
  type VerificationEntityType,
} from "../../features/APIS/VerificationsApi";

import {
  useSearchUsersByLastNameQuery,
  useSearchUsersWithDetailsQuery,
  useGetUserByDigitalIdQuery,
} from "../../features/APIS/UserApi";

import { usePageTitle } from "../../hooks/usePageTitle";

// ======================================================
// WALLET ROUTE (where payouts are managed)
// 👈 Change this to the real path of your Wallet page
// ======================================================

const WALLET_ROUTE = "/organizer-dashboard/wallet";

// ======================================================
// CLOUDINARY CONFIG (unsigned upload preset)
// ======================================================

const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";
const MAX_LOGO_SIZE_MB = 5;
const MAX_DOC_SIZE_MB = 8;

// ======================================================
// LOCAL TYPES
// ======================================================

interface OrgFormData {
  name: string;
  slug: string;
  supportEmail: string;
  supportPhone: string;
  logoUrl: string;
}

interface NewMemberFormData {
  digitalId: string;
  orgRole: OrgRole;
}

interface VerificationFormData {
  entityType: VerificationEntityType;
  legalFullName: string;
  idFrontUrl: string;
  idBackUrl: string;
  businessDocUrl: string;
  taxCertUrl: string;
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
};

const EMPTY_MEMBER_FORM: NewMemberFormData = {
  digitalId: "",
  orgRole: "scanner",
};

const EMPTY_VERIFICATION_FORM: VerificationFormData = {
  entityType: "individual",
  legalFullName: "",
  idFrontUrl: "",
  idBackUrl: "",
  businessDocUrl: "",
  taxCertUrl: "",
};

// One prompt per live selfie; the number of prompts = the number of selfies required
const SELFIE_PROMPTS = ["Look straight at the camera", "Turn your head slightly to one side"];
const REQUIRED_SELFIES = SELFIE_PROMPTS.length;

const VERIFICATION_STEPS = ["Details", "Documents", "Selfies"];

const VERIFICATION_REVIEW_TIME = "10 to 60 minutes";

// Remembers that an organization was just created, so the verification flow can open after the page reloads
const JUST_CREATED_KEY = "orgManager:justCreated";

// ======================================================
// LABELS
// ======================================================

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  scanner: "Gate Scanner",
};

const VERIFICATION_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "Pending review", badge: "badge-warning" },
  in_progress: { label: "Under review", badge: "badge-info" },
  approved: { label: "Approved", badge: "badge-success" },
  rejected: { label: "Rejected", badge: "badge-error" },
  resubmission_required: { label: "Action needed", badge: "badge-warning" },
};

const REJECTION_FIELD_LABELS: Record<string, string> = {
  adminComment: "Reviewer note",
  rejectionReason: "Reason",
  idFrontRejection: "Front of ID",
  idBackRejection: "Back of ID",
  selfiesRejection: "Selfies",
  businessDocRejection: "Business document",
  taxCertRejection: "Tax certificate",
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

/** The verification endpoint may return the record directly or wrapped in { data } */
const unwrapVerification = (payload: unknown): Verification | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const maybe = (payload as Record<string, any>).data;
  const record = (maybe && typeof maybe === "object" && !Array.isArray(maybe) ? maybe : payload) as Verification;
  return record?.id ? record : undefined;
};

// ======================================================
// ERROR HELPERS (always produce a plain string, never an object)
// ======================================================

/** Walks a Zod `.format()` tree ({ _errors, field: { _errors } }) into readable lines */
const flattenZodErrors = (node: unknown, path = ""): string[] => {
  if (!node || typeof node !== "object") return [];

  const obj = node as Record<string, unknown>;
  const lines: string[] = [];

  if (Array.isArray(obj._errors)) {
    obj._errors.forEach((m) => {
      if (typeof m === "string") lines.push(path ? `${path}: ${m}` : m);
    });
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (key === "_errors") return;
    lines.push(...flattenZodErrors(value, path ? `${path}.${key}` : key));
  });

  return lines;
};

/** Converts any backend error payload (string, Zod format, Zod flatten, issue array) into text */
const toText = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const issue = item as Record<string, any>;
          const field = Array.isArray(issue.path) ? issue.path.join(".") : "";
          if (typeof issue.message === "string") return field ? `${field}: ${issue.message}` : issue.message;
        }
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join(". ") : null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, any>;

    // Zod .flatten() shape: { formErrors: [], fieldErrors: { slug: ["..."] } }
    if (obj.fieldErrors || obj.formErrors) {
      const fieldLines = Object.entries(obj.fieldErrors ?? {}).flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? (msgs as string[]).map((m) => `${field}: ${m}`) : []
      );
      const formLines = Array.isArray(obj.formErrors) ? (obj.formErrors as string[]) : [];
      const all = [...formLines, ...fieldLines];
      if (all.length) return all.join(". ");
    }

    // Zod .format() shape
    const flat = flattenZodErrors(obj);
    if (flat.length) return flat.join(". ");

    if (typeof obj.message === "string") return obj.message;
  }

  return null;
};

const getErrorMessage = (err: any, fallback: string): string => {
  const fromBody = toText(err?.data?.message) ?? toText(err?.data?.errors) ?? toText(err?.data?.error);
  if (fromBody) return fromBody;

  if (err?.status === 400) return "Invalid request. Please check your details.";
  if (err?.status === 401) return "Your session has expired. Please log in again.";
  if (err?.status === 403) return "You don't have permission to do that.";
  if (err?.status === 404) return "The requested organization or member was not found.";
  if (err?.status === 409) return "That slug or name is already taken. Try a different one.";
  if (err?.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (err?.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection or API URL.";

  return typeof fallback === "string" ? fallback : "Something went wrong.";
};

/** Lowercase letters, numbers and single hyphens only (accents are stripped, other symbols become hyphens) */
const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const randomSuffix = (): string => Math.random().toString(36).slice(2, 6).padEnd(4, "x");

/** Builds a valid, unique-ish slug from the organization name, e.g. "Tech Fest Kenya" -> "tech-fest-kenya-k3x9" */
const generateSlug = (name: string): string => {
  const base = slugify(name).slice(0, 40).replace(/-+$/, "") || "org";
  return `${base}-${randomSuffix()}`;
};

const isSlugConflict = (err: any): boolean => {
  if (err?.status === 409) return true;
  const text = (toText(err?.data?.message) ?? toText(err?.data?.error) ?? "").toLowerCase();
  return text.includes("slug") && (text.includes("taken") || text.includes("exist") || text.includes("unique") || text.includes("duplicate"));
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

// ======================================================
// CLOUDINARY UPLOAD HELPER (used by verification uploads)
// ======================================================

const uploadToCloudinary = async (
  file: Blob | File,
  onProgress?: (percent: number) => void,
  resourceType: "image" | "auto" = "auto"
): Promise<string> => {
  const cloudFormData = new FormData();
  cloudFormData.append("file", file);
  cloudFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    cloudFormData,
    {
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress?.(percent);
      },
    }
  );

  return response.data.secure_url as string;
};

// ======================================================
// INLINE ERROR (shown inside modals so it is visible on small screens)
// ======================================================

const InlineError = ({ message }: { message: string }) =>
  message ? (
    <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
      <AlertCircle size={16} className="shrink-0" />
      <span className="break-words min-w-0">{message}</span>
    </div>
  ) : null;

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

    try {
      setUploading(true);
      onUploadingChange(true);
      setProgress(0);

      const url = await uploadToCloudinary(file, setProgress, "image");
      onChange(url);
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
// USER HELPERS (shape the user API responses)
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

/** A single-user endpoint may return the user directly, or wrapped in { user } / { data } */
const unwrapUser = (payload: unknown): PickedUser | null => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, any>;
  const candidate = p.user ?? p.data?.user ?? p.data ?? p;
  return normalizeUser(Array.isArray(candidate) ? candidate[0] : candidate);
};

type LookupMode = "id" | "email" | "name";

/** Turns a failed or empty user lookup into a friendly sentence */
const lookupMessage = (mode: LookupMode, term: string, error?: any): string => {
  if (error) {
    if (error.status === 404) {
      return mode === "id"
        ? `No user found with Digital ID ${term}. Check the number and try again.`
        : `No user found for "${term}". Check the spelling and try again.`;
    }
    if (error.status === 401 || error.status === 403) {
      return mode === "id"
        ? "You don't have permission to look up that user."
        : "You don't have permission to search users. Ask the person for their Digital ID and enter it here instead.";
    }
    if (error.status === "FETCH_ERROR") return "Can't reach the server. Check your connection and try again.";
    return "Something went wrong while searching. Please try again.";
  }

  if (mode === "id") return `No user found with Digital ID ${term}. Check the number and try again.`;
  if (mode === "email") return `No user found with the email "${term}". Check the address, or ask them to create an account first.`;
  return `No one found with the last name "${term}". Check the spelling, or try their email or Digital ID.`;
};

/** Role -> badge style (the owner stands out, scanners stay quiet) */
const ROLE_BADGE: Record<string, string> = {
  owner: "badge-primary",
  admin: "badge-secondary",
  manager: "badge-accent",
  scanner: "badge-outline",
};

/** Member rows can come with a few different id field names, so read them safely */
const getMemberId = (member: unknown): number => {
  const m = member as Record<string, any>;
  return Number(m?.id ?? m?.memberId ?? m?.orgMemberId ?? m?.member_id) || 0;
};

const UserAvatar = ({ user, size = "w-9 h-9" }: { user?: PickedUser | null; size?: string }) => (
  <div
    className={`${size} rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden`}
  >
    {!user ? (
      <UserX size={16} className="text-base-content/40" />
    ) : user.picture ? (
      <img src={user.picture} alt="" className="w-full h-full object-cover" />
    ) : (
      user.name.trim().charAt(0).toUpperCase()
    )}
  </div>
);

// ======================================================
// USER PICKER (search by last name, email or Digital ID)
// ======================================================

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

  const typed = term.trim();
  const isDigits = /^\d+$/.test(debounced);
  const isEmail = debounced.includes("@");
  const mode: LookupMode = isDigits ? "id" : isEmail ? "email" : "name";

  const idReady = isDigits && debounced.length >= 6;
  const textReady = !isDigits && debounced.length >= 2;
  const ready = idReady || textReady;

  // Exact lookup (Digital ID), email search, or last-name search
  const byId = useGetUserByDigitalIdQuery(debounced, { skip: !idReady });
  const byEmail = useSearchUsersWithDetailsQuery(debounced, { skip: !(textReady && isEmail) });
  const byName = useSearchUsersByLastNameQuery(debounced, { skip: !(textReady && !isEmail) });

  const active = mode === "id" ? byId : mode === "email" ? byEmail : byName;

  const results: PickedUser[] =
    mode === "id"
      ? [unwrapUser(byId.data)].filter((u): u is PickedUser => u !== null)
      : toArray<any>(active.data, "users")
          .map(normalizeUser)
          .filter((u): u is PickedUser => u !== null)
          .slice(0, 8);

  const settled = typed === debounced;
  const busy = !settled || (ready && active.isFetching);

  const reset = () => {
    onChange(null);
    setTerm("");
    setDebounced("");
  };

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Team member</label>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
          <UserAvatar user={value} size="w-11 h-11" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-base-content truncate">{value.name}</span>
            {value.email && <span className="text-[11px] text-base-content/60 truncate">{value.email}</span>}
            <span className="text-[10px] text-base-content/40 font-mono">Digital ID {value.digitalId}</span>
          </div>
          <button type="button" onClick={reset} className="btn btn-ghost btn-xs rounded-lg text-xs font-bold">
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Last name, email or Digital ID"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="grow"
        />
        {busy && typed.length > 0 && <span className="loading loading-spinner loading-xs text-primary" />}
      </label>

      {typed.length === 0 && (
        <span className="text-[11px] text-base-content/50">
          Search by last name or email. If you know their Digital ID, enter it for an exact match.
        </span>
      )}

      {typed.length > 0 && !ready && settled && (
        <span className="text-[11px] text-base-content/50">
          {isDigits ? "Keep typing the Digital ID (at least 6 digits)." : "Type at least 2 letters."}
        </span>
      )}

      {ready && settled && !active.isFetching && (
        <div className="rounded-2xl border border-base-200 bg-base-100 overflow-hidden max-h-60 overflow-y-auto">
          {active.isError || results.length === 0 ? (
            <div
              className={`flex items-start gap-3 p-4 text-[11px] ${
                active.isError && (active.error as any)?.status !== 404 ? "bg-warning/10" : ""
              }`}
            >
              <UserX size={18} className="text-base-content/40 shrink-0 mt-0.5" />
              <span className="text-base-content/70 leading-relaxed">
                {lookupMessage(mode, debounced, active.isError ? active.error : undefined)}
              </span>
            </div>
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
                    <span className="text-[10px] text-base-content/40 font-mono">ID {u.digitalId}</span>
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
// MEMBER ROW (loads the person behind each Digital ID)
// ======================================================

interface MemberRowProps {
  member: OrgMember;
  isSelf: boolean;
  onRemove: (memberId: number, name: string) => void;
}

const MemberRow = ({ member, isSelf, onRemove }: MemberRowProps) => {
  const digitalId = Number(member.digitalId);
  const memberId = getMemberId(member);

  const { data, isLoading } = useGetUserByDigitalIdQuery(digitalId, { skip: !digitalId });
  const person = unwrapUser(data);

  const role = String(member.orgRole);
  const displayName = person?.name ?? (isLoading ? "" : "Unknown user");

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-base-100 border border-base-200 hover:border-primary/30 transition-colors">
      <UserAvatar user={person} size="w-11 h-11" />

      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {isLoading ? (
            <span className="skeleton h-4 w-32 rounded" />
          ) : (
            <span className="font-bold text-sm text-base-content truncate">{displayName}</span>
          )}

          {isSelf && <span className="badge badge-ghost badge-xs font-bold">You</span>}
        </div>

        {person?.email ? (
          <span className="text-[11px] text-base-content/60 truncate">{person.email}</span>
        ) : (
          !isLoading && <span className="text-[11px] text-base-content/40">This account could not be loaded</span>
        )}

        <span className="text-[10px] text-base-content/40 font-mono">Digital ID {digitalId}</span>
      </div>

      <span className={`badge badge-sm font-bold shrink-0 ${ROLE_BADGE[role] ?? "badge-outline"}`}>
        {ROLE_LABELS[role] ?? role}
      </span>

      {role !== "owner" && (
        <button
          onClick={() => onRemove(memberId, displayName || `Digital ID ${digitalId}`)}
          disabled={!memberId}
          className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10 rounded-lg shrink-0"
          title="Remove member"
        >
          <Trash2 size={14} />
        </button>
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
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center px-3 sm:px-4 bg-black/70 backdrop-blur-sm"
    style={{
      paddingTop: "max(0.75rem, env(safe-area-inset-top))",
      paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-base-100 border border-base-200 w-full ${maxWidth} max-h-full overflow-y-auto overflow-x-hidden rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-5 sm:gap-6`}
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
// DOCUMENT UPLOADER (ID front/back, business docs → Cloudinary)
// ======================================================

interface DocUploaderProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

const isPdfUrl = (url: string) => url.toLowerCase().split("?")[0].endsWith(".pdf");

const DocUploader = ({ label, hint, value, onChange, onUploadingChange }: DocUploaderProps) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Please choose an image or PDF file.");
      return;
    }
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      setError(`File must be smaller than ${MAX_DOC_SIZE_MB}MB.`);
      return;
    }

    try {
      setUploading(true);
      onUploadingChange(true);
      setProgress(0);

      const url = await uploadToCloudinary(file, setProgress, "auto");
      onChange(url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>

      <div className="flex items-center gap-3">
        <div className="w-20 h-14 rounded-xl bg-base-200 border border-base-300 flex items-center justify-center overflow-hidden shrink-0 text-base-content/40">
          {value ? (
            isPdfUrl(value) ? (
              <FileText size={22} className="text-primary" />
            ) : (
              <img src={value} alt={label} className="w-full h-full object-cover" />
            )
          ) : (
            <UploadCloud size={20} />
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`btn btn-sm btn-outline rounded-xl text-xs font-bold gap-2 ${
                uploading ? "btn-disabled" : ""
              }`}
            >
              <UploadCloud size={14} />
              {value ? "Replace" : "Upload"}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFile}
                className="hidden"
                disabled={uploading}
              />
            </label>

            {value && !uploading && (
              <span className="text-[11px] font-bold text-success flex items-center gap-1">
                <Check size={12} /> Uploaded
              </span>
            )}
          </div>

          {hint && <span className="text-[11px] text-base-content/50">{hint}</span>}
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
// CAMERA CAPTURE (live camera, with a native phone-camera fallback)
// ======================================================

interface CameraCaptureProps {
  prompt: string;
  busy: boolean;
  onCapture: (blob: Blob) => void;
}

const CameraCapture = ({ prompt, busy, onCapture }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      setError("");
      setReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Live camera is not available here (it needs https and a supported browser). You can use your phone camera instead."
        );
        return;
      }

      try {
        // This is the call that makes the browser ask for camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        setReady(true);
      } catch {
        setError("Camera access was blocked. Allow camera permission in your browser, or use your phone camera instead.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || busy) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-error/10 border border-error/30">
        <span className="text-[11px] font-semibold text-error">{error}</span>

        <p className="text-xs font-bold text-base-content">{prompt}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="btn btn-sm btn-outline btn-error rounded-xl text-xs font-bold"
          >
            Try again
          </button>

          <label
            className={`btn btn-sm btn-primary rounded-xl text-xs font-bold gap-2 ${busy ? "btn-disabled" : ""}`}
          >
            <Camera size={14} />
            {busy ? "Uploading..." : "Use phone camera"}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onCapture(file);
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] w-full">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-bold gap-2">
            <span className="loading loading-spinner loading-sm" />
            Starting camera...
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-bold gap-2">
            <span className="loading loading-spinner loading-sm" />
            Uploading selfie...
          </div>
        )}
      </div>

      <p className="text-xs font-bold text-base-content text-center">{prompt}</p>

      <button
        type="button"
        onClick={snap}
        disabled={!ready || busy}
        className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-2"
      >
        <Camera size={15} />
        Take photo
      </button>
    </div>
  );
};

// ======================================================
// VERIFICATION REQUIRED NOTICE
// ======================================================

const VerificationRequiredNotice = () => (
  <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-xs">
    <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />

    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-black text-sm text-base-content">Verification is required</span>

      <span className="text-base-content/70">
        Without verification, nothing can be done with your organization. Complete it now to get started.
      </span>

      <span className="flex items-start gap-1.5 font-bold text-base-content mt-1">
        <Clock size={13} className="text-warning shrink-0 mt-0.5" />
        Approval usually takes about {VERIFICATION_REVIEW_TIME} after you submit.
      </span>
    </div>
  </div>
);

// ======================================================
// VERIFICATION MODAL (details → documents → live selfies → save)
// ======================================================

interface VerificationModalProps {
  orgId: number;
  userId: number;
  mode: "create" | "resubmit";
  verificationId?: number;
  onClose: () => void;
  onDone: (message: string) => void;
}

const VerificationModal = ({ orgId, userId, mode, verificationId, onClose, onDone }: VerificationModalProps) => {
  const [submitVerification, { isLoading: isSubmitting }] = useSubmitVerificationMutation();
  const [updateVerification, { isLoading: isResubmitting }] = useUpdateVerificationMutation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<VerificationFormData>(EMPTY_VERIFICATION_FORM);
  const [uploadingDocs, setUploadingDocs] = useState(0);

  const [selfies, setSelfies] = useState<string[]>([]);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieError, setSelfieError] = useState("");

  const [submitError, setSubmitError] = useState("");

  const isBusiness = form.entityType === "business";

  const trackDocUploading = (uploading: boolean) =>
    setUploadingDocs((prev) => Math.max(0, prev + (uploading ? 1 : -1)));

  const canGoNext =
    step === 0
      ? form.legalFullName.trim().length >= 3
      : step === 1
        ? !!form.idFrontUrl &&
          !!form.idBackUrl &&
          (!isBusiness || (!!form.businessDocUrl && !!form.taxCertUrl)) &&
          uploadingDocs === 0
        : false;

  const allSelfiesDone = selfies.length >= REQUIRED_SELFIES;

  // Each selfie uploads to Cloudinary as soon as it is taken, then the camera waits for the next one
  const handleSelfie = async (blob: Blob) => {
    setSelfieError("");
    setSelfieUploading(true);

    try {
      const url = await uploadToCloudinary(blob, undefined, "image");
      setSelfies((prev) => [...prev, url]);
    } catch {
      setSelfieError("Selfie upload failed. Please take it again.");
    } finally {
      setSelfieUploading(false);
    }
  };

  const handleRetake = (index: number) => {
    setSelfies((prev) => prev.filter((_, i) => i !== index));
  };

  // Everything is on Cloudinary now, so send the URLs to the database
  const handleSubmit = async () => {
    if (!allSelfiesDone) return;

    setSubmitError("");

    const payload = {
      entityType: form.entityType,
      legalFullName: form.legalFullName.trim(),
      idFrontUrl: form.idFrontUrl,
      idBackUrl: form.idBackUrl,
      selfiePhotos: selfies,
      businessDocUrl: isBusiness ? form.businessDocUrl : null,
      taxCertUrl: isBusiness ? form.taxCertUrl : null,
    };

    try {
      if (mode === "resubmit" && verificationId) {
        await updateVerification({ id: verificationId, data: payload }).unwrap();
      } else {
        await submitVerification({ userId, orgId, ...payload }).unwrap();
      }

      onDone(
        `Verification submitted! Approval usually takes about ${VERIFICATION_REVIEW_TIME}. Check back here for your status.`
      );
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Failed to submit verification."));
    }
  };

  return (
    <ModalShell title="Verify Your Organization" onClose={onClose}>
      <div className="flex flex-col gap-5 text-xs">
        <VerificationRequiredNotice />

        <div className="w-full overflow-x-hidden">
          <ul className="steps steps-horizontal w-full text-[10px] sm:text-[11px] font-bold">
            {VERIFICATION_STEPS.map((label, i) => (
              <li key={label} className={`step ${i <= step ? "step-primary" : ""}`}>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* STEP 1: DETAILS */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Verifying as</label>

              <div className="grid grid-cols-2 gap-2">
                {(["individual", "business"] as VerificationEntityType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, entityType: type }))}
                    className={`btn btn-sm rounded-xl text-xs font-bold capitalize ${
                      form.entityType === type ? "btn-primary" : "btn-outline"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                {isBusiness ? "Registered business name" : "Full legal name (as on your ID)"}
              </label>

              <input
                type="text"
                placeholder={isBusiness ? "e.g. Tech Fest Kenya Ltd" : "e.g. John Doe Kamau"}
                value={form.legalFullName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalFullName: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* STEP 2: DOCUMENTS */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <DocUploader
              label="National ID / Passport (front)"
              hint="Clear photo, all four corners visible"
              value={form.idFrontUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, idFrontUrl: url }))}
              onUploadingChange={trackDocUploading}
            />

            <DocUploader
              label="National ID / Passport (back)"
              hint="Text must be readable"
              value={form.idBackUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, idBackUrl: url }))}
              onUploadingChange={trackDocUploading}
            />

            {isBusiness && (
              <>
                <DocUploader
                  label="Business registration certificate"
                  hint={`Image or PDF, up to ${MAX_DOC_SIZE_MB}MB`}
                  value={form.businessDocUrl}
                  onChange={(url) => setForm((prev) => ({ ...prev, businessDocUrl: url }))}
                  onUploadingChange={trackDocUploading}
                />

                <DocUploader
                  label="Tax compliance certificate (KRA)"
                  hint={`Image or PDF, up to ${MAX_DOC_SIZE_MB}MB`}
                  value={form.taxCertUrl}
                  onChange={(url) => setForm((prev) => ({ ...prev, taxCertUrl: url }))}
                  onUploadingChange={trackDocUploading}
                />
              </>
            )}
          </div>
        )}

        {/* STEP 3: LIVE SELFIES */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-base-content/60">
              We need {REQUIRED_SELFIES} live selfies. Allow camera access when your browser asks. Each photo uploads
              as soon as you take it.
            </p>

            {selfies.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {selfies.map((url, i) => (
                  <div key={url} className="relative rounded-2xl overflow-hidden border border-base-300 aspect-[4/3]">
                    <img src={url} alt={`Selfie ${i + 1}`} className="w-full h-full object-cover" />

                    <span className="absolute top-2 left-2 badge badge-sm badge-success gap-1 font-bold">
                      <Check size={10} /> Selfie {i + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRetake(i)}
                      disabled={selfieUploading || isSubmitting || isResubmitting}
                      className="absolute bottom-2 right-2 btn btn-xs rounded-lg font-bold"
                    >
                      Retake
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!allSelfiesDone && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                  Selfie {selfies.length + 1} of {REQUIRED_SELFIES}
                </span>

                <CameraCapture
                  prompt={SELFIE_PROMPTS[selfies.length] ?? SELFIE_PROMPTS[0]}
                  busy={selfieUploading}
                  onCapture={handleSelfie}
                />
              </div>
            )}

            {selfieError && <span className="text-[11px] font-semibold text-error">{selfieError}</span>}

            {allSelfiesDone && (
              <div className="alert alert-success text-xs font-bold rounded-2xl py-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>
                  All uploads complete. Submit to send your verification for review. Approval usually takes about{" "}
                  {VERIFICATION_REVIEW_TIME}.
                </span>
              </div>
            )}

            <InlineError message={submitError} />
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex justify-between gap-2 pt-4 border-t border-base-200">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            disabled={isSubmitting || isResubmitting}
            className="btn btn-ghost btn-sm rounded-xl text-xs font-bold"
          >
            {step === 0 ? "Do this later" : "Back"}
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold"
            >
              {uploadingDocs > 0 ? <span className="loading loading-spinner loading-xs" /> : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allSelfiesDone || selfieUploading || isSubmitting || isResubmitting}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold"
            >
              {isSubmitting || isResubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Submit Verification"
              )}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

// ======================================================
// VERIFICATION BADGE (driven by the verification status)
// ======================================================

const VerificationBadge = ({ isVerified, status }: { isVerified: boolean; status?: string }) => {
  if (isVerified) {
    return (
      <span className="badge badge-sm badge-success gap-1 font-bold text-success-content">
        <ShieldCheck size={11} />
        Verified
      </span>
    );
  }

  if (status === "pending" || status === "in_progress") {
    return (
      <span className="badge badge-sm badge-info gap-1 font-bold">
        <Clock size={11} />
        Under review
      </span>
    );
  }

  if (status === "resubmission_required") {
    return (
      <span className="badge badge-sm badge-warning gap-1 font-bold">
        <AlertCircle size={11} />
        Action needed
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="badge badge-sm badge-error gap-1 font-bold text-error-content">
        <AlertCircle size={11} />
        Rejected
      </span>
    );
  }

  return (
    <span className="badge badge-sm badge-warning gap-1 font-bold">
      <AlertCircle size={11} />
      Unverified
    </span>
  );
};

// ======================================================
// VERIFIED CARD (shown once the verification is approved)
// ======================================================

const VerifiedCard = ({ verification }: { verification?: Verification }) => {
  const v = verification as Record<string, any> | undefined;

  const entityLabel = v?.entityType === "business" ? "Business" : v?.entityType === "individual" ? "Individual" : "";
  const legalName = (v?.legalFullName as string | undefined) || "";
  const approvedOn = v?.updatedAt ? formatDate(v.updatedAt) : "";

  const details = [
    { label: "Verified as", value: entityLabel },
    { label: "Legal name", value: legalName },
    { label: "Approved on", value: approvedOn },
  ].filter((item) => !!item.value);

  return (
    <div className="rounded-3xl border border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-4 sm:p-6 flex flex-col gap-5">
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-success text-success-content flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck size={28} />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-base sm:text-lg font-black tracking-tight text-base-content">
            Your organization is verified
          </h3>

          <p className="text-xs text-base-content/70">
            Your identity has been confirmed, and your organization now carries the Verified badge.
          </p>
        </div>
      </div>

      {details.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-success/20 text-xs">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                {item.label}
              </span>
              <span className="font-semibold text-base-content break-words">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ======================================================
// VERIFICATION PANEL (status card, driven by the verification record)
// ======================================================

interface VerificationPanelProps {
  verification?: Verification;
  isVerified: boolean;
  isLoading: boolean;
  error?: unknown;
  onStart: (mode: "create" | "resubmit", verificationId?: number) => void;
}

const VerificationPanel = ({ verification, isVerified, isLoading, error, onStart }: VerificationPanelProps) => {
  // Verified wins over everything else, so show it straight away
  if (isVerified) return <VerifiedCard verification={verification} />;

  const notFound = !!error && (error as any).status === 404;
  const hardError = !!error && !notFound;

  const status = verification?.status;
  const statusMeta = status ? VERIFICATION_STATUS_META[status] : undefined;

  const feedback = verification
    ? Object.keys(REJECTION_FIELD_LABELS)
        .map((key) => ({ key, text: (verification as Record<string, any>)[key] as string | null | undefined }))
        .filter((item) => !!item.text)
    : [];

  return (
    <div className="bg-base-200/40 border border-warning/50 shadow-sm p-4 sm:p-6 rounded-3xl flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black tracking-tight text-base-content flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary shrink-0" />
          Organization Verification
        </h3>

        {statusMeta && <span className={`badge badge-sm font-bold ${statusMeta.badge}`}>{statusMeta.label}</span>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : hardError ? (
        <div className="alert alert-error text-xs font-semibold rounded-xl py-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{getErrorMessage(error, "Could not load verification status.")}</span>
        </div>
      ) : !verification ? (
        <>
          <VerificationRequiredNotice />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-base-content/60 max-w-xl">
              Verify your identity to build trust with attendees. You'll upload your ID, take a couple of live selfies,
              and we'll review it.
            </p>

            <button
              onClick={() => onStart("create")}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-2 shrink-0"
            >
              <ShieldCheck size={15} />
              Start Verification
            </button>
          </div>
        </>
      ) : status === "pending" || status === "in_progress" ? (
        <div className="flex items-start gap-2 text-xs text-base-content/70">
          <Clock size={16} className="text-warning shrink-0 mt-0.5" />
          <span>
            Your documents were submitted{verification.createdAt ? ` on ${formatDate(verification.createdAt)}` : ""} and
            are being reviewed. Approval usually takes about {VERIFICATION_REVIEW_TIME}. Until then, your
            organization can't be used, so check back here for your status.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <VerificationRequiredNotice />

          <p className="text-xs text-base-content/70">
            {status === "resubmission_required"
              ? "We need a few things fixed before we can approve your verification."
              : "Your verification was not approved."}
          </p>

          {feedback.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {feedback.map((item) => (
                <li
                  key={item.key}
                  className="text-xs p-3 rounded-xl bg-warning/10 border border-warning/30 flex flex-col"
                >
                  <span className="text-[10px] uppercase tracking-widest text-base-content/50 font-bold">
                    {REJECTION_FIELD_LABELS[item.key]}
                  </span>
                  <span className="font-semibold text-base-content break-words">{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {status === "resubmission_required" && (
            <button
              onClick={() => onStart("resubmit", verification.id)}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold w-fit"
            >
              Resubmit Documents
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ======================================================
// COMPONENT
// ======================================================

export const OrganizationManager = () => {
  const navigate = useNavigate();
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
    selectedOrgId && !membershipOrgIds.includes(selectedOrgId)
      ? [...membershipOrgIds, selectedOrgId]
      : membershipOrgIds;

  const activeOrgId = selectedOrgId ?? organizationIds[0] ?? undefined;

  const currentMembership = orgs.find((member) => Number(member.orgId) === activeOrgId);

  // One organization per user: anyone who already owns one cannot create another
  const ownsOrganization = orgs.some((member) => member.orgRole === "owner");

  // ====================================================
  // ACTIVE ORGANIZATION DETAILS
  // ====================================================

  const { data: orgData, isLoading: orgDetailsLoading } = useGetOrganizationByIdQuery(activeOrgId ?? skipToken);

  const org = unwrapOrg(orgData);

  // ====================================================
  // VERIFICATION STATUS (drives everything that looks "verified")
  // ====================================================

  const {
    data: verificationData,
    isLoading: verificationLoading,
    error: verificationError,
    refetch: refetchVerification,
  } = useGetVerificationByOrganizationQuery(activeOrgId ?? skipToken);

  const verification = unwrapVerification(verificationData);
  const verificationStatus = verification?.status;

  // Verified as soon as the verification is approved, even if the organization record has not caught up yet
  const isVerified = verificationStatus === "approved" || !!org?.isVerified;

  usePageTitle(org?.name ? `${org.name} · Organization Management` : "Organization Management");

  // ====================================================
  // MEMBERS
  // ====================================================

  const { data: membersData, isLoading: membersLoading } = useGetOrganizationMembersQuery(activeOrgId ?? skipToken);

  const members = toArray<OrgMember>(membersData, "members");

  // The owner always comes first
  const sortedMembers = [...members].sort(
    (a, b) => Number(b.orgRole === "owner") - Number(a.orgRole === "owner")
  );

  // ====================================================
  // MUTATIONS
  // ====================================================

  const [createOrganization, { isLoading: isCreating }] = useCreateOrganizationMutation();
  const [updateOrganization, { isLoading: isUpdating }] = useUpdateOrganizationMutation();
  const [addOrganizationMember, { isLoading: isAddingMember }] = useAddOrganizationMemberMutation();
  const [removeOrganizationMember, { isLoading: isRemoving }] = useRemoveOrganizationMemberMutation();

  // ====================================================
  // MODAL STATES
  // ====================================================

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const [verificationMode, setVerificationMode] = useState<"create" | "resubmit">("create");
  const [resubmitVerificationId, setResubmitVerificationId] = useState<number | undefined>(undefined);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Error shown INSIDE the open create / edit modal (page-level alerts hide behind the overlay)
  const [modalError, setModalError] = useState("");

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<{ id: number; name: string } | null>(null);

  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);
  const [memberFormError, setMemberFormError] = useState("");

  // ====================================================
  // FORM STATES
  // ====================================================

  const [formData, setFormData] = useState<OrgFormData>(EMPTY_ORG_FORM);

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
  // VERIFICATION
  // ====================================================

  const openVerificationModal = (mode: "create" | "resubmit", verificationId?: number) => {
    setVerificationMode(mode);
    setResubmitVerificationId(verificationId);
    setIsVerificationModalOpen(true);
  };

  const handleVerificationDone = (message: string) => {
    setIsVerificationModalOpen(false);
    setResubmitVerificationId(undefined);
    showSuccess(message);

    // Pull the fresh status so the page updates without a reload
    if (activeOrgId) refetchVerification();
  };

  // After the post-create reload: show the success message and go straight to verification
  useEffect(() => {
    if (!activeOrgId || !digitalId) return;

    let justCreated: string | null = null;
    try {
      justCreated = sessionStorage.getItem(JUST_CREATED_KEY);
      if (justCreated) sessionStorage.removeItem(JUST_CREATED_KEY);
    } catch {
      justCreated = null;
    }

    if (justCreated) {
      showSuccess("Organization created successfully! Next, let's verify it.");
      openVerificationModal("create");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, digitalId]);

  // ====================================================
  // CREATE ORGANIZATION
  // ====================================================

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();

    setModalError("");
    setErrorMessage("");

    if (ownsOrganization) {
      setModalError("You already have an organization. Only one organization is allowed per account.");
      return;
    }

    const orgName = formData.name.trim();

    if (!orgName) {
      setModalError("Please enter your organization name.");
      return;
    }

    try {
      // The slug is generated automatically. If it happens to collide, retry with a fresh suffix.
      let created: unknown;
      let lastError: unknown;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          created = await createOrganization({
            name: orgName,
            slug: generateSlug(orgName),
            supportEmail: formData.supportEmail.trim() || null,
            supportPhone: formData.supportPhone.trim() || null,
            logoUrl: formData.logoUrl || null,
          }).unwrap();
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          if (!isSlugConflict(err)) break;
        }
      }

      if (lastError) throw lastError;

      const createdOrg = unwrapOrg(created);

      setIsCreateModalOpen(false);
      setFormData(EMPTY_ORG_FORM);
      setModalError("");

      // Reload the page so the brand-new organization is fetched fresh.
      // The flag lets us show the success message and open verification once the page is back.
      try {
        sessionStorage.setItem(JUST_CREATED_KEY, String(createdOrg?.id ?? "1"));
      } catch {
        // storage can be blocked in private mode; the reload still works
      }

      window.location.reload();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to create organization."));
    }
  };

  // ====================================================
  // UPDATE ORGANIZATION
  // ====================================================

  const handleUpdateOrg = async (e: FormEvent) => {
    e.preventDefault();

    if (!activeOrgId) return;

    setModalError("");

    try {
      await updateOrganization({
        orgId: activeOrgId,
        data: {
          name: formData.name.trim(),
          supportEmail: formData.supportEmail.trim() || null,
          supportPhone: formData.supportPhone.trim() || null,
          logoUrl: formData.logoUrl || null,
        },
      }).unwrap();

      showSuccess("Organization updated successfully!");

      setIsEditModalOpen(false);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update organization."));
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

  const handleRemoveMember = (memberId: number, name: string) => {
    setErrorMessage("");
    setMemberToRemove({ id: memberId, name });
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    try {
      await removeOrganizationMember(memberToRemove.id).unwrap();

      showSuccess(`${memberToRemove.name} was removed from the team.`);
    } catch (err) {
      showError(err, "Failed to remove member.");
    } finally {
      setMemberToRemove(null);
    }
  };

  // ====================================================
  // OPEN / CLOSE MODALS
  // ====================================================

  const openCreateModal = () => {
    if (ownsOrganization) {
      setSuccessMessage("");
      setErrorMessage("You already have an organization. Only one organization is allowed per account.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormData(EMPTY_ORG_FORM);
    setModalError("");
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
    });

    setModalError("");
    setIsEditModalOpen(true);
  };

  const openMemberModal = () => {
    setSelectedUser(null);
    setMemberFormError("");
    setNewMemberData(EMPTY_MEMBER_FORM);
    setIsMemberModalOpen(true);
  };

  const closeCreateModal = () => {
    setModalError("");
    setIsCreateModalOpen(false);
  };

  const closeEditModal = () => {
    setModalError("");
    setIsEditModalOpen(false);
  };

  const goToWallet = () => navigate(WALLET_ROUTE);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-28 lg:pb-16">
      {/* ================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200/50 p-4 sm:p-6 rounded-3xl border border-base-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-base-content">Organization Management</h1>

          <p className="text-xs text-base-content/60 mt-1">
            Manage your organization profile, verification, and operational team members.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1">
          <button
            onClick={openCreateModal}
            disabled={ownsOrganization}
            title={ownsOrganization ? "You already have an organization" : undefined}
            className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus size={16} />
            <span>Create Organization</span>
          </button>

          {ownsOrganization && (
            <span className="text-[11px] text-base-content/50">
              You already have an organization. Only one is allowed per account.
            </span>
          )}
        </div>
      </div>

      {/* ================================================
          NOTIFICATIONS
      ================================================= */}

      {successMessage && (
        <div className="alert alert-success text-xs font-bold rounded-2xl shadow-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="break-words min-w-0">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error text-xs font-bold rounded-2xl shadow-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span className="break-words min-w-0">{errorMessage}</span>
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
        <div className="flex flex-col gap-6 sm:gap-8">
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

            <div className="lg:col-span-2 bg-base-200/40 border border-base-200 p-4 sm:p-6 rounded-3xl flex flex-col justify-between gap-6">
              {orgDetailsLoading ? (
                <div className="flex justify-center py-10">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative shrink-0">
                      <OrgLogo url={org?.logoUrl} name={org?.name} />

                      {isVerified && (
                        <span
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success text-success-content flex items-center justify-center border-2 border-base-100"
                          title="Verified organization"
                        >
                          <Check size={13} />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black tracking-tight text-base-content break-words">
                          {org?.name || "Organization"}
                        </h2>

                        {org && <VerificationBadge isVerified={isVerified} status={verificationStatus} />}

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

                      {org?.slug && <span className="text-xs text-base-content/50 break-all">@{org.slug}</span>}

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
                      onClick={goToWallet}
                      className="btn btn-sm btn-ghost bg-base-200 hover:bg-base-300 rounded-xl text-xs font-bold gap-2"
                    >
                      <WalletIcon size={14} className="text-primary" />
                      Wallet & Payouts
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* WALLET & PAYOUTS WIDGET (payouts are managed only in the wallet) */}

            <div className="bg-base-200/40 border border-base-200 p-4 sm:p-6 rounded-3xl flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
                  Earnings & Payouts
                </span>

                <WalletIcon size={18} className="text-primary" />
              </div>

              <p className="text-xs text-base-content/70 leading-relaxed">
                Ticket sales go to your wallet after the platform commission is taken off. Add your M-Pesa or bank
                account and request payouts from the wallet.
              </p>

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
                onClick={goToWallet}
                className="w-full btn btn-sm btn-primary rounded-xl text-xs font-bold mt-2 gap-2"
              >
                <WalletIcon size={14} />
                Open Wallet
              </button>
            </div>
          </div>

          {/* ============================================
              VERIFICATION
          ============================================= */}

          {activeOrgId && digitalId && (
            <VerificationPanel
              verification={verification}
              isVerified={isVerified}
              isLoading={verificationLoading}
              error={verificationError}
              onStart={openVerificationModal}
            />
          )}

          {/* ============================================
              MEMBERS
          ============================================= */}

          <div className="bg-base-200/40 border border-base-200 p-4 sm:p-6 rounded-3xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-black tracking-tight text-base-content flex items-center gap-2">
                  <Users size={18} className="text-primary shrink-0" />
                  Organization Team & Staff
                  {members.length > 0 && (
                    <span className="badge badge-sm badge-ghost font-bold">{members.length}</span>
                  )}
                </h3>

                <p className="text-xs text-base-content/60 mt-0.5">
                  Manage permissions and roles for scanners and organization managers.
                </p>
              </div>

              <button onClick={openMemberModal} className="btn btn-sm btn-primary rounded-xl text-xs font-bold gap-2">
                <Plus size={15} />
                Add Team Member
              </button>
            </div>

            {membersLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-base-100 border border-base-200">
                    <span className="skeleton w-11 h-11 rounded-full shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <span className="skeleton h-4 w-40 rounded" />
                      <span className="skeleton h-3 w-56 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-10 bg-base-100/50 rounded-2xl border border-dashed border-base-300 p-6">
                <Users size={28} className="mx-auto text-primary/40 mb-2" />
                <p className="text-xs font-bold text-base-content">No team members yet</p>
                <p className="text-[11px] text-base-content/60 mt-0.5">
                  Add gate scanners and managers so they can work with your events.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedMembers.map((member) => (
                  <MemberRow
                    key={getMemberId(member) || member.digitalId}
                    member={member}
                    isSelf={Number(member.digitalId) === digitalId}
                    onRemove={handleRemoveMember}
                  />
                ))}
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
          <ModalShell title="Create New Organization" onClose={closeCreateModal}>
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

              <div className="flex items-start gap-2 text-[11px] text-base-content/60 bg-base-200/60 rounded-xl p-3">
                <Globe size={14} className="text-primary shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">
                  Your public page link is created automatically from the name
                  {formData.name.trim() ? (
                    <>
                      {" "}
                      (for example <b>/{slugify(formData.name).slice(0, 40) || "org"}-xxxx</b>)
                    </>
                  ) : null}
                  .
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Email</label>

                  <input
                    type="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="support@domain.co.ke"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Phone</label>

                  <input
                    type="tel"
                    placeholder="+254712345678"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-base-content/60 bg-base-200/60 rounded-xl p-3">
                <WalletIcon size={14} className="text-primary shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">
                  You will add your payout account later, in your wallet.
                </span>
              </div>

              <InlineError message={modalError} />

              <ModalActions
                onCancel={closeCreateModal}
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
          <ModalShell title="Edit Organization Profile" onClose={closeEditModal}>
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Support Phone</label>

                  <input
                    type="tel"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <InlineError message={modalError} />

              <ModalActions
                onCancel={closeEditModal}
                isLoading={isUpdating || isUploadingLogo}
                submitLabel="Save Changes"
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

              <InlineError message={memberFormError} />

              <ModalActions
                onCancel={() => setIsMemberModalOpen(false)}
                isLoading={isAddingMember}
                submitLabel="Add Member"
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================================================
          REMOVE MEMBER CONFIRMATION
      ================================================= */}

      <AnimatePresence>
        {memberToRemove && (
          <ModalShell title="Remove team member" maxWidth="max-w-sm" onClose={() => setMemberToRemove(null)}>
            <div className="flex flex-col items-center text-center gap-4 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                <Trash2 size={22} />
              </div>

              <p className="text-base-content/70 leading-relaxed">
                <span className="font-bold text-base-content">{memberToRemove.name}</span> will lose access to this
                organization right away. You can add them again later.
              </p>

              <div className="flex w-full gap-2 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => setMemberToRemove(null)}
                  disabled={isRemoving}
                  className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs"
                >
                  Keep member
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={isRemoving}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content"
                >
                  {isRemoving ? <span className="loading loading-spinner loading-xs" /> : "Remove"}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ==================================================
          VERIFICATION MODAL
      ================================================= */}

      <AnimatePresence>
        {isVerificationModalOpen && activeOrgId && digitalId && (
          <VerificationModal
            orgId={activeOrgId}
            userId={digitalId}
            mode={verificationMode}
            verificationId={resubmitVerificationId}
            onClose={() => setIsVerificationModalOpen(false)}
            onDone={handleVerificationDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationManager;