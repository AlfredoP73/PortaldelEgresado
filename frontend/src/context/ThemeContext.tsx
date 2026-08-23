import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { applyTheme, LightThemeFactory, DarkThemeFactory, type IThemeFactory } from './ThemeFactory';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('light');

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    let factory: IThemeFactory;
    
    if (theme === 'dark') {
      factory = new DarkThemeFactory();
      document.body.classList.add('dark');
    } else {
      factory = new LightThemeFactory();
      document.body.classList.remove('dark');
    }

    applyTheme(factory);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
