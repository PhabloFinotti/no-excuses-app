<script setup lang="ts">
import { computed, ref } from 'vue'
import FocusMode from '../components/FocusMode.vue'
import Icon from '../components/Icon.vue'
import ItemCard from '../components/ItemCard.vue'
import ItemSheet from '../components/ItemSheet.vue'
import QuickAdd from '../components/QuickAdd.vue'
import OnboardingCard from '../components/OnboardingCard.vue'
import { shortDate } from '../lib/format'
import { burst } from '../lib/confetti'
import { act, notify } from '../lib/toast'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds } from '../../supabase/functions/_shared/pending'
import { timeToMin } from '../../supabase/functions/_shared/time'
import { calc, completionOf, doneToday, isSnoozed, items, markDone, now, nowMs, pauseTimer, profile, rescheduleToday, skipItem, snoozeItem, staleTasks, startTimer, undoToday } from '../lib/store'

const rows = computed(() =>
  calc.value.states
    .map((state) => ({ state, item: items.value.find((i) => i.id === state.id)! }))
    .sort((a, b) => a.state.deadlineMin - b.state.deadlineMin),
)
const nowRows = computed(() => rows.value.filter((r) => r.state.level !== 'normal'))
const laterRows = computed(() => rows.value.filter((r) => r.state.level === 'normal'))
const suggested = computed(() => items.value.find((i) => i.id === calc.value.suggestSkip))

const total = computed(() => rows.value.length + doneToday.value.length)
const pct = computed(() => (total.value ? doneToday.value.length / total.value : 0))
const sleepLeftMin = computed(() => (profile.value ? Math.max(0, timeToMin(profile.value.sleep_time) - now.value.minutes) : 0))
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`)
const dateLabel = computed(() =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: profile.value?.tz }).format(new Date(nowMs.value)),
)
const nowSec = computed(() => now.value.minutes * 60 + new Date(nowMs.value).getSeconds())
const allDone = computed(() => !rows.value.length && doneToday.value.length > 0)

const focused = ref<ItemRow | null>(null)
const detail = ref<ItemRow | null>(null) // item aberto na folha de detalhes (tempo/edição)
const lastAction = ref<'done' | 'skip'>('done') // define a animação de saída do card

const running = (item: ItemRow) => !!completionOf(item)?.timer_started_at
const elapsed = (item: ItemRow) => elapsedSeconds(completionOf(item), nowMs.value)
const hasTimer = (item: ItemRow) => running(item) || (completionOf(item)?.timer_accum_s ?? 0) > 0
const rolled = (item: ItemRow) => item.kind === 'task' && item.due_date! < now.value.day
const warnOf = (item: ItemRow) => item.warn_min ?? profile.value?.warn_min ?? 30

function complete(item: ItemRow, e?: MouseEvent, minutes?: number) {
  const wasLast = rows.value.length === 1
  const el = e?.currentTarget as HTMLElement | undefined
  const r = el?.getBoundingClientRect()
  lastAction.value = 'done'
  burst(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2)
  if (wasLast) setTimeout(() => burst(innerWidth / 2, innerHeight * 0.25, true), 280)
  navigator.vibrate?.(15) // retorno tátil curto no Android
  // Sem timer nem minutos informados, o app grava o previsto: avisa e oferece corrigir.
  const planned = minutes == null && elapsed(item) < 60
  act(() => markDone(item, minutes))
  notify(planned ? `${item.name} feito · ${item.duration_min} min (previsto).` : `${item.name} feito.`, {
    undo: () => undoToday(item),
    action: planned ? { label: 'Ajustar tempo', run: () => (detail.value = item) } : undefined,
  }, planned ? 7000 : 5000)
}
function skip(item: ItemRow) {
  lastAction.value = 'skip'
  act(() => skipItem(item))
  notify(`${item.name}: ${item.kind === 'task' ? 'descartada' : 'pulado hoje'}.`, { undo: () => undoToday(item) })
}
const leaveClass = (el: Element) => el.classList.add(`leave-${lastAction.value}`)
</script>

<template>
  <FocusMode
    v-if="focused"
    :item="focused"
    :clock="`${Math.floor(elapsed(focused) / 60)}:${String(Math.floor(elapsed(focused) % 60)).padStart(2, '0')}`"
    :running="running(focused)"
    @close="focused = null"
    @toggle="act(() => (running(focused!) ? pauseTimer(focused!) : startTimer(focused!)))"
    @done="complete(focused!); focused = null"
  />

  <ItemSheet v-if="detail" :key="detail.id" :item="detail" @close="detail = null" @finish="(m) => { complete(detail!, undefined, m); detail = null }" />

  <header class="day">
    <p class="date">{{ dateLabel }}</p>
    <h1>Hoje</h1>
    <div v-if="total" class="day-progress">
      <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${pct})` }" /></div>
      <p class="meta"><span class="num">{{ doneToday.length }}/{{ total }}</span> feitos<template v-if="sleepLeftMin"> · <span class="num">{{ hm(sleepLeftMin) }}</span> até dormir</template></p>
    </div>
  </header>

  <OnboardingCard />
  <QuickAdd />

  <div v-if="calc.deficitMin" class="banner" role="alert">
    <Icon name="alert" />
    <div>
      <strong>Não cabe tudo antes de dormir.</strong> Faltam {{ hm(calc.deficitMin) }}.
      <template v-if="suggested">Sugestão: pular “{{ suggested.name }}”.</template>
    </div>
    <button v-if="suggested" class="btn ghost on-banner" @click="skip(suggested!)">Pular</button>
  </div>

  <section v-if="allDone" class="closed">
    <div class="closed-mark"><Icon name="check" :size="34" /></div>
    <h2>Dia fechado.</h2>
    <p>Tudo feito. Sem desculpas.</p>
  </section>
  <p v-else-if="!rows.length && !staleTasks.length" class="empty">Nada para hoje. Cadastre um hábito ou uma tarefa na aba Itens.</p>

  <template v-for="group in [{ title: 'Agora', rows: nowRows }, { title: 'Mais tarde', rows: laterRows }]" :key="group.title">
    <h2 v-if="group.rows.length" class="section">{{ group.title }}</h2>
    <TransitionGroup name="item" tag="div" @before-leave="leaveClass">
      <ItemCard
        v-for="{ state, item } in group.rows"
        :key="item.id"
        :item="item"
        :state="state"
        :warn-min="warnOf(item)"
        :now-sec="nowSec"
        :elapsed-s="elapsed(item)"
        :has-timer="hasTimer(item)"
        :running="running(item)"
        :snoozed="isSnoozed(item)"
        :rolled="rolled(item)"
        @done="complete(item, $event)"
        @timer="act(() => (running(item) ? pauseTimer(item) : startTimer(item)))"
        @focus="focused = item"
        @open="detail = item"
        @snooze="act(() => snoozeItem(item))"
        @skip="skip(item)"
      />
    </TransitionGroup>
  </template>

  <template v-if="staleTasks.length">
    <h2 class="section">Paradas há dias</h2>
    <div v-for="item in staleTasks" :key="item.id" class="plain">
      <strong>{{ item.name }}</strong>
      <p class="meta">Vencida em {{ shortDate(item.due_date!) }}. Fora do cálculo de tempo até você decidir.</p>
      <div class="actions">
        <button class="btn primary" @click="act(() => rescheduleToday(item))">Fazer hoje</button>
        <button class="btn ghost" @click="skip(item)">Descartar</button>
      </div>
    </div>
  </template>

  <template v-if="doneToday.length">
    <h2 class="section">Feitos hoje</h2>
    <TransitionGroup name="item" tag="div">
      <div v-for="item in doneToday" :key="item.id" class="slot">
        <div class="plain done-row">
          <span class="done-check"><Icon name="check" :size="16" /></span>
          <button class="link done-name" @click="detail = item">{{ item.name }}</button>
          <button class="link time-chip" aria-label="Ajustar o tempo registrado" @click="detail = item">
            <span class="num">{{ completionOf(item)?.spent_min ?? 0 }} min</span><span v-if="completionOf(item)?.time_source === 'planned'" class="planned">previsto</span>
          </button>
          <button class="icon-btn small" aria-label="Desfazer" title="Desfazer" @click="act(() => undoToday(item))"><Icon name="undo" :size="16" /></button>
        </div>
      </div>
    </TransitionGroup>
  </template>
</template>
