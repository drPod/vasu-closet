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
      {/* Warm backdrop gradient. */}
      <defs>
        <linearGradient id="body-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#faf2ec" />
          <stop offset="1" stopColor="#efe0d4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="340" fill="url(#body-bg)" />

      {/* Body silhouette — stylized croquis. */}
      <g fill="#e3bfa1" stroke="#c4a092" strokeWidth="0.5">
        {/* Neck + torso + legs. Arms are dropped to the sides. */}
        <path
          d="M100 34
             Q87 34 87 46
             Q87 54 91 58
             L85 64
             Q68 68 65 82
             L64 138
             L68 154
             L74 154
             L78 138
             L80 94
             L86 92
             L84 108
             L86 210
             L90 300
             L94 326
             L99 326
             L100 238
             L101 326
             L106 326
             L110 300
             L114 210
             L116 108
             L114 92
             L120 94
             L122 138
             L126 154
             L132 154
             L136 138
             L135 82
             Q132 68 115 64
             L109 58
             Q113 54 113 46
             Q113 34 100 34 Z"
        />
      </g>

      {/* Simple hair cap + implied face — kept deliberately featureless so
          it reads as a template, not a person. */}
      <path
        d="M82 36
           Q80 22 100 20
           Q120 22 118 36
           Q118 30 100 28
           Q82 30 82 36 Z"
        fill="#2a1e18"
      />

      {/* Soft ground shadow. */}
      <ellipse cx="100" cy="332" rx="28" ry="3" fill="#c4a894" opacity="0.35" />
    </svg>
  );
}
