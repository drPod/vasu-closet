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

/**
 * Sample a handful of pixels near the center of an image Blob and return
 * the average color as a hex string. Used as a seed for `primaryColor` so
 * the garment's list thumb matches its real dominant tone.
 */
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
  required,
}: {
  label: string;
  blob: Blob | undefined;
  onPick: (file: File | undefined) => void;
  required?: boolean;
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
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}

export function AddItemSheet({ onClose }: { onClose: () => void }) {
  const [photoFront, setPhotoFront] = useState<Blob | undefined>();
  const [photoSide, setPhotoSide] = useState<Blob | undefined>();
  const [photoBack, setPhotoBack] = useState<Blob | undefined>();
  const [subIndex, setSubIndex] = useState<number | null>(null);
  const [cutoutBg, setCutoutBg] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picked = subIndex != null ? SUBKINDS[subIndex] : undefined;
  const canSave = !!photoFront && !!picked && !saving;

  const cutout = (blob: Blob | undefined) =>
    blob && cutoutBg ? removeBackground(blob).catch(() => blob) : Promise.resolve(blob);

  const handleSave = async () => {
    if (!photoFront || !picked) return;
    setSaving(true);
    try {
      const [front, side, back] = await Promise.all([
        cutout(photoFront),
        cutout(photoSide),
        cutout(photoBack),
      ]);
      const primaryColor = await extractPrimaryColor(front!).catch(() => "#c4a894");
      const now = Date.now();
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
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-label="add a piece to your closet">
        <div className="sheet-grip" aria-hidden="true" />
        <h2>add to your closet</h2>
        <div className="muted">
          take a photo of the garment against a plain backdrop. add side/back
          shots too if you want a truer fit across poses.
        </div>

        <section className="sheet-section">
          <div className="sheet-label">photos</div>
          <div className="photo-slots-row">
            <PhotoSlot
              label="front"
              blob={photoFront}
              onPick={(f) => f && setPhotoFront(f)}
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
                {cutoutBg ? "cutting out…" : "saving…"}
              </>
            ) : (
              "save to closet"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
