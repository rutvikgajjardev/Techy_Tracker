import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any fast-changing value (such as search queries)
 * to prevent excessive network API calls and state re-renders.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds (defaults to 350ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

