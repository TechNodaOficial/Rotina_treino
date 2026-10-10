import { useLiveQuery } from 'dexie-react-hooks'
import { db, iniciarSessao, vigente, type Treino } from '../db'
import type { Navegar } from '../App'
import RegistrarPassado from '../components/RegistrarPassado'
import { DIAS, hojeISO } from '../util'
import Icone from '../components/Icone'

export default function Hoje({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  const agora = new Date()
  const dia = agora.getDay()
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()

  const treinos = useLiveQuery(() => db.treinos.toArray()) ?? []
  const feitosHoje = useLiveQuery(
    () => db.sessoes.where('inicio').aboveOrEqual(inicioDoDia).filter((s) => !!s.fim).toArray(),
    [inicioDoDia],
  )

  const doDia = treinos.filter((t) => t.dias?.includes(dia) && vigente(t, hojeISO(agora)))
  const diaDeTreino = doDia.length > 0
  const proximo = [1, 2, 3, 4, 5, 6, 7]
    .map((k) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + k))
    .map((d) => ({ dia: d.getDay(), treino: treinos.find((t) => t.dias?.includes(d.getDay()) && vigente(t, hojeISO(d))) }))
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
          <p className="sub">
            {treinou
              ? 'Treino de hoje concluído. Descanse bem.'
              : `${t.itens.length} exercícios · ${t.itens.reduce((n, i) => n + i.series, 0)} séries de trabalho`}
          </p>
          <div className="acoes">
            {treinou ? (
              <button className="sec" onClick={() => navegar({ t: 'sessaoDetalhe', id: feitosHoje![0].id })}>
                Ver resumo
              </button>
            ) : (
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
          <h2>{treinos.length ? 'Dia de descanso' : 'Bem-vindo'}</h2>
          <p className="sub">
            {treinos.length
              ? 'Nenhum treino programado para hoje.'
              : 'Monte seus treinos (ou carregue o programa pronto) e o treino do dia aparece aqui.'}
          </p>
          {!treinos.length && (
            <button className="largo" onClick={() => navegar({ t: 'treinos' })}>
              Montar meus treinos
            </button>
          )}
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
  return (
    <span className={`check ${marcado ? 'marcado' : ''}`} aria-hidden="true">
      {marcado && <Icone nome="check" tamanho={16} />}
    </span>
  )
}
