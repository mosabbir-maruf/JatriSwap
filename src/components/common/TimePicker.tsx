import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function BrutalistTimePicker({ value, onChange, placeholder = "Select Time", className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Parse value (assumes "HH:MM")
  const [hour, setHour] = React.useState<string>(value ? value.split(":")[0] : "");
  const [minute, setMinute] = React.useState<string>(value ? value.split(":")[1] : "");

  // Update value when valid time is selected
  React.useEffect(() => {
    if (value) {
       setHour(value.split(":")[0]);
       setMinute(value.split(":")[1]);
    }
  }, [value]);

  const handleApply = () => {
    if (hour && minute) {
      onChange(`${hour}:${minute}`);
      setIsOpen(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-mono font-bold text-[10px] uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none border-2 border-foreground h-14 px-3 ${!value && "text-muted-foreground"} ${className}`}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </Button>
      } />
      <PopoverContent className="w-auto p-4 rounded-none border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,1)] bg-background">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">Hour</label>
              <Select value={hour} onValueChange={(val) => setHour(val || "")}>
                <SelectTrigger className="w-20 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase focus:ring-0">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground h-64">
                  {hours.map((h) => (
                    <SelectItem key={h} value={h} className="font-mono text-xs font-bold">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center pt-6 font-mono font-black text-xl">:</div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">Minute</label>
              <Select value={minute} onValueChange={(val) => setMinute(val || "")}>
                <SelectTrigger className="w-20 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase focus:ring-0">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground h-64">
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-xs font-bold">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            type="button"
            onClick={handleApply} 
            className="w-full rounded-none border-2 border-foreground bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
          >
            Apply Time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
