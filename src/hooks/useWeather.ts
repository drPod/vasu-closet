import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { DayForecast } from "../db/schema";

/** Returns the cached forecast row, or undefined while still loading / no cache yet. */
export function useForecast(): DayForecast[] | undefined {
  return useLiveQuery(async () => {
    const row = await db.weather.get("me");
    return row?.days;
  }, []);
}

/** Forecast for a specific ISO date, or undefined if the date is outside the cached window. */
export function useDayForecast(date: string): DayForecast | undefined {
  const forecast = useForecast();
  return forecast?.find((d) => d.date === date);
}
