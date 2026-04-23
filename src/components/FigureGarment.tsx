import { useId } from "react";
import type { Item } from "../db/schema";
import { useBlobUrl } from "../hooks/useBlobUrl";

/**
 * Renders a single garment layer on the Mirror figure.
 *
 * The photo underneath already shows a person wearing their own clothes,
 * so we first lay down a soft neutral "paper" inside the garment silhouette
 * to hide that — then stack the selected garment (photo or flat color)
 * on top with a faint inner shadow so it reads as an overlaid dress-up
 * piece instead of paper glued onto a photo.
 */
export function FigureGarment({
  item,
  path,
  opacity = 1,
}: {
  item: Item;
  path: string;
  opacity?: number;
}) {
  const clipId = useId();
  const shadowId = useId();
  const photoUrl = useBlobUrl(item.photo);

  return (
    <g opacity={opacity}>
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* 1. Neutral "paper" underlay — wipes out the real outfit behind. */}
      <path d={path} fill="#faf5f1" />

      {/* 2. The garment itself, either real photo or solid color. */}
      {photoUrl ? (
        <image
          href={photoUrl}
          x="0"
          y="0"
          width="200"
          height="340"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <path d={path} fill={item.primaryColor} clipPath={`url(#${clipId})`} />
      )}

      {/* 3. Soft inner shadow along the path edge so the garment has depth. */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
        filter={`url(#${shadowId})`}
      />

      {/* 4. Crisp outline. */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </g>
  );
}
