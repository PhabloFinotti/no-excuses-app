// Roda a cada minuto (pg_cron). Recalcula tudo do zero e envia um push quando um nível é cruzado (ADR 0002).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { configurePush, sendToUser } from '../_shared/push.ts'
import { runTickJob } from '../_shared/tickJob.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  configurePush()
  return Response.json(await runTickJob(db, (userId, payload) => sendToUser(db, userId, payload), new Date()))
})
