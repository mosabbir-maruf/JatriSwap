import * as React from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Train, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/src/contexts/AuthContext";
import { getAuthErrorMessage } from "@/src/lib/firebase/authErrors";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { accountIsBanned, normalizeUserAccountStatus } from "@/src/lib/userAccountStatus";

/**
 * Blocks navigation after sign-in when the profile is banned.
 * Ban toast + sign-out are handled in AuthContext (user snapshot). If that runs first,
 * our `getDoc` can hit permission-denied once auth is cleared — treat as blocked login, no extra toast.
 */
async function blockLoginIfUserBanned(uid: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    const st = normalizeUserAccountStatus(userSnap.data().status);
    if (!accountIsBanned(st)) return false;
    await signOut(auth);
    return true;
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "permission-denied") {
      return true;
    }
    throw e;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [emailErr, setEmailErr] = React.useState("");

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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: result.user.displayName || "User",
          email: result.user.email,
          avatar: result.user.photoURL || "",
          role: "user",
          status: "active",
          joinedAt: serverTimestamp()
        });
      } else if (await blockLoginIfUserBanned(result.user.uid)) {
        return;
      }
      toast.success("Successfully logged in");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
    }

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (await blockLoginIfUserBanned(cred.user.uid)) {
        return;
      }
      if (needsEmailVerification(cred.user)) {
        toast.success("Sign-in OK — verify your email to continue.", {
          description: "Check inbox and spam folder for the link.",
        });
        navigate("/verify-email");
      } else {
        toast.success("Successfully logged in");
        navigate("/dashboard");
      }
    } catch (e: any) {
      toast.error(getAuthErrorMessage(e));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-2 border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <Train className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-heading text-2xl font-black tracking-tighter uppercase">TransitSwap</span>
            </Link>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tighter text-center">Welcome Back</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2 text-center">Log in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Email</Label>
            <Input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={handleEmailChange}
                className={`rounded-none h-12 bg-background border-2 ${emailErr ? 'border-destructive focus:border-destructive text-destructive' : 'border-foreground focus:border-foreground'} focus:ring-0 px-4 font-mono font-bold text-sm w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors`} 
                required
            />
            {emailErr && <p className="text-destructive text-[10px] font-mono font-bold uppercase tracking-wider mt-1">{emailErr}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-foreground font-black">Password</Label>
                <Link to="/forgot-password" className="font-mono text-[10px] uppercase font-bold text-primary hover:underline">Forgot password?</Link>
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

          <Button type="submit" disabled={loading || !!emailErr} size="lg" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold mt-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground border-2 border-primary disabled:opacity-50 disabled:cursor-not-allowed">
            Sign In {loading && "..."}
          </Button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-foreground"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 font-mono font-bold text-muted-foreground tracking-widest text-[10px]">Or</span>
            </div>
        </div>

        <Button onClick={handleGoogleSignIn} disabled={loading} variant="outline" size="lg" className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground border-2 border-foreground">
            <svg viewBox="0 0 24 24" className="w-5 h-5 mr-3 shrink-0" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        </Button>

        <div className="mt-6 text-center border-t-2 border-foreground pt-6">
            <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-foreground border-b-2 border-primary hover:text-primary transition-colors pb-0.5">Register</Link>
            </p>
        </div>
      </div>
    </div>
  );
}
