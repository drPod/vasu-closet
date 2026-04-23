import { useId } from "react";
import type { Item } from "../db/schema";
import { useBlobUrl } from "../hooks/useBlobUrl";

/**
 * Renders a single garment layer on the Mirror figure.
 * - If the item has a real photo: SVG image clipped to the garment path.
 * - Otherwise: a flat-color path using the extracted primary color.
 * A thin border always traces the path so the shape reads clearly.
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
  const photoUrl = useBlobUrl(item.photo);

  if (photoUrl) {
    return (
      <g opacity={opacity}>
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>
        <image
          href={photoUrl}
          x="0"
          y="0"
          width="200"
          height="340"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        <path
          d={path}
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  return (
    <path
      d={path}
      fill={item.primaryColor}
      stroke="rgba(0,0,0,0.2)"
      strokeWidth="0.6"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}
