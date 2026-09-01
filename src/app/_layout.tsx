import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 부수효과 import — 두 모듈 모두 최상위에서 등록이 일어나야 하며,
// 지오펜스 이벤트로 앱이 콜드 스타트될 때도 이 등록이 먼저여야 합니다.
import '@/services/location/geofence-task';
import '@/services/notifications/setup';

import { SettingsProvider } from '@/store/SettingsContext';
import { TripProvider } from '@/store/TripContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    // 노선도의 핀치 줌·드래그가 동작하려면 제스처 루트가 앱 최상단에 있어야 합니다.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SettingsProvider>
          <TripProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="station/[station]" options={{ title: '실시간 도착' }} />
              <Stack.Screen
                name="trip/setup"
                options={{ title: '승하차 알림 설정', presentation: 'modal' }}
              />
            </Stack>
          </TripProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
