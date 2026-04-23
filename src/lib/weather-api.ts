import { db } from "../db/db";
import type { DayForecast } from "../db/schema";

// Los Angeles — fallback when geolocation is denied or times out.
const FALLBACK_LAT = 34.05;
const FALLBACK_LON = -118.24;

const GEO_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("no geolocation"));
    const timer = window.setTimeout(() => reject(new Error("timeout")), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 60 * 60 * 1000 },
    );
  });
}

// Map Open-Meteo weather codes (WMO) to a single emoji.
function iconForCode(code: number): string {
  if (code === 0) return "☀";
  if (code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 51 && code <= 67) return "🌧";
  if (code >= 71 && code <= 77) return "❄";
  if (code >= 80 && code <= 82) return "🌦";
  if (code >= 95) return "⛈";
  return "☁";
}

function noteForTemp(temp: number): string {
  if (temp >= 85) return "hot";
  if (temp >= 75) return "warm";
  if (temp >= 65) return "light layer";
  if (temp >= 55) return "cool";
  if (temp >= 40) return "cold";
  return "bundle up";
}

async function fetchForecast(lat: number, lon: number): Promise<DayForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const json = (await res.json()) as {
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weather_code: number[];
    };
  };
  return json.daily.time.map((date, i) => {
    const tempMax = Math.round(json.daily.temperature_2m_max[i]);
    const tempMin = Math.round(json.daily.temperature_2m_min[i]);
    const code = json.daily.weather_code[i];
    const temp = Math.round((tempMax + tempMin) / 2);
    return {
      date,
      tempMax,
      tempMin,
      temp,
      code,
      icon: iconForCode(code),
      note: noteForTemp(temp),
    };
  });
}

/**
 * Refresh the cached forecast if it's missing or stale (> 6h old).
 * Always resolves — network and permission errors are swallowed so the app
 * keeps working offline, and the UI falls back to whatever's cached (or nothing).
 */
export async function ensureWeather(): Promise<void> {
  const cached = await db.weather.get("me");
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return;

  let lat = cached?.lat;
  let lon = cached?.lon;
  let source: "gps" | "fallback" = cached?.source ?? "fallback";

  if (lat == null || lon == null) {
    try {
      const loc = await getLocation();
      lat = loc.lat;
      lon = loc.lon;
      source = "gps";
    } catch {
      lat = FALLBACK_LAT;
      lon = FALLBACK_LON;
      source = "fallback";
    }
  }

  try {
    const days = await fetchForecast(lat, lon);
    await db.weather.put({ id: "me", fetchedAt: now, lat, lon, source, days });
  } catch {
    // Leave any existing cache in place; if none exists, the UI just shows no weather.
  }
}
