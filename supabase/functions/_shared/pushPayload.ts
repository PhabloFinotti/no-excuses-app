// Formato do push (sem dependências, para o job do tick e os testes importarem sem trazer o web-push).
export interface PushPayload {
  title: string
  body: string
  tag?: string
  level?: 'attention' | 'urgent' | 'overdue' | 'test' | 'summary'
  itemId?: string // habilita as ações Feito/Adiar na notificação
}
