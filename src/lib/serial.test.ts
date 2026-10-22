import { describe, expect, it } from 'vitest'
import { keyedQueue } from './serial'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('keyedQueue', () => {
  it('runs tasks of the same key in order even when an earlier one is slower', async () => {
    const q = keyedQueue()
    const order: string[] = []
    const a = q.run('x', async () => { await sleep(20); order.push('a') })
    const b = q.run('x', async () => { order.push('b') })
    await Promise.all([a, b])
    expect(order).toEqual(['a', 'b'])
  })

  it('does not make different keys wait for each other', async () => {
    const q = keyedQueue()
    const order: string[] = []
    const slow = q.run('x', async () => { await sleep(20); order.push('x') })
    const fast = q.run('y', async () => { order.push('y') })
    await Promise.all([slow, fast])
    expect(order).toEqual(['y', 'x'])
  })

  it('a failing task does not block the next one, and pending() counts what is left', async () => {
    const q = keyedQueue()
    const failed = q.run('x', async () => { throw new Error('boom') })
    const next = q.run('x', async () => 'ok')
    expect(q.pending('x')).toBe(2)
    await expect(failed).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ok')
    await sleep(0)
    expect(q.pending('x')).toBe(0)
  })
})
