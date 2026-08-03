import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

const THEME_KEY = 'oneerp-theme-mode';
const ACCENT_KEY = 'oneerp-theme-accent';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readMode());
  readonly accent = signal<AccentColor>(this.readAccent());

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.mode());
      localStorage.setItem(THEME_KEY, this.mode());
    });
    effect(() => {
      document.documentElement.setAttribute('data-accent', this.accent());
      localStorage.setItem(ACCENT_KEY, this.accent());
    });
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'light' ? 'dark' : 'light');
  }

  setAccent(accent: AccentColor): void {
    this.accent.set(accent);
  }

  private readMode(): ThemeMode {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readAccent(): AccentColor {
    const stored = localStorage.getItem(ACCENT_KEY) as AccentColor | null;
    return stored && ['blue', 'green', 'purple', 'orange', 'red'].includes(stored) ? stored : 'blue';
  }
}
