import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { LineBadge } from '@/components/subway/LineBadge';
import { LineMap } from '@/components/subway/LineMap';
import { StationRow } from '@/components/subway/StationRow';
import { LINES, normalizeStationName, searchStations } from '@/data/stations';
import { useTheme } from '@/hooks/use-theme';

export default function LineMapScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedLineId, setSelectedLineId] = useState(LINES[0].id);

  const results = useMemo(() => searchStations(query), [query]);
  const selectedLine = useMemo(
    () => LINES.find((l) => l.id === selectedLineId) ?? LINES[0],
    [selectedLineId],
  );

  const openStation = (name: string) => {
    router.push(`/station/${encodeURIComponent(normalizeStationName(name))}`);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchWrapper}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="역 이름 검색"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.search,
            { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
          ]}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {query.trim().length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <StationRow
              name={item.displayName}
              lineIds={item.lineIds}
              onPress={() => openStation(item.displayName)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="일치하는 역이 없습니다"
              description="현재 데이터셋은 서울 1~9호선 본선만 포함합니다."
            />
          }
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lineTabs}>
            {LINES.map((line) => {
              const active = line.id === selectedLineId;
              return (
                <Pressable
                  key={line.id}
                  onPress={() => setSelectedLineId(line.id)}
                  style={[
                    styles.lineTab,
                    {
                      backgroundColor: active ? line.color : theme.backgroundElement,
                      borderColor: active ? line.color : theme.border,
                    },
                  ]}>
                  <Text style={[styles.lineTabText, { color: active ? '#fff' : theme.text }]}>
                    {line.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.lineHeader}>
            <LineBadge lineId={selectedLine.id} />
            <Text style={[styles.lineNote, { color: theme.textSecondary }]} numberOfLines={2}>
              {selectedLine.note}
            </Text>
          </View>

          <LineMap line={selectedLine} onSelectStation={openStation} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  search: { height: 44, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, borderWidth: 1 },
  lineTabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  lineTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  lineTabText: { fontSize: 14, fontWeight: '600' },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  lineNote: { flex: 1, fontSize: 12, lineHeight: 16 },
});
