"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnalogClockProps {
  className?: string;
  showDigital?: boolean;
}

export default function AnalogClock({ className, showDigital = true }: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setTime(new Date());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const ms = time.getMilliseconds();

  const sDeg = s * 6 + ms * 0.006;
  const mDeg = m * 6 + s * 0.1;
  const hDeg = (h % 12) * 30 + m * 0.5;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative w-full max-w-[380px] aspect-square">
        <img
          src="/clock/face.png"
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
        />
        <img
          src="/clock/hour.png"
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
          style={{ transform: `rotate(${hDeg}deg)` }}
        />
        <img
          src="/clock/minute.png"
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
          style={{ transform: `rotate(${mDeg}deg)` }}
        />
        <img
          src="/clock/second.png"
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
          style={{ transform: `rotate(${sDeg}deg)` }}
        />
      </div>
      {showDigital && (
        <div className="font-code text-xs md:text-sm text-primary/80 tracking-[0.3em]">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}
