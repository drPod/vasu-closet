import { useEffect, useId, useState } from "react";
import type { GarmentKind, Item, Pattern } from "../db/schema";

const PATHS: Record<GarmentKind, string> = {
  tee: "M24 14 Q14 20 12 32 L22 36 L22 78 L58 78 L58 36 L68 32 Q66 20 56 14 Q48 20 40 18 Q32 20 24 14 Z",
  knit: "M20 16 Q12 24 12 34 L22 38 L20 80 L60 80 L60 38 L68 34 Q68 24 60 16 L52 18 Q40 24 28 18 Z",
  blouse: "M24 14 Q14 22 14 32 L22 36 L20 80 L60 80 L58 36 L66 32 Q66 22 56 14 L40 22 Z",
  cami: "M28 14 L32 18 L28 78 L52 78 L48 18 L52 14 L52 20 L48 22 L32 22 L28 20 Z",
  jeans: "M26 10 L54 10 L52 38 L58 82 L46 82 L42 42 L38 42 L34 82 L22 82 L28 38 Z",
  pants: "M26 10 L54 10 L52 38 L58 82 L46 82 L42 42 L38 42 L34 82 L22 82 L28 38 Z",
  skirt: "M26 12 L54 12 L62 62 L18 62 Z",
  shorts: "M26 12 L54 12 L52 30 L58 54 L46 54 L42 32 L38 32 L34 54 L22 54 L28 30 Z",
  dress: "M24 14 L56 14 L54 38 L62 90 L18 90 L26 38 Z",
  sneakers:
    "M8 54 L12 48 Q18 42 30 44 L54 50 Q64 52 68 58 L72 68 L68 74 L12 74 Q8 72 8 68 Z",
  boots:
    "M18 20 L52 20 L52 50 Q58 52 60 58 L68 74 L12 74 L10 60 Q14 52 18 50 Z",
  heels:
    "M10 52 Q18 42 32 44 L56 50 Q66 52 70 60 L70 72 L58 72 L54 68 L18 70 L14 66 L10 60 Z",
  flats:
    "M10 58 Q18 52 32 54 L56 58 Q66 58 70 64 L70 72 L10 72 Z",
  jacket:
    "M16 14 Q10 22 12 34 L18 80 L36 80 L40 22 L44 80 L62 80 L68 34 Q70 22 64 14 L56 12 L44 22 L40 22 L36 12 Z",
  coat:
    "M18 14 Q10 24 12 38 L16 90 L38 90 L40 24 L42 90 L64 90 L68 38 Q70 24 62 14 L54 12 L42 24 L40 24 L38 12 Z",
  cardigan:
    "M20 18 Q14 26 14 38 L20 82 L38 82 L40 28 L42 82 L60 82 L66 38 Q66 26 60 18 L54 16 L42 28 L40 28 L38 16 Z",
};

function PatternOverlay({ clipId, pattern }: { clipId: string; pattern: Pattern }) {
  return (
    <g clipPath={`url(#${clipId})`} opacity="0.45">
      {pattern === "stripe" &&
        Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={10 + i * 7}
            x2="80"
            y2={10 + i * 7}
            stroke="#fff"
            strokeWidth="1.4"
          />
        ))}
      {pattern === "floral" && (
        <g fill="#fff">
          <circle cx="26" cy="34" r="2.2" />
          <circle cx="48" cy="42" r="2.2" />
          <circle cx="32" cy="56" r="2.2" />
          <circle cx="54" cy="62" r="2.2" />
          <circle cx="38" cy="70" r="2.2" />
        </g>
      )}
    </g>
  );
}

function usePhotoUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

type ThumbProps = Pick<Item, "subkind" | "primaryColor" | "pattern"> & {
  photo?: Blob;
};

export function ItemThumb({ subkind, primaryColor, pattern, photo }: ThumbProps) {
  const photoUrl = usePhotoUrl(photo);
  const path = PATHS[subkind] ?? PATHS.tee;
  const clipId = useId();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    );
  }

  return (
    <svg viewBox="0 0 80 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <path
        d={path}
        fill={primaryColor}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {pattern && <PatternOverlay clipId={clipId} pattern={pattern} />}
    </svg>
  );
}

/** Convenience wrapper when you have the whole Item. */
export function ItemThumbOf({ item }: { item: Item }) {
  return (
    <ItemThumb
      subkind={item.subkind}
      primaryColor={item.primaryColor}
      pattern={item.pattern}
      photo={item.photo}
    />
  );
}
