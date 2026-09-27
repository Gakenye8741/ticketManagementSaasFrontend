import { useForm } from 'react-hook-form';
import { Navbar } from '../components/Navbar';
import { userApi } from '../features/APIS/UserApi';
import { toast, Toaster } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, User, Mail, Lock, Phone, Fingerprint, Ticket, CheckCircle2 } from 'lucide-react';

interface RegisterDetails {
  nationalId: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactPhone: string;
  role: 'user' | 'organizer';
}

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&#]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-error', percent: '33%' };
  if (score === 3 || score === 4) return { label: 'Medium', color: 'bg-warning', percent: '66%' };
  return { label: 'Strong', color: 'bg-success', percent: '100%' };
};

const Register = () => {
  const { register, handleSubmit, setValue } = useForm<RegisterDetails>({
    defaultValues: { role: 'user' }
  });
  const [registerUser, { isLoading }] = userApi.useRegisterUserMutation();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Auto-generate 8-digit National ID on load
  useEffect(() => {
    const randomId = Math.floor(10000000 + Math.random() * 90000000);
    setValue('nationalId', randomId);
  }, [setValue]);

  const onSubmit = async (data: RegisterDetails) => {
    try {
      const loadingToastId = toast.loading('Creating your account...');
      const res = await registerUser(data).unwrap();
      toast.success('Account created successfully!', { id: loadingToastId });
      navigate("/email-verification", {
        state: { email: data.email, message: res?.message }
      });
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.error || 'Something went wrong.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="h-screen w-screen bg-base-100 font-sans overflow-hidden flex flex-col">
      <Toaster richColors position="top-right" />
      <Navbar />

      {/* Custom Keyframe Animations for Live Typing Simulation */}
      <style>{`
        @keyframes typeName {
          0%, 100% { width: 0px; }
          40%, 70% { width: 90px; }
        }
        @keyframes typeEmail {
          0%, 100% { width: 0px; }
          40%, 70% { width: 130px; }
        }
        @keyframes fadeInField {
          0%, 30% { opacity: 0; transform: translateY(4px); }
          40%, 100% { opacity: 1; transform: translateY(0px); }
        }
        .animate-type-name {
          animation: typeName 4s steps(12, end) infinite;
          overflow: hidden;
          white-space: nowrap;
        }
        .animate-type-email {
          animation: typeEmail 4s steps(18, end) infinite;
          overflow: hidden;
          white-space: nowrap;
        }
        .animate-step-1 { animation: fadeInField 4s ease infinite; }
      `}</style>

      <div className="pt-16 flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* --- Left Side: Live Simulation of User Registering --- */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 bg-primary/10 p-10 xl:p-14 flex-col justify-between h-full border-r border-base-content/10 relative overflow-hidden">
          
          <div className="space-y-3 z-10">
            
            <h1 className="text-4xl xl:text-5xl font-black text-base-content tracking-tight">
              Create your account and start exploring events.
            </h1>
            <p className="text-base-content/70 text-sm leading-relaxed max-w-md">
              Join us today to book event passes, manage your tickets, or organize your own amazing experiences easily.
            </p>
          </div>

          {/* Live Mock UI Showing a Person Filling Details */}
          <div className="relative flex items-center justify-center my-auto py-4 z-10">
            <div className="w-80 bg-base-200/90 backdrop-blur-md rounded-2xl border border-base-content/15 p-5 shadow-2xl space-y-3.5">
              
              {/* Header simulation */}
              <div className="flex items-center justify-between pb-2 border-b border-base-content/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                </div>
                <span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">Register Page</span>
              </div>

              {/* Input 1: Name typing */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">First Name</span>
                <div className="h-8 rounded-lg bg-base-100 border border-primary/40 px-3 flex items-center text-xs font-mono text-primary">
                  <span className="animate-type-name">Gakenye  Ndiritu</span>
                  <span className="w-1.5 h-3.5 bg-primary animate-pulse ml-0.5"></span>
                </div>
              </div>

              {/* Input 2: Email typing */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Email Address</span>
                <div className="h-8 rounded-lg bg-base-100 border border-base-content/20 px-3 flex items-center text-xs font-mono text-base-content/80">
                  <span className="animate-type-email">admin@ticketstream.com</span>
                </div>
              </div>

              {/* Success Badge */}
              <div className="pt-1 flex items-center justify-between text-xs font-bold text-success">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Validation Passed</span>
                <span className="text-[10px] font-mono opacity-60">100%</span>
              </div>
            </div>
          </div>

          <div className="text-base-content/50 text-xs font-medium z-10">
            &copy; {new Date().getFullYear()} TicketStream. All rights reserved.
          </div>
        </div>

        {/* --- Right Side: Register Portal --- */}
        <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-base-100 h-full">
          <div className="w-full max-w-lg z-10 my-auto">
            <div className="bg-base-200/70 backdrop-blur-3xl rounded-[2rem] p-5 sm:p-7 border border-base-content/10 shadow-xl">
              
              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  Create Account
                </h2>
                <p className="mt-1 text-xs text-base-content/60">Fill in your details to get started</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                
                {/* Names Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      <User size={13} className="text-primary" /> First Name
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm focus:border-primary"
                      placeholder="Jane"
                      {...register('firstName', { required: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm focus:border-primary"
                      placeholder="Doe"
                      {...register('lastName', { required: true })}
                    />
                  </div>
                </div>

                {/* Info Row: Digital ID & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      <Fingerprint size={13} className="text-primary" /> Digital ID
                    </label>
                    <input
                      type="number"
                      readOnly
                      className="input input-bordered w-full h-10 bg-base-300/50 rounded-xl font-mono text-sm cursor-not-allowed opacity-70"
                      {...register('nationalId')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      <Phone size={13} className="text-primary" /> Contact Phone
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm focus:border-primary"
                      placeholder="+254..."
                      {...register('contactPhone', { required: true })}
                    />
                  </div>
                </div>

                {/* Email & Role Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      <Mail size={13} className="text-primary" /> Email Address
                    </label>
                    <input
                      type="email"
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm focus:border-primary"
                      placeholder="name@example.com"
                      {...register('email', { required: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                      <ShieldCheck size={13} className="text-primary" /> Role
                    </label>
                    <select
                      className="select select-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm focus:border-primary"
                      {...register('role')}
                    >
                      <option value="user">Attendee / User</option>
                      <option value="organizer">Organizer</option>
                    </select>
                  </div>
                </div>

                {/* Password with Strength Meter */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70 ml-1">
                    <Lock size={13} className="text-primary" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm pr-10 focus:border-primary"
                      placeholder="••••••••"
                      {...register('password', { required: true })}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-all"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div className="px-1 mt-1">
                      <div className="h-1 w-full rounded bg-base-300 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${getPasswordStrength(password).color}`} style={{ width: getPasswordStrength(password).percent }} />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full h-11 rounded-xl border-none font-bold text-sm shadow-md hover:shadow-lg transition-all mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <span>Create Account</span>}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-base-content/10 text-center">
                <p className="text-xs text-base-content/60">Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline ml-1">Sign In</Link></p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;