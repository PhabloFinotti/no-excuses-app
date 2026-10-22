import { describe, expect, it } from 'vitest'
import { parseDuration, parseQuickAdd, quickAddError } from './quickAdd'

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

  it('understands decimal hours and "hs"', () => {
    expect(parseQuickAdd('Ler 1,5h')).toEqual({ name: 'Ler', durationMin: 90 })
    expect(parseQuickAdd('Ler 2 hs')).toEqual({ name: 'Ler', durationMin: 120 })
  })
  it('without bare numbers, a trailing number stays in the name', () => {
    expect(parseDuration('Ler capítulo 3', { bare: false })).toBeNull()
    expect(parseDuration('Ler capítulo 3 min', { bare: false })).toEqual({ name: 'Ler capítulo', durationMin: 3 })
  })
  it('explains why a text was refused', () => {
    expect(quickAddError('')).toMatch(/Digite um nome/)
    expect(quickAddError('45')).toMatch(/Falta o nome/)
    expect(quickAddError('Ler 25h')).toMatch(/máxima/)
    expect(quickAddError('Ler 1h75')).toMatch(/0 a 59/)
    expect(quickAddError('Ler 0')).toMatch(/maior que zero/)
    expect(quickAddError('Ler 45')).toBeNull()
  })
})
