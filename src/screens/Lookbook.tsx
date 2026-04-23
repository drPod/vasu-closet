import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Item, Outfit } from "../db/schema";
import { ItemThumbOf } from "../components/ItemThumb";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { useSwipe } from "../hooks/useSwipe";

const TODAY = "2026-04-22";

type CardState = "front" | "back-2" | "back-3";

type OutfitView = {
  outfit: Outfit;
  top?: Item;
  bot?: Item;
  dress?: Item;
  underTop?: Item;
};

function formatSavedAt(ts: number): string {
  const ago = Date.now() - ts;
  const days = Math.round(ago / 86_400_000);
  if (days < 1) return "saved today";
  const dow = new Date(ts).toLocaleDateString("en", { weekday: "short" }).toLowerCase();
  return `saved ${dow}`;
}

function LookCard({
  state,
  view,
  onDelete,
  dragDx = 0,
  dragging = false,
  swipeBindings,
}: {
  state: CardState;
  view: OutfitView;
  onDelete?: () => void;
  dragDx?: number;
  dragging?: boolean;
  swipeBindings?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const { outfit, top, bot, dress, underTop } = view;
  // Front-card drag: translate + rotate by drag offset, ease opacity based on magnitude.
  const dragStyle: React.CSSProperties | undefined =
    state === "front" && dragging
      ? {
          transform: `translateX(${dragDx}px) rotate(${dragDx / 18}deg)`,
          transition: "none",
          zIndex: 5,
        }
      : state === "front" && !dragging && dragDx !== 0
        ? {
            transform: "translateX(0) rotate(0)",
            transition: "transform 0.25s ease-out",
          }
        : undefined;
  const tint =
    state === "front" && dragging
      ? dragDx > 40
        ? "right"
        : dragDx < -40
          ? "left"
          : null
      : null;
  return (
    <div
      className={`look-card ${state}${tint ? ` tint-${tint}` : ""}`}
      style={dragStyle}
      {...(state === "front" ? swipeBindings : {})}
    >
      <div className="look-photo">
        {outfit.tag && <div className="look-tag">{outfit.tag}</div>}
        <div className="look-heart" aria-hidden="true">
          {outfit.favorite ? "♥" : "♡"}
        </div>
        {state === "front" && onDelete && (
          <button
            type="button"
            className="look-delete"
            onClick={onDelete}
            aria-label="delete outfit"
          >
            ⌫
          </button>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
          {dress ? (
            <div style={{ width: 140, height: 240 }}>
              <ItemThumbOf item={dress} />
            </div>
          ) : (
            <>
              {underTop && (
                <div
                  style={{
                    width: 130,
                    height: 130,
                    marginBottom: -115,
                    opacity: 0.85,
                    transform: "scale(1.05)",
                  }}
                >
                  <ItemThumbOf item={underTop} />
                </div>
              )}
              {top && (
                <div style={{ width: 130, height: 130 }}>
                  <ItemThumbOf item={top} />
                </div>
              )}
              {bot && (
                <div style={{ width: 120, height: 130, marginTop: -8 }}>
                  <ItemThumbOf item={bot} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="look-meta">
        <div className="look-title">{outfit.name ?? "untitled"}</div>
        <div className="look-sub">{formatSavedAt(outfit.savedAt)}</div>
      </div>
    </div>
  );
}

export function LookbookScreen({
  current,
  onNav,
}: {
  current: ScreenKey;
  onNav: (key: ScreenKey) => void;
}) {
  const outfits =
    useLiveQuery(() => db.outfits.orderBy("savedAt").reverse().toArray(), []) ?? [];
  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const byId = new Map(items.map((i) => [i.id, i]));

  const views: OutfitView[] = outfits.map((o) => ({
    outfit: o,
    top: o.topId ? byId.get(o.topId) : undefined,
    bot: o.bottomId ? byId.get(o.bottomId) : undefined,
    dress: o.dressId ? byId.get(o.dressId) : undefined,
    underTop: o.underTopId ? byId.get(o.underTopId) : undefined,
  }));

  const [index, setIndex] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const clampedIndex = Math.min(index, Math.max(0, views.length - 1));
  const front = views[clampedIndex];
  const back2 = views[clampedIndex + 1];
  const back3 = views[clampedIndex + 2];

  const WEEK_MS = 7 * 86_400_000;
  const recent = views.filter((v) => Date.now() - v.outfit.savedAt < WEEK_MS).length;

  const advance = () => setIndex((i) => Math.min(i + 1, Math.max(0, views.length - 1)));

  const onNope = () => {
    setConfirmingDelete(false);
    advance();
  };

  const onLove = async () => {
    if (!front) return;
    await db.outfits.update(front.outfit.id, { favorite: !front.outfit.favorite });
    setConfirmingDelete(false);
  };

  const swipe = useSwipe({
    onSwipeLeft: onNope,
    onSwipeRight: async () => {
      if (!front) return;
      await db.outfits.update(front.outfit.id, { favorite: true });
      advance();
    },
  });

  const onDelete = async () => {
    if (!front) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      // Auto-cancel the confirming state after a few seconds so it doesn't trap the UI.
      window.setTimeout(() => setConfirmingDelete(false), 2500);
      return;
    }
    await db.outfits.delete(front.outfit.id);
    setConfirmingDelete(false);
  };

  const onWear = async () => {
    if (!front) return;
    const { topId, bottomId, dressId } = front.outfit;
    const now = Date.now();
    await db.transaction("rw", db.items, db.plans, async () => {
      const ids = [topId, bottomId, dressId].filter((x): x is string => !!x);
      for (const id of ids) {
        const item = await db.items.get(id);
        if (!item) continue;
        await db.items.update(id, {
          lastWornAt: now,
          wearCount: (item.wearCount ?? 0) + 1,
        });
      }
      const existing = await db.plans.get(TODAY);
      await db.plans.put({
        id: TODAY,
        date: TODAY,
        event: existing?.event,
        weatherNote: existing?.weatherNote,
        topId,
        bottomId,
        dressId,
        status: "worn",
      });
    });
    onNav("calendar");
  };

  return (
    <div className="screen-root">
      <PhoneChrome>
        <div className="body">
          <header className="screen-header">
            <div>
              <h1 className="display-title">lookbook</h1>
              <div className="muted">swipe through your saves</div>
            </div>
          </header>

          <div className="lookbook-body">
            <div className="lookbook-count">
              <strong>{views.length}</strong> saved look{views.length === 1 ? "" : "s"} ·{" "}
              {recent} new this week
            </div>
            {front ? (
              <>
                <div className="card-stack">
                  {back3 && <LookCard state="back-3" view={back3} />}
                  {back2 && <LookCard state="back-2" view={back2} />}
                  <LookCard
                    state="front"
                    view={front}
                    onDelete={onDelete}
                    dragDx={swipe.dx}
                    dragging={swipe.dragging}
                    swipeBindings={swipe.bindings}
                  />
                </div>
                {confirmingDelete && (
                  <div className="delete-confirm">tap delete again to remove this look</div>
                )}
                <div className="look-actions">
                  <button
                    type="button"
                    className="look-action nope"
                    aria-label="skip"
                    onClick={onNope}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    className="look-action wear"
                    aria-label="wear now"
                    onClick={onWear}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <span>⬥</span>
                      <span className="wear-label">wear</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`look-action love${front.outfit.favorite ? " on" : ""}`}
                    aria-label="favorite"
                    onClick={onLove}
                  >
                    {front.outfit.favorite ? "♥" : "♡"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#a89a97" }}>
                <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 18 }}>
                  no saves yet
                </div>
                <div style={{ fontSize: 11, marginTop: 6 }}>
                  tap ♡ save on an outfit to start your lookbook
                </div>
              </div>
            )}
          </div>
        </div>
      </PhoneChrome>
      <SnapNav current={current} onChange={onNav} />
    </div>
  );
}
