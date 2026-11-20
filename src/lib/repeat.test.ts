import { describe, expect, it } from 'vitest'
import { repeatStates } from '../../supabase/functions/_shared/repeat'
import { isPending, toCalcItems, type CompletionRow, type ItemRow } from '../../supabase/functions/_shared/pending'
import { runTick, type TickProfile } from '../../supabase/functions/_shared/runTick'
import { localTime } from '../../supabase/functions/_shared/time'

// Colírio: 5x, a cada 2h, primeiro aviso às 09:30. Rotina 07:00–23:00 em São Paulo; 21/10/2026 é quarta.
const TZ = 'America/Sao_Paulo'
const cfg = { tz: TZ, wakeMin: 7 * 60, sleepMin: 23 * 60 }
const profile: TickProfile = { wake_time: '07:00', sleep_time: '23:00', tz: TZ, warn_min: 30, urgent_min: 10 }
const sp = (hh: number, mm: number) => new Date(Date.UTC(2026, 9, 21, hh + 3, mm))
const drops = (over: Partial<ItemRow> = {}): ItemRow => ({
  id: 'c', kind: 'habit', name: 'Colírio', duration_min: 1, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null,
  essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-01-01T00:00:00Z',
  times_per_day: 5, interval_min: 120, repeat_from: '09:30:00', ...over,
})
const doses = (...at: [number, number][]): CompletionRow => ({
  item_id: 'c', day: '2026-10-21', done: false, skipped: false, spent_min: 0, timer_started_at: null, timer_accum_s: 0,
  done_times: at.map(([h, m]) => sp(h, m).toISOString()),
})
const state = (at: Date, c: CompletionRow[] = [], item = drops()) => repeatStates([item], c, localTime(at, TZ), cfg)[0]

describe('repeatState', () => {
  it('first reminder at repeat_from, or at wake time without it', () => {
    expect(state(sp(9, 29))).toMatchObject({ level: 'normal', deadlineMin: 570, count: 0, target: 5, due: false })
    expect(state(sp(9, 30))).toMatchObject({ level: 'attention', due: true })
    expect(state(sp(7, 0), [], drops({ repeat_from: null }))).toMatchObject({ deadlineMin: 420, due: true })
  })
  it('next one is the last time + the interval, even if taken before the reminder', () => {
    expect(state(sp(10, 0), [doses([8, 30])])).toMatchObject({ deadlineMin: 630, due: false, count: 1 }) // 10:30
    expect(state(sp(11, 40), [doses([9, 40])])).toMatchObject({ level: 'attention', deadlineMin: 700 })
  })
  it('the interval never shrinks: overdue once the goal no longer fits before sleeping', () => {
    // 2 de 5, última às 15:00: dá para fazer até 19:00 (19, 21, 23 cai na hora de dormir).
    expect(state(sp(18, 59), [doses([13, 0], [15, 0])])).toMatchObject({ level: 'attention', fits: true })
    expect(state(sp(19, 0), [doses([13, 0], [15, 0])])).toMatchObject({ level: 'overdue', fits: false })
    // Registrada às 19:00, a próxima é 21:00 e a meta já não cabe, mesmo sem estar na hora.
    expect(state(sp(19, 1), [doses([17, 0], [19, 0])])).toMatchObject({ level: 'overdue', due: false, deadlineMin: 21 * 60 })
  })
  it('goal reached, skipped, ended or not today: no state', () => {
    expect(state(sp(12, 0), [{ ...doses([9, 0]), done: true }])).toBeUndefined()
    expect(state(sp(12, 0), [{ ...doses(), skipped: true }])).toBeUndefined()
    expect(state(sp(12, 0), [], drops({ ends_on: '2026-10-20' }))).toBeUndefined()
    expect(state(sp(12, 0), [], drops({ ends_on: '2026-10-21' }))).toBeDefined() // o último dia ainda vale
    expect(state(sp(12, 0), [], drops({ weekdays: [1, 2] }))).toBeUndefined()
  })
  it('stays out of the time stack (no duration)', () => {
    const now = localTime(sp(12, 0), TZ)
    expect(isPending(drops(), [], now)).toBe(true)
    expect(toCalcItems([drops()], [], now, sp(12, 0).getTime())).toEqual([])
  })
})

describe('runTick with a repeated item', () => {
  it('one reminder per time, never repeated when ignored', () => {
    const [p] = runTick(profile, [drops()], [], new Set(), sp(9, 30))
    expect(p).toMatchObject({ itemId: 'c', level: 'dose', keys: ['dose-1'], title: '💊 Colírio · 1ª de 5', body: 'Feita agora, a próxima fica para 11:30.' })
    expect(runTick(profile, [drops()], [], new Set(['c:2026-10-21:dose-1']), sp(10, 30))).toEqual([])
  })
  it('custom emoji, and the last time of the day', () => {
    const c = doses([9, 0], [11, 0], [13, 0], [15, 0])
    const [p] = runTick(profile, [drops({ emoji: '💧' })], [c], new Set(), sp(17, 0))
    expect(p).toMatchObject({ title: '💧 Colírio · 5ª de 5', body: 'É a última de hoje.' })
  })
  it('ignored until the goal stops fitting: a single overdue push', () => {
    const c = [doses([13, 0], [15, 0])]
    const sent = new Set(['c:2026-10-21:dose-3'])
    expect(runTick(profile, [drops()], c, sent, sp(18, 59))).toEqual([])
    const [p] = runTick(profile, [drops()], c, sent, sp(19, 0))
    expect(p).toMatchObject({ level: 'overdue', keys: ['overdue'], body: 'Não dá mais para chegar a 5 hoje (2 de 5).' })
    sent.add('c:2026-10-21:overdue')
    expect(runTick(profile, [drops()], c, sent, sp(19, 30))).toEqual([])
  })
  it('a time that is due when the goal no longer fits says so and also counts as the overdue push', () => {
    const [p] = runTick(profile, [drops()], [doses([17, 0], [19, 0])], new Set(), sp(21, 0))
    expect(p).toMatchObject({ level: 'dose', keys: ['dose-3', 'overdue'] })
    expect(p!.body).toBe('Não dá mais para chegar a 5 hoje. Depois desta, não cabe outra hoje.')
    // Esperando o intervalo com a meta perdida: só o card mostra, sem push.
    expect(runTick(profile, [drops()], [doses([17, 0], [19, 0])], new Set(), sp(19, 5))).toEqual([])
  })
  it('snooze: silent until it expires, then one reminder of the same time', () => {
    const until = sp(11, 40).toISOString()
    const c = { ...doses([9, 30]), snoozed_until: until }
    const sent = new Set(['c:2026-10-21:dose-2'])
    expect(runTick(profile, [drops()], [c], sent, sp(11, 35))).toEqual([])
    expect(runTick(profile, [drops()], [c], sent, sp(11, 40))[0]).toMatchObject({ level: 'dose', title: '💊 Colírio · 2ª de 5', snooze: { until } })
  })
})
