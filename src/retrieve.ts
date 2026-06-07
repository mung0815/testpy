import type { Chunk, Corpus } from "./models.js";

// 근거 공급 전략(plan-eng-review 결정 #2): 전체 코퍼스 우선, 예산 초과 시에만 키워드 폴백.
//
//   [코퍼스 ≤ 예산?] ──yes──▶ 전체 청크
//                      └─no──▶ 섹션 키워드로 상위 N 청크

/** 대략적 토큰 추정(문자/4). 정밀 토큰화 대신 예산 게이트 용도. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function corpusTokens(corpus: Corpus): number {
  return corpus.chunks.reduce((sum, c) => sum + estimateTokens(c.text), 0);
}

/** 코퍼스 전체가 토큰 예산 안에 드는가. */
export function withinBudget(corpus: Corpus, budgetTokens: number): boolean {
  return corpusTokens(corpus) <= budgetTokens;
}

function keywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/i)
    .filter((w) => w.length >= 2);
}

/** 섹션 제목 키워드와의 단순 중복 점수로 상위 limit 청크 선택(폴백 경로). */
export function keywordFilter(corpus: Corpus, query: string, limit: number): Chunk[] {
  const kws = keywords(query);
  if (kws.length === 0) return corpus.chunks.slice(0, limit);
  const scored = corpus.chunks.map((c) => {
    const hay = c.text.toLowerCase();
    const score = kws.reduce((s, kw) => (hay.includes(kw) ? s + 1 : s), 0);
    return { chunk: c, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export interface SelectOptions {
  budgetTokens?: number; // 기본 120k
  perSectionLimit?: number; // 폴백 시 섹션당 청크 수(기본 8)
}

/**
 * 섹션에 넘길 청크를 고른다.
 * - 코퍼스가 예산 안이면 전체.
 * - 초과면 섹션 제목 키워드로 폴백.
 */
export function selectForSection(corpus: Corpus, sectionTitle: string, opts: SelectOptions = {}): Chunk[] {
  const budget = opts.budgetTokens ?? 120_000;
  if (withinBudget(corpus, budget)) return corpus.chunks;
  return keywordFilter(corpus, sectionTitle, opts.perSectionLimit ?? 8);
}
