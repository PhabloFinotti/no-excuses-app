import { describe, expect, it } from 'vitest'
import { eventFromTask } from '../../supabase/functions/_shared/calendarEvent'
import { signState, verifyState } from '../../supabase/functions/_shared/oauthState'

const task = { name: 'Pagar a conta', due_date: '2026-10-21', fixed_time: null, duration_min: 20 }

describe('eventFromTask', () => {
  it('all-day event for a task without a time (exclusive end)', () => {
    expect(eventFromTask(task, 'America/Sao_Paulo', false)).toMatchObject({ summary: 'Pagar a conta', start: { date: '2026-10-21' }, end: { date: '2026-10-22' } })
  })
  it('timed event in the profile timezone; crossing midnight and month end', () => {
    const e = eventFromTask({ ...task, due_date: '2026-10-31', fixed_time: '23:30:00', duration_min: 60 }, 'America/Sao_Paulo', false)
    expect(e.start).toEqual({ dateTime: '2026-10-31T23:30:00', timeZone: 'America/Sao_Paulo' })
    expect(e.end).toEqual({ dateTime: '2026-11-01T00:30:00', timeZone: 'America/Sao_Paulo' })
  })
  it('done tasks get a check mark and a muted color', () => {
    expect(eventFromTask(task, 'UTC', true)).toMatchObject({ summary: '✓ Pagar a conta', colorId: '8' })
    expect(eventFromTask(task, 'UTC', false).colorId).toBeUndefined()
  })
})

describe('oauth state', () => {
  const now = 1_000_000
  it('round-trips the user id', async () => {
    const s = await signState('user-1', 'secret', now)
    expect(await verifyState(s, 'secret', now + 1000)).toBe('user-1')
  })
  it('rejects tampering, a wrong secret, expiry and garbage', async () => {
    const s = await signState('user-1', 'secret', now)
    const [p, sig] = s.split('.')
    expect(await verifyState(`${p}x.${sig}`, 'secret', now)).toBeNull()
    expect(await verifyState(s, 'other', now)).toBeNull()
    expect(await verifyState(s, 'secret', now + 11 * 60_000)).toBeNull()
    expect(await verifyState('lixo', 'secret', now)).toBeNull()
    expect(await verifyState('', 'secret', now)).toBeNull()
  })
})
