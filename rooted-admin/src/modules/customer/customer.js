/**
 * 고객 화면용 데이터 (F4, F5) — 시트 행을 화면이 쓰기 좋은 모양으로 바꾼다.
 */
const PIPELINE_STAGES = ['문의', '연락', '답사', '견적', '계약'];
const JOURNEY_STEPS = ['문의', '첫 연락', '답사', '견적', '계약', 'D-day 준비', '예식 당일', '정산·회고', '후기 요청', '콘텐츠화'];
const PAYMENT_KINDS = ['계약금', '중도금', '잔금'];

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return phone ? '****' : '';
  return digits.slice(0, 3) + '-****-' + digits.slice(-4);
}

/** 급함 사유 (24시간 미응대, D-14 이후 잔금 미입금) */
function urgentReason(c, today, now) {
  if (c['진행단계'] === '문의' && !c['첫연락일']) {
    const h = hoursSince_(c['접수일시'], now);
    if (h !== null && h >= 24) return '문의 후 ' + h + '시간 미응대';
  }
  const wedding = toDateKey(c['예식일']);
  if (wedding && SCHEDULED_STAGES.includes(c['진행단계']) && c['잔금'] && !c['잔금입금일'] && today >= ddayDate(wedding, 14) && today <= wedding) {
    return ddayLabel(wedding, today) + ' 잔금 미입금 ' + formatWon(c['잔금']);
  }
  return '';
}

/** 마지막 연락 후 경과일 — 첫연락일·답사일·견적발송일·접수일 중 가장 최근 */
function daysSinceContact_(c, today) {
  const keys = [c['견적발송일'], c['답사일'], c['첫연락일'], c['접수일시']].map(toDateKey).filter(k => k && k <= today);
  if (!keys.length) return null;
  keys.sort();
  return daysBetween(keys[keys.length - 1], today);
}

/** 목록·카드용 요약 */
function customerCard(c, today, now) {
  const wedding = toDateKey(c['예식일']);
  const hope = toDateKey(c['희망날짜1']);
  const phone = String(c['연락처'] || '').replace(/\D/g, '');
  return {
    id: c['고객ID'],
    name: c['이름'] || '(이름 없음)',
    type: c['행사종류'] || '',
    stage: c['진행단계'] || '문의',
    people: c['예상인원'] || '',
    source: c['유입경로'] || '',
    wedding: wedding,
    weddingLabel: wedding ? formatKoreanDate(wedding) : '',
    hope: hope,
    hopeLabel: hope ? formatKoreanDate(hope) : '',
    slot: c['예식슬롯'] || c['희망슬롯'] || '',
    dday: wedding ? ddayLabel(wedding, today) : '',
    availability: c['_예약가능'] || '',
    phoneMasked: maskPhone(c['연락처']),
    phoneLast4: phone.slice(-4),
    receivedAt: String(c['접수일시'] || ''),
    hoursSinceReceived: hoursSince_(c['접수일시'], now),
    daysSinceContact: daysSinceContact_(c, today),
    visit: toDateKey(c['답사일']),
    urgent: urgentReason(c, today, now),
    failReason: c['실패사유'] || '',
    failStage: c['실패단계'] || '',
  };
}

/** 10칸 여정 바 상태: done / current / todo */
function journeySteps(c, today) {
  const wedding = toDateKey(c['예식일']);
  const contracted = SCHEDULED_STAGES.includes(c['진행단계']);
  const done = [
    true,
    Boolean(c['첫연락일']) || c['진행단계'] !== '문의',
    Boolean(toDateKey(c['답사일']) && toDateKey(c['답사일']) <= today),
    Boolean(c['견적발송일']),
    Boolean(c['계약일']) || contracted,
    Boolean(contracted && wedding && wedding <= today),
    Boolean(contracted && wedding && wedding < today),
    Boolean(contracted && wedding && (addDays(wedding, 1) < today || c['회고메모'])),
    Boolean(c['후기요청일']),
    c['콘텐츠활용'] === true,
  ];
  const dates = [
    toDateKey(c['접수일시']), toDateKey(c['첫연락일']), toDateKey(c['답사일']), toDateKey(c['견적발송일']), toDateKey(c['계약일']),
    wedding ? ddayDate(wedding, 90) : '', wedding, wedding ? addDays(wedding, 1) : '', toDateKey(c['후기요청일']) || (wedding ? addDays(wedding, 7) : ''),
    wedding ? addDays(wedding, 30) : '',
  ];
  let currentSet = false;
  return JOURNEY_STEPS.map((label, i) => {
    let state = done[i] ? 'done' : 'todo';
    if (!done[i] && !currentSet && c['진행단계'] !== '실패') { state = 'current'; currentSet = true; }
    return { label: label, state: state, date: dates[i] ? shortDate_(dates[i]) : '' };
  });
}

function shortDate_(key) {
  return Number(key.slice(5, 7)) + '.' + Number(key.slice(8, 10));
}

/** 다음 할 일 한 줄 */
function nextAction(c, schedule, today) {
  if (c['진행단계'] === '문의' && !c['첫연락일']) return { text: '첫 연락 — 문자 초안 확인 후 직접 발송', date: '', urgent: Boolean(urgentReason(c, today, new Date())) };
  if (c['진행단계'] === '답사' && toDateKey(c['답사일']) >= today) return { text: '답사 ' + formatKoreanDate(toDateKey(c['답사일'])), date: toDateKey(c['답사일']), urgent: false };
  if (c['진행단계'] === '견적') return { text: '견적 팔로업 연락', date: '', urgent: false };
  const upcoming = schedule.filter(s => toDateKey(s['날짜']) >= today).sort((a, b) => (toDateKey(a['날짜']) < toDateKey(b['날짜']) ? -1 : 1))[0];
  if (upcoming) {
    let text = upcoming['내용'];
    if (upcoming['시점'] === 'D-14' && c['잔금'] && !c['잔금입금일']) text = '잔금 ' + formatWon(c['잔금']) + ' 입금 확인 · 최종 인원 확정';
    return { text: '[' + upcoming['시점'] + '] ' + text, date: formatKoreanDate(toDateKey(upcoming['날짜'])), urgent: Boolean(urgentReason(c, today, new Date())) };
  }
  return { text: '예정된 일 없음', date: '', urgent: false };
}

/** 입금 세 줄 */
function payments(c) {
  const rows = PAYMENT_KINDS.filter(k => c[k]).map(k => ({
    kind: k, amount: formatWon(c[k]), paidDate: toDateKey(c[k + '입금일']), paid: Boolean(c[k + '입금일']),
  }));
  return { rows: rows, total: c['총액'] ? formatWon(c['총액']) : '' };
}

/** 고객 사이클 화면 전체 */
function customerDetail(id) {
  const today = todayKey();
  const now = new Date();
  const c = findRow(TABS.CUSTOMER, '고객ID', id);
  if (!c) throw new Error('고객을 찾을 수 없습니다: ' + id);
  const schedule = readRows(TABS.SCHEDULE).filter(s => s['고객ID'] === id)
    .sort((a, b) => (toDateKey(a['날짜']) < toDateKey(b['날짜']) ? -1 : 1));
  const detail = readRows(TABS.WEDDING_DETAIL).find(d => d['고객ID'] === id) || {};
  const nextIdx = schedule.findIndex(s => toDateKey(s['날짜']) >= today);

  return {
    card: customerCard(c, today, now),
    journey: journeySteps(c, today),
    next: nextAction(c, schedule, today),
    briefing: {
      status: c['_브리핑상태'] || '',
      summary: c['_브리핑요약'] || '',
      callPoints: String(c['_통화포인트'] || '').split('\n').map(s => s.replace(/^[•\-]\s*/, '')).filter(Boolean),
      draft: c['_문자초안'] || '',
      quote: c['견적기금액'] || '',
      inquiry: c['문의내용'] || '',
      firstContact: toDateKey(c['첫연락일']),
    },
    payments: payments(c),
    schedule: schedule.map((s, i) => ({
      point: s['시점'], date: formatKoreanDate(toDateKey(s['날짜'])), text: s['내용'],
      past: toDateKey(s['날짜']) < today, next: i === nextIdx,
    })),
    detail: TABS.WEDDING_DETAIL.headers.slice(1).map(h => ({ key: h, value: detail[h] || '' })).filter(x => x.value !== ''),
    sales: ['분위기', '예산감', '중요기준', '결정권자', '하객지역', '특이사항', '패키지', '옵션'].map(h => ({ key: h, value: c[h] || '' })).filter(x => x.value !== ''),
    consults: consultsFor(id),
    requests: requestsFor(id),
    folderUrl: c['_드라이브폴더'] || '',
    sheetUrl: getSpreadsheet().getUrl() + '#gid=' + getTab(TABS.CUSTOMER).getSheetId() + '&range=A' + c._row,
  };
}

/** 첫 연락 완료 (F10.3) */
function markFirstContact(id) {
  const c = findRow(TABS.CUSTOMER, '고객ID', id);
  if (!c) throw new Error('고객을 찾을 수 없습니다');
  const patch = { '첫연락일': todayKey() };
  if (c['진행단계'] === '문의' || !c['진행단계']) patch['진행단계'] = '연락';
  updateRow(TABS.CUSTOMER, c._row, patch);
  resolveAlertsOfType(id, '미응대 24시간');
  return true;
}

/** 입금 확인·되돌리기 (F5.6, F11.7) */
function setPayment(id, kind, paid) {
  if (!PAYMENT_KINDS.includes(kind)) throw new Error('알 수 없는 입금 종류');
  const c = findRow(TABS.CUSTOMER, '고객ID', id);
  if (!c) throw new Error('고객을 찾을 수 없습니다');
  updateRow(TABS.CUSTOMER, c._row, { [kind + '입금일']: paid ? todayKey() : '' });
  if (kind === '잔금') {
    if (paid) resolveAlertsOfType(id, 'D-14');
    else reopenAlertsOfType(id, 'D-14');
  }
  return true;
}
