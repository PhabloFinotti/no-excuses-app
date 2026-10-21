import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
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
})
