/**
 * 예약 가능 판단 (F11.1) — 날짜 + 슬롯(낮/저녁) 단위.
 *  계약·완료 고객의 예식일·예식슬롯과 같으면 "이미 계약 있음"
 *  답사·견적 고객의 희망날짜1·2·희망슬롯과 같으면 "검토 중 n팀"
 *  둘 다 없으면 "가능"
 */
const BOOKED_STAGES = ['계약', '완료'];
const REVIEWING_STAGES = ['답사', '견적'];

/** 한 날짜·슬롯의 상태 문자열 */
function availabilityFor(dateKey, slot, customers, excludeId) {
  const others = customers.filter(c => String(c['고객ID']) !== String(excludeId));
  const booked = others.some(c =>
    BOOKED_STAGES.includes(c['진행단계']) && toDateKey(c['예식일']) === dateKey && sameSlot_(c['예식슬롯'], slot));
  if (booked) return '이미 계약 있음';
  const reviewing = others.filter(c =>
    REVIEWING_STAGES.includes(c['진행단계']) &&
    [c['희망날짜1'], c['희망날짜2']].some(d => toDateKey(d) === dateKey) &&
    sameSlot_(c['희망슬롯'], slot)).length;
  return reviewing ? '검토 중 ' + reviewing + '팀' : '가능';
}

/** 희망 슬롯이 비어 있으면 낮·저녁 어느 쪽이든 겹친다고 본다. */
function sameSlot_(a, b) {
  return !a || !b || a === b;
}

/** 고객의 희망날짜 1·2순위를 모두 판단해 한 줄로: "4월 17일(토) 낮 검토 중 1팀 · 4월 24일(토) 낮 가능" */
function describeAvailability(customer, customers) {
  const slot = customer['희망슬롯'] || '';
  const parts = [];
  for (const d of [customer['희망날짜1'], customer['희망날짜2']]) {
    const key = toDateKey(d);
    if (!key) continue;
    parts.push(formatKoreanDate(key) + (slot ? ' ' + slot : '') + ' ' + availabilityFor(key, slot, customers, customer['고객ID']));
  }
  return parts.length ? parts.join(' · ') : '희망 날짜 없음';
}
