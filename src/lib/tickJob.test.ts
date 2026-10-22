import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDb } from './demo'
import { runTickJob, type Send } from '../../supabase/functions/_shared/tickJob'

const sp = (hh: number, mm: number) => new Date(Date.UTC(2026, 9, 21, hh + 3, mm)) // 21/10/2026 hh:mm em São Paulo
// Sem resumos: estes testes olham só os alertas de nível.
const profile = (user_id: string, tz = 'America/Sao_Paulo') => ({ user_id, wake_time: '07:00', sleep_time: '23:00', tz, warn_min: 30, urgent_min: 10, fixed_grace_min: 15, morning_summary: false, evening_summary: false })
const habit = (user_id: string) => ({
  id: `h-${user_id}`, user_id, kind: 'habit', name: 'Leitura', duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6], due_date: null,
  essential: false, warn_min: null, urgent_min: null, archived: false, created_at: '2026-01-01T00:00:00Z',
})
const tables = (profiles: ReturnType<typeof profile>[]) => ({
  profiles, items: profiles.map((p) => habit(p.user_id)), item_completions: [], notification_log: [], summary_log: [],
})

describe('runTickJob', () => {
  let send: ReturnType<typeof vi.fn<Send>>
  beforeEach(() => { send = vi.fn<Send>(async () => ({ sent: 1, attempted: 1 })) })

  it('sends a level once and records it', async () => {
    const db = tables([profile('u1')])
    await runTickJob(fakeDb(db), send, sp(22, 31)) // limite 22:30 -> atrasado
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]![1]).toMatchObject({ level: 'overdue', itemId: 'h-u1' })
    expect(db.notification_log).toHaveLength(1)
    await runTickJob(fakeDb(db), send, sp(22, 32))
    expect(send).toHaveBeenCalledTimes(1) // não repete
  })

  it('a failed delivery on every device is retried the next minute', async () => {
    const db = tables([profile('u1')])
    send.mockResolvedValueOnce({ sent: 0, attempted: 1 })
    await runTickJob(fakeDb(db), send, sp(22, 31))
    expect(db.notification_log).toHaveLength(0) // registro liberado
    await runTickJob(fakeDb(db), send, sp(22, 32))
    expect(send).toHaveBeenCalledTimes(2)
    expect(db.notification_log).toHaveLength(1)
  })

  it('no registered device: nothing to retry, the level stays recorded', async () => {
    const db = tables([profile('u1')])
    send.mockResolvedValue({ sent: 0, attempted: 0 })
    await runTickJob(fakeDb(db), send, sp(22, 31))
    await runTickJob(fakeDb(db), send, sp(22, 32))
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('one broken profile does not stop the others', async () => {
    const db = tables([profile('bad', 'Mars/Phobos'), profile('u1')])
    const r = await runTickJob(fakeDb(db), send, sp(22, 31))
    expect(r.failedProfiles).toBe(1)
    expect(send).toHaveBeenCalledWith('u1', expect.objectContaining({ level: 'overdue' }))
  })
})
