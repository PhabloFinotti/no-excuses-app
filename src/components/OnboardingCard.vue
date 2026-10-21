<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { enablePush } from '../lib/push'
import { act } from '../lib/toast'

// Bateria não é detectável pelo navegador: o usuário confirma à mão (guardado só neste aparelho).
const KEY = 'onboarding-battery-ok'
const read = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

const installed = ref(true)
const permitted = ref(true)
const subscribed = ref(true)
const battery = ref(read())

async function check() {
  installed.value = matchMedia('(display-mode: standalone)').matches
  permitted.value = 'Notification' in window && Notification.permission === 'granted'
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined
  subscribed.value = !!(await reg?.pushManager.getSubscription())
}
function confirmBattery() {
  battery.value = true
  try { localStorage.setItem(KEY, '1') } catch { /* sem storage: pergunta de novo na próxima */ }
}
onMounted(check)
</script>

<template>
  <div v-if="!(installed && permitted && subscribed && battery)" class="card">
    <strong>Para os alertas chegarem no horário</strong>
    <ul class="meta" style="padding-left: 18px">
      <li :style="{ opacity: installed ? 0.5 : 1 }">{{ installed ? '✓' : '○' }} Instalar o app: menu do Chrome → “Adicionar à tela inicial”.</li>
      <li :style="{ opacity: permitted && subscribed ? 0.5 : 1 }">
        {{ permitted && subscribed ? '✓' : '○' }} Ativar notificações neste aparelho.
        <button v-if="!(permitted && subscribed)" style="padding: 4px 10px" @click="act(async () => { await enablePush(); await check() })">Ativar</button>
      </li>
      <li :style="{ opacity: battery ? 0.5 : 1 }">
        {{ battery ? '✓' : '○' }} Bateria “Sem restrições”: Configurações → Aplicativos → No Excuses → Bateria.
        <button v-if="!battery" class="ghost" style="padding: 4px 10px" @click="confirmBattery">Já fiz</button>
      </li>
    </ul>
  </div>
</template>
