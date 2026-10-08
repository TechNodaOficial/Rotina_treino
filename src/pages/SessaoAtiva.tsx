import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ehTrabalho, excluirSessao, ultimaVez, type Serie, type TreinoItem } from '../db'
import type { Navegar } from '../App'
import SeletorExercicio from '../components/SeletorExercicio'
import { fmtDescanso, fmtDuracao, fmtPeso, fmtSerie, lerNumero, preferencias, volume } from '../util'

const DESCANSO_AQUECIMENTO = 60

export default function SessaoAtiva({ id, navegar }: { id: number; navegar: Navegar }) {
  const sessao = useLiveQuery(() => db.sessoes.get(id), [id])
  const series = useLiveQuery(() => db.series.where('sessaoId').equals(id).sortBy('feitoEm'), [id]) ?? []
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  const [agora, setAgora] = useState(Date.now())
  const [fimDescanso, setFimDescanso] = useState<number | null>(null)
  const avisou = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const restante = fimDescanso ? Math.ceil((fimDescanso - agora) / 1000) : null
  useEffect(() => {
    if (restante !== null && restante <= 0 && !avisou.current) {
      avisou.current = true
      navigator.vibrate?.([250, 120, 250])
    }
    if (restante !== null && restante < -5) setFimDescanso(null)
  }, [restante])

  function iniciarDescanso(segundos: number) {
    avisou.current = false
    setFimDescanso(Date.now() + segundos * 1000)
  }

  if (sessao === undefined) return null
  if (!sessao || sessao.fim) {
    return (
      <section>
        <p className="vazio">Este treino já foi finalizado.</p>
      </section>
    )
  }

  const atualizarItens = (itens: TreinoItem[]) => db.sessoes.update(id, { itens })
  const trabalho = series.filter(ehTrabalho)
  const exerciciosFeitos = sessao.itens.filter((i) => {
    const n = trabalho.filter((s) => s.exercicioId === i.exercicioId).length
    return i.series > 0 ? n >= i.series : n > 0
  }).length

  async function finalizar() {
    if (!series.length) {
      if (confirm('Nenhuma série registrada. Descartar este treino?')) {
        await excluirSessao(id)
        navegar({ t: 'hoje' }, { substituir: true })
      }
      return
    }
    await db.sessoes.update(id, { fim: Date.now() })
    navegar({ t: 'sessaoDetalhe', id }, { substituir: true })
  }

  async function descartar() {
    if (confirm('Descartar este treino e todas as séries registradas nele?')) {
      await excluirSessao(id)
      navegar({ t: 'hoje' }, { substituir: true })
    }
  }

  return (
    <section className={restante !== null ? 'com-timer' : ''}>
      <header className="topo">
        <div>
          <h1>{sessao.nome}</h1>
          <p className="sub">
            {fmtDuracao(agora - sessao.inicio)} · {trabalho.length} séries · {fmtPeso(volume(series))}
          </p>
        </div>
        <span className="meta">
          {exerciciosFeitos}/{sessao.itens.length}
        </span>
      </header>

      {sessao.itens.map((item) => (
        <CardExercicio
          key={item.exercicioId}
          sessaoId={id}
          item={item}
          nome={nomeEx.get(item.exercicioId) ?? '?'}
          series={series.filter((s) => s.exercicioId === item.exercicioId)}
          onSerie={iniciarDescanso}
          onRemover={() => atualizarItens(sessao.itens.filter((i) => i.exercicioId !== item.exercicioId))}
        />
      ))}

      <SeletorExercicio
        ocultar={sessao.itens.map((i) => i.exercicioId)}
        onEscolher={(exercicioId) => atualizarItens([...sessao.itens, { exercicioId, series: 0, reps: '' }])}
      />

      <button className="largo" onClick={finalizar}>
        Finalizar treino
      </button>
      <button className="perigo largo" onClick={descartar}>
        Descartar
      </button>

      {restante !== null && (
        <div className={`timer ${restante <= 0 ? 'acabou' : ''}`}>
          <span>
            {restante > 0
              ? `Descanso ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`
              : 'Bora, próxima série!'}
          </span>
          {restante > 0 && (
            <button className="sec" onClick={() => setFimDescanso((f) => (f ?? Date.now()) + 15000)}>
              +15s
            </button>
          )}
          <button className="sec" onClick={() => setFimDescanso(null)}>
            ×
          </button>
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
  onSerie: (descansoSeg: number) => void
  onRemover: () => void
}

function CardExercicio({ sessaoId, item, nome, series, onSerie, onRemover }: CardProps) {
  const anterior = useLiveQuery(() => ultimaVez(item.exercicioId, sessaoId), [item.exercicioId, sessaoId])
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [aquecendo, setAquecendo] = useState(false)
  const [detalhes, setDetalhes] = useState(false)

  const trabalho = series.filter(ehTrabalho)
  const descanso = item.descanso ?? preferencias.descanso

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

  async function adicionar() {
    const p = lerNumero(peso)
    const r = lerNumero(reps)
    if (p === null || p < 0 || r === null || r <= 0) return
    await db.series.add({
      sessaoId,
      exercicioId: item.exercicioId,
      peso: p,
      reps: Math.round(r),
      feitoEm: Date.now(),
      ...(aquecendo ? { tipo: 'aquec' as const } : {}),
    })
    onSerie(aquecendo ? DESCANSO_AQUECIMENTO : descanso)
  }

  return (
    <article className={`card ${concluido ? 'concluido' : ''}`}>
      <div className="linha-titulo">
        <span className={`check ${concluido ? 'marcado' : ''}`} aria-hidden="true">{concluido ? '✓' : ''}</span>
        <h2>{nome}</h2>
        {!series.length && (
          <button className="icone" onClick={onRemover} aria-label="Remover exercício">
            ×
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
          <button className="link" onClick={() => setDetalhes((d) => !d)}>
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
              <button className="icone" onClick={() => db.series.delete(s.id)} aria-label="Apagar série">
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="entrada">
        <label>
          kg
          <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <label>
          reps
          <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <button onClick={adicionar}>{aquecendo ? '+ Aquec.' : '+ Série'}</button>
      </div>
      <label className="alternador">
        <input type="checkbox" checked={aquecendo} onChange={(e) => setAquecendo(e.target.checked)} />
        Série de aquecimento / feeder (não conta no volume)
      </label>
    </article>
  )
}
