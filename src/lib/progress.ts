// Motivação calculada do histórico, sem tabela nova: sequência de dias fechados, semana, XP e nível.
import { addDays } from '../../supabase/functions/_shared/time'
import type { DayCell } from './stats'

export const XP_PER_DONE = 10
export const WEEK_GOAL = 5 // shortcut: meta fixa em 5 dias; vira ajuste em Ajustes quando alguém pedir outra

// Dia fechado: tudo o que estava agendado foi feito (pulado não conta como agendado).
// Hoje não vem das células (elas só contam o que já foi feito hoje): quem chama diz se a lista do dia acabou.
const closed = (c: DayCell | undefined) => !!c && c.scheduled > 0 && c.done >= c.scheduled

// Dias fechados seguidos até hoje. Hoje em andamento não quebra; dia sem nada agendado não conta nem quebra.
export function streak(cells: DayCell[], today: string, todayClosed: boolean): number {
  let n = todayClosed ? 1 : 0
  for (const c of [...cells].reverse()) {
    if (c.day >= today) continue
    if (closed(c)) n++
    else if (c.scheduled > 0) break
  }
  return n
}

// Semana de domingo a sábado (como o calendário do histórico), com a meta de dias fechados.
export function week(cells: DayCell[], today: string, todayClosed: boolean) {
  const start = addDays(today, -new Date(`${today}T00:00:00Z`).getUTCDay())
  const byDay = new Map(cells.map((c) => [c.day, c]))
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i)
    return { day, today: day === today, future: day > today, closed: day === today ? todayClosed : day < today && closed(byDay.get(day)) }
  })
  return { days, closed: days.filter((d) => d.closed).length, goal: WEEK_GOAL }
}

// Nível n começa em 50·n·(n−1) XP: 0, 100, 300, 600, 1000… (cada nível pede um pouco mais que o anterior).
const start = (n: number) => 50 * n * (n - 1)
export function level(xp: number) {
  let n = Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2))
  while (start(n + 1) <= xp) n++ // a raiz em ponto flutuante pode errar por um na borda
  while (n > 1 && start(n) > xp) n--
  return { level: n, into: xp - start(n), span: start(n + 1) - start(n) }
}
