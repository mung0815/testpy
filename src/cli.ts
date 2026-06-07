#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import type { Corpus, CorpusConfig, Draft } from "./models.js";
import { buildCorpus, defaultFetcher, type Fetcher } from "./corpus.js";
import { loadReportType } from "./reportTypes.js";
import { generatePrompt } from "./generate.js";
import { verifyDraft } from "./verify.js";
import { assembleDocx, toBuffer } from "./docx.js";

// policygen CLI
// 흐름: build-corpus → prompt(→ Claude Code 생성) → verify → assemble
//   build-corpus <config.json> -o <corpus.json> [--fetch]
//   prompt       <corpus.json> [-o <prompt.txt>]
//   verify       <draft.json> <corpus.json> -o <verified.json>
//   assemble     <draft.json> <corpus.json> -o <out.docx>
//   eval         <draft.json> <corpus.json>

function getOpt(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;

  switch (cmd) {
    case "build-corpus": {
      const configPath = rest[0];
      const out = getOpt(rest, "-o") ?? "corpus.json";
      if (!configPath) throw new Error("사용법: build-corpus <config.json> -o <corpus.json> [--fetch]");
      const config = await readJson<CorpusConfig>(configPath);
      // 네트워크 fetch 는 명시적으로 --fetch 를 줄 때만. 기본은 차단(우발적 네트워크 방지).
      const allowFetch = rest.includes("--fetch");
      const fetcher: Fetcher = allowFetch
        ? defaultFetcher
        : async (url) => {
            throw new Error(`URL 출처에 내용이 없습니다(${url}). --fetch 를 주거나, source.text 로 사전 fetch 한 내용을 공급하세요.`);
          };
      const corpus = await buildCorpus(config, { fetcher });
      await writeFile(out, JSON.stringify(corpus, null, 2), "utf8");
      console.log(`코퍼스 작성: ${out} (출처 ${corpus.sources.length}, 청크 ${corpus.chunks.length})`);
      return 0;
    }

    case "prompt": {
      const corpusPath = rest[0];
      const out = getOpt(rest, "-o");
      if (!corpusPath) throw new Error("사용법: prompt <corpus.json> [-o <prompt.txt>]");
      const corpus = await readJson<Corpus>(corpusPath);
      const reportType = await loadReportType(corpus.reportType);
      const text = generatePrompt(corpus, reportType, corpusPath);
      if (out) {
        await writeFile(out, text, "utf8");
        console.log(`생성 지침 작성: ${out}`);
      } else {
        console.log(text);
      }
      return 0;
    }

    case "verify": {
      const draftPath = rest[0];
      const corpusPath = rest[1];
      const out = getOpt(rest, "-o") ?? "verified.json";
      if (!draftPath || !corpusPath) throw new Error("사용법: verify <draft.json> <corpus.json> -o <verified.json>");
      const draft = await readJson<Draft>(draftPath);
      const corpus = await readJson<Corpus>(corpusPath);
      const { draft: verified, report } = verifyDraft(corpus, draft);
      await writeFile(out, JSON.stringify(verified, null, 2), "utf8");
      console.log(`검증 완료: ${out}`);
      console.log(
        `접지율 ${(report.groundingRate * 100).toFixed(1)}% ` +
          `(인용 ${report.verifiedCitations}/${report.totalCitations}), ` +
          `[근거 필요] 주장 ${report.needsEvidenceClaims}/${report.totalClaims}`,
      );
      return 0;
    }

    case "assemble": {
      const draftPath = rest[0];
      const corpusPath = rest[1];
      const out = getOpt(rest, "-o") ?? "report.docx";
      if (!draftPath || !corpusPath) throw new Error("사용법: assemble <draft.json> <corpus.json> -o <out.docx>");
      const draft = await readJson<Draft>(draftPath);
      const corpus = await readJson<Corpus>(corpusPath);
      const doc = assembleDocx(draft, corpus);
      const buf = await toBuffer(doc);
      await writeFile(out, buf);
      console.log(`DOCX 작성: ${out} (${buf.length} bytes)`);
      return 0;
    }

    case "eval": {
      const draftPath = rest[0];
      const corpusPath = rest[1];
      if (!draftPath || !corpusPath) throw new Error("사용법: eval <draft.json> <corpus.json>");
      const draft = await readJson<Draft>(draftPath);
      const corpus = await readJson<Corpus>(corpusPath);
      const { report } = verifyDraft(corpus, draft);
      console.log(JSON.stringify(report, null, 2));
      // 접지율 1.0 미만이면 비정상 종료(회귀 게이트로 사용 가능)
      return report.groundingRate >= 1 ? 0 : 1;
    }

    default:
      console.log(
        [
          "policygen — 출처 검증 정책보고서 생성기",
          "사용법:",
          "  policygen build-corpus <config.json> -o <corpus.json> [--fetch]",
          "  policygen prompt <corpus.json> [-o <prompt.txt>]",
          "  policygen verify <draft.json> <corpus.json> -o <verified.json>",
          "  policygen assemble <draft.json> <corpus.json> -o <out.docx>",
          "  policygen eval <draft.json> <corpus.json>",
        ].join("\n"),
      );
      return cmd ? 1 : 0;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`오류: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
