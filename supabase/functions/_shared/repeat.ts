// Item repetido no dia (ex.: colírio 5x, a cada 2h). Pura, usada pela UI e pelo `tick`, como calculateState.
// O próximo aviso é a última vez + o intervalo (o primeiro, em repeat_from). O intervalo nunca encolhe para recuperar.
import type { ItemState, Level } from './calculateState.ts'
import { findCompletion, isPending, isRepeat, type CompletionRow, type ItemRow } from './pending.ts'
import { localTime, timeToMin, type LocalTime } from './time.ts'

export interface RepeatState extends ItemState {
  count: number // vezes registradas hoje
  target: number
  due: boolean // já passou da hora da próxima vez
  fits: boolean // a meta ainda cabe antes de dormir com o intervalo cheio
}

export interface RepeatConfig { tz: string; wakeMin: number; sleepMin: number }

export function repeatState(item: ItemRow, c: CompletionRow | undefined, now: LocalTime, cfg: RepeatConfig): RepeatState {
  const times = c?.done_times ?? []
  const target = item.times_per_day!
  const interval = item.interval_min!
  const next = times.length
    ? localTime(new Date(Math.max(...times.map(Date.parse))), cfg.tz).minutes + interval
    : item.repeat_from ? timeToMin(item.repeat_from) : cfg.wakeMin
  // A próxima pode ser feita agora (se atrasou) ou na hora marcada; as demais vêm a cada intervalo, todas antes de dormir.
  const fits = Math.max(now.minutes, next) + (target - times.length - 1) * interval < cfg.sleepMin
  const due = now.minutes >= next
  const level: Level = !fits ? 'overdue' : due ? 'attention' : 'normal'
  return { id: item.id, deadlineMin: next, minutesUntilDeadline: next - now.minutes, level, count: times.length, target, due, fits }
}

export function repeatStates(items: ItemRow[], completions: CompletionRow[], now: LocalTime, cfg: RepeatConfig): RepeatState[] {
  return items
    .filter((i) => isRepeat(i) && isPending(i, completions, now))
    .map((i) => repeatState(i, findCompletion(i, completions, now.day), now, cfg))
}
