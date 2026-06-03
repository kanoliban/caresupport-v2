"use client";

import {
  Children,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const THRESHOLD = 70;
const HORIZONTAL_DOMINANCE = 1.4;

type SwipePagerProps = {
  page: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
};

export function SwipePager({ page, onPageChange, children }: SwipePagerProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const pages = Children.toArray(children);
  const pageCount = pages.length;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Allow form fields and buttons to receive their own events.
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, button, [data-no-swipe]")) {
      start.current = null;
      return;
    }
    start.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (
      !isDragging &&
      Math.abs(dx) > 8 &&
      Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE
    ) {
      setIsDragging(true);
    }
    if (isDragging || Math.abs(dx) > 8) setDragX(dx);
  };

  const onPointerUp = () => {
    if (start.current && isDragging) {
      if (dragX < -THRESHOLD && page < pageCount - 1) {
        onPageChange(page + 1);
      } else if (dragX > THRESHOLD && page > 0) {
        onPageChange(page - 1);
      }
    }
    setDragX(0);
    setIsDragging(false);
    start.current = null;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "pan-y",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          width: `${pageCount * 100}%`,
          height: "100%",
          transform: `translateX(calc(${page * -(100 / pageCount)}% + ${dragX}px))`,
          transition: isDragging
            ? "none"
            : "transform 0.36s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {pages.map((child, i) => (
          <div
            key={i}
            style={{
              width: `${100 / pageCount}%`,
              height: "100%",
              flexShrink: 0,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
