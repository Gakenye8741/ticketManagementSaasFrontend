import { useForm } from 'react-hook-form';
import { Navbar } from '../components/Navbar';
import { userApi } from '../features/APIS/UserApi';
import { toast, Toaster } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../features/Auth/AuthSlice';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Ticket, CheckCircle2 } from 'lucide-react';

interface LoginDetails {
  email: string;
  password: string;
}

const Login = () => {
  const { register, handleSubmit } = useForm<LoginDetails>();
  const [loginUser, { isLoading }] = userApi.useLoginUserMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginDetails) => {
    const loadingToastId = toast.loading('Signing in...');
    try {
      const res = await loginUser(data).unwrap();
      
      toast.success('✅ Welcome back!', { id: loadingToastId });
      dispatch(setCredentials(res));
      navigate(res.role === 'admin' ? '/AdminDashboard/analytics' : '/');
    } catch (error: any) {
      const errorMessage = error?.data?.error?.error || error?.data?.error || error?.error || '❌ Login failed.';

      if (errorMessage.toLowerCase().includes('verify your email')) {
        toast.error('❌ Please verify your email', { id: loadingToastId });
        navigate('/email-verification', { state: { email: data.email } });
        return;
      }

      toast.error(errorMessage, { id: loadingToastId });
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
              Welcome back to your event dashboard.
            </h1>
            <p className="text-base-content/70 text-sm leading-relaxed max-w-md">
              Sign in to access your booked passes, manage events, and explore what is happening live right now.
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
                <span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">Login Page</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Email Address</span>
                <div className="h-8 rounded-lg bg-base-100 border border-primary/40 px-3 flex items-center text-xs font-mono text-primary">
                  <span className="animate-type-email">youremail@gmail.com</span>
                  <span className="w-1.5 h-3.5 bg-primary animate-pulse ml-0.5"></span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-base-content/60 uppercase">Password</span>
                <div className="h-8 rounded-lg bg-base-100 border border-base-content/20 px-3 flex items-center text-xs font-mono text-base-content/80">
                  <span>••••••••••••</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-bold text-success">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Session Active</span>
                <span className="text-[10px] font-mono opacity-60">Secure</span>
              </div>
            </div>
          </div>

          <div className="text-base-content/50 text-xs font-medium z-10">
            &copy; {new Date().getFullYear()} TicketStream. All rights reserved.
          </div>
        </div>

        {/* --- Right Side: Login Form --- */}
        <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-base-100 h-full">
          <div className="w-full max-w-lg z-10 my-auto">
            <div className="bg-base-200/70 backdrop-blur-3xl rounded-[2rem] p-5 sm:p-7 border border-base-content/10 shadow-xl">
              
              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
                  Sign In
                </h2>
                <p className="mt-1 text-xs text-base-content/60">Enter your details to access your account</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                
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
                    <Lock size={13} className="text-primary" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input input-bordered w-full h-10 bg-base-100/80 rounded-xl text-sm pr-10 focus:border-primary"
                      placeholder="••••••••"
                      {...register('password', { required: true })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-all"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end pr-1">
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-semibold text-base-content/60 hover:text-primary transition-all"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full h-11 rounded-xl border-none font-bold text-sm shadow-md hover:shadow-lg transition-all mt-1"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <span>Sign In</span>}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-base-content/10 text-center">
                <p className="text-xs text-base-content/60">Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline ml-1">Create Account</Link></p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;