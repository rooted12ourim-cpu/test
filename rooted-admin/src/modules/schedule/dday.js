/**
 * D-day 일정 (F11.2) — 예식일 기준 11개 시점을 D-day일정 탭과 구글 캘린더 "루티드 예식"에 만든다.
 * 예식일이 바뀌면 이전 일정을 지우고 다시 만든다. 기준 예식일은 고객 탭 _일정기준예식일에 적어 둔다.
 */
const CALENDAR_NAME = '루티드 예식';

/** 기획서 '알람 체계' 표의 예식 시점. n: 예식 n일 전(음수면 후) */
const DDAY_POINTS = [
  { n: 90, label: 'D-90', text: '중도금 요청' },
  { n: 60, label: 'D-60', text: '상세 미팅 일정 잡기' },
  { n: 30, label: 'D-30', text: '메뉴·플라워·큐시트·외부 업체 확정' },
  { n: 14, label: 'D-14', text: '잔금과 최종 인원 확정' },
  { n: 7, label: 'D-7', text: '정육·수산 발주(인원 기준 수량), 인력 확정, 플라워 최종 확인, 요청사항 고객 최종 확인' },
  { n: 3, label: 'D-3', text: '날씨 예보 확인' },
  { n: 1, label: 'D-1', text: '우천 전환 결정, 방역·예초, 세팅, 큐시트 최종, 파트별 요청사항 체크리스트 발송' },
  { n: 0, label: 'D-Day', text: '예식 당일 — 타임테이블, 파트별 요청사항 체크' },
  { n: -1, label: 'D+1', text: '정산 확인, 회고 작성' },
  { n: -7, label: 'D+7', text: '작가 원본 수령 확인, 후기 요청' },
  { n: -30, label: 'D+30', text: '후기 미작성 시 1회 리마인드' },
];

const SCHEDULED_STAGES = ['계약', '완료'];

/** 예식일 기준 일정 목록 (날짜 키 포함) */
function buildSchedule(weddingKey) {
  return DDAY_POINTS.map(p => ({ label: p.label, n: p.n, date: ddayDate(weddingKey, p.n), text: p.text }));
}

/** 이 고객의 일정을 예식일에 맞춘다. @return {'created'|'removed'|'unchanged'} */
function syncCustomerSchedule(customer) {
  const id = customer['고객ID'];
  const wedding = SCHEDULED_STAGES.includes(customer['진행단계']) ? toDateKey(customer['예식일']) : '';
  const basis = toDateKey(customer['_일정기준예식일']);
  if (wedding === basis) return 'unchanged';

  removeCustomerSchedule_(id);
  if (!wedding) {
    updateRow(TABS.CUSTOMER, customer._row, { '_일정기준예식일': '' });
    return 'removed';
  }

  const calendar = getWeddingCalendar_();
  const name = customer['이름'] || id;
  const today = todayKey();
  let seq = Number(nextId(TABS.SCHEDULE, 'S-', 4).slice(2));
  for (const item of buildSchedule(wedding)) {
    const event = calendar.createAllDayEvent('[' + item.label + '] ' + name + ' — ' + item.text, keyToLocalDate_(item.date), {
      description: '고객ID ' + id + ' · 예식일 ' + formatKoreanDate(wedding) + (customer['예식슬롯'] ? ' ' + customer['예식슬롯'] : ''),
    });
    appendRow(TABS.SCHEDULE, {
      '일정ID': 'S-' + String(seq++).padStart(4, '0'),
      '고객ID': id,
      '시점': item.label,
      '날짜': item.date,
      '내용': item.text,
      '캘린더이벤트ID': event.getId(),
      '상태': item.date < today ? '지남' : '예정',
    });
  }
  updateRow(TABS.CUSTOMER, customer._row, { '_일정기준예식일': wedding });

  createAlert({
    customerId: id,
    type: basis ? '예식일 변경' : '계약 직후',
    content: name + ' · 예식 ' + formatKoreanDate(wedding) + ' · D-day 일정 ' + DDAY_POINTS.length + '개 ' + (basis ? '다시 만듦' : '생성 완료'),
    channel: 'WEDDING',
    dedupeKey: id + ':일정:' + wedding,
  });
  return 'created';
}

/** 모든 고객의 일정을 맞춘다 (시트 수정 감지를 놓쳤을 때를 대비해 매시 실행). */
function syncAllSchedules() {
  const r = { created: 0, removed: 0 };
  for (const c of readRows(TABS.CUSTOMER)) {
    try {
      const result = syncCustomerSchedule(c);
      if (result === 'created') r.created++;
      if (result === 'removed') r.removed++;
    } catch (e) {
      logError('D-day 일정', c['고객ID'], e);
    }
  }
  return r;
}

function removeCustomerSchedule_(customerId) {
  const rows = readRows(TABS.SCHEDULE).filter(r => r['고객ID'] === customerId);
  if (rows.length === 0) return;
  const calendar = getWeddingCalendar_();
  for (const r of rows) {
    try {
      const ev = r['캘린더이벤트ID'] && calendar.getEventById(r['캘린더이벤트ID']);
      if (ev) ev.deleteEvent();
    } catch (e) {
      logError('캘린더 일정 삭제', customerId, e);
    }
  }
  deleteRowsWhere(TABS.SCHEDULE, r => r['고객ID'] === customerId);
}

/** "루티드 예식" 캘린더 (없으면 만들고 ID를 저장) */
function getWeddingCalendar_() {
  const savedId = getSetting('CALENDAR_ID');
  let cal = savedId ? CalendarApp.getCalendarById(savedId) : null;
  if (!cal) {
    const found = CalendarApp.getCalendarsByName(CALENDAR_NAME);
    cal = found.length ? found[0] : CalendarApp.createCalendar(CALENDAR_NAME, { color: CalendarApp.Color.BLUE });
    setSetting('CALENDAR_ID', cal.getId());
  }
  return cal;
}

/** 날짜 키 → 스크립트 시간대(Asia/Seoul) 자정 Date */
function keyToLocalDate_(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 시트 수정 감지 — 고객 탭 예식일·진행단계·예식슬롯 칸이 바뀌면 해당 행 일정을 맞춘다. */
function handleCustomerEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== TABS.CUSTOMER.name) return;
  const watched = ['예식일', '진행단계', '예식슬롯', '잔금입금일', '첫연락일']
    .map(h => TABS.CUSTOMER.headers.indexOf(h) + 1);
  const firstCol = e.range.getColumn();
  const lastCol = firstCol + e.range.getNumColumns() - 1;
  if (!watched.some(c => c >= firstCol && c <= lastCol)) return;

  const firstRow = Math.max(e.range.getRow(), 2);
  const lastRow = e.range.getRow() + e.range.getNumRows() - 1;
  for (const c of readRows(TABS.CUSTOMER).filter(r => r._row >= firstRow && r._row <= lastRow)) {
    try {
      syncCustomerSchedule(c);
      syncResolvedAlerts(c);
    } catch (err) {
      logError('시트 수정 처리', c['고객ID'], err);
    }
  }
}
