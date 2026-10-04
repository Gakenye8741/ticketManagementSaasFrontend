import { useState, useMemo, useEffect, type FormEvent } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  Send,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CreditCard,
  Hourglass,
} from "lucide-react";
import { type RootState } from "../../App/store";
import {
  useCheckWalletExistsQuery,
  useGetWalletByOrgIdQuery,
  useGetWalletOverviewQuery,
  useGetOrCreateWalletMutation,
  useGetPayoutsByOrgQuery,
  useGetTotalPaidByOrgQuery,
  useRequestPayoutMutation,
  useGetPayoutMethodsByOrgQuery,
  useAddPayoutMethodMutation,
  useUpdatePayoutMethodMutation,
  useSetDefaultPayoutMethodMutation,
  useDeletePayoutMethodMutation,
  type Payout,
  type PayoutMethod,
} from "../../features/APIS/WalletApi";
import usePageTitle from "../../hooks/usePageTitle";

const DEFAULT_CURRENCY = "KES";
const CURRENCIES = ["KES", "USD", "EUR", "GBP"];
const ACCOUNT_TYPES = ["M-Pesa", "Paybill", "Bank"];
const PAGE_SIZE = 10;

type Tab = "overview" | "payouts" | "methods";
type StatusFilter = "all" | Payout["status"];

const statusBadge: Record<Payout["status"], string> = {
  Completed: "badge-success text-success-content",
  Pending: "badge-warning text-warning-content",
  Failed: "badge-error text-error-content",
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
const num = (v: unknown) => Number(v || 0);

const makeMoney = (currency: string) => (v: unknown) => {
  const n = num(v);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const toArray = <T,>(d: any): T[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
const mask = (n?: string) => (n ? `•••• ${String(n).slice(-4)}` : "—");

const errMsg = (err: any, fallback: string) => err?.data?.message || err?.data?.error || fallback;

const methodIcon = (type?: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("pesa")) return <Smartphone size={18} />;
  if (t.includes("bank")) return <Landmark size={18} />;
  return <CreditCard size={18} />;
};

const txIsDebit = (t: any) => /debit|withdraw|payout|out/i.test(String(t.type ?? t.transactionType ?? t.direction ?? ""));

const emptyMethodForm = { accountType: "M-Pesa", accountNumber: "", accountName: "", isDefault: false };

export const WalletManager = () => {
  usePageTitle("Wallet");

  const user = useSelector((state: RootState) => state.auth.user);
  const orgId = user?.orgId || user?.organizationId || 1;

  // ---------------------------------------------------------------------------
  // WALLET
  // ---------------------------------------------------------------------------
  const existsQ = useCheckWalletExistsQuery(orgId, { skip: !orgId });
  const walletExists = existsQ.data?.exists ?? (existsQ.isError ? false : undefined);

  const walletQ = useGetWalletByOrgIdQuery(orgId, { skip: !orgId || walletExists !== true });
  const overviewQ = useGetWalletOverviewQuery(orgId, { skip: !orgId || walletExists !== true });

  const overview: any = overviewQ.data;
  const wallet = (overview?.wallet ?? walletQ.data) as any;
  const stats: any = overview?.stats;
  const transactions: any[] = Array.isArray(overview?.recentTransactions) ? overview.recentTransactions : [];

  const currency: string = wallet?.currency || DEFAULT_CURRENCY;
  const money = useMemo(() => makeMoney(currency), [currency]);
  const available = num(wallet?.balance);
  const pending = num(wallet?.pendingBalance);

  // ---------------------------------------------------------------------------
  // PAYOUTS & METHODS
  // ---------------------------------------------------------------------------
  const payoutsQ = useGetPayoutsByOrgQuery(orgId, { skip: !orgId || walletExists !== true });
  const totalPaidQ = useGetTotalPaidByOrgQuery(orgId, { skip: !orgId || walletExists !== true });
  const methodsQ = useGetPayoutMethodsByOrgQuery(orgId, { skip: !orgId });

  const payouts = useMemo(
    () => [...toArray<Payout>(payoutsQ.data)].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [payoutsQ.data]
  );
  const methods = useMemo(() => toArray<PayoutMethod>(methodsQ.data), [methodsQ.data]);
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];

  const methodLabel = (id: number) => {
    const m = methods.find((x) => x.payoutMethodId === id);
    return m ? `${m.accountType} · ${mask(m.accountNumber)}` : `Method #${id}`;
  };

  const totalPaid = (() => {
    const d: any = totalPaidQ.data;
    const v = d?.totalPaid ?? d?.total ?? (typeof d === "number" ? d : undefined);
    if (v !== undefined) return num(v);
    return payouts.filter((p) => p.status === "Completed").reduce((s, p) => s + num(p.amount), 0);
  })();
  const pendingPayoutsTotal = payouts.filter((p) => p.status === "Pending").reduce((s, p) => s + num(p.amount), 0);

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const [createWallet, { isLoading: isCreatingWallet }] = useGetOrCreateWalletMutation();
  const [requestPayout, { isLoading: isRequesting }] = useRequestPayoutMutation();
  const [addMethod, { isLoading: isAddingMethod }] = useAddPayoutMethodMutation();
  const [updateMethod, { isLoading: isUpdatingMethod }] = useUpdatePayoutMethodMutation();
  const [setDefaultMethod] = useSetDefaultPayoutMethodMutation();
  const [deleteMethod, { isLoading: isDeletingMethod }] = useDeletePayoutMethodMutation();

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [tab, setTab] = useState<Tab>("overview");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [newWalletCurrency, setNewWalletCurrency] = useState(DEFAULT_CURRENCY);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ amount: "", methodId: "" });
  const [requestError, setRequestError] = useState("");

  const [methodModal, setMethodModal] = useState<"add" | "edit" | null>(null);
  const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null);
  const [methodForm, setMethodForm] = useState(emptyMethodForm);
  const [methodError, setMethodError] = useState("");
  const [methodToDelete, setMethodToDelete] = useState<PayoutMethod | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // PAYOUT LIST: FILTER + PAGINATION
  // ---------------------------------------------------------------------------
  const filteredPayouts = useMemo(
    () => payouts.filter((p) => statusFilter === "all" || p.status === statusFilter),
    [payouts, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPayouts = filteredPayouts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleCreateWallet = async () => {
    setErrorMessage("");
    try {
      await createWallet({ orgId: Number(orgId), currency: newWalletCurrency }).unwrap();
      setSuccessMessage("Your wallet is ready!");
    } catch (err: any) {
      setErrorMessage(errMsg(err, "Failed to create the wallet."));
    }
  };

  const openRequest = () => {
    setRequestError("");
    setRequestForm({ amount: "", methodId: defaultMethod ? String(defaultMethod.payoutMethodId) : "" });
    setRequestOpen(true);
  };

  const handleRequestPayout = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(requestForm.amount);

    if (!amount || amount <= 0) return setRequestError("Enter an amount greater than zero.");
    if (amount > available) return setRequestError(`You can request up to ${money(available)}.`);
    if (!requestForm.methodId) return setRequestError("Choose where the money should be sent.");

    setRequestError("");
    try {
      await requestPayout({
        orgId: Number(orgId),
        amount,
        payoutMethodId: Number(requestForm.methodId),
      }).unwrap();
      setSuccessMessage("Payout requested. You will see its status in the Payouts tab.");
      setRequestOpen(false);
      setTab("payouts");
    } catch (err: any) {
      setRequestError(errMsg(err, "Failed to request the payout."));
    }
  };

  const openAddMethod = () => {
    setMethodForm({ ...emptyMethodForm, isDefault: methods.length === 0 });
    setEditingMethod(null);
    setMethodError("");
    setMethodModal("add");
  };

  const openEditMethod = (m: PayoutMethod) => {
    setMethodForm({
      accountType: m.accountType,
      accountNumber: m.accountNumber,
      accountName: m.accountName,
      isDefault: m.isDefault,
    });
    setEditingMethod(m);
    setMethodError("");
    setMethodModal("edit");
  };

  const handleSubmitMethod = async (e: FormEvent) => {
    e.preventDefault();
    setMethodError("");
    try {
      if (methodModal === "add") {
        await addMethod({
          orgId: Number(orgId),
          accountType: methodForm.accountType,
          accountNumber: methodForm.accountNumber.trim(),
          accountName: methodForm.accountName.trim(),
          isDefault: methodForm.isDefault,
        }).unwrap();
        setSuccessMessage("Payout method added.");
      } else if (editingMethod) {
        await updateMethod({
          payoutMethodId: editingMethod.payoutMethodId,
          orgId: Number(orgId),
          accountType: methodForm.accountType,
          accountNumber: methodForm.accountNumber.trim(),
          accountName: methodForm.accountName.trim(),
        }).unwrap();
        setSuccessMessage("Payout method updated.");
      }
      setMethodModal(null);
    } catch (err: any) {
      setMethodError(errMsg(err, "Failed to save the payout method."));
    }
  };

  const handleSetDefault = async (m: PayoutMethod) => {
    setErrorMessage("");
    try {
      await setDefaultMethod({ payoutMethodId: m.payoutMethodId, orgId: Number(orgId) }).unwrap();
      setSuccessMessage("Default payout method updated.");
    } catch (err: any) {
      setErrorMessage(errMsg(err, "Failed to set the default method."));
    }
  };

  const handleDeleteMethod = async () => {
    if (!methodToDelete) return;
    try {
      await deleteMethod({ payoutMethodId: methodToDelete.payoutMethodId, orgId: Number(orgId) }).unwrap();
      setSuccessMessage("Payout method removed.");
    } catch (err: any) {
      setErrorMessage(errMsg(err, "Failed to remove the payout method."));
    } finally {
      setMethodToDelete(null);
    }
  };

  const exportPayoutsCsv = () => {
    const rows = [
      ["Payout #", "Amount", "Currency", "Method", "Status", "Reference", "Requested", "Updated"],
      ...filteredPayouts.map((p) => [
        p.payoutId,
        p.amount,
        currency,
        methodLabel(p.payoutMethodId),
        p.status,
        p.transactionReference ?? "",
        fmtDate(p.createdAt),
        fmtDate(p.updatedAt),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalBackdrop = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs";
  const modalMotion = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
  };

  // ---------------------------------------------------------------------------
  // EARLY STATES: loading / no wallet yet
  // ---------------------------------------------------------------------------
  if (existsQ.isLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (walletExists === false) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        {errorMessage && (
          <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <WalletIcon size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Set up your wallet</h2>
          <p className="text-xs text-base-content/60 max-w-sm leading-relaxed">
            Your wallet holds the money from your ticket sales. Once it is created you can add a payout method and request
            payouts to your M-Pesa or bank account.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <select
              value={newWalletCurrency}
              onChange={(e) => setNewWalletCurrency(e.target.value)}
              className="select select-bordered select-sm rounded-xl text-xs font-semibold"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5"
            >
              {isCreatingWallet ? <span className="loading loading-spinner loading-xs"></span> : <Plus size={14} />}
              Create Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  const walletLoading = walletQ.isLoading || overviewQ.isLoading;

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER                                                              */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <WalletIcon size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Wallet</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">{currency}</span>
            </div>
            <p className="text-[11px] text-base-content/60">Your earnings, payouts and payout accounts</p>
          </div>
        </div>

        <button
          onClick={openRequest}
          disabled={available <= 0}
          className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm w-full sm:w-auto"
        >
          <Send size={14} />
          <span>Request Payout</span>
        </button>
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
              <span className="font-bold text-base-content">Wallet Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Money from ticket sales is added to your wallet. <b>Available</b> money can be paid out, while <b>Pending</b>{" "}
                money is still being cleared. Add a payout method, then request a payout. New requests start as Pending and
                change to Completed once they are paid, or Failed if something went wrong.
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
      {/* BALANCE CARDS                                                       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-content shadow-lg flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Available balance</span>
              {walletLoading ? (
                <div className="skeleton h-9 w-44 rounded-lg opacity-30" />
              ) : (
                <span className="text-3xl sm:text-4xl font-black tracking-tight">{money(available)}</span>
              )}
            </div>
            <div className="p-2.5 bg-white/15 rounded-xl">
              <WalletIcon size={22} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                <Hourglass size={11} /> Pending clearance
              </span>
              <span className="text-base font-black">{money(pending)}</span>
            </div>
            <div className="rounded-xl bg-white/15 p-3 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold opacity-80">
                <Clock size={11} /> Payouts in progress
              </span>
              <span className="text-base font-black">{money(pendingPayoutsTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 flex-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-base-content/60 font-semibold">Total paid out</span>
              <span className="text-base sm:text-lg font-black text-base-content">{money(totalPaid)}</span>
              <span className="text-[10px] text-base-content/50">{payouts.length} payout requests</span>
            </div>
            <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
              <Banknote size={18} />
            </div>
          </div>

          <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 flex-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-base-content/60 font-semibold">Total earned</span>
              <span className="text-base sm:text-lg font-black text-base-content">
                {stats?.totalCredits !== undefined ? money(stats.totalCredits) : "—"}
              </span>
              <span className="text-[10px] text-base-content/50">
                {stats?.totalDebits !== undefined ? `${money(stats.totalDebits)} paid or deducted` : "Lifetime credits"}
              </span>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <ArrowDownLeft size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TABS                                                                */}
      {/* =================================================================== */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 rounded-xl p-1 self-start">
        {(
          [
            ["overview", "Overview"],
            ["payouts", `Payouts${payouts.length ? ` (${payouts.length})` : ""}`],
            ["methods", `Payout methods${methods.length ? ` (${methods.length})` : ""}`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            onClick={() => setTab(key)}
            className={`tab text-[11px] font-bold rounded-lg ${tab === key ? "tab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* TAB: OVERVIEW                                                       */}
      {/* =================================================================== */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Recent activity</h3>
              <Receipt size={16} className="text-primary" />
            </div>

            {overviewQ.isLoading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 text-base-content/50">
                <Receipt size={30} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No wallet activity yet</p>
                <p className="text-[11px]">Ticket sales and payouts will show up here.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-base-200">
                {transactions.slice(0, 10).map((t, i) => {
                  const debit = txIsDebit(t);
                  return (
                    <li key={t.transactionId ?? t.id ?? i} className="flex items-center gap-3 py-2.5">
                      <div className={`p-2 rounded-xl shrink-0 ${debit ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}>
                        {debit ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-base-content truncate">
                          {t.description || t.reference || (debit ? "Money out" : "Money in")}
                        </span>
                        <span className="text-[10px] text-base-content/50">{fmtDate(t.createdAt)}</span>
                      </div>
                      <span className={`text-xs font-black shrink-0 ${debit ? "text-error" : "text-success"}`}>
                        {debit ? "−" : "+"}
                        {money(Math.abs(num(t.amount)))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Payout account</h3>
              <Landmark size={16} className="text-primary" />
            </div>

            {defaultMethod ? (
              <div className="rounded-xl bg-base-200/50 p-3 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">{methodIcon(defaultMethod.accountType)}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-base-content truncate">{defaultMethod.accountName}</span>
                  <span className="text-[11px] text-base-content/60">
                    {defaultMethod.accountType} · {mask(defaultMethod.accountNumber)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-base-content/60">
                You have not added a payout account yet. Add one to start receiving your money.
              </p>
            )}

            <button onClick={() => (defaultMethod ? setTab("methods") : openAddMethod())} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold">
              {defaultMethod ? "Manage payout methods" : "Add payout method"}
            </button>

            <button
              onClick={openRequest}
              disabled={available <= 0}
              className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5"
            >
              <Send size={14} />
              Request payout
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: PAYOUTS                                                        */}
      {/* =================================================================== */}
      {tab === "payouts" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-44 font-semibold"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>

            <button
              onClick={exportPayoutsCsv}
              disabled={filteredPayouts.length === 0}
              className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto"
            >
              <Download size={14} />
              Download CSV
            </button>
          </div>

          {payoutsQ.isLoading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : payoutsQ.isError ? (
            <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
              <AlertCircle size={16} />
              <span>Failed to load payouts. Try again in a moment.</span>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
              <Banknote size={36} className="mx-auto text-primary/40 mb-2" />
              <h3 className="font-bold text-xs text-base-content">
                {payouts.length === 0 ? "No Payouts Yet" : "No Matching Payouts"}
              </h3>
              <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
                {payouts.length === 0 ? "Request your first payout when you have available money." : "Try a different status."}
              </p>
              {payouts.length === 0 && (
                <button onClick={openRequest} disabled={available <= 0} className="btn btn-primary btn-xs rounded-xl font-bold">
                  Request Payout
                </button>
              )}
            </div>
          ) : (
            <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="table table-sm w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                      <th className="py-3 px-4 font-bold">Payout</th>
                      <th className="py-3 px-4 font-bold">Amount</th>
                      <th className="py-3 px-4 font-bold">Sent to</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPayouts.map((p) => (
                      <tr key={p.payoutId} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-base-content">#{p.payoutId}</span>
                            <span className="text-[10px] text-base-content/50">{fmtDate(p.createdAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-success">{money(p.amount)}</td>
                        <td className="py-3 px-4 font-semibold text-base-content/70">{methodLabel(p.payoutMethodId)}</td>
                        <td className="py-3 px-4">
                          <span className={`badge badge-sm font-bold ${statusBadge[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-base-content/70">{p.transactionReference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-200">
                  <span className="text-[11px] text-base-content/60">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredPayouts.length)} of{" "}
                    {filteredPayouts.length}
                  </span>
                  <div className="flex items-center gap-2">
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
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: PAYOUT METHODS                                                 */}
      {/* =================================================================== */}
      {tab === "methods" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-base-content/60">Where your payouts are sent. The default is pre-selected when you request one.</p>
            <button onClick={openAddMethod} className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5 shrink-0">
              <Plus size={14} />
              Add method
            </button>
          </div>

          {methodsQ.isLoading ? (
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : methods.length === 0 ? (
            <div className="text-center py-14 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
              <Landmark size={36} className="mx-auto text-primary/40 mb-2" />
              <h3 className="font-bold text-xs text-base-content">No Payout Methods</h3>
              <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">Add an M-Pesa number or bank account to receive payouts.</p>
              <button onClick={openAddMethod} className="btn btn-primary btn-xs rounded-xl font-bold">
                Add Payout Method
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {methods.map((m) => (
                <div
                  key={m.payoutMethodId}
                  className={`bg-base-100 border rounded-2xl shadow-sm p-4 flex flex-col gap-3 ${
                    m.isDefault ? "border-primary/40 ring-1 ring-primary/20" : "border-base-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">{methodIcon(m.accountType)}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-base-content truncate">{m.accountName}</span>
                        <span className="text-[11px] text-base-content/60">{m.accountType}</span>
                      </div>
                    </div>
                    {m.isDefault && (
                      <span className="badge badge-primary badge-sm font-bold gap-1 shrink-0">
                        <Star size={10} className="fill-current" /> Default
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl bg-base-200/50 px-3 py-2 font-mono text-xs text-base-content/80">{m.accountNumber}</div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-base-200">
                    {!m.isDefault ? (
                      <button onClick={() => handleSetDefault(m)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1 text-[11px]">
                        <Star size={12} /> Make default
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditMethod(m)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setMethodToDelete(m)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}

      {/* 1. Request payout */}
      <AnimatePresence>
        {requestOpen && (
          <div className={modalBackdrop}>
            <motion.div {...modalMotion} className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Send size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Request Payout</h3>
                </div>
                <button onClick={() => setRequestOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              {methods.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <Landmark size={30} className="text-primary/50" />
                  <p className="text-xs text-base-content/70">Add a payout method first so we know where to send your money.</p>
                  <button
                    onClick={() => {
                      setRequestOpen(false);
                      openAddMethod();
                    }}
                    className="btn btn-primary btn-sm rounded-xl text-xs font-bold"
                  >
                    Add payout method
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestPayout} className="flex flex-col gap-3 text-xs">
                  <div className="rounded-xl bg-base-200/50 p-3 flex items-center justify-between">
                    <span className="text-[11px] text-base-content/60 font-semibold">Available to withdraw</span>
                    <span className="font-black text-base-content">{money(available)}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Amount ({currency})</label>
                    <div className="join w-full">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="e.g. 2500"
                        value={requestForm.amount}
                        onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                        className="input input-bordered input-sm join-item rounded-l-xl w-full text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setRequestForm({ ...requestForm, amount: String(available) })}
                        className="btn btn-sm join-item rounded-r-xl text-xs font-bold"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Send to</label>
                    <select
                      value={requestForm.methodId}
                      onChange={(e) => setRequestForm({ ...requestForm, methodId: e.target.value })}
                      className="select select-bordered select-sm rounded-xl w-full text-xs"
                    >
                      {methods.map((m) => (
                        <option key={m.payoutMethodId} value={m.payoutMethodId}>
                          {m.accountName} · {m.accountType} {mask(m.accountNumber)}
                          {m.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {requestError && (
                    <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
                    <button type="button" onClick={() => setRequestOpen(false)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                      Cancel
                    </button>
                    <button type="submit" disabled={isRequesting} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                      {isRequesting ? <span className="loading loading-spinner loading-xs"></span> : "Request payout"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add / edit payout method */}
      <AnimatePresence>
        {methodModal && (
          <div className={modalBackdrop}>
            <motion.div {...modalMotion} className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">
                    {methodModal === "add" ? "Add Payout Method" : "Edit Payout Method"}
                  </h3>
                </div>
                <button onClick={() => setMethodModal(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmitMethod} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Account type</label>
                  <select
                    value={methodForm.accountType}
                    onChange={(e) => setMethodForm({ ...methodForm, accountType: e.target.value })}
                    className="select select-bordered select-sm rounded-xl w-full text-xs"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">
                    {methodForm.accountType === "Bank" ? "Account number" : methodForm.accountType === "Paybill" ? "Paybill number" : "Phone number"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={methodForm.accountType === "M-Pesa" ? "254712345678" : "Enter number"}
                    value={methodForm.accountNumber}
                    onChange={(e) => setMethodForm({ ...methodForm, accountNumber: e.target.value })}
                    className="input input-bordered input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Account name</label>
                  <input
                    type="text"
                    required
                    placeholder="Name on the account"
                    value={methodForm.accountName}
                    onChange={(e) => setMethodForm({ ...methodForm, accountName: e.target.value })}
                    className="input input-bordered input-sm rounded-xl w-full text-xs"
                  />
                </div>

                {methodModal === "add" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={methodForm.isDefault}
                      onChange={(e) => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                      className="checkbox checkbox-primary checkbox-xs"
                    />
                    <span className="font-semibold text-base-content/70 text-[11px]">Use as my default payout method</span>
                  </label>
                )}

                {methodError && (
                  <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{methodError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
                  <button type="button" onClick={() => setMethodModal(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isAddingMethod || isUpdatingMethod} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isAddingMethod || isUpdatingMethod ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : methodModal === "add" ? (
                      "Save method"
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Delete payout method */}
      <AnimatePresence>
        {methodToDelete && (
          <div className={`${modalBackdrop} z-[60]`}>
            <motion.div {...modalMotion} className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Remove payout method?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  <span className="font-bold text-base-content">
                    {methodToDelete.accountType} · {mask(methodToDelete.accountNumber)}
                  </span>{" "}
                  will be removed. Payouts already requested are not affected.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button type="button" onClick={() => setMethodToDelete(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingMethod}
                  onClick={handleDeleteMethod}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeletingMethod ? <span className="loading loading-spinner loading-xs"></span> : "Remove"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletManager;