<script setup lang="ts">
import { computed } from 'vue'
import { completions, items, now } from '../lib/store'
import { computeStats } from '../lib/stats'

const stats = computed(() => computeStats(items.value, completions.value, now.value.day))
// Cor da célula: vazio (nada agendado) cinza, parcial âmbar, completo verde, nada feito vermelho.
const color = (c: { scheduled: number; done: number }) =>
  !c.scheduled ? '' : c.done === c.scheduled ? 'var(--ok)' : c.done ? 'var(--attention)' : 'var(--urgent)'
</script>

<template>
  <h1>Histórico (30 dias)</h1>
  <div class="cells">
    <div v-for="c in stats.cells" :key="c.day" :style="{ background: color(c) }" :title="`${c.done}/${c.scheduled}`">{{ c.day.slice(8) }}</div>
  </div>

  <h2>Hábitos</h2>
  <div v-for="h in stats.habitStats" :key="h.id" class="card">
    <strong>{{ h.name }}</strong>
    <div class="meta">
      {{ Math.round(h.rate * 100) }}% ({{ h.done }}/{{ h.scheduled }}) · sequência {{ h.streak }}
      <template v-if="h.avgSpentMin"> · média {{ h.avgSpentMin }} min</template>
    </div>
  </div>
  <p v-if="!stats.habitStats.length" class="meta">Nenhum hábito ainda.</p>
  <p class="meta">Tarefas concluídas: {{ stats.tasksDone }}</p>
</template>
