export const darkColors = {
  bg: '#110E09',
  s0: '#151109',
  s1: '#1A1510',
  s2: '#201A12',
  s3: '#261F16',
  s4: '#2C241B',

  b0: 'rgba(208,138,58,0.09)',
  b1: 'rgba(208,138,58,0.13)',
  b2: 'rgba(208,138,58,0.22)',
  bw: 'rgba(255,255,255,0.04)',
  bw2: 'rgba(255,255,255,0.025)',

  amber: '#D08A3A',
  amberL: '#E5A456',
  amberD: '#9C6520',
  amberBg: 'rgba(208,138,58,0.09)',
  amberBg2: 'rgba(208,138,58,0.15)',

  green: '#5C9E6E',
  greenL: '#72B584',
  greenBg: 'rgba(92,158,110,0.1)',
  red: '#B85040',
  redL: '#D06050',
  redBg: 'rgba(184,80,64,0.1)',
  blue: '#5880A0',
  blueBg: 'rgba(88,128,160,0.1)',

  amberBorder: 'rgba(208,138,58,0.35)',
  redBorder: 'rgba(184,80,64,0.3)',
  greenBorder: 'rgba(92,158,110,0.3)',

  t0: '#F0E8D8',
  t1: '#D8CCBA',
  t2: '#A09080',
  t3: '#5A5040',
  t4: '#3A3028',
} as const;

export const lightColors = {
  bg: '#EDE4D0',
  s0: '#E6DCC9',
  s1: '#F5EEE2',
  s2: '#FBF7F0',
  s3: '#F7F1E8',
  s4: '#F0E9DC',

  b0: 'rgba(120,80,20,0.10)',
  b1: 'rgba(120,80,20,0.16)',
  b2: 'rgba(120,80,20,0.26)',
  bw: 'rgba(0,0,0,0.07)',
  bw2: 'rgba(0,0,0,0.05)',

  amber: '#9A6218',
  amberL: '#AE7222',
  amberD: '#784A10',
  amberBg: 'rgba(154,98,24,0.09)',
  amberBg2: 'rgba(154,98,24,0.15)',

  green: '#2E6E42',
  greenL: '#3A8052',
  greenBg: 'rgba(46,110,66,0.08)',
  red: '#A03020',
  redL: '#B84030',
  redBg: 'rgba(160,48,32,0.08)',
  blue: '#285898',
  blueBg: 'rgba(40,88,152,0.08)',

  amberBorder: 'rgba(154,98,24,0.35)',
  redBorder: 'rgba(160,48,32,0.3)',
  greenBorder: 'rgba(46,110,66,0.3)',

  t0: '#1A1206',
  t1: '#2C2010',
  t2: '#6A5030',
  t3: '#A88050',
  t4: '#C8A870',
} as const;

export const themes = {
  dark: darkColors,
  light: lightColors,
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeColors = (typeof themes)[ThemeName];

export const Typography = {
  mono: 'OverpassMono_400Regular',
  monoM: 'OverpassMono_500Medium',
  monoSB: 'OverpassMono_600SemiBold',
  monoB: 'OverpassMono_700Bold',
  sans: 'NunitoSans_400Regular',
  sansB: 'NunitoSans_600SemiBold',
  sansBB: 'NunitoSans_700Bold',
  sansXB: 'NunitoSans_800ExtraBold',
  sans9: 'NunitoSans_900Black',
} as const;

export const Spacing = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 3,
  md: 6,
  lg: 10,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const Overlay = {
  subtle: 'rgba(0,0,0,0.35)',
  medium: 'rgba(0,0,0,0.55)',
  heavy: 'rgba(0,0,0,0.70)',
} as const;
