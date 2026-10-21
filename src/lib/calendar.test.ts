import { describe, expect, it } from 'vitest'
import { googleCalendarUrl } from './calendar'

const parse = (u: string) => new URL(u).searchParams
const task = { name: 'Pagar a conta', due_date: '2026-10-21', fixed_time: null, duration_min: 20 }

describe('googleCalendarUrl', () => {
  it('no fixed time: all-day event (exclusive end)', () => {
    const p = parse(googleCalendarUrl(task, 'America/Sao_Paulo'))
    expect(p.get('dates')).toBe('20261021/20261022')
    expect(p.get('text')).toBe('Pagar a conta')
    expect(p.get('ctz')).toBe('America/Sao_Paulo')
  })
  it('fixed time: start and end in the profile timezone', () => {
    const p = parse(googleCalendarUrl({ ...task, fixed_time: '14:30:00', duration_min: 45 }, 'America/Sao_Paulo'))
    expect(p.get('dates')).toBe('20261021T143000/20261021T151500')
  })
  it('crossing midnight ends on the next day; month rollover', () => {
    const p = parse(googleCalendarUrl({ ...task, due_date: '2026-10-31', fixed_time: '23:30', duration_min: 60 }, 'UTC'))
    expect(p.get('dates')).toBe('20261031T233000/20261101T003000')
  })
  it('escapes special characters in the title', () => {
    const url = googleCalendarUrl({ ...task, name: 'Ler & "estudar" #1' }, 'UTC')
    expect(parse(url).get('text')).toBe('Ler & "estudar" #1')
    expect(url).not.toContain('& "')
  })
})
