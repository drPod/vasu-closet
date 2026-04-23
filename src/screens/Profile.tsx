import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { PhoneChrome } from "../components/PhoneChrome";
import { SnapNav, type ScreenKey } from "../components/SnapNav";
import { useBlobUrl } from "../hooks/useBlobUrl";

const WEEK_MS = 7 * 86_400_000;

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
  const avatarUrl = useBlobUrl(profile?.photo);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const now = Date.now();
  const wornThisWeek = items.filter(
    (i) => i.lastWornAt && now - i.lastWornAt < WEEK_MS,
  ).length;

  const replacePhoto = async (file: File | undefined) => {
    if (!file) return;
    await db.profile.update("me", { photo: file });
  };

  const resetApp = async () => {
    if (!confirm("reset the app? your closet, saves, and plans will be wiped.")) return;
    await db.delete();
    location.reload();
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="profile-row"
                style={{ textAlign: "left", width: "100%" }}
                onClick={() => photoInputRef.current?.click()}
              >
                <span>replace my photo</span>
                <span className="chev">›</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: "none" }}
                onChange={(e) => replacePhoto(e.target.files?.[0])}
              />
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
        </div>
      </PhoneChrome>
      <SnapNav current={current} onChange={onNav} />
    </div>
  );
}
