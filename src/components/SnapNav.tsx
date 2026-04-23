export type ScreenKey = "lookbook" | "mirror" | "closet" | "calendar" | "profile";

type NavItem = {
  key: ScreenKey;
  label: string;
  icon: "heart" | "mirror" | "hanger" | "cal" | "person";
  hero?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "lookbook", label: "lookbook", icon: "heart" },
  { key: "mirror", label: "mirror", icon: "mirror" },
  { key: "closet", label: "closet", icon: "hanger", hero: true },
  { key: "calendar", label: "calendar", icon: "cal" },
  { key: "profile", label: "profile", icon: "person" },
];

function NavIcon({
  name,
  size = 18,
  stroke = "currentColor",
}: {
  name: NavItem["icon"];
  size?: number;
  stroke?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      );
    case "mirror":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="9" rx="7" ry="7" />
          <path d="M12 16v5M9 21h6" />
        </svg>
      );
    case "hanger":
      return (
        <svg {...common}>
          <path d="M12 8a2 2 0 1 1 2-2" />
          <path d="M12 8v3" />
          <path d="M12 11 3 17a1 1 0 0 0 .6 1.8h16.8A1 1 0 0 0 21 17l-9-6z" />
        </svg>
      );
    case "cal":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "person":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      );
  }
}

export function SnapNav({
  current,
  onChange,
}: {
  current: ScreenKey;
  onChange: (key: ScreenKey) => void;
}) {
  return (
    <nav className="snap-nav" aria-label="primary">
      {NAV_ITEMS.map((item) => {
        const isOn = current === item.key;
        const isHero = !!item.hero;
        const cls = `snap-tab${isOn ? " on" : ""}${isHero ? " hero" : ""}`;
        return (
          <button
            key={item.key}
            type="button"
            className={cls}
            onClick={() => onChange(item.key)}
            aria-current={isOn ? "page" : undefined}
            aria-label={item.label}
          >
            {isHero ? (
              <span className="hero-pill">
                <NavIcon name={item.icon} size={22} stroke={isOn ? "#fff" : "#fff"} />
              </span>
            ) : (
              <NavIcon name={item.icon} size={18} stroke={isOn ? "#2a1f1c" : "#a89a97"} />
            )}
            {!isHero && <span className="snap-label">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
