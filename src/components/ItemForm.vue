<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { googleCalendarUrl } from '../lib/calendar'
import { CATEGORIES, categoryLabel, detectCategory, emojiOf, NO_CATEGORY } from '../lib/categories'
import { parseDuration } from '../lib/quickAdd'
import { now, profile, saveItem, type ItemForm } from '../lib/store'
import { notify } from '../lib/toast'
import { formatMinutes as hm, minToTime, timeToMin } from '../../supabase/functions/_shared/time'

const props = defineProps<{ item?: ItemRow }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const blank = (): ItemForm => ({
  id: crypto.randomUUID(), kind: 'habit', name: '', category: null, duration_min: 30, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
  due_date: null, essential: false, warn_min: null, urgent_min: null, emoji: null, ends_on: null, times_per_day: null, interval_min: null, repeat_from: null,
})
const form = reactive<ItemForm>(
  props.item ? { ...props.item, fixed_time: props.item.fixed_time?.slice(0, 5) ?? null, repeat_from: props.item.repeat_from?.slice(0, 5) ?? null } : blank(),
)
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
  const parsed = parseDuration(form.name, { bare: false }) // só com unidade: "Ler capítulo 3" continua sendo o nome
  if (parsed && parsed.durationMin >= 1 && parsed.durationMin <= 1440) {
    form.name = parsed.name
    form.duration_min = parsed.durationMin
  }
}
const category = computed({ get: () => form.category ?? '', set: (v: string) => (form.category = v || null) })
// Vezes por dia: 1 = hábito comum (gravado como null); acima disso, item repetido com intervalo (padrão 2h).
const times = computed({
  get: () => form.times_per_day ?? 1,
  set: (v: number) => {
    form.times_per_day = v > 1 ? Math.min(24, Math.round(v)) : null
    form.interval_min = form.times_per_day ? (form.interval_min ?? 120) : null
  },
})
const repeat = computed(() => form.kind === 'habit' && times.value > 1)
const INTERVALS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480, 720]
const intervals = computed(() => [...new Set([...INTERVALS, form.interval_min ?? 120])].sort((a, b) => a - b))
const every = (m: number) => (m % 60 ? hm(m) : `${m / 60}h`)
const categoryEmoji = computed(() => emojiOf({ name: form.name, category: form.category }))
const detected = computed(() => categoryLabel(detectCategory(form.name)))
const num = (v: unknown) => (v === '' || v == null ? null : Number(v))

async function submit() {
  if (busy.value) return // Enter repetido ou toque duplo não envia de novo
  error.value = ''
  form.name = form.name.trim()
  if (!form.name) {
    error.value = 'Dê um nome ao item.'
    return
  }
  if (!repeat.value && (!Number.isInteger(form.duration_min) || form.duration_min < 1 || form.duration_min > 1440)) {
    error.value = 'A duração precisa ser um número inteiro de 1 a 1440 minutos.'
    return
  }
  if (repeat.value && profile.value) {
    // Meta que não cabe nem começando na hora: o item nasceria atrasado todo dia.
    const start = form.repeat_from ? timeToMin(form.repeat_from) : timeToMin(profile.value.wake_time)
    const sleep = timeToMin(profile.value.sleep_time)
    if (start + (times.value - 1) * form.interval_min! >= sleep) {
      error.value = `${times.value} vezes a cada ${every(form.interval_min!)} não cabem entre ${minToTime(start)} e ${minToTime(sleep)} (hora de dormir).`
      return
    }
  }
  busy.value = true
  try {
    const common = { emoji: form.emoji?.trim() || null, ends_on: form.kind === 'habit' ? form.ends_on || null : null }
    // Item repetido não tem duração nem horário fixo (a coluna exige duração > 0: fica 1).
    const fields = repeat.value
      ? { duration_min: 1, fixed_time: null, essential: false, warn_min: null, urgent_min: null, repeat_from: form.repeat_from || null }
      : { fixed_time: form.fixed_time || null, warn_min: num(form.warn_min), urgent_min: num(form.urgent_min), times_per_day: null, interval_min: null, repeat_from: null }
    await saveItem({ ...form, ...common, ...fields })
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
        <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.emoji }} {{ c.label }}</option>
        <option :value="NO_CATEGORY">Sem categoria</option>
      </select>
    </label>
    <label>Emoji (opcional)<input v-model="form.emoji" maxlength="16" :placeholder="categoryEmoji || 'nenhum'" /></label>
    <p class="meta hint">Aparece nos avisos e nos cards. Vazio: o da categoria{{ categoryEmoji ? ` (${categoryEmoji})` : '' }}.</p>
    <template v-if="form.kind === 'habit'">
      <label>Vezes por dia<input v-model.number="times" type="number" min="1" max="24" step="1" inputmode="numeric" /></label>
      <template v-if="repeat">
        <div class="row">
          <label>A cada
            <select v-model.number="form.interval_min">
              <option v-for="m in intervals" :key="m" :value="m">{{ every(m) }}</option>
            </select>
          </label>
          <label>Primeiro aviso<input v-model="form.repeat_from" type="time" /></label>
        </div>
        <p class="meta hint">Cada aviso vem um intervalo depois da última vez registrada. Sem horário, o primeiro sai na hora de acordar.</p>
      </template>
    </template>
    <template v-if="!repeat">
      <label>Duração estimada (min)<input v-model.number="form.duration_min" type="number" min="1" max="1440" step="1" required /></label>
      <label>Horário fixo (opcional)<input v-model="form.fixed_time" type="time" /></label>
      <p class="meta hint">Preencha só se o item tem hora marcada. Sem horário, o app calcula o último momento para começar.</p>
    </template>
    <template v-if="form.kind === 'habit'">
      <label>Dias</label>
      <div class="chips">
        <button v-for="(d, i) in DAYS" :key="i" type="button" class="ghost" :class="{ on: form.weekdays.includes(i) }" :aria-pressed="form.weekdays.includes(i)" @click="toggleDay(i)">{{ d }}</button>
      </div>
      <label>Termina em (opcional)<input v-model="form.ends_on" type="date" /></label>
      <p class="meta hint">Para tratamentos com prazo. Depois desse dia o item some do Hoje e para de avisar.</p>
    </template>
    <label v-else>Data<input v-model="form.due_date" type="date" required /></label>
    <template v-if="!repeat">
    <label><input v-model="form.essential" type="checkbox" /> Essencial (o app nunca sugere pular este)</label>
    <details class="fold">
      <summary>Avisos próprios (opcional)</summary>
      <p class="meta">Deixe em branco para usar os valores de Ajustes.</p>
      <div class="row">
        <label>Avisar com quantos min de folga<input v-model="form.warn_min" type="number" min="0" placeholder="padrão" /></label>
        <label>Marcar urgente com quantos min<input v-model="form.urgent_min" type="number" min="0" placeholder="padrão" /></label>
      </div>
    </details>
    </template>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="row" style="margin-top: 14px">
      <button :disabled="busy || (form.kind === 'habit' && !form.weekdays.length)">Salvar</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
