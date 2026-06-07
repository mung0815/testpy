import { describe, it, expect } from "vitest";
import { assembleDocx, toBuffer, paragraphsFromText, citationFootnoteText, makeImageRun, renderableSections } from "./docx.js";
import type { Corpus, Draft } from "./models.js";

const corpus: Corpus = {
  topic: "테스트 보고서",
  outline: ["배경"],
  reportType: "issue_brief",
  sources: [{ sourceId: "S1", url: "https://x.test/a", author: "홍길동", publishedDate: "2025-03-01", title: "A" }],
  chunks: [{ sourceId: "S1", index: 0, text: "집행률은 72%다" }],
};

const draft: Draft = {
  topic: "테스트 보고서",
  reportType: "issue_brief",
  sections: [
    {
      title: "배경",
      claims: [
        {
          text: "집행이 더뎠다.",
          status: "verified",
          citations: [{ text: "집행률은 72%다", sourceId: "S1", url: "https://x.test/a", author: "홍길동", publishedDate: "2025-03-01" }],
        },
        { text: "추가 단정.", status: "needs_evidence", citations: [] },
      ],
    },
  ],
};

describe("docx", () => {
  it("\\n 을 별도 Paragraph 로 분리(RULES §2)", () => {
    const paras = paragraphsFromText("첫 줄\n둘째 줄\n\n셋째 줄");
    expect(paras).toHaveLength(3);
  });

  it("각주 표기 문자열은 저자/발행일/URL 포함", () => {
    const t = citationFootnoteText({ text: "x", sourceId: "S1", url: "https://x.test/a", author: "홍길동", publishedDate: "2025-03-01" });
    expect(t).toContain("홍길동");
    expect(t).toContain("2025-03-01");
    expect(t).toContain("https://x.test/a");
  });

  it("ImageRun 은 type 없으면 에러(RULES §2)", () => {
    // @ts-expect-error type 누락을 의도적으로 검증
    expect(() => makeImageRun({ data: Buffer.from(""), transformation: { width: 1, height: 1 } })).toThrow();
  });

  it("근거 없는 주장은 보고서에서 삭제(needs_evidence 제외)", () => {
    const secs = renderableSections(draft);
    expect(secs).toHaveLength(1);
    expect(secs[0].claims).toHaveLength(1); // verified 1개만, needs_evidence 삭제
    expect(secs[0].claims[0].text).toBe("집행이 더뎠다.");
  });

  it("주장이 전부 근거 없으면 섹션 통째로 생략", () => {
    const allEmpty: Draft = {
      topic: "t",
      reportType: "issue_brief",
      sections: [{ title: "배경", claims: [{ text: "근거 없음.", status: "needs_evidence", citations: [] }] }],
    };
    expect(renderableSections(allEmpty)).toHaveLength(0);
  });

  it("DOCX 버퍼를 생성한다(비자명한 크기)", async () => {
    const doc = assembleDocx(draft, corpus);
    const buf = await toBuffer(doc);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
