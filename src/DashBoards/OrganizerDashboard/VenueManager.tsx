import { useState, useMemo, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  X,
  Info,
  Users,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  Crown,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
} from "lucide-react";
import {
  useGetAllVenuesQuery,
  useCreateVenueMutation,
  useUpdateVenueMutation,
  useDeleteVenueMutation,
  type Venue,
} from "../../features/APIS/VenueApi";
import { useGetEventsByOrganizationQuery } from "../../features/APIS/EventsApi";
import usePageTitle from "../../hooks/usePageTitle";
import { useOrganizerOrg } from "../../hooks/useOrganizerOrg";

const VIEW_KEY = "venues_view_mode";
const TABLE_SIZES = [10, 20, 50];
const CARD_SIZES = [6, 12, 24, 48];

type ViewMode = "table" | "cards";
type SortKey = "name" | "capacity_desc" | "capacity_asc" | "newest";

const emptyForm = { name: "", location: "", address: "", capacity: "", description: "" };

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 20 */
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

const vId = (v: Venue) => (v.venueId ?? v.id) as number;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.venues) ? d.venues : []);
const fmtNum = (n: unknown) => Number(n || 0).toLocaleString();
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const eventStatusOf = (e: any): string => String(e?.eventStatus || e?.status || "draft");
const eventVenueId = (e: any) => Number(e?.venueId ?? e?.venue?.venueId ?? e?.venue?.id);

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (s === "published" || s === "upcoming" || s === "active") return "badge-success text-success-content";
  if (s === "cancelled" || s === "canceled") return "badge-error text-error-content";
  if (s === "ended" || s === "completed") return "badge-ghost";
  return "badge-warning text-warning-content";
};

export const VenueManager = () => {
  usePageTitle("Venues");

  // The organizer's REAL organization (no fallback to a default one)
  const { orgId, hasOrg, isLoading: orgLoading } = useOrganizerOrg();

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  const venuesQ = useGetAllVenuesQuery(undefined, { skip: !hasOrg });
  const { data: eventsData } = useGetEventsByOrganizationQuery(orgId as number, { skip: !orgId });

  const venues: Venue[] = useMemo(() => toArray(venuesQ.data), [venuesQ.data]);
  const orgEvents = useMemo(() => toArray(eventsData), [eventsData]);

  const eventsByVenue = useMemo(() => {
    const map = new Map<number, any[]>();
    orgEvents.forEach((e) => {
      const id = eventVenueId(e);
      if (!id || isNaN(id)) return;
      map.set(id, [...(map.get(id) || []), e]);
    });
    return map;
  }, [orgEvents]);

  const eventsAt = (v: Venue) => eventsByVenue.get(Number(vId(v))) || [];

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const [createVenue, { isLoading: isCreating }] = useCreateVenueMutation();
  const [updateVenue, { isLoading: isUpdating }] = useUpdateVenueMutation();
  const [deleteVenue, { isLoading: isDeleting }] = useDeleteVenueMutation();

  // ---------------------------------------------------------------------------
  // UI STATE
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "cards";
    } catch {
      return "cards";
    }
  });
  const [pageSize, setPageSize] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "table" ? 10 : 6;
    } catch {
      return 6;
    }
  });
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // ---------------------------------------------------------------------------
  // FILTER + SORT + PAGINATION
  // ---------------------------------------------------------------------------
  const locations = useMemo(
    () => Array.from(new Set(venues.map((v) => v.location).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [venues]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = venues.filter((v) => {
      if (locationFilter !== "all" && v.location !== locationFilter) return false;
      if (!q) return true;
      return (
        (v.name || "").toLowerCase().includes(q) ||
        (v.location || "").toLowerCase().includes(q) ||
        (v.address || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortKey === "capacity_desc") return Number(b.capacity) - Number(a.capacity);
      if (sortKey === "capacity_asc") return Number(a.capacity) - Number(b.capacity);
      if (sortKey === "newest") return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0) || vId(b) - vId(a);
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [venues, search, locationFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  const totalCapacity = venues.reduce((s, v) => s + Number(v.capacity || 0), 0);
  const largest = [...venues].sort((a, b) => Number(b.capacity) - Number(a.capacity))[0];
  const inUse = venues.filter((v) => eventsAt(v).length > 0).length;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const resetFilters = () => {
    setSearch("");
    setLocationFilter("all");
    setPage(1);
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setPageSize(mode === "table" ? 10 : 6);
    setPage(1);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* storage unavailable, ignore */
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingVenue(null);
    setFormError("");
    setFormMode("create");
  };

  const openEdit = (v: Venue) => {
    setForm({
      name: v.name || "",
      location: v.location || "",
      address: v.address || "",
      capacity: String(v.capacity ?? ""),
      description: v.description || "",
    });
    setEditingVenue(v);
    setFormError("");
    setDetailVenue(null);
    setFormMode("edit");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const capacity = Number(form.capacity);

    if (!name) return setFormError("Give the venue a name.");
    if (!Number.isInteger(capacity) || capacity <= 0) return setFormError("Capacity must be a whole number above zero.");

    const duplicate = venues.some(
      (v) => v.name.trim().toLowerCase() === name.toLowerCase() && (formMode === "create" || vId(v) !== vId(editingVenue as Venue))
    );
    if (duplicate) return setFormError("You already have a venue with this name.");

    setFormError("");
    const payload = {
      name,
      location: form.location.trim(),
      address: form.address.trim(),
      capacity,
      description: form.description.trim() || undefined,
    };

    try {
      if (formMode === "create") {
        await createVenue(payload).unwrap();
        setSuccessMessage(`"${name}" was added to your venues.`);
      } else if (editingVenue) {
        await updateVenue({ venueId: vId(editingVenue), ...payload }).unwrap();
        setSuccessMessage(`"${name}" was updated.`);
      }
      setFormMode(null);
    } catch (err: any) {
      setFormError(
        err?.data?.message ||
          (Array.isArray(err?.data?.error) ? err.data.error.map((x: any) => x.message).join(", ") : "") ||
          "Failed to save the venue."
      );
    }
  };

  const handleDelete = async () => {
    if (!venueToDelete) return;
    setErrorMessage("");
    try {
      await deleteVenue(vId(venueToDelete)).unwrap();
      setSuccessMessage(`"${venueToDelete.name}" was deleted.`);
      setDetailVenue(null);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || "Failed to delete the venue. It may still be used by an event.");
    } finally {
      setVenueToDelete(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Venue", "Location", "Address", "Capacity", "Events", "Description"],
      ...filtered.map((v) => [v.name, v.location, v.address, v.capacity, eventsAt(v).length, v.description ?? ""]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `venues-${new Date().toISOString().slice(0, 10)}.csv`;
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
  // EARLY STATES
  // ---------------------------------------------------------------------------
  if (orgLoading) {
    return (
      <div className="flex justify-center py-32">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (!hasOrg) {
    return (
      <div className="flex flex-col gap-5 pb-16 max-w-3xl mx-auto w-full font-sans px-3 sm:px-6">
        <div className="text-center bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-8 sm:p-12 flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Building2 size={32} />
          </div>
          <h2 className="font-black text-base text-base-content">Create your organization first</h2>
          <p className="text-xs text-base-content/60 max-w-md leading-relaxed">
            Venues belong to your organization. Create your organization first, then you can add the places where your
            events happen.
          </p>
          <Link to="/organizer-dashboard/my-organization" className="btn btn-primary btn-sm gap-2 rounded-xl text-xs font-bold shadow-sm mt-2">
            <Plus size={14} />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>
    );
  }

  const VenueActions = ({ v }: { v: Venue }) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setDetailVenue(v)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="View venue">
        <Eye size={13} />
      </button>
      <button onClick={() => openEdit(v)} className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg" title="Edit venue">
        <Pencil size={13} />
      </button>
      <button onClick={() => setVenueToDelete(v)} className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg" title="Delete venue">
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-16 max-w-7xl mx-auto w-full font-sans px-3 sm:px-6">
      {/* =================================================================== */}
      {/* HEADER                                                              */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-base-200/80 via-base-200/40 to-transparent p-4 sm:p-5 rounded-2xl border border-base-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Warehouse size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-base-content">Venues</h1>
              <span className="badge badge-primary badge-xs font-bold px-2 py-0.5">Organizer</span>
            </div>
            <p className="text-[11px] text-base-content/60">The places where your events happen</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5"
            title="Download CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={openCreate} className="btn btn-primary btn-sm gap-1.5 rounded-xl text-xs font-bold shadow-sm flex-1 sm:flex-none">
            <Plus size={14} />
            <span>Add Venue</span>
          </button>
        </div>
      </div>

      {/* Guide banner */}
      {showInfoBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
              <Info size={16} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base-content">Venues Guide</span>
              <p className="text-base-content/70 leading-relaxed text-[11px]">
                Add the halls, grounds and rooms you use, with their address and capacity. When you create an event you pick
                one of these venues. Open a venue to see which of your events use it. A venue that is used by an event
                cannot be deleted until those events are moved or removed.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInfoBanner(false)} className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content shrink-0 self-end sm:self-center">
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
      {/* SUMMARY CARDS                                                       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Total Venues</span>
            <span className="text-base sm:text-lg font-black text-base-content">{venues.length}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Warehouse size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">Combined Capacity</span>
            <span className="text-base sm:text-lg font-black text-base-content">{fmtNum(totalCapacity)}</span>
          </div>
          <div className="p-2.5 bg-success/10 text-success rounded-xl shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] text-base-content/60 font-semibold">Largest Venue</span>
            <span className="text-base sm:text-lg font-black text-base-content truncate">{largest ? fmtNum(largest.capacity) : "—"}</span>
            <span className="text-[10px] text-base-content/50 truncate">{largest?.name || "No venues yet"}</span>
          </div>
          <div className="p-2.5 bg-warning/10 text-warning rounded-xl shrink-0">
            <Crown size={18} />
          </div>
        </div>

        <div className="bg-base-100 border border-base-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-base-content/60 font-semibold">In Use / Unused</span>
            <span className="text-base sm:text-lg font-black text-base-content">
              {inUse} / {venues.length - inUse}
            </span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Calendar size={18} />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* FILTERS                                                             */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row gap-2">
        <label className="input input-bordered input-xs sm:input-sm rounded-xl flex items-center gap-2 flex-1 text-xs">
          <Search size={14} className="text-base-content/40" />
          <input
            type="text"
            placeholder="Search by name, location, address or description"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="grow"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[10px] font-bold text-primary shrink-0">
              Clear
            </button>
          )}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold"
          >
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <ArrowUpDown size={13} className="text-base-content/40 shrink-0" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="select select-bordered select-xs sm:select-sm rounded-xl text-xs font-semibold w-full"
            >
              <option value="name">Name: A–Z</option>
              <option value="capacity_desc">Capacity: high to low</option>
              <option value="capacity_asc">Capacity: low to high</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VENUES: CARDS OR TABLE                                              */}
      {/* =================================================================== */}
      {venuesQ.isLoading ? (
        viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-56 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        )
      ) : venuesQ.isError ? (
        <div className="alert alert-error text-xs font-semibold py-3 rounded-xl">
          <AlertCircle size={16} />
          <span>Failed to load your venues. Check that you are logged in as an organizer and try again.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-base-200/20 rounded-2xl border border-dashed border-base-300 p-6">
          <Warehouse size={36} className="mx-auto text-primary/40 mb-2" />
          <h3 className="font-bold text-xs text-base-content">{venues.length === 0 ? "No Venues Yet" : "No Matching Venues"}</h3>
          <p className="text-[11px] text-base-content/60 mt-0.5 mb-3">
            {venues.length === 0 ? "Add your first venue so you can use it when creating events." : "Try a different search or location."}
          </p>
          {venues.length === 0 ? (
            <button onClick={openCreate} className="btn btn-primary btn-xs rounded-xl font-bold">
              Add Venue
            </button>
          ) : (
            <button onClick={resetFilters} className="btn btn-ghost btn-xs bg-base-200 rounded-xl font-bold">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-base-content/60">
              <span className="font-bold text-base-content">{filtered.length}</span> {filtered.length === 1 ? "venue" : "venues"}
              {filtered.length !== venues.length && <> (filtered from {venues.length})</>}
            </p>
            <div className="join" role="group" aria-label="Switch view">
              <button
                onClick={() => changeView("cards")}
                className={`btn btn-xs join-item gap-1 ${viewMode === "cards" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                onClick={() => changeView("table")}
                className={`btn btn-xs join-item gap-1 ${viewMode === "table" ? "btn-primary" : "btn-ghost bg-base-200"}`}
                aria-pressed={viewMode === "table"}
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((v, i) => {
                const events = eventsAt(v);
                const isLargest = largest && vId(largest) === vId(v) && venues.length > 1;
                return (
                  <motion.div
                    key={`${safePage}-${vId(v)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailVenue(v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailVenue(v);
                      }
                    }}
                    className="group bg-base-100 border border-base-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40" />
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                            <Warehouse size={18} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="text-sm font-black text-base-content truncate group-hover:text-primary transition-colors">{v.name}</h3>
                            <span className="flex items-center gap-1 text-[11px] text-base-content/60 truncate">
                              <MapPin size={11} className="shrink-0 text-primary" />
                              {v.location || "No location"}
                            </span>
                          </div>
                        </div>
                        {isLargest && (
                          <span className="badge badge-warning badge-sm gap-1 font-bold shrink-0">
                            <Crown size={10} /> Largest
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-base-content/60 line-clamp-2 leading-relaxed min-h-[2.2rem]">
                        {v.description || v.address || "No description added."}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Users size={10} /> Capacity
                          </span>
                          <span className="text-sm font-black text-base-content">{fmtNum(v.capacity)}</span>
                        </div>
                        <div className="rounded-xl bg-base-200/50 p-2.5 flex flex-col">
                          <span className="text-[10px] text-base-content/50 font-semibold flex items-center gap-1">
                            <Calendar size={10} /> Events
                          </span>
                          <span className="text-sm font-black text-base-content">{events.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-2 flex items-center justify-between border-t border-base-200 bg-base-200/20">
                      <span className="text-[10px] text-base-content/40 truncate pr-2">{v.address}</span>
                      <VenueActions v={v} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-base-100 border border-base-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="table table-sm w-full text-xs min-w-[760px]">
                  <thead>
                    <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                      <th className="py-3 px-4 font-bold">Venue</th>
                      <th className="py-3 px-4 font-bold">Location</th>
                      <th className="py-3 px-4 font-bold">Address</th>
                      <th className="py-3 px-4 font-bold">Capacity</th>
                      <th className="py-3 px-4 font-bold">Events</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((v) => (
                      <tr key={vId(v)} onClick={() => setDetailVenue(v)} className="hover:bg-base-200/30 border-b border-base-100 transition-colors cursor-pointer">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                              <Warehouse size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-base-content truncate">{v.name}</span>
                              <span className="text-[10px] text-base-content/50 line-clamp-1">{v.description || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-base-content/70 font-semibold">{v.location || "—"}</td>
                        <td className="py-3 px-4 text-base-content/70 max-w-[220px] truncate">{v.address || "—"}</td>
                        <td className="py-3 px-4 font-bold text-base-content">{fmtNum(v.capacity)}</td>
                        <td className="py-3 px-4">
                          <span className={`badge badge-sm font-bold ${eventsAt(v).length ? "badge-primary badge-outline" : "badge-ghost"}`}>
                            {eventsAt(v).length}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <VenueActions v={v} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-base-100 border border-base-200 rounded-2xl shadow-sm px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-base-content/60">
              <span>
                Showing{" "}
                <span className="font-bold text-base-content">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-bold text-base-content">{filtered.length}</span>
              </span>
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="select select-bordered select-xs rounded-lg font-semibold"
                >
                  {(viewMode === "table" ? TABLE_SIZES : CARD_SIZES).map((n) => (
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
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`btn btn-xs join-item ${n === safePage ? "btn-primary" : ""}`}
                      aria-current={n === safePage ? "page" : undefined}
                    >
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
        </>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}

      {/* 1. Venue detail */}
      <AnimatePresence>
        {detailVenue && (
          <div className={modalBackdrop} onClick={() => setDetailVenue(null)}>
            <motion.div
              {...modalMotion}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 border border-base-200 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Warehouse size={16} className="text-primary shrink-0" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content truncate">{detailVenue.name}</h3>
                </div>
                <button onClick={() => setDetailVenue(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Location</span>
                  <span className="font-bold text-base-content">{detailVenue.location || "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Capacity</span>
                  <span className="font-bold text-base-content">{fmtNum(detailVenue.capacity)} people</span>
                </div>
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-[11px] text-base-content/60 font-semibold">Address</span>
                  <span className="font-bold text-base-content">{detailVenue.address || "—"}</span>
                </div>
                {detailVenue.description && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[11px] text-base-content/60 font-semibold">About</span>
                    <span className="text-base-content/80 leading-relaxed">{detailVenue.description}</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Added</span>
                  <span className="font-bold text-base-content">{fmtDate(detailVenue.createdAt)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-base-content/60 font-semibold">Last updated</span>
                  <span className="font-bold text-base-content">{fmtDate(detailVenue.updatedAt)}</span>
                </div>
              </div>

              {/* Events at this venue */}
              <div className="flex flex-col gap-2 border-t border-base-200 pt-3">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                  <Calendar size={11} /> Events at this venue ({eventsAt(detailVenue).length})
                </span>
                {eventsAt(detailVenue).length === 0 ? (
                  <p className="text-[11px] text-base-content/50">No events use this venue yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                    {eventsAt(detailVenue)
                      .slice()
                      .sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0))
                      .map((e: any) => (
                        <li key={e.eventId ?? e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-base-content truncate">{e.title}</span>
                            <span className="text-[10px] text-base-content/50">{e.date ? String(e.date).substring(0, 10) : "No date"}</span>
                          </div>
                          <span className={`badge badge-sm font-bold capitalize ${statusClass(eventStatusOf(e))}`}>{eventStatusOf(e)}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                <button
                  onClick={() => {
                    setVenueToDelete(detailVenue);
                  }}
                  className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold text-error bg-error/10 hover:bg-error/20 gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button onClick={() => openEdit(detailVenue)} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold gap-1">
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Create / edit venue */}
      <AnimatePresence>
        {formMode && (
          <div className={modalBackdrop}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-base-200 pb-3">
                <div className="flex items-center gap-2">
                  <Warehouse size={16} className="text-primary" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content">
                    {formMode === "create" ? "Add Venue" : "Edit Venue"}
                  </h3>
                </div>
                <button onClick={() => setFormMode(null)} className="btn btn-ghost btn-xs btn-square rounded-lg">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Venue name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KICC Tsavo Ballroom"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Location (city or area)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nairobi CBD"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-base-content/70 text-[11px]">Capacity (people)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 4500"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Square, Harambee Avenue"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="input input-bordered input-xs sm:input-sm rounded-xl w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-base-content/70 text-[11px]">Description (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="What kind of events suit this venue?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="textarea textarea-bordered rounded-xl w-full text-xs"
                  />
                </div>

                {formError && (
                  <div className="alert alert-error text-xs font-semibold py-2 rounded-xl">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200 mt-1">
                  <button type="button" onClick={() => setFormMode(null)} className="btn btn-ghost btn-xs sm:btn-sm rounded-xl font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating || isUpdating} className="btn btn-primary btn-xs sm:btn-sm rounded-xl font-bold">
                    {isCreating || isUpdating ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : formMode === "create" ? (
                      "Save venue"
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

      {/* 3. Delete venue */}
      <AnimatePresence>
        {venueToDelete && (
          <div className={`${modalBackdrop} z-[60]`}>
            <motion.div
              {...modalMotion}
              className="bg-base-100 border border-base-200 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-base-content tracking-tight">Delete venue?</h3>
                {eventsAt(venueToDelete).length > 0 ? (
                  <p className="text-xs text-base-content/60 leading-relaxed px-2">
                    <span className="font-bold text-base-content">"{venueToDelete.name}"</span> is used by{" "}
                    <span className="font-bold text-base-content">{eventsAt(venueToDelete).length}</span>{" "}
                    {eventsAt(venueToDelete).length === 1 ? "event" : "events"}. Move those events to another venue (or delete
                    them) before deleting this venue.
                  </p>
                ) : (
                  <p className="text-xs text-base-content/60 leading-relaxed px-2">
                    Are you sure you want to delete <span className="font-bold text-base-content">"{venueToDelete.name}"</span>? This
                    action is permanent.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-base-200 mt-1">
                <button type="button" onClick={() => setVenueToDelete(null)} className="btn btn-ghost btn-sm rounded-xl font-bold w-1/2 text-xs">
                  {eventsAt(venueToDelete).length > 0 ? "Close" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={isDeleting || eventsAt(venueToDelete).length > 0}
                  onClick={handleDelete}
                  className="btn btn-error btn-sm rounded-xl font-bold w-1/2 text-xs text-error-content shadow-sm"
                >
                  {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VenueManager;