// Decide o que está pendente hoje e monta a entrada de calculateState (usado pela UI e pelo `tick`).
import type { Item as CalcItem } from './calculateState.ts'
import { timeToMin, type LocalTime } from './time.ts'

export interface ItemRow {
  id: string
  kind: 'habit' | 'task'
  name: string
  duration_min: number
  fixed_time: string | null
  weekdays: number[]
  due_date: string | null
  essential: boolean
  warn_min: number | null
  urgent_min: number | null
  archived: boolean
  archived_at?: string | null // fim do período em que um hábito arquivado conta no histórico
  category?: string | null // null = automática pelo nome; ver src/lib/categories.ts
  created_at: string
}

export interface CompletionRow {
  item_id: string
  day: string
  done: boolean
  skipped: boolean
  spent_min: number
  timer_started_at: string | null
  timer_accum_s: number
  snoozed_until?: string | null
  snooze_notified_for?: string | null
  time_source?: 'timer' | 'manual' | 'planned' | null
}

// Hábito: a conclusão de hoje. Tarefa: a única conclusão dela, de qualquer dia (a mais recente).
// Assim uma tarefa atrasada concluída hoje é gravada em hoje, e timer/adiar sobrevivem a "Fazer amanhã".
export function findCompletion(item: ItemRow, completions: CompletionRow[], today: string): CompletionRow | undefined {
  if (item.kind === 'habit') return completions.find((c) => c.item_id === item.id && c.day === today)
  let best: CompletionRow | undefined
  for (const c of completions) if (c.item_id === item.id && (!best || c.day > best.day)) best = c
  return best
}

// Tarefa vencida e não concluída rola para hoje ("atrasada de ontem").
export function isPending(item: ItemRow, completions: CompletionRow[], now: LocalTime): boolean {
  if (item.archived) return false
  const due = item.kind === 'task' ? item.due_date! <= now.day : item.weekdays.includes(now.weekday)
  if (!due) return false
  const c = findCompletion(item, completions, now.day)
  return !(c?.done || c?.skipped)
}

// Tarefa rolada há mais de STALE_DAYS dias deixa de pesar no cálculo e pede decisão (reagendar ou descartar).
export const STALE_DAYS = 3

export function isStale(item: ItemRow, today: string): boolean {
  return item.kind === 'task' && (Date.parse(today) - Date.parse(item.due_date!)) / 86_400_000 > STALE_DAYS
}

export function elapsedSeconds(c: CompletionRow | undefined, nowMs: number): number {
  if (!c) return 0
  const running = c.timer_started_at ? Math.max(0, (nowMs - Date.parse(c.timer_started_at)) / 1000) : 0
  return c.timer_accum_s + running
}

// Tempo a registrar ao concluir: o timer, se passou de 1 min; senão o previsto (assim nunca vira 0).
export function finishMinutes(c: CompletionRow | undefined, plannedMin: number, nowMs: number): { minutes: number; source: 'timer' | 'planned' } {
  const s = elapsedSeconds(c, nowMs)
  return s >= 60 ? { minutes: Math.round(s / 60), source: 'timer' } : { minutes: plannedMin, source: 'planned' }
}

export function toCalcItems(items: ItemRow[], completions: CompletionRow[], now: LocalTime, nowMs: number): CalcItem[] {
  return items
    .filter((i) => isPending(i, completions, now) && !isStale(i, now.day))
    .map((i) => {
      const c = findCompletion(i, completions, now.day)
      const remaining = Math.max(0, Math.ceil(i.duration_min - elapsedSeconds(c, nowMs) / 60))
      return {
        id: i.id,
        durationMin: remaining,
        fixedMin: i.fixed_time ? timeToMin(i.fixed_time) : undefined,
        essential: i.essential,
        warnMin: i.warn_min ?? undefined,
        urgentMin: i.urgent_min ?? undefined,
      }
    })
}
