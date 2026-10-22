import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// VITE_DEMO só existe em `npm run dev:demo`: troca o backend por um fake em memória.
// Import dinâmico: o código do demo não entra no pacote de produção.
export const supabase: SupabaseClient = import.meta.env.VITE_DEMO
  ? ((await import('./demo')).createFake() as unknown as SupabaseClient)
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

// Lança o erro do Supabase em vez de devolvê-lo no resultado.
export function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}
