import { categoryLabel, detectCategory } from './categories'

const NAME = '(.+?)\\s+(?:(?:por|durante)\\s+)?'
const HOUR_UNIT = '(?:horas?|hrs?|hs|h)'
const MIN_UNIT = '(?:minutos?|mins?|m)'
const HOURS = new RegExp(`^${NAME}(\\d{1,2})\\s*${HOUR_UNIT}(?:\\s*(\\d{1,3})\\s*${MIN_UNIT}?)?$`, 'i')
const DECIMAL_HOURS = new RegExp(`^${NAME}(\\d{1,2}[.,]\\d{1,2})\\s*${HOUR_UNIT}$`, 'i')
const MINUTES = new RegExp(`^${NAME}(\\d{1,4})\\s*${MIN_UNIT}$`, 'i')
const BARE = new RegExp(`^${NAME}(\\d{1,3})$`)

// Tira a duração do fim do texto: "Ler por 60 minutos", "Ler 1h30", "Estudar 1,5h", "Ler 45" -> nome sem a duração.
// Sem duração no fim ("Ler 10 páginas"), devolve null e o texto inteiro continua sendo o nome.
// `bare: false` exige unidade (min, h): usado no formulário, onde "Ler capítulo 3" é um nome, não 3 minutos.
export function parseDuration(text: string, { bare = true } = {}): { name: string; durationMin: number } | null {
  const t = text.trim()
  const decimal = t.match(DECIMAL_HOURS)
  if (decimal) return { name: decimal[1]!.trim(), durationMin: Math.round(parseFloat(decimal[2]!.replace(',', '.')) * 60) }
  const hours = t.match(HOURS)
  if (hours) return Number(hours[3] ?? 0) > 59 ? null : { name: hours[1]!.trim(), durationMin: Number(hours[2]) * 60 + Number(hours[3] ?? 0) }
  const m = t.match(MINUTES) ?? (bare ? t.match(BARE) : null)
  return m ? { name: m[1]!.trim(), durationMin: Number(m[2]) } : null
}

// "Ler livro 45" -> { name: 'Ler livro', durationMin: 45 }. Sem duração no fim, usa 30 min.
export function parseQuickAdd(text: string): { name: string; durationMin: number } | null {
  const parsed = parseDuration(text) ?? { name: text.trim(), durationMin: 30 }
  const { name, durationMin } = parsed
  return name && !/^\d+$/.test(name) && durationMin > 0 && durationMin <= 1440 ? parsed : null
}

// Por que o texto foi recusado, em palavras de quem digitou (null se está tudo certo).
export function quickAddError(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Digite um nome e, se quiser, a duração. Exemplo: Ler 45.'
  const overflow = t.match(HOURS)
  if (overflow && Number(overflow[3] ?? 0) > 59) return 'Depois das horas, os minutos vão de 0 a 59. Exemplo: 1h30.'
  if (parseQuickAdd(t)) return null
  const parsed = parseDuration(t)
  if (parsed && parsed.durationMin > 1440) return 'A duração máxima é 24h (1440 min).'
  if (parsed && parsed.durationMin <= 0) return 'A duração precisa ser maior que zero.'
  return 'Falta o nome do item. Exemplo: Ler 45.'
}

// Prévia ao vivo do que será criado (ou por que não dá), para ninguém descobrir só depois de enviar.
export function describeQuickAdd(text: string, kind?: 'habit' | 'task'): { ok: boolean; text: string } | null {
  if (!text.trim()) return null
  const error = quickAddError(text)
  if (error) return { ok: false, text: error }
  const p = parseQuickAdd(text)!
  const category = categoryLabel(detectCategory(p.name)) ?? 'sem categoria'
  return { ok: true, text: `${kind ? `${kind === 'habit' ? 'Hábito diário' : 'Tarefa de hoje'}: ` : ''}${p.name} · ${p.durationMin} min · ${category}` }
}
