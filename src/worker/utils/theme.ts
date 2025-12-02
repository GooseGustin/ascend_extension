/**
 * Apply theme to the root document element
 */
export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  
  // Store preference
  localStorage.setItem('ascend:theme', theme);
}

/**
 * Apply accent color to CSS custom properties
 */
export function applyAccentColor(color: 'blue' | 'emerald' | 'purple' | 'gold') {
  const root = document.documentElement;
  
  const colorMap = {
    blue: {
      primary: '#5865F2',
      hover: '#4752C4',
      light: '#7289DA',
    },
    emerald: {
      primary: '#57F287',
      hover: '#43B581',
      light: '#69FF94',
    },
    purple: {
      primary: '#8B5CF6',
      hover: '#7C3AED',
      light: '#A78BFA',
    },
    gold: {
      primary: '#FEE75C',
      hover: '#FDD835',
      light: '#FFF176',
    },
  };
  
  const colors = colorMap[color];
  root.style.setProperty('--accent-primary', colors.primary);
  root.style.setProperty('--accent-hover', colors.hover);
  root.style.setProperty('--accent-light', colors.light);
  
  // Store preference
  localStorage.setItem('ascend:accent', color);
}

/**
 * Initialize theme on app load
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem('ascend:theme') as 'light' | 'dark' | 'system' | null;
  const savedAccent = localStorage.getItem('ascend:accent') as 'blue' | 'emerald' | 'purple' | 'gold' | null;
  
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme('dark'); // Default
  }
  
  if (savedAccent) {
    applyAccentColor(savedAccent);
  } else {
    applyAccentColor('blue'); // Default
  }
}

/**
 * Listen for system theme changes
 */
export function listenForSystemThemeChanges(callback: (isDark: boolean) => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => mediaQuery.removeEventListener('change', handler);
}