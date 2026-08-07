'use client';
import { useEffect, useRef } from 'react';

export default function RingChart({ percent, size = 40, stroke = 5, color = 'var(--teal-deep)' }) {
  const circleRef = useRef(null);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const targetOffset = circumference * (1 - clamped / 100);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = String(circumference);
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 0.9s ease';
    const raf = requestAnimationFrame(() => { el.style.strokeDashoffset = String(targetOffset); });
    return () => cancelAnimationFrame(raf);
  }, [targetOffset, circumference]);

  return (
    <div className="crm-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="crm-ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          ref={circleRef}
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="crm-ring-label">{clamped}٪</div>
    </div>
  );
}
