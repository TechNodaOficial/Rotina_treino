import { db, ehTrabalho, grupos, ultimaVez } from './db'
import { fmtSerie, hojeISO } from './util'

/**
 * Resumo enxuto dos treinos finalizados entre `de` e `ate` (AAAA-MM-DD, inclusive), para mandar ao avaliador.
 * Usa nomes em vez de ids e só as séries de trabalho. Devolve null se não houver treino no período.
 */
export async function exportarAnalise(de: string, ate: string): Promise<string | null> {
  const inicio = new Date(`${de}T00:00`).getTime()
  const fim = new Date(`${ate}T23:59:59.999`).getTime()
  const sessoes = (await db.sessoes.where('inicio').between(inicio, fim, true, true).sortBy('inicio')).filter((s) => s.fim)
  if (!sessoes.length) return null

  const nome = new Map((await db.exercicios.toArray()).map((e) => [e.id, e.nome]))
  const treinos = []
  for (const s of sessoes) {
    const pares = grupos(s.itens).filter((g) => g.length === 2)
    const series = (await db.series.where('sessaoId').equals(s.id).sortBy('feitoEm')).filter(ehTrabalho)
    const exercicios = []
    for (const [k, item] of s.itens.entries()) {
      const par = pares.find((g) => g.includes(k))
      const anterior = await ultimaVez(item.exercicioId, s.id, s.inicio)
      exercicios.push({
        nome: nome.get(item.exercicioId) ?? '?',
        ...(item.substituiu !== undefined ? { noLugarDe: nome.get(item.substituiu) ?? '?' } : {}),
        ...(item.series ? { meta: `${item.series}×${item.reps || '?'}` } : {}),
        ...(par ? { bisetCom: nome.get(s.itens[par[0] === k ? par[1] : par[0]].exercicioId) ?? '?' } : {}),
        series: series.filter((x) => x.exercicioId === item.exercicioId).map(fmtSerie),
        ...(anterior.length ? { anterior: anterior.map(fmtSerie) } : {}),
      })
    }
    treinos.push({
      data: hojeISO(new Date(s.inicio)),
      treino: s.nome,
      // Em treinos registrados depois a duração não é real.
      ...(s.retroativo ? {} : { duracaoMin: Math.round((s.fim! - s.inicio) / 60000) }),
      exercicios,
    })
  }
  return JSON.stringify({ periodo: `${de} a ${ate}`, treinos })
}
