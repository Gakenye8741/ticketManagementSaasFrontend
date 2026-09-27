import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { Navbar } from '../components/Navbar';
import { userApi } from '../features/APIS/UserApi';
import { Mail, ShieldCheck, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export const EmailVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get the email passed from the registration page
  const userEmail = location.state?.email || '';
  
  // 6 individual state slots for the box design
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyEmail, { isLoading }] = userApi.useVerifyEmailMutation();

  // Combine array into string
  const code = otpArray.join('');

  // Automatically submit when all 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && !isLoading) {
      handleVerify(code);
    }
  }, [code]);

  // If no email is found, send user back to register
  useEffect(() => {
    if (!userEmail) {
      toast.error("Please sign up first.");
      navigate("/register");
    }
  }, [userEmail, navigate]);

  // Handle typing across the 6 boxes
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // Numbers only
    const newOtp = [...otpArray];
    newOtp[index] = value.substring(value.length - 1); // Keep only the last character typed
    setOtpArray(newOtp);

    // Move to next input automatically if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation between boxes
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (finalCode: string) => {
    const toastId = toast.loading("Checking code...");
    try {
      // Backend payload matching { email, otp }
      const response = await verifyEmail({ 
        email: userEmail, 
        otp: String(finalCode) 
      }).unwrap();
      
      toast.success(response?.message || "Email verified successfully!", { id: toastId });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      // Safely parse error to prevent React child crashes
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (typeof err?.data?.error === 'string') {
        errorMessage = err.data.error;
      } else if (typeof err?.data?.message === 'string') {
        errorMessage = err.data.message;
      } else if (err?.data?.error && typeof err.data.error === 'object') {
        errorMessage = JSON.stringify(err.data.error);
      } else if (err?.error) {
        errorMessage = err.error;
      }

      toast.error(errorMessage, { id: toastId });
      setOtpArray(['', '', '', '', '', '']); // Reset boxes on error
      inputRefs.current[0]?.focus(); // Focus back to first box
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
          40%, 70% { width: 130px; }
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
              Secure your account instantly.
            </h1>
            <p className="text-base-content/70 text-sm leading-relaxed max-w-md">
              Verify your email address to unlock full access to your event dashboards, ticket scanner tools, and fast checkouts.
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
                <span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">Verify_Node.tsx</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Email Address</span>
                <div className="h-8 rounded-lg bg-base-100 border border-primary/40 px-3 flex items-center text-xs font-mono text-primary">
                  <span className="animate-type-email">youremail.com</span>
                  <span className="w-1.5 h-3.5 bg-primary animate-pulse ml-0.5"></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">OTP Code</span>
                <div className="h-8 rounded-lg bg-base-100 border border-base-content/20 px-3 flex items-center text-xs font-mono text-base-content/80">
                  <span>2 1 4 1 3 0</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-success">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Code Verified</span>
                <span className="text-[10px] font-mono opacity-60">Secure</span>
              </div>
            </div>
          </div>

          <div className="text-base-content/50 text-xs font-medium z-10">
            &copy; {new Date().getFullYear()} TicketStream. All rights reserved.
          </div>
        </div>

        {/* --- Right Side: Verification Form --- */}
        <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-base-100 h-full">
          <div className="w-full max-w-md z-10 my-auto">
            <div className="bg-base-200/70 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-8 border border-base-content/10 shadow-xl">
              
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    {isLoading ? (
                      <Loader2 size={28} className="text-primary animate-spin" />
                    ) : (
                      <ShieldCheck size={28} className="text-primary" />
                    )}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  Verify Your <span className="text-primary">Email</span>
                </h2>
                <p className="mt-1 text-xs text-base-content/60">
                  {isLoading ? 'Verifying...' : 'Enter the 6-digit OTP code we sent you'}
                </p>
              </div>

              <div className="space-y-5">
                {/* Email Display */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 ml-1">
                    <Mail size={12} className="text-primary" /> Sent To
                  </label>
                  <div className="w-full h-11 bg-base-100/80 rounded-xl border border-base-content/10 flex items-center px-4 font-semibold text-xs text-base-content/80">
                    {userEmail}
                  </div>
                </div>

                {/* 6-Box OTP Input Grid */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60 ml-1">
                    OTP Code
                  </label>
                  <div className="flex justify-between gap-2">
                    {otpArray.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        disabled={isLoading}
                        autoFocus={index === 0}
                        className="w-12 h-14 bg-base-100 rounded-xl border-2 border-base-content/10 focus:border-primary text-center text-2xl font-bold text-base-content transition-all shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="mt-6 pt-5 border-t border-base-content/10 text-center">
                <button 
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-2 mx-auto text-primary hover:opacity-80 font-semibold text-xs transition-all"
                >
                  <ArrowLeft size={14} /> 
                  Go back to Sign Up
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailVerification;