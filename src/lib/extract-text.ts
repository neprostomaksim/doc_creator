import mammoth from 'mammoth';

/** Извлекает простой текст из загруженного файла материала. Только Node.js. */
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  if (lower.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (lower.endsWith('.pdf')) {
    // Динамический импорт: pdf-parse тянет тяжёлые зависимости pdfjs, которые
    // нужны только при разборе PDF и только в Node-окружении.
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error('Поддерживаются только .docx, .pdf и .txt');
}
