import { ref } from 'vue'

export interface Toast { text: string; error?: boolean; undo?: () => Promise<unknown> }

export const toast = ref<Toast | null>(null)
let timer: ReturnType<typeof setTimeout>

export function notify(text: string, opts: Omit<Toast, 'text'> = {}, ms = 5000) {
  toast.value = { text, ...opts }
  clearTimeout(timer)
  timer = setTimeout(() => (toast.value = null), ms)
}

// Executa uma ação e mostra o erro em vez de falhar em silêncio.
export async function act(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    notify((e as Error).message || 'Algo deu errado', { error: true })
  }
}
