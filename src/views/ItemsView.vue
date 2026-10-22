<script setup lang="ts">
import { computed, ref } from 'vue'
import { addedText, shortDate, weekdaysLabel } from '../lib/format'
import Icon from '../components/Icon.vue'
import ItemForm from '../components/ItemForm.vue'
import { CATEGORIES, categoryLabel, categoryOf } from '../lib/categories'
import { act, notify } from '../lib/toast'
import { describeQuickAdd } from '../lib/quickAdd'
import { addQuick, archiveItem, archivedItems, completionOf, items, unarchiveItem } from '../lib/store'
import type { ItemRow } from '../../supabase/functions/_shared/pending'

const editing = ref<ItemRow | undefined>()
const open = ref(false)
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

function edit(item?: ItemRow) {
  editing.value = item
  open.value = true
}
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
  <h1>Itens</h1>

  <div v-if="open" class="plain">
    <ItemForm :key="editing?.id ?? 'new'" :item="editing" @saved="open = false" @cancel="open = false" />
  </div>
  <template v-else>
    <input v-model="quick" placeholder="Adicionar rápido: Ler por 45 minutos" aria-describedby="quick-preview" @keydown.enter.prevent="quickAdd('task')" />
    <p v-if="preview" id="quick-preview" class="meta" :class="{ error: !preview.ok }">{{ preview.ok ? `Vai criar → ${preview.text}` : preview.text }}</p>
    <div class="row" style="margin: 8px 0">
      <button class="ghost" :disabled="adding" @click="quickAdd('task')">+ Tarefa hoje</button>
      <button class="ghost" :disabled="adding" @click="quickAdd('habit')">+ Hábito diário</button>
      <button class="ghost" @click="edit()">Formulário completo</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </template>

  <h2 class="section">Cadastrados</h2>
  <select v-if="present.length" v-model="filter" aria-label="Filtrar por categoria" style="margin-bottom: 10px">
    <option value="">Todas as categorias</option>
    <option v-for="c in present" :key="c.key" :value="c.key">{{ c.label }}</option>
  </select>
  <div class="list-grid">
  <div v-for="item in shown" :key="item.id" class="plain item-row">
    <div class="grow">
      <strong>{{ item.name }}</strong>
      <div class="meta">
        {{ item.kind === 'task' ? `Tarefa · ${shortDate(item.due_date!)}` : `Hábito · ${weekdaysLabel(item.weekdays)}` }} · {{ item.duration_min }} min<template v-if="categoryOf(item)"> · {{ categoryLabel(categoryOf(item)) }}</template>
        <template v-if="item.fixed_time"> · {{ item.fixed_time.slice(0, 5) }}</template>
      </div>
    </div>
    <div class="tools">
      <button class="icon-btn" aria-label="Editar" title="Editar" @click="edit(item)"><Icon name="edit" /></button>
      <button class="icon-btn" aria-label="Arquivar: tira da lista, mas dá para restaurar" title="Arquivar (dá para restaurar)" @click="archive(item)"><Icon name="archive" /></button>
    </div>
  </div>
  </div>
  <p v-if="!items.length" class="empty">Nenhum item ainda. Adicione o primeiro acima.</p>

  <details v-if="doneTasks.length" class="fold">
    <summary>Tarefas concluídas ({{ doneTasks.length }})</summary>
    <div class="list-grid">
      <div v-for="item in doneTasks" :key="item.id" class="plain item-row">
        <div class="grow"><strong>{{ item.name }}</strong><div class="meta">{{ item.duration_min }} min · concluída</div></div>
        <div class="tools"><button class="ghost" @click="archive(item)"><Icon name="archive" :size="16" />Arquivar</button></div>
      </div>
    </div>
  </details>

  <details v-if="archived.length" class="fold">
    <summary>Arquivados ({{ archived.length }})</summary>
    <p class="meta">Itens arquivados não aparecem em Hoje, mas o que você já fez neles continua no histórico.</p>
    <div class="list-grid">
      <div v-for="item in archived" :key="item.id" class="plain item-row">
        <div class="grow"><strong>{{ item.name }}</strong><div class="meta">{{ item.kind === 'task' ? 'Tarefa' : 'Hábito' }} · {{ item.duration_min }} min</div></div>
        <div class="tools"><button class="ghost" @click="restore(item)"><Icon name="undo" :size="16" />Restaurar</button></div>
      </div>
    </div>
  </details>
</template>
