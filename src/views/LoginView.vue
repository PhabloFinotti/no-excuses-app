<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const email = ref('')
const password = ref('')
const error = ref('')

async function login() {
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  error.value = e?.message ?? ''
}
</script>

<template>
  <main>
    <h1>No Excuses</h1>
    <form @submit.prevent="login">
      <label>E-mail<input v-model="email" type="email" autocomplete="username" required /></label>
      <label>Senha<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button style="margin-top: 12px; width: 100%">Entrar</button>
    </form>
  </main>
</template>
