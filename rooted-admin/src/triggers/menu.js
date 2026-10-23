/**
 * 시트 상단 "루티드" 메뉴. 시트를 열 때마다 구글이 onOpen을 부른다.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('루티드')
    .addItem('설정 입력', 'menuEnterSettings')
    .addItem('설정 점검', 'menuCheckSettings')
    .addSeparator()
    .addItem('탭 만들기', 'menuEnsureTabs')
    .addItem('지식베이스 기본 내용 넣기', 'menuFillKnowledge')
    .addItem('자동 실행 켜기 (트리거 설치)', 'menuInstallTriggers')
    .addSeparator()
    .addItem('문의 확인 지금 실행', 'menuRunInquiryCheck')
    .addItem('D-day 일정 지금 맞추기', 'menuSyncSchedules')
    .addItem('알림 점검 지금 실행', 'menuRunAlertChecks')
    .addItem('아침 요약 지금 보내기', 'menuSendMorningSummary')
    .addSeparator()
    .addItem('자가 점검', 'menuSelfCheck')
    .addItem('가짜 고객 만들기 (개발용)', 'menuSeedFakeCustomers')
    .addItem('테스트 문의 3건 넣기 (개발용)', 'menuAddTestInquiries')
    .addItem('개발용 시트 초기화', 'menuResetDev')
    .addSeparator()
    .addItem('스태프 링크 만들기', 'menuStaffLinks')
    .addToUi();
}

function menuResetDev() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('개발용 시트 초기화', '고객·상담·요청·알림·할 일·일정 데이터와 캘린더 일정을 모두 지웁니다. 계속할까요?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  runMenuAction_('개발용 시트 초기화', () => '비운 탭: ' + resetDevSpreadsheet().join(', ') + '\n\n"가짜 고객 만들기"로 다시 채울 수 있습니다.');
}

/** 계정 탭의 스태프에게 전용 링크를 만든다. 다시 만들려면 이름을 입력. */
function menuStaffLinks() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('스태프 링크 만들기', '링크가 없는 스태프에게 새로 만듭니다.\n유출된 링크를 바꾸려면 그 스태프 이름을 입력하세요 (없으면 빈칸).', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  runMenuAction_('스태프 링크', () => {
    const links = issueStaffLinks(res.getResponseText().trim());
    if (!links.length) return '계정 탭에 권한 "스태프"인 사람이 없습니다.';
    return links.map(l => l.name + (l.active ? '' : ' (비활성 — 막힘)') + '\n' + l.url).join('\n\n') +
      '\n\n테스트 링크(/dev)에서는 스태프 링크가 동작하지 않습니다. 정식 배포(STORY 15.3) 후 "STAFF_BASE_URL"에 배포 주소를 넣으면 그 주소로 만들어집니다.';
  });
}

function menuSyncSchedules() {
  runMenuAction_('D-day 일정 맞추기', () => {
    const r = syncAllSchedules();
    return '새로 만든 고객 ' + r.created + '명 · 지운 고객 ' + r.removed + '명\n(일정이 이미 맞는 고객은 그대로 둡니다. 캘린더 "루티드 예식"을 확인하세요)';
  });
}

function menuRunAlertChecks() {
  runMenuAction_('알림 점검', () => '새 알림 ' + runAlertChecks(true) + '건 (이미 보낸 알림은 다시 보내지 않습니다)');
}

function menuSendMorningSummary() {
  runMenuAction_('아침 요약', () => {
    runAlertChecks(true);
    return '#오늘-할-일로 보냈습니다.\n\n' + sendMorningSummary().slice(0, 1200);
  });
}

function menuAddTestInquiries() {
  runMenuAction_('테스트 문의 넣기', () => {
    const n = addTestInquiries();
    return '문의원본 탭에 테스트 문의 ' + n + '건을 넣었습니다. "문의 확인 지금 실행"을 누르거나 5분 기다리세요.';
  });
}

/** 메뉴 공통 — 결과 창을 띄우고, 오류는 오류기록에도 남긴다. */
function runMenuAction_(title, fn) {
  const ui = SpreadsheetApp.getUi();
  try {
    ui.alert(title, fn(), ui.ButtonSet.OK);
  } catch (e) {
    logError(title, '', e);
    ui.alert(title, e.message, ui.ButtonSet.OK);
  }
}

/** 개발용 시트에 가짜 고객 10명과 오늘 예식 고객의 상담·요청·사진을 만든다. */
function menuSeedFakeCustomers() {
  const ui = SpreadsheetApp.getUi();
  try {
    const r = seedFakeCustomers();
    ui.alert('가짜 고객 만들기', [
      '고객 ' + r.customers + '명 (문의 2 · 연락 2 · 답사 1 · 견적 2 · 계약 2 · 실패 1)',
      '오늘 예식 고객(정민호·한소희): 상담 기록 ' + r.consults + '건, 요청사항 ' + r.requests + '건, 사진 ' + r.photos + '장',
      '',
      '사진 폴더: ' + r.folderUrl,
    ].join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    logError('가짜 고객 만들기', '', e);
    ui.alert('가짜 고객 만들기', e.message, ui.ButtonSet.OK);
  }
}

function menuInstallTriggers() {
  const ui = SpreadsheetApp.getUi();
  const labels = installTriggers();
  ui.alert('자동 실행 켜기', '설치된 자동 실행:\n- ' + labels.join('\n- '), ui.ButtonSet.OK);
}

function menuRunInquiryCheck() {
  const ui = SpreadsheetApp.getUi();
  try {
    const r = runInquiryPipeline();
    const lines = [
      r.moved.length ? '고객 탭으로 옮김 ' + r.moved.length + '건: ' + r.moved.join(', ') : '옮길 새 문의 없음',
      '브리핑 완료 ' + r.briefed.length + '건' + (r.briefed.length ? ': ' + r.briefed.join(', ') : ''),
    ];
    if (r.failed.length) lines.push('브리핑 실패 ' + r.failed.length + '건: ' + r.failed.join(', ') + ' (오류기록 탭 참고, 디스코드에는 요약만 전송)');
    ui.alert('문의 확인', lines.join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    logError('문의 확인', '', e);
    ui.alert('문의 확인', e.message, ui.ButtonSet.OK);
  }
}

/** 날짜 계산·시트 읽기·오류기록이 제대로 되는지 보여준다. */
function menuSelfCheck() {
  const ui = SpreadsheetApp.getUi();
  const lines = [];
  try {
    const sample = '2026-11-07';
    const today = todayKey();
    lines.push('[날짜 계산 — 한국 시간]');
    lines.push('오늘: ' + formatKoreanDate(today) + ' (' + today + ')');
    lines.push(sample + '의 D-14는 ' + formatKoreanDate(ddayDate(sample, 14)));
    lines.push(sample + '의 D+7은 ' + formatKoreanDate(ddayDate(sample, -7)));
    lines.push('오늘 기준 ' + formatKoreanDate(sample) + '은 ' + ddayLabel(sample, today));

    lines.push('', '[시트 읽기]');
    for (const tab of [TABS.CUSTOMER, TABS.KNOWLEDGE, TABS.TIMETABLE]) {
      lines.push(tab.name + ': ' + readRows(tab).length + '줄');
    }

    logError('자가 점검', '', '테스트 기록 — 지워도 됩니다');
    const last = readRows(TABS.ERROR_LOG).pop();
    lines.push('', '[오류기록]');
    lines.push(last ? '테스트 한 줄 기록됨 (' + last['시각'] + ')' : '기록 실패');
  } catch (e) {
    lines.push('', '점검 중 오류: ' + e.message);
  }
  ui.alert('자가 점검', lines.join('\n'), ui.ButtonSet.OK);
}

/** 지식베이스·타임테이블이 비어 있을 때만 기획서 내용을 채운다. */
function menuFillKnowledge() {
  const ui = SpreadsheetApp.getUi();
  try {
    const r = fillDefaultKnowledge(SpreadsheetApp.getActiveSpreadsheet());
    const lines = [
      '지식베이스: ' + (r.knowledge ? r.knowledge + '줄 넣음' : '이미 내용이 있어 건너뜀'),
      '타임테이블: ' + (r.timetable ? r.timetable + '줄 넣음' : '이미 내용이 있어 건너뜀'),
      '',
      '[작성 필요] 항목 ' + r.todo + '개 — 기획서에 실제 값이 없는 항목입니다. 채우기 전까지 AI는 "확인 후 안내"로 답합니다.',
      '타임테이블 시각은 예시입니다. 실제 시각으로 고쳐 주세요.',
    ];
    ui.alert('지식베이스 기본 내용', lines.join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert(e.message);
  }
}

/** 탭 13개와 열 머리를 만든다. 이미 있는 탭은 건드리지 않는다. */
function menuEnsureTabs() {
  const ui = SpreadsheetApp.getUi();
  const r = ensureTabs(SpreadsheetApp.getActiveSpreadsheet());
  const lines = [
    '새로 만든 탭 ' + r.created.length + '개' + (r.created.length ? ': ' + r.created.join(', ') : ''),
    '그대로 둔 탭 ' + r.kept.length + '개' + (r.kept.length ? ': ' + r.kept.join(', ') : ''),
  ];
  if (r.mismatched.length) {
    lines.push('', '열 머리가 설계와 다른 탭 (데이터 보호를 위해 고치지 않음): ' + r.mismatched.join(', '));
  }
  lines.push('', '전체 ' + Object.keys(TABS).length + '개 탭');
  ui.alert('탭 만들기', lines.join('\n'), ui.ButtonSet.OK);
}

/** 입력 창으로 비밀 설정을 하나씩 받는다. 빈칸으로 확인하면 기존 값을 유지한다. */
function menuEnterSettings() {
  const ui = SpreadsheetApp.getUi();
  setSetting('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());

  for (const s of SETTINGS) {
    if (s.auto) continue;
    const current = getSetting(s.key);
    const hint = current ? '현재: ' + maskValue(current, s.secret) + ' (빈칸으로 확인하면 그대로 둡니다)' : '현재: 비어 있음';
    const res = ui.prompt(s.label, hint, ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) {
      ui.alert('설정 입력을 멈췄습니다. 지금까지 넣은 값은 저장됐습니다.');
      return;
    }
    const value = res.getResponseText().trim();
    if (value) setSetting(s.key, value);
  }
  ui.alert('설정 입력 완료. "루티드 → 설정 점검"으로 연결을 확인하세요.');
}

/** 설정 6개가 있는지 보고, 디스코드 3채널과 Gemini 연결을 실제로 시험한다. */
function menuCheckSettings() {
  const lines = [];
  let filled = 0;

  for (const s of SETTINGS) {
    const value = getSetting(s.key);
    if (value) filled++;
    lines.push((value ? '있음  ' : '없음  ') + s.label + (value ? '  ' + maskValue(value, s.secret) : ''));
  }
  lines.push('', '설정 ' + filled + ' / ' + SETTINGS.length + '개');

  lines.push('', '[연결 시험]');
  const when = Utilities.formatDate(new Date(), 'Asia/Seoul', 'M월 d일 HH:mm');
  for (const ch of Object.keys(DISCORD_CHANNELS)) {
    const isToday = ch === 'TODAY';
    const code = trySendDiscord(ch, '연결 확인 — 루티드 관리 화면 (' + when + ')' + (isToday ? ' · 멘션 시험' : ''), isToday);
    lines.push(DISCORD_CHANNELS[ch].name + ': ' + describeDiscordCode(code));
  }
  lines.push('Gemini: ' + checkGeminiKey());

  SpreadsheetApp.getUi().alert('설정 점검', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function trySendDiscord(channel, content, mention) {
  try {
    return sendDiscord(channel, content, { mention: mention });
  } catch (e) {
    return -1;
  }
}

function describeDiscordCode(code) {
  if (code === 0) return '웹후크 없음';
  if (code === 204 || code === 200) return '전송 성공';
  if (code === 401 || code === 404) return '실패 (' + code + ') — 웹후크 주소를 다시 복사해 주세요';
  if (code === -1) return '실패 — 주소 형식이 올바르지 않습니다';
  return '실패 (' + code + ')';
}

/** 모델 정보 조회로 키가 유효한지만 확인한다 (문의 내용은 보내지 않음). */
function checkGeminiKey() {
  const key = getSetting('GEMINI_API_KEY');
  if (!key) return '키 없음';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + getGeminiModel();
  try {
    const res = UrlFetchApp.fetch(url, { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
    const code = res.getResponseCode();
    if (code === 200) return '키 확인됨 (' + getGeminiModel() + ')';
    if (code === 400 || code === 403) return '실패 (' + code + ') — 키를 다시 확인해 주세요';
    return '실패 (' + code + ')';
  } catch (e) {
    return '실패 — ' + e.message;
  }
}
