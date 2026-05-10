export function fileIconForContentType(mimeOrNome: string): string {
  if (mimeOrNome.includes('image')) return '🖼️';
  if (mimeOrNome.includes('pdf')) return '📄';
  if (mimeOrNome.includes('word') || mimeOrNome.includes('doc')) return '📝';
  if (mimeOrNome.includes('excel') || mimeOrNome.includes('sheet') || mimeOrNome.includes('xls')) return '📊';
  if (mimeOrNome.includes('zip') || mimeOrNome.includes('rar')) return '📦';
  return '📎';
}
