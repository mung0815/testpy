import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";

// 보고서 유형 정의 로더(plan-eng-review 결정 #3: 유형 = 데이터 파일로 외부화).
// 새 유형 추가 = report_types/<key>.yaml 파일 하나 추가(코드 수정 불필요).

export interface ReportSectionSpec {
  title: string;
  guidance?: string; // 이 섹션에 무엇을 담을지에 대한 생성 지침
}

export interface ReportType {
  key: string;
  title: string;
  systemPrompt: string; // 생성 시 Claude Code 에 줄 시스템 지침
  styleRulesRef: string; // 문체 규칙 위치(예: docs/RULES.md §3)
  sections: ReportSectionSpec[];
}

function repoRoot(): string {
  // src/ 또는 dist/ 기준 한 단계 위가 리포 루트.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..");
}

/** report_types/<key>.yaml 로드. */
export async function loadReportType(key: string, baseDir?: string): Promise<ReportType> {
  const dir = baseDir ?? join(repoRoot(), "report_types");
  const path = join(dir, `${key}.yaml`);
  const raw = await readFile(path, "utf8");
  const data = parse(raw) as Partial<ReportType>;
  if (!data || typeof data !== "object") throw new Error(`잘못된 report type 파일: ${path}`);
  if (!data.key || !data.title || !Array.isArray(data.sections)) {
    throw new Error(`report type 필수 필드 누락(key/title/sections): ${path}`);
  }
  return {
    key: data.key,
    title: data.title,
    systemPrompt: data.systemPrompt ?? "",
    styleRulesRef: data.styleRulesRef ?? "docs/RULES.md §3",
    sections: data.sections as ReportSectionSpec[],
  };
}
