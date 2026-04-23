import { useEffect, useRef, useState } from "react";
import { db } from "../db/db";
import type { Item, Pose } from "../db/schema";
import { ItemThumbOf } from "./ItemThumb";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { removeBackground } from "../lib/bg-remove";

const WARMTH_LABELS = ["cold", "cool", "warm", "hot"] as const;
const FORMALITY_LABELS = ["casual", "smart", "dressy"] as const;

const POSES: { key: Pose; label: string }[] = [
  { key: "front", label: "front" },
  { key: "side", label: "side" },
  { key: "back", label: "back" },
];

function PhotoEditorSlot({
  label,
  blob,
  onReplace,
  onClear,
}: {
  label: string;
  blob: Blob | undefined;
  onReplace: (file: File) => void;
  onClear: () => void;
}) {
  const url = useBlobUrl(blob);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="photo-slot-col">
      <button
        type="button"
        className={`photo-slot${blob ? " filled" : ""}`}
        onClick={() => ref.current?.click()}
        aria-label={`replace ${label} photo`}
      >
        {url ? <img src={url} alt="" /> : <span className="photo-slot-plus">＋</span>}
      </button>
      <div className="photo-slot-label">
        {label}
        {blob && (
          <button
            type="button"
            className="photo-slot-clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            clear
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReplace(f);
        }}
      />
    </div>
  );
}

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
  const [busy, setBusy] = useState(false);

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

  const replacePhoto = async (pose: Pose, file: File) => {
    setBusy(true);
    try {
      const blob = await removeBackground(file).catch(() => file);
      const field =
        pose === "front" ? "photo" : pose === "side" ? "photoSide" : "photoBack";
      await db.items.update(item.id, { [field]: blob });
    } finally {
      setBusy(false);
    }
  };

  const clearPhoto = async (pose: Pose) => {
    const field =
      pose === "front" ? "photo" : pose === "side" ? "photoSide" : "photoBack";
    await db.items.update(item.id, { [field]: undefined });
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
            <h2 style={{ marginBottom: 2 }}>{name || item.subkind}</h2>
            <div className="muted" style={{ margin: 0 }}>
              worn {item.wearCount} time{item.wearCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <section className="sheet-section">
          <div className="sheet-label">
            photos{busy && <span className="photo-slot-req">·cutting out…</span>}
          </div>
          <div className="photo-slots-row">
            {POSES.map(({ key, label }) => (
              <PhotoEditorSlot
                key={key}
                label={label}
                blob={
                  key === "front" ? item.photo : key === "side" ? item.photoSide : item.photoBack
                }
                onReplace={(f) => replacePhoto(key, f)}
                onClear={() => clearPhoto(key)}
              />
            ))}
          </div>
        </section>

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
