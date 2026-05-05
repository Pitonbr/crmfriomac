/**
 * Parsers pt-BR — converte strings formatadas em números/dados estruturados.
 */

/** "1.234,56" → 1234.56. Tolerante: aceita também "1234.56" e "1234,56". */
export function parseBRL(input: string): number {
  if (!input) return 0;
  // Remove tudo que não é dígito, vírgula, ponto ou sinal
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;

  // Se tem ambos vírgula e ponto, assume formato pt-BR (ponto = milhar, vírgula = decimal)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  // Só vírgula → trata como decimal pt-BR
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const n = Number(cleaned.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  // Só ponto ou nada
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
