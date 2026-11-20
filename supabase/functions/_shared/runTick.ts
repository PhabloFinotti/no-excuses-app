// Lógica pura do `tick`: decide quais pushes enviar agora. Separada do I/O para ser testável com relógio simulado.
import { calculateState, type Level } from './calculateState.ts'
import { emojiOf } from './categories.ts'
import { findCompletion, toCalcItems, type CompletionRow, type ItemRow } from './pending.ts'
import { repeatStates, type RepeatState } from './repeat.ts'
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
  level: Exclude<Level, 'normal'> | 'dose' // tipo do aviso: define som e vibração no aparelho
  keys: string[] // níveis gravados em notification_log (dedupe): o próprio nível ou dose-N do item repetido
  title: string
  body: string
  // Lembrete após um adiar: o tick marca snooze_notified_for na completion deste dia.
  snooze?: { completionDay: string; until: string }
}

type Candidate = Omit<PlannedPush, 'itemId' | 'day' | 'snooze'> & { item: ItemRow }

// `sent` guarda chaves `${itemId}:${day}:${level}` já enviadas (notification_log).
export function runTick(profile: TickProfile, items: ItemRow[], completions: CompletionRow[], sent: Set<string>, nowDate: Date): PlannedPush[] {
  const now = localTime(nowDate, profile.tz)
  const wakeMin = timeToMin(profile.wake_time)
  const sleepMin = timeToMin(profile.sleep_time)
  // Fora da janela acordado não avisa.
  if (now.minutes < wakeMin || now.minutes >= sleepMin) return []

  const result = calculateState(toCalcItems(items, completions, now, nowDate.getTime()), now.minutes, {
    sleepMin,
    warnMin: profile.warn_min,
    urgentMin: profile.urgent_min,
    graceMin: profile.fixed_grace_min,
  })
  const isSent = (id: string, key: string) => sent.has(`${id}:${now.day}:${key}`)
  const byId = new Map(items.map((i) => [i.id, i]))

  // Um candidato por item: o aviso que vale agora, ainda sem saber se já foi enviado.
  const candidates: Candidate[] = []
  for (const s of result.states) {
    if (s.level === 'normal') continue
    const item = byId.get(s.id)!
    candidates.push({ item, level: s.level, keys: [s.level], ...message(s.level, label(item), s.minutesUntilDeadline, minToTime(s.deadlineMin), result.deficitMin) })
  }
  for (const r of repeatStates(items, completions, now, { tz: profile.tz, wakeMin, sleepMin })) {
    const item = byId.get(r.id)!
    if (!r.due) continue // esperando o intervalo; meta que já não cabe só aparece no card
    const dose = `dose-${r.count + 1}`
    // A vez que venceu tem aviso próprio (se a meta já não cabe, ele conta também como o "atrasado" do dia).
    // Já avisada e ignorada até a meta deixar de caber: um "atrasado" só. Fora isso, o aviso da vez só volta como lembrete após adiar.
    if (isSent(r.id, dose) && !r.fits && !isSent(r.id, 'overdue'))
      candidates.push({ item, level: 'overdue', keys: ['overdue'], title: `${label(item)} · atrasado`, body: `Não dá mais para chegar a ${r.target} hoje (${r.count} de ${r.target}).` })
    else candidates.push({ item, level: 'dose', keys: r.fits ? [dose] : [dose, 'overdue'], ...doseMessage(item, r, now.minutes, sleepMin) })
  }

  const pushes: PlannedPush[] = []
  for (const { item, ...push } of candidates) {
    const c = findCompletion(item, completions, now.day)
    const until = c?.snoozed_until ? Date.parse(c.snoozed_until) : 0
    if (until > nowDate.getTime()) continue // adiado
    const reminder = !!until && c!.snooze_notified_for !== c!.snoozed_until
    if (!reminder && push.keys.every((k) => isSent(item.id, k))) continue
    pushes.push({ itemId: item.id, day: now.day, ...push, snooze: reminder ? { completionDay: c!.day, until: c!.snoozed_until! } : undefined })
  }
  return pushes
}

// Emoji + nome: o emoji diferencia os avisos na bandeja (ver categories.ts).
const label = (item: ItemRow) => `${emojiOf(item)} ${item.name}`.trim()

function message(level: Exclude<Level, 'normal'>, name: string, minutes: number, deadline: string, deficit: number) {
  if (level === 'overdue')
    return { title: `${name} · atrasado`, body: deficit ? `Não cabe tudo antes de dormir: faltam ${deficit} min.` : `Era para começar até ${deadline}.` }
  if (level === 'urgent') return { title: `${name} · urgente`, body: `Comece em ${minutes} min (até ${deadline}).` }
  return { title: `${name} · atenção`, body: `Comece até ${deadline} (em ${minutes} min).` }
}

function doseMessage(item: ItemRow, r: RepeatState, nowMin: number, sleepMin: number) {
  const n = r.count + 1
  const nextAt = nowMin + item.interval_min!
  const after = n >= r.target ? 'É a última de hoje.' : nextAt < sleepMin ? `Feita agora, a próxima fica para ${minToTime(nextAt)}.` : 'Depois desta, não cabe outra hoje.'
  return { title: `${label(item)} · ${n}ª de ${r.target}`, body: r.fits ? after : `Não dá mais para chegar a ${r.target} hoje. ${after}` }
}
