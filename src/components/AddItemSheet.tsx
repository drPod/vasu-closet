import { useEffect, useRef, useState } from "react";
import { db } from "../db/db";
import type { GarmentKind, Item, ItemKind } from "../db/schema";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { removeBackground } from "../lib/bg-remove";

type SubkindOption = {
  kind: ItemKind;
  sub: GarmentKind;
  warmth: Item["warmth"];
  formality: Item["formality"];
};

const SUBKINDS: SubkindOption[] = [
  { kind: "top", sub: "cami", warmth: 1, formality: 0 },
  { kind: "top", sub: "tee", warmth: 1, formality: 0 },
  { kind: "top", sub: "blouse", warmth: 2, formality: 1 },
  { kind: "top", sub: "knit", warmth: 3, formality: 0 },
  { kind: "bottom", sub: "jeans", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "pants", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "skirt", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "shorts", warmth: 1, formality: 0 },
  { kind: "dress", sub: "dress", warmth: 2, formality: 1 },
  { kind: "shoes", sub: "sneakers", warmth: 1, formality: 0 },
  { kind: "shoes", sub: "boots", warmth: 3, formality: 1 },
  { kind: "shoes", sub: "heels", warmth: 2, formality: 2 },
  { kind: "shoes", sub: "flats", warmth: 1, formality: 1 },
  { kind: "outer", sub: "cardigan", warmth: 2, formality: 0 },
  { kind: "outer", sub: "jacket", warmth: 3, formality: 0 },
  { kind: "outer", sub: "coat", warmth: 3, formality: 1 },
];

async function extractPrimaryColor(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#c4a894";
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 4; y < size - 4; y++) {
      for (let x = 4; x < size - 4; x++) {
        const i = (y * size + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }
    const avg = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
    return `#${avg(r)}${avg(g)}${avg(b)}`;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Small slot for one angle's photo — shows a preview when uploaded. */
function PhotoSlot({
  label,
  blob,
  onPick,
  onPickMany,
  required,
  multiple,
}: {
  label: string;
  blob: Blob | undefined;
  onPick: (file: File | undefined) => void;
  onPickMany?: (files: File[]) => void;
  required?: boolean;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const url = useBlobUrl(blob);
  return (
    <div className="photo-slot-col">
      <button
        type="button"
        className={`photo-slot${blob ? " filled" : ""}`}
        onClick={() => ref.current?.click()}
        aria-label={`upload ${label} photo`}
      >
        {url ? <img src={url} alt="" /> : <span className="photo-slot-plus">＋</span>}
      </button>
      <div className="photo-slot-label">
        {label}
        {required && <span className="photo-slot-req">·required</span>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 1 && onPickMany) onPickMany(files);
          else onPick(files[0]);
        }}
      />
    </div>
  );
}

export function AddItemSheet({ onClose }: { onClose: () => void }) {
  /**
   * Two modes:
   *   single — user picked 0 or 1 front photo; can also add side/back,
   *            saves as one item.
   *   bulk   — user picked 2+ front photos at once; saves as N items
   *            sharing the chosen kind, no per-angle photos.
   */
  const [photoFront, setPhotoFront] = useState<Blob | undefined>();
  const [photoSide, setPhotoSide] = useState<Blob | undefined>();
  const [photoBack, setPhotoBack] = useState<Blob | undefined>();
  const [bulk, setBulk] = useState<File[] | null>(null);
  const [subIndex, setSubIndex] = useState<number | null>(null);
  const [cutoutBg, setCutoutBg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picked = subIndex != null ? SUBKINDS[subIndex] : undefined;
  const hasAnyPhoto = !!photoFront || !!(bulk && bulk.length);
  const canSave = hasAnyPhoto && !!picked && !saving;

  const cutout = (blob: Blob | undefined) =>
    blob && cutoutBg ? removeBackground(blob).catch(() => blob) : Promise.resolve(blob);

  const handleSave = async () => {
    if (!picked || !hasAnyPhoto) return;
    setSaving(true);
    try {
      const now = Date.now();
      if (bulk && bulk.length > 0) {
        // Bulk mode: one item per file, no side/back.
        for (let i = 0; i < bulk.length; i++) {
          setProgress(`${cutoutBg ? "cutting out" : "saving"} ${i + 1}/${bulk.length}…`);
          const front = await cutout(bulk[i]);
          if (!front) continue;
          const primaryColor = await extractPrimaryColor(front).catch(() => "#c4a894");
          const id = `u-${(now + i).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          await db.items.add({
            id,
            kind: picked.kind,
            subkind: picked.sub,
            primaryColor,
            photo: front,
            warmth: picked.warmth,
            formality: picked.formality,
            wearCount: 0,
            createdAt: now + i,
          });
        }
      } else if (photoFront) {
        const [front, side, back] = await Promise.all([
          cutout(photoFront),
          cutout(photoSide),
          cutout(photoBack),
        ]);
        const primaryColor = await extractPrimaryColor(front!).catch(() => "#c4a894");
        const id = `u-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        await db.items.add({
          id,
          kind: picked.kind,
          subkind: picked.sub,
          primaryColor,
          photo: front,
          photoSide: side,
          photoBack: back,
          warmth: picked.warmth,
          formality: picked.formality,
          wearCount: 0,
          createdAt: now,
        });
      }
      onClose();
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-label="add a piece to your closet">
        <div className="sheet-grip" aria-hidden="true" />
        <h2>{bulk ? `add ${bulk.length} pieces` : "add to your closet"}</h2>
        <div className="muted">
          {bulk
            ? "all of these will be tagged with the kind you pick below."
            : "take a photo against a plain backdrop. add side/back too if you want a truer fit."}
        </div>

        <section className="sheet-section">
          <div className="sheet-label">
            {bulk ? `photos · ${bulk.length} selected` : "photos"}
          </div>

          {bulk ? (
            <div className="bulk-preview">
              {bulk.slice(0, 8).map((f, i) => (
                <BulkThumb key={i} file={f} />
              ))}
              {bulk.length > 8 && (
                <div className="bulk-thumb more">+{bulk.length - 8}</div>
              )}
              <button
                type="button"
                className="bulk-clear"
                onClick={() => setBulk(null)}
                disabled={saving}
              >
                clear · add one at a time
              </button>
            </div>
          ) : (
            <div className="photo-slots-row">
              <PhotoSlot
                label="front"
                blob={photoFront}
                onPick={(f) => f && setPhotoFront(f)}
                onPickMany={(files) => setBulk(files)}
                multiple
                required
              />
              <PhotoSlot
                label="side"
                blob={photoSide}
                onPick={(f) => f && setPhotoSide(f)}
              />
              <PhotoSlot
                label="back"
                blob={photoBack}
                onPick={(f) => f && setPhotoBack(f)}
              />
            </div>
          )}
        </section>

        <section className="sheet-section">
          <div className="sheet-label">what is it</div>
          <div className="picker-row">
            {SUBKINDS.map((s, i) => (
              <button
                key={s.sub + i}
                type="button"
                className={`picker-chip${subIndex === i ? " on" : ""}`}
                onClick={() => setSubIndex(i)}
              >
                {s.sub}
              </button>
            ))}
          </div>
        </section>

        <section className="sheet-section">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={cutoutBg}
              onChange={(e) => setCutoutBg(e.target.checked)}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ color: "var(--accent)", flexShrink: 0 }}
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
            <span>cut out background (best on plain backdrops)</span>
          </label>
        </section>

        <div className="sheet-actions">
          <button type="button" className="m-btn" onClick={onClose} disabled={saving}>
            cancel
          </button>
          <button
            type="button"
            className="m-btn primary"
            onClick={handleSave}
            disabled={!canSave}
            style={canSave ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
          >
            {saving ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {progress ?? (cutoutBg ? "cutting out…" : "saving…")}
              </>
            ) : bulk ? (
              `save ${bulk.length} pieces`
            ) : (
              "save to closet"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function BulkThumb({ file }: { file: File }) {
  const url = useBlobUrl(file);
  return (
    <div className="bulk-thumb">
      {url ? <img src={url} alt="" /> : null}
    </div>
  );
}
