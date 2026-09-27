import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { 
  Sparkles, 
  Calculator, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Percent,
  ChevronDown,
  ReceiptText
} from "lucide-react";
import { Link } from "react-router-dom";
import { Toaster } from "sonner";

const PricingSection: React.FC = () => {
  // Calculator States - Default commission set to 5%
  const [ticketPrice, setTicketPrice] = useState<number>(1000); 
  const [ticketsSold, setTicketsSold] = useState<number>(250);
  const [commissionRate] = useState<number>(5); 

  // Financial Calculations
  const grossRevenue = ticketPrice * ticketsSold;
  const platformCommission = grossRevenue * (commissionRate / 100);
  
  // Tax breakdown (assuming standard Value Added Tax (VAT) is included within the 5% platform commission)
  // Standard VAT formula: VAT portion = Total Fee * (16 / 116)
  const vatIncludedInFee = platformCommission * (16 / 116);
  const netPlatformEarnings = platformCommission - vatIncludedInFee;
  const organizerRevenue = grossRevenue - platformCommission;

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How does TicketStream make money?",
      answer: "We charge a simple, flat 5% commission on every ticket you sell. We only make money when you successfully sell tickets. There are no hidden monthly fees or upfront subscription costs."
    },
    {
      question: "Does the 5% fee include Value Added Tax (VAT)?",
      answer: "Yes! The 5% commission is all-inclusive. It covers our platform services, secure M-Pesa and card payment processing, real-time ticket scanning, and the applicable Value Added Tax (VAT)."
    },
    {
      question: "When and how do I receive my event money?",
      answer: "Your ticket sales revenue is sent directly to your M-Pesa business account or bank account. You can request payouts while your event is selling tickets, or have your funds settled automatically after your event ends."
    },
    {
      question: "Can I pass the 5% fee on to people buying tickets?",
      answer: "Yes. When setting up your event, you can choose whether you want to pay the 5% fee yourself or pass it on to your attendees as a small booking fee."
    },
    {
      question: "How does the door ticket scanner work?",
      answer: "Every ticket purchased comes with a unique QR code. You can download our free TicketStreamScanner app on your phone to scan and check in guests quickly at the entrance   even without an active internet connection!"
    }
  ];

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content relative overflow-hidden">
      <Navbar />
      <Toaster richColors position="top-right" />

      {/* Clean Background Glow Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-base-content/5 rounded-full blur-3xl pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full space-y-24 relative z-10">
        
        {/* --- Header Section --- */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-8">
       
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            Clear Pricing, <span className="text-primary">Keep More Profit</span>
          </h1>
          <p className="text-sm sm:text-base text-base-content/80 font-medium leading-relaxed max-w-xl mx-auto">
            Host campus events, parties, and concerts with zero upfront costs. We charge a straightforward 5% fee per ticket sold that fully covers payment processing and government taxes.
          </p>
        </section>

        {/* --- Detailed Revenue & Commission Calculator Section --- */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
           
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Estimate Your Earnings</h2>
            <p className="text-xs sm:text-sm text-base-content/70 font-medium max-w-lg mx-auto">
              Use the sliders below to see your total sales, our all-inclusive 5% fee (with VAT breakdown), and your exact take-home profit.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Calculator Controls (Left Column) */}
            <div className="lg:col-span-6 bg-base-200/70 border-2 border-base-300 p-6 sm:p-10 rounded-3xl shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                
                {/* Ticket Price Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-base-content/80">Price Per Ticket</label>
                    <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary font-black text-sm">
                      KES {ticketPrice.toLocaleString()}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="10000" 
                    step="50"
                    value={ticketPrice} 
                    onChange={(e) => setTicketPrice(Number(e.target.value))}
                    className="range range-primary w-full h-3 bg-base-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-base-content/50 uppercase">
                    <span>KES 100</span>
                    <span>KES 5,000</span>
                    <span>KES 10,000</span>
                  </div>
                </div>

                {/* Tickets Sold Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-base-content/80">Total Tickets You Expect to Sell</label>
                    <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary font-black text-sm">
                      {ticketsSold.toLocaleString()} Tickets
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="2000" 
                    step="10"
                    value={ticketsSold} 
                    onChange={(e) => setTicketsSold(Number(e.target.value))}
                    className="range range-primary w-full h-3 bg-base-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-base-content/50 uppercase">
                    <span>10</span>
                    <span>1,000</span>
                    <span>2,000</span>
                  </div>
                </div>

                {/* Commission Summary Badge */}
                <div className="p-4 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-base-content/60">Platform Charge Rate</span>
                    <p className="text-sm font-extrabold">All-Inclusive Fee (VAT Included)</p>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-black text-base">
                    {commissionRate}%
                  </span>
                </div>

              </div>

              <div className="pt-4 border-t border-base-300 flex items-center gap-3 text-xs text-base-content/70 font-medium">
                <ShieldCheck size={18} className="text-primary shrink-0" />
                <span>Includes M-Pesa checkout support, gate scanner access, and transparent tax reporting.</span>
              </div>
            </div>

            {/* Calculator Results (Right Column) */}
            <div className="lg:col-span-6 bg-base-200/90 border-2 border-base-300 p-6 sm:p-10 rounded-3xl shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-8">
              
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                  <TrendingUp size={14} /> Detailed Financial Breakdown
                </div>
                <h3 className="text-2xl font-black tracking-tight">Your Money Overview</h3>
              </div>

              <div className="space-y-4">
                
                {/* Gross Revenue */}
                <div className="bg-base-100 border border-base-300 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-base-content/60">Total Ticket Sales</span>
                      <p className="text-xs font-extrabold">Gross Revenue</p>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-black text-base-content">
                    KES {grossRevenue.toLocaleString()}
                  </span>
                </div>

                {/* Total Platform Fee (Including VAT) */}
                <div className="bg-base-100 border border-base-300 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center font-bold">
                      <Percent size={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-base-content/60">5% Platform Fee (Tax Included)</span>
                      <p className="text-xs font-extrabold">Total Deduction</p>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-black text-error">
                    - KES {platformCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Detailed Tax Breakdown Note */}
                <div className="bg-base-100/50 border border-base-300/60 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-base-content/70">
                    <ReceiptText size={14} className="text-primary shrink-0" />
                    <span>Inside the 5% fee deduction:</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-base-content/60 pl-5">
                    <span>Estimated Value Added Tax (VAT):</span>
                    <span className="font-bold">KES {vatIncludedInFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-base-content/60 pl-5">
                    <span>Net Platform Earnings:</span>
                    <span className="font-bold">KES {netPlatformEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Net Organizer Payout */}
                <div className="bg-base-100 border-2 border-primary/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-0.5">Your Take-Home Profit</span>
                    <h4 className="text-base sm:text-lg font-black tracking-tight">Net Organizer Payout</h4>
                  </div>
                  <span className="text-lg sm:text-2xl font-black text-primary">
                    KES {organizerRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

              </div>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="btn btn-primary w-full h-14 rounded-2xl border-none font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 gap-2"
                >
                  Start Selling Tickets Now
                  <ArrowRight size={16} />
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* --- Features & Benefits Section --- */}
        <section className="space-y-10 pt-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-primary">All-Inclusive Service</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">What You Get For 5%</h2>
            <p className="text-xs sm:text-sm text-base-content/70 font-medium max-w-lg mx-auto">
              No hidden fees, no subscription bills, and complete tax transparency. Every event gets full access to our professional tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { 
                title: "Unlimited Event Listings", 
                desc: "Create and publish as many campus parties, concerts, or club events as you want without restrictions." 
              },
              { 
                title: "Instant M-Pesa & Card Checkout", 
                desc: "Provide attendees with quick automated STK push payments and instant digital ticket confirmation." 
              },
              { 
                title: "Real-Time Gate Scanning", 
                desc: "Scan and verify guest QR codes rapidly at the entrance using our mobile app, even when offline." 
              },
              { 
                title: "Transparent Tax & Payout Reports", 
                desc: "Receive clear financial summaries showing exact ticket counts, VAT calculations, and net earnings." 
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-base-200/60 border border-base-300 p-6 rounded-3xl space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="font-extrabold text-base">{feature.title}</h3>
                <p className="text-xs text-base-content/70 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- FAQ Section --- */}
        <section className="space-y-8 max-w-4xl mx-auto pt-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
              <HelpCircle size={16} /> Got Questions?
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-base-content/70 font-medium">
              Find simple answers about our 5% commission rate, tax details, and payout methods.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-base-200/70 border-2 border-base-300 rounded-3xl overflow-hidden transition-all duration-300 shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-black text-base sm:text-lg focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <div className={`w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-primary text-primary-content' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed border-t border-base-300/50 pt-4 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default PricingSection;