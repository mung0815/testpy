import { describe, it, expect } from "vitest";
import { buildCorpus, chunkText, type Fetcher } from "./corpus.js";
import type { CorpusConfig } from "./models.js";

describe("chunkText", () => {
  it("문단 경계로 청킹하고 인덱스를 매긴다", () => {
    const text = "문단 하나.\n\n문단 둘.\n\n문단 셋.";
    const chunks = chunkText(text, "S1", { maxChars: 12 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].sourceId).toBe("S1");
    expect(chunks[0].index).toBe(0);
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it("상한을 넘는 단일 문단은 하드 분할", () => {
    const long = "가".repeat(50);
    const chunks = chunkText(long, "S1", { maxChars: 20 });
    expect(chunks.length).toBe(3);
  });

  it("빈 입력은 빈 배열", () => {
    expect(chunkText("   ", "S1")).toEqual([]);
  });
});

describe("buildCorpus", () => {
  const stubFetcher: Fetcher = async () => "fetched 내용입니다. 충분히 길다.";

  it("text 출처로 코퍼스 빌드 + 메타데이터 보존", async () => {
    const config: CorpusConfig = {
      topic: "주제",
      outline: ["배경"],
      reportType: "issue_brief",
      sources: [
        { text: "본문 내용. 두 번째 문장.", url: "https://x.test/a", author: "저자", publishedDate: "2025-01-01", title: "T" },
      ],
    };
    const corpus = await buildCorpus(config, { fetcher: stubFetcher });
    expect(corpus.sources[0].sourceId).toBe("S1");
    expect(corpus.sources[0].url).toBe("https://x.test/a");
    expect(corpus.sources[0].publishedDate).toBe("2025-01-01");
    expect(corpus.chunks.length).toBeGreaterThan(0);
  });

  it("url 출처는 fetcher 로 내용 확보", async () => {
    const config: CorpusConfig = {
      topic: "주제",
      outline: ["배경"],
      reportType: "issue_brief",
      sources: [{ url: "https://x.test/b", author: "저자", publishedDate: "2025-02-02" }],
    };
    const corpus = await buildCorpus(config, { fetcher: stubFetcher });
    expect(corpus.chunks[0].text).toContain("fetched");
  });

  it("출처 0개 → 에러", async () => {
    await expect(
      buildCorpus({ topic: "t", outline: [], reportType: "issue_brief", sources: [] }, { fetcher: stubFetcher }),
    ).rejects.toThrow();
  });

  it("내용 공급 불가(text/filePath/url 없음) → 에러(RULES §1)", async () => {
    await expect(
      buildCorpus(
        { topic: "t", outline: [], reportType: "issue_brief", sources: [{ author: "x" }] },
        { fetcher: stubFetcher },
      ),
    ).rejects.toThrow();
  });
});
