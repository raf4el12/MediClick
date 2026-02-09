import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface ThemeOptions {
    customShadows?: Record<string, string>;
  }

  interface Theme {
    customShadows: Record<string, string>;
  }
}
