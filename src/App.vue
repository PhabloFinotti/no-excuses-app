<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { items, loadAll, markDone, profile, session, snoozeItem } from './lib/store'
import { supabase } from './lib/supabase'
import { act, toast } from './lib/toast'
import LoginView from './views/LoginView.vue'
import TodayView from './views/TodayView.vue'
import ItemsView from './views/ItemsView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'

const tabs = { today: 'Hoje', items: 'Itens', history: 'Histórico', settings: 'Ajustes' } as const
const tab = ref<keyof typeof tabs>('today')
const error = ref('')

const refresh = () => session.value && loadAll().then(applyNotificationAction).catch((e) => (error.value = e.message))

// Ação vinda de um botão da notificação (?action=done|snooze&item=ID).
function applyNotificationAction() {
  const q = new URLSearchParams(location.search)
  const item = items.value.find((i) => i.id === q.get('item'))
  const action = q.get('action')
  if (!action) return
  history.replaceState(null, '', '/')
  if (item && action === 'done') act(() => markDone(item))
  if (item && action === 'snooze') act(() => snoozeItem(item))
}

// Realtime: outro aparelho mudou algo, recarrega (com debounce, pois um upsert gera vários eventos).
let channel: ReturnType<typeof supabase.channel> | undefined
let debounce: ReturnType<typeof setTimeout>
watch(
  () => session.value?.user.id,
  (id) => {
    if (channel) supabase.removeChannel(channel)
    channel = undefined
    if (!id) return
    const onChange = () => {
      clearTimeout(debounce)
      debounce = setTimeout(refresh, 300)
    }
    channel = supabase
      .channel('changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_completions' }, onChange)
      .subscribe()
  },
)

onMounted(async () => {
  session.value = (await supabase.auth.getSession()).data.session
  supabase.auth.onAuthStateChange((_, s) => {
    session.value = s
    refresh()
  })
  refresh()
  document.addEventListener('visibilitychange', () => !document.hidden && refresh())
})
</script>

<template>
  <LoginView v-if="!session" />
  <template v-else>
    <main>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="!profile">Carregando…</p>
      <template v-else>
        <TodayView v-if="tab === 'today'" />
        <ItemsView v-else-if="tab === 'items'" />
        <HistoryView v-else-if="tab === 'history'" />
        <SettingsView v-else />
      </template>
    </main>
    <div v-if="toast" class="toast" role="alert">{{ toast }}</div>
    <nav>
      <button v-for="(label, key) in tabs" :key="key" :class="{ on: tab === key }" @click="tab = key">{{ label }}</button>
    </nav>
  </template>
</template>
