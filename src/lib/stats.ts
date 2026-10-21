import type { CompletionRow, ItemRow } from '../../supabase/functions/_shared/pending'

export interface DayCell { day: string; scheduled: number; done: number }
export interface HabitStats {
  id: string; name: string; durationMin: number; scheduled: number; done: number; rate: number
  avgSpentMin: number; samples: number; suggestedDurationMin?: number; streak: number
}

const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

export function computeStats(items: ItemRow[], completions: CompletionRow[], today: string, days = 30) {
  // Antes do primeiro item cadastrado não há dado: esses dias ficam fora da série (não são "zero").
  const firstDay = items.length ? items.map((i) => i.created_at.slice(0, 10)).sort()[0]! : today
  const window = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).filter((d) => d >= firstDay || d === today)
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
    const avgSpentMin = spent.length ? Math.round(spent.reduce((s, c) => s + c.spent_min, 0) / spent.length) : 0
    // Com 3+ medições e desvio >= 25% do planejado, sugere ajustar (arredondado a 5 min).
    const off = avgSpentMin && Math.abs(avgSpentMin - h.duration_min) / h.duration_min >= 0.25
    return {
      id: h.id, name: h.name, durationMin: h.duration_min, samples: spent.length,
      suggestedDurationMin: spent.length >= 3 && off ? Math.max(5, Math.round(avgSpentMin / 5) * 5) : undefined,
      scheduled: scheduledDays.length, done,
      rate: scheduledDays.length ? done / scheduledDays.length : 0,
      avgSpentMin,
      streak,
    }
  })

  const doneTasks = completions.filter((c) => c.done && items.some((i) => i.id === c.item_id && i.kind === 'task'))
  const cells: DayCell[] = window.map((day) => {
    const scheduled = habits.filter((h) => day >= h.created_at.slice(0, 10) && h.weekdays.includes(weekdayOf(day)) && (day < today || doneOn(h.id, day)))
    const tasks = doneTasks.filter((c) => c.day === day).length
    return { day, scheduled: scheduled.length + tasks, done: scheduled.filter((h) => doneOn(h.id, day)).length + tasks }
  })

  // Média móvel de 7 dias (só com janela completa) e média por dia da semana (dias com algo agendado).
  const average7 = cells.map((_, i) => (i < 6 ? null : cells.slice(i - 6, i + 1).reduce((s, c) => s + c.done, 0) / 7))
  const sums = Array.from({ length: 7 }, () => ({ done: 0, days: 0 }))
  for (const c of cells) if (c.scheduled > 0) { const w = sums[weekdayOf(c.day)]!; w.done += c.done; w.days++ }
  const weekdayAvg = sums.map((w) => (w.days ? w.done / w.days : 0))
  const total = cells.reduce((s, c) => s + c.done, 0)
  const best = cells.reduce((b, c) => (c.done > b.done ? c : b), cells[0]!)

  return { habitStats, cells, average7, weekdayAvg, total, avgPerDay: total / window.length, best, tasksDone: doneTasks.filter((c) => window.includes(c.day)).length }
}
