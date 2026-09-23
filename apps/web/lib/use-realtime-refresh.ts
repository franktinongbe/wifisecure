'use client';

import { useEffect, useRef } from 'react';

/** Refresh API-backed screens while visible and when the user returns to the tab. */
export function useRealtimeRefresh(refresh: () => void | Promise<void>, intervalMs = 5000) {
  const refreshRef = useRef(refresh);
  const inFlightRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'visible' || inFlightRef.current) return;
      inFlightRef.current = true;
      void Promise.resolve()
        .then(() => refreshRef.current())
        .catch(() => undefined)
        .finally(() => {
          inFlightRef.current = false;
        });
    };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [intervalMs]);
}
