import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Search,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  XCircle,
  RefreshCw,
  FileSearch,
  SearchX,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User as UserIcon,
  Building2,
  IdCard,
  Camera,
  FileText,
  Receipt,
  Flag,
  PlayCircle,
  ExternalLink,
  Fingerprint,
} from "lucide-react";
import {
  useGetAllVerificationsQuery,
  useGetVerificationsByStatusQuery,
  useGetVerificationsByEntityTypeQuery,
  useGetVerificationByIdQuery,
  useGetPendingVerificationsCountQuery,
  useGetVerificationsNeedingResubmissionQuery,
  useUpdateVerificationStatusMutation,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useRequestResubmissionMutation,
  useRejectVerificationFieldMutation,
  useDeleteVerificationMutation,
  type Verification,
  type VerificationStatus,
  type VerificationEntityType,
  type RejectableField,
} from "../../features/APIS/VerificationsApi"; // <-- adjust to where your verifications api file lives
import { useGetAllOrganizationsAdminQuery } from "../../features/APIS/organizationApi"; // <-- adjust to where your organizations api file lives
import usePageTitle from "../../hooks/usePageTitle";

// Height of your fixed top navbar (same value used in the layout).
const NAVBAR_HEIGHT = "5rem";
const PAGE_SIZE = 10;
const FETCH_LIMIT = 500; // admin list is fetched in one go, then searched / paged on the client

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toList = (data: any): Verification[] =>
  Array.isArray(data) ? data : data?.verifications ?? data?.data ?? [];
const errMsg = (e: any, fallback: string) => e?.data?.message || e?.data?.error || fallback;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-";

/**
 * Resolves an organization id to its name using the admin organizations list.
 * RTK Query caches the request, so calling this hook in several components
 * only hits the API once.
 */
const useOrgNames = () => {
  const { data } = useGetAllOrganizationsAdminQuery();
  // console.log(data);

  const map = useMemo(() => {
    const list: any[] = Array.isArray(data) ? data : (data as any)?.organizations ?? (data as any)?.data ?? [];
    const m = new Map<string, string>();
    list.forEach((o) => {
      if (o?.id !== undefined && o?.name) m.set(String(o.id), o.name);
    });
    return m;
  }, [data]);

  const getOrgName = (v: { orgId?: number | string | null; organizationName?: string | null }) =>
    map.get(String(v.orgId)) ?? (v as any).organizationName ?? (v.orgId != null ? `Org #${v.orgId}` : "-");

  return { getOrgName };
};

/**
 * The signed-in user's digitalId is kept in localStorage.
 * Supports a plain "digitalId" key, or a JSON object saved under a common key
 * (user / userInfo / auth / profile) that contains digitalId.
 */
const getStoredDigitalId = (): string | null => {
  try {
    const direct = localStorage.getItem("digitalId");
    if (direct) return direct.replace(/^"|"$/g, "");
    for (const key of ["user", "userInfo", "auth", "profile", "currentUser"]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const id = parsed?.digitalId ?? parsed?.user?.digitalId;
      if (id) return String(id);
    }
  } catch {
    /* ignore malformed storage */
  }
  return null;
};

const STATUS_META: Record<VerificationStatus, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Pending", cls: "badge-warning", Icon: Clock },
  in_progress: { label: "In progress", cls: "badge-info", Icon: PlayCircle },
  approved: { label: "Approved", cls: "badge-success", Icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "badge-error", Icon: XCircle },
  resubmission_required: { label: "Resubmission", cls: "badge-secondary", Icon: RefreshCw },
};

const StatusBadge = ({ status }: { status: VerificationStatus }) => {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`badge badge-sm gap-1 font-bold ${m.cls}`}>
      <m.Icon size={10} /> {m.label}
    </span>
  );
};

const labelCls = "font-semibold text-base-content/70 text-[11px]";

// ---------------------------------------------------------------------------
// Shared modal shell (sits below the fixed top navbar)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Image zoom lightbox (for ID photos, selfies and documents)
// ---------------------------------------------------------------------------
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const ImageZoomModal = ({ src, title, onClose }: { src: string; title: string; onClose: () => void }) => {
  const [scale, setScale] = useState(1);
  const clamp = (n: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(n * 100) / 100));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => clamp(s + 0.5));
      if (e.key === "-") setScale((s) => clamp(s - 0.5));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] bg-black/90 backdrop-blur-md flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-label="Document preview"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="font-black text-sm truncate min-w-0">{title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setScale((s) => clamp(s - 0.5))}
            disabled={scale <= MIN_ZOOM}
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10 disabled:opacity-30"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-[11px] font-bold w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => clamp(s + 0.5))}
            disabled={scale >= MAX_ZOOM}
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10 disabled:opacity-30"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setScale(1)}
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10"
            aria-label="Open original"
            title="Open original"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10 ml-1"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto flex p-4"
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) return;
          setScale((s) => clamp(s + (e.deltaY < 0 ? 0.25 : -0.25)));
        }}
      >
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={src}
          alt={title}
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => (s > 1 ? 1 : 2));
          }}
          draggable={false}
          style={{ height: `${scale * 70}vh`, width: "auto", maxWidth: scale === 1 ? "100%" : "none" }}
          className={`m-auto rounded-2xl object-contain shadow-2xl select-none transition-[height] duration-200 ${
            scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
        />
      </div>

      <p className="text-center text-[10px] text-white/40 pb-3" onClick={(e) => e.stopPropagation()}>
        Click the image or scroll to zoom · Esc to close
      </p>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Confirmation modal (reusable)
// ---------------------------------------------------------------------------
const CONFIRM_TONES = {
  danger: {
    iconWrap: "bg-error/10 text-error",
    ring: "bg-error/20",
    bar: "from-error/70 via-error to-error/70",
    btn: "btn-error text-error-content",
    note: "bg-error/5 border-error/20 text-error",
  },
  primary: {
    iconWrap: "bg-primary/10 text-primary",
    ring: "bg-primary/20",
    bar: "from-primary/70 via-primary to-primary/70",
    btn: "btn-primary",
    note: "bg-primary/5 border-primary/20 text-primary",
  },
} as const;

const ConfirmModal = ({
  tone = "danger",
  icon,
  title,
  description,
  subject,
  note,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: {
  tone?: keyof typeof CONFIRM_TONES;
  icon: ReactNode;
  title: string;
  description: ReactNode;
  subject?: ReactNode;
  note?: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const t = CONFIRM_TONES[tone];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  return (
    <div
      style={{ top: NAVBAR_HEIGHT }}
      className="fixed inset-x-0 bottom-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-label={title}
        className="relative bg-base-100 border border-base-200 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${t.bar}`} />
        <button
          onClick={onClose}
          disabled={loading}
          className="btn btn-ghost btn-xs btn-square rounded-lg absolute top-4 right-3"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        <div className="p-6 pt-7 flex flex-col items-center text-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <motion.span
              className={`absolute inset-0 rounded-full ${t.ring}`}
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${t.iconWrap}`}>{icon}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="font-black text-base text-base-content tracking-tight">{title}</h3>
            <p className="text-xs text-base-content/60 leading-relaxed px-1">{description}</p>
          </div>

          {subject && <div className="w-full bg-base-200/50 border border-base-200 rounded-2xl p-3 text-left">{subject}</div>}

          {note && (
            <div className={`w-full flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold text-left ${t.note}`}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost bg-base-200/60 hover:bg-base-200 btn-sm rounded-xl font-bold flex-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`btn btn-sm rounded-xl font-bold flex-1 text-xs shadow-sm ${t.btn}`}
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
const NoVerificationsFound = ({
  term,
  hasFilters,
  onClearSearch,
  onClearFilters,
}: {
  term: string;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
}) => {
  const hasTerm = term.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden text-center py-14 px-6 bg-gradient-to-b from-base-200/40 to-base-200/10 rounded-3xl border border-dashed border-base-300"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="absolute inset-3 rounded-full bg-primary/10" />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-16 h-16 rounded-2xl bg-base-100 border border-base-200 shadow-lg flex items-center justify-center text-primary"
          >
            {hasTerm ? <SearchX size={30} /> : <FileSearch size={30} />}
          </motion.div>
        </div>

        <div className="flex flex-col gap-1.5 max-w-sm">
          <h3 className="font-black text-lg text-base-content tracking-tight">No verifications found</h3>
          <p className="text-xs text-base-content/60 leading-relaxed">
            {hasTerm ? (
              <>
                Nothing matches{" "}
                <span className="font-bold text-base-content bg-base-200 px-1.5 py-0.5 rounded-md break-all">“{term}”</span>. Try a legal
                name, user ID, organization name or request number.
              </>
            ) : hasFilters ? (
              "No requests match the selected filters."
            ) : (
              "No organizer verification requests have been submitted yet."
            )}
          </p>
        </div>

        {(hasTerm || hasFilters) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasTerm && (
              <button onClick={onClearSearch} className="btn btn-primary btn-sm rounded-xl gap-1.5 text-xs font-bold shadow-sm">
                <X size={13} /> Clear search
              </button>
            )}
            {hasFilters && (
              <button onClick={onClearFilters} className="btn btn-ghost bg-base-200/70 btn-sm rounded-xl gap-1.5 text-xs font-bold">
                <ShieldCheck size={13} /> Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Review actions (approve / reject / resubmission / itemized / in-progress)
// ---------------------------------------------------------------------------
type ActionType = "approve" | "reject" | "resubmit" | "progress" | "field";
interface PendingAction {
  type: ActionType;
  verification: Verification;
  field?: RejectableField;
  fieldLabel?: string;
}

const ActionModal = ({
  action,
  onClose,
  onSuccess,
  onError,
}: {
  action: PendingAction;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [approve, approveState] = useApproveVerificationMutation();
  const [reject, rejectState] = useRejectVerificationMutation();
  const [resubmit, resubmitState] = useRequestResubmissionMutation();
  const [updateStatus, statusState] = useUpdateVerificationStatusMutation();
  const [rejectField, fieldState] = useRejectVerificationFieldMutation();
  const [text, setText] = useState("");

  const { type, verification: v, field, fieldLabel } = action;
  const loading =
    approveState.isLoading || rejectState.isLoading || resubmitState.isLoading || statusState.isLoading || fieldState.isLoading;

  // Rejecting an already-approved verification = revoking the approval
  const revoking = type === "reject" && v.status === "approved";
  // Approving an already-rejected verification = re-approving it
  const reapproving = type === "approve" && v.status === "rejected";
  // Moving a rejected verification back to "in progress" = reopening the review
  const reopening = type === "progress" && v.status === "rejected";

  const CONFIG: Record<ActionType, { title: string; icon: ReactNode; label: string; required: boolean; placeholder: string; cta: string; success: string; danger: boolean }> = {
    approve: reapproving
      ? {
          title: "Re-approve verification",
          icon: <CheckCircle2 size={16} />,
          label: "Reason for re-approving (optional)",
          required: false,
          placeholder: "Issue resolved after further review.",
          cta: "Re-approve",
          success: "Verification re-approved.",
          danger: false,
        }
      : {
          title: "Approve verification",
          icon: <CheckCircle2 size={16} />,
          label: "Comment (optional)",
          required: false,
          placeholder: "All compliance checks passed.",
          cta: "Approve",
          success: "Verification approved.",
          danger: false,
        },
    reject: revoking
      ? {
          title: "Revoke approval",
          icon: <XCircle size={16} />,
          label: "Reason for revoking this verification",
          required: true,
          placeholder: "Organizer was flagged / reported for fraudulent activity.",
          cta: "Revoke approval",
          success: "Approval revoked. Verification rejected.",
          danger: true,
        }
      : {
          title: "Reject verification",
          icon: <XCircle size={16} />,
          label: "Reason for rejection",
          required: true,
          placeholder: "Provided identification documents are fraudulent or blurry.",
          cta: "Reject",
          success: "Verification rejected.",
          danger: true,
        },
    resubmit: {
      title: "Request resubmission",
      icon: <RefreshCw size={16} />,
      label: "What should the organizer fix?",
      required: true,
      placeholder: "Please re-upload clearer documents.",
      cta: "Request resubmission",
      success: "Resubmission requested.",
      danger: false,
    },
    progress: reopening
      ? {
          title: "Reopen review",
          icon: <PlayCircle size={16} />,
          label: "Why are you reopening this review? (optional)",
          required: false,
          placeholder: "Organizer appealed the rejection. Reviewing again.",
          cta: "Reopen review",
          success: "Review reopened. Marked as in progress.",
          danger: false,
        }
      : {
          title: "Start review",
          icon: <PlayCircle size={16} />,
          label: "Comment (optional)",
          required: false,
          placeholder: "Review has started by compliance team.",
          cta: "Mark in progress",
          success: "Marked as in progress.",
          danger: false,
        },
    field: {
      title: `Flag ${fieldLabel ?? "document"}`,
      icon: <Flag size={16} />,
      label: "What is wrong with this document?",
      required: true,
      placeholder: "Corners are cut off. Please retake the photo.",
      cta: "Flag document",
      success: `${fieldLabel ?? "Document"} flagged for re-upload.`,
      danger: true,
    },
  };
  const cfg = CONFIG[type];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    try {
      if (type === "approve") await approve({ id: v.id, data: value ? { adminComment: value } : {} }).unwrap();
      if (type === "reject") await reject({ id: v.id, data: { reason: value } }).unwrap();
      if (type === "resubmit") await resubmit({ id: v.id, data: { generalComment: value } }).unwrap();
      if (type === "progress")
        await updateStatus({ id: v.id, data: { status: "in_progress", ...(value ? { adminComment: value } : {}) } }).unwrap();
      if (type === "field" && field) await rejectField({ id: v.id, field, data: { comment: value } }).unwrap();
      onSuccess(cfg.success);
    } catch (err: any) {
      onError(errMsg(err, "Action failed. Please try again."));
    }
  };

  return (
    <ModalShell title={cfg.title} icon={cfg.icon} onClose={onClose} z="z-[90]">
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <div className="bg-base-200/40 border border-base-200 rounded-xl p-3 flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserIcon size={14} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base-content truncate">{v.legalFullName}</p>
            <p className="text-[11px] text-base-content/60 truncate">
              Request #{v.id} · User {v.userId}
            </p>
          </div>
        </div>

        {revoking && (
          <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-error/5 border-error/20 text-error">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>This verification is currently approved. Rejecting it will revoke the organizer's verified status.</span>
          </div>
        )}

        {reapproving && (
          <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-success/10 border-success/30 text-success">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>This verification was rejected. Re-approving it will restore the organizer's verified status.</span>
          </div>
        )}

        {reopening && (
          <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-info/10 border-info/30 text-info">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>This verification was rejected. Reopening moves it back to "In progress" so it can be reviewed again.</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className={labelCls}>{cfg.label}</label>
          <textarea
            required={cfg.required}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={cfg.placeholder}
            className="textarea textarea-bordered rounded-xl w-full text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-xs sm:btn-sm rounded-xl font-bold ${cfg.danger ? "btn-error text-error-content" : "btn-primary"}`}
          >
            {loading ? <span className="loading loading-spinner loading-xs"></span> : cfg.cta}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Document card (image + optional rejection note)
// ---------------------------------------------------------------------------
const DocCard = ({
  label,
  icon,
  urls,
  rejection,
  canReview,
  onZoom,
  onFlag,
}: {
  label: string;
  icon: ReactNode;
  urls: string[];
  rejection?: string | null;
  canReview: boolean;
  onZoom: (src: string, title: string) => void;
  onFlag: () => void;
}) => {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  return (
    <div className={`border rounded-2xl p-3 flex flex-col gap-2 ${rejection ? "border-error/30 bg-error/5" : "border-base-200 bg-base-200/30"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-base-content">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        {canReview && (
          <button onClick={onFlag} className="btn btn-ghost btn-xs gap-1 rounded-lg text-error hover:bg-error/10 text-[11px]">
            <Flag size={11} /> Flag
          </button>
        )}
      </div>

      {urls.length === 0 ? (
        <div className="text-[11px] text-base-content/50 italic py-6 text-center">Not provided</div>
      ) : (
        <div className={`grid gap-2 ${urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {urls.map((src, i) =>
            broken[src] ? (
              <a
                key={src + i}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="h-32 rounded-xl border border-base-200 bg-base-100 flex flex-col items-center justify-center gap-1 text-[11px] text-primary font-semibold"
              >
                <ExternalLink size={16} /> Open file
              </a>
            ) : (
              <button
                key={src + i}
                type="button"
                onClick={() => onZoom(src, urls.length > 1 ? `${label} ${i + 1}` : label)}
                className="relative group h-32 rounded-xl overflow-hidden border border-base-200 bg-base-100 cursor-zoom-in"
                aria-label={`Zoom ${label}`}
              >
                <img src={src} alt={label} onError={() => setBroken((b) => ({ ...b, [src]: true }))} className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn size={18} />
                </span>
              </button>
            )
          )}
        </div>
      )}

      {rejection && (
        <div className="flex items-start gap-1.5 text-[11px] font-semibold text-error">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span className="break-words">{rejection}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// View / review modal
// ---------------------------------------------------------------------------
const ViewVerificationModal = ({
  row,
  myId,
  onClose,
  onAction,
  onZoom,
}: {
  row: Verification;
  myId: string | null;
  onClose: () => void;
  onAction: (a: PendingAction) => void;
  onZoom: (src: string, title: string) => void;
}) => {
  const { data, isLoading, isError } = useGetVerificationByIdQuery(row.id);
  const { getOrgName } = useOrgNames();
  const v: Verification = (data as any)?.verification ?? (data as any)?.data ?? data ?? row;
  const orgName = getOrgName(v);

  // An admin can't review their own verification request
  const isOwn = myId !== null && String(v.userId) === String(myId);
  const isApproved = v.status === "approved";
  const isRejected = v.status === "rejected";
  // Full review (approve / reject / resubmit / flag) is only for open requests
  const canReview = !isOwn && !isApproved && !isRejected;
  // An approved verification can still be revoked later (flagged / reported organizer)
  const canRevoke = !isOwn && isApproved;
  // A rejected verification can be re-approved or sent back into review
  const canReapprove = !isOwn && isRejected;

  const flag = (field: RejectableField, fieldLabel: string) => onAction({ type: "field", verification: v, field, fieldLabel });

  return (
    <ModalShell title="Verification Review" icon={<ShieldCheck size={16} />} onClose={onClose} maxW="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {v.entityType === "business" ? <Building2 size={20} /> : <UserIcon size={20} />}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-base-content truncate">{v.legalFullName}</p>
            <p className="text-[11px] text-base-content/60 truncate">
              Request #{v.id} · User {v.userId} · {orgName}
            </p>
          </div>
        </div>
        <StatusBadge status={v.status} />
      </div>

      {isOwn && (
        <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-warning/10 border-warning/30 text-warning">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>This is your own verification request. Another admin must review it.</span>
        </div>
      )}

      {canRevoke && (
        <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-info/10 border-info/30 text-info">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>This organizer is verified. If they are flagged or reported, you can still revoke the approval.</span>
        </div>
      )}

      {canReapprove && (
        <div className="flex items-start gap-2 border rounded-xl px-3 py-2 text-[11px] font-semibold bg-info/10 border-info/30 text-info">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>This verification was rejected. You can re-approve it, or reopen the review to check the documents again.</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-sm text-primary"></span>
        </div>
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>Could not load the latest details.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: "Entity type", val: v.entityType },
              { k: "Submitted", val: fmtDate(v.createdAt) },
              { k: "Last updated", val: fmtDate(v.updatedAt) },
              { k: "Organization", val: orgName },
            ].map((i) => (
              <div key={i.k} className="bg-base-200/40 border border-base-200 rounded-xl p-3 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">{i.k}</p>
                <p className="text-xs font-semibold text-base-content mt-0.5 capitalize break-words">{i.val}</p>
              </div>
            ))}
          </div>

          {(v.adminComment || v.rejectionReason) && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2 text-xs">
              <Info size={14} className="text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5 min-w-0">
                {v.adminComment && (
                  <p className="text-base-content/80 break-words">
                    <span className="font-bold">Admin note:</span> {v.adminComment}
                  </p>
                )}
                {v.rejectionReason && (
                  <p className="text-base-content/80 break-words">
                    <span className="font-bold">Rejection reason:</span> {v.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocCard
              label="ID front"
              icon={<IdCard size={13} />}
              urls={v.idFrontUrl ? [v.idFrontUrl] : []}
              rejection={v.idFrontRejection}
              canReview={canReview}
              onZoom={onZoom}
              onFlag={() => flag("id-front", "ID front")}
            />
            <DocCard
              label="ID back"
              icon={<IdCard size={13} />}
              urls={v.idBackUrl ? [v.idBackUrl] : []}
              rejection={v.idBackRejection}
              canReview={canReview}
              onZoom={onZoom}
              onFlag={() => flag("id-back", "ID back")}
            />
            <DocCard
              label="Selfies"
              icon={<Camera size={13} />}
              urls={v.selfiePhotos ?? []}
              rejection={v.selfiesRejection}
              canReview={canReview}
              onZoom={onZoom}
              onFlag={() => flag("selfies", "Selfies")}
            />
            {(v.entityType === "business" || v.businessDocUrl) && (
              <DocCard
                label="Business document"
                icon={<FileText size={13} />}
                urls={v.businessDocUrl ? [v.businessDocUrl] : []}
                rejection={v.businessDocRejection}
                canReview={canReview}
                onZoom={onZoom}
                onFlag={() => flag("business-doc", "Business document")}
              />
            )}
            {(v.entityType === "business" || v.taxCertUrl) && (
              <DocCard
                label="Tax certificate"
                icon={<Receipt size={13} />}
                urls={v.taxCertUrl ? [v.taxCertUrl] : []}
                rejection={v.taxCertRejection}
                canReview={canReview}
                onZoom={onZoom}
                onFlag={() => flag("tax-cert", "Tax certificate")}
              />
            )}
          </div>
        </>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-base-200">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold mr-auto">
          Close
        </button>
        {canReview && (
          <>
            {(v.status === "pending" || v.status === "resubmission_required") && (
              <button
                onClick={() => onAction({ type: "progress", verification: v })}
                className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold gap-1 bg-info/10 text-info hover:bg-info/20"
              >
                <PlayCircle size={13} /> Start review
              </button>
            )}
            <button
              onClick={() => onAction({ type: "resubmit", verification: v })}
              className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold gap-1 bg-secondary/10 text-secondary hover:bg-secondary/20"
            >
              <RefreshCw size={13} /> Resubmission
            </button>
            <button
              onClick={() => onAction({ type: "reject", verification: v })}
              className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold gap-1 bg-error/10 text-error hover:bg-error/20"
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              onClick={() => onAction({ type: "approve", verification: v })}
              className="btn btn-success btn-xs sm:btn-sm rounded-xl font-bold gap-1 text-success-content"
            >
              <CheckCircle2 size={13} /> Approve
            </button>
          </>
        )}
        {canRevoke && (
          <button
            onClick={() => onAction({ type: "reject", verification: v })}
            className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold gap-1 bg-error/10 text-error hover:bg-error/20"
          >
            <XCircle size={13} /> Revoke approval
          </button>
        )}
        {canReapprove && (
          <>
            <button
              onClick={() => onAction({ type: "progress", verification: v })}
              className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold gap-1 bg-info/10 text-info hover:bg-info/20"
            >
              <PlayCircle size={13} /> Reopen review
            </button>
            <button
              onClick={() => onAction({ type: "approve", verification: v })}
              className="btn btn-success btn-xs sm:btn-sm rounded-xl font-bold gap-1 text-success-content"
            >
              <CheckCircle2 size={13} /> Re-approve
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Delete verification (confirmation)
// ---------------------------------------------------------------------------
const DeleteVerificationModal = ({
  verification,
  onClose,
  onSuccess,
  onError,
}: {
  verification: Verification;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [del, { isLoading }] = useDeleteVerificationMutation();

  const confirm = async () => {
    try {
      await del(verification.id).unwrap();
      onSuccess("Verification record deleted.");
    } catch (err: any) {
      onError(errMsg(err, "Failed to delete verification."));
    }
  };

  return (
    <ConfirmModal
      tone="danger"
      icon={<Trash2 size={26} />}
      title="Delete this record?"
      description="The verification request and its submitted documents will be permanently removed."
      subject={
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-base-content truncate">{verification.legalFullName}</p>
            <p className="text-[11px] text-base-content/60 truncate">
              Request #{verification.id} · User {verification.userId}
            </p>
          </div>
          <StatusBadge status={verification.status} />
        </div>
      }
      note="This action cannot be undone."
      confirmLabel="Yes, delete"
      loading={isLoading}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
};

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export const AdminVerificationManager = () => {
  usePageTitle("Verifications");

  // The signed-in admin's digitalId (from localStorage)
  const myId = useMemo(() => getStoredDigitalId(), []);

  // Organization id -> name resolver
  const { getOrgName } = useOrgNames();

  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VerificationStatus>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | VerificationEntityType>("all");
  const [page, setPage] = useState(1);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [viewing, setViewing] = useState<Verification | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [deleting, setDeleting] = useState<Verification | null>(null);
  const [zoom, setZoom] = useState<{ src: string; title: string } | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const notifySuccess = (msg: string) => {
    setErrorMessage("");
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };
  const notifyError = (msg: string) => {
    setSuccessMessage("");
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Everything (used for the metric cards and as the default list)
  const all = useGetAllVerificationsQuery({ limit: FETCH_LIMIT, offset: 0 });
  const byStatus = useGetVerificationsByStatusQuery(statusFilter as VerificationStatus, { skip: statusFilter === "all" });
  const byEntity = useGetVerificationsByEntityTypeQuery(entityFilter as VerificationEntityType, {
    skip: statusFilter !== "all" || entityFilter === "all",
  });
  const pendingCount = useGetPendingVerificationsCountQuery();
  const needingResub = useGetVerificationsNeedingResubmissionQuery();

  const source = statusFilter !== "all" ? byStatus : entityFilter !== "all" ? byEntity : all;

  const allRows = useMemo(() => toList(all.data), [all.data]);
  const rows = useMemo(() => toList(source.data), [source.data]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return rows
      .filter((v) => (entityFilter === "all" ? true : v.entityType === entityFilter))
      .filter((v) => {
        if (!q) return true;
        const hay = `${v.legalFullName ?? ""} ${v.userId ?? ""} ${v.orgId ?? ""} ${getOrgName(v)} ${v.id ?? ""} ${v.status ?? ""}`.toLowerCase();
        return q.split(/\s+/).every((t) => hay.includes(t));
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, entityFilter, debounced, getOrgName]);

  useEffect(() => setPage(1), [debounced, statusFilter, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const countStatus = (s: VerificationStatus) => allRows.filter((v) => v.status === s).length;
  const pendingTotal = pendingCount.data?.count ?? countStatus("pending");
  const resubTotal = toList(needingResub.data).length || countStatus("resubmission_required");

  const hasFilters = statusFilter !== "all" || entityFilter !== "all";
  const isLoading = source.isLoading || (source.isFetching && filtered.length === 0);

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER BAR                                                          */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Verifications</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Admin</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{pendingTotal}</span> waiting for review ·{" "}
              <span className="font-bold text-base-content">{allRows.length}</span> total requests
            </p>
          </div>
        </div>

        {myId && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-base-content/60 bg-base-100 border border-base-200 rounded-xl px-3 py-2">
            <Fingerprint size={13} className="text-primary" />
            Reviewing as ID <span className="font-bold text-base-content">{myId}</span>
          </div>
        )}
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
              <span className="font-bold text-base-content">Verification Guide & Features</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Search by legal name, user ID or organization name, and filter by status or entity type. Open a request
                to inspect the ID photos, selfies and documents (click any image to zoom). Flag a single document for
                re-upload, ask for a full resubmission, or approve / reject the whole request. Approved organizers can
                still be revoked later if they are flagged or reported, and rejected requests can be re-approved or
                reopened for another review.
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

      {/* Global notifications */}
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

      {/* =================================================================== */}
      {/* METRICS                                                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pendingTotal, Icon: Hourglass, chip: "bg-warning/10 text-warning" },
          { label: "Needs resubmission", value: resubTotal, Icon: RefreshCw, chip: "bg-secondary/10 text-secondary" },
          { label: "Approved", value: countStatus("approved"), Icon: CheckCircle2, chip: "bg-success/10 text-success" },
          { label: "Rejected", value: countStatus("rejected"), Icon: XCircle, chip: "bg-error/10 text-error" },
        ].map((m) => (
          <div key={m.label} className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-base-content/60 font-semibold">{m.label}</span>
              <span className="text-base sm:text-lg font-black text-base-content">{m.value}</span>
            </div>
            <div className={`p-2.5 rounded-xl ${m.chip}`}>
              <m.Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* =================================================================== */}
      {/* TOOLBAR                                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by legal name, user ID or organization name"
            className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs pl-9 pr-8"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle h-5 min-h-0 w-5 text-base-content/50"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-48 font-semibold"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_META) as VerificationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as any)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-44 font-semibold"
          >
            <option value="all">All entity types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VERIFICATIONS TABLE                                                 */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : source.isError ? (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errMsg((source as any).error, "Could not load verifications.")}</span>
        </div>
      ) : pageItems.length === 0 ? (
        <NoVerificationsFound
          term={debounced}
          hasFilters={hasFilters}
          onClearSearch={() => {
            setSearchInput("");
            setDebounced("");
          }}
          onClearFilters={() => {
            setStatusFilter("all");
            setEntityFilter("all");
          }}
        />
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[720px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold">Applicant</th>
                  <th className="py-3 px-4 font-bold">Entity</th>
                  <th className="py-3 px-4 font-bold">Organization</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Submitted</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((v) => {
                  const own = myId !== null && String(v.userId) === String(myId);
                  return (
                    <tr key={v.id} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {(v.legalFullName?.charAt(0) || "U").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base-content truncate">
                              {v.legalFullName}
                              {own && <span className="badge badge-ghost badge-xs ml-1.5 font-bold">You</span>}
                            </p>
                            <p className="text-[11px] text-base-content/60 truncate">
                              #{v.id} · User {v.userId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-base-content/70 capitalize">
                        <span className="flex items-center gap-1.5">
                          {v.entityType === "business" ? <Building2 size={13} /> : <UserIcon size={13} />}
                          {v.entityType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-base-content/70">
                        <span className="block max-w-[200px] truncate font-semibold" title={getOrgName(v)}>
                          {getOrgName(v)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3 px-4 text-base-content/70 whitespace-nowrap">{fmtDate(v.createdAt)}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewing(v)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="Review">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setDeleting(v)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete">
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

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-200 bg-base-200/30">
              <span className="text-[11px] text-base-content/60 font-semibold">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="btn btn-ghost btn-xs rounded-lg">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} className="btn btn-ghost btn-xs rounded-lg">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}
      <AnimatePresence>
        {viewing && (
          <ViewVerificationModal
            key="view"
            row={viewing}
            myId={myId}
            onClose={() => setViewing(null)}
            onAction={setAction}
            onZoom={(src, title) => setZoom({ src, title })}
          />
        )}
        {action && (
          <ActionModal
            key="action"
            action={action}
            onClose={() => setAction(null)}
            onSuccess={(m) => {
              // Closing the review after a final decision; itemized flags and reopening keep the review open
              const finished = action.type === "approve" || action.type === "reject";
              setAction(null);
              if (finished) setViewing(null);
              notifySuccess(m);
            }}
            onError={(m) => {
              setAction(null);
              notifyError(m);
            }}
          />
        )}
        {deleting && (
          <DeleteVerificationModal
            key="delete"
            verification={deleting}
            onClose={() => setDeleting(null)}
            onSuccess={(m) => {
              setDeleting(null);
              notifySuccess(m);
            }}
            onError={(m) => {
              setDeleting(null);
              notifyError(m);
            }}
          />
        )}
        {zoom && <ImageZoomModal key="zoom" src={zoom.src} title={zoom.title} onClose={() => setZoom(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminVerificationManager;