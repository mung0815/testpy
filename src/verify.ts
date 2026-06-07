import type { Citation, Claim, Corpus, Draft, CitationCheck, VerifyReport } from "./models.js";
import { normalize } from "./normalize.js";

// 인용 검증 — 이 도구의 핵심 가치(RULES.md §1).
// ───────────────────────────────────────────
//   인용 ──▶ [메타데이터 url·author·publishedDate 존재?] ──no──▶ 실패
//          └▶ [스니펫 ⊂ 원문 청크(정규화)?]            ──no──▶ 실패
//          └▶ [publishedDate == 출처 메타 발행일?]      ──no──▶ 실패(연도 거짓표기 금지)
//          └▶ [url == 출처 메타 url?]                    ──no──▶ 실패
//   실패한 인용은 제거, 남은 인용이 0 이면 주장을 [근거 필요]로 강등.

/** 한 인용을 코퍼스에 대조 검증한다. */
export function verifyCitation(citation: Citation, corpus: Corpus): CitationCheck {
  const reasons: string[] = [];

  // 1) 메타데이터 필수(RULES §1)
  if (!citation.url || citation.url.trim() === "") reasons.push("url 누락");
  if (!citation.author || citation.author.trim() === "") reasons.push("author 누락");
  if (!citation.publishedDate || citation.publishedDate.trim() === "") reasons.push("publishedDate 누락");

  // 2) 스니펫 verbatim 존재
  const snippet = normalize(citation.text ?? "");
  if (snippet.length === 0) {
    reasons.push("빈 스니펫");
  } else {
    const srcChunks = corpus.chunks.filter((c) => c.sourceId === citation.sourceId);
    if (srcChunks.length === 0) {
      reasons.push(`알 수 없는 sourceId: ${citation.sourceId}`);
    } else {
      const found = srcChunks.some((c) => normalize(c.text).includes(snippet));
      if (!found) reasons.push("스니펫이 원문에 없음(재서술 의심)");
    }
  }

  // 3) 출처 메타와 교차검증(연도 거짓표기·URL 불일치 차단)
  const meta = corpus.sources.find((s) => s.sourceId === citation.sourceId);
  if (meta) {
    if (meta.publishedDate && citation.publishedDate && meta.publishedDate !== citation.publishedDate) {
      reasons.push(`발행일 불일치(출처 ${meta.publishedDate} ≠ 인용 ${citation.publishedDate})`);
    }
    if (meta.url && citation.url && meta.url !== citation.url) {
      reasons.push(`URL 불일치(출처와 다름)`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/** 한 주장의 인용을 검증해 통과분만 남기고 상태를 매긴다. */
export function verifyClaim(claim: Claim, corpus: Corpus): Claim {
  const verified = claim.citations.filter((c) => verifyCitation(c, corpus).ok);
  return {
    ...claim,
    citations: verified,
    status: verified.length > 0 ? "verified" : "needs_evidence",
  };
}

/** 드래프트 전체를 검증한다(통과 인용만 보존, 무근거 주장은 강등). */
export function verifyDraft(corpus: Corpus, draft: Draft): { draft: Draft; report: VerifyReport } {
  let total = 0;
  let verified = 0;
  let claims = 0;
  let needsEvidence = 0;

  const sections = draft.sections.map((section) => ({
    ...section,
    claims: section.claims.map((claim) => {
      claims++;
      total += claim.citations.length;
      const out = verifyClaim(claim, corpus);
      verified += out.citations.length;
      if (out.status === "needs_evidence") needsEvidence++;
      return out;
    }),
  }));

  const report: VerifyReport = {
    totalCitations: total,
    verifiedCitations: verified,
    groundingRate: total === 0 ? 1 : verified / total,
    totalClaims: claims,
    needsEvidenceClaims: needsEvidence,
  };

  return { draft: { ...draft, sections }, report };
}
