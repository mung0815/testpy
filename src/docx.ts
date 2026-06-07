import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  FootnoteReferenceRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  ImageRun,
  type IImageOptions,
} from "docx";
import type { Citation, Corpus, Draft, SourceMeta } from "./models.js";
import { STYLE } from "./style.js";

// DOCX 조립(RULES.md §2).
// - A4/여백/신명조 11pt/줄간격180/들여쓰기2/자간0 은 STYLE(=RULES §2)에서 가져온다.
// - \n 금지 → 텍스트의 개행은 별도 Paragraph 로 분리.
// - 각주: FootnoteReferenceRun + Document.footnotes, 페이지별 참고문헌.
// - 표: WidthType.DXA, ShadingType.CLEAR. 이미지: ImageRun 에 type 필수.

function bodyRun(text: string, extra: { bold?: boolean } = {}): TextRun {
  return new TextRun({
    text,
    font: STYLE.font.name,
    size: STYLE.font.sizeHalfPt,
    characterSpacing: STYLE.paragraph.characterSpacing,
    bold: extra.bold,
  });
}

/** 텍스트의 \n 을 별도 Paragraph 로 분리한다(RULES §2: \n 금지). */
export function paragraphsFromText(text: string, opts: { bold?: boolean; firstLineIndent?: boolean } = {}): Paragraph[] {
  const lines = text.split("\n");
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        new Paragraph({
          children: [bodyRun(line, { bold: opts.bold })],
          spacing: { line: STYLE.paragraph.line },
          indent: opts.firstLineIndent ? { firstLine: STYLE.paragraph.firstLineIndent } : undefined,
        }),
    );
}

/** 각주에 들어갈 출처 표기 문자열. */
export function citationFootnoteText(c: Citation): string {
  const parts: string[] = [];
  if (c.author) parts.push(c.author);
  if (c.publishedDate) parts.push(`(${c.publishedDate})`);
  if (c.url) parts.push(c.url);
  return parts.join(", ");
}

/** 참고문헌 한 줄. */
function referenceText(s: SourceMeta): string {
  const parts: string[] = [];
  if (s.author) parts.push(s.author);
  if (s.publishedDate) parts.push(`(${s.publishedDate})`);
  if (s.title) parts.push(`「${s.title}」`);
  if (s.url) parts.push(s.url);
  else if (s.filePath) parts.push(s.filePath);
  return `[${s.sourceId}] ${parts.join(", ")}`;
}

/** WidthType.DXA + ShadingType.CLEAR 를 쓰는 표 헬퍼(RULES §2). */
export function makeTable(rows: string[][], opts: { headerShade?: string } = {}): Table {
  return new Table({
    width: { size: STYLE.page.width - STYLE.margin.left - STYLE.margin.right, type: WidthType.DXA },
    rows: rows.map(
      (cells, r) =>
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                shading:
                  r === 0 && opts.headerShade
                    ? { type: ShadingType.CLEAR, color: "auto", fill: opts.headerShade }
                    : { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
                children: paragraphsFromText(cell),
              }),
          ),
        }),
    ),
  });
}

/** ImageRun 헬퍼 — type 파라미터 필수(RULES §2). */
export function makeImageRun(opts: IImageOptions): ImageRun {
  if (!("type" in opts) || !opts.type) {
    throw new Error("ImageRun 에는 type 파라미터가 필수입니다(RULES §2).");
  }
  return new ImageRun(opts);
}

/** 검증된 드래프트 + 코퍼스 → docx Document. */
export function assembleDocx(draft: Draft, corpus: Corpus): Document {
  const footnotes: Record<number, { children: Paragraph[] }> = {};
  let footnoteId = 0;
  const usedSourceIds = new Set<string>();

  const children: (Paragraph | Table)[] = [];

  // 제목
  children.push(
    new Paragraph({
      children: [bodyRun(draft.topic, { bold: true })],
      spacing: { line: STYLE.paragraph.line },
    }),
  );

  for (const section of draft.sections) {
    // 섹션 제목
    children.push(...paragraphsFromText(section.title, { bold: true }));

    for (const claim of section.claims) {
      const paras = paragraphsFromText(claim.text, { firstLineIndent: true });
      const last = paras[paras.length - 1];

      if (claim.status === "needs_evidence" || claim.citations.length === 0) {
        // 무근거 주장: [근거 필요] 표식
        if (last) last.addChildElement(bodyRun(" [근거 필요]"));
      } else {
        // 각 인용을 각주로
        for (const c of claim.citations) {
          footnoteId++;
          footnotes[footnoteId] = {
            children: [new Paragraph({ children: [bodyRun(citationFootnoteText(c))] })],
          };
          if (last) last.addChildElement(new FootnoteReferenceRun(footnoteId));
          usedSourceIds.add(c.sourceId);
        }
      }
      children.push(...paras);
    }
  }

  // 참고문헌
  children.push(...paragraphsFromText("참고문헌", { bold: true }));
  for (const s of corpus.sources) {
    if (usedSourceIds.has(s.sourceId)) {
      children.push(...paragraphsFromText(referenceText(s)));
    }
  }

  return new Document({
    styles: {
      default: {
        document: { run: { font: STYLE.font.name, size: STYLE.font.sizeHalfPt } },
      },
    },
    footnotes,
    sections: [
      {
        properties: {
          page: {
            size: { width: STYLE.page.width, height: STYLE.page.height },
            margin: STYLE.margin,
          },
        },
        children,
      },
    ],
  });
}

/** Document → DOCX 버퍼. */
export async function toBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
