/**
 * 화면이 부르는 서버 함수 목록 (google.script.run.api*).
 * 모든 함수는 첫 줄에서 권한을 다시 확인한다 — 화면 코드를 고쳐도 우회할 수 없게.
 * 반환값은 JSON으로 한 번 걸러 Date 같은 값이 화면에 그대로 넘어가지 않게 한다.
 */
function plain_(value) {
  return JSON.parse(JSON.stringify(value === undefined ? null : value));
}

function asOperator_(token, fn) {
  const user = requireOperator(token);
  return plain_(fn(user));
}

/* ---------- 공통 ---------- */

function apiNav(token) {
  return asOperator_(token, () => ({ unread: alertList().filter(a => !a.read).length }));
}

/* ---------- 운영 보드 (F2, F3, F4.3) ---------- */

function apiBoard(token, month) {
  return asOperator_(token, () => {
    const today = todayKey();
    const now = new Date();
    const customers = readRows(TABS.CUSTOMER);
    const cards = customers.map(c => customerCard(c, today, now));
    const names = {};
    cards.forEach(c => { names[c.id] = c.name; });
    const alerts = alertList();
    const tasks = todayTasks().map(t => Object.assign(t, { customerName: names[t.customerId] || '' }));
    return {
      today: today,
      alerts: alerts.filter(a => !a.read).concat(alerts.filter(a => a.read)).slice(0, 8)
        .map(a => Object.assign(a, { customerName: names[a.customerId] || '' })),
      unread: alerts.filter(a => !a.read).length,
      tasks: tasks,
      newInquiries: cards.filter(c => c.stage === '문의').sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1)),
      pipeline: PIPELINE_STAGES.map(s => ({ stage: s, cards: cards.filter(c => c.stage === s) })),
      failed: cards.filter(c => c.stage === '실패')
        .map(c => ({ id: c.id, name: c.name, type: c.type, failStage: c.failStage, failReason: c.failReason })),
      calendar: calendarMonth(month || today.slice(0, 7), customers),
      search: cards.map(c => ({ id: c.id, name: c.name, wedding: c.wedding, hope: c.hope, last4: c.phoneLast4, stage: c.stage })),
    };
  });
}

/** 월간 캘린더 칸 — 예식(파란 칸)·답사(점) */
function calendarMonth(month, customers) {
  const [y, m] = month.split('-').map(Number);
  const first = month + '-01';
  const startOffset = keyToUtc(first).getUTCDay();
  const start = addDays(first, -startOffset);
  const events = {};
  const push = (key, item) => { (events[key] = events[key] || []).push(item); };
  for (const c of customers) {
    const w = toDateKey(c['예식일']);
    if (w && SCHEDULED_STAGES.includes(c['진행단계'])) push(w, { kind: 'wedding', id: c['고객ID'], label: (c['예식슬롯'] || '') + ' · ' + c['이름'] });
    const v = toDateKey(c['답사일']);
    if (v && c['진행단계'] !== '실패') push(v, { kind: 'visit', id: c['고객ID'], label: '답사 ' + c['이름'] });
  }
  const days = [];
  for (let i = 0; i < 42; i++) {
    const key = addDays(start, i);
    days.push({ key: key, day: Number(key.slice(8)), inMonth: key.slice(0, 7) === month, events: events[key] || [] });
  }
  const prev = utcToKey(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const next = utcToKey(new Date(Date.UTC(y, m, 1))).slice(0, 7);
  return { month: month, title: y + '년 ' + m + '월', prev: prev, next: next, days: days };
}

/* ---------- 고객 (F4, F5, F10) ---------- */

function apiCustomers(token) {
  return asOperator_(token, () => {
    const today = todayKey();
    const now = new Date();
    return readRows(TABS.CUSTOMER).map(c => customerCard(c, today, now))
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  });
}

function apiCustomer(token, id) {
  return asOperator_(token, () => customerDetail(id));
}

function apiRevealPhone(token, id) {
  return asOperator_(token, () => {
    const c = findRow(TABS.CUSTOMER, '고객ID', id);
    return c ? String(c['연락처'] || '') : '';
  });
}

function apiFirstContact(token, id) {
  return asOperator_(token, () => markFirstContact(id));
}

function apiSetPayment(token, id, kind, paid) {
  return asOperator_(token, () => setPayment(id, kind, paid));
}

function apiRegenerateBriefing(token, id) {
  return asOperator_(token, () => { regenerateBriefing(id); return customerDetail(id).briefing; });
}

function apiUploadPhoto(token, customerId, fileName, dataUrl) {
  return asOperator_(token, () => uploadPhoto(customerId, fileName, dataUrl));
}

function apiPhotos(token, customerId) {
  const user = resolveUser(token);
  if (!user) throw new Error('접근 권한 없음');
  if (user.role === ROLE.STAFF) requireDayOf(token, customerId);
  return plain_(customerPhotos(customerId));
}

function apiPhoto(token, customerId, fileId) {
  requireDayOf(token, customerId);
  return photoData(customerId, fileId);
}

/* ---------- 알림 (F2) ---------- */

function apiAlerts(token) {
  return asOperator_(token, () => {
    const names = {};
    readRows(TABS.CUSTOMER).forEach(c => { names[c['고객ID']] = c['이름']; });
    return alertList().map(a => Object.assign(a, { customerName: names[a.customerId] || '' }));
  });
}

function apiReadAlert(token, alertId) {
  return asOperator_(token, () => markAlertRead(alertId));
}

function apiReadAllAlerts(token) {
  return asOperator_(token, () => markAllAlertsRead());
}

/* ---------- 할 일 (F3.1–F3.5) ---------- */

function apiSetTask(token, id, done) {
  return asOperator_(token, user => setTaskDone(id, done, user.name));
}

function apiAddTask(token, text) {
  return asOperator_(token, () => addTask(text));
}

function apiEditTask(token, id, text) {
  return asOperator_(token, () => editTask(id, text));
}

function apiDeleteTask(token, id) {
  return asOperator_(token, () => deleteTask(id));
}

/* ---------- 오늘 (F8) ---------- */

function apiToday(token) {
  return asOperator_(token, () => {
    const today = todayKey();
    const now = new Date();
    const customers = readRows(TABS.CUSTOMER);
    const cards = customers.map(c => customerCard(c, today, now));
    const names = {};
    cards.forEach(c => { names[c.id] = c.name; });
    return {
      today: today,
      todayLabel: formatKoreanDate(today),
      urgent: cards.filter(c => c.urgent),
      tasks: todayTasks().map(t => Object.assign(t, { customerName: names[t.customerId] || '' })),
      week: cards.filter(c => SCHEDULED_STAGES.includes(c.stage) && c.wedding >= today && c.wedding <= addDays(today, 7))
        .sort((a, b) => (a.wedding < b.wedding ? -1 : 1)),
      unread: alertList().filter(a => !a.read).length,
    };
  });
}

/* ---------- 상담 기록·요청사항 (F6, F7) ---------- */

function apiConsultTargets(token) {
  return asOperator_(token, () => {
    return readRows(TABS.CUSTOMER).filter(c => c['진행단계'] !== '실패')
      .map(c => ({ id: c['고객ID'], name: c['이름'], type: c['행사종류'], date: formatDateOrEmpty_(toDateKey(c['예식일']) || toDateKey(c['희망날짜1'])), stage: c['진행단계'] }))
      .sort((a, b) => (a.name < b.name ? -1 : 1));
  });
}

function formatDateOrEmpty_(key) {
  return key ? formatKoreanDate(key) : '';
}

function apiSaveConsult(token, data) {
  return asOperator_(token, user => saveConsult(data, user.name));
}

function apiDeleteConsult(token, id) {
  return asOperator_(token, () => deleteConsult(id));
}

function apiSuggestRequests(token, consultId) {
  return asOperator_(token, () => suggestRequests(consultId));
}

function apiSaveRequest(token, data) {
  return asOperator_(token, () => saveRequest(data));
}

function apiDeleteRequest(token, id) {
  return asOperator_(token, () => deleteRequest(id));
}

function apiConfirmRequest(token, id, confirmed) {
  return asOperator_(token, () => confirmRequest(id, confirmed));
}

/* ---------- 예식 당일 체크 (F9) — 스태프도 사용 ---------- */

function apiDayOf(token, customerId) {
  const user = requireDayOf(token, customerId);
  return plain_(dayOfView(customerId, user));
}

function apiCheckRequest(token, customerId, requestId, checked) {
  const user = requireDayOf(token, customerId);
  assertRequestOf_(customerId, requestId);
  return plain_(checkRequest(requestId, checked, user.name));
}

function apiMissRequest(token, customerId, requestId, reason) {
  const user = requireDayOf(token, customerId);
  assertRequestOf_(customerId, requestId);
  return plain_(missRequest(requestId, reason, user.name));
}

/** 스태프가 다른 예식의 요청 ID를 넣어도 막는다. */
function assertRequestOf_(customerId, requestId) {
  const r = findRow(TABS.REQUEST, '요청ID', requestId);
  if (!r || r['고객ID'] !== customerId) throw new Error('접근 권한 없음');
}
