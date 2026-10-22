<script setup lang="ts">
import { computed, ref } from 'vue'
import { googleCalendarUrl } from '../lib/calendar'
import { addedText } from '../lib/format'
import { describeQuickAdd } from '../lib/quickAdd'
import { addQuick, profile } from '../lib/store'
import { act, notify } from '../lib/toast'
import Icon from './Icon.vue'
import Sheet from './Sheet.vue'

const open = ref(false)
const text = ref('')
// Lembra a última escolha neste aparelho (quem cadastra hábitos em sequência não precisa trocar toda vez).
const KIND_KEY = 'quick-add-kind'
const savedKind = () => {
  try { return localStorage.getItem(KIND_KEY) === 'habit' ? 'habit' : 'task' } catch { return 'task' }
}
const kind = ref<'habit' | 'task'>(savedKind())
function setKind(k: 'habit' | 'task') {
  kind.value = k
  try { localStorage.setItem(KIND_KEY, k) } catch { /* sem armazenamento: vale só nesta sessão */ }
}
const preview = computed(() => describeQuickAdd(text.value, kind.value))
const busy = ref(false)

// Fechar sem enviar mantém o texto: Esc ou um toque fora não apaga o que foi digitado.
const close = () => (open.value = false)
async function submit() {
  if (busy.value) return // Enter repetido enquanto grava
  busy.value = true
  await act(async () => {
    const item = await addQuick(kind.value, text.value)
    notify(addedText(item), {
      action: item.due_date && !profile.value?.calendar_connected
        ? { label: 'Agenda', run: () => window.open(googleCalendarUrl({ name: item.name, due_date: item.due_date!, fixed_time: null, duration_min: item.durationMin }, profile.value?.tz ?? 'America/Sao_Paulo'), '_blank', 'noopener') }
        : undefined,
    })
    text.value = ''
    close()
  })
  busy.value = false
}
</script>

<template>
  <button class="fab" aria-label="Adicionar item" title="Adicionar" @click="open = true"><Icon name="plus" :size="26" /></button>

  <Sheet v-if="open" title="Adicionar rápido" @close="close">
    <form class="stack" @submit.prevent="submit">
      <h2>Adicionar rápido</h2>
      <input v-model="text" placeholder="Ler por 45 minutos" aria-label="Nome e duração em minutos" autocomplete="off" required />
      <p class="meta">Escreva o nome e, no fim, a duração: 45, 45 min, 1h30 ou “por 2 horas”. Sem duração, vale 30 min.</p>
      <p v-if="preview" class="meta" :class="{ error: !preview.ok }" role="status">{{ preview.ok ? `Vai criar → ${preview.text}` : preview.text }}</p>
      <div class="chips">
        <button type="button" class="ghost" :class="{ on: kind === 'task' }" @click="setKind('task')">Tarefa de hoje (uma vez)</button>
        <button type="button" class="ghost" :class="{ on: kind === 'habit' }" @click="setKind('habit')">Hábito (todo dia)</button>
      </div>
      <div class="row">
        <button type="button" class="ghost" @click="close">Cancelar</button>
        <button :disabled="busy || !text.trim() || (preview !== null && !preview.ok)">Adicionar</button>
      </div>
    </form>
  </Sheet>
</template>
