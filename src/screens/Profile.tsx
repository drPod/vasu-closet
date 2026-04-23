import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { useBlobUrl } from "../hooks/useBlobUrl";
import type { Pose } from "../db/schema";
import { WeatherIcon } from "../components/WeatherIcon";

const WEEK_MS = 7 * 86_400_000;

const POSES: { key: Pose; label: string; desc: string }[] = [
  { key: "front", label: "front", desc: "facing the camera, arms at your sides" },
  { key: "side", label: "side", desc: "profile view" },
  { key: "back", label: "back", desc: "facing away" },
];

function BodyPhotoRow({ pose, label, desc }: { pose: Pose; label: string; desc: string }) {
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const blob =
    pose === "front" ? profile?.photo : pose === "side" ? profile?.photoSide : profile?.photoBack;
  const url = useBlobUrl(blob);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const patch =
      pose === "front" ? { photo: file } : pose === "side" ? { photoSide: file } : { photoBack: file };
    await db.profile.update("me", patch);
  };

  const remove = async () => {
    const patch =
      pose === "front"
        ? { photo: undefined }
        : pose === "side"
          ? { photoSide: undefined }
          : { photoBack: undefined };
    await db.profile.update("me", patch);
  };

  return (
    <div className="body-photo-row">
      <button
        type="button"
        className="body-photo-slot"
        onClick={() => inputRef.current?.click()}
        aria-label={`upload ${label} photo`}
      >
        {url ? (
          <img src={url} alt="" />
        ) : (
          <span className="body-photo-empty">＋</span>
        )}
      </button>
      <div className="body-photo-meta">
        <div className="body-photo-label">{label}</div>
        <div className="body-photo-desc">{desc}</div>
        {url && (
          <button type="button" className="body-photo-remove" onClick={remove}>
            remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}

export function ProfileScreen({
  current,
  onNav,
}: {
  current: ScreenKey;
  onNav: (key: ScreenKey) => void;
}) {
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const outfits = useLiveQuery(() => db.outfits.count(), []) ?? 0;
  const weather = useLiveQuery(() => db.weather.get("me"), []);
  const avatarUrl = useBlobUrl(profile?.photo);

  const now = Date.now();
  const wornThisWeek = items.filter(
    (i) => i.lastWornAt && now - i.lastWornAt < WEEK_MS,
  ).length;

  const resetApp = async () => {
    if (!confirm("reset the app? your closet, saves, and plans will be wiped.")) return;
    await db.delete();
    location.reload();
  };

  const clearSamples = async () => {
    const count = await db.items.filter((i) => !!i.seed).count();
    if (count === 0) {
      alert("no sample pieces to remove. your closet is all yours.");
      return;
    }
    if (
      !confirm(
        `remove the ${count} sample pieces? your uploads stay put. you can bring samples back with reset app.`,
      )
    )
      return;
    await db.items.filter((i) => !!i.seed).delete();
  };

  return (
    <div className="screen-root">
      <PhoneChrome>
        <div className="body" style={{ padding: 0 }}>
          <div className="profile-body">
            <header className="screen-header" style={{ marginBottom: 0 }}>
              <div>
                <h1 className="display-title">profile</h1>
                <div className="muted">you & your settings</div>
              </div>
            </header>

            <div className="profile-hero">
              <div
                className="profile-avatar"
                style={
                  avatarUrl
                    ? {
                        backgroundImage: `url(${avatarUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 4%",
                      }
                    : undefined
                }
                aria-hidden="true"
              />
              <div>
                <div className="profile-name">{profile?.name ?? "you"}</div>
                <div className="profile-handle">
                  {profile?.handle ?? "@you"} · {outfits} saved
                </div>
              </div>
            </div>

            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-num">{items.length}</div>
                <div className="profile-stat-label">pieces</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{outfits}</div>
                <div className="profile-stat-label">saved</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-num">{wornThisWeek}</div>
                <div className="profile-stat-label">worn</div>
              </div>
            </div>

            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">your photos</h2>
                <div className="profile-section-desc">
                  upload a front, side, and back view. the Mirror switches between
                  them so you can try on outfits from every angle.
                </div>
              </div>
              {POSES.map(({ key, label, desc }) => (
                <BodyPhotoRow key={key} pose={key} label={label} desc={desc} />
              ))}
            </section>

            {weather && (
              <div className="weather-source-chip">
                {weather.days[0] && (
                  <WeatherIcon code={weather.days[0].code} size={14} />
                )}
                <span>
                  weather ·{" "}
                  {weather.source === "gps"
                    ? "your location"
                    : "Los Angeles (default — grant location for yours)"}
                </span>
              </div>
            )}

            <button
              type="button"
              className="profile-row"
              style={{ textAlign: "left", width: "100%", marginTop: 6 }}
              onClick={clearSamples}
            >
              <span>clear sample pieces · keep my uploads</span>
              <span className="chev">›</span>
            </button>
            <button
              type="button"
              className="profile-row danger"
              style={{ textAlign: "left", width: "100%" }}
              onClick={resetApp}
            >
              <span>reset app · wipe all data</span>
              <span className="chev">›</span>
            </button>
          </div>
        </div>
      </PhoneChrome>
      <SnapNav current={current} onChange={onNav} />
    </div>
  );
}
