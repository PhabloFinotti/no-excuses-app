<script setup lang="ts">
import { computed, ref } from 'vue'
import ColumnChart from '../components/ColumnChart.vue'
import { shortDate } from '../lib/format'
import { act, notify } from '../lib/toast'
import { archivedItems, completions, items, setDuration, today } from '../lib/store'
import { categoryOf } from '../lib/categories'
import { formatMinutes as hm } from '../../supabase/functions/_shared/time'
import { computeCategoryStats, computeHabitDetail, computeStats } from '../lib/stats'

// Aplica a duração sugerida e deixa desfazer (era uma mudança silenciosa).
function applyDuration(id: string, name: string, oldMin: number, newMin: number) {
  act(() => setDuration(id, newMin))
  notify(`${name}: duração ajustada para ${newMin} min.`, { undo: () => setDuration(id, oldMin) })
}

const RANGES = [7, 30, 90] as const
const days = ref<(typeof RANGES)[number]>(30)
// Escopo: todos, uma categoria ("cat:reading") ou um hábito (id). Itens arquivados entram só com o que já aconteceu.
const selectedId = ref('')
const catKey = computed(() => (selectedId.value.startsWith('cat:') ? selectedId.value.slice(4) : ''))
const everything = computed(() => [...items.value, ...archivedItems.value])
const scoped = computed(() => (catKey.value ? everything.value.filter((i) => categoryOf(i) === catKey.value) : everything.value))
const stats = computed(() => computeStats(scoped.value, completions.value, today.value, days.value))
const categories = computed(() => computeCategoryStats(everything.value, completions.value, today.value, days.value))
const catCard = computed(() => categories.value.find((c) => c.key === catKey.value))
const activeHabitStats = computed(() => stats.value.habitStats.filter((h) => !h.archived))

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const dayTitle = (day: string) => `${WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]!.slice(0, 3)}, ${shortDate(day)}`
const ticksFor = (list: { day: string }[]) => {
  const n = list.length
  return [0, Math.floor((n - 1) / 2), n - 1].map((i) => ({ i, text: shortDate(list[i]!.day) }))
}
const titles = computed(() => stats.value.cells.map((c) => dayTitle(c.day)))
const bestIndex = computed(() => stats.value.cells.findIndex((c) => c.day === stats.value.best.day))
const xTicks = computed(() => ticksFor(stats.value.cells))

// Escopo: todos os itens ou um hábito específico.
const habits = computed(() => items.value.filter((i) => i.kind === 'habit'))
const habit = computed(() => habits.value.find((h) => h.id === selectedId.value))
const detail = computed(() => (habit.value ? computeHabitDetail(habit.value, completions.value, today.value, days.value) : null))
const habitCard = computed(() => stats.value.habitStats.find((h) => h.id === habit.value?.id))
const detailTitles = computed(() => detail.value?.cells.map((c) => dayTitle(c.day)) ?? [])
// Melhores dias (pode haver empate): só entre os dias em que o hábito é agendado.
const bestWeekdays = computed(() => {
  const d = detail.value
  if (!d || !habit.value) return []
  const top = Math.max(...habit.value.weekdays.map((w) => d.weekdayRate[w]!))
  return habit.value.weekdays.filter((w) => d.weekdayRate[w] === top).sort()
})
const bestWeekdaysText = computed(() => {
  const [w] = bestWeekdays.value
  if (w === undefined) return ''
  if (bestWeekdays.value.length === 1) return `Você cumpre mais ${w === 0 || w === 6 ? 'no' : 'na'} ${WEEKDAYS[w]!.toLowerCase()}${w === 0 || w === 6 ? '' : '-feira'}.`
  return `Melhores dias: ${bestWeekdays.value.map((x) => WEEKDAYS[x]!.slice(0, 3)).join(', ')} (${detail.value!.weekdayRate[w]}%).`
})
const weekdayTitles = computed(() => WEEKDAYS.map((d, i) => (habit.value && !habit.value.weekdays.includes(i) ? `${d} (não agendado)` : d)))
function pick(id: string) {
  selectedId.value = id
  window.scrollTo({ top: 0 })
}
const bestWeekday = computed(() => stats.value.weekdayAvg.indexOf(Math.max(...stats.value.weekdayAvg)))
const avgLabel = computed(() => stats.value.avgPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
// Células do calendário para os dois escopos: cor, tooltip e se o dia teve algo agendado.
const calendar = computed(() => {
  if (detail.value)
    return detail.value.cells.map((c) => ({
      day: c.day, has: c.scheduled,
      bg: c.done ? 'var(--ok)' : c.skipped ? 'var(--attention)' : c.counted ? 'var(--urgent)' : '',
      title: c.done ? `Feito (${c.minutes} min)` : c.skipped ? 'Pulado' : c.counted ? 'Não feito' : c.scheduled ? 'Hoje' : 'Sem agenda',
    }))
  if (catKey.value)
    return stats.value.cells.map((c) => ({
      day: c.day, has: c.scheduled > 0 || c.done > 0,
      bg: c.done > 0 ? 'var(--ok)' : c.scheduled > 0 ? 'var(--urgent)' : '',
      title: c.done > 0 ? `${c.done} feito(s)` : c.scheduled > 0 ? 'Nada feito' : 'Sem agenda',
    }))
  return stats.value.cells.map((c) => ({
    day: c.day, has: c.scheduled > 0,
    bg: !c.scheduled ? '' : c.done === c.scheduled ? 'var(--ok)' : c.done ? 'var(--attention)' : 'var(--urgent)',
    title: `${c.done}/${c.scheduled}`,
  }))
})
const offset = computed(() => new Date(`${calendar.value[0]?.day}T00:00:00Z`).getUTCDay())
</script>

<template>
  <h1>Histórico</h1>
  <div class="filters">
    <div class="chips range" role="group" aria-label="Período">
      <button v-for="r in RANGES" :key="r" class="ghost" :class="{ on: days === r }" :aria-pressed="days === r" @click="days = r">{{ r }} dias</button>
    </div>
    <select v-model="selectedId" aria-label="Escopo do histórico">
      <option value="">Todos os itens</option>
      <optgroup v-if="categories.length" label="Categorias">
        <option v-for="c in categories" :key="c.key" :value="`cat:${c.key}`">Categoria · {{ c.label }}</option>
      </optgroup>
      <optgroup label="Hábitos">
        <option v-for="h in habits" :key="h.id" :value="h.id">Hábito · {{ h.name }}</option>
      </optgroup>
    </select>
  </div>

  <p v-if="stats.cells.length < days" class="meta">O período mostra só os {{ stats.cells.length }} dias desde o primeiro item cadastrado.</p>
  <details class="fold">
    <summary>Como contamos</summary>
    <p class="meta">Itens pulados de propósito não contam como falha nem quebram a sequência. Sequências valem dentro do período escolhido. O que foi feito em itens arquivados continua valendo.</p>
  </details>

  <div class="charts">
  <template v-if="detail && habit">
    <section>
    <h2 class="section">{{ habit.name }}</h2>
    <div class="plain stat">
      <div class="stat-top">
        <strong>Cumprimento</strong>
        <span class="stat-rate">{{ Math.round(detail.rate * 100) }}%</span>
      </div>
      <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${detail.rate})` }" /></div>
      <p class="meta">
        {{ detail.done }} de {{ detail.counted }} dias agendados · sequência atual <span class="num">{{ detail.streak }}</span> · melhor <span class="num">{{ detail.bestStreak }}</span>
      </p>
      <p class="meta">
        Tempo total {{ hm(detail.totalMinutes) }}<template v-if="detail.avgMinutes"> · média por vez {{ detail.avgMinutes }} min (estimado {{ habit.duration_min }})</template>
        <template v-if="habitCard && habitCard.samples >= 3"> · 80% das vezes leva até {{ habitCard.p80Min }} min</template>
      </p>
      <button v-if="habitCard?.suggestedDurationMin" class="ghost" style="margin-top: 8px" @click="applyDuration(habit!.id, habit!.name, habit!.duration_min, habitCard!.suggestedDurationMin!)">
        Ajustar duração para {{ habitCard.suggestedDurationMin }} min
      </button>
    </div>

    </section>
    <section>
    <h2 class="section">Tempo por vez</h2>
    <div class="plain">
      <p class="meta" style="margin-bottom: 8px">Cada coluna é o tempo registrado no dia; a linha é a duração estimada.</p>
      <ColumnChart :values="detail.cells.map((c) => c.minutes)" :titles="detailTitles" :x-ticks="ticksFor(detail.cells)" value-name="min" :line="detail.cells.map(() => habit!.duration_min)" line-name="estimado" />
    </div>

    </section>
    <section>
    <h2 class="section">Cumprimento por dia da semana</h2>
    <div class="plain">
      <p class="meta" style="margin-bottom: 8px">{{ bestWeekdaysText }}</p>
      <ColumnChart :values="detail.weekdayRate" :titles="weekdayTitles" :x-ticks="WEEKDAYS.map((d, i) => ({ i, text: d.slice(0, 3) }))" value-name="% dos dias" :highlight="bestWeekdays.length === 1 ? bestWeekdays[0] : undefined" />
    </div>
    </section>
  </template>

  <template v-else>
    <section v-if="catCard">
  <h2 class="section">{{ catCard.label }}</h2>
  <div class="plain stat">
    <div class="stat-top">
      <strong>Dias com {{ catCard.label.toLowerCase() }}</strong>
      <span class="stat-rate">{{ catCard.activeDays }}/{{ catCard.days }}</span>
    </div>
    <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${catCard.activeDays / catCard.days})` }" /></div>
    <p class="meta">Um dia conta se qualquer item desta categoria foi feito · sequência <span class="num">{{ catCard.streak }}</span> · {{ hm(catCard.minutes) }} no período · {{ catCard.done }} conclusões</p>
    <p class="meta">Inclui os itens arquivados: o que você já fez continua valendo.</p>
  </div>
    </section>
    <section v-else-if="categories.length">
  <h2 class="section">Por categoria</h2>
  <div class="habit-grid">
    <button v-for="c in categories" :key="c.key" class="plain stat cat-card" @click="pick(`cat:${c.key}`)">
      <div class="stat-top"><strong>{{ c.label }}</strong><span class="stat-rate">{{ c.activeDays }}/{{ c.days }}</span></div>
      <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${c.activeDays / c.days})` }" /></div>
      <span class="meta">dias com atividade · sequência <span class="num">{{ c.streak }}</span> · {{ hm(c.minutes) }}</span>
    </button>
  </div>
    </section>
    <section>
  <h2 class="section">Itens feitos por dia</h2>
  <div class="plain">
    <p class="meta" style="margin-bottom: 8px">
      {{ stats.total }} no período · média <span class="num">{{ avgLabel }}</span> por dia<template v-if="stats.best.done"> · melhor dia {{ shortDate(stats.best.day) }} (<span class="num">{{ stats.best.done }}</span>)</template>
    </p>
    <ColumnChart :values="stats.cells.map((c) => c.done)" :titles="titles" :x-ticks="xTicks" value-name="feitos" :line="stats.average7" line-name="média de 7 dias" :highlight="stats.best.done ? bestIndex : undefined" />
  </div>

    </section>
    <section>
  <h2 class="section">Tempo dedicado por dia</h2>
  <div class="plain">
    <p class="meta" style="margin-bottom: 8px">{{ hm(stats.totalMinutes) }} no período · média {{ hm(stats.totalMinutes / stats.cells.length) }} por dia. Inclui o tempo estimado dos itens concluídos sem cronômetro.</p>
    <ColumnChart :values="stats.cells.map((c) => c.minutes)" :titles="titles" :x-ticks="xTicks" value-name="min" :line="stats.minutesAvg7" line-name="média de 7 dias" />
  </div>

    </section>
    <section>
  <h2 class="section">Média por dia da semana</h2>
  <div class="plain">
    <p class="meta" style="margin-bottom: 8px">Você rende mais {{ bestWeekday === 0 || bestWeekday === 6 ? 'no' : 'na' }} {{ WEEKDAYS[bestWeekday]!.toLowerCase() }}{{ bestWeekday === 0 || bestWeekday === 6 ? '' : '-feira' }}.</p>
    <ColumnChart :values="stats.weekdayAvg" :titles="WEEKDAYS" :x-ticks="WEEKDAYS.map((d, i) => ({ i, text: d.slice(0, 3) }))" value-name="feitos por dia" :highlight="stats.weekdayAvg[bestWeekday] ? bestWeekday : undefined" />
  </div>

    </section>
  </template>

    <section>
  <h2 class="section">Calendário</h2>
  <div class="cells">
    <div v-for="(d, i) in DOW" :key="`d${i}`" class="dow">{{ d }}</div>
    <div v-for="n in offset" :key="`o${n}`" style="background: none" />
    <div
      v-for="c in calendar"
      :key="c.day"
      :class="{ has: c.has, today: c.day === today }"
      :style="{ background: c.bg }"
      :title="c.title"
    >{{ Number(c.day.slice(8)) }}</div>
  </div>
  <p v-if="detail" class="legend">
    <span><i style="background: var(--ok)" />Feito</span>
    <span><i style="background: var(--attention)" />Pulado</span>
    <span><i style="background: var(--urgent)" />Não feito</span>
  </p>
  <p v-else-if="catKey" class="legend">
    <span><i style="background: var(--ok)" />Algum item feito</span>
    <span><i style="background: var(--urgent)" />Nada feito</span>
  </p>
  <p v-else class="legend">
    <span><i style="background: var(--ok)" />Tudo feito</span>
    <span><i style="background: var(--attention)" />Parcial</span>
    <span><i style="background: var(--urgent)" />Nada feito</span>
  </p>

    </section>
  </div>

  <template v-if="!detail">
  <h2 class="section">Hábitos</h2>
  <div class="habit-grid">
  <div v-for="h in activeHabitStats" :key="h.id" class="plain stat">
    <div class="stat-top">
      <strong>{{ h.name }}</strong>
      <span class="stat-rate">{{ Math.round(h.rate * 100) }}%</span>
    </div>
    <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${h.rate})` }" /></div>
    <div class="meta">
      {{ h.done }}/{{ h.scheduled }} dias · sequência <span class="num">{{ h.streak }}</span>
      <template v-if="h.avgSpentMin"> · média {{ h.avgSpentMin }} min (planejado {{ h.durationMin }})</template>
      <template v-if="h.samples >= 3"> · metade leva até {{ h.p50Min }} min, 80% até {{ h.p80Min }} min</template>
    </div>
    <div class="row" style="margin-top: 8px">
      <button class="ghost" @click="pick(h.id)">Ver histórico</button>
      <button v-if="h.suggestedDurationMin" class="ghost" @click="applyDuration(h.id, h.name, h.durationMin, h.suggestedDurationMin!)">Ajustar para {{ h.suggestedDurationMin }} min</button>
    </div>
  </div>
  </div>
  <p v-if="!activeHabitStats.length" class="meta">Nenhum hábito ainda.</p>
  <p class="meta">Tarefas concluídas: {{ stats.tasksDone }}</p>
  </template>
</template>
