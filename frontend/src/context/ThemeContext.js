import React, { createContext, useContext, useState, useEffect } from 'react';

export const LIGHT = {
  bg:          '#f8fafc',
  surface:     '#ffffff',
  surfaceAlt:  '#f8fafc',
  surfaceAlt2: '#f1f5f9',
  text:        '#0f172a',
  textSub:     '#475569',
  textMuted:   '#94a3b8',
  border:      '#e2e8f0',
  borderLight: '#f1f5f9',
  inputBg:     '#f8fafc',
  overlay:     'rgba(15,23,42,.65)',
};

export const DARK = {
  bg:          '#0f172a',
  surface:     '#1e293b',
  surfaceAlt:  '#1e293b',
  surfaceAlt2: '#334155',
  text:        '#f1f5f9',
  textSub:     '#94a3b8',
  textMuted:   '#64748b',
  border:      '#334155',
  borderLight: '#1e293b',
  inputBg:     '#1e293b',
  overlay:     'rgba(2,6,23,.8)',
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
