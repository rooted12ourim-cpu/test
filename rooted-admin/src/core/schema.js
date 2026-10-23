/**
 * 장부 탭 만들기 — config.js의 TABS대로 탭과 열 머리를 만든다.
 * 이미 있는 탭과 데이터는 지우지 않는다 (운영 시트 연결 때도 같은 함수를 쓴다).
 */
const HEADER_STYLE = { background: '#F1EDE4', autoColor: '#7A766C' };
const VALIDATION_ROWS = 1000;

/**
 * @return {{created: string[], kept: string[], mismatched: string[]}}
 */
function ensureTabs(ss) {
  const result = { created: [], kept: [], mismatched: [] };

  for (const def of Object.values(TABS)) {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      writeHeader(sheet, def);
      applyColumnRules(sheet, def);
      result.created.push(def.name);
      continue;
    }

    const width = Math.max(sheet.getLastColumn(), 1);
    const current = sheet.getRange(1, 1, 1, width).getValues()[0].filter(String);
    if (current.length === 0 && sheet.getLastRow() === 0) {
      writeHeader(sheet, def);
      applyColumnRules(sheet, def);
      result.created.push(def.name);
    } else if (current.join('|') === def.headers.join('|')) {
      result.kept.push(def.name);
    } else {
      result.mismatched.push(def.name);
    }
  }

  removeEmptyDefaultSheet(ss);
  orderTabs(ss);
  return result;
}

function writeHeader(sheet, def) {
  const range = sheet.getRange(1, 1, 1, def.headers.length);
  range.setValues([def.headers])
    .setFontWeight('bold')
    .setBackground(HEADER_STYLE.background);
  def.headers.forEach((h, i) => {
    if (h.startsWith('_')) sheet.getRange(1, i + 1).setFontColor(HEADER_STYLE.autoColor);
  });
  sheet.setFrozenRows(1);
  if (def.name === TABS.CUSTOMER.name) sheet.setFrozenColumns(3);
}

function applyColumnRules(sheet, def) {
  const dropdowns = def.dropdowns || {};
  for (const [header, values] of Object.entries(dropdowns)) {
    const col = def.headers.indexOf(header) + 1;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, col, VALIDATION_ROWS, 1).setDataValidation(rule);
  }
  for (const header of def.checkboxes || []) {
    const col = def.headers.indexOf(header) + 1;
    sheet.getRange(2, col, VALIDATION_ROWS, 1).insertCheckboxes();
  }
}

/** 새 시트를 만들 때 생기는 빈 "시트1"은 정리한다. */
function removeEmptyDefaultSheet(ss) {
  const names = Object.values(TABS).map(d => d.name);
  for (const sheet of ss.getSheets()) {
    const isDefault = /^(시트|Sheet)\d+$/.test(sheet.getName());
    if (isDefault && !names.includes(sheet.getName()) && sheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  }
}

/** 탭 순서를 config 순서로 맞춘다 (config에 없는 탭은 뒤로). */
function orderTabs(ss) {
  Object.values(TABS).forEach((def, i) => {
    const sheet = ss.getSheetByName(def.name);
    if (!sheet) return;
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(i + 1);
  });
  ss.setActiveSheet(ss.getSheetByName(TABS.CUSTOMER.name));
}
