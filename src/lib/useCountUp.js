'use client';
import { useEffect, useState, useRef } from 'react';

export default function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = null;
    let raf;
    function tick(now) {
      if (startRef.current == null) startRef.current = now;
      const progress = Math.min((now - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display.toLocaleString('en-US');
}
