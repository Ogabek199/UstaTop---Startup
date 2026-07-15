import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => void | Promise<void>,
  enabled: boolean,
  intervalMs = 3000,
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => void savedCallback.current();
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
