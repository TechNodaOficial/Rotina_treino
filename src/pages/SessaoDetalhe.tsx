import { useLiveQuery } from 'dexie-react-hooks'
import { buscarSessaoAtiva, db, ehTrabalho, excluirSessao, reabrirSessao } from '../db'
import type { Navegar } from '../App'
import { agrupar, fmtData, fmtDuracao, fmtPeso, fmtSerie, volume } from '../util'
import { avisar } from '../toast'

export default function SessaoDetalhe({ id, navegar }: { id: number; navegar: Navegar }) {
  const sessao = useLiveQuery(() => db.sessoes.get(id), [id])
  const series = useLiveQuery(() => db.series.where('sessaoId').equals(id).sortBy('feitoEm'), [id]) ?? []
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  const ativa = useLiveQuery(buscarSessaoAtiva)

  if (!sessao) return null
  const porEx = agrupar(series, (s) => s.exercicioId)

  async function excluir() {
    if (confirm('Excluir este treino do histórico?')) {
      await excluirSessao(id)
      navegar({ t: 'historico' }, { substituir: true })
      avisar('Treino excluído do histórico.')
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
        <div><strong>{series.filter(ehTrabalho).length}</strong><span>séries</span></div>
        <div><strong>{porEx.size}</strong><span>exercícios</span></div>
        <div><strong>{fmtPeso(volume(series))}</strong><span>volume</span></div>
      </div>

      {porEx.size === 0 && <p className="vazio">Nenhuma série registrada neste treino.</p>}
      {[...porEx].map(([exId, ss]) => (
        <button key={exId} className="card item" onClick={() => navegar({ t: 'exercicio', id: exId })}>
          <h2>{nomeEx.get(exId) ?? '?'}</h2>
          <p className="sub">{ss.filter(ehTrabalho).map(fmtSerie).join(', ')}</p>
        </button>
      ))}

      {sessao.fim && (
        <button
          className="sec largo"
          disabled={!!ativa}
          onClick={async () => {
            await reabrirSessao(id)
            navegar({ t: 'sessao', id }, { substituir: true })
          }}
        >
          Editar séries
        </button>
      )}
      {sessao.fim && ativa && <p className="sub centro">Finalize o treino em andamento para editar este.</p>}
      <button className="perigo largo" onClick={excluir}>
        Excluir treino
      </button>
    </section>
  )
}
