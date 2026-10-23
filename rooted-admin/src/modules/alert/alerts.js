/**
 * 알림 만들기 (F11.3) — 알림 탭에 기록하고 디스코드로 보낸다.
 * _중복키가 같은 알림은 다시 만들지 않는다 (트리거가 몇 번 돌아도 한 번만).
 */
const ALERT_CHANNEL_LABEL = { NEW_INQUIRY: '새-문의', TODAY: '오늘-할-일', WEDDING: '예식-알람' };
const DISCORD_LIMIT = 1900;

/**
 * @param {{customerId: string, type: string, content: string, channel: string, urgent?: boolean,
 *          dedupeKey: string, discordText?: string, hold?: boolean}} a
 * @return {boolean} 새로 만들었으면 true
 */
function createAlert(a) {
  return withLock(() => {
    const exists = readRows(TABS.ALERT).some(r => r['_중복키'] === a.dedupeKey);
    if (exists) return false;

    let sent = '보류';
    if (!a.hold) {
      try {
        const text = truncate_(a.discordText || ('[' + a.type + '] ' + a.content), DISCORD_LIMIT);
        const code = sendDiscord(a.channel, text, { mention: Boolean(a.urgent) });
        sent = code === 204 || code === 200 ? '완료' : (code === 0 ? '웹후크 없음' : '실패 ' + code);
      } catch (e) {
        sent = '실패';
        logError('디스코드 전송', a.customerId, e);
      }
    }

    appendRow(TABS.ALERT, {
      '알림ID': nextId(TABS.ALERT, 'N-', 4),
      '발생시각': nowStamp(),
      '고객ID': a.customerId || '',
      '종류': a.type,
      '내용': a.content,
      '채널': ALERT_CHANNEL_LABEL[a.channel],
      '급함': Boolean(a.urgent),
      '읽음': false,
      '해제': false,
      '보류': Boolean(a.hold),
      '디스코드전송': sent,
      '_중복키': a.dedupeKey,
    });
    return true;
  });
}

/** 이 고객의 해당 종류 알림을 해제한다 (첫 연락 완료, 입금 확인). @return {number} */
function resolveAlertsOfType(customerId, type) {
  return setAlertResolved_(customerId, type, true);
}

/** 해제를 되돌린다 (입금 확인 되돌리기). */
function reopenAlertsOfType(customerId, type) {
  return setAlertResolved_(customerId, type, false);
}

function setAlertResolved_(customerId, type, resolved) {
  let n = 0;
  for (const a of readRows(TABS.ALERT)) {
    if (a['고객ID'] === customerId && a['종류'] === type && a['급함'] === true && (a['해제'] === true) !== resolved) {
      updateRow(TABS.ALERT, a._row, { '해제': resolved });
      n++;
    }
  }
  return n;
}

/** 알림 읽음 (F2.2) */
function markAlertRead(alertId) {
  const a = findRow(TABS.ALERT, '알림ID', alertId);
  if (a && a['읽음'] !== true) updateRow(TABS.ALERT, a._row, { '읽음': true, '읽은시각': nowStamp() });
  return true;
}

/** 모두 읽음 (F2.3) */
function markAllAlertsRead() {
  return withLock(() => {
    const sheet = getTab(TABS.ALERT);
    const readCol = TABS.ALERT.headers.indexOf('읽음') + 1;
    const atCol = TABS.ALERT.headers.indexOf('읽은시각') + 1;
    const stamp = nowStamp();
    let n = 0;
    for (const a of readRows(TABS.ALERT)) {
      if (a['읽음'] === true) continue;
      sheet.getRange(a._row, readCol).setValue(true);
      sheet.getRange(a._row, atCol).setValue(stamp);
      n++;
    }
    invalidateRows(TABS.ALERT);
    return n;
  });
}

/** 알림함 화면용 (F2.1) — 최신순 */
function alertList() {
  return readRows(TABS.ALERT).reverse().map(a => ({
    id: a['알림ID'], at: String(a['발생시각']), date: String(a['발생시각']).slice(0, 10), customerId: a['고객ID'],
    type: a['종류'], content: a['내용'], channel: a['채널'],
    urgent: a['급함'] === true && a['해제'] !== true, read: a['읽음'] === true, hold: a['보류'] === true && a['해제'] !== true,
  }));
}

function truncate_(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/** 금액 표시: 12400000 → '1,240만 원' */
function formatWon(value) {
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  if (!n) return String(value || '');
  if (n % 10000 === 0) return (n / 10000).toLocaleString('ko-KR') + '만 원';
  return n.toLocaleString('ko-KR') + '원';
}
