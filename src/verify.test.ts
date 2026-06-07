import { describe, it, expect } from "vitest";
import { verifyCitation, verifyClaim, verifyDraft } from "./verify.js";
import type { Corpus, Draft } from "./models.js";

const corpus: Corpus = {
  topic: "테스트",
  outline: ["배경"],
  reportType: "issue_brief",
  sources: [
    { sourceId: "S1", url: "https://example.org/a", author: "홍길동", publishedDate: "2025-03-01", title: "보고서 A" },
  ],
  chunks: [
    { sourceId: "S1", index: 0, text: "2025년 정책 집행률은 72%에 머물렀다.\n다음 분기 전망은 불투명하다." },
  ],
};

const fullCitation = {
  text: "정책 집행률은 72%에 머물렀다",
  sourceId: "S1",
  url: "https://example.org/a",
  author: "홍길동",
  publishedDate: "2025-03-01",
};

describe("verifyCitation", () => {
  it("정확 일치 + 메타데이터 완비 → 통과", () => {
    expect(verifyCitation(fullCitation, corpus).ok).toBe(true);
  });

  it("공백/개행만 다른 스니펫 → 정규화 후 통과", () => {
    const c = { ...fullCitation, text: "정책   집행률은\n72%에  머물렀다" };
    expect(verifyCitation(c, corpus).ok).toBe(true);
  });

  it("원문에 없는(재서술) 스니펫 → 실패", () => {
    const c = { ...fullCitation, text: "집행률이 약 70퍼센트 수준이었다" };
    const r = verifyCitation(c, corpus);
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain("원문에 없음");
  });

  it("메타데이터 누락(url/author/date) → 실패", () => {
    expect(verifyCitation({ ...fullCitation, url: "" }, corpus).ok).toBe(false);
    expect(verifyCitation({ ...fullCitation, author: "" }, corpus).ok).toBe(false);
    expect(verifyCitation({ ...fullCitation, publishedDate: "" }, corpus).ok).toBe(false);
  });

  it("발행연도 거짓표기(출처와 불일치) → 실패", () => {
    const c = { ...fullCitation, publishedDate: "2099-01-01" };
    const r = verifyCitation(c, corpus);
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain("발행일 불일치");
  });

  it("URL 출처 불일치 → 실패", () => {
    const c = { ...fullCitation, url: "https://evil.example/x" };
    expect(verifyCitation(c, corpus).ok).toBe(false);
  });

  it("알 수 없는 sourceId → 실패", () => {
    const c = { ...fullCitation, sourceId: "S9" };
    expect(verifyCitation(c, corpus).ok).toBe(false);
  });

  it("빈 스니펫 → 실패", () => {
    expect(verifyCitation({ ...fullCitation, text: "" }, corpus).ok).toBe(false);
  });
});

describe("verifyClaim / verifyDraft", () => {
  it("통과 인용만 남기고, 0개면 needs_evidence 강등", () => {
    const claim = {
      text: "집행률이 낮았다.",
      citations: [fullCitation, { ...fullCitation, text: "존재하지 않는 문장" }],
    };
    const out = verifyClaim(claim, corpus);
    expect(out.status).toBe("verified");
    expect(out.citations).toHaveLength(1);

    const empty = verifyClaim({ text: "근거 없음.", citations: [{ ...fullCitation, text: "없는 문장" }] }, corpus);
    expect(empty.status).toBe("needs_evidence");
    expect(empty.citations).toHaveLength(0);
  });

  it("드래프트 접지율 리포트", () => {
    const draft: Draft = {
      topic: "테스트",
      reportType: "issue_brief",
      sections: [
        {
          title: "배경",
          claims: [
            { text: "A", citations: [fullCitation] },
            { text: "B", citations: [{ ...fullCitation, text: "없는 문장" }] },
          ],
        },
      ],
    };
    const { draft: v, report } = verifyDraft(corpus, draft);
    expect(report.totalCitations).toBe(2);
    expect(report.verifiedCitations).toBe(1);
    expect(report.groundingRate).toBe(0.5);
    expect(report.needsEvidenceClaims).toBe(1);
    expect(v.sections[0].claims[1].status).toBe("needs_evidence");
  });
});
