import { describe, it, expect } from "vitest";
import { normalize } from "./normalize.js";

describe("normalize", () => {
  it("공백/개행을 단일 공백으로, 양끝 trim", () => {
    expect(normalize("  가  나\n다\t라  ")).toBe("가 나 다 라");
  });
  it("NFC 정규화", () => {
    // 자모 결합형(NFD) → 완성형(NFC)
    const nfd = "가"; // ㄱ + ㅏ
    expect(normalize(nfd)).toBe("가");
  });
});
