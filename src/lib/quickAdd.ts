const NAME = '(.+?)\\s+(?:(?:por|durante)\\s+)?'
const HOURS = new RegExp(`^${NAME}(\\d{1,2})\\s*(?:horas?|hrs?|h)(?:\\s*(\\d{1,2})\\s*(?:minutos?|mins?|m)?)?$`, 'i')
const MINUTES = new RegExp(`^${NAME}(\\d{1,4})\\s*(?:minutos?|mins?|m)$`, 'i')
const BARE = new RegExp(`^${NAME}(\\d{1,3})$`)

// Tira a duração do fim do texto: "Ler por 60 minutos", "Ler 1h30", "Estudar 2 horas", "Ler 45" -> nome sem a duração.
// Sem duração no fim ("Ler 10 páginas"), devolve null e o texto inteiro continua sendo o nome.
export function parseDuration(text: string): { name: string; durationMin: number } | null {
  const t = text.trim()
  let m = t.match(HOURS)
  if (m) return { name: m[1]!.trim(), durationMin: Number(m[2]) * 60 + Number(m[3] ?? 0) }
  m = t.match(MINUTES) ?? t.match(BARE)
  return m ? { name: m[1]!.trim(), durationMin: Number(m[2]) } : null
}

// "Ler livro 45" -> { name: 'Ler livro', durationMin: 45 }. Sem duração no fim, usa 30 min.
export function parseQuickAdd(text: string): { name: string; durationMin: number } | null {
  const parsed = parseDuration(text) ?? { name: text.trim(), durationMin: 30 }
  const { name, durationMin } = parsed
  return name && !/^\d+$/.test(name) && durationMin > 0 && durationMin <= 1440 ? parsed : null
}
