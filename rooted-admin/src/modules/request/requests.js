/**
 * 요청사항 (F7) 과 예식 당일 체크 (F9).
 * 요청 내용은 당일 눈으로 확인할 수 있는 한 줄(80자 이내).
 */
const REQUEST_MAX_LEN = 80;

function requestsFor(customerId) {
  return readRows(TABS.REQUEST).filter(r => r['고객ID'] === customerId).map(requestView_);
}

function requestView_(r) {
  return {
    id: r['요청ID'], customerId: r['고객ID'], part: r['파트'], content: r['내용'], sourceId: r['출처기록ID'],
    photo: r['사진링크'] || '', photoId: driveIdFromUrl(r['사진링크']),
    confirmedAt: String(r['고객확인일시'] || ''), status: r['상태'] || '대기',
    checker: r['확인자'] || '', checkedAt: String(r['확인시각'] || '').slice(11, 16),
  };
}

/** 추가(F7.2)·수정(F7.3). 수정하면 D-7 고객 확인이 풀린다. */
function saveRequest(data) {
  const content = String(data.content || '').trim();
  if (!CHOICES.PART.includes(data.part)) throw new Error('파트를 골라 주세요');
  if (!content) throw new Error('요청 내용을 적어 주세요');
  if (content.length > REQUEST_MAX_LEN) throw new Error('요청 내용은 한 줄(' + REQUEST_MAX_LEN + '자) 이내로 적어 주세요');

  if (data.id) {
    const row = findRow(TABS.REQUEST, '요청ID', data.id);
    if (!row) throw new Error('요청사항을 찾을 수 없습니다');
    const changed = row['파트'] !== data.part || row['내용'] !== content;
    const patch = { '파트': data.part, '내용': content, '사진링크': data.photo || '' };
    if (changed) patch['고객확인일시'] = '';
    updateRow(TABS.REQUEST, row._row, patch);
    return data.id;
  }
  const id = nextId(TABS.REQUEST, 'Q-', 4);
  appendRow(TABS.REQUEST, {
    '요청ID': id, '고객ID': data.customerId, '파트': data.part, '내용': content,
    '출처기록ID': data.sourceId || '', '사진링크': data.photo || '', '상태': '대기',
  });
  return id;
}

/** 삭제 (F7.4) */
function deleteRequest(id) {
  return deleteRowsWhere(TABS.REQUEST, r => r['요청ID'] === id) > 0;
}

/** D-7 고객 최종 확인 (F7.5) */
function confirmRequest(id, confirmed) {
  const row = findRow(TABS.REQUEST, '요청ID', id);
  if (!row) throw new Error('요청사항을 찾을 수 없습니다');
  updateRow(TABS.REQUEST, row._row, { '고객확인일시': confirmed ? nowStamp() : '' });
  return true;
}

/** 당일 체크 화면 (F9.1–F9.4) — 고를 수 있는 예식 목록과 선택한 예식의 체크리스트 */
function dayOfView(customerId, user) {
  const today = todayKey();
  const events = readRows(TABS.CUSTOMER)
    .filter(c => SCHEDULED_STAGES.includes(c['진행단계']) && toDateKey(c['예식일']))
    .map(c => ({ id: c['고객ID'], name: c['이름'], date: toDateKey(c['예식일']), slot: c['예식슬롯'] || '', people: c['예상인원'] || '' }))
    .filter(e => (user.role === ROLE.STAFF ? [today, addDays(today, 1)].includes(e.date) : e.date >= addDays(today, -7)))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const selected = events.find(e => e.id === customerId) || events.find(e => e.date >= today) || events[0] || null;
  if (!selected) return { events: [], selected: null, requests: [], timetable: [] };

  const detail = readRows(TABS.WEDDING_DETAIL).find(d => d['고객ID'] === selected.id);
  selected.people = (detail && detail['최종인원']) || selected.people;
  selected.dateLabel = formatKoreanDate(selected.date);
  selected.dday = ddayLabel(selected.date, today);
  return {
    events: events.map(e => ({ id: e.id, label: formatKoreanDate(e.date) + ' ' + e.slot + ' · ' + e.name })),
    selected: selected,
    requests: requestsFor(selected.id),
    timetable: readRows(TABS.TIMETABLE, 600).filter(t => !selected.slot || t['슬롯'] === selected.slot)
      .map(t => ({ time: normalizeTime_(t['시각']), text: t['내용'] })),
  };
}

function normalizeTime_(v) {
  const s = String(v || '');
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2, '0') + ':' + m[2] : s;
}

/** 체크·해제 (F9.5) */
function checkRequest(id, checked, checker) {
  const row = findRow(TABS.REQUEST, '요청ID', id);
  if (!row) throw new Error('요청사항을 찾을 수 없습니다');
  updateRow(TABS.REQUEST, row._row, checked
    ? { '상태': '확인', '확인자': checker, '확인시각': nowStamp() }
    : { '상태': '대기', '확인자': '', '확인시각': '' });
  return requestView_(findRow(TABS.REQUEST, '요청ID', id));
}

/** 빠짐 (F9.7) — 사유를 남기고 회고 탭에 한 줄 */
function missRequest(id, reason, recorder) {
  const text = String(reason || '').trim();
  if (!text) throw new Error('빠진 사유를 적어 주세요');
  const row = findRow(TABS.REQUEST, '요청ID', id);
  if (!row) throw new Error('요청사항을 찾을 수 없습니다');
  const customer = findRow(TABS.CUSTOMER, '고객ID', row['고객ID']);
  updateRow(TABS.REQUEST, row._row, { '상태': '빠짐', '확인자': recorder, '확인시각': nowStamp() });
  appendRow(TABS.RETRO, {
    '회고ID': nextId(TABS.RETRO, 'V-', 4), '고객ID': row['고객ID'], '예식일': customer ? toDateKey(customer['예식일']) : '',
    '요청ID': id, '사유': '[' + row['파트'] + '] ' + row['내용'] + ' — ' + text, '기록자': recorder, '기록시각': nowStamp(),
  });
  return requestView_(findRow(TABS.REQUEST, '요청ID', id));
}

/** 07:00 당일 · 18:00 전날 파트별 체크리스트 (F11.6) @return {number} 보낸 예식 수 */
function sendDayChecklists(dateKey, label) {
  const weddings = readRows(TABS.CUSTOMER).filter(c => SCHEDULED_STAGES.includes(c['진행단계']) && toDateKey(c['예식일']) === dateKey);
  for (const c of weddings) {
    const reqs = requestsFor(c['고객ID']);
    const lines = ['**' + label + ' 체크리스트 · ' + c['이름'] + ' · ' + formatKoreanDate(dateKey) + ' ' + (c['예식슬롯'] || '') + '**'];
    for (const part of CHOICES.PART) {
      const items = reqs.filter(r => r.part === part);
      if (!items.length) continue;
      lines.push('', '**' + part + '**');
      items.forEach(r => lines.push('- ' + r.content + (r.photo ? ' (사진 있음)' : '')));
    }
    if (!reqs.length) lines.push('', '등록된 요청사항 없음');
    createAlert({
      customerId: c['고객ID'], type: label + ' 체크리스트', channel: 'WEDDING',
      dedupeKey: c['고객ID'] + ':체크리스트:' + label + ':' + dateKey,
      content: c['이름'] + ' · ' + label + ' 파트별 체크리스트 ' + reqs.length + '건', discordText: lines.join('\n'),
    });
  }
  return weddings.length;
}
