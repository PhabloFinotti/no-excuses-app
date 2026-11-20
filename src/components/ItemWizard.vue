<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { addDays, formatMinutes as hm, minToTime, timeToMin } from '../../supabase/functions/_shared/time'
import { googleCalendarUrl } from '../lib/calendar'
import { CATEGORIES, categoryLabel, categoryOf, emojiOf, NO_CATEGORY } from '../lib/categories'
import { shortDate, weekdaysLabel } from '../lib/format'
import { parseDuration } from '../lib/quickAdd'
import { now, profile, saveItem, type ItemForm } from '../lib/store'
import { notify } from '../lib/toast'
import Icon from './Icon.vue'
import ItemTile from './ItemTile.vue'
import Sheet from './Sheet.vue'

// Cadastro como conversa curta: uma pergunta por passo, opções grandes, o resto deduzido e ajustável no resumo.
// Editar abre direto no resumo; cada linha leva ao passo dela e volta.
const props = defineProps<{ item?: ItemRow }>()
const emit = defineEmits<{ close: [] }>()

const editing = !!props.item
const ALL = [0, 1, 2, 3, 4, 5, 6]
const blank = (): ItemForm => ({
  id: crypto.randomUUID(), kind: 'habit', name: '', category: null, duration_min: 30, fixed_time: null, weekdays: [...ALL], due_date: null,
  essential: false, warn_min: null, urgent_min: null, emoji: null, ends_on: null, times_per_day: null, interval_min: null, repeat_from: null,
})
const form = reactive<ItemForm>(
  props.item ? { ...props.item, fixed_time: props.item.fixed_time?.slice(0, 5) ?? null, repeat_from: props.item.repeat_from?.slice(0, 5) ?? null } : blank(),
)

const LAST = 3
const step = ref(editing ? LAST : 0)
const returnTo = ref<number | null>(null) // veio do resumo: "Continuar" volta para ele
const error = ref('')
const busy = ref(false)
const heading = ref<HTMLElement>()

// ---- Passo 1: nome --------------------------------------------------------------------------------
const SUGGESTIONS = [
  { name: 'Beber água', emoji: '🥤', times: 8, interval: 60 },
  { name: 'Colírio', emoji: '💧', times: 5, interval: 120 },
  { name: 'Remédio', emoji: '💊', times: 2, interval: 720 },
  { name: 'Ler', duration: 30 },
  { name: 'Meditar', duration: 10 },
  { name: 'Academia', duration: 60 },
  { name: 'Estudar inglês', duration: 30 },
  { name: 'Alongar', duration: 10 },
] as const
function useSuggestion(s: (typeof SUGGESTIONS)[number]) {
  form.name = s.name
  form.emoji = 'emoji' in s ? s.emoji : null
  setWhen('daily')
  if ('times' in s) {
    setMulti(true)
    form.times_per_day = s.times
    form.interval_min = s.interval
  } else {
    setMulti(false)
    form.duration_min = s.duration
  }
  next()
}

// ---- Passo 2: quando --------------------------------------------------------------------------------
type When = 'daily' | 'weekdays' | 'custom' | 'once'
const sortedDays = () => [...form.weekdays].sort().join('')
const when = ref<When>(form.kind === 'task' ? 'once' : form.weekdays.length === 7 ? 'daily' : sortedDays() === '12345' ? 'weekdays' : 'custom')
function setWhen(w: When) {
  when.value = w
  form.kind = w === 'once' ? 'task' : 'habit'
  if (w === 'daily') form.weekdays = [...ALL]
  if (w === 'weekdays') form.weekdays = [1, 2, 3, 4, 5]
  if (w === 'custom' && form.weekdays.length === 7) form.weekdays = [] // escolher do zero; uma escolha anterior é mantida
  if (w === 'once') form.weekdays = []
  form.due_date = w === 'once' ? (form.due_date ?? now.value.day) : null
}
// Item que já existe não troca de tipo (as conclusões de tarefa e de hábito são guardadas de formas diferentes).
const WHEN_OPTIONS = computed(() =>
  [
    { key: 'daily', icon: 'repeat', label: 'Todo dia', hint: 'Sem folga' },
    { key: 'weekdays', icon: 'calendar', label: 'Dias úteis', hint: 'Segunda a sexta' },
    { key: 'custom', icon: 'pick', label: 'Escolher os dias', hint: 'Você marca' },
    { key: 'once', icon: 'once', label: 'Só uma vez', hint: 'Tarefa com data' },
  ].filter((o) => !editing || (o.key === 'once') === (form.kind === 'task')) as { key: When; icon: 'repeat' | 'calendar' | 'pick' | 'once'; label: string; hint: string }[],
)
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const toggleDay = (d: number) => (form.weekdays = form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d])
const today = computed(() => now.value.day)
const tomorrow = computed(() => addDays(now.value.day, 1))

// ---- Passo 3: quanto --------------------------------------------------------------------------------
const multi = ref((form.times_per_day ?? 0) > 1)
function setMulti(m: boolean) {
  multi.value = m
  form.times_per_day = m ? (form.times_per_day && form.times_per_day > 1 ? form.times_per_day : 3) : null
  form.interval_min = m ? (form.interval_min ?? 120) : null
}
const repeat = computed(() => form.kind === 'habit' && multi.value)
const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90]
const customDur = ref(!DURATIONS.includes(form.duration_min))
const INTERVALS = [30, 60, 90, 120, 180, 240, 360, 480, 720]
const intervals = computed(() => [...new Set([...INTERVALS, form.interval_min ?? 120])].sort((a, b) => a - b))
const every = (m: number) => (m % 60 ? hm(m) : `${m / 60}h`)
const bump = (d: number) => (form.times_per_day = Math.min(24, Math.max(2, (form.times_per_day ?? 2) + d)))

// ---- Resumo ---------------------------------------------------------------------------------------
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const whenText = computed(() =>
  form.kind === 'task'
    ? form.due_date === today.value ? 'Hoje' : form.due_date === tomorrow.value ? 'Amanhã' : shortDate(form.due_date ?? today.value)
    : form.weekdays.length ? cap(weekdaysLabel(form.weekdays)) : 'Nenhum dia',
)
const amountText = computed(() =>
  repeat.value ? `${form.times_per_day}x por dia, a cada ${every(form.interval_min!)}${form.repeat_from ? `, a partir de ${form.repeat_from}` : ''}` : hm(form.duration_min),
)
const categoryEmoji = computed(() => emojiOf({ name: form.name, category: form.category }))
const detected = computed(() => categoryLabel(categoryOf({ name: form.name })))
const categoryValue = computed(() => (form.category === NO_CATEGORY ? 'Nenhuma' : form.category ? categoryLabel(form.category) : `Automática${detected.value ? ` (${detected.value})` : ''}`))
const category = computed({ get: () => form.category ?? '', set: (v: string) => (form.category = v || null) })
const num = (v: unknown) => (v === '' || v == null ? null : Number(v))
const open = ref<string | null>(null)
const toggle = (k: string) => (open.value = open.value === k ? null : k)

// ---- Navegação --------------------------------------------------------------------------------------
// No meio da frase o nome vai em minúscula ("Quando você faz ler?"); siglas ficam como estão.
const inSentence = computed(() => (/^\p{Lu}\p{Ll}/u.test(form.name) ? form.name.charAt(0).toLowerCase() + form.name.slice(1) : form.name))
const titles = computed(() => [
  editing ? 'Nome do item' : 'O que você quer fazer?',
  form.kind === 'task' && editing ? `Quando é ${inSentence.value}?` : `Quando você faz ${inSentence.value}?`,
  form.kind === 'task' ? `Quanto tempo leva ${inSentence.value}?` : `Como é ${inSentence.value} no seu dia?`,
  editing ? 'Revise e salve' : 'Tudo certo?',
])

// Meta que não cabe nem começando na hora: o item nasceria atrasado todo dia.
function repeatProblem() {
  if (!repeat.value || !profile.value) return ''
  const start = form.repeat_from ? timeToMin(form.repeat_from) : timeToMin(profile.value.wake_time)
  const sleep = timeToMin(profile.value.sleep_time)
  return start + (form.times_per_day! - 1) * form.interval_min! >= sleep
    ? `${form.times_per_day} vezes a cada ${every(form.interval_min!)} não cabem entre ${minToTime(start)} e ${minToTime(sleep)}, sua hora de dormir. Diminua as vezes ou o intervalo.`
    : ''
}
function problem(s: number): string {
  if (s === 0 && !form.name.trim()) return 'Dê um nome ao item.'
  if (s === 1 && form.kind === 'habit' && !form.weekdays.length) return 'Marque pelo menos um dia.'
  if (s === 1 && form.kind === 'task' && !form.due_date) return 'Escolha a data.'
  if (s === 2 && !repeat.value && (!Number.isInteger(form.duration_min) || form.duration_min < 1 || form.duration_min > 1440)) return 'A duração precisa ser de 1 a 1440 minutos.'
  if (s === 2) return repeatProblem()
  return ''
}
async function goto(s: number) {
  error.value = ''
  step.value = s
  await nextTick()
  if (s > 0) heading.value?.focus()
}
function next() {
  error.value = problem(step.value)
  if (error.value) return
  if (step.value === 0 && !editing) {
    form.name = form.name.trim()
    // "Ler por 60 minutos" vira nome "Ler" + 60 min, como na adição rápida.
    const parsed = parseDuration(form.name, { bare: false })
    if (parsed && parsed.durationMin >= 1 && parsed.durationMin <= 1440) {
      form.name = parsed.name
      form.duration_min = parsed.durationMin
      customDur.value = !DURATIONS.includes(parsed.durationMin)
    }
  }
  if (step.value === LAST) return save()
  goto(returnTo.value ?? step.value + 1)
  returnTo.value = null
}
function back() {
  if (returnTo.value !== null) {
    returnTo.value = null
    return goto(LAST)
  }
  if (step.value > 0) goto(step.value - 1)
}
function edit(s: number) {
  returnTo.value = LAST
  goto(s)
}
const cta = computed(() =>
  step.value < LAST ? (returnTo.value !== null ? 'Voltar ao resumo' : 'Continuar') : editing ? 'Salvar alterações' : form.kind === 'task' ? 'Criar tarefa' : 'Criar hábito',
)

async function save() {
  if (busy.value) return
  error.value = [0, 1, 2].map(problem).find(Boolean) ?? ''
  if (error.value) return
  busy.value = true
  try {
    const name = form.name.trim()
    const common = { name, emoji: form.emoji?.trim() || null, ends_on: form.kind === 'habit' ? form.ends_on || null : null }
    // Item repetido não tem duração nem horário fixo (a coluna exige duração > 0: fica 1).
    const fields = repeat.value
      ? { duration_min: 1, fixed_time: null, essential: false, warn_min: null, urgent_min: null, repeat_from: form.repeat_from || null }
      : { fixed_time: form.fixed_time || null, warn_min: num(form.warn_min), urgent_min: num(form.urgent_min), times_per_day: null, interval_min: null, repeat_from: null }
    await saveItem({ ...form, ...common, ...fields })
    if (form.kind === 'task' && !editing && !profile.value?.calendar_connected) {
      const t = { name, due_date: form.due_date!, fixed_time: form.fixed_time || null, duration_min: form.duration_min }
      notify(`${name} criada.`, { action: { label: 'Agenda', run: () => window.open(googleCalendarUrl(t, profile.value?.tz ?? 'America/Sao_Paulo'), '_blank', 'noopener') } })
    } else notify(editing ? 'Alterações salvas.' : `${name} criado. Já está no Hoje.`)
    emit('close')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Sheet :title="editing ? `Editar ${item!.name}` : 'Novo item'" full persistent @close="emit('close')">
    <div class="flow">
      <div class="flow-head">
        <button v-if="step > 0 && !(editing && step === LAST)" class="icon-btn" aria-label="Voltar" @click="back"><Icon name="back" :size="24" /></button>
        <span v-else />
        <div class="bar" role="progressbar" :aria-valuenow="step + 1" aria-valuemin="1" :aria-valuemax="LAST + 1" :aria-label="`Passo ${step + 1} de ${LAST + 1}`">
          <i :style="{ transform: `scaleX(${(step + 1) / (LAST + 1)})` }" />
        </div>
        <button class="icon-btn" aria-label="Fechar sem salvar" @click="emit('close')"><Icon name="x" :size="24" /></button>
      </div>

      <div class="flow-body">
        <div :key="step" class="step">
          <h2 ref="heading" tabindex="-1">{{ titles[step] }}</h2>

          <!-- 1. Nome -->
          <template v-if="step === 0">
            <div class="name-field">
              <ItemTile :item="form" size="lg" />
              <input v-model="form.name" placeholder="Ex.: Ler 20 páginas" aria-label="Nome do item" autocomplete="off" enterkeyhint="next" @keydown.enter.prevent="next" />
            </div>
            <div v-if="!editing" class="suggest">
              <p class="meta">Ou comece por um destes</p>
              <div class="chips">
                <button v-for="s in SUGGESTIONS" :key="s.name" class="chip-btn" @click="useSuggestion(s)">
                  <span aria-hidden="true">{{ emojiOf({ name: s.name, emoji: 'emoji' in s ? s.emoji : null }) }}</span>{{ s.name }}
                </button>
              </div>
            </div>
          </template>

          <!-- 2. Quando -->
          <template v-else-if="step === 1">
            <div class="options">
              <button v-for="o in WHEN_OPTIONS" :key="o.key" class="option" :class="{ on: when === o.key }" :aria-pressed="when === o.key" @click="setWhen(o.key)">
                <Icon :name="o.icon" :size="22" />{{ o.label }}<small>{{ o.hint }}</small>
              </button>
            </div>
            <div v-if="when === 'custom'" class="sub-block">
              <p class="meta">Em quais dias?</p>
              <div class="chips days">
                <button v-for="(d, i) in DAYS" :key="i" class="chip-btn day" :class="{ on: form.weekdays.includes(i) }" :aria-pressed="form.weekdays.includes(i)" :aria-label="DAY_NAMES[i]" @click="toggleDay(i)">{{ d }}</button>
              </div>
            </div>
            <div v-if="when === 'once'" class="sub-block">
              <p class="meta">Para quando?</p>
              <div class="chips">
                <button class="chip-btn" :class="{ on: form.due_date === today }" @click="form.due_date = today">Hoje</button>
                <button class="chip-btn" :class="{ on: form.due_date === tomorrow }" @click="form.due_date = tomorrow">Amanhã</button>
              </div>
              <label>Ou escolha a data<input v-model="form.due_date" type="date" /></label>
            </div>
          </template>

          <!-- 3. Quanto -->
          <template v-else-if="step === 2">
            <div v-if="form.kind === 'habit'" class="options">
              <button class="option" :class="{ on: !multi }" :aria-pressed="!multi" @click="setMulti(false)"><Icon name="clock" :size="22" />Uma vez por dia<small>Leva um tempo, ex.: ler</small></button>
              <button class="option" :class="{ on: multi }" :aria-pressed="multi" @click="setMulti(true)"><Icon name="repeat" :size="22" />Várias vezes<small>Ex.: colírio, água</small></button>
            </div>
            <template v-if="!repeat">
              <div class="sub-block">
                <p class="meta">Quanto tempo leva?</p>
                <div class="chips">
                  <button v-for="d in DURATIONS" :key="d" class="chip-btn" :class="{ on: !customDur && form.duration_min === d }" @click="customDur = false; form.duration_min = d">{{ hm(d) }}</button>
                  <button class="chip-btn" :class="{ on: customDur }" @click="customDur = true">Outro</button>
                </div>
                <label v-if="customDur">Minutos<input v-model.number="form.duration_min" type="number" inputmode="numeric" min="1" max="1440" /></label>
              </div>
            </template>
            <template v-else>
              <div class="sub-block">
                <p class="meta">Quantas vezes por dia?</p>
                <div class="stepper">
                  <button class="ghost" aria-label="Uma vez a menos" :disabled="form.times_per_day! <= 2" @click="bump(-1)"><span aria-hidden="true">−</span></button>
                  <output aria-live="polite">{{ form.times_per_day }}x</output>
                  <button class="ghost" aria-label="Uma vez a mais" :disabled="form.times_per_day! >= 24" @click="bump(1)"><span aria-hidden="true">+</span></button>
                </div>
              </div>
              <div class="sub-block">
                <p class="meta">De quanto em quanto tempo?</p>
                <div class="chips">
                  <button v-for="m in intervals" :key="m" class="chip-btn" :class="{ on: form.interval_min === m }" @click="form.interval_min = m">{{ every(m) }}</button>
                </div>
              </div>
              <div class="sub-block">
                <label style="margin-top: 0">Primeiro aviso (opcional)<input v-model="form.repeat_from" type="time" /></label>
                <p class="meta hint">Cada aviso vem um intervalo depois da última vez que você registrar. Vazio: o primeiro sai na hora de acordar.</p>
              </div>
            </template>
          </template>

          <!-- 4. Resumo -->
          <template v-else>
            <div class="summary-hero">
              <ItemTile :item="form" size="lg" />
              <h3>{{ form.name }}</h3>
              <p>{{ whenText }} · {{ amountText }}</p>
            </div>
            <div class="set-list">
              <button class="set-row" @click="edit(0)"><span class="k">Nome</span><span class="v">{{ form.name }}</span><Icon name="next" /></button>
              <button class="set-row" @click="edit(1)"><span class="k">Quando</span><span class="v">{{ whenText }}</span><Icon name="next" /></button>
              <button class="set-row" @click="edit(2)"><span class="k">{{ repeat ? 'Vezes' : 'Duração' }}</span><span class="v">{{ amountText }}</span><Icon name="next" /></button>
            </div>

            <p class="subtle-title" style="margin-top: 22px">Opcional</p>
            <div class="set-list" style="margin-top: 12px">
              <button class="set-row" :aria-expanded="open === 'emoji'" @click="toggle('emoji')"><span class="k">Emoji<small>Aparece nos cards e nos avisos</small></span><span class="v">{{ form.emoji || `Da categoria${categoryEmoji ? ` ${categoryEmoji}` : ''}` }}</span></button>
              <div v-if="open === 'emoji'" class="set-extra"><input v-model="form.emoji" maxlength="16" :placeholder="categoryEmoji || 'Um emoji'" aria-label="Emoji" /></div>

              <button class="set-row" :aria-expanded="open === 'category'" @click="toggle('category')"><span class="k">Categoria</span><span class="v">{{ categoryValue }}</span></button>
              <div v-if="open === 'category'" class="set-extra">
                <select v-model="category" aria-label="Categoria">
                  <option value="">Automática{{ detected ? ` (${detected})` : '' }}</option>
                  <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.emoji }} {{ c.label }}</option>
                  <option :value="NO_CATEGORY">Nenhuma</option>
                </select>
              </div>

              <template v-if="!repeat">
                <button class="set-row" :aria-expanded="open === 'fixed'" @click="toggle('fixed')"><span class="k">Horário marcado<small>Sem horário, o app calcula até quando dá para começar</small></span><span class="v">{{ form.fixed_time || 'Não' }}</span></button>
                <div v-if="open === 'fixed'" class="set-extra"><input v-model="form.fixed_time" type="time" aria-label="Horário marcado" /></div>
              </template>

              <label v-if="form.kind === 'habit' && !repeat" class="set-row" style="margin: 0">
                <span class="k">Essencial<small>O app nunca sugere pular</small></span>
                <input v-model="form.essential" type="checkbox" class="switch" />
              </label>

              <template v-if="form.kind === 'habit'">
                <button class="set-row" :aria-expanded="open === 'ends'" @click="toggle('ends')"><span class="k">Termina em<small>Para tratamentos com prazo</small></span><span class="v">{{ form.ends_on ? shortDate(form.ends_on) : 'Nunca' }}</span></button>
                <div v-if="open === 'ends'" class="set-extra"><input v-model="form.ends_on" type="date" aria-label="Termina em" /></div>
              </template>

              <template v-if="!repeat">
                <button class="set-row" :aria-expanded="open === 'alerts'" @click="toggle('alerts')"><span class="k">Avisos próprios</span><span class="v">{{ form.warn_min != null || form.urgent_min != null ? `${form.warn_min ?? 'padrão'} / ${form.urgent_min ?? 'padrão'} min` : 'Padrão' }}</span></button>
                <div v-if="open === 'alerts'" class="set-extra">
                  <label>Avisar com quantos min de folga<input v-model="form.warn_min" type="number" min="0" placeholder="padrão de Ajustes" /></label>
                  <label>Urgente com quantos min<input v-model="form.urgent_min" type="number" min="0" placeholder="padrão de Ajustes" /></label>
                </div>
              </template>
            </div>
          </template>

          <p v-if="error" class="error" role="alert" style="margin-top: 14px">{{ error }}</p>
        </div>
      </div>

      <div class="flow-foot">
        <button :disabled="busy || (step === 0 && !form.name.trim())" @click="next">{{ busy ? 'Salvando…' : cta }}</button>
      </div>
    </div>
  </Sheet>
</template>
