import Dexie, { type EntityTable } from 'dexie'

export interface Exercicio {
  id: number
  nome: string
  grupo: string
}

export interface TreinoItem {
  exercicioId: number
  series: number
  reps: string // texto livre: "10", "8-12", "até a falha"
  descanso?: number // segundos entre séries de trabalho
  aquecimento?: string
  nota?: string
  biset?: boolean // faz par com o próximo item: uma série de cada, descanso só depois do par
  substituiu?: number // só em sessões: exercício planejado que foi trocado por este (ex: aparelho ocupado)
}

export interface Treino {
  id: number
  nome: string
  itens: TreinoItem[]
  dias?: number[] // 0 = domingo … 6 = sábado
  de?: string // AAAA-MM-DD: só entra na agenda (Hoje) a partir desta data
  ate?: string // AAAA-MM-DD: sai da agenda depois desta data
}

export interface Sessao {
  id: number
  treinoId?: number
  nome: string
  inicio: number
  fim?: number
  itens: TreinoItem[] // cópia do treino no momento em que começou
  retroativo?: boolean // registrado depois, com a data de quando foi feito
}

export interface Serie {
  id: number
  sessaoId: number
  exercicioId: number
  reps: number
  peso: number
  feitoEm: number
  tipo?: 'aquec' // séries de aquecimento/feeder não contam em volume, recordes nem metas
}

export const ehTrabalho = (s: Serie) => s.tipo !== 'aquec'

/** O treino está na agenda na data `iso` (AAAA-MM-DD)? */
export const vigente = (t: Treino, iso: string) => (!t.de || t.de <= iso) && (!t.ate || t.ate >= iso)

/** Índices dos itens agrupados na ordem do treino: [i, i+1] para um bi-set, [i] para o resto. */
export function grupos(itens: TreinoItem[]): number[][] {
  const gs: number[][] = []
  for (let i = 0; i < itens.length; i++) {
    if (itens[i].biset && i + 1 < itens.length) gs.push([i, ++i])
    else gs.push([i])
  }
  return gs
}

/** Tira o item `k`; se ele fechava um bi-set, o parceiro volta a ser um exercício comum. */
export function removerItem(itens: TreinoItem[], k: number): TreinoItem[] {
  const parceiro = grupos(itens).find((g) => g.length === 2 && g[1] === k)?.[0]
  return itens.flatMap((x, j) => (j === k ? [] : j === parceiro ? [{ ...x, biset: undefined }] : [x]))
}

export const db = new Dexie('academia') as Dexie & {
  exercicios: EntityTable<Exercicio, 'id'>
  treinos: EntityTable<Treino, 'id'>
  sessoes: EntityTable<Sessao, 'id'>
  series: EntityTable<Serie, 'id'>
}

db.version(1).stores({
  exercicios: '++id, nome, grupo',
  treinos: '++id, nome',
  sessoes: '++id, inicio, treinoId',
  series: '++id, sessaoId, exercicioId',
})
db.version(2).stores({ diario: 'data' })
db.version(3).stores({ diario: null }) // checklist de hábitos removido

const PADRAO: [string, string[]][] = [
  ['Peito', ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Crossover']],
  ['Costas', ['Puxada frontal', 'Remada curvada', 'Remada baixa', 'Barra fixa']],
  ['Pernas', ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Stiff', 'Panturrilha em pé']],
  ['Ombros', ['Desenvolvimento', 'Elevação lateral', 'Elevação frontal']],
  ['Bíceps', ['Rosca direta', 'Rosca alternada', 'Rosca martelo']],
  ['Tríceps', ['Tríceps pulley', 'Tríceps testa', 'Tríceps francês']],
  ['Core', ['Abdominal', 'Prancha']],
]

db.on('populate', (tx) => {
  tx.table('exercicios').bulkAdd(PADRAO.flatMap(([grupo, nomes]) => nomes.map((nome) => ({ nome, grupo }))))
})

export function buscarSessaoAtiva() {
  return db.sessoes.filter((s) => !s.fim).first()
}

/** Começa um treino agora ou, com `inicio`, registra um treino já feito naquela data. */
export async function iniciarSessao(treino?: Treino, inicio?: number): Promise<number> {
  return db.sessoes.add({
    treinoId: treino?.id,
    nome: treino?.nome ?? 'Treino livre',
    inicio: inicio ?? Date.now(),
    itens: treino ? treino.itens.map((i) => ({ ...i })) : [],
    ...(inicio !== undefined ? { retroativo: true } : {}),
  })
}

/** Volta um treino finalizado para edição. */
export async function reabrirSessao(id: number) {
  await db.sessoes.update(id, { fim: undefined, retroativo: true })
}

/** Séries da sessão mais recente (fora a atual e antes de `antesDe`) em que o exercício foi feito. */
export async function ultimaVez(exercicioId: number, excetoSessaoId?: number, antesDe = Infinity): Promise<Serie[]> {
  const outras = (await db.series.where('exercicioId').equals(exercicioId).toArray()).filter(
    (s) => s.sessaoId !== excetoSessaoId && ehTrabalho(s) && s.feitoEm < antesDe,
  )
  if (!outras.length) return []
  const recente = outras.reduce((a, b) => (b.feitoEm > a.feitoEm ? b : a))
  return outras.filter((s) => s.sessaoId === recente.sessaoId).sort((a, b) => a.feitoEm - b.feitoEm)
}

export async function excluirSessao(id: number) {
  await db.transaction('rw', db.sessoes, db.series, async () => {
    await db.series.where('sessaoId').equals(id).delete()
    await db.sessoes.delete(id)
  })
}

export async function exportarDados(): Promise<string> {
  return JSON.stringify({
    app: 'academia',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    exercicios: await db.exercicios.toArray(),
    treinos: await db.treinos.toArray(),
    sessoes: await db.sessoes.toArray(),
    series: await db.series.toArray(),
  })
}

export async function importarDados(json: string) {
  const d = JSON.parse(json)
  if (d?.app !== 'academia' || !['exercicios', 'treinos', 'sessoes', 'series'].every((k) => Array.isArray(d[k]))) {
    throw new Error('Arquivo de backup inválido')
  }
  await db.transaction('rw', [db.exercicios, db.treinos, db.sessoes, db.series], async () => {
    await Promise.all([db.exercicios.clear(), db.treinos.clear(), db.sessoes.clear(), db.series.clear()])
    await db.exercicios.bulkAdd(d.exercicios)
    await db.treinos.bulkAdd(d.treinos)
    await db.sessoes.bulkAdd(d.sessoes)
    await db.series.bulkAdd(d.series)
  })
}
