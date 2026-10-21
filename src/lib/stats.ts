import type { CompletionRow, ItemRow } from '../../supabase/functions/_shared/pending'

export interface DayCell { day: string; scheduled: number; done: number }
export interface HabitStats { id: string; name: string; scheduled: number; done: number; rate: number; avgSpentMin: number; streak: number }

const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

export function computeStats(items: ItemRow[], completions: CompletionRow[], today: string, days = 30) {
  const window = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1))
  const doneOn = (id: string, day: string) => completions.some((c) => c.item_id === id && c.day === day && c.done)
  const habits = items.filter((i) => i.kind === 'habit')

  const habitStats: HabitStats[] = habits.map((h) => {
    const start = h.created_at.slice(0, 10)
    // Hoje só conta se já foi feito, para não penalizar o dia em andamento.
    const scheduledDays = window.filter((d) => d >= start && h.weekdays.includes(weekdayOf(d)) && (d < today || doneOn(h.id, d)))
    const done = scheduledDays.filter((d) => doneOn(h.id, d)).length
    const spent = completions.filter((c) => c.item_id === h.id && c.done && c.spent_min > 0 && window.includes(c.day))
    let streak = 0
    for (const d of [...window].reverse()) {
      if (d < start || !h.weekdays.includes(weekdayOf(d))) continue
      if (doneOn(h.id, d)) streak++
      else if (d !== today) break
    }
    return {
      id: h.id, name: h.name, scheduled: scheduledDays.length, done,
      rate: scheduledDays.length ? done / scheduledDays.length : 0,
      avgSpentMin: spent.length ? Math.round(spent.reduce((s, c) => s + c.spent_min, 0) / spent.length) : 0,
      streak,
    }
  })

  const doneTasks = completions.filter((c) => c.done && items.some((i) => i.id === c.item_id && i.kind === 'task'))
  const cells: DayCell[] = window.map((day) => {
    const scheduled = habits.filter((h) => day >= h.created_at.slice(0, 10) && h.weekdays.includes(weekdayOf(day)) && (day < today || doneOn(h.id, day)))
    const tasks = doneTasks.filter((c) => c.day === day).length
    return { day, scheduled: scheduled.length + tasks, done: scheduled.filter((h) => doneOn(h.id, day)).length + tasks }
  })

  return { habitStats, cells, tasksDone: doneTasks.filter((c) => window.includes(c.day)).length }
}
