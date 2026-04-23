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

/**
 * Real-photo samples bundled in /public/samples. On first run we fetch each
 * and store it as the item's `photo` blob so the closet shows actual
 * garments instead of flat silhouettes. Sources noted in CREDITS.md.
 */
type PhotoSeed = ItemSeed & { photoUrl: string };

const PHOTO_SEEDS: PhotoSeed[] = [
  {
    id: "s-tee-kiikii",
    kind: "top",
    subkind: "tee",
    primaryColor: "#e8dfc9",
    name: "KIIKII graphic tee",
    photoUrl: "/samples/tee-kiikii.png",
    lastWornAt: NOW - 2 * DAY,
  },
  {
    id: "s-polo-green",
    kind: "top",
    subkind: "tee",
    primaryColor: "#2fa76b",
    name: "green polo",
    photoUrl: "/samples/polo-green.png",
  },
  {
    id: "s-polo-coral",
    kind: "top",
    subkind: "tee",
    primaryColor: "#eb7766",
    name: "coral polo",
    photoUrl: "/samples/polo-coral.png",
  },
  {
    id: "s-shorts-denim",
    kind: "bottom",
    subkind: "shorts",
    primaryColor: "#a7b8ce",
    name: "denim shorts",
    photoUrl: "/samples/shorts-denim.png",
    lastWornAt: NOW - 2 * DAY,
  },
];

/** Flat-color silhouette items for categories we don't have real-photo
 *  samples for yet (dresses, skirts, pants). Rendered faded on the Mirror
 *  to read as placeholders — user upgrades them by uploading real photos. */
const SILHOUETTE_SEEDS: ItemSeed[] = [
  { id: "t4", kind: "top", subkind: "blouse", primaryColor: "#e8c4c0", pattern: "floral" },
  { id: "t6", kind: "top", subkind: "knit", primaryColor: "#c4876e" },
  { id: "b-jeans-blue", kind: "bottom", subkind: "jeans", primaryColor: "#4a6488" },
  { id: "b3", kind: "bottom", subkind: "skirt", primaryColor: "#efe4d0" },
  { id: "b4", kind: "bottom", subkind: "pants", primaryColor: "#b8a688" },
  { id: "b6", kind: "bottom", subkind: "skirt", primaryColor: "#8a5040" },
  { id: "d3", kind: "dress", subkind: "dress", primaryColor: "#c88a8f" },
  { id: "d4", kind: "dress", subkind: "dress", primaryColor: "#8a7ea0", pattern: "floral" },
];

/** Outfits referencing the new photo seed IDs. */
const OUTFIT_SEEDS: Outfit[] = [
  {
    id: "o1",
    topId: "s-tee-kiikii",
    bottomId: "s-shorts-denim",
    tag: "coffee",
    name: "tee & shorts",
    savedAt: NOW - 6 * DAY,
  },
  {
    id: "o2",
    topId: "s-polo-coral",
    bottomId: "b-jeans-blue",
    tag: "date night",
    name: "coral polo & jeans",
    savedAt: NOW - 3 * DAY,
  },
  {
    id: "o3",
    topId: "s-polo-green",
    bottomId: "s-shorts-denim",
    tag: "today's pick",
    name: "green polo & denim",
    savedAt: NOW - 1 * DAY,
  },
];

/** Plan id is the ISO date string, so put() upserts by date. */
const PLAN_SEEDS: Plan[] = [
  {
    id: "2026-04-20",
    date: "2026-04-20",
    topId: "s-tee-kiikii",
    bottomId: "b-jeans-blue",
    event: "monday · WFH",
    weatherNote: "62° · cloudy",
    status: "worn",
  },
  {
    id: "2026-04-21",
    date: "2026-04-21",
    topId: "s-polo-green",
    bottomId: "s-shorts-denim",
    event: "yesterday · class",
    weatherNote: "64° · sunny",
    status: "worn",
  },
  {
    id: "2026-04-22",
    date: "2026-04-22",
    topId: "s-polo-coral",
    bottomId: "s-shorts-denim",
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
    topId: "s-tee-kiikii",
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
    dressId: "d3",
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

    // Fetch sample photos in parallel. Files in /public/samples are
    // pre-cut transparent PNGs so we skip the in-app flood-fill.
    void Promise.all(
      PHOTO_SEEDS.map(async (seed) => {
        const blob = await fetchAsBlob(seed.photoUrl);
        if (blob) await db.items.update(seed.id, { photo: blob });
      }),
    );
  })();
  return seedPromise;
}
