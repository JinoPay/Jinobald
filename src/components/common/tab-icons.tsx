import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  /** 탭 바가 넘겨주는 색. PlatformColor 일 수 있어 ColorValue 로 받습니다. */
  color: ColorValue;
  size?: number;
}

/** 열차 — 노선도 탭. */
export function TrainIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3" width="14" height="13" rx="4" stroke={color} strokeWidth={1.8} />
      <Path d="M6.5 10.5h11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="9" cy="13.2" r="1.1" fill={color} />
      <Circle cx="15" cy="13.2" r="1.1" fill={color} />
      <Path
        d="M8.5 16.5 6 21M15.5 16.5 18 21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** 종 — 알림 탭. */
export function BellIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10a6 6 0 1 1 12 0c0 3.2.7 5 1.5 6H4.5C5.3 15 6 13.2 6 10Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M10 19.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** 톱니 — 설정 탭. */
export function GearIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
