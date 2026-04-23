import { useRef, useState } from "react";

type SwipeState = {
  dx: number;
  dy: number;
  dragging: boolean;
};

type Handlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Distance in px past which a release triggers a swipe action. */
  threshold?: number;
};

/**
 * Pointer-drag hook for a card-stack front card. Returns bindings to spread
 * onto the draggable element plus a live drag offset so the caller can
 * translate+rotate the card for visual feedback.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 110 }: Handlers) {
  const [state, setState] = useState<SwipeState>({ dx: 0, dy: 0, dragging: false });
  const startX = useRef(0);
  const startY = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const bindings = {
    onPointerDown: (e: React.PointerEvent) => {
      if (pointerIdRef.current != null) return;
      pointerIdRef.current = e.pointerId;
      startX.current = e.clientX;
      startY.current = e.clientY;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setState({ dx: 0, dy: 0, dragging: true });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      setState({
        dx: e.clientX - startX.current,
        dy: e.clientY - startY.current,
        dragging: true,
      });
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const dx = e.clientX - startX.current;
      pointerIdRef.current = null;
      setState({ dx: 0, dy: 0, dragging: false });
      if (dx <= -threshold) onSwipeLeft?.();
      else if (dx >= threshold) onSwipeRight?.();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      setState({ dx: 0, dy: 0, dragging: false });
    },
  };

  return { ...state, bindings };
}
