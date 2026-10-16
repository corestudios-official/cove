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
