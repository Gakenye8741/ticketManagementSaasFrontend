import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

export const TicketViewPage: React.FC = () => {
  const { ticketToken } = useParams<{ ticketToken: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Optional: Fetch extra ticket/event details from your backend if you want to show event name, venue, etc.
  // For now, it will safely fall back to displaying the token and QR code instantly.

  // Reset the "Copied" confirmation after a moment
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    if (!ticketToken) return;
    try {
      await navigator.clipboard.writeText(ticketToken);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the token is still selectable on screen.
    }
  };

  if (!ticketToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-800 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center max-w-md w-full">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Ticket Link</h2>
          <p className="text-sm text-zinc-500">No ticket token was provided in the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-zinc-50 to-zinc-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="relative bg-white rounded-3xl shadow-2xl shadow-indigo-900/10 ring-1 ring-zinc-200/70 overflow-hidden">

          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white px-6 pt-8 pb-10 text-center overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9a2 2 0 0 0 2-2V6h14v1a2 2 0 0 0 2 2v6a2 2 0 0 0-2 2v1H5v-1a2 2 0 0 0-2-2z" />
                <path d="M13 6v12" strokeDasharray="2 2.5" />
              </svg>
            </div>
            <h1 className="relative text-lg font-bold uppercase tracking-wider">TicketStream Pass</h1>
            <p className="relative text-xs text-indigo-100 mt-1">Official Gate Admission QR Code</p>
          </div>

          {/* Perforation with side notches */}
          <div className="relative h-0">
            <div className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-gradient-to-b from-indigo-50 via-zinc-50 to-zinc-100 ring-1 ring-zinc-200/70" />
            <div className="absolute -right-4 -top-4 h-8 w-8 rounded-full bg-gradient-to-b from-indigo-50 via-zinc-50 to-zinc-100 ring-1 ring-zinc-200/70" />
            <div className="absolute left-6 right-6 -top-px border-t-2 border-dashed border-zinc-200" />
          </div>

          {/* Content Body */}
          <div className="px-6 pt-10 pb-6 text-center">
            <p className="text-sm text-zinc-600 mb-6 max-w-xs mx-auto">
              Present this screen at the gate for instant scanning and verification.
            </p>

            {/* Optional details, shown only if your backend data provides them */}
            {loading && (
              <p className="text-xs text-zinc-400 mb-4 animate-pulse">Loading ticket details…</p>
            )}
            {ticketData && (ticketData.eventName || ticketData.venue) && (
              <div className="mb-6">
                {ticketData.eventName && (
                  <h2 className="text-base font-semibold text-zinc-900">{ticketData.eventName}</h2>
                )}
                {ticketData.venue && (
                  <p className="text-xs text-zinc-500 mt-0.5">{ticketData.venue}</p>
                )}
              </div>
            )}

            {/* QR Code Container */}
            <div className="relative inline-block my-2">
              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl p-5 shadow-inner">
                <QRCodeSVG
                  value={ticketToken}
                  size={220}
                  level={"H"}
                  includeMargin={true}
                  bgColor={"#ffffff"}
                  fgColor={"#18181b"}
                  className="block max-w-full h-auto"
                />
              </div>
              {/* Corner brackets */}
              <span className="pointer-events-none absolute -top-1.5 -left-1.5 h-6 w-6 rounded-tl-xl border-t-4 border-l-4 border-indigo-500" />
              <span className="pointer-events-none absolute -top-1.5 -right-1.5 h-6 w-6 rounded-tr-xl border-t-4 border-r-4 border-indigo-500" />
              <span className="pointer-events-none absolute -bottom-1.5 -left-1.5 h-6 w-6 rounded-bl-xl border-b-4 border-l-4 border-indigo-500" />
              <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-br-xl border-b-4 border-r-4 border-indigo-500" />
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              Tip: turn your screen brightness up for faster scanning.
            </p>

            {/* Token Display */}
            <div className="mt-5 flex items-center justify-center gap-2">
              <div className="bg-zinc-100 py-2 px-4 rounded-lg min-w-0 max-w-full">
                <p className="text-xs font-mono text-zinc-500 select-all break-all">
                  Token: <span className="text-zinc-800 font-semibold">{ticketToken}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy ticket token"
                className="shrink-0 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 text-xs text-zinc-400 flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>Powered by TicketStream Systems • Secure Gate Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketViewPage;