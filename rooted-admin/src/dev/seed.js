/**
 * 가짜 고객 시드 — 개발용 시트에서만 실행한다.
 * 날짜는 모두 오늘 기준 상대값이라, 언제 실행해도 같은 테스트 상황이 만들어진다.
 *  - 문의 25시간 전(미응대 급함) / 답사 내일(답사 전날) / 견적 3일 전(팔로업)
 *  - 예식 D-14 잔금 미입금(급함) / 예식 오늘(당일 체크: 상담 3·요청 6·사진 3)
 */
const SEED_MARK = '시드';

function assertDevSpreadsheet_(ss) {
  if (!ss.getName().includes('개발용')) {
    throw new Error('시트 이름에 "개발용"이 없어 실행하지 않았습니다. 운영 시트에는 가짜 데이터를 넣지 않습니다.');
  }
}

/** @return {{customers: number, consults: number, requests: number, photos: number, folderUrl: string}} */
function seedFakeCustomers() {
  const ss = getSpreadsheet();
  assertDevSpreadsheet_(ss);
  if (readRows(TABS.CUSTOMER).length > 0) {
    throw new Error('고객 탭에 이미 데이터가 있습니다. 비우고 다시 실행하세요 (초기화 메뉴는 STORY 5.3에서 추가).');
  }

  const today = todayKey();
  const d = n => addDays(today, n);
  const now = new Date();
  const hoursAgo = h => Utilities.formatDate(new Date(now.getTime() - h * 3600 * 1000), TZ, 'yyyy-MM-dd HH:mm');

  const customers = [
    { // 문의 — 25시간 전, 미응대 급함 대상
      '접수일시': hoursAgo(25), '이름': '김하은', '연락처': '010-0000-5678', '행사종류': '웨딩',
      '희망날짜1': '2027-04-17', '희망날짜2': '2027-04-24', '희망슬롯': '낮', '예상인원': 90, '유입경로': '인스타그램',
      '문의내용': '숲 배경 야외 본식 희망합니다. 어르신 하객이 많아 이동이 걱정돼요.', '견적기금액': '1,240만', '진행단계': '문의',
    },
    { // 문의 — 2시간 전
      '접수일시': hoursAgo(2), '이름': '이도현', '연락처': '010-0000-2231', '행사종류': '웨딩',
      '희망날짜1': '2027-06-05', '희망슬롯': '낮', '예상인원': 85, '유입경로': '네이버 예약',
      '문의내용': '6월 초 낮 예식 가능한지, 우천 시 어떻게 진행되는지 궁금합니다.', '진행단계': '문의',
    },
    { // 연락
      '접수일시': hoursAgo(24 * 4), '이름': '박지훈', '연락처': '010-0000-3412', '행사종류': '웨딩',
      '희망날짜1': '2027-05-01', '희망슬롯': '낮', '예상인원': 70, '유입경로': '지인 소개',
      '문의내용': '소규모 가족 위주 예식 생각 중입니다.', '진행단계': '연락', '첫연락일': d(-3),
    },
    { // 연락
      '접수일시': hoursAgo(24 * 6), '이름': '문채원', '연락처': '010-0000-7720', '행사종류': '돌잔치',
      '희망날짜1': '2026-12-12', '희망슬롯': '저녁', '예상인원': 30, '유입경로': '인스타그램',
      '문의내용': '돌잔치 30명 저녁 대관 가능할까요?', '진행단계': '연락', '첫연락일': d(-5),
    },
    { // 답사 — 내일 답사
      '접수일시': hoursAgo(24 * 10), '이름': '최유나', '연락처': '010-0000-4471', '행사종류': '웨딩',
      '희망날짜1': '2027-05-15', '희망슬롯': '낮', '예상인원': 80, '유입경로': '인스타그램',
      '문의내용': '그린·화이트 톤으로 아치 연출을 원해요.', '진행단계': '답사', '첫연락일': d(-9), '답사일': d(1),
      '분위기': '그린·화이트, 내추럴', '예산감': '2천만 원 안팎', '중요기준': '분위기', '결정권자': '신부', '하객지역': '광주·서울',
    },
    { // 견적 — 3일 전 발송, 김하은과 같은 날짜·슬롯 (예약 가능 "검토 중" 테스트용)
      '접수일시': hoursAgo(24 * 20), '이름': '오세린', '연락처': '010-0000-1189', '행사종류': '웨딩',
      '희망날짜1': '2027-04-17', '희망슬롯': '낮', '예상인원': 100, '유입경로': '네이버 블로그',
      '문의내용': '100명 규모 가능한지 궁금합니다.', '진행단계': '견적', '첫연락일': d(-19), '답사일': d(-8), '견적발송일': d(-3),
      '중요기준': '가격',
    },
    { // 견적 — 1일 전 발송
      '접수일시': hoursAgo(24 * 15), '이름': '김태경', '연락처': '010-0000-6624', '행사종류': '기업행사',
      '희망날짜1': '2026-11-20', '희망슬롯': '저녁', '예상인원': 50, '유입경로': '홈페이지',
      '문의내용': '연말 기업 행사 50명, 케이터링 포함 문의드립니다.', '진행단계': '견적', '첫연락일': d(-14), '답사일': d(-5), '견적발송일': d(-1),
    },
    { // 계약 — 예식 D-14, 잔금 미입금
      '접수일시': hoursAgo(24 * 90), '이름': '박서준·이지민', '연락처': '010-0000-5820', '행사종류': '웨딩',
      '희망날짜1': d(14), '희망슬롯': '낮', '예상인원': 82, '유입경로': '인스타그램',
      '문의내용': '숲 배경 본식 희망, 어르신 하객 다수.', '진행단계': '계약', '첫연락일': d(-89), '답사일': d(-85), '견적발송일': d(-84),
      '계약일': d(-80), '예식일': d(14), '예식슬롯': '낮', '패키지': '야외 본식', '옵션': '커스텀 플라워',
      '총액': 19400000, '계약금': 2000000, '계약금입금일': d(-80), '중도금': 5000000, '중도금입금일': d(-60), '잔금': 12400000, '초상권동의': true,
    },
    { // 계약 — 오늘 예식 (당일 체크용)
      '접수일시': hoursAgo(24 * 120), '이름': '정민호·한소희', '연락처': '010-0000-9043', '행사종류': '웨딩',
      '희망날짜1': today, '희망슬롯': '낮', '예상인원': 82, '유입경로': '지인 소개',
      '문의내용': '그린·화이트 플라워, 비건 하객 있음.', '진행단계': '계약', '첫연락일': d(-119), '답사일': d(-110), '견적발송일': d(-108),
      '계약일': d(-100), '예식일': today, '예식슬롯': '낮', '패키지': '야외 본식', '옵션': '플라워·원판',
      '총액': 18800000, '계약금': 2000000, '계약금입금일': d(-100), '중도금': 5000000, '중도금입금일': d(-60), '잔금': 11800000, '잔금입금일': d(-14), '초상권동의': true,
    },
    { // 실패 — 가격
      '접수일시': hoursAgo(24 * 30), '이름': '송서연', '연락처': '010-0000-3305', '행사종류': '웨딩',
      '희망날짜1': '2027-03-20', '희망슬롯': '저녁', '예상인원': 120, '유입경로': '인스타그램',
      '문의내용': '120명 저녁 예식 가능할까요?', '진행단계': '실패', '첫연락일': d(-29), '견적발송일': d(-25),
      '실패단계': '견적', '실패사유': '가격',
    },
  ];

  const ids = {};
  const seq = {};
  for (const c of customers) {
    const ymd = c['접수일시'].slice(2, 10).replace(/-/g, '');
    seq[ymd] = (seq[ymd] || 0) + 1;
    const id = 'R-' + ymd + '-' + String(seq[ymd]).padStart(3, '0');
    ids[c['이름']] = id;
    appendRow(TABS.CUSTOMER, Object.assign({ '고객ID': id, '_브리핑상태': SEED_MARK }, c));
  }

  appendRow(TABS.WEDDING_DETAIL, {
    '고객ID': ids['박서준·이지민'], '최종인원': 82, '알레르기': '견과류 1명', '입장동선': '버진로드 동시 입장',
    '축가': '1팀 (신랑 친구 2인, MR)', '신부대기실시간': '11:30–13:00',
  });
  appendRow(TABS.WEDDING_DETAIL, {
    '고객ID': ids['정민호·한소희'], '최종인원': 82, '알레르기': '비건 4명, 견과류 1명', '입장동선': '신랑 선입장 후 신부 입장',
    '축가': '없음', '외부업체연락처': '원판 작가 010-0000-1111', '신부대기실시간': '11:00–12:50',
  });

  // 오늘 예식 고객 — 사진 폴더, 상담 기록 3, 요청사항 6
  const wedId = ids['정민호·한소희'];
  const folder = getOrCreateCustomerFolder(today, '정민호·한소희');
  const photos = addSamplePhotos_(folder, 3);
  updateRow(TABS.CUSTOMER, findRow(TABS.CUSTOMER, '고객ID', wedId)._row, { '_드라이브폴더': folder.getUrl() });

  const consults = [
    { '상담일': d(-110), '방식': '답사', '요약': '버진로드 양옆 생화 풍성하게 연출 요청. 비건 하객 4명 확인 필요. 음향 시작 타이밍 민감.', '사진폴더': folder.getUrl(), '사진수': photos.length },
    { '상담일': d(-45), '방식': '미팅', '요약': '아치는 비대칭, 그린·화이트. 신부 입장곡은 2절부터. 축가 없음.', '사진폴더': folder.getUrl(), '사진수': photos.length },
    { '상담일': d(-8), '방식': '카톡', '요약': '최종 인원 82명 확정. 견과류 알레르기 1명 추가. 원판 작가 직접 섭외.' },
  ];
  const consultIds = consults.map((c, i) => {
    const id = 'C-' + String(i + 1).padStart(4, '0');
    appendRow(TABS.CONSULT, Object.assign({ '기록ID': id, '고객ID': wedId, '작성자': '준성', '작성시각': c['상담일'] + ' 18:00' }, c));
    return id;
  });

  const requests = [
    ['플라워', '아치 비대칭, 그린·화이트', consultIds[1], photos[0]],
    ['플라워', '버진로드 양옆 생화 풍성하게', consultIds[0], photos[1]],
    ['주방', '비건 하객 4명 별도 플레이트, 견과류 알레르기 1명 테이블 표시', consultIds[0], ''],
    ['음향', '신부 입장곡 2절부터 재생', consultIds[1], ''],
    ['무대', '신랑 선입장 후 신부 입장 동선 확보', consultIds[1], photos[2]],
    ['서빙', '어르신 테이블 우선 서빙', consultIds[0], ''],
  ];
  requests.forEach((r, i) => {
    appendRow(TABS.REQUEST, {
      '요청ID': 'Q-' + String(i + 1).padStart(4, '0'), '고객ID': wedId, '파트': r[0], '내용': r[1],
      '출처기록ID': r[2], '사진링크': r[3], '고객확인일시': d(-7) + ' 15:00', '상태': '대기',
    });
  });

  return { customers: customers.length, consults: consults.length, requests: requests.length, photos: photos.length, folderUrl: folder.getUrl() };
}

/**
 * 개발용 시트 초기화 (STORY 5.3) — 데이터 행과 캘린더 일정을 지운다. 열 머리와 지식베이스·타임테이블·계정은 남긴다.
 * 시트 이름에 "개발용"이 없으면 실행하지 않는다.
 */
const KEEP_ON_RESET = ['KNOWLEDGE', 'TIMETABLE', 'ACCOUNT'];

function resetDevSpreadsheet() {
  const ss = getSpreadsheet();
  if (!ss.getName().includes('개발용')) throw new Error('운영 시트에서는 실행할 수 없습니다. (시트 이름에 "개발용"이 없음)');
  for (const c of readRows(TABS.CUSTOMER)) {
    try { removeCustomerSchedule_(c['고객ID']); } catch (e) { logError('초기화 — 캘린더', c['고객ID'], e); }
  }
  const cleared = [];
  for (const [key, tab] of Object.entries(TABS)) {
    if (KEEP_ON_RESET.includes(key)) continue;
    const sheet = getTab(tab);
    const last = sheet.getLastRow();
    if (last >= 2) sheet.getRange(2, 1, last - 1, tab.headers.length).clearContent();
    applyColumnRules(sheet, tab);
    invalidateRows(tab);
    cleared.push(tab.name);
  }
  return cleared;
}

/**
 * 전체 흐름 테스트용 문의 3건 (STORY 4.5) — 문의원본 탭에 넣는다.
 * ① 박서준·이지민 예식일과 같은 날짜·슬롯 → 이미 계약 있음 ② 오세린과 같은 날짜 → 검토 중 ③ 빈 날짜 → 가능
 */
function addTestInquiries() {
  assertDevSpreadsheet_(getSpreadsheet());
  const contracted = readRows(TABS.CUSTOMER).find(c => c['진행단계'] === '계약' && c['잔금'] && !c['잔금입금일']);
  const busyDate = contracted ? toDateKey(contracted['예식일']) : addDays(todayKey(), 14);
  const rows = [
    { '이름': '테스트 신부 A', '연락처': '010-0000-0101', '행사종류': '웨딩', '희망날짜1': busyDate, '희망슬롯': '낮', '예상인원': 80, '유입경로': '인스타그램', '문의내용': '이 날짜 낮 예식 가능할까요? 하객 80명 예정입니다.' },
    { '이름': '테스트 신부 B', '연락처': '010-0000-0102', '행사종류': '웨딩', '희망날짜1': '2027-04-17', '희망날짜2': '2027-05-08', '희망슬롯': '낮', '예상인원': 100, '유입경로': '네이버 블로그', '문의내용': '비 오면 어떻게 진행되는지, 어르신 이동이 편한지 궁금합니다.', '견적기금액': '1,580만' },
    { '이름': '테스트 돌잔치 C', '연락처': '010-0000-0103', '행사종류': '돌잔치', '희망날짜1': '2027-01-16', '희망슬롯': '저녁', '예상인원': 30, '유입경로': '지인 소개', '문의내용': '아이 돌잔치 30명, 돌상 업체 연계도 되나요?' },
  ];
  rows.forEach(r => appendRow(TABS.INQUIRY_RAW, Object.assign({ '접수일시': nowStamp() }, r)));
  return rows.length;
}

/** 샘플 사진 n장을 폴더에 넣고 파일 주소 목록을 돌려준다. */
function addSamplePhotos_(folder, n) {
  const urls = [];
  for (let i = 1; i <= n; i++) {
    const name = '샘플_' + i + '.jpg';
    const existing = folder.getFilesByName(name);
    if (existing.hasNext()) {
      urls.push(existing.next().getUrl());
      continue;
    }
    let blob;
    try {
      const res = UrlFetchApp.fetch('https://picsum.photos/seed/rooted' + i + '/1200/800', { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() === 200) blob = res.getBlob().setName(name);
    } catch (e) { /* 아래 대체 이미지 사용 */ }
    if (!blob) {
      const png = Utilities.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4+fMnAAXvAvr/7z5+AAAAAElFTkSuQmCC');
      blob = Utilities.newBlob(png, 'image/png', '샘플_' + i + '.png');
    }
    urls.push(folder.createFile(blob).getUrl());
  }
  return urls;
}
