import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Item, Plan } from "../db/schema";
import { ItemThumbOf } from "../components/ItemThumb";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { useForecast } from "../hooks/useWeather";

const TODAY = "2026-04-22";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** The ISO date of the Monday on or before `iso`. */
function mondayOf(iso: string): string {
  const d = parseDate(iso);
  // 0=Sun,1=Mon,...,6=Sat — shift so Mon=0.
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return isoOf(d);
}

function weekStarting(iso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(iso, i));
}

type DayRowStatus = "past" | "today" | "empty" | "planned" | "worn";

function dayStatus(iso: string, plan: Plan | undefined): DayRowStatus {
  if (iso === TODAY) return "today";
  const hasOutfit = plan && (plan.topId || plan.bottomId || plan.dressId);
  if (!hasOutfit) return "empty";
  if (iso < TODAY) return plan?.status === "worn" ? "worn" : "past";
  return "planned";
}

function MiniOutfit({ top, bot, dress }: { top?: Item; bot?: Item; dress?: Item }) {
  if (dress) {
    return (
      <div className="cal-outfit-thumb">
        <div className="ot-top" style={{ flex: 2 }}>
          <div style={{ width: 42, height: 56 }}>
            <ItemThumbOf item={dress} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="cal-outfit-thumb">
      <div className="ot-top">
        {top && (
          <div style={{ width: 42, height: 30 }}>
            <ItemThumbOf item={top} />
          </div>
        )}
      </div>
      <div className="ot-bot">
        {bot && (
          <div style={{ width: 42, height: 34 }}>
            <ItemThumbOf item={bot} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CalendarScreen({
  current,
  onNav,
  onPlanDay,
}: {
  current: ScreenKey;
  onNav: (key: ScreenKey) => void;
  onPlanDay: (date: string) => void;
}) {
  const [weekStart, setWeekStart] = useState<string>(() => mondayOf(TODAY));
  const dates = useMemo(() => weekStarting(weekStart), [weekStart]);
  const weekEnd = dates[6];

  const plans =
    useLiveQuery(
      () => db.plans.where("date").between(dates[0], weekEnd, true, true).toArray(),
      [dates[0], weekEnd],
    ) ?? [];
  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const forecast = useForecast();
  const forecastByDate = useMemo(
    () => new Map((forecast ?? []).map((d) => [d.date, d])),
    [forecast],
  );

  const startD = parseDate(dates[0]);
  const endD = parseDate(dates[6]);
  const thisWeekStart = mondayOf(TODAY);
  const isThisWeek = weekStart === thisWeekStart;

  const headerLabel = isThisWeek
    ? "this week"
    : weekStart > thisWeekStart
      ? "next week"
      : "last week";
  const rangeLabel = `${MONTH_SHORT[startD.getMonth()]} ${startD.getDate()} — ${MONTH_SHORT[endD.getMonth()]} ${endD.getDate()}`;

  return (
    <div className="screen-root">
      <PhoneChrome>
        <div className="body">
          <header className="cal-week-head">
            <div>
              <h1 className="display-title">{headerLabel}</h1>
              <div className="muted">{rangeLabel}</div>
            </div>
            <div className="cal-nav-arrows">
              <button
                type="button"
                className="cal-arrow"
                aria-label="previous week"
                onClick={() => setWeekStart((s) => addDays(s, -7))}
              >
                ‹
              </button>
              <button
                type="button"
                className="cal-arrow"
                aria-label="next week"
                onClick={() => setWeekStart((s) => addDays(s, 7))}
              >
                ›
              </button>
            </div>
          </header>

          <div className="cal-body">
            {dates.map((iso) => {
              const plan = plans.find((p) => p.date === iso);
              const status = dayStatus(iso, plan);
              const d = parseDate(iso);
              const dow = DOW[d.getDay()];
              const num = d.getDate();
              const top = plan?.topId ? byId.get(plan.topId) : undefined;
              const bot = plan?.bottomId ? byId.get(plan.bottomId) : undefined;
              const dress = plan?.dressId ? byId.get(plan.dressId) : undefined;
              const hasOutfit = !!(top || bot || dress);
              const dayWx = forecastByDate.get(iso);
              const weatherText = dayWx
                ? `${dayWx.icon} ${dayWx.temp}° · ${dayWx.note}`
                : plan?.weatherNote ?? "";

              const cls =
                "cal-day" +
                (status === "today" ? " today" : "") +
                (status === "empty" ? " empty" : "");

              return (
                <button
                  key={iso}
                  type="button"
                  className={cls}
                  onClick={() => onPlanDay(iso)}
                  style={{
                    textAlign: "left",
                    width: "100%",
                    cursor: "pointer",
                  }}
                >
                  <div className="cal-day-date">
                    <div className="cal-day-dow">{dow}</div>
                    <div className="cal-day-num">{num}</div>
                  </div>
                  <div className="cal-day-outfit">
                    {hasOutfit ? (
                      <MiniOutfit top={top} bot={bot} dress={dress} />
                    ) : (
                      <div className="cal-plus" aria-hidden="true">+</div>
                    )}
                    <div className="cal-day-meta">
                      <div className="cal-day-event">{plan?.event ?? ""}</div>
                      <div className="cal-day-weather">{weatherText}</div>
                      {status === "empty" && (
                        <div className="cal-day-empty-cta">plan an outfit</div>
                      )}
                      {status === "planned" && (
                        <div
                          className="cal-day-weather"
                          style={{ color: "#c88a8f", fontWeight: 500 }}
                        >
                          · planned
                        </div>
                      )}
                      {status === "today" && (
                        <div
                          className="cal-day-weather"
                          style={{ color: "#c88a8f", fontWeight: 500 }}
                        >
                          · wearing now
                        </div>
                      )}
                      {status === "worn" && (
                        <div className="cal-day-weather" style={{ opacity: 0.7 }}>
                          · worn
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="cal-month-chip">
              {isThisWeek ? `next week · ${MONTH_SHORT[parseDate(addDays(dates[0], 7)).getMonth()]} ${parseDate(addDays(dates[0], 7)).getDate()}` : ""}
            </div>
          </div>
        </div>
      </PhoneChrome>
      <SnapNav current={current} onChange={onNav} />
    </div>
  );
}
