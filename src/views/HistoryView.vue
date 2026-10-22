<script setup lang="ts">
import { computed, ref } from 'vue'
import ColumnChart from '../components/ColumnChart.vue'
import { shortDate } from '../lib/format'
import { act } from '../lib/toast'
import { completions, items, setDuration, today } from '../lib/store'
import { computeHabitDetail, computeStats } from '../lib/stats'

const RANGES = [7, 30, 90] as const
const days = ref<(typeof RANGES)[number]>(30)
const stats = computed(() => computeStats(items.value, completions.value, today.value, days.value))

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
const selectedId = ref('')
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
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, '0')}` : `${Math.round(min)} min`)
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
      <option v-for="h in habits" :key="h.id" :value="h.id">{{ h.name }}</option>
    </select>
  </div>

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
        Tempo total {{ hm(detail.totalMinutes) }}<template v-if="detail.avgMinutes"> · média por vez {{ detail.avgMinutes }} min (previsto {{ habit.duration_min }})</template>
      </p>
      <button v-if="habitCard?.suggestedDurationMin" class="ghost" style="margin-top: 8px" @click="act(() => setDuration(habit!.id, habitCard!.suggestedDurationMin!))">
        Ajustar duração para {{ habitCard.suggestedDurationMin }} min
      </button>
    </div>

    </section>
    <section>
    <h2 class="section">Tempo por vez</h2>
    <div class="plain">
      <p class="meta" style="margin-bottom: 8px">Cada coluna é o tempo registrado no dia; a linha é a duração prevista.</p>
      <ColumnChart :values="detail.cells.map((c) => c.minutes)" :titles="detailTitles" :x-ticks="ticksFor(detail.cells)" value-name="min" :line="detail.cells.map(() => habit!.duration_min)" line-name="previsto" />
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
    <p class="meta" style="margin-bottom: 8px">{{ hm(stats.totalMinutes) }} no período · média {{ hm(stats.totalMinutes / stats.cells.length) }} por dia. Inclui o previsto de itens concluídos sem cronômetro.</p>
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
  <div v-for="h in stats.habitStats" :key="h.id" class="plain stat">
    <div class="stat-top">
      <strong>{{ h.name }}</strong>
      <span class="stat-rate">{{ Math.round(h.rate * 100) }}%</span>
    </div>
    <div class="track"><div class="fill ok" :style="{ transform: `scaleX(${h.rate})` }" /></div>
    <div class="meta">
      {{ h.done }}/{{ h.scheduled }} dias · sequência <span class="num">{{ h.streak }}</span>
      <template v-if="h.avgSpentMin"> · média {{ h.avgSpentMin }} min (planejado {{ h.durationMin }})</template>
    </div>
    <div class="row" style="margin-top: 8px">
      <button class="ghost" @click="pick(h.id)">Ver histórico</button>
      <button v-if="h.suggestedDurationMin" class="ghost" @click="act(() => setDuration(h.id, h.suggestedDurationMin!))">Ajustar para {{ h.suggestedDurationMin }} min</button>
    </div>
  </div>
  </div>
  <p v-if="!stats.habitStats.length" class="meta">Nenhum hábito ainda.</p>
  <p class="meta">Tarefas concluídas: {{ stats.tasksDone }}</p>
  </template>
</template>
