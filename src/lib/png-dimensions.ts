/** Читает ширину/высоту прямо из заголовка PNG (чанк IHDR), без внешних зависимостей. */
export function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  const isPng =
    buffer.length > 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  if (!isPng) return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) return null;

  return { width, height };
}
