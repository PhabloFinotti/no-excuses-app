// Fila por chave: as tarefas da mesma chave rodam uma após a outra, na ordem em que chegaram (chaves diferentes não esperam).
// Uma que falha não trava as seguintes. `pending(key)` diz quantas ainda faltam, para ignorar respostas já superadas.
export function keyedQueue() {
  const tails = new Map<string, Promise<unknown>>()
  const counts = new Map<string, number>()

  function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    counts.set(key, (counts.get(key) ?? 0) + 1)
    const result = (tails.get(key) ?? Promise.resolve()).catch(() => {}).then(task)
    const tail = result.catch(() => {}).finally(() => {
      const left = (counts.get(key) ?? 1) - 1
      if (left) counts.set(key, left)
      else {
        counts.delete(key)
        tails.delete(key)
      }
    })
    tails.set(key, tail)
    return result
  }

  return { run, pending: (key: string) => counts.get(key) ?? 0 }
}
