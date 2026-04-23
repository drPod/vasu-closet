import { useRef } from "react";

type Handlers = {
  onClick?: () => void;
  onLongPress: () => void;
  /** Movement (px) that cancels the long-press — prevents misfires on scroll. */
  moveThreshold?: number;
  /** Hold time (ms) that qualifies as a long-press. */
  delay?: number;
};

type Bindings = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

/**
 * Distinguishes a tap from a long-press without swallowing scroll gestures.
 * `onClick` fires on quick release; `onLongPress` fires at `delay` ms.
 */
export function useLongPress({
  onClick,
  onLongPress,
  moveThreshold = 10,
  delay = 480,
}: Handlers): Bindings {
  const timer = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const firedLong = useRef(false);

  const clear = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return {
    onPointerDown: (e) => {
      firedLong.current = false;
      startX.current = e.clientX;
      startY.current = e.clientY;
      clear();
      timer.current = window.setTimeout(() => {
        firedLong.current = true;
        onLongPress();
      }, delay);
    },
    onPointerMove: (e) => {
      if (timer.current == null) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (Math.hypot(dx, dy) > moveThreshold) clear();
    },
    onPointerUp: () => {
      const wasLong = firedLong.current;
      clear();
      if (!wasLong) onClick?.();
    },
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e) => {
      // Right-click on desktop = open the detail sheet (mirrors long-press).
      e.preventDefault();
      clear();
      firedLong.current = true;
      onLongPress();
    },
  };
}
