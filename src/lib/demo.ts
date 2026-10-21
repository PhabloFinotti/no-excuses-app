// Modo demo (npm run dev:demo): mini-Supabase em memória com dados relativos a "agora", para testar a UI sem backend.
import { localTime, minToTime } from '../../supabase/functions/_shared/time'

type Row = Record<string, any>
const uid = () => crypto.randomUUID()
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

function seed() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = localTime(new Date(), tz)
  const sleep = Math.min(now.minutes + 120, 24 * 60 - 1)
  const wake = Math.max(0, Math.min(now.minutes - 60, 7 * 60))
  const habit = (name: string, dur: number, extra: Row = {}): Row => ({
    id: uid(), user_id: 'demo', kind: 'habit', name, duration_min: dur, fixed_time: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
    due_date: null, essential: false, warn_min: null, urgent_min: null, archived: false,
    created_at: new Date(Date.now() - 20 * 86_400_000).toISOString(), ...extra,
  })
  const task = (name: string, dur: number, due: string): Row => habit(name, dur, { kind: 'task', weekdays: [], due_date: due })
  const hhmm = (m: number) => `${minToTime(Math.max(0, Math.min(m, 1439)))}:00`

  const items = [
    habit('Meditar', 10, { fixed_time: hhmm(now.minutes + 8) }),
    habit('Leitura', 30, { essential: true }),
    habit('Inglês', 25),
    habit('Alongar', 15),
    habit('Beber água', 5),
    task('Pagar a conta de luz', 20, addDays(now.day, -1)),
    task('Responder o e-mail do contador', 15, addDays(now.day, -5)),
  ]
  const completions: Row[] = []
  const water = items[4]!
  completions.push({ item_id: water.id, day: now.day, user_id: 'demo', done: true, skipped: false, spent_min: 5, timer_started_at: null, timer_accum_s: 300 })
  // 3 semanas de histórico com falhas, para calendário, sequência e média do timer
  for (const h of items.slice(0, 5)) for (let d = 1; d <= 20; d++) {
    if ((d * 7 + h.name.length) % 5 === 0) continue
    completions.push({ item_id: h.id, day: addDays(now.day, -d), user_id: 'demo', done: true, skipped: false, spent_min: h.duration_min + 22 * +(h.name === 'Leitura'), timer_started_at: null, timer_accum_s: 0 })
  }
  const profile = { user_id: 'demo', wake_time: `${minToTime(wake)}:00`, sleep_time: `${minToTime(sleep)}:00`, tz, warn_min: 30, urgent_min: 10, fixed_grace_min: 15, morning_summary: true, evening_summary: true, evening_min: 60, calendar_connected: false }
  return { items, item_completions: completions, profiles: [profile], push_subscriptions: [] as Row[] }
}

const KEYS: Record<string, string[]> = { items: ['id'], item_completions: ['item_id', 'day'], profiles: ['user_id'] }

class Query {
  private op: 'select' | 'upsert' | 'update' = 'select'
  private payload: Row | Row[] = {}
  private filters: ((r: Row) => boolean)[] = []
  private conflict: string[]
  private ignoreDup = false
  private one = false
  private orderCol?: string
  private db: Record<string, Row[]>
  private table: string
  constructor(db: Record<string, Row[]>, table: string) {
    this.db = db
    this.table = table
    this.conflict = KEYS[table] ?? ['id']
  }
  select() { return this }
  single() { this.one = true; return this }
  order(col: string) { this.orderCol = col; return this }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this }
  gte(col: string, v: string) { this.filters.push((r) => r[col] >= v); return this }
  upsert(p: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert'; this.payload = p; this.ignoreDup = !!opts.ignoreDuplicates
    if (opts.onConflict) this.conflict = opts.onConflict.split(',')
    return this
  }
  update(p: Row) { this.op = 'update'; this.payload = p; return this }
  then(ok?: (v: { data: any; error: null }) => unknown, bad?: (e: unknown) => unknown) {
    return Promise.resolve().then(() => this.run()).then(ok, bad)
  }
  private run() {
    const rows = this.db[this.table]!
    let out: Row[]
    if (this.op === 'upsert') {
      out = []
      for (const p of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const hit = rows.find((r) => this.conflict.every((k) => r[k] === p[k] || (k === 'user_id' && p[k] === undefined)))
        if (hit && !this.ignoreDup) Object.assign(hit, p)
        if (hit) { out.push(hit); continue }
        const base: Row = { user_id: 'demo', created_at: new Date().toISOString(), archived: false, done: false, skipped: false, spent_min: 0, timer_started_at: null, timer_accum_s: 0 }
        if (this.table === 'items') base.id = uid()
        const row = { ...base, ...p }
        if (this.table === 'profiles' && !Object.keys(p).length) continue
        rows.push(row); out.push(row)
      }
    } else {
      out = rows.filter((r) => this.filters.every((f) => f(r)))
      if (this.op === 'update') out.forEach((r) => Object.assign(r, this.payload))
      if (this.orderCol) out.sort((a, b) => String(a[this.orderCol!]).localeCompare(String(b[this.orderCol!])))
    }
    return { data: this.one ? (out[0] ? { ...out[0] } : null) : out.map((r) => ({ ...r })), error: null }
  }
}

export function createFake() {
  const db = seed()
  const session = { user: { id: 'demo', email: 'demo@local' } }
  return {
    from: (t: string) => new Query(db as Record<string, Row[]>, t),
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    channel: () => ({ on() { return this }, subscribe() { return this } }),
    removeChannel: () => {},
    functions: { invoke: async () => ({ data: { sent: 0 }, error: null }) },
  }
}
