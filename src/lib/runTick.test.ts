import { describe, expect, it } from 'vitest'
import { runTick, type TickProfile } from '../../supabase/functions/_shared/runTick'
import type { CompletionRow, ItemRow } from '../../supabase/functions/_shared/pending'

const profile: TickProfile = { wake_time: '07:00', sleep_time: '23:00', tz: 'America/Sao_Paulo', warn_min: 30, urgent_min: 10 }
const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  id: 'h', kind: 'habit', name: 'Leitura', duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null,
  essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-01-01T00:00:00Z', ...over,
})
const sp = (hh: number, mm: number) => new Date(Date.UTC(2026, 9, 21, hh + 3, mm)) // 21/10/2026 hh:mm em SP

describe('runTick', () => {
  it('nothing before the attention window', () => {
    expect(runTick(profile, [item()], [], new Set(), sp(21, 59))).toEqual([]) // limite 22:30, atenção 22:00
  })
  it('sends one level at a time and never repeats it', () => {
    const [a] = runTick(profile, [item()], [], new Set(), sp(22, 0))
    expect(a).toMatchObject({ itemId: 'h', level: 'attention', day: '2026-10-21' })
    expect(runTick(profile, [item()], [], new Set(['h:2026-10-21:attention']), sp(22, 1))).toEqual([])
    expect(runTick(profile, [item()], [], new Set(['h:2026-10-21:attention']), sp(22, 20))[0]!.level).toBe('urgent')
    expect(runTick(profile, [item()], [], new Set(), sp(22, 31))[0]!.level).toBe('overdue')
  })
  it('missed intermediate level: only the current one is sent', () => {
    expect(runTick(profile, [item()], [], new Set(), sp(22, 25)).map((p) => p.level)).toEqual(['urgent'])
  })
  it('silent outside the awake window', () => {
    const late = { ...profile, sleep_time: '22:00' }
    expect(runTick(late, [item()], [], new Set(), sp(22, 5))).toEqual([])
    expect(runTick(profile, [item({ fixed_time: '07:10' })], [], new Set(), sp(6, 50))).toEqual([])
  })
  it('done habit and rolled task', () => {
    const done: CompletionRow = { item_id: 'h', day: '2026-10-21', done: true, skipped: false, spent_min: 30, timer_started_at: null, timer_accum_s: 0 }
    expect(runTick(profile, [item()], [done], new Set(), sp(22, 31))).toEqual([])
    const task = item({ id: 't', kind: 'task', weekdays: [], due_date: '2026-10-20' })
    expect(runTick(profile, [task], [], new Set(), sp(22, 31))[0]).toMatchObject({ itemId: 't', level: 'overdue' })
  })
  it('fixed item respects the grace period', () => {
    const fixed = item({ fixed_time: '20:00:00' })
    const g = { ...profile, fixed_grace_min: 15 }
    expect(runTick(g, [fixed], [], new Set(), sp(20, 10))[0]!.level).toBe('urgent') // dentro da tolerância
    expect(runTick(g, [fixed], [], new Set(), sp(20, 16))[0]!.level).toBe('overdue')
  })
})
