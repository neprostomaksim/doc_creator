import JSZip from 'jszip';
import { createReport } from 'docx-templates';
import { getMarkableUnits, type Block, type TemplateField } from './template-types';
import {
  findParagraphs,
  extractParagraphText,
  parseInnerToParts,
  replaceAcrossParts,
  rebuildInner,
  normalizeWhitespace,
} from './docx-xml';

export type FieldResolution =
  | { kind: 'text'; value: string }
  | { kind: 'image'; image: { width: number; height: number; data: string; extension: '.png' } }
  | { kind: 'skip' };

function stripLeadingNumber(text: string): string {
  return text.replace(/^\d+(?:\.\d+)*\.?\s+/, '');
}

function isImageSource(field: TemplateField): boolean {
  return field.source.type === 'signature' || field.source.type === 'stamp';
}

/**
 * Встраивает значения полей и разместки подписи/печати прямо в исходный .docx,
 * находя нужные абзацы по совпадению текста блока (см. CLAUDE.md 2.1/2.2).
 * Не находит абзац — пропускает поле и сообщает об этом в unmatchedFieldNames,
 * а не портит документ.
 */
export async function renderContractDocx({
  templateBuffer,
  blocks,
  fields,
  resolve,
}: {
  templateBuffer: Buffer;
  blocks: Block[];
  fields: TemplateField[];
  resolve: (field: TemplateField) => FieldResolution;
}): Promise<{ buffer: Buffer; unfilledFieldNames: string[]; unmatchedFieldNames: string[] }> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('В файле нет word/document.xml — это не обычный .docx');
  }
  const xml = await docFile.async('string');

  const paragraphs = findParagraphs(xml);
  const usedParagraphIndexes = new Set<number>();
  const unfilledFieldNames: string[] = [];
  const unmatchedFieldNames: string[] = [];
  const imageData: Record<string, { width: number; height: number; data: string; extension: '.png' }> = {};

  const fieldsByBlock = new Map<string, TemplateField[]>();
  for (const field of fields) {
    const list = fieldsByBlock.get(field.block_id) ?? [];
    list.push(field);
    fieldsByBlock.set(field.block_id, list);
  }

  const edits: { start: number; end: number; replacement: string }[] = [];

  for (const unit of getMarkableUnits(blocks)) {
    const blockFields = fieldsByBlock.get(unit.id);
    if (!blockFields || blockFields.length === 0) continue;

    let reconstructed = unit.text;
    for (const field of blockFields) {
      reconstructed = isImageSource(field)
        ? reconstructed.replace(` ${field.placeholder}`, '').replace(field.placeholder, '')
        : reconstructed.replace(field.placeholder, field.original_text);
    }
    const targetNormalized = stripLeadingNumber(normalizeWhitespace(reconstructed));
    if (!targetNormalized) continue;

    const paragraphIndex = paragraphs.findIndex(
      (p, i) =>
        !usedParagraphIndexes.has(i) &&
        stripLeadingNumber(normalizeWhitespace(extractParagraphText(p.innerXml))) === targetNormalized,
    );

    if (paragraphIndex === -1) {
      unmatchedFieldNames.push(...blockFields.map((f) => f.name));
      continue;
    }
    usedParagraphIndexes.add(paragraphIndex);
    const paragraph = paragraphs[paragraphIndex];

    // Заменяем текст полей прямо в прогонах абзаца, сохраняя форматирование.
    const parts = parseInnerToParts(paragraph.innerXml);

    for (const field of blockFields) {
      if (isImageSource(field)) {
        const resolution = resolve(field);
        if (resolution.kind === 'image') {
          imageData[field.source.type] = resolution.image;
          parts.push({
            type: 'xml',
            s: `<w:r><w:t xml:space="preserve"> {{IMAGE ${field.source.type}}}</w:t></w:r>`,
          });
        }
        continue;
      }

      const resolution = resolve(field);
      const value = resolution.kind === 'text' ? resolution.value : '';
      if (!value) unfilledFieldNames.push(field.name);
      replaceAcrossParts(parts, field.original_text, value);
    }

    edits.push({
      start: paragraph.start,
      end: paragraph.end,
      replacement: `${paragraph.openTag}${rebuildInner(parts)}${paragraph.closeTag}`,
    });
  }

  edits.sort((a, b) => a.start - b.start);
  let rewritten = '';
  let cursor = 0;
  for (const edit of edits) {
    rewritten += xml.slice(cursor, edit.start) + edit.replacement;
    cursor = edit.end;
  }
  rewritten += xml.slice(cursor);

  zip.file('word/document.xml', rewritten);
  const intermediateBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  const hasImages = Object.keys(imageData).length > 0;
  const finalBuffer = hasImages
    ? Buffer.from(
        await createReport({
          template: intermediateBuffer,
          data: imageData,
          cmdDelimiter: ['{{', '}}'],
        }),
      )
    : intermediateBuffer;

  return { buffer: finalBuffer, unfilledFieldNames, unmatchedFieldNames };
}
