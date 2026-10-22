<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { googleCalendarUrl } from '../lib/calendar'
import { CATEGORIES, categoryLabel, detectCategory, NO_CATEGORY } from '../lib/categories'
import { parseDuration } from '../lib/quickAdd'
import { now, profile, saveItem, type ItemForm } from '../lib/store'
import { notify } from '../lib/toast'

const props = defineProps<{ item?: ItemRow }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const blank = (): ItemForm => ({
  id: crypto.randomUUID(), kind: 'habit', name: '', category: null, duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
  due_date: null, essential: false, warn_min: null, urgent_min: null,
})
const form = reactive<ItemForm>(props.item ? { ...props.item, fixed_time: props.item.fixed_time?.slice(0, 5) ?? null } : blank())
const error = ref('')
const busy = ref(false)

function setKind(kind: 'habit' | 'task') {
  form.kind = kind
  form.weekdays = kind === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : []
  form.due_date = kind === 'task' ? now.value.day : null
}
function toggleDay(d: number) {
  form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d]
}
// "Ler por 60 minutos" vira nome "Ler" + 60 min, como na adição rápida (só ao criar, para não mexer em item existente).
function readDuration() {
  if (props.item) return
  const parsed = parseDuration(form.name)
  if (parsed && parsed.durationMin >= 1 && parsed.durationMin <= 1440) {
    form.name = parsed.name
    form.duration_min = parsed.durationMin
  }
}
const category = computed({ get: () => form.category ?? '', set: (v: string) => (form.category = v || null) })
const detected = computed(() => categoryLabel(detectCategory(form.name)))
const num = (v: unknown) => (v === '' || v == null ? null : Number(v))

async function submit() {
  if (busy.value) return // Enter repetido ou toque duplo não envia de novo
  error.value = ''
  if (!Number.isInteger(form.duration_min) || form.duration_min < 1 || form.duration_min > 1440) {
    error.value = 'A duração precisa ser um número inteiro de 1 a 1440 minutos.'
    return
  }
  busy.value = true
  try {
    await saveItem({ ...form, fixed_time: form.fixed_time || null, warn_min: num(form.warn_min), urgent_min: num(form.urgent_min) })
    if (form.kind === 'task' && !props.item && !profile.value?.calendar_connected) {
      const t = { name: form.name, due_date: form.due_date!, fixed_time: form.fixed_time || null, duration_min: form.duration_min }
      notify(`${form.name} adicionada.`, { action: { label: 'Agenda', run: () => window.open(googleCalendarUrl(t, profile.value?.tz ?? 'America/Sao_Paulo'), '_blank', 'noopener') } })
    }
    emit('saved')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div v-if="!item" class="chips">
      <button type="button" :class="{ on: form.kind === 'habit' }" class="ghost" @click="setKind('habit')">Hábito</button>
      <button type="button" :class="{ on: form.kind === 'task' }" class="ghost" @click="setKind('task')">Tarefa avulsa</button>
    </div>
    <label>Nome<input v-model="form.name" required @blur="readDuration" /></label>
    <label>Categoria
      <select v-model="category">
        <option value="">Automática{{ detected ? ` (${detected})` : ' (nenhuma encontrada)' }}</option>
        <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
        <option :value="NO_CATEGORY">Sem categoria</option>
      </select>
    </label>
    <label>Duração prevista (min)<input v-model.number="form.duration_min" type="number" min="1" max="1440" step="1" required /></label>
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
      <button :disabled="busy || (form.kind === 'habit' && !form.weekdays.length)">Salvar</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
