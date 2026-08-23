export interface IThemeColors {
  bgMain: string;
  bgSurface: string;
  bgCard: string;
  bgMuted: string;
  textInk: string;
  textInkSecondary: string;
  textInkTertiary: string;
  textInverse: string;
  borderColor: string;
  accentPrimary: string;
  accentHover: string;
}

// Abstract Factory
export interface IThemeFactory {
  createColors(): IThemeColors;
}

// Concrete Factory 1: Light Theme
export class LightThemeFactory implements IThemeFactory {
  createColors(): IThemeColors {
    return {
      bgMain: '#f0f3f6', // Light gray background
      bgSurface: '#ffffff', // White surface
      bgCard: '#ffffff', // White card
      bgMuted: '#f8fafc', // Very light gray for muted areas
      textInk: '#0f172a', // Slate 900
      textInkSecondary: '#475569', // Slate 600
      textInkTertiary: '#94a3b8', // Slate 400
      textInverse: '#ffffff',
      borderColor: '#e2e8f0', // Slate 200
      accentPrimary: '#22a86e', // Brand color
      accentHover: '#1c915f',
    };
  }
}

// Concrete Factory 2: Dark Theme
export class DarkThemeFactory implements IThemeFactory {
  createColors(): IThemeColors {
    return {
      bgMain: '#051510', // Deep dark green/black
      bgSurface: '#0a1a15', // Slightly lighter dark surface
      bgCard: '#0f221a', // Card background in dark mode
      bgMuted: '#09291a', // Muted areas
      textInk: '#f1f5f9', // Slate 100 for high contrast
      textInkSecondary: '#cbd5e1', // Slate 300
      textInkTertiary: '#64748b', // Slate 500
      textInverse: '#ffffff',
      borderColor: '#1e382d', // Dark border
      accentPrimary: '#45c388', // Light brand color
      accentHover: '#33a36f',
    };
  }
}


// Client application method to apply theme to DOM
export const applyTheme = (factory: IThemeFactory) => {
  const colors = factory.createColors();
  const root = document.documentElement;

  root.style.setProperty('--bg-main', colors.bgMain);
  root.style.setProperty('--bg-surface', colors.bgSurface);
  root.style.setProperty('--bg-card', colors.bgCard);
  root.style.setProperty('--bg-muted', colors.bgMuted);
  root.style.setProperty('--text-ink', colors.textInk);
  document.documentElement.style.setProperty('--text-ink-secondary', colors.textInkSecondary);
  document.documentElement.style.setProperty('--text-ink-tertiary', colors.textInkTertiary);
  document.documentElement.style.setProperty('--text-inverse', colors.textInverse);
  document.documentElement.style.setProperty('--border-color', colors.borderColor);
  root.style.setProperty('--accent-primary', colors.accentPrimary);
  root.style.setProperty('--accent-hover', colors.accentHover);
};
