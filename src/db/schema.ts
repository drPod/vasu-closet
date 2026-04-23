// Persistence schema for vasu's closet.
//
// Every entity has a stable string id. Photos live as Blobs so they can be
// persisted in IndexedDB (localStorage can't hold binary). ItemThumb falls
// back to a painted SVG silhouette until a real photo is added.

export type GarmentKind =
  | "cami"
  | "tee"
  | "knit"
  | "blouse"
  | "jeans"
  | "pants"
  | "skirt"
  | "shorts"
  | "dress"
  | "sneakers"
  | "boots"
  | "heels"
  | "flats"
  | "jacket"
  | "coat"
  | "cardigan";

export type Pattern = "stripe" | "floral";

export type ItemKind = "top" | "bottom" | "dress" | "shoes" | "outer";

/** View angle of the body / garment photo. */
export type Pose = "front" | "side" | "back";

/**
 * Transform for a garment on the Mirror figure. Coordinates are % of
 * the stage so the same layout works regardless of screen size.
 *   - x,y: center of the garment as percentage of the stage (0-100)
 *   - scale: multiplier on the garment's natural size (1 = default)
 *   - rotation: degrees, clockwise
 *   - flipX: mirror horizontally (useful for reusing front photo on side/back)
 */
export type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX?: boolean;
};

/** Per-pose layout stored on an item. Missing poses fall back to defaults. */
export type Layout = Partial<Record<Pose, Transform>>;

/** One row per garment in the user's closet. */
export type Item = {
  id: string;
  kind: ItemKind;
  subkind: GarmentKind;
  primaryColor: string;
  pattern?: Pattern;
  /** Primary cut-out photo (front view). */
  photo?: Blob;
  /** Optional per-view garment photos. Falls back to `photo`. */
  photoSide?: Blob;
  photoBack?: Blob;
  thumb?: Blob;
  /** User-provided name. Falls back to subkind when absent. */
  name?: string;
  /** 0 cold · 1 cool · 2 warm · 3 hot */
  warmth: 0 | 1 | 2 | 3;
  /** 0 casual · 1 smart · 2 dressy */
  formality: 0 | 1 | 2;
  /** Per-pose positioning on the body, saved when the user drags it. */
  layout?: Layout;
  lastWornAt?: number;
  wearCount: number;
  createdAt: number;
  /** True for seed / sample pieces so they can be bulk-removed. */
  seed?: boolean;
};

/** A saved outfit. Can reference separates (top+bottom) or a single dress. */
export type Outfit = {
  id: string;
  topId?: string;
  bottomId?: string;
  dressId?: string;
  /** Optional second top worn UNDER the main top (cami under a blouse, etc.). */
  underTopId?: string;
  name?: string;
  tag?: string;
  savedAt: number;
  favorite?: boolean;
};

/** A calendar entry for a specific date. */
export type Plan = {
  id: string;
  date: string; // yyyy-mm-dd
  outfitId?: string;
  topId?: string;
  bottomId?: string;
  dressId?: string;
  event?: string;
  weatherNote?: string;
  status: "planned" | "worn";
};

/** Single-row table keyed by "me". */
export type Profile = {
  id: "me";
  /** Front-view body photo. Used by the Mirror stage and the profile avatar. */
  photo?: Blob;
  /** Optional body photos from other angles. Mirror uses them per pose. */
  photoSide?: Blob;
  photoBack?: Blob;
  name?: string;
  handle?: string;
};

/** Daily forecast entry from Open-Meteo, mapped to the fields we actually use. */
export type DayForecast = {
  date: string;        // yyyy-mm-dd
  tempMin: number;     // °F
  tempMax: number;
  temp: number;        // midpoint for chip
  code: number;        // WMO weather code
  icon: string;        // ☀ ⛅ 🌧 etc.
  note: string;        // "light layer", "hot"
};

/** Cached weather result, single-row keyed by "me". */
export type WeatherCache = {
  id: "me";
  fetchedAt: number;
  lat: number;
  lon: number;
  source: "gps" | "fallback";
  days: DayForecast[];
};
