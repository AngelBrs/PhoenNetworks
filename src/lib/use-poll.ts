"use client";

import { useEffect, useRef } from "react";

/** Run `fn` immediately and then every `ms` while mounted. Pass `null` to pause. */
export function usePoll(fn: () => void | Promise<void>, ms: number | null, deps: unknown[] = []) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (ms === null) return;
    let alive = true;
    const tick = async () => {
      if (alive) await saved.current();
    };
    void tick();
    const t = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
