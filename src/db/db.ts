import Dexie, { type Table } from "dexie";
import type { Item, Outfit, Plan, Profile, WeatherCache } from "./schema";

export class ClosetDB extends Dexie {
  items!: Table<Item, string>;
  outfits!: Table<Outfit, string>;
  plans!: Table<Plan, string>;
  profile!: Table<Profile, "me">;
  weather!: Table<WeatherCache, "me">;

  constructor() {
    super("vasu-closet");
    // v1 — original stores.
    this.version(1).stores({
      items: "id, kind, subkind, warmth, formality, lastWornAt, createdAt",
      outfits: "id, savedAt",
      plans: "id, date, status",
      profile: "id",
    });
    // v2 — add weather cache. Dexie upgrades existing DBs in place.
    this.version(2).stores({
      items: "id, kind, subkind, warmth, formality, lastWornAt, createdAt",
      outfits: "id, savedAt",
      plans: "id, date, status",
      profile: "id",
      weather: "id",
    });
  }
}

export const db = new ClosetDB();
