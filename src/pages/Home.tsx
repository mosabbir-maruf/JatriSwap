import * as React from "react"
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import { MapPin, Calendar as CalendarIcon, Search, ArrowRight, ShieldCheck, Wallet, Users, Train, BusFront } from "lucide-react";
import { STATIONS } from "@/src/constants";
import { Autocomplete } from "@/src/components/common/Autocomplete";
import { format } from "date-fns";
import { TicketCard } from "@/src/components/common/TicketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { subscribeToTickets } from "@/src/lib/firebase/tickets";
import { Ticket as TicketType } from "@/src/types";
import { useTicketSellerPrivacy } from "@/src/hooks/useTicketSellerPrivacy";
import { redactSellerPhonesForViewer } from "@/src/lib/ticketPrivacy";
import { filterPubliclyListedTickets } from "@/src/lib/ticketExpiration";
import { useCalendarPopoverSelect } from "@/src/hooks/useCalendarPopoverSelect";
import {
  BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES,
  BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME,
} from "@/src/lib/brutalistSingleDayCalendar";

const Home = () => {
  const navigate = useNavigate();
  const listingViewer = useTicketSellerPrivacy();
  const [date, setDate] = React.useState<Date | undefined>();
  const { calendarPopoverOpen, setCalendarPopoverOpen, onCalendarSelect } =
    useCalendarPopoverSelect(setDate);
  const [transportMode, setTransportMode] = React.useState<"train" | "bus">("train");
  const [homePreviewRaw, setHomePreviewRaw] = React.useState<TicketType[]>([]);
  const [homePreviewReady, setHomePreviewReady] = React.useState(false);

  const [origin, setOrigin] = React.useState<string>("");
  const [destination, setDestination] = React.useState<string>("");

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const start = () => {
      if (disposed) return;
      unsubscribe = subscribeToTickets(
        (rows) => {
          setHomePreviewRaw(filterPubliclyListedTickets(rows).slice(0, 6));
          setHomePreviewReady(true);
        },
        undefined,
        { maxDocuments: 12 },
      );
    };

    const idleCallback = (
      typeof window !== "undefined"
        ? (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback) => number })
            .requestIdleCallback
        : undefined
    );
    if (typeof idleCallback === "function") {
      idleCallback(() => start());
    } else {
      timer = globalThis.setTimeout(start, 0);
    }

    return () => {
      disposed = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      unsubscribe?.();
    };
  }, []);

  const homePreviewTickets = React.useMemo(
    () => redactSellerPhonesForViewer(homePreviewRaw, listingViewer),
    [homePreviewRaw, listingViewer],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('mode', transportMode);
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    if (date) params.set('date', format(date, "yyyy-MM-dd"));
    
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center py-24 px-4 sm:px-8 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] border-b-4 border-foreground overflow-hidden">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           className="text-center z-10 max-w-6xl mx-auto flex flex-col items-center w-full"
        >
          <div className="mb-8">
            <span className="px-5 py-2.5 font-mono text-xs md:text-sm uppercase tracking-widest font-black border-4 border-foreground bg-primary text-primary-foreground rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] transform -rotate-2 inline-block">
              Your unused ticket deserves a traveler.
            </span>
          </div>
          <h1 className="font-heading text-6xl sm:text-[100px] md:text-[120px] lg:text-[150px] xl:text-[180px] font-black leading-[0.85] tracking-tighter mb-8 text-foreground uppercase drop-shadow-[4px_4px_0_rgba(0,0,0,1)] md:drop-shadow-[6px_6px_0_rgba(0,0,0,1)] text-balance">
            Swap <br className="md:hidden" />Tickets.<br className="md:hidden" />
            <span className="text-primary tracking-tight"> Keep Travels.</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground font-mono font-bold leading-relaxed mb-12 tracking-tight bg-background p-6 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] max-w-2xl transform rotate-1">
            The premier marketplace to buy and sell unused train & bus tickets.
          </p>
          
          <div className="flex w-full items-center justify-center relative z-20 mt-4 md:mt-8">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="w-full bg-muted p-6 sm:p-8 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[12px_12px_0_0_rgba(0,0,0,1)] lg:shadow-[16px_16px_0_0_rgba(0,0,0,1)] relative rotate-0 mx-auto max-w-6xl"
             >
               <form onSubmit={handleSearch} className="flex flex-col gap-6 w-full text-left">
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end justify-between w-full">
                  <div className="space-y-3 w-full flex-1 min-w-0">
                    <Label className="font-mono text-xs uppercase tracking-widest text-foreground font-black">Transport</Label>
                    <div className="flex h-16 bg-background border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <button
                        type="button"
                        onClick={() => setTransportMode("train")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-none font-mono font-bold text-xs uppercase transition-all border-r-4 border-foreground",
                          transportMode === "train" 
                            ? "bg-foreground text-background" 
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <Train className="w-4 h-4" /> Train
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransportMode("bus")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-none font-mono font-bold text-xs uppercase transition-all",
                          transportMode === "bus" 
                            ? "bg-foreground text-background" 
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <BusFront className="w-4 h-4" /> Bus
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 w-full flex-1 min-w-0">
                    <Label className="font-mono text-xs uppercase tracking-widest text-foreground font-black">From</Label>
                    <Autocomplete
                      id="home-from"
                      ariaLabel="Leaving from"
                      value={origin}
                      onValueChange={setOrigin}
                      options={STATIONS}
                      placeholder="Type origin station"
                      size="lg"
                      borderClassName="border-4"
                      inputClassName="px-4 text-sm"
                      recentScope="station.from"
                    />
                  </div>

                  <div className="space-y-3 w-full flex-1 min-w-0">
                    <Label className="font-mono text-xs uppercase tracking-widest text-foreground font-black">To</Label>
                    <Autocomplete
                      id="home-to"
                      ariaLabel="Going to"
                      value={destination}
                      onValueChange={setDestination}
                      options={STATIONS}
                      placeholder="Type destination station"
                      size="lg"
                      borderClassName="border-4"
                      inputClassName="px-4 text-sm"
                      recentScope="station.to"
                    />
                  </div>

                  <div className="space-y-3 w-full flex-1 min-w-0">
                    <Label className="font-mono text-xs uppercase tracking-widest text-foreground font-black">Date</Label>
                     <div className="relative w-full">
                       <Popover open={calendarPopoverOpen} onOpenChange={setCalendarPopoverOpen}>
                         <PopoverTrigger render={
                           <Button
                             variant={"outline"}
                             className={cn(
                               "w-full justify-start text-left font-mono font-bold text-sm uppercase h-16 rounded-none border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background flex items-center",
                               !date && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-5 w-5" />
                             {date ? format(date, "MMM dd, yyyy") : <span>Pick a date</span>}
                           </Button>
                         } />
                         <PopoverContent
                           instantMotion
                           className="w-auto p-0 rounded-none border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
                           align="start"
                         >
                           <Calendar
                             mode="single"
                             selected={date}
                             onSelect={onCalendarSelect}
                             initialFocus
                             className={BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME}
                             classNames={BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES}
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                  </div>
                  
                  <Button type="submit" className="w-full lg:w-auto h-16 px-10 rounded-none font-mono text-sm uppercase tracking-widest font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background whitespace-nowrap border-4 border-foreground shrink-0 mt-8 lg:mt-0">
                    <Search className="w-5 h-5 mr-2" /> Search
                  </Button>
                </div>
               </form>
             </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Latest listings preview */}
      <section className="py-24 bg-background border-b border-border">
        <div className="page-shell">
          <div className="flex justify-between items-end mb-16 border-b border-border pb-6">
            <div>
              <h2 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">Latest <span className="text-primary">Listings</span></h2>
              <p className="font-mono text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Recently posted available tickets — browse for more.</p>
            </div>
            <Button variant="outline" render={<Link to="/browse" />} className="hidden sm:flex group rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase font-bold px-6 h-12">
                View all <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {!homePreviewReady ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="min-h-[280px] w-full rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                    aria-busy="true"
                  />
                ))}
              </>
            ) : (
              homePreviewTickets.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="h-full"
                >
                  <TicketCard ticket={ticket} />
                </motion.div>
              ))
            )}
          </div>
          {homePreviewReady && homePreviewTickets.length === 0 && (
            <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground text-center mb-8">
              No listings to show right now.{" "}
              <Link to="/browse" className="text-foreground underline underline-offset-4">
                Browse all tickets
              </Link>
            </p>
          )}
          <div className="mt-12 text-center sm:hidden">
            <Button variant="outline" render={<Link to="/browse" />} className="w-full rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono font-bold text-xs uppercase h-12">
              View all tickets
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-24 relative border-b border-border overflow-hidden bg-background">
        <div className="page-shell relative z-10">
           <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">Why connect with <span className="text-primary">JatriSwap?</span></h2>
             <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest font-bold leading-relaxed">We've built a secure environment where your money and tickets are protected.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div className="space-y-6 flex flex-col items-center">
                <div className="w-20 h-20 border-2 border-foreground flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-card bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
                  <ShieldCheck className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-xl font-bold tracking-tighter uppercase">Community Marketplace</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed font-semibold">Every ticket is posted by a registered community member. Real people.</p>
              </div>

              <div className="space-y-6 flex flex-col items-center">
                <div className="w-20 h-20 border-2 border-foreground flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-card bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
                  <Wallet className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-xl font-bold tracking-tighter uppercase">No Price Gouging</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed font-semibold">Our platform caps resale prices. Never pay more than the original value.</p>
              </div>

               <div className="space-y-6 flex flex-col items-center">
                <div className="w-20 h-20 border-2 border-foreground flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-card bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
                  <Users className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-xl font-bold tracking-tighter uppercase">Real Human Support</h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed font-semibold">Stuck on a deal? Our team is one message away, ready to help.</p>
              </div>
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 flex justify-center items-center bg-primary text-primary-foreground border-b border-foreground border-t-[8px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6">Have an unused ticket?</h2>
          <p className="text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto font-mono text-sm uppercase tracking-widest font-bold leading-relaxed">
            Don't let it go to waste. Help another traveler and get your money back in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" render={<Link to="/sell" />} className="bg-background text-foreground hover:bg-background/90 rounded-none h-14 px-10 text-xs font-mono font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
              Sell Your Ticket
            </Button>
            <Button size="lg" render={<Link to="/browse" />} className="bg-foreground text-background hover:bg-foreground/90 rounded-none h-14 px-10 text-xs font-mono font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
              Browse Listings
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
