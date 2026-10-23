/**
 * 상담 기록 (F6) — 목록, 추가, 수정, 삭제. 사진은 고객의 드라이브 레퍼런스 폴더에서 읽고 올린다.
 */
const DRIVE_ROOT = ['루티드', '고객'];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const SUGGEST_MAX = 5;
function consultsFor(customerId) {
  return readRows(TABS.CONSULT)
    .filter(r => r['고객ID'] === customerId)
    .sort((a, b) => (String(b['상담일']) + b['작성시각'] > String(a['상담일']) + a['작성시각'] ? 1 : -1))
    .map(r => ({
      id: r['기록ID'], date: toDateKey(r['상담일']), dateLabel: toDateKey(r['상담일']) ? formatKoreanDate(toDateKey(r['상담일'])) : '',
      method: r['방식'], summary: r['요약'], folder: r['사진폴더'] || '', photoCount: r['사진수'] || 0,
      author: r['작성자'], updatedAt: String(r['수정시각'] || ''),
    }));
}

/**
 * 상담 기록 저장 (F6.2 추가 / F6.3 수정) + 함께 입력한 요청사항 (F7.2)
 * @param {{id?: string, customerId: string, date: string, method: string, summary: string, requests?: Array}} data
 */
function saveConsult(data, author) {
  const errors = [];
  if (!data.customerId) errors.push('고객');
  if (!toDateKey(data.date)) errors.push('상담일');
  if (!CHOICES.CONSULT_METHOD.includes(data.method)) errors.push('상담 방식');
  if (!String(data.summary || '').trim()) errors.push('내용 요약');
  if (errors.length) throw new Error('필수 칸을 채워 주세요: ' + errors.join(', '));
  const customer = findRow(TABS.CUSTOMER, '고객ID', data.customerId);
  if (!customer) throw new Error('고객을 찾을 수 없습니다');

  let id = data.id;
  if (id) {
    const row = findRow(TABS.CONSULT, '기록ID', id);
    if (!row) throw new Error('상담 기록을 찾을 수 없습니다');
    updateRow(TABS.CONSULT, row._row, { '상담일': toDateKey(data.date), '방식': data.method, '요약': String(data.summary).trim(), '수정시각': nowStamp() });
  } else {
    id = nextId(TABS.CONSULT, 'C-', 4);
    const folderUrl = customer['_드라이브폴더'] || '';
    appendRow(TABS.CONSULT, {
      '기록ID': id, '고객ID': data.customerId, '상담일': toDateKey(data.date), '방식': data.method,
      '요약': String(data.summary).trim(), '사진폴더': folderUrl, '사진수': folderUrl ? photoFiles_(folderUrl).length : 0,
      '작성자': author, '작성시각': nowStamp(),
    });
  }
  for (const r of data.requests || []) {
    if (String(r.content || '').trim()) saveRequest(Object.assign({}, r, { customerId: data.customerId, sourceId: id }));
  }
  return id;
}

/** 상담 기록 삭제 (F6.9) — 이 기록에서 나온 요청사항은 남겨 둔다. */
function deleteConsult(id) {
  return deleteRowsWhere(TABS.CONSULT, r => r['기록ID'] === id) > 0;
}

/**
 * Gemini 요청사항 후보 (F6.8) — 상담 요약에서 당일 눈으로 확인할 한 줄을 뽑는다.
 * 이름·연락처는 가리고 보낸다. 이미 있는 요청과 같은 내용은 뺀다.
 * @return {Array<{part: string, content: string}>}
 */
function suggestRequests(consultId) {
  const row = findRow(TABS.CONSULT, '기록ID', consultId);
  if (!row) throw new Error('상담 기록을 찾을 수 없습니다');
  const customer = findRow(TABS.CUSTOMER, '고객ID', row['고객ID']);
  const existing = new Set(requestsFor(row['고객ID']).map(r => r.content));
  const schema = {
    type: 'OBJECT',
    properties: {
      candidates: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { part: { type: 'STRING', enum: CHOICES.PART }, content: { type: 'STRING', description: '당일 눈으로 확인할 한 줄 (' + REQUEST_MAX_LEN + '자 이내)' } },
          required: ['part', 'content'],
        },
      },
    },
    required: ['candidates'],
  };
  const system = [
    '너는 야외 웨딩 공간 "루티드"의 상담 기록에서 예식 당일 체크리스트 항목을 뽑는 비서다.',
    '상담 요약에 실제로 적힌 요청만 뽑는다. 지어내지 않는다.',
    '각 항목은 예식 당일 현장에서 눈으로 확인할 수 있는 한 줄로, ' + REQUEST_MAX_LEN + '자 이내 한국어로 쓴다.',
    '파트는 ' + CHOICES.PART.join('·') + ' 중 하나만 고른다.',
    '최대 ' + SUGGEST_MAX + '개. 뽑을 것이 없으면 빈 배열.',
  ].join('\n');
  const text = callGemini(system, '상담 요약:\n' + maskPersonal(row['요약'], customer && customer['이름']), schema, 0.2);
  const seen = new Set(existing);
  const out = [];
  for (const c of JSON.parse(text).candidates || []) {
    const content = String(c.content || '').trim();
    if (!CHOICES.PART.includes(c.part) || !content || content.length > REQUEST_MAX_LEN || seen.has(content)) continue;
    seen.add(content);
    out.push({ part: c.part, content: content });
  }
  return out.slice(0, SUGGEST_MAX);
}

/** Gemini에 보내기 전 이름·연락처 가리기 (AI 금지사항 6) */
function maskPersonal(text, name) {
  let s = String(text || '').replace(/01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[연락처]');
  String(name || '').split(/[·,\s]+/).filter(n => n.length >= 2)
    .forEach(n => { s = s.split(n).join('고객'); });
  return s;
}

/** 루티드/고객/{예식일}_{이름}/레퍼런스 폴더 (없으면 만든다) */
function getOrCreateCustomerFolder(weddingKey, name) {
  let folder = DriveApp.getRootFolder();
  for (const part of DRIVE_ROOT.concat([weddingKey + '_' + name, '레퍼런스'])) {
    const it = folder.getFoldersByName(part);
    folder = it.hasNext() ? it.next() : folder.createFolder(part);
  }
  return folder;
}

/**
 * 화면에서 사진 올리기 (F6.7) — 고객 폴더가 없으면 만들고 고객 행에 적는다.
 * @param {string} dataUrl 'data:image/jpeg;base64,…'
 */
function uploadPhoto(customerId, fileName, dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('사진 파일만 올릴 수 있습니다');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > PHOTO_MAX_BYTES) throw new Error('사진이 너무 큽니다 (10MB 이하)');
  const c = findRow(TABS.CUSTOMER, '고객ID', customerId);
  if (!c) throw new Error('고객을 찾을 수 없습니다');

  let folder;
  if (c['_드라이브폴더']) {
    folder = DriveApp.getFolderById(driveIdFromUrl(c['_드라이브폴더']));
  } else {
    const dateKey = toDateKey(c['예식일']) || toDateKey(c['희망날짜1']) || '날짜미정';
    folder = getOrCreateCustomerFolder(dateKey, c['이름'] || customerId);
    updateRow(TABS.CUSTOMER, c._row, { '_드라이브폴더': folder.getUrl() });
  }
  const safeName = String(fileName || 'photo.jpg').replace(/[\\/:*?"<>|]/g, '_').slice(-60);
  const stamp = Utilities.formatDate(new Date(), TZ, 'yyMMdd_HHmmss');
  folder.createFile(Utilities.newBlob(bytes, m[1], stamp + '_' + safeName));
  return customerPhotos(customerId);
}

/** 고객 폴더 사진 썸네일 목록 (F6.5) — 최근 올린 순 */
function customerPhotos(customerId) {
  const c = findRow(TABS.CUSTOMER, '고객ID', customerId);
  if (!c || !c['_드라이브폴더']) return { folderUrl: '', photos: [] };
  const files = photoFiles_(c['_드라이브폴더'])
    .sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(0, 12);
  return {
    folderUrl: c['_드라이브폴더'],
    photos: files.map(f => ({ id: f.getId(), name: f.getName(), thumb: thumbData_(f) })),
  };
}

/** 사진 한 장 원본 (F6.6) — 고객 폴더 안의 파일만 연다. */
function photoData(customerId, fileId) {
  const c = findRow(TABS.CUSTOMER, '고객ID', customerId);
  const ok = c && c['_드라이브폴더'] && photoFiles_(c['_드라이브폴더']).some(f => f.getId() === fileId);
  if (!ok) throw new Error('사진을 열 수 없습니다');
  const blob = DriveApp.getFileById(fileId).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

/** 요청사항 사진 링크(드라이브 파일 주소)에서 파일 ID */
function driveIdFromUrl(url) {
  const m = String(url || '').match(/\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})|folders\/([\w-]{20,})/);
  return m ? (m[1] || m[2] || m[3]) : '';
}

function photoFiles_(folderUrl) {
  const id = driveIdFromUrl(folderUrl);
  if (!id) return [];
  const out = [];
  const it = DriveApp.getFolderById(id).getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (String(f.getMimeType()).startsWith('image/')) out.push(f);
  }
  return out.sort((a, b) => (a.getName() < b.getName() ? -1 : 1));
}

function thumbData_(file) {
  try {
    const t = file.getThumbnail();
    if (t) return 'data:' + t.getContentType() + ';base64,' + Utilities.base64Encode(t.getBytes());
  } catch (e) { /* 썸네일이 아직 없으면 원본 사용 */ }
  const blob = file.getBlob();
  return blob.getBytes().length < 400000 ? 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) : '';
}
