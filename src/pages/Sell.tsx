import * as React from "react"
import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { STATIONS, TRANSPORTS, seatClassesForMode, transportNamesForMode } from "@/src/constants";
import { Autocomplete } from "@/src/components/common/Autocomplete";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle2, ChevronRight, ChevronLeft, FileText, X, Save, CalendarIcon, Train, BusFront } from "lucide-react";
import { AuthLoadingPlaceholder } from "@/src/components/common/AuthLoadingPlaceholder";
import Unauthorized from "./Unauthorized";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BrutalistTimePicker } from "@/src/components/common/TimePicker";
import { toast } from "sonner";
import { createTicket } from "@/src/lib/firebase/tickets";
import { SELL_DRAFT_STORAGE_KEY } from "@/src/lib/sellDraft";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import {
  accountMaySellTickets,
  normalizeUserAccountStatus,
  sellListingBlockedMessage,
} from "@/src/lib/userAccountStatus";
import { useCalendarPopoverSelect } from "@/src/hooks/useCalendarPopoverSelect";
import {
  BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES,
  BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME,
} from "@/src/lib/brutalistSingleDayCalendar";
import { ticketDepartureDhakaMs } from "@/src/lib/ticketExpiration";
import { ListingWriteBlockedError, SellerProfileMissingError } from "@/src/lib/listingWriteGuard";
import {
  LISTING_SELLER_PROFILE_MISSING_MESSAGE,
  toastFirestoreListingSaveFailure,
  toastListingSaveUnexpectedError,
  toastSellListingBlockedFromShell,
} from "@/src/lib/listingSaveFeedback";

const steps = [
  "Route & Transport",
  "Ticket Details",
  "Pricing",
];

const Sell = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const accountStatus = normalizeUserAccountStatus(currentUser?.status);
  const listingBlocked = Boolean(currentUser) && !accountMaySellTickets(accountStatus);

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    transportMode: "train",
    transportName: "",
    date: "",
    depTime: "",
    seatClass: "",
    passengerCount: "1",
    additionalNotes: "",
    originalPrice: "",
    sellingPrice: "",
    sellerName: "",
    sellerPhone: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      let newFormData = { ...prev, [field]: value };
      if (field === "originalPrice" || field === "sellingPrice") {
         if (Number(newFormData.sellingPrice) > Number(newFormData.originalPrice)) {
            newFormData.sellingPrice = newFormData.originalPrice;
         }
      }
      return newFormData;
    });
  };

  const { calendarPopoverOpen, setCalendarPopoverOpen, onCalendarSelect } = useCalendarPopoverSelect((d) =>
    handleInputChange("date", d ? format(d, "yyyy-MM-dd") : ""),
  );

  const setTransportMode = (mode: "train" | "bus") => {
    setFormData((prev) => ({
      ...prev,
      transportMode: mode,
      transportName: "",
      seatClass: "",
    }));
  };

  useEffect(() => {
    // Load draft on mount
    const savedDraft = localStorage.getItem(SELL_DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const mode = parsed.transportMode === "bus" ? "bus" : "train";
        const rawName = String(parsed.transportName || parsed.trainName || "").trim();
        const namesForMode = new Set(transportNamesForMode(mode));
        const transportName = rawName && namesForMode.has(rawName) ? rawName : "";
        const seatRaw = String(parsed.seatClass || "").trim();
        const seatOk = seatRaw && seatClassesForMode(mode).includes(seatRaw);

        setFormData({
          from: parsed.from || "",
          to: parsed.to || "",
          transportMode: mode,
          transportName,
          date: parsed.date || "",
          depTime: parsed.depTime || "",
          seatClass: seatOk ? seatRaw : "",
          passengerCount: parsed.passengerCount || "1",
          additionalNotes: parsed.additionalNotes || "",
          originalPrice: parsed.originalPrice || "",
          sellingPrice: parsed.sellingPrice || "",
          sellerName: parsed.sellerName || currentUser?.name || "",
          sellerPhone: parsed.sellerPhone || ""
        });
      } catch (e) {
        // Handle invalid JSON
      }
    } else if (currentUser && !formData.sellerName) {
      setFormData(prev => ({ ...prev, sellerName: currentUser.name || "" }));
    }
  }, [currentUser]);

  const saveDraft = () => {
    localStorage.setItem(SELL_DRAFT_STORAGE_KEY, JSON.stringify(formData));
    toast.success("Draft saved", {
      description: "Your ticket details have been saved to draft."
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(SELL_DRAFT_STORAGE_KEY);
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!formData.from || !formData.to || !formData.transportName || !formData.date || !formData.depTime) {
        toast.error("Please fill in all required route information.");
        return false;
      }
      /** Block past-Dhaka-departure listings up front — same Dhaka math the
       *  marketplace uses to auto-expire (see `ticketExpiration.ts`). */
      const departureMs = ticketDepartureDhakaMs({
        date: formData.date,
        departureTime: formData.depTime,
      });
      if (departureMs !== null && departureMs <= Date.now()) {
        toast.error(
          "That journey time has already passed. Choose a future date and departure time.",
        );
        return false;
      }
    }
    if (step === 1) {
      const mode = formData.transportMode === "bus" ? "bus" : "train";
      const allowedSeat = seatClassesForMode(mode);
      if (
        !formData.seatClass ||
        !allowedSeat.includes(formData.seatClass) ||
        !formData.passengerCount
      ) {
        toast.error("Please fill in all required ticket details.");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.originalPrice || !formData.sellingPrice || !formData.sellerName || !formData.sellerPhone) {
        toast.error("Please fill in all pricing and contact information.");
        return false;
      }
      if (Number(formData.sellingPrice) > Number(formData.originalPrice)) {
        toast.error("Selling price cannot exceed the original price.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !firebaseUser?.uid) {
      toast.error("You must be logged in to sell a ticket.");
      return;
    }

    if (currentStep < steps.length - 1) {
       nextStep();
       return;
    }

    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const transportRow = TRANSPORTS.find(
        (t) =>
          t.name === formData.transportName &&
          t.mode === formData.transportMode,
      );

      const originalPrice = Number(formData.originalPrice);
      const sellingPrice = Number(formData.sellingPrice);
      const passengerCount = Number(formData.passengerCount);
      if (
        !Number.isFinite(originalPrice) ||
        !Number.isFinite(sellingPrice) ||
        !Number.isFinite(passengerCount)
      ) {
        toast.error("Check prices and passenger count — use plain numbers only.");
        return;
      }

      await createTicket(firebaseUser.uid, {
        transportName: formData.transportName,
        transportType: transportRow?.type ?? "",
        mode: formData.transportMode as 'train' | 'bus',
        from: formData.from,
        to: formData.to,
        departureTime: formData.depTime,
        date: new Date(formData.date).toISOString(),
        seatClass: formData.seatClass,
        originalPrice,
        sellingPrice,
        passengerCount,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        ...(formData.additionalNotes.trim()
          ? { additionalNotes: formData.additionalNotes.trim() }
          : {}),
      });
      setIsSuccess(true);
      clearDraft();
    } catch (error) {
      if (error instanceof ListingWriteBlockedError) {
        toastSellListingBlockedFromShell(currentUser?.status);
        return;
      }
      if (error instanceof SellerProfileMissingError) {
        toast.error(LISTING_SELLER_PROFILE_MISSING_MESSAGE);
        return;
      }
      if (toastFirestoreListingSaveFailure(error)) return;
      toastListingSaveUnexpectedError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <AuthLoadingPlaceholder />;
  }

  if (!currentUser) {
    return (
      <Unauthorized 
        title="Sign In Required"
        message="You must be logged in to sell a ticket."
        actionMessage="Please log in or register an account to continue."
      />
    );
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (listingBlocked) {
    return (
      <div className="flex-1 bg-background min-h-screen pt-28 pb-24 px-4">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="border-4 border-destructive bg-destructive/10 p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] text-center space-y-4">
            <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter text-destructive">
              Listing unavailable
            </h1>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground/90 leading-relaxed">
              {sellListingBlockedMessage(accountStatus)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center pt-2">
              <Button
                type="button"
                className="rounded-none border-2 border-foreground font-mono text-[10px] uppercase font-black tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                onClick={() => navigate("/dashboard")}
              >
                Back to dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link to="/contact" className="flex items-center justify-center" />}
                className="rounded-none border-2 border-foreground font-mono text-[10px] uppercase font-black tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background"
              >
                Contact support
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sellTransportMode: "train" | "bus" =
    formData.transportMode === "bus" ? "bus" : "train";
  const sellTransportOptions = transportNamesForMode(sellTransportMode);

  const sellSeatMode = formData.transportMode === "bus" ? "bus" : "train";
  const sellSeatOptions = seatClassesForMode(sellSeatMode);
  /** Empty string when unset so Select stays controlled (Base UI; avoid uncontrolled→controlled warning). */
  const sellSeatSelectValue = sellSeatOptions.includes(formData.seatClass)
    ? formData.seatClass
    : "";

  if (isSuccess) {
    return (
      <div className="flex-1 bg-background min-h-screen py-32 flex items-center justify-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background border-4 border-foreground p-12 max-w-md w-full mx-4 text-center shadow-[16px_16px_0_0_rgba(0,0,0,1)]"
        >
          <div className="w-24 h-24 bg-card border-4 border-foreground flex items-center justify-center mx-auto mb-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
            <CheckCircle2 className="w-10 h-10 text-primary" strokeWidth={2} />
          </div>
          <h2 className="font-heading text-4xl font-black uppercase tracking-tighter mb-4 text-foreground">Ticket <span className="text-primary italic">Listed!</span></h2>
          <p className="font-mono text-muted-foreground mb-10 text-xs uppercase tracking-widest font-bold leading-relaxed">Your ticket has been verified and is now live on the marketplace. We'll notify you when someone shows interest.</p>
          <div className="space-y-4">
            <Button className="w-full rounded-none h-14 text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all" onClick={() => navigate("/dashboard")}>View Dashboard</Button>
            <Button variant="outline" className="w-full rounded-none h-14 border-2 border-foreground text-xs uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all" onClick={() => {setIsSuccess(false); setCurrentStep(0);}}>Sell Another Ticket</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background min-h-screen pt-32 pb-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
          <div className="flex justify-between items-end border-b-4 border-foreground pb-6 mb-16">
            <div>
              <h1 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">Sell Your <span className="text-primary">Ticket</span></h1>
              <p className="font-mono text-muted-foreground uppercase tracking-widest text-[10px] font-bold">List your unused public transit ticket securely.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button type="button" variant="outline" onClick={saveDraft} className="rounded-none h-12 border-2 border-foreground px-5 flex items-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-[10px] uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </Button>
            </div>
          </div>

        {/* Progress Bar */}
        <div className="mb-12 sm:mb-20 px-2 sm:px-4">
          <div className="relative flex justify-between">
             {/* Progress Track */}
             <div className="absolute left-[20px] right-[20px] top-[20px] -translate-y-1/2 h-1 bg-border pointer-events-none z-0" />
             
             {/* Progress Fill */}
             <div className="absolute left-[20px] right-[20px] top-[20px] -translate-y-1/2 pointer-events-none z-0">
                <div 
                  className="h-1 bg-foreground transition-all duration-500 ease-in-out" 
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
             </div>

             {/* Steps */}
             {steps.map((step, i) => (
                <div key={step} className="flex flex-col items-center relative z-10 w-10">
                   <div 
                     className={`shrink-0 w-10 h-10 flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 border-2 border-foreground ${
                       i < currentStep 
                         ? "bg-foreground text-background shadow-[2px_2px_0_0_rgba(0,0,0,1)]" 
                         : i === currentStep 
                           ? "bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] scale-110" 
                           : "bg-background text-muted-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                     }`}
                   >
                     {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                   </div>
                   <span 
                     className={`absolute top-14 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase font-bold text-center w-32 hidden sm:block transition-colors duration-300 ${
                       i <= currentStep ? "text-foreground" : "text-muted-foreground"
                     }`}
                   >
                     {step}
                   </span>
                </div>
             ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-background border-4 border-foreground p-8 md:p-12 shadow-[16px_16px_0_0_rgba(0,0,0,1)] relative">
          
          <div className="w-full">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                     <h3 className="font-heading text-3xl font-black uppercase tracking-tighter text-foreground mb-8">Route Information</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">From Station</Label>
                          <Autocomplete
                            id="sell-from"
                            ariaLabel="From station"
                            value={formData.from ?? ""}
                            onValueChange={(v) => handleInputChange("from", v)}
                            options={STATIONS}
                            placeholder="Type origin station"
                            required
                            inputClassName="px-6"
                            recentScope="station.from"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">To Station</Label>
                          <Autocomplete
                            id="sell-to"
                            ariaLabel="To station"
                            value={formData.to ?? ""}
                            onValueChange={(v) => handleInputChange("to", v)}
                            options={STATIONS}
                            placeholder="Type destination station"
                            required
                            inputClassName="px-6"
                            recentScope="station.to"
                          />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Transport Mode</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setTransportMode("train")}
                            className={cn(
                              "flex items-center justify-center gap-2 h-14 rounded-none border-2 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all",
                              formData.transportMode === "train" 
                                ? "border-foreground bg-foreground text-background translate-y-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]" 
                                : "border-foreground bg-background text-foreground"
                            )}
                          >
                            <Train className="w-5 h-5" /> Train
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransportMode("bus")}
                            className={cn(
                              "flex items-center justify-center gap-2 h-14 rounded-none border-2 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all",
                              formData.transportMode === "bus" 
                                ? "border-foreground bg-foreground text-background translate-y-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]" 
                                : "border-foreground bg-background text-foreground"
                            )}
                          >
                            <BusFront className="w-5 h-5" /> Bus
                          </button>
                        </div>
                     </div>

                     <div className="space-y-3" key={`sell-transport-${sellTransportMode}`}>
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Transport Name</Label>
                        <Autocomplete
                          id="sell-transport"
                          ariaLabel={sellTransportMode === "bus" ? "Bus name" : "Train name"}
                          value={formData.transportName ?? ""}
                          onValueChange={(v) => handleInputChange("transportName", v)}
                          options={sellTransportOptions}
                          placeholder={sellTransportMode === "bus" ? "Type bus name" : "Type train name"}
                          required
                          inputClassName="px-6"
                          recentScope={`transport.${sellTransportMode}`}
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Journey Date</Label>
                           <Popover open={calendarPopoverOpen} onOpenChange={setCalendarPopoverOpen}>
                             <PopoverTrigger render={
                               <Button
                                 type="button"
                                 variant={"outline"}
                                 className={cn(
                                   "w-full justify-start text-left font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none border-2 border-foreground h-14 px-6",
                                   !formData.date && "text-muted-foreground"
                                 )}
                               >
                                 <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                 <span className="truncate">{formData.date ? format(new Date(formData.date), "PPP") : "Pick a date"}</span>
                               </Button>
                             } />
                             <PopoverContent
                               instantMotion
                               className="w-auto p-0 rounded-none border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
                               align="start"
                             >
                               <Calendar
                                 mode="single"
                                 selected={formData.date ? new Date(formData.date) : undefined}
                                 onSelect={onCalendarSelect}
                                 initialFocus
                                 className={BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME}
                                 classNames={BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES}
                               />
                             </PopoverContent>
                           </Popover>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Dep. Time</Label>
                            <BrutalistTimePicker value={formData.depTime} onChange={val => handleInputChange("depTime", val)} />
                        </div>
                     </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                   <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                     <h3 className="font-heading text-3xl font-black uppercase tracking-tighter text-foreground mb-8">Ticket Specifics</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3" key={`sell-seat-${sellSeatMode}`}>
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Seat Class</Label>
                          <Select
                            value={sellSeatSelectValue}
                            onValueChange={(v) => handleInputChange("seatClass", v ?? "")}
                          >
                            <SelectTrigger className="h-14 data-[size=default]:h-14 rounded-none bg-background border-2 border-foreground px-6 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                              <SelectValue placeholder="SELECT CLASS" />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false} className="rounded-none border-2 border-foreground">
                               {sellSeatOptions.map((s) => (
                                 <SelectItem key={s} value={s} className="rounded-none focus:bg-foreground focus:text-background font-mono font-bold text-xs uppercase">{s}</SelectItem>
                               ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Seat/Passenger Count</Label>
                          <Input
                            required
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="5"
                            value={formData.passengerCount}
                            onChange={(e) => handleInputChange("passengerCount", e.target.value)}
                            className="h-14 w-full rounded-none bg-background border-2 border-foreground px-6 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Additional Notes <span className="font-normal opacity-50">(OPTIONAL)</span></Label>
                        <Textarea placeholder="ANY ADDITIONAL INFORMATION FOR THE BUYER..." value={formData.additionalNotes} onChange={e => handleInputChange("additionalNotes", e.target.value)} className="min-h-[140px] rounded-none bg-background border-2 border-foreground p-6 font-mono font-bold text-xs uppercase resize-none shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
                     </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                   <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                     <h3 className="font-heading text-3xl font-black uppercase tracking-tighter text-foreground mb-8">Pricing</h3>


                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Original Price (৳)</Label>
                          <Input required type="number" min="100" placeholder="E.G. 850" value={formData.originalPrice} onChange={e => handleInputChange("originalPrice", e.target.value)} className="h-16 rounded-none bg-background border-2 border-foreground px-6 font-mono text-xl font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-primary">Your Selling Price (৳)</Label>
                          <Input required type="number" min="50" placeholder="E.G. 800" value={formData.sellingPrice} onChange={e => handleInputChange("sellingPrice", e.target.value)} className="h-16 rounded-none bg-background border-2 border-primary px-6 font-mono text-xl font-black uppercase text-primary shadow-[4px_4px_0_0_rgba(var(--primary-color),1)] focus-visible:ring-0" />
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold pl-1 pt-1">Cannot exceed original price.</p>
                        </div>
                     </div>

                     <h4 className="font-heading text-xl font-black uppercase tracking-tighter text-foreground mt-8 mb-4 border-b-2 border-foreground pb-2">Seller Contact Information</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Your Full Name</Label>
                          <Input required type="text" placeholder="E.G. JOHN DOE" value={formData.sellerName} onChange={e => handleInputChange("sellerName", e.target.value)} className="h-14 rounded-none bg-background border-2 border-foreground px-6 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Contact Number</Label>
                          <Input required type="tel" placeholder="E.G. +8801XXXXXXXXX" value={formData.sellerPhone} onChange={e => handleInputChange("sellerPhone", e.target.value)} className="h-14 rounded-none bg-background border-2 border-foreground px-6 font-mono font-bold text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]" />
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold leading-relaxed">
                            Not shown on the public listing. Used so staff can reach you; buyers contact us first via WhatsApp.
                          </p>
                        </div>
                     </div>

                     <div className="bg-card border-border border-b-4 p-6 space-y-4 mt-8">
                        <div className="flex justify-between items-center text-muted-foreground">
                           <div>
                              <p className="font-mono font-bold uppercase tracking-widest text-xs text-foreground">Selling Price</p>
                           </div>
                           <div className="text-right">
                              <p className="font-heading text-lg font-black text-foreground">৳{Number(formData.sellingPrice || 0).toFixed(2)}</p>
                           </div>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                           <div>
                              <p className="font-mono font-bold uppercase tracking-widest text-xs">Platform Fee</p>
                           </div>
                           <div className="text-right">
                              <p className="font-heading text-lg font-black">+ ৳20.00</p>
                           </div>
                        </div>
                        <div className="w-full h-[2px] bg-border my-2"></div>
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="font-mono font-bold text-foreground uppercase tracking-widest text-xs">Total Price</p>
                              <p className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Paid by buyer</p>
                           </div>
                           <div className="text-right">
                              <p className="font-heading text-3xl font-black text-primary">৳{(Number(formData.sellingPrice || 0) + 20).toFixed(2)}</p>
                           </div>
                        </div>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-14 flex justify-between items-center pt-8 border-t-[4px] border-foreground">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={(e) => { e.preventDefault(); prevStep(); }}
                    disabled={currentStep === 0 || isSubmitting}
                    className="rounded-none h-14 border-2 border-foreground px-8 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-background"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); nextStep(); }}
                      disabled={isSubmitting}
                      className="rounded-none h-14 px-10 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="rounded-none h-14 px-10 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(var(--primary-color),1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(var(--primary-color),1)] transition-all bg-primary text-primary-foreground border-2 border-primary"
                    >
                      {isSubmitting ? (
                        <>Listing...</>
                      ) : (
                        <>List Ticket <CheckCircle2 className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  )}
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sell;
