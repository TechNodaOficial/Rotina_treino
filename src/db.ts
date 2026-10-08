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
}

export interface Treino {
  id: number
  nome: string
  itens: TreinoItem[]
}

export interface Sessao {
  id: number
  treinoId?: number
  nome: string
  inicio: number
  fim?: number
  itens: TreinoItem[] // cópia do treino no momento em que começou
}

export interface Serie {
  id: number
  sessaoId: number
  exercicioId: number
  reps: number
  peso: number
  feitoEm: number
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

export async function iniciarSessao(treino?: Treino): Promise<number> {
  return db.sessoes.add({
    treinoId: treino?.id,
    nome: treino?.nome ?? 'Treino livre',
    inicio: Date.now(),
    itens: treino ? treino.itens.map((i) => ({ ...i })) : [],
  } as Sessao)
}

/** Séries da sessão mais recente (fora a atual) em que o exercício foi feito. */
export async function ultimaVez(exercicioId: number, excetoSessaoId?: number): Promise<Serie[]> {
  const outras = (await db.series.where('exercicioId').equals(exercicioId).toArray()).filter(
    (s) => s.sessaoId !== excetoSessaoId,
  )
  if (!outras.length) return []
  const ultima = Math.max(...outras.map((s) => s.sessaoId))
  return outras.filter((s) => s.sessaoId === ultima).sort((a, b) => a.feitoEm - b.feitoEm)
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
