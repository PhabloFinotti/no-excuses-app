<script setup lang="ts">
import { reactive } from 'vue'
import { exportBackup, exportCsv, importBackup } from '../lib/backup'
import { enablePush, sendTestPush } from '../lib/push'
import { connectCalendar, disconnectCalendar, loadAll, profile, saveProfile, signOut, syncPendingTasks } from '../lib/store'
import { notify } from '../lib/toast'

const form = reactive({ ...profile.value! })

async function run(fn: () => Promise<unknown>, ok: string | ((result: any) => string)) {
  try {
    const result = await fn()
    const text = typeof ok === 'function' ? ok(result) : ok
    if (text) notify(text)
  } catch (e) {
    notify((e as Error).message, { error: true })
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
  if (form.sleep_time.slice(0, 5) <= form.wake_time.slice(0, 5)) throw new Error('O horário de dormir precisa ser depois do de acordar (no mesmo dia).')
  if ([form.warn_min, form.urgent_min, form.fixed_grace_min, form.evening_min].some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Os minutos precisam ser números a partir de 0.')
  return saveProfile({ ...form, wake_time: form.wake_time.slice(0, 5), sleep_time: form.sleep_time.slice(0, 5) })
}, 'Salvo.')
</script>

<template>
  <h1>Ajustes</h1>
  <div class="settings-grid">
    <section>
  <h2 class="section">Rotina</h2>
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

    </section>
    <section>
  <h2 class="section">Notificações</h2>
  <div class="row">
    <button @click="run(enablePush, 'Notificações ativadas neste aparelho.')">Ativar</button>
    <button class="ghost" @click="run(sendTestPush, 'Teste enviado.')">Enviar teste</button>
  </div>
  <p class="meta">
    No Samsung, para o alerta chegar no horário: Configurações → Aplicativos → este app → Bateria → “Sem restrições”,
    e tire o app de “Apps em suspensão”.
  </p>

    </section>
    <section>
  <h2 class="section">Google Agenda</h2>
  <template v-if="profile!.calendar_connected">
    <p class="meta">Conectado. As tarefas avulsas aparecem no calendário “No Excuses” e acompanham edição, conclusão (✓) e exclusão. Hábitos não são enviados.</p>
    <div class="row" style="margin-top: 10px">
      <button class="ghost" @click="run(syncPendingTasks, (n) => `${n} tarefa(s) enviada(s).`)">Enviar tarefas pendentes</button>
      <button class="ghost" @click="run(disconnectCalendar, 'Desconectado. Os eventos já criados continuam no Google Agenda.')">Desconectar</button>
    </div>
  </template>
  <template v-else>
    <p class="meta">Envie suas tarefas avulsas para um calendário próprio, “No Excuses”, no Google Agenda. O app só enxerga esse calendário, nunca os seus outros.</p>
    <button style="margin-top: 10px" @click="run(connectCalendar, '')">Conectar Google Agenda</button>
  </template>

    </section>
    <section>
  <h2 class="section">Dados</h2>
  <div class="row">
    <button class="ghost" @click="run(exportCsv, 'CSV exportado.')">Exportar CSV</button>
    <button class="ghost" @click="run(exportBackup, 'Backup exportado.')">Backup JSON</button>
  </div>
  <label>Restaurar backup JSON
    <input type="file" accept="application/json" @change="(e) => run(async () => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { await importBackup(f); await loadAll() } }, 'Backup restaurado.')" />
  </label>

  <button class="ghost" style="margin-top: 24px; width: 100%" @click="signOut()">Sair</button>
    </section>
  </div>
</template>
