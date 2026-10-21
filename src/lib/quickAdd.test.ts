import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

describe('parseQuickAdd', () => {
  it('name and duration', () => expect(parseQuickAdd('Ler livro 45')).toEqual({ name: 'Ler livro', durationMin: 45 }))
  it('default duration', () => expect(parseQuickAdd('Meditar')).toEqual({ name: 'Meditar', durationMin: 30 }))
  it('keeps numbers that belong to the name', () => expect(parseQuickAdd('Treino 2 20')).toEqual({ name: 'Treino 2', durationMin: 20 }))
  it('rejects empty, number-only and zero duration', () => {
    expect(parseQuickAdd('')).toBeNull()
    expect(parseQuickAdd('45')).toBeNull()
    expect(parseQuickAdd('Ler 0')).toBeNull()
  })
})
