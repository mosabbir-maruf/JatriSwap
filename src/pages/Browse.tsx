import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { STATIONS, TRANSPORTS, ALL_SEAT_CLASS_FILTER_OPTIONS, seatClassesForMode } from "@/src/constants";
import { Autocomplete } from "@/src/components/common/Autocomplete";
import { TicketCard } from "@/src/components/common/TicketCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, ArrowUpDown, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toast } from "sonner";
import { fetchTicketsPage, TICKETS_PAGE_SIZE, ticketPostedAtMs, type TicketListFilters } from "@/src/lib/firebase/tickets";
import { Ticket } from "@/src/types";
import { departureTimeMatchesSearch } from "@/src/lib/formatDepartureTime";
import { useTicketSellerPrivacy } from "@/src/hooks/useTicketSellerPrivacy";
import { redactSellerPhonesForViewer } from "@/src/lib/ticketPrivacy";
import { isTicketPubliclyListed } from "@/src/lib/ticketExpiration";
import { useCalendarPopoverSelect } from "@/src/hooks/useCalendarPopoverSelect";
import {
  BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES,
  BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME,
} from "@/src/lib/brutalistSingleDayCalendar";

const Browse = () => {
  const listingViewer = useTicketSellerPrivacy();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as "train" | "bus" | null;
  const initialQuery = searchParams.get("q") || "";
  const initialOrigin = searchParams.get("origin") || "";
  const initialDestination = searchParams.get("destination") || "";
  const initialDateStr = searchParams.get("date") || "";
  
  const [transportMode, setTransportMode] = useState<"train" | "bus" | "all">(initialMode || "all");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([100, 10000]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [date, setDate] = useState<Date | undefined>(initialDateStr ? new Date(initialDateStr) : undefined);
  const { calendarPopoverOpen, setCalendarPopoverOpen, onCalendarSelect } =
    useCalendarPopoverSelect(setDate);
  const [origin, setOrigin] = useState<string>(initialOrigin);
  const [destination, setDestination] = useState<string>(initialDestination);
  const [seatClasses, setSeatClasses] = useState<string[]>([]);
  const [transportTypes, setTransportTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const seatClassFilterOptions = useMemo(() => {
    if (transportMode === "all") return ALL_SEAT_CLASS_FILTER_OPTIONS;
    return [...seatClassesForMode(transportMode)];
  }, [transportMode]);

  const trainTransportTypeFilters = useMemo(
    () =>
      Array.from(new Set(TRANSPORTS.filter((x) => x.mode === "train").map((x) => x.type))),
    [],
  );

  useEffect(() => {
    if (transportMode === "bus") setTransportTypes([]);
  }, [transportMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches);
    };
    setIsDesktopViewport(media.matches);
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  const resetFilters = useCallback(() => {
    setPriceRange([100, 10000]);
    setSearchQuery("");
    setDate(undefined);
    setTransportMode("all");
    setOrigin("");
    setDestination("");
    setSeatClasses([]);
    setTransportTypes([]);
    setSortBy("newest");
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketsRaw, setTicketsRaw] = useState<Ticket[]>([]);
  const [listCursor, setListCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const tickets = useMemo(
    () => redactSellerPhonesForViewer(ticketsRaw, listingViewer),
    [ticketsRaw, listingViewer],
  );

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const filters: TicketListFilters = {
      ...(transportMode !== "all" ? { mode: transportMode as "train" | "bus" } : {}),
      ...(origin ? { from: origin } : {}),
      ...(destination ? { to: destination } : {}),
    };

    setIsLoading(true);
    fetchTicketsPage(TICKETS_PAGE_SIZE, filters, null)
      .then(({ tickets: rows, lastDoc }) => {
        if (cancelled) return;
        setTicketsRaw(rows);
        setListCursor(lastDoc);
        setHasMore(rows.length === TICKETS_PAGE_SIZE);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load tickets.");
          setTicketsRaw([]);
          setListCursor(null);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transportMode, origin, destination]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !listCursor) return;
    const filters: TicketListFilters = {
      ...(transportMode !== "all" ? { mode: transportMode as "train" | "bus" } : {}),
      ...(origin ? { from: origin } : {}),
      ...(destination ? { to: destination } : {}),
    };
    setLoadingMore(true);
    try {
      const { tickets: rows, lastDoc } = await fetchTicketsPage(TICKETS_PAGE_SIZE, filters, listCursor);
      setTicketsRaw((prev) => [...prev, ...rows]);
      setListCursor(lastDoc);
      setHasMore(rows.length === TICKETS_PAGE_SIZE);
    } catch {
      toast.error("Could not load more tickets.");
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Single derivation that combines public-listing gating + user filters + sort,
   * memoized on every input. Prevents rebuilds when unrelated state changes
   * (e.g. opening the filters panel, calendar popover, sort dropdown focus).
   * Cost: O(n) filter + O(n log n) sort per dep change, not per render.
   */
  const sortedTickets = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();
    const wantDay = date ? format(date, "yyyy-MM-dd") : "";
    const [minPrice, maxPrice] = priceRange;
    const seatClassSet = seatClasses.length > 0 ? new Set(seatClasses) : null;
    const transportTypeSet = transportTypes.length > 0 ? new Set(transportTypes) : null;

    const filtered = tickets.filter((t) => {
      if (!isTicketPubliclyListed(t, now)) return false;
      if (transportMode !== "all" && t.mode !== transportMode) return false;
      if (t.sellingPrice < minPrice || t.sellingPrice > maxPrice) return false;
      if (origin && t.from !== origin) return false;
      if (destination && t.to !== destination) return false;
      if (seatClassSet && !seatClassSet.has(t.seatClass)) return false;
      if (transportTypeSet && t.transportType && !transportTypeSet.has(t.transportType)) return false;
      if (q) {
        const matchName = t.transportName.toLowerCase().includes(q);
        const matchRoute = t.from.toLowerCase().includes(q) || t.to.toLowerCase().includes(q);
        const matchId = t.id?.toLowerCase().includes(q) || false;
        const matchTime =
          departureTimeMatchesSearch(t.departureTime, q) || (!!t.date && t.date.toLowerCase().includes(q));
        if (!matchName && !matchRoute && !matchId && !matchTime) return false;
      }
      if (wantDay) {
        try {
          if (format(new Date(t.date), "yyyy-MM-dd") !== wantDay) return false;
        } catch {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "price-asc") return a.sellingPrice - b.sellingPrice;
      if (sortBy === "price-desc") return b.sellingPrice - a.sellingPrice;
      if (sortBy === "departure-asc") {
        const timeA = new Date(`${a.date}T${a.departureTime || "00:00"}`).getTime();
        const timeB = new Date(`${b.date}T${b.departureTime || "00:00"}`).getTime();
        return timeA - timeB;
      }
      return ticketPostedAtMs(b) - ticketPostedAtMs(a);
    });

    return filtered;
  }, [tickets, transportMode, searchQuery, priceRange, origin, destination, date, seatClasses, transportTypes, sortBy]);

  /** Header counter — same source of truth as the rendered grid. */
  const filteredTicketsCount = sortedTickets.length;

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-32 pb-24 relative">
      <div className="page-shell relative z-10">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 border-b-4 border-foreground pb-8">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">Available <span className="text-primary">Tickets</span></h1>
            <p className="font-mono text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Showing {filteredTicketsCount} tickets from registered users</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
             <Button variant="outline" className="h-12 rounded-none px-6 border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all text-xs uppercase tracking-widest font-bold" onClick={() => setShowFilters(!showFilters)}>
               <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
             </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {(showFilters || isDesktopViewport) && (
              <motion.aside 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full lg:w-[440px] shrink-0 space-y-4"
              >
                <div className="bg-background border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sticky top-24">
                  <div className="flex justify-between items-center mb-6 border-b-4 border-foreground pb-4">
                    <h3 className="font-heading font-black text-xl uppercase tracking-tighter">Filters</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-none border border-transparent hover:border-foreground text-[10px] uppercase tracking-widest text-muted-foreground px-2 font-bold transition-all"
                      onClick={resetFilters}
                    >
                      Reset all
                    </Button>
                  </div>

                  <div className="space-y-5">
                    {/* Transport Mode */}
                    <div className="space-y-3">
                      <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Transport Mode</Label>
                      <div className="flex bg-background border-2 border-foreground p-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <button
                          className={cn("flex-1 py-1.5 font-mono text-[10px] uppercase font-bold transition-all", transportMode === "all" ? "bg-foreground text-background" : "hover:bg-muted text-foreground")}
                          onClick={() => setTransportMode("all")}
                        >
                          All
                        </button>
                        <button
                          className={cn("flex-1 py-1.5 font-mono text-[10px] uppercase font-bold transition-all", transportMode === "train" ? "bg-foreground text-background" : "hover:bg-muted text-foreground")}
                          onClick={() => setTransportMode("train")}
                        >
                          Train
                        </button>
                        <button
                          className={cn("flex-1 py-1.5 font-mono text-[10px] uppercase font-bold transition-all", transportMode === "bus" ? "bg-foreground text-background" : "hover:bg-muted text-foreground")}
                          onClick={() => setTransportMode("bus")}
                        >
                          Bus
                        </button>
                      </div>
                    </div>

                     {/* Route */}
                     <div className="space-y-3">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Route</Label>
                        <Autocomplete
                          id="browse-from"
                          ariaLabel="From station"
                          value={origin}
                          onValueChange={setOrigin}
                          options={STATIONS}
                          placeholder="Type from station"
                          size="sm"
                          recentScope="station.from"
                        />
                        <Autocomplete
                          id="browse-to"
                          ariaLabel="To station"
                          value={destination}
                          onValueChange={setDestination}
                          options={STATIONS}
                          placeholder="Type to station"
                          size="sm"
                          recentScope="station.to"
                        />
                     </div>

                    {/* Date */}
                     <div className="space-y-3">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Date</Label>
                        <Popover open={calendarPopoverOpen} onOpenChange={setCalendarPopoverOpen}>
                          <PopoverTrigger render={
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none border-2 border-foreground h-10 px-4 bg-background",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
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

                    {/* Price Range */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Price Range</Label>
                        <span className="font-mono text-[10px] font-bold text-foreground">৳{priceRange[0]} - ৳{priceRange[1]}</span>
                      </div>
                      <Slider
                        value={priceRange}
                        max={10000}
                        min={100}
                        step={50}
                        onValueChange={setPriceRange}
                        className="py-4 cursor-pointer"
                      />
                    </div>

                    {/* Class */}
                    <div className="space-y-3">
                      <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Seat Class</Label>
                      <div className="flex flex-wrap gap-2">
                        {seatClassFilterOptions.map(sc => (
                          <Badge 
                            key={sc} 
                            variant="outline" 
                            className={cn(
                              "rounded-none border-2 border-foreground cursor-pointer font-mono text-[10px] px-3 py-1.5 uppercase font-bold transition-colors",
                              seatClasses.includes(sc) ? "bg-foreground text-background" : "bg-background hover:bg-muted text-foreground"
                            )}
                            onClick={() => {
                              if (seatClasses.includes(sc)) {
                                setSeatClasses(seatClasses.filter(c => c !== sc));
                              } else {
                                setSeatClasses([...seatClasses, sc]);
                              }
                            }}
                          >
                            {sc}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Train service type (Intercity / Night Express — bus tier is seat class, not transportType) */}
                    {transportMode !== "bus" ? (
                      <div className="space-y-3">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Train service</Label>
                        <div className="flex flex-wrap gap-2">
                          {trainTransportTypeFilters.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className={cn(
                                "rounded-none border-2 border-foreground cursor-pointer font-mono text-[10px] px-3 py-1.5 uppercase font-bold transition-colors",
                                transportTypes.includes(type) ? "bg-foreground text-background" : "bg-background hover:bg-muted text-foreground"
                              )}
                              onClick={() => {
                                if (transportTypes.includes(type)) {
                                  setTransportTypes(transportTypes.filter((t) => t !== type));
                                } else {
                                  setTransportTypes([...transportTypes, type]);
                                }
                              }}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    
                    <Button 
                      className="w-full rounded-none h-12 text-[10px] mt-8 uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-destructive text-destructive-foreground border-2 border-destructive"
                      onClick={resetFilters}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Grid */}
          <div className="flex-1">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 w-full">
               <div className="relative w-full sm:w-96 flex-1 max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search tickets by name, route, time..." 
                   className="pl-11 h-10 rounded-none border-2 border-foreground bg-background transition-all focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               
               <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-background rounded-none border-2 border-foreground focus:ring-0 focus:border-foreground font-mono font-bold uppercase text-[10px] shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <ArrowUpDown className="w-3 h-3 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground">
                    <SelectItem value="newest" className="rounded-none focus:bg-foreground focus:text-background font-mono font-bold uppercase text-[10px]">Newest Listed</SelectItem>
                    <SelectItem value="price-asc" className="rounded-none focus:bg-foreground focus:text-background font-mono font-bold uppercase text-[10px]">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc" className="rounded-none focus:bg-foreground focus:text-background font-mono font-bold uppercase text-[10px]">Price: High to Low</SelectItem>
                    <SelectItem value="departure-asc" className="rounded-none focus:bg-foreground focus:text-background font-mono font-bold uppercase text-[10px]">Departure Time</SelectItem>
                  </SelectContent>
                </Select>
             </div>

            {isLoading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" aria-busy="true">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-full flex items-stretch border border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] h-[240px] bg-background">
                    <div className="flex-1 p-6 relative flex flex-col justify-between h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-32 rounded-none" />
                          <Skeleton className="h-3 w-20 rounded-none" />
                        </div>
                        <Skeleton className="h-4 w-16 rounded-none bg-primary/20" />
                      </div>
                      <div className="flex items-center justify-between mt-auto space-x-4">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-12 rounded-none" />
                          <Skeleton className="h-8 w-16 rounded-none" />
                        </div>
                        <div className="flex-1 px-4 space-y-2">
                          <Skeleton className="h-3 w-full max-w-[80px] rounded-none" />
                          <div className="w-full border-t-2 border-dashed border-foreground/30 my-2" />
                          <Skeleton className="h-3 w-full max-w-[80px] rounded-none" />
                        </div>
                      </div>
                    </div>
                    <div className="w-px border-l border-dashed border-foreground my-0 shrink-0 bg-background" />
                    <div className="w-[130px] bg-muted/20 p-4 flex flex-col justify-between items-stretch">
                      <div className="space-y-4">
                        <div className="border-b border-foreground/10 pb-2 space-y-2">
                          <Skeleton className="h-2 w-8 rounded-none" />
                          <Skeleton className="h-3 w-12 rounded-none" />
                          <Skeleton className="h-2 w-10 rounded-none" />
                        </div>
                        <div className="border-b border-foreground/10 pb-2 space-y-2">
                          <Skeleton className="h-2 w-10 rounded-none" />
                          <Skeleton className="h-3 w-16 rounded-none" />
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                        <Skeleton className="h-6 w-16 rounded-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedTickets.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {sortedTickets.map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="h-full"
                  >
                    <TicketCard ticket={ticket} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 border-4 border-foreground flex items-center justify-center shadow-[8px_8px_0_0_rgba(0,0,0,1)] mb-6 bg-card bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
                  <Search className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="font-heading text-2xl font-black uppercase tracking-tighter mb-2">No tickets found</h3>
                <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest font-medium max-w-md mx-auto mb-8 leading-relaxed">We couldn't find any tickets matching your filters. Try adjusting your search criteria.</p>
                <Button className="rounded-none h-12 px-8 text-[10px] uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all" onClick={resetFilters}>Clear all filters</Button>
              </div>
            )}
            
            {!isLoading && hasMore && tickets.length > 0 && (
              <div className="mt-12 flex justify-center">
                <Button
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="rounded-none border-2 border-foreground h-12 px-8 font-mono font-bold uppercase text-[10px] tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background"
                >
                  {loadingMore ? "Loading…" : "Load more tickets"}
                </Button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Browse;
