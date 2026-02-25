"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  /** Numeric target, e.g. 16000 */
  target: number;
  /** Displayed suffix, e.g. "+" or "%" */
  suffix?: string;
  /** Displayed prefix, e.g. "Est. " */
  prefix?: string;
  /** Duration in ms */
  duration?: number;
  /** If true, renders the target value directly with no animation (for non-numeric strings) */
  static?: boolean;
  label: string;
  /** Optional sub-label shown below the label */
  sublabel?: string;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 1800,
  label,
  sublabel,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOut(progress) * target));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  const display =
    target >= 1000
      ? count.toLocaleString("en-ZA")
      : String(count);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {prefix}{display}{suffix}
      </div>
      <div className="text-sm text-white/60 mt-1.5 font-medium">{label}</div>
      {sublabel && (
        <div className="text-xs text-white/40 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}
