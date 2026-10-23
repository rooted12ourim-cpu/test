/**
 * 알람시계(트리거) — 설치와 실행 함수.
 * 트리거 함수는 화면 없이 돌아가므로 오류는 모두 오류기록 탭에 남긴다.
 */
const TRIGGERS = [
  { handler: 'runInquiryCheck', label: '문의 확인 (5분마다)', install: () => ScriptApp.newTrigger('runInquiryCheck').timeBased().everyMinutes(5).create() },
  { handler: 'runHourly', label: 'D-day 일정 맞추기·알림 점검·할 일 (매시)', install: () => ScriptApp.newTrigger('runHourly').timeBased().everyHours(1).create() },
  { handler: 'runDayChecklistMorning', label: '당일 파트별 체크리스트 (매일 07시대)', install: () => ScriptApp.newTrigger('runDayChecklistMorning').timeBased().everyDays(1).atHour(7).inTimezone(TZ).create() },
  { handler: 'runMorningSummary', label: '아침 요약 (매일 08시대)', install: () => ScriptApp.newTrigger('runMorningSummary').timeBased().everyDays(1).atHour(8).inTimezone(TZ).create() },
  { handler: 'runDayChecklistEvening', label: '내일 예식 체크리스트 (매일 18시대)', install: () => ScriptApp.newTrigger('runDayChecklistEvening').timeBased().everyDays(1).atHour(18).inTimezone(TZ).create() },
  { handler: 'onSheetEdit', label: '시트 수정 감지 (예식일·입금일·첫연락일)', install: () => ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(getSpreadsheet()).onEdit().create() },
];

/** 트리거를 설치한다. 같은 함수의 기존 트리거는 지우고 다시 만들어 중복을 막는다. */
function installTriggers() {
  const handlers = TRIGGERS.map(t => t.handler);
  for (const t of ScriptApp.getProjectTriggers()) {
    if (handlers.includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  }
  TRIGGERS.forEach(t => t.install());
  return TRIGGERS.map(t => t.label);
}

function safely_(task, fn) {
  try {
    return fn();
  } catch (e) {
    logError(task, '', e);
  }
}

/** 5분마다: 문의원본 → 고객 탭 → 예약 가능 → 브리핑 → #새-문의 */
function runInquiryCheck() {
  safely_('문의 확인', runInquiryPipeline);
}

/** 매시: 예식일 변경 놓친 것 맞추기 → 오늘 시점 알림 → 할 일 */
function runHourly() {
  safely_('D-day 일정', syncAllSchedules);
  safely_('알림 점검', () => runAlertChecks(false));
  safely_('할 일 생성', generateTasks);
}

/** 매일 07시대: 오늘 예식 파트별 체크리스트 */
function runDayChecklistMorning() {
  safely_('당일 체크리스트', () => sendDayChecklists(todayKey(), '당일 아침'));
}

/** 매일 18시대: 내일 예식 파트별 체크리스트 (D-1) */
function runDayChecklistEvening() {
  safely_('전날 체크리스트', () => sendDayChecklists(addDays(todayKey(), 1), '전날'));
}

/** 매일 08시대: 알림 점검 → 할 일 → 요약 */
function runMorningSummary() {
  safely_('알림 점검', () => runAlertChecks(true));
  safely_('할 일 생성', generateTasks);
  safely_('아침 요약', sendMorningSummary);
}

/** 시트를 직접 고칠 때 (설치형 트리거) */
function onSheetEdit(e) {
  safely_('시트 수정 감지', () => handleCustomerEdit(e));
}
