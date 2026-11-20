<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ItemState } from '../lib/calculateState'
import { isRepeat, type ItemRow } from '../../supabase/functions/_shared/pending'
import type { RepeatState } from '../../supabase/functions/_shared/repeat'
import { formatMinutes as hm, minToTime } from '../../supabase/functions/_shared/time'
import { XP_PER_DONE } from '../lib/progress'
import Icon from './Icon.vue'
import ItemTile from './ItemTile.vue'

const props = defineProps<{
  item: ItemRow
  state: ItemState | RepeatState
  elapsedS: number
  running: boolean
  snoozed: boolean
  rolledDays: number // dias de atraso de uma tarefa rolada (0 = não rolada)
}>()
const emit = defineEmits<{ done: []; open: [] }>()

// Item repetido: o "limite" é a hora da próxima vez.
const rep = computed(() => (isRepeat(props.item) ? (props.state as RepeatState) : undefined))
const got = ref(false) // o círculo enche na hora do toque, antes de a linha sair
const float = ref('')
let floatTimer: ReturnType<typeof setTimeout>

function tap() {
  const r = rep.value
  const finishing = !r || r.count + 1 >= r.target
  got.value = finishing
  float.value = finishing ? `+${XP_PER_DONE} XP` : `${r!.count + 1} de ${r!.target}`
  clearTimeout(floatTimer)
  floatTimer = setTimeout(() => (float.value = ''), 900)
  // Concluir tira a linha da lista: espera o círculo cheio e o +XP serem desenhados, senão a linha sai como estava.
  nextTick(() => emit('done'))
}

const span = (min: number) => hm(Math.max(1, Math.ceil(min)))
const clock = computed(() => `${Math.floor(props.elapsedS / 60)}:${String(Math.floor(props.elapsedS % 60)).padStart(2, '0')}`)

// A linha do prazo diz em palavras o que fazer, na cor da urgência.
const sub = computed((): { icon: 'timer' | 'alert' | 'bell' | 'repeat' | 'flame' | 'clock'; text: string } => {
  const s = props.state
  const t = minToTime(s.deadlineMin)
  if (props.running) return { icon: 'timer', text: `Cronômetro ${clock.value} de ${props.item.duration_min}:00` }
  const r = rep.value
  if (r) {
    const base = `${r.count} de ${r.target}`
    if (!r.fits) return { icon: 'alert', text: `${base} · não dá mais para chegar a ${r.target} hoje` }
    if (r.due) return { icon: 'bell', text: `${base} · hora da ${r.count + 1}ª, desde ${t}` }
    return { icon: 'repeat', text: `${base} · próxima às ${t}` }
  }
  const fixed = !!props.item.fixed_time
  if (s.level === 'overdue') return { icon: 'alert', text: fixed ? `Atrasado · era às ${t}` : `Atrasado · era para começar até ${t}` }
  if (s.level === 'urgent') return { icon: 'flame', text: `Comece em ${span(s.minutesUntilDeadline)} · até ${t}` }
  if (s.level === 'attention') return { icon: 'clock', text: `${fixed ? 'Às' : 'Comece até'} ${t} · em ${span(s.minutesUntilDeadline)}` }
  return { icon: 'clock', text: `${fixed ? 'Às' : 'Comece até'} ${t} · ${hm(props.item.duration_min)}` }
})
const extra = computed(() =>
  [props.rolledDays ? (props.rolledDays === 1 ? 'de ontem' : `há ${props.rolledDays} dias`) : '', props.snoozed ? 'alerta adiado' : ''].filter(Boolean).join(' · '),
)

// Anel segmentado do item repetido: um pedaço por vez do dia.
const C = 2 * Math.PI * 23
const segments = computed(() => {
  const r = rep.value
  if (!r) return []
  const step = C / r.target
  const len = Math.max(2, step - (r.target > 12 ? 2 : 4))
  return Array.from({ length: r.target }, (_, i) => ({ dash: `${len} ${C - len}`, offset: -i * step, got: i < r.count + (got.value ? 1 : 0) }))
})
const checkLabel = computed(() => {
  const r = rep.value
  return r ? `Registrar uma vez de ${props.item.name} (${r.count} de ${r.target} feitas)` : `Concluir ${props.item.name}`
})
</script>

<template>
  <div class="slot">
    <article class="task" :class="[`lvl-${state.level}`, { running }]">
      <button class="task-main" :aria-label="`${item.name}: ${sub.text}${extra ? ` · ${extra}` : ''}. Abrir detalhes`" @click="$emit('open')">
        <ItemTile :item="item" />
        <span>
          <span class="task-name">{{ item.name }}<Icon v-if="item.essential" name="star" filled :size="15" class="star" /></span>
          <span class="task-sub"><Icon :name="sub.icon" :size="15" />{{ sub.text }}<template v-if="extra"> · {{ extra }}</template></span>
        </span>
      </button>
      <button class="check" :class="{ multi: !!rep, got }" :aria-label="checkLabel" @click="tap">
        <svg v-if="rep" class="seg" viewBox="0 0 52 52" aria-hidden="true">
          <circle v-for="(s, i) in segments" :key="i" cx="26" cy="26" r="23" :class="s.got ? 'got' : 'todo'" :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset" />
        </svg>
        <span class="disc"><Icon v-if="!rep || got" name="check" :size="22" /><template v-else>{{ rep.count }}/{{ rep.target }}</template></span>
      </button>
      <span v-if="float" class="xp-float" aria-hidden="true">{{ float }}</span>
    </article>
  </div>
</template>
