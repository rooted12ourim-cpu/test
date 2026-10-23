/**
 * 디스코드 웹후크 전송.
 * channel: 'NEW_INQUIRY' | 'TODAY' | 'WEDDING'
 */
const DISCORD_CHANNELS = {
  NEW_INQUIRY: { key: 'DISCORD_WEBHOOK_NEW_INQUIRY', name: '#새-문의' },
  TODAY: { key: 'DISCORD_WEBHOOK_TODAY', name: '#오늘-할-일' },
  WEDDING: { key: 'DISCORD_WEBHOOK_WEDDING', name: '#예식-알람' },
};

/** 준성 멘션 문자열 (ID가 없으면 빈 문자열) */
function discordMention() {
  const id = getSetting('DISCORD_MENTION_USER_ID');
  return id ? '<@' + id + '>' : '';
}

/**
 * 메시지를 보내고 HTTP 응답 코드를 돌려준다. 디스코드는 성공 시 204.
 * 웹후크가 비어 있으면 0.
 */
function sendDiscord(channel, content, options) {
  const url = getSetting(DISCORD_CHANNELS[channel].key);
  if (!url) return 0;
  const mention = options && options.mention ? discordMention() : '';
  const payload = {
    content: (mention ? mention + ' ' : '') + content,
    allowed_mentions: { users: mention ? [getSetting('DISCORD_MENTION_USER_ID')] : [] },
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return res.getResponseCode();
}
