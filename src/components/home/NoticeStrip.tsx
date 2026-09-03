import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineBadge } from '@/components/subway/LineBadge';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useNotices } from '@/hooks/use-notices';
import { useTheme } from '@/hooks/use-theme';

import { SectionTitle } from './SectionTitle';

/** 지연·사고·무정차 공지. 없으면 섹션째로 사라집니다 — 없는 것이 정상입니다. */
export function NoticeStrip() {
  const theme = useTheme();
  const notices = useNotices();
  const [expanded, setExpanded] = useState<string | null>(null);
  if (notices.length === 0) return null;

  return (
    <View>
      <SectionTitle title="운행 공지" />
      <View style={styles.list}>
        {notices.slice(0, 5).map((notice) => {
          const open = expanded === notice.id;
          return (
            <Pressable
              key={notice.id}
              onPress={() => setExpanded(open ? null : notice.id)}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderLeftColor: theme.warning }]}>
              <View style={styles.header}>
                {notice.groupId ? <LineBadge groupId={notice.groupId} size="sm" /> : null}
                <Text style={[Typography.bodyStrong, { color: theme.text, flex: 1 }]} numberOfLines={open ? undefined : 1}>
                  {notice.title}
                </Text>
                <Text style={[Typography.caption, { color: theme.textSecondary }]}>{notice.category}</Text>
              </View>
              {open && notice.content ? (
                <Text style={[Typography.caption, { color: theme.textSecondary, lineHeight: 17 }]}>{notice.content}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: Spacing.three, gap: Spacing.two },
  card: { borderRadius: Radius.md, borderLeftWidth: 3, padding: Spacing.two + 4, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
