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
}

// Hábito: completion do dia. Tarefa: sua única completion (day = due_date).
export function completionDay(item: ItemRow, today: string): string {
  return item.kind === 'task' ? item.due_date! : today
}

// Tarefa vencida e não concluída rola para hoje ("atrasada de ontem").
export function isPending(item: ItemRow, completions: CompletionRow[], now: LocalTime): boolean {
  if (item.archived) return false
  const due = item.kind === 'task' ? item.due_date! <= now.day : item.weekdays.includes(now.weekday)
  if (!due) return false
  const c = completions.find((c) => c.item_id === item.id && c.day === completionDay(item, now.day))
  return !(c?.done || c?.skipped)
}

export function elapsedSeconds(c: CompletionRow | undefined, nowMs: number): number {
  if (!c) return 0
  const running = c.timer_started_at ? Math.max(0, (nowMs - Date.parse(c.timer_started_at)) / 1000) : 0
  return c.timer_accum_s + running
}

export function toCalcItems(items: ItemRow[], completions: CompletionRow[], now: LocalTime, nowMs: number): CalcItem[] {
  return items
    .filter((i) => isPending(i, completions, now))
    .map((i) => {
      const c = completions.find((c) => c.item_id === i.id && c.day === completionDay(i, now.day))
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
