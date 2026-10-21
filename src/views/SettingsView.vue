<script setup lang="ts">
import { reactive, ref } from 'vue'
import { exportBackup, exportCsv, importBackup } from '../lib/backup'
import { enablePush, sendTestPush } from '../lib/push'
import { loadAll, profile, saveProfile } from '../lib/store'
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
const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
function validTz(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
const save = () => run(() => {
  if (!validTz(form.tz)) throw new Error(`Fuso inválido: ${form.tz}`)
  return saveProfile({ ...form, wake_time: form.wake_time.slice(0, 5), sleep_time: form.sleep_time.slice(0, 5) })
}, 'Salvo.')
</script>

<template>
  <h1>Ajustes</h1>
  <form @submit.prevent="save">
    <div class="row">
      <label>Acordo<input v-model="form.wake_time" type="time" /></label>
      <label>Durmo<input v-model="form.sleep_time" type="time" /></label>
    </div>
    <label>Fuso horário<input v-model="form.tz" /></label>
    <button v-if="form.tz !== deviceTz" type="button" class="ghost" @click="form.tz = deviceTz">Usar o do aparelho ({{ deviceTz }})</button>
    <div class="row">
      <label>Atenção (min)<input v-model.number="form.warn_min" type="number" min="0" /></label>
      <label>Urgente (min)<input v-model.number="form.urgent_min" type="number" min="0" /></label>
    </div>
    <label>Tolerância de hábito com horário fixo (min)<input v-model.number="form.fixed_grace_min" type="number" min="0" /></label>
    <label><input v-model="form.morning_summary" type="checkbox" style="width: auto" /> Resumo ao acordar</label>
    <label><input v-model="form.evening_summary" type="checkbox" style="width: auto" /> Aviso antes de dormir</label>
    <label>Aviso de fim do dia (min antes de dormir)<input v-model.number="form.evening_min" type="number" min="0" /></label>
    <button style="margin-top: 12px; width: 100%">Salvar</button>
  </form>

  <h2 class="section">Notificações</h2>
  <div class="row">
    <button @click="run(enablePush, 'Notificações ativadas neste aparelho.')">Ativar</button>
    <button class="ghost" @click="run(sendTestPush, 'Teste enviado.')">Enviar teste</button>
  </div>
  <p class="meta">
    No Samsung, para o alerta chegar no horário: Configurações → Aplicativos → este app → Bateria → “Sem restrições”,
    e tire o app de “Apps em suspensão”.
  </p>
  <p v-if="msg">{{ msg }}</p>

  <h2 class="section">Dados</h2>
  <div class="row">
    <button class="ghost" @click="run(exportCsv, 'CSV exportado.')">Exportar CSV</button>
    <button class="ghost" @click="run(exportBackup, 'Backup exportado.')">Backup JSON</button>
  </div>
  <label>Restaurar backup JSON
    <input type="file" accept="application/json" @change="(e) => run(async () => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { await importBackup(f); await loadAll() } }, 'Backup restaurado.')" />
  </label>

  <button class="ghost" style="margin-top: 24px; width: 100%" @click="supabase.auth.signOut()">Sair</button>
</template>
