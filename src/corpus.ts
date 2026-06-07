import { readFile } from "node:fs/promises";
import type { Chunk, Corpus, CorpusConfig, SourceInput, SourceMeta } from "./models.js";

// 코퍼스 빌드
// ───────────
// 출처 → 내용 확보(text | filePath | url) → 청킹 → 메타데이터 부착
//
//   SourceInput ──resolveContent──▶ 원문 ──chunkText──▶ Chunk[]
//
// RULES.md §1: 출처 불명 정보 수집 금지 → 내용을 확보할 수 없는 출처는 에러로 중단.

export interface Fetcher {
  (url: string): Promise<string>;
}

/** 기본 fetcher: Node 전역 fetch 로 본문 텍스트를 가져온다(HTML 태그는 단순 제거). */
export const defaultFetcher: Fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`URL fetch 실패(${res.status}): ${url}`);
  const body = await res.text();
  // 매우 단순한 태그 제거. 정교한 추출이 필요하면 Claude Code 가 fetch 한 text 를 직접 공급.
  return body.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
};

export interface ChunkOptions {
  maxChars?: number; // 청크 최대 길이(기본 1500)
}

/**
 * 문단 경계를 존중하며 maxChars 이하로 청킹. 원문 텍스트는 그대로 보존한다.
 * 빈 입력은 빈 배열을 반환(호출부에서 에러 처리).
 */
export function chunkText(text: string, sourceId: string, opts: ChunkOptions = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 1500;
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: Chunk[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim().length > 0) {
      chunks.push({ sourceId, index: chunks.length, text: buf.trim() });
      buf = "";
    }
  };
  for (const para of paragraphs) {
    const p = para.trim();
    if (p.length === 0) continue;
    if (p.length > maxChars) {
      // 단일 문단이 상한을 넘으면 하드 분할.
      flush();
      for (let i = 0; i < p.length; i += maxChars) {
        chunks.push({ sourceId, index: chunks.length, text: p.slice(i, i + maxChars) });
      }
      continue;
    }
    if (buf.length + p.length + 2 > maxChars) flush();
    buf = buf.length === 0 ? p : `${buf}\n\n${p}`;
  }
  flush();
  return chunks;
}

async function resolveContent(src: SourceInput, fetcher: Fetcher): Promise<string> {
  if (typeof src.text === "string" && src.text.trim().length > 0) return src.text;
  if (src.filePath) {
    const content = await readFile(src.filePath, "utf8");
    if (content.trim().length === 0) throw new Error(`빈 문서: ${src.filePath}`);
    return content;
  }
  if (src.url) {
    const content = await fetcher(src.url);
    if (content.trim().length === 0) throw new Error(`빈 URL 내용: ${src.url}`);
    return content;
  }
  throw new Error("출처 불명: text/filePath/url 중 하나로 내용을 공급해야 합니다(RULES §1).");
}

export interface BuildCorpusDeps {
  fetcher?: Fetcher;
  chunk?: ChunkOptions;
}

/** CorpusConfig → Corpus. 각 출처의 내용을 확보하고 청킹한다. */
export async function buildCorpus(config: CorpusConfig, deps: BuildCorpusDeps = {}): Promise<Corpus> {
  if (!config.sources || config.sources.length === 0) {
    throw new Error("출처가 없습니다. 최소 1개의 출처가 필요합니다.");
  }
  const fetcher = deps.fetcher ?? defaultFetcher;
  const sources: SourceMeta[] = [];
  const chunks: Chunk[] = [];

  for (let i = 0; i < config.sources.length; i++) {
    const src = config.sources[i];
    const sourceId = src.sourceId ?? `S${i + 1}`;
    const content = await resolveContent(src, fetcher);
    const meta: SourceMeta = {
      sourceId,
      title: src.title,
      url: src.url,
      filePath: src.filePath,
      author: src.author,
      publishedDate: src.publishedDate,
    };
    sources.push(meta);
    const srcChunks = chunkText(content, sourceId, deps.chunk);
    if (srcChunks.length === 0) throw new Error(`청크 0개(빈 내용): ${sourceId}`);
    chunks.push(...srcChunks);
  }

  return {
    topic: config.topic,
    outline: config.outline,
    reportType: config.reportType,
    sources,
    chunks,
  };
}
