<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { formatMinutes as hm } from '../../supabase/functions/_shared/time'
import { burst } from '../lib/confetti'
import Icon from './Icon.vue'

// Comemoração de fechar o dia: aparece uma vez, quando o último item pendente é concluído.
defineProps<{ count: number; minutes: number; xp: number; streak: number }>()
const emit = defineEmits<{ close: [] }>()
const btn = ref<HTMLButtonElement>()
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => {
  btn.value?.focus()
  document.addEventListener('keydown', onKey)
  setTimeout(() => burst(innerWidth / 2, innerHeight * 0.2, true), 180)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="closed-title">
    <div class="celebrate-inner">
      <div class="badge"><Icon name="flame" filled :size="68" /></div>
      <h2 id="closed-title">Dia fechado!</h2>
      <p class="lead">Tudo feito. Sem desculpas hoje.</p>
      <p class="streak-line"><Icon name="flame" filled :size="22" />{{ streak }} {{ streak === 1 ? 'dia seguido' : 'dias seguidos' }}</p>
      <div class="stats3">
        <div><b class="num">{{ count }}</b><span>{{ count === 1 ? 'item feito' : 'itens feitos' }}</span></div>
        <div><b class="num">{{ hm(minutes) }}</b><span>de dedicação</span></div>
        <div class="xp"><b class="num">+{{ xp }}</b><span>XP hoje</span></div>
      </div>
      <button ref="btn" @click="emit('close')">Continuar</button>
    </div>
  </div>
</template>
