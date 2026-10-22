import { describe, expect, it } from 'vitest'
import { parseDuration, parseQuickAdd } from './quickAdd'

describe('parseQuickAdd', () => {
  it('name and duration', () => expect(parseQuickAdd('Ler livro 45')).toEqual({ name: 'Ler livro', durationMin: 45 }))
  it('default duration', () => expect(parseQuickAdd('Meditar')).toEqual({ name: 'Meditar', durationMin: 30 }))
  it('keeps numbers that belong to the name', () => expect(parseQuickAdd('Treino 2 20')).toEqual({ name: 'Treino 2', durationMin: 20 }))
  it('rejects empty, number-only and zero duration', () => {
    expect(parseQuickAdd('')).toBeNull()
    expect(parseQuickAdd('45')).toBeNull()
    expect(parseQuickAdd('Ler 0')).toBeNull()
  })

  it('understands units and filler words', () => {
    expect(parseQuickAdd('Ler por 60 minutos')).toEqual({ name: 'Ler', durationMin: 60 })
    expect(parseQuickAdd('Estudar Kubernetes 1h30')).toEqual({ name: 'Estudar Kubernetes', durationMin: 90 })
    expect(parseQuickAdd('Estudar DSA por 2 horas')).toEqual({ name: 'Estudar DSA', durationMin: 120 })
    expect(parseQuickAdd('Correr 40 min')).toEqual({ name: 'Correr', durationMin: 40 })
    expect(parseQuickAdd('Meditar durante 15m')).toEqual({ name: 'Meditar', durationMin: 15 })
  })
  it('a number that is not a duration stays in the name', () => {
    expect(parseQuickAdd('Ler 10 páginas')).toEqual({ name: 'Ler 10 páginas', durationMin: 30 })
    expect(parseDuration('Ler 10 páginas')).toBeNull()
  })
  it('rejects durations above 24h', () => expect(parseQuickAdd('Ler 25h')).toBeNull())
})
