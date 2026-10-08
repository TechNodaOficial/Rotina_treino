import { useLiveQuery } from 'dexie-react-hooks'
import { db, excluirSessao } from '../db'
import type { Navegar } from '../App'
import { agrupar, fmtData, fmtDuracao, fmtPeso, fmtSerie, volume } from '../util'

export default function SessaoDetalhe({ id, navegar }: { id: number; navegar: Navegar }) {
  const sessao = useLiveQuery(() => db.sessoes.get(id), [id])
  const series = useLiveQuery(() => db.series.where('sessaoId').equals(id).sortBy('feitoEm'), [id]) ?? []
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  if (!sessao) return null
  const porEx = agrupar(series, (s) => s.exercicioId)

  async function excluir() {
    if (confirm('Excluir este treino do histórico?')) {
      await excluirSessao(id)
      navegar({ t: 'historico' }, { substituir: true })
    }
  }

  return (
    <section>
      <header className="topo">
        <div>
          <h1>{sessao.nome}</h1>
          <p className="sub">
            {fmtData(sessao.inicio)} · {sessao.fim ? fmtDuracao(sessao.fim - sessao.inicio) : 'em andamento'}
          </p>
        </div>
      </header>

      <div className="stats">
        <div><strong>{series.length}</strong><span>séries</span></div>
        <div><strong>{porEx.size}</strong><span>exercícios</span></div>
        <div><strong>{fmtPeso(volume(series))}</strong><span>volume</span></div>
      </div>

      {[...porEx].map(([exId, ss]) => (
        <button key={exId} className="card item" onClick={() => navegar({ t: 'exercicio', id: exId })}>
          <h2>{nomeEx.get(exId) ?? '?'}</h2>
          <p className="sub">{ss.map(fmtSerie).join(', ')}</p>
        </button>
      ))}

      <button className="perigo largo" onClick={excluir}>
        Excluir treino
      </button>
    </section>
  )
}
