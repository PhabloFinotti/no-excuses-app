// Lógica pura do `tick`: decide quais pushes enviar agora. Separada do I/O para ser testável com relógio simulado.
import { calculateState, type Level } from './calculateState.ts'
import { completionDay, toCalcItems, type CompletionRow, type ItemRow } from './pending.ts'
import { localTime, minToTime, timeToMin } from './time.ts'

export interface TickProfile {
  wake_time: string
  sleep_time: string
  tz: string
  warn_min: number
  urgent_min: number
  fixed_grace_min?: number
}

export interface PlannedPush {
  itemId: string
  day: string
  level: Exclude<Level, 'normal'>
  title: string
  body: string
  // Lembrete após um adiar: o tick marca snooze_notified_for na completion deste dia.
  snooze?: { completionDay: string; until: string }
}

// `sent` guarda chaves `${itemId}:${day}:${level}` já enviadas (notification_log).
export function runTick(profile: TickProfile, items: ItemRow[], completions: CompletionRow[], sent: Set<string>, nowDate: Date): PlannedPush[] {
  const now = localTime(nowDate, profile.tz)
  // Fora da janela acordado não avisa.
  if (now.minutes < timeToMin(profile.wake_time) || now.minutes >= timeToMin(profile.sleep_time)) return []

  const result = calculateState(toCalcItems(items, completions, now, nowDate.getTime()), now.minutes, {
    sleepMin: timeToMin(profile.sleep_time),
    warnMin: profile.warn_min,
    urgentMin: profile.urgent_min,
    graceMin: profile.fixed_grace_min,
  })

  const pushes: PlannedPush[] = []
  for (const s of result.states) {
    if (s.level === 'normal') continue
    const item = items.find((i) => i.id === s.id)!
    const day = completionDay(item, now.day)
    const c = completions.find((c) => c.item_id === s.id && c.day === day)
    const until = c?.snoozed_until ? Date.parse(c.snoozed_until) : 0
    if (until > nowDate.getTime()) continue // adiado
    const reminder = !!until && c!.snooze_notified_for !== c!.snoozed_until
    if (!reminder && sent.has(`${s.id}:${now.day}:${s.level}`)) continue
    pushes.push({
      itemId: s.id, day: now.day, level: s.level,
      ...message(s.level, item.name, s.minutesUntilDeadline, minToTime(s.deadlineMin), result.deficitMin),
      snooze: reminder ? { completionDay: day, until: c!.snoozed_until! } : undefined,
    })
  }
  return pushes
}

function message(level: Exclude<Level, 'normal'>, name: string, minutes: number, deadline: string, deficit: number) {
  if (level === 'overdue')
    return { title: `${name}: atrasado`, body: deficit ? `Não cabe tudo antes de dormir: faltam ${deficit} min.` : `Era para começar até ${deadline}.` }
  if (level === 'urgent') return { title: `${name}: urgente`, body: `Comece em ${minutes} min (até ${deadline}).` }
  return { title: `${name}: está acabando o tempo`, body: `Comece até ${deadline} (em ${minutes} min).` }
}
