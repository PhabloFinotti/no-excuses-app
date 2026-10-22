import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { calculateState } from './calculateState'
import { parseQuickAdd } from './quickAdd'
import { clearNotification } from './push'
import { must, supabase } from './supabase'
import { notify } from './toast'
import { localTime, timeToMin } from '../../supabase/functions/_shared/time'
import { elapsedSeconds, finishMinutes, findCompletion, isPending, isStale, toCalcItems, type CompletionRow, type ItemRow } from '../../supabase/functions/_shared/pending'

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
  calendar_connected: boolean
}

export type ItemForm = Omit<ItemRow, 'id' | 'archived' | 'archived_at' | 'created_at'> & { id?: string }

export const session = ref<Session | null>(null)
export const authReady = ref(false) // false até saber se há sessão salva: evita mostrar o login por um instante
export const profile = ref<ProfileRow | null>(null)
export const items = ref<ItemRow[]>([])
export const archivedItems = ref<ItemRow[]>([]) // só para o histórico: o que foi feito antes de arquivar continua contando
export const completions = ref<CompletionRow[]>([])
export const nowMs = ref(Date.now())
// 1s para a barra de tempo e o timer andarem suaves; parado com a aba oculta.
setInterval(() => !document.hidden && (nowMs.value = Date.now()), 1000)

const tz = () => profile.value?.tz ?? 'America/Sao_Paulo'
export const now = computed(() => localTime(new Date(nowMs.value), tz()))
// Só o dia: texto igual de um segundo para o outro, então quem usa `today` não recalcula a cada tick (`now` é um objeto novo por segundo).
export const today = computed(() => now.value.day)

export const calc = computed(() => {
  const p = profile.value
  if (!p) return { states: [], deficitMin: 0, suggestSkip: undefined, suggestSkips: [] as string[], unavoidableMin: 0 }
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

export const completionOf = (item: ItemRow) => findCompletion(item, completions.value, now.value.day)

export const isItemPending = (item: ItemRow) => isPending(item, completions.value, now.value)

// Busca tudo em paralelo e só então grava: itens sem as conclusões apareceriam todos como pendentes/atrasados por um instante.
export async function loadAll() {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const [p, active, archived, done] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('items').select('*').eq('archived', false).order('created_at'),
    supabase.from('items').select('*').eq('archived', true),
    supabase.from('item_completions').select('*').gte('day', since),
  ])
  const next = { profile: must(p) as ProfileRow, items: must(active) as ItemRow[], archived: must(archived) as ItemRow[], completions: must(done) as CompletionRow[] }
  // Sem await entre as quatro atribuições, a tela renderiza uma vez só com o conjunto completo.
  profile.value = next.profile
  items.value = next.items
  archivedItems.value = next.archived
  completions.value = next.completions
}

// Só os campos editáveis em Ajustes: o formulário guarda uma cópia do perfil, e mandar a linha inteira
// desfaria mudanças feitas em outro aparelho (ex.: calendar_connected).
const EDITABLE = ['wake_time', 'sleep_time', 'tz', 'warn_min', 'urgent_min', 'fixed_grace_min', 'morning_summary', 'evening_summary', 'evening_min'] as const

export async function saveProfile(patch: Partial<ProfileRow>) {
  const fields = Object.fromEntries(EDITABLE.filter((k) => k in patch).map((k) => [k, patch[k]]))
  profile.value = must(await tracked(async () => supabase.from('profiles').update(fields).eq('user_id', session.value!.user.id).select().single()))
}

export async function saveItem(form: ItemForm) {
  const row = (await tracked(async () => must(await supabase.from('items').upsert(form).select().single()))) as ItemRow
  await loadAll()
  if (row.kind === 'task') syncCalendar(row.id)
}

export async function archiveItem(id: string) {
  const wasTask = items.value.find((i) => i.id === id)?.kind === 'task'
  await tracked(async () => must(await supabase.from('items').update({ archived: true, archived_at: new Date().toISOString() }).eq('id', id)))
  await loadAll()
  if (wasTask) syncCalendar(id)
}

// Escritas em andamento (ou muito recentes): o Realtime ignora o próprio eco, para uma leitura antiga não desfazer a tela.
let inflight = 0
let lastWriteAt = 0
export const isWriting = () => inflight > 0 || Date.now() - lastWriteAt < 1500
async function tracked<T>(fn: () => Promise<T>): Promise<T> {
  inflight++
  try {
    return await fn()
  } finally {
    inflight--
    lastWriteAt = Date.now()
  }
}

// Otimista: a tela muda na hora e volta atrás se o servidor recusar.
// Sempre grava em "hoje"; se a tarefa tinha uma linha de outro dia, ela é movida (apagada) para não duplicar.
async function patchCompletion(item: ItemRow, patch: Partial<CompletionRow>) {
  const day = now.value.day
  const before = completions.value
  const prev = completionOf(item)
  const merged = { item_id: item.id, done: false, skipped: false, spent_min: 0, timer_started_at: null, timer_accum_s: 0, ...prev, ...patch, day }
  // Só o que mudou vai ao servidor (o tick também escreve em snooze_notified_for); ao mover uma linha de outro dia, leva o estado dela junto.
  const payload = { ...(prev && prev.day !== day ? prev : {}), item_id: item.id, day, ...patch }
  const replace = (row: CompletionRow) => (completions.value = [...completions.value.filter((c) => c.item_id !== row.item_id || (item.kind === 'habit' && c.day !== row.day)), row])
  replace(merged)
  if (patch.done || patch.skipped || patch.snoozed_until) clearNotification(item.id) // o alerta já respondido some da bandeja
  try {
    await tracked(async () => {
      replace(must(await supabase.from('item_completions').upsert(payload, { onConflict: 'item_id,day' }).select().single()) as CompletionRow)
      if (prev && prev.day !== day) must(await supabase.from('item_completions').delete().eq('item_id', item.id).eq('day', prev.day))
    })
    if (item.kind === 'task' && ('done' in patch || 'skipped' in patch)) syncCalendar(item.id)
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

export async function rescheduleTo(item: ItemRow, day: string) {
  await tracked(async () => must(await supabase.from('items').update({ due_date: day }).eq('id', item.id)))
  await loadAll()
  syncCalendar(item.id)
}
export const rescheduleToday = (item: ItemRow) => rescheduleTo(item, now.value.day)

export async function unarchiveItem(id: string) {
  await tracked(async () => must(await supabase.from('items').update({ archived: false, archived_at: null }).eq('id', id)))
  await loadAll()
  syncCalendar(id) // o servidor ignora se não for tarefa
}

export async function setDuration(id: string, durationMin: number) {
  await tracked(async () => must(await supabase.from('items').update({ duration_min: durationMin }).eq('id', id)))
  await loadAll()
  syncCalendar(id)
}

// Adicionar rápido: "Ler livro 45". Tarefa = hoje; hábito = todo dia.
export async function addQuick(kind: 'habit' | 'task', text: string) {
  const parsed = parseQuickAdd(text)
  if (!parsed) throw new Error('Digite um nome e, se quiser, a duração: "Ler 45"')
  const due_date = kind === 'task' ? now.value.day : null
  await saveItem({
    kind, name: parsed.name, duration_min: parsed.durationMin, category: null, fixed_time: null, essential: false, warn_min: null, urgent_min: null,
    weekdays: kind === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : [], due_date,
  })
  return { ...parsed, due_date }
}

// Sair: apaga a inscrição de push deste aparelho (senão ele segue recebendo alertas da conta) e limpa o que está em memória.
export async function signOut() {
  try {
    const sub = await (await navigator.serviceWorker?.getRegistration())?.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch { /* sem push neste aparelho: segue para o logout */ }
  await supabase.auth.signOut()
  profile.value = null
  items.value = []
  archivedItems.value = []
  completions.value = []
}

// ---- Google Agenda -------------------------------------------------------------------------------
// Não bloqueia a ação do usuário: se falhar, avisa e o app segue funcionando.
export function syncCalendar(itemId: string) {
  if (!profile.value?.calendar_connected) return
  supabase.functions.invoke('gcal-sync', { body: { itemId } }).then(({ error }) => {
    if (!error) return
    const status = (error as { context?: Response }).context?.status
    if (status === 409 && profile.value) {
      profile.value = { ...profile.value, calendar_connected: false }
      notify('O acesso ao Google Agenda foi revogado. Reconecte em Ajustes.', { error: true })
    } else notify('Não consegui atualizar o Google Agenda. Tente de novo em instantes.', { error: true })
  })
}

export async function connectCalendar() {
  const { data, error } = await supabase.functions.invoke('gcal-connect')
  if (error || !data?.url) throw new Error('Conexão com o Google indisponível (confira o deploy das functions).')
  location.href = data.url
}

export async function disconnectCalendar() {
  const { error } = await supabase.functions.invoke('gcal-sync', { body: { disconnect: true } })
  if (error) throw new Error('Não consegui desconectar. Tente de novo.')
  profile.value = { ...profile.value!, calendar_connected: false }
}

// Envia as tarefas pendentes que já existiam antes da conexão: uma chamada só, com um refresh de token só.
export async function syncPendingTasks() {
  const ids = items.value.filter((i) => i.kind === 'task' && isItemPending(i)).map((i) => i.id)
  if (!ids.length) return 0
  const { error } = await supabase.functions.invoke('gcal-sync', { body: { itemIds: ids } })
  if (error) throw new Error('Não consegui enviar todas as tarefas. Tente de novo.')
  return ids.length
}
