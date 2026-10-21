<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadAll, profile, session } from './lib/store'
import { supabase } from './lib/supabase'
import { toast } from './lib/toast'
import LoginView from './views/LoginView.vue'
import TodayView from './views/TodayView.vue'
import ItemsView from './views/ItemsView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'

const tabs = { today: 'Hoje', items: 'Itens', history: 'Histórico', settings: 'Ajustes' } as const
const tab = ref<keyof typeof tabs>('today')
const error = ref('')

const refresh = () => session.value && loadAll().catch((e) => (error.value = e.message))

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
