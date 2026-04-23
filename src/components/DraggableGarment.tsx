import { useEffect, useRef, useState } from "react";
import type { Item, Pose, Transform } from "../db/schema";
import { db } from "../db/db";
import { useBlobUrl } from "../hooks/useBlobUrl";
import { getTransform, photoForPose, withTransform } from "../lib/layout";
import { ItemThumbOf } from "./ItemThumb";

/**
 * A single garment layer on the Mirror stage.
 *
 * Interactions:
 *   - 1 pointer:   drag to reposition (percent of stage)
 *   - 2 pointers:  pinch to scale + rotate (natural touch gesture)
 *   - Tap:         select the garment, revealing the handle bar for
 *                  precision adjustments (+/-, rotate, flip, reset).
 *
 * All transforms are persisted on pointer-up to `item.layout[pose]`.
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
  const [pending, setPending] = useState<Transform | null>(null);
  const current = pending ?? saved;
  const photo = photoForPose(item, pose);
  const photoUrl = useBlobUrl(photo);

  // Tracking map: pointerId -> {clientX, clientY}. Up to 2 concurrent.
  const pointers = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  );
  // Snapshot at the moment the current gesture started.
  const gesture = useRef<{
    stageW: number;
    stageH: number;
    start: Transform;
    // For 1-finger drag
    anchor?: { clientX: number; clientY: number };
    // For 2-finger pinch/rotate
    twoFinger?: {
      startDist: number;
      startAngle: number;
      startCenter: { clientX: number; clientY: number };
    };
  } | null>(null);

  const beginGesture = (el: Element) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    gesture.current = {
      stageW: rect.width,
      stageH: rect.height,
      start: saved,
    };
    const arr = [...pointers.current.values()];
    if (arr.length === 1) {
      gesture.current.anchor = { clientX: arr[0].clientX, clientY: arr[0].clientY };
    } else if (arr.length >= 2) {
      const [a, b] = arr;
      gesture.current.twoFinger = {
        startDist: dist(a, b),
        startAngle: angle(a, b),
        startCenter: mid(a, b),
      };
    }
    void el;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onSelect();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    beginGesture(e.currentTarget);
    setPending(saved);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    const g = gesture.current;
    if (!g) return;

    const arr = [...pointers.current.values()];
    if (arr.length >= 2 && g.twoFinger) {
      const [a, b] = arr;
      const nowDist = dist(a, b);
      const nowAngle = angle(a, b);
      const center = mid(a, b);
      const scaleFactor = nowDist / g.twoFinger.startDist;
      const rotDelta = nowAngle - g.twoFinger.startAngle;
      const cxShift = ((center.clientX - g.twoFinger.startCenter.clientX) / g.stageW) * 100;
      const cyShift = ((center.clientY - g.twoFinger.startCenter.clientY) / g.stageH) * 100;
      setPending({
        ...g.start,
        x: clamp(g.start.x + cxShift, 0, 100),
        y: clamp(g.start.y + cyShift, 0, 100),
        scale: clamp(g.start.scale * scaleFactor, 0.25, 3),
        rotation: g.start.rotation + rotDelta,
      });
    } else if (arr.length === 1 && g.anchor) {
      const p = arr[0];
      const dx = ((p.clientX - g.anchor.clientX) / g.stageW) * 100;
      const dy = ((p.clientY - g.anchor.clientY) / g.stageH) * 100;
      setPending({
        ...g.start,
        x: clamp(g.start.x + dx, 0, 100),
        y: clamp(g.start.y + dy, 0, 100),
      });
    }
  };

  const persist = async (t: Transform) => {
    const layout = withTransform(item.layout, pose, t);
    await db.items.update(item.id, { layout });
  };

  const endPointer = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    // If there's still one pointer down, keep dragging with it.
    if (pointers.current.size > 0) {
      gesture.current = {
        stageW: gesture.current?.stageW ?? 0,
        stageH: gesture.current?.stageH ?? 0,
        start: pending ?? saved,
        anchor: [...pointers.current.values()][0],
      };
      return;
    }
    const next = pending ?? saved;
    gesture.current = null;
    setPending(null);
    const changed =
      next.x !== saved.x ||
      next.y !== saved.y ||
      next.scale !== saved.scale ||
      next.rotation !== saved.rotation;
    if (changed) await persist(next);
  };

  const bumpScale = (delta: number) =>
    persist({ ...saved, scale: clamp(saved.scale + delta, 0.3, 2.5) });
  const rotateBy = (delta: number) =>
    persist({ ...saved, rotation: (saved.rotation + delta) % 360 });
  const toggleFlip = () => persist({ ...saved, flipX: !saved.flipX });
  const resetTransform = () =>
    persist({ ...saved, x: 50, y: current.y, scale: 1, rotation: 0, flipX: false });
  /** Copy the current pose's transform to the other two poses. */
  const applyToAllPoses = async () => {
    const layout = { front: saved, side: saved, back: saved };
    await db.items.update(item.id, { layout });
  };

  useEffect(() => {
    if (!selected && pending) {
      setPending(null);
      pointers.current.clear();
      gesture.current = null;
    }
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
      data-placeholder={photoUrl ? undefined : "true"}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
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
          <button type="button" aria-label="rotate left" onClick={() => rotateBy(-15)}>↺</button>
          <button type="button" aria-label="rotate right" onClick={() => rotateBy(15)}>↻</button>
          <button type="button" aria-label="flip" onClick={toggleFlip}>⇄</button>
          <button
            type="button"
            aria-label="apply this layout to all poses"
            title="apply this layout to side + back"
            onClick={applyToAllPoses}
          >
            all
          </button>
          <button type="button" aria-label="reset" onClick={resetTransform}>reset</button>
        </div>
      )}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function dist(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
function angle(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
}
function mid(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
}
