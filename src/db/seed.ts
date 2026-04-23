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

/** Bump whenever PHOTO_SEEDS / SILHOUETTE_SEEDS / OUTFIT_SEEDS / PLAN_SEEDS
 *  change. Existing users get their seeded rows replaced with the new
 *  ones on next load, while their own uploads + saved outfits + plans
 *  on other dates are preserved. */
const SEED_VERSION = 2;

const SEED_PLAN_DATES = new Set(PLAN_SEEDS.map((p) => p.date));
const SEED_OUTFIT_IDS = new Set(OUTFIT_SEEDS.map((o) => o.id));

let seedPromise: Promise<void> | null = null;

export function seedIfEmpty(): Promise<void> {
  // React StrictMode invokes effects twice in dev; share one seed across calls.
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const profile = await db.profile.get("me");
    const count = await db.items.count();

    // Cases:
    //   (a) empty DB → first-run seed
    //   (b) DB exists, seedVersion outdated → replace seeded rows, keep uploads
    //   (c) DB exists, seedVersion current → do nothing
    if (count > 0 && profile?.seedVersion === SEED_VERSION) return;

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
      // Clear all previously seeded rows. User uploads (seed != true) and
      // user outfits/plans on non-seeded dates are preserved.
      await db.items.filter((i) => !!i.seed).delete();
      await db.outfits
        .filter((o) => SEED_OUTFIT_IDS.has(o.id) || o.id.startsWith("o"))
        .delete();
      await db.plans.filter((p) => SEED_PLAN_DATES.has(p.date)).delete();

      await db.items.bulkAdd([...photoItems, ...silhouetteItems]);
      await db.outfits.bulkAdd(OUTFIT_SEEDS);
      await db.plans.bulkAdd(PLAN_SEEDS);
      await db.profile.put({
        ...(profile ?? {}),
        id: "me",
        name: profile?.name ?? "vasu",
        handle: profile?.handle ?? "@vasu",
        seedVersion: SEED_VERSION,
      });
    });

    // Fetch pre-cut sample photos in parallel.
    void Promise.all(
      PHOTO_SEEDS.map(async (seed) => {
        const blob = await fetchAsBlob(seed.photoUrl);
        if (blob) await db.items.update(seed.id, { photo: blob });
      }),
    );
  })();
  return seedPromise;
}
