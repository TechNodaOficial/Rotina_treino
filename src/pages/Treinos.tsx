import { useLiveQuery } from 'dexie-react-hooks'
import { db, iniciarSessao, type Treino } from '../db'
import type { Navegar } from '../App'

export default function Treinos({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  const treinos = useLiveQuery(() => db.treinos.orderBy('nome').toArray())
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nome = new Map(exercicios.map((e) => [e.id, e.nome]))

  async function iniciar(treino?: Treino) {
    if (ativaId) return navegar({ t: 'sessao', id: ativaId })
    navegar({ t: 'sessao', id: await iniciarSessao(treino) })
  }

  return (
    <section>
      <header className="topo">
        <h1>Treinos</h1>
        <button className="sec" onClick={() => navegar({ t: 'treino' })}>
          + Novo
        </button>
      </header>

      {treinos?.length === 0 && (
        <p className="vazio">
          Crie seu primeiro treino (ex: "A — Peito e Tríceps") com os exercícios que você costuma fazer.
        </p>
      )}

      {treinos?.map((t) => (
        <article key={t.id} className="card">
          <h2>{t.nome}</h2>
          <p className="sub">{t.itens.map((i) => nome.get(i.exercicioId)).filter(Boolean).join(' · ') || 'Sem exercícios'}</p>
          <div className="acoes">
            <button onClick={() => iniciar(t)} disabled={!!ativaId}>
              Iniciar
            </button>
            <button className="sec" onClick={() => navegar({ t: 'treino', id: t.id })}>
              Editar
            </button>
          </div>
        </article>
      ))}

      <button className="sec largo" onClick={() => iniciar()} disabled={!!ativaId}>
        Começar treino livre
      </button>
      {ativaId && <p className="sub centro">Finalize o treino em andamento para começar outro.</p>}
    </section>
  )
}
