// Resumos da manhã e do fim do dia. Pura, como runTick, para testar com relógio simulado.
import { toCalcItems, type CompletionRow, type ItemRow } from './pending.ts'
import { localTime, timeToMin } from './time.ts'
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

const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`)

// `sent` guarda `${day}:${kind}` já enviados (summary_log).
export function planSummaries(p: SummaryProfile, items: ItemRow[], completions: CompletionRow[], sent: Set<string>, nowDate: Date): PlannedSummary[] {
  const now = localTime(nowDate, p.tz)
  const wake = timeToMin(p.wake_time)
  const sleep = timeToMin(p.sleep_time)
  const pending = toCalcItems(items, completions, now, nowDate.getTime())
  const total = pending.reduce((s, i) => s + i.durationMin, 0)
  const out: PlannedSummary[] = []

  // Janela de 2h para tolerar um cron atrasado sem mandar o resumo no meio do dia.
  if ((p.morning_summary ?? true) && now.minutes >= wake && now.minutes < wake + 120 && !sent.has(`${now.day}:morning`) && pending.length)
    out.push({ kind: 'morning', day: now.day, title: 'Hoje', body: `${pending.length} ${pending.length === 1 ? 'item' : 'itens'}, ${fmt(total)} no total.` })

  const eveningStart = sleep - (p.evening_min ?? 60)
  if ((p.evening_summary ?? true) && now.minutes >= eveningStart && now.minutes < sleep && !sent.has(`${now.day}:evening`) && pending.length)
    out.push({
      kind: 'evening', day: now.day, title: 'Antes de dormir',
      body: `Faltam ${pending.length} ${pending.length === 1 ? 'item' : 'itens'} (${fmt(total)}) e restam ${fmt(sleep - now.minutes)} acordado.`,
    })
  return out
}
