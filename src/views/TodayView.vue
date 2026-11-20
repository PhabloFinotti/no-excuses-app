<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DayClosed from '../components/DayClosed.vue'
import FocusMode from '../components/FocusMode.vue'
import Icon from '../components/Icon.vue'
import ItemCard from '../components/ItemCard.vue'
import ItemSheet from '../components/ItemSheet.vue'
import ItemTile from '../components/ItemTile.vue'
import ItemWizard from '../components/ItemWizard.vue'
import OnboardingCard from '../components/OnboardingCard.vue'
import { shortDate } from '../lib/format'
import { act, notify } from '../lib/toast'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds, isRepeat } from '../../supabase/functions/_shared/pending'
import { formatMinutes as hm, timeToMin } from '../../supabase/functions/_shared/time'
import { XP_PER_DONE } from '../lib/progress'
import {
  addTime, calc, completionOf, creatingItem, dayClosed, doneToday, isSnoozed, items, markDone, now, nowMs, pauseTimer, profile, progress, repeats,
  rescheduleToday, skipItem, skippedToday, snoozeItem, staleTasks, startTimer, undoTime, undoToday,
} from '../lib/store'

const rows = computed(() =>
  [...calc.value.states, ...repeats.value]
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
const greeting = computed(() => (now.value.minutes < 12 * 60 ? 'Bom dia!' : now.value.minutes < 18 * 60 ? 'Boa tarde!' : 'Boa noite!'))
const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const RING = 2 * Math.PI * 30

const focused = ref<ItemRow | null>(null)
const detail = ref<ItemRow | null>(null) // item aberto na folha de detalhes
const editing = ref<ItemRow | null>(null)
const celebrate = ref(false)
const lastAction = ref<'done' | 'skip'>('done') // define a animação de saída do card

const running = (item: ItemRow) => !!completionOf(item)?.timer_started_at
const elapsed = (item: ItemRow) => elapsedSeconds(completionOf(item), nowMs.value)
// Dias de atraso de uma tarefa rolada (0 = vence hoje ou depois).
const rolledDays = (item: ItemRow) => (item.kind === 'task' && item.due_date! < now.value.day ? Math.round((Date.parse(now.value.day) - Date.parse(item.due_date!)) / 86_400_000) : 0)
const timesOf = (item: ItemRow) => completionOf(item)?.done_times?.length ?? 0
const minutesToday = computed(() => doneToday.value.reduce((s, i) => s + (isRepeat(i) ? 0 : (completionOf(i)?.spent_min ?? 0)), 0))

function complete(item: ItemRow, minutes?: number) {
  const repeat = isRepeat(item)
  const count = timesOf(item) + 1 // item repetido: a vez que está sendo registrada
  const finishes = !repeat || count >= item.times_per_day!
  // Fecha o dia só se este era o último pendente e (sendo repetido) esta vez bate a meta.
  const closesDay = finishes && rows.value.length === 1 && rows.value[0]!.item.id === item.id
  lastAction.value = 'done'
  navigator.vibrate?.(finishes ? 20 : 10) // retorno tátil curto no Android
  if (closesDay) setTimeout(() => (celebrate.value = true), 650) // depois que o círculo encheu e a linha saiu
  if (repeat) {
    act(() => addTime(item))
    notify(`${item.name}: ${count} de ${item.times_per_day}${count === item.times_per_day ? '. Meta de hoje batida.' : '.'}`, { undo: () => undoTime(item) })
    return
  }
  // Sem timer nem minutos informados, o app grava o estimado: avisa e oferece corrigir.
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
// Subiu de nível nesta sessão (não ao abrir o app): um aviso curto, sem interromper.
watch(() => progress.value.level, (n, o) => o && n > o && notify(`Nível ${n}! Mais ${progress.value.span} XP até o próximo.`))
const toggleTimer = (item: ItemRow) => act(() => (running(item) ? pauseTimer(item) : startTimer(item)))
const leaveClass = (el: Element) => el.classList.add(`leave-${lastAction.value}`)
</script>

<template>
  <FocusMode
    v-if="focused"
    :item="focused"
    :clock="`${Math.floor(elapsed(focused) / 60)}:${String(Math.floor(elapsed(focused) % 60)).padStart(2, '0')}`"
    :running="running(focused)"
    @close="focused = null"
    @toggle="toggleTimer(focused!)"
    @done="complete(focused!); focused = null"
  />

  <ItemSheet
    v-if="detail"
    :key="detail.id"
    :item="detail"
    @close="detail = null"
    @finish="(m) => { complete(detail!, m); detail = null }"
    @timer="toggleTimer(detail!)"
    @focus="focused = detail; detail = null"
    @snooze="act(() => snoozeItem(detail!)); detail = null"
    @skip="skip(detail!); detail = null"
    @edit="editing = detail; detail = null"
  />
  <ItemWizard v-if="editing" :key="editing.id" :item="editing" @close="editing = null" />
  <DayClosed v-if="celebrate" :count="doneToday.length" :minutes="minutesToday" :xp="progress.xpToday" :streak="progress.streak" @close="celebrate = false" />

  <header class="today-head">
    <div>
      <p class="date">{{ dateLabel }}</p>
      <h1>{{ greeting }}</h1>
    </div>
    <div class="pills">
      <span class="pill flame" :class="{ off: !progress.streak }" :title="`Sequência: ${progress.streak} ${progress.streak === 1 ? 'dia fechado' : 'dias fechados'} seguidos`">
        <Icon name="flame" filled :size="18" /><span class="num">{{ progress.streak }}</span><span class="sr">dias seguidos</span>
      </span>
      <span class="pill xp" :title="`Nível ${progress.level}: ${progress.xp} XP no total`"><Icon name="star" filled :size="18" />Nv {{ progress.level }}</span>
    </div>
  </header>

  <div class="split">
  <div class="split-main">
    <section class="card day-card" aria-label="Resumo do dia">
      <div class="day-top">
        <div class="ring" role="img" :aria-label="`${doneToday.length} de ${total} feitos hoje`">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle class="bg" cx="36" cy="36" r="30" fill="none" stroke-width="9" />
            <circle class="fg" cx="36" cy="36" r="30" fill="none" stroke-width="9" stroke-linecap="round" :stroke-dasharray="RING" :stroke-dashoffset="RING * (1 - pct)" :style="{ opacity: pct ? 1 : 0 }" />
          </svg>
          <b><Icon v-if="dayClosed" name="check" :size="28" /><template v-else>{{ Math.round(pct * 100) }}%</template></b>
        </div>
        <div>
          <h2>{{ dayClosed ? 'Dia fechado' : total ? `${doneToday.length} de ${total} feitos` : 'Dia livre' }}</h2>
          <p class="meta">
            <template v-if="dayClosed">+{{ progress.xpToday }} XP hoje</template>
            <template v-else-if="sleepLeftMin">{{ hm(sleepLeftMin) }} até dormir</template>
            <template v-else>Hora de descansar</template>
          </p>
        </div>
      </div>

      <div v-if="calc.deficitMin" class="warn" role="alert">
        <Icon name="alert" :size="22" />
        <div>
          Não cabe tudo antes de dormir: faltam {{ hm(calc.deficitMin) }}.
          <template v-if="suggestedSkips.length"> Que tal pular {{ suggestedSkips.map((i) => `“${i.name}”`).join(' e ') }}?</template>
          <template v-if="calc.unavoidableMin"> Mesmo assim faltam {{ hm(calc.unavoidableMin) }} em itens essenciais ou com horário.</template>
        </div>
        <button v-if="suggestedSkips.length" @click="skipMany(suggestedSkips)">Pular</button>
      </div>

      <div class="week" aria-label="Dias fechados nesta semana">
        <div v-for="(d, i) in progress.week.days" :key="d.day" class="wk" :class="{ closed: d.closed, today: d.today, future: d.future }" :title="`${shortDate(d.day)}${d.closed ? ': dia fechado' : ''}`">
          <i><Icon v-if="d.closed" name="flame" filled :size="16" /></i>{{ LETTERS[i] }}
        </div>
        <div class="week-goal"><b class="num">{{ progress.week.closed }}/{{ progress.week.goal }}</b>na semana</div>
      </div>
    </section>

    <OnboardingCard />

    <section v-if="!items.length" class="card empty-card">
      <ItemTile :item="{ name: 'Ler', emoji: '🌱' }" size="lg" />
      <h2>Comece pelo primeiro hábito</h2>
      <p class="meta">Escolha algo pequeno para fazer todo dia. O app calcula até quando dá para começar e te avisa.</p>
      <button @click="creatingItem = true"><Icon name="plus" :size="22" />Criar item</button>
    </section>

    <template v-for="group in [{ title: 'Agora', rows: nowRows }, { title: 'Mais tarde', rows: laterRows }]" :key="group.title">
      <h2 v-if="group.rows.length" class="section">{{ group.title }} <span class="count num">{{ group.rows.length }}</span></h2>
      <TransitionGroup name="item" tag="div" @before-leave="leaveClass">
        <ItemCard
          v-for="{ state, item } in group.rows"
          :key="item.id"
          :item="item"
          :state="state"
          :elapsed-s="elapsed(item)"
          :running="running(item)"
          :snoozed="isSnoozed(item)"
          :rolled-days="rolledDays(item)"
          @done="complete(item)"
          @open="detail = item"
        />
      </TransitionGroup>
    </template>
  </div>

  <aside class="split-aside">
    <template v-if="staleTasks.length">
      <h2 class="section">Paradas há dias <span class="count num">{{ staleTasks.length }}</span></h2>
      <div v-for="item in staleTasks" :key="item.id" class="plain">
        <div class="item-row">
          <ItemTile :item="item" size="sm" />
          <div class="grow"><strong>{{ item.name }}</strong><p class="meta">Vencida em {{ shortDate(item.due_date!) }}. Fora do cálculo até você decidir.</p></div>
        </div>
        <div class="row" style="margin-top: 10px">
          <button @click="act(() => rescheduleToday(item))">Fazer hoje</button>
          <button class="ghost" @click="skip(item)">Descartar</button>
        </div>
      </div>
    </template>

    <template v-if="skippedToday.length">
      <h2 class="section">Pulados hoje</h2>
      <div class="mini-list">
        <div v-for="item in skippedToday" :key="item.id" class="mini">
          <ItemTile :item="item" size="sm" />
          <span class="name">{{ item.name }}</span>
          <button class="icon-btn" :aria-label="`Voltar ${item.name} para a lista`" title="Voltar para a lista" @click="act(() => undoToday(item))"><Icon name="undo" :size="18" /></button>
        </div>
      </div>
    </template>

    <template v-if="doneToday.length">
      <h2 class="section">Feitos hoje <span class="count num">{{ doneToday.length }}</span></h2>
      <TransitionGroup name="item" tag="div" class="mini-list">
        <div v-for="item in doneToday" :key="item.id" class="mini done">
          <ItemTile :item="item" size="sm" />
          <button class="link name" @click="detail = item">{{ item.name }}</button>
          <template v-if="isRepeat(item)">
            <span class="val num">{{ timesOf(item) }}/{{ item.times_per_day }}</span>
            <button class="ghost plus" :aria-label="`Registrar mais uma vez de ${item.name}`" @click="complete(item)">+1</button>
            <button class="icon-btn" :aria-label="`Desfazer a última vez de ${item.name}`" title="Desfazer a última vez" @click="act(() => undoTime(item))"><Icon name="undo" :size="18" /></button>
          </template>
          <template v-else>
            <span class="val xp-tag num">+{{ XP_PER_DONE }}</span>
            <button class="icon-btn" :aria-label="`Desfazer ${item.name}`" title="Desfazer" @click="act(() => undoToday(item))"><Icon name="undo" :size="18" /></button>
          </template>
        </div>
      </TransitionGroup>
    </template>

    <details v-if="rows.length" class="howto">
      <summary>Como ler esta tela</summary>
      <ul>
        <li><strong>Comece até</strong> é o último momento em que dá para começar o item e ainda terminar tudo antes de dormir.</li>
        <li>A linha fica <strong>âmbar</strong> quando o prazo se aproxima e <strong>vermelha</strong> quando está urgente ou atrasado.</li>
        <li>Toque no <strong>círculo</strong> para concluir. Toque no nome para cronômetro, foco, adiar ou pular.</li>
        <li>Itens que se repetem no dia mostram quantas vezes já foram feitos (<span class="num">2 de 5</span>) e a hora da próxima.</li>
        <li>Fechar o dia (tudo feito ou pulado) aumenta a <strong>sequência</strong>. Cada item feito vale {{ XP_PER_DONE }} XP.</li>
      </ul>
    </details>
  </aside>
  </div>

</template>
