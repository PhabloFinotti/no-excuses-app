<script setup lang="ts">
import { computed, ref } from 'vue'

// Colunas (+ linha opcional) em SVG. Marcas finas, 4px arredondado só no topo, vão de 2px, grade recessiva.
const props = defineProps<{
  values: number[]
  titles: string[] // título de cada coluna no tooltip e na tabela
  xTicks: { i: number; text: string }[]
  valueName: string // "feitos"
  line?: (number | null)[]
  lineName?: string
  highlight?: number // índice cujo valor ganha rótulo na coluna
}>()

const W = 340, H = 168, L = 26, R = 6, T = 18, B = 22
const plotW = W - L - R, plotH = H - T - B
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const top = computed(() => {
  const m = Math.max(2, ...props.values, ...(props.line ?? []).map((v) => v ?? 0))
  const c = Math.ceil(m)
  // Valores grandes (minutos): múltiplo de 20, para o tick do meio ser redondo; pequenos: par.
  return c > 10 ? Math.ceil(c / 20) * 20 : c + (c % 2)
})
const y = (v: number) => T + plotH - (v / top.value) * plotH
const slot = computed(() => plotW / props.values.length)
const gap = computed(() => (slot.value < 5 ? 1 : 2))
const barW = computed(() => Math.min(24, Math.max(1.5, slot.value - gap.value)))
const cx = (i: number) => L + slot.value * i + slot.value / 2

// Topo arredondado em 4px (ou menos, se a coluna for baixa/fina), base reta.
function bar(i: number, v: number) {
  const x = cx(i) - barW.value / 2, h = Math.max(0, plotH - (y(v) - T)), r = Math.min(4, barW.value / 2, h)
  if (h === 0) return ''
  const yy = y(v), b = T + plotH
  return `M${x},${b}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + barW.value - r}Q${x + barW.value},${yy} ${x + barW.value},${yy + r}V${b}Z`
}

const linePath = computed(() => {
  const pts = (props.line ?? []).map((v, i) => (v == null ? null : `${cx(i)},${y(v)}`)).filter(Boolean)
  return pts.length > 1 ? `M${pts.join('L')}` : ''
})
const lastLine = computed(() => {
  const i = (props.line ?? []).reduce<number>((a, v, k) => (v == null ? a : k), -1)
  return i < 0 ? null : { x: cx(i), y: y(props.line![i]!), v: props.line![i]! }
})

// Tooltip: o próprio hit-target da coluna (mais largo que a marca) abre; foco de teclado faz o mesmo.
const wrap = ref<HTMLElement>()
const active = ref<number | null>(null)
const tipX = ref(0)
let hideTimer: ReturnType<typeof setTimeout>
function show(i: number) {
  clearTimeout(hideTimer)
  active.value = i
  tipX.value = Math.max(70, Math.min((cx(i) / W) * (wrap.value?.clientWidth ?? W), (wrap.value?.clientWidth ?? W) - 70))
}
function hide(e?: PointerEvent) {
  if (e?.pointerType === 'touch') hideTimer = setTimeout(() => (active.value = null), 2500) // no toque, deixa ler
  else active.value = null
}
</script>

<template>
  <div ref="wrap" class="chart">
    <div class="legend" v-if="line">
      <span><i class="key-bar" />{{ valueName }}</span>
      <span><i class="key-line" />{{ lineName }}</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`Gráfico de colunas: ${valueName}`">
      <g class="grid">
        <template v-for="t in [0, top / 2, top]" :key="t">
          <line :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" />
          <text :x="L - 6" :y="y(t) + 3.5" text-anchor="end">{{ t }}</text>
        </template>
      </g>

      <path v-for="(v, i) in values" :key="`b${i}`" :d="bar(i, v)" class="bar" :class="{ dim: active !== null && active !== i }" />
      <path v-if="linePath" :d="linePath" class="avg" />
      <template v-if="lastLine">
        <circle :cx="lastLine.x" :cy="lastLine.y" r="4" class="dot" />
        <text :x="Math.min(lastLine.x, W - R - 2)" :y="lastLine.y - 9" text-anchor="end" class="lbl">{{ fmt(lastLine.v) }}</text>
      </template>
      <text v-if="highlight !== undefined && values[highlight]" :x="cx(highlight)" :y="y(values[highlight]!) - 5" text-anchor="middle" class="lbl">{{ fmt(values[highlight]!) }}</text>

      <text v-for="t in xTicks" :key="t.i" :x="cx(t.i)" :y="H - 6" :text-anchor="t.i === 0 ? 'start' : t.i === values.length - 1 ? 'end' : 'middle'" class="xt">{{ t.text }}</text>

      <!-- hit targets: coluna inteira, bem mais larga que a marca -->
      <rect
        v-for="(_, i) in values" :key="`h${i}`"
        :x="L + slot * i" :y="T" :width="slot" :height="plotH" class="hit" tabindex="0"
        :aria-label="`${titles[i]}: ${fmt(values[i]!)} ${valueName}`"
        @pointerenter="show(i)" @pointerleave="hide($event)" @focus="show(i)" @blur="hide()"
      />
    </svg>

    <div v-if="active !== null" class="tip" :style="{ left: `${tipX}px` }" role="status">
      <span class="tip-title">{{ titles[active] }}</span>
      <span class="tip-row"><i class="key-bar" /><strong class="num">{{ fmt(values[active]!) }}</strong> {{ valueName }}</span>
      <span v-if="line && line[active] != null" class="tip-row"><i class="key-line" /><strong class="num">{{ fmt(line[active]!) }}</strong> {{ lineName }}</span>
    </div>

    <details class="as-table">
      <summary>Ver como tabela</summary>
      <table>
        <thead><tr><th>Dia</th><th>{{ valueName }}</th><th v-if="line">{{ lineName }}</th></tr></thead>
        <tbody>
          <tr v-for="(v, i) in values" :key="i"><td>{{ titles[i] }}</td><td class="num">{{ fmt(v) }}</td><td v-if="line" class="num">{{ line[i] == null ? '' : fmt(line[i]!) }}</td></tr>
        </tbody>
      </table>
    </details>
  </div>
</template>
