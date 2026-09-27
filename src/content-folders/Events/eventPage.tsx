import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Calendar, CheckCircle, Clock,
  DollarSign, MapPin, Tag, XCircle, ShoppingCart, Phone, CreditCard, Loader2, Check,
  ShieldCheck, Info as InfoIcon
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { Carousel } from "react-responsive-carousel";
import { PuffLoader } from "react-spinners";
import "react-responsive-carousel/lib/styles/carousel.min.css";

import { eventApi } from "../../features/APIS/EventsApi";
import { useCreateBookingMutation } from "../../features/APIS/BookingsApi";
import { useGetTicketTypesByEventIdQuery } from "../../features/APIS/ticketsType.Api";
import { mediaApi } from "../../features/APIS/mediaApi";
import { paymentApi } from "../../features/APIS/PaymentApi";
import { useInitiateStkPushMutation } from "../../features/APIS/MpesaApi"; 

import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import type { RootState } from "../../App/store";

type BookingPayload = {
  nationalId: number;
  eventId: number;
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  totalAmount: string;
};

type BookingResponse = {
  booking: { bookingId: number }[];
};

const formatKES = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(amount);

export const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const { data: event, isLoading, error } = eventApi.useGetEventByIdQuery(id!);
  const { data: ticketTypes } = useGetTicketTypesByEventIdQuery(id!);
  const { data: mediaData } = mediaApi.useGetMediaByEventIdQuery(id!);

  const [createBooking, { isLoading: isBooking }] = useCreateBookingMutation();
  const [createCheckoutSession, { isLoading: isStripeLoading }] = paymentApi.useCreateCheckoutSessionMutation();
  const [initiateStkPush, { isLoading: isMpesaLoading }] = useInitiateStkPushMutation();

  const [quantity, setQuantity] = useState(1);
  const [ticketTypeName, setTicketTypeName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "mpesa">("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Updated logic to block both ENDED and CANCELLED statuses
  const isBookingDisabled = event?.status === "ended" || event?.status === "cancelled";

  const { data: paymentData } = paymentApi.useGetPaymentsByBookingIdQuery(activeBookingId!, {
    skip: !activeBookingId || !showStatusModal || isConfirmed,
    pollingInterval: 3000, 
    refetchOnMountOrArgChange: true, 
  });

  const hasTicketTypes = Array.isArray(ticketTypes) && ticketTypes.length > 0;

  useEffect(() => {
    if (paymentData && Array.isArray(paymentData) && paymentData.length > 0) {
      const successfulPayment = paymentData.find(
        (p: any) => p.paymentStatus?.toLowerCase() === "completed" || p.paymentStatus?.toLowerCase() === "success"
      );

      if (successfulPayment) {
        setIsConfirmed(true);
        toast.success("Payment and Booking confirmed successfully!");
        setTimeout(() => {
          setShowStatusModal(false);
          navigate("/dashboard/MyBookings");
        }, 3000);
      }
    }
  }, [paymentData, navigate]);

  useEffect(() => {
    if (hasTicketTypes) {
      setTicketTypeName(ticketTypes![0].name);
    } else {
      setTicketTypeName("");
    }
  }, [ticketTypes, hasTicketTypes]);

  const handleBooking = async () => {
    if (isBookingDisabled) {
      toast.error("This event is not accepting bookings.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("You must be logged in to book tickets.");
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!hasTicketTypes) {
      toast.error("No ticket types available.");
      return;
    }

    if (!user?.nationalId || quantity < 1) {
      toast.error("Invalid National ID or quantity. Please update your profile.");
      return;
    }

    if (paymentMethod === "mpesa" && (!phoneNumber || phoneNumber.length < 10)) {
      toast.error("Please enter a valid phone number for M-Pesa.");
      return;
    }

    const selectedTicket = ticketTypes?.find((t: any) => t.name === ticketTypeName);
    if (!selectedTicket) {
      toast.error("Invalid ticket type selected");
      return;
    }

    const totalAmount = quantity * Number(selectedTicket.price);
    const payload: BookingPayload = {
      nationalId: Number(user.nationalId),
      eventId: Number(id),
      ticketTypeId: selectedTicket.id,
      ticketTypeName: selectedTicket.name,
      quantity,
      totalAmount: totalAmount.toString(),
    };

    try {
      const response = (await createBooking(payload).unwrap()) as unknown as BookingResponse;
      const bookingId = response.booking?.[0]?.bookingId;

      if (!bookingId) {
        toast.error("Booking ID not found.");
        return;
      }

      setActiveBookingId(bookingId);

      if (paymentMethod === "stripe") {
        const sessionPayload = {
          bookingId,
          nationalId: Number(user.nationalId),
          amount: totalAmount,
          email: user.email || "",
          eventName: event.title,
          ticketTypeName: selectedTicket.name,
          quantity,
        };
        const session = await createCheckoutSession(sessionPayload).unwrap();
        if (session.url) {
          window.location.href = session.url;
        } else {
          toast.error("Failed to retrieve Stripe checkout URL.");
        }
      } else {
        const formattedPhone = phoneNumber.startsWith("0") 
          ? "254" + phoneNumber.slice(1) 
          : phoneNumber.startsWith("+") 
          ? phoneNumber.slice(1) 
          : phoneNumber;

        await initiateStkPush({
          phoneNumber: formattedPhone,
          amount: Math.round(totalAmount),
          bookingId,
          nationalId: Number(user.nationalId),
        }).unwrap();
        
        setShowStatusModal(true);
        toast.success("STK Push initiated!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Booking or payment failed.");
    }
  };

  if (isLoading)
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-screen bg-base-100">
        <PuffLoader color="#6366f1" size={100} />
        <p className="text-primary font-black animate-pulse tracking-widest uppercase italic">Loading Event Details...</p>
      </div>
    );

  if (error || !event)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-100">
        <XCircle size={64} className="text-error mb-4" />
        <h2 className="text-2xl font-black italic uppercase">System Error</h2>
        <p className="text-base-content/60">Event could not be retrieved.</p>
        <button onClick={() => navigate("/")} className="btn btn-primary mt-6">Go Home</button>
      </div>
    );

  const selectedTicket = ticketTypes?.find((t: any) => t.name === ticketTypeName);
  const ticketPrice = selectedTicket?.price ?? 0;
  const total = quantity * ticketPrice;

  return (
    <div className="bg-base-200/50">
      <Navbar />
      
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base-300/80 backdrop-blur-md px-4">
          <div className="bg-base-100 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center space-y-6 border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-center">
              {isConfirmed ? (
                <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center shadow-lg shadow-success/20">
                  <Check className="text-success" size={40} strokeWidth={3} />
                </div>
              ) : (
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Loader2 className="text-primary" size={32} />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                {isConfirmed ? "Booking Confirmed" : "Processing Payment"}
              </h3>
              <p className="text-base-content/60 mt-2 text-sm">
                {isConfirmed 
                  ? "Great! We've secured your spot. Redirecting to your dashboard..." 
                  : `Please check your phone. We've sent a payment prompt to ${phoneNumber}.`}
              </p>
            </div>
            {!isConfirmed && (
              <div className="bg-base-200/50 backdrop-blur p-4 rounded-2xl text-xs font-mono flex flex-col items-center gap-2 border border-white/5">
                <span className="opacity-50">TX_REF: {activeBookingId}</span>
                <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={12} />
                  SYNCING WITH PROVIDER...
                </div>
              </div>
            )}
            <button 
              onClick={() => setShowStatusModal(false)}
              className="btn btn-outline btn-block rounded-2xl border-white/10 font-black uppercase italic tracking-widest text-[11px]"
              disabled={isConfirmed}
            >
              {isConfirmed ? "Confirmed" : "Cancel & Close"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-16 sm:mt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.2em] opacity-60 hover:opacity-100 transition-all">
              <div className="p-2 bg-base-100 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                 <ArrowLeft size={16} />
              </div>
              Back to Discover
            </button>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.2em] px-4 py-2 bg-base-100 rounded-2xl border border-white/5">
               <ShieldCheck size={14} className="text-success" /> Verified Event
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-base-100 rounded-[2.5rem] overflow-hidden shadow-xl border border-white/5">
                {mediaData?.length > 0 ? (
                  <Carousel 
                    showThumbs={false} 
                    infiniteLoop 
                    autoPlay 
                    className="detail-carousel"
                    renderIndicator={(clickHandler, isSelected) => (
                      <li 
                        className={`inline-block w-8 h-1 mx-1 rounded-full transition-all ${isSelected ? 'bg-primary' : 'bg-white/20'}`}
                        onClick={clickHandler}
                      />
                    )}
                  >
                    {mediaData.map((media: any) => (
                      <div key={media.mediaId} className="h-[300px] sm:h-[500px]">
                        {media.type === "image" ? (
                          <img src={media.url} alt="event" className="object-cover h-full w-full" />
                        ) : (
                          <video controls className="h-full w-full bg-black object-cover">
                            <source src={media.url} type="video/mp4" />
                          </video>
                        )}
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <div className="h-80 bg-base-300 flex items-center justify-center italic opacity-30">No Media Provided</div>
                )}
                
                <div className="p-8">
                   <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter mb-4 leading-none">{event.title}</h1>
                   <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20">{event.category}</span>
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${event.status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
                        {event.status}
                      </span>
                   </div>
                   <p className="text-base-content/70 leading-relaxed text-sm sm:text-base border-l-2 border-primary/30 pl-4">{event.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-base-100 p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-xs font-black uppercase italic tracking-widest text-primary flex items-center gap-2">
                    <Calendar size={14} /> Schedule
                  </h3>
                  <div className="space-y-3">
                    <Info icon={<Calendar />} label="Date" value={event.date} />
                    <Info icon={<Clock />} label="Time" value={event.time} />
                    <Info icon={<MapPin />} label="Venue" value={event.venue?.name ?? "To Be Announced"} />
                  </div>
                </div>
                <div className="bg-base-100 p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-xs font-black uppercase italic tracking-widest text-primary flex items-center gap-2">
                    <Tag size={14} /> Pricing Info
                  </h3>
                  <div className="space-y-3">
                    <Info icon={<DollarSign />} label="Base Price" value={`KSh ${event.ticketPrice}`} />
                    <Info icon={<ShoppingCart />} label="Capacity" value="Limited Availability" />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <div className="bg-base-100 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                   {isBookingDisabled ? "Booking Closed" : "Get Your Tickets"}
                </h2>

                {!isAuthenticated && (
                  <div className="flex items-start gap-3 bg-warning/10 p-4 rounded-2xl border border-warning/20 mb-6 group cursor-pointer" onClick={() => navigate("/login", { state: { from: location } })}>
                    <InfoIcon className="text-warning shrink-0" size={18} />
                    <p className="text-[11px] font-bold text-warning uppercase leading-tight">
                      Authentication Required. <span className="underline decoration-2">Login to continue</span>
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">System Digital ID</label>
                      <ShieldCheck size={12} className="text-success opacity-50" />
                    </div>
                    <div className="bg-base-200/50 p-4 rounded-2xl border border-white/5 font-black italic tracking-widest text-sm opacity-60">
                       {user?.nationalId || "NOT REGISTERED"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic px-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className="input bg-base-200/50 border-white/10 rounded-2xl w-full font-black focus:ring-primary focus:border-primary transition-all"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        disabled={!isAuthenticated || isBookingDisabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic px-1">Tier</label>
                      {hasTicketTypes ? (
                        <select
                          className="select bg-base-200/50 border-white/10 rounded-2xl w-full font-black uppercase italic text-xs transition-all"
                          value={ticketTypeName}
                          onChange={(e) => setTicketTypeName(e.target.value)}
                          disabled={!isAuthenticated || isBookingDisabled}
                        >
                          {ticketTypes!.map((type: any) => (
                            <option key={type.id} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-4 bg-base-200 rounded-2xl text-[10px] uppercase font-bold opacity-40">None</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic px-1">Select Gateway</label>
                    <div className="flex p-1.5 bg-base-200/80 rounded-[1.5rem] border border-white/5 gap-1">
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod("mpesa")}
                        disabled={isBookingDisabled}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all font-black uppercase italic text-[10px] tracking-widest ${paymentMethod === "mpesa" ? "bg-primary text-white shadow-lg" : "hover:bg-white/5 opacity-50"} ${isBookingDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                      >
                        <Phone size={14} /> M-Pesa
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod("stripe")}
                        disabled={isBookingDisabled}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all font-black uppercase italic text-[10px] tracking-widest ${paymentMethod === "stripe" ? "bg-primary text-white shadow-lg" : "hover:bg-white/5 opacity-50"} ${isBookingDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                      >
                        <CreditCard size={14} /> Stripe
                      </button>
                    </div>
                  </div>

                  {paymentMethod === "mpesa" && !isBookingDisabled && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic px-1">M-Pesa Number</label>
                       <input
                        type="text"
                        placeholder="07XX XXX XXX"
                        className="input bg-base-200/50 border-white/10 rounded-2xl w-full font-black tracking-widest focus:ring-primary focus:border-primary transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={!isAuthenticated}
                      />
                    </div>
                  )}

                  {hasTicketTypes && (
                    <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 space-y-3">
                      <div className="flex justify-between text-[11px] font-bold uppercase opacity-60">
                        <span>Unit Price</span>
                        <span>{formatKES(ticketPrice)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold uppercase opacity-60">
                        <span>Quantity</span>
                        <span>x {quantity}</span>
                      </div>
                      <div className="h-[1px] bg-primary/20 w-full" />
                      <div className="flex justify-between items-center pt-2">
                         <span className="text-xs font-black uppercase italic tracking-widest opacity-80">Total Due</span>
                         <span className="text-2xl font-black text-primary italic tracking-tighter">{formatKES(total)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleBooking()}
                    className={`btn w-full h-16 rounded-[1.8rem] flex items-center justify-center gap-3 font-black uppercase italic tracking-[0.15em] shadow-xl shadow-primary/25 transition-all group ${isBookingDisabled ? "bg-base-content/10 cursor-not-allowed" : "btn-primary hover:scale-[1.02] active:scale-95"}`}
                    disabled={isBooking || isStripeLoading || isMpesaLoading || !hasTicketTypes || isBookingDisabled}
                  >
                    {isBookingDisabled ? (
                      "Booking Closed"
                    ) : isBooking || isStripeLoading || isMpesaLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <ShoppingCart size={20} className="group-hover:rotate-12 transition-transform" />
                        Secure Booking Now
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[9px] font-black uppercase tracking-widest opacity-30 px-6">
                    By confirming, you agree to our terms of service and ticketing policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactElement; label: string; value: string | number }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 bg-base-200/50 rounded-xl flex items-center justify-center shrink-0 border border-white/5">
       <span className="text-primary">{icon}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
      <span className="text-sm font-bold opacity-80">{value}</span>
    </div>
  </div>
);