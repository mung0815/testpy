// 핵심 데이터 모델.
//
// 파이프라인:
//   CorpusConfig ──build──▶ Corpus ──(Claude Code 생성)──▶ Draft ──verify──▶ Draft' ──assemble──▶ .docx
//
// 할루시네이션 방지(RULES.md §1): 인용은 verbatim 스니펫 + url/author/publishedDate 필수.

/** 한 출처의 메타데이터. */
export interface SourceMeta {
  sourceId: string; // 안정적 식별자, 예: "S1"
  title?: string;
  url?: string; // 온라인 출처 URL (인용 검증에 필요)
  filePath?: string; // 로컬 문서 경로(파일 출처일 때)
  author?: string;
  publishedDate?: string; // 원문에서 가져온 값만. 추정/생성 금지.
}

/** 코퍼스의 한 청크(검색·검증 단위). */
export interface Chunk {
  sourceId: string;
  index: number; // 출처 내 청크 인덱스
  text: string; // 원문 그대로(검증 시점에 정규화하여 비교)
}

/** 빌드된 코퍼스. */
export interface Corpus {
  topic: string;
  outline: string[];
  reportType: string;
  sources: SourceMeta[];
  chunks: Chunk[];
}

/** 코퍼스 빌드 입력의 한 출처. text/filePath/url 중 하나로 내용을 공급한다. */
export interface SourceInput {
  sourceId?: string; // 없으면 S1.. 자동 부여
  title?: string;
  author?: string;
  publishedDate?: string;
  filePath?: string; // 로컬 문서
  url?: string; // 온라인 출처
  text?: string; // 사전 fetch 된 내용(예: Claude Code 가 URL 을 fetch 해 채워줌)
}

/** 코퍼스 빌드 설정(입력). */
export interface CorpusConfig {
  topic: string;
  outline: string[]; // 목차(섹션 제목 리스트)
  reportType: string; // report_types/<key>.yaml 의 key
  sources: SourceInput[];
}

/** 한 주장에 붙는 인용. 모델(Claude Code)이 생성한다. */
export interface Citation {
  text: string; // 출처에서 그대로 따온 verbatim 스니펫(재서술 금지)
  sourceId: string;
  url?: string;
  author?: string;
  publishedDate?: string;
}

export type ClaimStatus = "verified" | "needs_evidence";

/** 보고서 본문의 한 주장(문장). 문체는 RULES.md §3(산문). */
export interface Claim {
  text: string;
  citations: Citation[];
  status?: ClaimStatus; // verify 가 설정
  conflicting?: boolean; // 상충 근거 표시
}

export interface Section {
  title: string;
  claims: Claim[];
}

/** 생성 결과(검증 전/후 공용). */
export interface Draft {
  topic: string;
  reportType: string;
  sections: Section[];
}

/** 인용 검증 사유. */
export interface CitationCheck {
  ok: boolean;
  reasons: string[]; // 실패 사유(빈 배열이면 통과)
}

/** 드래프트 검증 요약. */
export interface VerifyReport {
  totalCitations: number;
  verifiedCitations: number;
  groundingRate: number; // verified / total (총 인용 0 이면 1)
  totalClaims: number;
  needsEvidenceClaims: number;
}
