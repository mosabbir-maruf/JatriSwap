import { BrowserRouter as Router, Routes, Route, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useRouteDocumentMeta } from "./hooks/useRouteDocumentMeta";
import { motion, AnimatePresence } from "motion/react";
import {
  Ticket,
  Menu,
  X,
  ArrowRight,
  Shield,
  Search,
  User,
  LogOut,
  Bell,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase/firebase";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BrutalistIdleLoader } from "@/src/components/common/AuthLoadingPlaceholder";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "./contexts/AuthContext";

import Home from "./pages/Home";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { JatriSwapLogo } from "./components/branding/JatriSwapLogo";
import { FloatingWhatsAppHelp } from "./components/common/FloatingWhatsAppHelp";
import { shouldShowFloatingWhatsAppHelp } from "./lib/isAdminAppRoute";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserProfile = lazy(() => import("./pages/AdminUserProfile"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const Browse = lazy(() => import("./pages/Browse"));
const Sell = lazy(() => import("./pages/Sell"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Alerts = lazy(() => import("./pages/Alerts"));
const TicketDetails = lazy(() => import("./pages/TicketDetails"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Transit = lazy(() => import("./pages/Transit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<BrutalistIdleLoader className="min-h-[50vh] gap-3" />}
    >
      {children}
    </Suspense>
  );
}

const NAV_DROPDOWN_ITEM_CLASS =
  "rounded-none px-4 py-3 font-mono text-[10px] xl:text-xs uppercase font-bold tracking-widest cursor-pointer hover:bg-muted focus:bg-muted focus:text-foreground";
const NAV_DROPDOWN_LOGOUT_ITEM_CLASS =
  "rounded-none px-4 py-3 font-mono text-[10px] xl:text-xs uppercase font-bold tracking-widest cursor-pointer text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground";
const NAV_MOBILE_ACCOUNT_ROW_CLASS = "p-6 flex justify-between items-center hover:bg-muted";

type AccountMenuLink = { to: string; label: string; Icon: LucideIcon };

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const isLoggedIn = !!firebaseUser;
  const isAdmin = currentUser?.role === "admin";

  const accountMenuLinks = useMemo((): AccountMenuLink[] => {
    if (!isLoggedIn || authLoading) return [];
    if (isAdmin) {
      return [
        { to: "/admin", label: "Admin Panel", Icon: Shield },
        { to: "/dashboard", label: "Dashboard", Icon: Menu },
      ];
    }
    return [{ to: "/dashboard", label: "Dashboard", Icon: Menu }];
  }, [isLoggedIn, authLoading, isAdmin]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
    <header className="fixed top-0 w-full z-50 bg-background border-b border-border">
      <div className="page-shell-md">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center outline-none transition-[filter] hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="JatriSwap home"
          >
            <JatriSwapLogo variant="header" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center flex-1 justify-end">
            <div className="hidden lg:flex items-center relative flex-1 max-w-xs xl:max-w-md mr-4 xl:mr-6">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                 ref={searchInputRef}
                 placeholder="Search by transport name, route, or date..." 
                 className="pl-9 pr-14 h-10 w-full rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:ring-0 focus-visible:ring-0 focus-visible:border-primary font-mono text-[10px] xl:text-xs uppercase placeholder:text-muted-foreground/70"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     navigate(`/browse?q=${encodeURIComponent(e.currentTarget.value)}`);
                   }
                 }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-none border-2 border-muted-foreground/40 bg-muted px-1.5 font-mono text-[10px] font-bold text-muted-foreground">
                  <span className="text-[12px]">⌘</span>K
                </kbd>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 xl:space-x-4 pl-4 xl:pl-6 shrink-0">
              <div className="pl-2 xl:pl-4 flex items-center gap-2 xl:gap-4">
                 <Button render={<Link to="/browse" />} className="rounded-none font-mono text-[10px] xl:text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background text-foreground border-2 border-foreground h-9 xl:h-10 px-4 xl:px-6">
                   Browse
                 </Button>
                 <Button render={<Link to="/sell" />} className="rounded-none font-mono text-[10px] xl:text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground border-2 border-primary h-9 xl:h-10 px-4 xl:px-6">
                   Sell
                 </Button>

                 {authLoading ? (
                   <div
                     className="hidden sm:flex flex-col items-center justify-center w-9 h-9 xl:w-10 xl:h-10 shrink-0 rounded-none border-2 border-foreground bg-muted shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                     aria-busy="true"
                     aria-label="Verifying session"
                   >
                     <Spinner size="sm" />
                   </div>
                 ) : isLoggedIn ? (
                   <div className="flex items-center gap-4 hidden sm:flex">
                      <DropdownMenu>
                       <DropdownMenuTrigger className="h-9 xl:h-10 border-2 border-foreground bg-muted flex items-center justify-center gap-1.5 px-2.5 xl:px-3 hover:bg-foreground hover:text-background transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)] outline-none">
                         {isAdmin ? <Shield className="w-4 h-4 xl:w-5 xl:h-5" /> : <User className="w-4 h-4 xl:w-5 xl:h-5" />}
                         <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-48 bg-background border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none p-0 mt-2">
                         {accountMenuLinks.map(({ to, label, Icon }) => (
                           <DropdownMenuItem
                             key={to}
                             onClick={() => navigate(to)}
                             className={NAV_DROPDOWN_ITEM_CLASS}
                           >
                             <Icon className="w-4 h-4 mr-2" aria-hidden />
                             {label}
                           </DropdownMenuItem>
                         ))}
                         <DropdownMenuSeparator className="m-0 bg-foreground/20" />
                         {!isAdmin && (
                           <>
                             <DropdownMenuItem onClick={() => navigate('/alerts')} className={NAV_DROPDOWN_ITEM_CLASS}>
                               <Bell className="w-4 h-4 mr-2" aria-hidden /> Alerts
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="m-0 bg-foreground/20" />
                           </>
                         )}
                         <DropdownMenuItem onClick={handleLogout} className={NAV_DROPDOWN_LOGOUT_ITEM_CLASS}>
                           <LogOut className="w-4 h-4 mr-2" /> Log Out
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                 ) : (
                   <>
                     <Button variant="outline" render={<Link to="/login" />} className="rounded-none font-mono text-[10px] xl:text-xs uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all h-9 xl:h-10 px-4 xl:px-6 hidden sm:flex">Log In</Button>
                     <Button render={<Link to="/register" />} className="rounded-none font-mono text-[10px] xl:text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-foreground h-9 xl:h-10 px-4 xl:px-6 hidden sm:flex">Register</Button>
                   </>
                 )}
              </div>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
             <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-foreground">
               {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <div className="flex flex-col font-mono text-xs uppercase tracking-widest font-bold divide-y divide-border">
              <Link to="/browse" onClick={() => setMobileMenuOpen(false)} className="p-6 flex justify-between items-center hover:bg-muted">
                 Browse Tickets <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="p-6 flex justify-between items-center hover:bg-muted font-mono text-xs uppercase tracking-widest font-bold text-foreground"
              >
                Sell Ticket <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              {authLoading ? (
                <div
                  className="p-6 flex justify-between items-center bg-muted/25 font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-foreground"
                  aria-busy="true"
                  aria-label="Verifying session"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-2 border-foreground bg-background shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      <Ticket className="h-4 w-4 animate-pulse text-foreground" aria-hidden />
                    </span>
                    <span className="truncate leading-tight">Verifying session</span>
                  </span>
                  <Spinner size="md" />
                </div>
              ) : isLoggedIn ? (
                <>
                  {accountMenuLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={NAV_MOBILE_ACCOUNT_ROW_CLASS}
                    >
                      {label} <ArrowRight className="w-4 h-4" aria-hidden />
                    </Link>
                  ))}
                  {!isAdmin && (
                    <Link to="/alerts" onClick={() => setMobileMenuOpen(false)} className={NAV_MOBILE_ACCOUNT_ROW_CLASS}>
                      Alerts <ArrowRight className="w-4 h-4" aria-hidden />
                    </Link>
                  )}
                  <div className="p-6 flex flex-col gap-4 bg-muted/30">
                     <Button variant="outline" className="w-full rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase tracking-widest h-12" onClick={handleLogout}>Log Out</Button>
                  </div>
                </>
              ) : (
                <div className="p-6 flex flex-col gap-4 bg-muted/30">
                   <Button render={<Link to="/login" />} variant="outline" className="w-full rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase tracking-widest h-12" onClick={() => setMobileMenuOpen(false)}>Log In</Button>
                   <Button render={<Link to="/register" />} className="w-full rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase tracking-widest h-12 bg-foreground border-2 border-foreground text-background" onClick={() => setMobileMenuOpen(false)}>Register</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
};

/** Telegram mark — monochrome for footer on dark ground. */
function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

const Footer = () => {
  const { currentUser } = useAuth();
  const telegramUrl = (import.meta.env.VITE_PUBLIC_TELEGRAM_URL ?? "").trim();

  return (
  <footer className="bg-foreground text-background mt-auto relative pt-16 pb-8 max-md:pb-[calc(2.75rem+env(safe-area-inset-bottom,0px))] border-t border-border">
    <div className="page-shell-md relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
        
        {/* Brand & Telegram column */}
        <div className="md:col-span-12 lg:col-span-5 space-y-8">
           <div>
             <Link
               to="/"
               className="mb-6 inline-flex outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
               aria-label="JatriSwap home"
             >
               <JatriSwapLogo variant="footer" />
             </Link>
             <p className="text-muted text-lg font-sans leading-relaxed max-w-lg">
               The premier marketplace to buy and sell unused train & bus tickets. Your unused ticket deserves a traveler.
             </p>
           </div>
           
           <div className="space-y-4 max-w-md">
              <h4 className="font-mono text-sm tracking-widest uppercase font-bold text-background">Stay in the loop</h4>
              {telegramUrl ? (
                <Button
                  render={
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2"
                    />
                  }
                  variant="secondary"
                  className="h-12 w-full rounded-none border-2 border-background font-mono text-xs uppercase font-bold tracking-widest bg-background text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.35)] transition-all"
                >
                  <TelegramGlyph className="h-5 w-5 shrink-0" />
                  Join Telegram
                </Button>
              ) : (
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted leading-relaxed border border-muted/30 px-4 py-3">
                  Telegram invite link is added at deploy time — check back soon or use Contact for updates.
                </p>
              )}
           </div>
        </div>

        {/* Links — mobile: 3-column grid (sections stay readable); md+: nested 12-col / lg 6-col as before */}
        <div className="max-md:grid max-md:grid-cols-3 max-md:gap-x-3 max-md:gap-y-8 md:col-span-12 md:grid md:grid-cols-12 lg:col-span-7 lg:col-start-7 lg:grid-cols-6">
          <div className="min-w-0 md:col-span-4 lg:col-span-2">
            <h4 className="font-mono max-md:text-[10px] max-md:tracking-wide md:text-sm md:tracking-widest uppercase font-bold text-background mb-4 md:mb-6">
              Marketplace
            </h4>
            <ul className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-wider text-muted">
              <li><Link to="/browse" className="hover:text-background transition-colors max-md:break-words">Browse Tickets</Link></li>
              <li><Link to="/sell" className="hover:text-background transition-colors max-md:break-words">Sell a Ticket</Link></li>
              <li><Link to="/transit" className="hover:text-background transition-colors max-md:break-words">Transit</Link></li>
            </ul>
          </div>

          <div className="min-w-0 md:col-span-4 lg:col-span-2">
            <h4 className="font-mono max-md:text-[10px] max-md:tracking-wide md:text-sm md:tracking-widest uppercase font-bold text-background mb-4 md:mb-6">
              Support
            </h4>
            <ul className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-wider text-muted">
              <li><Link to="/" className="hover:text-background transition-colors max-md:break-words">Refund Policy</Link></li>
              <li><Link to="/faq" className="hover:text-background transition-colors max-md:break-words">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-background transition-colors max-md:break-words">Contact Us</Link></li>
              {currentUser?.role === 'admin' && (
                <li><Link to="/admin" className="hover:text-amber-400 text-amber-500 transition-colors inline-flex items-center gap-1 max-md:break-words"><Shield className="w-3 h-3 shrink-0"/> Admin</Link></li>
              )}
            </ul>
          </div>

          <div className="min-w-0 md:col-span-4 lg:col-span-2">
            <h4 className="font-mono max-md:text-[10px] max-md:tracking-wide md:text-sm md:tracking-widest uppercase font-bold text-background mb-4 md:mb-6">
              Legal
            </h4>
            <ul className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-wider text-muted">
              <li><Link to="/terms" className="hover:text-background transition-colors max-md:break-words">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-background transition-colors max-md:break-words">Privacy Policy</Link></li>
              <li><Link to="/cookie" className="hover:text-background transition-colors max-md:break-words">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

      </div>
      
      <div className="pt-8 border-t border-muted/30 font-mono text-[10px] uppercase max-md:tracking-wide md:tracking-widest text-muted flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0">
        <p className="text-center md:text-left md:mb-0 leading-relaxed">
          © {new Date().getFullYear()} JatriSwap Inc. All rights reserved.
        </p>
        <div className="flex gap-3 md:gap-4 items-center justify-center md:justify-end flex-wrap min-w-0 px-0 max-md:pb-0.5">
           <div className="w-1.5 h-1.5 shrink-0 rounded-none bg-primary animate-pulse" aria-hidden />
           <span className="font-bold text-background text-center leading-normal max-md:max-w-full">
             All systems operational
           </span>
        </div>
      </div>
    </div>
  </footer>
  );
};

import { Toaster } from "@/components/ui/sonner";

const AppLayout = () => {
  const location = useLocation();
  useRouteDocumentMeta();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {shouldShowFloatingWhatsAppHelp(location.pathname) ? <FloatingWhatsAppHelp /> : null}
      <Toaster />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route
              path="browse"
              element={
                <RouteSuspense>
                  <Browse />
                </RouteSuspense>
              }
            />
            <Route
              path="ticket/:id"
              element={
                <RouteSuspense>
                  <TicketDetails />
                </RouteSuspense>
              }
            />
            <Route
              path="sell"
              element={
                <RouteSuspense>
                  <Sell />
                </RouteSuspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <RouteSuspense>
                  <Dashboard />
                </RouteSuspense>
              }
            />
            <Route
              path="alerts"
              element={
                <RouteSuspense>
                  <Alerts />
                </RouteSuspense>
              }
            />
            <Route
              path="terms"
              element={
                <RouteSuspense>
                  <TermsOfService />
                </RouteSuspense>
              }
            />
            <Route
              path="privacy"
              element={
                <RouteSuspense>
                  <PrivacyPolicy />
                </RouteSuspense>
              }
            />
            <Route
              path="cookie"
              element={
                <RouteSuspense>
                  <CookiePolicy />
                </RouteSuspense>
              }
            />
            <Route
              path="login"
              element={
                <RouteSuspense>
                  <Login />
                </RouteSuspense>
              }
            />
            <Route
              path="register"
              element={
                <RouteSuspense>
                  <Register />
                </RouteSuspense>
              }
            />
            <Route
              path="verify-email"
              element={
                <RouteSuspense>
                  <VerifyEmail />
                </RouteSuspense>
              }
            />
            <Route
              path="forgot-password"
              element={
                <RouteSuspense>
                  <ForgotPassword />
                </RouteSuspense>
              }
            />
            <Route
              path="admin"
              element={
                <RouteSuspense>
                  <AdminDashboard />
                </RouteSuspense>
              }
            />
            <Route
              path="admin/users/:userId"
              element={
                <RouteSuspense>
                  <AdminUserProfile />
                </RouteSuspense>
              }
            />
            <Route
              path="admin/login"
              element={
                <RouteSuspense>
                  <AdminLogin />
                </RouteSuspense>
              }
            />
            <Route
              path="admin/register"
              element={
                <RouteSuspense>
                  <AdminRegister />
                </RouteSuspense>
              }
            />
            <Route
              path="contact"
              element={
                <RouteSuspense>
                  <Contact />
                </RouteSuspense>
              }
            />
            <Route
              path="faq"
              element={
                <RouteSuspense>
                  <FAQ />
                </RouteSuspense>
              }
            />
            <Route
              path="transit"
              element={
                <RouteSuspense>
                  <Transit />
                </RouteSuspense>
              }
            />
            
            {/* Built-in unauthorized testing state optionally or catch-all */}
            <Route
              path="unauthorized"
              element={
                <RouteSuspense>
                  <Unauthorized />
                </RouteSuspense>
              }
            />
            <Route
              path="*"
              element={
                <RouteSuspense>
                  <NotFound />
                </RouteSuspense>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
