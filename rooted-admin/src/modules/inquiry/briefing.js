/**
 * Gemini 브리핑 (F11.1, F10.4) — 요약·통화 포인트·첫 연락 문자 초안.
 * 이름·연락처는 절대 보내지 않는다 (AI 금지사항 6). 디스코드 메시지에는 스크립트가 다시 붙인다.
 */
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

const BRIEFING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING', description: '문의 요약 한 줄 (60자 이내)' },
    callPoints: { type: 'ARRAY', items: { type: 'STRING' }, description: '첫 통화에서 확인할 것 3~5개' },
    smsDraft: { type: 'STRING', description: '첫 연락 문자 초안 (답사 제안으로 끝남)' },
  },
  required: ['summary', 'callPoints', 'smsDraft'],
};

/** Gemini에 보낼 고객 정보 — 이름·연락처는 넣지 않는다. */
function briefingInput_(customer) {
  const dates = [customer['희망날짜1'], customer['희망날짜2']]
    .map(toDateKey).filter(Boolean).map(formatKoreanDate).join(', ');
  return [
    '행사 종류: ' + (customer['행사종류'] || '미기재'),
    '희망 날짜: ' + (dates || '미기재') + (customer['희망슬롯'] ? ' / ' + customer['희망슬롯'] : ''),
    '예상 인원: ' + (customer['예상인원'] || '미기재'),
    '유입 경로: ' + (customer['유입경로'] || '미기재'),
    '날짜 예약 가능 여부(시스템 판단): ' + (customer['_예약가능'] || '미확인'),
    '홈페이지 견적기 계산 여부: ' + (customer['견적기금액'] ? '있음 (금액은 언급하지 말 것)' : '없음'),
    '문의 내용: ' + (customer['문의내용'] || '없음'),
  ].join('\n');
}

function briefingSystemPrompt_(knowledgeRows) {
  const known = [];
  const unknown = [];
  for (const r of knowledgeRows) {
    const item = String(r['항목']);
    const content = String(r['내용']);
    if (!content || content.includes(KNOWLEDGE_TODO)) unknown.push(item);
    else known.push('- ' + item + ': ' + content);
  }
  return [
    '너는 광주의 야외 웨딩 공간 "루티드" 운영자 준성을 돕는 응대 비서다.',
    '아래 지식베이스만 근거로, 새 문의에 대한 브리핑을 한국어로 만든다.',
    '',
    '[지식베이스]',
    known.join('\n'),
    '',
    '[아직 확인되지 않은 항목 — 고객이 물으면 "확인 후 안내드리겠습니다"로만 답한다]',
    unknown.join(', ') || '없음',
    '',
    '[반드시 지킬 것]',
    '1. 날짜를 확정해 주겠다고 말하지 않는다. 가능 여부만 안내한다.',
    '2. 할인이나 특가를 약속하지 않는다.',
    '3. 금액을 계산하거나 숫자로 제시하지 않는다. 견적은 홈페이지 견적기로 안내하고, 최종 견적은 답사 후 안내한다고 말한다.',
    '4. 지식베이스에 없는 내용은 지어내지 않는다.',
    '5. 문자 초안은 반드시 답사(현장 방문) 제안으로 끝낸다.',
    '6. 고객 이름은 모르므로 "안녕하세요, 루티드입니다"로 시작하고 "{고객님}" 같은 자리 표시는 쓰지 않는다.',
    '',
    '[출력]',
    'summary: 행사·날짜·인원·핵심 요청을 담은 한 줄',
    'callPoints: 첫 통화에서 확인할 것 (원하는 분위기, 예산 감, 결정권자, 하객 지역 중 문의에 없는 것 우선)',
    'smsDraft: 정중하고 짧은 첫 연락 문자 (4~6문장)',
  ].join('\n');
}

/**
 * Gemini를 불러 브리핑을 만든다. 실패하면 1회 재시도 후 예외를 던진다.
 * @return {{summary: string, callPoints: string[], smsDraft: string}}
 */
function generateBriefing(customer) {
  const text = callGemini(briefingSystemPrompt_(readRows(TABS.KNOWLEDGE, 600)), briefingInput_(customer), BRIEFING_SCHEMA, 0.4);
  return parseBriefing_(text);
}

/** 초안 다시 생성 (F10.4) — 실패하면 기존 초안은 그대로 두고 예외를 던진다. */
function regenerateBriefing(id) {
  const c = findRow(TABS.CUSTOMER, '고객ID', id);
  if (!c) throw new Error('고객을 찾을 수 없습니다');
  let b;
  try {
    b = generateBriefing(c);
  } catch (e) {
    logError('브리핑 다시 생성', id, e);
    throw new Error('초안을 만들지 못했습니다. 잠시 후 다시 시도하세요.');
  }
  updateRow(TABS.CUSTOMER, c._row, {
    '_브리핑요약': b.summary,
    '_통화포인트': b.callPoints.map(p => '• ' + p).join('\n'),
    '_문자초안': b.smsDraft,
    '_브리핑상태': BRIEFING_STATUS.DONE,
  });
  return true;
}

/**
 * Gemini 호출 공통 — JSON 응답의 본문 텍스트를 돌려준다. 실패하면 1회 재시도 후 예외.
 */
function callGemini(systemText, userText, schema, temperature) {
  const key = getSetting('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini API 키가 없습니다.');
  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: temperature, responseMimeType: 'application/json', responseSchema: schema },
  };
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = UrlFetchApp.fetch(GEMINI_ENDPOINT + getGeminiModel() + ':generateContent', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-goog-api-key': key },
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      });
      const code = res.getResponseCode();
      if (code !== 200) throw new Error('Gemini 응답 ' + code + ': ' + res.getContentText().slice(0, 200));
      return geminiText_(res.getContentText());
    } catch (e) {
      lastError = e;
      if (attempt === 1) Utilities.sleep(2000);
    }
  }
  throw lastError;
}

function geminiText_(responseText) {
  const data = JSON.parse(responseText);
  const text = data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts.map(p => p.text || '').join('');
  if (!text) throw new Error('Gemini 응답이 비어 있습니다.');
  return text;
}

function parseBriefing_(text) {
  const b = JSON.parse(text);
  if (!b.summary || !b.smsDraft) throw new Error('Gemini 응답 형식이 다릅니다.');
  return { summary: String(b.summary), callPoints: (b.callPoints || []).map(String), smsDraft: String(b.smsDraft) };
}
