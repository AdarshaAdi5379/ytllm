/**
 * Splits text into overlapping chunks for embedding.
 * @param text Full transcript text
 * @param chunkSize Target number of words per chunk
 * @param overlap Number of words to overlap between chunks
 */
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];
  if (words.length <= chunkSize) return [words.join(' ')];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);

    if (end >= words.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}
