/**
 * 매일 아침 요약 (F11.5) — #오늘-할-일로 한 메시지.
 * 오늘 알림 · 이번 주 행사 · 미입금 · 미응대 문의 · 지난 24시간 오류
 */
const UNANSWERED_STAGE = '문의';

/** @return {string} 보낸 메시지 본문 */
function sendMorningSummary() {
  const text = buildMorningSummary(todayKey(), new Date(),
    readRows(TABS.CUSTOMER), readRows(TABS.ALERT), readRows(TABS.ERROR_LOG), todayTasks());
  sendDiscord('TODAY', text.length > 1900 ? text.slice(0, 1899) + '…' : text);
  return text;
}

/** 순수 계산 — 테스트하기 쉽게 입력을 모두 인자로 받는다. */
function buildMorningSummary(today, now, customers, alerts, errors, tasks) {
  const lines = ['**오늘 할 일 요약 · ' + formatKoreanDate(today) + '**'];

  const todaysAlerts = alerts.filter(a => String(a['발생시각']).slice(0, 10) === today || (a['보류'] === true && a['해제'] !== true));
  lines.push('', '**오늘 알림 ' + todaysAlerts.length + '건**');
  todaysAlerts.forEach(a => lines.push('- ' + (a['급함'] === true ? '[급함] ' : '') + '[' + a['종류'] + '] ' + a['내용']));
  if (!todaysAlerts.length) lines.push('- 없음');

  const open = (tasks || []).filter(t => !t.done);
  lines.push('', '**오늘 할 일 ' + open.length + '건**');
  open.forEach(t => lines.push('- ' + (t.overdue ? '(밀림) ' : '') + t.text));
  if (!open.length) lines.push('- 없음');

  const weekEnd = addDays(today, 7);
  const events = customers
    .filter(c => SCHEDULED_STAGES.includes(c['진행단계']))
    .map(c => ({ c: c, key: toDateKey(c['예식일']) }))
    .filter(x => x.key && x.key >= today && x.key <= weekEnd)
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  lines.push('', '**이번 주 행사 ' + events.length + '건**');
  events.forEach(x => lines.push('- ' + formatKoreanDate(x.key) + ' ' + (x.c['예식슬롯'] || '') + ' · ' + x.c['이름'] + ' · ' + ddayLabel(x.key, today)));
  if (!events.length) lines.push('- 없음');

  const unpaid = unpaidItems(customers, today);
  lines.push('', '**미입금 ' + unpaid.length + '건**');
  unpaid.forEach(u => lines.push('- ' + u));
  if (!unpaid.length) lines.push('- 없음');

  const unanswered = customers.filter(c => c['진행단계'] === UNANSWERED_STAGE && !c['첫연락일']);
  lines.push('', '**미응대 문의 ' + unanswered.length + '건**');
  unanswered.forEach(c => {
    const hours = hoursSince_(c['접수일시'], now);
    lines.push('- ' + (hours >= 24 ? '[급함] ' : '') + c['이름'] + ' · 접수 ' + (hours === null ? '시각 미상' : hours + '시간 전'));
  });
  if (!unanswered.length) lines.push('- 없음');

  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const recentErrors = errors.filter(e => {
    const t = parseStamp_(e['시각']);
    return t && t >= since && e['작업'] !== '자가 점검';
  });
  if (recentErrors.length) {
    lines.push('', '**지난 24시간 오류 ' + recentErrors.length + '건** — 오류기록 탭 확인');
    recentErrors.slice(0, 5).forEach(e => lines.push('- ' + e['작업'] + ': ' + String(e['메시지']).slice(0, 80)));
  }
  return lines.join('\n');
}

/**
 * 미입금 목록. 납부 시점: 계약금=계약 시, 중도금=D-90, 잔금=D-14.
 * 납부 시점이 지났거나 7일 안에 오는데 입금일이 비어 있으면 포함.
 */
function unpaidItems(customers, today) {
  const out = [];
  const soon = addDays(today, 7);
  for (const c of customers.filter(x => SCHEDULED_STAGES.includes(x['진행단계']))) {
    const wedding = toDateKey(c['예식일']);
    const due = {
      '계약금': toDateKey(c['계약일']) || today,
      '중도금': wedding ? ddayDate(wedding, 90) : '',
      '잔금': wedding ? ddayDate(wedding, 14) : '',
    };
    for (const kind of ['계약금', '중도금', '잔금']) {
      if (!c[kind] || c[kind + '입금일'] || !due[kind] || due[kind] > soon) continue;
      out.push(c['이름'] + ' · ' + kind + ' ' + formatWon(c[kind]) + ' · ' + (due[kind] < today ? '기한 지남' : formatKoreanDate(due[kind]) + '까지'));
    }
  }
  return out;
}

function parseStamp_(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], (+m[4] || 0) - 9, +m[5] || 0));
}

function hoursSince_(stamp, now) {
  const t = parseStamp_(stamp);
  return t ? Math.floor((now - t) / 3600000) : null;
}
