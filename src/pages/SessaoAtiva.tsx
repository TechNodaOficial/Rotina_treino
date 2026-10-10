import { Fragment, useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ehTrabalho, excluirSessao, grupos, removerItem, ultimaVez, type Serie, type TreinoItem } from '../db'
import type { Navegar } from '../App'
import SeletorExercicio from '../components/SeletorExercicio'
import Icone from '../components/Icone'
import { avisar } from '../toast'
import { fmtData, fmtDescanso, fmtDuracao, fmtNum, fmtPeso, fmtSerie, lerNumero, preferencias, volume } from '../util'

const DESCANSO_AQUECIMENTO = 60

/** Exercício concluído: fez todas as séries de trabalho previstas (ou pelo menos uma, se não há meta). */
const concluiu = (item: TreinoItem, trabalho: Serie[]) => {
  const n = trabalho.filter((s) => s.exercicioId === item.exercicioId).length
  return item.series > 0 ? n >= item.series : n > 0
}

export default function SessaoAtiva({ id, navegar }: { id: number; navegar: Navegar }) {
  const sessao = useLiveQuery(() => db.sessoes.get(id), [id])
  const seriesQ = useLiveQuery(() => db.series.where('sessaoId').equals(id).sortBy('feitoEm'), [id])
  const series = seriesQ ?? []
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  const [agora, setAgora] = useState(Date.now())
  const [descanso, setDescanso] = useState<{ fim: number; total: number } | null>(null)
  const avisou = useRef(false)
  const retro = !!sessao?.retroativo

  // Um exercício por vez: `atual` é o índice em sessao.itens.
  const [atual, setAtual] = useState<number | null>(null)
  const trilha = useRef<HTMLDivElement>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)
  // Vizinhos do exercício (ou bi-set) na tela, para as setas do teclado.
  const vizinhos = useRef({ ant: 0, prox: 0 })

  // Ao abrir, começa no primeiro exercício ainda não concluído.
  useEffect(() => {
    if (atual !== null || !sessao || !seriesQ) return
    const i = sessao.itens.findIndex((item) => !concluiu(item, seriesQ.filter(ehTrabalho)))
    setAtual(i === -1 ? Math.max(0, sessao.itens.length - 1) : i)
  }, [sessao, seriesQ, atual])

  // Mantém o exercício atual visível na trilha.
  useEffect(() => {
    trilha.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [atual])

  // Setas do teclado trocam de exercício (fora dos campos de texto).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if (e.key === 'ArrowRight') setAtual(vizinhos.current.prox)
      if (e.key === 'ArrowLeft') setAtual(vizinhos.current.ant)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

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

  /** Troca o exercício só nesta sessão (ex: aparelho ocupado). Mantém a meta; a carga vem do histórico do novo. */
  function trocar(antigo: TreinoItem, exercicioId: number) {
    const antes = sessao!.itens
    const planejado = antigo.substituiu ?? antigo.exercicioId
    const novo: TreinoItem = {
      exercicioId,
      ...(antigo.biset ? { biset: true } : {}),
      series: antigo.series,
      reps: antigo.reps,
      ...(antigo.descanso !== undefined ? { descanso: antigo.descanso } : {}),
      ...(planejado !== exercicioId ? { substituiu: planejado } : {}),
    }
    atualizarItens(antes.map((x) => (x === antigo ? novo : x)))
    avisar(`Trocado por ${nomeEx.get(exercicioId) ?? '?'}.`, { rotulo: 'Desfazer', fazer: () => atualizarItens(antes) })
  }
  const inicio = sessao.inicio
  // Em treinos registrados depois, as séries ficam com a data do treino (1 min entre elas, para manter a ordem).
  const momento = () => (retro ? Math.max(inicio, ...series.map((s) => s.feitoEm)) + 60000 : Date.now())
  const trabalho = series.filter(ehTrabalho)
  const exerciciosFeitos = sessao.itens.filter((i) => concluiu(i, trabalho)).length
  const total = sessao.itens.length
  const i = Math.min(Math.max(0, atual ?? 0), Math.max(0, total - 1))
  // Na tela fica o exercício atual ou, num bi-set, o par inteiro.
  const grupo = grupos(sessao.itens).find((g) => g.includes(i)) ?? []
  const primeiro = grupo[0] ?? 0
  const ultimo = grupo.at(-1) ?? 0
  const ir = (j: number) => setAtual(Math.min(Math.max(0, j), total - 1))
  vizinhos.current = { ant: Math.max(0, primeiro - 1), prox: Math.min(ultimo + 1, Math.max(0, total - 1)) }
  const atualFeito = grupo.length > 0 && grupo.every((j) => concluiu(sessao.itens[j], trabalho))
  const tudoFeito = total > 0 && exerciciosFeitos === total

  /** Num bi-set, só descansa depois do par: se o parceiro ficou uma série atrás, é a vez dele. */
  function aposSerie(item: TreinoItem, segundos: number, deTrabalho: boolean) {
    const outro = grupo.map((j) => sessao!.itens[j]).find((x) => x !== item)
    const feitas = (x: TreinoItem) => trabalho.filter((s) => s.exercicioId === x.exercicioId).length
    // `trabalho` ainda não inclui a série que acabou de ser registrada.
    if (outro && deTrabalho && feitas(item) + 1 > feitas(outro) && !concluiu(outro, trabalho)) {
      avisar(`Bi-set: agora ${nomeEx.get(outro.exercicioId) ?? 'o outro exercício'}, sem descanso.`)
      return
    }
    iniciarDescanso(segundos)
  }

  function inicioToque(e: TouchEvent) {
    const t = e.touches[0]
    toque.current = (e.target as HTMLElement).closest('input') ? null : { x: t.clientX, y: t.clientY }
  }

  function fimToque(e: TouchEvent) {
    if (!toque.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - toque.current.x
    const dy = t.clientY - toque.current.y
    toque.current = null
    // Arrastar para o lado troca de exercício; movimento mais vertical é rolagem.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(dx < 0 ? ultimo + 1 : primeiro - 1)
  }

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
        <nav className="trilha" ref={trilha} aria-label="Exercícios do treino">
          {sessao.itens.map((it, j) => {
            const feito = concluiu(it, trabalho)
            return (
              <Fragment key={it.exercicioId}>
                <button
                  className={`${grupo.includes(j) ? 'atual' : ''} ${feito ? 'feito' : ''}`}
                  aria-current={j === primeiro ? 'step' : undefined}
                  onClick={() => ir(j)}
                >
                  <span className="trilha-n">{feito ? <Icone nome="check" tamanho={14} /> : j + 1}</span>
                  <span className="trilha-nome">{nomeEx.get(it.exercicioId) ?? '?'}</span>
                </button>
                {it.biset && j < total - 1 && <span className="trilha-elo" aria-label="bi-set com">+</span>}
              </Fragment>
            )
          })}
        </nav>
      ) : (
        <p className="vazio">Treino livre: escolha o primeiro exercício abaixo.</p>
      )}

      {grupo.length > 0 && (
        <div className="foco" onTouchStart={inicioToque} onTouchEnd={fimToque}>
          <p className="foco-pos">
            {grupo.length > 1
              ? `Bi-set · exercícios ${primeiro + 1} e ${ultimo + 1} de ${total}`
              : `Exercício ${i + 1} de ${total}`}
          </p>
          {grupo.map((j) => {
            const item = sessao.itens[j]
            return (
              <Fragment key={item.exercicioId}>
                {j !== primeiro && <p className="biset-elo">+ sem descanso entre os dois</p>}
                <CardExercicio
                  sessaoId={id}
                  item={item}
                  nome={nomeEx.get(item.exercicioId) ?? '?'}
                  series={series.filter((s) => s.exercicioId === item.exercicioId)}
                  antesDe={retro ? sessao.inicio : undefined}
                  momento={momento}
                  onSerie={retro ? () => {} : (seg, deTrabalho) => aposSerie(item, seg, deTrabalho)}
                  onRemover={() => atualizarItens(removerItem(sessao.itens, j))}
                  noLugarDe={item.substituiu !== undefined ? (nomeEx.get(item.substituiu) ?? '?') : undefined}
                  ocultar={sessao.itens.map((x) => x.exercicioId)}
                  onTrocar={(exercicioId) => trocar(item, exercicioId)}
                />
              </Fragment>
            )
          })}
          <div className="navegar-ex">
            <button className="sec" onClick={() => ir(primeiro - 1)} disabled={primeiro === 0}>
              <Icone nome="voltar" />
              Anterior
            </button>
            <button className={atualFeito && !tudoFeito ? '' : 'sec'} onClick={() => ir(ultimo + 1)} disabled={ultimo >= total - 1}>
              Próximo
              <Icone nome="seguir" />
            </button>
          </div>
          {ultimo < total - 1 && (
            <p className="sub centro">Depois: {nomeEx.get(sessao.itens[ultimo + 1].exercicioId) ?? '?'}</p>
          )}
        </div>
      )}

      <h3 className="grupo">Treino</h3>
      <SeletorExercicio
        ocultar={sessao.itens.map((x) => x.exercicioId)}
        onEscolher={(exercicioId) => {
          atualizarItens([...sessao.itens, { exercicioId, series: 0, reps: '' }])
          setAtual(total) // vai direto para o exercício adicionado
        }}
      />

      <button className={`largo ${tudoFeito || total === 0 ? '' : 'sec'}`} onClick={finalizar}>
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
  onSerie: (descansoSeg: number, deTrabalho: boolean) => void
  onRemover: () => void
  noLugarDe?: string
  ocultar: number[]
  onTrocar: (exercicioId: number) => void
}

function CardExercicio({
  sessaoId,
  item,
  nome,
  series,
  antesDe,
  momento,
  onSerie,
  onRemover,
  noLugarDe,
  ocultar,
  onTrocar,
}: CardProps) {
  const anterior = useLiveQuery(() => ultimaVez(item.exercicioId, sessaoId, antesDe), [item.exercicioId, sessaoId, antesDe])
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [aquecendo, setAquecendo] = useState(false)
  const [detalhes, setDetalhes] = useState(true)

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
    onSerie(aquecendo ? DESCANSO_AQUECIMENTO : descanso, !aquecendo)
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
      {noLugarDe && <p className="sub">No lugar de {noLugarDe}</p>}
      {anterior && anterior.length > 0 && <p className="sub">Última vez: {anterior.map(fmtSerie).join(', ')}</p>}
      {!series.length && <SeletorExercicio rotulo="Aparelho ocupado? Trocar exercício" ocultar={ocultar} onEscolher={onTrocar} />}

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
