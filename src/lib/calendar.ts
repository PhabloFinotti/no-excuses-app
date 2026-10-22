// Link "novo evento" do Google Agenda, já preenchido. Sem OAuth: o usuário só confirma no Google.
import { eventFromTask, type TaskForEvent } from '../../supabase/functions/_shared/calendarEvent'

export type CalendarTask = TaskForEvent

// O Google quer 20261021T143000 (hora local, junto de `ctz`) ou 20261021 (dia inteiro).
const at = (p: { date?: string; dateTime?: string }) => (p.date ?? p.dateTime!).replace(/[-:]/g, '')

export function googleCalendarUrl(t: CalendarTask, tz: string): string {
  const e = eventFromTask(t, tz, false) // mesma regra do evento sincronizado: dia inteiro, horário, virada de meia-noite
  const dates = `${at(e.start)}/${at(e.end)}`
  const q = new URLSearchParams({ action: 'TEMPLATE', text: t.name, dates, ctz: tz, details: e.description })
  return `https://calendar.google.com/calendar/render?${q}`
}
