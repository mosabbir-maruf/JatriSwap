import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Home, ArrowRight, RouteOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";

const NotFoundBrutalistIllustration = () => (
  <div className="flex flex-col items-center justify-center mb-4 select-none">
    <div className="relative">
      <span className="font-heading text-[8rem] md:text-[12rem] font-black leading-none text-foreground tracking-tighter">404</span>
      {/* Strike through */}
      <div className="absolute top-1/2 left-[-10%] right-[-10%] h-4 md:h-6 bg-destructive -translate-y-1/2 -rotate-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
    </div>
  </div>
);

export default function NotFound() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen py-24 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-12 lg:p-16 relative"
      >
        {/* Decorative Badge */}
        <div className="absolute -top-4 -right-4 md:-top-5 md:-right-5 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-black uppercase tracking-widest border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] rotate-3">
          ERROR 404
        </div>

        <div className="flex flex-col items-center text-center space-y-6">
          <NotFoundBrutalistIllustration />
          
          <h1 className="font-heading text-4xl md:text-6xl font-black uppercase tracking-tighter text-foreground">
            Station <span className="text-muted-foreground line-through">Found</span> <span className="text-primary italic">Missing</span>
          </h1>
          
          <p className="font-mono text-sm md:text-base uppercase tracking-widest font-bold text-muted-foreground max-w-lg leading-relaxed text-balance">
            The page, route, or ticket you are looking for has been deleted, moved, or never existed in our system network.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="w-full max-w-md mt-6 relative group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors z-10" />
            <Input 
              type="text" 
              placeholder="Search for tickets or routes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-14 w-full rounded-none border-4 border-foreground bg-background shadow-[8px_8px_0_0_rgba(0,0,0,1)] focus:ring-0 focus-visible:ring-0 focus-visible:border-primary font-mono text-xs uppercase font-bold placeholder:text-muted-foreground transition-all relative z-0"
            />
          </form>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-10">
            <Button 
              render={<Link to="/" />}
              className="rounded-none h-14 px-8 font-mono text-xs uppercase tracking-widest font-bold shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background border-2 border-foreground group"
            >
                <Home className="w-4 h-4 mr-2" /> 
                Return Home
            </Button>
            <Button 
              render={<Link to="/browse" />}
              className="rounded-none h-14 px-8 font-mono text-xs uppercase tracking-widest font-bold shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground border-2 border-primary group"
            >
                Browse Tickets
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /> 
            </Button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
