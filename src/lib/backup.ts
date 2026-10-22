import { must, supabase } from './supabase'

export interface Backup {
  version: 1
  items: Record<string, unknown>[]
  completions: Record<string, unknown>[]
  profile?: Record<string, unknown> // rotina e alertas (opcional: backups antigos não têm)
}

const PROFILE_FIELDS = ['wake_time', 'sleep_time', 'tz', 'warn_min', 'urgent_min', 'fixed_grace_min', 'morning_summary', 'evening_summary', 'evening_min']

// Texto que começa com = + - @ vira fórmula no Excel/Sheets: o apóstrofo mantém como texto.
const csvCell = (v: unknown) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(items: { id: string; name: string; kind: string }[], completions: { item_id: string; day: string; done: boolean; skipped: boolean; spent_min: number }[]): string {
  const byId = new Map(items.map((i) => [i.id, i]))
  const rows = completions.map((c) => [c.day, byId.get(c.item_id)?.name ?? '', byId.get(c.item_id)?.kind ?? '', c.done, c.skipped, c.spent_min])
  return [['day', 'name', 'kind', 'done', 'skipped', 'spent_min'], ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

// Valida o formato antes de qualquer escrita; user_id sai para o banco preencher com o usuário logado.
export function parseBackup(text: string): Backup {
  let data: Partial<Backup>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Arquivo não é um JSON válido')
  }
  if (data.version !== 1 || !Array.isArray(data.items) || !Array.isArray(data.completions)) throw new Error('Formato de backup desconhecido')
  const ok = (r: Record<string, unknown>, keys: string[]) => keys.every((k) => k in r)
  if (!data.items.every((i) => ok(i, ['id', 'kind', 'name', 'duration_min']))) throw new Error('Backup com itens inválidos')
  if (!data.completions.every((c) => ok(c, ['item_id', 'day']))) throw new Error('Backup com conclusões inválidas')
  const strip = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'user_id'))
  const profile = data.profile && typeof data.profile === 'object' ? Object.fromEntries(PROFILE_FIELDS.filter((k) => k in data.profile!).map((k) => [k, data.profile![k]])) : undefined
  return { version: 1, items: data.items.map(strip), completions: data.completions.map(strip), profile }
}

async function fetchAll() {
  const items = must(await supabase.from('items').select('*')) as Record<string, unknown>[]
  const completions = must(await supabase.from('item_completions').select('*')) as Record<string, unknown>[]
  return { items, completions }
}

function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function exportCsv() {
  const { items, completions } = await fetchAll()
  download('no-excuses.csv', `\uFEFF${buildCsv(items as never, completions as never)}`, 'text/csv;charset=utf-8') // BOM: o Excel abre os acentos certos
}

export async function exportBackup() {
  const { items, completions } = await fetchAll()
  const profile = must(await supabase.from('profiles').select(PROFILE_FIELDS.join(',')).single()) as unknown as Record<string, unknown>
  download('no-excuses-backup.json', JSON.stringify({ version: 1, items, completions, profile } satisfies Backup, null, 2), 'application/json')
}

export async function importBackup(file: File) {
  const b = parseBackup(await file.text())
  // Itens primeiro: as conclusões dependem deles (FK).
  must(await supabase.from('items').upsert(b.items))
  must(await supabase.from('item_completions').upsert(b.completions, { onConflict: 'item_id,day' }))
  return b
}
