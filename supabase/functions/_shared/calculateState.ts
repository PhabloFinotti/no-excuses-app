// Função pura compartilhada pela UI e pela Edge Function `tick` (sem imports de Vue/Supabase).
// Todos os horários são minutos desde 00:00 no fuso do perfil.
export type Level = 'normal' | 'attention' | 'urgent' | 'overdue'

export interface Item {
  id: string
  durationMin: number // tempo restante (já descontado o timer)
  fixedMin?: number // horário fixo; sem ele o item é flexível
  essential?: boolean
  warnMin?: number
  urgentMin?: number
}

export interface Config {
  sleepMin: number
  warnMin: number
  urgentMin: number
  graceMin?: number // tolerância após o horário de um item fixo antes de virar 'overdue'
}

export interface ItemState {
  id: string
  deadlineMin: number // último momento para começar
  minutesUntilDeadline: number
  level: Level
}

export interface Result {
  states: ItemState[]
  deficitMin: number // quanto falta de tempo para caber tudo antes de dormir
  suggestSkip?: string // primeiro candidato a ficar de fora (atalho de suggestSkips[0])
  suggestSkips: string[] // itens não essenciais que, pulados, devolvem o horário de dormir
  unavoidableMin: number // déficit que sobra mesmo pulando todos os candidatos (essenciais e fixos não cabem)
}

export function calculateState(items: Item[], nowMin: number, cfg: Config): Result {
  const fixed = items.filter((i) => i.fixedMin !== undefined)
  // Flexíveis: essenciais primeiro, ficam com os slots mais cedo (mais urgentes). sort é estável.
  const flex = items.filter((i) => i.fixedMin === undefined).sort((a, b) => +!!b.essential - +!!a.essential)

  const deadlines = new Map<string, number>(fixed.map((i) => [i.id, i.fixedMin!]))
  const blocks = fixed.map((i) => [i.fixedMin!, i.fixedMin! + i.durationMin]).sort((a, b) => b[0]! - a[0]!)

  // Empilha de trás pra frente a partir da hora de dormir, desviando dos blocos fixos.
  let cursor = cfg.sleepMin
  for (const i of [...flex].reverse()) {
    let start = cursor - i.durationMin
    for (const [blockStart, blockEnd] of blocks) {
      if (start < blockEnd! && cursor > blockStart!) {
        cursor = blockStart!
        start = cursor - i.durationMin
      }
    }
    deadlines.set(i.id, start)
    cursor = start
  }

  const states = items.map((i): ItemState => {
    const deadlineMin = deadlines.get(i.id)!
    const delta = deadlineMin - nowMin
    const level: Level =
      delta < -(i.fixedMin !== undefined ? (cfg.graceMin ?? 0) : 0) ? 'overdue'
      : delta <= (i.urgentMin ?? cfg.urgentMin) ? 'urgent'
      : delta <= (i.warnMin ?? cfg.warnMin) ? 'attention'
      : 'normal'
    return { id: i.id, deadlineMin, minutesUntilDeadline: delta, level }
  })

  const earliest = Math.min(...flex.map((i) => deadlines.get(i.id)!))
  const deficitMin = flex.length ? Math.max(0, nowMin - earliest) : 0
  const candidates = flex.filter((i) => !i.essential).sort((a, b) => a.durationMin - b.durationMin)
  // Um item que cobre o déficit sozinho vence; senão, tira os maiores até caber.
  const single = candidates.find((i) => i.durationMin >= deficitMin)
  const suggestSkips: string[] = []
  let left = deficitMin
  if (deficitMin && single) suggestSkips.push(single.id)
  else
    for (const i of [...candidates].reverse()) {
      if (left <= 0) break
      suggestSkips.push(i.id)
      left -= i.durationMin
    }
  const unavoidableMin = deficitMin ? Math.max(0, left) : 0

  return { states, deficitMin, suggestSkip: suggestSkips[0], suggestSkips, unavoidableMin }
}
