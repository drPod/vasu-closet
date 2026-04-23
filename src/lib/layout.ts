import type { Item, Layout, Pose, Transform } from "../db/schema";

/**
 * Sensible default transform for a fresh garment on a given pose.
 * Tuned so the piece lands roughly where the wearer would put it
 * without any dragging required.
 */
export function defaultTransform(item: Item, _pose: Pose): Transform {
  switch (item.kind) {
    case "top":
      return { x: 50, y: 30, scale: 0.65, rotation: 0 };
    case "bottom":
      return { x: 50, y: 64, scale: 0.6, rotation: 0 };
    case "dress":
      return { x: 50, y: 50, scale: 0.85, rotation: 0 };
    case "outer":
      return { x: 50, y: 34, scale: 0.75, rotation: 0 };
    case "shoes":
      return { x: 50, y: 92, scale: 0.5, rotation: 0 };
  }
}

/** Look up the saved transform for (item, pose) or return the default. */
export function getTransform(item: Item, pose: Pose): Transform {
  return item.layout?.[pose] ?? defaultTransform(item, pose);
}

/** Immutably update one pose on an item's layout map. */
export function withTransform(layout: Layout | undefined, pose: Pose, t: Transform): Layout {
  return { ...(layout ?? {}), [pose]: t };
}

/** Return the garment photo that matches the given pose, or fall back to front. */
export function photoForPose(item: Item, pose: Pose): Blob | undefined {
  if (pose === "side" && item.photoSide) return item.photoSide;
  if (pose === "back" && item.photoBack) return item.photoBack;
  return item.photo;
}

/** Same idea for the body photo on Profile. */
export function bodyPhotoForPose(
  profile: { photo?: Blob; photoSide?: Blob; photoBack?: Blob } | undefined,
  pose: Pose,
): Blob | undefined {
  if (!profile) return undefined;
  if (pose === "side") return profile.photoSide ?? profile.photo;
  if (pose === "back") return profile.photoBack ?? profile.photo;
  return profile.photo;
}
