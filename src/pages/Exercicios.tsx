import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Navegar } from '../App'
import Icone from '../components/Icone'
import { avisar } from '../toast'
import { agrupar } from '../util'

/** Compara sem acento e sem caixa: "elevacao" encontra "Elevação". */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function Exercicios({ navegar }: { navegar: Navegar }) {
  const exercicios = useLiveQuery(() => db.exercicios.orderBy('nome').toArray()) ?? []
  const [busca, setBusca] = useState('')
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')
  const termo = normalizar(busca.trim())
  const filtrados = termo
    ? exercicios.filter((e) => normalizar(e.nome).includes(termo) || normalizar(e.grupo).includes(termo))
    : exercicios
  const grupos = agrupar(filtrados, (e) => e.grupo)
  const nomesGrupos = [...grupos.keys()].sort()
  const todosGrupos = [...new Set(exercicios.map((e) => e.grupo))].sort()

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const n = nome.trim()
    if (!n) return
    if (exercicios.some((x) => normalizar(x.nome) === normalizar(n))) {
      avisar(`“${n}” já existe.`)
      return
    }
    await db.exercicios.add({ nome: n, grupo: grupo.trim() || 'Outros' })
    avisar(`“${n}” adicionado.`)
    setNome('')
  }

  return (
    <section>
      <header className="topo">
        <h1>Exercícios</h1>
        <span className="meta">{exercicios.length}</span>
      </header>

      <label className="busca">
        <Icone nome="busca" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar exercício ou grupo"
          aria-label="Buscar exercício ou grupo"
        />
      </label>

      <details className="card guia">
        <summary>Novo exercício</summary>
        <form onSubmit={adicionar}>
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
            {todosGrupos.map((g) => <option key={g} value={g} />)}
          </datalist>
          <button className="largo" type="submit" disabled={!nome.trim()}>
            Adicionar exercício
          </button>
        </form>
      </details>

      {termo && filtrados.length === 0 && (
        <div className="vazio">
          <p>Nada encontrado para “{busca.trim()}”.</p>
          <button
            className="sec"
            onClick={() => {
              setNome(busca.trim())
              setBusca('')
              document.querySelector<HTMLDetailsElement>('details.guia')?.setAttribute('open', '')
            }}
          >
            Criar “{busca.trim()}”
          </button>
        </div>
      )}

      {nomesGrupos.map((g) => (
        <div key={g}>
          <h3 className="grupo">{g}</h3>
          <ul className="lista">
            {grupos.get(g)!.map((e) => (
              <li key={e.id}>
                <button onClick={() => navegar({ t: 'exercicio', id: e.id })}>
                  <span>{e.nome}</span>
                  <Icone nome="seguir" tamanho={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
