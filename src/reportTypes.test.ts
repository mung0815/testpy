import { describe, it, expect } from "vitest";
import { loadReportType } from "./reportTypes.js";

describe("loadReportType", () => {
  it("issue_brief.yaml 로드", async () => {
    const rt = await loadReportType("issue_brief");
    expect(rt.key).toBe("issue_brief");
    expect(rt.title).toBe("이슈 브리프");
    expect(rt.sections.length).toBeGreaterThan(0);
    expect(rt.sections[0].title).toBeTruthy();
  });

  it("없는 유형 → 에러", async () => {
    await expect(loadReportType("does_not_exist")).rejects.toThrow();
  });
});
