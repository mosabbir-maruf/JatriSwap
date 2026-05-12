import * as React from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/src/contexts/AuthContext";
import { getAuthErrorMessage } from "@/src/lib/firebase/authErrors";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { AUTH_SHELL_GRID_BG_CLASS, AUTH_SHELL_PAGE_X_PADDING_CLASS } from "@/src/lib/ui/authShellClasses";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [emailErr, setEmailErr] = React.useState("");

  if (loading) {
    return <div className="flex-1 min-h-screen flex items-center justify-center font-mono font-bold uppercase">Verifying Status...</div>;
  }

  // If logged in and IS an admin, redirect to dashboard (unless email still unverified)
  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) setEmailErr("Invalid admin email format");
        else setEmailErr("");
    } else {
        setEmailErr("");
    }
  };

  // If logged in but NOT an admin, maybe show a warning but stay out
  
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast.error("Please enter a valid admin email address.");
        return;
    }

    try {
      setIsSubmitting(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // Before redirecting, check if they are actually an admin
      const userDoc = await getDoc(doc(db, "admins", userCred.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === 'admin') {
          if (needsEmailVerification(userCred.user)) {
            toast.success("Verify your email to open the admin panel.", {
              description: "Check inbox and spam folder for the link.",
            });
            navigate("/verify-email");
          } else {
            toast.success("Admin successfully authenticated.");
            navigate("/admin");
          }
        } else if (role === 'pending_admin') {
          toast.error("Access Denied: Your admin account is pending approval by a Super Admin.");
          await auth.signOut();
        } else {
          toast.error("Access Denied: You do not have administrator privileges.");
          await auth.signOut();
        }
      } else {
        toast.error("Access Denied: You do not have administrator privileges.");
        await auth.signOut();
      }
    } catch (e: any) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${AUTH_SHELL_GRID_BG_CLASS} pt-24 pb-16 flex items-center justify-center ${AUTH_SHELL_PAGE_X_PADDING_CLASS}`}>
      <div className="w-full min-w-0 max-w-md bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-6 md:p-8 relative">
        <div className="absolute -top-4 -right-2 sm:-right-4 bg-destructive text-destructive-foreground px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          SECURE PORTAL
        </div>

        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-foreground text-background flex items-center justify-center mb-4 hidden">
                 {/*  We can remove the hidden if we want to show a big shield instead */}
            </div>
            <Shield className="w-16 h-16 mb-4 text-foreground" />
            <h1 className="font-heading text-3xl font-black uppercase tracking-tighter text-foreground text-center">Admin Access</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2 text-center">System Administrators Only</p>
        </div>

        {currentUser && currentUser.role !== 'admin' && (
          <div className="bg-destructive/10 border-2 border-destructive p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] uppercase tracking-wider font-bold text-destructive">
              You are currently logged in as a standard user. You must use an administrator account to access this portal.
            </p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Admin Email</Label>
            <Input 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={handleEmailChange}
                className={`rounded-none h-12 bg-background border-2 ${emailErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
                required
            />
            {emailErr && <p className="text-destructive text-[10px] font-mono font-bold uppercase tracking-wider mt-1">{emailErr}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Password</Label>
            </div>
            <div className="relative">
              <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-none h-12 bg-background border-2 border-foreground focus:ring-0 focus:border-foreground px-4 pr-10 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                  required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !!emailErr} size="lg" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold mt-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Authenticating..." : "Authorize Access"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-border text-center flex flex-col space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Return to <Link to="/" className="text-foreground hover:underline">homepage</Link>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                No admin account? <Link to="/admin/register" className="text-foreground hover:underline">Request Access</Link>
            </p>
        </div>
      </div>
    </div>
  );
}
