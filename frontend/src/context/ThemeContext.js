import React, { createContext, useContext, useState, useEffect } from 'react';

export const LIGHT = {
  bg:          '#FFF8F0',
  surface:     '#ffffff',
  surfaceAlt:  '#FFF8F0',
  surfaceAlt2: '#FBE9E7',
  text:        '#2C1810',
  textSub:     '#5D4037',
  textMuted:   '#8D6E63',
  border:      '#D7CCC8',
  borderLight: '#EFEBE9',
  inputBg:     '#FFF8F0',
  overlay:     'rgba(44,24,16,.65)',
};

export const DARK = {
  bg:          '#1A0E0A',
  surface:     '#2C1810',
  surfaceAlt:  '#2C1810',
  surfaceAlt2: '#4E342E',
  text:        '#EFEBE9',
  textSub:     '#BCAAA4',
  textMuted:   '#8D6E63',
  border:      '#4E342E',
  borderLight: '#2C1810',
  inputBg:     '#2C1810',
  overlay:     'rgba(26,14,10,.8)',
};

const ThemeCtx = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('sirer-theme') === 'dark'
  );

  useEffect(() => {
    localStorage.setItem('sirer-theme', isDark ? 'dark' : 'light');
    document.body.style.background = isDark ? DARK.bg : LIGHT.bg;
    document.body.style.color = isDark ? DARK.text : LIGHT.text;
  }, [isDark]);

  const toggle = () => setIsDark(v => !v);

  return (
    <ThemeCtx.Provider value={{ isDark, toggle, C: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return { isDark: false, toggle: () => {}, C: LIGHT };
  return ctx;
};
