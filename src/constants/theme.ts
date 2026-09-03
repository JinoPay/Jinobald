/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#D8DAE0',
    accent: '#0052A4',
    /** 강조색을 옅게 깐 배경 — 진행 중 여정 배너, 선택된 칩. */
    accentSoft: '#E8F0FA',
    danger: '#D93036',
    warning: '#B7791F',
    success: '#128A45',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#3A3D42',
    accent: '#4C9BE8',
    accentSoft: '#12283F',
    danger: '#FF6B70',
    warning: '#F2B84B',
    success: '#3FC97A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** 모서리 반지름. 카드는 lg, 칩·버튼은 md, 알약은 pill. */
export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** 글자 크기·굵기 조합. 화면마다 숫자를 새로 적지 않도록 여기서 고릅니다. */
export const Typography = {
  title: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
  numeric: { fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

/** 카드 그림자. 다크 모드에서는 배경 대비만으로 충분해 iOS 만 옅게 깝니다. */
export const Shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 1 },
  default: {},
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
