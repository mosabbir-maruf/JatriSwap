import * as React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/src/lib/firebase/firebase";
import { toast } from "sonner";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { getAuthErrorMessage } from "@/src/lib/firebase/authErrors";
import { TransitSwapLogo } from "@/src/components/branding/TransitSwapLogo";
import { BrutalistLoadingPlaceholder } from "@/src/components/common/AuthLoadingPlaceholder";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { firebaseUser, currentUser, loading, refreshFirebaseUser } = useAuth();
  const [busy, setBusy] = React.useState(false);

  if (!loading && !firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && firebaseUser && !needsEmailVerification(firebaseUser)) {
    const dest = currentUser?.role === "admin" ? "/admin" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const handleResend = async () => {
    const u = auth.currentUser;
    if (!u) {
      toast.error("Session expired. Please log in again.");
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      await sendEmailVerification(u);
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch (e: unknown) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckVerified = async () => {
    const u = auth.currentUser;
    if (!u) {
      toast.error("Session expired. Please log in again.");
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      await refreshFirebaseUser();
      if (auth.currentUser?.emailVerified) {
        toast.success("Email verified.");
        navigate(currentUser?.role === "admin" ? "/admin" : "/dashboard");
      } else {
        toast.info("Not verified yet.", {
          description: "Open the link in the email we sent (check spam/junk), then try again.",
        });
      }
    } catch (e: unknown) {
      toast.error(getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !firebaseUser) {
    return (
      <BrutalistLoadingPlaceholder
        layout="viewport"
        message="Loading…"
        srLabel="Loading verification status"
        className="flex-1 pt-24 pb-16"
      />
    );
  }

  const email = firebaseUser.email ?? "your email";

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
          <Link
            to="/"
            className="mb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="TransitSwap home"
          >
            <TransitSwapLogo variant="auth" showDot={false} />
          </Link>
          <div className="w-14 h-14 border-4 border-foreground bg-muted flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] mb-4">
            <Mail className="w-7 h-7 text-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-tighter text-center">Verify your email</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-3 text-center leading-relaxed">
            We sent a link to <span className="text-foreground">{email}</span>. Check your inbox and spam or junk folder — open the link to activate your account, then click &quot;I&apos;ve verified&quot; below.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleCheckVerified()}
            size="lg"
            className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-transparent"
          >
            I&apos;ve verified — continue
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleResend()}
            size="lg"
            className="w-full rounded-none h-14 text-xs font-mono uppercase tracking-widest font-bold shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all bg-background border-2 border-foreground"
          >
            Resend email
          </Button>
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground border-t-2 border-foreground pt-6">
          Wrong account?{" "}
          <button
            type="button"
            className="text-foreground border-b-2 border-primary hover:text-primary transition-colors pb-0.5 bg-transparent cursor-pointer font-inherit font-bold uppercase tracking-widest"
            onClick={() => void auth.signOut().then(() => navigate("/login"))}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
