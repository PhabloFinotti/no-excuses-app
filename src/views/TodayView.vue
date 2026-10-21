<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemRow } from '../../supabase/functions/_shared/pending'
import { elapsedSeconds } from '../../supabase/functions/_shared/pending'
import { minToTime } from '../../supabase/functions/_shared/time'
import FocusMode from '../components/FocusMode.vue'
import OnboardingCard from '../components/OnboardingCard.vue'
import { act } from '../lib/toast'
import { rescheduleToday, staleTasks, isSnoozed, snoozeItem, calc, completionOf, doneToday, items, markDone, nowMs, now, pauseTimer, skipItem, startTimer, undoToday } from '../lib/store'

const rows = computed(() =>
  calc.value.states
    .map((s) => ({ s, item: items.value.find((i) => i.id === s.id)! }))
    .sort((a, b) => a.s.deadlineMin - b.s.deadlineMin),
)
const nowRows = computed(() => rows.value.filter((r) => r.s.level !== 'normal'))
const laterRows = computed(() => rows.value.filter((r) => r.s.level === 'normal'))
const suggested = computed(() => items.value.find((i) => i.id === calc.value.suggestSkip))

const focused = ref<ItemRow | null>(null)
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
  <FocusMode
    v-if="focused"
    :item="focused"
    :clock="clock(focused)"
    :running="running(focused)"
    @close="focused = null"
    @toggle="act(() => (running(focused!) ? pauseTimer(focused!) : startTimer(focused!)))"
    @done="act(() => markDone(focused!)); focused = null"
  />
  <h1>Hoje</h1>
  <OnboardingCard />

  <div v-if="calc.deficitMin" class="banner">
    Não cabe tudo antes de dormir: faltam {{ calc.deficitMin }} min.
    <template v-if="suggested">
      Sugestão: pular “{{ suggested.name }}”.
      <button class="ghost" style="color: #fff; border-color: #fff; margin-top: 8px" @click="act(() => skipItem(suggested!))">Pular</button>
    </template>
  </div>

  <p v-if="!rows.length">Nada pendente. 🎉</p>

  <template v-for="group in [{ title: 'Agora', rows: nowRows }, { title: 'Mais tarde', rows: laterRows }]" :key="group.title">
    <h2 v-if="group.rows.length">{{ group.title }}</h2>
    <div v-for="{ s, item } in group.rows" :key="item.id" class="card" :class="s.level">
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
        <button class="ghost" @click="focused = item">Foco</button>
        <button @click="act(() => markDone(item))">Feito</button>
        <button v-if="s.level !== 'normal' && !isSnoozed(item)" class="ghost" @click="act(() => snoozeItem(item))">Adiar 10</button>
        <button class="ghost" @click="act(() => skipItem(item))">{{ item.kind === 'task' ? 'Descartar' : 'Pular' }}</button>
      </div>
    </div>

  </template>

  <template v-if="staleTasks.length">
    <h2>Paradas há dias</h2>
    <div v-for="item in staleTasks" :key="item.id" class="card">
      <strong>{{ item.name }}</strong>
      <div class="meta">Vencida em {{ item.due_date }}. Fora do cálculo de tempo até você decidir.</div>
      <div class="row" style="margin-top: 8px">
        <button @click="act(() => rescheduleToday(item))">Fazer hoje</button>
        <button class="ghost" @click="act(() => skipItem(item))">Descartar</button>
      </div>
    </div>
  </template>

  <template v-if="doneToday.length">
    <h2>Feitos hoje</h2>
    <div v-for="item in doneToday" :key="item.id" class="card done row">
      <span>{{ item.name }}<span class="meta"> · {{ completionOf(item)?.spent_min }} min</span></span>
      <button class="ghost" style="flex: 0 0 auto" @click="act(() => undoToday(item))">Desfazer</button>
    </div>
  </template>
</template>
