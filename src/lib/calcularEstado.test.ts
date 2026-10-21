import { describe, expect, it } from 'vitest'
import { calcularEstado, type Config } from './calcularEstado'

const h = (hh: number, mm = 0) => hh * 60 + mm
const cfg: Config = { dormirMin: h(23), warnMin: 15, urgentMin: 5 }
const nivel = (r: ReturnType<typeof calcularEstado>, id: string) => r.estados.find((e) => e.id === id)!

describe('calcularEstado', () => {
  it('1 hábito de 30 min: limite 22:30, atenção às 22:15', () => {
    const itens = [{ id: 'leitura', duracaoMin: 30 }]
    expect(nivel(calcularEstado(itens, h(22, 14), cfg), 'leitura').nivel).toBe('normal')
    const r = calcularEstado(itens, h(22, 15), cfg)
    expect(nivel(r, 'leitura')).toMatchObject({ limiteMin: h(22, 30), nivel: 'atencao' })
  })

  it('2 hábitos de 30 min: limites 22:00 e 22:30, alertas 21:45 e 22:15', () => {
    const itens = [{ id: 'a', duracaoMin: 30 }, { id: 'b', duracaoMin: 30 }]
    const r = calcularEstado(itens, h(21, 45), cfg)
    expect(r.estados.map((e) => e.limiteMin).sort()).toEqual([h(22), h(22, 30)])
    expect(r.estados.filter((e) => e.nivel === 'atencao')).toHaveLength(1)
  })

  it('níveis: urgente e atrasado; limites por hábito sobrescrevem o padrão', () => {
    const itens = [{ id: 'a', duracaoMin: 30, warnMin: 60 }]
    expect(nivel(calcularEstado(itens, h(21, 30), cfg), 'a').nivel).toBe('atencao') // 60 min antes
    expect(nivel(calcularEstado(itens, h(22, 26), cfg), 'a').nivel).toBe('urgente')
    expect(nivel(calcularEstado(itens, h(22, 31), cfg), 'a').nivel).toBe('atrasado')
  })

  it('fixo mantém o horário e o flexível desvia do bloco', () => {
    const itens = [
      { id: 'fixo', duracaoMin: 60, fixoMin: h(22) }, // 22:00-23:00
      { id: 'flex', duracaoMin: 30 },
    ]
    const r = calcularEstado(itens, h(18), cfg)
    expect(nivel(r, 'fixo').limiteMin).toBe(h(22))
    expect(nivel(r, 'flex').limiteMin).toBe(h(21, 30))
  })

  it('déficit: não cabe tudo e sugere pular não essencial', () => {
    const itens = [
      { id: 'a', duracaoMin: 30, essencial: true },
      { id: 'b', duracaoMin: 30 },
      { id: 'c', duracaoMin: 30 },
    ]
    const r = calcularEstado(itens, h(21, 45), cfg) // 75 min restantes para 90 min
    expect(r.deficitMin).toBe(15)
    expect(['b', 'c']).toContain(r.sugerirPular)
    expect(calcularEstado(itens, h(21, 30), cfg).deficitMin).toBe(0)
  })

  it('sem itens: sem déficit', () => {
    expect(calcularEstado([], h(12), cfg)).toEqual({ estados: [], deficitMin: 0, sugerirPular: undefined })
  })
})
