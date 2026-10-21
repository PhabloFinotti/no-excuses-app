import { expect, it } from 'vitest'
import { shortDate, weekdaysLabel } from './format'

it('formats dates and weekday sets', () => {
  expect(shortDate('2026-10-05')).toBe('05/10')
  expect(weekdaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('todo dia')
  expect(weekdaysLabel([5, 4, 3, 2, 1])).toBe('dias úteis')
  expect(weekdaysLabel([6, 0])).toBe('fins de semana')
  expect(weekdaysLabel([3, 1])).toBe('S Q')
})
