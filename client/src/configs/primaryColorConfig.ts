export interface PrimaryColor {
  name: string;
  light: string;
  main: string;
  dark: string;
}

// Todos cumplen WCAG AA (≥ 4,5:1) con texto blanco y como texto sobre el fondo
// claro de Materio (#F4F5FA); los tonos de Materio se oscurecieron hasta pasar
// (ADR-0003). Lo verifica primaryColorConfig.test.ts.
const primaryColorConfig: PrimaryColor[] = [
  {
    name: 'primary-1',
    light: '#8C57FF',
    main: '#7E4EE6',
    dark: '#6A3BCF',
  },
  {
    name: 'primary-2',
    light: '#60A5FA',
    main: '#2563EB',
    dark: '#1D4ED8',
  },
  {
    name: 'primary-3',
    light: '#10B4B5',
    main: '#0B7C7D',
    dark: '#074D4E',
  },
  {
    name: 'primary-4',
    light: '#EC4569',
    main: '#DC1742',
    dark: '#AE1234',
  },
  {
    name: 'primary-5',
    light: '#4B4B4B',
    main: '#000000',
    dark: '#000000',
  },
];

export default primaryColorConfig;
