import * as React from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/src/contexts/AuthContext";
import { getAuthErrorMessage } from "@/src/lib/firebase/authErrors";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { JatriSwapLogo } from "@/src/components/branding/JatriSwapLogo";
import { AvatarChoiceTrigger } from "@/src/components/common/AvatarChoiceTrigger";
import { ProfileAvatarPickerDialog } from "@/src/components/common/ProfileAvatarPickerDialog";
import { googleUserProfileFieldsForCreate, googleAvatarMergePatchForExistingUser } from "@/src/lib/avatar";
import { useSignupAvatarDraft } from "@/src/hooks/useSignupAvatarDraft";
import { AUTH_SHELL_GRID_BG_CLASS, AUTH_SHELL_PAGE_X_PADDING_CLASS } from "@/src/lib/ui/authShellClasses";
import { initialsFromDisplayName } from "@/src/lib/initialsFromDisplayName";

export default function Register() {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const [emailErr, setEmailErr] = React.useState("");
  const [passwordErr, setPasswordErr] = React.useState("");
  const [confirmErr, setConfirmErr] = React.useState("");
  const [avatarPickerOpen, setAvatarPickerOpen] = React.useState(false);
  const { effectiveAvatarPath, setPickedAvatar, previewPath } = useSignupAvatarDraft();

  const profileInitials = React.useMemo(() => initialsFromDisplayName(name), [name]);

  if (!authLoading && firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }
  if (!authLoading && currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) setEmailErr("Invalid email format");
        else setEmailErr("");
    } else {
        setEmailErr("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val && val.length < 6) setPasswordErr("Minimum 6 characters");
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...googleUserProfileFieldsForCreate(result.user),
          joinedAt: serverTimestamp(),
        });
      } else {
        const raw = userSnap.data() as Record<string, unknown>;
        const patch = googleAvatarMergePatchForExistingUser(raw, result.user.photoURL);
        if (patch) {
          await updateDoc(userRef, patch);
        }
      }
      toast.success("Successfully registered / logged in");
      navigate("/dashboard");
    } catch (e: unknown) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
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
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      
      const userRef = doc(db, "users", result.user.uid);
      await setDoc(userRef, {
        name: name,
        email: result.user.email,
        avatar: effectiveAvatarPath,
        role: "user",
        status: "active",
        joinedAt: serverTimestamp()
      });

      await sendEmailVerification(result.user);
      toast.success("Account created. Check your email (including spam) for a verification link.");
      navigate("/verify-email");
    } catch (e: unknown) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${AUTH_SHELL_GRID_BG_CLASS} pt-20 pb-10 flex items-center justify-center ${AUTH_SHELL_PAGE_X_PADDING_CLASS}`}>
      <div className="w-full min-w-0 max-w-lg max-sm:-translate-y-2 sm:translate-y-2 bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-5 md:p-6">
        <div className="flex flex-col items-center mb-4">
            <Link
              to="/"
              className="mb-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="JatriSwap home"
            >
              <JatriSwapLogo variant="auth" showDot={false} />
            </Link>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tighter text-center">Create Account</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1 text-center">Join the premier ticket marketplace</p>
        </div>

        <form className="space-y-3" onSubmit={handleEmailSignUp}>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <AvatarChoiceTrigger
                previewSrc={previewPath}
                initials={profileInitials}
                onOpen={() => setAvatarPickerOpen(true)}
                footnote="Choose Avatar (Optional) We assign one at random if you skip."
              />
            </div>
            <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Full Name</Label>
                <Input 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-none h-11 bg-background border-2 border-foreground focus:ring-0 focus:border-foreground px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                    required
                />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Email</Label>
            <Input 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={handleEmailChange} 
                className={`rounded-none h-11 bg-background border-2 ${emailErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
                required
            />
            {emailErr && <p className="text-destructive text-[10px] font-mono font-bold uppercase tracking-wider mt-1">{emailErr}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Password</Label>
            <div className="relative">
              <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={handlePasswordChange}
                  className={`rounded-none h-11 bg-background border-2 ${passwordErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 pr-10 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
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

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black flex items-center gap-2">
              Re-enter Password
            </Label>
            <div className="relative">
              <Input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={handleConfirmChange}
                  className={`rounded-none h-11 bg-background border-2 ${confirmErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 pr-10 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
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

          <Button type="submit" disabled={loading || !!emailErr || !!passwordErr || !!confirmErr} size="lg" className="w-full rounded-none h-12 text-xs font-mono uppercase tracking-widest font-bold mt-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed">
            Sign Up {loading && "..."}
          </Button>
        </form>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-foreground"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 font-mono font-bold text-muted-foreground tracking-widest text-[10px]">Or</span>
            </div>
        </div>

        <Button onClick={handleGoogleSignIn} disabled={loading} variant="outline" size="lg" className="w-full rounded-none h-12 text-xs font-mono uppercase tracking-widest font-bold shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground border-2 border-foreground">
            <svg viewBox="0 0 24 24" className="w-5 h-5 mr-3 shrink-0" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
        </Button>

        <div className="mt-4 text-center border-t-2 border-foreground pt-4">
            <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-foreground border-b-2 border-primary hover:text-primary transition-colors pb-0.5">Log In</Link>
            </p>
        </div>

        <ProfileAvatarPickerDialog
          open={avatarPickerOpen}
          onOpenChange={setAvatarPickerOpen}
          currentValue={previewPath}
          onPick={(url) => {
            setPickedAvatar(url);
            setAvatarPickerOpen(false);
          }}
        />
      </div>
    </div>
  );
}
