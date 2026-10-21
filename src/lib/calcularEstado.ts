// Função pura compartilhada pela UI e pela Edge Function `tick` (sem imports de Vue/Supabase).
// Todos os horários são minutos desde 00:00 no fuso do perfil.
export type Nivel = 'normal' | 'atencao' | 'urgente' | 'atrasado'

export interface Item {
  id: string
  duracaoMin: number // tempo restante (já descontado o timer)
  fixoMin?: number // horário fixo; sem ele o item é flexível
  essencial?: boolean
  warnMin?: number
  urgentMin?: number
}

export interface Config {
  dormirMin: number
  warnMin: number
  urgentMin: number
}

export interface Estado {
  id: string
  limiteMin: number // último momento para começar
  minutosAteLimite: number
  nivel: Nivel
}

export interface Resultado {
  estados: Estado[]
  deficitMin: number // quanto falta de tempo para caber tudo antes de dormir
  sugerirPular?: string // item não essencial candidato a ficar de fora
}

export function calcularEstado(itens: Item[], agoraMin: number, cfg: Config): Resultado {
  const fixos = itens.filter((i) => i.fixoMin !== undefined)
  // Flexíveis: essenciais primeiro, ficam com os slots mais cedo (mais urgentes). sort é estável.
  const flex = itens.filter((i) => i.fixoMin === undefined).sort((a, b) => +!!b.essencial - +!!a.essencial)

  const limites = new Map<string, number>(fixos.map((i) => [i.id, i.fixoMin!]))
  const blocos = fixos.map((i) => [i.fixoMin!, i.fixoMin! + i.duracaoMin]).sort((a, b) => b[0]! - a[0]!)

  // Empilha de trás pra frente a partir da hora de dormir, desviando dos blocos fixos.
  let cursor = cfg.dormirMin
  for (const i of [...flex].reverse()) {
    let ini = cursor - i.duracaoMin
    for (const [bIni, bFim] of blocos) {
      if (ini < bFim! && cursor > bIni!) {
        cursor = bIni!
        ini = cursor - i.duracaoMin
      }
    }
    limites.set(i.id, ini)
    cursor = ini
  }

  const estados = itens.map((i): Estado => {
    const limiteMin = limites.get(i.id)!
    const delta = limiteMin - agoraMin
    const nivel: Nivel =
      delta < 0 ? 'atrasado'
      : delta <= (i.urgentMin ?? cfg.urgentMin) ? 'urgente'
      : delta <= (i.warnMin ?? cfg.warnMin) ? 'atencao'
      : 'normal'
    return { id: i.id, limiteMin, minutosAteLimite: delta, nivel }
  })

  const primeiro = Math.min(...flex.map((i) => limites.get(i.id)!))
  const deficitMin = flex.length ? Math.max(0, agoraMin - primeiro) : 0
  const candidatos = flex.filter((i) => !i.essencial).sort((a, b) => a.duracaoMin - b.duracaoMin)
  const sugerirPular = deficitMin
    ? (candidatos.find((i) => i.duracaoMin >= deficitMin) ?? candidatos.at(-1))?.id
    : undefined

  return { estados, deficitMin, sugerirPular }
}
