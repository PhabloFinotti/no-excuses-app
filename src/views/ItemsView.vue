<script setup lang="ts">
import { computed, ref } from 'vue'
import { shortDate, weekdaysLabel } from '../lib/format'
import Icon from '../components/Icon.vue'
import ItemForm from '../components/ItemForm.vue'
import { CATEGORIES, categoryLabel, categoryOf } from '../lib/categories'
import { act, notify } from '../lib/toast'
import { addQuick, archiveItem, items, unarchiveItem } from '../lib/store'
import type { ItemRow } from '../../supabase/functions/_shared/pending'

const editing = ref<ItemRow | undefined>()
const open = ref(false)
const error = ref('')
const quick = ref('')
const adding = ref(false)
const filter = ref('')
// Só as categorias que têm item, para o filtro não listar opções vazias.
const present = computed(() => CATEGORIES.filter((c) => items.value.some((i) => categoryOf(i) === c.key)))
const shown = computed(() => (filter.value ? items.value.filter((i) => categoryOf(i) === filter.value) : items.value))

function edit(item?: ItemRow) {
  editing.value = item
  open.value = true
}
async function quickAdd(kind: 'habit' | 'task') {
  if (adding.value) return // Enter repetido ou toque duplo não cria o item duas vezes
  adding.value = true
  error.value = ''
  try {
    await addQuick(kind, quick.value)
    quick.value = ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    adding.value = false
  }
}
function archive(item: ItemRow) {
  act(() => archiveItem(item.id))
  notify(`${item.name} arquivado.`, { undo: () => unarchiveItem(item.id) })
}
</script>

<template>
  <h1>Itens</h1>

  <div v-if="open" class="plain">
    <ItemForm :key="editing?.id ?? 'new'" :item="editing" @saved="open = false" @cancel="open = false" />
  </div>
  <template v-else>
    <input v-model="quick" placeholder="Adicionar rápido: Ler por 45 minutos" @keydown.enter.prevent="quickAdd('task')" />
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
      <button class="icon-btn" aria-label="Arquivar" title="Arquivar" @click="archive(item)"><Icon name="archive" /></button>
    </div>
  </div>
  </div>
  <p v-if="!items.length" class="empty">Nenhum item ainda. Adicione o primeiro acima.</p>
</template>
