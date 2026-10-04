import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  Package,
  ArrowLeft,
  Copy,
  Info,
  Building2
} from "lucide-react";
import {
  useGetTicketTypesByEventIdQuery,
  useCreateTicketTypeMutation,
  useUpdateTicketTypeMutation,
  useDeleteTicketTypeMutation,
  useDeleteAllTicketTypesForEventMutation,
  useGetEventRevenueQuery,
  useGetInventorySummaryQuery,
  useCloneTicketTypesMutation,
} from "../../features/APIS/ticketsType.Api";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";

// Currency used across the organizer pages
const CURRENCY = "KSH";

interface TicketTypesManagerProps {
  eventId?: string | number;
  onBack?: () => void;
}

export const TicketTypesManager = ({ eventId: propEventId, onBack }: TicketTypesManagerProps) => {
  usePageTitle("Ticket Types Manager");

  // The organizer's REAL organization. There is no fallback to a default one:
  // someone without an organization must not see or edit other people's tickets.
  const { orgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();

  // ---------------------------------------------------------------------------
  // DATA FETCHING: EVENTS & EVENT NAMES
  // ---------------------------------------------------------------------------
  const { data: eventsData } = useGetEventsByOrganizationQuery(orgId as number, {
    skip: !orgId,
  });

  const rawEvents = Array.isArray(eventsData)
    ? eventsData
    : Array.isArray((eventsData as any)?.data)
    ? (eventsData as any).data
    : [];

  const getEventId = (ev: any) => ev?.eventId || ev?.id || ev?._id;

  // The chosen event (from the dropdown or the eventId prop). It only counts if it
  // belongs to this organization; otherwise we fall back to the organization's first
  // event, and it also updates once the events finish loading.
  const [pickedEventId, setPickedEventId] = useState<string | number>(propEventId || "");
  const ownEventIds = rawEvents.map((ev: any) => String(getEventId(ev)));
  const selectedEventId: string | number =
    pickedEventId && ownEventIds.includes(String(pickedEventId))
      ? pickedEventId
      : rawEvents.length > 0
      ? getEventId(rawEvents[0])
      : "";

  const activeEvent = rawEvents.find(
    (ev: any) => String(ev.eventId || ev.id || ev._id) === String(selectedEventId)
  );
  const eventTitle = activeEvent?.title || `Event #${selectedEventId}`;

  // ---------------------------------------------------------------------------
  // DATA FETCHING: TICKET TYPES & ANALYTICS QUERIES
  // ---------------------------------------------------------------------------
  const {
    data: ticketTypesData,
    isLoading: ticketTypesLoading,
    refetch: refetchTicketTypes,
  } = useGetTicketTypesByEventIdQuery(selectedEventId, {
    skip: !selectedEventId,
  });

  const { data: revenueData } = useGetEventRevenueQuery(selectedEventId, {
    skip: !selectedEventId,
  });

  const { data: inventorySummary } = useGetInventorySummaryQuery(selectedEventId, {
    skip: !selectedEventId,
  });

  const rawTicketTypes = Array.isArray(ticketTypesData)
    ? ticketTypesData
    : Array.isArray((ticketTypesData as any)?.data)
    ? (ticketTypesData as any).data
    : [];

  // ---------------------------------------------------------------------------
  // MUTATION HOOKS (RTK QUERY)
  // ---------------------------------------------------------------------------
  const [createTicketType, { isLoading: isCreating }] = useCreateTicketTypeMutation();
  const [updateTicketType, { isLoading: isUpdating }] = useUpdateTicketTypeMutation();
  const [deleteTicketType, { isLoading: isDeleting }] = useDeleteTicketTypeMutation();
  const [deleteAllForEvent, { isLoading: isDeletingAll }] = useDeleteAllTicketTypesForEventMutation();
  const [cloneTicketTypes, { isLoading: isCloning }] = useCloneTicketTypesMutation();

  // ---------------------------------------------------------------------------
  // COMPONENT UI STATES & MODAL CONTROLS
  // ---------------------------------------------------------------------------
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
  const [selectedTicketName, setSelectedTicketName] = useState("");
  const [targetCloneEventId, setTargetCloneEventId] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [ticketFormData, setTicketFormData] = useState({
    name: "",
    price: "",
    quantity: 100,
  });

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS & API ACTIONS
  // ---------------------------------------------------------------------------
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      await createTicketType({
        eventId: Number(selectedEventId),
        name: ticketFormData.name,
        price: ticketFormData.price,
        quantity: Number(ticketFormData.quantity),
        sold: 0,
      }).unwrap();

      setSuccessMessage("Ticket type created successfully!");
      setIsCreateModalOpen(false);
      setTicketFormData({ name: "", price: "", quantity: 100 });
      refetchTicketTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to create ticket type.");
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setErrorMessage("");
    try {
      await updateTicketType({
        ticketTypeId: selectedTicketId,
        name: ticketFormData.name,
        price: ticketFormData.price,
        quantity: Number(ticketFormData.quantity),
      }).unwrap();

      setSuccessMessage("Ticket type updated successfully!");
      setIsEditModalOpen(false);
      setSelectedTicketId(null);
      refetchTicketTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to update ticket type.");
    }
  };

  const confirmDeleteTicket = (ticketId: string | number, name: string) => {
    setSelectedTicketId(ticketId);
    setSelectedTicketName(name);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicketId) return;
    try {
      await deleteTicketType(selectedTicketId).unwrap();
      setSuccessMessage("Ticket type deleted successfully.");
      setIsDeleteModalOpen(false);
      setSelectedTicketId(null);
      refetchTicketTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to delete ticket type.");
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteAllForEvent = async () => {
    try {
      await deleteAllForEvent(selectedEventId).unwrap();
      setSuccessMessage("All ticket types deleted for this event.");
      setIsDeleteAllModalOpen(false);
      refetchTicketTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to clear ticket types.");
      setIsDeleteAllModalOpen(false);
    }
  };

  const handleCloneTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCloneEventId) return;
    try {
      await cloneTicketTypes({
        sourceEventId: Number(selectedEventId),
        targetEventId: Number(targetCloneEventId),
      }).unwrap();
      setSuccessMessage("Ticket types cloned successfully!");
      setIsCloneModalOpen(false);
      setTargetCloneEventId("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to clone ticket types.");
    }
  };

  const totalRevenue = typeof revenueData === "object" ? revenueData?.revenue || revenueData?.total || 0 : revenueData || 0;
  const totalCapacity = rawTicketTypes.reduce((acc: number, t: any) => acc + (Number(t.quantity) || 0), 0);
  const totalSold = rawTicketTypes.reduce((acc: number, t: any) => acc + (Number(t.sold) || 0), 0);

  // --- WHILE WE CHECK THE ORGANIZER'S ORGANIZATION ---
  if (orgLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  // --- NO ORGANIZATION YET: ask them to create one first ---
  if (!hasOrg) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Building2 size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Create your organization first</h2>
          <p className="text-xs text-base-content/60 max-w-md leading-relaxed">
            Ticket types belong to your events, and events belong to an organization. Create your organization and your
            first event, then you can set up your ticket tiers here.
          </p>
          <Link
            to="/organizer-dashboard/my-organization"
            className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm mt-2"
          >
            <Plus size={14} />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      
      {/* =================================================================== */}
      {/* HEADER & EVENT SELECTOR BAR                                         */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="btn btn-ghost btn-xs btn-square rounded-xl" title="Go Back">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Ticket size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Ticket Types Manager</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Active</span>
            </div>
            <p className="text-[11px] text-base-content/60">
              Managing tickets for: <span className="font-bold text-base-content">{eventTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEventId}
            onChange={(e) => setPickedEventId(e.target.value)}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs w-full sm:w-48 font-semibold"
          >
            {rawEvents.map((ev: any) => {
              const id = ev.eventId || ev.id || ev._id;
              return (
                <option key={id} value={id}>
                  {ev.title}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm shrink-0"
          >
            <Plus size={14} />
            <span>Add Ticket</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* IN-DASHBOARD GUIDE / EXPLANATION BANNER                             */}
      {/* Clearly explains page functionality directly inside the UI           */}
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
                This module lets organizers configure ticket tiers (e.g., VIP, Regular, VVIP) for your events. 
                Use the event dropdown above to switch between different events. Monitor real-time ticket capacities, 
                track gross ticket revenues, clone ticket setups to other events, or clear out outdated tiers instantly.
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
      {errorMessage && (
        <div className="alert alert-error text-xs font-semibold py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUMMARY METRICS CARDS                                               */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Total Revenue Generated</span>
            <span className="text-base sm:text-lg font-black text-base-content">{CURRENCY} {Number(totalRevenue).toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Tickets Sold / Capacity</span>
            <span className="text-base sm:text-lg font-black text-base-content">{totalSold} / {totalCapacity}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Package size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-base-content/60 font-semibold">Bulk Tools</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCloneModalOpen(true)}
                className="btn btn-ghost btn-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-lg gap-1 text-[11px]"
              >
                <Copy size={12} />
                <span>Clone Tiers</span>
              </button>
              {rawTicketTypes.length > 0 && (
                <button
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="btn btn-ghost btn-xs text-error bg-error/10 hover:bg-error/20 rounded-lg gap-1 text-[11px]"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
          <div className="p-2.5 bg-warning/10 text-warning rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TICKET TYPES DATA TABLE                                             */}
      {/* =================================================================== */}
      {ticketTypesLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : rawTicketTypes.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Ticket size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">No Ticket Types Defined</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">Create ticket tiers for this event to start selling.</p>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-xs rounded-xl font-bold">
            Create Ticket Type
          </button>
        </div>
      ) : (
        <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table table-sm w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                  <th className="py-3 px-4 font-bold">Ticket Tier Name</th>
                  <th className="py-3 px-4 font-bold">Price</th>
                  <th className="py-3 px-4 font-bold">Quantity</th>
                  <th className="py-3 px-4 font-bold">Sold</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rawTicketTypes.map((ticket: any) => {
                  const ticketId = ticket.ticketTypeId || ticket.id || ticket._id;
                  const isSoldOut = ticket.sold >= ticket.quantity;
                  return (
                    <tr key={ticketId} className="hover:bg-base-200/30 border-b border-base-100 transition-colors">
                      <td className="py-3 px-4 font-bold text-base-content flex items-center gap-2">
                        <Ticket size={14} className="text-primary shrink-0" />
                        <span>{ticket.name}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-success">{CURRENCY} {Number(ticket.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-base-content/70">{ticket.quantity}</td>
                      <td className="py-3 px-4 text-base-content/70 font-semibold">{ticket.sold || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`badge badge-[10px] font-bold ${isSoldOut ? "badge-error text-error-content" : "badge-success text-success-content"}`}>
                          {isSoldOut ? "Sold Out" : "Available"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTicketId(ticketId);
                              setTicketFormData({
                                name: ticket.name || "",
                                price: ticket.price || "",
                                quantity: ticket.quantity || 100,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit Ticket"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => confirmDeleteTicket(ticketId, ticket.name)}
                            className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg"
                            title="Delete Ticket"
                          >
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
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS SECTION                                                      */}
      {/* =================================================================== */}

      {/* 1. Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Create Ticket Type</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Ticket Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP Early Bird"
                    value={ticketFormData.name}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Price ({CURRENCY})</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1500.00"
                      value={ticketFormData.price}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, price: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Quantity</label>
                    <input
                      type="number"
                      required
                      value={ticketFormData.quantity}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, quantity: Number(e.target.value) })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isCreating ? <span className="loading loading-spinner loading-xs"></span> : "Save Ticket"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Edit Ticket Type</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleUpdateTicket} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Ticket Name</label>
                  <input
                    type="text"
                    required
                    value={ticketFormData.name}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Price ({CURRENCY})</label>
                    <input
                      type="text"
                      required
                      value={ticketFormData.price}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, price: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Quantity</label>
                    <input
                      type="number"
                      required
                      value={ticketFormData.quantity}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, quantity: Number(e.target.value) })}
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

      {/* 3. Clone Modal */}
      <AnimatePresence>
        {isCloneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-base-content">Clone Ticket Types</h3>
                <button onClick={() => setIsCloneModalOpen(false)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCloneTickets} className="flex flex-col gap-3 text-xs">
                <p className="text-base-content/60 text-[11px]">
                  Copy all ticket types from <span className="font-bold text-base-content">{eventTitle}</span> to another event.
                </p>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Target Event</label>
                  <select
                    value={targetCloneEventId}
                    onChange={(e) => setTargetCloneEventId(e.target.value)}
                    required
                    className="select select-bordered select-xs sm:select-sm rounded-xl w-full text-xs"
                  >
                    <option value="">Select Target Event</option>
                    {rawEvents
                      .filter((ev: any) => String(ev.eventId || ev.id || ev._id) !== String(selectedEventId))
                      .map((ev: any) => {
                        const id = ev.eventId || ev.id || ev._id;
                        return (
                          <option key={id} value={id}>
                            {ev.title}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-2">
                  <button type="button" onClick={() => setIsCloneModalOpen(false)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCloning} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isCloning ? <span className="loading loading-spinner loading-xs"></span> : "Clone Tickets"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Delete Single Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete Ticket Type?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  Are you sure you want to delete <span className="font-bold text-base-content">"{selectedTicketName}"</span>? This action is permanent.
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
                  onClick={handleDeleteTicket}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Delete All Modal */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Clear All Ticket Types?</h3>
                <p className="text-xs text-base-content/60 leading-relaxed px-2">
                  This will remove all ticket tiers associated with <span className="font-bold text-base-content">"{eventTitle}"</span>.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleDeleteAllForEvent}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeletingAll ? <span className="loading loading-spinner loading-xs"></span> : "Clear All"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TicketTypesManager;