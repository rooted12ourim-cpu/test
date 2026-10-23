/**
 * 새 문의 처리 흐름 (F11.1)
 *  ① 문의원본 → 고객 탭 (intake.js)
 *  ② 예약 가능 판단 (availability.js)
 *  ③ Gemini 브리핑 (briefing.js) — 실패해도 ④는 진행
 *  ④ 디스코드 #새-문의 + 알림 탭 "문의 즉시"
 */
const BRIEFINGS_PER_RUN = 5;

/** @return {{moved: string[], briefed: string[], failed: string[]}} */
function runInquiryPipeline() {
  const moved = moveNewInquiries();
  const result = { moved: moved, briefed: [], failed: [] };

  const customers = readRows(TABS.CUSTOMER);
  const pending = customers.filter(c => c['_브리핑상태'] === BRIEFING_STATUS.WAITING).slice(0, BRIEFINGS_PER_RUN);
  for (const c of pending) {
    const id = c['고객ID'];
    try {
      const availability = describeAvailability(c, customers);
      updateRow(TABS.CUSTOMER, c._row, { '_예약가능': availability });
      c['_예약가능'] = availability;

      let briefing = null;
      try {
        briefing = generateBriefing(c);
        updateRow(TABS.CUSTOMER, c._row, {
          '_브리핑요약': briefing.summary,
          '_통화포인트': briefing.callPoints.map(p => '• ' + p).join('\n'),
          '_문자초안': briefing.smsDraft,
          '_브리핑상태': BRIEFING_STATUS.DONE,
        });
        result.briefed.push(id);
      } catch (e) {
        updateRow(TABS.CUSTOMER, c._row, { '_브리핑상태': BRIEFING_STATUS.FAILED });
        logError('Gemini 브리핑', id, e);
        result.failed.push(id);
      }

      createAlert({
        customerId: id,
        type: '문의 즉시',
        content: (c['이름'] || '이름 없음') + ' · ' + (c['행사종류'] || '') + ' · ' + availability,
        channel: 'NEW_INQUIRY',
        dedupeKey: id + ':문의즉시',
        discordText: inquiryDiscordText_(c, availability, briefing),
      });
    } catch (e) {
      logError('문의 처리', id, e);
    }
  }
  return result;
}

function inquiryDiscordText_(c, availability, briefing) {
  const lines = [
    '**새 문의** · ' + (c['이름'] || '이름 없음') + ' · ' + (c['연락처'] || '연락처 없음'),
    (c['행사종류'] || '행사 미기재') + ' · ' + (c['예상인원'] ? c['예상인원'] + '명' : '인원 미기재') + ' · 유입: ' + (c['유입경로'] || '미기재'),
    '날짜: ' + availability,
  ];
  if (c['견적기금액']) lines.push('홈페이지 견적: ' + c['견적기금액']);
  if (briefing) {
    lines.push('', '**요약** ' + briefing.summary);
    lines.push('**통화 포인트**', briefing.callPoints.map(p => '- ' + p).join('\n'));
    lines.push('**첫 연락 문자 초안** (확인 후 직접 보내세요)', '```', briefing.smsDraft, '```');
  } else {
    lines.push('', '브리핑 생성 실패 — 문의 내용: ' + (c['문의내용'] || '없음'));
  }
  return lines.join('\n');
}
