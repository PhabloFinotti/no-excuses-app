# ADR 0001: PWA (Vue + Supabase) em vez de Kotlin nativo

Status: aceito, sujeito ao resultado do M0.5.

Decisão: PWA com Web Push. Motivos do usuário: aprender a stack que já usa no trabalho; teste e deploy mais simples (sem APK).
Consequência/risco: Web Push passa pelo FCM e pode atrasar (Doze, bateria Samsung); não há notificação local agendada na web. Sem internet o push não chega.
Mitigação: `urgency: high`, UI recalcula ao abrir, spike M0.
Plano B: Vue + Capacitor com local notifications. Alternativa descartada: Kotlin + Compose (notificações locais exatas, sideload via adb).

Resultado do spike M0.5: (preencher)
