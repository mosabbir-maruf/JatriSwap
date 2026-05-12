import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock } from "lucide-react"
import {
  departureHour24To12,
  departureHour12To24,
  formatDepartureTimeDisplay,
} from "@/src/lib/formatDepartureTime"

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function BrutalistTimePicker({ value, onChange, placeholder = "Select Time", className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const [hour12, setHour12] = React.useState("")
  const [minute, setMinute] = React.useState("")
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM")

  React.useEffect(() => {
    if (!value || !value.includes(":")) {
      setHour12("")
      setMinute("")
      setPeriod("AM")
      return
    }
    const [hp, mp = "00"] = value.split(":")
    const h24 = Number.parseInt(hp, 10)
    const minuteNum = Number.parseInt(mp, 10)
    if (!Number.isFinite(h24) || h24 < 0 || h24 > 23 || !Number.isFinite(minuteNum)) {
      setHour12("")
      setMinute("")
      setPeriod("AM")
      return
    }
    const { h12, period: p } = departureHour24To12(h24)
    setHour12(String(h12))
    setMinute(minuteNum.toString().padStart(2, "0"))
    setPeriod(p)
  }, [value])

  const handleApply = () => {
    const h = Number.parseInt(hour12, 10)
    if (!Number.isFinite(h) || h < 1 || h > 12 || !minute) return
    const m = Number.parseInt(minute, 10)
    if (!Number.isFinite(m) || m < 0 || m > 59) return
    const h24 = departureHour12To24(h, period)
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    setIsOpen(false)
  }

  const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  const displayLabel = value ? formatDepartureTimeDisplay(value) : ""

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-mono font-bold text-[10px] uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none border-2 border-foreground h-14 px-3 ${!value && "text-muted-foreground"} ${className}`}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate normal-case tracking-normal">{displayLabel || placeholder}</span>
        </Button>
      } />
      <PopoverContent className="w-auto p-4 rounded-none border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,1)] bg-background">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">Hour</label>
              <Select value={hour12} onValueChange={(val) => setHour12(val ?? "")}>
                <SelectTrigger className="w-[4.5rem] rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold focus:ring-0">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground max-h-64">
                  {hourItems.map((h) => (
                    <SelectItem key={h} value={h} className="font-mono text-xs font-bold">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center pb-2 font-mono font-black text-xl">:</div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">Minute</label>
              <Select value={minute} onValueChange={(val) => setMinute(val ?? "")}>
                <SelectTrigger className="w-[4.5rem] rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold focus:ring-0">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground max-h-64">
                  {minutes.map((mm) => (
                    <SelectItem key={mm} value={mm} className="font-mono text-xs font-bold">
                      {mm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">AM / PM</label>
              <Select value={period} onValueChange={(val) => setPeriod(val === "PM" ? "PM" : "AM")}>
                <SelectTrigger className="w-[5rem] rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold uppercase focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground">
                  <SelectItem value="AM" className="font-mono text-xs font-bold uppercase">
                    AM
                  </SelectItem>
                  <SelectItem value="PM" className="font-mono text-xs font-bold uppercase">
                    PM
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            type="button"
            onClick={handleApply} 
            disabled={!hour12 || !minute}
            className="w-full rounded-none border-2 border-foreground bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
          >
            Apply Time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
