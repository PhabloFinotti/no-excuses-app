<script setup lang="ts">
import { reactive, ref } from 'vue'
import { enablePush, sendTestPush } from '../lib/push'
import { profile, saveProfile } from '../lib/store'
import { supabase } from '../lib/supabase'

const form = reactive({ ...profile.value! })
const msg = ref('')

async function run(fn: () => Promise<unknown>, ok: string) {
  try {
    await fn()
    msg.value = ok
  } catch (e) {
    msg.value = (e as Error).message
  }
}
const save = () => run(() => saveProfile({ ...form, wake_time: form.wake_time.slice(0, 5), sleep_time: form.sleep_time.slice(0, 5) }), 'Salvo.')
</script>

<template>
  <h1>Ajustes</h1>
  <form @submit.prevent="save">
    <div class="row">
      <label>Acordo<input v-model="form.wake_time" type="time" /></label>
      <label>Durmo<input v-model="form.sleep_time" type="time" /></label>
    </div>
    <label>Fuso horário<input v-model="form.tz" /></label>
    <div class="row">
      <label>Atenção (min)<input v-model.number="form.warn_min" type="number" min="0" /></label>
      <label>Urgente (min)<input v-model.number="form.urgent_min" type="number" min="0" /></label>
    </div>
    <button style="margin-top: 12px; width: 100%">Salvar</button>
  </form>

  <h2>Notificações</h2>
  <div class="row">
    <button @click="run(enablePush, 'Notificações ativadas neste aparelho.')">Ativar</button>
    <button class="ghost" @click="run(sendTestPush, 'Teste enviado.')">Enviar teste</button>
  </div>
  <p class="meta">
    No Samsung, para o alerta chegar no horário: Configurações → Aplicativos → este app → Bateria → “Sem restrições”,
    e tire o app de “Apps em suspensão”.
  </p>
  <p v-if="msg">{{ msg }}</p>

  <button class="ghost" style="margin-top: 24px; width: 100%" @click="supabase.auth.signOut()">Sair</button>
</template>
