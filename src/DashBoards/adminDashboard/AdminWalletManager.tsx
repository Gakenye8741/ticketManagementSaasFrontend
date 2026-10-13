/**
 * ======================================================================
 * ADMIN WALLET MANAGER
 * ======================================================================
 *
 * HOW THIS PAGE WORKS
 * -------------------
 * 0. PLATFORM BALANCE  (paymentApi + walletApi)
 *    The colored card at the top right shows the platform's own figures:
 *      - Total platform earnings -> GET payments/analytics/platform-earnings
 *      - Still owed to organizers -> GET platform/pending-liability
 *      - Successful payments     -> GET payments/analytics/successful-count
 *    The payment endpoints return an untyped body, so `pickNumber` reads the
 *    number from a plain value, a { data } wrapper, or a named field. The
 *    refresh button reloads all three, and the liability also refreshes after
 *    every successful wallet or payout action.
 *
 * 1. ORGANIZATIONS  (organizationApi)
 *    On load we call `getAllOrganizationsAdmin` once. The result feeds:
 *      - the searchable organization dropdown (so you never type an ID),
 *      - the organization name/logo shown on every payout,
 *      - the "filter by organization" dropdown above the payouts.
 *
 * 2. WALLET PANEL  (walletApi)
 *    Pick an organization -> `getWalletOverview(orgId)` loads its wallet
 *    (available / pending / total earned) and payout-method summary.
 *    Admin actions on that wallet:
 *      - Credit / Debit      -> POST wallets/credit | wallets/debit
 *      - Clear pending       -> POST wallets/:orgId/clear-pending
 *      - Reset wallet        -> POST wallets/:orgId/reset (type the ID to confirm)
 *      - Create wallet       -> POST wallets (only shown if the org has none)
 *    Every mutation invalidates the "Wallet" cache tag, so the numbers on
 *    screen refresh by themselves, no manual reload.
 *
 * 3. PENDING PAYOUTS  (walletApi)
 *    `getPendingPayouts` lists every payout waiting to be settled.
 *      - View as cards or as a table (toggle top right).
 *      - Filter by organization.
 *      - Mark ONE payout paid (needs the M-Pesa/bank reference) or failed.
 *      - Select several and mark them paid/failed in one request (bulk).
 *    Settling a payout invalidates "Payouts" + "Wallet", so lists and
 *    balances update right away.
 *
 * 4. FEEDBACK
 *    Success and error banners are dismissible (the X). Success banners also
 *    close themselves after 5 seconds; errors stay until dismissed. Errors
 *    that happen inside a modal show inside that modal, so they are never
 *    hidden behind the overlay.
 *
 * NOTE: this page is for admins. Protect the route with your admin guard;
 * the backend must still enforce the admin role on every endpoint.
 * ======================================================================
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Wallet as WalletIcon,
  Search,
  Plus,
  Minus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Banknote,
  Clock,
  Building2,
  RotateCcw,
  Eraser,
  Check,
  Inbox,
  Trash2,
  ChevronDown,
  ShieldCheck,
  Info,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

import {
  useGetPlatformPendingLiabilityQuery,
  useGetWalletOverviewQuery,
  useGetOrCreateWalletMutation,
  useCreditWalletMutation,
  useDebitWalletMutation,
  useClearPendingBalanceMutation,
  useResetWalletMutation,
  useGetPendingPayoutsQuery,
  useUpdatePayoutStatusMutation,
  useBulkUpdatePayoutStatusMutation,
  type Payout,
} from "../../features/APIS/WalletApi"; // 👈 adjust to where your walletApi lives

import { useGetAllOrganizationsAdminQuery } from "../../features/APIS/organizationApi";

import {
  useGetPlatformEarningsQuery,
  useGetSuccessfulPaymentsCountQuery,
} from "../../features/APIS/PaymentApi";

import { usePageTitle } from "../../hooks/usePageTitle";

// ======================================================
// TYPES
// ======================================================

/** The organization list may use `id` or `orgId`, so both are optional */
interface Organization {
  id?: number;
  orgId?: number;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
}

const orgIdOf = (o: Organization): number => Number(o.orgId ?? o.id);

type ViewMode = "cards" | "table";

// ======================================================
// STYLES (same system as OrganizationManager)
// ======================================================

const inputClass = "input input-bordered input-sm rounded-xl w-full text-xs";
const selectClass = "select select-bordered select-sm rounded-xl w-full text-xs";
const labelClass = "font-semibold text-base-content/70 text-[11px]";
const panelClass = "bg-base-100 border border-base-200 rounded-2xl shadow-sm";
const btnBase = "rounded-xl text-xs font-bold";

/** Modal look shared with the organizer wallet page */
const modalBackdrop = "fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
const modalMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

// ======================================================
// HELPERS
// ======================================================

/** The org list can come back as an array, { data: [] } or { organizations: [] } */
const toArray = <T,>(payload: unknown, key?: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (key && Array.isArray(p[key])) return p[key] as T[];
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
};

/** Always returns a plain string, never an object */
const getErrorMessage = (err: any, fallback: string): string => {
  const msg = err?.data?.message ?? err?.data?.error;
  if (typeof msg === "string" && msg) return msg;

  if (err?.status === 400) return "Invalid request. Please check your details.";
  if (err?.status === 401) return "Your session has expired. Please log in again.";
  if (err?.status === 403) return "You don't have permission to do that.";
  if (err?.status === 404) return "That wallet or payout was not found.";
  if (err?.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (err?.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection or API URL.";

  return fallback;
};

/** Converts a number or numeric string to a number, otherwise null */
const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/**
 * The analytics endpoints have no fixed response type, so read the figure from
 * whatever shape arrives: 1500, "1500", { total: 1500 }, { data: { total: 1500 } }.
 * Named keys are tried first; as a last resort the first numeric field is used.
 */
const pickNumber = (payload: unknown, keys: string[]): number | null => {
  const direct = toNum(payload);
  if (direct !== null) return direct;
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  for (const key of keys) {
    const n = toNum(obj[key]);
    if (n !== null) return n;
  }

  if (obj.data !== undefined) return pickNumber(obj.data, keys);

  for (const value of Object.values(obj)) {
    const n = toNum(value);
    if (n !== null) return n;
  }

  return null;
};

const EARNINGS_KEYS = ["totalEarnings", "platformEarnings", "totalPlatformEarnings", "totalRevenue", "earnings", "total", "amount"];
const COUNT_KEYS = ["successfulCount", "successfulPayments", "totalSuccessful", "count", "total"];

const money = (value: number | string | undefined | null, currency = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(Number(value ?? 0));

const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ======================================================
// SHARED UI
// ======================================================

const InlineError = ({ message }: { message: string }) =>
  message ? (
    <div role="alert" className="alert alert-error text-xs font-semibold py-2 rounded-xl">
      <AlertCircle size={16} className="shrink-0" />
      <span className="break-words min-w-0">{message}</span>
    </div>
  ) : null;

const StatTile = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) => (
  <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] text-base-content/60 font-semibold">{label}</span>
      <span className="text-base sm:text-lg font-black text-base-content break-words tabular-nums">{value}</span>
      {hint && <span className="text-[10px] text-base-content/50">{hint}</span>}
    </div>
    <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">{icon}</div>
  </div>
);

/** Logo, or a building icon when the organization has none */
const OrgAvatar = ({ org, size = "w-9 h-9" }: { org?: Organization; size?: string }) => (
  <div
    className={`${size} rounded-xl bg-primary/10 text-primary border border-base-200 flex items-center justify-center shrink-0 overflow-hidden`}
  >
    {org?.logoUrl ? (
      <img src={org.logoUrl} alt="" className="w-full h-full object-cover" />
    ) : (
      <Building2 size={16} />
    )}
  </div>
);

const OrgBadges = ({ org }: { org?: Organization }) => (
  <>
    {org?.isVerified && (
      <span className="badge badge-xs badge-success gap-1 font-bold text-success-content">
        <ShieldCheck size={9} /> Verified
      </span>
    )}
    {org && org.isActive === false && <span className="badge badge-xs badge-error font-bold text-error-content">Suspended</span>}
  </>
);

interface ModalShellProps {
  title: string;
  onClose: () => void;
  maxWidth?: string;
  icon?: ReactNode;
  children: ReactNode;
}

/** Centered dialog with an icon + uppercase title, like the organizer wallet */
const ModalShell = ({ title, onClose, maxWidth = "max-w-md", icon, children }: ModalShellProps) => (
  <div className={modalBackdrop}>
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      {...modalMotion}
      className={`bg-base-100 border border-base-200 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4`}
    >
      <div className="flex justify-between items-center border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon ?? <WalletIcon size={16} />}</span>
          <h3 className="font-black text-xs uppercase tracking-wider text-base-content">{title}</h3>
        </div>

        <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg" type="button" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {children}
    </motion.div>
  </div>
);

const ModalActions = ({
  onCancel,
  isLoading,
  submitLabel,
  disabled,
  danger,
}: {
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
    <button type="button" onClick={onCancel} disabled={isLoading} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
      Cancel
    </button>

    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`btn btn-xs sm:btn-sm rounded-xl font-bold ${danger ? "btn-error text-error-content" : "btn-primary"}`}
    >
      {isLoading ? <span className="loading loading-spinner loading-xs" /> : submitLabel}
    </button>
  </div>
);

/** A confirmation dialog with an icon, a message and two buttons */
const ConfirmModal = ({
  title,
  icon,
  tone,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  loading,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  icon: ReactNode;
  tone: "primary" | "warning" | "error";
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const toneBox = { primary: "bg-primary/10 text-primary", warning: "bg-warning/10 text-warning", error: "bg-error/10 text-error" }[tone];
  const toneBtn = { primary: "btn-primary", warning: "btn-warning", error: "btn-error text-error-content" }[tone];

  return (
    <div className={modalBackdrop}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        {...modalMotion}
        className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneBox}`}>{icon}</div>

        <div className="flex flex-col gap-1">
          <h3 className="font-black text-sm text-base-content tracking-tight">{title}</h3>
          <p className="text-xs text-base-content/60 leading-relaxed px-2">{message}</p>
        </div>

        <div className="w-full text-left">
          <InlineError message={error} />
        </div>

        <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`btn btn-sm rounded-xl font-bold w-1/2 text-xs shadow-sm ${toneBtn}`}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ======================================================
// DISMISSIBLE BANNER (success closes itself, errors stay until dismissed)
// ======================================================

const Banner = ({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) => (
  <div
    role={type === "error" ? "alert" : "status"}
    className={`alert ${type === "success" ? "alert-success" : "alert-error"} text-xs font-semibold py-2 rounded-xl shadow-sm sticky top-3 z-40`}
  >
    {type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
    <span className="break-words min-w-0 flex-1">{message}</span>
    <button onClick={onDismiss} className="btn btn-ghost btn-xs btn-square" aria-label="Dismiss message">
      <X size={14} />
    </button>
  </div>
);

// ======================================================
// ORGANIZATION DROPDOWN (searchable, replaces typing an ID)
// ======================================================

interface OrgSelectProps {
  orgs: Organization[];
  isLoading: boolean;
  isError: boolean;
  value: number | null;
  onChange: (orgId: number) => void;
}

const OrgSelect = ({ orgs, isLoading, isError, value, onChange }: OrgSelectProps) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = orgs.find((o) => orgIdOf(o) === value);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name?.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q) ||
        String(orgIdOf(o)).includes(q)
    );
  }, [orgs, term]);

  const pick = (id: number) => {
    onChange(id);
    setOpen(false);
    setTerm("");
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className={labelClass}>Organization</label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isLoading || isError}
        className="mt-1.5 w-full flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-left hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-xs text-base-content/50">
            <span className="loading loading-spinner loading-xs" /> Loading organizations...
          </span>
        ) : isError ? (
          <span className="text-xs text-error">Could not load organizations</span>
        ) : selected ? (
          <>
            <OrgAvatar org={selected} />
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-base-content truncate">{selected.name}</span>
              <span className="text-[10px] text-base-content/50 font-mono">Organization {orgIdOf(selected)}</span>
            </span>
          </>
        ) : (
          <span className="text-xs text-base-content/50 flex-1">Choose an organization</span>
        )}

        <ChevronDown size={16} className={`shrink-0 text-base-content/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 mt-2 w-full rounded-xl border border-base-200 bg-base-100 shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-base-200">
              <label className="input input-bordered input-sm rounded-xl flex items-center gap-2 w-full text-xs">
                <Search size={14} className="text-base-content/40 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name or ID"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="grow"
                />
              </label>
            </div>

            <ul role="listbox" className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="p-4 text-xs text-base-content/60 text-center">
                  No organization matches "{term.trim()}".
                </li>
              ) : (
                filtered.map((o) => {
                  const id = orgIdOf(o);
                  const isSelected = id === value;

                  return (
                    <li key={id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => pick(id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-base-200/60 last:border-b-0 transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-base-200/60"
                        }`}
                      >
                        <OrgAvatar org={o} />
                        <span className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-bold text-base-content truncate">{o.name}</span>
                            <OrgBadges org={o} />
                          </span>
                          <span className="text-[10px] text-base-content/50 font-mono">
                            ID {id}
                            {o.slug ? `, @${o.slug}` : ""}
                          </span>
                        </span>
                        {isSelected && <Check size={15} className="text-primary shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ======================================================
// ORGANIZATION WALLET PANEL
// ======================================================

type OrgDialog = "credit" | "debit" | "clear" | "reset" | null;

interface PanelProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface WalletPanelProps extends PanelProps {
  orgs: Organization[];
  orgsLoading: boolean;
  orgsError: boolean;
}

const OrgWalletPanel = ({ orgs, orgsLoading, orgsError, onSuccess, onError }: WalletPanelProps) => {
  const [orgId, setOrgId] = useState<number | null>(null);

  const [dialog, setDialog] = useState<OrgDialog>(null);
  const [amount, setAmount] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [modalError, setModalError] = useState("");

  // Only fetch once an organization is chosen
  const { data, isFetching, isError, error } = useGetWalletOverviewQuery(orgId ?? 0, { skip: orgId === null });

  const [createWallet, { isLoading: creating }] = useGetOrCreateWalletMutation();
  const [credit, { isLoading: crediting }] = useCreditWalletMutation();
  const [debit, { isLoading: debiting }] = useDebitWalletMutation();
  const [clearPending, { isLoading: clearing }] = useClearPendingBalanceMutation();
  const [resetWallet, { isLoading: resetting }] = useResetWalletMutation();

  const org = orgs.find((o) => orgIdOf(o) === orgId);
  const wallet = data?.wallet;
  const currency = wallet?.currency ?? "KES";
  const noWallet = isError && (error as any)?.status === 404;

  const parsedAmount = Number(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const openDialog = (kind: Exclude<OrgDialog, null>) => {
    setAmount("");
    setConfirmText("");
    setModalError("");
    setDialog(kind);
  };

  const closeDialog = () => setDialog(null);

  /** Wraps a mutation: runs it, shows success, closes the modal, or shows the error inside the modal */
  const run = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    setModalError("");
    try {
      await action();
      onSuccess(success);
      closeDialog();
    } catch (err) {
      setModalError(getErrorMessage(err, fallback));
    }
  };

  const handleAmountSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!orgId || (dialog !== "credit" && dialog !== "debit")) return;

    if (!amountValid) {
      setModalError("Enter an amount greater than zero.");
      return;
    }

    if (dialog === "credit") {
      run(() => credit({ orgId, amount: parsedAmount }).unwrap(), `Credited ${money(parsedAmount, currency)} to ${org?.name ?? `organization ${orgId}`}.`, "Failed to credit wallet.");
    } else {
      run(() => debit({ orgId, amount: parsedAmount }).unwrap(), `Debited ${money(parsedAmount, currency)} from ${org?.name ?? `organization ${orgId}`}.`, "Failed to debit wallet.");
    }
  };

  const handleCreateWallet = async () => {
    if (!orgId) return;
    try {
      await createWallet({ orgId, currency: "KES" }).unwrap();
      onSuccess(`Wallet created for ${org?.name ?? `organization ${orgId}`}.`);
    } catch (err) {
      onError(getErrorMessage(err, "Failed to create wallet."));
    }
  };

  return (
    <div className={`lg:col-span-2 ${panelClass} p-4 sm:p-5 flex flex-col gap-4`}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Organization wallet</h3>
          <Building2 size={16} className="text-primary" />
        </div>

        <p className="text-[11px] text-base-content/60">Choose an organization to see its balances and adjust them.</p>
      </div>

      <OrgSelect orgs={orgs} isLoading={orgsLoading} isError={orgsError} value={orgId} onChange={setOrgId} />

      {orgId === null ? (
        <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <WalletIcon size={36} className="mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-xs text-base-content">No organization selected</p>
          <p className="text-[11px] text-base-content/60 mt-0.5">Pick one from the list above to load its wallet.</p>
        </div>
      ) : isFetching && !wallet ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : noWallet ? (
        <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6 flex flex-col items-center gap-3">
          <WalletIcon size={36} className="text-primary/40" />
          <div>
            <p className="font-bold text-xs text-base-content">No wallet yet</p>
            <p className="text-[11px] text-base-content/60 mt-0.5">{org?.name ?? "This organization"} doesn't have a wallet.</p>
          </div>
          <button onClick={handleCreateWallet} disabled={creating} className={`btn btn-primary btn-sm gap-2 ${btnBase}`}>
            {creating ? <span className="loading loading-spinner loading-xs" /> : <Plus size={14} />}
            Create wallet (KES)
          </button>
        </div>
      ) : isError ? (
        <InlineError message={getErrorMessage(error, "Could not load this wallet.")} />
      ) : wallet ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile icon={<WalletIcon size={15} />} label="Available balance" value={money(wallet.balance, currency)} hint="Net of platform fee" />
            <StatTile icon={<Clock size={15} />} label="Pending balance" value={money(wallet.pendingBalance, currency)} hint="Held in pending payouts" />
            <StatTile icon={<Banknote size={15} />} label="Total earned" value={money(wallet.totalEarned, currency)} hint="Lifetime net earnings" />
          </div>

          <p className="text-xs text-base-content/60">
            {data && data.methodCount > 0
              ? `${data.methodCount} payout method${data.methodCount > 1 ? "s" : ""} on file. Default: ${
                  data.defaultMethod ? `${data.defaultMethod.accountType} ${data.defaultMethod.accountNumber}` : "none set"
                }.`
              : "This organization has no payout method yet."}
          </p>

          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
            <button onClick={() => openDialog("credit")} className={`btn btn-primary btn-sm gap-2 ${btnBase}`}>
              <Plus size={14} /> Credit
            </button>
            <button onClick={() => openDialog("debit")} className={`btn btn-ghost btn-sm bg-base-200 gap-2 ${btnBase}`}>
              <Minus size={14} /> Debit
            </button>
            <button onClick={() => openDialog("clear")} className={`btn btn-ghost btn-sm bg-base-200 hover:bg-base-300 gap-2 ${btnBase}`}>
              <Eraser size={14} /> Clear pending
            </button>
            <button onClick={() => openDialog("reset")} className={`btn btn-ghost btn-sm text-error hover:bg-error/10 gap-2 ${btnBase}`}>
              <RotateCcw size={14} /> Reset wallet
            </button>
          </div>
        </>
      ) : null}

      {/* CREDIT / DEBIT */}
      <AnimatePresence>
        {(dialog === "credit" || dialog === "debit") && (
          <ModalShell title={dialog === "credit" ? "Credit wallet" : "Debit wallet"} onClose={closeDialog}>
            <form onSubmit={handleAmountSubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex items-center gap-3 rounded-2xl bg-base-200/50 p-3">
                <OrgAvatar org={org} size="w-11 h-11" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-base-content truncate">{org?.name ?? `Organization ${orgId}`}</span>
                  <span className="text-[11px] text-base-content/60">
                    {dialog === "credit" ? "Money will be added to" : "Money will be taken from"} the available balance
                    {wallet ? ` (${money(wallet.balance, currency)})` : ""}.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Amount ({currency})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
              </div>

              <InlineError message={modalError} />

              <ModalActions
                onCancel={closeDialog}
                isLoading={crediting || debiting}
                disabled={!amountValid}
                submitLabel={dialog === "credit" ? "Credit wallet" : "Debit wallet"}
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* CLEAR PENDING */}
      <AnimatePresence>
        {dialog === "clear" && orgId && (
          <ConfirmModal
            title="Clear pending balance"
            tone="warning"
            icon={<Eraser size={22} />}
            message={
              <>
                This sets the pending balance of <b className="text-base-content">{org?.name ?? orgId}</b> to zero
                {wallet ? ` (currently ${money(wallet.pendingBalance, currency)})` : ""}. Only do this after the related payouts are settled.
              </>
            }
            confirmLabel="Clear pending"
            cancelLabel="Keep it"
            loading={clearing}
            error={modalError}
            onClose={closeDialog}
            onConfirm={() =>
              run(() => clearPending(orgId).unwrap(), `Pending balance cleared for ${org?.name ?? orgId}.`, "Failed to clear pending balance.")
            }
          />
        )}
      </AnimatePresence>

      {/* RESET (type the ID to confirm) */}
      <AnimatePresence>
        {dialog === "reset" && orgId && (
          <ModalShell title="Reset wallet" maxWidth="max-w-sm" onClose={closeDialog}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => resetWallet(orgId).unwrap(), `Wallet reset for ${org?.name ?? orgId}.`, "Failed to reset wallet.");
              }}
              className="flex flex-col gap-4 text-xs"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                  <RotateCcw size={22} />
                </div>

                <p className="text-base-content/70 leading-relaxed">
                  Resetting wipes the balances of <b className="text-base-content">{org?.name ?? orgId}</b>. This cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Type {orgId} to confirm</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={inputClass}
                />
              </div>

              <InlineError message={modalError} />

              <ModalActions
                onCancel={closeDialog}
                isLoading={resetting}
                disabled={confirmText.trim() !== String(orgId)}
                submitLabel="Reset wallet"
                danger
              />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

// ======================================================
// PENDING PAYOUTS (cards or table)
// ======================================================

type PayoutDialog =
  | { kind: "pay"; payout: Payout }
  | { kind: "fail"; payout: Payout }
  | { kind: "bulk"; status: "Completed" | "Failed" }
  | null;

const PendingPayouts = ({ orgMap, onSuccess }: PanelProps & { orgMap: Map<number, Organization> }) => {
  const { data: payouts = [], isLoading, isFetching, isError, error, refetch } = useGetPendingPayoutsQuery();

  const [updateStatus, { isLoading: updating }] = useUpdatePayoutStatusMutation();
  const [bulkUpdate, { isLoading: bulking }] = useBulkUpdatePayoutStatusMutation();

  const [view, setView] = useState<ViewMode>("cards");
  const [orgFilter, setOrgFilter] = useState<number | "all">("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<PayoutDialog>(null);
  const [reference, setReference] = useState("");
  const [modalError, setModalError] = useState("");

  const orgName = (id: number) => orgMap.get(id)?.name ?? `Organization ${id}`;

  // Organizations that currently have pending payouts (feeds the filter dropdown)
  const filterOptions = useMemo(
    () => Array.from(new Set(payouts.map((p) => p.orgId))).sort((a, b) => orgName(a).localeCompare(orgName(b))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payouts, orgMap]
  );

  const visible = useMemo(
    () => (orgFilter === "all" ? payouts : payouts.filter((p) => p.orgId === orgFilter)),
    [payouts, orgFilter]
  );

  // Selection only counts payouts that are still pending AND currently visible
  const activeSelected = useMemo(
    () => selected.filter((id) => visible.some((p) => p.payoutId === id)),
    [selected, visible]
  );

  const visibleTotal = useMemo(() => visible.reduce((sum, p) => sum + Number(p.amount), 0), [visible]);
  const selectedTotal = useMemo(
    () => visible.filter((p) => activeSelected.includes(p.payoutId)).reduce((sum, p) => sum + Number(p.amount), 0),
    [visible, activeSelected]
  );

  const allSelected = visible.length > 0 && activeSelected.length === visible.length;

  const toggle = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleAll = () => setSelected(allSelected ? [] : visible.map((p) => p.payoutId));

  const openDialog = (d: Exclude<PayoutDialog, null>) => {
    setReference("");
    setModalError("");
    setDialog(d);
  };
  const closeDialog = () => setDialog(null);

  const handlePaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    const current = dialog;
    if (current?.kind !== "pay") return;

    const ref = reference.trim();
    if (ref.length < 3) {
      setModalError("Enter the transaction reference from M-Pesa or the bank.");
      return;
    }

    setModalError("");

    try {
      await updateStatus({ payoutId: current.payout.payoutId, status: "Completed", transactionReference: ref }).unwrap();
      onSuccess(`Payout #${current.payout.payoutId} to ${orgName(current.payout.orgId)} marked as paid.`);
      closeDialog();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update payout."));
    }
  };

  const handleFail = async () => {
    const current = dialog;
    if (current?.kind !== "fail") return;
    setModalError("");

    try {
      await updateStatus({ payoutId: current.payout.payoutId, status: "Failed" }).unwrap();
      onSuccess(`Payout #${current.payout.payoutId} marked as failed.`);
      closeDialog();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update payout."));
    }
  };

  const handleBulk = async () => {
    const current = dialog;
    if (current?.kind !== "bulk") return;
    setModalError("");

    try {
      const res = await bulkUpdate({ payoutIds: activeSelected, status: current.status }).unwrap();
      onSuccess(
        `${res.updatedCount} payout${res.updatedCount === 1 ? "" : "s"} marked as ${current.status === "Completed" ? "paid" : "failed"}.`
      );
      setSelected([]);
      closeDialog();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update payouts."));
    }
  };

  /** The two per-payout buttons, shared by the card and table layouts */
  const rowActions = (p: Payout, compact = false) => (
    <div className="flex gap-2">
      <button
        onClick={() => openDialog({ kind: "pay", payout: p })}
        className={`btn btn-primary gap-1.5 ${compact ? "btn-xs rounded-lg font-bold" : `btn-sm flex-1 lg:flex-none ${btnBase}`}`}
      >
        <Check size={13} /> Mark paid
      </button>
      <button
        onClick={() => openDialog({ kind: "fail", payout: p })}
        className={`btn btn-ghost text-error hover:bg-error/10 ${compact ? "btn-xs rounded-lg font-bold" : `btn-sm flex-1 lg:flex-none ${btnBase}`}`}
      >
        Fail
      </button>
    </div>
  );

  return (
    <div className={`${panelClass} p-4 sm:p-5 flex flex-col gap-4`}>
      {/* HEADER + CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-primary" />
            <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Pending payouts</h3>
            {payouts.length > 0 && <span className="badge badge-sm badge-ghost font-bold">{payouts.length}</span>}
          </div>

          <p className="text-[11px] text-base-content/60">Send the money first, then record the transaction reference here.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className={`${selectClass} sm:w-56 font-semibold`}
            aria-label="Filter payouts by organization"
          >
            <option value="all">All organizations</option>
            {filterOptions.map((id) => (
              <option key={id} value={id}>
                {orgName(id)}
              </option>
            ))}
          </select>

          <div className="join self-start" role="group" aria-label="Choose how payouts are shown">
            <button
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
              className={`btn btn-sm join-item gap-2 ${btnBase} ${view === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={`btn btn-sm join-item gap-2 ${btnBase} ${view === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
            >
              <TableIcon size={14} /> Table
            </button>
          </div>

          <button onClick={() => refetch()} disabled={isFetching} className={`btn btn-ghost btn-sm bg-base-200 gap-1.5 ${btnBase}`}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile icon={<Clock size={15} />} label="Waiting to be paid" value={`${visible.length} payout${visible.length === 1 ? "" : "s"}`} />
          <StatTile icon={<Banknote size={15} />} label="Total to send" value={money(visibleTotal)} />
          <StatTile icon={<Check size={15} />} label="Selected" value={money(selectedTotal)} hint={`${activeSelected.length} payout${activeSelected.length === 1 ? "" : "s"}`} />
        </div>
      )}

      {/* BULK BAR */}
      {activeSelected.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-primary/5 border border-primary/20 p-4">
          <span className="text-xs font-bold text-base-content">
            {activeSelected.length} selected, totalling {money(selectedTotal)}
          </span>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => openDialog({ kind: "bulk", status: "Completed" })} className={`btn btn-primary btn-sm gap-2 ${btnBase}`}>
              <Check size={14} /> Mark selected paid
            </button>
            <button onClick={() => openDialog({ kind: "bulk", status: "Failed" })} className={`btn btn-ghost btn-sm text-error hover:bg-error/10 ${btnBase}`}>
              Mark selected failed
            </button>
            <button onClick={() => setSelected([])} className={`btn btn-ghost btn-sm gap-1 ${btnBase}`}>
              <X size={14} /> Clear selection
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-base-100 border border-base-200">
              <span className="skeleton w-11 h-11 rounded-xl shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <span className="skeleton h-4 w-40 rounded" />
                <span className="skeleton h-3 w-56 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <InlineError message={getErrorMessage(error, "Could not load pending payouts.")} />
      ) : visible.length === 0 ? (
        <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Inbox size={36} className="mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-xs text-base-content">
            {orgFilter === "all" ? "No pending payouts" : "No pending payouts for this organization"}
          </p>
          <p className="text-[11px] text-base-content/60 mt-0.5">New payout requests will show up here.</p>
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto bg-base-100 border border-base-200 rounded-2xl shadow-sm">
          <table className="table table-sm w-full text-xs min-w-[760px]">
            <thead>
              <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                <th className="w-10 py-3 px-4">
                  <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={allSelected} onChange={toggleAll} aria-label="Select all payouts" />
                </th>
                <th className="py-3 px-4 font-bold">Payout</th>
                <th className="py-3 px-4 font-bold">Organization</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold text-right">Fee</th>
                <th className="py-3 px-4 font-bold">Send to</th>
                <th className="py-3 px-4 font-bold">Requested</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.payoutId} className={`hover:bg-base-200/30 border-b border-base-100 transition-colors ${activeSelected.includes(p.payoutId) ? "bg-primary/5" : ""}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={activeSelected.includes(p.payoutId)}
                      onChange={() => toggle(p.payoutId)}
                      aria-label={`Select payout ${p.payoutId}`}
                    />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">#{p.payoutId}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 min-w-[10rem]">
                      <OrgAvatar org={orgMap.get(p.orgId)} size="w-7 h-7" />
                      <span className="text-xs font-bold truncate max-w-[12rem]">{orgName(p.orgId)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-success tabular-nums text-xs">{money(p.amount)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-xs text-base-content/60">{money(p.fee)}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col text-xs">
                      <span className="break-all">{p.destinationAccount}</span>
                      <span className="text-[10px] text-base-content/50">{p.destinationType}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-base-content/60 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{rowActions(p, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 px-1 text-xs font-bold text-base-content/60 cursor-pointer w-fit">
            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={allSelected} onChange={toggleAll} />
            Select all
          </label>

          {visible.map((p) => {
            const checked = activeSelected.includes(p.payoutId);

            return (
              <div
                key={p.payoutId}
                className={`flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl border shadow-sm transition-colors ${
                  checked ? "bg-base-100 border-primary/40 ring-1 ring-primary/20" : "bg-base-100 border-base-200"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm mt-3.5 shrink-0"
                    checked={checked}
                    onChange={() => toggle(p.payoutId)}
                    aria-label={`Select payout ${p.payoutId}`}
                  />

                  <OrgAvatar org={orgMap.get(p.orgId)} size="w-11 h-11" />

                  <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-black text-sm text-base-content tabular-nums">{money(p.amount)}</span>
                      <span className="badge badge-ghost badge-xs font-bold">Fee {money(p.fee)}</span>
                    </div>

                    <span className="text-xs font-bold text-base-content truncate">{orgName(p.orgId)}</span>

                    <span className="text-[11px] text-base-content/60 break-words">
                      Send to {p.destinationAccount} ({p.destinationType})
                    </span>

                    <span className="text-[10px] text-base-content/40 font-mono">
                      Payout #{p.payoutId}, requested {formatDate(p.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="lg:shrink-0">{rowActions(p)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* MARK PAID */}
      <AnimatePresence>
        {dialog?.kind === "pay" && (
          <ModalShell title="Mark payout as paid" onClose={closeDialog}>
            <form onSubmit={handlePaySubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex items-center gap-3 rounded-2xl bg-base-200/50 p-3">
                <OrgAvatar org={orgMap.get(dialog.payout.orgId)} size="w-11 h-11" />
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-sm text-base-content tabular-nums">{money(dialog.payout.amount)}</span>
                  <span className="text-[11px] font-bold text-base-content truncate">{orgName(dialog.payout.orgId)}</span>
                  <span className="text-[11px] text-base-content/60 break-words">
                    To {dialog.payout.destinationAccount} ({dialog.payout.destinationType})
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Transaction reference</label>
                <input
                  type="text"
                  autoFocus
                  autoCapitalize="characters"
                  autoCorrect="off"
                  placeholder="e.g. MPESA_TXN_987654321"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                />
                <span className="text-[11px] text-base-content/50">Copy it from the M-Pesa message or your bank statement.</span>
              </div>

              <InlineError message={modalError} />

              <ModalActions onCancel={closeDialog} isLoading={updating} submitLabel="Mark as paid" />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* MARK FAILED */}
      <AnimatePresence>
        {dialog?.kind === "fail" && (
          <ConfirmModal
            title="Mark payout as failed"
            tone="error"
            icon={<Trash2 size={22} />}
            message={
              <>
                Payout <b className="text-base-content">#{dialog.payout.payoutId}</b> of{" "}
                <b className="text-base-content">{money(dialog.payout.amount)}</b> to{" "}
                <b className="text-base-content">{orgName(dialog.payout.orgId)}</b> will be marked as failed.
              </>
            }
            confirmLabel="Mark failed"
            cancelLabel="Keep pending"
            loading={updating}
            error={modalError}
            onClose={closeDialog}
            onConfirm={handleFail}
          />
        )}
      </AnimatePresence>

      {/* BULK */}
      <AnimatePresence>
        {dialog?.kind === "bulk" && (
          <ConfirmModal
            title={dialog.status === "Completed" ? "Mark payouts as paid" : "Mark payouts as failed"}
            tone={dialog.status === "Completed" ? "primary" : "error"}
            icon={dialog.status === "Completed" ? <Check size={22} /> : <AlertCircle size={22} />}
            message={
              <>
                <b className="text-base-content">{activeSelected.length}</b> payout{activeSelected.length === 1 ? "" : "s"} totalling{" "}
                <b className="text-base-content">{money(selectedTotal)}</b> will be marked as{" "}
                {dialog.status === "Completed" ? "paid" : "failed"}.
                {dialog.status === "Completed" && " Bulk updates don't store transaction references."}
              </>
            }
            confirmLabel="Confirm"
            loading={bulking}
            error={modalError}
            onClose={closeDialog}
            onConfirm={handleBulk}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ======================================================
// "HOW IT WORKS" MODAL
// ======================================================

const HOW_IT_WORKS = [
  {
    title: "Pick an organization",
    text: "Use the dropdown to search by name or ID. Its wallet loads straight away, so there's no need to type an ID.",
  },
  {
    title: "Adjust the wallet",
    text: "Credit or debit an amount, clear a stuck pending balance, or reset the wallet. Reset asks you to type the ID first.",
  },
  {
    title: "Settle payouts",
    text: "Send the money outside the platform (M-Pesa or bank), then mark the payout as paid with its reference. Use Fail if it didn't go through.",
  },
  {
    title: "Work in bulk",
    text: "Tick several payouts and mark them all at once. Filter by organization or switch between cards and table to review.",
  },
];

const HowItWorksModal = ({ onClose }: { onClose: () => void }) => (
  <ModalShell title="How this page works" maxWidth="max-w-lg" icon={<Info size={16} />} onClose={onClose}>
    <ol className="flex flex-col gap-3 text-xs">
      {HOW_IT_WORKS.map((step, i) => (
        <li key={step.title} className="flex gap-3 rounded-2xl bg-base-200/50 p-3">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center font-black shrink-0">
            {i + 1}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-black text-sm text-base-content">{step.title}</span>
            <span className="text-base-content/70 leading-relaxed">{step.text}</span>
          </div>
        </li>
      ))}
    </ol>

    <div className="flex items-start gap-2 text-[11px] text-base-content/60 bg-base-200/60 rounded-xl p-3">
      <Info size={14} className="text-primary shrink-0 mt-0.5" />
      <span>Balances and lists refresh by themselves after every action. Use Refresh if you suspect another admin changed something.</span>
    </div>

    <div className="flex justify-end pt-4 border-t border-base-200">
      <button onClick={onClose} className={`btn btn-primary btn-sm ${btnBase}`}>
        Got it
      </button>
    </div>
  </ModalShell>
);

// ======================================================
// PAGE
// ======================================================

export const AdminWalletManager = () => {
  usePageTitle("Wallet manager · Admin");

  // Organizations load once and are shared with every panel
  const { data: orgData, isLoading: orgsLoading, isError: orgsError } = useGetAllOrganizationsAdminQuery(undefined);

  const orgs = useMemo(
    () =>
      toArray<Organization>(orgData, "organizations")
        .filter((o) => !!orgIdOf(o))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [orgData]
  );

  const orgMap = useMemo(() => new Map(orgs.map((o) => [orgIdOf(o), o])), [orgs]);

  const {
    data: liability,
    isLoading: liabilityLoading,
    isFetching: liabilityFetching,
    isError: liabilityError,
    refetch: refetchLiability,
  } = useGetPlatformPendingLiabilityQuery();

  // Platform earnings and successful payments come from the payments analytics
  const earningsQ = useGetPlatformEarningsQuery();
  const countQ = useGetSuccessfulPaymentsCountQuery();

  const earnings = pickNumber(earningsQ.data, EARNINGS_KEYS);
  const successfulCount = pickNumber(countQ.data, COUNT_KEYS);
  const platformFetching = earningsQ.isFetching || countQ.isFetching || liabilityFetching;

  const refreshPlatform = () => {
    earningsQ.refetch();
    countQ.refetch();
    refetchLiability();
  };

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // One timer for the success banner, so a newer message isn't closed early by an older timer
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showSuccess = (msg: string) => {
    clearTimeout(timer.current);
    setErrorMessage("");
    setSuccessMessage(msg);
    refetchLiability(); // what the platform owes changes after wallet and payout actions
    if (msg) timer.current = setTimeout(() => setSuccessMessage(""), 5000);
  };

  const showError = (msg: string) => {
    clearTimeout(timer.current);
    setSuccessMessage("");
    setErrorMessage(msg);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <WalletIcon size={20} />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Wallet manager</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Admin</span>
            </div>
            <p className="text-[11px] text-base-content/60">Adjust organization wallets and settle payout requests</p>
          </div>
        </div>

        <button
          onClick={() => setShowHelp(true)}
          className="btn btn-ghost btn-sm bg-base-200 gap-1.5 rounded-xl text-xs font-bold w-full sm:w-auto"
        >
          <Info size={14} />
          <span>How it works</span>
        </button>
      </div>

      {/* DISMISSIBLE NOTIFICATIONS */}
      {successMessage && <Banner type="success" message={successMessage} onDismiss={() => setSuccessMessage("")} />}
      {errorMessage && <Banner type="error" message={errorMessage} onDismiss={() => setErrorMessage("")} />}

      {/* WALLET + LIABILITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <OrgWalletPanel
          orgs={orgs}
          orgsLoading={orgsLoading}
          orgsError={orgsError}
          onSuccess={showSuccess}
          onError={showError}
        />

        {/* PLATFORM BALANCE */}
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-content shadow-lg flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Platform balance</span>

              {earningsQ.isLoading ? (
                <div className="skeleton h-9 w-44 rounded-lg opacity-30" />
              ) : (
                <span className="text-3xl sm:text-4xl font-black tracking-tight break-words">
                  {earningsQ.isError ? "Unavailable" : earnings === null ? "—" : money(earnings)}
                </span>
              )}

              <span className="text-[11px] opacity-75 break-words">
                {earningsQ.isError
                  ? getErrorMessage(earningsQ.error, "Could not load platform earnings.")
                  : "Total platform earnings"}
              </span>
            </div>

            <button
              onClick={refreshPlatform}
              disabled={platformFetching}
              className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors disabled:opacity-60 shrink-0"
              title="Refresh platform figures"
              aria-label="Refresh platform figures"
            >
              <RefreshCw size={18} className={platformFetching ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5 min-w-0">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                <Clock size={11} /> Owed to organizers
              </span>
              <span className="text-base font-black break-words">
                {liabilityLoading ? (
                  <span className="loading loading-dots loading-xs" />
                ) : liabilityError ? (
                  "Unavailable"
                ) : (
                  money(liability?.totalPendingLiability)
                )}
              </span>
            </div>

            <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5 min-w-0">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                <CheckCircle2 size={11} /> Successful payments
              </span>
              <span className="text-base font-black">
                {countQ.isLoading ? (
                  <span className="loading loading-dots loading-xs" />
                ) : countQ.isError ? (
                  "Unavailable"
                ) : successfulCount === null ? (
                  "—"
                ) : (
                  successfulCount.toLocaleString()
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING PAYOUTS */}
      <PendingPayouts orgMap={orgMap} onSuccess={showSuccess} onError={showError} />

      <AnimatePresence>{showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}</AnimatePresence>

      {/* Extra room for the phone home bar, on top of pb-28 for the fixed bottom nav */}
      <div className="h-[env(safe-area-inset-bottom)] lg:hidden" aria-hidden />
    </div>
  );
};

export default AdminWalletManager;