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
import { formatMinutes as hm, timeToMin } from '../../supabase/functions/_shared/time'
import { calc, completionOf, doneToday, isSnoozed, items, markDone, now, nowMs, pauseTimer, profile, rescheduleToday, skipItem, skippedToday, snoozeItem, staleTasks, startTimer, undoToday } from '../lib/store'

const rows = computed(() =>
  calc.value.states
    .map((state) => ({ state, item: items.value.find((i) => i.id === state.id)! }))
    .sort((a, b) => a.state.deadlineMin - b.state.deadlineMin),
)
const nowRows = computed(() => rows.value.filter((r) => r.state.level !== 'normal'))
const laterRows = computed(() => rows.value.filter((r) => r.state.level === 'normal'))
const suggestedSkips = computed(() => calc.value.suggestSkips.map((id) => items.value.find((i) => i.id === id)!).filter(Boolean))

const total = computed(() => rows.value.length + doneToday.value.length)
const pct = computed(() => (total.value ? doneToday.value.length / total.value : 0))
const sleepLeftMin = computed(() => (profile.value ? Math.max(0, timeToMin(profile.value.sleep_time) - now.value.minutes) : 0))
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
// Dias de atraso de uma tarefa rolada (0 = vence hoje ou depois).
const rolledDays = (item: ItemRow) => (item.kind === 'task' && item.due_date! < now.value.day ? Math.round((Date.parse(now.value.day) - Date.parse(item.due_date!)) / 86_400_000) : 0)
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
  notify(planned ? `${item.name} feito · ${item.duration_min} min (estimado).` : `${item.name} feito.`, {
    undo: () => undoToday(item),
    action: planned ? { label: 'Ajustar tempo', run: () => (detail.value = item) } : undefined,
  }, planned ? 7000 : 5000)
}
function skip(item: ItemRow) {
  lastAction.value = 'skip'
  act(() => skipItem(item))
  notify(`${item.name}: ${item.kind === 'task' ? 'descartada' : 'pulado hoje'}.`, { undo: () => undoToday(item) })
}
function skipMany(list: ItemRow[]) {
  lastAction.value = 'skip'
  act(() => Promise.all(list.map(skipItem)))
  notify(`${list.length} ${list.length > 1 ? 'itens pulados' : 'item pulado'} hoje.`, { undo: () => Promise.all(list.map(undoToday)) })
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
      <template v-if="suggestedSkips.length">Sugestão: pular {{ suggestedSkips.map((i) => `“${i.name}”`).join(' e ') }}.</template>
      <template v-if="calc.unavoidableMin"> Mesmo assim faltam {{ hm(calc.unavoidableMin) }}: só sobram itens essenciais ou com horário fixo.</template>
    </div>
    <button v-if="suggestedSkips.length" class="btn ghost on-banner" @click="skipMany(suggestedSkips)">Pular</button>
  </div>

  <section v-if="allDone" class="closed">
    <div class="closed-mark"><Icon name="check" :size="34" /></div>
    <h2>Dia fechado.</h2>
    <p>Tudo feito. Sem desculpas.</p>
  </section>
  <p v-else-if="!rows.length && !staleTasks.length" class="empty">Nada para hoje. Toque em + para adicionar o primeiro item.</p>

  <details v-if="rows.length" class="howto">
    <summary>Como ler esta tela</summary>
    <ul>
      <li><strong>Começar até</strong> é o último momento em que dá para iniciar o item e ainda terminar tudo antes de dormir.</li>
      <li>A <strong>barra</strong> esvazia até esse momento. Quando acaba, o item está atrasado.</li>
      <li><strong>Neutro</strong>: tem tempo. <strong>Amarelo</strong>: atenção. <strong>Vermelho vivo</strong>: urgente. <strong>Vermelho escuro</strong>: atrasado.</li>
      <li><strong>Adiar alerta</strong> só silencia o aviso por 10 min. <strong>Pular hoje</strong> tira o item do dia.</li>
    </ul>
  </details>

  <div class="split">
  <div class="split-main">
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
        :rolled-days="rolledDays(item)"
        @done="complete(item, $event)"
        @timer="act(() => (running(item) ? pauseTimer(item) : startTimer(item)))"
        @focus="focused = item"
        @open="detail = item"
        @snooze="act(() => snoozeItem(item))"
        @skip="skip(item)"
      />
    </TransitionGroup>
  </template>

  </div>
  <aside class="split-aside">
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

  <template v-if="skippedToday.length">
    <h2 class="section">Pulados hoje</h2>
    <div v-for="item in skippedToday" :key="item.id" class="plain done-row">
      <span class="done-name meta">{{ item.name }}</span>
      <button class="btn ghost" @click="act(() => undoToday(item))"><Icon name="undo" :size="16" />Voltar para a lista</button>
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
            <span class="num">{{ completionOf(item)?.spent_min ?? 0 }} min</span><span v-if="completionOf(item)?.time_source === 'planned'" class="planned">estimado</span>
          </button>
          <button class="icon-btn small" aria-label="Desfazer" title="Desfazer" @click="act(() => undoToday(item))"><Icon name="undo" :size="16" /></button>
        </div>
      </div>
    </TransitionGroup>
  </template>
  </aside>
  </div>
</template>
