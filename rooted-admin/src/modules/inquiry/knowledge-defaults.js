/**
 * 지식베이스·타임테이블 기본 내용 — 「루티드 예식 응대 AX 기획서」(2026-10-23) 기준.
 * 기획서에 실제 값이 없는 항목은 지어내지 않고 KNOWLEDGE_TODO로 남긴다.
 * Gemini는 KNOWLEDGE_TODO가 들어간 항목을 "확인 후 안내"로 처리한다.
 */
const KNOWLEDGE_TODO = '[작성 필요]';

const DEFAULT_KNOWLEDGE = [
  ['가격 — 대관비 성수기 토·일', '300만 원'],
  ['가격 — 대관비 비수기 토·일', '180만 원'],
  ['가격 — 대관비 평일', '90만 원'],
  ['가격 — 야외연출비', '190만 원 (음향, 야외 조화, 조명, 테이블·의자 세팅, 기본 플라워 세팅)'],
  ['가격 — 식사 (1인)', '69,000원 (메인, 핑거푸드, 샐러드, 물)'],
  ['가격 — 애프터 파티', '60만 원 (2시간, 치즈 플래터, 와인 5병, 최대 30인)'],
  ['가격 — 프라이빗 세리머니', '별도 문의 (최대 12명, 가족 서약과 식사, 시즌 무관, 자유 진행)'],
  ['가격 — 우천 대비 세팅', '무료 (파라솔, 레이스 우산, 실내 전환)'],
  ['가격 — 주차', '무료 (현장 주차, 인근 주차 안내)'],
  ['가격 — 커스텀 플라워 (선택)', '350만~1,000만 원 (광주 전문 플로리스트 개인별 상담)'],
  ['포함 항목', '전날 방역, 예초, 신부대기실, 혼구용품, 음악·디렉팅, 접시 세팅, 음향, 우천 세팅 무료'],
  ['견적 안내 원칙', '금액은 고객이 홈페이지 견적기(rooted21.kr)에서 직접 계산하도록 안내한다. 최종 견적은 답사 후 준성이 낸다.'],
  ['공간', KNOWLEDGE_TODO + ' 예식 공간 구성과 좌석 수, 우천 대체 공간과 수용 인원, 신부대기실, 주소·오시는 길'],
  ['시간', KNOWLEDGE_TODO + ' 낮·저녁 슬롯 기본 시간, 초과 요금'],
  ['계약 조건', KNOWLEDGE_TODO + ' 대금 일정, 위약금 구간, 인원 확정 기한과 감소분 미환급, 우천 전환 결정 시점'],
  ['메뉴', '원플레이트 구성: 메인, 핑거푸드, 샐러드, 물. ' + KNOWLEDGE_TODO + ' 웰컴 구성'],
  ['외부 업체', '커스텀 플라워는 광주 전문 플로리스트와 개인별 상담. ' + KNOWLEDGE_TODO + ' 원판 작가 연결, 돌상업체 연계, 외부 업체 반입 규정'],
  ['자주 묻는 질문', KNOWLEDGE_TODO + ' 비 오면 어떻게 하는지, 어르신 이동, 외부 음식 반입, 답사 가능 시간'],
  ['말투 — 첫 연락 문자 예시', KNOWLEDGE_TODO + ' 준성이 실제로 보내는 첫 연락 문자 2~3개'],
  ['AI 금지사항 1', '날짜를 확정해주겠다고 말하지 않는다. 가능 여부만 안내한다.'],
  ['AI 금지사항 2', '할인이나 특가를 약속하지 않는다.'],
  ['AI 금지사항 3', '금액을 계산하거나 제시하지 않는다. 견적은 홈페이지 견적기로 안내하고, 최종 견적은 답사 후 준성이 낸다.'],
  ['AI 금지사항 4', '지식베이스에 없거나 [작성 필요]인 내용은 지어내지 않고 "확인 후 안내"로 남긴다.'],
  ['AI 금지사항 5', '모든 초안은 답사 제안으로 마무리한다.'],
  ['AI 금지사항 6', '고객 이름과 연락처는 Gemini에 보내지 않는다. 문의 내용만 보낸다.'],
];

const TIMETABLE_EXAMPLE = '(예시 — 실제 시각으로 고쳐 주세요)';

const DEFAULT_TIMETABLE = [
  ['낮', '11:00', '세팅 최종 점검 ' + TIMETABLE_EXAMPLE],
  ['낮', '12:30', '하객 안내 시작, 웰컴 드링크'],
  ['낮', '13:00', '본식 시작'],
  ['낮', '14:00', '식사 시작'],
  ['낮', '15:30', '마무리, 하객 배웅'],
  ['저녁', '16:00', '세팅 최종 점검 ' + TIMETABLE_EXAMPLE],
  ['저녁', '17:30', '하객 안내 시작, 웰컴 드링크'],
  ['저녁', '18:00', '본식 시작'],
  ['저녁', '19:00', '식사 시작'],
  ['저녁', '20:30', '마무리, 하객 배웅'],
];

/**
 * 비어 있는 탭에만 기본 내용을 넣는다. 준성이 이미 고친 내용은 덮어쓰지 않는다.
 * @return {{knowledge: number, timetable: number, todo: number}} 넣은 줄 수 (0이면 이미 내용이 있어 건너뜀)
 */
function fillDefaultKnowledge(ss) {
  const result = { knowledge: 0, timetable: 0, todo: DEFAULT_KNOWLEDGE.filter(r => r[1].includes(KNOWLEDGE_TODO)).length };
  result.knowledge = fillIfEmpty(ss.getSheetByName(TABS.KNOWLEDGE.name), DEFAULT_KNOWLEDGE);
  result.timetable = fillIfEmpty(ss.getSheetByName(TABS.TIMETABLE.name), DEFAULT_TIMETABLE);
  return result;
}

function fillIfEmpty(sheet, rows) {
  if (!sheet) throw new Error('탭이 없습니다. 먼저 "탭 만들기"를 실행하세요.');
  if (sheet.getLastRow() > 1) return 0;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows).setWrap(true);
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(rows[0].length, 520);
  return rows.length;
}
