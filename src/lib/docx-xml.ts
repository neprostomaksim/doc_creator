// Низкоуровневые операции над word/document.xml: поиск абзацев и замена
// текста ВНУТРИ прогонов <w:t>, чтобы не терять форматирование. Используется
// и strict-подстановкой (render-contract), и ИИ-патчем (apply-docx-patch).

export function xmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"' };

export function xmlUnescape(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|#\d+);/g, (whole, code: string) => {
    if (code === '#39') return "'";
    if (code.startsWith('#')) return String.fromCharCode(Number(code.slice(1)));
    return XML_ENTITIES[code] ?? whole;
  });
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export type ParagraphMatch = {
  start: number;
  end: number;
  openTag: string;
  innerXml: string;
  closeTag: string;
};

export function findParagraphs(xml: string): ParagraphMatch[] {
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

export function extractParagraphText(innerXml: string): string {
  const withSpaces = innerXml.replace(/<w:(?:tab|br|cr)\s*\/>/g, ' ');
  const texts: string[] = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(?:\s[^>]*)?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withSpaces)) !== null) {
    texts.push(m[1] ? xmlUnescape(m[1]) : '');
  }
  return texts.join('');
}

// Абзац как последовательность частей: сырой XML (прогоны, rPr, tab…) и
// текстовые узлы <w:t>. Значения подставляются только в текст узлов.
export type Part = { type: 'xml'; s: string } | { type: 't'; text: string };

export function parseInnerToParts(innerXml: string): Part[] {
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
export function replaceAcrossParts(parts: Part[], find: string, replace: string): boolean {
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

export function rebuildInner(parts: Part[]): string {
  return parts
    .map((p) => (p.type === 'xml' ? p.s : `<w:t xml:space="preserve">${xmlEscape(p.text)}</w:t>`))
    .join('');
}
