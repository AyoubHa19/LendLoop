"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * The LendLoop drawing, turning slowly as the page scrolls, like a loop
 * passed from hand to hand. Only `transform` changes, once per frame, and
 * it stays still for people who prefer reduced motion.
 */
export function ScrollingLoop({ size, className = "" }: { size: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      el.style.transform = `translateY(${y * 0.12}px) rotate(${y * 0.08}deg)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      <Image
        src="/loop.png"
        alt="LendLoop's loop, drawn in ink"
        width={420}
        height={425}
        priority
        className="ink h-auto"
        style={{ width: size }}
      />
    </div>
  );
}
