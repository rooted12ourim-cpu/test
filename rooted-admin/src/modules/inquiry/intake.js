/**
 * 문의 옮기기 (F11.1) — 문의원본 탭의 새 행을 고객 탭으로 옮기고 고객ID를 붙인다.
 * 5분 트리거와 "문의 확인 지금 실행" 메뉴가 부른다.
 */
const BRIEFING_STATUS = { WAITING: '대기', DONE: '완료', FAILED: '실패' };

/** @return {string[]} 이번에 새로 만든 고객ID 목록 */
function moveNewInquiries() {
  return withLock(() => {
    const raws = readRows(TABS.INQUIRY_RAW).filter(r => !r['_옮김'] && hasInquiryContent_(r));
    if (raws.length === 0) return [];

    const existingIds = readRows(TABS.CUSTOMER).map(c => String(c['고객ID']));
    const created = [];
    for (const raw of raws) {
      try {
        const customer = mapInquiry_(raw);
        const id = nextCustomerId_(customer['접수일시'], existingIds);
        existingIds.push(id);
        customer['고객ID'] = id;
        customer['진행단계'] = '문의';
        customer['_브리핑상태'] = BRIEFING_STATUS.WAITING;
        appendRow(TABS.CUSTOMER, customer);
        updateRow(TABS.INQUIRY_RAW, raw._row, { '_옮김': id });
        created.push(id);
      } catch (e) {
        logError('문의 옮기기', '', '문의원본 ' + raw._row + '행: ' + e.message);
      }
    }
    return created;
  });
}

function hasInquiryContent_(raw) {
  return Boolean(raw[INQUIRY_FIELD_MAP['이름']] || raw[INQUIRY_FIELD_MAP['연락처']] || raw[INQUIRY_FIELD_MAP['문의내용']]);
}

function mapInquiry_(raw) {
  const c = {};
  for (const [customerCol, rawCol] of Object.entries(INQUIRY_FIELD_MAP)) {
    const v = raw[rawCol];
    c[customerCol] = v === undefined ? '' : v;
  }
  if (!c['접수일시']) c['접수일시'] = nowStamp();
  for (const k of ['희망날짜1', '희망날짜2']) {
    const key = toDateKey(c[k]);
    if (key) c[k] = key;
  }
  return c;
}

/** R-YYMMDD-NNN — 접수일 기준, 같은 날 접수 순번 */
function nextCustomerId_(receivedAt, existingIds) {
  const key = toDateKey(receivedAt) || todayKey();
  const prefix = 'R-' + key.slice(2).replace(/-/g, '') + '-';
  let max = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  }
  return prefix + String(max + 1).padStart(3, '0');
}
