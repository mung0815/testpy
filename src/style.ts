// DOCX 스타일 상수 — docs/RULES.md §2 의 수치를 한곳에 모은 단일 출처(single source of truth).
// 값/단위는 사용자 규칙(RULES.md)을 그대로 따른다. 렌더 결과가 다르면 이 파일만 고치면 된다.
// 단위 메모: docx-js 의 page size/margin/indent/spacing 은 기본적으로 twip(DXA, 1/1440 inch),
// font size 는 half-point. 사용자가 명시한 raw 값을 그대로 매핑한다.

export const STYLE = {
  // A4 (DXA)
  page: { width: 11906, height: 16838 },
  // 여백: 위/아래 39, 오른쪽/왼쪽 35, 머리말 12, 꼬리말 12 (RULES.md §2)
  margin: { top: 39, bottom: 39, left: 35, right: 35, header: 12, footer: 12 },
  // 기본 폰트: 신명조 11pt → docx size 는 half-point 이므로 22
  font: { name: "신명조", sizeHalfPt: 22 },
  // 줄간격 180, 들여쓰기 2, 자간 0 (RULES.md §2)
  paragraph: { line: 180, firstLineIndent: 2, characterSpacing: 0 },
} as const;
