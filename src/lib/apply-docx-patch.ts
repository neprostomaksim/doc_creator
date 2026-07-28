import JSZip from 'jszip';
import {
  findParagraphs,
  parseInnerToParts,
  replaceAcrossParts,
  rebuildInner,
  xmlEscape,
  normalizeWhitespace,
} from './docx-xml';

export type PatchEdit =
  | { op: 'replace'; find: string; replace: string }
  | { op: 'insert_after'; anchor: string; text: string }
  | { op: 'delete'; find: string };

function extractPPr(innerXml: string): string {
  const m = innerXml.match(/^<w:pPr>[\s\S]*?<\/w:pPr>|^<w:pPr\s*\/>/);
  return m ? m[0] : '';
}

function extractFirstRPr(innerXml: string): string {
  const run = innerXml.match(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/);
  if (!run) return '';
  const rpr = run[1].match(/<w:rPr>[\s\S]*?<\/w:rPr>|<w:rPr\s*\/>/);
  return rpr ? rpr[0] : '';
}

type Para = {
  openTag: string;
  closeTag: string;
  parts: ReturnType<typeof parseInnerToParts>;
  pPr: string;
  rPr: string;
  deleted: boolean;
  insertsAfter: string[]; // готовый xml новых абзацев
};

/**
 * Применяет операции правки ИИ прямо к word/document.xml исходного .docx:
 * replace — замена текста внутри прогонов (форматирование сохраняется),
 * insert_after — новый абзац после якорного (со стилем якоря),
 * delete — удаление абзаца. Возвращает новый буфер и статистику.
 */
export async function applyDocxPatch(
  templateBuffer: Buffer,
  edits: PatchEdit[],
): Promise<{ buffer: Buffer; applied: number; skipped: string[] }> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('В файле нет word/document.xml — это не обычный .docx');
  const xml = await docFile.async('string');

  const matches = findParagraphs(xml);
  const paras: Para[] = matches.map((m) => ({
    openTag: m.openTag,
    closeTag: m.closeTag,
    parts: parseInnerToParts(m.innerXml),
    pPr: extractPPr(m.innerXml),
    rPr: extractFirstRPr(m.innerXml),
    deleted: false,
    insertsAfter: [],
  }));

  const text = (p: Para) =>
    normalizeWhitespace(
      p.parts.map((x) => (x.type === 't' ? x.text : '')).join(''),
    );

  let applied = 0;
  const skipped: string[] = [];

  // 1) Замены — по всем абзацам (значение реквизита может повторяться в разных).
  for (const edit of edits) {
    if (edit.op !== 'replace' || !edit.find) continue;
    let hit = false;
    for (const p of paras) {
      if (p.deleted) continue;
      if (replaceAcrossParts(p.parts, edit.find, edit.replace)) hit = true;
    }
    if (hit) applied += 1;
    else skipped.push(`заменить «${edit.find.slice(0, 40)}»`);
  }

  // 2) Удаления — первый подходящий абзац.
  for (const edit of edits) {
    if (edit.op !== 'delete' || !edit.find) continue;
    const norm = normalizeWhitespace(edit.find);
    const p = paras.find((pp) => !pp.deleted && text(pp).includes(norm));
    if (p) {
      p.deleted = true;
      applied += 1;
    } else skipped.push(`удалить «${edit.find.slice(0, 40)}»`);
  }

  // 3) Вставки — новый абзац после якорного, со стилем якоря.
  for (const edit of edits) {
    if (edit.op !== 'insert_after' || !edit.text) continue;
    const anchorNorm = normalizeWhitespace(edit.anchor ?? '');
    const p = anchorNorm
      ? paras.find((pp) => !pp.deleted && text(pp).includes(anchorNorm))
      : paras[paras.length - 1];
    if (p) {
      const newPara = `${p.openTag}${p.pPr}<w:r>${p.rPr}<w:t xml:space="preserve">${xmlEscape(
        edit.text,
      )}</w:t></w:r>${p.closeTag}`;
      p.insertsAfter.push(newPara);
      applied += 1;
    } else skipped.push(`вставить после «${(edit.anchor ?? '').slice(0, 40)}»`);
  }

  // Пересобираем document.xml, сохраняя весь текст между абзацами.
  let rewritten = '';
  let cursor = 0;
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i];
    const p = paras[i];
    rewritten += xml.slice(cursor, m.start);
    if (!p.deleted) {
      rewritten += `${p.openTag}${rebuildInner(p.parts)}${p.closeTag}`;
    }
    for (const ins of p.insertsAfter) rewritten += ins;
    cursor = m.end;
  }
  rewritten += xml.slice(cursor);

  zip.file('word/document.xml', rewritten);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { buffer, applied, skipped };
}
