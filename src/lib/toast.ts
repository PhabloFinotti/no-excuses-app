import { ref } from 'vue'

export interface Toast { text: string; error?: boolean; undo?: () => Promise<unknown>; action?: { label: string; run: () => void } }
export interface ToastEntry extends Toast { id: number }

// Pilha (até 3): concluir vários itens seguidos mantém o "Desfazer" de cada um, não só do último.
export const toasts = ref<ToastEntry[]>([])
let nextId = 0
const MAX = 3

export const dismiss = (id: number) => (toasts.value = toasts.value.filter((t) => t.id !== id))

export function notify(text: string, opts: Omit<Toast, 'text'> = {}, ms = 5000) {
  const id = ++nextId
  toasts.value = [...toasts.value, { id, text, ...opts }].slice(-MAX)
  setTimeout(() => dismiss(id), ms)
}

// Executa uma ação e mostra o erro em vez de falhar em silêncio.
export async function act(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    notify((e as Error).message || 'Algo deu errado', { error: true })
  }
}
