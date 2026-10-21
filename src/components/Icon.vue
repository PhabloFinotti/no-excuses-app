<script setup lang="ts">
// Ícones desenhados em um traço só (24x24, stroke 1.75), no estilo Lucide.
const PATHS: Record<string, string> = {
  check: 'M20 6 9 17l-5-5',
  play: 'M7 4v16l13-8z',
  pause: 'M8 4v16M16 4v16',
  focus: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  snooze: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  skip: 'M5 4l10 8-10 8V4zM19 5v14',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chart: 'M3 3v18h18M7 14l4-4 4 3 5-6',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  plus: 'M12 5v14M5 12h14',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  undo: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
}
defineProps<{ name: keyof typeof PATHS; size?: number }>()
defineExpose({ PATHS })
</script>

<template>
  <svg :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="PATHS[name]" />
  </svg>
</template>
