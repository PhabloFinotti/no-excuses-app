const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function weekdaysLabel(days: number[]): string {
  const key = [...days].sort().join('')
  if (days.length === 7) return 'todo dia'
  if (key === '12345') return 'dias úteis'
  if (key === '06') return 'fins de semana'
  return [...days].sort().map((d) => LETTERS[d]).join(' ')
}

// Onde o item recém-criado foi parar, para o aviso não deixar dúvida.
export const addedText = (r: { name: string; kind: 'habit' | 'task'; durationMin: number }) =>
  r.kind === 'habit' ? `${r.name} adicionado como hábito diário (${r.durationMin} min).` : `${r.name} adicionada como tarefa de hoje (${r.durationMin} min).`
