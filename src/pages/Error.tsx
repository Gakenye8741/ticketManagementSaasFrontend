import { Link, useRouteError } from "react-router-dom";
import { ArrowLeft, LifeBuoy, AlertCircle } from 'lucide-react';

function Error() {
  const error: any = useRouteError();

  return (
    <div className="h-screen w-screen bg-base-100 font-sans overflow-hidden flex flex-col items-center justify-center p-6 relative">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18rem] h-[18rem] sm:w-[30rem] sm:h-[30rem] bg-error/10 blur-[120px] rounded-full -z-0 opacity-40" />

      <div className="w-full max-w-lg z-10 animate-fadeIn text-center">
        {/* Error Card */}
        <div className="bg-base-200/80 backdrop-blur-2xl rounded-[2.5rem] p-10 sm:p-14 border border-base-content/10 shadow-2xl relative overflow-hidden">
          
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-error/10 rounded-3xl flex items-center justify-center border border-error/20">
              <AlertCircle size={40} className="text-error" />
            </div>
          </div>

          <p className="text-sm font-black uppercase tracking-[0.4em] text-error mb-2">Error 404</p>
          
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-base-content">
            Page Not <span className="text-primary">Found</span>
          </h1>
          
          <p className="mt-6 text-sm font-medium opacity-50 leading-relaxed max-w-xs mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>

          {/* Dynamic Error Message */}
          <div className="mt-4 px-4 py-2 bg-base-300/50 rounded-lg inline-block">
             <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                {error?.statusText || error?.message || "Unknown Route Error"}
             </p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/" 
              className="btn btn-primary w-full sm:w-auto px-8 rounded-xl border-none font-bold text-sm transition-all shadow-lg shadow-primary/20"
            >
              <ArrowLeft size={18} className="mr-2" /> Go Home
            </Link>
            
            <Link 
              to="/contact" 
              className="btn btn-ghost w-full sm:w-auto px-8 rounded-xl font-bold text-sm transition-all border border-base-content/10"
            >
              <LifeBuoy size={18} className="mr-2" /> Support
            </Link>
          </div>

          {/* Decorative bottom border */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-error/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export default Error;