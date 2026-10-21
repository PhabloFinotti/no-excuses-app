// Roda a cada minuto (pg_cron). Recalcula tudo do zero e envia um push quando um nível é cruzado (ADR 0002).
import { createClient } from 'npm:@supabase/supabase-js@2'
import type { CompletionRow, ItemRow } from '../_shared/pending.ts'
import { configurePush, sendToUser } from '../_shared/push.ts'
import { runTick } from '../_shared/runTick.ts'
import { planSummaries } from '../_shared/summaries.ts'
import { localTime } from '../_shared/time.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  configurePush()
  const nowDate = new Date()
  let sent = 0

  const { data: profiles } = await db.from('profiles').select('*')
  for (const p of profiles ?? []) {
    const day = localTime(nowDate, p.tz).day
    const since = new Date(nowDate.getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
    const [{ data: items }, { data: completions }, { data: log }, { data: summaryLog }] = await Promise.all([
      db.from('items').select('*').eq('user_id', p.user_id).eq('archived', false),
      db.from('item_completions').select('*').eq('user_id', p.user_id).gte('day', since),
      db.from('notification_log').select('item_id, day, level').eq('day', day),
      db.from('summary_log').select('day, kind').eq('user_id', p.user_id).eq('day', day),
    ])
    const already = new Set((log ?? []).map((l) => `${l.item_id}:${l.day}:${l.level}`))

    const sentSummaries = new Set((summaryLog ?? []).map((l) => `${l.day}:${l.kind}`))
    for (const sum of planSummaries(p, (items ?? []) as ItemRow[], (completions ?? []) as CompletionRow[], sentSummaries, nowDate)) {
      const { data: inserted } = await db
        .from('summary_log')
        .upsert({ user_id: p.user_id, day: sum.day, kind: sum.kind }, { onConflict: 'user_id,day,kind', ignoreDuplicates: true })
        .select()
      if (inserted?.length) sent += await sendToUser(db, p.user_id, { title: sum.title, body: sum.body, tag: `summary-${sum.kind}`, level: 'summary' })
    }

    for (const push of runTick(p, (items ?? []) as ItemRow[], (completions ?? []) as CompletionRow[], already, nowDate)) {
      // O log único (item, dia, nível) garante um envio por nível mesmo com execuções concorrentes.
      const { data: inserted } = await db
        .from('notification_log')
        .upsert({ item_id: push.itemId, day: push.day, level: push.level }, { onConflict: 'item_id,day,level', ignoreDuplicates: true })
        .select()
      if (!inserted?.length && !push.snooze) continue
      if (push.snooze)
        await db.from('item_completions').update({ snooze_notified_for: push.snooze.until }).eq('item_id', push.itemId).eq('day', push.snooze.completionDay)
      sent += await sendToUser(db, p.user_id, { title: push.title, body: push.body, tag: push.itemId, level: push.level, itemId: push.itemId })
    }
  }
  return Response.json({ sent })
})
