import { describe, it, expect } from "vitest";
import { withinBudget, keywordFilter, selectForSection } from "./retrieve.js";
import type { Corpus } from "./models.js";

const corpus: Corpus = {
  topic: "t",
  outline: ["예산 집행", "고용 동향"],
  reportType: "issue_brief",
  sources: [{ sourceId: "S1" }],
  chunks: [
    { sourceId: "S1", index: 0, text: "예산 집행률이 낮다" },
    { sourceId: "S1", index: 1, text: "고용 동향은 개선되었다" },
    { sourceId: "S1", index: 2, text: "무관한 잡담" },
  ],
};

describe("retrieve", () => {
  it("예산 안이면 전체 청크", () => {
    expect(withinBudget(corpus, 1_000_000)).toBe(true);
    expect(selectForSection(corpus, "예산 집행", { budgetTokens: 1_000_000 })).toHaveLength(3);
  });

  it("예산 초과면 키워드 폴백", () => {
    const picked = selectForSection(corpus, "예산 집행", { budgetTokens: 1, perSectionLimit: 5 });
    expect(picked.some((c) => c.text.includes("예산"))).toBe(true);
    expect(picked.some((c) => c.text.includes("잡담"))).toBe(false);
  });

  it("키워드 점수 정렬", () => {
    const r = keywordFilter(corpus, "고용 동향", 5);
    expect(r[0].text).toContain("고용");
  });
});
