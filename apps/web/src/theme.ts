import { createTheme, type Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

/**
 * TOMA design tokens. A calm indigo/teal system with generous radius and a soft, low-contrast
 * surface palette — modern and easy to scan for HR/managers (plan §2.6).
 */
export function getTheme(mode: ColorMode): Theme {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: '#4f46e5', light: '#6366f1', dark: '#4338ca', contrastText: '#fff' },
      secondary: { main: '#0d9488', light: '#14b8a6', dark: '#0f766e', contrastText: '#fff' },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      info: { main: '#2563eb' },
      background: isDark
        ? { default: '#0b0f1a', paper: '#141a29' }
        : { default: '#f5f6fb', paper: '#ffffff' },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      text: isDark
        ? { primary: '#e6e9f2', secondary: '#9aa3b8' }
        : { primary: '#0f172a', secondary: '#55627d' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: isDark ? '#0b0f1a' : '#f5f6fb' },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? '#2a3550' : '#d5d9e6',
            borderRadius: 8,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: {
            backdropFilter: 'saturate(180%) blur(8px)',
            backgroundColor: isDark ? 'rgba(20,26,41,0.8)' : 'rgba(255,255,255,0.8)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            backgroundColor: isDark ? '#0e1424' : '#ffffff',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
            borderRadius: 16,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10, paddingInline: 16 } },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 10, marginInline: 8 } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 } } },
    },
  });
}
