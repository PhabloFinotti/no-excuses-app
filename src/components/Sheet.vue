<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement>()
let opener: Element | null = null
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Esc fecha de qualquer lugar; Tab/Shift+Tab ficam presos na folha (ela é `aria-modal`, o fundo não pode receber foco).
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') return emit('close')
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  const outside = !panel.value.contains(document.activeElement)
  if (e.shiftKey && (outside || document.activeElement === first)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (outside || document.activeElement === last)) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  opener = document.activeElement
  document.addEventListener('keydown', onKey)
  ;(panel.value?.querySelector('input, textarea, select') as HTMLElement | null)?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  // Devolve o foco a quem abriu a folha.
  ;(opener as HTMLElement | null)?.focus?.()
})
</script>

<template>
  <div class="scrim" @click="emit('close')" />
  <div ref="panel" class="sheet" role="dialog" aria-modal="true" :aria-label="title">
    <slot />
  </div>
</template>
