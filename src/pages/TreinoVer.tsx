import { useLiveQuery } from 'dexie-react-hooks'
import { db, grupos, iniciarSessao, ultimaVez, type TreinoItem } from '../db'
import type { Navegar } from '../App'
import { DIAS, fmtDescanso, fmtSerie, preferencias } from '../util'

/** Prévia de um treino, sem iniciar sessão. */
export default function TreinoVer({ id, navegar, ativaId }: { id: number; navegar: Navegar; ativaId?: number }) {
  const treino = useLiveQuery(() => db.treinos.get(id), [id])
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  if (!treino) return null
  const totalSeries = treino.itens.reduce((n, i) => n + i.series, 0)
  const pares = grupos(treino.itens).filter((g) => g.length === 2)
  const parceiro = (i: number) => {
    const g = pares.find((p) => p.includes(i))
    return g && (nomeEx.get(treino.itens[g[0] === i ? g[1] : g[0]].exercicioId) ?? '?')
  }

  async function iniciar() {
    navegar({ t: 'sessao', id: ativaId ?? (await iniciarSessao(treino)) })
  }

  return (
    <section>
      <header className="topo">
        <div>
          <h1>{treino.nome}</h1>
          <p className="sub">
            {treino.dias?.length ? `${treino.dias.map((d) => DIAS[d]).join(' · ')} · ` : ''}
            {treino.itens.length} exercícios · {totalSeries} séries de trabalho
          </p>
        </div>
      </header>

      {treino.itens.map((item, i) => (
        <ItemPrevia key={`${item.exercicioId}-${i}`} ordem={i + 1} item={item} nome={nomeEx.get(item.exercicioId) ?? '?'} bisetCom={parceiro(i)} />
      ))}

      <button className="largo" onClick={iniciar}>
        {ativaId ? 'Continuar treino em andamento' : 'Iniciar este treino'}
      </button>
      <button className="sec largo" onClick={() => navegar({ t: 'treino', id })}>
        Editar
      </button>
    </section>
  )
}

function ItemPrevia({ ordem, item, nome, bisetCom }: { ordem: number; item: TreinoItem; nome: string; bisetCom?: string }) {
  const anterior = useLiveQuery(() => ultimaVez(item.exercicioId), [item.exercicioId])

  return (
    <article className="card">
      <div className="linha-titulo">
        <span className="ordem">{ordem}</span>
        <h2>{nome}</h2>
        {item.series > 0 && <span className="meta">{item.series} × {item.reps || '?'}</span>}
      </div>
      <p className="sub">
        {bisetCom ? `Bi-set com ${bisetCom} · ` : ''}Descanso {fmtDescanso(item.descanso ?? preferencias.descanso)}
      </p>
      {(item.aquecimento || item.nota) && (
        <div className="detalhes">
          {item.aquecimento && <p><strong>Aquecimento:</strong> {item.aquecimento}</p>}
          {item.nota && <p><strong>Execução:</strong> {item.nota}</p>}
        </div>
      )}
      {anterior && anterior.length > 0 && <p className="sub">Última vez: {anterior.map(fmtSerie).join(', ')}</p>}
    </article>
  )
}
