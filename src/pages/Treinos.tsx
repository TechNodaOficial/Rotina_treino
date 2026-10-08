import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, iniciarSessao, type Treino } from '../db'
import { carregarPrograma } from '../programa'
import { DIAS } from '../util'
import type { Navegar } from '../App'

export default function Treinos({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  // Ordena pelo primeiro dia da semana (segunda primeiro, domingo por último).
  const ordem = (t: Treino) => (t.dias?.length ? Math.min(...t.dias.map((d) => (d + 6) % 7)) : 7)
  const treinos = useLiveQuery(() =>
    db.treinos.toArray().then((ts) => ts.sort((a, b) => ordem(a) - ordem(b) || a.nome.localeCompare(b.nome))),
  )
  const [carregando, setCarregando] = useState(false)
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
        <article className="card">
          <h2>Programa de hipertrofia</h2>
          <p className="sub">
            Seg pernas (quadríceps) · Ter push · Qua pull · Sex pernas (posterior) · Sáb upper. Já vem com séries,
            repetições, descanso, aquecimento e dicas de execução.
          </p>
          <button
            className="largo"
            disabled={carregando}
            onClick={async () => {
              setCarregando(true)
              await carregarPrograma()
              setCarregando(false)
            }}
          >
            Carregar programa
          </button>
        </article>
      )}

      <details className="card guia">
        <summary>Como fazer as séries</summary>
        <ol>
          <li><strong>Aquecimento geral:</strong> 5 min de bike/elíptico leve + mobilidade das articulações do dia.</li>
          <li><strong>Rampa</strong> (1º composto do dia): 50%×10 → 70%×5 → 85-90%×2-3. A última é o feeder pesado (PAP), que prepara o sistema nervoso para a carga. Descanse 2-3 min.</li>
          <li><strong>Feeder</strong> (exercícios seguintes, se o músculo ainda não trabalhou): 1×6-8 leve. Se já está quente, vá direto.</li>
          <li><strong>Séries de trabalho:</strong> as que contam. Termine com 1-2 repetições na reserva (RIR). Na última série de isolados, pode ir à falha.</li>
          <li><strong>Progressão dupla:</strong> quando fizer o topo da faixa de reps em todas as séries, suba 2,5-5% na carga.</li>
          <li><strong>Descanso:</strong> 2-3 min nos compostos pesados, 60-90 s nos isolados. O timer usa o tempo de cada exercício.</li>
          <li>Marque o aquecimento com "Série de aquecimento". Ele não conta no volume nem nos recordes.</li>
        </ol>
      </details>

      {treinos?.map((t) => (
        <article key={t.id} className="card">
          <h2>{t.nome}</h2>
          {t.dias?.length ? <p className="meta">{t.dias.map((d) => DIAS[d]).join(' · ')}</p> : null}
          <p className="sub">{t.itens.map((i) => nome.get(i.exercicioId)).filter(Boolean).join(' · ') || 'Sem exercícios'}</p>
          <div className="acoes">
            <button onClick={() => iniciar(t)} disabled={!!ativaId}>
              Iniciar
            </button>
            <button className="sec" onClick={() => navegar({ t: 'treinoVer', id: t.id })}>
              Ver
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
