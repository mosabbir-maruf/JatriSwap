import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"

/** Default visibility before auto-dismiss (ms). Applied globally unless a toast overrides `duration`. */
export const TOAST_DURATION_MS = 4500

const toastLoadingIcon = <Spinner size="sm" className="shrink-0" aria-hidden />

const Toaster = ({ duration = TOAST_DURATION_MS, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      duration={duration}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: toastLoadingIcon,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-4 group-[.toaster]:border-foreground group-[.toaster]:shadow-[8px_8px_0_0_rgba(0,0,0,1)] group-[.toaster]:rounded-none p-4",
          description: "group-[.toast]:text-muted-foreground font-mono text-[10px] uppercase tracking-widest font-bold mt-1",
          title: "font-heading font-black text-lg uppercase tracking-tighter",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-none group-[.toast]:border-2 group-[.toast]:border-foreground group-[.toast]:shadow-[4px_4px_0_0_rgba(0,0,0,1)] group-[.toast]:font-mono group-[.toast]:text-xs group-[.toast]:uppercase group-[.toast]:font-black",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-none group-[.toast]:border-2 group-[.toast]:border-foreground group-[.toast]:font-mono group-[.toast]:text-xs group-[.toast]:uppercase group-[.toast]:font-black",
          success: "group-[.toaster]:bg-emerald-300 group-[.toaster]:text-emerald-950 group-[.toaster]:border-emerald-900 group-[.toaster]:shadow-[8px_8px_0_0_rgba(6,78,59,1)]",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:shadow-[8px_8px_0_0_rgba(153,27,27,1)]",
          warning: "group-[.toaster]:bg-yellow-300 group-[.toaster]:text-yellow-950 group-[.toaster]:border-yellow-900 group-[.toaster]:shadow-[8px_8px_0_0_rgba(113,63,18,1)]",
          info: "group-[.toaster]:bg-blue-300 group-[.toaster]:text-blue-950 group-[.toaster]:border-blue-900 group-[.toaster]:shadow-[8px_8px_0_0_rgba(30,58,138,1)]",
          icon: "group-[.toast]:mr-4",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
