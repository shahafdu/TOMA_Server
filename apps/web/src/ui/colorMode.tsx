import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { type ColorMode, getTheme } from '../theme.js';

const ColorModeContext = createContext<{ mode: ColorMode; toggle: () => void }>({
  mode: 'light',
  toggle: () => {},
});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(
    () => (localStorage.getItem('toma-mode') as ColorMode | null) ?? 'light',
  );
  const theme = useMemo(() => getTheme(mode), [mode]);
  const toggle = () =>
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('toma-mode', next);
      return next;
    });

  return (
    <ColorModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
