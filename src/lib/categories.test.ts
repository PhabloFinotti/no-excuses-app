import { describe, expect, it } from 'vitest'
import { categoryOf, detectCategory, NO_CATEGORY } from './categories'

describe('detectCategory', () => {
  it('groups related reading names', () => {
    for (const n of ['Leitura', 'Ler', 'Ler 10 páginas', 'Ler livro tal', 'LER por 60 minutos']) expect(detectCategory(n)).toBe('reading')
  })
  it('groups study names, including technical subjects', () => {
    for (const n of ['Estudar Kubernetes', 'Estudar DSA', 'Estudo de inglês', 'Resolver Leetcode']) expect(detectCategory(n)).toBe('study')
  })
  it('ignores accents and does not match inside other words', () => {
    expect(detectCategory('Meditação')).toBe('mind')
    expect(detectCategory('Calendário')).toBeNull()
    expect(detectCategory('Lerdeza')).toBeNull()
  })
  it('more matching words win; a tie goes to the first category', () => {
    expect(detectCategory('Ler livro de DSA')).toBe('reading') // 2 palavras de leitura contra 1 de estudo
    expect(detectCategory('Ler sobre Kubernetes')).toBe('study') // empate: Estudo vem antes
  })
  it('returns null when nothing matches', () => expect(detectCategory('Xablau')).toBeNull())
})

describe('categoryOf', () => {
  it('explicit choice wins, "none" opts out, null follows the name', () => {
    expect(categoryOf({ name: 'Ler', category: 'study' })).toBe('study')
    expect(categoryOf({ name: 'Ler', category: NO_CATEGORY })).toBeNull()
    expect(categoryOf({ name: 'Ler', category: null })).toBe('reading')
    expect(categoryOf({ name: 'Ler', category: 'inexistente' })).toBe('reading')
  })
})
