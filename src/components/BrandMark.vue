<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{ size?: number }>()
</script>

<template>
  <span class="brand-mark" :style="{ '--s': `${size ?? 40}px` }" aria-hidden="true"><Icon name="check" :size="(size ?? 40) * 0.6" /></span>
</template>
