/**
 * 오류기록 — 자동화가 실패하면 오류기록 탭에 남기고 다음 아침 요약에 포함한다.
 * 기록 자체가 실패해도 원래 작업을 멈추지 않는다.
 */
function logError(task, customerId, error) {
  const message = error && error.message ? error.message : String(error);
  console.error('[' + task + '] ' + (customerId || '') + ' ' + message);
  try {
    appendRow(TABS.ERROR_LOG, {
      '시각': nowStamp(),
      '작업': task,
      '고객ID': customerId || '',
      '메시지': message,
    });
  } catch (e) {
    console.error('오류기록 실패: ' + e.message);
  }
}
