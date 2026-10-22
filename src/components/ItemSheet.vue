<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds } from '../../supabase/functions/_shared/pending'
import { googleCalendarUrl } from '../lib/calendar'
import { shortDate } from '../lib/format'
import { addDays } from '../../supabase/functions/_shared/time'
import { completionOf, now, nowMs, profile, rescheduleTo, setSpent } from '../lib/store'
import { act, notify } from '../lib/toast'
import Icon from './Icon.vue'
import ItemForm from './ItemForm.vue'
import Sheet from './Sheet.vue'

const props = defineProps<{ item: ItemRow }>()
const emit = defineEmits<{ close: []; finish: [minutes: number] }>()

const tab = ref<'time' | 'edit'>('time')
const c = computed(() => completionOf(props.item))
const isDone = computed(() => !!c.value?.done)

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
  return hasTimer ? `O cronômetro marcou ${elapsedMin} min. Corrija se precisar.` : `Sem cronômetro: o estimado é ${props.item.duration_min} min.`
})

const calendarUrl = computed(() =>
  props.item.kind === 'task' ? googleCalendarUrl({ name: props.item.name, due_date: props.item.due_date!, fixed_time: props.item.fixed_time, duration_min: props.item.duration_min }, profile.value?.tz ?? 'America/Sao_Paulo') : '',
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
  <Sheet :title="item.name" :persistent="tab === 'edit'" @close="emit('close')">
    <div class="stack">
      <h2>{{ item.name }}</h2>
      <div class="chips" role="tablist">
        <button class="ghost" :class="{ on: tab === 'time' }" role="tab" :aria-selected="tab === 'time'" @click="tab = 'time'">Tempo</button>
        <button class="ghost" :class="{ on: tab === 'edit' }" role="tab" :aria-selected="tab === 'edit'" @click="tab = 'edit'">Editar item</button>
      </div>

      <template v-if="tab === 'time'">
        <p class="meta">{{ isDone ? 'Quanto tempo levou de verdade?' : 'Quanto tempo levou? Registre aqui se não usou o cronômetro.' }}</p>
        <div class="stepper">
          <button class="icon-btn" aria-label="Menos 5 minutos" @click="step(-5)"><span aria-hidden="true">−5</span></button>
          <label class="stepper-field">
            <input v-model.number="minutes" type="number" inputmode="numeric" min="0" max="600" aria-label="Minutos" @blur="minutes = clamp(minutes)" />
            <span class="meta">min</span>
          </label>
          <button class="icon-btn" aria-label="Mais 5 minutos" @click="step(5)"><span aria-hidden="true">+5</span></button>
        </div>
        <div class="chips">
          <button v-for="p in presets" :key="p" class="ghost" :class="{ on: minutes === p }" @click="minutes = p">{{ p }}{{ p === item.duration_min ? ' (estimado)' : '' }}</button>
        </div>
        <p class="meta">{{ hint }}</p>
        <p v-if="item.kind === 'task' && profile?.calendar_connected" class="meta">Sincronizada com o Google Agenda.</p>

        <div class="stack-actions">
          <button v-if="!isDone" :disabled="!clamp(minutes)" @click="emit('finish', clamp(minutes))"><Icon name="check" :size="20" />Concluir com {{ clamp(minutes) }} min</button>
          <button :class="{ ghost: !isDone }" :disabled="isDone && !clamp(minutes)" @click="saveTime">{{ isDone ? 'Salvar tempo' : 'Só salvar o cronômetro' }}</button>
          <button v-if="item.kind === 'task' && !isDone" class="ghost" @click="tomorrow">Fazer amanhã</button>
          <a v-if="calendarUrl && !profile?.calendar_connected" class="btn ghost" :href="calendarUrl" target="_blank" rel="noopener">Adicionar ao Google Agenda</a>
        </div>
      </template>

      <ItemForm v-else :item="item" @saved="emit('close')" @cancel="emit('close')" />
    </div>
  </Sheet>
</template>
