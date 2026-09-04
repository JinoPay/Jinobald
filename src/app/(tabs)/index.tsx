import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { ActiveTripBanner } from '@/components/home/ActiveTripBanner';
import { FavoriteStrip } from '@/components/home/FavoriteStrip';
import { FrequentRoutes } from '@/components/home/FrequentRoutes';
import { HomeHeader } from '@/components/home/HomeHeader';
import { LineChips } from '@/components/home/LineChips';
import { NearbyStations } from '@/components/home/NearbyStations';
import { NoticeStrip } from '@/components/home/NoticeStrip';
import { RoutinePromptBanner } from '@/components/home/RoutinePromptBanner';
import { RouteResults } from '@/components/home/RouteResults';
import { RouteSearchCard, type Slot } from '@/components/home/RouteSearchCard';
import { SavedRoutesStrip } from '@/components/home/SavedRoutesStrip';
import { SaveRouteSheet } from '@/components/home/SaveRouteSheet';
import { SectionTitle } from '@/components/home/SectionTitle';
import { StationRow } from '@/components/subway/StationRow';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { getUniqueStation, searchStations, UNIQUE_STATIONS, type UniqueStation } from '@/data/stations';
import { useFavoriteArrivals } from '@/hooks/use-favorite-arrivals';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { notificationNotice } from '@/services/location/capabilities';
import { findSavedForPair, resolveSavedRoute, type SavedRoute } from '@/services/routes/saved';
import { findRoutes, isPlanValid } from '@/services/routing';
import type { RoutePlan } from '@/services/routing/types';
import { useRoutines } from '@/store/RoutinesContext';
import { useUserData, type FavoriteLabel, type RecentSearch } from '@/store/UserDataContext';

/** 검색창이 열린 이유 — 슬롯을 채우거나, 집/회사 칩에 역을 배정하거나. */
type SearchTarget = Slot | { assign: Exclude<FavoriteLabel, null> };

export default function HomeScreen() {
  const theme = useTheme();
  const {
    favorites,
    recents,
    history,
    savedRoutes,
    setFavoriteLabel,
    removeFavorite,
    pushRecent,
    clearRecents,
    saveRoute,
    updateSavedRoute,
    removeSavedRoute,
  } = useUserData();
  const { routines } = useRoutines();
  const [origin, setOrigin] = useState<UniqueStation | null>(null);
  const [destination, setDestination] = useState<UniqueStation | null>(null);
  const [via, setVia] = useState<UniqueStation | null>(null);
  const [target, setTarget] = useState<SearchTarget | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<RoutePlan | null>(null);
  const inputRef = useRef<TextInput>(null);

  const results = useMemo(() => searchStations(query), [query]);
  const hasLabelled = favorites.some((f) => f.label !== null);
  const now = useNow(1000, hasLabelled);
  const previews = useFavoriteArrivals(
    favorites
      .filter((f) => f.label !== null)
      .map((f) => getUniqueStation(f.key)?.displayName)
      .filter((n): n is string => !!n),
  );

  // 실시간 도착 화면에서 "이 역에서 출발"로 넘어온 경우 출발역을 채워 둡니다.
  //
  // 탭 화면은 계속 마운트된 채로 남아 있어서 초기값만으로는 부족하고, 파라미터가
  // 바뀔 때마다 반영해야 합니다. 렌더 중에 조정하는 방식이라 effect 로 한 번 더
  // 그리지 않습니다.
  const { origin: originParam } = useLocalSearchParams<{ origin?: string }>();
  const [appliedOriginParam, setAppliedOriginParam] = useState(originParam);
  if (originParam !== appliedOriginParam) {
    setAppliedOriginParam(originParam);
    const station = originParam ? getUniqueStation(originParam) : null;
    if (station) {
      setOrigin(station);
      setTarget('destination');
      setQuery('');
    }
  }

  /** 계산된 후보 (추천 · 최소 시간 · 최소 환승 · 최소 정거장 · 대안). 두 역이 이어져 있지 않으면 빈 배열입니다. */
  const computed = useMemo(
    () => (origin && destination ? findRoutes(origin.key, destination.key, via ? { viaKey: via.key } : {}) : []),
    [origin, destination, via],
  );

  /** 같은 출발·도착의 저장 경로. 경유역을 지정한 검색에는 끼어들지 않습니다. */
  const savedMatch = useMemo(() => {
    if (!origin || !destination || via) return null;
    const saved = findSavedForPair(savedRoutes, origin.key, destination.key);
    if (!saved) return null;
    const resolved = resolveSavedRoute(saved, isPlanValid, (o, d) => findRoutes(o, d));
    return resolved.plan ? { route: saved, plan: resolved.plan, refreshed: resolved.status === 'refreshed' } : null;
  }, [origin, destination, via, savedRoutes]);

  /** "내 경로"가 있으면 맨 앞, 그다음 계산된 후보. 같은 경로면 하나만. */
  const routes = useMemo(
    () => (savedMatch ? [savedMatch.plan, ...computed.filter((plan) => plan.id !== savedMatch.plan.id)] : computed),
    [savedMatch, computed],
  );

  const sameStation = origin && destination && origin.key === destination.key;
  const activeSlot: Slot | null = target === 'origin' || target === 'destination' || target === 'via' ? target : null;

  const openSearch = (next: SearchTarget) => {
    setTarget(next);
    setQuery('');
    inputRef.current?.focus();
  };

  const closeSearch = () => {
    setTarget(null);
    setQuery('');
  };

  const applyPair = (
    nextOrigin: UniqueStation | null,
    nextDestination: UniqueStation | null,
    options: { record?: boolean } = {},
  ) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    if (options.record !== false && nextOrigin && nextDestination && nextOrigin.key !== nextDestination.key) {
      pushRecent({ originKey: nextOrigin.key, destinationKey: nextDestination.key });
    }
  };

  const pick = (station: UniqueStation) => {
    if (target && typeof target === 'object') {
      setFavoriteLabel(station.key, target.assign);
      closeSearch();
      return;
    }
    if (target === 'via') {
      setVia(station);
      closeSearch();
      return;
    }
    if (target === 'destination') {
      applyPair(origin, station);
      // 출발역이 아직 비어 있으면 자연스럽게 그쪽으로 넘어갑니다.
      if (!origin) return openSearch('origin');
    } else {
      applyPair(station, destination);
      if (!destination) return openSearch('destination');
    }
    closeSearch();
  };

  const pickPair = (originKey: string, destinationKey: string) => {
    const a = getUniqueStation(originKey);
    const b = getUniqueStation(destinationKey);
    if (!a || !b) return;
    setVia(null);
    applyPair(a, b);
    closeSearch();
  };

  const pickRecent = (search: RecentSearch) => {
    if (search.destinationKey) pickPair(search.originKey, search.destinationKey);
  };

  // 방향 바꾸기는 검색이 아니라 편집이므로 최근 검색에 남기지 않습니다.
  const swap = () => applyPair(destination, origin, { record: false });

  const clearSlot = (slot: Slot) => {
    if (slot === 'origin') setOrigin(null);
    else if (slot === 'destination') setDestination(null);
    else setVia(null);
  };

  const openArrivals = (station: UniqueStation) => {
    router.push(`/station/${encodeURIComponent(station.key)}`);
  };

  // 경로 객체 대신 후보 id 만 넘깁니다. expo-router 는 params 를 문자열로 만들고,
  // 탐색이 몇 ms 라 setup 화면에서 다시 찾는 편이 캐시보다 싸고 딥링크에도 안전합니다.
  // 저장 경로는 저장소에서 다시 꺼내므로 id 만 넘깁니다.
  const openRoute = (plan: RoutePlan) => {
    if (plan.label === 'saved' && savedMatch) {
      router.push({ pathname: '/trip/setup', params: { saved: savedMatch.route.id } });
      return;
    }
    if (!origin || !destination) return;
    router.push({
      pathname: '/trip/setup',
      params: { origin: origin.key, destination: destination.key, planId: plan.id, ...(via ? { via: via.key } : {}) },
    });
  };

  const openSavedRoute = (route: SavedRoute) => {
    router.push({ pathname: '/trip/setup', params: { saved: route.id } });
  };

  const confirmRemoveSavedRoute = (route: SavedRoute) => {
    Alert.alert(route.name, '저장한 경로를 지울까요? 이 경로를 쓰는 출퇴근 루틴도 동작하지 않게 됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => removeSavedRoute(route.id) },
    ]);
  };

  const confirmRemoveFavorite = (station: UniqueStation) => {
    Alert.alert(station.displayName, '즐겨찾기에서 지울까요?', [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => removeFavorite(station.key) },
    ]);
  };

  const saveCurrent = (name: string) => {
    if (!saving || !origin || !destination) return;
    saveRoute({ name, originKey: origin.key, destinationKey: destination.key, plan: saving });
  };

  // 데이터셋이 바뀌어 저장 경로를 다시 찾았으면 저장값도 갱신해 둡니다.
  useEffect(() => {
    if (savedMatch?.refreshed) updateSavedRoute(savedMatch.route.id, { plan: savedMatch.plan });
  }, [savedMatch, updateSavedRoute]);

  if (target !== null) {
    const placeholder =
      typeof target === 'object'
        ? `${target.assign === 'home' ? '집' : '회사'} 근처 역 검색`
        : target === 'origin'
          ? '출발역 검색'
          : target === 'via'
            ? '경유역 검색'
            : '도착역 검색';
    const favoriteStations = favorites
      .map((f) => getUniqueStation(f.key))
      .filter((s): s is UniqueStation => !!s);
    const recentStations = [...new Set(recents.flatMap((r) => [r.originKey, r.destinationKey ?? '']))]
      .map((k) => getUniqueStation(k))
      .filter((s): s is UniqueStation => !!s && !favoriteStations.some((f) => f.key === s.key))
      .slice(0, 6);
    const quickPicks = query.trim().length === 0 ? [...favoriteStations, ...recentStations] : [];

    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.searchBar}>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <Pressable onPress={closeSearch} hitSlop={8}>
            <Text style={[Typography.bodyStrong, { color: theme.accent }]}>취소</Text>
          </Pressable>
        </View>
        <FlatList
          data={query.trim().length === 0 ? quickPicks : results}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            quickPicks.length > 0 ? (
              <Text style={[Typography.section, styles.listHeader, { color: theme.textSecondary }]}>즐겨찾기 · 최근</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <StationRow
              name={item.displayName}
              groupIds={item.groupIds}
              subtitle={favoriteStations.some((f) => f.key === item.key) ? '★ 즐겨찾기' : undefined}
              onPress={() => pick(item)}
            />
          )}
          ListEmptyComponent={
            query.trim().length === 0 ? (
              <EmptyState
                title="역 이름을 입력해 주세요"
                description={`수도권 전철 ${UNIQUE_STATIONS.length}개 역을 검색할 수 있습니다.`}
              />
            ) : (
              <EmptyState title="일치하는 역이 없습니다" description="역 이름의 일부만 입력해도 찾을 수 있습니다." />
            )
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <HomeHeader />
        <ActiveTripBanner />
        <RoutinePromptBanner />
        {savedRoutes.length > 0 ? (
          <>
            <SectionTitle
              title="내 경로"
              action={{
                label: routines.length > 0 ? `출퇴근 루틴 ${routines.length}개` : '출퇴근 루틴 만들기',
                onPress: () => router.push('/routines'),
              }}
            />
            <SavedRoutesStrip routes={savedRoutes} onPress={openSavedRoute} onLongPress={confirmRemoveSavedRoute} />
          </>
        ) : null}
        <RouteSearchCard
          origin={origin}
          destination={destination}
          via={via}
          active={activeSlot}
          recents={recents}
          onFocusSlot={openSearch}
          onClear={clearSlot}
          onSwap={swap}
          onPickRecent={pickRecent}
        />

        {sameStation ? (
          <Text style={[Typography.caption, styles.notice, { color: theme.danger }]}>출발역과 도착역이 같습니다.</Text>
        ) : null}
        {origin && destination && !sameStation && routes.length === 0 ? (
          <Text style={[Typography.caption, styles.notice, { color: theme.textSecondary }]}>두 역을 잇는 경로를 찾지 못했습니다.</Text>
        ) : null}
        {notificationNotice && routes.length > 0 ? (
          <Text style={[Typography.caption, styles.notice, { color: theme.danger }]}>{notificationNotice}</Text>
        ) : null}

        {routes.length > 0 ? (
          <View style={styles.routes}>
            <SectionTitle title={savedMatch ? '내 경로 · 추천' : '추천 경로'} />
            <RouteResults routes={routes} onPress={openRoute} onSave={setSaving} />
          </View>
        ) : null}

        {origin && !destination ? (
          <Pressable
            onPress={() => openArrivals(origin)}
            style={({ pressed }) => [styles.secondary, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[Typography.bodyStrong, { color: theme.text }]}>{origin.displayName} 실시간 도착 보기</Text>
          </Pressable>
        ) : null}

        <FrequentRoutes history={history} savedRoutes={savedRoutes} onPress={pickPair} />

        <SectionTitle
          title="즐겨찾기"
          action={recents.length > 0 ? { label: '최근 검색 지우기', onPress: clearRecents } : undefined}
        />
        <FavoriteStrip
          favorites={favorites}
          previews={previews}
          now={now}
          onPress={openArrivals}
          onLongPress={confirmRemoveFavorite}
          onAssign={(label) => openSearch({ assign: label })}
        />
        {favorites.length === 0 ? (
          <Text style={[Typography.caption, styles.hint, { color: theme.textSecondary }]}>
            역 화면의 ★ 로 즐겨찾기를 더할 수 있습니다. 집·회사를 지정하면 홈에서 바로 다음 열차가 보입니다.
          </Text>
        ) : null}

        <NearbyStations onPress={openArrivals} />
        <NoticeStrip />
        <LineChips />
        <View style={{ height: Spacing.five }} />
      </ScrollView>

      <SaveRouteSheet
        visible={saving !== null}
        originName={origin?.displayName ?? ''}
        destinationName={destination?.displayName ?? ''}
        onSave={saveCurrent}
        onClose={() => setSaving(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing.four },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  search: { flex: 1, height: 44, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 16 },
  listHeader: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: 4 },
  notice: { marginHorizontal: Spacing.three, marginTop: Spacing.two, lineHeight: 18 },
  routes: { marginTop: 0 },
  secondary: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two + 4,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  hint: { marginHorizontal: Spacing.three, marginTop: Spacing.two, lineHeight: 17 },
});
