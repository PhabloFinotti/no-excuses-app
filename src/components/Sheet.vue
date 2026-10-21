<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement>()
let opener: Element | null = null
onMounted(() => {
  opener = document.activeElement
  ;(panel.value?.querySelector('input, textarea, select') as HTMLElement | null)?.focus()
})
// Devolve o foco a quem abriu a folha.
onBeforeUnmount(() => (opener as HTMLElement | null)?.focus?.())
</script>

<template>
  <div class="scrim" @click="emit('close')" />
  <div ref="panel" class="sheet" role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="emit('close')">
    <slot />
  </div>
</template>
