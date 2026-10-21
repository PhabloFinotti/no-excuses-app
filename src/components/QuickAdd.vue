<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { addQuick } from '../lib/store'
import { act, notify } from '../lib/toast'
import Icon from './Icon.vue'

const open = ref(false)
const text = ref('')
const kind = ref<'habit' | 'task'>('task')
const input = ref<HTMLInputElement>()
const busy = ref(false)

async function show() {
  open.value = true
  await nextTick()
  input.value?.focus()
}
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
  <button class="fab" aria-label="Adicionar item" title="Adicionar" @click="show"><Icon name="plus" :size="26" /></button>

  <template v-if="open">
    <div class="scrim" @click="close" />
    <form class="sheet" role="dialog" aria-label="Adicionar rápido" @submit.prevent="submit" @keydown.esc="close">
      <h2>Adicionar rápido</h2>
      <input ref="input" v-model="text" placeholder="Ler livro 45" aria-label="Nome e duração em minutos" autocomplete="off" required />
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
  </template>
</template>
