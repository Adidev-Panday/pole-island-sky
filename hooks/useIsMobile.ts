'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT_PX = 600;

/** True when the viewport is narrow enough to need the compact mobile layout. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    setIsMobile(query.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}
