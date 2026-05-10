import * as React from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ShieldAlert, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/src/contexts/AuthContext";
import { getAuthErrorMessage } from "@/src/lib/firebase/authErrors";

export default function AdminRegister() {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const [emailErr, setEmailErr] = React.useState("");
  const [passwordErr, setPasswordErr] = React.useState("");
  const [confirmErr, setConfirmErr] = React.useState("");

  if (loading) {
    return <div className="flex-1 min-h-screen flex items-center justify-center font-mono font-bold uppercase">Verifying Status...</div>;
  }

  // If already an admin, redirect
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val && val.length < 8) setPasswordErr("Admin password needs 8+ chars");
    else setPasswordErr("");
    
    if (confirmPassword && val !== confirmPassword) setConfirmErr("Passwords do not match");
    else if (confirmPassword) setConfirmErr("");
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (val && val !== password) setConfirmErr("Passwords do not match");
    else setConfirmErr("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !confirmPassword) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
    }

    if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
    }

    try {
      setIsSubmitting(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      
      const userRef = doc(db, "admins", result.user.uid);
      await setDoc(userRef, {
        name: name,
        email: result.user.email,
        avatar: "",
        role: "pending_admin", // Needs super admin approval
        joinedAt: serverTimestamp()
      });

      await sendEmailVerification(result.user);
      toast.success("Administrator account requested. Verify your email, then wait for Super Admin approval.", {
        description: "Check inbox and spam folder for the verification link.",
      });
      navigate("/verify-email");
    } catch (e: any) {
      toast.error(getAuthErrorMessage(e));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-6 md:p-8 relative mt-16">
        <div className="absolute -top-4 -right-4 bg-destructive text-destructive-foreground px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          RESTRICTED AREA
        </div>

        <div className="flex flex-col items-center mb-16 mt-8">
            <ShieldAlert className="w-16 h-16 mb-4 text-destructive" />
            <h1 className="font-heading text-3xl font-black uppercase tracking-tighter text-foreground text-center">Provision Admin</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2 text-center text-balance">
                You are attempting to create an account with elevated privileges. An existing Super Admin must approve your request before you can log in.
            </p>
        </div>

        <form className="space-y-4 mt-8" onSubmit={handleRegister}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Full Name</Label>
                <Input 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-none h-12 bg-background border-2 border-foreground focus:ring-0 focus:border-foreground px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                    required
                />
            </div>
            
            <div className="space-y-1 md:col-span-2">
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

            <div className="space-y-1 md:col-span-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Secure Password</Label>
              <div className="relative">
                <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={handlePasswordChange}
                    className={`rounded-none h-12 bg-background border-2 ${passwordErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 pr-10 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
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
              {passwordErr && <p className="text-destructive text-[10px] font-mono font-bold uppercase tracking-wider mt-1">{passwordErr}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black flex items-center gap-2">
                Re-enter Password
              </Label>
              <div className="relative">
                <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={handleConfirmChange}
                    className={`rounded-none h-12 bg-background border-2 ${confirmErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 pr-10 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
                    required
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmErr && <p className="text-destructive text-[10px] font-mono font-bold uppercase tracking-wider mt-1">{confirmErr}</p>}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !!emailErr || !!passwordErr || !!confirmErr} size="lg" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold mt-6 shadow-[8px_8px_0_0_rgba(239,68,68,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(239,68,68,1)] transition-all bg-destructive text-destructive-foreground border-2 border-destructive hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Provisioning..." : "Execute Provision"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-border text-center flex flex-col space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Already provisioned? <Link to="/admin/login" className="text-foreground hover:underline">Access Portal</Link>
            </p>
        </div>
      </div>
    </div>
  );
}
