import { MultiPanelFigure, CanvasTheme } from '../../types/multipanel';
import { DEFAULT_MULTIPANEL_FIGURE } from './defaultFigure';

const STORAGE_FIGURE_KEY = 'figurefoundry_multipanel_figure_v1';
const STORAGE_CUSTOM_THEMES_KEY = 'figurefoundry_custom_themes_v1';
const STORAGE_ACTIVE_THEME_KEY = 'figurefoundry_active_theme_v1';

export function loadFigureFromStorage(): MultiPanelFigure {
  if (typeof window === 'undefined') {
    return DEFAULT_MULTIPANEL_FIGURE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_FIGURE_KEY);
    if (!raw) return DEFAULT_MULTIPANEL_FIGURE;
    const parsed = JSON.parse(raw) as MultiPanelFigure;
    if (parsed && Array.isArray(parsed.panels) && parsed.panels.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load figure from localStorage:', err);
  }
  return DEFAULT_MULTIPANEL_FIGURE;
}

export function saveFigureToStorage(figure: MultiPanelFigure): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    try {
      localStorage.setItem(STORAGE_FIGURE_KEY, JSON.stringify(figure));
      resolve(true);
    } catch (err) {
      console.error('Failed to save figure to localStorage:', err);
      resolve(false);
    }
  });
}

export function loadCustomThemes(): CanvasTheme[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn('Failed to load custom themes from localStorage:', err);
  }
  return [];
}

export function saveCustomThemes(themes: CanvasTheme[]): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    try {
      localStorage.setItem(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(themes));
      resolve(true);
    } catch (err) {
      console.error('Failed to save custom themes to localStorage:', err);
      resolve(false);
    }
  });
}

export function loadActiveThemeId(): string {
  if (typeof window === 'undefined') return 'nature';
  try {
    return localStorage.getItem(STORAGE_ACTIVE_THEME_KEY) || 'nature';
  } catch {
    return 'nature';
  }
}

export function saveActiveThemeId(themeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_THEME_KEY, themeId);
  } catch (err) {
    console.error('Failed to save active theme ID:', err);
  }
}

export const loadMultiPanelFigure = loadFigureFromStorage;
export const saveMultiPanelFigure = saveFigureToStorage;
