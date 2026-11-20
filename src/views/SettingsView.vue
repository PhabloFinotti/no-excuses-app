<script setup lang="ts">
import { reactive, ref } from 'vue'
import { exportBackup, exportCsv, importBackup } from '../lib/backup'
import { enablePush, pushDiagnostics, sendTestPush, type PushDiagnostics } from '../lib/push'
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
const diag = ref<PushDiagnostics>()
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca')
async function restore(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await run(async () => {
    const b = await importBackup(file)
    if (b.profile) await saveProfile(b.profile as never)
    await loadAll()
    Object.assign(form, profile.value) // o formulário é uma cópia: sem isto salvar de novo desfaria o que foi restaurado
    return b
  }, (b) => `Backup restaurado: ${b.items.length} itens e ${b.completions.length} conclusões${b.profile ? ', além da rotina' : ''}.`)
  input.value = '' // permite escolher o mesmo arquivo de novo
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
  <div class="settings-grid" style="margin-top: 16px">
    <div>
      <form class="group" @submit.prevent="save">
        <h2>Sua rotina</h2>
        <p class="meta">O app conta o dia entre acordar e dormir e calcula até quando cada item ainda pode começar.</p>
        <label class="set-line"><span>Acordo às</span><input v-model="form.wake_time" type="time" /></label>
        <label class="set-line"><span>Durmo às</span><input v-model="form.sleep_time" type="time" /></label>
        <label class="set-line"><span>Resumo ao acordar</span><input v-model="form.morning_summary" type="checkbox" class="switch" /></label>
        <label class="set-line"><span>Aviso antes de dormir</span><input v-model="form.evening_summary" type="checkbox" class="switch" /></label>
        <label v-if="form.evening_summary" class="set-line"><span>Quantos min antes de dormir</span><input v-model.number="form.evening_min" type="number" min="0" inputmode="numeric" /></label>
        <details class="fold">
          <summary>Avançado: fuso e limites dos alertas</summary>
          <label>Fuso horário<input v-model="form.tz" /></label>
          <button v-if="form.tz !== deviceTz" type="button" class="ghost" style="width: 100%" @click="form.tz = deviceTz">Usar o do aparelho ({{ deviceTz }})</button>
          <label>Alerta de atenção quando faltar (min)<input v-model.number="form.warn_min" type="number" min="0" /></label>
          <label>Alerta urgente quando faltar (min)<input v-model.number="form.urgent_min" type="number" min="0" /></label>
          <label>Atraso permitido em itens com horário marcado (min)<input v-model.number="form.fixed_grace_min" type="number" min="0" /></label>
        </details>
        <button style="width: 100%; margin-top: 6px">Salvar rotina</button>
      </form>

      <section class="group">
        <h2>Notificações</h2>
        <p class="meta">No Samsung, para o alerta chegar na hora: Configurações → Aplicativos → No Excuses → Bateria → “Sem restrições”, e tire o app de “Apps em suspensão”.</p>
        <div class="row" style="margin-top: 12px">
          <button @click="run(enablePush, 'Notificações ativadas neste aparelho.')">Ativar</button>
          <button class="ghost" @click="run(sendTestPush, 'Teste enviado.')">Enviar teste</button>
        </div>
        <button class="text-btn" style="margin-top: 6px" @click="run(async () => (diag = await pushDiagnostics()), '')">Verificar situação</button>
        <ul v-if="diag" class="meta diag">
          <li>Permissão: {{ diag.permission === 'granted' ? 'concedida' : diag.permission === 'denied' ? 'negada (libere nas configurações do navegador)' : diag.permission === 'unsupported' ? 'sem suporte neste navegador' : 'ainda não pedida' }}</li>
          <li>Assinatura neste aparelho: {{ diag.localSubscription ? 'ativa' : 'não encontrada (toque em Ativar)' }}</li>
          <li>Aparelhos cadastrados: {{ diag.devices }}</li>
          <li>Último envio aceito pelo provedor: {{ when(diag.lastOkAt) }} (aceito não garante que apareceu na tela)</li>
          <li v-if="diag.lastError">Último erro: {{ diag.lastError }} ({{ when(diag.lastErrorAt) }})</li>
        </ul>
      </section>
    </div>

    <div>
      <section class="group">
        <h2>Google Agenda</h2>
        <template v-if="profile!.calendar_connected">
          <p class="meta">Conectado. As tarefas avulsas aparecem no calendário “No Excuses” e acompanham edição, conclusão (✓) e exclusão. Hábitos não são enviados.</p>
          <div class="row" style="margin-top: 12px">
            <button class="ghost" @click="run(syncPendingTasks, (n) => `${n} tarefa(s) enviada(s).`)">Enviar pendentes</button>
            <button class="ghost" @click="run(disconnectCalendar, 'Desconectado. Os eventos já criados continuam no Google Agenda.')">Desconectar</button>
          </div>
        </template>
        <template v-else>
          <p class="meta">Envie suas tarefas avulsas para um calendário próprio, “No Excuses”, no Google Agenda. O app só enxerga esse calendário, nunca os seus outros.</p>
          <button style="margin-top: 12px; width: 100%" @click="run(connectCalendar, '')">Conectar Google Agenda</button>
        </template>
      </section>

      <section class="group">
        <h2>Seus dados</h2>
        <div class="row" style="margin-top: 8px">
          <button class="ghost" @click="run(exportCsv, 'CSV exportado.')">Exportar CSV</button>
          <button class="ghost" @click="run(exportBackup, 'Backup exportado (itens, conclusões e rotina).')">Backup JSON</button>
        </div>
        <label>Restaurar backup JSON
          <input type="file" accept="application/json" @change="restore" />
        </label>
        <p class="meta">Restaurar mistura o backup com o que já existe: itens e conclusões com o mesmo código são substituídos pelos do arquivo; o resto fica como está.</p>
      </section>

      <button class="danger" style="width: 100%" @click="signOut()">Sair da conta</button>
    </div>
  </div>
</template>
