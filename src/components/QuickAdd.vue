<script setup lang="ts">
import { ref } from 'vue'
import { googleCalendarUrl } from '../lib/calendar'
import { addQuick, profile } from '../lib/store'
import { act, notify } from '../lib/toast'
import Icon from './Icon.vue'
import Sheet from './Sheet.vue'

const open = ref(false)
const text = ref('')
const kind = ref<'habit' | 'task'>('task')
const busy = ref(false)

function close() {
  open.value = false
  text.value = ''
}
async function submit() {
  if (busy.value) return // Enter repetido enquanto grava
  busy.value = true
  await act(async () => {
    const item = await addQuick(kind.value, text.value)
    notify(`${item.name} adicionado.`, {
      action: item.due_date && !profile.value?.calendar_connected
        ? { label: 'Agenda', run: () => window.open(googleCalendarUrl({ name: item.name, due_date: item.due_date!, fixed_time: null, duration_min: item.durationMin }, profile.value?.tz ?? 'America/Sao_Paulo'), '_blank', 'noopener') }
        : undefined,
    })
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
      <p class="meta">Escreva o nome e, no fim, a duração: 45, 45 min, 1h30 ou “por 2 horas”. Sem duração, vale 30 min. A categoria (Leitura, Estudo…) é descoberta pelo nome.</p>
      <div class="chips">
        <button type="button" class="ghost" :class="{ on: kind === 'task' }" @click="kind = 'task'">Tarefa de hoje</button>
        <button type="button" class="ghost" :class="{ on: kind === 'habit' }" @click="kind = 'habit'">Hábito todo dia</button>
      </div>
      <div class="row">
        <button type="button" class="ghost" @click="close">Cancelar</button>
        <button :disabled="busy || !text.trim()">Adicionar</button>
      </div>
    </form>
  </Sheet>
</template>
