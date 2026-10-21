<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { googleCalendarUrl } from '../lib/calendar'
import { now, profile, saveItem, type ItemForm } from '../lib/store'
import { notify } from '../lib/toast'

const props = defineProps<{ item?: ItemRow }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const blank = (): ItemForm => ({
  kind: 'habit', name: '', duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
  due_date: null, essential: false, warn_min: null, urgent_min: null,
})
const form = reactive<ItemForm>(props.item ? { ...props.item, fixed_time: props.item.fixed_time?.slice(0, 5) ?? null } : blank())
const error = ref('')

function setKind(kind: 'habit' | 'task') {
  form.kind = kind
  form.weekdays = kind === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : []
  form.due_date = kind === 'task' ? now.value.day : null
}
function toggleDay(d: number) {
  form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d]
}
const num = (v: unknown) => (v === '' || v == null ? null : Number(v))

async function submit() {
  error.value = ''
  try {
    await saveItem({ ...form, fixed_time: form.fixed_time || null, warn_min: num(form.warn_min), urgent_min: num(form.urgent_min) })
    if (form.kind === 'task' && !props.item) {
      const t = { name: form.name, due_date: form.due_date!, fixed_time: form.fixed_time || null, duration_min: form.duration_min }
      notify(`${form.name} adicionada.`, { action: { label: 'Agenda', run: () => window.open(googleCalendarUrl(t, profile.value?.tz ?? 'America/Sao_Paulo'), '_blank', 'noopener') } })
    }
    emit('saved')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div v-if="!item" class="chips">
      <button type="button" :class="{ on: form.kind === 'habit' }" class="ghost" @click="setKind('habit')">Hábito</button>
      <button type="button" :class="{ on: form.kind === 'task' }" class="ghost" @click="setKind('task')">Tarefa avulsa</button>
    </div>
    <label>Nome<input v-model="form.name" required /></label>
    <label>Duração prevista (min)<input v-model.number="form.duration_min" type="number" min="1" required /></label>
    <label>Horário fixo (opcional)<input v-model="form.fixed_time" type="time" /></label>
    <template v-if="form.kind === 'habit'">
      <label>Dias</label>
      <div class="chips">
        <button v-for="(d, i) in DAYS" :key="i" type="button" class="ghost" :class="{ on: form.weekdays.includes(i) }" :aria-pressed="form.weekdays.includes(i)" @click="toggleDay(i)">{{ d }}</button>
      </div>
    </template>
    <label v-else>Data<input v-model="form.due_date" type="date" required /></label>
    <label><input v-model="form.essential" type="checkbox" /> Essencial (último a ser pulado)</label>
    <div class="row">
      <label>Atenção (min antes)<input v-model="form.warn_min" type="number" min="0" placeholder="padrão" /></label>
      <label>Urgente (min antes)<input v-model="form.urgent_min" type="number" min="0" placeholder="padrão" /></label>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="row" style="margin-top: 14px">
      <button :disabled="form.kind === 'habit' && !form.weekdays.length">Salvar</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
