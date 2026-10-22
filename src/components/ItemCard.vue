<script setup lang="ts">
import { computed } from 'vue'
import type { ItemState } from '../lib/calculateState'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { formatMinutes as hm, minToTime } from '../../supabase/functions/_shared/time'
import { categoryLabel, categoryOf } from '../lib/categories'
import Icon from './Icon.vue'

const props = defineProps<{
  item: ItemRow
  state: ItemState
  warnMin: number
  nowSec: number // segundos desde 00:00 no fuso do perfil
  elapsedS: number
  hasTimer: boolean
  running: boolean
  snoozed: boolean
  rolled: boolean
}>()
defineEmits<{ done: [e: MouseEvent]; timer: []; focus: []; snooze: []; skip: []; open: [] }>()

const category = computed(() => categoryLabel(categoryOf(props.item)))
const LABEL = { normal: '', attention: 'Atenção', urgent: 'Urgente', overdue: 'Atrasado' } as const

// A barra drena até o limite de início: começa a esvaziar 2x a janela de atenção antes.
const secondsLeft = computed(() => props.state.deadlineMin * 60 - props.nowSec)
const fraction = computed(() => Math.max(0, Math.min(1, secondsLeft.value / (Math.max(props.warnMin * 2, 30) * 60))))

const span = (sec: number) => hm(Math.max(1, Math.ceil(sec / 60)))
const timeLabel = computed(() =>
  secondsLeft.value > 0 ? span(secondsLeft.value) : props.state.level === 'overdue' ? `há ${span(-secondsLeft.value)}` : 'agora',
)
const clock = computed(() => `${Math.floor(props.elapsedS / 60)}:${String(Math.floor(props.elapsedS % 60)).padStart(2, '0')}`)
const taskFraction = computed(() => Math.min(1, props.elapsedS / (props.item.duration_min * 60)))
</script>

<template>
  <div class="slot">
    <article class="card" :class="`lvl-${state.level}`" :aria-label="`${item.name}, ${LABEL[state.level] || 'no prazo'}`">
      <header class="card-head">
        <div class="card-title">
          <h3><button class="link" @click="$emit('open')">{{ item.name }}</button></h3>
          <Icon v-if="item.essential" name="star" :size="14" class="essential" aria-label="Essencial" />
        </div>
        <span v-if="state.level !== 'normal'" class="chip">
          <Icon :name="state.level === 'attention' ? 'clock' : state.level === 'urgent' ? 'flame' : 'alert'" :size="14" />{{ LABEL[state.level] }}
        </span>
      </header>

      <p class="meta meta-line">
        <span>
          {{ item.duration_min }} min<template v-if="category"> · {{ category }}</template> · começar até <span class="num">{{ minToTime(state.deadlineMin) }}</span>
          <template v-if="rolled"> · atrasada de ontem</template>
          <template v-if="snoozed"> · alerta adiado</template>
        </span>
        <button class="link detail" aria-label="Detalhes: tempo e edição" @click="$emit('open')">Detalhes</button>
      </p>

      <div class="until" role="img" :aria-label="`Tempo até o limite de início: ${timeLabel}`">
        <div class="track"><div class="fill" :class="{ late: state.level === 'overdue' }" :style="{ transform: `scaleX(${state.level === 'overdue' ? 1 : fraction})` }" /></div>
        <span class="num until-label">{{ timeLabel }}</span>
      </div>

      <div v-if="hasTimer" class="timer-row">
        <div class="track thin"><div class="fill task" :style="{ transform: `scaleX(${taskFraction})` }" /></div>
        <button class="link num timer-label" aria-label="Ajustar cronômetro" @click="$emit('open')"><Icon name="clock" :size="13" />{{ clock }} / {{ item.duration_min }}:00</button>
      </div>

      <div class="actions">
        <button class="btn primary done" @click="$emit('done', $event)"><Icon name="check" :size="20" />Feito</button>
        <button class="icon-btn" :aria-label="running ? 'Pausar timer' : 'Iniciar timer'" :title="running ? 'Pausar' : 'Iniciar'" @click="$emit('timer')">
          <Icon :name="running ? 'pause' : 'play'" />
        </button>
        <button class="icon-btn" aria-label="Modo foco" title="Foco" @click="$emit('focus')"><Icon name="focus" /></button>
        <button v-if="state.level !== 'normal' && !snoozed" class="icon-btn" aria-label="Adiar alerta em 10 minutos" title="Adiar 10 min" @click="$emit('snooze')"><Icon name="snooze" /></button>
        <button class="icon-btn" :aria-label="item.kind === 'task' ? 'Descartar tarefa' : 'Pular hoje'" :title="item.kind === 'task' ? 'Descartar' : 'Pular hoje'" @click="$emit('skip')"><Icon name="skip" /></button>
      </div>
    </article>
  </div>
</template>
