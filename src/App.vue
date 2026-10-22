<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { authReady, isWriting, items, loadAll, markDone, profile, session, snoozeItem } from './lib/store'
import { supabase } from './lib/supabase'
import BrandMark from './components/BrandMark.vue'
import Icon from './components/Icon.vue'
import { act, notify, toast } from './lib/toast'
import LoginView from './views/LoginView.vue'
import TodayView from './views/TodayView.vue'
import ItemsView from './views/ItemsView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'

const tabs = { today: ['Hoje', 'target'], items: ['Itens', 'list'], history: ['Histórico', 'chart'], settings: ['Ajustes', 'settings'] } as const
const tab = ref<keyof typeof tabs>('today')
const error = ref('')

const refresh = () =>
  session.value &&
  loadAll()
    .then(() => {
      error.value = '' // um erro passageiro (rede) não pode ficar na tela depois que voltou a funcionar
      applyNotificationAction()
    })
    .catch((e) => (error.value = e.message))

// Ação vinda de um botão da notificação (?action=done|snooze&item=ID).
function applyNotificationAction() {
  const q = new URLSearchParams(location.search)
  const cal = q.get('calendar') // retorno do consentimento do Google
  if (cal) {
    history.replaceState(null, '', '/')
    tab.value = 'settings'
    if (cal === 'connected') notify('Google Agenda conectado. Use “Enviar tarefas pendentes” para as que já existem.', {}, 8000)
    else notify(cal === 'denied' ? 'Conexão cancelada.' : 'Não consegui conectar o Google Agenda. Tente de novo.', { error: cal !== 'denied' })
    return
  }
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
    // Eco das nossas próprias escritas: espera ficar quieto, para uma leitura antiga não desfazer a tela.
    const onChange = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => (isWriting() ? onChange() : refresh()), 300)
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
  authReady.value = true
  // O INITIAL_SESSION e a renovação do token repetem a sessão já conhecida: só recarrega quando o usuário muda.
  supabase.auth.onAuthStateChange((_, s) => {
    const changed = s?.user.id !== session.value?.user.id
    session.value = s
    if (changed) refresh()
  })
  refresh()
  document.addEventListener('visibilitychange', () => !document.hidden && refresh())
})
</script>

<template>
  <template v-if="!authReady" />
  <LoginView v-else-if="!session" />
  <div v-else class="shell">
    <nav aria-label="Navegação principal">
      <div class="brand"><BrandMark :size="36" /><span>No Excuses</span></div>
      <div class="inner">
        <button v-for="([label, icon], key) in tabs" :key="key" :class="{ on: tab === key }" :aria-current="tab === key ? 'page' : undefined" @click="tab = key">
          <Icon :name="icon" :size="22" />{{ label }}
        </button>
      </div>
    </nav>
    <main>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="!profile" class="empty">Carregando…</p>
      <template v-else>
        <TodayView v-if="tab === 'today'" />
        <ItemsView v-else-if="tab === 'items'" />
        <HistoryView v-else-if="tab === 'history'" />
        <SettingsView v-else />
      </template>
    </main>
    <div v-if="toast" class="toast" :class="{ error: toast.error }" :role="toast.error ? 'alert' : 'status'">
      <span>{{ toast.text }}</span>
      <button v-if="toast.action" @click="toast.action.run(); toast = null">{{ toast.action.label }}</button>
      <button v-if="toast.undo" @click="act(toast.undo); toast = null">Desfazer</button>
    </div>
  </div>
</template>
