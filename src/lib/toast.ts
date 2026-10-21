import { ref } from 'vue'

export const toast = ref('')
let timer: ReturnType<typeof setTimeout>

// Executa uma ação e mostra o erro em vez de falhar em silêncio.
export async function act(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    toast.value = (e as Error).message || 'Algo deu errado'
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = ''), 5000)
  }
}
