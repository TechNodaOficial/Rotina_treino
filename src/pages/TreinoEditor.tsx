import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TreinoItem } from '../db'
import SeletorExercicio from '../components/SeletorExercicio'

export default function TreinoEditor({ id }: { id?: number }) {
  const [nome, setNome] = useState('')
  const [itens, setItens] = useState<TreinoItem[]>([])
  const exercicios = useLiveQuery(() => db.exercicios.toArray()) ?? []
  const nomeEx = new Map(exercicios.map((e) => [e.id, e.nome]))

  useEffect(() => {
    if (id) db.treinos.get(id).then((t) => t && (setNome(t.nome), setItens(t.itens)))
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
    const dados = { nome: nome.trim() || 'Treino sem nome', itens }
    if (id) await db.treinos.update(id, dados)
    else await db.treinos.add(dados)
    history.back()
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

      {itens.map((item, i) => (
        <article key={`${item.exercicioId}-${i}`} className="card compacto">
          <div className="linha-titulo">
            <h2>{nomeEx.get(item.exercicioId) ?? '?'}</h2>
            <div className="mini">
              <button className="icone" onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
              <button className="icone" onClick={() => mover(i, 1)} aria-label="Descer">↓</button>
              <button className="icone perigo" onClick={() => setItens((xs) => xs.filter((_, j) => j !== i))} aria-label="Remover">×</button>
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
          </div>
        </article>
      ))}

      <SeletorExercicio onEscolher={(exercicioId) => setItens((xs) => [...xs, { exercicioId, series: 3, reps: '10' }])} />

      <div className="acoes">
        <button onClick={salvar}>Salvar</button>
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
