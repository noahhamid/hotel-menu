import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value` that only updates
 * after `delayMs` has passed without further changes.
 * Used to throttle search-as-you-type requests.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}