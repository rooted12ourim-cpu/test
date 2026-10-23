/**
 * 시트 읽기·쓰기 공통 함수 — 열 이름(config.js TABS)으로 칸을 찾는다.
 * 쓰기는 잠금을 걸어 한 번에 하나씩, 읽기는 짧게 캐시한다.
 */
const LOCK_WAIT_MS = 10000;
let spreadsheetCache_ = null;
let lockDepth_ = 0;

/** 장부 스프레드시트. 트리거처럼 "열린 시트"가 없는 상황에서도 SHEET_ID로 연다. */
function getSpreadsheet() {
  if (spreadsheetCache_) return spreadsheetCache_;
  const id = getSetting('SHEET_ID');
  spreadsheetCache_ = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheetCache_) throw new Error('장부 시트를 찾을 수 없습니다. "설정 입력"을 먼저 실행하세요.');
  return spreadsheetCache_;
}

function getTab(tab) {
  const sheet = getSpreadsheet().getSheetByName(tab.name);
  if (!sheet) throw new Error('"' + tab.name + '" 탭이 없습니다. "탭 만들기"를 먼저 실행하세요.');
  return sheet;
}

/**
 * 잠금을 걸고 fn을 실행한다. 다른 사람이 쓰는 중이면 최대 10초 기다린다.
 * 이미 잠금 안에서 부르면 그대로 실행한다 (여러 행을 한 번에 쓰는 작업용).
 */
function withLock(fn) {
  if (lockDepth_ > 0) return fn();
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  lockDepth_++;
  try {
    return fn();
  } finally {
    lockDepth_--;
    lock.releaseLock();
  }
}

/**
 * 탭 전체를 객체 배열로 읽는다. 각 객체에는 시트 행 번호 `_row`가 붙는다.
 * @param {number=} cacheSeconds 0이면 캐시하지 않는다.
 */
function readRows(tab, cacheSeconds) {
  const cacheKey = 'rows:' + tab.name;
  if (cacheSeconds) {
    const hit = cacheGet_(cacheKey);
    if (hit) return hit;
  }
  const sheet = getTab(tab);
  const lastRow = sheet.getLastRow();
  const rows = [];
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, tab.headers.length).getValues();
    values.forEach((v, i) => {
      if (v.every(cell => cell === '' || cell === false)) return;
      const obj = { _row: i + 2 };
      tab.headers.forEach((h, c) => { obj[h] = normalizeCell_(v[c]); });
      rows.push(obj);
    });
  }
  if (cacheSeconds) cachePut_(cacheKey, rows, cacheSeconds);
  return rows;
}

/** 조건에 맞는 첫 행 (없으면 null) */
function findRow(tab, header, value) {
  return readRows(tab).find(r => String(r[header]) === String(value)) || null;
}

/** 한 행을 맨 아래에 추가한다. obj에 없는 열은 빈칸. */
function appendRow(tab, obj) {
  return withLock(() => {
    const sheet = getTab(tab);
    const row = tab.headers.map(h => (obj[h] === undefined ? '' : obj[h]));
    const rowNumber = nextEmptyRow_(sheet, tab);
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    invalidateRows(tab);
    return rowNumber;
  });
}

/** 지정한 행의 일부 열만 고친다. */
function updateRow(tab, rowNumber, patch) {
  return withLock(() => {
    const sheet = getTab(tab);
    for (const [h, value] of Object.entries(patch)) {
      const col = tab.headers.indexOf(h) + 1;
      if (col < 1) throw new Error('"' + tab.name + '" 탭에 "' + h + '" 열이 없습니다.');
      sheet.getRange(rowNumber, col).setValue(value);
    }
    invalidateRows(tab);
  });
}

/** 조건에 맞는 행을 지운다 (아래에서 위로 지워 행 번호가 밀리지 않게). @return {number} 지운 수 */
function deleteRowsWhere(tab, predicate) {
  return withLock(() => {
    const sheet = getTab(tab);
    const targets = readRows(tab).filter(predicate).map(r => r._row).sort((a, b) => b - a);
    targets.forEach(row => sheet.deleteRow(row));
    invalidateRows(tab);
    return targets.length;
  });
}

function invalidateRows(tab) {
  try { CacheService.getScriptCache().remove('rows:' + tab.name); } catch (e) { /* 캐시는 실패해도 무시 */ }
}

/**
 * 다음 ID. prefix='C-', digits=4 → 'C-0001', 'C-0002' …
 * 같은 탭의 첫 열에서 가장 큰 번호 + 1.
 */
function nextId(tab, prefix, digits) {
  const idHeader = tab.headers[0];
  let max = 0;
  for (const r of readRows(tab)) {
    const s = String(r[idHeader]);
    if (s.startsWith(prefix)) max = Math.max(max, Number(s.slice(prefix.length)) || 0);
  }
  return prefix + String(max + 1).padStart(digits, '0');
}

/** 체크박스가 미리 깔린 탭에서도 실제 데이터가 끝나는 다음 행을 찾는다. */
function nextEmptyRow_(sheet, tab) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 2;
  const firstCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = firstCol.length - 1; i >= 0; i--) {
    if (firstCol[i][0] !== '') return i + 3;
  }
  return 2;
}

/**
 * 날짜 칸은 읽는 즉시 한국 시간 문자열로 바꾼다 ('2026-11-07' 또는 '2026-10-23 09:12').
 * Date 그대로 두면 캐시(JSON)에서 UTC로 바뀌어 하루씩 밀린다.
 */
function normalizeCell_(value) {
  if (Object.prototype.toString.call(value) !== '[object Date]') return value;
  if (isNaN(value.getTime())) return '';
  const time = Utilities.formatDate(value, TZ, 'HH:mm');
  return Utilities.formatDate(value, TZ, time === '00:00' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
}

function cacheGet_(key) {
  try {
    const raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function cachePut_(key, value, seconds) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), seconds);
  } catch (e) { /* 100KB 넘는 등 캐시 실패는 무시 */ }
}
