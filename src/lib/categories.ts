// Categorias fixas com descoberta automática pelo nome. Palavra terminada em * casa pelo prefixo ("estud*" pega estudar,
// estudo, estudando); sem *, só a palavra inteira (evita "ler" casar com "ler" dentro de "calendário"). Sem acento e sem caixa.
export interface Category { key: string; label: string; keywords: string[] }

export const CATEGORIES: Category[] = [
  { key: 'study', label: 'Estudo', keywords: ['estud*', 'aprend*', 'curso*', 'aula*', 'faculdade', 'prova*', 'revisar', 'revisao', 'flashcard*', 'anki', 'leetcode', 'dsa', 'algoritmo*', 'programar', 'programacao', 'codar', 'kubernetes', 'k8s', 'docker', 'ingles', 'espanhol', 'idioma*', 'duolingo', 'certificacao', 'study', 'course'] },
  { key: 'reading', label: 'Leitura', keywords: ['ler', 'lendo', 'leitura*', 'livro*', 'ebook*', 'kindle', 'artigo*', 'paginas', 'capitulo*', 'read', 'reading', 'book'] },
  { key: 'exercise', label: 'Exercício', keywords: ['treino*', 'treinar', 'academia', 'correr', 'corrida', 'caminhar', 'caminhada', 'musculacao', 'yoga', 'alongar', 'alongamento', 'exercicio*', 'pedalar', 'bike', 'natacao', 'nadar', 'flexao', 'flexoes', 'abdominal*', 'pilates', 'futebol', 'esporte*', 'workout', 'gym', 'run'] },
  { key: 'health', label: 'Saúde', keywords: ['remedio*', 'medicamento*', 'vitamina*', 'suplemento*', 'agua', 'beber', 'medico', 'dentista', 'consulta', 'exame*', 'dieta', 'fio', 'escovar', 'skincare', 'protetor', 'sono', 'dormir'] },
  { key: 'mind', label: 'Mente', keywords: ['meditar', 'meditacao', 'respirar', 'respiracao', 'diario', 'journaling', 'terapia', 'gratidao', 'orar', 'oracao', 'reflexao', 'mindfulness', 'meditate'] },
  { key: 'work', label: 'Trabalho', keywords: ['trabalho', 'trabalhar', 'reuniao', 'reunioes', 'email*', 'relatorio*', 'projeto*', 'cliente*', 'standup', 'deploy', 'sprint', 'chamado*'] },
  { key: 'home', label: 'Casa', keywords: ['limpar', 'limpeza', 'lavar', 'louca*', 'roupa*', 'arrumar', 'cozinhar', 'mercado', 'compras', 'varrer', 'organizar', 'lixo', 'plantas', 'regar', 'faxina'] },
  { key: 'finance', label: 'Finanças', keywords: ['pagar', 'conta*', 'boleto*', 'orcamento*', 'investir', 'investimento*', 'financas', 'fatura*', 'imposto*', 'planilha'] },
  { key: 'social', label: 'Social', keywords: ['ligar', 'ligacao', 'familia', 'amigo*', 'amiga*', 'mae', 'pai', 'visitar', 'encontro', 'conversar', 'mensagem'] },
  { key: 'creative', label: 'Criação', keywords: ['escrever', 'desenhar', 'pintar', 'violao', 'piano', 'tocar', 'musica*', 'fotografia', 'cantar', 'compor', 'blog', 'video*', 'criar'] },
]

// null = automática (detecta pelo nome); NO_CATEGORY = o usuário não quer categoria neste item.
export const NO_CATEGORY = 'none'

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const matches = (token: string, keyword: string) => (keyword.endsWith('*') ? token.startsWith(keyword.slice(0, -1)) : token === keyword)

// Categoria com mais palavras do nome; empate fica com a primeira do catálogo ("Estudar Kubernetes" -> Estudo).
export function detectCategory(name: string): string | null {
  const tokens = normalize(name).split(/[^a-z0-9]+/).filter(Boolean)
  let best: { key: string; score: number } | null = null
  for (const c of CATEGORIES) {
    const score = tokens.filter((t) => c.keywords.some((k) => matches(t, k))).length
    if (score > (best?.score ?? 0)) best = { key: c.key, score }
  }
  return best?.key ?? null
}

export const categoryLabel = (key: string | null | undefined) => CATEGORIES.find((c) => c.key === key)?.label

// Categoria efetiva: a escolhida à mão ou, sem escolha, a descoberta pelo nome (acompanha renomeações).
export function categoryOf(item: { name: string; category?: string | null }): string | null {
  if (item.category === NO_CATEGORY) return null
  if (item.category && CATEGORIES.some((c) => c.key === item.category)) return item.category
  return detectCategory(item.name)
}
