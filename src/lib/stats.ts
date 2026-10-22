import { addDays } from '../../supabase/functions/_shared/time'
import type { CompletionRow, ItemRow } from '../../supabase/functions/_shared/pending'

export interface DayCell { day: string; scheduled: number; done: number; minutes: number }
export interface HabitStats {
  id: string; name: string; durationMin: number; scheduled: number; done: number; rate: number
  avgSpentMin: number; samples: number; suggestedDurationMin?: number; streak: number
}

const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()

export function computeStats(items: ItemRow[], completions: CompletionRow[], today: string, days = 30) {
  // Antes do primeiro item cadastrado não há dado: esses dias ficam fora da série (não são "zero").
  const firstDay = items.length ? items.map((i) => i.created_at.slice(0, 10)).sort()[0]! : today
  const window = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).filter((d) => d >= firstDay || d === today)
  // Índices em vez de varrer as conclusões a cada dia × hábito (o Histórico recalcula ao abrir e a cada mudança).
  const doneKeys = new Set<string>()
  const minutesByDay = new Map<string, number>()
  const spentByItem = new Map<string, CompletionRow[]>()
  const taskIds = new Set(items.filter((i) => i.kind === 'task').map((i) => i.id))
  const doneTasksByDay = new Map<string, number>()
  for (const c of completions) {
    if (!c.done) continue
    doneKeys.add(`${c.item_id}|${c.day}`)
    minutesByDay.set(c.day, (minutesByDay.get(c.day) ?? 0) + c.spent_min)
    if (taskIds.has(c.item_id)) doneTasksByDay.set(c.day, (doneTasksByDay.get(c.day) ?? 0) + 1)
    if (c.spent_min > 0 && c.time_source !== 'planned') spentByItem.set(c.item_id, [...(spentByItem.get(c.item_id) ?? []), c])
  }
  const doneOn = (id: string, day: string) => doneKeys.has(`${id}|${day}`)
  const inWindow = new Set(window)
  const habits = items.filter((i) => i.kind === 'habit')

  const habitStats: HabitStats[] = habits.map((h) => {
    const start = h.created_at.slice(0, 10)
    // Hoje só conta se já foi feito, para não penalizar o dia em andamento.
    const scheduledDays = window.filter((d) => d >= start && h.weekdays.includes(weekdayOf(d)) && (d < today || doneOn(h.id, d)))
    const done = scheduledDays.filter((d) => doneOn(h.id, d)).length
    const spent = (spentByItem.get(h.id) ?? []).filter((c) => inWindow.has(c.day))
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

  const cells: DayCell[] = window.map((day) => {
    const scheduled = habits.filter((h) => day >= h.created_at.slice(0, 10) && h.weekdays.includes(weekdayOf(day)) && (day < today || doneOn(h.id, day)))
    const tasks = doneTasksByDay.get(day) ?? 0
    const minutes = minutesByDay.get(day) ?? 0
    return { day, scheduled: scheduled.length + tasks, done: scheduled.filter((h) => doneOn(h.id, day)).length + tasks, minutes }
  })

  // Média móvel de 7 dias (só com janela completa) e média por dia da semana (dias com algo agendado).
  const movingAvg = (pick: (c: DayCell) => number) => cells.map((_, i) => (i < 6 ? null : cells.slice(i - 6, i + 1).reduce((s, c) => s + pick(c), 0) / 7))
  const average7 = movingAvg((c) => c.done)
  const minutesAvg7 = movingAvg((c) => c.minutes)
  const sums = Array.from({ length: 7 }, () => ({ done: 0, days: 0 }))
  for (const c of cells) if (c.scheduled > 0) { const w = sums[weekdayOf(c.day)]!; w.done += c.done; w.days++ }
  const weekdayAvg = sums.map((w) => (w.days ? w.done / w.days : 0))
  const total = cells.reduce((s, c) => s + c.done, 0)
  const best = cells.reduce((b, c) => (c.done > b.done ? c : b), cells[0]!)

  return { habitStats, cells, average7, minutesAvg7, totalMinutes: cells.reduce((s, c) => s + c.minutes, 0), weekdayAvg, total, avgPerDay: total / window.length, best, tasksDone: window.reduce((s, d) => s + (doneTasksByDay.get(d) ?? 0), 0) }
}

export interface HabitCell { day: string; scheduled: boolean; counted: boolean; done: boolean; skipped: boolean; minutes: number }

// Histórico de UM hábito: dias agendados, cumprimento, sequências, tempo e taxa por dia da semana.
export function computeHabitDetail(h: ItemRow, completions: CompletionRow[], today: string, days = 30) {
  const start = h.created_at.slice(0, 10)
  const window = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).filter((d) => d >= start || d === today)
  const mine = completions.filter((c) => c.item_id === h.id)

  const cells: HabitCell[] = window.map((day) => {
    const c = mine.find((c) => c.day === day)
    const scheduled = h.weekdays.includes(weekdayOf(day))
    const done = !!c?.done
    // Hoje, pendente, não conta como falha (o dia ainda não acabou).
    return { day, scheduled, counted: scheduled && (day < today || done), done, skipped: !!c?.skipped && !done, minutes: done ? c!.spent_min : 0 }
  })

  const counted = cells.filter((c) => c.counted)
  const doneCount = counted.filter((c) => c.done).length
  let best = 0, run = 0
  for (const c of cells) {
    if (!c.scheduled) continue
    if (c.done) best = Math.max(best, ++run)
    else if (c.day !== today) run = 0
  }
  let streak = 0
  for (const c of [...cells].reverse()) {
    if (!c.scheduled) continue
    if (c.done) streak++
    else if (c.day !== today) break
  }

  const timed = mine.filter((c) => c.done && c.spent_min > 0 && c.time_source !== 'planned' && window.includes(c.day))
  const weekdayRate = Array.from({ length: 7 }, (_, w) => {
    const ofDay = counted.filter((c) => weekdayOf(c.day) === w)
    return ofDay.length ? Math.round((ofDay.filter((c) => c.done).length / ofDay.length) * 100) : 0
  })
  const total = cells.reduce((s, c) => s + c.minutes, 0)

  return {
    cells, counted: counted.length, done: doneCount, rate: counted.length ? doneCount / counted.length : 0,
    streak, bestStreak: best, totalMinutes: total,
    avgMinutes: timed.length ? Math.round(timed.reduce((s, c) => s + c.spent_min, 0) / timed.length) : 0, timedSamples: timed.length,
    weekdayRate,
  }
}
