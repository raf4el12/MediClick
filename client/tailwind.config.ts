import tailwindcssLogical from 'tailwindcss-logical';
import type { Config } from 'tailwindcss';

// Extensión explícita y .mjs: Turbopack rastrea este archivo y no resuelve
// la importación sin extensión; con `.ts` Node lo carga nativo y avisa por el
// package.json sin `type`.
import tailwindPlugin from './src/@core/tailwind/plugin.mjs';

// Como Materio: sin preflight (MUI CssBaseline normaliza) y utilidades con
// mayor especificidad (`#__next`) para no competir con el orden de Emotion.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,css}'],
  corePlugins: {
    preflight: false,
  },
  important: '#__next',
  plugins: [tailwindcssLogical, tailwindPlugin],
  theme: {
    extend: {},
  },
};

export default config;
