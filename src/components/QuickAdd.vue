<script setup lang="ts">
import { ref } from 'vue'
import { addQuick } from '../lib/store'
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
  busy.value = true
  await act(async () => {
    const item = await addQuick(kind.value, text.value)
    notify(`${item.name} adicionado.`)
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
      <input v-model="text" placeholder="Ler livro 45" aria-label="Nome e duração em minutos" autocomplete="off" required />
      <p class="meta">Escreva o nome e, no fim, a duração em minutos. Sem número, vale 30.</p>
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
