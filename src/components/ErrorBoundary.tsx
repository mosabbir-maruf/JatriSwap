import React, { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("Uncaught error:", error, errorInfo);
    } else {
      // In production, we might want to log this to an error reporting service
      // console.log("An error occurred.");
    }
  }

  public render() {
    const { hasError, error } = this.state;
    const { fallback, children } = (this as any).props as unknown as Props;
    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 py-16 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="max-w-2xl w-full bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-destructive/10 border-4 border-destructive flex items-center justify-center mb-8 shadow-[8px_8px_0_0_rgba(239,68,68,1)]">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            
            <h1 className="font-heading text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              System <span className="text-destructive">Failure</span>
            </h1>
            
            <p className="font-mono text-sm md:text-base text-muted-foreground uppercase tracking-widest font-bold max-w-xl mx-auto mb-10 leading-relaxed text-balance">
              {process.env.NODE_ENV === "development" 
                ? this.state.error?.message || "An unexpected error occurred during execution."
                : "A critical system error has occurred. Our engineers have been notified. Please attempt to refresh the interface."}
            </p>

            {process.env.NODE_ENV === "development" && this.state.error?.stack && (
              <div className="w-full bg-muted/30 border-2 border-foreground p-4 mb-8 text-left overflow-auto max-h-48 text-xs font-mono text-muted-foreground">
                <pre>{this.state.error.stack}</pre>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button 
                onClick={() => window.location.reload()} 
                className="rounded-none h-14 px-8 font-mono text-xs uppercase tracking-widest font-bold shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-foreground"
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Reboot Interface
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="rounded-none h-14 px-8 font-mono text-xs uppercase tracking-widest font-bold shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground border-2 border-foreground"
              >
                <Home className="w-4 h-4 mr-2" /> Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return ((this as any).props as unknown as Props).children;
  }
}
