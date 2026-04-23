import { useEffect, useState } from "react";
import { MirrorScreen, type MirrorPreset } from "./screens/Mirror";
import { ClosetScreen } from "./screens/Closet";
import { CalendarScreen } from "./screens/Calendar";
import { LookbookScreen } from "./screens/Lookbook";
import { ProfileScreen } from "./screens/Profile";
import type { ScreenKey } from "./components/SnapNav";
import { seedIfEmpty } from "./db/seed";
import { ensureWeather } from "./lib/weather-api";
import type { Item } from "./db/schema";

export function App() {
  const [screen, setScreen] = useState<ScreenKey>("closet");
  const [planningDate, setPlanningDate] = useState<string | null>(null);
  const [preset, setPreset] = useState<MirrorPreset | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty().then(() => {
      setReady(true);
      // Fire-and-forget: network + geolocation can be slow/denied; the UI
      // falls back to cached or empty weather in the meantime.
      ensureWeather().catch(() => {});
    });
  }, []);

  const go = (s: ScreenKey) => {
    setScreen(s);
    // A plain nav-tab tap resets any transient "intent" piped into Mirror.
    if (s !== "mirror") {
      setPlanningDate(null);
      setPreset(null);
    }
  };

  const planFor = (date: string) => {
    setPlanningDate(date);
    setPreset(null);
    setScreen("mirror");
  };

  const tryOn = (item: Item) => {
    const p: MirrorPreset = {};
    if (item.kind === "top") p.topId = item.id;
    else if (item.kind === "bottom") p.botId = item.id;
    else if (item.kind === "dress") p.dressId = item.id;
    else if (item.kind === "outer") p.outerId = item.id;
    else if (item.kind === "shoes") p.shoesId = item.id;
    setPreset(p);
    setPlanningDate(null);
    setScreen("mirror");
  };

  const clearMirrorIntent = () => {
    setPlanningDate(null);
    setPreset(null);
  };

  if (!ready) return null;

  switch (screen) {
    case "mirror":
      return (
        <MirrorScreen
          current={screen}
          onNav={go}
          planningDate={planningDate}
          preset={preset}
          clearIntent={clearMirrorIntent}
        />
      );
    case "closet":
      return <ClosetScreen current={screen} onNav={go} onTryOn={tryOn} />;
    case "calendar":
      return <CalendarScreen current={screen} onNav={go} onPlanDay={planFor} />;
    case "lookbook":
      return <LookbookScreen current={screen} onNav={go} />;
    case "profile":
      return <ProfileScreen current={screen} onNav={go} />;
  }
}
