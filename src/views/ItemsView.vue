<script setup lang="ts">
import { reactive, ref } from 'vue'
import { shortDate, weekdaysLabel } from '../lib/format'
import Icon from '../components/Icon.vue'
import { act } from '../lib/toast'
import { addQuick, archiveItem, items, now, saveItem, type ItemForm } from '../lib/store'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const blank = (): ItemForm => ({
  kind: 'habit', name: '', duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
  due_date: null, essential: false, warn_min: null, urgent_min: null,
})
const form = reactive<ItemForm>(blank())
const open = ref(false)
const error = ref('')

function edit(item?: (typeof items.value)[number]) {
  Object.assign(form, item ? { ...item, fixed_time: item.fixed_time?.slice(0, 5) ?? null } : blank())
  if (!item) delete form.id
  open.value = true
}
function setKind(kind: 'habit' | 'task') {
  form.kind = kind
  form.weekdays = kind === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : []
  form.due_date = kind === 'task' ? now.value.day : null
}
function toggleDay(d: number) {
  form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d]
}
const quick = ref('')
async function quickAdd(kind: 'habit' | 'task') {
  error.value = ''
  try {
    await addQuick(kind, quick.value)
    quick.value = ''
  } catch (e) {
    error.value = (e as Error).message
  }
}
const num = (v: unknown) => (v === '' || v == null ? null : Number(v))

async function submit() {
  error.value = ''
  try {
    await saveItem({ ...form, fixed_time: form.fixed_time || null, warn_min: num(form.warn_min), urgent_min: num(form.urgent_min) })
    open.value = false
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <h1>Itens</h1>

  <form v-if="open" class="plain" @submit.prevent="submit">
    <div class="chips">
      <button type="button" :class="{ on: form.kind === 'habit' }" class="ghost" @click="setKind('habit')">Hábito</button>
      <button type="button" :class="{ on: form.kind === 'task' }" class="ghost" @click="setKind('task')">Tarefa avulsa</button>
    </div>
    <label>Nome<input v-model="form.name" required /></label>
    <label>Duração (min)<input v-model.number="form.duration_min" type="number" min="1" required /></label>
    <label>Horário fixo (opcional)<input v-model="form.fixed_time" type="time" /></label>
    <template v-if="form.kind === 'habit'">
      <label>Dias</label>
      <div class="chips">
        <button v-for="(d, i) in DAYS" :key="i" type="button" class="ghost" :class="{ on: form.weekdays.includes(i) }" @click="toggleDay(i)">{{ d }}</button>
      </div>
    </template>
    <label v-else>Data<input v-model="form.due_date" type="date" required /></label>
    <label><input v-model="form.essential" type="checkbox" style="width: auto" /> Essencial (último a ser pulado)</label>
    <div class="row">
      <label>Atenção (min antes)<input v-model="form.warn_min" type="number" min="0" placeholder="padrão" /></label>
      <label>Urgente (min antes)<input v-model="form.urgent_min" type="number" min="0" placeholder="padrão" /></label>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="row" style="margin-top: 12px">
      <button :disabled="form.kind === 'habit' && !form.weekdays.length">Salvar</button>
      <button type="button" class="ghost" @click="open = false">Cancelar</button>
    </div>
  </form>
  <template v-else>
    <input v-model="quick" placeholder="Adicionar rápido: Ler livro 45" @keydown.enter.prevent="quickAdd('task')" />
    <div class="row" style="margin: 8px 0">
      <button class="ghost" @click="quickAdd('task')">+ Tarefa hoje</button>
      <button class="ghost" @click="quickAdd('habit')">+ Hábito diário</button>
      <button class="ghost" @click="edit()">Formulário completo</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </template>

  <h2 class="section">Cadastrados</h2>
  <div v-for="item in items" :key="item.id" class="plain item-row">
    <div class="grow">
      <strong>{{ item.name }}</strong>
      <div class="meta">
        {{ item.kind === 'task' ? `Tarefa · ${shortDate(item.due_date!)}` : `Hábito · ${weekdaysLabel(item.weekdays)}` }} · {{ item.duration_min }} min
        <template v-if="item.fixed_time"> · {{ item.fixed_time.slice(0, 5) }}</template>
      </div>
    </div>
    <div class="tools">
      <button class="icon-btn" aria-label="Editar" title="Editar" @click="edit(item)"><Icon name="edit" /></button>
      <button class="icon-btn" aria-label="Arquivar" title="Arquivar" @click="act(() => archiveItem(item.id))"><Icon name="archive" /></button>
    </div>
  </div>
</template>
