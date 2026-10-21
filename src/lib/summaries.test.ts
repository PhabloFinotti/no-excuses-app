import { describe, expect, it } from 'vitest'
import { planSummaries, type SummaryProfile } from '../../supabase/functions/_shared/summaries'
import type { ItemRow } from '../../supabase/functions/_shared/pending'

const profile: SummaryProfile = { wake_time: '07:00', sleep_time: '23:00', tz: 'America/Sao_Paulo', warn_min: 30, urgent_min: 10 }
const item = (id: string, dur: number): ItemRow => ({
  id, kind: 'habit', name: id, duration_min: dur, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null,
  essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-01-01T00:00:00Z',
})
const sp = (hh: number, mm: number) => new Date(Date.UTC(2026, 9, 21, hh + 3, mm))
const items = [item('a', 30), item('b', 45)]

describe('planSummaries', () => {
  it('morning summary at wake time, once', () => {
    const [m] = planSummaries(profile, items, [], new Set(), sp(7, 0))
    expect(m).toMatchObject({ kind: 'morning', day: '2026-10-21', body: '2 itens, 1h15 no total.' })
    expect(planSummaries(profile, items, [], new Set(['2026-10-21:morning']), sp(7, 1))).toEqual([])
    expect(planSummaries(profile, items, [], new Set(), sp(6, 59))).toEqual([])
    expect(planSummaries(profile, items, [], new Set(), sp(9, 30)).filter((s) => s.kind === 'morning')).toEqual([])
  })
  it('evening summary in the last hour before sleeping', () => {
    expect(planSummaries(profile, items, [], new Set(), sp(21, 59))).toEqual([])
    const [e] = planSummaries(profile, items, [], new Set(), sp(22, 0))
    expect(e).toMatchObject({ kind: 'evening' })
    expect(e!.body).toContain('restam 1h00')
  })
  it('nothing pending or disabled: no summary', () => {
    expect(planSummaries(profile, [], [], new Set(), sp(7, 0))).toEqual([])
    expect(planSummaries({ ...profile, morning_summary: false }, items, [], new Set(), sp(7, 0))).toEqual([])
  })
})
