import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Item, Pose } from "../db/schema";
import { ItemThumbOf } from "../components/ItemThumb";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { FigureBody } from "../components/FigureBody";
import { DraggableGarment } from "../components/DraggableGarment";
import { WeatherIcon } from "../components/WeatherIcon";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { desiredWarmth, isWarmthOff, itemSuitability } from "../lib/weather";
import { useDayForecast } from "../hooks/useWeather";
import { bodyPhotoForPose } from "../lib/layout";

type ShelfTab = "tops" | "bottoms" | "dresses" | "outer" | "shoes" | "layer";

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

function todayLabel(): string {
  const now = new Date();
  const dow = DOW_LONG[now.getDay()];
  const mon = now.toLocaleDateString("en", { month: "long" }).toLowerCase();
  return `${dow} · ${mon} ${now.getDate()}`;
}

type Mode = "today" | "planning" | "review";

export type MirrorPreset = {
  topId?: string;
  botId?: string;
  dressId?: string;
  outerId?: string;
  shoesId?: string;
};

function modeFor(date: string): Mode {
  if (date === TODAY) return "today";
  return date > TODAY ? "planning" : "review";
}

const POSE_OPTIONS: Pose[] = ["front", "side", "back"];

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
  const outers = useLiveQuery(
    () => db.items.where("kind").equals("outer").sortBy("createdAt"),
    [],
  );
  const shoesList = useLiveQuery(
    () => db.items.where("kind").equals("shoes").sortBy("createdAt"),
    [],
  );
  const profile = useLiveQuery(() => db.profile.get("me"), []);

  const [pose, setPose] = useState<Pose>("front");
  const [topId, setTopId] = useState<string>();
  const [underTopId, setUnderTopId] = useState<string>();
  const [botId, setBotId] = useState<string>();
  const [dressId, setDressId] = useState<string>();
  const [outerId, setOuterId] = useState<string>();
  const [shoesId, setShoesId] = useState<string>();
  const [tab, setTab] = useState<ShelfTab>("tops");
  const [eventText, setEventText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1400);
  };

  const bodyBlob = bodyPhotoForPose(profile, pose);
  const bodyUrl = useBlobUrl(bodyBlob);

  // Closet preset takes precedence over plan prefill.
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
    if (preset.outerId) setOuterId(preset.outerId);
    if (preset.shoesId) setShoesId(preset.shoesId);
  }, [preset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plan = await db.plans.get(targetDate);
      if (cancelled) return;
      if (!preset) {
        if (plan?.topId) setTopId(plan.topId);
        if (plan?.bottomId) setBotId(plan.bottomId);
        if (plan?.dressId) setDressId(plan.dressId);
      }
      setEventText(plan?.event ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [targetDate, preset]);

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
  const outer = outers?.find((i) => i.id === outerId);
  const shoes = shoesList?.find((i) => i.id === shoesId);
  const wearingDress = !!dress;

  const list: Item[] = useMemo(() => {
    if (tab === "tops") return tops ?? [];
    if (tab === "bottoms") return bottoms ?? [];
    if (tab === "dresses") return dresses ?? [];
    if (tab === "outer") return outers ?? [];
    if (tab === "shoes") return shoesList ?? [];
    return tops ?? [];
  }, [tab, tops, bottoms, dresses, outers, shoesList]);

  const isSelected = (it: Item) => {
    if (tab === "tops") return top?.id === it.id;
    if (tab === "bottoms") return bot?.id === it.id;
    if (tab === "dresses") return dress?.id === it.id;
    if (tab === "outer") return outer?.id === it.id;
    if (tab === "shoes") return shoes?.id === it.id;
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
      setDressId(it.id === dressId ? undefined : it.id);
    } else if (tab === "outer") {
      setOuterId(it.id === outerId ? undefined : it.id);
    } else if (tab === "shoes") {
      setShoesId(it.id === shoesId ? undefined : it.id);
    } else if (tab === "layer") {
      setUnderTopId(it.id === underTopId ? undefined : it.id);
    }
    setSelectedGarment(it.id);
  };

  const wardrobeWarning = useMemo(() => {
    const tooHot: Item[] = [];
    const tooLight: Item[] = [];
    const picks = wearingDress
      ? [dress, outer, shoes]
      : [top, bot, underTop, outer, shoes];
    picks.forEach((it) => {
      if (!it || !isWarmthOff(it, target)) return;
      if (it.warmth > target) tooHot.push(it);
      else tooLight.push(it);
    });
    if (tooHot.length) return `that's toasty for ${effectiveTemp}° out`;
    if (tooLight.length) return `you'll be chilly · ${effectiveTemp}°`;
    return null;
  }, [top, bot, underTop, dress, outer, shoes, wearingDress, target, effectiveTemp]);

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
    flashToast("saved to lookbook");
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
        event: eventText.trim() || existing?.event,
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
      return;
    }
    flashToast("wearing today");
  };

  const plannedLabel = planningDate ? parsePlannedLabel(planningDate) : null;

  const headerTitle =
    mode === "today" ? "The Mirror" : mode === "planning" ? "Planning" : "Log outfit";
  const headerSub = mode === "today" ? todayLabel() : plannedLabel?.long ?? "";
  const primaryLabel =
    mode === "today"
      ? "wear today"
      : mode === "planning"
        ? `save for ${plannedLabel?.short ?? ""}`.trim()
        : `log for ${plannedLabel?.short ?? ""}`.trim();

  // Garments rendered on the stage, back-to-front. Dress replaces separates.
  const layers: Item[] = wearingDress
    ? [dress!, shoes, outer].filter((x): x is Item => !!x)
    : [underTop, bot, top, outer, shoes].filter((x): x is Item => !!x);

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
                    <WeatherIcon code={forecast.code} size={16} />
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

            {mode !== "today" && (
              <input
                type="text"
                className="event-input"
                placeholder="what's happening? (e.g. brunch, class, date)"
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                aria-label="event for this day"
              />
            )}

            <div
              className="mirror-stage"
              ref={stageRef}
              onPointerDown={(e) => {
                // Pointer-down on blank stage deselects any focused garment.
                if (e.target === e.currentTarget) setSelectedGarment(null);
              }}
            >
              {/* Pose switcher — chooses which body photo to show. */}
              <div className="pose-switcher" role="tablist" aria-label="view">
                {POSE_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={pose === p}
                    className={`pose-pill${pose === p ? " on" : ""}`}
                    onClick={() => setPose(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Body canvas: either the user's photo for this pose or a
                  stylized illustrated body as a paper-doll template. */}
              <div className="mirror-canvas">
                {bodyUrl ? (
                  <img src={bodyUrl} alt="" className="mirror-photo" draggable={false} />
                ) : (
                  <FigureBody />
                )}

                {/* Garment layers — each draggable, positioned, scalable. */}
                {layers.map((item) => (
                  <DraggableGarment
                    key={item.id}
                    item={item}
                    pose={pose}
                    stageRef={stageRef}
                    selected={selectedGarment === item.id}
                    onSelect={() => setSelectedGarment(item.id)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="surprise-btn"
                onClick={surpriseMe}
                aria-label="surprise me"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "#c88a8f" }}
                >
                  <path d="M12 3l1.8 4.8 4.8 1.8-4.8 1.8L12 16.2l-1.8-4.8L5.4 9.6l4.8-1.8z" />
                  <path d="M19 3l.6 1.4 1.4.6-1.4.6L19 7l-.6-1.4L17 5l1.4-.6z" />
                </svg>
                surprise me
              </button>
            </div>

            <div className="mirror-shelf">
              <div className="shelf-tabs" role="tablist">
                {(
                  [
                    "tops",
                    "bottoms",
                    "dresses",
                    ...((outers?.length ?? 0) > 0 ? (["outer"] as ShelfTab[]) : []),
                    ...((shoesList?.length ?? 0) > 0 ? (["shoes"] as ShelfTab[]) : []),
                    "layer",
                  ] as ShelfTab[]
                ).map((t) => (
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
              {tab === "layer" && (
                <div className="shelf-hint">
                  pick a top to wear <em>underneath</em> the main one — e.g.
                  a cami peeking under a blouse.
                </div>
              )}
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
                <span className="m-btn-glyph" aria-hidden="true">♡</span>
                save
              </button>
              <button type="button" className="m-btn primary" onClick={commitOutfit}>
                {primaryLabel}
              </button>
            </div>
          </div>
        </PhoneChrome>
        {toast && (
          <div className="mirror-toast" role="status">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            <span>{toast}</span>
          </div>
        )}
        <SnapNav current={current} onChange={onNav} />
      </div>
    </div>
  );
}
