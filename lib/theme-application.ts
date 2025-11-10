// Theme application utilities for personalized dashboard styling
type ThemeColorScheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

export interface ThemePersonalization {
  colorScheme?: ThemeColorScheme;
  motivationalQuotes?: string[];
  badges?: string[];
}

const THEME_VARIABLES = {
  primary: '--crave-theme-primary',
  secondary: '--crave-theme-secondary',
  accent: '--crave-theme-accent',
  background: '--crave-theme-background',
} as const;

const ACTIVE_CLASS = 'theme-active';

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTheme(personalization: ThemePersonalization | null | undefined) {
  if (typeof window === 'undefined') return;

  const palette = personalization?.colorScheme;
  const root = document.documentElement;
  const body = document.body;

  if (!palette) {
    resetTheme();
    return;
  }

  root.classList.add(ACTIVE_CLASS);

  root.style.setProperty(THEME_VARIABLES.primary, palette.primary);
  root.style.setProperty(THEME_VARIABLES.secondary, palette.secondary);
  root.style.setProperty(THEME_VARIABLES.accent, palette.accent);
  root.style.setProperty(THEME_VARIABLES.background, palette.background);

  body.style.backgroundColor = palette.background;
  body.style.backgroundImage = `radial-gradient(circle at top left, ${hexToRgba(palette.primary, 0.18)}, transparent 55%), radial-gradient(circle at bottom right, ${hexToRgba(palette.secondary, 0.22)}, transparent 45%)`;
}

export function resetTheme() {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  root.classList.remove(ACTIVE_CLASS);

  Object.values(THEME_VARIABLES).forEach((variable) => {
    root.style.removeProperty(variable);
  });

  body.style.removeProperty('background-color');
  body.style.removeProperty('background-image');
}


