import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  MapPin,
  Search,
  Train,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATIONS, TRAIN_NAMES, BUS_NAMES } from "@/src/constants";
import { cn } from "@/lib/utils";

function filterByQuery(items: readonly string[], q: string): readonly string[] {
  const t = q.trim().toLowerCase();
  if (!t) return items;
  return items.filter((s) => s.toLowerCase().includes(t));
}

function formatEntityCount(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

const MANIFEST_CARD_BASE =
  "flex min-h-0 flex-col overflow-hidden border-4 border-foreground bg-background shadow-[6px_6px_0_0_rgba(0,0,0,1)]";
const MANIFEST_HEADER =
  "flex shrink-0 items-center justify-between gap-3 border-b-4 border-foreground bg-primary px-4 py-3 text-primary-foreground";
const MANIFEST_ICON_FRAME =
  "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-primary-foreground/40 bg-primary-foreground/10";
const MANIFEST_COUNT_PILL =
  "shrink-0 border-2 border-primary-foreground/50 bg-primary-foreground/15 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest tabular-nums";
const MANIFEST_EYEBROW = "font-mono text-[9px] font-black uppercase tracking-[0.35em] text-primary-foreground/80";
const MANIFEST_TITLE = "font-heading text-base font-black uppercase tracking-tighter md:text-lg";
const MANIFEST_ROW =
  "flex items-start gap-3 border-b border-foreground/15 bg-background px-3 py-3 font-mono text-[11px] font-bold uppercase leading-relaxed tracking-wide transition-colors odd:bg-muted/15 hover:bg-primary/5 sm:text-xs";
const MANIFEST_BADGE =
  "mt-0.5 shrink-0 self-start border border-foreground/25 bg-muted/60 px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground";
const EMPTY_LIST_CLASS = "px-3 py-6 font-mono text-xs font-bold uppercase text-muted-foreground";

type TransitManifestSectionProps = {
  sectionClassName: string;
  headingId: string;
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  items: readonly string[];
  listAriaLabel: string;
  singular: string;
  plural: string;
  rowTag: string;
  indexDigits: 2 | 3;
};

const TransitManifestSection = React.memo(function TransitManifestSection(props: TransitManifestSectionProps) {
  const {
    sectionClassName,
    headingId,
    title,
    eyebrow,
    Icon,
    items,
    listAriaLabel,
    singular,
    plural,
    rowTag,
    indexDigits,
  } = props;

  const indexWidthClass = indexDigits === 3 ? "w-9" : "w-7";
  const pad = indexDigits;

  return (
    <section className={sectionClassName} aria-labelledby={headingId}>
      <div className={cn(MANIFEST_CARD_BASE, "h-full min-h-0 flex-1")}>
        <div className={MANIFEST_HEADER}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={MANIFEST_ICON_FRAME}>
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className={MANIFEST_EYEBROW}>{eyebrow}</p>
              <h2 id={headingId} className={MANIFEST_TITLE}>
                {title}
              </h2>
            </div>
          </div>
          <span className={MANIFEST_COUNT_PILL}>{formatEntityCount(items.length, singular, plural)}</span>
        </div>
        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background [scrollbar-gutter:stable]",
            "max-lg:max-h-[min(52vh,460px)] lg:max-h-none",
          )}
        >
          <div className="px-1 py-2 sm:px-2">
            {items.length === 0 ? (
              <p className={EMPTY_LIST_CLASS}>No matches.</p>
            ) : (
              <ul className="border-t border-foreground/10" aria-label={listAriaLabel}>
                {items.map((name, i) => (
                  <li key={`${name}-${i}`} className={MANIFEST_ROW}>
                    <span className={cn("mt-0.5 shrink-0 text-right font-black tabular-nums text-primary", indexWidthClass)}>
                      {String(i + 1).padStart(pad, "0")}
                    </span>
                    <span className="min-w-0 flex-1 break-words pt-0.5">{name}</span>
                    <span className={MANIFEST_BADGE} aria-hidden>
                      {rowTag}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default function Transit() {
  const [query, setQuery] = React.useState("");

  const { stations, trains, buses } = React.useMemo(() => {
    return {
      stations: filterByQuery(STATIONS, query),
      trains: filterByQuery(TRAIN_NAMES, query),
      buses: filterByQuery(BUS_NAMES, query),
    };
  }, [query]);

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell-md relative z-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            render={<Link to="/" />}
            className="h-11 rounded-none border-2 border-foreground bg-background px-4 font-mono text-[10px] uppercase tracking-widest font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden /> Home
          </Button>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Catalog · same data as search & sell
          </p>
        </div>

        <div className="mb-12 flex flex-col items-center gap-6 border-b-4 border-foreground pb-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <h1 className="mb-4 font-heading text-5xl font-black uppercase tracking-tighter text-foreground drop-shadow-[4px_4px_0_rgba(0,0,0,1)] md:text-7xl">
              Transit <span className="text-primary">atlas</span>
            </h1>
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Stations for From/To, named trains, and bus operators — same catalog as search and sell.
            </p>
          </div>
          <MapPin className="hidden h-16 w-16 text-foreground md:block" strokeWidth={1.5} aria-hidden />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="mb-10 border-4 border-foreground bg-muted/40 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:p-5"
        >
          <label htmlFor="transit-quick-find" className="sr-only">
            Quick find in transit lists
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <Input
              id="transit-quick-find"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter stations, trains, buses…"
              className="h-12 rounded-none border-2 border-foreground bg-background pl-10 font-mono text-sm font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
            />
          </div>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Showing {stations.length}/{STATIONS.length} stations · {trains.length}/{TRAIN_NAMES.length} trains ·{" "}
            {buses.length}/{BUS_NAMES.length} buses
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="grid min-h-0 overflow-hidden border-4 border-foreground bg-background shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[14px_14px_0_0_rgba(0,0,0,1)] lg:grid-cols-12 lg:grid-rows-1 lg:h-[min(76vh,780px)]"
        >
          <TransitManifestSection
            sectionClassName="flex h-full min-h-0 flex-col border-b-4 border-foreground bg-muted/20 p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r-4 lg:pb-4"
            headingId="transit-stations-heading"
            title="Stations"
            eyebrow="Stops & junctions"
            Icon={MapPin}
            items={stations}
            listAriaLabel="Filtered stations"
            singular="station"
            plural="stations"
            rowTag="station"
            indexDigits={3}
          />

          <div className="flex h-full min-h-0 flex-col lg:col-span-5">
            <TransitManifestSection
              sectionClassName="flex min-h-0 flex-1 flex-col border-b-4 border-foreground bg-muted/20 p-3 sm:p-4 sm:pb-3"
              headingId="transit-trains-heading"
              title="Train names"
              eyebrow="Named services"
              Icon={Train}
              items={trains}
              listAriaLabel="Filtered train names"
              singular="train"
              plural="trains"
              rowTag="train"
              indexDigits={2}
            />
            <TransitManifestSection
              sectionClassName="flex min-h-0 flex-1 flex-col bg-muted/20 p-3 sm:p-4"
              headingId="transit-buses-heading"
              title="Bus operators"
              eyebrow="Operator manifest"
              Icon={BusFront}
              items={buses}
              listAriaLabel="Filtered bus operators"
              singular="operator"
              plural="operators"
              rowTag="bus"
              indexDigits={2}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-12 grid gap-4 border-4 border-foreground bg-foreground p-6 text-background shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:grid-cols-2 md:p-8"
        >
          <div className="flex flex-col justify-center">
            <p className="font-heading text-2xl font-black uppercase tracking-tighter md:text-3xl">Ready to move?</p>
            <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-widest text-background/80">
              Jump back into search or open the live listings feed.
            </p>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:justify-end">
            <Button
              render={<Link to="/" />}
              className="h-12 rounded-none border-2 border-background bg-background font-mono text-[11px] uppercase tracking-widest font-black text-foreground shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(255,255,255,0.2)] transition-all"
            >
              Search <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
            <Button
              render={<Link to="/browse" />}
              className="h-12 rounded-none border-2 border-background bg-primary font-mono text-[11px] uppercase tracking-widest font-black text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
            >
              Browse <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
