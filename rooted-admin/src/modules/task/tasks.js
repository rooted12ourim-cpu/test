/**
 * 할 일 (F3.1–F3.5, F11.4) — 자동 생성(알림·미응대 문의) + 직접 추가.
 */
function todayTasks() {
  const today = todayKey();
  return readRows(TABS.TASK)
    .filter(t => toDateKey(t['날짜']) === today || (t['완료'] !== true && toDateKey(t['날짜']) < today))
    .map(t => ({
      id: t['할일ID'], text: t['내용'], customerId: t['고객ID'] || '', source: t['출처'], done: t['완료'] === true,
      overdue: toDateKey(t['날짜']) < today, customerName: '',
    }));
}

function addTask(text, customerId) {
  const content = String(text || '').trim();
  if (!content) throw new Error('할 일 내용을 적어 주세요');
  const id = nextId(TABS.TASK, 'T-', 4);
  appendRow(TABS.TASK, { '할일ID': id, '날짜': todayKey(), '내용': content, '고객ID': customerId || '', '출처': '직접', '완료': false });
  return id;
}

function setTaskDone(id, done, by) {
  const t = findRow(TABS.TASK, '할일ID', id);
  if (!t) throw new Error('할 일을 찾을 수 없습니다');
  updateRow(TABS.TASK, t._row, done ? { '완료': true, '완료자': by, '완료시각': nowStamp() } : { '완료': false, '완료자': '', '완료시각': '' });
  return true;
}

/** 직접 추가한 할 일만 문구를 고칠 수 있다 (F3.5). */
function editTask(id, text) {
  const content = String(text || '').trim();
  if (!content) throw new Error('할 일 내용을 적어 주세요');
  const t = findRow(TABS.TASK, '할일ID', id);
  if (!t) throw new Error('할 일을 찾을 수 없습니다');
  if (t['출처'] !== '직접') throw new Error('자동으로 만든 할 일은 고칠 수 없습니다');
  updateRow(TABS.TASK, t._row, { '내용': content });
  return content;
}

/** 직접 추가한 할 일만 지울 수 있다. */
function deleteTask(id) {
  const t = findRow(TABS.TASK, '할일ID', id);
  if (!t) return false;
  if (t['출처'] !== '직접') throw new Error('자동으로 만든 할 일은 지울 수 없습니다');
  return deleteRowsWhere(TABS.TASK, r => r['할일ID'] === id) > 0;
}

/** 할 일 자동 생성 (F11.4) — 오늘 알림과 미응대 문의에서 만든다. @return {number} 새로 만든 수 */
function generateTasks() {
  const today = todayKey();
  const plans = taskPlans(today, readRows(TABS.CUSTOMER), readRows(TABS.ALERT));
  return withLock(() => {
    const existing = new Set(readRows(TABS.TASK).map(t => t['_중복키']));
    let seq = Number(nextId(TABS.TASK, 'T-', 4).slice(2));
    let n = 0;
    for (const p of plans) {
      if (existing.has(p.key)) continue;
      appendRow(TABS.TASK, {
        '할일ID': 'T-' + String(seq++).padStart(4, '0'), '날짜': today, '내용': p.text, '고객ID': p.customerId,
        '출처': '자동', '완료': false, '_중복키': p.key,
      });
      existing.add(p.key);
      n++;
    }
    return n;
  });
}

/** 순수 계산 — 오늘 만들 할 일 목록 */
function taskPlans(today, customers, alerts) {
  const byId = {};
  customers.forEach(c => { byId[c['고객ID']] = c; });
  const plans = [];
  for (const c of customers) {
    if (c['진행단계'] === '문의' && !c['첫연락일']) {
      plans.push({ key: c['고객ID'] + ':첫연락', customerId: c['고객ID'], text: (c['이름'] || '') + ' 첫 연락' });
    }
  }
  const skip = ['문의 즉시', '미응대 24시간', '계약 직후', '예식일 변경'];
  for (const a of alerts) {
    if (String(a['발생시각']).slice(0, 10) !== today || skip.includes(a['종류']) || a['해제'] === true) continue;
    if (String(a['종류']).endsWith('체크리스트')) continue;
    const c = byId[a['고객ID']];
    const name = c ? c['이름'] : '';
    const text = a['종류'] === '답사 전날' ? name + ' 답사 준비'
      : String(a['종류']).startsWith('견적 후') ? name + ' 견적 팔로업'
      : name + ' ' + (a['종류'] === 'D-14' && a['급함'] === true ? '잔금 입금 확인·최종 인원 확정' : ddayTaskText_(a['종류']));
    plans.push({ key: 'A:' + a['_중복키'], customerId: a['고객ID'], text: text.trim() });
  }
  return plans;
}

function ddayTaskText_(type) {
  const p = DDAY_POINTS.find(x => x.label === type);
  return p ? '[' + p.label + '] ' + p.text : type;
}
