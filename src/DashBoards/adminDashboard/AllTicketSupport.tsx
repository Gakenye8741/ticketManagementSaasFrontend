import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import {
  useGetAllSupportTicketsQuery,
  useUpdateSupportTicketMutation,
} from "../../features/APIS/supportTicketsApi";
import {
  MessageCircle,
  Pencil,
  Save,
  X,
  CircleCheck,
  Loader2,
  ClipboardList,
  AlertCircle,
  MailCheck,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { adminResponseApi } from "../../features/APIS/AdminReponse";
import type { RootState } from "../../App/store";

// ✅ Interfaces
interface Ticket {
  ticketId: number;
  subject: string;
  description: string;
  nationalId: number;
  status: string;
  priority: string;
}

interface TicketResponse {
  responseId: number;
  message: string;
  createdAt: string;
}

const ticketVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 10 },
};

const statusOptions = ["Open", "In Progress", "Resolved", "Closed"];
const priorityOptions = ["Low", "Medium", "High"];
const ITEMS_PER_PAGE = 6;

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "bg-red-500";
    case "Medium": return "bg-yellow-500";
    case "Low": return "bg-green-500";
    default: return "bg-gray-400";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open": return "bg-rose-500";
    case "In Progress": return "bg-amber-500";
    case "Resolved": return "bg-emerald-500";
    case "Closed": return "bg-slate-500";
    default: return "bg-gray-300";
  }
};

const AdminSupportTickets = () => {
  // Queries & Mutations
  const { data: tickets = [], refetch, isLoading } = useGetAllSupportTicketsQuery({});
  const [updateTicketStatus, { isLoading: isUpdating }] = useUpdateSupportTicketMutation();
  const [createAdminResponse, { isLoading: isResponding }] = adminResponseApi.useCreateAdminResponseMutation();

  // Local State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const admin = useSelector((state: RootState) => state.auth.user);

  // Fetch responses for expanded ticket
  const {
    data: ticketResponses = [],
    refetch: refetchResponses,
    isFetching: isFetchingResponses,
  } = adminResponseApi.useGetResponsesByTicketQuery(
    expandedTicketId ?? -1,
    { skip: expandedTicketId === null }
  );

  // Status Update Handlers
  const handleStatusChangeStart = (ticketId: number, currentStatus: string) => {
    setEditingId(ticketId);
    setNewStatus(currentStatus);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateTicketStatus({ ticketId: editingId, status: newStatus }).unwrap();
      toast.success("Status updated successfully!");
      setEditingId(null);
      refetch();
    } catch {
      toast.error("Could not update status.");
    }
  };

  // Response Modal Handlers
  const openModal = (ticketId: number) => {
    setActiveTicketId(ticketId);
    setResponseMessage(""); 
    const modal = document.getElementById("response_modal") as HTMLDialogElement | null;
    modal?.showModal();
  };

  const handleSubmitResponse = async () => {
    if (!activeTicketId || !responseMessage.trim() || !admin?.nationalId) {
      toast.error("Please write a message first.");
      return;
    }
    try {
      await createAdminResponse({
        ticketId: activeTicketId,
        nationalId: admin.nationalId,
        message: responseMessage,
      }).unwrap();
      
      setResponseMessage("");
      (document.getElementById("response_modal") as HTMLDialogElement)?.close();
      
      if (expandedTicketId === activeTicketId) await refetchResponses();
      
      Swal.fire({
        icon: "success",
        title: "Reply Sent",
        text: "Your message has been sent to the user.",
        confirmButtonColor: "#4ade80",
      });
    } catch {
      toast.error("Failed to send reply.");
    }
  };

  const countByStatus = (status: string) =>
    tickets.filter((ticket: Ticket) => ticket.status === status).length;

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket: Ticket) => {
      const matchesText =
        ticket.subject.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.nationalId.toString().includes(searchText);
      const matchesStatus = !filterStatus || ticket.status === filterStatus;
      const matchesPriority = !filterPriority || ticket.priority === filterPriority;
      return matchesText && matchesStatus && matchesPriority;
    });
  }, [tickets, searchText, filterStatus, filterPriority]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 bg-base-100 text-base-content min-h-screen">
      {/* 👋 Header Section */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200/50 p-6 rounded-[2rem] border border-base-content/5 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
            👋 HI <span className="text-primary">ADMIN,</span> TICKETS
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Support Management Dashboard</p>
        </div>
        <div className="text-xs font-bold opacity-60 bg-base-100 px-4 py-2 rounded-xl border border-base-300">
          Total Help Requests: {tickets.length}
        </div>
      </header>

      {/* Stats Cards - Fully Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", count: tickets.length, color: "from-indigo-600 to-violet-600", icon: <ClipboardList size={20}/> },
          { label: "Resolved", count: countByStatus("Resolved"), color: "from-emerald-500 to-teal-500", icon: <CircleCheck size={20}/> },
          { label: "In Progress", count: countByStatus("In Progress"), color: "from-amber-500 to-orange-500", icon: <Loader2 size={20} className="animate-spin" /> },
          { label: "Open", count: countByStatus("Open"), color: "from-rose-500 to-pink-500", icon: <AlertCircle size={20}/> },
        ].map(({ label, count, color, icon }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-3xl shadow-lg text-white p-5 bg-gradient-to-br ${color} flex items-center justify-between`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
              <h2 className="text-3xl font-black italic">{count}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">{icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters Bar - Stack on Mobile */}
      <div className="flex flex-col lg:flex-row gap-3 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by ID, Subject or Text..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
            className="input input-bordered w-full pl-12 rounded-2xl bg-base-200 border-none font-bold text-sm h-14"
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <select className="select select-bordered flex-1 lg:w-44 rounded-2xl bg-base-200 border-none font-bold h-14" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">All Statuses</option>
            {statusOptions.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}
          </select>
          <select className="select select-bordered flex-1 lg:w-44 rounded-2xl bg-base-200 border-none font-bold h-14" value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
            <option value="">All Priorities</option>
            {priorityOptions.map(priority => <option key={priority} value={priority}>{priority.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex flex-col items-center py-20 opacity-40">
          <Loader2 className="w-10 h-10 animate-spin mb-2" />
          <p className="font-bold uppercase text-[10px] tracking-widest">Loading Tickets...</p>
        </div>
      ) : paginatedTickets.length === 0 ? (
        <div className="text-center py-20 bg-base-200 rounded-[2.5rem] border border-dashed border-base-300">
           <p className="font-bold opacity-30 uppercase tracking-widest">No tickets found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedTickets.map((ticket: Ticket) => (
                <motion.div
                  key={ticket.ticketId}
                  variants={ticketVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="bg-base-200/40 border border-base-content/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter text-white ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority} Priority
                      </span>
                      <span className="text-[10px] font-black opacity-30 italic">#{ticket.ticketId}</span>
                    </div>
                    
                    <h3 className="text-lg font-black uppercase italic leading-tight mb-2 text-primary">{ticket.subject}</h3>
                    <p className="text-sm opacity-70 line-clamp-3 mb-6 font-medium">{ticket.description}</p>
                    
                    <div className="bg-base-100/50 p-4 rounded-2xl border border-base-content/5 mb-4">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="opacity-40 uppercase">Status:</span>
                        {editingId === ticket.ticketId ? (
                          <select
                            className="select select-bordered select-xs font-bold"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase text-white ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedTicketId(expandedTicketId === ticket.ticketId ? null : ticket.ticketId)}
                      className="btn btn-ghost btn-xs w-full flex items-center justify-center gap-2 mb-2 font-black uppercase tracking-widest text-[9px]"
                    >
                      {expandedTicketId === ticket.ticketId ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expandedTicketId === ticket.ticketId ? "Hide Chat" : "Show Chat History"}
                    </button>

                    {expandedTicketId === ticket.ticketId && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 bg-base-100 rounded-2xl p-3 border border-base-300">
                        {isFetchingResponses ? (
                          <div className="text-[10px] opacity-40 py-2 italic">Loading chat...</div>
                        ) : ticketResponses.length > 0 ? (
                          <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                            {ticketResponses.map((r: TicketResponse) => (
                              <div key={r.responseId} className="border-l-2 border-primary/30 pl-3 py-1">
                                <p className="text-xs font-bold leading-relaxed">{r.message}</p>
                                <span className="text-[9px] opacity-30">{new Date(r.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] opacity-30 text-center py-2 italic">No messages yet</p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
                    {editingId === ticket.ticketId ? (
                      <>
                        <button onClick={handleUpdate} disabled={isUpdating} className="btn btn-success btn-sm font-black text-white rounded-xl">
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SAVE
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm font-black rounded-xl">
                          CANCEL
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStatusChangeStart(ticket.ticketId, ticket.status)} className="btn btn-outline btn-primary btn-sm font-black rounded-xl">
                          <Pencil size={14} /> STATUS
                        </button>
                        <button onClick={() => openModal(ticket.ticketId)} className="btn btn-primary btn-sm font-black rounded-xl shadow-lg shadow-primary/20">
                          <MessageCircle size={14} /> REPLY
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center pb-10">
              <div className="join bg-base-200 p-1 rounded-2xl">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`join-item btn btn-md font-black ${currentPage === i + 1 ? 'btn-primary rounded-xl' : 'btn-ghost'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Response Modal */}
      <dialog id="response_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-100 rounded-[2.5rem] border border-base-content/5 p-8">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <MessageCircle size={28}/>
             </div>
             <div>
               <h3 className="font-black text-2xl italic uppercase tracking-tighter">Send Reply</h3>
               <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Ticket #{activeTicketId}</p>
             </div>
          </div>
          
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Type your message to the user here..."
            className="textarea textarea-bordered w-full h-44 rounded-[1.5rem] bg-base-200 border-none font-bold text-base focus:ring-2 ring-primary/20"
          ></textarea>

          <div className="modal-action grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button onClick={() => (document.getElementById("response_modal") as HTMLDialogElement)?.close()} className="btn rounded-2xl font-black uppercase tracking-widest">
                <X size={16} /> Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSubmitResponse} 
                disabled={isResponding || !responseMessage.trim()}
                className="btn btn-primary rounded-2xl font-black uppercase tracking-widest"
              >
                {isResponding ? <Loader2 className="animate-spin" /> : <MailCheck size={16} />} 
                Send Now
              </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default AdminSupportTickets;