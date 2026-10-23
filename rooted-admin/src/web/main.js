/**
 * 웹앱 입구 — 테스트 링크(/dev)나 배포 링크를 열면 구글이 이 함수를 부른다.
 * 접근 확인(access.js)을 통과하면 관리 화면, 아니면 "접근 권한 없음".
 */
function doGet(e) {
  const token = (e && e.parameter && e.parameter.t) || '';
  let user = null;
  try {
    user = resolveUser(token);
  } catch (err) {
    logError('접근 확인', '', err);
  }
  const page = HtmlService.createTemplateFromFile(user ? 'ui/app' : 'ui/denied');
  page.boot = JSON.stringify({
    token: token,
    role: user ? user.role : '',
    name: user ? user.name : '',
    today: todayKey(),
    appName: APP.NAME,
  }).replace(/</g, '\\u003c');
  return page.evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** HTML 조각 끼워 넣기 — 템플릿에서 <?!= include('ui/styles') ?> */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
