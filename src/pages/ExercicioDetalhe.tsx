import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ehTrabalho } from '../db'
import Grafico from '../components/Grafico'
import { agrupar, fmtData, fmtPeso, fmtSerie, umRM } from '../util'
import { avisar } from '../toast'

export default function ExercicioDetalhe({ id }: { id: number }) {
  const exercicio = useLiveQuery(() => db.exercicios.get(id), [id])
  const todas = useLiveQuery(() => db.series.where('exercicioId').equals(id).sortBy('feitoEm'), [id]) ?? []
  const series = todas.filter(ehTrabalho)
  const usadoEm = useLiveQuery(() => db.treinos.filter((t) => t.itens.some((i) => i.exercicioId === id)).count(), [id])
  const [metrica, setMetrica] = useState<'peso' | '1rm'>('peso')
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')

  useEffect(() => {
    if (exercicio) {
      setNome(exercicio.nome)
      setGrupo(exercicio.grupo)
    }
  }, [exercicio?.id])

  if (!exercicio) return null

  const sessoes = [...agrupar(series, (s) => s.sessaoId).values()]
  const pontos = sessoes.map((ss) => ({
    x: ss[0].feitoEm,
    y: Math.max(...ss.map((s) => (metrica === 'peso' ? s.peso : Math.round(umRM(s) * 10) / 10))),
  }))
  const recorde = series.length ? Math.max(...series.map((s) => s.peso)) : 0
  const melhor1rm = series.length ? Math.max(...series.map(umRM)) : 0
  const alterado = nome.trim() !== exercicio.nome || grupo.trim() !== exercicio.grupo

  async function excluir() {
    if (confirm(`Excluir "${exercicio!.nome}"?`)) {
      await db.exercicios.delete(id)
      history.back()
      avisar('Exercício excluído.')
    }
  }

  return (
    <section>
      <header className="topo">
        <h1>{exercicio.nome}</h1>
      </header>

      <div className="stats">
        <div><strong>{recorde ? fmtPeso(recorde) : '—'}</strong><span>recorde</span></div>
        <div><strong>{melhor1rm ? fmtPeso(Math.round(melhor1rm)) : '—'}</strong><span>1RM estimado</span></div>
        <div><strong>{sessoes.length}</strong><span>treinos</span></div>
      </div>

      {sessoes.length >= 2 && (
        <div className="alternar" role="group" aria-label="Métrica do gráfico">
          <button className={metrica === 'peso' ? 'ativa' : ''} aria-pressed={metrica === 'peso'} onClick={() => setMetrica('peso')}>
            Maior carga
          </button>
          <button className={metrica === '1rm' ? 'ativa' : ''} aria-pressed={metrica === '1rm'} onClick={() => setMetrica('1rm')}>
            1RM estimado
          </button>
        </div>
      )}
      <Grafico pontos={pontos} />

      {sessoes.length > 0 && <h3 className="grupo">Histórico</h3>}
      <ul className="lista">
        {[...sessoes].reverse().map((ss) => (
          <li key={ss[0].sessaoId} className="historico">
            <span className="sub">{fmtData(ss[0].feitoEm)}</span>
            <span>{ss.map(fmtSerie).join(', ')}</span>
          </li>
        ))}
      </ul>

      <h3 className="grupo">Editar</h3>
      <div className="grade2">
        <label className="campo">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="campo">
          Grupo
          <input value={grupo} onChange={(e) => setGrupo(e.target.value)} />
        </label>
      </div>
      {alterado && (
        <button
          className="largo"
          disabled={!nome.trim()}
          onClick={async () => {
            await db.exercicios.update(id, { nome: nome.trim(), grupo: grupo.trim() || 'Outros' })
            avisar('Alterações salvas.')
          }}
        >
          Salvar alterações
        </button>
      )}
      {todas.length === 0 && !usadoEm ? (
        <button className="perigo largo" onClick={excluir}>Excluir exercício</button>
      ) : (
        <p className="sub centro">Exercícios com histórico ou usados em algum treino não podem ser excluídos.</p>
      )}
    </section>
  )
}
