// O trabalho do `tick` sem I/O fixo: o banco e o envio de push entram por parâmetro, para testar com um banco falso.
import type { CompletionRow, ItemRow } from './pending.ts'
import type { PushPayload } from './pushPayload.ts'
import { runTick } from './runTick.ts'
import { planSummaries } from './summaries.ts'
import { localTime } from './time.ts'

// Só o que o job usa do cliente Supabase (assim um fake simples serve nos testes).
export interface Db { from: (table: string) => any }
export type Send = (userId: string, payload: PushPayload) => Promise<{ sent: number; attempted: number }>

export async function runTickJob(db: Db, send: Send, nowDate: Date): Promise<{ sent: number; failedProfiles: number }> {
  let sent = 0
  let failedProfiles = 0
  const { data: profiles } = await db.from('profiles').select('*')

  for (const p of profiles ?? []) {
    // Um perfil com problema (ex.: fuso inválido) não pode calar os alertas dos outros.
    try {
      sent += await tickProfile(db, send, p, nowDate)
    } catch (e) {
      failedProfiles++
      console.error('tick failed for profile', p.user_id, (e as Error).message)
    }
  }
  return { sent, failedProfiles }
}

async function tickProfile(db: Db, send: Send, p: any, nowDate: Date): Promise<number> {
  let sent = 0
  const day = localTime(nowDate, p.tz).day
  const since = new Date(nowDate.getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
  const [{ data: items }, { data: completions }, { data: log }, { data: summaryLog }] = await Promise.all([
    db.from('items').select('*').eq('user_id', p.user_id).eq('archived', false),
    db.from('item_completions').select('*').eq('user_id', p.user_id).gte('day', since),
    db.from('notification_log').select('item_id, day, level').eq('day', day),
    db.from('summary_log').select('day, kind').eq('user_id', p.user_id).eq('day', day),
  ])
  const itemRows = (items ?? []) as ItemRow[]
  const completionRows = (completions ?? []) as CompletionRow[]

  const sentSummaries = new Set<string>((summaryLog ?? []).map((l: any) => `${l.day}:${l.kind}`))
  for (const sum of planSummaries(p, itemRows, completionRows, sentSummaries, nowDate)) {
    const { data: inserted } = await db
      .from('summary_log')
      .upsert({ user_id: p.user_id, day: sum.day, kind: sum.kind }, { onConflict: 'user_id,day,kind', ignoreDuplicates: true })
      .select()
    if (!inserted?.length) continue
    const r = await send(p.user_id, { title: sum.title, body: sum.body, tag: `summary-${sum.kind}`, level: 'summary' })
    sent += r.sent
    // Falhou em todos os aparelhos: libera o registro para o próximo minuto tentar de novo.
    if (r.attempted > 0 && r.sent === 0) await db.from('summary_log').delete().eq('user_id', p.user_id).eq('day', sum.day).eq('kind', sum.kind)
  }

  // O log é lido de todos os usuários (a chave de serviço ignora RLS): fica só o que é dos itens deste perfil.
  const mine = new Set(itemRows.map((i) => i.id))
  const already = new Set<string>((log ?? []).filter((l: any) => mine.has(l.item_id)).map((l: any) => `${l.item_id}:${l.day}:${l.level}`))
  for (const push of runTick(p, itemRows, completionRows, already, nowDate)) {
    // O log único (item, dia, nível) garante um envio por nível mesmo com execuções concorrentes.
    const { data: inserted } = await db
      .from('notification_log')
      .upsert({ item_id: push.itemId, day: push.day, level: push.level }, { onConflict: 'item_id,day,level', ignoreDuplicates: true })
      .select()
    if (!inserted?.length && !push.snooze) continue
    if (push.snooze)
      await db.from('item_completions').update({ snooze_notified_for: push.snooze.until }).eq('item_id', push.itemId).eq('day', push.snooze.completionDay)

    const r = await send(p.user_id, { title: push.title, body: push.body, tag: push.itemId, level: push.level, itemId: push.itemId })
    sent += r.sent
    if (r.attempted > 0 && r.sent === 0) {
      if (inserted?.length) await db.from('notification_log').delete().eq('item_id', push.itemId).eq('day', push.day).eq('level', push.level)
      if (push.snooze) await db.from('item_completions').update({ snooze_notified_for: null }).eq('item_id', push.itemId).eq('day', push.snooze.completionDay)
    }
  }
  return sent
}
