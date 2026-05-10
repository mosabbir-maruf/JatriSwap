import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Unauthorized({
  message = "You must be logged in to access this sector of the application.",
  actionMessage = "Please log in or register an account to continue.",
  title = "Authentication Required"
}: { 
  message?: string;
  actionMessage?: string;
  title?: string;
}) {
  const { firebaseUser, loading } = useAuth();

  if (loading) return null; // Avoid flashing if auth is just loading

  return (
    <div className="flex-1 bg-background min-h-screen py-24 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-12 relative z-10 text-center"
      >
        <div className="w-24 h-24 bg-card border-4 border-foreground flex items-center justify-center mx-auto mb-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <ShieldAlert className="w-10 h-10 text-destructive" strokeWidth={2} />
        </div>
        
        <h1 className="font-heading text-4xl font-black uppercase tracking-tighter mb-4 text-foreground text-balance">
          {title}
        </h1>
        
        <div className="bg-destructive/10 border-2 border-destructive p-4 mb-8">
            <p className="font-mono text-sm uppercase tracking-widest font-bold text-destructive leading-relaxed">
              {message}
            </p>
        </div>

        {!firebaseUser ? (
            <>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest font-bold mb-8">
                {actionMessage}
                </p>
                
                <div className="flex flex-col gap-4">
                <Button render={<Link to="/login" />} className="w-full rounded-none h-14 text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground border-2 border-primary">
                    <LogIn className="w-4 h-4 mr-2" /> Log In
                </Button>
                <Button render={<Link to="/register" />} variant="outline" className="w-full rounded-none h-14 border-2 border-foreground text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all text-foreground bg-background">
                    Create Account
                </Button>
                </div>
            </>
        ) : (
            <>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest font-bold mb-8">
                    Your current account privileges do not allow access to this area.
                </p>
                <Button render={<Link to="/" />} className="w-full rounded-none h-14 text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
                </Button>
            </>
        )}
      </motion.div>
    </div>
  );
}
