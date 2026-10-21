<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BrandMark from '../components/BrandMark.vue'
import Icon from '../components/Icon.vue'
import { supabase } from '../lib/supabase'

const email = ref('')
const password = ref('')
const show = ref(false)
const busy = ref(false)
const error = ref('')

async function login() {
  busy.value = true
  error.value = ''
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  busy.value = false
  if (e) error.value = /invalid login/i.test(e.message) ? 'E-mail ou senha incorretos.' : /fetch|network/i.test(e.message) ? 'Sem conexão. Confira a internet e tente de novo.' : e.message
}

// Relógio do painel lateral: o tempo é o protagonista do produto, então ele aparece antes mesmo do login.
const now = ref(new Date())
const timer = setInterval(() => !document.hidden && (now.value = new Date()), 1000)
onBeforeUnmount(() => clearInterval(timer))
const clock = computed(() => now.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
const date = computed(() => now.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))
const dayPct = computed(() => (now.value.getHours() * 3600 + now.value.getMinutes() * 60 + now.value.getSeconds()) / 86400)
</script>

<template>
  <div class="login">
    <section class="login-hero">
      <div class="brand"><BrandMark :size="40" /><span>No Excuses</span></div>
      <div class="hero-copy">
        <h1>Sem desculpas.</h1>
        <p>Hábitos e tarefas contra o relógio, com aviso na hora em que o tempo aperta.</p>
      </div>
      <div class="hero-clock" aria-hidden="true">
        <p class="clock-big num">{{ clock }}</p>
        <p class="clock-date">{{ date }}</p>
        <div class="track"><div class="fill" :style="{ transform: `scaleX(${dayPct})` }" /></div>
        <p class="clock-date">{{ Math.round(dayPct * 100) }}% do dia já passou</p>
      </div>
    </section>

    <section class="login-panel">
      <form class="login-form" @submit.prevent="login">
        <h2>Entrar</h2>
        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" required autofocus />
        <label for="password">Senha</label>
        <div class="pw">
          <input id="password" v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" required />
          <button type="button" class="icon-btn pw-toggle" :aria-label="show ? 'Ocultar senha' : 'Mostrar senha'" :aria-pressed="show" @click="show = !show">
            <Icon :name="show ? 'eyeoff' : 'eye'" />
          </button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="login-submit" :disabled="busy">{{ busy ? 'Entrando…' : 'Entrar' }}</button>
        <p class="meta">Acesso restrito: o cadastro de novas contas está fechado.</p>
      </form>
    </section>
  </div>
</template>
