import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, excluirSessao, ultimaVez, type Serie, type TreinoItem } from '../db'
import type { Navegar } from '../App'
import SeletorExercicio from '../components/SeletorExercicio'
import { fmtDuracao, fmtPeso, fmtSerie, lerNumero, preferencias, volume } from '../util'

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

  function iniciarDescanso() {
    avisou.current = false
    setFimDescanso(Date.now() + preferencias.descanso * 1000)
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

  async function finalizar() {
    if (!series.length) {
      if (confirm('Nenhuma série registrada. Descartar este treino?')) {
        await excluirSessao(id)
        navegar({ t: 'treinos' }, { substituir: true })
      }
      return
    }
    await db.sessoes.update(id, { fim: Date.now() })
    navegar({ t: 'sessaoDetalhe', id }, { substituir: true })
  }

  async function descartar() {
    if (confirm('Descartar este treino e todas as séries registradas nele?')) {
      await excluirSessao(id)
      navegar({ t: 'treinos' }, { substituir: true })
    }
  }

  return (
    <section className={restante !== null ? 'com-timer' : ''}>
      <header className="topo">
        <div>
          <h1>{sessao.nome}</h1>
          <p className="sub">
            {fmtDuracao(agora - sessao.inicio)} · {series.length} séries · {fmtPeso(volume(series))}
          </p>
        </div>
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
  onSerie: () => void
  onRemover: () => void
}

function CardExercicio({ sessaoId, item, nome, series, onSerie, onRemover }: CardProps) {
  const anterior = useLiveQuery(() => ultimaVez(item.exercicioId, sessaoId), [item.exercicioId, sessaoId])
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')

  // Sugere a carga da última série feita hoje ou, se for a primeira, a da última vez.
  const sugestao = series.at(-1) ?? anterior?.[series.length] ?? anterior?.at(-1)
  useEffect(() => {
    if (sugestao) {
      setPeso(String(sugestao.peso).replace('.', ','))
      setReps(String(sugestao.reps))
    }
  }, [series.length, anterior?.length])

  const meta = item.series ? `${item.series} × ${item.reps || '?'}` : null
  const concluido = item.series > 0 && series.length >= item.series

  async function adicionar() {
    const p = lerNumero(peso)
    const r = lerNumero(reps)
    if (p === null || p < 0 || r === null || r <= 0) return
    await db.series.add({ sessaoId, exercicioId: item.exercicioId, peso: p, reps: Math.round(r), feitoEm: Date.now() })
    onSerie()
  }

  return (
    <article className={`card ${concluido ? 'concluido' : ''}`}>
      <div className="linha-titulo">
        <h2>{nome}</h2>
        {meta && <span className="meta">{meta}</span>}
        {!series.length && (
          <button className="icone" onClick={onRemover} aria-label="Remover exercício">
            ×
          </button>
        )}
      </div>
      {anterior && anterior.length > 0 && (
        <p className="sub">Última vez: {anterior.map(fmtSerie).join(', ')}</p>
      )}

      {series.length > 0 && (
        <ol className="series">
          {series.map((s) => (
            <li key={s.id}>
              <span>{fmtPeso(s.peso)} × {s.reps}</span>
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
        <button onClick={adicionar}>+ Série</button>
      </div>
    </article>
  )
}
