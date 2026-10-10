import { db, type TreinoItem } from './db'

/*
 * Importa treinos colados como JSON (ex: gerados pelo avaliador no Claude).
 * Formato: um treino, uma lista de treinos ou { "treinos": [...] }:
 *   { "nome": "Sex · Pernas B (posterior)", "dias": [5],
 *     "itens": [{ "exercicio": "Stiff", "grupo": "Pernas", "series": 3, "reps": "6-8",
 *                 "descanso": 180, "aquecimento": "...", "nota": "..." }] }
 * "biset": true num item faz par com o item seguinte.
 * Exercícios são encontrados pelo nome (sem diferenciar maiúsculas/acentos) e criados se faltarem.
 */

export interface ItemImportado {
  exercicio: string
  grupo?: string
  series: number
  reps: string
  descanso?: number
  aquecimento?: string
  nota?: string
  biset?: boolean
}

export interface TreinoImportado {
  nome: string
  dias?: number[]
  itens: ItemImportado[]
}

const chave = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Extrai e valida os treinos de um texto colado (aceita texto em volta e ```json). */
export function lerTreinos(colado: string): TreinoImportado[] {
  const ini = colado.search(/[[{]/)
  const fim = Math.max(colado.lastIndexOf('}'), colado.lastIndexOf(']'))
  if (ini < 0 || fim < ini) throw new Error('Não encontrei um JSON no texto colado.')

  let dados: unknown
  try {
    dados = JSON.parse(colado.slice(ini, fim + 1))
  } catch {
    throw new Error('JSON inválido. Copie o bloco inteiro, do primeiro { ao último }.')
  }

  const d = dados as Record<string, unknown>
  const lista: unknown[] = Array.isArray(dados) ? dados : Array.isArray(d.treinos) ? d.treinos : [dados]

  return lista.map((bruto, i) => {
    const t = bruto as Record<string, unknown>
    const nome = texto(t?.nome)
    if (!nome || !Array.isArray(t.itens) || !t.itens.length) {
      throw new Error(`Treino ${i + 1}: precisa de "nome" e de "itens".`)
    }
    const dias = Array.isArray(t.dias)
      ? t.dias.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6)
      : undefined

    const itens = t.itens.map((brutoItem, j) => {
      const it = brutoItem as Record<string, unknown>
      const exercicio = texto(it.exercicio) ?? texto(it.nome)
      if (!exercicio) throw new Error(`${nome}, item ${j + 1}: falta o nome do exercício.`)
      return {
        exercicio,
        grupo: texto(it.grupo),
        series: Math.max(0, Math.round(Number(it.series) || 0)),
        reps: it.reps === undefined ? '' : String(it.reps),
        descanso: Number(it.descanso) > 0 ? Math.round(Number(it.descanso)) : undefined,
        aquecimento: texto(it.aquecimento),
        nota: texto(it.nota),
        biset: it.biset === true || undefined,
      }
    })
    return { nome, dias, itens }
  })
}

/** Nomes dos treinos importados que já existem no app. */
export async function treinosExistentes(treinos: TreinoImportado[]): Promise<string[]> {
  const nomes = new Set((await db.treinos.toArray()).map((t) => chave(t.nome)))
  return treinos.filter((t) => nomes.has(chave(t.nome))).map((t) => t.nome)
}

/** Grava os treinos. Com `substituir`, treinos de mesmo nome são atualizados; senão, vira uma cópia. */
export async function salvarTreinos(treinos: TreinoImportado[], substituir: boolean) {
  return db.transaction('rw', db.exercicios, db.treinos, async () => {
    const exercicios = new Map((await db.exercicios.toArray()).map((e) => [chave(e.nome), e.id]))
    const existentes = await db.treinos.toArray()
    let criados = 0
    let atualizados = 0

    for (const t of treinos) {
      const itens: TreinoItem[] = []
      for (const { exercicio, grupo, ...resto } of t.itens) {
        let id = exercicios.get(chave(exercicio))
        if (!id) {
          id = await db.exercicios.add({ nome: exercicio, grupo: grupo ?? 'Outros' })
          exercicios.set(chave(exercicio), id)
        }
        // O mesmo exercício duas vezes no treino confundiria o registro das séries.
        if (!itens.some((i) => i.exercicioId === id)) itens.push({ exercicioId: id, ...resto })
      }
      if (itens.length) itens[itens.length - 1].biset = undefined // bi-set precisa de um próximo

      const atual = existentes.find((e) => chave(e.nome) === chave(t.nome))
      if (atual && substituir) {
        await db.treinos.update(atual.id, { itens, dias: t.dias ?? atual.dias })
        atualizados++
      } else {
        await db.treinos.add({ nome: atual ? `${t.nome} (importado)` : t.nome, dias: t.dias, itens })
        criados++
      }
    }
    return { criados, atualizados }
  })
}
