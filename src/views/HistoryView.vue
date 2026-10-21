<script setup lang="ts">
import { computed, ref } from 'vue'
import ColumnChart from '../components/ColumnChart.vue'
import { shortDate } from '../lib/format'
import { act } from '../lib/toast'
import { completions, items, now, setDuration } from '../lib/store'
import { computeStats } from '../lib/stats'

const RANGES = [7, 30, 90] as const
const days = ref<(typeof RANGES)[number]>(30)
const stats = computed(() => computeStats(items.value, completions.value, now.value.day, days.value))

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const titles = computed(() => stats.value.cells.map((c) => `${WEEKDAYS[new Date(`${c.day}T00:00:00Z`).getUTCDay()]!.slice(0, 3)}, ${shortDate(c.day)}`))
const bestIndex = computed(() => stats.value.cells.findIndex((c) => c.day === stats.value.best.day))
const xTicks = computed(() => {
  const n = stats.value.cells.length
  return [0, Math.floor((n - 1) / 2), n - 1].map((i) => ({ i, text: shortDate(stats.value.cells[i]!.day) }))
})
const bestWeekday = computed(() => stats.value.weekdayAvg.indexOf(Math.max(...stats.value.weekdayAvg)))
const avgLabel = computed(() => stats.value.avgPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))
// Cor da célula: vazio (nada agendado) cinza, parcial âmbar, completo verde, nada feito vermelho.
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const offset = computed(() => new Date(`${stats.value.cells[0]?.day}T00:00:00Z`).getUTCDay())
const color = (c: { scheduled: number; done: number }) =>
  !c.scheduled ? '' : c.done === c.scheduled ? 'var(--ok)' : c.done ? 'var(--attention)' : 'var(--urgent)'
</script>

<template>
  <h1>Histórico</h1>
  <div class="chips range" role="group" aria-label="Período">
    <button v-for="r in RANGES" :key="r" class="ghost" :class="{ on: days === r }" :aria-pressed="days === r" @click="days = r">{{ r }} dias</button>
  </div>

  <h2 class="section">Itens feitos por dia</h2>
  <div class="plain">
    <p class="meta" style="margin-bottom: 8px">
      {{ stats.total }} no período · média <span class="num">{{ avgLabel }}</span> por dia<template v-if="stats.best.done"> · melhor dia {{ shortDate(stats.best.day) }} (<span class="num">{{ stats.best.done }}</span>)</template>
    </p>
    <ColumnChart :values="stats.cells.map((c) => c.done)" :titles="titles" :x-ticks="xTicks" value-name="feitos" :line="stats.average7" line-name="média de 7 dias" :highlight="stats.best.done ? bestIndex : undefined" />
  </div>

  <h2 class="section">Média por dia da semana</h2>
  <div class="plain">
    <p class="meta" style="margin-bottom: 8px">Você rende mais {{ bestWeekday === 0 || bestWeekday === 6 ? 'no' : 'na' }} {{ WEEKDAYS[bestWeekday]!.toLowerCase() }}{{ bestWeekday === 0 || bestWeekday === 6 ? '' : '-feira' }}.</p>
    <ColumnChart :values="stats.weekdayAvg" :titles="WEEKDAYS" :x-ticks="WEEKDAYS.map((d, i) => ({ i, text: d.slice(0, 3) }))" value-name="feitos por dia" :highlight="stats.weekdayAvg[bestWeekday] ? bestWeekday : undefined" />
  </div>

  <h2 class="section">Calendário</h2>
  <div class="cells">
    <div v-for="(d, i) in DOW" :key="`d${i}`" class="dow">{{ d }}</div>
    <div v-for="n in offset" :key="`o${n}`" style="background: none" />
    <div
      v-for="c in stats.cells"
      :key="c.day"
      :class="{ has: c.scheduled, today: c.day === now.day }"
      :style="{ background: color(c) }"
      :title="`${c.done}/${c.scheduled}`"
    >{{ Number(c.day.slice(8)) }}</div>
  </div>
  <p class="legend">
    <span><i style="background: var(--ok)" />Tudo feito</span>
    <span><i style="background: var(--attention)" />Parcial</span>
    <span><i style="background: var(--urgent)" />Nada feito</span>
  </p>

  <h2 class="section">Hábitos</h2>
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
    <button v-if="h.suggestedDurationMin" class="ghost" style="margin-top: 8px" @click="act(() => setDuration(h.id, h.suggestedDurationMin!))">
      Ajustar duração para {{ h.suggestedDurationMin }} min
    </button>
  </div>
  <p v-if="!stats.habitStats.length" class="meta">Nenhum hábito ainda.</p>
  <p class="meta">Tarefas concluídas: {{ stats.tasksDone }}</p>
</template>
