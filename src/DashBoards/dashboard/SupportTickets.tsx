import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, MessageSquare, Plus, Search, Filter, Clock, CheckCircle, ShieldAlert, Cpu, X, Send, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { RootState } from '../../App/store';
import {
  useGetSupportTicketsByNationalIdQuery,
  useCreateSupportTicketMutation,
  useUpdateSupportTicketMutation,
  useDeleteSupportTicketMutation,
} from '../../features/APIS/supportTicketsApi';
import { adminResponseApi } from '../../features/APIS/AdminReponse';
import { PuffLoader } from 'react-spinners';

interface SupportTicket {
  ticketId: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  nationalId: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * -----------------------------------------------------------------------------------------
 * MODAL ENGINE (SWAL CONFIG)
 * -----------------------------------------------------------------------------------------
 */
const SecurityModal = Swal.mixin({
  customClass: {
    popup: 'rounded-[2rem] bg-base-100 border border-base-content/10 shadow-2xl backdrop-blur-xl',
    title: 'text-xl font-black italic uppercase tracking-tighter text-base-content pt-6',
    htmlContainer: 'text-sm font-medium opacity-70 pb-4',
    confirmButton: 'btn btn-primary px-8 h-12 rounded-xl font-black italic uppercase tracking-widest mx-2 mb-4',
    cancelButton: 'btn btn-ghost px-8 h-12 rounded-xl font-bold opacity-60 mx-2 mb-4',
  },
  buttonsStyling: false,
  background: 'var(--b1)',
  color: 'var(--bc)',
});

const AdminResponses = ({ ticketId }: { ticketId: number }) => {
  const { data: responses = [], isLoading } = adminResponseApi.useGetResponsesByTicketQuery(ticketId);

  if (isLoading || responses.length === 0) return null;

  return (
    <div className="mt-6 bg-base-200/50 backdrop-blur-sm p-5 rounded-2xl border border-primary/10 shadow-inner">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
        <MessageSquare size={14} />
        Admin Reply
      </h4>
      <ul className="space-y-3">
        {responses.map((res) => (
          <li
            key={res.responseId}
            className="bg-base-100/80 p-4 rounded-xl border border-base-content/5 hover:border-primary/30 transition-all duration-300 shadow-sm"
          >
            <p className="text-sm leading-relaxed font-medium">{res.message}</p>
            <p className="text-[9px] font-mono opacity-40 mt-3 flex items-center gap-1 uppercase">
              <Clock size={10} /> {new Date(res.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ticketVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 10 },
};

const UserSupportTickets = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);
  const { data: tickets = [], refetch, isLoading } = useGetSupportTicketsByNationalIdQuery(nationalId);
  const [createTicket, { isLoading: isSubmitting }] = useCreateSupportTicketMutation();
  const [updateTicket] = useUpdateSupportTicketMutation();
  const [deleteTicket] = useDeleteSupportTicketMutation();

  const [form, setForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isEdit = editingId !== null;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const resetForm = () => {
    setForm({ subject: '', description: '', priority: 'Medium' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFilterChange = (setter: Function, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isConfirmed } = await SecurityModal.fire({
      title: isEdit ? 'Save Changes?' : 'Submit Ticket?',
      text: isEdit ? 'This will update your existing support ticket.' : 'This will send your request to our customer support team.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel'
    });

    if (!isConfirmed) return;

    const payload = { ...form, nationalId, ...(isEdit && { ticketId: editingId }) };

    try {
      if (isEdit) {
        await updateTicket(payload).unwrap();
        toast.success('Ticket updated successfully');
      } else {
        await createTicket(payload).unwrap();
        toast.success('New ticket submitted successfully');
      }
      resetForm();
      refetch();
    } catch {
      toast.error('Connection Error: Please try again');
    }
  };

  const handleEdit = (ticket: SupportTicket) => {
    setForm({ subject: ticket.subject, description: ticket.description, priority: ticket.priority });
    setEditingId(ticket.ticketId);
    setIsModalOpen(true);
  };

  const handleDelete = async (ticketId: number) => {
    const result = await SecurityModal.fire({
      title: 'Delete Ticket?',
      text: 'Are you sure you want to permanently delete this support request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteTicket(ticketId).unwrap();
        toast.success('Ticket deleted successfully');
        refetch();
      } catch {
        toast.error('Error: Could not delete ticket');
      }
    }
  };

  const filteredTickets = tickets.filter((ticket: any) => {
    const status = ticket.status?.toLowerCase();
    const matchesFilter =
      filterStatus === 'All' ||
      (filterStatus === 'Pending' && status === 'open') ||
      (filterStatus === 'Completed' && ['resolved', 'closed'].includes(status));
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 mt-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-base-content/5 pb-10">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary animate-pulse">
            <Cpu size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">Support <span className="text-primary md:text-5xl">Hub</span></h1>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.4em]">Status: Connected</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="btn btn-primary h-14 md:h-16 px-8 md:px-10 rounded-[1.2rem] md:rounded-[1.5rem] font-black uppercase italic tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus size={20} className="mr-2"/> New Ticket
        </button>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 bg-base-200/30 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-base-content/5">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity" size={18} />
          <input
            type="text"
            placeholder="Search tickets..."
            className="input input-bordered h-14 w-full pl-12 rounded-2xl bg-base-100/50 border-base-content/10 focus:ring-1 focus:ring-primary font-medium"
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50" size={18} />
          <select
            className="select select-bordered h-14 w-full pl-12 rounded-2xl bg-base-100/50 border-base-content/10 focus:ring-1 focus:ring-primary font-black uppercase italic tracking-widest text-[11px]"
            value={filterStatus}
            onChange={(e) => handleFilterChange(setFilterStatus, e.target.value as any)}
          >
            <option value="All">All Tickets</option>
            <option value="Pending">Status: Pending</option>
            <option value="Completed">Status: Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 gap-4 opacity-50">
          <PuffLoader color="oklch(var(--p))" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Loading your tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-base-content/10 rounded-[2rem] md:rounded-[3rem]">
          <ShieldAlert size={48} className="mx-auto mb-4 opacity-10" />
          <p className="font-mono text-xs opacity-40 uppercase tracking-widest">No tickets found</p>
        </div>
      ) : (
        <>
          <ul className="space-y-6">
            <AnimatePresence mode="popLayout">
              {paginatedTickets.map((ticket: SupportTicket) => {
                const lowerStatus = ticket.status?.toLowerCase();
                const canEdit = lowerStatus === 'open';
                const canDelete = ['open', 'closed', 'resolved'].includes(lowerStatus);
                
                return (
                  <motion.li
                    key={ticket.ticketId}
                    variants={ticketVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="p-[1px] rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-base-content/5 via-transparent to-base-content/5 hover:from-primary/20 hover:to-secondary/20 transition-all duration-500 shadow-sm"
                  >
                    <div className="bg-base-100/90 backdrop-blur-xl rounded-[1.4rem] md:rounded-[1.9rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-6 border border-base-content/5">
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-base-content">{ticket.subject}</h3>
                          <span className={`badge border-none font-black text-[9px] px-3 py-2 rounded-lg uppercase tracking-widest ${
                            ticket.priority === 'High' ? 'bg-error text-error-content' : 
                            ticket.priority === 'Medium' ? 'bg-warning text-warning-content' : 'bg-success text-success-content'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm opacity-80 leading-relaxed max-w-3xl mb-6 bg-base-200/30 p-4 rounded-xl border border-base-content/5">{ticket.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[10px] font-mono uppercase tracking-widest opacity-40">
                          <span className="flex items-center gap-2"><Clock size={12}/> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}</span>
                          <span className="flex items-center gap-2 font-black text-primary"><CheckCircle size={12}/> ID: #{ticket.ticketId}</span>
                        </div>

                        <AdminResponses ticketId={ticket.ticketId} />
                      </div>

                      <div className="flex md:flex-col gap-3 w-full md:w-auto md:border-l border-base-content/5 md:pl-8 justify-end sm:justify-start">
                        <button
                          onClick={() => canEdit && handleEdit(ticket)}
                          className={`btn btn-circle h-12 w-12 md:h-14 md:w-14 rounded-2xl transition-all duration-300 ${
                            canEdit ? 'bg-warning/10 text-warning hover:bg-warning hover:text-white border-warning/20' : 'bg-base-300/50 text-base-content/20 border-transparent cursor-not-allowed'
                          }`}
                          disabled={!canEdit}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => canDelete && handleDelete(ticket.ticketId)}
                          className={`btn btn-circle h-12 w-12 md:h-14 md:w-14 rounded-2xl transition-all duration-300 ${
                            canDelete ? 'bg-error/10 text-error hover:bg-error hover:text-white border-error/20' : 'bg-base-300/50 text-base-content/20 border-transparent cursor-not-allowed'
                          }`}
                          disabled={!canDelete}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* Premium Pagination Bar */}
          {filteredTickets.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-10 pt-6 border-t border-base-content/10 gap-4 bg-base-200/20 p-6 rounded-[2rem]">
              
              {/* Tickets per page selector */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-primary opacity-60" />
                  <span className="text-xs font-semibold opacity-70">Per Page:</span>
                </div>
                <select
                  className="select select-bordered select-sm font-bold text-xs rounded-xl bg-base-200"
                  value={itemsPerPage}
                  onChange={(e) => handleFilterChange(setItemsPerPage, Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page info text */}
              <p className="text-xs font-medium opacity-60 text-center">
                Page <span className="font-bold text-base-content">{currentPage}</span> of <span className="font-bold text-base-content">{totalPages || 1}</span> ({filteredTickets.length} total)
              </p>

              {/* Next / Prev buttons */}
              <div className="join w-full sm:w-auto justify-center">
                <button 
                  className="join-item btn btn-sm bg-base-200 border-base-content/10 font-bold flex-1 sm:flex-none"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setCurrentPage((prev) => Math.max(prev - 1, 1));
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                
                <div className="join-item btn btn-sm bg-base-100 border-base-content/10 font-mono pointer-events-none">
                  {currentPage} / {totalPages || 1}
                </div>

                <button 
                  className="join-item btn btn-sm bg-base-200 border-base-content/10 font-bold flex-1 sm:flex-none"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  }}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {/* Modal Engine */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-base-100 border border-primary/20 w-full max-w-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] pointer-events-none"></div>
              
              <button onClick={resetForm} className="absolute top-6 right-6 p-2 rounded-full hover:bg-error/20 hover:text-error transition-all opacity-40 hover:opacity-100">
                <X size={24} />
              </button>

              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-8">
                {isEdit ? 'Edit Ticket' : 'Create New Ticket'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label text-[10px] font-black uppercase opacity-40 tracking-widest">Subject</label>
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="input input-bordered h-14 bg-base-200/50 rounded-2xl font-bold focus:ring-1 focus:ring-primary"
                    placeholder="Enter ticket subject..."
                  />
                </div>
                
                <div className="form-control">
                  <label className="label text-[10px] font-black uppercase opacity-40 tracking-widest">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    required
                    className="textarea textarea-bordered bg-base-200/50 rounded-2xl font-medium focus:ring-1 focus:ring-primary min-h-[120px]"
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <div className="form-control">
                  <label className="label text-[10px] font-black uppercase opacity-40 tracking-widest">Priority Level</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="select select-bordered h-14 bg-base-200/50 rounded-2xl font-black uppercase italic tracking-widest text-xs"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                  <button type="button" onClick={resetForm} className="btn btn-ghost h-14 rounded-2xl font-black uppercase italic tracking-widest text-xs flex-1 sm:flex-none">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="btn btn-primary h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-none"
                  >
                    {isSubmitting ? <span className="loading loading-spinner"></span> : <><Send size={16} className="mr-2"/> Submit</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSupportTickets;