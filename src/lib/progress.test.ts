import { describe, expect, it } from 'vitest'
import { level, streak, week } from './progress'
import type { DayCell } from './stats'

const cell = (day: string, scheduled: number, done: number): DayCell => ({ day, scheduled, done, minutes: 0 })
// 21/10/2026 é quarta: a semana vai de domingo 18 a sábado 24.
const cells = [cell('2026-10-16', 3, 1), cell('2026-10-17', 0, 0), cell('2026-10-18', 2, 2), cell('2026-10-19', 2, 2), cell('2026-10-20', 3, 3), cell('2026-10-21', 1, 1)]

describe('streak', () => {
  it('counts closed days back from yesterday; today only when its list is done', () => {
    expect(streak(cells, '2026-10-21', false)).toBe(3) // 18, 19, 20
    expect(streak(cells, '2026-10-21', true)).toBe(4)
  })
  it('a day with nothing scheduled neither counts nor breaks; a partial day breaks', () => {
    expect(streak([cell('2026-10-19', 2, 2), cell('2026-10-20', 0, 0)], '2026-10-21', false)).toBe(1)
    expect(streak([cell('2026-10-19', 2, 2), cell('2026-10-20', 2, 1)], '2026-10-21', false)).toBe(0)
  })
})

describe('week', () => {
  it('sunday to saturday, future days open, goal of 5', () => {
    const w = week(cells, '2026-10-21', false)
    expect(w.days.map((d) => d.day)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'])
    expect(w.days.map((d) => d.closed)).toEqual([true, true, true, false, false, false, false])
    expect(w).toMatchObject({ closed: 3, goal: 5 })
    expect(w.days[3]).toMatchObject({ today: true })
    expect(week(cells, '2026-10-21', true).closed).toBe(4)
  })
})

describe('level', () => {
  it('starts at 1 and each level asks a bit more XP', () => {
    expect(level(0)).toEqual({ level: 1, into: 0, span: 100 })
    expect(level(99).level).toBe(1)
    expect(level(100)).toEqual({ level: 2, into: 0, span: 200 })
    expect(level(299).level).toBe(2)
    expect(level(620)).toEqual({ level: 4, into: 20, span: 400 })
  })
})
