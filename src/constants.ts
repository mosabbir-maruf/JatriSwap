export const STATIONS = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Cox's Bazar",
  "Cumilla",
  "Mymensingh",
  "Barishal",
  "Rangpur",
  "Bogura",
  "Jashore",
  "Dinajpur",
  "Saidpur",
  "Tangail",
  "Brahmanbaria",
  "Narayanganj",
  "Gazipur",
  "Noakhali",
  "Feni"
];

/** Train coach / berth categories (sell, edit, browse when filtering trains). */
export const TRAIN_SEAT_CLASSES = [
  "Shovan",
  "Shovan Chair",
  "Snigdha",
  "AC Seat",
  "AC Berth",
  "Economy",
  "Business Class"
];

/** Bus service tier — AC / coach type belongs here, not in `transportType`. */
export const BUS_SEAT_CLASSES = [
  "AC",
  "Non-AC",
  "Scania",
  "Sleeper",
  "Business Class",
  "Economy Class"
];

/** @deprecated Use TRAIN_SEAT_CLASSES or seatClassesForMode() */
export const SEAT_CLASSES = TRAIN_SEAT_CLASSES;

export function seatClassesForMode(mode: "train" | "bus"): readonly string[] {
  return mode === "bus" ? BUS_SEAT_CLASSES : TRAIN_SEAT_CLASSES;
}

/** Browse “all modes” filter chips — union without duplicates */
export const ALL_SEAT_CLASS_FILTER_OPTIONS: string[] = Array.from(
  new Set<string>([...TRAIN_SEAT_CLASSES, ...BUS_SEAT_CLASSES])
);

export const TRANSPORTS = [
  { name: "Subarna Express", type: "Intercity", mode: "train" },
  { name: "Green Line Paribahan", type: "Bus", mode: "bus" },
  { name: "Padma Express", type: "Intercity", mode: "train" },
  { name: "Hanif Enterprise", type: "Bus", mode: "bus" },
  { name: "Sonar Bangla Express", type: "Intercity", mode: "train" },
  { name: "Shohagh Paribahan", type: "Bus", mode: "bus" },
  { name: "Turna Nishitha", type: "Night Express", mode: "train" },
  { name: "Ena Transport", type: "Bus", mode: "bus" },
  { name: "SA Paribahan", type: "Bus", mode: "bus" },
  { name: "Royal Coach", type: "Bus", mode: "bus" },
  { name: "Desh Travels", type: "Bus", mode: "bus" },
  { name: "Silk Line", type: "Bus", mode: "bus" },
  { name: "SR Travels", type: "Bus", mode: "bus" },
  { name: "Unique Paribahan", type: "Bus", mode: "bus" },
  { name: "National Travels", type: "Bus", mode: "bus" },
  { name: "Eagle Paribahan", type: "Bus", mode: "bus" },
  { name: "Shyamoli NR Travels", type: "Bus", mode: "bus" },
  { name: "SaintMartin Hyundai", type: "Bus", mode: "bus" }
];
