// CP2-32f FIX: Removed incognito mode entirely
import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const initTheme = async () => {
      // First check if user saved a manual preference
      const savedTheme = await window.electronAPI.storeGet('theme');
      let dark = false;
      if (savedTheme === 'dark') {
        dark = true;
      } else if (savedTheme === 'light') {
        dark = false;
      } else {
        // 'system' or nothing saved — use OS preference
        dark = await window.electronAPI.getNativeTheme();
      }

      setIsDark(dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

      // Update window background color
      try {
        await window.electronAPI.setBackgroundColor(dark ? '#111318' : '#F4F6FB');
      } catch(e) {
        console.warn('Could not update background color:', e);
      }
    };
    initTheme();
  }, []);

  // CP2-35: Live-sync theme when changed from the Preferences window
  useEffect(() => {
    const off = window.coveAPI?.on?.('store-updated', async (key, value) => {
      if (key !== 'theme') return;
      let dark;
      if (value === 'dark') dark = true;
      else if (value === 'light') dark = false;
      else dark = await window.electronAPI.getNativeTheme();
      setIsDark(dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      try {
        await window.electronAPI.setBackgroundColor(dark ? '#111318' : '#F4F6FB');
      } catch(e) {
        console.warn('Could not update background color:', e);
      }
    });
    return typeof off === 'function' ? off : undefined;
  }, []);

  const setTheme = async (mode) => {
    let dark = false;
    if (mode === 'dark') {
      dark = true;
    } else if (mode === 'light') {
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    await window.electronAPI.storeSet('theme', mode);

    // Update window background color
    try {
      await window.electronAPI.setBackgroundColor(dark ? '#111318' : '#F4F6FB');
    } catch(e) {
      console.warn('Could not update background color:', e);
    }
  };

  return { isDark, setTheme };
}
