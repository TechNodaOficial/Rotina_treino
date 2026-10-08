import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Navegar } from '../App'
import { agrupar, fmtData, fmtDuracao, fmtPeso, volume } from '../util'

export default function Historico({ navegar }: { navegar: Navegar }) {
  const sessoes = useLiveQuery(() => db.sessoes.orderBy('inicio').reverse().filter((s) => !!s.fim).toArray())
  const series = useLiveQuery(() => db.series.toArray()) ?? []
  const porSessao = agrupar(series, (s) => s.sessaoId)

  return (
    <section>
      <header className="topo">
        <h1>Histórico</h1>
      </header>
      {sessoes?.length === 0 && <p className="vazio">Nenhum treino finalizado ainda.</p>}
      {sessoes?.map((s) => {
        const ss = porSessao.get(s.id) ?? []
        return (
          <button key={s.id} className="card item" onClick={() => navegar({ t: 'sessaoDetalhe', id: s.id })}>
            <h2>{s.nome}</h2>
            <p className="sub">
              {fmtData(s.inicio)} · {fmtDuracao(s.fim! - s.inicio)} · {ss.length} séries · {fmtPeso(volume(ss))}
            </p>
          </button>
        )
      })}
    </section>
  )
}
