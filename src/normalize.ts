// 인용 검증용 텍스트 정규화.
// 공백/개행 차이만 흡수한다(스니펫이 원문과 줄바꿈·공백만 다른 경우 통과시키기 위함).
// 의미를 바꾸는 정규화는 하지 않는다 — verbatim 일치를 보장해야 하므로.
export function normalize(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}
