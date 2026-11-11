import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Atelier — a warm-paper, ink-and-lime design system.
 * Paper is the room. Ink is the type. Lime is the one accent that matters.
 */
export const colors = {
  paper: '#F4F0E7',
  paperDeep: '#EAE3D6',
  paperSoft: '#F9F6EF',
  surface: '#FCFAF4',
  ink: '#1A1815',
  inkSoft: '#6C6458',
  inkFaint: '#9A9183',
  line: 'rgba(26, 24, 21, 0.10)',
  lineStrong: 'rgba(26, 24, 21, 0.18)',
  lime: '#CDF56B',
  limeDeep: '#B7E24F',
  limeInk: '#26320C',
  limeWash: 'rgba(205, 245, 107, 0.24)',
  clay: '#BE6A4A',
  clayWash: 'rgba(190, 106, 74, 0.12)',
  indigo: '#31415A',
  indigoWash: 'rgba(49, 65, 90, 0.10)',
  danger: '#B1432F',
  dangerWash: 'rgba(177, 67, 47, 0.10)',
  white: '#FFFFFF',
  glass: 'rgba(252, 250, 244, 0.72)',
  scrim: 'rgba(26, 24, 21, 0.42)',
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
};

export const type = {
  display: {
    fontSize: 36,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -1.25,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  headline: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.12,
  },
  callout: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2A2318',
      shadowOpacity: 0.07,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 9 },
    },
    default: { elevation: 2 },
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#231D13',
      shadowOpacity: 0.16,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
    },
    default: { elevation: 8 },
  }),
  button: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#231D13',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 3 },
  }),
};

/** Height of the floating tab bar, excluding the home-indicator inset. */
export const TAB_BAR_HEIGHT = 64;

export function tabBarSpace(bottomInset: number) {
  return TAB_BAR_HEIGHT + Math.max(bottomInset, 10) + 26;
}
