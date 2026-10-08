import { useLiveQuery } from 'dexie-react-hooks'
import { db, iniciarSessao, type Treino } from '../db'
import type { Navegar } from '../App'
import RegistrarPassado from '../components/RegistrarPassado'
import { DIAS } from '../util'

export default function Hoje({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  const agora = new Date()
  const dia = agora.getDay()
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()

  const treinos = useLiveQuery(() => db.treinos.toArray()) ?? []
  const feitosHoje = useLiveQuery(
    () => db.sessoes.where('inicio').aboveOrEqual(inicioDoDia).filter((s) => !!s.fim).toArray(),
    [inicioDoDia],
  )

  const doDia = treinos.filter((t) => t.dias?.includes(dia))
  const diaDeTreino = doDia.length > 0
  const proximo = [1, 2, 3, 4, 5, 6, 7]
    .map((k) => (dia + k) % 7)
    .map((d) => ({ dia: d, treino: treinos.find((t) => t.dias?.includes(d)) }))
    .find((p): p is { dia: number; treino: Treino } => !!p.treino)

  async function iniciar(t: Treino) {
    navegar({ t: 'sessao', id: ativaId ?? (await iniciarSessao(t)) })
  }

  const treinou = (feitosHoje?.length ?? 0) > 0

  return (
    <section>
      <header className="topo">
        <div>
          <h1>Hoje</h1>
          <p className="sub">{agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      {doDia.map((t) => (
        <article key={t.id} className={`card ${treinou ? 'concluido' : ''}`}>
          <div className="linha-titulo">
            <Check marcado={treinou} />
            <h2>{t.nome}</h2>
          </div>
          <p className="sub">{t.itens.length} exercícios · {t.itens.reduce((n, i) => n + i.series, 0)} séries de trabalho</p>
          <div className="acoes">
            {!treinou && (
              <button onClick={() => iniciar(t)}>{ativaId ? 'Continuar treino' : 'Iniciar treino'}</button>
            )}
            <button className="sec" onClick={() => navegar({ t: 'treinoVer', id: t.id })}>
              Ver treino
            </button>
          </div>
        </article>
      ))}
      {!diaDeTreino && (
        <article className="card">
          <h2>Dia de descanso</h2>
          <p className="sub">
            {treinos.length
              ? 'Nenhum treino programado para hoje.'
              : 'Carregue o programa na aba Treinos para ver o treino do dia aqui.'}
          </p>
          {proximo && (
            <>
              <p className="sub">
                Próximo: <strong className="alvo">{DIAS[proximo.dia]} · {proximo.treino.nome}</strong>
              </p>
              <div className="acoes">
                <button className="sec" onClick={() => navegar({ t: 'treinoVer', id: proximo.treino.id })}>
                  Ver treino
                </button>
                <button className="sec" onClick={() => iniciar(proximo.treino)}>
                  {ativaId ? 'Continuar treino' : 'Treinar mesmo assim'}
                </button>
              </div>
            </>
          )}
          {treinos.length > 0 && (
            <button className="link" onClick={() => navegar({ t: 'treinos' })}>
              Ver todos os treinos
            </button>
          )}
        </article>
      )}

      {treinos.length > 0 && <RegistrarPassado navegar={navegar} ativaId={ativaId} />}
    </section>
  )
}


function Check({ marcado }: { marcado: boolean }) {
  return <span className={`check ${marcado ? 'marcado' : ''}`} aria-hidden="true">{marcado ? '✓' : ''}</span>
}
