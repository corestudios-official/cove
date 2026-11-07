import { useState, useEffect, useCallback } from 'react';

export function useStore(key, defaultValue = null) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    window.electronAPI.storeGet(key).then(v => {
      setValue(v !== undefined && v !== null ? v : defaultValue);
    }).catch(() => setValue(defaultValue));
  }, [key]);

  // CP2-35: Live-sync when another window (e.g. Preferences) writes the same key
  useEffect(() => {
    const off = window.coveAPI?.on?.('store-updated', (k, v) => {
      if (k === key) setValue(v !== undefined && v !== null ? v : defaultValue);
    });
    return typeof off === 'function' ? off : undefined;
  }, [key]);

  const setStoredValue = useCallback(async (newValue) => {
    const valueToStore = typeof newValue === 'function' ? newValue(value) : newValue;
    await window.electronAPI.storeSet(key, valueToStore);
    setValue(valueToStore);
  }, [key, value]);

  return [value, setStoredValue];
}
