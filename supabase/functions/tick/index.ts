// Roda a cada minuto (pg_cron). Recalcula tudo do zero e envia um push quando um nível é cruzado (ADR 0002).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { calculateState, type Level } from '../_shared/calculateState.ts'
import { toCalcItems, type CompletionRow, type ItemRow } from '../_shared/pending.ts'
import { configurePush, sendToUser } from '../_shared/push.ts'
import { localTime, minToTime, timeToMin } from '../_shared/time.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  configurePush()
  const nowDate = new Date()
  let sent = 0

  const { data: profiles } = await db.from('profiles').select('*')
  for (const p of profiles ?? []) {
    const now = localTime(nowDate, p.tz)
    // Fora da janela acordado não avisa.
    if (now.minutes < timeToMin(p.wake_time) || now.minutes >= timeToMin(p.sleep_time)) continue

    const since = new Date(nowDate.getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
    const [{ data: items }, { data: completions }] = await Promise.all([
      db.from('items').select('*').eq('user_id', p.user_id).eq('archived', false),
      db.from('item_completions').select('*').eq('user_id', p.user_id).gte('day', since),
    ])
    const result = calculateState(
      toCalcItems((items ?? []) as ItemRow[], (completions ?? []) as CompletionRow[], now, nowDate.getTime()),
      now.minutes,
      { sleepMin: timeToMin(p.sleep_time), warnMin: p.warn_min, urgentMin: p.urgent_min },
    )

    for (const s of result.states) {
      if (s.level === 'normal') continue
      // O log único (item, dia, nível) garante um envio por nível; só envia quem conseguiu inserir.
      const { data: inserted } = await db
        .from('notification_log')
        .upsert({ item_id: s.id, day: now.day, level: s.level }, { onConflict: 'item_id,day,level', ignoreDuplicates: true })
        .select()
      if (!inserted?.length) continue

      const name = (items as ItemRow[]).find((i) => i.id === s.id)!.name
      sent += await sendToUser(db, p.user_id, { ...message(s.level, name, s.minutesUntilDeadline, minToTime(s.deadlineMin), result.deficitMin), tag: s.id, level: s.level })
    }
  }
  return Response.json({ sent })
})

function message(level: Exclude<Level, 'normal'>, name: string, minutes: number, deadline: string, deficit: number) {
  if (level === 'overdue')
    return { title: `${name}: atrasado`, body: deficit ? `Não cabe tudo antes de dormir: faltam ${deficit} min.` : `Era para começar até ${deadline}.` }
  if (level === 'urgent') return { title: `${name}: urgente`, body: `Comece em ${minutes} min (até ${deadline}).` }
  return { title: `${name}: está acabando o tempo`, body: `Comece até ${deadline} (em ${minutes} min).` }
}
