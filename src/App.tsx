import { BrowserRouter as Router, Routes, Route, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket, Menu, X, MessageSquare, ArrowRight, Shield, CreditCard, HelpCircle, Search, User, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase/firebase";

import { Button } from "@/components/ui/button";
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
import Browse from "./pages/Browse";
import Sell from "./pages/Sell";
import Dashboard from "./pages/Dashboard";
import TicketDetails from "./pages/TicketDetails";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));

function AdminRouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, firebaseUser } = useAuth();
  const isLoggedIn = !!firebaseUser;

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
    <header className="fixed top-0 w-full z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-foreground text-background p-1.5 flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-tighter text-foreground uppercase">
              TransitSwap.
            </span>
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

                 {isLoggedIn ? (
                   <div className="flex items-center gap-4 hidden sm:flex">
                     <DropdownMenu>
                       <DropdownMenuTrigger className="w-9 h-9 xl:w-10 xl:h-10 border-2 border-foreground bg-muted flex items-center justify-center hover:bg-foreground hover:text-background transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)] outline-none">
                         {currentUser?.role === 'admin' ? <Shield className="w-4 h-4 xl:w-5 xl:h-5" /> : <User className="w-4 h-4 xl:w-5 xl:h-5" />}
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-48 bg-background border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none p-0 mt-2">
                         <DropdownMenuItem onClick={() => navigate(currentUser?.role === 'admin' ? '/admin' : '/dashboard')} className="rounded-none px-4 py-3 font-mono text-[10px] xl:text-xs uppercase font-bold tracking-widest cursor-pointer hover:bg-muted focus:bg-muted focus:text-foreground">
                           {currentUser?.role === 'admin' ? <Shield className="w-4 h-4 mr-2" /> : <Menu className="w-4 h-4 mr-2" />} 
                           {currentUser?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                         </DropdownMenuItem>
                         {currentUser?.role !== 'admin' && (
                           <>
                             <DropdownMenuSeparator className="m-0 bg-foreground/20" />
                             <DropdownMenuItem onClick={() => navigate('/dashboard?action=profile')} className="rounded-none px-4 py-3 font-mono text-[10px] xl:text-xs uppercase font-bold tracking-widest cursor-pointer hover:bg-muted focus:bg-muted focus:text-foreground">
                               <User className="w-4 h-4 mr-2" /> Edit profile
                             </DropdownMenuItem>
                           </>
                         )}
                         <DropdownMenuSeparator className="m-0 bg-foreground/20" />
                         <DropdownMenuItem onClick={handleLogout} className="rounded-none px-4 py-3 font-mono text-[10px] xl:text-xs uppercase font-bold tracking-widest cursor-pointer text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground">
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
              <Link to="/sell" onClick={() => setMobileMenuOpen(false)} className="p-6 flex justify-between items-center hover:bg-muted">
                 Sell Ticket <ArrowRight className="w-4 h-4" />
              </Link>
              {isLoggedIn ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="p-6 flex justify-between items-center hover:bg-muted">
                     Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
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
  );
};

const Footer = () => {
  const { currentUser } = useAuth();
  return (
  <footer className="bg-foreground text-background mt-auto relative pt-16 pb-8 border-t border-border">
    <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
        
        {/* Brand & Newsletter Column */}
        <div className="md:col-span-12 lg:col-span-5 space-y-8">
           <div>
             <Link to="/" className="flex items-center space-x-2 mb-6">
                <div className="bg-background text-foreground p-1 flex items-center justify-center">
                  <Ticket className="w-6 h-6" />
                </div>
                <span className="font-heading font-bold text-3xl tracking-tighter uppercase">
                  TransitSwap.
                </span>
             </Link>
             <p className="text-muted text-lg font-sans leading-relaxed max-w-sm">
               The premier marketplace for verified public transit tickets. Connect, exchange, and travel securely.
             </p>
           </div>
           
           <div className="space-y-4">
              <h4 className="font-mono text-sm tracking-widest uppercase font-bold text-background">Stay in the loop</h4>
              <form className="flex max-w-md border border-muted bg-foreground" onSubmit={e => e.preventDefault()}>
                 <Input 
                   type="email" 
                   placeholder="Enter your email" 
                   className="flex-1 bg-transparent border-0 text-background placeholder:text-muted focus-visible:ring-0 rounded-none h-12"
                 />
                 <Button type="submit" variant="secondary" className="h-12 px-6 rounded-none font-mono text-xs uppercase font-bold tracking-widest bg-background text-foreground hover:bg-muted">Join</Button>
              </form>
           </div>
        </div>

        {/* Links Columns */}
        <div className="md:col-span-4 lg:col-span-2 lg:col-start-7">
          <h4 className="font-mono text-sm tracking-widest uppercase font-bold text-background mb-6">Marketplace</h4>
          <ul className="space-y-4 font-mono text-[11px] uppercase tracking-wider text-muted">
            <li><Link to="/browse" className="hover:text-background transition-colors">Browse Tickets</Link></li>
            <li><Link to="/sell" className="hover:text-background transition-colors">Sell a Ticket</Link></li>
            <li><Link to="/" className="hover:text-background transition-colors">Popular Routes</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4 lg:col-span-2">
          <h4 className="font-mono text-sm tracking-widest uppercase font-bold text-background mb-6">Support</h4>
          <ul className="space-y-4 font-mono text-[11px] uppercase tracking-wider text-muted">
            <li><Link to="/" className="hover:text-background transition-colors">Refund Policy</Link></li>
            <li><Link to="/faq" className="hover:text-background transition-colors">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-background transition-colors">Contact Us</Link></li>
            {currentUser?.role === 'admin' && (
              <li><Link to="/admin" className="hover:text-amber-400 text-amber-500 transition-colors flex items-center gap-1"><Shield className="w-3 h-3"/> Admin</Link></li>
            )}
          </ul>
        </div>

        <div className="md:col-span-4 lg:col-span-2">
          <h4 className="font-mono text-sm tracking-widest uppercase font-bold text-background mb-6">Legal</h4>
          <ul className="space-y-4 font-mono text-[11px] uppercase tracking-wider text-muted">
            <li><Link to="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
            <li><Link to="/cookie" className="hover:text-background transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>

      </div>
      
      <div className="pt-8 border-t border-muted/30 font-mono text-[10px] uppercase tracking-widest text-muted flex flex-col md:flex-row justify-between items-center">
        <p className="mb-4 md:mb-0">© {new Date().getFullYear()} TransitSwap Inc. All rights reserved.</p>
        <div className="flex gap-4 items-center">
           <div className="w-1.5 h-1.5 rounded-none bg-primary animate-pulse" />
           <span className="font-bold text-background">All systems operational</span>
        </div>
      </div>
    </div>
  </footer>
  );
};

// Fallback ChevronRight since it's locally used in the footer component design
const ChevronRight = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
)

import { Toaster } from "@/components/ui/sonner";

const AppLayout = () => {
  const location = useLocation();
  
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
            <Route path="browse" element={<Browse />} />
            <Route path="ticket/:id" element={<TicketDetails />} />
            <Route path="sell" element={<Sell />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="cookie" element={<CookiePolicy />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route
              path="admin"
              element={
                <AdminRouteSuspense>
                  <AdminDashboard />
                </AdminRouteSuspense>
              }
            />
            <Route
              path="admin/login"
              element={
                <AdminRouteSuspense>
                  <AdminLogin />
                </AdminRouteSuspense>
              }
            />
            <Route
              path="admin/register"
              element={
                <AdminRouteSuspense>
                  <AdminRegister />
                </AdminRouteSuspense>
              }
            />
            <Route path="contact" element={<Contact />} />
            <Route path="faq" element={<FAQ />} />
            
            {/* Built-in unauthorized testing state optionally or catch-all */}
            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
