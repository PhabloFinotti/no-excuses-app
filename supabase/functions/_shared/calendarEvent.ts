// Monta o corpo do evento do Google Agenda a partir de uma tarefa. Pura, para testar sem rede.
export interface TaskForEvent {
  name: string
  due_date: string // YYYY-MM-DD
  fixed_time: string | null // HH:MM[:SS]
  duration_min: number
}

const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`

export function eventFromTask(t: TaskForEvent, tz: string, done: boolean) {
  const base = {
    summary: `${done ? '✓ ' : ''}${t.name}`,
    description: `Tarefa do No Excuses · duração prevista: ${t.duration_min} min`,
    colorId: done ? '8' : undefined, // grafite quando concluída
  }
  if (!t.fixed_time) return { ...base, start: { date: t.due_date }, end: { date: addDay(t.due_date, 1) } } // dia inteiro; fim exclusivo
  const [h, m] = t.fixed_time.split(':').map(Number) as [number, number]
  const start = h * 60 + m
  const end = start + t.duration_min
  return {
    ...base,
    start: { dateTime: `${t.due_date}T${hhmm(start)}`, timeZone: tz },
    // Passou da meia-noite: o fim cai no dia seguinte.
    end: { dateTime: `${addDay(t.due_date, Math.floor(end / 1440))}T${hhmm(end % 1440)}`, timeZone: tz },
  }
}
