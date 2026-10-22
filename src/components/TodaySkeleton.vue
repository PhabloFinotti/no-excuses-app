<script setup lang="ts">
// Esqueleto da tela Hoje com o mesmo markup e as mesmas medidas do conteúdo real (cabeçalho, cartão de instalação,
// ajuda, título de seção e cartões): quando os dados chegam eles entram no lugar, sem empurrar nada.
import OnboardingCard from './OnboardingCard.vue'
</script>

<template>
  <div class="skeleton" role="status" aria-label="Carregando seus itens">
    <header class="day">
      <p class="date"><span class="sk sk-inline" style="width: 9rem" /></p>
      <h1><span class="sk sk-inline" style="width: 6rem; height: 2rem" /></h1>
      <div class="day-progress">
        <div class="track" />
        <p class="meta"><span class="sk sk-inline" style="width: 11rem" /></p>
      </div>
    </header>
    <OnboardingCard />
    <div class="sk sk-how" />
    <div class="split">
      <div class="split-main">
        <h2 class="section"><span class="sk sk-inline" style="width: 4rem" /></h2>
        <div v-for="n in 3" :key="n" class="sk sk-card" />
      </div>
      <aside class="split-aside" />
    </div>
  </div>
</template>
