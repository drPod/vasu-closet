import { db } from "./db";
import type { GarmentKind, Item, Outfit, Plan } from "./schema";
import { removeBackground } from "../lib/bg-remove";

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

/**
 * Real-photo samples bundled in /public/samples. On first run we fetch each
 * and store it as the item's `photo` blob so the closet shows actual
 * garments instead of flat silhouettes. Sources noted in CREDITS.md.
 */
type PhotoSeed = ItemSeed & { photoUrl: string };

const PHOTO_SEEDS: PhotoSeed[] = [
  {
    id: "s-tee-white",
    kind: "top",
    subkind: "tee",
    primaryColor: "#efeeec",
    name: "white tee",
    photoUrl: "/samples/tee-white.jpg",
    lastWornAt: NOW - 2 * DAY,
  },
  {
    id: "s-tee-black",
    kind: "top",
    subkind: "tee",
    primaryColor: "#1a1a1a",
    name: "black graphic tee",
    photoUrl: "/samples/tee-black.jpg",
  },
  {
    id: "s-knit-white",
    kind: "top",
    subkind: "knit",
    primaryColor: "#f1eeea",
    name: "white crewneck",
    photoUrl: "/samples/knit-white.jpg",
  },
  {
    id: "s-jeans-dark",
    kind: "bottom",
    subkind: "jeans",
    primaryColor: "#2c323b",
    name: "dark jeans",
    photoUrl: "/samples/jeans-dark.jpg",
    lastWornAt: NOW - 2 * DAY,
  },
  {
    id: "s-shorts-denim",
    kind: "bottom",
    subkind: "shorts",
    primaryColor: "#a7b8ce",
    name: "denim shorts",
    photoUrl: "/samples/shorts-denim.jpg",
  },
  {
    id: "s-dress-plum",
    kind: "dress",
    subkind: "dress",
    primaryColor: "#5b1e53",
    name: "plum off-shoulder",
    photoUrl: "/samples/dress-plum.jpg",
  },
];

/** Tiny variety of flat-color silhouette items, kept so the closet has
 *  something to browse beyond the six real-photo samples. */
const SILHOUETTE_SEEDS: ItemSeed[] = [
  { id: "t4", kind: "top", subkind: "blouse", primaryColor: "#e8c4c0", pattern: "floral" },
  { id: "t6", kind: "top", subkind: "knit", primaryColor: "#c4876e" },
  { id: "t8", kind: "top", subkind: "tee", primaryColor: "#d4c8dc" },
  { id: "b3", kind: "bottom", subkind: "skirt", primaryColor: "#efe4d0" },
  { id: "b4", kind: "bottom", subkind: "pants", primaryColor: "#b8a688" },
  { id: "b6", kind: "bottom", subkind: "skirt", primaryColor: "#8a5040" },
  { id: "d3", kind: "dress", subkind: "dress", primaryColor: "#c88a8f" },
];

/** Real-photo outfits referencing the PHOTO_SEEDS ids. */
const OUTFIT_SEEDS: Outfit[] = [
  {
    id: "o1",
    topId: "s-tee-white",
    bottomId: "s-shorts-denim",
    tag: "coffee",
    name: "easy weekend",
    savedAt: NOW - 6 * DAY,
  },
  {
    id: "o2",
    dressId: "s-dress-plum",
    tag: "date night",
    name: "plum evening",
    savedAt: NOW - 3 * DAY,
  },
  {
    id: "o3",
    topId: "s-knit-white",
    bottomId: "s-jeans-dark",
    tag: "today's pick",
    name: "knit & denim",
    savedAt: NOW - 1 * DAY,
  },
];

/** Plan id is the ISO date string, so put() upserts by date. */
const PLAN_SEEDS: Plan[] = [
  {
    id: "2026-04-20",
    date: "2026-04-20",
    topId: "s-tee-white",
    bottomId: "s-jeans-dark",
    event: "monday · WFH",
    weatherNote: "62° · cloudy",
    status: "worn",
  },
  {
    id: "2026-04-21",
    date: "2026-04-21",
    topId: "s-tee-black",
    bottomId: "s-shorts-denim",
    event: "yesterday · class",
    weatherNote: "64° · sunny",
    status: "worn",
  },
  {
    id: "2026-04-22",
    date: "2026-04-22",
    topId: "s-knit-white",
    bottomId: "s-jeans-dark",
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
    topId: "s-tee-white",
    bottomId: "s-shorts-denim",
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
    dressId: "s-dress-plum",
    event: "brunch",
    weatherNote: "70° · mix",
    status: "planned",
  },
];

async function fetchAsBlob(url: string): Promise<Blob | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    return await res.blob();
  } catch {
    return undefined;
  }
}

let seedPromise: Promise<void> | null = null;

export function seedIfEmpty(): Promise<void> {
  // React StrictMode invokes effects twice in dev; share one seed across calls.
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await db.items.count();
    if (count > 0) return;

    // Insert everything immediately so the UI paints; fetch sample garment
    // photos async and patch them in when they land.
    const photoItems: Item[] = PHOTO_SEEDS.map((it, i) => ({
      id: it.id,
      kind: it.kind,
      subkind: it.subkind,
      primaryColor: it.primaryColor,
      name: it.name,
      warmth: warmth(it.subkind),
      formality: formality(it.subkind),
      wearCount: 0,
      createdAt: NOW - (PHOTO_SEEDS.length - i) * 2000,
      lastWornAt: it.lastWornAt,
      seed: true,
    }));
    const silhouetteItems: Item[] = SILHOUETTE_SEEDS.map((it, i) => ({
      ...it,
      warmth: warmth(it.subkind),
      formality: formality(it.subkind),
      wearCount: 0,
      createdAt: NOW - 100_000 - (SILHOUETTE_SEEDS.length - i) * 1000,
      seed: true,
    }));

    await db.transaction("rw", db.items, db.outfits, db.plans, db.profile, async () => {
      await db.items.bulkAdd([...photoItems, ...silhouetteItems]);
      await db.outfits.bulkAdd(OUTFIT_SEEDS);
      await db.plans.bulkAdd(PLAN_SEEDS);
      await db.profile.put({ id: "me", name: "vasu", handle: "@vasu" });
    });

    // Fetch sample photos in parallel, run each through the bg-removal
    // flood-fill so garments on the Mirror look like cut-outs instead of
    // mini product shots. Fire-and-forget: useLiveQuery picks them up as
    // each one lands.
    void Promise.all(
      PHOTO_SEEDS.map(async (seed) => {
        const raw = await fetchAsBlob(seed.photoUrl);
        if (!raw) return;
        const cut = await removeBackground(raw).catch(() => raw);
        await db.items.update(seed.id, { photo: cut });
      }),
    );
  })();
  return seedPromise;
}
