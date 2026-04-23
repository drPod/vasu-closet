import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Item, ItemKind } from "../db/schema";
import { ItemThumbOf } from "../components/ItemThumb";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { AddItemSheet } from "../components/AddItemSheet";
import { ItemDetailSheet } from "../components/ItemDetailSheet";
import { useLongPress } from "../hooks/useLongPress";

type ClosetTab = "all" | "tops" | "bottoms" | "dresses" | "shoes" | "outer";

const WEEK_MS = 7 * 86_400_000;

function HangingItem({
  item,
  worn,
  onTap,
  onHold,
}: {
  item: Item;
  worn: boolean;
  onTap: () => void;
  onHold: () => void;
}) {
  const press = useLongPress({ onClick: onTap, onLongPress: onHold });
  return (
    <button
      type="button"
      className={`hanging-item${worn ? " worn" : ""}`}
      aria-label={`${item.name ?? item.subkind}`}
      {...press}
    >
      {worn && <div className="worn-chip">worn</div>}
      <ItemThumbOf item={item} />
    </button>
  );
}

function Rack({
  label,
  items,
  now,
  onPick,
  onEdit,
}: {
  label: string;
  items: Item[];
  now: number;
  onPick: (item: Item) => void;
  onEdit: (item: Item) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rack-section">
      <div className="rack-label">
        <span>{label}</span>
        <span className="rack-count">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <div className="rack">
        <div className="rack-row">
          {items.map((it) => (
            <HangingItem
              key={it.id}
              item={it}
              worn={!!it.lastWornAt && now - it.lastWornAt < WEEK_MS}
              onTap={() => onPick(it)}
              onHold={() => onEdit(it)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosetScreen({
  current,
  onNav,
  onTryOn,
}: {
  current: ScreenKey;
  onNav: (key: ScreenKey) => void;
  onTryOn: (item: Item) => void;
}) {
  const [tab, setTab] = useState<ClosetTab>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const items = useLiveQuery(() => db.items.orderBy("createdAt").toArray(), []) ?? [];

  const q = query.trim().toLowerCase();
  const matchesQuery = (i: Item) =>
    !q ||
    i.subkind.toLowerCase().includes(q) ||
    i.kind.toLowerCase().includes(q) ||
    (i.pattern ?? "").toLowerCase().includes(q) ||
    (i.name ?? "").toLowerCase().includes(q);

  const visible = items.filter(matchesQuery);

  const byKind = (kind: ItemKind) => visible.filter((i) => i.kind === kind);
  const tops = byKind("top");
  const bottoms = byKind("bottom");
  const dresses = byKind("dress");
  const shoes = byKind("shoes");
  const outer = byKind("outer");

  const now = Date.now();
  const wornThisWeek = items.filter(
    (i) => i.lastWornAt && now - i.lastWornAt < WEEK_MS,
  ).length;

  const showTops = tab === "all" || tab === "tops";
  const showBottoms = tab === "all" || tab === "bottoms";
  const showDresses = tab === "all" || tab === "dresses";
  const showShoes = tab === "all" || tab === "shoes";
  const showOuter = tab === "all" || tab === "outer";

  const TABS: { k: ClosetTab; l: string; c: number }[] = [
    { k: "all", l: "all", c: visible.length },
    { k: "tops", l: "tops", c: tops.length },
    { k: "bottoms", l: "bottoms", c: bottoms.length },
    { k: "dresses", l: "dresses", c: dresses.length },
  ];
  // Only surface shoes/outer tabs once the user has at least one.
  if (items.some((i) => i.kind === "shoes")) {
    TABS.push({ k: "shoes", l: "shoes", c: shoes.length });
  }
  if (items.some((i) => i.kind === "outer")) {
    TABS.push({ k: "outer", l: "outerwear", c: outer.length });
  }

  const isEmpty = visible.length === 0;

  return (
    <div className="screen-root">
      <PhoneChrome>
        <div className="body">
          <header className="screen-header">
            <div>
              <h1 className="display-title">your closet</h1>
              <div className="muted">
                {items.length} pieces · {wornThisWeek} worn this week
              </div>
            </div>
          </header>

          <div className="closet-search" role="search">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ opacity: 0.55, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="search your closet…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="search your closet"
            />
            {query && (
              <button
                type="button"
                className="closet-search-clear"
                onClick={() => setQuery("")}
                aria-label="clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="closet-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.k}
                type="button"
                role="tab"
                aria-selected={tab === t.k}
                className={`closet-tab${tab === t.k ? " on" : ""}`}
                onClick={() => setTab(t.k)}
              >
                {t.l}
                <span className="count">{t.c}</span>
              </button>
            ))}
          </div>

          <div className="closet-body">
            {isEmpty ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#a89a97",
                }}
              >
                <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 18 }}>
                  {query ? `nothing matches "${query}"` : "your closet is empty"}
                </div>
                <div style={{ fontSize: 11, marginTop: 6 }}>
                  {query ? "try \"tee\", \"blouse\", or \"floral\"" : "tap + to add your first piece"}
                </div>
              </div>
            ) : (
              <>
                {showTops && (
                  <Rack label="tops" items={tops} now={now} onPick={onTryOn} onEdit={setEditItem} />
                )}
                {showBottoms && (
                  <Rack
                    label="bottoms"
                    items={bottoms}
                    now={now}
                    onPick={onTryOn}
                    onEdit={setEditItem}
                  />
                )}
                {showDresses && (
                  <Rack
                    label="dresses"
                    items={dresses}
                    now={now}
                    onPick={onTryOn}
                    onEdit={setEditItem}
                  />
                )}
                {showShoes && shoes.length > 0 && (
                  <Rack
                    label="shoes"
                    items={shoes}
                    now={now}
                    onPick={onTryOn}
                    onEdit={setEditItem}
                  />
                )}
                {showOuter && outer.length > 0 && (
                  <Rack
                    label="outerwear"
                    items={outer}
                    now={now}
                    onPick={onTryOn}
                    onEdit={setEditItem}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </PhoneChrome>
      <button
        type="button"
        className="fab"
        onClick={() => setAddOpen(true)}
        aria-label="add a piece"
      >
        ＋
      </button>
      {addOpen && <AddItemSheet onClose={() => setAddOpen(false)} />}
      {editItem && <ItemDetailSheet item={editItem} onClose={() => setEditItem(null)} />}
      <SnapNav current={current} onChange={onNav} />
    </div>
  );
}
