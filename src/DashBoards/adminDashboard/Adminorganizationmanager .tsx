import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldOff,
  Ban,
  PlayCircle,
  Percent,
  Wallet,
  Mail,
  Phone,
  Users,
  CalendarDays,
  BarChart3,
  UploadCloud,
  Ticket as TicketIcon,
  DollarSign,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Smartphone,
  Landmark,
  CreditCard,
  BadgeCheck,
  LayoutGrid,
  List,
  ChevronDown,
} from "lucide-react";

import {
  useGetAllOrganizationsAdminQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useUpdatePayoutConfigMutation,
  useUpdateCommissionMutation,
  useVerifyOrganizationMutation,
  useToggleOrganizationStatusMutation,
  useDeleteOrganizationMutation,
  useGetOrganizationMembersQuery,
  useGetOrganizationStatsQuery,
  useAddOrganizationMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
  type OrgRole,
} from "../../features/APIS/organizationApi";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import { useGetVerificationByOrganizationQuery } from "../../features/APIS/VerificationsApi";
import { useSearchUsersByLastNameQuery } from "../../features/APIS/UserApi";
import usePageTitle from "../../hooks/usePageTitle";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const NAVBAR_HEIGHT = "5rem";
const CURRENCY = "KSH";
const PAGE_SIZES = [10, 20, 50];

const CLOUDINARY_CLOUD_NAME = "dwibg4vvf";
const CLOUDINARY_UPLOAD_PRESET = "tickets";
const MAX_LOGO_MB = 5;

const ROLES: { value: OrgRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "scanner", label: "Gate Scanner" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;
void roleLabel;

const PAYOUT_TYPES = [
  { value: "mpesa_phone", label: "M-Pesa Phone" },
  { value: "paybill", label: "Paybill" },
  { value: "bank", label: "Bank" },
];
const payoutLabel = (t?: string) => PAYOUT_TYPES.find((x) => x.value === t)?.label ?? t ?? "Not set";
const payoutIcon = (t?: string) => (t === "bank" ? <Landmark size={13} /> : t === "paybill" ? <CreditCard size={13} /> : <Smartphone size={13} />);

type StatusFilter = "all" | "active" | "suspended";
type VerifyFilter = "all" | "verified" | "unverified";
type SortKey = "newest" | "name" | "commission";

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const toArray = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.organizations) ? d.organizations : []);
const orgIdOf = (o: any): number => Number(o?.orgId ?? o?.id);
const errMsg = (e: any, fallback: string) =>
  e?.data?.message ||
  (Array.isArray(e?.data?.error) ? e.data.error.map((x: any) => x.message).join(", ") : e?.data?.error) ||
  e?.message ||
  fallback;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const money = (v: unknown) => `${CURRENCY} ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPageNumbers = (current: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
};

const labelCls = "font-semibold text-base-content/70 text-[11px]";
const inputCls = "input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs";

// -----------------------------------------------------------------------------
// SMALL PIECES
// -----------------------------------------------------------------------------

const OrgLogo = ({
  url,
  name,
  size = "w-10 h-10",
  icon = 18,
  verified = false,
}: {
  url?: string | null;
  name?: string;
  size?: string;
  icon?: number;
  verified?: boolean;
}) => (
  <div
    className={`${size} rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border overflow-hidden ${
      verified ? "border-success/50 ring-2 ring-success/50 ring-offset-2 ring-offset-base-100" : "border-base-200"
    }`}
  >
    {url ? <img src={url} alt={name || "Logo"} className="w-full h-full object-cover" /> : <Building2 size={icon} />}
  </div>
);

const ModalShell = ({
  title,
  icon,
  onClose,
  children,
  maxW = "max-w-md",
  z = "z-[85]",
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
  z?: string;
}) => (
  <div
    style={{ top: NAVBAR_HEIGHT }}
    className={`fixed inset-x-0 bottom-0 ${z} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm`}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={title}
      style={{ maxHeight: `calc(100vh - ${NAVBAR_HEIGHT} - 2rem)` }}
      className={`bg-base-100 border border-base-200 w-full ${maxW} rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 overflow-y-auto`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

/** Uploads the picked image to Cloudinary and returns its secure URL through onChange */
const LogoUploader = ({
  value,
  name,
  onChange,
  onBusy,
}: {
  value: string;
  name?: string;
  onChange: (url: string) => void;
  onBusy: (busy: boolean) => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > MAX_LOGO_MB * 1024 * 1024) return setError(`Image must be smaller than ${MAX_LOGO_MB}MB.`);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      setUploading(true);
      onBusy(true);
      setProgress(0);
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, fd, {
        onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / (p.total || 1))),
      });
      onChange(res.data.secure_url);
    } catch {
      setError("Logo upload failed. Please try again.");
    } finally {
      setUploading(false);
      onBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>Organization logo</label>
      <div className="flex items-center gap-3">
        <OrgLogo url={value} name={name} size="w-14 h-14" icon={24} />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`btn btn-sm btn-outline rounded-xl text-xs font-bold gap-2 ${uploading ? "btn-disabled" : ""}`}>
              <UploadCloud size={14} />
              {value ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            {value && !uploading && (
              <button type="button" onClick={() => onChange("")} className="btn btn-ghost btn-sm rounded-xl text-xs font-bold text-error hover:bg-error/10">
                Remove
              </button>
            )}
          </div>
          <span className="text-[11px] text-base-content/50">PNG, JPG or WEBP, up to {MAX_LOGO_MB}MB</span>
        </div>
      </div>
      {uploading && (
        <div className="flex flex-col gap-1">
          <progress className="progress progress-primary w-full h-1.5" value={progress} max={100} />
          <span className="text-[11px] font-bold text-primary">{progress}% uploaded</span>
        </div>
      )}
      {error && <span className="text-[11px] font-semibold text-error">{error}</span>}
    </div>
  );
};

// -----------------------------------------------------------------------------
// CREATE / EDIT MODAL
// -----------------------------------------------------------------------------

type OrgForm = {
  name: string;
  slug: string;
  supportEmail: string;
  supportPhone: string;
  logoUrl: string;
  payoutPhone: string;
  payoutType: string;
  commissionPercentage: string;
};

const EMPTY_FORM: OrgForm = {
  name: "",
  slug: "",
  supportEmail: "",
  supportPhone: "",
  logoUrl: "",
  payoutPhone: "",
  payoutType: "mpesa_phone",
  commissionPercentage: "5.00",
};

const OrgFormModal = ({
  org,
  onClose,
  onSuccess,
  onError,
}: {
  org?: any | null;
  onClose: () => void;
  onSuccess: (message: string, newId?: number) => void;
  onError: (message: string) => void;
}) => {
  const isEdit = Boolean(org);
  const [form, setForm] = useState<OrgForm>(
    org
      ? {
          ...EMPTY_FORM,
          name: org.name ?? "",
          slug: org.slug ?? "",
          supportEmail: org.supportEmail ?? "",
          supportPhone: org.supportPhone ?? "",
          logoUrl: org.logoUrl ?? "",
        }
      : EMPTY_FORM
  );
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formError, setFormError] = useState("");

  const [createOrganization, { isLoading: creating }] = useCreateOrganizationMutation();
  const [updateOrganization, { isLoading: updating }] = useUpdateOrganizationMutation();
  const loading = creating || updating || uploadingLogo;

  const set = <K extends keyof OrgForm>(k: K, v: OrgForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) return setFormError("Give the organization a name.");
    if (!isEdit && !form.slug.trim()) return setFormError("The URL slug is required.");
    if (!isEdit) {
      const c = Number(form.commissionPercentage);
      if (Number.isNaN(c) || c < 0 || c > 100) return setFormError("Commission must be between 0 and 100.");
    }

    try {
      if (isEdit && org) {
        await updateOrganization({
          orgId: orgIdOf(org),
          data: {
            name: form.name.trim(),
            supportEmail: form.supportEmail.trim() || null,
            supportPhone: form.supportPhone.trim() || null,
            logoUrl: form.logoUrl || null,
          },
        }).unwrap();
        onSuccess(`"${form.name.trim()}" was updated.`);
      } else {
        const created: any = await createOrganization({
          name: form.name.trim(),
          slug: slugify(form.slug),
          supportEmail: form.supportEmail.trim() || null,
          supportPhone: form.supportPhone.trim() || null,
          logoUrl: form.logoUrl || null,
          payoutPhone: form.payoutPhone.trim() || null,
          payoutType: form.payoutType as any,
          commissionPercentage: Number(form.commissionPercentage).toFixed(2),
        }).unwrap();
        onSuccess(`"${form.name.trim()}" was created.`, Number(created?.orgId ?? created?.id ?? created?.data?.orgId));
      }
    } catch (err: any) {
      const msg = errMsg(err, isEdit ? "Failed to update the organization." : "Failed to create the organization.");
      setFormError(msg);
      onError(msg);
    }
  };

  return (
    <ModalShell
      title={isEdit ? "Edit Organization" : "Create Organization"}
      icon={isEdit ? <Pencil size={16} /> : <Plus size={16} />}
      onClose={onClose}
      maxW="max-w-xl"
      z="z-[88]"
    >
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <LogoUploader value={form.logoUrl} name={form.name} onChange={(u) => set("logoUrl", u)} onBusy={setUploadingLogo} />

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Organization name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!isEdit && !slugEdited) set("slug", slugify(e.target.value));
            }}
            placeholder="e.g. Tech Fest Kenya"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>URL slug {isEdit ? "(cannot be changed)" : "*"}</label>
          <input
            className={`${inputCls} ${isEdit ? "opacity-60" : ""}`}
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              set("slug", e.target.value);
            }}
            placeholder="tech-fest-kenya"
            disabled={isEdit}
            required={!isEdit}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Support email</label>
            <input type="email" className={inputCls} value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} placeholder="support@domain.co.ke" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Support phone</label>
            <input className={inputCls} value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} placeholder="+254712345678" />
          </div>
        </div>

        {!isEdit && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Payout phone / account</label>
                <input className={inputCls} value={form.payoutPhone} onChange={(e) => set("payoutPhone", e.target.value)} placeholder="+254712345678" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Payout type</label>
                <select className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs" value={form.payoutType} onChange={(e) => set("payoutType", e.target.value)}>
                  {PAYOUT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Platform commission (%)</label>
              <input type="number" step="0.01" min="0" max="100" className={inputCls} value={form.commissionPercentage} onChange={(e) => set("commissionPercentage", e.target.value)} />
            </div>
          </>
        )}

        {isEdit && (
          <div className="flex items-start gap-2 bg-info/5 border border-info/20 text-info rounded-xl p-3 text-[11px] font-semibold">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>Payout details and commission are changed from their own buttons on the organization's details page.</span>
          </div>
        )}

        {formError && (
          <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
            {loading ? <span className="loading loading-spinner loading-xs" /> : isEdit ? "Save changes" : "Create organization"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// PAYOUT + COMMISSION MODALS
// -----------------------------------------------------------------------------

const PayoutModal = ({ org, onClose, onSuccess, onError }: { org: any; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) => {
  const [phone, setPhone] = useState(org.payoutPhone ?? "");
  const [type, setType] = useState(org.payoutType ?? "mpesa_phone");
  const [updatePayout, { isLoading }] = useUpdatePayoutConfigMutation();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updatePayout({ orgId: orgIdOf(org), data: { payoutPhone: phone.trim(), payoutType: type } }).unwrap();
      onSuccess(`Payout settings for "${org.name}" were updated.`);
    } catch (err: any) {
      onError(errMsg(err, "Failed to update the payout settings."));
    }
  };

  return (
    <ModalShell title="Payout Settings" icon={<Wallet size={16} />} onClose={onClose} z="z-[91]">
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <p className="text-[11px] text-base-content/60">
          Where <span className="font-bold text-base-content">{org.name}</span> receives its earnings.
        </p>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Payout phone / account number</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Payout type</label>
          <select className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs" value={type} onChange={(e) => setType(e.target.value)}>
            {PAYOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
            {isLoading ? <span className="loading loading-spinner loading-xs" /> : "Save payout"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const CommissionModal = ({ org, onClose, onSuccess, onError }: { org: any; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) => {
  const [value, setValue] = useState(String(org.commissionPercentage ?? "5.00"));
  const [updateCommission, { isLoading }] = useUpdateCommissionMutation();
  const n = Number(value);
  const valid = value !== "" && !Number.isNaN(n) && n >= 0 && n <= 100;
  const example = 10000;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await updateCommission({ orgId: orgIdOf(org), data: { commissionPercentage: n.toFixed(2) } }).unwrap();
      onSuccess(`Commission for "${org.name}" is now ${n.toFixed(2)}%.`);
    } catch (err: any) {
      onError(errMsg(err, "Failed to update the commission."));
    }
  };

  return (
    <ModalShell title="Platform Commission" icon={<Percent size={16} />} onClose={onClose} z="z-[91]">
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <p className="text-[11px] text-base-content/60">
          The share of each ticket sale that the platform keeps from <span className="font-bold text-base-content">{org.name}</span>. It applies to
          new payments.
        </p>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Commission (%)</label>
          <input type="number" step="0.01" min="0" max="100" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        {valid && (
          <div className="rounded-xl bg-base-200/50 border border-base-200 p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-base-content/50 font-semibold">Ticket sale</p>
              <p className="text-xs font-black">{money(example)}</p>
            </div>
            <div>
              <p className="text-[10px] text-base-content/50 font-semibold">Platform keeps</p>
              <p className="text-xs font-black text-warning">{money((example * n) / 100)}</p>
            </div>
            <div>
              <p className="text-[10px] text-base-content/50 font-semibold">Organizer gets</p>
              <p className="text-xs font-black text-success">{money(example - (example * n) / 100)}</p>
            </div>
          </div>
        )}
        {!valid && value !== "" && <span className="text-[11px] font-semibold text-error">Enter a number between 0 and 100.</span>}
        <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button type="submit" disabled={isLoading || !valid} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
            {isLoading ? <span className="loading loading-spinner loading-xs" /> : "Save commission"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// CONFIRM MODAL (verify, unverify, suspend, activate, delete)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// OWNER VERIFICATION CHECK (KYC)
// -----------------------------------------------------------------------------

const VERIFICATION_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "badge-warning" },
  in_progress: { label: "In review", cls: "badge-info" },
  approved: { label: "Approved", cls: "badge-success" },
  rejected: { label: "Rejected", cls: "badge-error" },
  resubmission_required: { label: "Resubmission required", cls: "badge-warning" },
};

/** Checks whether the organization's owner has an approved identity verification. */
const useOwnerVerification = (org: any, enabled: boolean) => {
  const orgId = orgIdOf(org);
  const verificationQ = useGetVerificationByOrganizationQuery(orgId, { skip: !enabled, refetchOnMountOrArgChange: true });
  const membersQ = useGetOrganizationMembersQuery(orgId, { skip: !enabled });

  const verification: any = verificationQ.data ?? null;
  const members = toArray((membersQ.data as any)?.members ?? membersQ.data);
  const owner = members.find((m: any) => m.orgRole === "owner");
  const status: string | undefined = verification?.status;

  const loading = enabled && (verificationQ.isLoading || verificationQ.isFetching || membersQ.isLoading);
  const noRecord = verificationQ.isError && (verificationQ.error as any)?.status === 404;
  const failed = verificationQ.isError && !noRecord;
  // The approved record must belong to the organization's owner, not to another user
  const ownerMismatch = Boolean(owner && verification && Number(verification.userId) !== Number(owner.digitalId));
  const ownerVerified = !loading && !verificationQ.isError && status === "approved" && !ownerMismatch;

  return { verification, status, loading, noRecord, failed, ownerMismatch, ownerVerified, retry: () => verificationQ.refetch() };
};

const OwnerVerificationPanel = ({ check }: { check: ReturnType<typeof useOwnerVerification> }) => {
  const { loading, noRecord, failed, ownerMismatch, ownerVerified, status, verification, retry } = check;
  const meta = status ? VERIFICATION_META[status] : undefined;
  const tone = loading
    ? "border-base-200 bg-base-200/40 text-base-content/70"
    : ownerVerified
      ? "border-success/30 bg-success/5 text-success"
      : "border-warning/30 bg-warning/5 text-warning";

  return (
    <div className={`w-full flex items-start gap-2 border rounded-xl px-3 py-2.5 text-[11px] font-semibold text-left ${tone}`}>
      {loading ? (
        <span className="loading loading-spinner loading-xs mt-0.5" />
      ) : ownerVerified ? (
        <ShieldCheck size={13} className="shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
      )}
      <div className="flex flex-col gap-1 min-w-0">
        {loading ? (
          <span>Checking the owner's identity verification…</span>
        ) : failed ? (
          <span>
            Could not check the owner's verification.{" "}
            <button type="button" onClick={retry} className="underline font-bold">
              Try again
            </button>
          </span>
        ) : noRecord ? (
          <span>The owner has not submitted identity verification yet.</span>
        ) : ownerMismatch ? (
          <span>This verification was submitted by a different user than the organization's owner.</span>
        ) : (
          <>
            <span className="flex items-center gap-1.5 flex-wrap">
              Owner verification:
              {meta && <span className={`badge badge-sm font-bold ${meta.cls}`}>{meta.label}</span>}
            </span>
            {status !== "approved" && (verification?.rejectionReason || verification?.adminComment) && (
              <span className="font-medium opacity-80">{verification.rejectionReason || verification.adminComment}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

type ConfirmType = "verify" | "unverify" | "suspend" | "activate" | "delete";

const CONFIRM_META: Record<ConfirmType, { title: string; button: string; tone: "primary" | "warning" | "error" | "success"; text: (n: string) => string }> = {
  verify: {
    title: "Verify this organization?",
    button: "Verify",
    tone: "success",
    text: (n) => `${n} will get the verified badge. This is only allowed once the owner's identity verification has been approved.`,
  },
  unverify: {
    title: "Remove the verified badge?",
    button: "Remove badge",
    tone: "warning",
    text: (n) => `${n} will no longer show as verified.`,
  },
  suspend: {
    title: "Suspend this organization?",
    button: "Suspend",
    tone: "warning",
    text: (n) => `${n} will be suspended. Its events and ticket sales should stop until you activate it again.`,
  },
  activate: {
    title: "Activate this organization?",
    button: "Activate",
    tone: "success",
    text: (n) => `${n} will be active again.`,
  },
  delete: {
    title: "Delete this organization?",
    button: "Delete forever",
    tone: "error",
    text: (n) => `${n} will be permanently deleted.`,
  },
};

const ConfirmModal = ({
  type,
  org,
  onClose,
  onSuccess,
  onError,
}: {
  type: ConfirmType;
  org: any;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [verifyOrg, verifyState] = useVerifyOrganizationMutation();
  const [toggleStatus, toggleState] = useToggleOrganizationStatusMutation();
  const [deleteOrg, deleteState] = useDeleteOrganizationMutation();
  const [typed, setTyped] = useState("");
  const [understood, setUnderstood] = useState(false);
  const isVerify = type === "verify";
  const ownerCheck = useOwnerVerification(org, isVerify);
  const verifyBlocked = isVerify && (ownerCheck.loading || !ownerCheck.ownerVerified);

  const meta = CONFIRM_META[type];
  const loading = verifyState.isLoading || toggleState.isLoading || deleteState.isLoading;
  const isDelete = type === "delete";
  const canDelete = typed.trim().toLowerCase() === String(org.name).trim().toLowerCase() && understood;

  const run = async () => {
    if (verifyBlocked) return;
    const orgId = orgIdOf(org);
    try {
      if (type === "verify") {
        await verifyOrg({ orgId, data: { isVerified: true } }).unwrap();
        onSuccess(`"${org.name}" is now verified.`);
      } else if (type === "unverify") {
        await verifyOrg({ orgId, data: { isVerified: false } }).unwrap();
        onSuccess(`The verified badge was removed from "${org.name}".`);
      } else if (type === "suspend") {
        await toggleStatus({ orgId, data: { isActive: false } }).unwrap();
        onSuccess(`"${org.name}" was suspended.`);
      } else if (type === "activate") {
        await toggleStatus({ orgId, data: { isActive: true } }).unwrap();
        onSuccess(`"${org.name}" is active again.`);
      } else {
        await deleteOrg(orgId).unwrap();
        onSuccess(`"${org.name}" was deleted.`);
      }
    } catch (err: any) {
      onError(errMsg(err, "That action failed. Please try again."));
    }
  };

  const toneBg = { primary: "bg-primary/10 text-primary", warning: "bg-warning/10 text-warning", error: "bg-error/10 text-error", success: "bg-success/10 text-success" }[meta.tone];
  const bar = {
    primary: "from-primary/70 via-primary to-primary/70",
    warning: "from-warning/70 via-warning to-warning/70",
    error: "from-error/70 via-error to-error/70",
    success: "from-success/70 via-success to-success/70",
  }[meta.tone];
  const btn = { primary: "btn-primary", warning: "btn-warning text-warning-content", error: "btn-error text-error-content", success: "btn-success text-success-content" }[meta.tone];

  return (
    <div
      style={{ top: NAVBAR_HEIGHT }}
      className="fixed inset-x-0 bottom-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(100vh - ${NAVBAR_HEIGHT} - 2rem)` }}
        className="relative bg-base-100 border border-base-200 w-full max-w-sm rounded-3xl shadow-2xl overflow-y-auto"
      >
        <div className={`h-1.5 bg-gradient-to-r ${bar}`} />
        <button onClick={onClose} disabled={loading} className="btn btn-ghost btn-xs btn-square rounded-lg absolute top-4 right-3" aria-label="Close">
          <X size={14} />
        </button>
        <div className="p-6 pt-7 flex flex-col items-center text-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${toneBg}`}>
            {type === "delete" ? <Trash2 size={24} /> : type === "suspend" ? <Ban size={24} /> : type === "unverify" ? <ShieldOff size={24} /> : type === "verify" ? <ShieldCheck size={24} /> : <PlayCircle size={24} />}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-black text-base">{meta.title}</h3>
            <p className="text-xs text-base-content/60 leading-relaxed">{meta.text(`"${org.name}"`)}</p>
          </div>

          <div className="w-full bg-base-200/50 border border-base-200 rounded-2xl p-3 text-left">
            <p className="font-bold text-xs truncate">{org.name}</p>
            <p className="text-[11px] text-base-content/60 mt-1">Organization #{orgIdOf(org)}</p>
          </div>

          {isVerify && <OwnerVerificationPanel check={ownerCheck} />}

          {isDelete && (
            <div className="w-full flex flex-col gap-3 text-left">
              <div className="flex items-start gap-2 border border-error/30 bg-error/5 text-error rounded-xl px-3 py-2.5 text-[11px] font-semibold">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  This also deletes everything that belongs to it: its team, venues, events, ticket types, bookings, tickets, payments, wallet and
                  payouts. This cannot be undone. If you only want to stop it from selling, suspend it instead.
                </span>
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-base-content/80">
                <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="checkbox checkbox-error checkbox-xs mt-0.5" />
                <span>I understand all of this will be deleted.</span>
              </label>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>
                  Type <span className="font-black text-base-content">{org.name}</span> to confirm
                </label>
                <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={org.name} />
              </div>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <button onClick={onClose} disabled={loading} className="btn btn-ghost bg-base-200/60 btn-sm rounded-xl flex-1 font-bold">
              Cancel
            </button>
            <button onClick={run} disabled={loading || verifyBlocked || (isDelete && !canDelete)} className={`btn btn-sm rounded-xl flex-1 font-bold ${btn}`}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : meta.button}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// TEAM TAB
// -----------------------------------------------------------------------------

type PickedUser = { digitalId: number; name: string; email?: string };

const normalizeUser = (u: any): PickedUser | null => {
  const digitalId = Number(u?.digitalId ?? u?.id);
  if (!digitalId) return null;
  const name = [u?.firstName ?? u?.first_name, u?.lastName ?? u?.last_name].filter(Boolean).join(" ") || u?.name || u?.email || `User #${digitalId}`;
  return { digitalId, name, email: u?.email };
};

const TeamTab = ({ org, onSuccess, onError }: { org: any; onSuccess: (m: string) => void; onError: (m: string) => void }) => {
  const orgId = orgIdOf(org);
  const membersQ = useGetOrganizationMembersQuery(orgId, { refetchOnMountOrArgChange: true });
  const members = toArray((membersQ.data as any)?.members ?? membersQ.data);

  const [addMember, { isLoading: adding }] = useAddOrganizationMemberMutation();
  const [updateRole] = useUpdateMemberRoleMutation();
  const [removeMember, { isLoading: removing }] = useRemoveOrganizationMemberMutation();

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<PickedUser | null>(null);
  const [role, setRole] = useState<OrgRole>("scanner");
  const [removeId, setRemoveId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 400);
    return () => clearTimeout(t);
  }, [term]);

  const searchQ = useSearchUsersByLastNameQuery(debounced, { skip: debounced.length < 2 || Boolean(picked) });
  const results = toArray((searchQ.data as any)?.users ?? searchQ.data)
    .map(normalizeUser)
    .filter((u): u is PickedUser => u !== null)
    .slice(0, 6);
  const memberIds = new Set(members.map((m: any) => Number(m.digitalId)));

  const handleAdd = async () => {
    if (!picked) return;
    try {
      await addMember({ orgId, digitalId: picked.digitalId, orgRole: role }).unwrap();
      onSuccess(`${picked.name} was added to "${org.name}".`);
      setPicked(null);
      setTerm("");
      setDebounced("");
    } catch (err: any) {
      onError(errMsg(err, "Failed to add the member."));
    }
  };

  const handleRole = async (memberId: number, newRole: OrgRole) => {
    try {
      await updateRole({ memberId, data: { orgRole: newRole } }).unwrap();
      onSuccess("Member role updated.");
    } catch (err: any) {
      onError(errMsg(err, "Failed to update the role."));
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await removeMember(memberId).unwrap();
      onSuccess("Member removed from the team.");
    } catch (err: any) {
      onError(errMsg(err, "Failed to remove the member."));
    } finally {
      setRemoveId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add member */}
      <div className="border border-base-200 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50 flex items-center gap-1.5">
          <Plus size={11} /> Add a team member
        </p>

        {picked ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0">{picked.name.charAt(0).toUpperCase()}</div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold truncate">{picked.name}</span>
              {picked.email && <span className="text-[11px] text-base-content/60 truncate">{picked.email}</span>}
            </div>
            <button type="button" onClick={() => setPicked(null)} className="btn btn-ghost btn-xs rounded-lg">
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 text-xs">
              <Search size={14} className="text-base-content/40" />
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search a user by last name" className="grow" />
              {searchQ.isFetching && <span className="loading loading-spinner loading-xs text-primary" />}
            </label>
            {debounced.length >= 2 && !searchQ.isFetching && (
              <div className="rounded-xl border border-base-200 overflow-hidden max-h-48 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="p-3 text-[11px] text-base-content/60">No users found with the last name "{debounced}".</p>
                ) : (
                  results.map((u) => {
                    const already = memberIds.has(u.digitalId);
                    return (
                      <button
                        key={u.digitalId}
                        type="button"
                        disabled={already}
                        onClick={() => setPicked(u)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-base-200/60 disabled:opacity-50 border-b border-base-200/60 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold truncate">{u.name}</span>
                          {u.email && <span className="text-[11px] text-base-content/60 truncate">{u.email}</span>}
                        </div>
                        {already && <span className="badge badge-sm badge-ghost font-bold">In team</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select className="select select-bordered select-sm rounded-xl text-xs flex-1" value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button onClick={handleAdd} disabled={!picked || adding} className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1">
            {adding ? <span className="loading loading-spinner loading-xs" /> : <Plus size={13} />}
            Add
          </button>
        </div>
      </div>

      {/* Members */}
      {membersQ.isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 bg-base-200/30 border border-dashed border-base-300 rounded-2xl">
          <Users size={28} className="mx-auto text-primary/40 mb-2" />
          <p className="text-xs font-bold">No team members yet</p>
        </div>
      ) : (
        <div className="border border-base-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs min-w-[460px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70">
                  <th>Member</th>
                  <th>Role</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const memberId = Number(m.id ?? m.memberId);
                  const name = [m.firstName ?? m.user?.firstName, m.lastName ?? m.user?.lastName].filter(Boolean).join(" ");
                  const isOwner = m.orgRole === "owner";
                  return (
                    <tr key={memberId} className="border-b border-base-100">
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold">{name || `User #${m.digitalId}`}</span>
                          <span className="text-[10px] text-base-content/50">Digital ID #{m.digitalId}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          className="select select-bordered select-xs rounded-lg font-semibold"
                          value={m.orgRole}
                          onChange={(e) => handleRole(memberId, e.target.value as OrgRole)}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right">
                        {removeId === memberId ? (
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => handleRemove(memberId)} disabled={removing} className="btn btn-error btn-xs rounded-lg text-error-content">
                              Remove
                            </button>
                            <button onClick={() => setRemoveId(null)} className="btn btn-ghost btn-xs rounded-lg">
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setRemoveId(memberId)}
                            disabled={isOwner}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg disabled:opacity-30"
                            title={isOwner ? "The owner cannot be removed" : "Remove from team"}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// DETAIL MODAL
// -----------------------------------------------------------------------------

type Tab = "overview" | "team" | "events" | "stats";

const Fact = ({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) => (
  <div className="bg-base-200/40 border border-base-200 rounded-xl p-3 min-w-0">
    <p className="text-[10px] uppercase font-bold text-base-content/50 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <div className="text-xs font-bold mt-1 break-words">{value}</div>
  </div>
);

const eventStatusCls = (s?: string) => {
  const k = String(s ?? "").toLowerCase();
  if (k === "upcoming") return "badge-info";
  if (k === "in_progress") return "badge-primary";
  if (k === "ended" || k === "completed") return "badge-success";
  if (k === "cancelled") return "badge-error";
  return "badge-ghost";
};

const DetailModal = ({
  org,
  onClose,
  onEdit,
  onPayout,
  onCommission,
  onConfirm,
  onSuccess,
  onError,
}: {
  org: any;
  onClose: () => void;
  onEdit: () => void;
  onPayout: () => void;
  onCommission: () => void;
  onConfirm: (t: ConfirmType) => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const orgId = orgIdOf(org);
  const [tab, setTab] = useState<Tab>("overview");
  const ownerCheck = useOwnerVerification(org, tab === "overview");

  // Always load fresh data when a tab is opened
  const eventsQ = useGetEventsByOrganizationQuery(orgId, { skip: tab !== "events", refetchOnMountOrArgChange: true });
  const events = toArray((eventsQ.data as any)?.events ?? eventsQ.data);
  const statsQ = useGetOrganizationStatsQuery(orgId, { skip: tab !== "stats", refetchOnMountOrArgChange: true });
  const stats: any = (statsQ.data as any)?.data ?? statsQ.data ?? {};

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Info size={13} /> },
    { key: "team", label: "Team", icon: <Users size={13} /> },
    { key: "events", label: "Events", icon: <CalendarDays size={13} /> },
    { key: "stats", label: "Stats", icon: <BarChart3 size={13} /> },
  ];

  return (
    <ModalShell title="Organization Details" icon={<Eye size={16} />} onClose={onClose} maxW="max-w-3xl" z="z-[86]">
      {/* Hero */}
      <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/25 via-base-200 to-secondary/20">
        {org.logoUrl && <img src={org.logoUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60" />}
        {org.isVerified && <div className="absolute inset-0 bg-gradient-to-br from-success/30 via-transparent to-primary/20" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4 text-white">
          <OrgLogo url={org.logoUrl} name={org.name} size="w-16 h-16" icon={28} verified={Boolean(org.isVerified)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`badge badge-sm font-bold ${org.isVerified ? "badge-success" : "badge-ghost"}`}>{org.isVerified ? "Verified" : "Not verified"}</span>
              <span className={`badge badge-sm font-bold ${org.isActive ? "badge-outline badge-success" : "badge-error"}`}>{org.isActive ? "Active" : "Suspended"}</span>
            </div>
            <h2 className="font-black text-xl sm:text-2xl leading-tight flex items-center gap-2">
              <span className="truncate">{org.name}</span>
              {org.isVerified && <BadgeCheck size={22} className="text-success shrink-0 drop-shadow" />}
            </h2>
            <p className="text-[11px] text-white/70 mt-0.5 truncate">
              @{org.slug} · Org #{orgId}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 rounded-xl p-1 self-start">
        {tabs.map((t) => (
          <button key={t.key} role="tab" onClick={() => setTab(t.key)} className={`tab text-[11px] font-bold rounded-lg gap-1.5 ${tab === t.key ? "tab-active" : ""}`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Fact label="Commission" value={`${org.commissionPercentage ?? "—"}%`} icon={<Percent size={10} />} />
            <Fact label="Payout" value={<span className="flex items-center gap-1">{payoutIcon(org.payoutType)} {payoutLabel(org.payoutType)}</span>} />
            <Fact label="Created" value={fmtDate(org.createdAt)} />
            <Fact label="Updated" value={fmtDate(org.updatedAt)} />
          </div>

          <OwnerVerificationPanel check={ownerCheck} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-base-200 rounded-2xl p-4 flex flex-col gap-2 text-xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50">Support contact</p>
              <span className="flex items-center gap-2 break-all">
                <Mail size={13} className="text-primary shrink-0" /> {org.supportEmail || "—"}
              </span>
              <span className="flex items-center gap-2">
                <Phone size={13} className="text-primary shrink-0" /> {org.supportPhone || "—"}
              </span>
            </div>
            <div className="border border-base-200 rounded-2xl p-4 flex flex-col gap-2 text-xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-base-content/50">Payout account</p>
              <span className="flex items-center gap-2">
                <Wallet size={13} className="text-primary shrink-0" /> {org.payoutPhone || "Not set"}
              </span>
              <span className="text-[11px] text-base-content/50">{payoutLabel(org.payoutType)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onEdit} className="btn btn-ghost bg-base-200 btn-sm rounded-xl text-xs font-bold gap-1.5">
              <Pencil size={13} /> Edit profile
            </button>
            <button onClick={onPayout} className="btn btn-ghost bg-base-200 btn-sm rounded-xl text-xs font-bold gap-1.5">
              <Wallet size={13} /> Payout settings
            </button>
            <button onClick={onCommission} className="btn btn-ghost bg-base-200 btn-sm rounded-xl text-xs font-bold gap-1.5">
              <Percent size={13} /> Commission
            </button>
          </div>
        </div>
      )}

      {tab === "team" && <TeamTab org={org} onSuccess={onSuccess} onError={onError} />}

      {tab === "events" && (
        <div className="flex flex-col gap-3">
          {eventsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 bg-base-200/30 border border-dashed border-base-300 rounded-2xl">
              <CalendarDays size={28} className="mx-auto text-primary/40 mb-2" />
              <p className="text-xs font-bold">No events yet</p>
            </div>
          ) : (
            <ul className="border border-base-200 rounded-2xl divide-y divide-base-200 overflow-hidden">
              {events.map((e: any) => (
                <li key={e.eventId ?? e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{e.title}</span>
                    <span className="text-[10px] text-base-content/50">{e.date ? String(e.date).slice(0, 10) : "No date"}</span>
                  </div>
                  <span className={`badge badge-sm font-bold capitalize ${eventStatusCls(e.status ?? e.eventStatus)}`}>
                    {String(e.status ?? e.eventStatus ?? "unknown").replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="flex flex-col gap-3">
          {statsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : statsQ.isError ? (
            <div className="alert alert-error text-xs rounded-xl">
              <AlertCircle size={16} />
              <span>Could not load the stats for this organization.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Fact label="Events" value={Number(stats.totalEvents ?? 0).toLocaleString()} icon={<CalendarDays size={10} />} />
              <Fact label="Tickets sold" value={Number(stats.totalTicketsSold ?? 0).toLocaleString()} icon={<TicketIcon size={10} />} />
              <Fact label="Revenue" value={money(stats.totalRevenue)} icon={<DollarSign size={10} />} />
              <Fact label="Active scanners" value={Number(stats.activeScannersCount ?? 0).toLocaleString()} icon={<ScanLine size={10} />} />
            </div>
          )}
        </div>
      )}

      {/* Admin actions */}
      <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-base-200">
        <button onClick={onClose} className="btn btn-ghost btn-sm rounded-xl font-bold mr-auto">
          Close
        </button>
        <button onClick={() => onConfirm("delete")} className="btn btn-ghost bg-error/10 text-error hover:bg-error/20 btn-sm rounded-xl font-bold gap-1">
          <Trash2 size={13} /> Delete
        </button>
        <button
          onClick={() => onConfirm(org.isActive ? "suspend" : "activate")}
          className={`btn btn-ghost btn-sm rounded-xl font-bold gap-1 ${org.isActive ? "bg-warning/10 text-warning hover:bg-warning/20" : "bg-success/10 text-success hover:bg-success/20"}`}
        >
          {org.isActive ? <Ban size={13} /> : <PlayCircle size={13} />}
          {org.isActive ? "Suspend" : "Activate"}
        </button>
        <button
          onClick={() => onConfirm(org.isVerified ? "unverify" : "verify")}
          className={`btn btn-sm rounded-xl font-bold gap-1 ${org.isVerified ? "btn-ghost bg-base-200" : "btn-primary"}`}
        >
          {org.isVerified ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
          {org.isVerified ? "Remove badge" : "Verify"}
        </button>
      </div>
    </ModalShell>
  );
};

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------

const NoOrganizationsFound = ({
  total,
  search,
  hasFilters,
  onClear,
  onCreate,
}: {
  total: number;
  search: string;
  hasFilters: boolean;
  onClear: () => void;
  onCreate: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden text-center py-14 px-6 bg-gradient-to-b from-base-200/40 to-base-200/10 rounded-3xl border border-dashed border-base-300"
  >
    <div className="relative flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        {search ? <Search size={30} /> : <Building2 size={30} />}
      </div>
      <div className="max-w-sm">
        <h3 className="font-black text-lg">{total === 0 ? "No organizations yet" : "No organizations found"}</h3>
        <p className="text-xs text-base-content/60 mt-1">
          {search
            ? `Nothing matches "${search}". Try another name, slug, email or ID.`
            : hasFilters
            ? "No organizations match the selected filters."
            : "Organizations appear here when organizers create them."}
        </p>
      </div>
      {search || hasFilters ? (
        <button onClick={onClear} className="btn btn-primary btn-sm rounded-xl gap-1.5 font-bold">
          <X size={13} />
          Clear filters
        </button>
      ) : (
        <button onClick={onCreate} className="btn btn-primary btn-sm rounded-xl gap-1.5 font-bold">
          <Plus size={13} />
          Create organization
        </button>
      )}
    </div>
  </motion.div>
);

const HowItWorks = () => {
  const [open, setOpen] = useState(false);
  const items = [
    { Icon: Search, title: "Find", text: "Search by name, slug, email, phone or ID, then filter by status or verification and sort the list." },
    { Icon: LayoutGrid, title: "Cards or table", text: "Switch between card and table view. Verified organizations are highlighted in green." },
    { Icon: Eye, title: "Open details", text: "Details shows the overview, team, events and stats of an organization. Everything updates right after a change." },
    { Icon: ShieldCheck, title: "Verify", text: "The badge can only be given after the owner's identity verification is approved. The check runs automatically." },
    { Icon: Ban, title: "Suspend or delete", text: "Suspending stops selling and can be undone. Deleting is permanent and removes the team, events, tickets and payments." },
    { Icon: Percent, title: "Commission and payout", text: "These apply to new payments only. Change them from the card, the table or the details page." },
  ];
  return (
    <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-bold">
          <span className="p-1.5 rounded-lg bg-info/10 text-info">
            <Info size={13} />
          </span>
          How this page works
        </span>
        <ChevronDown size={14} className={`text-base-content/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-base-200 pt-3">
              {items.map(({ Icon, title, text }) => (
                <div key={title} className="flex items-start gap-2.5 bg-base-200/40 border border-base-200 rounded-xl p-3">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{title}</p>
                    <p className="text-[11px] text-base-content/60 leading-relaxed mt-0.5">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrgCard = ({
  o,
  onView,
  onEdit,
  onCommission,
  onVerify,
  onStatus,
  onDelete,
}: {
  o: any;
  onView: () => void;
  onEdit: () => void;
  onCommission: () => void;
  onVerify: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) => {
  const verified = Boolean(o.isVerified);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 overflow-hidden ${
        verified
          ? "border-success/40 bg-gradient-to-br from-success/10 via-base-100 to-base-100 shadow-md shadow-success/10"
          : "border-base-200 bg-base-100 shadow-sm"
      } ${!o.isActive ? "opacity-80" : ""}`}
    >
      {verified && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success via-primary to-success" />}

      {/* Header */}
      <div className="flex items-start gap-3">
        <OrgLogo url={o.logoUrl} name={o.name} size="w-12 h-12" icon={20} verified={verified} />
        <div className="min-w-0 flex-1">
          <button onClick={onView} className="flex items-center gap-1.5 max-w-full text-left group">
            <span className="font-black text-sm truncate group-hover:text-primary transition-colors">{o.name}</span>
            {verified && <BadgeCheck size={16} className="text-success shrink-0" />}
          </button>
          <p className="text-[11px] text-base-content/50 truncate">
            @{o.slug} · #{orgIdOf(o)}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`badge badge-sm gap-1 font-bold ${verified ? "badge-success" : "badge-ghost"}`}>
              {verified ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
              {verified ? "Verified" : "Not verified"}
            </span>
            <span className={`badge badge-sm gap-1 font-bold ${o.isActive ? "badge-outline badge-success" : "badge-error"}`}>
              {o.isActive ? <CheckCircle2 size={10} /> : <Ban size={10} />}
              {o.isActive ? "Active" : "Suspended"}
            </span>
          </div>
        </div>
      </div>

      {/* Mini facts */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-base-200/50 border border-base-200 p-2 min-w-0">
          <p className="text-[10px] uppercase font-bold text-base-content/50 flex items-center gap-1">
            <Percent size={9} /> Commission
          </p>
          <p className="text-xs font-black mt-0.5">{o.commissionPercentage ?? "—"}%</p>
        </div>
        <div className="rounded-xl bg-base-200/50 border border-base-200 p-2 min-w-0">
          <p className="text-[10px] uppercase font-bold text-base-content/50">Payout</p>
          <p className="text-xs font-black mt-0.5 flex items-center gap-1 truncate">
            {payoutIcon(o.payoutType)} <span className="truncate">{payoutLabel(o.payoutType)}</span>
          </p>
        </div>
        <div className="rounded-xl bg-base-200/50 border border-base-200 p-2 min-w-0">
          <p className="text-[10px] uppercase font-bold text-base-content/50 flex items-center gap-1">
            <CalendarDays size={9} /> Created
          </p>
          <p className="text-xs font-black mt-0.5 truncate">{fmtDate(o.createdAt)}</p>
        </div>
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1 text-[11px] text-base-content/70">
        <span className="flex items-center gap-2 truncate">
          <Mail size={12} className="text-primary shrink-0" /> <span className="truncate">{o.supportEmail || "—"}</span>
        </span>
        <span className="flex items-center gap-2 truncate">
          <Phone size={12} className="text-primary shrink-0" /> <span className="truncate">{o.supportPhone || "—"}</span>
        </span>
        <span className="flex items-center gap-2 truncate">
          <Wallet size={12} className="text-primary shrink-0" /> <span className="truncate">{o.payoutPhone || "Payout not set"}</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-base-200">
        <button onClick={onView} className="btn btn-primary btn-xs rounded-lg font-bold gap-1">
          <Eye size={12} /> Details
        </button>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} className="btn btn-ghost btn-xs text-info hover:bg-info/10 rounded-lg" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={onCommission} className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 rounded-lg" title="Commission">
            <Percent size={13} />
          </button>
          <button
            onClick={onVerify}
            className={`btn btn-ghost btn-xs rounded-lg ${verified ? "text-base-content/60 hover:bg-base-200" : "text-success hover:bg-success/10"}`}
            title={verified ? "Remove the verified badge" : "Verify this organization"}
          >
            {verified ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
          </button>
          <button
            onClick={onStatus}
            className={`btn btn-ghost btn-xs rounded-lg ${o.isActive ? "text-warning hover:bg-warning/10" : "text-success hover:bg-success/10"}`}
            title={o.isActive ? "Suspend" : "Activate"}
          >
            {o.isActive ? <Ban size={13} /> : <PlayCircle size={13} />}
          </button>
          <button onClick={onDelete} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const AdminOrganizationManager = () => {
  usePageTitle("Organizations");

  const orgsQ = useGetAllOrganizationsAdminQuery(undefined, { refetchOnMountOrArgChange: true });
  const orgs = useMemo(() => toArray(orgsQ.data), [orgsQ.data]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [view, setView] = useState<"cards" | "table">("cards");

  // Modals store only ids, so every modal reads the live organization from the list
  // and refreshes automatically after any change.
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [payoutForId, setPayoutForId] = useState<number | null>(null);
  const [commissionForId, setCommissionForId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: ConfirmType; orgId: number; snapshot: any } | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const findOrg = (id: number | null) => (id !== null ? orgs.find((o) => orgIdOf(o) === id) ?? null : null);

  const viewing = findOrg(viewingId);
  const payoutFor = findOrg(payoutForId);
  const commissionFor = findOrg(commissionForId);
  // The snapshot fallback keeps the confirm modal alive after the org disappears from the list (delete)
  const confirm = confirmState ? { type: confirmState.type, org: findOrg(confirmState.orgId) ?? confirmState.snapshot } : null;

  const openConfirm = (type: ConfirmType, o: any) => setConfirmState({ type, orgId: orgIdOf(o), snapshot: o });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const notifySuccess = (m: string) => {
    setErrorMessage("");
    setSuccessMessage(m);
  };
  const notifyError = (m: string) => {
    setSuccessMessage("");
    setErrorMessage(m);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  // ---------------------------------------------------------------------------
  // FILTER + SORT + PAGINATE
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orgs.filter((o) => {
      if (statusFilter === "active" && !o.isActive) return false;
      if (statusFilter === "suspended" && o.isActive) return false;
      if (verifyFilter === "verified" && !o.isVerified) return false;
      if (verifyFilter === "unverified" && o.isVerified) return false;
      if (!q) return true;
      return (
        String(o.name || "").toLowerCase().includes(q) ||
        String(o.slug || "").toLowerCase().includes(q) ||
        String(o.supportEmail || "").toLowerCase().includes(q) ||
        String(o.supportPhone || "").toLowerCase().includes(q) ||
        String(orgIdOf(o)).includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sortKey === "name") return String(a.name).localeCompare(String(b.name));
      if (sortKey === "commission") return Number(b.commissionPercentage) - Number(a.commissionPercentage);
      return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0) || orgIdOf(b) - orgIdOf(a);
    });
  }, [orgs, search, statusFilter, verifyFilter, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, verifyFilter, sortKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  const verifiedCount = orgs.filter((o) => o.isVerified).length;
  const awaitingCount = orgs.filter((o) => !o.isVerified && o.isActive).length;
  const suspendedCount = orgs.filter((o) => !o.isActive).length;
  const hasFilters = statusFilter !== "all" || verifyFilter !== "all" || search !== "";

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setVerifyFilter("all");
  };

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Building2 size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">Organizations</h1>
            </div>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{orgs.length}</span> total organizations ·{" "}
              <span className="font-bold text-base-content">{verifiedCount}</span> verified · open any organization to see its team, events and stats
            </p>
          </div>
        </div>
        <button onClick={() => setFormMode("create")} className="btn btn-primary btn-sm rounded-xl font-bold gap-1.5 w-full sm:w-auto">
          <Plus size={15} /> Create organization
        </button>
      </div>

      <HowItWorks />

      {/* NOTIFICATIONS */}
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

      {/* METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total organizations", value: orgs.length, Icon: Building2, chip: "bg-primary/10 text-primary" },
          { label: "Verified", value: verifiedCount, Icon: ShieldCheck, chip: "bg-success/10 text-success" },
          { label: "Awaiting verification", value: awaitingCount, Icon: ShieldOff, chip: "bg-warning/10 text-warning" },
          { label: "Suspended", value: suspendedCount, Icon: Ban, chip: "bg-error/10 text-error" },
        ].map((m) => (
          <div key={m.label} className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] text-base-content/60 font-semibold">{m.label}</span>
              <div className="text-base sm:text-lg font-black">{m.value}</div>
            </div>
            <div className={`p-2.5 rounded-xl ${m.chip}`}>
              <m.Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search organizations by name, slug, email, phone or ID"
            className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs pl-9 pr-8"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle h-5 min-h-0 w-5"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={verifyFilter} onChange={(e) => setVerifyFilter(e.target.value as VerifyFilter)} className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold">
            <option value="all">All verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Not verified</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold">
            <option value="newest">Newest first</option>
            <option value="name">Name: A–Z</option>
            <option value="commission">Commission: high to low</option>
          </select>
        </div>

        <div className="join self-start lg:self-auto">
          <button
            onClick={() => setView("cards")}
            className={`btn btn-xs sm:btn-sm join-item gap-1 ${view === "cards" ? "btn-primary" : ""}`}
            aria-pressed={view === "cards"}
            title="Card view"
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            onClick={() => setView("table")}
            className={`btn btn-xs sm:btn-sm join-item gap-1 ${view === "table" ? "btn-primary" : ""}`}
            aria-pressed={view === "table"}
            title="Table view"
          >
            <List size={14} /> Table
          </button>
        </div>
      </div>

      {/* TABLE */}
      {orgsQ.isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : orgsQ.isError ? (
        <div className="alert alert-error text-xs font-semibold rounded-xl">
          <AlertCircle size={16} />
          <span className="flex-1">{errMsg((orgsQ as any).error, "Could not load organizations.")}</span>
          <button onClick={() => orgsQ.refetch()} className="btn btn-xs btn-ghost">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <NoOrganizationsFound total={orgs.length} search={search} hasFilters={hasFilters} onClear={clearFilters} onCreate={() => setFormMode("create")} />
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          {view === "table" ? (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs min-w-[980px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Payout</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Verified</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((o) => (
                  <tr key={orgIdOf(o)} className={`hover:bg-base-200/30 border-b border-base-100 transition-colors ${o.isVerified ? "bg-success/[0.04]" : ""}`}>
                    <td className="py-3 px-4">
                      <button onClick={() => setViewingId(orgIdOf(o))} className="flex items-center gap-2.5 min-w-0 text-left group">
                        <OrgLogo url={o.logoUrl} name={o.name} verified={Boolean(o.isVerified)} />
                        <div className="min-w-0">
                          <p className="font-bold truncate max-w-[220px] group-hover:text-primary transition-colors">{o.name}</p>
                          <p className="text-[11px] text-base-content/50 truncate">
                            @{o.slug} · #{orgIdOf(o)}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-[11px] text-base-content/70 max-w-[190px]">
                        <span className="truncate">{o.supportEmail || "—"}</span>
                        <span className="truncate">{o.supportPhone || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-[11px] text-base-content/70">
                        <span className="flex items-center gap-1 font-semibold">
                          {payoutIcon(o.payoutType)} {payoutLabel(o.payoutType)}
                        </span>
                        <span className="text-base-content/50">{o.payoutPhone || "Not set"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold">{o.commissionPercentage ?? "—"}%</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openConfirm(o.isVerified ? "unverify" : "verify", o)}
                        className={`badge badge-sm gap-1 font-bold cursor-pointer ${o.isVerified ? "badge-success" : "badge-ghost"}`}
                        title={o.isVerified ? "Remove the verified badge" : "Verify this organization"}
                      >
                        {o.isVerified ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
                        {o.isVerified ? "Verified" : "Not verified"}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openConfirm(o.isActive ? "suspend" : "activate", o)}
                        className={`badge badge-sm gap-1 font-bold cursor-pointer ${o.isActive ? "badge-outline badge-success" : "badge-error"}`}
                        title={o.isActive ? "Suspend this organization" : "Activate this organization"}
                      >
                        {o.isActive ? <CheckCircle2 size={10} /> : <Ban size={10} />}
                        {o.isActive ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-base-content/60 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => setViewingId(orgIdOf(o))} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View details">
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setViewingId(orgIdOf(o));
                            setFormMode("edit");
                          }}
                          className="btn btn-ghost btn-xs text-info hover:bg-info/10 rounded-lg"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setCommissionForId(orgIdOf(o))} className="btn btn-ghost btn-xs text-warning hover:bg-warning/10 rounded-lg" title="Commission">
                          <Percent size={13} />
                        </button>
                        <button onClick={() => openConfirm("delete", o)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paged.map((o) => (
                <OrgCard
                  key={orgIdOf(o)}
                  o={o}
                  onView={() => setViewingId(orgIdOf(o))}
                  onEdit={() => {
                    setViewingId(orgIdOf(o));
                    setFormMode("edit");
                  }}
                  onCommission={() => setCommissionForId(orgIdOf(o))}
                  onVerify={() => openConfirm(o.isVerified ? "unverify" : "verify", o)}
                  onStatus={() => openConfirm(o.isActive ? "suspend" : "activate", o)}
                  onDelete={() => openConfirm("delete", o)}
                />
              ))}
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-base-200 bg-base-200/30">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-base-content/60 font-semibold">
              <span>
                Showing{" "}
                <span className="text-base-content">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="text-base-content">{filtered.length}</span>
              </span>
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="select select-bordered select-xs rounded-lg font-semibold">
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {totalPages > 1 && (
              <div className="join">
                <button onClick={() => setPage(1)} disabled={safePage === 1} className="btn btn-xs join-item" aria-label="First page">
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="btn btn-xs join-item" aria-label="Previous page">
                  <ChevronLeft size={14} />
                </button>
                {getPageNumbers(safePage, totalPages).map((n, idx) =>
                  n === "…" ? (
                    <button key={`gap-${idx}`} className="btn btn-xs join-item btn-disabled" tabIndex={-1}>
                      …
                    </button>
                  ) : (
                    <button key={n} onClick={() => setPage(n)} className={`btn btn-xs join-item ${n === safePage ? "btn-primary" : ""}`} aria-current={n === safePage ? "page" : undefined}>
                      {n}
                    </button>
                  )
                )}
                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="btn btn-xs join-item" aria-label="Next page">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="btn btn-xs join-item" aria-label="Last page">
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {viewing && formMode !== "edit" && (
          <DetailModal
            key={`view-${orgIdOf(viewing)}`}
            org={viewing}
            onClose={() => setViewingId(null)}
            onEdit={() => setFormMode("edit")}
            onPayout={() => setPayoutForId(orgIdOf(viewing))}
            onCommission={() => setCommissionForId(orgIdOf(viewing))}
            onConfirm={(type) => openConfirm(type, viewing)}
            onSuccess={notifySuccess}
            onError={notifyError}
          />
        )}

        {formMode === "create" && (
          <OrgFormModal
            key="create"
            onClose={() => setFormMode(null)}
            onSuccess={(m, newId) => {
              setFormMode(null);
              notifySuccess(m);
              if (newId) setViewingId(newId);
            }}
            onError={notifyError}
          />
        )}

        {formMode === "edit" && viewing && (
          <OrgFormModal
            key={`edit-${orgIdOf(viewing)}`}
            org={viewing}
            onClose={() => setFormMode(null)}
            onSuccess={(m) => {
              setFormMode(null);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}

        {payoutFor && (
          <PayoutModal
            key={`payout-${orgIdOf(payoutFor)}`}
            org={payoutFor}
            onClose={() => setPayoutForId(null)}
            onSuccess={(m) => {
              setPayoutForId(null);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}

        {commissionFor && (
          <CommissionModal
            key={`commission-${orgIdOf(commissionFor)}`}
            org={commissionFor}
            onClose={() => setCommissionForId(null)}
            onSuccess={(m) => {
              setCommissionForId(null);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}

        {confirm && (
          <ConfirmModal
            key={`confirm-${confirm.type}-${orgIdOf(confirm.org)}`}
            type={confirm.type}
            org={confirm.org}
            onClose={() => setConfirmState(null)}
            onSuccess={(m) => {
              if (confirm.type === "delete") setViewingId(null);
              setConfirmState(null);
              notifySuccess(m);
            }}
            onError={(m) => {
              setConfirmState(null);
              notifyError(m);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrganizationManager;