/**
 * 매시 알림 점검 (F11.3) — 오늘 해당하는 시점 알림을 만든다.
 * 같은 알림은 _중복키로 한 번만. 밤사이(07시 전)에는 만들지 않고 아침에 몰아서 보낸다.
 * 24시간 미응대는 그날 예식이 있으면 디스코드로 보내지 않고 "보류" → 다음 아침 요약에 포함.
 */
const ALERT_QUIET_UNTIL_HOUR = 7;

/** @return {number} 새로 만든 알림 수 */
function runAlertChecks(force) {
  const hour = Number(Utilities.formatDate(new Date(), TZ, 'H'));
  if (!force && hour < ALERT_QUIET_UNTIL_HOUR) return 0;

  const today = todayKey();
  const customers = readRows(TABS.CUSTOMER);
  const ctx = {
    now: new Date(),
    details: readRows(TABS.WEDDING_DETAIL),
    weddingToday: customers.some(c => SCHEDULED_STAGES.includes(c['진행단계']) && toDateKey(c['예식일']) === today),
  };
  let count = 0;

  for (const c of customers) {
    try {
      for (const a of alertsForCustomer(c, today, ctx)) {
        if (createAlert(a)) count++;
      }
    } catch (e) {
      logError('알림 점검', c['고객ID'], e);
    }
  }
  updateScheduleStatus_(today);
  return count;
}

/** 한 고객에게 오늘 해당하는 알림 목록 (순수 계산 — 저장·전송하지 않음) */
function alertsForCustomer(c, today, ctx) {
  const id = c['고객ID'];
  const name = c['이름'] || id;
  const stage = c['진행단계'];
  const out = [];

  // 24시간 미응대 (F11.3, 급함)
  if (stage === '문의' && !c['첫연락일']) {
    const h = hoursSince_(c['접수일시'], ctx.now);
    if (h !== null && h >= 24) {
      out.push({
        customerId: id, type: '미응대 24시간', channel: 'NEW_INQUIRY', urgent: true, hold: Boolean(ctx.weddingToday),
        dedupeKey: id + ':미응대24',
        content: name + ' · 문의 후 ' + h + '시간 미응대' + (ctx.weddingToday ? ' (예식 당일이라 아침 요약으로 미룸)' : ''),
      });
    }
  }

  // 답사 전날
  const visit = toDateKey(c['답사일']);
  if (visit && addDays(today, 1) === visit) {
    const memo = [c['분위기'] && '분위기 ' + c['분위기'], c['특이사항'] && '특이사항 ' + c['특이사항']].filter(Boolean).join(' · ');
    out.push({
      customerId: id, type: '답사 전날', channel: 'TODAY', dedupeKey: id + ':답사전날:' + visit,
      content: name + ' · 내일 ' + formatKoreanDate(visit) + ' 답사' + (memo ? ' · ' + memo : ''),
    });
  }

  // 견적 후 3일·7일 팔로업
  const quote = toDateKey(c['견적발송일']);
  if (stage === '견적' && quote) {
    for (const n of [3, 7]) {
      if (addDays(quote, n) === today) {
        out.push({
          customerId: id, type: '견적 후 ' + n + '일', channel: 'TODAY', dedupeKey: id + ':견적후' + n,
          content: name + ' · 견적 발송 ' + n + '일째 — 팔로업 연락',
        });
      }
    }
  }

  // 예식 D-day 시점
  const wedding = SCHEDULED_STAGES.includes(stage) ? toDateKey(c['예식일']) : '';
  if (wedding) {
    for (const p of DDAY_POINTS) {
      if (ddayDate(wedding, p.n) !== today) continue;
      out.push(ddayAlert_(c, p, wedding, ctx.details || []));
    }
  }
  return out;
}

function ddayAlert_(c, p, wedding, details) {
  const id = c['고객ID'];
  const name = c['이름'] || id;
  let content = name + ' · ' + formatKoreanDate(wedding) + ' 예식 · ' + p.text;
  let urgent = false;

  if (p.n === 90 && c['중도금']) {
    content += ' (' + formatWon(c['중도금']) + (c['중도금입금일'] ? ', 입금 완료' : '') + ')';
  }
  if (p.n === 14 && c['잔금'] && !c['잔금입금일']) {
    urgent = true;
    content = name + ' · 잔금 미입금 ' + formatWon(c['잔금']) + ' · 최종 인원 확정 필요';
  }
  if (p.n === 7) {
    const detail = details.find(d => d['고객ID'] === id);
    const people = (detail && detail['최종인원']) || c['예상인원'];
    if (people) content += ' · 기준 인원 ' + people + '명';
  }
  return {
    customerId: id, type: p.label, channel: 'WEDDING', urgent: urgent,
    dedupeKey: id + ':' + p.label + ':' + wedding, content: content,
  };
}

/** 시트에서 입금일·첫연락일을 직접 고쳤을 때 급함 알림 해제/복구 (F11.7) */
function syncResolvedAlerts(c) {
  if (c['잔금입금일']) resolveAlertsOfType(c['고객ID'], 'D-14');
  else reopenAlertsOfType(c['고객ID'], 'D-14');
  if (c['첫연락일']) resolveAlertsOfType(c['고객ID'], '미응대 24시간');
}

/** D-day일정 탭의 상태(예정/지남)를 오늘 기준으로 갱신 */
function updateScheduleStatus_(today) {
  for (const s of readRows(TABS.SCHEDULE)) {
    const want = toDateKey(s['날짜']) < today ? '지남' : '예정';
    if (s['상태'] !== want) updateRow(TABS.SCHEDULE, s._row, { '상태': want });
  }
}
