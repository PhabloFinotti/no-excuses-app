import { describe, expect, it } from 'vitest'
import { localTime, timeToMin } from '../../supabase/functions/_shared/time'
import { isPending, toCalcItems, type CompletionRow, type ItemRow } from '../../supabase/functions/_shared/pending'

const base = { duration_min: 30, fixed_time: null, essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-01-01T00:00:00Z' }
const habit = (over: Partial<ItemRow> = {}): ItemRow => ({ ...base, id: 'h', kind: 'habit', name: 'Reading', weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null, ...over })
const task = (over: Partial<ItemRow> = {}): ItemRow => ({ ...base, id: 't', kind: 'task', name: 'Pay bill', weekdays: [], due_date: '2026-10-20', ...over })
const completion = (over: Partial<CompletionRow>): CompletionRow => ({ item_id: 'h', day: '2026-10-21', done: false, skipped: false, spent_min: 0, timer_started_at: null, timer_accum_s: 0, ...over })

// 2026-10-21 é quarta; 22:30 em São Paulo (UTC-3) = 01:30Z do dia seguinte
const at = new Date('2026-10-22T01:30:00Z')
const now = localTime(at, 'America/Sao_Paulo')

describe('time', () => {
  it('uses the profile timezone, not the device one', () => {
    expect(now).toEqual({ day: '2026-10-21', minutes: 22 * 60 + 30, weekday: 3 })
    expect(timeToMin('07:05:00')).toBe(425)
  })
})

describe('isPending', () => {
  it('habit only on its weekdays', () => {
    expect(isPending(habit({ weekdays: [3] }), [], now)).toBe(true)
    expect(isPending(habit({ weekdays: [1, 2] }), [], now)).toBe(false)
  })
  it('done or skipped removes it from today', () => {
    expect(isPending(habit(), [completion({ done: true })], now)).toBe(false)
    expect(isPending(habit(), [completion({ skipped: true })], now)).toBe(false)
    expect(isPending(habit(), [completion({ day: '2026-10-20', done: true })], now)).toBe(true)
  })
  it('overdue task rolls over until done; future task is not due yet', () => {
    expect(isPending(task(), [], now)).toBe(true)
    expect(isPending(task(), [completion({ item_id: 't', day: '2026-10-20', done: true })], now)).toBe(false)
    expect(isPending(task({ due_date: '2026-10-22' }), [], now)).toBe(false)
  })
  it('archived is never pending', () => {
    expect(isPending(habit({ archived: true }), [], now)).toBe(false)
  })
})

describe('toCalcItems', () => {
  it('subtracts timer elapsed (paused + running) from the duration', () => {
    const c = completion({ timer_accum_s: 300, timer_started_at: new Date(at.getTime() - 600_000).toISOString() })
    const [item] = toCalcItems([habit()], [c], now, at.getTime())
    expect(item!.durationMin).toBe(15) // 30 - 5 - 10
  })
  it('fixed time becomes minutes', () => {
    const [item] = toCalcItems([habit({ fixed_time: '21:00:00' })], [], now, at.getTime())
    expect(item!.fixedMin).toBe(1260)
  })
})

describe('stale tasks', () => {
  it('task overdue > 3 days leaves the calculation but stays pending', async () => {
    const { isStale } = await import('../../supabase/functions/_shared/pending')
    const old = task({ due_date: '2026-10-17' }) // 4 dias antes de 21/10
    expect(isStale(old, '2026-10-21')).toBe(true)
    expect(isStale(task({ due_date: '2026-10-18' }), '2026-10-21')).toBe(false)
    expect(isPending(old, [], now)).toBe(true)
    expect(toCalcItems([old], [], now, at.getTime())).toEqual([])
  })
})

describe('finishMinutes', () => {
  it('uses the planned time when no timer ran (never records 0)', async () => {
    const { finishMinutes } = await import('../../supabase/functions/_shared/pending')
    expect(finishMinutes(undefined, 35, at.getTime())).toEqual({ minutes: 35, source: 'planned' })
    expect(finishMinutes(completion({ timer_accum_s: 40 }), 35, at.getTime())).toEqual({ minutes: 35, source: 'planned' }) // < 1 min
  })
  it('uses the timer once it passes one minute (paused + running)', async () => {
    const { finishMinutes } = await import('../../supabase/functions/_shared/pending')
    const c = completion({ timer_accum_s: 600, timer_started_at: new Date(at.getTime() - 900_000).toISOString() })
    expect(finishMinutes(c, 35, at.getTime())).toEqual({ minutes: 25, source: 'timer' })
  })
})

describe('task completion lives on the day it was done (rolled-over tasks)', () => {
  it('findCompletion for a task ignores the day; for a habit only today counts', async () => {
    const { findCompletion } = await import('../../supabase/functions/_shared/pending')
    const old = completion({ item_id: 't', day: '2026-10-20', timer_accum_s: 120 })
    const newer = completion({ item_id: 't', day: '2026-10-21', done: true })
    expect(findCompletion(task(), [old], '2026-10-21')).toBe(old)
    expect(findCompletion(task(), [old, newer], '2026-10-22')).toBe(newer) // a mais recente
    expect(findCompletion(habit(), [completion({ day: '2026-10-20' })], '2026-10-21')).toBeUndefined()
  })
  it('overdue task done today stops being pending even though it was due yesterday', () => {
    const done = completion({ item_id: 't', day: '2026-10-21', done: true }) // gravada em hoje
    expect(isPending(task({ due_date: '2026-10-19' }), [done], now)).toBe(false)
  })
})
