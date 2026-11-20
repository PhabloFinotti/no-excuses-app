// Resumos da manhã e do fim do dia. Pura, como runTick, para testar com relógio simulado.
import { isPending, isRepeat, toCalcItems, type CompletionRow, type ItemRow } from './pending.ts'
import { formatMinutes as fmt, localTime, timeToMin } from './time.ts'
import type { TickProfile } from './runTick.ts'

export interface SummaryProfile extends TickProfile {
  morning_summary?: boolean
  evening_summary?: boolean
  evening_min?: number
}

export interface PlannedSummary {
  kind: 'morning' | 'evening'
  day: string
  title: string
  body: string
}

// `sent` guarda `${day}:${kind}` já enviados (summary_log).
export function planSummaries(p: SummaryProfile, items: ItemRow[], completions: CompletionRow[], sent: Set<string>, nowDate: Date): PlannedSummary[] {
  const now = localTime(nowDate, p.tz)
  const wake = timeToMin(p.wake_time)
  const sleep = timeToMin(p.sleep_time)
  const pending = toCalcItems(items, completions, now, nowDate.getTime())
  const total = pending.reduce((s, i) => s + i.durationMin, 0)
  // Itens repetidos contam como item, mas não somam minutos (não têm duração).
  const count = pending.length + items.filter((i) => isRepeat(i) && isPending(i, completions, now)).length
  const out: PlannedSummary[] = []

  // Janela de 2h para tolerar um cron atrasado sem mandar o resumo no meio do dia.
  if ((p.morning_summary ?? true) && now.minutes >= wake && now.minutes < wake + 120 && !sent.has(`${now.day}:morning`) && count)
    out.push({ kind: 'morning', day: now.day, title: '☀️ Hoje', body: `${count} ${count === 1 ? 'item' : 'itens'}, ${fmt(total)} no total.` })

  const eveningStart = sleep - (p.evening_min ?? 60)
  if ((p.evening_summary ?? true) && now.minutes >= eveningStart && now.minutes < sleep && !sent.has(`${now.day}:evening`) && count)
    out.push({
      kind: 'evening', day: now.day, title: '🌙 Antes de dormir',
      body: `Faltam ${count} ${count === 1 ? 'item' : 'itens'} (${fmt(total)}) e restam ${fmt(sleep - now.minutes)} acordado.`,
    })
  return out
}
