<script setup lang="ts">
import { computed } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds } from '../../supabase/functions/_shared/pending'
import { minToTime } from '../../supabase/functions/_shared/time'
import { act } from '../lib/toast'
import { isSnoozed, snoozeItem, calc, completionOf, doneToday, items, markDone, nowMs, now, pauseTimer, skipItem, startTimer, undoToday } from '../lib/store'

const rows = computed(() =>
  calc.value.states
    .map((s) => ({ s, item: items.value.find((i) => i.id === s.id)! }))
    .sort((a, b) => a.s.deadlineMin - b.s.deadlineMin),
)
const suggested = computed(() => items.value.find((i) => i.id === calc.value.suggestSkip))

const LEVEL_LABEL = { normal: '', attention: 'Atenção', urgent: 'Urgente', overdue: 'Atrasado' }

function clock(item: ItemRow) {
  const s = Math.round(elapsedSeconds(completionOf(item), nowMs.value))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const running = (item: ItemRow) => !!completionOf(item)?.timer_started_at
const hasTime = (item: ItemRow) => !!completionOf(item)?.timer_started_at || (completionOf(item)?.timer_accum_s ?? 0) > 0
const overdueTask = (item: ItemRow) => item.kind === 'task' && item.due_date! < now.value.day
</script>

<template>
  <h1>Hoje</h1>

  <div v-if="calc.deficitMin" class="banner">
    Não cabe tudo antes de dormir: faltam {{ calc.deficitMin }} min.
    <template v-if="suggested">
      Sugestão: pular “{{ suggested.name }}”.
      <button class="ghost" style="color: #fff; border-color: #fff; margin-top: 8px" @click="act(() => skipItem(suggested!))">Pular</button>
    </template>
  </div>

  <p v-if="!rows.length">Nada pendente. 🎉</p>

  <div v-for="{ s, item } in rows" :key="item.id" class="card" :class="s.level">
    <div class="row">
      <strong>{{ item.name }}<span v-if="item.essential"> ★</span></strong>
      <span class="meta" style="text-align: right">{{ LEVEL_LABEL[s.level] }}</span>
    </div>
    <div class="meta">
      {{ item.duration_min }} min · começar até {{ minToTime(s.deadlineMin) }}
      <template v-if="s.minutesUntilDeadline >= 0">(em {{ s.minutesUntilDeadline }} min)</template>
      <template v-if="overdueTask(item)"> · atrasada de ontem</template>
      <template v-if="isSnoozed(item)"> · alerta adiado</template>
    </div>
    <div class="row" style="margin-top: 8px">
      <span v-if="hasTime(item)" class="timer" style="flex: 0 0 auto">⏱ {{ clock(item) }}</span>
      <button v-if="!running(item)" class="ghost" @click="act(() => startTimer(item))">Iniciar</button>
      <button v-else class="ghost" @click="act(() => pauseTimer(item))">Pausar</button>
      <button @click="act(() => markDone(item))">Feito</button>
      <button v-if="s.level !== 'normal' && !isSnoozed(item)" class="ghost" @click="act(() => snoozeItem(item))">Adiar 10</button>
      <button class="ghost" @click="act(() => skipItem(item))">{{ item.kind === 'task' ? 'Descartar' : 'Pular' }}</button>
    </div>
  </div>

  <template v-if="doneToday.length">
    <h2>Feitos hoje</h2>
    <div v-for="item in doneToday" :key="item.id" class="card done row">
      <span>{{ item.name }}<span class="meta"> · {{ completionOf(item)?.spent_min }} min</span></span>
      <button class="ghost" style="flex: 0 0 auto" @click="act(() => undoToday(item))">Desfazer</button>
    </div>
  </template>
</template>
