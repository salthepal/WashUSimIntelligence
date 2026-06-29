import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'washu-em-sim-theme';
const LEGACY_DARK_MODE_KEY = 'darkMode';
type ThemePreference = 'light' | 'dark';

function getCookieTheme(): ThemePreference | null {
  const match = document.cookie.match(/(?:^|;\s*)washu-em-sim-theme=(dark|light)(?:;|$)/);
  return match?.[1] === 'dark' || match?.[1] === 'light' ? match[1] : null;
}

function setCookieTheme(theme: ThemePreference) {
  const host = window.location.hostname;
  const domain = host === 'localhost' || host === '127.0.0.1' ? '' : '; domain=.washuemsim.org';
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}`;
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'light';

  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'dark' || theme === 'light') return theme;

    if (window.localStorage.getItem(LEGACY_DARK_MODE_KEY) === 'true') {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      setCookieTheme('dark');
      return 'dark';
    }
  } catch (error) {
    console.error('Error loading dark mode preference:', error);
  }

  return getCookieTheme() ?? 'light';
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useDarkMode() {
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
    setCookieTheme(theme);
    window.dispatchEvent(new CustomEvent('washu-theme-change', { detail: { theme } }));
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = getStoredTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === LEGACY_DARK_MODE_KEY) {
        syncTheme();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('washu-theme-change', syncTheme);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('washu-theme-change', syncTheme);
    };
  }, []);

  return [theme === 'dark', (isDark: boolean) => setTheme(isDark ? 'dark' : 'light')] as const;
}
