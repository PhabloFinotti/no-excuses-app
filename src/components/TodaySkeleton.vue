<script setup lang="ts">
// Esqueleto da tela Hoje com as mesmas medidas do conteúdo real (cabeçalho, card do dia, linhas):
// quando os dados chegam eles entram no lugar, sem empurrar nada.
</script>

<template>
  <div class="skeleton" role="status" aria-label="Carregando seus itens">
    <header class="today-head">
      <div>
        <p class="date"><span class="sk sk-inline" style="width: 10rem" /></p>
        <h1><span class="sk sk-inline" style="width: 8rem; height: 2rem" /></h1>
      </div>
    </header>
    <div class="split">
      <div class="split-main">
        <div class="sk sk-day" />
        <h2 class="section"><span class="sk sk-inline" style="width: 4rem" /></h2>
        <div v-for="n in 3" :key="n" class="sk sk-row" />
      </div>
      <aside class="split-aside" />
    </div>
  </div>
</template>
