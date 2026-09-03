import Tabs from 'expo-router/js-tabs';

import { BellIcon, GearIcon, TrainIcon } from '@/components/common/tab-icons';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          // 홈은 자체 헤더(앱 이름 + 데이터 소스)를 그립니다.
          headerShown: false,
          tabBarIcon: ({ color }) => <TrainIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: '여정',
          tabBarIcon: ({ color }) => <BellIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <GearIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
