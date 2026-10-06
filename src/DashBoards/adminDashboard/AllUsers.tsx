import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Mail,
  Send,
  ShieldCheck,
  Store,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  UserX,
  SearchX,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Phone,
  Lock,
} from "lucide-react";
import {
  useGetAllUsersProfilesQuery,
  useSearchUsersWithDetailsQuery,
  useGetUserDetailsQuery,
  useCreateUserMutation,
  useUpdateAdminUserMutation,
  useDeleteUserMutation,
  useSendEmailNotificationMutation,
} from "../../features/APIS/UserApi"; // <-- adjust to where your userApi file lives
import usePageTitle from "../../hooks/usePageTitle";

// Height of your fixed top navbar (same value used in the layout).
// Modal overlays start below it so they never slide under the navbar.
const NAVBAR_HEIGHT = "5rem";

const ROLES = ["user", "organizer", "admin"]; // adjust to the roles your backend accepts
const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getId = (u: any) => u?.digitalId ?? u?.id ?? u?.userId;
const getAvatar = (u: any) => u?.profileImageUrl || u?.profile_picture;
const fullName = (u: any) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Unnamed user";
const toList = (data: any): any[] => (Array.isArray(data) ? data : data?.users ?? data?.data ?? []);
const errMsg = (e: any, fallback: string) => e?.data?.message || e?.data?.error || fallback;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const digitsOnly = (s: any) => String(s ?? "").replace(/\D/g, "");

/**
 * Local match on name, email and phone number.
 * - Every word typed must appear somewhere in "first last email phone"
 * - Phone numbers match regardless of formatting (+254 712..., 0712..., 712...)
 */
const matchesUser = (u: any, term: string) => {
  const q = term.trim().toLowerCase();
  if (!q) return true;

  const phone = digitsOnly(u?.contactPhone ?? u?.phone ?? u?.mobile);
  const qDigits = digitsOnly(q);

  if (qDigits.length >= 3) {
    const trimmed = qDigits.replace(/^0+/, "");
    if (phone.includes(qDigits) || (trimmed.length >= 3 && phone.includes(trimmed))) return true;
  }

  const haystack = `${u?.firstName ?? ""} ${u?.lastName ?? ""} ${u?.email ?? ""} ${u?.contactPhone ?? ""}`.toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
};

const roleBadge = (role?: string) => {
  switch (role?.toLowerCase()) {
    case "admin":
      return { cls: "badge-primary", Icon: ShieldCheck };
    case "organizer":
      return { cls: "badge-warning", Icon: Store };
    default:
      return { cls: "badge-success", Icon: UserIcon };
  }
};

const inputCls = "input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs";
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
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}) => (
  <div
    style={{ top: NAVBAR_HEIGHT }}
    className="fixed inset-x-0 bottom-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
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

// Avatar: click the picture to zoom it (only when the user has an image)
const Avatar = ({
  user,
  size = "w-8 h-8",
  onZoom,
}: {
  user: any;
  size?: string;
  onZoom?: (u: any) => void;
}) => {
  const img = getAvatar(user);
  const canZoom = Boolean(img && onZoom);

  const inner = img ? (
    <img src={img} alt={fullName(user)} className="w-full h-full object-cover" />
  ) : (
    (user?.firstName?.charAt(0) || "U").toUpperCase()
  );

  const base = `${size} rounded-xl overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0`;

  if (!canZoom) return <div className={base}>{inner}</div>;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onZoom!(user);
      }}
      title="Click to zoom"
      aria-label={`Zoom ${fullName(user)}'s picture`}
      className={`${base} relative group cursor-zoom-in ring-2 ring-transparent hover:ring-primary/50 transition-all focus:outline-none focus-visible:ring-primary`}
    >
      {inner}
      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <ZoomIn size={14} />
      </span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Image zoom lightbox
// ---------------------------------------------------------------------------
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const ImageZoomModal = ({ user, onClose }: { user: any; onClose: () => void }) => {
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
      aria-label="Profile picture preview"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="font-black text-sm truncate">{fullName(user)}</p>
          <p className="text-[11px] text-white/60 truncate">{user?.email}</p>
        </div>
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
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-xl text-white hover:bg-white/10 ml-1"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image area (scrolls when zoomed in) */}
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
          src={getAvatar(user)}
          alt={fullName(user)}
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => (s > 1 ? 1 : 2));
          }}
          draggable={false}
          style={{
            height: `${scale * 70}vh`,
            width: "auto",
            maxWidth: scale === 1 ? "100%" : "none",
          }}
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
// Confirmation modal (reusable, sits below the fixed top navbar)
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
      className="fixed inset-x-0 bottom-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
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
        {/* Accent bar */}
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
          {/* Icon with soft pulse */}
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

          {subject && (
            <div className="w-full bg-base-200/50 border border-base-200 rounded-2xl p-3 text-left">{subject}</div>
          )}

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
// "No user found" empty state
// ---------------------------------------------------------------------------
const NoUsersFound = ({
  term,
  roleFilter,
  onClearSearch,
  onClearRole,
}: {
  term: string;
  roleFilter: string;
  onClearSearch: () => void;
  onClearRole: () => void;
}) => {
  const hasTerm = term.length > 0;
  const hasRole = roleFilter !== "all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden text-center py-14 px-6 bg-gradient-to-b from-base-200/40 to-base-200/10 rounded-3xl border border-dashed border-base-300"
    >
      {/* soft background glow */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4">
        {/* Layered illustration */}
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
            {hasTerm ? <SearchX size={30} /> : <UserX size={30} />}
          </motion.div>
          <span className="absolute top-2 right-3 w-2.5 h-2.5 rounded-full bg-warning/70" />
          <span className="absolute bottom-3 left-2 w-2 h-2 rounded-full bg-success/70" />
          <span className="absolute bottom-1 right-5 w-1.5 h-1.5 rounded-full bg-primary/60" />
        </div>

        <div className="flex flex-col gap-1.5 max-w-sm">
          <h3 className="font-black text-lg text-base-content tracking-tight">No user found</h3>
          <p className="text-xs text-base-content/60 leading-relaxed">
            {hasTerm ? (
              <>
                We couldn't find anyone matching{" "}
                <span className="font-bold text-base-content bg-base-200 px-1.5 py-0.5 rounded-md break-all">“{term}”</span>
                {hasRole && (
                  <>
                    {" "}
                    with the <span className="font-bold text-base-content">{roleFilter}</span> role
                  </>
                )}
                . Check the spelling or try a different name, email or phone number.
              </>
            ) : hasRole ? (
              <>
                There are no users with the <span className="font-bold text-base-content">{roleFilter}</span> role yet.
              </>
            ) : (
              "There are no registered users yet. Use Add User to create the first one."
            )}
          </p>
        </div>

        {(hasTerm || hasRole) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasTerm && (
              <button onClick={onClearSearch} className="btn btn-primary btn-sm rounded-xl gap-1.5 text-xs font-bold shadow-sm">
                <X size={13} /> Clear search
              </button>
            )}
            {hasRole && (
              <button onClick={onClearRole} className="btn btn-ghost bg-base-200/70 btn-sm rounded-xl gap-1.5 text-xs font-bold">
                <Users size={13} /> Show all roles
              </button>
            )}
          </div>
        )}

        {hasTerm && (
          <div className="flex items-center gap-3 pt-2 text-[10px] text-base-content/50 font-semibold">
            <span className="flex items-center gap-1">
              <UserIcon size={11} /> Name
            </span>
            <span className="w-1 h-1 rounded-full bg-base-content/20" />
            <span className="flex items-center gap-1">
              <Mail size={11} /> Email
            </span>
            <span className="w-1 h-1 rounded-full bg-base-content/20" />
            <span className="flex items-center gap-1">
              <Phone size={11} /> Phone
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export const AdminManageUsers = () => {
  usePageTitle("Manage Users");

  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [zoomUser, setZoomUser] = useState<any | null>(null);

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

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isSearching = debounced.length >= 2;

  const all = useGetAllUsersProfilesQuery(undefined);
  const search = useSearchUsersWithDetailsQuery(debounced, { skip: !isSearching });

  const allUsers = useMemo(() => toList(all.data), [all.data]);

  // Search by name, email AND phone number:
  // 1) match locally against every loaded user (works for phone numbers in any format)
  // 2) merge with whatever the server search returns, without duplicates
  const users = useMemo(() => {
    if (!debounced) return allUsers;

    const local = allUsers.filter((u) => matchesUser(u, debounced));
    const remote = isSearching ? toList(search.data) : [];

    const seen = new Set<string>();
    const merged: any[] = [];
    [...local, ...remote].forEach((u) => {
      const key = String(getId(u) ?? u?.email);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(u);
      }
    });
    return merged;
  }, [allUsers, debounced, isSearching, search.data]);

  const filtered = useMemo(
    () => (roleFilter === "all" ? users : users.filter((u) => u.role?.toLowerCase() === roleFilter)),
    [users, roleFilter]
  );

  useEffect(() => setPage(1), [debounced, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const countRole = (r: string) => allUsers.filter((u) => u.role?.toLowerCase() === r).length;

  // Loading / error state (search is treated as loading only when nothing matched locally yet)
  const isLoading = all.isLoading || (isSearching && search.isFetching && filtered.length === 0);
  const isError = all.isError && (!isSearching || search.isError);

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER BAR                                                          */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Users size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Manage Users</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Admin</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{allUsers.length}</span> registered users on the platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setEmailOpen(true)}
            className="btn btn-ghost btn-sm gap-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 flex-1 sm:flex-none"
          >
            <Mail size={14} />
            <span>Email All</span>
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm flex-1 sm:flex-none"
          >
            <UserPlus size={14} />
            <span>Add User</span>
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
              <span className="font-bold text-base-content">Dashboard Guide & Features</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Search any user by name, email or phone, and filter by role. Click a profile picture to zoom it. Open a
                user to view their full details, edit their profile and role, or delete the account. Use Email All to
                send an announcement to every registered user.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Users", value: allUsers.length, Icon: Users, chip: "bg-primary/10 text-primary" },
          { label: "Organizers", value: countRole("organizer"), Icon: Store, chip: "bg-warning/10 text-warning" },
          { label: "Admins", value: countRole("admin"), Icon: ShieldCheck, chip: "bg-success/10 text-success" },
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
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone"
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
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-44 font-semibold"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {cap(r)}
            </option>
          ))}
        </select>
      </div>

      {/* =================================================================== */}
      {/* USERS TABLE                                                         */}
      {/* =================================================================== */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errMsg((all as any).error, "Could not load users.")}</span>
        </div>
      ) : pageItems.length === 0 ? (
        <NoUsersFound
          term={debounced}
          roleFilter={roleFilter}
          onClearSearch={() => {
            setSearchInput("");
            setDebounced("");
          }}
          onClearRole={() => setRoleFilter("all")}
        />
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold">User</th>
                  <th className="py-3 px-4 font-bold">Phone</th>
                  <th className="py-3 px-4 font-bold">Location</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => {
                  const { cls, Icon } = roleBadge(u.role);
                  return (
                    <tr key={String(getId(u))} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar user={u} onZoom={setZoomUser} />
                          <div className="min-w-0">
                            <p className="font-bold text-base-content truncate">{fullName(u)}</p>
                            <p className="text-[11px] text-base-content/60 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-base-content/70">{u.contactPhone || "-"}</td>
                      <td className="py-3 px-4 text-base-content/70">
                        {[u.city, u.country].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge badge-sm gap-1 font-bold ${cls}`}>
                          <Icon size={10} /> {u.role || "user"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewing(u)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View User">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setEditing(u)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="Edit User">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => setDeleting(u)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete User">
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
        {createOpen && (
          <CreateUserModal
            onClose={() => setCreateOpen(false)}
            onSuccess={(m) => {
              setCreateOpen(false);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}
        {viewing && <ViewUserModal user={viewing} onClose={() => setViewing(null)} onZoom={setZoomUser} />}
        {editing && (
          <EditUserModal
            user={editing}
            onClose={() => setEditing(null)}
            onSuccess={(m) => {
              setEditing(null);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}
        {deleting && (
          <DeleteUserModal
            user={deleting}
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
        {emailOpen && (
          <EmailModal
            onClose={() => setEmailOpen(false)}
            onSuccess={(m) => {
              setEmailOpen(false);
              notifySuccess(m);
            }}
            onError={notifyError}
          />
        )}
        {zoomUser && <ImageZoomModal user={zoomUser} onClose={() => setZoomUser(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal footers
// ---------------------------------------------------------------------------
const Footer = ({
  onCancel,
  loading,
  label,
  disabled,
}: {
  onCancel: () => void;
  loading: boolean;
  label: ReactNode;
  disabled?: boolean;
}) => (
  <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
    <button type="button" onClick={onCancel} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
      Cancel
    </button>
    <button type="submit" disabled={loading || disabled} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
      {loading ? <span className="loading loading-spinner loading-xs"></span> : label}
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Create user
// ---------------------------------------------------------------------------
const CreateUserModal = ({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactPhone: "",
    password: "",
    city: "",
    country: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(form).unwrap();
      onSuccess("User created successfully!");
    } catch (err: any) {
      onError(errMsg(err, "Failed to create user."));
    }
  };

  return (
    <ModalShell title="Add User" icon={<UserPlus size={16} />} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>First Name</label>
            <input required className={inputCls} value={form.firstName} onChange={set("firstName")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Last Name</label>
            <input required className={inputCls} value={form.lastName} onChange={set("lastName")} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Email</label>
          <input required type="email" className={inputCls} value={form.email} onChange={set("email")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Phone</label>
            <input className={inputCls} placeholder="+254712345678" value={form.contactPhone} onChange={set("contactPhone")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Password</label>
            <input required type="password" className={inputCls} value={form.password} onChange={set("password")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>City</label>
            <input className={inputCls} value={form.city} onChange={set("city")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Country</label>
            <input className={inputCls} value={form.country} onChange={set("country")} />
          </div>
        </div>
        <Footer onCancel={onClose} loading={isLoading} label="Create User" />
      </form>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// View user
// ---------------------------------------------------------------------------
const ViewUserModal = ({
  user,
  onClose,
  onZoom,
}: {
  user: any;
  onClose: () => void;
  onZoom?: (u: any) => void;
}) => {
  const { data, isLoading, isError } = useGetUserDetailsQuery(getId(user));
  const details = data?.user ?? data?.data ?? data ?? user;

  const rows = Object.entries(details || {}).filter(
    ([k, v]) => v !== null && v !== "" && typeof v !== "object" && !/password|token|hash/i.test(k)
  );

  return (
    <ModalShell title="User Details" icon={<Eye size={16} />} onClose={onClose} maxW="max-w-xl">
      <div className="flex items-center gap-3">
        <Avatar user={user} size="w-12 h-12" onZoom={onZoom} />
        <div className="min-w-0">
          <p className="font-black text-sm text-base-content truncate">{fullName(user)}</p>
          <p className="text-[11px] text-primary font-semibold truncate">{user.email}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-sm text-primary"></span>
        </div>
      ) : isError ? (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>Could not load full details.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="bg-base-200/40 border border-base-200 rounded-xl p-3 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
              </p>
              <p className="text-xs font-semibold text-base-content mt-0.5 break-words">{String(v)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-3 border-t border-base-200">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
          Close
        </button>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Edit user (admin)
// ---------------------------------------------------------------------------
const EditUserModal = ({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: any;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [updateAdminUser, { isLoading }] = useUpdateAdminUserMutation();
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    role: user.role ?? "user",
    password: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { password, ...rest } = form;
    try {
      await updateAdminUser({ digitalId: getId(user), ...rest, ...(password ? { password } : {}) }).unwrap();
      onSuccess("User updated successfully!");
    } catch (err: any) {
      onError(errMsg(err, "Failed to update user."));
    }
  };

  return (
    <ModalShell title="Edit User" icon={<Edit size={16} />} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>First Name</label>
            <input required className={inputCls} value={form.firstName} onChange={set("firstName")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Last Name</label>
            <input required className={inputCls} value={form.lastName} onChange={set("lastName")} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Email</label>
          <input required type="email" className={inputCls} value={form.email} onChange={set("email")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Role</label>
            <select className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs" value={form.role} onChange={set("role")}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {cap(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>New Password</label>
            <input type="password" className={inputCls} placeholder="Leave blank to keep" value={form.password} onChange={set("password")} />
          </div>
        </div>
        <Footer onCancel={onClose} loading={isLoading} label="Save Changes" />
      </form>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Delete user (confirmation)
// ---------------------------------------------------------------------------
const DeleteUserModal = ({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: any;
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [deleteUser, { isLoading }] = useDeleteUserMutation();

  const confirm = async () => {
    try {
      await deleteUser(getId(user)).unwrap();
      onSuccess("User deleted successfully.");
    } catch (err: any) {
      onError(errMsg(err, "Failed to delete user."));
    }
  };

  const { cls, Icon } = roleBadge(user?.role);

  return (
    <ConfirmModal
      tone="danger"
      icon={<Trash2 size={26} />}
      title="Delete this user?"
      description="This will permanently remove the account and its access to the platform."
      subject={
        <div className="flex items-center gap-3 min-w-0">
          <Avatar user={user} size="w-10 h-10" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-base-content truncate">{fullName(user)}</p>
            <p className="text-[11px] text-base-content/60 truncate">{user?.email}</p>
          </div>
          <span className={`badge badge-sm gap-1 font-bold shrink-0 ${cls}`}>
            <Icon size={10} /> {user?.role || "user"}
          </span>
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
// Broadcast email
// ---------------------------------------------------------------------------
const EmailModal = ({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (m: string) => void;
  onError: (m: string) => void;
}) => {
  const [sendEmail, { isLoading }] = useSendEmailNotificationMutation();
  const [form, setForm] = useState({ subject: "", preheader: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail(form).unwrap();
      onSuccess("Email sent to all registered users.");
    } catch (err: any) {
      onError(errMsg(err, "Failed to send email."));
    }
  };

  return (
    <ModalShell title="Email All Users" icon={<Mail size={16} />} onClose={onClose} maxW="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Subject</label>
          <input required className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Preview Text</label>
          <input
            className={inputCls}
            placeholder="Short line shown next to the subject in the inbox"
            value={form.preheader}
            onChange={(e) => setForm({ ...form, preheader: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Message</label>
          <textarea
            required
            rows={6}
            className="textarea textarea-bordered rounded-xl w-full text-xs"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <Footer
          onCancel={onClose}
          loading={isLoading}
          label={
            <span className="flex items-center gap-1.5">
              <Send size={12} /> Send Email
            </span>
          }
        />
      </form>
    </ModalShell>
  );
};

export default AdminManageUsers;