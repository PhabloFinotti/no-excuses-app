<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { enablePush } from '../lib/push'
import { act } from '../lib/toast'

// Bateria não é detectável pelo navegador: o usuário confirma à mão (guardado só neste aparelho).
const KEY = 'onboarding-battery-ok'
const read = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

// Valores já corretos na primeira renderização (matchMedia e permissão são síncronos): só a assinatura exige await,
// e supor que ela existe evita o cartão aparecer e empurrar a lista no caso comum.
const installed = ref(matchMedia('(display-mode: standalone)').matches)
const notifying = ref('Notification' in window && Notification.permission === 'granted')
const battery = ref(read())

async function check() {
  installed.value = matchMedia('(display-mode: standalone)').matches
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined
  notifying.value = 'Notification' in window && Notification.permission === 'granted' && !!(await reg?.pushManager.getSubscription())
}
function confirmBattery() {
  battery.value = true
  try { localStorage.setItem(KEY, '1') } catch { /* sem storage: pergunta de novo na próxima */ }
}
onMounted(check)

// Mostra só o próximo passo pendente, para não dominar a tela.
const steps = computed(() => [
  { done: installed.value, title: 'Instale o app', hint: 'Menu do Chrome → “Adicionar à tela inicial”.' },
  { done: notifying.value, title: 'Ative as notificações', hint: 'Sem isso o alerta não chega com o app fechado.', action: 'Ativar' },
  { done: battery.value, title: 'Libere a bateria', hint: 'Configurações → Aplicativos → No Excuses → Bateria → Sem restrições.', action: 'Já fiz' },
])
const current = computed(() => steps.value.find((s) => !s.done))
const index = computed(() => (current.value ? steps.value.indexOf(current.value) + 1 : 0))
function run() {
  if (current.value?.action === 'Ativar') act(async () => { await enablePush(); await check() })
  else confirmBattery()
}
</script>

<template>
  <div v-if="current" class="setup">
    <div>
      <strong>{{ current.title }} <span class="meta">({{ index }}/3)</span></strong>
      <span class="meta">{{ current.hint }}</span>
    </div>
    <button v-if="current.action" @click="run">{{ current.action }}</button>
  </div>
</template>
