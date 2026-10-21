// "Ler livro 45" -> { name: 'Ler livro', durationMin: 45 }. Sem número no fim, usa 30 min.
export function parseQuickAdd(text: string): { name: string; durationMin: number } | null {
  const m = text.trim().match(/^(.*?)(?:\s+(\d{1,3}))?$/)
  const name = (m?.[1] ?? '').trim()
  const durationMin = m?.[2] ? Number(m[2]) : 30
  return name && !/^\d+$/.test(name) && durationMin > 0 ? { name, durationMin } : null
}
