import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TreinoItem } from '../db'
import SeletorExercicio from '../components/SeletorExercicio'
import { DIAS } from '../util'
import Icone from '../components/Icone'
import { avisar } from '../toast'

export default function TreinoEditor({ id }: { id?: number }) {
  const [nome, setNome] = useState('')
  const [itens, setItens] = useState<TreinoItem[]>([])
  const [dias, setDias] = useState<number[]>([])
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  useEffect(() => {
    if (id) db.treinos.get(id).then((t) => {
        if (!t) return
        setNome(t.nome)
        setItens(t.itens)
        setDias(t.dias ?? [])
      })
  }, [id])

  const alterar = (i: number, campo: Partial<TreinoItem>) =>
    setItens((xs) => xs.map((x, j) => (j === i ? { ...x, ...campo } : x)))

  const mover = (i: number, d: number) =>
    setItens((xs) => {
      const j = i + d
      if (j < 0 || j >= xs.length) return xs
      const c = [...xs]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  async function salvar() {
    const dados = { nome: nome.trim() || 'Treino sem nome', itens, dias }
    if (id) await db.treinos.update(id, dados)
    else await db.treinos.add(dados)
    history.back()
    avisar('Treino salvo.')
  }

  async function excluir() {
    if (id && confirm('Excluir este treino? O histórico de sessões é mantido.')) {
      await db.treinos.delete(id)
      history.back()
    }
  }

  return (
    <section>
      <header className="topo">
        <h1>{id ? 'Editar treino' : 'Novo treino'}</h1>
      </header>

      <label className="campo">
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: A — Peito e Tríceps" />
      </label>

      <p className="campo">Dias da semana</p>
      <div className="dias" role="group" aria-label="Dias da semana">
        {DIAS.map((d, i) => (
          <button
            key={d}
            className={dias.includes(i) ? '' : 'sec'}
            aria-pressed={dias.includes(i)}
            onClick={() => setDias((ds) => (ds.includes(i) ? ds.filter((x) => x !== i) : [...ds, i].sort()))}
          >
            {d}
          </button>
        ))}
      </div>

      {itens.length === 0 && <p className="vazio">Nenhum exercício ainda. Adicione o primeiro abaixo.</p>}
      {itens.map((item, i) => (
        <article key={`${item.exercicioId}-${i}`} className="card compacto">
          <div className="linha-titulo">
            <h2>{nomeEx.get(item.exercicioId) ?? '?'}</h2>
            <div className="mini">
              <button className="icone" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                <Icone nome="cima" />
              </button>
              <button className="icone" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} aria-label="Descer">
                <Icone nome="baixo" />
              </button>
              <button
                className="icone perigo"
                onClick={() => setItens((xs) => xs.filter((_, j) => j !== i))}
                aria-label={`Remover ${nomeEx.get(item.exercicioId) ?? 'exercício'}`}
              >
                <Icone nome="fechar" />
              </button>
            </div>
          </div>
          <div className="grade2">
            <label className="campo">
              Séries
              <input
                inputMode="numeric"
                value={item.series || ''}
                onChange={(e) => alterar(i, { series: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
            </label>
            <label className="campo">
              Repetições
              <input value={item.reps} onChange={(e) => alterar(i, { reps: e.target.value })} placeholder="8-12" />
            </label>
            <label className="campo">
              Descanso (s)
              <input
                inputMode="numeric"
                value={item.descanso ?? ''}
                placeholder="padrão"
                onChange={(e) => alterar(i, { descanso: Number(e.target.value.replace(/\D/g, '')) || undefined })}
              />
            </label>
          </div>
          <label className="campo">
            Aquecimento
            <input value={item.aquecimento ?? ''} onChange={(e) => alterar(i, { aquecimento: e.target.value || undefined })} placeholder="Ex: 1×6-8 com 60%" />
          </label>
          <label className="campo">
            Execução / observações
            <input value={item.nota ?? ''} onChange={(e) => alterar(i, { nota: e.target.value || undefined })} />
          </label>
        </article>
      ))}

      <SeletorExercicio onEscolher={(exercicioId) => setItens((xs) => [...xs, { exercicioId, series: 3, reps: '10' }])} />

      <div className="acoes barra-salvar">
        <button onClick={salvar}>Salvar treino</button>
        <button className="sec" onClick={() => history.back()}>Cancelar</button>
      </div>
      {id && (
        <button className="perigo largo" onClick={excluir}>
          Excluir treino
        </button>
      )}
    </section>
  )
}
