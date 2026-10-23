---
name: Warm Paper
colors:
  surface: '#fdf9f2'
  surface-dim: '#ddd9d3'
  surface-bright: '#fdf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ec'
  surface-container: '#f1ede7'
  surface-container-high: '#ece8e1'
  surface-container-highest: '#e6e2dc'
  on-surface: '#1c1c18'
  on-surface-variant: '#424753'
  inverse-surface: '#31302c'
  inverse-on-surface: '#f4f0ea'
  outline: '#737784'
  outline-variant: '#c2c6d5'
  surface-tint: '#0359c5'
  primary: '#0056be'
  on-primary: '#ffffff'
  primary-container: '#2f6fdb'
  on-primary-container: '#faf9ff'
  inverse-primary: '#afc6ff'
  secondary: '#605e57'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2d9'
  on-secondary-container: '#66645d'
  tertiary: '#ac262a'
  on-tertiary: '#ffffff'
  tertiary-container: '#ce3f40'
  on-tertiary-container: '#fff8f7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#afc6ff'
  on-primary-fixed: '#001a43'
  on-primary-fixed-variant: '#004397'
  secondary-fixed: '#e6e2d9'
  secondary-fixed-dim: '#cac6be'
  on-secondary-fixed: '#1c1c16'
  on-secondary-fixed-variant: '#484740'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#8f0d19'
  background: '#fdf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e6e2dc'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  numeric-dday:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  numeric-currency:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
루티드(rooted) 웨딩 운영 및 일정 관리 화면을 위한 디자인 시스템입니다.
화려하고 감정 소모가 큰 웨딩 준비 과정에서 플래너와 신랑·신부에게 서재 속 정갈한 종이 기록물과 같은 심리적 안정감을 제공합니다. 

노션(Notion)처럼 정돈되고 절제된 문서형 유틸리티 무드를 지향하며, 불필요한 그라디언트나 블러, 입체 효과를 철저히 배제한 **미니멀 플랫(Flat Minimalism)** 스타일을 적용합니다. 장식적인 그래픽 대신 종이의 여백, 1px의 정교한 베이지 라인, 높은 가독성의 본문 타이포그래피로 구조적 신뢰감을 전달합니다.

## Colors
기록의 바탕이 되는 미색 종이 질감과 차분한 잉크색을 기본으로 설계합니다.

- **Background (캔버스)**: `#FAF8F3` (부드러운 아이보리 웜 페이퍼)
- **Surface (카드 & 컨테이너)**: `#FFFFFF` (순수 화이트로 종이 위 카드 형태 구분)
- **Border (구분선 & 외곽선)**: `#E7E2D6` (자연스러운 1px 베이지 라인)
- **Text Primary (본문/제목)**: `#2B2A26` (부드러운 딥 차콜)
- **Text Secondary (메타데이터/라벨)**: `#7A766C` (시각적 피로를 낮추는 웜 그레이)
- **Primary / Action (강조)**: `#2F6FDB` (차분한 코발트 블루. 주요 버튼, 활성 탭 인디케이터, 인풋 포커스 링)
- **Urgent / Alert (경고)**: `#D64545` (24시간 미응대, 계약금 미입금, D-14 도래 등 즉각적 조치가 필요한 위험 알림)
- **Sub Surface / Chips**: `#F1EDE4` (보조 칩, 테이블 헤더, 검색창 배경)
- **Completed State**: 유색 배지를 지양하고, 기본 차콜 `#2B2A26` 체크 아이콘과 텍스트 취소선(Line-through), 투명도 40%로 처리해 완료된 업무를 시각적으로 가라앉힙니다.

## Typography
웹 폰트 렌더링 시 Pretendard(또는 정갈한 산세리프 대체 폰트)를 일관되게 사용하며, 간결한 명사형 중심의 UI 언어를 채택합니다.

- **기본 본문 규격**: 모바일 환경에서 피로도 없는 장문 판독을 위해 기본 바디는 `16px`을 기준으로 삼습니다.
- **숫자 및 계량 데이터**: 예산, 잔금, 정산 금액 및 D-day 카운터에는 `font-variant-numeric: tabular-nums`를 강제 적용하여 자릿수 간 정렬이 흐트러지지 않도록 구성합니다.
- **문장형 지양**: '일정을 등록해보세요' 대신 '일정 등록', '미입금된 항목입니다' 대신 '미입금'과 같이 노션 특유의 명확하고 무감정한 업무형 명사 표기를 적용합니다.

## Layout & Spacing
모바일 390px 뷰포트를 1차 표준으로 정의한 단일 컬럼 유동형 그리드입니다.

- **여백 체계**: 좌우 캔버스 마진은 16px(`1rem`)을 고수하여 한 손 조작 시 텍스트 엣지가 스크린에 달라붙지 않게 보호합니다.
- **카드 간격**: 개별 업무 카드 및 섹션 간 수직 간격은 12px(`0.75rem`)에서 16px(`1rem`)을 적용해 노트 속 문단처럼 읽히도록 설계합니다.
- **터치 타깃 영역**: 모든 인터랙션 요소(리스트 행, 체크박스, 탭 버튼)는 시각적 외형과 별개로 최소 `44px ~ 48px`의 상하 터치 안전 영역을 확보합니다.

## Elevation & Depth
그림자(Box Shadow)를 일절 사용하지 않는 **Zero Elevation Flat System**입니다.

- **계층 구분**: 레이어의 위아래는 그림자 대신 `#FAF8F3`(배경)과 `#FFFFFF`(표면), 그리고 경계면의 `1px solid #E7E2D6` 테두리 단 한 겹으로만 명확하게 정리합니다.
- **오버레이 및 모달**: 바텀시트나 다이얼로그 노출 시에도 블러나 묵직한 드롭섀도우를 지양하고, 반투명 딤(Dim: `#2B2A26` 30%) 위에 단색 백색 시트와 상단 1px 보더를 통해 담백하게 띄웁니다.

## Shapes
종이 서식의 단정한 인상을 위해 모든 컨테이너와 입력 필드에 통일된 `8px` 곡률(`roundedness: 2`)을 적용합니다.

- **컨테이너/카드/인풋/모달**: 고정 `8px` 반경으로 정돈된 구조적 규격을 형성합니다.
- **알약형(Pill) 지양**: 과도하게 둥근 캡슐형 버튼은 장식적이고 캐주얼해 보이므로, 상태 칩과 태그 역시 카드와 호응하는 `4px ~ 6px`의 소프트 코너로 마감합니다.

## Components

- **Buttons (버튼)**:
  - *Primary*: `#2F6FDB` 배경, `#FFFFFF` 텍스트. 최소 높이 48px, 모서리 8px. 불필요한 입체감 없이 플랫하게 채웁니다.
  - *Secondary*: `#FFFFFF` 배경, `1px solid #E7E2D6` 테두리, `#2B2A26` 텍스트. 
  - *Text Button*: 여백 없는 패딩, `#7A766C` 텍스트, 탭 시 `#2B2A26`으로 미세 전환.

- **Inputs & Fields (입력창)**:
  - 배경은 `#FFFFFF`, 기본 테두리는 `1px solid #E7E2D6`.
  - 높이 48px, 내부 패딩 12px 14px, 본문 16px로 모바일 브라우저의 자동 줌 현상을 원천 방지합니다.
  - 활성화(Focus) 시 테두리가 차분한 파랑 `#2F6FDB`로 1px 전환되며 외곽 글로우나 섀도우는 생략합니다.

- **Chips & Tags (상태 칩)**:
  - 기본: `#F1EDE4` 배경, `#7A766C` 텍스트, 4px 모서리.
  - 긴급/미납: `#FAF8F3` 배경, `1px solid #D64545`, 텍스트 `#D64545`.

- **Checkboxes & Task List (할 일 및 체크박스)**:
  - 기본 체크박스 크기는 20x20px이나 터치 영역은 44x44px을 보장합니다.
  - 미완료: `1px solid #E7E2D6` 사각 박스, 백색 배경.
  - 완료 시: 색상 강조 없이 박스 내부에 `#2B2A26` 체크 아이콘 표시. 연결된 업무 텍스트는 `#7A766C` 취소선(line-through) 처리.

- **Cards & Document Blocks (문서 블록형 카드)**:
  - 배경 `#FFFFFF`, 테두리 `1px solid #E7E2D6`, 내부 패딩 16px.
  - 카드 상단 헤더 영역이 필요한 경우 `#F1EDE4` 배경과 하단 1px 보더로 깔끔한 테이블 명세서 느낌을 부여합니다.
  - 숫자(계약금, 잔금, 예산)는 우측 정렬 및 `tabular-nums`를 적용하여 수직 스캔 편의성을 극대화합니다.