// Link "novo evento" do Google Agenda, já preenchido. Sem OAuth: o usuário só confirma no Google.
export interface CalendarTask {
  name: string
  due_date: string // YYYY-MM-DD
  fixed_time: string | null // HH:MM[:SS]
  duration_min: number
}

const compact = (day: string) => day.replace(/-/g, '')
const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

export function googleCalendarUrl(t: CalendarTask, tz: string): string {
  let dates: string
  if (t.fixed_time) {
    const [h, m] = t.fixed_time.split(':').map(Number) as [number, number]
    const start = h * 60 + m
    const end = start + t.duration_min
    const at = (day: string, min: number) => `${compact(day)}T${String(Math.floor(min / 60)).padStart(2, '0')}${String(min % 60).padStart(2, '0')}00`
    // Passou da meia-noite: o fim cai no dia seguinte.
    dates = `${at(t.due_date, start)}/${at(addDay(t.due_date, Math.floor(end / 1440)), end % 1440)}`
  } else {
    dates = `${compact(t.due_date)}/${compact(addDay(t.due_date, 1))}` // dia inteiro; o fim é exclusivo
  }
  const q = new URLSearchParams({ action: 'TEMPLATE', text: t.name, dates, ctz: tz, details: `Tarefa do No Excuses · duração prevista: ${t.duration_min} min` })
  return `https://calendar.google.com/calendar/render?${q}`
}
