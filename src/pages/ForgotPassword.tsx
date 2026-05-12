import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JatriSwapLogo } from "@/src/components/branding/JatriSwapLogo";
import { AUTH_SHELL_GRID_BG_CLASS, AUTH_SHELL_PAGE_X_PADDING_CLASS } from "@/src/lib/ui/authShellClasses";

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className={`${AUTH_SHELL_GRID_BG_CLASS} pt-24 pb-16 flex items-center justify-center ${AUTH_SHELL_PAGE_X_PADDING_CLASS}`}>
      <div className="w-full min-w-0 max-w-md bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-6 md:p-8 relative">
        
        <Link to="/login" className="absolute top-4 left-4 p-2 bg-background border-2 border-transparent hover:border-foreground transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Link>
        
        <div className="flex flex-col items-center mb-6 mt-4">
            <Link
              to="/"
              className="mb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="JatriSwap home"
            >
              <JatriSwapLogo variant="auth" showDot={false} />
            </Link>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tighter text-center">Reset Password</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2 text-center text-balance">
              {isSubmitted 
                ? "Check your email for instructions" 
                : "Enter your email to receive a reset link"}
            </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="bg-emerald-100 border-2 border-emerald-900 p-4 text-center shadow-[4px_4px_0_0_rgba(6,78,59,1)]">
               <p className="font-mono text-xs uppercase font-bold text-emerald-950">We've sent a password reset link to your email.</p>
            </div>
            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground border-2 border-foreground">
              Try another email
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsSubmitted(true); }}>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Email Address</Label>
              <Input 
                  type="email" 
                  required
                  placeholder="you@example.com" 
                  className="rounded-none h-12 bg-background border-2 border-foreground focus:ring-0 focus:border-foreground px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
              />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold mt-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground border-2 border-primary">
              Send Reset Link
            </Button>
          </form>
        )}

      </div>
    </div>
  );
}
