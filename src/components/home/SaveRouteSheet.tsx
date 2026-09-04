import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  originName: string;
  destinationName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

/** 경로 이름을 붙여 저장합니다. 출근·퇴근이 대부분이라 그 둘을 칩으로 먼저 내밉니다. */
export function SaveRouteSheet({ visible, originName, destinationName, onSave, onClose }: Props) {
  const theme = useTheme();
  const fallback = `${originName} → ${destinationName}`;
  const [name, setName] = useState('');

  const close = () => {
    setName('');
    onClose();
  };

  const submit = () => {
    onSave(name.trim() || fallback);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="닫기" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[Typography.heading, { color: theme.text }]}>이 경로 저장</Text>
          <Text style={[Typography.caption, { color: theme.textSecondary }]}>{fallback}</Text>
          <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            저장한 경로는 같은 출발·도착을 검색할 때 추천보다 앞에 오고, 출퇴근 루틴에서 고를 수 있습니다.
          </Text>
          <View style={styles.chips}>
            {['출근', '퇴근', fallback].map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setName(suggestion)}
                style={[
                  styles.chip,
                  {
                    borderColor: name === suggestion ? theme.accent : theme.border,
                    backgroundColor: name === suggestion ? theme.accent : theme.backgroundElement,
                  },
                ]}>
                <Text style={{ color: name === suggestion ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={fallback}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            returnKeyType="done"
            onSubmitEditing={submit}
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable onPress={close} style={[styles.button, { borderColor: theme.border }]}>
              <Text style={[Typography.bodyStrong, { color: theme.text }]}>취소</Text>
            </Pressable>
            <Pressable onPress={submit} style={[styles.button, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
              <Text style={[Typography.bodyStrong, { color: '#fff' }]}>저장</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%' },
  input: { height: 44, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 16 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: 4 },
  button: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1 },
});
