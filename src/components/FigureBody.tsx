/**
 * Stylized fashion-illustration body. Used as the Mirror canvas when
 * the user hasn't set their own photo yet. The viewBox coordinates
 * match the garment paths in Mirror.tsx (200×340) so clothing lines
 * up out of the box — it's a paper-doll template, not a real body.
 *
 * Single continuous silhouette: head, torso, tapered legs all drawn
 * as one closed shape with no crotch gap. A minimal face and simple
 * hair cap keep it readable as a person without fighting the overlay.
 */
export function FigureBody() {
  return (
    <svg
      viewBox="0 0 200 340"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="body-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#faf2ec" />
          <stop offset="1" stopColor="#efe0d4" />
        </linearGradient>
        {/* Subtle left-to-right shading so solid skin tone has depth. */}
        <linearGradient id="body-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="200" height="340" fill="url(#body-bg)" />

      {/* Single tapered silhouette: head → shoulders → torso → hips → legs,
          no crotch gap. Arms are implied by the shoulder flare. */}
      <g>
        <path
          d="M100 30
             Q86 30 86 44
             Q86 54 92 60
             L88 64
             Q70 68 66 86
             L72 138
             L76 210
             L78 296
             L80 330
             L120 330
             L122 296
             L124 210
             L128 138
             L134 86
             Q130 68 112 64
             L108 60
             Q114 54 114 44
             Q114 30 100 30 Z"
          fill="#e3bfa1"
        />
        <path
          d="M100 30
             Q86 30 86 44
             Q86 54 92 60
             L88 64
             Q70 68 66 86
             L72 138
             L76 210
             L78 296
             L80 330
             L120 330
             L122 296
             L124 210
             L128 138
             L134 86
             Q130 68 112 64
             L108 60
             Q114 54 114 44
             Q114 30 100 30 Z"
          fill="url(#body-shade)"
        />
      </g>

      {/* Hair cap — simple rounded shape sitting on the head. */}
      <path
        d="M82 32
           Q80 18 100 18
           Q120 18 118 32
           Q118 24 100 24
           Q82 24 82 32 Z"
        fill="#2a1e18"
      />

      {/* Soft ground shadow. */}
      <ellipse cx="100" cy="336" rx="34" ry="3" fill="#c4a894" opacity="0.35" />
    </svg>
  );
}
