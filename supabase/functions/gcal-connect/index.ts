// Devolve a URL de consentimento do Google para o usuário logado. O cliente só redireciona para ela.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { authUrl } from '../_shared/google.ts'
import { signState } from '../_shared/oauthState.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
  const { data: { user } } = await db.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401, headers: cors })

  const state = await signState(user.id, Deno.env.get('GCAL_STATE_SECRET')!, Date.now())
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-callback`
  return Response.json({ url: authUrl(state, redirectUri) }, { headers: cors })
})
