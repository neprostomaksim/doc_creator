export function sanitizeFilenamePart(text: string): string {
  return text
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}
