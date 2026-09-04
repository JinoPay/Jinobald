import * as Notifications from 'expo-notifications';

import { capabilities } from '@/services/location/capabilities';

import { ACTION, CATEGORY } from './action-ids';

export { ACTION, CATEGORY, categoryForKind } from './action-ids';

/**
 * 알림 카테고리와 액션 버튼.
 *
 * 알림에서 바로 "승차했어요 / 갈아탔어요 / 확인"을 누를 수 있어야 합니다. 잠결에 알림을
 * 확인한 사용자가 앱을 열어 버튼을 찾게 하면 안 됩니다. 식별자는 `response.ts` 가 해석합니다.
 */
/** 앱을 열지 않고 처리하는 버튼. 앱이 죽어 있으면 다음 실행 때 `getLastNotificationResponseAsync` 로 이어받습니다. */
const inBackground = { opensAppToForeground: false };
const inForeground = { opensAppToForeground: true };

let registered: Promise<void> | null = null;

/** 루트 레이아웃에서 한 번 부릅니다. 실패해도 알림 자체는 동작하므로 삼킵니다. */
export function registerCategories(): Promise<void> {
  if (!capabilities.localNotifications) return Promise.resolve();
  registered ??= (async () => {
    try {
      await Promise.all([
        Notifications.setNotificationCategoryAsync(CATEGORY.board, [
          { identifier: ACTION.boarded, buttonTitle: '승차했어요', options: inBackground },
          { identifier: ACTION.notThisTrain, buttonTitle: '이 열차 아님', options: inBackground },
        ]),
        Notifications.setNotificationCategoryAsync(CATEGORY.pre, [
          { identifier: ACTION.ack, buttonTitle: '확인', options: inBackground },
        ]),
        Notifications.setNotificationCategoryAsync(CATEGORY.arrive, [
          { identifier: ACTION.ack, buttonTitle: '확인 (여정 종료)', options: inBackground },
        ]),
        Notifications.setNotificationCategoryAsync(CATEGORY.transfer, [
          { identifier: ACTION.advanced, buttonTitle: '갈아탔어요', options: inBackground },
          { identifier: ACTION.ack, buttonTitle: '확인', options: inBackground },
        ]),
        Notifications.setNotificationCategoryAsync(CATEGORY.routine, [
          { identifier: ACTION.startRoutine, buttonTitle: '여정 시작', options: inForeground },
          { identifier: ACTION.skipToday, buttonTitle: '오늘은 건너뛰기', options: inBackground },
        ]),
      ]);
    } catch {
      // 카테고리 등록 실패는 버튼이 없는 알림으로 떨어질 뿐입니다.
    }
  })();
  return registered;
}
