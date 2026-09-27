import React, { useRef } from "react";
import emailjs from "emailjs-com";
import { toast, Toaster } from "react-hot-toast";
import { 
  Instagram, 
  Linkedin, 
  Twitter, 
  Github, 
  Mail, 
  MessageSquare, 
  User, 
  Send,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Headphones,
  AlertTriangle,
  QrCode,
  CreditCard
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

// EmailJS Credentials
const SERVICE_ID = "service_36rahuf";
const TEMPLATE_ID = "template_t7k2dxh";
const PUBLIC_KEY = "mSrGC2dXclojT6ci1";

const ContactSection: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    toast.promise(
      emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, PUBLIC_KEY),
      {
        loading: "Sending your message...",
        success: () => {
          formRef.current?.reset();
          return "✅ Message sent successfully!";
        },
        error: "❌ Failed to send. Please try again.",
      }
    ).catch((err) => {
      console.error("EmailJS error:", err);
      toast.error("An unexpected error occurred.");
    });
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between font-sans selection:bg-primary selection:text-primary-content relative overflow-hidden">
      <Navbar />
      <Toaster position="top-right" />

      {/* Clean Background Glow Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-base-content/5 rounded-full blur-3xl pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full space-y-16 relative z-10">
        
        {/* Header Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-8">
         
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            Get in <span className="text-primary">Touch With Us</span>
          </h1>
          <p className="text-sm sm:text-base text-base-content/80 font-medium leading-relaxed max-w-xl mx-auto">
            Have questions, need technical assistance, or want to report an issue with ticket scanning or payments? Our support team is ready to help 24/7.
          </p>
        </section>

        {/* --- NEW DETAILED SECTION: Common Quick-Help Topics --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <CreditCard size={20} />
            </div>
            <h3 className="font-extrabold text-base">Payment & M-Pesa Help</h3>
            <p className="text-xs text-base-content/70 font-medium leading-relaxed">
              If an STK push failed or ticket funds haven't reflected in your account, share your transaction code below.
            </p>
          </div>

          <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <QrCode size={20} />
            </div>
            <h3 className="font-extrabold text-base">Scanner & Gate Issues</h3>
            <p className="text-xs text-base-content/70 font-medium leading-relaxed">
              Experiencing trouble logging into the TicketStreamScanner mobile app or scanning QR codes at your gate? Let us know.
            </p>
          </div>

          <div className="bg-base-200/50 border border-base-300 p-6 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-extrabold text-base">Urgent Event Support</h3>
            <p className="text-xs text-base-content/70 font-medium leading-relaxed">
              Hosting a live event right now and need immediate technical intervention? Use our priority contact form or email.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Info & Contact Details */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-base-200/70 border-2 border-base-300 p-8 sm:p-10 rounded-3xl shadow-xl backdrop-blur-xl flex-grow space-y-8">
              
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Headphones size={24} />
                </div>
                <h3 className="text-2xl font-black tracking-tight">TicketStream Support Desk</h3>
                <p className="text-xs sm:text-sm text-base-content/75 font-medium leading-relaxed">
                  We provide fast answers and reliable technical support to make sure your campus events and door checks run seamlessly.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">Location</span>
                    <p className="text-sm font-bold">Tech Hub, Nairobi, Kenya</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">Email Address</span>
                    <p className="text-sm font-bold">support@ticketstream.io</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">Working Hours</span>
                    <p className="text-sm font-bold">Monday – Sunday (24/7 Support)</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-base-300">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary block mb-3">Social Media Links</span>
                <div className="flex gap-3">
                  <SocialLink href="https://instagram.com"><Instagram size={18} /></SocialLink>
                  <SocialLink href="https://twitter.com"><Twitter size={18} /></SocialLink>
                  <SocialLink href="https://linkedin.com"><Linkedin size={18} /></SocialLink>
                  <SocialLink href="https://github.com"><Github size={18} /></SocialLink>
                </div>
              </div>

            </div>

            {/* Trust Badge Card */}
            <div className="bg-base-200/70 border border-base-300 p-6 rounded-3xl shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm">Secure Communication</h4>
                <p className="text-xs text-base-content/70 font-medium">Your messages and reports are safe, encrypted, and handled privately.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Issue Reporting Form */}
          <div className="lg:col-span-7">
            <div className="bg-base-200/90 border-2 border-base-300 p-8 sm:p-12 rounded-3xl shadow-xl backdrop-blur-xl h-full flex flex-col justify-center">
              
              <div className="mb-8 space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-primary">Send a Message or Report an Issue</span>
                <h3 className="text-2xl font-black tracking-tight">Drop Us a Line</h3>
                <p className="text-xs text-base-content/70 font-medium">Fill out the form below with your inquiry or issue details, and our team will reply quickly.</p>
              </div>

              <form ref={formRef} onSubmit={sendEmail} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-base-content/80 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        name="from_name"
                        type="text"
                        placeholder="John Doe"
                        className="input input-bordered w-full h-14 pl-12 rounded-2xl bg-base-100 border-base-300 focus:border-primary transition-all font-bold text-sm placeholder:text-base-content/30"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-base-content/80 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        name="from_email"
                        type="email"
                        placeholder="john@example.com"
                        className="input input-bordered w-full h-14 pl-12 rounded-2xl bg-base-100 border-base-300 focus:border-primary transition-all font-bold text-sm placeholder:text-base-content/30"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-base-content/80 ml-1">Your Message or Issue Report</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-5 w-4 h-4 text-primary" />
                    <textarea
                      name="message"
                      placeholder="Describe your question, payment issue, or scanner problem here..."
                      className="textarea textarea-bordered w-full h-40 pl-12 pt-4 rounded-2xl bg-base-100 border-base-300 focus:border-primary transition-all font-bold text-sm placeholder:text-base-content/30 resize-none"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-full h-16 rounded-2xl border-none font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 group gap-2"
                >
                  Send Message / Report Issue
                  <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>

              </form>

            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
};

const SocialLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-base-100 border border-base-300 text-base-content/70 hover:text-primary hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 shadow-xs"
  >
    {children}
  </a>
);

export default ContactSection;