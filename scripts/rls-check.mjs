// Confirma que um usuário não lê nem escreve dados de outro. Cria dois usuários temporários e apaga ao final.
// Uso: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/rls-check.mjs
// Rode só em um projeto de teste: usa a chave de serviço.
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env
if (!url || !anon || !service) throw new Error('Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, service, { auth: { persistSession: false } })
const stamp = Date.now()
const password = `Rls-${stamp}-${Math.random().toString(36).slice(2)}`
const made = []
let failures = 0
const check = (name, ok) => { console.log(`${ok ? 'OK  ' : 'FALHA'} ${name}`); if (!ok) failures++ }

async function newUser(tag) {
  const email = `rls-${tag}-${stamp}@example.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  made.push(data.user.id)
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { error: e2 } = await client.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return { id: data.user.id, client }
}

try {
  const a = await newUser('a')
  const b = await newUser('b')

  const { data: item, error } = await a.client.from('items').insert({ kind: 'habit', name: 'rls-a', duration_min: 10, weekdays: [0, 1, 2, 3, 4, 5, 6] }).select().single()
  if (error) throw error
  await a.client.from('item_completions').insert({ item_id: item.id, day: '2026-01-01', done: true })

  check('B não lê itens de A', ((await b.client.from('items').select('id').eq('id', item.id)).data ?? []).length === 0)
  check('B não lê conclusões de A', ((await b.client.from('item_completions').select('item_id').eq('item_id', item.id)).data ?? []).length === 0)
  check('B não lê o perfil de A', ((await b.client.from('profiles').select('user_id').eq('user_id', a.id)).data ?? []).length === 0)

  await b.client.from('items').update({ name: 'invadido' }).eq('id', item.id)
  check('B não altera item de A', (await admin.from('items').select('name').eq('id', item.id).single()).data.name === 'rls-a')

  await b.client.from('items').delete().eq('id', item.id)
  check('B não apaga item de A', ((await admin.from('items').select('id').eq('id', item.id)).data ?? []).length === 1)

  const forged = await b.client.from('item_completions').insert({ item_id: item.id, day: '2026-01-02', done: true })
  check('B não cria conclusão em item de A', !!forged.error)

  const stolen = await b.client.from('items').insert({ user_id: a.id, kind: 'habit', name: 'forjado', duration_min: 5, weekdays: [1] })
  check('B não cria item em nome de A', !!stolen.error)

  check('B não lê notification_log', ((await b.client.from('notification_log').select('item_id')).data ?? []).length === 0)
  check('B não lê tokens do Google', ((await b.client.from('google_calendar_links').select('user_id')).data ?? []).length === 0)
} finally {
  for (const id of made) await admin.auth.admin.deleteUser(id)
}
console.log(failures ? `\n${failures} verificação(ões) falharam` : '\nIsolamento OK')
process.exit(failures ? 1 : 0)
