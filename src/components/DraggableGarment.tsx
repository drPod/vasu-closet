import { useEffect, useRef, useState } from "react";
import type { Item, Pose, Transform } from "../db/schema";
import { db } from "../db/db";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { getTransform, photoForPose, withTransform } from "../lib/layout";
import { ItemThumbOf } from "./ItemThumb";

/**
 * A single garment layer on the Mirror stage. Renders the item's real
 * cut-out photo (or a flat-color fallback when there is no photo yet)
 * at the stored transform for the given pose. The user can drag to
 * reposition; on release we persist the new transform back to the item.
 *
 * All positions/sizes are expressed as percentages of the stage so the
 * same layout renders correctly at any screen size.
 */
export function DraggableGarment({
  item,
  pose,
  selected,
  stageRef,
  onSelect,
}: {
  item: Item;
  pose: Pose;
  selected: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
}) {
  const saved = getTransform(item, pose);
  // Pending transform is drag-in-flight local state; it flushes to the DB on release.
  const [pending, setPending] = useState<Transform | null>(null);
  const current = pending ?? saved;
  const photo = photoForPose(item, pose);
  const photoUrl = useBlobUrl(photo);

  const drag = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    stageW: number;
    stageH: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    onSelect();
    const rect = stage.getBoundingClientRect();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: saved.x,
      startY: saved.y,
      stageW: rect.width,
      stageH: rect.height,
    };
    setPending(saved);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = ((e.clientX - d.startClientX) / d.stageW) * 100;
    const dy = ((e.clientY - d.startClientY) / d.stageH) * 100;
    setPending({
      ...saved,
      x: clamp(d.startX + dx, 0, 100),
      y: clamp(d.startY + dy, 0, 100),
    });
  };

  const persist = async (t: Transform) => {
    const layout = withTransform(item.layout, pose, t);
    await db.items.update(item.id, { layout });
  };

  const onPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const next = pending ?? saved;
    setPending(null);
    if (next.x !== saved.x || next.y !== saved.y) await persist(next);
  };

  const bumpScale = async (delta: number) => {
    const next = { ...saved, scale: clamp(saved.scale + delta, 0.3, 2.5) };
    await persist(next);
  };

  const rotateBy = async (delta: number) => {
    const next = { ...saved, rotation: (saved.rotation + delta) % 360 };
    await persist(next);
  };

  const toggleFlip = async () => {
    await persist({ ...saved, flipX: !saved.flipX });
  };

  const resetTransform = async () => {
    const layout = withTransform(item.layout, pose, {
      ...saved,
      ...{ x: 50, y: current.y, scale: 1, rotation: 0, flipX: false },
    });
    await db.items.update(item.id, { layout });
  };

  // When the selection moves off this item, snap any in-flight drag.
  useEffect(() => {
    if (!selected && pending) setPending(null);
  }, [selected, pending]);

  const sx = current.flipX ? -current.scale : current.scale;
  const style: React.CSSProperties = {
    left: `${current.x}%`,
    top: `${current.y}%`,
    transform: `translate(-50%, -50%) rotate(${current.rotation}deg) scale(${sx}, ${current.scale})`,
  };

  return (
    <div
      className={`drag-garment${selected ? " selected" : ""}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="button"
      aria-label={`${item.name ?? item.subkind} on the figure`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" draggable={false} />
      ) : (
        <div className="drag-garment-fallback" data-kind={item.kind}>
          <ItemThumbOf item={item} />
        </div>
      )}
      {selected && (
        <div className="drag-garment-handles" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" aria-label="smaller" onClick={() => bumpScale(-0.1)}>−</button>
          <button type="button" aria-label="bigger" onClick={() => bumpScale(0.1)}>+</button>
          <button type="button" aria-label="rotate" onClick={() => rotateBy(-15)}>↺</button>
          <button type="button" aria-label="rotate" onClick={() => rotateBy(15)}>↻</button>
          <button type="button" aria-label="flip" onClick={toggleFlip}>⇄</button>
          <button type="button" aria-label="reset" onClick={resetTransform}>reset</button>
        </div>
      )}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
