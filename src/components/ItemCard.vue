<script setup lang="ts">
import { computed } from 'vue'
import type { ItemState } from '../lib/calculateState'
import { isRepeat, type ItemRow } from '../../supabase/functions/_shared/pending'
import type { RepeatState } from '../../supabase/functions/_shared/repeat'
import { formatMinutes as hm, minToTime } from '../../supabase/functions/_shared/time'
import { categoryLabel, categoryOf, emojiOf } from '../lib/categories'
import Icon from './Icon.vue'

const props = defineProps<{
  item: ItemRow
  state: ItemState | RepeatState
  warnMin: number
  nowSec: number // segundos desde 00:00 no fuso do perfil
  elapsedS: number
  hasTimer: boolean
  running: boolean
  snoozed: boolean
  rolledDays: number // dias de atraso de uma tarefa rolada (0 = não rolada)
}>()
defineEmits<{ done: [e: MouseEvent]; timer: []; focus: []; snooze: []; skip: []; open: [] }>()

const category = computed(() => categoryLabel(categoryOf(props.item)))
const emoji = computed(() => emojiOf(props.item))
// Item repetido: o "limite" é a hora da próxima vez e "atenção" quer dizer que ela chegou.
const rep = computed(() => (isRepeat(props.item) ? (props.state as RepeatState) : undefined))
const LABEL = computed(() => ({ normal: '', attention: rep.value ? 'Na hora' : 'Atenção', urgent: 'Urgente', overdue: 'Atrasado' }) as const)

// A barra drena até o limite de início: começa a esvaziar 2x a janela de atenção antes.
const secondsLeft = computed(() => props.state.deadlineMin * 60 - props.nowSec)
const fraction = computed(() => Math.max(0, Math.min(1, secondsLeft.value / (Math.max(props.warnMin * 2, 30) * 60))))

const span = (sec: number) => hm(Math.max(1, Math.ceil(sec / 60)))
const timeLabel = computed(() =>
  secondsLeft.value > 0 ? `em ${span(secondsLeft.value)}` : props.state.level === 'overdue' ? `há ${span(-secondsLeft.value)}` : 'agora',
)
const clock = computed(() => `${Math.floor(props.elapsedS / 60)}:${String(Math.floor(props.elapsedS % 60)).padStart(2, '0')}`)
const taskFraction = computed(() => Math.min(1, props.elapsedS / (props.item.duration_min * 60)))
</script>

<template>
  <div class="slot">
    <article class="card" :class="`lvl-${state.level}`" :aria-label="`${item.name}, ${LABEL[state.level] || 'no prazo'}`">
      <header class="card-head">
        <div class="card-title">
          <h3><button class="link" @click="$emit('open')"><span v-if="emoji" class="emoji" aria-hidden="true">{{ emoji }}</span>{{ item.name }}</button></h3>
          <Icon v-if="item.essential" name="star" :size="14" class="essential" aria-label="Essencial" />
        </div>
        <span v-if="state.level !== 'normal'" class="chip">
          <Icon :name="state.level === 'attention' ? 'clock' : state.level === 'urgent' ? 'flame' : 'alert'" :size="14" />{{ LABEL[state.level] }}
        </span>
      </header>

      <p class="meta meta-line">
        <span v-if="rep">
          <span class="num">{{ rep.count }}/{{ rep.target }}</span><template v-if="category"> · {{ category }}</template> · {{ rep.due ? 'na hora desde' : 'próxima às' }} <span class="num">{{ minToTime(rep.deadlineMin) }}</span>
          <template v-if="!rep.fits"> · não dá mais para chegar a {{ rep.target }} hoje</template>
          <template v-if="snoozed"> · alerta adiado</template>
        </span>
        <span v-else>
          {{ item.duration_min }} min<template v-if="category"> · {{ category }}</template> · começar até <span class="num">{{ minToTime(state.deadlineMin) }}</span>
          <template v-if="rolledDays"> · {{ rolledDays === 1 ? 'atrasada de ontem' : `atrasada há ${rolledDays} dias` }}</template>
          <template v-if="snoozed"> · alerta adiado</template>
        </span>
        <button class="link detail" aria-label="Detalhes: tempo e edição" @click="$emit('open')">Detalhes</button>
      </p>

      <div class="until" role="img" :aria-label="`${rep ? 'Tempo até a próxima vez' : 'Tempo até o limite de início'}: ${timeLabel}`">
        <div class="track"><div class="fill" :class="{ late: state.level === 'overdue' }" :style="{ transform: `scaleX(${state.level === 'overdue' ? 1 : fraction})` }" /></div>
        <span class="num until-label">{{ timeLabel }}</span>
      </div>

      <div v-if="hasTimer" class="timer-row">
        <div class="track thin"><div class="fill task" :style="{ transform: `scaleX(${taskFraction})` }" /></div>
        <button class="link num timer-label" aria-label="Ajustar cronômetro" @click="$emit('open')"><Icon name="clock" :size="13" />{{ clock }} / {{ item.duration_min }}:00</button>
      </div>

      <div class="actions">
        <button class="btn primary done" @click="$emit('done', $event)"><Icon name="check" :size="20" />{{ rep ? 'Feito (+1)' : 'Feito' }}</button>
      </div>
      <div class="tools-row">
        <template v-if="!rep">
          <button class="ghost sub" :aria-label="running ? 'Pausar timer' : 'Iniciar timer'" @click="$emit('timer')">
            <Icon :name="running ? 'pause' : 'play'" :size="18" />{{ running ? 'Pausar' : 'Timer' }}
          </button>
          <button class="ghost sub" aria-label="Modo foco: timer em tela cheia" @click="$emit('focus')"><Icon name="focus" :size="18" />Foco</button>
        </template>
        <button v-if="state.level !== 'normal' && !snoozed" class="ghost sub" aria-label="Adiar o alerta em 10 minutos (o item continua na lista)" @click="$emit('snooze')"><Icon name="snooze" :size="18" />Adiar alerta</button>
        <button class="ghost sub" :aria-label="item.kind === 'task' ? 'Descartar tarefa' : 'Pular hoje'" @click="$emit('skip')"><Icon name="skip" :size="18" />{{ item.kind === 'task' ? 'Descartar' : 'Pular hoje' }}</button>
      </div>
    </article>
  </div>
</template>
