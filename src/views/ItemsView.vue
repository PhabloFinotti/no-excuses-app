<script setup lang="ts">
import { computed, ref } from 'vue'
import { addedText, shortDate, weekdaysLabel } from '../lib/format'
import Icon from '../components/Icon.vue'
import ItemTile from '../components/ItemTile.vue'
import ItemWizard from '../components/ItemWizard.vue'
import { CATEGORIES, categoryOf } from '../lib/categories'
import { act, notify } from '../lib/toast'
import { describeQuickAdd } from '../lib/quickAdd'
import { addQuick, archiveItem, archivedItems, completionOf, creatingItem, items, today, unarchiveItem } from '../lib/store'
import { isRepeat, type ItemRow } from '../../supabase/functions/_shared/pending'
import { formatMinutes as hm } from '../../supabase/functions/_shared/time'

const editing = ref<ItemRow | undefined>()
const error = ref('')
const quick = ref('')
const adding = ref(false)
const filter = ref('')
// Só as categorias que têm item, para o filtro não listar opções vazias.
const present = computed(() => CATEGORIES.filter((c) => items.value.some((i) => categoryOf(i) === c.key)))
const matchesFilter = (i: ItemRow) => !filter.value || categoryOf(i) === filter.value
// Tarefa concluída sai da lista principal (senão ela só cresce); fica numa seção recolhida, de onde pode ser arquivada.
const isDoneTask = (i: ItemRow) => i.kind === 'task' && !!completionOf(i)?.done
const shown = computed(() => items.value.filter((i) => matchesFilter(i) && !isDoneTask(i)))
const doneTasks = computed(() => items.value.filter((i) => matchesFilter(i) && isDoneTask(i)))
const archived = computed(() => archivedItems.value.filter(matchesFilter))
const preview = computed(() => describeQuickAdd(quick.value))
// "5x, a cada 2h, a partir de 09:30" ou "30 min"
const amount = (i: ItemRow) =>
  isRepeat(i) ? `${i.times_per_day}x, a cada ${i.interval_min! % 60 ? hm(i.interval_min!) : `${i.interval_min! / 60}h`}${i.repeat_from ? `, a partir de ${i.repeat_from.slice(0, 5)}` : ''}` : `${i.duration_min} min`
const ending = (i: ItemRow) => (!i.ends_on ? '' : i.ends_on < today.value ? `terminou em ${shortDate(i.ends_on)}` : `até ${shortDate(i.ends_on)}`)

const edit = (item: ItemRow) => (editing.value = item)
async function quickAdd(kind: 'habit' | 'task') {
  if (adding.value) return // Enter repetido ou toque duplo não cria o item duas vezes
  adding.value = true
  error.value = ''
  try {
    const added = await addQuick(kind, quick.value)
    quick.value = ''
    notify(addedText(added))
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    adding.value = false
  }
}
function archive(item: ItemRow) {
  act(() => archiveItem(item.id))
  notify(`${item.name} arquivado. Ele fica em “Arquivados”, no fim desta lista.`, { undo: () => unarchiveItem(item.id) })
}
function restore(item: ItemRow) {
  act(() => unarchiveItem(item.id))
  notify(`${item.name} restaurado.`)
}
</script>

<template>
  <ItemWizard v-if="editing" :key="editing.id" :item="editing" @close="editing = undefined" />

  <h1>Itens</h1>
  <button class="new-btn" @click="creatingItem = true"><Icon name="plus" :size="22" />Novo item</button>

  <div class="quick">
    <input v-model="quick" placeholder="Rápido: Ler por 45 minutos" aria-label="Adicionar rápido: nome e duração" aria-describedby="quick-preview" @keydown.enter.prevent="quickAdd('task')" />
    <button class="ghost" :disabled="adding || !quick.trim()" @click="quickAdd('task')">Hoje</button>
  </div>
  <p v-if="preview" id="quick-preview" class="meta" :class="{ error: !preview.ok }" style="margin-top: 6px">
    {{ preview.ok ? `Vai criar uma tarefa de hoje → ${preview.text}` : preview.text }}
    <button v-if="preview.ok" class="text-btn" :disabled="adding" @click="quickAdd('habit')">Criar como hábito diário</button>
  </p>
  <p v-if="error" class="error">{{ error }}</p>

  <h2 class="section">Cadastrados <span class="count num">{{ shown.length }}</span></h2>
  <div v-if="present.length" class="filter-chips" role="group" aria-label="Filtrar por categoria">
    <button class="chip-btn" :class="{ on: !filter }" :aria-pressed="!filter" @click="filter = ''">Todos</button>
    <button v-for="c in present" :key="c.key" class="chip-btn" :class="{ on: filter === c.key }" :aria-pressed="filter === c.key" @click="filter = filter === c.key ? '' : c.key">{{ c.emoji }} {{ c.label }}</button>
  </div>
  <div class="list-grid">
    <div v-for="item in shown" :key="item.id" class="plain item-row">
      <ItemTile :item="item" />
      <button class="link grow" :aria-label="`Editar ${item.name}`" @click="edit(item)">
        <strong>{{ item.name }}</strong>
        <span class="meta" style="display: block">
          {{ item.kind === 'task' ? `Tarefa · ${shortDate(item.due_date!)}` : `Hábito · ${weekdaysLabel(item.weekdays)}` }} · {{ amount(item) }}<template v-if="item.fixed_time"> · às {{ item.fixed_time.slice(0, 5) }}</template>
          <template v-if="ending(item)"> · {{ ending(item) }}</template>
        </span>
      </button>
      <div class="tools">
        <button class="icon-btn" :aria-label="`Arquivar ${item.name} (dá para restaurar)`" title="Arquivar (dá para restaurar)" @click="archive(item)"><Icon name="archive" /></button>
      </div>
    </div>
  </div>
  <p v-if="!items.length" class="empty">Nenhum item ainda. Toque em “Novo item” para criar o primeiro.</p>

  <details v-if="doneTasks.length" class="fold">
    <summary>Tarefas concluídas ({{ doneTasks.length }})</summary>
    <div class="list-grid">
      <div v-for="item in doneTasks" :key="item.id" class="plain item-row">
        <ItemTile :item="item" size="sm" />
        <div class="grow"><strong>{{ item.name }}</strong><div class="meta">{{ item.duration_min }} min · concluída</div></div>
        <button class="ghost" @click="archive(item)">Arquivar</button>
      </div>
    </div>
  </details>

  <details v-if="archived.length" class="fold">
    <summary>Arquivados ({{ archived.length }})</summary>
    <p class="meta">Itens arquivados não aparecem em Hoje, mas o que você já fez neles continua no histórico.</p>
    <div class="list-grid" style="margin-top: 10px">
      <div v-for="item in archived" :key="item.id" class="plain item-row">
        <ItemTile :item="item" size="sm" />
        <div class="grow"><strong>{{ item.name }}</strong><div class="meta">{{ item.kind === 'task' ? 'Tarefa' : 'Hábito' }} · {{ amount(item) }}</div></div>
        <button class="ghost" @click="restore(item)">Restaurar</button>
      </div>
    </div>
  </details>
</template>
