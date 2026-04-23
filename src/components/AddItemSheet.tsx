import { useEffect, useRef, useState } from "react";
import { db } from "../db/db";
import type { GarmentKind, Item, ItemKind } from "../db/schema";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { removeBackground } from "../lib/bg-remove";

type SubkindOption = { kind: ItemKind; sub: GarmentKind; warmth: Item["warmth"]; formality: Item["formality"] };

const SUBKINDS: SubkindOption[] = [
  // Tops
  { kind: "top", sub: "cami", warmth: 1, formality: 0 },
  { kind: "top", sub: "tee", warmth: 1, formality: 0 },
  { kind: "top", sub: "blouse", warmth: 2, formality: 1 },
  { kind: "top", sub: "knit", warmth: 3, formality: 0 },
  // Bottoms
  { kind: "bottom", sub: "jeans", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "pants", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "skirt", warmth: 2, formality: 0 },
  { kind: "bottom", sub: "shorts", warmth: 1, formality: 0 },
  // Dress
  { kind: "dress", sub: "dress", warmth: 2, formality: 1 },
  // Shoes
  { kind: "shoes", sub: "sneakers", warmth: 1, formality: 0 },
  { kind: "shoes", sub: "boots", warmth: 3, formality: 1 },
  { kind: "shoes", sub: "heels", warmth: 2, formality: 2 },
  { kind: "shoes", sub: "flats", warmth: 1, formality: 1 },
  // Outerwear
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
    // Skip edge pixels — the center is where the garment actually is.
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

export function AddItemSheet({ onClose }: { onClose: () => void }) {
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [subIndex, setSubIndex] = useState<number | null>(null);
  const [cutoutBg, setCutoutBg] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useBlobUrl(photo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picked = subIndex != null ? SUBKINDS[subIndex] : undefined;
  const canSave = !!photo && !!picked && !saving;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPhoto(file);
  };

  const handleSave = async () => {
    if (!photo || !picked) return;
    setSaving(true);
    try {
      const finalPhoto = cutoutBg
        ? await removeBackground(photo).catch(() => photo)
        : photo;
      const primaryColor = await extractPrimaryColor(finalPhoto).catch(() => "#c4a894");
      const now = Date.now();
      const id = `u-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      await db.items.add({
        id,
        kind: picked.kind,
        subkind: picked.sub,
        primaryColor,
        photo: finalPhoto,
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
        <div className="muted">a quick photo and a tag is all it takes</div>

        <section className="sheet-section">
          <div className="sheet-label">photo</div>
          <button
            type="button"
            className="photo-drop"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" />
            ) : (
              <>
                <span className="drop-hint-icon" aria-hidden="true">＋</span>
                <span>tap to take a photo or pick from library</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
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
            <span>✂️ cut out background (best on plain backdrops)</span>
          </label>
        </section>

        <div className="sheet-actions">
          <button type="button" className="m-btn" onClick={onClose}>
            cancel
          </button>
          <button
            type="button"
            className="m-btn primary"
            onClick={handleSave}
            disabled={!canSave}
            style={canSave ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
          >
            {saving ? "saving…" : "save to closet"}
          </button>
        </div>
      </div>
    </>
  );
}
