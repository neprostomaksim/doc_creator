import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
} from 'docx';
import type { Block } from './template-types';

// Настройки оформления по умолчанию (CLAUDE.md, шаг 5):
// Times New Roman 12, полуторный интервал, поля 2 см, отступ первой строки 1.25 см.
const FONT = 'Times New Roman';
const FONT_SIZE = 24; // half-points → 12pt
const LINE_SPACING = 360; // 240 = одинарный, 360 = полуторный
const MARGIN = 1134; // 2 см в твипах (1 см ≈ 567 твип)
const FIRST_LINE_INDENT = 709; // 1.25 см в твипах

function run(text: string, opts: { bold?: boolean } = {}) {
  return new TextRun({ text, font: FONT, size: FONT_SIZE, bold: opts.bold });
}

function paragraph(text: string, opts: { bold?: boolean; center?: boolean; indent?: boolean } = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { line: LINE_SPACING },
    indent: opts.indent ? { firstLine: FIRST_LINE_INDENT } : undefined,
    children: [run(text, { bold: opts.bold })],
  });
}

function blockToElements(block: Block): (Paragraph | Table)[] {
  switch (block.type) {
    case 'title':
      return [paragraph(block.text, { bold: true, center: true })];
    case 'heading':
      return [paragraph(`${block.number}. ${block.text}`.trim(), { bold: true })];
    case 'clause':
      return [paragraph(`${block.number} ${block.text}`.trim(), { indent: true })];
    case 'paragraph':
      return [paragraph(block.text, { indent: true })];
    case 'list':
      return block.items.map(
        (item) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { line: LINE_SPACING },
            children: [run(item.text)],
          }),
      );
    case 'table':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          spacing: { line: LINE_SPACING },
                          children: [run(cell.text)],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      ];
    default:
      return [];
  }
}

/** Собирает .docx из блоков программно, с оформлением по умолчанию. */
export async function buildDocxFromBlocks(blocks: Block[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    children.push(...blockToElements(block));
    // Пустой абзац-разделитель между таблицей и следующим блоком для читаемости.
    if (block.type === 'table') children.push(new Paragraph({ children: [] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
