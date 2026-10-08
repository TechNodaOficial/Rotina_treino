import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Navegar } from '../App'
import { agrupar } from '../util'

export default function Exercicios({ navegar }: { navegar: Navegar }) {
  const exercicios = useLiveQuery(() => db.exercicios.orderBy('nome').toArray()) ?? []
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')
  const grupos = agrupar(exercicios, (e) => e.grupo)
  const nomesGrupos = [...grupos.keys()].sort()

  async function adicionar() {
    if (!nome.trim()) return
    await db.exercicios.add({ nome: nome.trim(), grupo: grupo.trim() || 'Outros' })
    setNome('')
  }

  return (
    <section>
      <header className="topo">
        <h1>Exercícios</h1>
      </header>

      <article className="card">
        <div className="grade2">
          <label className="campo">
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Hack squat" />
          </label>
          <label className="campo">
            Grupo
            <input value={grupo} onChange={(e) => setGrupo(e.target.value)} list="grupos" placeholder="Pernas" />
          </label>
        </div>
        <datalist id="grupos">
          {nomesGrupos.map((g) => <option key={g} value={g} />)}
        </datalist>
        <button className="largo" onClick={adicionar}>Adicionar exercício</button>
      </article>

      {nomesGrupos.map((g) => (
        <div key={g}>
          <h3 className="grupo">{g}</h3>
          <ul className="lista">
            {grupos.get(g)!.map((e) => (
              <li key={e.id}>
                <button onClick={() => navegar({ t: 'exercicio', id: e.id })}>{e.nome}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
