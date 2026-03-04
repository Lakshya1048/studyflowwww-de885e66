import { useState, useCallback, useEffect, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Track whether this instance triggered the update to avoid self-notification
  const isLocalUpdate = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      if (isLocalUpdate.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.key === key) {
        setStoredValue(detail.value);
      }
    };
    window.addEventListener('localstorage-sync', handler);
    return () => window.removeEventListener('localstorage-sync', handler);
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        isLocalUpdate.current = true;
        window.dispatchEvent(new CustomEvent('localstorage-sync', { detail: { key, value: nextValue } }));
        isLocalUpdate.current = false;
      } catch {
        // ignore
      }
      return nextValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
