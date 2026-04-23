/**
 * Stylized fashion-illustration body. Used as the Mirror canvas when
 * the user hasn't set their own photo yet. The viewBox coordinates
 * match the garment paths in Mirror.tsx (200×340) so clothing lines
 * up out of the box — it's a paper-doll template, not a real body.
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
        <linearGradient id="body-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="200" height="340" fill="url(#body-bg)" />

      {/* Arms — rendered first so garment overlays sit in front of the
          shoulder. Narrow tapered shapes reaching down to mid-thigh. */}
      <g fill="#e3bfa1">
        {/* left arm */}
        <path
          d="M68 82
             Q60 94 58 122
             L54 200
             L52 248
             L56 258
             L64 258
             L66 248
             L68 200
             L70 122
             Q72 98 76 90 Z"
        />
        {/* right arm */}
        <path
          d="M132 82
             Q140 94 142 122
             L146 200
             L148 248
             L144 258
             L136 258
             L134 248
             L132 200
             L130 122
             Q128 98 124 90 Z"
        />
      </g>

      {/* Torso + legs — single continuous silhouette, tapered, no crotch gap. */}
      <g>
        <path
          d="M100 30
             Q86 30 86 44
             Q86 54 92 60
             L88 64
             Q72 68 70 86
             L74 138
             L76 210
             L80 298
             L83 330
             L117 330
             L120 298
             L124 210
             L126 138
             L130 86
             Q128 68 112 64
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
             Q72 68 70 86
             L74 138
             L76 210
             L80 298
             L83 330
             L117 330
             L120 298
             L124 210
             L126 138
             L130 86
             Q128 68 112 64
             L108 60
             Q114 54 114 44
             Q114 30 100 30 Z"
          fill="url(#body-shade)"
        />
      </g>

      {/* Hair — softly curved cap covering most of the head. */}
      <path
        d="M82 34
           Q80 16 100 16
           Q120 16 118 34
           Q124 30 122 44
           Q120 28 100 26
           Q80 28 78 44
           Q76 30 82 34 Z"
        fill="#2a1e18"
      />

      {/* Very subtle cheek blush. */}
      <ellipse cx="92" cy="48" rx="3" ry="2" fill="#c88a8f" opacity="0.3" />
      <ellipse cx="108" cy="48" rx="3" ry="2" fill="#c88a8f" opacity="0.3" />

      {/* Ground shadow — an oval pool under the feet. */}
      <ellipse cx="100" cy="336" rx="34" ry="3" fill="#c4a894" opacity="0.4" />
    </svg>
  );
}
