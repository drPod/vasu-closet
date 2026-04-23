import { db } from "./db";
import type { GarmentKind, Item, Outfit, Plan } from "./schema";

// Seed timestamp. Fixed relative offsets so "worn mon" / "last week" stay
// stable across reloads until the user starts using the app.
const NOW = new Date("2026-04-22T09:00:00").getTime();
const DAY = 86_400_000;

type ItemSeed = Omit<Item, "warmth" | "formality" | "wearCount" | "createdAt">;

function warmth(sub: GarmentKind): 0 | 1 | 2 | 3 {
  switch (sub) {
    case "knit":
    case "boots":
    case "jacket":
    case "coat":
      return 3;
    case "blouse":
    case "jeans":
    case "pants":
    case "skirt":
    case "dress":
    case "heels":
    case "cardigan":
      return 2;
    case "cami":
    case "tee":
    case "shorts":
    case "sneakers":
    case "flats":
      return 1;
  }
}

function formality(sub: GarmentKind): 0 | 1 | 2 {
  if (sub === "heels") return 2;
  if (sub === "blouse" || sub === "dress" || sub === "boots" || sub === "flats" || sub === "coat") {
    return 1;
  }
  return 0;
}

const ITEM_SEEDS: ItemSeed[] = [
  { id: "t1", kind: "top", subkind: "cami", primaryColor: "#f0d8c8" },
  { id: "t2", kind: "top", subkind: "tee", primaryColor: "#f5e8d3", lastWornAt: NOW - 2 * DAY },
  { id: "t3", kind: "top", subkind: "knit", primaryColor: "#b8c4a8" },
  { id: "t4", kind: "top", subkind: "blouse", primaryColor: "#e8c4c0", pattern: "floral" },
  { id: "t5", kind: "top", subkind: "tee", primaryColor: "#9fb0bc", pattern: "stripe" },
  { id: "t6", kind: "top", subkind: "knit", primaryColor: "#c4876e" },
  { id: "t7", kind: "top", subkind: "blouse", primaryColor: "#f8f4ec" },
  { id: "t8", kind: "top", subkind: "tee", primaryColor: "#d4c8dc" },
  { id: "t9", kind: "top", subkind: "knit", primaryColor: "#2a2420" },
  { id: "t10", kind: "top", subkind: "cami", primaryColor: "#e8d4b8" },
  { id: "b1", kind: "bottom", subkind: "jeans", primaryColor: "#a8bac8", lastWornAt: NOW - 2 * DAY },
  { id: "b2", kind: "bottom", subkind: "pants", primaryColor: "#2a2420" },
  { id: "b3", kind: "bottom", subkind: "skirt", primaryColor: "#efe4d0" },
  { id: "b4", kind: "bottom", subkind: "pants", primaryColor: "#b8a688" },
  { id: "b5", kind: "bottom", subkind: "shorts", primaryColor: "#9fb0bc" },
  { id: "b6", kind: "bottom", subkind: "skirt", primaryColor: "#8a5040" },
  { id: "b7", kind: "bottom", subkind: "pants", primaryColor: "#e8d8c0" },
  { id: "b8", kind: "bottom", subkind: "skirt", primaryColor: "#4a3028" },
  { id: "d1", kind: "dress", subkind: "dress", primaryColor: "#efe4d0" },
  { id: "d2", kind: "dress", subkind: "dress", primaryColor: "#2a2420" },
  { id: "d3", kind: "dress", subkind: "dress", primaryColor: "#c88a8f" },
  { id: "d4", kind: "dress", subkind: "dress", primaryColor: "#8a7ea0", pattern: "floral" },
];

const OUTFIT_SEEDS: Outfit[] = [
  {
    id: "o1",
    topId: "t1",
    bottomId: "b3",
    tag: "coffee",
    name: "brunch soft",
    savedAt: NOW - 6 * DAY,
  },
  {
    id: "o2",
    dressId: "d3",
    tag: "date night",
    name: "plum evening",
    savedAt: NOW - 3 * DAY,
  },
  {
    id: "o3",
    topId: "t4",
    bottomId: "b4",
    tag: "today's pick",
    name: "soft blouse & khaki",
    savedAt: NOW - 1 * DAY,
  },
];

// Plan id is the ISO date string, so put() upserts by date.
const PLAN_SEEDS: Plan[] = [
  {
    id: "2026-04-20",
    date: "2026-04-20",
    topId: "t2",
    bottomId: "b1",
    event: "monday · WFH",
    weatherNote: "62° · cloudy",
    status: "worn",
  },
  {
    id: "2026-04-21",
    date: "2026-04-21",
    topId: "t3",
    bottomId: "b4",
    event: "yesterday · class",
    weatherNote: "64° · sunny",
    status: "worn",
  },
  {
    id: "2026-04-22",
    date: "2026-04-22",
    topId: "t4",
    bottomId: "b7",
    event: "today · lunch w/ emma",
    weatherNote: "68° · light layer",
    status: "worn",
  },
  {
    id: "2026-04-23",
    date: "2026-04-23",
    event: "class + dinner",
    weatherNote: "65° · breezy",
    status: "planned",
  },
  {
    id: "2026-04-24",
    date: "2026-04-24",
    topId: "t1",
    bottomId: "b3",
    event: "sam's birthday",
    weatherNote: "71° · warm",
    status: "planned",
  },
  {
    id: "2026-04-25",
    date: "2026-04-25",
    event: "coffee at noon",
    weatherNote: "72° · sunny",
    status: "planned",
  },
  {
    id: "2026-04-26",
    date: "2026-04-26",
    dressId: "d1",
    event: "brunch",
    weatherNote: "70° · mix",
    status: "planned",
  },
];

let seedPromise: Promise<void> | null = null;

async function fetchSamplePhoto(): Promise<Blob | undefined> {
  try {
    const res = await fetch("/sample-person.jpg");
    if (!res.ok) return undefined;
    return await res.blob();
  } catch {
    return undefined;
  }
}

export function seedIfEmpty(): Promise<void> {
  // React StrictMode invokes effects twice in dev; share one seed across calls.
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await db.items.count();
    if (count > 0) return;

    const items: Item[] = ITEM_SEEDS.map((it, i) => ({
      ...it,
      warmth: warmth(it.subkind),
      formality: formality(it.subkind),
      wearCount: 0,
      // Stagger so queries sorted by createdAt preserve seed order.
      createdAt: NOW - (ITEM_SEEDS.length - i) * 1000,
    }));

    const photo = await fetchSamplePhoto();

    await db.transaction("rw", db.items, db.outfits, db.plans, db.profile, async () => {
      await db.items.bulkAdd(items);
      await db.outfits.bulkAdd(OUTFIT_SEEDS);
      await db.plans.bulkAdd(PLAN_SEEDS);
      await db.profile.put({ id: "me", name: "vasu", handle: "@vasu", photo });
    });
  })();
  return seedPromise;
}
