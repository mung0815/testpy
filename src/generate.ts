import type { Corpus } from "./models.js";
import type { ReportType } from "./reportTypes.js";

// 생성 핸드오프(plan-eng-review 결정: 생성은 Claude Code(구독)가 수행).
// 이 함수는 Claude Code 가 따를 생성 지침 텍스트를 만든다. 결과물은 Draft 스키마의 JSON.

export function generatePrompt(corpus: Corpus, reportType: ReportType, corpusPath: string): string {
  const outline = reportType.sections.length > 0
    ? reportType.sections.map((s) => `- ${s.title}${s.guidance ? ` — ${s.guidance}` : ""}`).join("\n")
    : corpus.outline.map((t) => `- ${t}`).join("\n");

  const sourceList = corpus.sources
    .map((s) => `  ${s.sourceId}: ${[s.author, s.publishedDate, s.title, s.url ?? s.filePath].filter(Boolean).join(" / ")}`)
    .join("\n");

  return [
    `# 정책보고서 생성 지침 (${reportType.title})`,
    ``,
    reportType.systemPrompt,
    ``,
    `## 주제`,
    corpus.topic,
    ``,
    `## 목차/섹션`,
    outline,
    ``,
    `## 사용 가능한 출처 (${corpusPath} 의 chunks 참조)`,
    sourceList || "  (없음)",
    ``,
    `## 출력 형식 (Draft JSON)`,
    `다음 스키마의 JSON 만 출력한다:`,
    `{ "topic": string, "reportType": "${reportType.key}", "sections": [`,
    `  { "title": string, "claims": [`,
    `    { "text": string, "citations": [`,
    `      { "text": string(verbatim 스니펫), "sourceId": string, "url": string, "author": string, "publishedDate": string }`,
    `    ] }`,
    `  ] }`,
    `] }`,
    ``,
    `## 절대 규칙 (docs/RULES.md)`,
    `1) 할루시네이션 방지: citation.text 는 해당 sourceId 청크에서 "글자 그대로" 따온다(재서술 금지).`,
    `   url/author/publishedDate 는 그 출처의 메타데이터에서 그대로 가져온다. 발행연도 추정·생성 금지.`,
    `   근거가 없으면 그 주장에는 citations 를 비워라(검증기가 [근거 필요]로 강등한다). 출처 불명 정보는 쓰지 마라.`,
    `2) 문체(RULES §3): 퍼플렉시티·버스티니스 극대화. 문장 길이를 극단적으로 변주(3~5어절 ↔ 30어절+).`,
    `   "~는 매우 중요합니다", "첫째/둘째/셋째", "다양한/효과적인/혁신적인" 류 AI 문체 금지.`,
    `   종결어미 5종 이상 혼용. 글머리기호 남발 금지, 산문 위주. 저자 입장을 분명히, 양비론 지양.`,
    `   단, 문체를 흔들더라도 출처·수치·발행연도의 정확성(규칙 1)은 절대 침해하지 마라.`,
    ``,
    `생성 후: policygen verify <draft.json> ${corpusPath} 로 검증하고, policygen assemble 로 DOCX 를 만든다.`,
  ].join("\n");
}
