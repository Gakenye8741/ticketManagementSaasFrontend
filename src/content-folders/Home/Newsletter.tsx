import React, { useState } from "react";
import { Send, Sparkles, Zap, Bell, CheckCircle2, Mail } from "lucide-react";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      // Simulate API call
      setTimeout(() => setSubscribed(false), 8000);
      setEmail("");
    }
  };

  return (
    <section className="relative py-24 px-6 bg-transparent overflow-hidden">
      <div className="max-w-6xl mx-auto relative">
        
        {/* --- OUTER GLOW RADIUS --- */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* --- MAIN GLASS CONTAINER --- */}
        <div className="group relative rounded-[3.5rem] p-[1px] bg-gradient-to-b from-white/20 to-transparent hover:from-cyan-500/40 transition-all duration-1000 shadow-2xl">
          
          <div className="relative bg-black/40 dark:bg-black/60 backdrop-blur-3xl rounded-[3.4rem] p-8 md:p-20 overflow-hidden border border-white/5">
            
            {/* BACKGROUND WATERMARK (Premium Detail) */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none flex items-center justify-center">
              <span className="text-[30rem] font-black italic tracking-tighter text-white rotate-12">
                DROP
              </span>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
              
              {/* CONTENT SIDE */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 border border-cyan-500/20 backdrop-blur-md">
                  <Sparkles className="w-3 h-3 fill-cyan-400" />
                  Inside Access
                </div>
                
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-[0.85] mb-8">
                  Get The <br /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">
                    VIP Link.
                  </span>
                </h2>
                
                <p className="text-lg font-medium text-white/30 max-w-md mx-auto lg:mx-0 italic leading-relaxed">
                  Join 5,000+ students getting real-time alerts for the biggest campus events. No spam, just the drops.
                </p>
              </div>

              {/* INPUT SIDE (The Glass Card) */}
              <div className="w-full lg:w-[450px]">
                <div className="relative p-1 rounded-[3rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-inner overflow-hidden">
                  
                  {/* Internal Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 blur-3xl rounded-full" />

                  <div className="relative p-8 md:p-10">
                    {!subscribed ? (
                      <form onSubmit={handleSubscribe} className="space-y-6">
                        <div className="relative group/input">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2">
                            <Mail className="w-5 h-5 text-white/20 group-focus-within/input:text-cyan-400 transition-colors" />
                          </div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@campus.edu"
                            className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] pl-16 pr-6 py-6 text-white font-bold placeholder:text-white/10 outline-none focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/5 transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          className="group w-full h-18 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-[0.3em] uppercase italic py-6 rounded-[1.5rem] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_20px_50px_rgba(34,211,238,0.2)] flex items-center justify-center gap-3"
                        >
                          Unlock Access
                          <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                      </form>
                    ) : (
                      /* SUCCESS STATE: Animated and Clean */
                      <div className="py-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-700">
                        <div className="w-20 h-20 bg-cyan-400/20 rounded-full flex items-center justify-center mb-6 border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                          <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">You're On The List</h4>
                        <p className="text-[10px] text-cyan-400/60 mt-3 font-black uppercase tracking-widest">Awaiting First Drop...</p>
                      </div>
                    )}

                    {/* Trust Badges */}
                    <div className="mt-10 flex items-center justify-between opacity-20 border-t border-white/5 pt-8">
                       <div className="flex items-center gap-2">
                          <Bell className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Instant Alerts</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Early Access</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};