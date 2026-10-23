# rooted-admin

루티드 관리 화면 — Apps Script 웹앱 + 구글 시트.
설계 문서는 상위 폴더 `docs/`(prd·frd·trd·plan)에 있다.

## 구조

- `src/` — clasp가 Apps Script로 올리는 폴더 (`appsscript.json` 포함)
  - `core/` 공통 기본기 · `modules/` 기능별 방 · `web/` 화면 진입 · `triggers/` 알람시계 · `ui/` 화면 HTML · `dev/` 가짜 데이터
- 비밀값(Gemini 키, 디스코드 웹후크, 시트 ID)은 코드에 넣지 않고 Apps Script **스크립트 속성**에 저장한다.

## 자주 쓰는 명령

```
clasp push      # 내 컴퓨터 코드 → 구글로 올리기
clasp open      # Apps Script 편집기 열기
```
