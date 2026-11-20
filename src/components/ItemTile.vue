<script setup lang="ts">
import { computed } from 'vue'
import { categoryOf, emojiOf } from '../lib/categories'

// Quadradinho do item: o emoji (do item ou da categoria) sobre a cor da categoria; sem emoji, a inicial do nome.
const props = defineProps<{ item: { name: string; category?: string | null; emoji?: string | null }; size?: 'sm' | 'lg' }>()
const emoji = computed(() => emojiOf(props.item))
const tint = computed(() => `var(--t-${categoryOf(props.item) ?? 'none'})`)
</script>

<template>
  <span class="tile" :class="size" :style="{ background: tint }" aria-hidden="true">
    <template v-if="emoji">{{ emoji }}</template>
    <b v-else class="glyph">{{ item.name.trim().charAt(0).toUpperCase() || '?' }}</b>
  </span>
</template>
