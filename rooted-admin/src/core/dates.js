/**
 * 날짜 계산 — 모든 날짜는 한국 시간(Asia/Seoul) 기준 'yyyy-MM-dd' 문자열(날짜 키)로 다룬다.
 * 시간대 차이로 하루씩 밀리는 일을 막기 위해 날짜 계산은 이 파일에서만 한다.
 */
const TZ = 'Asia/Seoul';
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 오늘 날짜 키 (한국 시간) */
function todayKey() {
  return toDateKey(new Date());
}

/** 지금 시각 문자열 'yyyy-MM-dd HH:mm' (한국 시간) */
function nowStamp() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
}

/**
 * 시트 값(Date 또는 '2026-11-07', '2026.11.07', '2026/11/07')을 날짜 키로 바꾼다.
 * 읽을 수 없으면 빈 문자열.
 */
function toDateKey(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? '' : Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
  }
  const m = String(value).trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!m) return '';
  return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
}

/** 날짜 키 → 계산용 UTC 자정 Date (시간대 영향 없음) */
function keyToUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date) {
  return date.toISOString().slice(0, 10);
}

/** 날짜 키에 n일을 더한다 (음수면 뺀다). */
function addDays(key, n) {
  return utcToKey(new Date(keyToUtc(key).getTime() + n * DAY_MS));
}

/** b - a 일수 */
function daysBetween(a, b) {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY_MS);
}

/** 예식일 기준 D-n 날짜. n=14 → 예식 14일 전, n=-7 → 예식 7일 후(D+7) */
function ddayDate(eventKey, n) {
  return addDays(eventKey, -n);
}

/** 오늘 기준 예식일 표시: 'D-14', 'D-Day', 'D+1' */
function ddayLabel(eventKey, baseKey) {
  const diff = daysBetween(baseKey || todayKey(), eventKey);
  if (diff === 0) return 'D-Day';
  return diff > 0 ? 'D-' + diff : 'D+' + (-diff);
}

/** '11월 7일(토)' */
function formatKoreanDate(key) {
  const d = keyToUtc(key);
  return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일(' + WEEKDAYS_KO[d.getUTCDay()] + ')';
}
