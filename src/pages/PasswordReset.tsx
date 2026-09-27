import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Navbar } from "../components/Navbar";
import { userApi } from "../features/APIS/UserApi";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

// Simple helper to check password strength
const checkStrength = (pass: string) => {
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-error', width: '33%' };
  if (score === 3) return { label: 'Good', color: 'bg-warning', width: '66%' };
  return { label: 'Strong', color: 'bg-success', width: '100%' };
};

export const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [updatePassword, { isLoading }] = userApi.useUpdateUserMutation();

  useEffect(() => {
    if (!token) {
      toast.error("Link is missing.");
      navigate("/login");
    }
  }, [token, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    const toastId = toast.loading("Saving new password...");
    
    try {
      await updatePassword({ token, password }).unwrap();
      toast.success("Done! You can now log in.", { id: toastId });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      let errorMessage = 'Failed to save. Try again.';
      
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
        @keyframes typePass {
          0%, 100% { width: 0px; }
          40%, 70% { width: 110px; }
        }
        .animate-type-pass {
          animation: typePass 4s steps(14, end) infinite;
          overflow: hidden;
          white-space: nowrap;
        }
      `}</style>

      <div className="pt-16 flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* --- Left Side: Animation Panel (Matching Login & Register) --- */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 bg-primary/10 p-10 xl:p-14 flex-col justify-between h-full border-r border-base-content/10 relative overflow-hidden">
          
          <div className="space-y-3 z-10">
            <h1 className="text-4xl xl:text-5xl font-black text-base-content tracking-tight">
              Create a secure password.
            </h1>
            <p className="text-base-content/70 text-sm leading-relaxed max-w-md">
              Protect your account with a strong password. Combine letters, numbers, and symbols to ensure maximum security across your platform sessions.
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
                <span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">Reset Password Page</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">New Password</span>
                <div className="h-8 rounded-lg bg-base-100 border border-primary/40 px-3 flex items-center text-xs font-mono text-primary">
                  <span className="animate-type-pass">••••••••••••</span>
                  <span className="w-1.5 h-3.5 bg-primary animate-pulse ml-0.5"></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Security Check</span>
                <div className="h-8 rounded-lg bg-base-100 border border-base-content/20 px-3 flex items-center text-xs font-mono text-base-content/80">
                  <span>Encryption: SHA-256</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-success">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Ready to Hash</span>
                <span className="text-[10px] font-mono opacity-60">Secure</span>
              </div>
            </div>
          </div>

          <div className="text-base-content/50 text-xs font-medium z-10">
            &copy; {new Date().getFullYear()} TicketStream. All rights reserved.
          </div>
        </div>

        {/* --- Right Side: Reset Password Form --- */}
        <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-base-100 h-full">
          <div className="w-full max-w-md z-10 my-auto">
            <div className="bg-base-200/70 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-8 border border-base-content/10 shadow-xl">
              
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Lock size={28} className="text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  New <span className="text-primary">Password</span>
                </h2>
                <p className="mt-1 text-xs text-base-content/60">
                  Choose a secure password for your account
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                
                {/* Password Input */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 ml-1">
                    Enter Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="input w-full h-13 bg-base-100 rounded-xl border-2 border-base-content/10 focus:border-primary transition-all text-sm font-semibold text-base-content pr-12 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength Meter */}
                  {password && (
                    <div className="px-1 mt-2 space-y-1">
                      <div className="h-1 w-full bg-base-300 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${checkStrength(password).color}`} 
                          style={{ width: checkStrength(password).width }}
                        />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-base-content/50">
                        Strength: {checkStrength(password).label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Input */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 ml-1">
                    Repeat Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="input w-full h-13 bg-base-100 rounded-xl border-2 border-base-content/10 focus:border-primary transition-all text-sm font-semibold text-base-content shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full h-14 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      Save Changes
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-base-content/10 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/40">
                  Secure Update Mode Active
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;