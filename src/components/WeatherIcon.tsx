type Props = { code: number; size?: number };

/**
 * Small SVG weather glyph. Mapped from WMO codes, kept simple + on-brand.
 * Avoids cross-platform emoji font inconsistencies.
 */
export function WeatherIcon({ code, size = 14 }: Props) {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (code === 0) {
    // Clear — sun
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
    );
  }
  if (code <= 3) {
    // Partly cloudy
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M5.5 9.5l.6.6M2.5 8h1M8 2.5v1M10.5 5.5l-.6.6" />
        <path d="M6 17a4 4 0 0 1 3.9-4 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 18 21H7a3 3 0 0 1-1-4z" />
      </svg>
    );
  }
  if (code === 45 || code === 48) {
    // Fog
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 7h16M4 12h14M6 17h12M5 22h13" />
      </svg>
    );
  }
  if (code >= 51 && code <= 67) {
    // Rain
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 14a4 4 0 0 1 3.9-4 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 18H7a3 3 0 0 1-2-4z" />
        <path d="M9 20l-.8 2M13 20l-.8 2M17 20l-.8 2" />
      </svg>
    );
  }
  if (code >= 71 && code <= 77) {
    // Snow
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 2v20M4.5 6l15 12M4.5 18l15-12" />
      </svg>
    );
  }
  if (code >= 80 && code <= 82) {
    // Showers
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 14a4 4 0 0 1 3.9-4 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 18H7a3 3 0 0 1-2-4z" />
        <path d="M8 19l-1 3M12 19l-1 3M16 19l-1 3" />
      </svg>
    );
  }
  if (code >= 95) {
    // Thunderstorm
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 13a4 4 0 0 1 3.9-4 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 17H7a3 3 0 0 1-2-4z" />
        <path d="M11 14l-2 4h3l-2 5" />
      </svg>
    );
  }
  // Overcast / default cloud
  return (
    <svg {...common} aria-hidden="true">
      <path d="M5 15a4 4 0 0 1 3.9-4 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 19H7a3 3 0 0 1-2-4z" />
    </svg>
  );
}
