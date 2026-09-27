import React from 'react';
import { Calendar, CheckCircle2, AlertCircle, EyeOff, User, RefreshCw } from 'lucide-react';
import { QrTicket } from '@/features/APIS/QrcodeTicketApi';

interface QrCodesProps {
  booking?: {
    bookingId: number;
    eventName: string;
    ticketType: { name: string; price: string };
    quantity: number;
    paymentStatus: string;
  };
  qrPass: QrTicket;
}

const QrCodes: React.FC<QrCodesProps> = ({ booking, qrPass }) => {
  if (!qrPass) return null;

  const issueDate = new Date(qrPass.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-base-100 text-base-content border border-base-content/10 shadow-2xl transition-all duration-300 hover:border-primary/30 w-full max-w-sm mx-auto">
      
      {/* 🛑 DEACTIVATED PASS OVERLAY */}
      {qrPass.isScanned && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-base-100/90 backdrop-blur-md p-6 text-center">
          <div className="p-3 bg-error/10 text-error rounded-full mb-3 border border-error/20">
            <EyeOff size={28} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-error">PASS VOIDED</h3>
          <p className="text-[10px] font-mono uppercase opacity-60 mt-1">
            Scanned: {new Date(qrPass.scannedAt!).toLocaleString()}
          </p>
        </div>
      )}

      {/* --- CARD CONTENT WRAPPER --- */}
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="inline-block bg-primary/10 text-primary font-mono text-[9px] font-bold uppercase tracking-widest rounded-lg py-1 px-2 border border-primary/20">
              {booking?.ticketType?.name || "ADMISSION PASS"}
            </span>
            <h2 className="text-xs font-black uppercase tracking-tight mt-1.5 truncate max-w-[200px]">
              {qrPass.eventName || booking?.eventName || `Event Reference #${qrPass.eventId}`}
            </h2>
          </div>
          
          <div>
            {qrPass.isScanned ? (
              <span className="inline-flex items-center text-error font-mono text-[9px] font-bold tracking-wider uppercase bg-error/10 px-2 py-1 rounded-lg border border-error/20">
                <AlertCircle size={10} className="mr-1" /> SCANNED
              </span>
            ) : (
              <span className="inline-flex items-center text-success font-mono text-[9px] font-bold tracking-wider uppercase bg-success/10 px-2 py-1 rounded-lg border border-success/20">
                <CheckCircle2 size={10} className="mr-1" /> VALID TICKET
              </span>
            )}
          </div>
        </div>

        {/* --- QR CODE EMBED CONTAINER --- */}
        <div className="flex justify-center items-center bg-white rounded-[1.5rem] p-5 shadow-inner border border-base-content/5">
          {qrPass.qrDataUrl ? (
            <img src={qrPass.qrDataUrl} alt="QR Code" className="w-44 h-44 object-contain" />
          ) : (
            <div className="w-44 h-44 bg-base-200 rounded-xl flex items-center justify-center text-[10px] text-primary font-mono">
              NO DATA
            </div>
          )}
        </div>

        {/* --- SYSTEM NETWORK METRICS LOGGER --- */}
        <div className="grid grid-cols-2 gap-3 bg-base-200/50 p-4 rounded-xl border border-base-content/5 font-mono text-[10px] opacity-80">
          <div>
            <span className="opacity-50 uppercase block tracking-wider text-[8px]">Ticket_Index</span>
            <span className="font-bold">#{qrPass.ticketId}</span>
          </div>
          <div className="text-right">
            <span className="opacity-50 uppercase block tracking-wider text-[8px]">Booking_Ref</span>
            <span className="font-bold">#{qrPass.bookingId}</span>
          </div>
          <div className="col-span-2 pt-2 border-t border-base-content/10">
            <span className="opacity-50 uppercase block tracking-wider text-[8px]">Token_Hash</span>
            <span className="font-bold text-primary break-all">{qrPass.ticketToken}</span>
          </div>
          <div className="pt-2 border-t border-base-content/10">
            <span className="opacity-50 uppercase block tracking-wider text-[8px]">Holder_ID</span>
            <span className="font-bold flex items-center gap-1">
              <User size={10} className="text-primary" /> {qrPass.nationalId}
            </span>
          </div>
          <div className="pt-2 border-t border-base-content/10 text-right">
            <span className="opacity-50 uppercase block tracking-wider text-[8px]">Issued_On</span>
            <span className="font-bold flex items-center justify-end gap-1">
              <Calendar size={10} className="text-primary" /> {issueDate}
            </span>
          </div>
        </div>
        
        {/* --- FOOTER --- */}
        <div className="pt-2 border-t border-dashed border-base-content/10 flex items-center gap-2">
            <RefreshCw size={10} className="opacity-40" />
            <span className="text-[8px] font-mono opacity-40 uppercase tracking-wider">
              Last Sync: {new Date(qrPass.updatedAt).toLocaleTimeString()}
            </span>
        </div>
      </div>
    </div>
  );
};

export default QrCodes;