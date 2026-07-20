import mammoth from 'mammoth';
import type { Block } from './template-types';

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};

function unescapeHtml(text: string): string {
  return text.replace(/&(#39|amp|lt|gt|quot|nbsp);/g, (_, code) => HTML_ENTITIES[code] ?? '');
}

function stripTags(html: string): string {
  return unescapeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

const CLAUSE_PATTERN = /^(\d+(?:\.\d+)+)\.?\s+([\s\S]+)$/;
const HEADING_PATTERN = /^(\d+)\.\s+([\s\S]+)$/;

function classifyParagraph(id: string, text: string): Block | null {
  if (!text) return null;

  const clauseMatch = text.match(CLAUSE_PATTERN);
  if (clauseMatch) {
    return { id, type: 'clause', number: clauseMatch[1], text: clauseMatch[2].trim() };
  }

  const headingMatch = text.match(HEADING_PATTERN);
  if (headingMatch) {
    return { id, type: 'heading', number: headingMatch[1], text: headingMatch[2].trim() };
  }

  const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(text);
  const isUppercase = hasLetters && text === text.toUpperCase();
  if (isUppercase && text.length <= 120) {
    return { id, type: 'title', text };
  }

  return { id, type: 'paragraph', text };
}

let counter = 0;
function nextId() {
  counter += 1;
  return `b${Date.now().toString(36)}${counter}`;
}

/** Разбирает HTML от mammoth на последовательность блоков верхнего уровня. */
export async function parseDocxToBlocks(buffer: Buffer): Promise<Block[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const blocks: Block[] = [];
  const topLevelPattern = /<(p|ul|ol|table)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = topLevelPattern.exec(html)) !== null) {
    const [, tag, inner] = match;

    if (tag === 'p') {
      const text = stripTags(inner);
      const block = classifyParagraph(nextId(), text);
      if (block) blocks.push(block);
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g))
        .map((m) => stripTags(m[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ id: nextId(), type: 'list', items });
      continue;
    }

    if (tag === 'table') {
      const rows = Array.from(inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)).map((rowMatch) =>
        Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)).map((cellMatch) =>
          stripTags(cellMatch[1]),
        ),
      );
      if (rows.length) blocks.push({ id: nextId(), type: 'table', rows });
    }
  }

  return blocks;
}
