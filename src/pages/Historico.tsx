import { useLiveQuery } from 'dexie-react-hooks'
import { db, ehTrabalho } from '../db'
import type { Navegar } from '../App'
import { agrupar, fmtData, fmtDuracao, fmtPeso, volume } from '../util'

const mesAno = (t: number) => new Date(t).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export default function Historico({ navegar }: { navegar: Navegar }) {
  const sessoes = useLiveQuery(() => db.sessoes.orderBy('inicio').reverse().filter((s) => !!s.fim).toArray())
  const series = useLiveQuery(() => db.series.toArray()) ?? []
  const porSessao = agrupar(series, (s) => s.sessaoId)
  const porMes = agrupar(sessoes ?? [], (s) => mesAno(s.inicio))

  return (
    <section>
      <header className="topo">
        <h1>Histórico</h1>
        {!!sessoes?.length && <span className="meta">{sessoes.length} treinos</span>}
      </header>
      {sessoes?.length === 0 && (
        <div className="vazio">
          <p>Nenhum treino finalizado ainda.</p>
          <p className="sub">Quando você finalizar um treino, ele aparece aqui com séries, cargas e volume.</p>
          <button className="sec" onClick={() => navegar({ t: 'hoje' })}>
            Ver o treino de hoje
          </button>
        </div>
      )}
      {[...porMes].map(([mes, doMes]) => (
        <div key={mes}>
          <h3 className="grupo">
            {mes} <span>· {doMes.length} {doMes.length === 1 ? 'treino' : 'treinos'}</span>
          </h3>
          {doMes.map((s) => {
            const ss = porSessao.get(s.id) ?? []
            return (
              <button key={s.id} className="card item" onClick={() => navegar({ t: 'sessaoDetalhe', id: s.id })}>
                <h2>{s.nome}</h2>
                <p className="sub">
                  {fmtData(s.inicio)} · {fmtDuracao(s.fim! - s.inicio)} · {ss.filter(ehTrabalho).length} séries ·{' '}
                  {fmtPeso(volume(ss))}
                </p>
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}
