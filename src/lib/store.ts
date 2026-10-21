import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { calculateState } from './calculateState'
import { parseQuickAdd } from './quickAdd'
import { must, supabase } from './supabase'
import { localTime, timeToMin } from '../../supabase/functions/_shared/time'
import { completionDay, elapsedSeconds, finishMinutes, isPending, isStale, toCalcItems, type CompletionRow, type ItemRow } from '../../supabase/functions/_shared/pending'

export interface ProfileRow {
  wake_time: string
  sleep_time: string
  tz: string
  warn_min: number
  urgent_min: number
  fixed_grace_min: number
  morning_summary: boolean
  evening_summary: boolean
  evening_min: number
}

export type ItemForm = Omit<ItemRow, 'id' | 'archived' | 'created_at'> & { id?: string }

export const session = ref<Session | null>(null)
export const profile = ref<ProfileRow | null>(null)
export const items = ref<ItemRow[]>([])
export const completions = ref<CompletionRow[]>([])
export const nowMs = ref(Date.now())
// 1s para a barra de tempo e o timer andarem suaves; parado com a aba oculta.
setInterval(() => !document.hidden && (nowMs.value = Date.now()), 1000)

const tz = () => profile.value?.tz ?? 'America/Sao_Paulo'
export const now = computed(() => localTime(new Date(nowMs.value), tz()))

export const calc = computed(() => {
  const p = profile.value
  if (!p) return { states: [], deficitMin: 0, suggestSkip: undefined }
  return calculateState(toCalcItems(items.value, completions.value, now.value, nowMs.value), now.value.minutes, {
    sleepMin: timeToMin(p.sleep_time),
    warnMin: p.warn_min,
    urgentMin: p.urgent_min,
    graceMin: p.fixed_grace_min,
  })
})

export const doneToday = computed(() =>
  items.value.filter((i) => {
    if (i.archived) return false
    const c = completionOf(i)
    return c?.done && c.day === now.value.day
  }),
)

export const staleTasks = computed(() => items.value.filter((i) => isStale(i, now.value.day) && isPending(i, completions.value, now.value)))

export const completionOf = (item: ItemRow) =>
  completions.value.find((c) => c.item_id === item.id && c.day === completionDay(item, now.value.day))

export const isItemPending = (item: ItemRow) => isPending(item, completions.value, now.value)

export async function loadAll() {
  must(await supabase.from('profiles').upsert({}, { onConflict: 'user_id', ignoreDuplicates: true })) // cria o perfil padrão no 1º login
  profile.value = must(await supabase.from('profiles').select('*').single())
  items.value = must(await supabase.from('items').select('*').eq('archived', false).order('created_at')) as ItemRow[]
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  completions.value = must(await supabase.from('item_completions').select('*').gte('day', since)) as CompletionRow[]
}

export async function saveProfile(patch: Partial<ProfileRow>) {
  profile.value = must(await supabase.from('profiles').update(patch).eq('user_id', session.value!.user.id).select().single())
}

export async function saveItem(form: ItemForm) {
  must(await supabase.from('items').upsert(form))
  await loadAll()
}

export async function archiveItem(id: string) {
  must(await supabase.from('items').update({ archived: true }).eq('id', id))
  await loadAll()
}

// Otimista: a tela muda na hora e volta atrás se o servidor recusar.
async function patchCompletion(item: ItemRow, patch: Partial<CompletionRow>) {
  const day = completionDay(item, now.value.day)
  const before = completions.value
  const replace = (row: CompletionRow) => (completions.value = [...completions.value.filter((c) => !(c.item_id === row.item_id && c.day === row.day)), row])
  replace({ item_id: item.id, day, done: false, skipped: false, spent_min: 0, timer_started_at: null, timer_accum_s: 0, ...completionOf(item), ...patch })
  try {
    replace(must(await supabase.from('item_completions').upsert({ item_id: item.id, day, ...patch }, { onConflict: 'item_id,day' }).select().single()) as CompletionRow)
  } catch (e) {
    completions.value = before
    throw e
  }
}

// O timer vive no banco (started_at + acumulado), então sobrevive ao app fechado.
export const startTimer = (item: ItemRow) => patchCompletion(item, { timer_started_at: new Date().toISOString() })

export function pauseTimer(item: ItemRow) {
  return patchCompletion(item, { timer_accum_s: Math.round(elapsedSeconds(completionOf(item), Date.now())), timer_started_at: null })
}

// Sem minutes: usa o timer ou, se não houve, o previsto. Com minutes: tempo informado à mão.
export function markDone(item: ItemRow, minutes?: number) {
  const c = completionOf(item)
  if (minutes != null) return patchCompletion(item, { done: true, skipped: false, timer_accum_s: minutes * 60, timer_started_at: null, spent_min: minutes, time_source: 'manual' })
  const f = finishMinutes(c, item.duration_min, Date.now())
  const timer = f.source === 'timer' ? { timer_accum_s: Math.round(elapsedSeconds(c, Date.now())) } : {}
  return patchCompletion(item, { done: true, skipped: false, timer_started_at: null, spent_min: f.minutes, time_source: f.source, ...timer })
}

// Corrige o cronômetro/tempo (item pendente ou já feito): vira o novo acumulado e o timer para.
export function setSpent(item: ItemRow, minutes: number) {
  return patchCompletion(item, { timer_accum_s: minutes * 60, timer_started_at: null, time_source: 'manual', ...(completionOf(item)?.done ? { spent_min: minutes } : {}) })
}

export const skipItem = (item: ItemRow) => patchCompletion(item, { skipped: true, timer_started_at: null })

export const undoToday = (item: ItemRow) => patchCompletion(item, { done: false, skipped: false })

export const SNOOZE_MIN = 10
export const snoozeItem = (item: ItemRow) => patchCompletion(item, { snoozed_until: new Date(Date.now() + SNOOZE_MIN * 60_000).toISOString() })
export const isSnoozed = (item: ItemRow) => Date.parse(completionOf(item)?.snoozed_until ?? '') > nowMs.value

export async function rescheduleToday(item: ItemRow) {
  must(await supabase.from('items').update({ due_date: now.value.day }).eq('id', item.id))
  await loadAll()
}

export async function setDuration(id: string, durationMin: number) {
  must(await supabase.from('items').update({ duration_min: durationMin }).eq('id', id))
  await loadAll()
}

// Adicionar rápido: "Ler livro 45". Tarefa = hoje; hábito = todo dia.
export async function addQuick(kind: 'habit' | 'task', text: string) {
  const parsed = parseQuickAdd(text)
  if (!parsed) throw new Error('Digite um nome e, se quiser, a duração: "Ler 45"')
  await saveItem({
    kind, name: parsed.name, duration_min: parsed.durationMin, fixed_time: null, essential: false, warn_min: null, urgent_min: null,
    weekdays: kind === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : [], due_date: kind === 'task' ? now.value.day : null,
  })
  return parsed
}
