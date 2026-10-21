import { describe, expect, it } from 'vitest'
import { calculateState, type Config } from './calculateState'

const h = (hh: number, mm = 0) => hh * 60 + mm
const cfg: Config = { sleepMin: h(23), warnMin: 15, urgentMin: 5 }
const stateOf = (r: ReturnType<typeof calculateState>, id: string) => r.states.find((s) => s.id === id)!

describe('calculateState', () => {
  it('1 habit of 30 min: deadline 22:30, attention at 22:15', () => {
    const items = [{ id: 'reading', durationMin: 30 }]
    expect(stateOf(calculateState(items, h(22, 14), cfg), 'reading').level).toBe('normal')
    const r = calculateState(items, h(22, 15), cfg)
    expect(stateOf(r, 'reading')).toMatchObject({ deadlineMin: h(22, 30), level: 'attention' })
  })

  it('2 habits of 30 min: deadlines 22:00 and 22:30, alerts 21:45 and 22:15', () => {
    const items = [{ id: 'a', durationMin: 30 }, { id: 'b', durationMin: 30 }]
    const r = calculateState(items, h(21, 45), cfg)
    expect(r.states.map((s) => s.deadlineMin).sort()).toEqual([h(22), h(22, 30)])
    expect(r.states.filter((s) => s.level === 'attention')).toHaveLength(1)
  })

  it('levels: urgent and overdue; per-habit limits override the default', () => {
    const items = [{ id: 'a', durationMin: 30, warnMin: 60 }]
    expect(stateOf(calculateState(items, h(21, 30), cfg), 'a').level).toBe('attention') // 60 min antes
    expect(stateOf(calculateState(items, h(22, 26), cfg), 'a').level).toBe('urgent')
    expect(stateOf(calculateState(items, h(22, 31), cfg), 'a').level).toBe('overdue')
  })

  it('fixed keeps its time and flexible dodges the block', () => {
    const items = [
      { id: 'fixed', durationMin: 60, fixedMin: h(22) }, // 22:00-23:00
      { id: 'flex', durationMin: 30 },
    ]
    const r = calculateState(items, h(18), cfg)
    expect(stateOf(r, 'fixed').deadlineMin).toBe(h(22))
    expect(stateOf(r, 'flex').deadlineMin).toBe(h(21, 30))
  })

  it('deficit: not everything fits and suggests skipping a non-essential', () => {
    const items = [
      { id: 'a', durationMin: 30, essential: true },
      { id: 'b', durationMin: 30 },
      { id: 'c', durationMin: 30 },
    ]
    const r = calculateState(items, h(21, 45), cfg) // 75 min restantes para 90 min
    expect(r.deficitMin).toBe(15)
    expect(['b', 'c']).toContain(r.suggestSkip)
    expect(calculateState(items, h(21, 30), cfg).deficitMin).toBe(0)
  })

  it('no items: no deficit', () => {
    expect(calculateState([], h(12), cfg)).toEqual({ states: [], deficitMin: 0, suggestSkip: undefined })
  })
})
