<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds, isRepeat } from '../../supabase/functions/_shared/pending'
import { googleCalendarUrl } from '../lib/calendar'
import { categoryLabel, categoryOf } from '../lib/categories'
import { shortDate, weekdaysLabel } from '../lib/format'
import { addDays, formatMinutes as hm, localTime, minToTime } from '../../supabase/functions/_shared/time'
import { calc, completionOf, isItemPending, isSnoozed, now, nowMs, profile, repeats, rescheduleTo, setSpent } from '../lib/store'
import { act, notify } from '../lib/toast'
import Icon from './Icon.vue'
import ItemTile from './ItemTile.vue'
import Sheet from './Sheet.vue'

// Detalhes do item: as ações que não cabem no toque principal (cronômetro, foco, adiar, pular), o tempo gasto e a edição.
const props = defineProps<{ item: ItemRow }>()
const emit = defineEmits<{ close: []; finish: [minutes: number]; timer: []; focus: []; snooze: []; skip: []; edit: [] }>()

const c = computed(() => completionOf(props.item))
const isDone = computed(() => !!c.value?.done)
const pending = computed(() => isItemPending(props.item))
const repeat = isRepeat(props.item)
const running = computed(() => !!c.value?.timer_started_at)
const level = computed(() => [...calc.value.states, ...repeats.value].find((s) => s.id === props.item.id)?.level ?? 'normal')
const canSnooze = computed(() => pending.value && level.value !== 'normal' && !isSnoozed(props.item))

const tz = () => profile.value?.tz ?? 'America/Sao_Paulo'
const timesToday = computed(() => (c.value?.done_times ?? []).map((t) => minToTime(localTime(new Date(t), tz()).minutes)))
const about = computed(() => {
  const i = props.item
  const when = i.kind === 'task' ? `Tarefa · ${shortDate(i.due_date!)}` : `Hábito · ${weekdaysLabel(i.weekdays)}`
  const amount = repeat ? `${i.times_per_day}x por dia` : hm(i.duration_min)
  return [when, amount, categoryLabel(categoryOf(i))].filter(Boolean).join(' · ')
})

// Valor inicial fixado na abertura: tempo registrado, senão o cronômetro, senão o estimado.
const elapsedMin = Math.round(elapsedSeconds(completionOf(props.item), nowMs.value) / 60)
const minutes = ref(isDone.value ? c.value!.spent_min : elapsedMin >= 1 ? elapsedMin : props.item.duration_min)
const hasTimer = elapsedMin >= 1
const clamp = (n: number) => Math.max(0, Math.min(600, Math.round(Number(n) || 0)))
const step = (d: number) => (minutes.value = clamp(minutes.value + d))
const presets = computed(() => [...new Set([props.item.duration_min, 15, 30, 45, 60])].sort((a, b) => a - b))
const hint = computed(() => {
  if (isDone.value) {
    const src = c.value?.time_source
    return `Registrado: ${c.value!.spent_min} min${src === 'planned' ? ' (era o estimado, sem cronômetro)' : src === 'manual' ? ' (ajustado à mão)' : ''}.`
  }
  return hasTimer ? `O cronômetro marcou ${elapsedMin} min. Corrija se precisar.` : `Sem cronômetro, vale o estimado: ${props.item.duration_min} min.`
})

const calendarUrl = computed(() =>
  props.item.kind === 'task' ? googleCalendarUrl({ name: props.item.name, due_date: props.item.due_date!, fixed_time: props.item.fixed_time, duration_min: props.item.duration_min }, tz()) : '',
)
function saveTime() {
  act(() => setSpent(props.item, clamp(minutes.value)))
  notify(isDone.value ? 'Tempo atualizado.' : 'Cronômetro ajustado.')
  emit('close')
}
function tomorrow() {
  const d = addDays(now.value.day, 1)
  act(() => rescheduleTo(props.item, d))
  notify(`${props.item.name}: movida para ${shortDate(d)}.`)
  emit('close')
}
</script>

<template>
  <Sheet :title="item.name" @close="emit('close')">
    <div class="detail-head">
      <ItemTile :item="item" size="lg" />
      <div>
        <h2>{{ item.name }}</h2>
        <p class="meta">{{ about }}</p>
      </div>
    </div>

    <p v-if="repeat" class="meta">
      Hoje: <b class="num">{{ timesToday.length }} de {{ item.times_per_day }}</b><template v-if="timesToday.length"> ({{ timesToday.join(', ') }})</template>
    </p>

    <div v-if="pending" class="actions-grid">
      <template v-if="!repeat">
        <button class="ghost" @click="emit('timer')"><Icon :name="running ? 'pause' : 'play'" />{{ running ? 'Pausar' : 'Cronômetro' }}</button>
        <button class="ghost" @click="emit('focus')"><Icon name="focus" />Modo foco</button>
      </template>
      <button v-if="canSnooze" class="ghost" @click="emit('snooze')"><Icon name="snooze" />Adiar 10 min</button>
      <button class="ghost" @click="emit('skip')"><Icon name="skip" />{{ item.kind === 'task' ? 'Descartar' : 'Pular hoje' }}</button>
      <button v-if="item.kind === 'task'" class="ghost" @click="tomorrow"><Icon name="calendar" />Fazer amanhã</button>
    </div>

    <template v-if="!repeat">
      <p class="subtle-title">{{ isDone ? 'Quanto tempo levou de verdade?' : 'Quanto tempo levou?' }}</p>
      <div class="stepper">
        <button class="ghost" aria-label="Menos 5 minutos" @click="step(-5)"><span aria-hidden="true">−</span></button>
        <label class="stepper-field">
          <input v-model.number="minutes" type="number" inputmode="numeric" min="0" max="600" aria-label="Minutos" @blur="minutes = clamp(minutes)" />
          <span class="meta">min</span>
        </label>
        <button class="ghost" aria-label="Mais 5 minutos" @click="step(5)"><span aria-hidden="true">+</span></button>
      </div>
      <div class="chips">
        <button v-for="p in presets" :key="p" class="chip-btn" :class="{ on: minutes === p }" @click="minutes = p">{{ p }} min</button>
      </div>
      <p class="meta">{{ hint }}</p>
      <button v-if="pending" class="sheet-done" :disabled="!clamp(minutes)" @click="emit('finish', clamp(minutes))"><Icon name="check" :size="22" />Concluir com {{ clamp(minutes) }} min</button>
      <button :class="pending ? 'ghost' : 'sheet-done'" :disabled="isDone && !clamp(minutes)" @click="saveTime">{{ isDone ? 'Salvar tempo' : 'Só salvar o cronômetro' }}</button>
    </template>

    <a v-if="calendarUrl && !profile?.calendar_connected" class="btn ghost" :href="calendarUrl" target="_blank" rel="noopener"><Icon name="calendar" />Adicionar ao Google Agenda</a>
    <p v-if="item.kind === 'task' && profile?.calendar_connected" class="meta">Sincronizada com o Google Agenda.</p>
    <button class="ghost" @click="emit('edit')"><Icon name="edit" />Editar item</button>
  </Sheet>
</template>
