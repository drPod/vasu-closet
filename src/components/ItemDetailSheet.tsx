import { useEffect, useState } from "react";
import { db } from "../db/db";
import type { Item } from "../db/schema";
import { ItemThumbOf } from "./ItemThumb";

const WARMTH_LABELS = ["cold", "cool", "warm", "hot"] as const;
const FORMALITY_LABELS = ["casual", "smart", "dressy"] as const;

export function ItemDetailSheet({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name ?? "");
  const [warmth, setWarmth] = useState<Item["warmth"]>(item.warmth);
  const [formality, setFormality] = useState<Item["formality"]>(item.formality);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    await db.items.update(item.id, {
      name: name.trim() || undefined,
      warmth,
      formality,
    });
    onClose();
  };

  const remove = async () => {
    await db.items.delete(item.id);
    onClose();
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-label={`edit ${item.subkind}`}>
        <div className="sheet-grip" aria-hidden="true" />

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
          <div
            style={{
              width: 72,
              height: 84,
              background: "#faf5f1",
              border: "1px solid #ebe0d9",
              borderRadius: 10,
              padding: 6,
              flexShrink: 0,
            }}
          >
            <ItemThumbOf item={item} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 2 }}>{item.subkind}</h2>
            <div className="muted" style={{ margin: 0 }}>
              worn {item.wearCount} time{item.wearCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <section className="sheet-section">
          <div className="sheet-label">name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={item.subkind}
            className="detail-input"
          />
        </section>

        <section className="sheet-section">
          <div className="sheet-label">warmth</div>
          <div className="picker-row">
            {WARMTH_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`picker-chip${warmth === i ? " on" : ""}`}
                onClick={() => setWarmth(i as Item["warmth"])}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="sheet-section">
          <div className="sheet-label">formality</div>
          <div className="picker-row">
            {FORMALITY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`picker-chip${formality === i ? " on" : ""}`}
                onClick={() => setFormality(i as Item["formality"])}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="sheet-actions">
          <button
            type="button"
            className={`m-btn${confirmingDelete ? " danger" : ""}`}
            onClick={() => (confirmingDelete ? remove() : setConfirmingDelete(true))}
          >
            {confirmingDelete ? "tap again to delete" : "✕ delete"}
          </button>
          <button type="button" className="m-btn primary" onClick={save}>
            save
          </button>
        </div>
      </div>
    </>
  );
}
