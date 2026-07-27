import JSZip from 'jszip';
import { createReport } from 'docx-templates';
import { getMarkableUnits, type Block, type TemplateField } from './template-types';

export type FieldResolution =
  | { kind: 'text'; value: string }
  | { kind: 'image'; image: { width: number; height: number; data: string; extension: '.png' } }
  | { kind: 'skip' };

function xmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"' };

function xmlUnescape(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|#\d+);/g, (whole, code: string) => {
    if (code === '#39') return "'";
    if (code.startsWith('#')) return String.fromCharCode(Number(code.slice(1)));
    return XML_ENTITIES[code] ?? whole;
  });
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripLeadingNumber(text: string): string {
  return text.replace(/^\d+(?:\.\d+)*\.?\s+/, '');
}

type ParagraphMatch = { start: number; end: number; openTag: string; innerXml: string; closeTag: string };

function findParagraphs(xml: string): ParagraphMatch[] {
  const results: ParagraphMatch[] = [];
  const re = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const full = m[0];
    const openTagMatch = full.match(/^<w:p(?:\s[^>]*)?>/);
    const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
    const closeTag = '</w:p>';
    results.push({
      start: m.index,
      end: m.index + full.length,
      openTag,
      innerXml: full.slice(openTag.length, full.length - closeTag.length),
      closeTag,
    });
  }
  return results;
}

function extractParagraphText(innerXml: string): string {
  const withSpaces = innerXml.replace(/<w:(?:tab|br|cr)\s*\/>/g, ' ');
  const texts: string[] = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(?:\s[^>]*)?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withSpaces)) !== null) {
    texts.push(m[1] ? xmlUnescape(m[1]) : '');
  }
  return texts.join('');
}

function isImageSource(field: TemplateField): boolean {
  return field.source.type === 'signature' || field.source.type === 'stamp';
}

// Абзац разбивается на части: сырой XML (runs, rPr, tab, br…) и текстовые
// узлы <w:t>. Значения полей подставляются ТОЛЬКО в текст узлов, поэтому
// всё форматирование, нумерация и структура прогонов сохраняются.
type Part = { type: 'xml'; s: string } | { type: 't'; text: string };

function parseInnerToParts(innerXml: string): Part[] {
  const parts: Part[] = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(?:\s[^>]*)?\/>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(innerXml)) !== null) {
    if (m.index > last) parts.push({ type: 'xml', s: innerXml.slice(last, m.index) });
    parts.push({ type: 't', text: m[1] != null ? xmlUnescape(m[1]) : '' });
    last = m.index + m[0].length;
  }
  if (last < innerXml.length) parts.push({ type: 'xml', s: innerXml.slice(last) });
  return parts;
}

/** Заменяет первое вхождение find на replace в тексте узлов <w:t>, даже если
 *  оно разбито на несколько прогонов. Возвращает true, если нашлось. */
function replaceAcrossParts(parts: Part[], find: string, replace: string): boolean {
  const tParts = parts.filter((p): p is { type: 't'; text: string } => p.type === 't');
  const full = tParts.map((p) => p.text).join('');
  const at = full.indexOf(find);
  if (at < 0 || find.length === 0) return false;

  const end = at + find.length;
  let acc = 0;
  let si = -1;
  let so = 0;
  let ei = -1;
  let eo = 0;
  for (let i = 0; i < tParts.length; i += 1) {
    const len = tParts[i].text.length;
    if (si < 0 && at < acc + len) {
      si = i;
      so = at - acc;
    }
    if (si >= 0 && end <= acc + len) {
      ei = i;
      eo = end - acc;
      break;
    }
    acc += len;
  }
  if (si < 0 || ei < 0) return false;

  if (si === ei) {
    tParts[si].text = tParts[si].text.slice(0, so) + replace + tParts[si].text.slice(eo);
  } else {
    tParts[si].text = tParts[si].text.slice(0, so) + replace;
    for (let i = si + 1; i < ei; i += 1) tParts[i].text = '';
    tParts[ei].text = tParts[ei].text.slice(eo);
  }
  return true;
}

function rebuildInner(parts: Part[]): string {
  return parts
    .map((p) => (p.type === 'xml' ? p.s : `<w:t xml:space="preserve">${xmlEscape(p.text)}</w:t>`))
    .join('');
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
