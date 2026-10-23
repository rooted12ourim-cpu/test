/**
 * 비밀 설정 — 스크립트 속성(구글이 보관하는 비밀 설정 칸)에서 읽고 쓴다.
 * 값은 코드·Git에 남기지 않는다.
 */
const SETTINGS = [
  { key: 'SHEET_ID', label: '스프레드시트 ID', secret: false, auto: true },
  { key: 'GEMINI_API_KEY', label: 'Gemini API 키', secret: true },
  { key: 'DISCORD_WEBHOOK_NEW_INQUIRY', label: '디스코드 웹후크 #새-문의', secret: true },
  { key: 'DISCORD_WEBHOOK_TODAY', label: '디스코드 웹후크 #오늘-할-일', secret: true },
  { key: 'DISCORD_WEBHOOK_WEDDING', label: '디스코드 웹후크 #예식-알람', secret: true },
  { key: 'DISCORD_MENTION_USER_ID', label: '준성 디스코드 사용자 ID', secret: false },
];

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function getSetting(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setSetting(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function getGeminiModel() {
  return getSetting('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
}

/** 비밀값은 앞 4자리·뒤 4자리만 보여준다. */
function maskValue(value, secret) {
  if (!value) return '';
  if (!secret || value.length <= 12) return secret ? '****' : value;
  return value.slice(0, 4) + '…' + value.slice(-4);
}
