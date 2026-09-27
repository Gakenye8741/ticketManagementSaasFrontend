import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  Download, 
  Mail, 
  CheckCircle2, 
  Fingerprint, 
  Ticket as TicketIcon, 
  Calendar, 
  CreditCard,
  Layers
} from 'lucide-react';
import { useSendTicketEmailMutation } from '../../features/APIS/SendngEmails';
import TicketDocument from './TicketDocument';
import type { User } from './types';

interface EnrichedBooking {
  bookingId: number;
  eventName: string;
  ticketType: {
    name: string;
    price: string;
  };
  quantity: number;
  paymentStatus: string;
  createdAt: string;
}

interface TicketItemProps {
  booking: EnrichedBooking;
  user: User;
}

const TicketItem: React.FC<TicketItemProps> = ({ booking, user }) => {
  const [sendTicketEmail, { isLoading: isSending }] = useSendTicketEmailMutation();
  const [emailSent, setEmailSent] = useState(false);

  const ticketPrice = parseFloat(booking.ticketType.price);
  const total = ticketPrice * booking.quantity;
  const paymentStatus = booking.paymentStatus;

  /**
   * Currency Formatter for KSH
   */
  const formatKSH = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount).replace('KES', 'KSH');
  };

  const handleSendThisTicket = async () => {
    try {
      await sendTicketEmail({
        bookings: [
          {
            bookingId: booking.bookingId.toString(),
            event: { title: booking.eventName },
            ticketType: booking.ticketType,
            quantity: booking.quantity,
            paymentStatus,
            createdAt: booking.createdAt,
          },
        ],
        user,
      }).unwrap();

      setEmailSent(true);
      toast.success('DATA_PACKET_SENT: Email dispatched');
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      console.error('Failed to email ticket', err);
      toast.error('TRANSMISSION_ERROR: Link failed');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-[1px] rounded-[2rem] bg-gradient-to-br from-primary/30 via-transparent to-base-content/10 hover:from-primary/50 transition-all duration-500 shadow-xl"
    >
      <div className="bg-base-100/90 backdrop-blur-xl rounded-[1.9rem] p-6 h-full flex flex-col border border-white/5">
        
        {/* --- TICKET HEADER --- */}
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <TicketIcon size={24} />
          </div>
          <span className={`badge badge-outline border-primary/20 font-mono text-[9px] px-3 py-2 rounded-lg uppercase tracking-widest ${
            paymentStatus.toLowerCase() === 'paid' ? 'text-success border-success/30' : 'text-warning border-warning/30'
          }`}>
            {paymentStatus}
          </span>
        </div>

        <h2 className="text-xl font-black italic uppercase tracking-tighter text-base-content mb-4 line-clamp-1">
          {booking.eventName}
        </h2>

        {/* --- DATA GRID --- */}
        <div className="grid grid-cols-1 gap-3 text-[11px] font-medium opacity-80 mb-6">
          <div className="flex items-center gap-3 bg-base-200/50 p-2 rounded-xl border border-white/5">
            <Fingerprint size={14} className="text-primary" />
            <span className="truncate">{user.firstName} {user.lastName} // ID: {user.nationalId}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Layers size={14} className="opacity-40" />
              <span className="uppercase font-bold">{booking.ticketType.name} (x{booking.quantity})</span>
            </div>
            <div className="flex items-center gap-2 justify-end text-primary font-black">
              <CreditCard size={14} />
              <span>{formatKSH(total)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-50 font-mono mt-2 pt-2 border-t border-base-content/5">
            <Calendar size={12} />
            <span>{new Date(booking.createdAt).toLocaleDateString('en-KE')} // {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* --- ACTIONS --- */}
        <div className="mt-auto flex gap-2">
          <PDFDownloadLink
            className="flex-1"
            document={
              <TicketDocument
                user={user}
                event={{ title: booking.eventName }}
                ticketType={booking.ticketType}
                booking={{
                  bookingId: booking.bookingId,
                  eventId: 0,
                  ticketTypeId: 0,
                  quantity: booking.quantity,
                  createdAt: booking.createdAt,
                }}
                total={total}
                paymentStatus={paymentStatus}
              />
            }
            fileName={`ticket-${booking.eventName}.pdf`}
          >
            {({ loading }) => (
              <button 
                className={`btn btn-primary w-full rounded-2xl font-black uppercase italic tracking-widest text-[10px] h-12 shadow-lg shadow-primary/20 ${loading ? 'btn-disabled' : ''}`}
              >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : <><Download size={14} className="mr-2"/> SAVE_PDF</>}
              </button>
            )}
          </PDFDownloadLink>

          <button
            onClick={handleSendThisTicket}
            disabled={isSending}
            className={`btn btn-circle h-12 w-12 rounded-2xl transition-all duration-300 ${
              isSending
                ? 'btn-disabled'
                : emailSent
                ? 'bg-success text-success-content border-none shadow-lg shadow-success/20'
                : 'bg-base-200 text-base-content hover:bg-primary hover:text-white border-white/5'
            }`}
            title="Email Ticket"
          >
            {isSending ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : emailSent ? (
              <CheckCircle2 size={18} />
            ) : (
              <Mail size={18} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TicketItem;