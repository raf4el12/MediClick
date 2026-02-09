export interface PrimaryColor {
  name: string;
  light: string;
  main: string;
  dark: string;
}

const primaryColorConfig: PrimaryColor[] = [
  {
    name: 'primary-1',
    light: '#60A5FA',
    main: '#2563EB',
    dark: '#1D4ED8',
  },
  {
    name: 'primary-2',
    light: '#4EB0B1',
    main: '#0D9394',
    dark: '#096B6C',
  },
  {
    name: 'primary-3',
    light: '#F0718D',
    main: '#EB3D63',
    dark: '#AC2D48',
  },
  {
    name: 'primary-4',
    light: '#A379FF',
    main: '#8C57FF',
    dark: '#7E4EE6',
  },
  {
    name: 'primary-5',
    light: '#5CAFF1',
    main: '#2092EC',
    dark: '#176BAC',
  },
];

export default primaryColorConfig;
