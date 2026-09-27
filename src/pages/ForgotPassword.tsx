import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { Navbar } from '../components/Navbar';
import { userApi } from '../features/APIS/UserApi';
import { Mail, KeyRound, ArrowLeft, Loader2, Send, CheckCircle2 } from 'lucide-react';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  // Replace with your actual RTK Query mutation hook if named differently in your UserApi
  const [forgotPassword, { isLoading }] = userApi.useRequestPasswordResetMutation?.() || [
    async () => ({ data: { message: "Reset link sent successfully!" } }),
    { isLoading: false }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    const toastId = toast.loading("Sending reset instructions...");
    try {
      const response = await forgotPassword({ email }).unwrap();
      toast.success(response?.message || "Password reset code sent to your email!", { id: toastId });
      
      // Pass email along to the reset-password page via router state
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err: any) {
      let errorMessage = 'Failed to send reset instructions. Please try again.';
      
      if (typeof err?.data?.error === 'string') {
        errorMessage = err.data.error;
      } else if (typeof err?.data?.message === 'string') {
        errorMessage = err.data.message;
      } else if (err?.data?.error && typeof err?.data?.error === 'object') {
        errorMessage = JSON.stringify(err.data.error);
      } else if (err?.error) {
        errorMessage = err.error;
      }

      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <div className="h-screen w-screen bg-base-100 font-sans overflow-hidden flex flex-col">
      <Toaster richColors position="top-right" />
      <Navbar />

      {/* Animation Styles */}
      <style>{`
        @keyframes typeEmail {
          0%, 100% { width: 0px; }
          40%, 70% { width: 140px; }
        }
        .animate-type-email {
          animation: typeEmail 4s steps(18, end) infinite;
          overflow: hidden;
          white-space: nowrap;
        }
      `}</style>

      <div className="pt-16 flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* --- Left Side: Animation Panel --- */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 bg-primary/10 p-10 xl:p-14 flex-col justify-between h-full border-r border-base-content/10 relative overflow-hidden">
          
          <div className="space-y-3 z-10">
            <h1 className="text-4xl xl:text-5xl font-black text-base-content tracking-tight">
              Recover access in seconds.
            </h1>
            <p className="text-base-content/70 text-sm leading-relaxed max-w-md">
              Forgot your password? No worries. Enter your registered email address to receive a secure recovery code and get back to your events.
            </p>
          </div>

          <div className="relative flex items-center justify-center my-auto py-4 z-10">
            <div className="w-80 bg-base-200/90 backdrop-blur-md rounded-2xl border border-base-content/15 p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-base-content/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                </div>
                <span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">Forgot Password Page</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Target Email</span>
                <div className="h-8 rounded-lg bg-base-100 border border-primary/40 px-3 flex items-center text-xs font-mono text-primary">
                  <span className="animate-type-email">user@domain.com</span>
                  <span className="w-1.5 h-3.5 bg-primary animate-pulse ml-0.5"></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Status</span>
                <div className="h-8 rounded-lg bg-base-100 border border-base-content/20 px-3 flex items-center text-xs font-mono text-base-content/80">
                  <span>Dispatching Token...</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-success">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Token Dispatched</span>
                <span className="text-[10px] font-mono opacity-60">Secure</span>
              </div>
            </div>
          </div>

          <div className="text-base-content/50 text-xs font-medium z-10">
            &copy; {new Date().getFullYear()} TicketStream. All rights reserved.
          </div>
        </div>

        {/* --- Right Side: Forgot Password Form --- */}
        <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-base-100 h-full">
          <div className="w-full max-w-md z-10 my-auto">
            <div className="bg-base-200/70 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-8 border border-base-content/10 shadow-xl">
              
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <KeyRound size={28} className="text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  Forgot <span className="text-primary">Password?</span>
                </h2>
                <p className="mt-1 text-xs text-base-content/60">
                  Enter your email and we'll send you recovery instructions
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 ml-1">
                    <Mail size={12} className="text-primary" /> Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoFocus
                    className="input w-full h-14 bg-base-100 rounded-xl border-2 border-base-content/10 focus:border-primary transition-all text-sm font-semibold text-base-content px-4 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full h-14 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      Send Reset Code
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 pt-5 border-t border-base-content/10 text-center">
                <button 
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 mx-auto text-primary hover:opacity-80 font-semibold text-xs transition-all"
                >
                  <ArrowLeft size={14} /> 
                  Back to Login
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;