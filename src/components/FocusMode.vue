<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'

defineProps<{ item: ItemRow; clock: string; running: boolean }>()
const emit = defineEmits<{ close: []; toggle: []; done: [] }>()

const root = ref<HTMLElement>()
// Mantém a tela acesa durante o foco; sem suporte ou sem permissão, segue sem (não é crítico).
let lock: { release: () => Promise<void> } | undefined
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(async () => {
  document.addEventListener('keydown', onKey)
  root.value?.querySelector('button')?.focus()
  try { lock = await (navigator as any).wakeLock?.request('screen') } catch { /* ignorado */ }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  lock?.release().catch(() => {})
})
</script>

<template>
  <div ref="root" class="focus" role="dialog" aria-modal="true" :aria-label="`Foco: ${item.name}`">
    <p class="meta">{{ item.name }}</p>
    <p class="clock">{{ clock }}</p>
    <div class="row" style="max-width: 360px; width: 100%">
      <button class="ghost" @click="$emit('toggle')">{{ running ? 'Pausar' : 'Iniciar' }}</button>
      <button @click="$emit('done')">Feito</button>
    </div>
    <button class="ghost" style="margin-top: 16px" @click="$emit('close')">Sair do foco</button>
  </div>
</template>
