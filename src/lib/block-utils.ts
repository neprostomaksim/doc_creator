import type { Block } from './template-types';

/**
 * Пересчитывает нумерацию: разделы (heading) получают 1,2,3…, пункты (clause)
 * под текущим разделом — N.1, N.2… Вызывается после добавления/удаления/
 * перемещения блоков.
 */
export function renumberBlocks(blocks: Block[]): Block[] {
  let headingNo = 0;
  let clauseNo = 0;

  return blocks.map((block) => {
    if (block.type === 'heading') {
      headingNo += 1;
      clauseNo = 0;
      return { ...block, number: String(headingNo) };
    }
    if (block.type === 'clause') {
      clauseNo += 1;
      const prefix = headingNo > 0 ? `${headingNo}.${clauseNo}` : String(clauseNo);
      return { ...block, number: prefix };
    }
    return block;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Простой HTML-превью структуры в духе страницы А4 (для кнопки «Предпросмотр»). */
export function blocksToPreviewHtml(blocks: Block[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'title':
        parts.push(`<h1 class="prev-title">${escapeHtml(block.text)}</h1>`);
        break;
      case 'heading':
        parts.push(`<h2 class="prev-heading">${escapeHtml(block.number)}. ${escapeHtml(block.text)}</h2>`);
        break;
      case 'clause':
        parts.push(`<p class="prev-clause">${escapeHtml(block.number)} ${escapeHtml(block.text)}</p>`);
        break;
      case 'paragraph':
        parts.push(`<p class="prev-paragraph">${escapeHtml(block.text)}</p>`);
        break;
      case 'list':
        parts.push(
          `<ul class="prev-list">${block.items
            .map((i) => `<li>${escapeHtml(i.text)}</li>`)
            .join('')}</ul>`,
        );
        break;
      case 'table':
        parts.push(
          `<table class="prev-table"><tbody>${block.rows
            .map(
              (row) =>
                `<tr>${row.map((c) => `<td>${escapeHtml(c.text)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table>`,
        );
        break;
    }
  }

  return parts.join('\n');
}
