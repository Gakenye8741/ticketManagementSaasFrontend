import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  UserPlus,
  UserMinus,
  Pencil,
  Send,
  Copy,
  Check,
  QrCode,
  X,
} from "lucide-react";
import { type RootState } from "../../App/store";
// Adjust this path to wherever your tikitiApi file lives
import {
  useGetTicketsByPurchaserIdQuery,
  useAssignTicketMutation,
  useUnassignTicketMutation,
  useInitiateTicketTransferMutation,
  type Ticket as TicketType,
} from "../../features/APIS/ticketsApi";

/* ==========================================
   HELPERS
   ========================================== */

/** The backend may join extra display fields; they are optional here */
type TicketRow = TicketType & { eventTitle?: string; ticketTypeName?: string };

type TicketState = "unassigned" | "assigned" | "scanned";
type Filter = "all" | TicketState;
type Panel = "assign" | "transfer" | null;

const getId = (t: TicketRow) => (t.ticketId ?? t.id) as number;

/** Your endpoints return `any`, so accept an array or a { data } / { tickets } wrapper */
const toList = (res: any): TicketRow[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.tickets)) return res.tickets;
  if (Array.isArray(res?.data?.tickets)) return res.data.tickets;
  return [];
};

const getState = (t: TicketRow): TicketState =>
  t.isScanned ? "scanned" : t.attendeeEmail ? "assigned" : "unassigned";

const stateMeta: Record<TicketState, { label: string; badge: string }> = {
  unassigned: { label: "Not assigned", badge: "badge-warning" },
  assigned: { label: "Assigned", badge: "badge-success" },
  scanned: { label: "Checked in", badge: "badge-neutral" },
};

const errMsg = (err: any): string =>
  err?.data?.message || err?.error || "Something went wrong. Please try again.";

/* ==========================================
   TICKET CARD
   ========================================== */

function TicketCard({ ticket, ownerId }: { ticket: TicketRow; ownerId: number }) {
  const ticketId = getId(ticket);
  const state = getState(ticket);
  const locked = state === "scanned";

  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState(ticket.attendeeName ?? "");
  const [email, setEmail] = useState(ticket.attendeeEmail ?? "");
  const [phone, setPhone] = useState(ticket.attendeePhone ?? "");

  const [assignTicket, { isLoading: assigning }] = useAssignTicketMutation();
  const [unassignTicket, { isLoading: unassigning }] = useUnassignTicketMutation();
  const [initiateTransfer, { isLoading: transferring }] = useInitiateTicketTransferMutation();

  const close = () => {
    setPanel(null);
    setError(null);
    setClaimToken(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await assignTicket({
        ticketId,
        name: name.trim(),
        email: email.trim(),
        attendeePhone: phone.trim() || undefined,
      }).unwrap();
      close();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm("Remove this attendee from the ticket?")) return;
    setError(null);
    try {
      await unassignTicket({ ticketId, ownerId }).unwrap();
      setName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleTransfer = async () => {
    setError(null);
    try {
      const res: any = await initiateTransfer({ ticketId, holderId: ownerId }).unwrap();
      const token = res?.data?.claimToken ?? res?.claimToken ?? res?.data?.token ?? res?.token;
      setClaimToken(token ?? "Transfer started. Share the claim link you received.");
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const copyToken = async () => {
    if (!claimToken) return;
    await navigator.clipboard.writeText(claimToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 border border-base-200 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
            <TicketIcon size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-base-content truncate">
              {ticket.eventTitle || `Event #${ticket.eventId}`}
            </span>
            <span className="text-[11px] text-base-content/50 truncate">
              {ticket.ticketTypeName ? `${ticket.ticketTypeName} · ` : ""}Ticket #{ticketId}
            </span>
          </div>
        </div>
        <span className={`badge badge-sm font-semibold ${stateMeta[state].badge}`}>
          {stateMeta[state].label}
        </span>
      </div>

      {/* Attendee info */}
      <div className="mx-4 mb-4 bg-base-200/60 border border-base-200 rounded-xl p-3 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="flex flex-col min-w-0">
          <span className="text-base-content/50">Attendee</span>
          <span className="font-bold text-base-content truncate">{ticket.attendeeName || "—"}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base-content/50">Email</span>
          <span className="font-bold text-base-content truncate">{ticket.attendeeEmail || "—"}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base-content/50">Phone</span>
          <span className="font-bold text-base-content truncate">{ticket.attendeePhone || "—"}</span>
        </div>
      </div>

      {/* Actions */}
      {!locked && panel === null && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <button onClick={() => setPanel("assign")} className="btn btn-primary btn-sm rounded-xl gap-2 text-xs">
            {state === "assigned" ? <Pencil size={14} /> : <UserPlus size={14} />}
            {state === "assigned" ? "Change attendee" : "Assign attendee"}
          </button>
          {state === "assigned" && (
            <button
              onClick={handleUnassign}
              disabled={unassigning}
              className="btn btn-ghost btn-sm rounded-xl gap-2 text-xs text-base-content/70"
            >
              <UserMinus size={14} />
              {unassigning ? "Removing…" : "Unassign"}
            </button>
          )}
          <button
            onClick={() => setPanel("transfer")}
            className="btn btn-ghost btn-sm rounded-xl gap-2 text-xs text-base-content/70"
          >
            <Send size={14} />
            Transfer to another account
          </button>
        </div>
      )}

      {locked && (
        <p className="px-4 pb-4 text-xs text-base-content/50 flex items-center gap-2">
          <QrCode size={14} className="text-primary" />
          This ticket has been scanned at the gate, so it can't be changed.
        </p>
      )}

      {/* Panels */}
      <AnimatePresence initial={false}>
        {panel === "assign" && (
          <motion.form
            key="assign"
            onSubmit={handleAssign}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-base-200 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-base-content">
                  {state === "assigned" ? "Change attendee" : "Who is this ticket for?"}
                </h4>
                <button type="button" onClick={close} className="btn btn-ghost btn-xs btn-circle" aria-label="Close">
                  <X size={14} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-control">
                  <span className="text-[11px] text-base-content/60 mb-1">Full name</span>
                  <input
                    className="input input-bordered input-sm rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="form-control">
                  <span className="text-[11px] text-base-content/60 mb-1">Email</span>
                  <input
                    type="email"
                    className="input input-bordered input-sm rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="form-control sm:col-span-2">
                  <span className="text-[11px] text-base-content/60 mb-1">Phone (optional)</span>
                  <input
                    type="tel"
                    placeholder="254712345678"
                    className="input input-bordered input-sm rounded-xl"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>
              {error && <div role="alert" className="alert alert-error py-2 text-xs rounded-xl">{error}</div>}
              <div className="flex gap-2">
                <button type="submit" disabled={assigning} className="btn btn-primary btn-sm rounded-xl text-xs">
                  {assigning ? "Saving…" : "Save attendee"}
                </button>
                <button type="button" onClick={close} className="btn btn-ghost btn-sm rounded-xl text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {panel === "transfer" && (
          <motion.div
            key="transfer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-base-200 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-base-content">Transfer this ticket</h4>
                <button type="button" onClick={close} className="btn btn-ghost btn-xs btn-circle" aria-label="Close">
                  <X size={14} />
                </button>
              </div>

              {!claimToken ? (
                <>
                  <p className="text-xs text-base-content/60">
                    This creates a claim code. Send it to the person receiving the ticket. Once they claim it
                    with their own account, the ticket moves to them.
                  </p>
                  {error && <div role="alert" className="alert alert-error py-2 text-xs rounded-xl">{error}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleTransfer}
                      disabled={transferring}
                      className="btn btn-primary btn-sm rounded-xl text-xs"
                    >
                      {transferring ? "Creating…" : "Create claim code"}
                    </button>
                    <button onClick={close} className="btn btn-ghost btn-sm rounded-xl text-xs">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-base-content/60">Share this code with the new ticket holder:</p>
                  <div className="flex items-center gap-2 bg-base-200/60 border border-base-200 rounded-xl p-2">
                    <code className="text-xs font-mono flex-1 truncate px-1">{claimToken}</code>
                    <button onClick={copyToken} className="btn btn-primary btn-xs rounded-lg gap-1">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button onClick={close} className="btn btn-ghost btn-sm rounded-xl text-xs self-start">
                    Done
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error from the Unassign action (no panel open) */}
      {panel === null && error && (
        <div role="alert" className="alert alert-error mx-4 mb-4 py-2 text-xs rounded-xl w-auto">{error}</div>
      )}
    </motion.article>
  );
}

/* ==========================================
   PAGE
   ========================================== */

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unassigned", label: "Not assigned" },
  { key: "assigned", label: "Assigned" },
  { key: "scanned", label: "Checked in" },
];

export default function MyTickets() {
  const user = useSelector((state: RootState) => state.auth.user);
  const digitalId = Number((user as { digitalId?: number } | null)?.digitalId);

  const { data, isLoading, isError, refetch } = useGetTicketsByPurchaserIdQuery(digitalId, {
    skip: !digitalId,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const tickets = useMemo(() => toList(data), [data]);

  const counts = useMemo(
    () => ({
      all: tickets.length,
      unassigned: tickets.filter((t) => getState(t) === "unassigned").length,
      assigned: tickets.filter((t) => getState(t) === "assigned").length,
      scanned: tickets.filter((t) => getState(t) === "scanned").length,
    }),
    [tickets]
  );

  const visible = filter === "all" ? tickets : tickets.filter((t) => getState(t) === filter);

  return (
    <section className="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-black tracking-tight text-base-content">My Tickets</h1>
        <p className="text-xs text-base-content/60">
          Assign each ticket to an attendee, change who it's for, or transfer it to another account.
        </p>
      </header>

      {/* Filter tabs, styled like the sidebar links */}
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === f.key
                ? "bg-primary text-primary-content shadow-sm font-bold"
                : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {!digitalId ? (
        <p className="text-xs text-base-content/60">Sign in to see your tickets.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-xs text-base-content/60">
          <span className="loading loading-spinner loading-xs text-primary" /> Loading your tickets…
        </div>
      ) : isError ? (
        <div role="alert" className="alert alert-error text-xs rounded-xl">
          <span>We couldn't load your tickets.</span>
          <button onClick={() => refetch()} className="btn btn-xs btn-ghost">
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-base-300 rounded-2xl p-8 text-center text-xs text-base-content/60">
          {filter === "all"
            ? "You don't have any tickets yet. Tickets you buy will show up here."
            : "No tickets match this filter."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((t) => (
            <TicketCard key={getId(t)} ticket={t} ownerId={digitalId} />
          ))}
        </div>
      )}
    </section>
  );
}