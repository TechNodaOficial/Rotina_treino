import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ehTrabalho, excluirSessao, ultimaVez, type Serie, type TreinoItem } from '../db'
import type { Navegar } from '../App'
import SeletorExercicio from '../components/SeletorExercicio'
import Icone from '../components/Icone'
import { avisar } from '../toast'
import { fmtData, fmtDescanso, fmtDuracao, fmtNum, fmtPeso, fmtSerie, lerNumero, preferencias, volume } from '../util'

const DESCANSO_AQUECIMENTO = 60

export default function SessaoAtiva({ id, navegar }: { id: number; navegar: Navegar }) {
  const sessao = useLiveQuery(() => db.sessoes.get(id), [id])
  const series = useLiveQuery(() => db.series.where('sessaoId').equals(id).sortBy('feitoEm'), [id]) ?? []
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  const [agora, setAgora] = useState(Date.now())
  const [descanso, setDescanso] = useState<{ fim: number; total: number } | null>(null)
  const avisou = useRef(false)
  const retro = !!sessao?.retroativo

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Mantém a tela acesa durante o treino (o celular fica no banco entre as séries).
  useEffect(() => {
    if (retro || !('wakeLock' in navigator)) return
    let trava: WakeLockSentinel | undefined
    const pedir = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock.request('screen').then(
          (t) => (trava = t),
          () => {},
        )
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      document.removeEventListener('visibilitychange', pedir)
      trava?.release()
    }
  }, [retro])

  const restante = descanso ? Math.ceil((descanso.fim - agora) / 1000) : null
  useEffect(() => {
    if (restante !== null && restante <= 0 && !avisou.current) {
      avisou.current = true
      navigator.vibrate?.([250, 120, 250])
    }
    if (restante !== null && restante < -5) setDescanso(null)
  }, [restante])

  function iniciarDescanso(segundos: number) {
    avisou.current = false
    setAgora(Date.now())
    setDescanso({ fim: Date.now() + segundos * 1000, total: segundos * 1000 })
  }

  if (sessao === undefined) return null
  if (!sessao || sessao.fim) {
    return (
      <section>
        <p className="vazio">Este treino já foi finalizado.</p>
        <button className="sec largo" onClick={() => navegar({ t: 'historico' }, { substituir: true })}>
          Ver histórico
        </button>
      </section>
    )
  }

  const atualizarItens = (itens: TreinoItem[]) => db.sessoes.update(id, { itens })
  const inicio = sessao.inicio
  // Em treinos registrados depois, as séries ficam com a data do treino (1 min entre elas, para manter a ordem).
  const momento = () => (retro ? Math.max(inicio, ...series.map((s) => s.feitoEm)) + 60000 : Date.now())
  const trabalho = series.filter(ehTrabalho)
  const exerciciosFeitos = sessao.itens.filter((i) => {
    const n = trabalho.filter((s) => s.exercicioId === i.exercicioId).length
    return i.series > 0 ? n >= i.series : n > 0
  }).length
  const total = sessao.itens.length

  async function finalizar() {
    if (!series.length) {
      if (confirm('Nenhuma série registrada. Descartar este treino?')) {
        await excluirSessao(id)
        navegar({ t: 'hoje' }, { substituir: true })
      }
      return
    }
    const fim = retro ? Math.max(inicio + 60 * 60000, ...series.map((s) => s.feitoEm)) : Date.now()
    await db.sessoes.update(id, { fim })
    navegar({ t: 'sessaoDetalhe', id }, { substituir: true })
    avisar(retro ? 'Treino salvo no histórico.' : 'Treino finalizado. Bom trabalho!')
  }

  async function descartar() {
    if (confirm('Descartar este treino e todas as séries registradas nele?')) {
      await excluirSessao(id)
      navegar({ t: 'hoje' }, { substituir: true })
      avisar('Treino descartado.')
    }
  }

  return (
    <section className={restante !== null ? 'com-timer' : ''}>
      <header className="topo">
        <div>
          <h1>{sessao.nome}</h1>
          <p className="sub">
            {retro ? `Registrando treino de ${fmtData(sessao.inicio)}` : fmtDuracao(agora - sessao.inicio)} ·{' '}
            {trabalho.length} séries · {fmtPeso(volume(series))}
          </p>
        </div>
        {total > 0 && (
          <span className="meta" aria-label={`${exerciciosFeitos} de ${total} exercícios concluídos`}>
            {exerciciosFeitos}/{total}
          </span>
        )}
      </header>
      {total > 0 ? (
        <div className="progresso" aria-hidden="true">
          <span style={{ transform: `scaleX(${exerciciosFeitos / total})` }} />
        </div>
      ) : (
        <p className="vazio">Treino livre: escolha o primeiro exercício abaixo.</p>
      )}

      {sessao.itens.map((item) => (
        <CardExercicio
          key={item.exercicioId}
          sessaoId={id}
          item={item}
          nome={nomeEx.get(item.exercicioId) ?? '?'}
          series={series.filter((s) => s.exercicioId === item.exercicioId)}
          antesDe={retro ? sessao.inicio : undefined}
          momento={momento}
          onSerie={retro ? () => {} : iniciarDescanso}
          onRemover={() => atualizarItens(sessao.itens.filter((i) => i.exercicioId !== item.exercicioId))}
        />
      ))}

      <SeletorExercicio
        ocultar={sessao.itens.map((i) => i.exercicioId)}
        onEscolher={(exercicioId) => atualizarItens([...sessao.itens, { exercicioId, series: 0, reps: '' }])}
      />

      <button className="largo" onClick={finalizar}>
        <Icone nome="check" />
        {retro ? 'Salvar treino' : 'Finalizar treino'}
      </button>
      <button className="perigo discreto largo" onClick={descartar}>
        Descartar treino
      </button>

      {restante !== null && descanso && (
        <div className={`timer ${restante <= 0 ? 'acabou' : ''}`} role="timer">
          <span>
            {restante > 0
              ? `Descanso ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`
              : 'Bora, próxima série!'}
          </span>
          {restante > 0 && (
            <button className="sec" onClick={() => setDescanso((d) => d && { fim: d.fim + 15000, total: d.total + 15000 })}>
              +15s
            </button>
          )}
          <button className="sec" onClick={() => setDescanso(null)}>
            {restante > 0 ? 'Pular' : 'Fechar'}
          </button>
          {restante > 0 && (
            <i className="timer-barra" style={{ transform: `scaleX(${Math.max(0, (descanso.fim - agora) / descanso.total)})` }} />
          )}
        </div>
      )}
    </section>
  )
}

interface CardProps {
  sessaoId: number
  item: TreinoItem
  nome: string
  series: Serie[]
  antesDe?: number
  momento: () => number
  onSerie: (descansoSeg: number) => void
  onRemover: () => void
}

function CardExercicio({ sessaoId, item, nome, series, antesDe, momento, onSerie, onRemover }: CardProps) {
  const anterior = useLiveQuery(() => ultimaVez(item.exercicioId, sessaoId, antesDe), [item.exercicioId, sessaoId, antesDe])
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [aquecendo, setAquecendo] = useState(false)
  const [detalhes, setDetalhes] = useState(false)

  const trabalho = series.filter(ehTrabalho)
  const descanso = item.descanso ?? preferencias.descanso
  const pesoLido = lerNumero(peso)
  const repsLido = lerNumero(reps)

  // Sugere a carga da última série de trabalho de hoje ou, se for a primeira, a da última vez.
  const sugestao = trabalho.at(-1) ?? anterior?.[trabalho.length] ?? anterior?.at(-1)
  useEffect(() => {
    if (sugestao && !aquecendo) {
      setPeso(String(sugestao.peso).replace('.', ','))
      setReps(String(sugestao.reps))
    }
  }, [trabalho.length, anterior?.length])

  const concluido = item.series > 0 ? trabalho.length >= item.series : trabalho.length > 0
  const temDetalhes = !!(item.aquecimento || item.nota)

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    if (pesoLido === null || pesoLido < 0 || repsLido === null || repsLido <= 0) {
      // Leva o foco ao campo que falta preencher.
      const campos = (e.currentTarget as HTMLFormElement).querySelectorAll('input')
      campos[pesoLido === null || pesoLido < 0 ? 0 : 1]?.focus()
      return
    }
    ;(document.activeElement as HTMLElement | null)?.blur() // fecha o teclado para o timer aparecer
    await db.series.add({
      sessaoId,
      exercicioId: item.exercicioId,
      peso: pesoLido,
      reps: Math.round(repsLido),
      feitoEm: momento(),
      ...(aquecendo ? { tipo: 'aquec' as const } : {}),
    })
    onSerie(aquecendo ? DESCANSO_AQUECIMENTO : descanso)
  }

  async function apagar(s: Serie) {
    await db.series.delete(s.id)
    avisar(`Série apagada (${fmtSerie(s)})`, { rotulo: 'Desfazer', fazer: () => db.series.add(s) })
  }

  return (
    <article className={`card ${concluido ? 'concluido' : ''}`}>
      <div className="linha-titulo">
        <span className={`check ${concluido ? 'marcado' : ''}`} aria-hidden="true">
          {concluido && <Icone nome="check" tamanho={16} />}
        </span>
        <h2>{nome}</h2>
        {!series.length && (
          <button className="icone" onClick={onRemover} aria-label={`Remover ${nome} deste treino`}>
            <Icone nome="fechar" />
          </button>
        )}
      </div>
      <p className="sub">
        {item.series ? (
          <strong className="alvo">
            {trabalho.length}/{item.series} × {item.reps || '?'}
          </strong>
        ) : null}
        {item.series ? ' · ' : ''}descanso {fmtDescanso(descanso)}
        {temDetalhes && (
          <button className="link" onClick={() => setDetalhes((d) => !d)} aria-expanded={detalhes}>
            {detalhes ? 'ocultar' : 'como fazer'}
          </button>
        )}
      </p>
      {detalhes && (
        <div className="detalhes">
          {item.aquecimento && <p><strong>Aquecimento:</strong> {item.aquecimento}</p>}
          {item.nota && <p><strong>Execução:</strong> {item.nota}</p>}
        </div>
      )}
      {anterior && anterior.length > 0 && <p className="sub">Última vez: {anterior.map(fmtSerie).join(', ')}</p>}

      {series.length > 0 && (
        <ol className="series">
          {series.map((s) => (
            <li key={s.id} className={ehTrabalho(s) ? '' : 'aquec'}>
              <span>
                {!ehTrabalho(s) && <em>aquec </em>}
                {fmtPeso(s.peso)} × {s.reps}
              </span>
              <button className="icone" onClick={() => apagar(s)} aria-label={`Apagar série ${fmtSerie(s)}`}>
                <Icone nome="fechar" tamanho={18} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <form className="entrada" onSubmit={adicionar}>
        <Passo rotulo="kg" valor={peso} setValor={setPeso} passo={2.5} decimal />
        <Passo rotulo="reps" valor={reps} setValor={setReps} passo={1} />
        <div className="entrada-acoes">
          <button
            type="button"
            className={`chip ${aquecendo ? 'ligado' : ''}`}
            aria-pressed={aquecendo}
            title="Séries de aquecimento/feeder não contam no volume nem nos recordes"
            onClick={() => setAquecendo((a) => !a)}
          >
            <Icone nome="fogo" tamanho={18} />
            Aquec.
          </button>
          <button type="submit">
            <Icone nome="mais" />
            {aquecendo ? 'Aquecimento' : 'Série'}
          </button>
        </div>
      </form>
    </article>
  )
}

interface PassoProps {
  rotulo: string
  valor: string
  setValor: (v: string) => void
  passo: number
  decimal?: boolean
}

/** Campo numérico com − e + para ajustar a carga sem abrir o teclado. */
function Passo({ rotulo, valor, setValor, passo, decimal }: PassoProps) {
  const mudar = (d: number) => setValor(String(Math.max(0, (lerNumero(valor) ?? 0) + d)).replace('.', ','))

  return (
    <div className="passo">
      <span className="passo-rotulo">{rotulo}</span>
      <div className="passo-linha">
        <button type="button" className="sec" onClick={() => mudar(-passo)} aria-label={`Menos ${fmtNum(passo)} ${rotulo}`}>
          <Icone nome="menos" tamanho={18} />
        </button>
        <input
          aria-label={rotulo}
          inputMode={decimal ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="sec" onClick={() => mudar(passo)} aria-label={`Mais ${fmtNum(passo)} ${rotulo}`}>
          <Icone nome="mais" tamanho={18} />
        </button>
      </div>
    </div>
  )
}
