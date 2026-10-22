import { describe, expect, it } from 'vitest'
import { computeCategoryStats, computeHabitDetail, computeStats, percentile } from './stats'
import type { CompletionRow, ItemRow } from '../../supabase/functions/_shared/pending'

const habit: ItemRow = { id: 'h', kind: 'habit', name: 'Reading', duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null, essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-10-01T00:00:00Z' }
const done = (day: string, spent = 20): CompletionRow => ({ item_id: 'h', day, done: true, skipped: false, spent_min: spent, timer_started_at: null, timer_accum_s: 0 })

describe('computeStats', () => {
  it('rate, average time and streak; today in progress does not break the streak', () => {
    const c = [done('2026-10-18'), done('2026-10-19', 40), done('2026-10-20')] // 21 (hoje) ainda pendente
    const { habitStats } = computeStats([habit], c, '2026-10-21')
    expect(habitStats[0]).toMatchObject({ done: 3, streak: 3, avgSpentMin: 27 })
    // 01..20/10 = 20 dias agendados, 3 feitos
    expect(habitStats[0]!.scheduled).toBe(20)
  })
  it('a missed day breaks the streak', () => {
    const { habitStats } = computeStats([habit], [done('2026-10-18'), done('2026-10-20')], '2026-10-21')
    expect(habitStats[0]!.streak).toBe(1)
  })
  it('only counts days the habit is scheduled', () => {
    const wed = { ...habit, weekdays: [3] } // 21/10/2026 é quarta
    const { habitStats } = computeStats([wed], [done('2026-10-21')], '2026-10-21')
    expect(habitStats[0]).toMatchObject({ scheduled: 3, done: 1, streak: 1 }) // quartas 07, 14 e 21/10
  })
  it('suggests a new duration only with 3+ samples and a >= 25% gap', () => {
    const two = computeStats([habit], [done('2026-10-19', 50), done('2026-10-20', 50)], '2026-10-21').habitStats[0]!
    expect(two.suggestedDurationMin).toBeUndefined()
    const three = computeStats([habit], [done('2026-10-18', 50), done('2026-10-19', 50), done('2026-10-20', 52)], '2026-10-21').habitStats[0]!
    expect(three.suggestedDurationMin).toBe(50) // planejado 30
    const close = computeStats([habit], [done('2026-10-18', 32), done('2026-10-19', 33), done('2026-10-20', 31)], '2026-10-21').habitStats[0]!
    expect(close.suggestedDurationMin).toBeUndefined()
  })

  it('daily series: moving average needs a full 7-day window; weekday averages and best day', () => {
    const c = [done('2026-10-15'), done('2026-10-16'), done('2026-10-17'), done('2026-10-18'), done('2026-10-19'), done('2026-10-20'), done('2026-10-21')]
    const r = computeStats([habit], c, '2026-10-21', 10)
    expect(r.cells).toHaveLength(10)
    expect(r.average7.slice(0, 6).every((v) => v === null)).toBe(true)
    expect(r.average7[9]).toBe(1) // 1 feito por dia nos últimos 7
    expect(r.average7[8]).toBeCloseTo(6 / 7)
    expect(r.total).toBe(7)
    expect(r.best.done).toBe(1)
    expect(r.weekdayAvg).toHaveLength(7)
    expect(Math.max(...r.weekdayAvg)).toBe(1)
  })

  it('days before the first item do not enter the series', () => {
    const r = computeStats([habit], [], '2026-10-21', 90) // hábito criado em 01/10
    expect(r.cells).toHaveLength(21)
    expect(r.cells[0]!.day).toBe('2026-10-01')
  })

  it('time recorded as "planned" does not feed the average or the duration suggestion', () => {
    const planned = (day: string): CompletionRow => ({ ...done(day, 30), time_source: 'planned' })
    const r = computeStats([habit], [planned('2026-10-18'), planned('2026-10-19'), planned('2026-10-20')], '2026-10-21').habitStats[0]!
    expect(r.avgSpentMin).toBe(0)
    expect(r.suggestedDurationMin).toBeUndefined()
  })

  it('minutes per day sum the recorded time of done items', () => {
    const r = computeStats([habit], [done('2026-10-20', 35), done('2026-10-21', 40)], '2026-10-21', 3)
    expect(r.cells.map((c) => c.minutes)).toEqual([0, 35, 40])
    expect(r.totalMinutes).toBe(75)
  })
})

describe('computeHabitDetail', () => {
  const wed = { ...habit, weekdays: [3] } // quartas: 07, 14 e 21/10/2026
  it('counts only scheduled days; today pending is not a miss', () => {
    const d = computeHabitDetail(wed, [done('2026-10-07'), done('2026-10-14')], '2026-10-21')
    expect(d.counted).toBe(2)
    expect(d.rate).toBe(1)
    expect(d.streak).toBe(2) // hoje (quarta) ainda pendente não quebra
    expect(d.cells.find((c) => c.day === '2026-10-21')).toMatchObject({ scheduled: true, counted: false, done: false })
  })
  it('best streak survives a later miss; current streak resets', () => {
    const c = [done('2026-10-01'), done('2026-10-02'), done('2026-10-03'), done('2026-10-05')]
    const d = computeHabitDetail(habit, c, '2026-10-07')
    expect(d.bestStreak).toBe(3)
    expect(d.streak).toBe(0) // 06/10 sem feito quebra a atual
  })
  it('time: total includes planned, average ignores it; weekday rate per weekday', () => {
    const c = [done('2026-10-20', 40), { ...done('2026-10-19', 35), time_source: 'planned' as const }]
    const d = computeHabitDetail(habit, c, '2026-10-21', 7)
    expect(d.totalMinutes).toBe(75)
    expect(d.avgMinutes).toBe(40)
    expect(d.timedSamples).toBe(1)
    expect(d.weekdayRate).toHaveLength(7)
    expect(d.weekdayRate[2]).toBe(100) // terça 20/10 feita
  })
})

describe('percentile', () => {
  it('uses nearest rank over the measured values', () => {
    expect(percentile([], 80)).toBe(0)
    expect(percentile([20, 25, 30, 40, 60], 50)).toBe(30)
    expect(percentile([20, 25, 30, 40, 60], 80)).toBe(40)
    expect(percentile([45], 80)).toBe(45)
  })
})

describe('archived habits and categories', () => {
  const pages = { ...habit, id: 'p', name: 'Ler 10 páginas' }
  const book = { ...habit, id: 'b', name: 'Ler livro tal' }
  const rows = (id: string, days: string[]) => days.map((day): CompletionRow => ({ ...done(day), item_id: id }))

  it('an archived habit stops counting as scheduled after the day it was archived', () => {
    const old = { ...habit, archived: true, archived_at: '2026-10-10T12:00:00Z' }
    const s = computeStats([old], [], '2026-10-21').habitStats[0]!
    expect(s.scheduled).toBe(9) // 01..09/10; o dia do arquivamento não conta como falha
  })

  it('groups habits of the same category: a day counts if any of them was done', () => {
    const c = [...rows('p', ['2026-10-18', '2026-10-19']), ...rows('b', ['2026-10-19', '2026-10-20'])]
    const [reading] = computeCategoryStats([pages, book], c, '2026-10-21')
    expect(reading).toMatchObject({ key: 'reading', itemCount: 2, activeDays: 3, streak: 3, done: 4 })
  })

  it('keeps the history of an archived item in its category', () => {
    const gone = { ...pages, archived: true, archived_at: '2026-10-19T00:00:00Z' }
    const [reading] = computeCategoryStats([gone, book], [...rows('p', ['2026-10-17']), ...rows('b', ['2026-10-18'])], '2026-10-21')
    expect(reading).toMatchObject({ itemCount: 1, activeDays: 2 })
  })

  it('items without a category do not show up', () => {
    expect(computeCategoryStats([{ ...habit, name: 'Xablau' }], [], '2026-10-21')).toEqual([])
  })
})
