import { useLiveQuery } from 'dexie-react-hooks'
import { db, iniciarSessao, type Diario, type Treino } from '../db'
import type { Navegar } from '../App'
import { HABITOS } from '../programa'
import { fmtNum, hojeISO, metaAgua, preferencias } from '../util'

export default function Hoje({ navegar, ativaId }: { navegar: Navegar; ativaId?: number }) {
  const agora = new Date()
  const data = hojeISO(agora)
  const dia = agora.getDay()
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()

  const treinos = useLiveQuery(() => db.treinos.toArray()) ?? []
  const diario = useLiveQuery(() => db.diario.get(data), [data])
  const feitosHoje = useLiveQuery(
    () => db.sessoes.where('inicio').aboveOrEqual(inicioDoDia).filter((s) => !!s.fim).toArray(),
    [inicioDoDia],
  )

  const doDia = treinos.filter((t) => t.dias?.includes(dia))
  const diaDeTreino = doDia.length > 0
  const meta = metaAgua(preferencias.peso, diaDeTreino)
  const agua = diario?.agua ?? 0
  const feitos = diario?.feitos ?? []
  const habitos = HABITOS.filter((h) => !h.dias || h.dias.includes(dia))

  const salvar = (mudanca: Partial<Diario>) => db.diario.put({ data, agua, feitos, ...mudanca })
  const alternar = (id: string) =>
    salvar({ feitos: feitos.includes(id) ? feitos.filter((f) => f !== id) : [...feitos, id] })

  async function iniciar(t: Treino) {
    navegar({ t: 'sessao', id: ativaId ?? (await iniciarSessao(t)) })
  }

  const treinou = (feitosHoje?.length ?? 0) > 0
  const total = habitos.length + 1 + (diaDeTreino ? 1 : 0)
  const concluidos =
    habitos.filter((h) => feitos.includes(h.id)).length + (agua >= meta ? 1 : 0) + (diaDeTreino && treinou ? 1 : 0)

  return (
    <section>
      <header className="topo">
        <div>
          <h1>Hoje</h1>
          <p className="sub">{agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <span className="meta">
          {concluidos}/{total}
        </span>
      </header>

      {doDia.map((t) => (
        <article key={t.id} className={`card ${treinou ? 'concluido' : ''}`}>
          <div className="linha-titulo">
            <Check marcado={treinou} />
            <h2>{t.nome}</h2>
          </div>
          <p className="sub">{t.itens.length} exercícios · {t.itens.reduce((n, i) => n + i.series, 0)} séries de trabalho</p>
          {!treinou && (
            <button className="largo" onClick={() => iniciar(t)}>
              {ativaId ? 'Continuar treino' : 'Iniciar treino'}
            </button>
          )}
        </article>
      ))}
      {!diaDeTreino && (
        <article className="card">
          <h2>Dia de descanso</h2>
          <p className="sub">
            {treinos.length ? 'Recupere-se. Caminhada leve e mobilidade ajudam.' : 'Carregue o programa na aba Treinos para ver o treino do dia aqui.'}
          </p>
        </article>
      )}

      <article className={`card ${agua >= meta ? 'concluido' : ''}`}>
        <div className="linha-titulo">
          <Check marcado={agua >= meta} />
          <h2>Água</h2>
          <span className="meta">
            {fmtNum(agua / 1000)} / {fmtNum(meta / 1000)} L
          </span>
        </div>
        <div className="barra">
          <div style={{ width: `${Math.min(100, (agua / meta) * 100)}%` }} />
        </div>
        <div className="acoes">
          <button className="sec" onClick={() => salvar({ agua: Math.max(0, agua - 250) })} aria-label="Remover 250 ml">
            −250
          </button>
          <button onClick={() => salvar({ agua: agua + 250 })}>+250 ml</button>
          <button onClick={() => salvar({ agua: agua + 500 })}>+500 ml</button>
        </div>
      </article>

      <h3 className="grupo">Checklist</h3>
      <ul className="lista">
        {habitos.map((h) => (
          <li key={h.id}>
            <button className="habito" onClick={() => alternar(h.id)} aria-pressed={feitos.includes(h.id)}>
              <Check marcado={feitos.includes(h.id)} />
              <span>
                <strong>{h.titulo}</strong>
                <small>{h.detalhe}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Check({ marcado }: { marcado: boolean }) {
  return <span className={`check ${marcado ? 'marcado' : ''}`} aria-hidden="true">{marcado ? '✓' : ''}</span>
}
