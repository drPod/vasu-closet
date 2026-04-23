import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Item } from "../db/schema";
import { ItemThumbOf } from "../components/ItemThumb";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { FigureGarment } from "../components/FigureGarment";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { desiredWarmth, isWarmthOff, itemSuitability } from "../lib/weather";
import { useDayForecast } from "../hooks/useWeather";

type ShelfTab = "tops" | "bottoms" | "dresses" | "layer";

const ROTATE_LABELS = ["front", "side", "back"] as const;
const TODAY = "2026-04-22";

const DOW_LONG = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parsePlannedLabel(iso: string): { long: string; short: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const long = DOW_LONG[dt.getDay()];
  const short = dt.toLocaleDateString("en", { weekday: "short" }).toLowerCase();
  const mon = dt.toLocaleDateString("en", { month: "short" }).toLowerCase();
  return { long: `${long} · ${mon} ${dt.getDate()}`, short };
}

type Mode = "today" | "planning" | "review";

export type MirrorPreset = {
  topId?: string;
  botId?: string;
  dressId?: string;
};

function modeFor(date: string): Mode {
  if (date === TODAY) return "today";
  return date > TODAY ? "planning" : "review";
}

export function MirrorScreen({
  current,
  onNav,
  planningDate,
  preset,
  clearIntent,
}: {
  current: ScreenKey;
  onNav: (key: ScreenKey) => void;
  planningDate: string | null;
  preset: MirrorPreset | null;
  clearIntent: () => void;
}) {
  const targetDate = planningDate ?? TODAY;
  const mode: Mode = modeFor(targetDate);
  const forecast = useDayForecast(targetDate);
  // When no forecast is available (past date, offline, etc.) fall back to a
  // mild default so suitability scoring still works.
  const effectiveTemp = forecast?.temp ?? 68;
  const target = desiredWarmth(effectiveTemp);

  const tops = useLiveQuery(
    () => db.items.where("kind").equals("top").sortBy("createdAt"),
    [],
  );
  const bottoms = useLiveQuery(
    () => db.items.where("kind").equals("bottom").sortBy("createdAt"),
    [],
  );
  const dresses = useLiveQuery(
    () => db.items.where("kind").equals("dress").sortBy("createdAt"),
    [],
  );
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const photoUrl = useBlobUrl(profile?.photo);

  const [topId, setTopId] = useState<string>();
  const [underTopId, setUnderTopId] = useState<string>();
  const [botId, setBotId] = useState<string>();
  const [dressId, setDressId] = useState<string>();
  const [tab, setTab] = useState<ShelfTab>("tops");
  const [rotate, setRotate] = useState(0);

  // A Closet "try on" tap pipes a specific item in as the initial selection.
  // When a preset is active it wins over the plan prefill.
  useEffect(() => {
    if (!preset) return;
    if (preset.topId) {
      setTopId(preset.topId);
      setDressId(undefined);
    }
    if (preset.botId) {
      setBotId(preset.botId);
      setDressId(undefined);
    }
    if (preset.dressId) setDressId(preset.dressId);
  }, [preset]);

  // Prefill from the existing plan for this date (planning a day that already has something).
  useEffect(() => {
    if (preset) return;
    let cancelled = false;
    (async () => {
      const plan = await db.plans.get(targetDate);
      if (cancelled) return;
      if (plan?.topId) setTopId(plan.topId);
      if (plan?.bottomId) setBotId(plan.bottomId);
      if (plan?.dressId) setDressId(plan.dressId);
    })();
    return () => {
      cancelled = true;
    };
  }, [targetDate, preset]);

  // Fallback defaults if no plan.
  useEffect(() => {
    if (!topId && tops?.length) setTopId(tops[3]?.id ?? tops[0].id);
  }, [tops, topId]);
  useEffect(() => {
    if (!botId && bottoms?.length) setBotId(bottoms[3]?.id ?? bottoms[0].id);
  }, [bottoms, botId]);

  const top = tops?.find((i) => i.id === topId);
  const bot = bottoms?.find((i) => i.id === botId);
  const underTop = tops?.find((i) => i.id === underTopId);
  const dress = dresses?.find((i) => i.id === dressId);
  const wearingDress = !!dress;

  const list: Item[] = useMemo(() => {
    if (tab === "tops") return tops ?? [];
    if (tab === "bottoms") return bottoms ?? [];
    if (tab === "dresses") return dresses ?? [];
    // "layer" — a top worn under the main top
    return tops ?? [];
  }, [tab, tops, bottoms, dresses]);

  const isSelected = (it: Item) => {
    if (tab === "tops") return top?.id === it.id;
    if (tab === "bottoms") return bot?.id === it.id;
    if (tab === "dresses") return dress?.id === it.id;
    if (tab === "layer") return underTop?.id === it.id;
    return false;
  };

  const pickItem = (it: Item) => {
    if (tab === "tops") {
      setTopId(it.id);
      setDressId(undefined);
    } else if (tab === "bottoms") {
      setBotId(it.id);
      setDressId(undefined);
    } else if (tab === "dresses") {
      // Tap again to unset; a dress replaces the separates visually.
      setDressId(it.id === dressId ? undefined : it.id);
    } else if (tab === "layer") {
      setUnderTopId(it.id === underTopId ? undefined : it.id);
    }
  };

  const wardrobeWarning = useMemo(() => {
    const tooHot: Item[] = [];
    const tooLight: Item[] = [];
    const picks = wearingDress ? [dress] : [top, bot, underTop];
    picks.forEach((it) => {
      if (!it || !isWarmthOff(it, target)) return;
      if (it.warmth > target) tooHot.push(it);
      else tooLight.push(it);
    });
    if (tooHot.length) return `that's toasty for ${effectiveTemp}° out`;
    if (tooLight.length) return `you'll be chilly · ${effectiveTemp}°`;
    return null;
  }, [top, bot, underTop, dress, wearingDress, target, effectiveTemp]);

  const surpriseMe = () => {
    const rank = (it: Item) => itemSuitability(it, target);
    const best = (arr: Item[] | undefined) =>
      arr?.length ? [...arr].sort((a, b) => rank(a) - rank(b))[0] : undefined;
    const nextTop = best(tops);
    const nextBot = best(bottoms);
    if (nextTop) setTopId(nextTop.id);
    if (nextBot) setBotId(nextBot.id);
    setUnderTopId(undefined);
  };

  const saveOutfit = async () => {
    if (!top && !bot && !dress) return;
    const now = Date.now();
    const id = `o-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const name = wearingDress
      ? `${dress!.primaryColor} dress`
      : top && bot
        ? `${top.subkind} & ${bot.subkind}`
        : "new save";
    await db.outfits.add({
      id,
      topId: wearingDress ? undefined : top?.id,
      bottomId: wearingDress ? undefined : bot?.id,
      underTopId: wearingDress ? undefined : underTop?.id,
      dressId: dress?.id,
      name,
      tag: "new save",
      savedAt: now,
    });
  };

  const commitOutfit = async () => {
    if (!top && !bot && !dress) return;
    const now = Date.now();
    const ids = wearingDress
      ? [dress!.id]
      : [top?.id, underTop?.id, bot?.id].filter((x): x is string => !!x);
    const status = mode === "planning" ? "planned" : "worn";

    await db.transaction("rw", db.items, db.plans, async () => {
      if (status === "worn") {
        for (const id of ids) {
          const item = await db.items.get(id);
          if (!item) continue;
          await db.items.update(id, {
            lastWornAt: now,
            wearCount: (item.wearCount ?? 0) + 1,
          });
        }
      }
      const existing = await db.plans.get(targetDate);
      const liveWeatherNote = forecast
        ? `${forecast.temp}° · ${forecast.note}`
        : undefined;
      await db.plans.put({
        id: targetDate,
        date: targetDate,
        event: existing?.event,
        weatherNote: liveWeatherNote ?? existing?.weatherNote,
        topId: wearingDress ? undefined : top?.id,
        bottomId: wearingDress ? undefined : bot?.id,
        dressId: dress?.id,
        status,
      });
    });

    if (mode !== "today") {
      clearIntent();
      onNav("calendar");
    }
  };

  const plannedLabel = planningDate ? parsePlannedLabel(planningDate) : null;

  const headerTitle =
    mode === "today" ? "The Mirror" : mode === "planning" ? "Planning" : "Log outfit";
  const headerSub =
    mode === "today" ? "tuesday · april 22" : plannedLabel?.long ?? "";
  const primaryLabel =
    mode === "today"
      ? "wear today"
      : mode === "planning"
        ? `save for ${plannedLabel?.short ?? ""}`.trim()
        : `log for ${plannedLabel?.short ?? ""}`.trim();

  return (
    <div className="mirror-root">
      <div className="mirror-phone">
        <PhoneChrome>
          <div className="screen">
            <header className="mirror-header">
              <div>
                <div className="title">{headerTitle}</div>
                <div className="sub">{headerSub}</div>
              </div>
              <div
                className={`weather-chip${wardrobeWarning ? " warn" : ""}`}
                title={wardrobeWarning ?? undefined}
              >
                {forecast ? (
                  <>
                    <span>{forecast.icon}</span>
                    <span>
                      {forecast.temp}° · {forecast.note}
                    </span>
                  </>
                ) : (
                  <span style={{ opacity: 0.6 }}>weather…</span>
                )}
              </div>
            </header>

            {wardrobeWarning && <div className="warn-banner">⚠ {wardrobeWarning}</div>}

            <div className="mirror-stage">
              <div className="layers-strip" aria-label="layers">
                {wearingDress ? (
                  <div className="layer-pip">
                    <ItemThumbOf item={dress!} />
                  </div>
                ) : (
                  <>
                    <div className={`layer-pip${underTop ? "" : " empty"}`}>
                      {underTop ? <ItemThumbOf item={underTop} /> : "+"}
                    </div>
                    <div className="layer-pip">{top && <ItemThumbOf item={top} />}</div>
                    <div className="layer-pip">{bot && <ItemThumbOf item={bot} />}</div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRotate((r) => (r + 1) % 3)}
                aria-label="rotate figure"
                style={{
                  width: 200,
                  height: 340,
                  position: "relative",
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="mirror-photo" />
                ) : (
                  <div className="photo-placeholder">
                    <div className="photo-placeholder-hint">your photo here</div>
                  </div>
                )}
                <svg
                  viewBox="0 0 200 340"
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", inset: 0 }}
                  aria-hidden="true"
                >
                  {wearingDress ? (
                    <FigureGarment
                      item={dress!}
                      path="M52 70 Q70 62 82 66 L100 68 L118 66 Q130 62 148 70 L156 180 L170 310 L30 310 L44 180 Z"
                    />
                  ) : (
                    <>
                      {underTop && (
                        <FigureGarment
                          item={underTop}
                          path="M48 66 Q68 58 82 62 L100 64 L118 62 Q132 58 152 66 L156 180 L146 202 L54 202 L44 180 Z"
                          opacity={0.9}
                        />
                      )}
                      {top && (
                        <FigureGarment
                          item={top}
                          path="M52 70 Q70 62 82 66 L100 68 L118 66 Q130 62 148 70 L152 170 L146 200 L54 200 L48 170 Z"
                        />
                      )}
                      {bot && (
                        <FigureGarment
                          item={bot}
                          path="M54 200 L146 200 L142 230 L136 300 L128 332 L108 332 L106 232 L100 230 L94 232 L92 332 L72 332 L64 300 L58 230 Z"
                        />
                      )}
                    </>
                  )}
                </svg>
              </button>

              <div className="rotate-indicator">
                <span>{ROTATE_LABELS[rotate]}</span>
                <div className="rotate-dots">
                  {ROTATE_LABELS.map((_, i) => (
                    <div key={i} className={`rd${i === rotate ? " on" : ""}`} />
                  ))}
                </div>
                <span style={{ opacity: 0.5 }}>tap to rotate</span>
              </div>

              <button
                type="button"
                className="surprise-btn"
                onClick={surpriseMe}
                aria-label="surprise me"
              >
                ✨ surprise me
              </button>
            </div>

            <div className="mirror-shelf">
              <div className="shelf-tabs" role="tablist">
                {(["tops", "bottoms", "dresses", "layer"] as ShelfTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`shelf-tab${tab === t ? " on" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="shelf-grid scrollable">
                {list.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={`item-card${isSelected(it) ? " selected" : ""}`}
                    onClick={() => pickItem(it)}
                    aria-label={`${it.subkind} — ${it.primaryColor}`}
                  >
                    <ItemThumbOf item={it} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mirror-actions">
              <button type="button" className="m-btn" onClick={saveOutfit}>
                ♡ save
              </button>
              <button type="button" className="m-btn primary" onClick={commitOutfit}>
                {primaryLabel}
              </button>
            </div>
          </div>
        </PhoneChrome>
        <SnapNav current={current} onChange={onNav} />
      </div>
    </div>
  );
}
