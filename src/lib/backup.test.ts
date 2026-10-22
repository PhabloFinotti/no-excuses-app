import { describe, expect, it, vi } from 'vitest'

// O módulo real cria o cliente do Supabase ao ser importado e exige as variáveis VITE_*; aqui só se testam funções puras.
vi.mock('./supabase', () => ({ supabase: {}, must: (r: unknown) => r }))
import { buildCsv, parseBackup } from './backup'

describe('buildCsv', () => {
  it('escapes commas, quotes and joins the item name', () => {
    const csv = buildCsv([{ id: 'a', name: 'Ler, "muito"', kind: 'habit' }], [{ item_id: 'a', day: '2026-10-21', done: true, skipped: false, spent_min: 20 }])
    expect(csv).toBe('day,name,kind,done,skipped,spent_min\n2026-10-21,"Ler, ""muito""",habit,true,false,20')
  })
})

describe('buildCsv formulas', () => {
  it('neutralizes names that would run as a spreadsheet formula', () => {
    const csv = buildCsv([{ id: 'a', name: '=HYPERLINK("x")', kind: 'habit' }, { id: 'b', name: '-5 flexões', kind: 'habit' }], [
      { item_id: 'a', day: '2026-10-21', done: true, skipped: false, spent_min: 1 },
      { item_id: 'b', day: '2026-10-21', done: true, skipped: false, spent_min: 1 },
    ])
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain("'-5 flexões")
  })
})

describe('parseBackup', () => {
  const good = { version: 1, items: [{ id: 'a', kind: 'habit', name: 'x', duration_min: 30, user_id: 'u' }], completions: [{ item_id: 'a', day: '2026-10-21', user_id: 'u' }] }
  it('accepts a valid backup and drops user_id', () => {
    const b = parseBackup(JSON.stringify(good))
    expect(b.items[0]).not.toHaveProperty('user_id')
    expect(b.completions[0]).not.toHaveProperty('user_id')
  })
  it('rejects garbage, wrong version and malformed rows', () => {
    expect(() => parseBackup('nope')).toThrow('JSON')
    expect(() => parseBackup(JSON.stringify({ ...good, version: 2 }))).toThrow('desconhecido')
    expect(() => parseBackup(JSON.stringify({ ...good, items: [{ id: 'a' }] }))).toThrow('itens')
    expect(() => parseBackup(JSON.stringify({ ...good, completions: [{ day: 'x' }] }))).toThrow('conclusões')
  })
})
