<script setup lang="ts">
import { computed } from 'vue'
import { act } from '../lib/toast'
import { completions, items, now, setDuration } from '../lib/store'
import { computeStats } from '../lib/stats'

const stats = computed(() => computeStats(items.value, completions.value, now.value.day))
// Cor da célula: vazio (nada agendado) cinza, parcial âmbar, completo verde, nada feito vermelho.
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const offset = computed(() => new Date(`${stats.value.cells[0]?.day}T00:00:00Z`).getUTCDay())
const color = (c: { scheduled: number; done: number }) =>
  !c.scheduled ? '' : c.done === c.scheduled ? 'var(--ok)' : c.done ? 'var(--attention)' : 'var(--urgent)'
</script>

<template>
  <h1>Histórico</h1>
  <p class="meta" style="margin: 4px 0 16px">Últimos 30 dias</p>
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
