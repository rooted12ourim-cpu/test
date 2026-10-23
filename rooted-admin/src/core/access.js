/**
 * 접근 확인 (F1.1, F1.2) — 모든 화면과 서버 함수 앞에서 동작한다.
 *  운영자: 스크립트 소유자(준성) 본인 계정으로 열었을 때 (운영자 링크는 "나만" 배포)
 *  스태프: 주소 끝 ?t=토큰 이 계정 탭의 활성 스태프 토큰과 일치할 때 — 당일 체크만
 *  토큰이 틀리면 운영자 계정이라도 "접근 권한 없음"
 */
const ROLE = { OPERATOR: 'operator', STAFF: 'staff' };

/** @return {{role: string, name: string}|null} */
function resolveUser(token) {
  if (token) {
    const acc = readRows(TABS.ACCOUNT, 300).find(a =>
      a['_링크토큰'] && a['_링크토큰'] === token && a['활성'] === true && a['권한'] === '스태프');
    return acc ? { role: ROLE.STAFF, name: String(acc['이름']) } : null;
  }
  return isOwner_() ? { role: ROLE.OPERATOR, name: operatorName_() } : null;
}

/** 지금 보는 사람이 스크립트 소유자 본인인지. 익명·다른 계정이면 이메일이 비거나 다르다. */
function isOwner_() {
  const active = Session.getActiveUser().getEmail();
  return Boolean(active) && active === Session.getEffectiveUser().getEmail();
}

function operatorName_() {
  const op = readRows(TABS.ACCOUNT, 300).find(a => a['권한'] === '운영자' && a['활성'] === true);
  return op ? String(op['이름']) : '준성';
}

function requireOperator(token) {
  const u = resolveUser(token);
  if (!u || u.role !== ROLE.OPERATOR) throw new Error('접근 권한 없음');
  return u;
}

/** 당일 체크 권한 — 스태프는 오늘·내일 예식 고객만 */
function requireDayOf(token, customerId) {
  const u = resolveUser(token);
  if (!u) throw new Error('접근 권한 없음');
  if (u.role === ROLE.STAFF && customerId && !staffDayOfIds_().includes(customerId)) {
    throw new Error('접근 권한 없음 — 오늘·내일 예식만 볼 수 있습니다');
  }
  return u;
}

function staffDayOfIds_() {
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  return readRows(TABS.CUSTOMER)
    .filter(c => SCHEDULED_STAGES.includes(c['진행단계']) && [today, tomorrow].includes(toDateKey(c['예식일'])))
    .map(c => c['고객ID']);
}

/** 스태프 전용 링크 발급 (F1.3) — 계정 탭의 스태프 중 토큰이 없는 사람에게 만든다. */
function issueStaffLinks(regenerateName) {
  const base = getSetting('STAFF_BASE_URL') || ScriptApp.getService().getUrl();
  const out = [];
  for (const a of readRows(TABS.ACCOUNT)) {
    if (a['권한'] !== '스태프') continue;
    let token = a['_링크토큰'];
    if (!token || a['이름'] === regenerateName) {
      token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
      updateRow(TABS.ACCOUNT, a._row, { '_링크토큰': token, '활성': a['활성'] === '' ? true : a['활성'] });
    }
    out.push({ name: a['이름'], active: a['활성'] !== false, url: base + '?t=' + token });
  }
  invalidateRows(TABS.ACCOUNT);
  return out;
}
