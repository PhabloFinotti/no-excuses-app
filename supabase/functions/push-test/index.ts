// Push de teste para os aparelhos do usuário logado (JWT verificado pela plataforma). Serve ao spike M0.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { configurePush, sendToUser } from '../_shared/push.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  })
  const { data: { user } } = await db.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401, headers: cors })

  configurePush()
  // Compare esta hora com a de chegada na tela do celular para medir o atraso.
  const sentAt = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const sent = await sendToUser(db, user.id, { title: 'Teste de push', body: `Enviado às ${sentAt}`, tag: 'test', level: 'test' })
  return Response.json({ sent }, { headers: cors })
})
